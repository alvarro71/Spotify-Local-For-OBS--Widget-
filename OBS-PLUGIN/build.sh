#!/bin/bash
set -e

echo "============================================"
echo "  Spotify Now Playing Overlay - OBS Plugin"
echo "  Build Script for Linux/macOS"
echo "============================================"
echo ""

if ! command -v cmake &> /dev/null; then
    echo "[ERROR] CMake not found. Install cmake."
    exit 1
fi

BUILD_DIR="build"
mkdir -p "$BUILD_DIR"

echo "[1/3] Configuring with CMake..."
cmake -S . -B "$BUILD_DIR" -DCMAKE_BUILD_TYPE=Release "$@"

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] CMake configuration failed."
    echo "Make sure OBS Studio development files are installed."
    echo ""
    echo "On Debian/Ubuntu: sudo apt install obs-studio-dev libglib2.0-dev libpulse-dev"
    echo "On Fedora: sudo dnf install obs-studio-devel glib2-devel pulseaudio-libs-devel"
    echo "On macOS: brew install obs-studio"
    exit 1
fi

echo ""
echo "[2/3] Building plugin..."
cmake --build "$BUILD_DIR" --config Release -j$(nproc 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)

if [ $? -ne 0 ]; then
    echo ""
    echo "[ERROR] Build failed."
    exit 1
fi

echo ""
echo "[3/3] Build complete!"
echo ""

UNAME_S=$(uname -s)
if [ "$UNAME_S" = "Linux" ]; then
    echo "The plugin .so is at: $BUILD_DIR/obs-spotify-overlay.so"
    echo ""
    echo "To install manually:"
    echo "  sudo cp $BUILD_DIR/obs-spotify-overlay.so /usr/lib/obs-plugins/"
    echo "  sudo cp -r data/ /usr/share/obs/obs-plugins/obs-spotify-overlay/data/"
    echo ""
    echo "Or build a .deb package:"
    echo "  cd installer/linux && ./build-deb.sh"
elif [ "$UNAME_S" = "Darwin" ]; then
    echo "The plugin .plugin is at: $BUILD_DIR/obs-spotify-overlay.plugin/"
    echo ""
    echo "To install manually:"
    echo "  cp -r $BUILD_DIR/obs-spotify-overlay.plugin ~/Library/Application\\ Support/obs-studio/plugins/"
    echo ""
    echo "Or build a .dmg:"
    echo "  cd installer/macos && ./build-dmg.sh"
fi

echo ""
