#include <obs-module.h>
#include <graphics/graphics.h>
#include <graphics/vec4.h>
#include <util/platform.h>
#include <util/threading.h>

#include "media-monitor.h"
#include "audio-capture.h"

#define OVERLAY_WIDTH 450
#define OVERLAY_HEIGHT 150
#define CARD_RADIUS 24.0f
#define ACCENT_COLOR (struct vec4){0.1137f, 0.7255f, 0.3294f, 1.0f}

typedef struct {
    media_info_t media;
    float progress_smooth;
    bool has_data;
    gs_texture_t *album_texture;
    uint8_t *album_pixels;
    int album_width;
    int album_height;
} overlay_data_t;

static overlay_data_t *g_overlay = NULL;
static pthread_mutex_t g_overlay_mutex;
static volatile bool g_initialized = false;

static void update_overlay(const media_info_t *info, void *user_data)
{
    if (!g_overlay) return;
    
    pthread_mutex_lock(&g_overlay_mutex);
    memcpy(&g_overlay->media, info, sizeof(media_info_t));
    g_overlay->has_data = info->valid;
    
    if (info->album_art_base64[0]) {
        size_t b64_len = strlen(info->album_art_base64);
        if (b64_len > 22) {
            const char *b64_data = info->album_art_base64;
            if (strncmp(b64_data, "data:image", 10) == 0) {
                b64_data = strchr(b64_data, ',');
                if (b64_data) b64_data++;
                else b64_data = info->album_art_base64;
            }
            
            size_t decoded_size = (b64_len * 3) / 4 + 16384;
            if (!g_overlay->album_pixels || decoded_size > 16384) {
                g_overlay->album_pixels = brealloc(g_overlay->album_pixels, decoded_size);
            }
        }
    }
    
    pthread_mutex_unlock(&g_overlay_mutex);
}

static const char *native_overlay_getname(void *type_data)
{
    UNUSED_PARAMETER(type_data);
    return "Spotify Overlay (Native)";
}

static void *native_overlay_create(obs_data_t *settings, obs_source_t *source)
{
    overlay_data_t *data = bzalloc(sizeof(overlay_data_t));
    data->progress_smooth = 0.0f;
    
    pthread_mutex_init(&g_overlay_mutex, NULL);
    g_overlay = data;
    g_initialized = true;
    
    blog(LOG_INFO, "[native-overlay] Created");
    
    UNUSED_PARAMETER(settings);
    return data;
}

static void native_overlay_destroy(void *data)
{
    pthread_mutex_lock(&g_overlay_mutex);
    g_initialized = false;
    g_overlay = NULL;
    pthread_mutex_unlock(&g_overlay_mutex);
    
    pthread_mutex_destroy(&g_overlay_mutex);
    bfree(data);
    
    blog(LOG_INFO, "[native-overlay] Destroyed");
}

static uint32_t native_overlay_width(void *data)
{
    UNUSED_PARAMETER(data);
    return OVERLAY_WIDTH;
}

static uint32_t native_overlay_height(void *data)
{
    UNUSED_PARAMETER(data);
    return OVERLAY_HEIGHT;
}

static void render_card(struct obs_source *source, overlay_data_t *data, 
                       float x, float y, float width, float height)
{
    gs_effect_t *effect = obs_get_base_effect(OBS_EFFECT_SOLID);
    gs_eparam_t color_param = gs_effect_get_param_by_name(effect, "color");
    
    float card_x = x;
    float card_y = y;
    float card_w = width;
    float card_h = height;
    float padding = 16.0f;
    float art_size = 76.0f;
    
    struct vec4 bg_color;
    vec4_set(&bg_color, 0.058f, 0.058f, 0.078f, 0.85f);
    gs_effect_set_color(color_param, bg_color);
    
    gs_draw_sprite_mode(GS_TRISTRIP, 0, 0, 0);
    
    float text_x = card_x + art_size + padding * 2;
    float text_y = card_y + padding;
    
    if (data->has_data && data->media.valid) {
        struct vec4 text_color;
        vec4_set(&text_color, 1.0f, 1.0f, 1.0f, 1.0f);
        gs_effect_set_color(color_param, text_color);
        
        char title_str[512];
        snprintf(title_str, sizeof(title_str), "%s", data->media.title);
        
        obs_source *text_source = obs_source_get_by_name("Texto temporal");
        if (!text_source) {
            obs_data_t *text_settings = obs_data_create();
            obs_data_set_string(text_settings, "text", title_str);
            obs_data_set_bool(text_settings, "vertical", false);
            
            text_source = obs_source_create("text_ft2_source", "Texto temporal", text_settings, NULL);
            
            obs_data_release(text_settings);
        }
        
        struct vec4 accent;
        vec4_set(&accent, ACCENT_COLOR.r, ACCENT_COLOR.g, ACCENT_COLOR.b, ACCENT_COLOR.a);
        gs_effect_set_color(color_param, accent);
        
        float progress = 0.0f;
        if (data->media.duration_ms > 0) {
            progress = (float)data->media.progress_ms / (float)data->media.duration_ms;
        }
        
        float bar_x = text_x;
        float bar_y = card_y + card_h - padding - 6.0f;
        float bar_w = card_w - art_size - padding * 3;
        float bar_h = 6.0f;
        
        gs_matrix_push();
        gs_matrix_translate3f(bar_x, bar_y, 0);
        gs_matrix_scale3f(bar_w * progress, bar_h, 1);
        gs_draw_sprite_mode(GS_TRIS, 0, 0, 0);
        gs_matrix_pop();
    }
}

static void native_overlay_render(void *data, gs_effect_t *effect)
{
    UNUSED_PARAMETER(effect);
    
    overlay_data_t *overlay = (overlay_data_t *)data;
    
    gs_clear(GS_CLEAR_COLOR, &gs_vec4_zero, 0, 0);
    
    if (!g_initialized || !g_overlay) {
        return;
    }
    
    pthread_mutex_lock(&g_overlay_mutex);
    
    if (g_overlay->has_data && g_overlay->media.valid) {
        render_card(NULL, g_overlay, 0, 0, OVERLAY_WIDTH, OVERLAY_HEIGHT);
    }
    
    pthread_mutex_unlock(&g_overlay_mutex);
    
    gs_draw_sprite(gs_get_texture(0), 0, OVERLAY_WIDTH, OVERLAY_HEIGHT);
}

static struct obs_source_info native_overlay_source = {
    .id = "spotify-native-overlay",
    .type = OBS_SOURCE_TYPE_INPUT,
    .output_flags = OBS_SOURCE_VIDEO,
    .get_name = native_overlay_getname,
    .create = native_overlay_create,
    .destroy = native_overlay_destroy,
    .get_width = native_overlay_width,
    .get_height = native_overlay_height,
    .video_render = native_overlay_render,
};

void native_overlay_register(void)
{
    obs_register_source(&native_overlay_source);
    blog(LOG_INFO, "[native-overlay] Registered source type");
}

void native_overlay_unregister(void)
{
    blog(LOG_INFO, "[native-overlay] Unregistering");
}
