@echo off
setlocal enabledelayedexpansion

echo =============================================
echo   Spotify Overlay - Build Script
echo =============================================
echo.

:: Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [WARNING] No se recomienda ejecutar como administrador para evitar problemas de permisos
    echo.
)

:: Check for CMake
where cmake >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] CMake no encontrado. Instalar desde: https://cmake.org/download/
    pause
    exit /b 1
)

echo [INFO] CMake encontrado
echo.

:: Create build directory
if not exist "build" (
    echo [INFO] Creando directorio de compilacion...
    mkdir build
)

:: Configure with CMake
echo [INFO] Configurando con CMake...
cd build
cmake .. -G "Visual Studio 17 2022" -A x64
if %errorLevel% neq 0 (
    echo [ERROR] Error en la configuracion de CMake
    cd ..
    pause
    exit /b 1
)

:: Build
echo [INFO] Compilando plugin...
cmake --build . --config Release
if %errorLevel% neq 0 (
    echo [ERROR] Error en la compilacion
    cd ..
    pause
    exit /b 1
)

cd ..

echo.
echo [SUCCESS] Compilacion completada!
echo.
echo El archivo DLL esta en: build\Release\obs-spotify-overlay.dll
echo.
echo Para instalar el plugin, ejecuta:
echo   powershell -ExecutionPolicy Bypass -File install.ps1
echo.
pause
