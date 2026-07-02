#pragma once

#include "../../audio-capture.h"

bool platform_audio_capture_start(audio_data_cb callback, void *user_data);
void platform_audio_capture_stop(void);
