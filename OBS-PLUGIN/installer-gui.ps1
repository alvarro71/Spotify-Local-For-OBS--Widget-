# Spotify Overlay for OBS - GUI Installer (Mejorado)
# Instalador con interfaz gráfica profesional

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing
Add-Type -AssemblyName System.Drawing.Drawing2D

# Configuración
$PluginName = "Spotify Overlay"
$PluginVersion = "1.0.0"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Colores corporativos
$SpotifyGreen = [System.Drawing.Color]::FromArgb(29, 185, 84)
$SpotifyGreenDark = [System.Drawing.Color]::FromArgb(20, 150, 65)
$DarkBg = [System.Drawing.Color]::FromArgb(18, 18, 18)
$DarkSurface = [System.Drawing.Color]::FromArgb(30, 30, 30)
$DarkSurfaceLight = [System.Drawing.Color]::FromArgb(40, 40, 40)
$TextPrimary = [System.Drawing.Color]::FromArgb(255, 255, 255)
$TextSecondary = [System.Drawing.Color]::FromArgb(180, 180, 180)
$TextMuted = [System.Drawing.Color]::FromArgb(120, 120, 120)
$ErrorColor = [System.Drawing.Color]::FromArgb(235, 87, 87)
$SuccessColor = [System.Drawing.Color]::FromArgb(29, 185, 84)

# Crear formulario principal
$form = New-Object System.Windows.Forms.Form
$form.Text = "$PluginName v$PluginVersion - Instalador"
$form.Size = New-Object System.Drawing.Size(550, 700)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$form.BackColor = $DarkBg

# Panel superior (Header)
$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Size = New-Object System.Drawing.Size(550, 140)
$headerPanel.Location = New-Object System.Drawing.Point(0, 0)
$headerPanel.BackColor = $SpotifyGreen

# Logo/Icono (texto grande)
$logoLabel = New-Object System.Windows.Forms.Label
$logoLabel.Text = "🎵"
$logoLabel.Font = New-Object System.Drawing.Font("Segoe UI", 36, [System.Drawing.FontStyle]::Bold)
$logoLabel.ForeColor = [System.Drawing.Color]::White
$logoLabel.AutoSize = $false
$logoLabel.Size = New-Object System.Drawing.Size(80, 80)
$logoLabel.Location = New-Object System.Drawing.Point(20, 15)
$logoLabel.TextAlign = [System.Drawing.ContentAlignment]::MiddleCenter
$headerPanel.Controls.Add($logoLabel)

# Título principal
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Spotify Overlay"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 24, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::White
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(110, 20)
$headerPanel.Controls.Add($titleLabel)

# Subtítulo
$subtitleLabel = New-Object System.Windows.Forms.Label
$subtitleLabel.Text = "para OBS Studio"
$subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 11)
$subtitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(200, 255, 255, 255)
$subtitleLabel.AutoSize = $true
$subtitleLabel.Location = New-Object System.Drawing.Point(110, 55)
$headerPanel.Controls.Add($subtitleLabel)

# Versión
$versionLabel = New-Object System.Windows.Forms.Label
$versionLabel.Text = "v$PluginVersion"
$versionLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$versionLabel.ForeColor = [System.Drawing.Color]::FromArgb(180, 255, 255, 255)
$versionLabel.AutoSize = $true
$versionLabel.Location = New-Object System.Drawing.Point(110, 80)
$headerPanel.Controls.Add($versionLabel)

# Panel principal
$mainPanel = New-Object System.Windows.Forms.Panel
$mainPanel.Size = New-Object System.Drawing.Size(530, 420)
$mainPanel.Location = New-Object System.Drawing.Point(10, 150)
$mainPanel.BackColor = $DarkSurface

# Descripción
$descLabel = New-Object System.Windows.Forms.Label
$descLabel.Text = "Este instalador configurará automáticamente el plugin en tu OBS Studio."
$descLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$descLabel.ForeColor = $TextSecondary
$descLabel.Size = New-Object System.Drawing.Size(510, 30)
$descLabel.Location = New-Object System.Drawing.Point(10, 15)
$mainPanel.Controls.Add($descLabel)

# Línea separadora
$separator = New-Object System.Windows.Forms.Label
$separator.Text = ""
$separator.BackColor = $DarkSurfaceLight
$separator.Size = New-Object System.Drawing.Size(510, 1)
$separator.Location = New-Object System.Drawing.Point(10, 50)
$mainPanel.Controls.Add($separator)

