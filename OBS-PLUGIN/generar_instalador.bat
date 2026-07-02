@echo off
setlocal enabledelayedexpansion

echo.
echo  ========================================================
echo   Spotify Now Playing Overlay - Generador de Instalador
echo   Este script compila el plugin y crea el .exe instalador
echo  ========================================================
echo.

set "ROOT=%~dp0"
set "ROOT=%ROOT:~0,-1%"
set "BUILD_DIR=%ROOT%\build"
set "PACK_DIR=%ROOT%\installer\windows\pack"
set "NSI_DIR=%ROOT%\installer\windows"

where cmake >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo [ERROR] CMake no esta instalado o no esta en PATH.
    echo.
    echo Instala CMake desde: https://cmake.org/download/
    echo O ejecuta: winget install Kitware.CMake
    pause
    exit /b 1
)

echo [1/7] Buscando OBS Studio...
set "OBS_PATH="

if defined OBS_STUDIO_DIR (
    if exist "%OBS_STUDIO_DIR%\bin\64bit\obs64.exe" (
        set "OBS_PATH=%OBS_STUDIO_DIR%"
    )
)

if not defined OBS_PATH (
    if exist "C:\Program Files\obs-studio\bin\64bit\obs64.exe" (
        set "OBS_PATH=C:\Program Files\obs-studio"
    )
)

if not defined OBS_PATH (
    if exist "D:\Program Files\obs-studio\bin\64bit\obs64.exe" (
        set "OBS_PATH=D:\Program Files\obs-studio"
    )
)

if not defined OBS_PATH (
    if exist "E:\Program Files\obs-studio\bin\64bit\obs64.exe" (
        set "OBS_PATH=E:\Program Files\obs-studio"
    )
)

if not defined OBS_PATH (
if exist "C:\Program Files (x86)\Steam\steamapps\common\OBS Studio\bin\64bit\obs64.exe" (
set "OBS_PATH=C:\Program Files (x86)\Steam\steamapps\common\OBS Studio"
)
)

if not defined OBS_PATH (
for /f "tokens=2*" %%a in ('reg query "HKLM\Software\Valve\Steam" /v InstallPath 2^>nul') do set "STEAM_PATH=%%b"
if defined STEAM_PATH (
if exist "!STEAM_PATH!\steamapps\common\OBS Studio\bin\64bit\obs64.exe" (
set "OBS_PATH=!STEAM_PATH!\steamapps\common\OBS Studio"
)
)
)

if not defined OBS_PATH (
echo [ERROR] No se encontro OBS Studio.
    echo.
    echo Establece la variable de entorno OBS_STUDIO_DIR con la ruta de OBS:
    echo   set OBS_STUDIO_DIR=C:\Program Files\obs-studio
    echo   generar_instalador.bat
    echo.
    echo O instala OBS Studio desde: https://obsproject.com
    pause
    exit /b 1
)

echo        Encontrado en: %OBS_PATH%

for /f "tokens=*" %%i in ('dir /b /ad "%OBS_PATH%\*obs*" 2^>nul') do (
    set "OBS_PLUGIN_DIR=%OBS_PATH%\obs-plugins"
)

echo [2/7] Descargando Outfit font si no existe...
if not exist "%ROOT%\data\overlay\fonts\Outfit.ttf" (
    echo        Descargando Outfit.ttf desde Google Fonts...
    powershell -NoProfile -Command ^
        "Invoke-WebRequest -Uri 'https://github.com/OutfitFont/Outfit/raw/main/fonts/ttf/Outfit-Variable.ttf' -OutFile '%ROOT%\data\overlay\fonts\Outfit.ttf'" 2>nul
    if not exist "%ROOT%\data\overlay\fonts\Outfit.ttf" (
        echo        [AVISO] No se pudo descargar Outfit.ttf. Creando placeholder...
        echo. > "%ROOT%\data\overlay\fonts\Outfit.ttf"
    )
)

