#include "http-server.h"
#include "audio-capture.h"
#include "overlay_content.h"
#include <obs-module.h>
#include <util/platform.h>

#ifdef _WIN32
#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif
#include <windows.h>
#include <winsock2.h>
#include <ws2tcpip.h>
#pragma comment(lib, "ws2_32.lib")
#else
#include <sys/socket.h>
#include <netinet/in.h>
#include <arpa/inet.h>
#include <unistd.h>
#include <pthread.h>
#include <errno.h>
#include <string.h>
#endif

#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <math.h>

static volatile bool g_server_running = false;
static int g_server_socket = -1;

#ifdef _WIN32
static HANDLE g_server_thread = NULL;
static CRITICAL_SECTION g_media_cs;
static CRITICAL_SECTION g_audio_cs;
static bool g_media_cs_init = false;
static bool g_audio_cs_init = false;
#else
static pthread_t g_server_thread;
static pthread_mutex_t g_media_mutex = PTHREAD_MUTEX_INITIALIZER;
static pthread_mutex_t g_audio_mutex = PTHREAD_MUTEX_INITIALIZER;
#endif

static char g_media_json[131072] = {0};
static char g_audio_json[AUDIO_FFT_SIZE * 16 + 256] = {0};
static bool g_media_valid = false;

static const char HTTP_200_OK[] =
	"HTTP/1.1 200 OK\r\n"
	"Access-Control-Allow-Origin: *\r\n"
	"Access-Control-Allow-Methods: GET, OPTIONS\r\n"
	"Access-Control-Allow-Headers: *\r\n";

static const char CONTENT_HTML[] = "Content-Type: text/html; charset=utf-8\r\n";
static const char CONTENT_JSON[] = "Content-Type: application/json; charset=utf-8\r\n";
static const char CONTENT_SSE[] = "Content-Type: text/event-stream; charset=utf-8\r\n"
				   "Cache-Control: no-cache\r\n"
				   "Connection: keep-alive\r\n";
static const char CONTENT_ICO[] = "Content-Type: image/x-icon\r\n";

static const char CORS_OPTIONS[] =
	"HTTP/1.1 204 No Content\r\n"
	"Access-Control-Allow-Origin: *\r\n"
	"Access-Control-Allow-Methods: GET, OPTIONS\r\n"
	"Access-Control-Allow-Headers: *\r\n"
	"Access-Control-Max-Age: 86400\r\n"
	"Content-Length: 0\r\n\r\n";

static void send_response(int client_fd, const char *status_headers,
	const char *content_type, const char *body, size_t body_len)
{
	char header[1024];
	int hlen = snprintf(header, sizeof(header),
		"%s%sContent-Length: %llu\r\n\r\n",
		status_headers, content_type,
		(unsigned long long)body_len);

#ifdef _WIN32
	send(client_fd, header, hlen, 0);
	send(client_fd, body, (int)body_len, 0);
#else
	send(client_fd, header, hlen, MSG_NOSIGNAL);
	send(client_fd, body, body_len, MSG_NOSIGNAL);
#endif
}

static void handle_sse_client(int client_fd)
{
	blog(LOG_INFO,
		"[obs-spotify-overlay] SSE client connected");

	send(client_fd, HTTP_200_OK, strlen(HTTP_200_OK), 0);
	send(client_fd, CONTENT_SSE, strlen(CONTENT_SSE), 0);
	send(client_fd, "\r\n", 2, 0);

	int keepalive_counter = 0;

	while (g_server_running) {
		char media_copy[sizeof(g_media_json)] = {0};
		char audio_copy[sizeof(g_audio_json)] = {0};

#ifdef _WIN32
		if (g_media_cs_init) EnterCriticalSection(&g_media_cs);
#else
		pthread_mutex_lock(&g_media_mutex);
#endif
		memcpy(media_copy, g_media_json, sizeof(g_media_json));
#ifdef _WIN32
		if (g_media_cs_init) LeaveCriticalSection(&g_media_cs);
#else
		pthread_mutex_unlock(&g_media_mutex);
#endif

#ifdef _WIN32
		if (g_audio_cs_init) EnterCriticalSection(&g_audio_cs);
#else
		pthread_mutex_lock(&g_audio_mutex);
#endif
		memcpy(audio_copy, g_audio_json, sizeof(g_audio_json));
#ifdef _WIN32
		if (g_audio_cs_init) LeaveCriticalSection(&g_audio_cs);
#else
		pthread_mutex_unlock(&g_audio_mutex);
#endif

		if (media_copy[0]) {
			char sse_msg[sizeof(media_copy) + 64];
			int ml = snprintf(sse_msg, sizeof(sse_msg),
				"event: media\ndata: %s\n\n", media_copy);
			if (send(client_fd, sse_msg, ml,
#ifdef _WIN32
				0
#else
				MSG_NOSIGNAL
#endif
			) <= 0)
				break;
		}

		if (audio_copy[0]) {
			char sse_msg[sizeof(audio_copy) + 64];
			int ml = snprintf(sse_msg, sizeof(sse_msg),
				"event: audio\ndata: %s\n\n", audio_copy);
			if (send(client_fd, sse_msg, ml,
#ifdef _WIN32
				0
#else
				MSG_NOSIGNAL
#endif
			) <= 0)
				break;
		}

		keepalive_counter++;
		if (keepalive_counter >= 10) {
			keepalive_counter = 0;
			if (send(client_fd, ":keepalive\n\n", 12,
#ifdef _WIN32
				0
#else
				MSG_NOSIGNAL
#endif
			) <= 0)
				break;
		}

#ifdef _WIN32
		Sleep(100);
#else
		usleep(100000);
#endif
	}

	blog(LOG_INFO,
		"[obs-spotify-overlay] SSE client disconnected");
}

