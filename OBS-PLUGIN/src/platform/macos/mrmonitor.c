#include "mrmonitor.h"
#include <obs-module.h>

#ifdef MACOS_BUILD

#include <CoreFoundation/CoreFoundation.h>
#include <Foundation/Foundation.h>
#include <dlfcn.h>
#include <stdio.h>
#include <string.h>

typedef void (*MRMediaRemoteGetNowPlayingInfoFunction)(dispatch_queue_t queue,
						       void (^callback)(NSDictionary *));

typedef void (*MRMediaRemoteGetNowPlayingApplicationIsPlayingFunction)(
	dispatch_queue_t queue, void (^callback)(BOOL));

static void *g_media_remote_handle = NULL;

typedef struct {
	const char *name;
	void *func;
} mr_symbol_t;

static void *load_mr_function(const char *name)
{
	if (!g_media_remote_handle) {
		g_media_remote_handle = dlopen(
			"/System/Library/PrivateFrameworks/MediaRemote.framework/MediaRemote",
			RTLD_LAZY);
		if (!g_media_remote_handle) {
			blog(LOG_ERROR,
			     "[obs-spotify-overlay] MediaRemote: Cannot load framework");
			return NULL;
		}
	}

	return dlsym(g_media_remote_handle, name);
}

bool platform_get_media_info(media_info_t *info)
{
	info->valid = false;

	typedef void (*MRGetNowPlayingInfoFunc)(dispatch_queue_t,
						void (^)(NSDictionary *));
	MRGetNowPlayingInfoFunc MRMediaRemoteGetNowPlayingInfo =
		(MRGetNowPlayingInfoFunc)load_mr_function(
			"MRMediaRemoteGetNowPlayingInfo");

	typedef void (*MRGetPlayingFunc)(dispatch_queue_t, void (^)(BOOL));
	MRGetPlayingFunc MRMediaRemoteGetNowPlayingApplicationIsPlaying =
		(MRGetPlayingFunc)load_mr_function(
			"MRMediaRemoteGetNowPlayingApplicationIsPlaying");

	if (!MRMediaRemoteGetNowPlayingInfo) {
		blog(LOG_WARNING,
		     "[obs-spotify-overlay] MediaRemote: Functions not available");
		return false;
	}

	__block NSDictionary *now_playing = nil;
	__block BOOL is_playing = NO;
	__block BOOL got_info = NO;
	__block BOOL got_playing = NO;

	dispatch_semaphore_t sem = dispatch_semaphore_create(0);
	dispatch_queue_t queue = dispatch_get_global_queue(
		DISPATCH_QUEUE_PRIORITY_DEFAULT, 0);

	MRMediaRemoteGetNowPlayingInfo(queue, ^(NSDictionary *np_info) {
		now_playing = [np_info copy];
		got_info = YES;
		dispatch_semaphore_signal(sem);
	});

	MRMediaRemoteGetNowPlayingApplicationIsPlaying(
		queue, ^(BOOL playing) {
			is_playing = playing;
			got_playing = YES;
			dispatch_semaphore_signal(sem);
		});

	dispatch_semaphore_wait(sem,
				 dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC));
	dispatch_semaphore_wait(sem,
				 dispatch_time(DISPATCH_TIME_NOW, 2 * NSEC_PER_SEC));

	if (!got_info || !now_playing) {
		return false;
	}

	@autoreleasepool {
		NSString *title =
			now_playing[@"kMRMediaRemoteNowPlayingInfoTitle"]
				?: now_playing[@"title"]
				?: @"";
		NSString *artist =
			now_playing[@"kMRMediaRemoteNowPlayingInfoArtist"]
				?: now_playing[@"artist"]
				?: @"";

		strncpy(info->title, [title UTF8String],
			sizeof(info->title) - 1);
		info->title[sizeof(info->title) - 1] = '\0';
		strncpy(info->artist, [artist UTF8String],
			sizeof(info->artist) - 1);
		info->artist[sizeof(info->artist) - 1] = '\0';

		NSNumber *duration =
			now_playing[@"kMRMediaRemoteNowPlayingInfoDuration"]
				?: now_playing[@"duration"];
		NSNumber *elapsed =
			now_playing[@"kMRMediaRemoteNowPlayingInfoElapsedTime"]
				?: now_playing[@"elapsed"];

		if (duration)
			info->duration_ms =
				(uint64_t)([duration doubleValue] * 1000);
		if (elapsed)
			info->progress_ms =
				(uint64_t)([elapsed doubleValue] * 1000);

		NSString *app =
			now_playing[@"kMRMediaRemoteNowPlayingInfoAppBundleIdentifier"]
				?: now_playing[@"appBundleId"]
				?: @"Unknown";
		strncpy(info->app_id, [app UTF8String],
			sizeof(info->app_id) - 1);
		info->app_id[sizeof(info->app_id) - 1] = '\0';

		info->is_playing = got_playing ? (bool)is_playing : false;

		NSString *art_url =
			now_playing[@"kMRMediaRemoteNowPlayingInfoArtworkData"]
				?: now_playing[@"artworkUrl"]
				?: @"";
		const char *art_str = [art_url UTF8String];
		if (art_str && strlen(art_str) > 0) {
			strncpy(info->album_art_base64, art_str,
				sizeof(info->album_art_base64) - 1);
			info->album_art_base64[
				sizeof(info->album_art_base64) - 1] = '\0';
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