echo [3/7] Creando icono placeholder si no existe...
if not exist "%ROOT%\data\icons\plugin.png" (
    echo        Creando placeholder plugin.png...
    powershell -NoProfile -Command ^
        "Add-Type -AssemblyName System.Drawing; $bmp = New-Object System.Drawing.Bitmap(128,128); $g = [System.Drawing.Graphics]::FromImage($bmp); $g.Clear([System.Drawing.Color]::FromArgb(29,185,84)); $font = New-Object System.Drawing.Font('Segoe UI',48,[System.Drawing.FontStyle]::Bold); $sf = New-Object System.Drawing.StringFormat; $sf.Alignment = [System.Drawing.StringAlignment]::Center; $sf.LineAlignment = [System.Drawing.StringAlignment]::Center; $g.DrawString([char]0x266A, $font, [System.Drawing.Brushes]::White, (New-Object System.Drawing.RectangleF(0,0,128,128)), $sf); $bmp.Save('%ROOT%\data\icons\plugin.png', [System.Drawing.Imaging.ImageFormat]::Png); $g.Dispose(); $bmp.Dispose()" 2>nul
    if not exist "%ROOT%\data\icons\plugin.png" (
        echo. > "%ROOT%\data\icons\plugin.png"
    )
)

echo [4/7] Compilando plugin con CMake...
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"

set "OBS_SDK_DIR=%ROOT%\obs-sdk"
set "OBS_SDK_HEADERS=%OBS_SDK_DIR%\obs-source\obs-studio-32.1.2\libobs"
set "OBS_SDK_LIB=%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.lib"

if not exist "%OBS_SDK_LIB%" (
echo [INFO] OBS SDK import lib not found, checking for DLL to generate .lib...
if exist "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.dll" (
echo [INFO] Generating import library from obs.dll...
where lib >nul 2>&1
if %ERRORLEVEL% equ 0 (
echo LIB obs > "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo EXPORTS >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo blog >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo bfree >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo bmalloc >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo bzalloc >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo obs_register_source >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo obs_register_source_s >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo obs_find_module_file >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo obs_current_module >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo obs_module_load_locale >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo text_lookup_destroy >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
echo text_lookup_getstr >> "%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def"
lib /def:"%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.def" /out:"%OBS_SDK_LIB%" /machine:x64 2>nul
) else (
echo [WARN] lib.exe not found, trying with DLL directly...
set "OBS_SDK_LIB=%OBS_SDK_DIR%\obs-studio\bin\64bit\obs.dll"
)
) else (
echo [INFO] OBS SDK not found locally, using OBS install path...
set "OBS_SDK_HEADERS=%OBS_PATH%\include"
set "OBS_SDK_LIB=%OBS_PATH%\bin\64bit\obs.lib"
if not exist "%OBS_SDK_LIB%" set "OBS_SDK_LIB=%OBS_PATH%\bin\64bit\obs.dll"
)
)

cmake -S "%ROOT%" -B "%BUILD_DIR%" -G "Visual Studio 17 2022" -A x64 ^
-DCMAKE_BUILD_TYPE=Release ^
-DLIBOBS_INCLUDE_DIR="%OBS_SDK_HEADERS%" ^
-DLIBOBS_LIB="%OBS_SDK_LIB%" ^
2>&1

if %ERRORLEVEL% neq 0 (
echo.
echo [INFO] Visual Studio 2022 no encontrado, intentando con NMake...

where cl >nul 2>&1
if %ERRORLEVEL% equ 0 (
echo Usando NMake con MSVC...
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"

cmake -S "%ROOT%" -B "%BUILD_DIR%" -G "NMake Makefiles" ^
-DCMAKE_BUILD_TYPE=Release ^
-DLIBOBS_INCLUDE_DIR="%OBS_SDK_HEADERS%" ^
-DLIBOBS_LIB="%OBS_SDK_LIB%" ^
2>&1
) else (
echo Usando MinGW si esta disponible...
where gcc >nul 2>&1
if %ERRORLEVEL% equ 0 (
if exist "%BUILD_DIR%" rmdir /s /q "%BUILD_DIR%"
mkdir "%BUILD_DIR%"

cmake -S "%ROOT%" -B "%BUILD_DIR%" -G "MinGW Makefiles" ^
-DCMAKE_BUILD_TYPE=Release ^
-DLIBOBS_INCLUDE_DIR="%OBS_SDK_HEADERS%" ^
-DLIBOBS_LIB="%OBS_SDK_LIB%" ^
2>&1
)
)
)
    )
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] CMake fallo. Verifica que tienes un compilador C instalado.
    echo.
    echo Opciones:
    echo   1. Instala Visual Studio 2022 con "Desktop development with C++"
    echo   2. Instala MinGW-w64: winget install MSYS2.MSYS2
    echo   3. Instala Build Tools: https://visualstudio.microsoft.com/visual-cpp-build-tools/
    echo.
    pause
    exit /b 1
)

