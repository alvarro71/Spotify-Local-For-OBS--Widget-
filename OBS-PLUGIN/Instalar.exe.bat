@echo off
title Spotify Overlay - Instalador
color 0A
echo.
echo =============================================
echo    SPOTIFY OVERLAY - INSTALADOR
echo =============================================
echo.
echo Iniciando interfaz grafica...
echo.

powershell -ExecutionPolicy Bypass -Command "& { $env:POWSHELL_STARTUP_BANNER = 0; Start-Process powershell -ArgumentList '-ExecutionPolicy Bypass -File \"%~dp0installer-gui.ps1\"' -WindowStyle Normal }"
