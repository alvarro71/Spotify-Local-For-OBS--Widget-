#include "audio-capture.h"
#include <obs-module.h>
#include <string.h>

#ifdef WINDOWS_BUILD
#include "platform/windows/wasapi-capture.h"
#elif defined(LINUX_BUILD)
#include "platform/linux/pulse-capture.h"
#elif defined(MACOS_BUILD)
#include "platform/macos/coreaudio-capture.h"
#endif

static audio_data_cb g_callback = NULL;
static void *g_user_data = NULL;
static bool g_started = false;

bool audio_capture_start(audio_data_cb callback, void *user_data)
{
	if (g_started)
		return true;

	g_callback = callback;
	g_user_data = user_data;

#ifdef WINDOWS_BUILD
	g_started = platform_audio_capture_start(callback, user_data);
#elif defined(LINUX_BUILD)
	g_started = platform_audio_capture_start(callback, user_data);
#elif defined(MACOS_BUILD)
	g_started = platform_audio_capture_start(callback, user_data);
#else
	blog(LOG_WARNING,
	     "[obs-spotify-overlay] Audio capture not supported on this platform");
	g_started = false;
#endif

	if (g_started) {
		blog(LOG_INFO,
		     "[obs-spotify-overlay] Audio capture started");
	}

	return g_started;
}

void audio_capture_stop(void)
{
	if (!g_started)
		return;

#ifdef WINDOWS_BUILD
	platform_audio_capture_stop();
#elif defined(LINUX_BUILD)
	platform_audio_capture_stop();
#elif defined(MACOS_BUILD)
	platform_audio_capture_stop();
#endif

	g_started = false;
	g_callback = NULL;
	g_user_data = NULL;

	blog(LOG_INFO, "[obs-spotify-overlay] Audio capture stopped");
}