cmake --build "%BUILD_DIR%" --config Release 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] La compilacion fallo.
    pause
    exit /b 1
)

echo.
echo [5/7] Preparando paquete de instalacion...
if exist "%PACK_DIR%" rmdir /s /q "%PACK_DIR%"
mkdir "%PACK_DIR%"
mkdir "%PACK_DIR%\data\overlay\fonts"
mkdir "%PACK_DIR%\data\locale"
mkdir "%PACK_DIR%\data\icons"

if exist "%BUILD_DIR%\Release\obs-spotify-overlay.dll" (
    copy /y "%BUILD_DIR%\Release\obs-spotify-overlay.dll" "%PACK_DIR%\" >nul
) else if exist "%BUILD_DIR%\obs-spotify-overlay.dll" (
    copy /y "%BUILD_DIR%\obs-spotify-overlay.dll" "%PACK_DIR%\" >nul
) else (
    echo [ERROR] No se encontro el DLL compilado.
    pause
    exit /b 1
)

copy /y "%ROOT%\data\overlay\index.html" "%PACK_DIR%\data\overlay\" >nul
copy /y "%ROOT%\data\overlay\style.css" "%PACK_DIR%\data\overlay\" >nul
copy /y "%ROOT%\data\overlay\script.js" "%PACK_DIR%\data\overlay\" >nul

if exist "%ROOT%\data\overlay\fonts\Outfit.ttf" (
    copy /y "%ROOT%\data\overlay\fonts\Outfit.ttf" "%PACK_DIR%\data\overlay\fonts\" >nul
)

if exist "%ROOT%\data\locale\en-US.ini" (
    copy /y "%ROOT%\data\locale\en-US.ini" "%PACK_DIR%\data\locale\" >nul
)

if exist "%ROOT%\data\icons\plugin.png" (
    copy /y "%ROOT%\data\icons\plugin.png" "%PACK_DIR%\data\icons\" >nul
)

echo        Paquete preparado en: %PACK_DIR%

echo [6/7] Generando instalador .exe con NSIS...
where makensis >nul 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [AVISO] NSIS no esta instalado. Intentando instalarlo con winget...
    winget install NSIS.NSIS --accept-package-agreements --accept-source-agreements 2>nul
    if !ERRORLEVEL! neq 0 (
        echo.
        echo [AVISO] winget fallo. Intentando con chocolatey...
        where choco >nul 2>&1
        if !ERRORLEVEL! equ 0 (
            choco install nsis -y 2>nul
        )
    )

    where makensis >nul 2>&1
    if !ERRORLEVEL! neq 0 (
        echo.
        echo [ERROR] NSIS no esta disponible.
        echo.
        echo Instala NSIS desde: https://nsis.sourceforge.io/Download
        echo O ejecuta: winget install NSIS.NSIS
        echo.
        echo Despues de instalar NSIS, vuelve a ejecutar este script.
        echo.
        echo Alternativa: El DLL ya esta compilado en:
        echo   %PACK_DIR%\obs-spotify-overlay.dll
        echo.
        echo Puedes instalar manualmente copiando:
        echo   DLL  -^> [OBS]\obs-plugins\64bit\
        echo   data -^> [OBS]\obs-plugins\obs-spotify-overlay\data\
        echo.
        pause
        exit /b 1
    )
)

pushd "%NSI_DIR%"
makensis installer.nsi 2>&1
popd

if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] NSIS fallo al generar el instalador.
    echo Verifica que los archivos en pack\ esten completos.
    pause
    exit /b 1
)

echo.
echo [7/7] Instalador generado exitosamente!
echo.
echo  ========================================================
echo   El instalador esta listo en:
echo.
echo   %NSI_DIR%\SpotifyNowPlaying-Overlay-Setup-1.0.0.exe
echo.
echo   Solo tienes que distribuir ese .exe a los usuarios.
echo   Lo ejecutan, y ya: plugin instalado.
echo  ========================================================
echo.
echo Flujo del usuario:
echo 1. Ejecuta el .exe
echo 2. Ve lo que se va a instalar (pagina de info)
echo 3. Click Install
echo 4. Abre OBS, anade una fuente "Browser"
echo 5. URL: http://localhost:9274/overlay (ancho: 450, alto: 150)
echo 6. Reproduce musica en Spotify - el overlay aparece automaticamente
echo.
echo  ========================================================
echo.

pause