# Características
$featuresLabel = New-Object System.Windows.Forms.Label
$featuresLabel.Text = "✨ Características:"
$featuresLabel.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$featuresLabel.ForeColor = $SpotifyGreen
$featuresLabel.AutoSize = $true
$featuresLabel.Location = New-Object System.Drawing.Point(10, 65)
$mainPanel.Controls.Add($featuresLabel)

# Lista de características
$featureList = New-Object System.Windows.Forms.Label
$featureList.Text = "•  Detección automática de Spotify y otras apps`n`n•  Espectro de audio en tiempo real`n`n•  Diseño moderno y personalizable`n`n•  100% compatible con Windows`n`n•  Ligero y sin dependencias externas"
$featureList.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$featureList.ForeColor = $TextSecondary
$featureList.Size = New-Object System.Drawing.Size(510, 140)
$featureList.Location = New-Object System.Drawing.Point(10, 95)
$mainPanel.Controls.Add($featureList)

# Barra de progreso
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Size = New-Object System.Drawing.Size(510, 30)
$progressBar.Location = New-Object System.Drawing.Point(10, 250)
$progressBar.Step = 1
$progressBar.Visible = $false
$progressBar.Style = [System.Windows.Forms.ProgressBarStyle]::Continuous
$mainPanel.Controls.Add($progressBar)

# Estado
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Estado: Esperando para iniciar..."
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$statusLabel.ForeColor = $TextMuted
$statusLabel.Size = New-Object System.Drawing.Size(510, 25)
$statusLabel.Location = New-Object System.Drawing.Point(10, 290)
$mainPanel.Controls.Add($statusLabel)

# Log de instalación
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Size = New-Object System.Drawing.Size(510, 80)
$logBox.Location = New-Object System.Drawing.Point(10, 320)
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.ReadOnly = $true
$logBox.Font = New-Object System.Drawing.Font("Consolas", 8)
$logBox.BackColor = $DarkBg
$logBox.ForeColor = $TextSecondary
$logBox.Visible = $false
$mainPanel.Controls.Add($logBox)

# Panel inferior (botones)
$bottomPanel = New-Object System.Windows.Forms.Panel
$bottomPanel.Size = New-Object System.Drawing.Size(550, 80)
$bottomPanel.Location = New-Object System.Drawing.Point(0, 570)
$bottomPanel.BackColor = $DarkSurface

# Botón instalar
$installButton = New-Object System.Windows.Forms.Button
$installButton.Text = "🚀 Instalar ahora"
$installButton.Font = New-Object System.Drawing.Font("Segoe UI", 12, [System.Drawing.FontStyle]::Bold)
$installButton.Size = New-Object System.Drawing.Size(160, 45)
$installButton.Location = New-Object System.Drawing.Point(20, 18)
$installButton.BackColor = $SpotifyGreen
$installButton.ForeColor = [System.Drawing.Color]::White
$installButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$installButton.FlatAppearance.BorderSize = 0
$bottomPanel.Controls.Add($installButton)

# Botón cerrar
$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Text = "Cerrar"
$closeButton.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$closeButton.Size = New-Object System.Drawing.Size(120, 45)
$closeButton.Location = New-Object System.Drawing.Point(410, 18)
$closeButton.Enabled = $false
$closeButton.Visible = $false
$closeButton.BackColor = $DarkSurfaceLight
$closeButton.ForeColor = $TextPrimary
$closeButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$closeButton.FlatAppearance.BorderSize = 0
$bottomPanel.Controls.Add($closeButton)

# Añadir controles al formulario
$form.Controls.Add($headerPanel)
$form.Controls.Add($mainPanel)
$form.Controls.Add($bottomPanel)

