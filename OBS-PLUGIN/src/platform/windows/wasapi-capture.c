#include "wasapi-capture.h"
#include <obs-module.h>

#ifdef WINDOWS_BUILD

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <mmdeviceapi.h>
#include <audioclient.h>
#include <audiopolicy.h>
#include <math.h>
#include <stdio.h>
#include <string.h>

#define REFTIMES_PER_SEC 10000000
#define REFTIMES_PER_MILLISEC 10000

static const CLSID CLSID_MMDeviceEnumerator = {
	0xbcde0395, 0xe52f, 0x467c, {0x8e, 0x3d, 0xc4, 0x57, 0x92, 0x91, 0x69, 0x2e}};
static const IID IID_IMMDeviceEnumerator = {
	0xa95664d2, 0x9614, 0x4f87, {0xa3, 0x38, 0x79, 0x22, 0xec, 0xb4, 0x6c, 0x74}};
static const IID IID_IAudioClient = {
	0x1cb9ad4c, 0xdbfa, 0x4c32, {0xb1, 0x78, 0xc2, 0xf5, 0x68, 0xa7, 0x03, 0xb2}};
static const IID IID_IAudioCaptureClient = {
	0xc8adbd64, 0xe71e, 0x48a0, {0xa4, 0xde, 0x18, 0x5c, 0x39, 0x5c, 0xd3, 0x17}};

static audio_data_cb g_audio_callback = NULL;
static void *g_audio_user_data = NULL;
static volatile bool g_audio_running = false;
static HANDLE g_audio_thread = NULL;

static void fft_real(const float *input, float *output, int n)
{
	for (int k = 0; k < n; k++) {
		float real = 0.0f;
		float imag = 0.0f;
		for (int t = 0; t < n; t++) {
			float angle = 2.0f * 3.14159265358979f * k * t / n;
			real += input[t] * cosf(angle);
			imag -= input[t] * sinf(angle);
		}
		float mag = sqrtf(real * real + imag * imag) / n;
		output[k] = mag;
	}
}

