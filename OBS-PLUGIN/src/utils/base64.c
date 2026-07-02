#include "base64.h"
#include <obs-module.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>

static const char b64_table[] =
	"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

char *base64_encode(const unsigned char *data, size_t input_length,
	size_t *output_length)
{
	*output_length = 4 * ((input_length + 2) / 3);
	char *encoded = bzalloc(*output_length + 1);
	if (!encoded)
		return NULL;

	size_t i, j;
	for (i = 0, j = 0; i < input_length;) {
		uint32_t a = i < input_length ? data[i++] : 0;
		uint32_t b = i < input_length ? data[i++] : 0;
		uint32_t c = i < input_length ? data[i++] : 0;
		uint32_t triple = (a << 16) | (b << 8) | c;

		encoded[j++] = b64_table[(triple >> 18) & 0x3F];
		encoded[j++] = b64_table[(triple >> 12) & 0x3F];
		encoded[j++] =
			(i > input_length + 1) ? '=' : b64_table[(triple >> 6) & 0x3F];
		encoded[j++] =
			(i > input_length) ? '=' : b64_table[triple & 0x3F];
	}

	encoded[*output_length] = '\0';
	return encoded;
}

void base64_encode_inplace(const unsigned char *data, size_t input_length,
	char *out_buffer, size_t out_buffer_size)
{
	size_t out_len;
	char *encoded = base64_encode(data, input_length, &out_len);
	if (!encoded || out_len >= out_buffer_size) {
		if (encoded)
			bfree(encoded);
		out_buffer[0] = '\0';
		return;
	}
	memcpy(out_buffer, encoded, out_len + 1);
	bfree(encoded);
}
