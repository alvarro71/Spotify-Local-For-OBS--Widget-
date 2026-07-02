#include "smtc-monitor.h"
#include <obs-module.h>

#ifdef WINDOWS_BUILD

#ifndef WIN32_LEAN_AND_MEAN
#define WIN32_LEAN_AND_MEAN
#endif

#include <windows.h>
#include <wchar.h>
#include <stdio.h>
#include <string.h>
#include <stdlib.h>

static const wchar_t PS_COMMAND[] =
	L"-NoProfile -ExecutionPolicy Bypass -Command \""
	L"Add-Type -AssemblyName System.Runtime.WindowsRuntime;"
	L"[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager,Windows.Media.Control,ContentType=WindowsRuntime]|Out-Null;"
	L"$mgr=[Windows.Media.Control.GlobalSystemMediaTransportControlsSessionManager]::RequestAsync().GetResults();"
	L"$s=$mgr.GetCurrentSession();"
	L"if($null -eq $s){Write-Output '{}';exit;};"
	L"$m=$s.TryGetMediaPropertiesAsync().GetResults();"
	L"$p=$s.GetPlaybackInfo();"
	L"$t=$s.GetTimelineProperties();"
	L"$b64='';"
	L"if($m.Thumbnail){try{$st=$m.Thumbnail.OpenReadAsync().GetResults();"
	L"if($st.Size -gt 0){$buf=New-Object byte[] $st.Size;"
	L"$r=New-Object Windows.Storage.Streams.DataReader $st;"
	L"$r.LoadAsync($st.Size).GetResults()|Out-Null;"
	L"$r.ReadBytes($buf);$b64=[Convert]::ToBase64String($buf);}"
	L"}catch{}};"
	L"@{title=$m.Title;artist=$m.Artist;albumArt=$b64;"
	L"isPlaying=($p.PlaybackStatus -eq 'Playing');"
	L"duration_ms=$t.EndTime.TotalMilliseconds;"
	L"progress_ms=$t.Position.TotalMilliseconds;"
	L"app=$s.SourceAppId}|ConvertTo-Json -Compress\"";

bool platform_get_media_info(media_info_t *info)
{
	info->valid = false;

	STARTUPINFOW si = {0};
	si.cb = sizeof(si);
	si.dwFlags = STARTF_USESHOWWINDOW | STARTF_USESTDHANDLES;
	si.wShowWindow = SW_HIDE;

	PROCESS_INFORMATION pi = {0};

	wchar_t powershell_path[MAX_PATH] = {0};
	GetSystemDirectoryW(powershell_path, MAX_PATH);
	wcscat_s(powershell_path, MAX_PATH,
		 L"\\WindowsPowerShell\\v1.0\\powershell.exe");

	wchar_t full_cmd[MAX_PATH + sizeof(PS_COMMAND) / sizeof(wchar_t) + 10] = {0};
	swprintf_s(full_cmd, _countof(full_cmd), L"\"%s\" %s",
		   powershell_path, PS_COMMAND);

	HANDLE h_read_pipe, h_write_pipe;
	SECURITY_ATTRIBUTES sa;
	sa.nLength = sizeof(SECURITY_ATTRIBUTES);
	sa.bInheritHandle = TRUE;
	sa.lpSecurityDescriptor = NULL;

	if (!CreatePipe(&h_read_pipe, &h_write_pipe, &sa, 131072)) {
		blog(LOG_WARNING,
		     "[obs-spotify-overlay] SMTC: CreatePipe failed");
		return false;
	}
	SetHandleInformation(h_read_pipe, HANDLE_FLAG_INHERIT, 0);

	si.hStdOutput = h_write_pipe;
	si.hStdError = h_write_pipe;

	BOOL created = CreateProcessW(NULL, full_cmd, NULL, NULL, TRUE,
				      CREATE_NO_WINDOW, NULL, NULL, &si, &pi);
	CloseHandle(h_write_pipe);

	if (!created) {
		CloseHandle(h_read_pipe);
		return false;
	}

	WaitForSingleObject(pi.hProcess, 5000);

	char output[131072] = {0};
	DWORD bytes_read = 0;
	DWORD total_read = 0;
	char chunk[4096];
	DWORD chunk_read = 0;

	while (ReadFile(h_read_pipe, chunk, sizeof(chunk) - 1,
			&chunk_read, NULL) &&
	       chunk_read > 0) {
		if (total_read + chunk_read < sizeof(output) - 1) {
			memcpy(output + total_read, chunk, chunk_read);
			total_read += chunk_read;
		}
	}
	output[total_read] = '\0';

	CloseHandle(h_read_pipe);
	CloseHandle(pi.hProcess);
	CloseHandle(pi.hThread);

	if (total_read == 0)
		return false;

	char *json_start = strchr(output, '{');
	if (!json_start)
		return false;

	char *json_end = strrchr(json_start, '}');
	if (!json_end)
		return false;
	json_end[1] = '\0';

	if (strlen(json_start) < 5) {
		info->valid = false;
		return false;
	}

	char *ptr;

	ptr = strstr(json_start, "\"title\":");
	if (ptr) {
		char *val = strchr(ptr + 8, '"');
		if (val) {
			val++;
			char *end = strchr(val, '"');
			if (end) {
				size_t len = end - val;
				if (len >= sizeof(info->title))
					len = sizeof(info->title) - 1;
				memcpy(info->title, val, len);
				info->title[len] = '\0';
			}
		}
	}

	ptr = strstr(json_start, "\"artist\":");
	if (ptr) {
		char *val = strchr(ptr + 9, '"');
		if (val) {
			val++;
			char *end = strchr(val, '"');
			if (end) {
				size_t len = end - val;
				if (len >= sizeof(info->artist))
					len = sizeof(info->artist) - 1;
				memcpy(info->artist, val, len);
				info->artist[len] = '\0';
			}
		}
	}

	ptr = strstr(json_start, "\"albumArt\":");
	if (ptr) {
		char *val = strchr(ptr + 11, '"');
		if (val) {
			val++;
			char *end = strchr(val, '"');
			if (end) {
				size_t len = end - val;
				size_t max_len = sizeof(info->album_art_base64) - 23;
				if (len > max_len)
					len = max_len;
				memcpy(info->album_art_base64,
				       "data:image/png;base64,", 22);
				memcpy(info->album_art_base64 + 22, val, len);
				info->album_art_base64[22 + len] = '\0';
			}
		}
	}

	ptr = strstr(json_start, "\"isPlaying\":");
	if (ptr) {
		ptr += 12;
		while (*ptr == ' ') ptr++;
		info->is_playing = (strncmp(ptr, "true", 4) == 0);
	}

	ptr = strstr(json_start, "\"duration_ms\":");
	if (ptr)
		info->duration_ms = strtoull(ptr + 14, NULL, 10);

	ptr = strstr(json_start, "\"progress_ms\":");
	if (ptr)
		info->progress_ms = strtoull(ptr + 14, NULL, 10);

	ptr = strstr(json_start, "\"app\":");
	if (ptr) {
		char *val = strchr(ptr + 6, '"');
		if (val) {
			val++;
			char *end = strchr(val, '"');
			if (end) {
				size_t len = end - val;
				if (len >= sizeof(info->app_id))
					len = sizeof(info->app_id) - 1;
				memcpy(info->app_id, val, len);
				info->app_id[len] = '\0';
			}
		}
	}

	info->valid = (info->title[0] != '\0');
	return info->valid;
}

#else

bool platform_get_media_info(media_info_t *info)
{
	info->valid = false;
	return false;
}

#endif
