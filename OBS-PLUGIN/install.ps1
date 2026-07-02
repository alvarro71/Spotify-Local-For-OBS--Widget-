# Spotify Overlay Installer for OBS
# Simple PowerShell installer - No additional tools required

param(
    [switch]$Uninstall
)

$PluginName = "Spotify Overlay"
$PluginVersion = "1.0.0"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$PluginSourceDir = $ScriptDir

# Fixed colors
$ErrorColor = "Red"
$InfoColor = "Cyan"
$SuccessColor = "Green"
$WarningColor = "Yellow"

function Write-Info($Message) {
    Write-Host "[INSTALL] $Message" -ForegroundColor $InfoColor
}

function Write-Error-Custom($Message) {
    Write-Host "[ERROR] $Message" -ForegroundColor $ErrorColor
}

function Write-Success($Message) {
    Write-Host "[SUCCESS] $Message" -ForegroundColor $SuccessColor
}

function Write-Warning-Custom($Message) {
    Write-Host "[WARNING] $Message" -ForegroundColor $WarningColor
}

function Get-OBSInstallPath {
    # Try multiple locations including Steam version
    $steamPaths = @()
    $allDrives = Get-PSDrive -PSName FileSystem | Select-Object -ExpandProperty Name
    foreach ($drive in $allDrives) {
        $steamPath = "$drive\SteamLibrary\steamapps\common\OBS Studio"
        if (Test-Path $steamPath) {
            $steamPaths += $steamPath
        }
    }
    
    $paths = @(
        $steamPaths,
        $env:ProgramFiles + "\OBS Studio",
        ${env:ProgramFiles(x86)} + "\OBS Studio",
        $env:LOCALAPPDATA + "\Programs\OBS Studio",
        "C:\Program Files\OBS Studio",
        "C:\Program Files (x86)\OBS Studio",
        "B:\SteamLibrary\steamapps\common\OBS Studio",
        "D:\SteamLibrary\steamapps\common\OBS Studio"
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            return $path
        }
    }
    
    # Check registry
    $registryPaths = @(
        "HKLM:\Software\OBS Studio",
        "HKCU:\Software\OBS Studio",
        "HKLM:\Software\WOW6432Node\OBS Studio"
    )
    
    foreach ($regPath in $registryPaths) {
        try {
            $value = Get-ItemProperty -Path $regPath -ErrorAction SilentlyContinue
            if ($value.InstallPath) {
                return $value.InstallPath
            }
        } catch {}
    }
    
    return $null
}

