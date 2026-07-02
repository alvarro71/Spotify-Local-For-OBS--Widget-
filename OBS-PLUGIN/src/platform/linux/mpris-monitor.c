#include "mpris-monitor.h"
#include <obs-module.h>

#ifdef LINUX_BUILD

#include <gio/gio.h>
#include <stdio.h>
#include <string.h>

static char *extract_string_variant(GVariant *dict, const char *key)
{
	GVariant *entry = g_variant_lookup_value(dict, key, G_VARIANT_TYPE_STRING);
	if (!entry)
		return g_strdup("");

	char *val = g_variant_dup_string(entry, NULL);
	g_variant_unref(entry);
	return val;
}

static bool extract_bool_variant(GVariant *dict, const char *key)
{
	GVariant *entry = g_variant_lookup_value(dict, key, G_VARIANT_TYPE_BOOLEAN);
	if (!entry)
		return false;

	gboolean val = g_variant_get_boolean(entry);
	g_variant_unref(entry);
	return (bool)val;
}

static int64_t extract_int64_variant(GVariant *dict, const char *key)
{
	GVariant *entry = g_variant_lookup_value(dict, key, G_VARIANT_TYPE_INT64);
	if (!entry)
		return 0;

	int64_t val = g_variant_get_int64(entry);
	g_variant_unref(entry);
	return val;
}

bool platform_get_media_info(media_info_t *info)
{
	info->valid = false;

	GDBusConnection *conn = g_bus_get_sync(G_BUS_TYPE_SESSION, NULL, NULL);
	if (!conn) {
		blog(LOG_WARNING,
		     "[obs-spotify-overlay] MPRIS: Cannot connect to session bus");
		return false;
	}

	GError *error = NULL;
	GVariant *result = g_dbus_connection_call_sync(
		conn,
		"org.freedesktop.DBus",
		"/org/freedesktop/DBus",
		"org.freedesktop.DBus",
		"ListNames",
		NULL,
		G_VARIANT_TYPE("(as)"),
		G_DBUS_CALL_FLAGS_NONE,
		-1,
		NULL,
		&error);

	if (error) {
		blog(LOG_WARNING,
		     "[obs-spotify-overlay] MPRIS: ListNames failed: %s",
		     error->message);
		g_error_free(error);
		g_object_unref(conn);
		return false;
	}

	GVariantIter *iter;
	g_variant_get(result, "(as)", &iter);

	const char *bus_name = NULL;
	const char *spotify_name = NULL;

	while (g_variant_iter_next(iter, "&s", &bus_name)) {
		if (g_str_has_prefix(bus_name, "org.mpris.MediaPlayer2.")) {
			spotify_name = bus_name;
			if (g_strstr_len(bus_name, -1, "spotify") ||
			    g_strstr_len(bus_name, -1, "Spotify")) {
				break;
			}
		}
	}

	g_variant_iter_free(iter);
	g_variant_unref(result);

	if (!spotify_name) {
		g_object_unref(conn);
		return false;
	}

	error = NULL;
	GVariant *props = g_dbus_connection_call_sync(
		conn,
		spotify_name,
		"/org/mpris/MediaPlayer2",
		"org.freedesktop.DBus.Properties",
		"GetAll",
		g_variant_new("(s)", "org.mpris.MediaPlayer2.Player"),
		G_VARIANT_TYPE("(a{sv})"),
		G_DBUS_CALL_FLAGS_NONE,
		-1,
		NULL,
		&error);

	if (error) {
		blog(LOG_WARNING,
		     "[obs-spotify-overlay] MPRIS: GetAll failed: %s",
		     error->message);
		g_error_free(error);
		g_object_unref(conn);
		return false;
	}

	GVariant *dict = NULL;
	g_variant_get(props, "(a{sv})", &dict);

	GVariant *metadata = g_variant_lookup_value(
		dict, "Metadata", G_VARIANT_TYPE("a{sv}"));

	if (metadata) {
		char *title = extract_string_variant(metadata, "xesam:title");
		char *artist_val = NULL;

		GVariant *artist_var = g_variant_lookup_value(
			metadata, "xesam:artist", G_VARIANT_TYPE("as"));
		if (artist_var) {
			GVariantIter *a_iter;
			const char *first_artist = "";
			g_variant_get(artist_var, "as", &a_iter);
			g_variant_iter_next(a_iter, "&s", &first_artist);
			artist_val = g_strdup(first_artist);
			g_variant_iter_free(a_iter);
			g_variant_unref(artist_var);
		} else {
			artist_val = extract_string_variant(metadata,
							    "xesam:artist");
		}

		strncpy(info->title, title, sizeof(info->title) - 1);
		info->title[sizeof(info->title) - 1] = '\0';
		strncpy(info->artist, artist_val ? artist_val : "",
			sizeof(info->artist) - 1);
		info->artist[sizeof(info->artist) - 1] = '\0';

		g_free(title);
		g_free(artist_val);

		info->duration_ms =
			(uint64_t)(extract_int64_variant(metadata,
							 "mpris:length") /
				   1000);

		GVariant *art_url = g_variant_lookup_value(
			metadata, "mpris:artUrl", G_VARIANT_TYPE_STRING);
		if (art_url) {
			const char *url = g_variant_get_string(art_url, NULL);
			if (url && *url) {
				if (g_str_has_prefix(url, "data:image")) {
					strncpy(info->album_art_base64, url,
						sizeof(info->album_art_base64) - 1);
				} else {
					snprintf(info->album_art_base64,
						sizeof(info->album_art_base64),
						"{\"url\":\"%s\"}", url);
				}
				info->album_art_base64[
					sizeof(info->album_art_base64) - 1] = '\0';
			}
			g_variant_unref(art_url);
		}
			g_variant_unref(art_url);
		}

		g_variant_unref(metadata);
	}

	GVariant *playback_status = g_variant_lookup_value(
		dict, "PlaybackStatus", G_VARIANT_TYPE_STRING);
	if (playback_status) {
		const char *status = g_variant_get_string(playback_status, NULL);
		info->is_playing = (strcmp(status, "Playing") == 0);
		g_variant_unref(playback_status);
	}

	GVariant *position_var = g_dbus_connection_call_sync(
		conn,
		spotify_name,
		"/org/mpris/MediaPlayer2",
		"org.freedesktop.DBus.Properties",
		"Get",
		g_variant_new("(ss)", "org.mpris.MediaPlayer2.Player",
			      "Position"),
		G_VARIANT_TYPE("(v)"),
		G_DBUS_CALL_FLAGS_NONE,
		-1,
		NULL,
		NULL);

	if (position_var) {
		GVariant *inner = g_variant_get_variant(position_var);
		info->progress_ms =
			(uint64_t)(g_variant_get_int64(inner) / 1000);
		g_variant_unref(inner);
		g_variant_unref(position_var);
	}

	snprintf(info->app_id, sizeof(info->app_id), "%s",
		 spotify_name + strlen("org.mpris.MediaPlayer2."));

	g_variant_unref(dict);
	g_variant_unref(props);
	g_object_unref(conn);

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