static DWORD WINAPI wasapi_capture_thread(LPVOID param)
{
	UNUSED_PARAMETER(param);

	HRESULT hr = CoInitializeEx(NULL, COINIT_MULTITHREADED);
	if (FAILED(hr)) {
		blog(LOG_ERROR, "[obs-spotify-overlay] WASAPI: COM init failed");
		return 0;
	}

	IMMDeviceEnumerator *enumerator = NULL;
	hr = CoCreateInstance(&CLSID_MMDeviceEnumerator, NULL,
			      CLSCTX_ALL, &IID_IMMDeviceEnumerator,
			      (void **)&enumerator);
	if (FAILED(hr)) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] WASAPI: Device enumerator failed");
		CoUninitialize();
		return 0;
	}

	IMMDevice *device = NULL;
	hr = enumerator->lpVtbl->GetDefaultAudioEndpoint(
		enumerator, eRender, eConsole, &device);
	enumerator->lpVtbl->Release(enumerator);

	if (FAILED(hr) || !device) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] WASAPI: No default render device");
		CoUninitialize();
		return 0;
	}

	IAudioClient *audio_client = NULL;
	hr = device->lpVtbl->Activate(device, &IID_IAudioClient, CLSCTX_ALL,
				       NULL, (void **)&audio_client);
	device->lpVtbl->Release(device);

	if (FAILED(hr) || !audio_client) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] WASAPI: Audio client activation failed");
		CoUninitialize();
		return 0;
	}

	WAVEFORMATEX *fmt = NULL;
	hr = audio_client->lpVtbl->GetMixFormat(audio_client, &fmt);
	if (FAILED(hr)) {
		audio_client->lpVtbl->Release(audio_client);
		CoUninitialize();
		return 0;
	}

	REFERENCE_TIME duration = REFTIMES_PER_SEC;
	hr = audio_client->lpVtbl->Initialize(
		audio_client,
		AUDCLNT_SHAREMODE_SHARED,
		AUDCLNT_STREAMFLAGS_LOOPBACK,
		duration, 0, fmt, NULL);

	if (FAILED(hr)) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] WASAPI: Initialize failed (0x%08X)",
		     (unsigned)hr);
		CoTaskMemFree(fmt);
		audio_client->lpVtbl->Release(audio_client);
		CoUninitialize();
		return 0;
	}

	IAudioCaptureClient *capture_client = NULL;
	hr = audio_client->lpVtbl->GetService(audio_client,
					       &IID_IAudioCaptureClient,
					       (void **)&capture_client);
	if (FAILED(hr)) {
		CoTaskMemFree(fmt);
		audio_client->lpVtbl->Release(audio_client);
		CoUninitialize();
		return 0;
	}

	hr = audio_client->lpVtbl->Start(audio_client);
	if (FAILED(hr)) {
		capture_client->lpVtbl->Release(capture_client);
		CoTaskMemFree(fmt);
		audio_client->lpVtbl->Release(audio_client);
		CoUninitialize();
		return 0;
	}

	blog(LOG_INFO,
	     "[obs-spotify-overlay] WASAPI loopback capture started");

	float sample_buffer[4096];
	int sample_count = 0;
	float fft_input[256];
	float fft_output[256];
	float smoothed[AUDIO_FFT_SIZE];

	for (int i = 0; i < AUDIO_FFT_SIZE; i++)
		smoothed[i] = 0.0f;

	while (g_audio_running) {
		UINT32 packet_length = 0;
		hr = capture_client->lpVtbl->GetNextPacketSize(
			capture_client, &packet_length);

		if (FAILED(hr) || packet_length == 0) {
			Sleep(10);
			continue;
		}

		BYTE *data_ptr = NULL;
		UINT32 num_frames = 0;
		DWORD flags = 0;

		hr = capture_client->lpVtbl->GetBuffer(
			capture_client, &data_ptr, &num_frames, &flags, NULL,
			NULL);

		if (SUCCEEDED(hr) && data_ptr && num_frames > 0) {
			float *samples = (float *)data_ptr;
			UINT32 total_samples = num_frames * fmt->nChannels;

			for (UINT32 i = 0;
			     i < total_samples && sample_count < 256;
			     i += fmt->nChannels) {
				float mono = 0;
				for (UINT16 ch = 0; ch < fmt->nChannels && (i + ch) < total_samples; ch++) {
					mono += samples[i + ch];
				}
				mono /= fmt->nChannels;
				fft_input[sample_count++] = mono;
			}

			if (sample_count >= 256) {
				fft_real(fft_input, fft_output, 256);

				for (int i = 0; i < AUDIO_FFT_SIZE; i++) {
					float val = fft_output[i];
					if (val < 0)
						val = 0;
					if (val > 1.0f)
						val = 1.0f;
					smoothed[i] = smoothed[i] * 0.7f + val * 0.3f;
				}

				if (g_audio_callback) {
					g_audio_callback(smoothed,
							 g_audio_user_data);
				}

				sample_count = 0;
			}

			capture_client->lpVtbl->ReleaseBuffer(
				capture_client, num_frames);
		}
	}

	audio_client->lpVtbl->Stop(audio_client);
	capture_client->lpVtbl->Release(capture_client);
	CoTaskMemFree(fmt);
	audio_client->lpVtbl->Release(audio_client);
	CoUninitialize();

	blog(LOG_INFO,
	     "[obs-spotify-overlay] WASAPI loopback capture stopped");
	return 0;
}

bool platform_audio_capture_start(audio_data_cb callback, void *user_data)
{
	if (g_audio_running)
		return true;

	g_audio_callback = callback;
	g_audio_user_data = user_data;
	g_audio_running = true;

	g_audio_thread = CreateThread(NULL, 0, wasapi_capture_thread, NULL, 0,
				       NULL);
	if (!g_audio_thread) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] Failed to create WASAPI thread");
		g_audio_running = false;
		return false;
	}

	return true;
}

void platform_audio_capture_stop(void)
{
	if (!g_audio_running)
		return;

	g_audio_running = false;
	if (g_audio_thread) {
		WaitForSingleObject(g_audio_thread, 3000);
		CloseHandle(g_audio_thread);
		g_audio_thread = NULL;
	}

	g_audio_callback = NULL;
	g_audio_user_data = NULL;
}

#else

bool platform_audio_capture_start(audio_data_cb callback, void *user_data)
{
	UNUSED_PARAMETER(callback);
	UNUSED_PARAMETER(user_data);
	return false;
}

void platform_audio_capture_stop(void)
{
}

#endif