static void handle_client(int client_fd, const char *request)
{
	if (strncmp(request, "OPTIONS", 7) == 0) {
		send(client_fd, CORS_OPTIONS, strlen(CORS_OPTIONS), 0);
		return;
	}

	char method[16] = {0};
	char path[512] = {0};
	sscanf(request, "%15s %511s", method, path);

	if (strcmp(path, "/") == 0 || strcmp(path, "/overlay") == 0 ||
		strcmp(path, "/index.html") == 0 ||
		strcmp(path, "/style.css") == 0 ||
		strcmp(path, "/script.js") == 0) {
		// Serve the embedded overlay HTML (includes CSS and JS inline)
		send_response(client_fd, HTTP_200_OK, CONTENT_HTML,
			OVERLAY_HTML, strlen(OVERLAY_HTML));
	} else if (strcmp(path, "/events") == 0) {
		handle_sse_client(client_fd);
		return;
	} else if (strcmp(path, "/api/media") == 0) {
		char media_copy[sizeof(g_media_json)] = {0};
#ifdef _WIN32
		if (g_media_cs_init) EnterCriticalSection(&g_media_cs);
#else
		pthread_mutex_lock(&g_media_mutex);
#endif
		memcpy(media_copy, g_media_json, sizeof(g_media_json));
#ifdef _WIN32
		if (g_media_cs_init) LeaveCriticalSection(&g_media_cs);
#else
		pthread_mutex_unlock(&g_media_mutex);
#endif

		if (media_copy[0]) {
			send_response(client_fd, HTTP_200_OK,
				CONTENT_JSON, media_copy, strlen(media_copy));
		} else {
			const char *empty = "{}";
			send_response(client_fd, HTTP_200_OK,
				CONTENT_JSON, empty, strlen(empty));
		}
	} else if (strcmp(path, "/favicon.ico") == 0) {
		const char *empty = "";
		send_response(client_fd, HTTP_200_OK,
			CONTENT_ICO, empty, 0);
	} else {
		const char *not_found =
			"HTTP/1.1 404 Not Found\r\n"
			"Content-Length: 9\r\n\r\nNot Found";
		send(client_fd, not_found, strlen(not_found), 0);
	}
}

#ifdef _WIN32
static DWORD WINAPI http_server_thread(LPVOID param)
#else
static void *http_server_thread(void *arg)
#endif
{
	UNUSED_PARAMETER(param);
#ifndef _WIN32
	UNUSED_PARAMETER(arg);
#endif

	blog(LOG_INFO,
		"[obs-spotify-overlay] HTTP server listening on port %d",
		HTTP_SERVER_PORT);

	while (g_server_running) {
		struct sockaddr_in client_addr;
#ifdef _WIN32
		int addr_len = sizeof(client_addr);
#else
		socklen_t addr_len = sizeof(client_addr);
#endif

		int client_fd = accept(g_server_socket,
			(struct sockaddr *)&client_addr, &addr_len);
		if (client_fd < 0) {
			if (g_server_running)
				Sleep(10);
			continue;
		}

		struct timeval tv;
		tv.tv_sec = 2;
		tv.tv_usec = 0;
		setsockopt(client_fd, SOL_SOCKET, SO_RCVTIMEO,
			(const char *)&tv, sizeof(tv));

		char request[4096] = {0};
		int received = recv(client_fd, request, sizeof(request) - 1, 0);

		if (received > 0) {
			request[received] = '\0';
			handle_client(client_fd, request);
		}

#ifdef _WIN32
		closesocket(client_fd);
#else
		close(client_fd);
#endif
	}

	blog(LOG_INFO, "[obs-spotify-overlay] HTTP server stopped");
	return 0;
}

