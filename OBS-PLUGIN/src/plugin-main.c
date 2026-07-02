#include <obs-module.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

#ifdef _WIN32
#include <windows.h>
#include <tlhelp32.h>
#endif

OBS_DECLARE_MODULE()
OBS_MODULE_USE_DEFAULT_LOCALE("obs-spotify-overlay", "en-US")

MODULE_EXPORT const char *obs_module_description(void)
{
return "Spotify Now Playing Overlay for OBS Studio";
}

#ifdef _WIN32
static PROCESS_INFORMATION g_server_pi = {0};
static char g_server_path[MAX_PATH] = {0};

static void start_server(void)
{
char dll_path[MAX_PATH];
GetModuleFileNameA(GetModuleHandleA("obs-spotify-overlay"), dll_path, MAX_PATH);

// DLL is at: ...\obs-plugins\64bit\obs-spotify-overlay.dll
// Server should be at: ...\obs-plugins\64bit\SpotifyOverlayServer.exe
char *p = strrchr(dll_path, '\\');
if (!p) return;

*p = '\0';
snprintf(g_server_path, sizeof(g_server_path), "%s\\SpotifyOverlayServer.exe", dll_path);

// Check if server exists
if (GetFileAttributesA(g_server_path) == INVALID_FILE_ATTRIBUTES) {
blog(LOG_WARNING, "[obs-spotify-overlay] Server not found at: %s", g_server_path);
return;
}

// Check if already running
HANDLE h = CreateToolhelp32Snapshot(TH32CS_SNAPPROCESS, 0);
if (h != INVALID_HANDLE_VALUE) {
PROCESSENTRY32 pe = { sizeof(pe) };
if (Process32First(h, &pe)) {
do {
if (strstr(pe.szExeFile, "SpotifyOverlayServer") != NULL) {
blog(LOG_INFO, "[obs-spotify-overlay] Server already running");
CloseHandle(h);
return;
}
} while (Process32Next(h, &pe));
}
CloseHandle(h);
}

STARTUPINFOA si = { sizeof(si) };
si.dwFlags = STARTF_USESHOWWINDOW;
si.wShowWindow = SW_HIDE;

if (CreateProcessA(NULL, g_server_path, NULL, NULL, FALSE,
CREATE_NO_WINDOW, NULL, NULL, &si, &g_server_pi)) {
blog(LOG_INFO, "[obs-spotify-overlay] Server started: %s", g_server_path);
} else {
blog(LOG_WARNING, "[obs-spotify-overlay] Failed to start server, error: %lu", GetLastError());
}
}

static void stop_server(void)
{
if (g_server_pi.hProcess) {
TerminateProcess(g_server_pi.hProcess, 0);
CloseHandle(g_server_pi.hProcess);
CloseHandle(g_server_pi.hThread);
memset(&g_server_pi, 0, sizeof(g_server_pi));
blog(LOG_INFO, "[obs-spotify-overlay] Server stopped");
}
}
#endif

bool obs_module_load(void)
{
blog(LOG_INFO, "[obs-spotify-overlay] Plugin loading...");

#ifdef _WIN32
start_server();
#endif

blog(LOG_INFO, "[obs-spotify-overlay] Plugin loaded successfully");
blog(LOG_INFO, "[obs-spotify-overlay] Add a Browser source with URL: http://localhost:9274/");
blog(LOG_INFO, "[obs-spotify-overlay] Recommended size: 450x150");
return true;
}

void obs_module_unload(void)
{
blog(LOG_INFO, "[obs-spotify-overlay] Plugin unloading...");

#ifdef _WIN32
stop_server();
#endif

blog(LOG_INFO, "[obs-spotify-overlay] Plugin unloaded");
}
