# Build script for Spotify Overlay OBS Plugin
# This script builds the plugin and creates the Windows installer

param(
    [switch]$BuildPlugin,
    [switch]$CreateInstaller,
    [switch]$Clean
)

$PluginDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$BuildDir = Join-Path $PluginDir "build"
$OutputDir = Join-Path $PluginDir "output"
$InstallerScript = Join-Path $PluginDir "installer\windows\spotify-overlay-installer.iss"

# Colors
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Cyan = "Cyan"

function Write-Color($Text, $Color) {
    Write-Host $Text -ForegroundColor $Color
}

function Clean-Build {
    Write-Color "Cleaning build directory..." $Yellow
    if (Test-Path $BuildDir) {
        Remove-Item -Recurse -Force $BuildDir
    }
    if (Test-Path $OutputDir) {
        Remove-Item -Recurse -Force $OutputDir
    }
    Write-Color "Clean completed." $Green
}

function Build-Plugin {
    Write-Color "`n=== Building OBS Plugin ===" $Cyan
    
    if (-not (Test-Path (Join-Path $PluginDir "CMakeLists.txt"))) {
        Write-Color "CMakeLists.txt not found!" $Red
        return $false
    }

    # Create build directory
    if (-not (Test-Path $BuildDir)) {
        New-Item -ItemType Directory -Path $BuildDir | Out-Null
    }

    # Configure with CMake
    Write-Color "Configuring CMake..." $Yellow
    cmake -S $PluginDir -B $BuildDir -G "Visual Studio 17 2022" -A x64
    
    if ($LASTEXITCODE -ne 0) {
        Write-Color "CMake configuration failed!" $Red
        return $false
    }

    # Build
    Write-Color "Building plugin..." $Yellow
    cmake --build $BuildDir --config Release
    
    if ($LASTEXITCODE -ne 0) {
        Write-Color "Build failed!" $Red
        return $false
    }

    Write-Color "Plugin built successfully!" $Green
    return $true
}

function Create-Installer {
    Write-Color "`n=== Creating Installer ===" $Cyan
    
    # Check for Inno Setup
    $InnoSetupPath = "C:\Program Files (x86)\Inno Setup 6\ISCC.exe"
    if (-not (Test-Path $InnoSetupPath)) {
        $InnoSetupPath = "C:\Program Files\Inno Setup 6\ISCC.exe"
        if (-not (Test-Path $InnoSetupPath)) {
            Write-Color "Inno Setup not found. Please install it from:" $Red
            Write-Color "https://jrsoftware.org/isdl.php" $Yellow
            return $false
        }
    }

    # Create output directory
    if (-not (Test-Path $OutputDir)) {
        New-Item -ItemType Directory -Path $OutputDir | Out-Null
    }

    # Compile installer
    Write-Color "Compiling installer script..." $Yellow
    & $InnoSetupPath $InstallerScript
    
    if ($LASTEXITCODE -ne 0) {
        Write-Color "Installer creation failed!" $Red
        return $false
    }

    Write-Color "Installer created successfully!" $Green
    Write-Color "Output: $OutputDir" $Green
    return $true
}

# Main execution
Write-Color "`n=====================================" $Cyan
Write-Color "Spotify Overlay Build Script" $Cyan
Write-Color "=====================================" $Cyan

if ($Clean) {
    Clean-Build
}

if ($BuildPlugin) {
    Build-Plugin
}

if ($CreateInstaller) {
    Create-Installer
}

# If no flags specified, run all steps
if (-not $BuildPlugin -and -not $CreateInstaller -and -not $Clean) {
    Write-Color "`nNo options specified. Running full build..." $Yellow
    if (Build-Plugin) {
        Create-Installer
    }
}

Write-Color "`nBuild process completed." $Green