# Función para buscar OBS en TODAS partes
function Get-OBSPath {
    $logBox.Lines += "▶ Buscando OBS Studio en el sistema..."
    $logBox.Lines += "  (revisando discos y rutas comunes)"
    
    $found = $null
    
    # Primero: rutas rápidas comunes (sin escanear todo el disco)
    $quickPaths = @()
    
    # Buscar en SteamLibrary de todos los discos
    Get-PSDrive -PSProvider FileSystem | ForEach-Object {
        $drive = $_.Name + ":\"
        $quickPaths += $drive + "SteamLibrary\steamapps\common\OBS Studio"
        $quickPaths += $drive + "Steam\steamapps\common\OBS Studio"
        $quickPaths += $drive + "Program Files\OBS Studio"
        $quickPaths += $drive + "Program Files (x86)\OBS Studio"
        $quickPaths += $drive + "Programs\OBS Studio"
    }
    
    # Rutas de usuario
    $quickPaths += "$env:LOCALAPPDATA\Programs\OBS Studio"
    $quickPaths += "$env:LOCALAPPDATA\OBS Studio"
    $quickPaths += "$env:ProgramW6432\OBS Studio"
    
    foreach ($p in $quickPaths) {
        if (Test-Path $p) {
            $logBox.Lines += "✓ OBS encontrado en: $p"
            return $p
        }
    }
    
    # Segunda pasada: escaneo profundo por disco (solo busca carpetas "OBS Studio")
    $logBox.Lines += "  Busqueda profunda en discos (puede tardar)..."
    
    Get-PSDrive -PSProvider FileSystem | ForEach-Object {
        $drive = $_.Name + ":\"
        if ($found) { return }
        
        $logBox.Lines += "  Escaneando $drive..."
        $result = Get-ChildItem -Path $drive -Directory -Filter "OBS Studio" -ErrorAction SilentlyContinue -Recurse -Depth 3 | Select-Object -First 1
        if ($result) {
            $found = $result.FullName
            $logBox.Lines += "✓ OBS encontrado en: $found"
        }
    }
    
    return $found
}

