#include "spotify-source.h"
#include "media-monitor.h"
#include "audio-capture.h"
#include "http-server.h"

#include <obs-module.h>
#include <stdio.h>
#include <string.h>
#include <math.h>

#ifdef _WIN32
#include <windows.h>
#endif

#define SPOTIFY_SOURCE_ID "obs-spotify-overlay"
#define SPOTIFY_SOURCE_NAME "Spotify Now Playing"

typedef struct {
	obs_source_t *source;
	bool visible;

	media_info_t current_media;
	float frequency_data[AUDIO_FFT_SIZE];
	bool media_initialized;
	bool audio_initialized;
} spotify_data_t;

static spotify_data_t *g_active_instance = NULL;

#ifdef _WIN32
static CRITICAL_SECTION g_cs;
static bool g_cs_initialized = false;

static void ensure_cs_init(void)
{
	if (!g_cs_initialized) {
		InitializeCriticalSection(&g_cs);
		g_cs_initialized = true;
	}
}

static void cs_enter(void)  { ensure_cs_init(); EnterCriticalSection(&g_cs); }
static void cs_leave(void)  { LeaveCriticalSection(&g_cs); }
#else
#include <pthread.h>
static pthread_mutex_t g_mutex = PTHREAD_MUTEX_INITIALIZER;
static void cs_enter(void)  { pthread_mutex_lock(&g_mutex); }
static void cs_leave(void)  { pthread_mutex_unlock(&g_mutex); }
#endif

static size_t json_escape(const char *src, char *dst, size_t dst_size)
{
	size_t j = 0;
	for (size_t i = 0; src[i] && j + 6 < dst_size; i++) {
		switch (src[i]) {
		case '"':  if (j + 2 < dst_size) { dst[j++] = '\\'; dst[j++] = '"'; } break;
		case '\\': if (j + 2 < dst_size) { dst[j++] = '\\'; dst[j++] = '\\'; } break;
		case '\b': if (j + 2 < dst_size) { dst[j++] = '\\'; dst[j++] = 'b'; } break;
		case '\f': if (j + 2 < dst_size) { dst[j++] = '\\'; dst[j++] = 'f'; } break;
		case '\n': if (j + 2 < dst_size) { dst[j++] = '\\'; dst[j++] = 'n'; } break;
		case '\r': if (j + 2 < dst_size) { dst[j++] = '\\'; dst[j++] = 'r'; } break;
		case '\t': if (j + 2 < dst_size) { dst[j++] = '\\'; dst[j++] = 't'; } break;
		default:
			if ((unsigned char)src[i] < 0x20) {
				j += snprintf(dst + j, dst_size - j,
					"\\u%04x", (unsigned char)src[i]);
			} else {
				dst[j++] = src[i];
			}
			break;
		}
	}
	if (j < dst_size)
		dst[j] = '\0';
	else if (dst_size > 0)
		dst[dst_size - 1] = '\0';
	return j;
}

static char *build_media_json(spotify_data_t *data)
{
	media_info_t *m = &data->current_media;

	char esc_title[1024];
	char esc_artist[1024];
	char esc_album[65536 + 64];
	char esc_app[512];

	json_escape(m->title, esc_title, sizeof(esc_title));
	json_escape(m->artist, esc_artist, sizeof(esc_artist));
	json_escape(m->album_art_base64, esc_album, sizeof(esc_album));
	json_escape(m->app_id, esc_app, sizeof(esc_app));

	size_t buf_size = sizeof(esc_title) + sizeof(esc_artist) +
		sizeof(esc_album) + sizeof(esc_app) + 256;
	char *buf = bzalloc(buf_size);
	if (!buf)
		return NULL;

	int written = snprintf(buf, buf_size,
		"{\"title\":\"%s\","
		"\"artist\":\"%s\","
		"\"albumArt\":\"%s\","
		"\"progress_ms\":%llu,"
		"\"duration_ms\":%llu,"
		"\"isPlaying\":%s,"
		"\"app\":\"%s\","
		"\"valid\":%s}",
		esc_title,
		esc_artist,
		esc_album,
		(unsigned long long)m->progress_ms,
		(unsigned long long)m->duration_ms,
		m->is_playing ? "true" : "false",
		esc_app,
		m->valid ? "true" : "false");

	if (written < 0) {
		bfree(buf);
		return NULL;
	}

	return buf;
}