function Install-Plugin {
    Write-Info "Starting installation of $PluginName v$PluginVersion"
    
    # Find OBS installation
    $obsPath = Get-OBSInstallPath
    if (-not $obsPath) {
        Write-Warning-Custom "OBS Studio no encontrado en las rutas habitales."
        Write-Info "Buscando OBS en el registro..."
        
        # Try to find OBS manually
        $obsFound = $false
        $testPaths = @(
            "C:\Program Files\obs-studio",
            "C:\Program Files (x86)\obs-studio",
            "$env:ProgramFiles\obs-studio",
            "${env:ProgramFiles(x86)}\obs-studio"
        )
        
        foreach ($testPath in $testPaths) {
            if (Test-Path $testPath) {
                $obsPath = $testPath
                $obsFound = $true
                Write-Success "OBS encontrado en: $obsPath"
                break
            }
        }
        
        if (-not $obsFound) {
            Write-Error-Custom "OBS Studio no encontrado. Por favor, instala OBS Studio primero."
            Write-Info "Descargar desde: https://obsproject.com/"
            Write-Host ""
            Write-Info "Si OBS está instalado en una ubicación personalizada, puedes:"
            Write-Info "1. Copiar manualmente obs-spotify-overlay.dll a:"
            Write-Host "   [Ruta de OBS]\obs-plugins\64bit\"
            Write-Info "2. Copiar la carpeta data a:"
            Write-Host "   [Ruta de OBS]\obs-plugins\obs-spotify-overlay\data\"
            return $false
        }
    }
    
    Write-Info "OBS Studio encontrado en: $obsPath"
    
    # Plugin directories
    $pluginDir = Join-Path $obsPath "obs-plugins\obs-spotify-overlay"
    $plugin64Dir = Join-Path $obsPath "obs-plugins\64bit"
    $dataDir = Join-Path $pluginDir "data"
    
    # Create directories
    Write-Info "Creando directorios del plugin..."
    $directories = @(
        $pluginDir,
        $plugin64Dir,
        (Join-Path $dataDir "overlay"),
        (Join-Path $dataDir "overlay\fonts"),
        (Join-Path $dataDir "locale")
    )
    
    foreach ($dir in $directories) {
        if (-not (Test-Path $dir)) {
            New-Item -ItemType Directory -Path $dir -Force | Out-Null
        }
    }
    
    # Copy DLL
    $dllSource = Join-Path $PluginSourceDir "obs-spotify-overlay.dll"
    $dllDest = Join-Path $plugin64Dir "obs-spotify-overlay.dll"
    
    if (Test-Path $dllSource) {
        Write-Info "Copiando DLL del plugin..."
        Copy-Item $dllSource $dllDest -Force
        Write-Success "DLL copiada correctamente"
    } else {
        Write-Warning-Custom "DLL no encontrada en: $dllSource"
        Write-Info "Verifica que el archivo obs-spotify-overlay.dll esté en la carpeta"
        return $false
    }
    
    # Copy overlay files
    Write-Info "Copiando archivos del overlay..."
    $overlaySource = Join-Path $PluginSourceDir "data\overlay\*"
    $overlayDest = Join-Path $dataDir "overlay"
    if (Test-Path $overlaySource) {
        Copy-Item $overlaySource $overlayDest -Force -Recurse
        Write-Success "Archivos del overlay copiados"
    } else {
        Write-Warning-Custom "Archivos del overlay no encontrados"
    }
    
    # Copy locale files
    $localeSource = Join-Path $PluginSourceDir "data\locale\*"
    $localeDest = Join-Path $dataDir "locale"
    if (Test-Path $localeSource) {
        Copy-Item $localeSource $localeDest -Force -Recurse
        Write-Success "Archivos de idioma copiados"
    }
    
    Write-Success "¡Instalación completada!"
    Write-Host @"

Para usar el Spotify Overlay:
1. Abre OBS Studio
2. Ve a "Fuentes" y haz clic en "+" para añadir una nueva fuente
3. Selecciona "Navegador" (Browser)
4. Configúralo así:
   - Nombre: Spotify Overlay
   - URL: http://localhost:9274/
   - Ancho: 450
   - Alto: 150
5. ¡Reproduce música en Spotify!

Para más información, lee el archivo README.md

"@
    return $true
}

function Uninstall-Plugin {
    Write-Info "Desinstalando $PluginName..."
    
    $obsPath = Get-OBSInstallPath
    if (-not $obsPath) {
        Write-Error-Custom "OBS Studio no encontrado."
        return $false
    }
    
    $pluginDir = Join-Path $obsPath "obs-plugins\obs-spotify-overlay"
    $plugin64Dir = Join-Path $obsPath "obs-plugins\64bit"
    $pluginDll = Join-Path $plugin64Dir "obs-spotify-overlay.dll"
    
    # Remove DLL
    if (Test-Path $pluginDll) {
        Remove-Item $pluginDll -Force
        Write-Info "DLL del plugin eliminada"
    }
    
    # Remove data directory
    if (Test-Path $pluginDir) {
        Remove-Item $pluginDir -Recurse -Force
        Write-Info "Directorio del plugin eliminado"
    }
    
    Write-Success "¡Desinstalación completada!"
    return $true
}

# Main
if ($Uninstall) {
    Uninstall-Plugin
} else {
    Install-Plugin
}