bool http_server_start(void)
{
if (g_server_running)
return true;

#ifdef _WIN32
WSADATA wsa_data;
if (WSAStartup(MAKEWORD(2, 2), &wsa_data) != 0) {
blog(LOG_ERROR,
"[obs-spotify-overlay] WSAStartup failed");
return false;
}

	if (!g_media_cs_init) {
		InitializeCriticalSection(&g_media_cs);
		g_media_cs_init = true;
	}
	if (!g_audio_cs_init) {
		InitializeCriticalSection(&g_audio_cs);
		g_audio_cs_init = true;
	}
#endif

	g_server_socket = (int)socket(AF_INET, SOCK_STREAM, 0);
	if (g_server_socket < 0) {
		blog(LOG_ERROR,
			"[obs-spotify-overlay] Failed to create socket");
		return false;
	}

	int opt = 1;
	setsockopt(g_server_socket, SOL_SOCKET, SO_REUSEADDR,
		(const char *)&opt, sizeof(opt));

	struct sockaddr_in addr;
	memset(&addr, 0, sizeof(addr));
	addr.sin_family = AF_INET;
	addr.sin_addr.s_addr = htonl(INADDR_LOOPBACK);
	addr.sin_port = htons(HTTP_SERVER_PORT);

	if (bind(g_server_socket, (struct sockaddr *)&addr,
		sizeof(addr)) != 0) {
		blog(LOG_ERROR,
			"[obs-spotify-overlay] Failed to bind port %d",
			HTTP_SERVER_PORT);
#ifdef _WIN32
		closesocket(g_server_socket);
#else
		close(g_server_socket);
#endif
		g_server_socket = -1;
		return false;
	}

	if (listen(g_server_socket, 10) != 0) {
		blog(LOG_ERROR,
			"[obs-spotify-overlay] Failed to listen on port %d",
			HTTP_SERVER_PORT);
#ifdef _WIN32
		closesocket(g_server_socket);
#else
		close(g_server_socket);
#endif
		g_server_socket = -1;
		return false;
	}

	g_server_running = true;

#ifdef _WIN32
	g_server_thread = CreateThread(NULL, 0, http_server_thread,
		NULL, 0, NULL);
	if (!g_server_thread) {
#else
	int ret = pthread_create(&g_server_thread, NULL,
		http_server_thread, NULL);
	if (ret != 0) {
#endif
		blog(LOG_ERROR,
			"[obs-spotify-overlay] Failed to create HTTP thread");
		g_server_running = false;
#ifdef _WIN32
		closesocket(g_server_socket);
#else
		close(g_server_socket);
#endif
		return false;
	}

	return true;
}

void http_server_stop(void)
{
	if (!g_server_running)
		return;

	g_server_running = false;

	if (g_server_socket >= 0) {
#ifdef _WIN32
		closesocket(g_server_socket);
#else
		close(g_server_socket);
#endif
		g_server_socket = -1;
	}

#ifdef _WIN32
	if (g_server_thread) {
		WaitForSingleObject(g_server_thread, 3000);
		CloseHandle(g_server_thread);
		g_server_thread = NULL;
		WSACleanup();
	}
#else
	pthread_join(g_server_thread, NULL);
#endif

#ifdef _WIN32
	if (g_media_cs_init) {
		DeleteCriticalSection(&g_media_cs);
		g_media_cs_init = false;
	}
	if (g_audio_cs_init) {
		DeleteCriticalSection(&g_audio_cs);
		g_audio_cs_init = false;
	}
#endif
}

void http_server_push_media(const char *json)
{
#ifdef _WIN32
	if (g_media_cs_init) EnterCriticalSection(&g_media_cs);
#else
	pthread_mutex_lock(&g_media_mutex);
#endif
	snprintf(g_media_json, sizeof(g_media_json), "%s", json);
#ifdef _WIN32
	if (g_media_cs_init) LeaveCriticalSection(&g_media_cs);
#else
	pthread_mutex_unlock(&g_media_mutex);
#endif
}

void http_server_push_audio(const float *freq_data, int count)
{
	int offset = 0;
	char buf[sizeof(g_audio_json)] = {0};

	offset = snprintf(buf, sizeof(buf), "[");
	for (int i = 0; i < count && offset < (int)sizeof(buf) - 32; i++) {
		float val = freq_data[i];
		if (isnan(val) || isinf(val))
			val = 0.0f;
		if (val < 0.0f)
			val = 0.0f;
		offset += snprintf(buf + offset, sizeof(buf) - offset,
			"%s%.4f", i > 0 ? "," : "", val);
	}
	if (offset < (int)sizeof(buf) - 4)
		offset += snprintf(buf + offset, sizeof(buf) - offset, "]");

#ifdef _WIN32
	if (g_audio_cs_init) EnterCriticalSection(&g_audio_cs);
#else
	pthread_mutex_lock(&g_audio_mutex);
#endif
	snprintf(g_audio_json, sizeof(g_audio_json), "%s", buf);
#ifdef _WIN32
	if (g_audio_cs_init) LeaveCriticalSection(&g_audio_cs);
#else
	pthread_mutex_unlock(&g_audio_mutex);
#endif
}
