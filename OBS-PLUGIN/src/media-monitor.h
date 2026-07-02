#pragma once

#include <stdbool.h>
#include <stdint.h>

typedef struct {
	char title[512];
	char artist[512];
	char album_art_base64[65536];
	uint64_t progress_ms;
	uint64_t duration_ms;
	bool is_playing;
	char app_id[256];
	bool valid;
} media_info_t;

typedef void (*media_changed_cb)(const media_info_t *info, void *data);

bool media_monitor_start(media_changed_cb callback, void *user_data);
void media_monitor_stop(void);
