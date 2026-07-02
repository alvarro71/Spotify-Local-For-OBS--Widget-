#pragma once

#include <stddef.h>

char *base64_encode(const unsigned char *data, size_t input_length, size_t *output_length);
void base64_encode_inplace(const unsigned char *data, size_t input_length, char *out_buffer, size_t out_buffer_size);
