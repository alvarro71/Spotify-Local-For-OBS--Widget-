#pragma once

#include <stdbool.h>
#include <stdint.h>

#define AUDIO_FFT_SIZE 128

typedef void (*audio_data_cb)(const float frequency_data[AUDIO_FFT_SIZE], void *data);

bool audio_capture_start(audio_data_cb callback, void *user_data);
void audio_capture_stop(void);