static void on_media_changed(const media_info_t *info, void *user_data)
{
	media_info_t local_media;

	cs_enter();
	spotify_data_t *data = g_active_instance;
	if (!data) {
		cs_leave();
		return;
	}
	memcpy(&data->current_media, info, sizeof(media_info_t));
	memcpy(&local_media, &data->current_media, sizeof(media_info_t));
	data->media_initialized = true;
	cs_leave();

	spotify_data_t tmp;
	memcpy(&tmp.current_media, &local_media, sizeof(media_info_t));

	char *json = build_media_json(&tmp);
	if (json)
		http_server_push_media(json);
	if (json)
		bfree(json);

	UNUSED_PARAMETER(user_data);
}

static void on_audio_data(const float frequency_data[AUDIO_FFT_SIZE],
	void *user_data)
{
	float local_freq[AUDIO_FFT_SIZE];

	cs_enter();
	spotify_data_t *data = g_active_instance;
	if (!data) {
		cs_leave();
		return;
	}
	memcpy(data->frequency_data, frequency_data, sizeof(data->frequency_data));
	memcpy(local_freq, data->frequency_data, sizeof(local_freq));
	data->audio_initialized = true;
	cs_leave();

	http_server_push_audio(local_freq, AUDIO_FFT_SIZE);

	UNUSED_PARAMETER(user_data);
}

static void *spotify_create(obs_data_t *settings, obs_source_t *source)
{
	spotify_data_t *data = bzalloc(sizeof(spotify_data_t));
	data->source = source;
	data->visible = true;
	data->media_initialized = false;
	data->audio_initialized = false;
	memset(&data->current_media, 0, sizeof(media_info_t));
	memset(data->frequency_data, 0, sizeof(data->frequency_data));

	cs_enter();
	g_active_instance = data;
	cs_leave();

	media_monitor_start(on_media_changed, data);
	audio_capture_start(on_audio_data, data);

	http_server_start();

	blog(LOG_INFO, "[obs-spotify-overlay] Source created");
	blog(LOG_INFO, "[obs-spotify-overlay] Add Browser Source in OBS "
		"with URL: http://localhost:%d/overlay", HTTP_SERVER_PORT);
	UNUSED_PARAMETER(settings);
	return data;
}

static void spotify_destroy(void *data)
{
	spotify_data_t *s = (spotify_data_t *)data;
	if (!s)
		return;

	cs_enter();
	if (g_active_instance == s)
		g_active_instance = NULL;
	cs_leave();

	media_monitor_stop();
	audio_capture_stop();
	http_server_stop();

	bfree(s);
	blog(LOG_INFO, "[obs-spotify-overlay] Source destroyed");
}

static uint32_t spotify_get_width(void *data)
{
	UNUSED_PARAMETER(data);
	return 450;
}

static uint32_t spotify_get_height(void *data)
{
	UNUSED_PARAMETER(data);
	return 110;
}

static void spotify_show(void *data)
{
	spotify_data_t *s = (spotify_data_t *)data;
	s->visible = true;
}

static void spotify_hide(void *data)
{
	spotify_data_t *s = (spotify_data_t *)data;
	s->visible = false;
}

static const char *spotify_getname(void *type_data)
{
	UNUSED_PARAMETER(type_data);
	return SPOTIFY_SOURCE_NAME;
}

struct obs_source_info spotify_source_info = {
	.id = SPOTIFY_SOURCE_ID,
	.type = OBS_SOURCE_TYPE_INPUT,
	.output_flags = 0,
	.get_name = spotify_getname,
	.create = spotify_create,
	.destroy = spotify_destroy,
	.get_width = spotify_get_width,
	.get_height = spotify_get_height,
	.show = spotify_show,
	.hide = spotify_hide,
	.version = 1,
};

void spotify_source_register(void)
{
	obs_register_source(&spotify_source_info);
}

void spotify_source_unregister(void)
{
	media_monitor_stop();
	audio_capture_stop();
	http_server_stop();

#ifdef _WIN32
	if (g_cs_initialized) {
		DeleteCriticalSection(&g_cs);
		g_cs_initialized = false;
	}
#endif
}
