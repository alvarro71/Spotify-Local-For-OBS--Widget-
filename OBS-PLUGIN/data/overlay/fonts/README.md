# Fonts Directory

Place the Outfit font file here for the overlay.

## Required File

- `Outfit.ttf` - The Outfit font (variable weight, supports 100-900)

## How to Get It

1. Download from Google Fonts: https://fonts.google.com/specimen/Outfit
2. Or use the direct download: https://github.com/OutfitFont/Outfit/releases
3. Extract `Outfit.ttf` (variable weight version) and place it in this directory

## Why Local Instead of Google Fonts CDN?

OBS browser sources may not have internet access or may have it blocked.
Bundling the font ensures the overlay always renders correctly regardless
of network conditions - which is critical for a live streaming tool.
