#!/usr/bin/env pwsh
# Build all components for Spotify Overlay OBS Plugin
# This script builds the native plugin and creates a distributable package

param(
    [ValidateSet('x64', 'x86')]
    [string]$Architecture = 'x64',
    
    [ValidateSet('Debug', 'Release')]
    [string]$Configuration = 'Release',
    
    [switch]$SkipPluginBuild,
    [switch]$CreatePackage,
    [switch]$Help
)

$PluginDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $PluginDir "build"
$PackageDir = Join-Path $PluginDir "package"
$OutputDir = Join-Path $PluginDir "output"

function Show-Help {
    Write-Host @"
Spotify Overlay OBS Plugin - Build Script

Uso:
  .\build-all.ps1 [-Architecture x64|x86] [-Configuration Debug|Release] [Options]

Opciones:
  -Architecture     Arquitectura de destino (x64 por defecto)
  -Configuration    Configuracion de compilacion (Release por defecto)
  -SkipPluginBuild  Omitir compilacion del plugin C
  -CreatePackage    Crear paquete distribuible
  -Help             Mostrar esta ayuda

Ejemplos:
  .\build-all.ps1                              # Compilacion normal
  .\build-all.ps1 -CreatePackage               # Compilar y crear paquete
  .\build-all.ps1 -SkipPluginBuild             # Solo crear paquete
"@
}

if ($Help) {
    Show-Help
    exit 0
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Spotify Overlay - Build All" -ForegroundColor Cyan
Write-Host "========================================`n" -ForegroundColor Cyan

# Step 1: Build native plugin (unless skipped)
if (-not $SkipPluginBuild) {
    Write-Host "[1/3] Building plugin nativo..." -ForegroundColor Yellow
    
    if (-not (Test-Path (Join-Path $PluginDir "CMakeLists.txt"))) {
        Write-Host "  ERROR: CMakeLists.txt no encontrado" -ForegroundColor Red
        exit 1
    }
    
    # Create build directory
    if (-not (Test-Path $BuildDir)) {
        New-Item -ItemType Directory -Path $BuildDir | Out-Null
        Write-Host "  Directorio de build creado" -ForegroundColor Green
    }
    
    # Configure
    Write-Host "  Configurando CMake..." -ForegroundColor Gray
    cmake -S $PluginDir -B $BuildDir -G "Visual Studio 17 2022" -A $Architecture
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Configuracion de CMake fallida" -ForegroundColor Red
        exit 1
    }
    
    # Build
    Write-Host "  Compilando..." -ForegroundColor Gray
    cmake --build $BuildDir --config $Configuration --verbose
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "  ERROR: Compilacion fallida" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "  Plugin compilado exitosamente!" -ForegroundColor Green
} else {
    Write-Host "[1/3] Omitiendo compilacion del plugin (segun flag)" -ForegroundColor Yellow
}

# Step 2: Verify build outputs
Write-Host "`n[2/3] Verificando archivos compilados..." -ForegroundColor Yellow

$DllPath = Join-Path $BuildDir "$Configuration\obs-spotify-overlay.dll"
if (Test-Path $DllPath) {
    $DllSize = (Get-Item $DllPath).Length
    Write-Host "  DLL encontrada: obs-spotify-overlay.dll ($([math]::Round($DllSize/1024, 2)) KB)" -ForegroundColor Green
} else {
    Write-Host "  WARNING: DLL no encontrada en $DllPath" -ForegroundColor Yellow
}

# Verify data files
$OverlayFiles = @()
if (Test-Path (Join-Path $PluginDir "data\overlay")) {
    $OverlayFiles = Get-ChildItem -Path (Join-Path $PluginDir "data\overlay") -Recurse
    Write-Host "  Archivos del overlay: $($OverlayFiles.Count) archivos" -ForegroundColor Green
}

# Step 3: Create distributable package
if ($CreatePackage) {
    Write-Host "`n[3/3] Creando paquete distribuible..." -ForegroundColor Yellow
    
    if (-not (Test-Path $PackageDir)) {
        New-Item -ItemType Directory -Path $PackageDir | Out-Null
    }
    
    # Copy plugin DLL
    $DllDest = Join-Path $PackageDir "obs-spotify-overlay.dll"
    if (Test-Path $DllPath) {
        Copy-Item $DllPath $DllDest -Force
        Write-Host "  DLL copiada al paquete" -ForegroundColor Green
    }
    
    # Copy data files
    $DataDest = Join-Path $PackageDir "data"
    if (Test-Path (Join-Path $PluginDir "data")) {
        Copy-Item (Join-Path $PluginDir "data") $DataDest -Recurse -Force
        Write-Host "  Archivos de datos copiados" -ForegroundColor Green
    }
    
    # Copy installer script
    Copy-Item (Join-Path $PluginDir "install.ps1") (Join-Path $PackageDir "install.ps1") -Force
    Copy-Item (Join-Path $PluginDir "README.md") (Join-Path $PackageDir "README.md") -Force
    Copy-Item (Join-Path $PluginDir "LICENSE") (Join-Path $PackageDir "LICENSE") -Force
    
    # Create ZIP package
    $ZipPath = Join-Path $OutputDir "SpotifyOverlay-v1.0.0.zip"
    if (-not (Test-Path (Split-Path $ZipPath))) {
        New-Item -ItemType Directory -Path (Split-Path $ZipPath) | Out-Null
    }
    
    if (Test-Path $ZipPath) {
        Remove-Item $ZipPath -Force
    }
    
    Compress-Archive -Path "$PackageDir\*" -DestinationPath $ZipPath -Force
    Write-Host "  Paquete ZIP creado: $ZipPath" -ForegroundColor Green
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  Build completado!" -ForegroundColor Green
Write-Host "========================================`n" -ForegroundColor Cyan

if (Test-Path $DllPath) {
    Write-Host "Siguientes pasos:" -ForegroundColor White
    Write-Host "  1. Ejecutar: .\install.ps1" -ForegroundColor Gray
    Write-Host "  2. Abrir OBS Studio" -ForegroundColor Gray
    Write-Host "  3. Agregar fuente 'Spotify Source' o Browser source" -ForegroundColor Gray
    Write-Host ""
}
