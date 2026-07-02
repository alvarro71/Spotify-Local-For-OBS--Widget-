@echo off
setlocal enabledelayedexpansion

echo =============================================
echo   Spotify Overlay - Instalador para OBS
echo =============================================
echo.

:: Check if running as admin
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [INFO] Solicitando permisos de administrador...
    powershell -Command "Start-Process cmd -ArgumentList '/c', '%~nx0' -Verb RunAs"
    exit /b
)

echo [INFO] Verificando PowerShell...
powershell -Command "echo OK" >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] PowerShell no encontrado
    pause
    exit /b 1
)

echo [INFO] Ejecutando script de instalacion...
echo.

:: Run PowerShell installer
powershell -ExecutionPolicy Bypass -File "%~dp0install.ps1"

echo.
echo =============================================
if %errorLevel% equ 0 (
    echo   Instalacion completada!
    echo =============================================
    echo.
    echo Ahora puedes:
    echo   1. Abrir OBS Studio
    echo   2. Anadir una fuente 'Navegador'
    echo   3. Configurar URL: http://localhost:9274/
    echo   4. Configurar tamano: 450x150
    echo.
) else (
    echo   Ocurrio un error en la instalacion
    echo =============================================
    echo.
    echo Revisa los mensajes anteriores para mas detalles.
    echo.
)

pause