# Función de instalación
function Install-Plugin {
    $installButton.Enabled = $false
    $installButton.Text = "⏳ Instalando..."
    $progressBar.Visible = $true
    $logBox.Visible = $true
    $statusLabel.Text = "Estado: Buscando OBS Studio..."
    $logBox.Lines = @()
    
    # Paso 1: Buscar OBS
    $obsPath = Get-OBSPath
    if (-not $obsPath) {
        $statusLabel.Text = "❌ ERROR: OBS Studio no encontrado"
        $statusLabel.ForeColor = $ErrorColor
        $logBox.Lines += ""
        $logBox.Lines += "═══════════════════════════════════════════"
        $logBox.Lines += "  OBS STUDIO NO ENCONTRADO"
        $logBox.Lines += "═══════════════════════════════════════════"
        $logBox.Lines += ""
        $logBox.Lines += "  No se encontró OBS Studio en ningún disco."
        $logBox.Lines += ""
        $logBox.Lines += "  Si NO tienes OBS Studio:"
        $logBox.Lines += "  1. Descárgalo de: https://obsproject.com/"
        $logBox.Lines += "  2. Instálalo"
        $logBox.Lines += "  3. Ejecuta este instalador de nuevo"
        $logBox.Lines += ""
        $logBox.Lines += "  Si SÍ tienes OBS Studio (instalación manual):"
        $logBox.Lines += "  1. Abre la carpeta donde está instalado OBS"
        $logBox.Lines += "  2. Ve a la carpeta: obs-plugins\64bit\"
        $logBox.Lines += "  3. Copia estos 2 archivos ahí:"
        $logBox.Lines += "     - obs-spotify-overlay.dll"
        $logBox.Lines += "     - SpotifyOverlayServer.exe"
        $logBox.Lines += ""
        $logBox.Lines += "  Rutas típicas de OBS:"
        $logBox.Lines += "    C:\Program Files\obs-studio\"
        $logBox.Lines += "    [Disco]:\SteamLibrary\steamapps\common\OBS Studio\"
        $logBox.Lines += "    [Disco]:\Program Files\OBS Studio\"
        $logBox.Lines += ""
        
        [System.Windows.Forms.MessageBox]::Show(
            "OBS Studio no encontrado en el sistema." +
            "`n`nSi NO lo tienes, descárgalo de:" +
            "`nhttps://obsproject.com/" +
            "`n`nSi SÍ lo tienes y el instalador no lo detectó:" +
            "`nCopia manualmente estos 2 archivos:" +
            "`n  - obs-spotify-overlay.dll" +
            "`n  - SpotifyOverlayServer.exe" +
            "`n`nA la carpeta:" +
            "`n[Ruta de OBS]\obs-plugins\64bit\",
            "OBS no encontrado - Instalación manual",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Warning
        )
        $installButton.Enabled = $true
        $installButton.Text = "🔄 Reintentar"
        return
    }
    
    $logBox.Lines += "✓ OBS encontrado en: $obsPath"
    $progressBar.Value = 20
    $statusLabel.Text = "Estado: Preparando instalación..."
    
    # Paso 2: Crear directorios
    $pluginDir = Join-Path $obsPath "obs-plugins\obs-spotify-overlay"
    $plugin64Dir = Join-Path $obsPath "obs-plugins\64bit"
    $dataDir = Join-Path $pluginDir "data"
    
    try {
        if (-not (Test-Path $pluginDir)) {
            New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null
        }
        if (-not (Test-Path $plugin64Dir)) {
            New-Item -ItemType Directory -Path $plugin64Dir -Force | Out-Null
        }
        $logBox.Lines += "✓ Directorios creados"
    } catch {
        $logBox.Lines += "✗ Error al crear directorios: $_"
    }
    
    $progressBar.Value = 40
    $statusLabel.Text = "Estado: Copiando archivos..."
    
    # Paso 3: Copiar DLL
    $dllSource = Join-Path $ScriptDir "obs-spotify-overlay.dll"
    $dllDest = Join-Path $plugin64Dir "obs-spotify-overlay.dll"
    
    if (Test-Path $dllSource) {
        try {
            Copy-Item $dllSource $dllDest -Force
            $logBox.Lines += "✓ DLL copiada correctamente"
        } catch {
            $logBox.Lines += "✗ Error al copiar DLL: $_"
        }
    } else {
        $logBox.Lines += "✗ DLL no encontrada en: $dllSource"
    }
    
    $progressBar.Value = 55
    $statusLabel.Text = "Estado: Copiando servidor..."
    
    # Paso 4: Copiar servidor Node.js
    $exeSource = Join-Path $ScriptDir "SpotifyOverlayServer.exe"
    $exeDest = Join-Path $plugin64Dir "SpotifyOverlayServer.exe"
    
    if (Test-Path $exeSource) {
        try {
            Copy-Item $exeSource $exeDest -Force
            $logBox.Lines += "✓ Servidor copiado correctamente"
        } catch {
            $logBox.Lines += "✗ Error al copiar servidor: $_"
        }
    } else {
        $logBox.Lines += "✗ Servidor no encontrado en: $exeSource"
    }
    
    $progressBar.Value = 60
    $statusLabel.Text = "Estado: Copiando overlay..."
    
    # Paso 5: Copiar data
    $overlaySource = Join-Path $ScriptDir "data\overlay"
    $overlayDest = Join-Path $dataDir "overlay"
    
    if (Test-Path $overlaySource) {
        try {
            if (-not (Test-Path $overlayDest)) {
                New-Item -ItemType Directory -Path $overlayDest -Force | Out-Null
            }
            Copy-Item "$overlaySource\*" $overlayDest -Recurse -Force
            $logBox.Lines += "✓ Archivos del overlay copiados"
        } catch {
            $logBox.Lines += "✗ Error al copiar overlay: $_"
        }
    }
    
    # Copiar locale
    $localeSource = Join-Path $ScriptDir "data\locale"
    $localeDest = Join-Path $dataDir "locale"
    
    if (Test-Path $localeSource) {
        try {
            if (-not (Test-Path $localeDest)) {
                New-Item -ItemType Directory -Path $localeDest -Force | Out-Null
            }
            Copy-Item "$localeSource\*" $localeDest -Recurse -Force
            $logBox.Lines += "✓ Archivos de idioma copiados"
        } catch {
            $logBox.Lines += "✗ Error al copiar locale: $_"
        }
    }
    
    $progressBar.Value = 100
    $statusLabel.Text = "✓ ¡Instalación completada!"
    $statusLabel.ForeColor = $SuccessColor
    
    $installButton.Text = "✓ ¡Instalado!"
    $installButton.BackColor = $SuccessColor
    $closeButton.Enabled = $true
    $closeButton.Visible = $true
    
    # Mensaje final
    [System.Windows.Forms.MessageBox]::Show(
        "¡Instalación completada con éxito!`n`nAhora puedes:`n`n1. Abrir OBS Studio`n2. Añadir fuente 'Navegador'`n3. URL: http://localhost:9274/`n4. Tamaño: 450x150`n`n¡A disfrutar de tu overlay!",
        "✓ Instalación completada",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    )
}

# Eventos
$installButton.Add_Click({ Install-Plugin })
$closeButton.Add_Click({ $form.Close() })

# Mostrar formulario
$form.ShowDialog()
