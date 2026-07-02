#include "media-monitor.h"
#include <obs-module.h>
#include <string.h>
#include <stdlib.h>

#ifdef WINDOWS_BUILD
#include "platform/windows/smtc-monitor.h"
#elif defined(LINUX_BUILD)
#include "platform/linux/mpris-monitor.h"
#elif defined(MACOS_BUILD)
#include "platform/macos/mrmonitor.h"
#endif

#ifdef _WIN32
#include <windows.h>
static HANDLE g_monitor_thread = NULL;
static CRITICAL_SECTION g_cb_cs;
static bool g_cb_cs_init = false;
#else
#include <pthread.h>
#include <unistd.h>
static pthread_t g_monitor_thread;
static pthread_mutex_t g_cb_mutex = PTHREAD_MUTEX_INITIALIZER;
#endif

static volatile bool g_monitor_running = false;
static media_changed_cb g_callback = NULL;
static void *g_user_data = NULL;

static void cb_lock(void)
{
#ifdef _WIN32
	if (!g_cb_cs_init) {
		InitializeCriticalSection(&g_cb_cs);
		g_cb_cs_init = true;
	}
	EnterCriticalSection(&g_cb_cs);
#else
	pthread_mutex_lock(&g_cb_mutex);
#endif
}

static void cb_unlock(void)
{
#ifdef _WIN32
	LeaveCriticalSection(&g_cb_cs);
#else
	pthread_mutex_unlock(&g_cb_mutex);
#endif
}

#ifdef _WIN32
static DWORD WINAPI monitor_thread_func(LPVOID param)
#else
static void *monitor_thread_func(void *arg)
#endif
{
	UNUSED_PARAMETER(param);
#ifndef _WIN32
	UNUSED_PARAMETER(arg);
#endif

	blog(LOG_INFO, "[obs-spotify-overlay] Media monitor thread started");

	media_info_t prev_info;
	memset(&prev_info, 0, sizeof(media_info_t));

	while (g_monitor_running) {
		media_info_t info;
		memset(&info, 0, sizeof(media_info_t));

		platform_get_media_info(&info);

		bool changed = false;
		if (info.valid != prev_info.valid) {
			changed = true;
		} else if (info.valid && prev_info.valid) {
			if (strcmp(info.title, prev_info.title) != 0 ||
			strcmp(info.artist, prev_info.artist) != 0 ||
			info.is_playing != prev_info.is_playing ||
			(info.duration_ms > 0 &&
			llabs((int64_t)(info.progress_ms -
			prev_info.progress_ms)) >
			3000)) {
				changed = true;
			}
		}

		cb_lock();
		media_changed_cb cb = g_callback;
		void *ud = g_user_data;
		cb_unlock();

		if (changed && cb) {
			cb(&info, ud);
			memcpy(&prev_info, &info, sizeof(media_info_t));
		} else if (info.valid && cb) {
			cb(&info, ud);
			prev_info.progress_ms = info.progress_ms;
			prev_info.is_playing = info.is_playing;
		}

#ifdef _WIN32
		Sleep(1000);
#else
		sleep(1);
#endif
	}

	blog(LOG_INFO, "[obs-spotify-overlay] Media monitor thread stopped");
	return 0;
}

bool media_monitor_start(media_changed_cb callback, void *user_data)
{
if (g_monitor_running)
return true;

g_monitor_running = true;

if (callback) {
cb_lock();
g_callback = callback;
g_user_data = user_data;
cb_unlock();
}

#ifdef _WIN32
g_monitor_thread = CreateThread(NULL, 0, monitor_thread_func, NULL, 0, NULL);
if (!g_monitor_thread) {
#else
int ret = pthread_create(&g_monitor_thread, NULL, monitor_thread_func, NULL);
if (ret != 0) {
#endif
blog(LOG_ERROR,
"[obs-spotify-overlay] Failed to create monitor thread");
g_monitor_running = false;
return false;
}

  return true;
}

void media_monitor_stop(void)
{
	if (!g_monitor_running)
		return;

	g_monitor_running = false;

#ifdef _WIN32
	if (g_monitor_thread) {
		WaitForSingleObject(g_monitor_thread, 5000);
		CloseHandle(g_monitor_thread);
		g_monitor_thread = NULL;
	}
#else
	pthread_join(g_monitor_thread, NULL);
#endif

	cb_lock();
	g_callback = NULL;
	g_user_data = NULL;
	cb_unlock();

#ifdef _WIN32
	if (g_cb_cs_init) {
		DeleteCriticalSection(&g_cb_cs);
		g_cb_cs_init = false;
	}
#endif
}
