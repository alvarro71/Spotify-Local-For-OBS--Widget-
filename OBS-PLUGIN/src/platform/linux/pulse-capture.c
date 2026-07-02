#include "pulse-capture.h"
#include <obs-module.h>

#ifdef LINUX_BUILD

#include <pulse/simple.h>
#include <pulse/error.h>
#include <math.h>
#include <string.h>
#include <pthread.h>
#include <unistd.h>

static audio_data_cb g_pa_callback = NULL;
static void *g_pa_user_data = NULL;
static volatile bool g_pa_running = false;
static pthread_t g_pa_thread;

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

static void *pulse_capture_thread(void *arg)
{
	UNUSED_PARAMETER(arg);

	pa_sample_spec ss = {
		.format = PA_SAMPLE_FLOAT32LE,
		.rate = 44100,
		.channels = 1
	};

	pa_channel_map map;
	pa_channel_map_init_mono(&map);

	char monitor_name[256];
	snprintf(monitor_name, sizeof(monitor_name), "%s",
		 pa_channel_map_to_string(&map));

	pa_simple *s = NULL;
	int error = 0;

	pa_proplist *proplist = pa_proplist_new();
	pa_proplist_sets(proplist, PA_PROP_APPLICATION_NAME,
			 "OBS Spotify Overlay");
	pa_proplist_sets(proplist, PA_PROP_STREAM_NAME,
			 "Audio Monitor Capture");

	s = pa_simple_new_proplist(NULL,
				   "OBS Spotify Overlay",
				   PA_STREAM_RECORD,
				   NULL,
				   "Music Monitor",
				   &ss,
				   &map,
				   NULL,
				   proplist,
				   &error);

	pa_proplist_free(proplist);

	if (!s) {
		pa_sample_spec monitor_spec = ss;
		pa_proplist *pl = pa_proplist_new();
		pa_proplist_sets(pl, PA_PROP_APPLICATION_NAME,
				 "OBS Spotify Overlay");

		s = pa_simple_new_proplist(NULL,
					   "OBS Spotify Overlay",
					   PA_STREAM_RECORD,
					   "@DEFAULT_MONITOR@",
					   "Audio Monitor",
					   &monitor_spec,
					   NULL,
					   NULL,
					   pl,
					   &error);
		pa_proplist_free(pl);

		if (!s) {
			blog(LOG_ERROR,
			     "[obs-spotify-overlay] PulseAudio: Failed to open monitor source: %s",
			     pa_strerror(error));
			return NULL;
		}
	}

	blog(LOG_INFO,
	     "[obs-spotify-overlay] PulseAudio monitor capture started");

	float sample_buffer[4096];
	float fft_input[256];
	float fft_output[256];
	float smoothed[AUDIO_FFT_SIZE];
	int sample_count = 0;

	for (int i = 0; i < AUDIO_FFT_SIZE; i++)
		smoothed[i] = 0.0f;

	while (g_pa_running) {
		int bytes_to_read = sizeof(float) * (256 - sample_count);
		if (bytes_to_read <= 0) {
			sample_count = 0;
			bytes_to_read = sizeof(float) * 256;
		}
		int ret = pa_simple_read(s, &sample_buffer[sample_count],
			bytes_to_read, &error);
		if (ret < 0) {
			blog(LOG_WARNING,
			     "[obs-spotify-overlay] PulseAudio read error: %s",
			     pa_strerror(error));
			usleep(10000);
			continue;
		}

		sample_count += bytes_to_read / sizeof(float);

		if (sample_count >= 256) {
			memcpy(fft_input, sample_buffer, sizeof(float) * 256);
			sample_count = 0;

			fft_real(fft_input, fft_output, 256);

			for (int i = 0; i < AUDIO_FFT_SIZE; i++) {
				float val = fft_output[i];
				if (val < 0)
					val = 0;
				if (val > 1.0f)
					val = 1.0f;
				smoothed[i] = smoothed[i] * 0.7f + val * 0.3f;
			}

			if (g_pa_callback) {
				g_pa_callback(smoothed, g_pa_user_data);
			}
		}
	}

	if (s)
		pa_simple_free(s);

	blog(LOG_INFO,
	     "[obs-spotify-overlay] PulseAudio monitor capture stopped");
	return NULL;
}

bool platform_audio_capture_start(audio_data_cb callback, void *user_data)
{
	if (g_pa_running)
		return true;

	g_pa_callback = callback;
	g_pa_user_data = user_data;
	g_pa_running = true;

	int ret = pthread_create(&g_pa_thread, NULL, pulse_capture_thread,
				 NULL);
	if (ret != 0) {
		blog(LOG_ERROR,
		     "[obs-spotify-overlay] Failed to create PulseAudio thread");
		g_pa_running = false;
		return false;
	}

	return true;
}

void platform_audio_capture_stop(void)
{
	if (!g_pa_running)
		return;

	g_pa_running = false;
	pthread_join(g_pa_thread, NULL);
	g_pa_callback = NULL;
	g_pa_user_data = NULL;
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
