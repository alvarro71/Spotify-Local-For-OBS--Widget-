#pragma once

#include <stdbool.h>
#include <stdint.h>

#define HTTP_SERVER_PORT 9274

bool http_server_start(void);
void http_server_stop(void);
void http_server_set_data_path(const char *path);
void http_server_push_media(const char *json);
void http_server_push_audio(const float *freq_data, int count);
