#include "coreaudio-capture.h"
#include <obs-module.h>

#ifdef MACOS_BUILD

#include <CoreAudio/CoreAudio.h>
#include <AudioToolbox/AudioToolbox.h>
#include <math.h>
#include <pthread.h>
#include <string.h>

static audio_data_cb g_ca_callback = NULL;
static void *g_ca_user_data = NULL;
static volatile bool g_ca_running = false;
static pthread_t g_ca_thread;
static AudioUnit g_audio_unit;

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
		output[k] = sqrtf(real * real + imag * imag) / n;
	}
}

static float g_fft_input[256];
static int g_sample_count = 0;
static float g_smoothed[AUDIO_FFT_SIZE];

static OSStatus audio_callback(void *inRefCon,
			       AudioUnitRenderActionFlags *ioActionFlags,
			       const AudioTimeStamp *inTimeStamp,
			       UInt32 inBusNumber,
			       UInt32 inNumberFrames,
			       AudioBufferList *ioData)
{
	UNUSED_PARAMETER(inRefCon);
	UNUSED_PARAMETER(ioData);

	AudioBufferList buffer_list;
	buffer_list.mNumberBuffers = 1;
	buffer_list.mBuffers[0].mNumberChannels = 1;
	buffer_list.mBuffers[0].mDataByteSize =
		inNumberFrames * sizeof(Float32);
	buffer_list.mBuffers[0].mData = malloc(inNumberFrames * sizeof(Float32));

	OSStatus status = AudioUnitRender(g_audio_unit, ioActionFlags,
					  inTimeStamp, inBusNumber,
					  inNumberFrames, &buffer_list);

	if (status != noErr) {
		free(buffer_list.mBuffers[0].mData);
		return status;
	}

	Float32 *samples = (Float32 *)buffer_list.mBuffers[0].mData;
	UInt32 count = inNumberFrames;

	for (UInt32 i = 0;
	     i < count && g_sample_count < 256;
	     i++) {
		g_fft_input[g_sample_count++] = samples[i];
	}

	if (g_sample_count >= 256) {
		float fft_output[256];
		fft_real(g_fft_input, fft_output, 256);

		for (int i = 0; i < AUDIO_FFT_SIZE; i++) {
			float val = fft_output[i];
			if (val < 0)
				val = 0;
			if (val > 1.0f)
				val = 1.0f;
			g_smoothed[i] = g_smoothed[i] * 0.7f + val * 0.3f;
		}

		if (g_ca_callback) {
			g_ca_callback(g_smoothed, g_ca_user_data);
		}

		g_sample_count = 0;
	}

	free(buffer_list.mBuffers[0].mData);
	return noErr;
}

static void *coreaudio_capture_thread(void *arg)
{
	UNUSED_PARAMETER(arg);

	for (int i = 0; i < AUDIO_FFT_SIZE; i++)
		g_smoothed[i] = 0.0f;

	AudioComponentDescription desc;
	desc.componentType = kAudioUnitType_Output;
	desc.componentSubType = kAudioUnitSubType_HALOutput;
	desc.componentManufacturer = kAudioUnitManufacturer_Apple;
	desc.componentFlags = 0;
	desc.componentFlagsMask = 0;

	AudioComponent component = AudioComponentFindNext(NULL, &desc);
	if (!component) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] CoreAudio: HALOutput component not found");
		return NULL;
	}

	OSStatus status = AudioComponentInstanceNew(component,
						     &g_audio_unit);
	if (status != noErr) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] CoreAudio: Cannot create audio unit");
		return NULL;
	}

	UInt32 enable_output = 1;
	AudioUnitSetProperty(g_audio_unit,
			     kAudioOutputUnitProperty_EnableIO,
			     kAudioUnitScope_Output, 0, &enable_output,
			     sizeof(enable_output));

	UInt32 enable_input = 1;
	AudioUnitSetProperty(g_audio_unit,
			     kAudioOutputUnitProperty_EnableIO,
			     kAudioUnitScope_Input, 1, &enable_input,
			     sizeof(enable_input));

	AudioDeviceID default_device;
	UInt32 size = sizeof(default_device);
	AudioObjectPropertyAddress prop = {
		kAudioHardwarePropertyDefaultOutputDevice,
		kAudioObjectPropertyScopeGlobal,
		kAudioObjectPropertyElementMain
	};

	status = AudioObjectGetPropertyData(kAudioObjectSystemObject,
					    &prop, 0, NULL, &size,
					    &default_device);
	if (status != noErr) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] CoreAudio: Cannot get default output device");
		AudioComponentInstanceDispose(g_audio_unit);
		return NULL;
	}

	AudioUnitSetProperty(g_audio_unit,
			     kAudioOutputUnitProperty_CurrentDevice,
			     kAudioUnitScope_Global, 0, &default_device,
			     sizeof(default_device));

	AURenderCallbackStruct callback_struct;
	callback_struct.inputProc = audio_callback;
	callback_struct.inputProcRefCon = NULL;
	AudioUnitSetProperty(g_audio_unit,
			     kAudioUnitProperty_SetRenderCallback,
			     kAudioUnitScope_Input, 0, &callback_struct,
			     sizeof(callback_struct));

	UInt32 buffer_size = 256;
	AudioUnitSetProperty(g_audio_unit,
			     kAudioDevicePropertyBufferFrameSize,
			     kAudioUnitScope_Global, 0, &buffer_size,
			     sizeof(buffer_size));

	status = AudioUnitInitialize(g_audio_unit);
	if (status != noErr) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] CoreAudio: Cannot initialize audio unit");
		AudioComponentInstanceDispose(g_audio_unit);
		return NULL;
	}

	status = AudioOutputUnitStart(g_audio_unit);
	if (status != noErr) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] CoreAudio: Cannot start audio unit");
		AudioComponentInstanceDispose(g_audio_unit);
		return NULL;
	}

	blog(LOG_INFO,
	     "[obs-spotify-overlay] CoreAudio loopback capture started");

	while (g_ca_running) {
		usleep(10000);
	}

	AudioOutputUnitStop(g_audio_unit);
	AudioUnitUninitialize(g_audio_unit);
	AudioComponentInstanceDispose(g_audio_unit);

	blog(LOG_INFO,
	     "[obs-spotify-overlay] CoreAudio loopback capture stopped");
	return NULL;
}

bool platform_audio_capture_start(audio_data_cb callback, void *user_data)
{
	if (g_ca_running)
		return true;

	g_ca_callback = callback;
	g_ca_user_data = user_data;
	g_ca_running = true;

	int ret = pthread_create(&g_ca_thread, NULL,
				 coreaudio_capture_thread, NULL);
	if (ret != 0) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] Failed to create CoreAudio thread");
		g_ca_running = false;
		return false;
	}

	return true;
}

void platform_audio_capture_stop(void)
{
	if (!g_ca_running)
		return;

	g_ca_running = false;
	pthread_join(g_ca_thread, NULL);
	g_ca_callback = NULL;
	g_ca_user_data = NULL;
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
