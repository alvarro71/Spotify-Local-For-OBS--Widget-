# Spotify Overlay for OBS - GUI Installer
# Instalador con interfaz gráfica para Windows

Add-Type -AssemblyName System.Windows.Forms
Add-Type -AssemblyName System.Drawing

# Configuración
$PluginName = "Spotify Overlay"
$PluginVersion = "1.0.0"
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path

# Crear formulario principal
$form = New-Object System.Windows.Forms.Form
$form.Text = "$PluginName v$PluginVersion - Instalador"
$form.Size = New-Object System.Drawing.Size(500, 600)
$form.StartPosition = "CenterScreen"
$form.FormBorderStyle = [System.Windows.Forms.FormBorderStyle]::FixedDialog
$form.MaximizeBox = $false
$iconPath = Join-Path $ScriptDir "icon.ico"
if (Test-Path $iconPath) {
    $form.Icon = $iconPath
}

# Colores
$spotifyGreen = [System.Drawing.Color]::FromArgb(29, 185, 84)
$darkBg = [System.Drawing.Color]::FromArgb(30, 30, 30)
$lightText = [System.Drawing.Color]::FromArgb(255, 255, 255)

# Panel superior con logo/título
$headerPanel = New-Object System.Windows.Forms.Panel
$headerPanel.Size = New-Object System.Drawing.Size(480, 100)
$headerPanel.Location = New-Object System.Drawing.Point(10, 10)
$headerPanel.BackColor = $spotifyGreen

# Título
$titleLabel = New-Object System.Windows.Forms.Label
$titleLabel.Text = "Spotify Overlay"
$titleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 20, [System.Drawing.FontStyle]::Bold)
$titleLabel.ForeColor = [System.Drawing.Color]::White
$titleLabel.AutoSize = $true
$titleLabel.Location = New-Object System.Drawing.Point(20, 10)
$headerPanel.Controls.Add($titleLabel)

# Subtítulo
$subtitleLabel = New-Object System.Windows.Forms.Label
$subtitleLabel.Text = "para OBS Studio"
$subtitleLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$subtitleLabel.ForeColor = [System.Drawing.Color]::FromArgb(200, 255, 255, 255)
$subtitleLabel.AutoSize = $true
$subtitleLabel.Location = New-Object System.Drawing.Point(20, 50)
$headerPanel.Controls.Add($subtitleLabel)

# Panel principal
$mainPanel = New-Object System.Windows.Forms.Panel
$mainPanel.Size = New-Object System.Drawing.Size(480, 350)
$mainPanel.Location = New-Object System.Drawing.Point(10, 120)

# Información
$infoLabel = New-Object System.Windows.Forms.Label
$infoLabel.Text = "Este instalador configurará el plugin de Spotify Overlay en tu OBS Studio."
$infoLabel.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$infoLabel.Size = New-Object System.Drawing.Size(460, 40)
$infoLabel.Location = New-Object System.Drawing.Point(10, 10)
$mainPanel.Controls.Add($infoLabel)

# Características
$featuresLabel = New-Object System.Windows.Forms.Label
$featuresLabel.Text = "Características:`n• Detección automática de Spotify`n• Espectro de audio en tiempo real`n• Diseño moderno y personalizable`n• 100% compatible con Windows"
$featuresLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$featuresLabel.Size = New-Object System.Drawing.Size(460, 100)
$featuresLabel.Location = New-Object System.Drawing.Point(10, 60)
$mainPanel.Controls.Add($featuresLabel)

# Barra de progreso
$progressBar = New-Object System.Windows.Forms.ProgressBar
$progressBar.Size = New-Object System.Drawing.Size(460, 25)
$progressBar.Location = New-Object System.Drawing.Point(10, 180)
$progressBar.Step = 1
$progressBar.Visible = $false
$mainPanel.Controls.Add($progressBar)

# Estado
$statusLabel = New-Object System.Windows.Forms.Label
$statusLabel.Text = "Estado: Esperando..."
$statusLabel.Font = New-Object System.Drawing.Font("Segoe UI", 9)
$statusLabel.Size = New-Object System.Drawing.Size(460, 25)
$statusLabel.Location = New-Object System.Drawing.Point(10, 210)
$mainPanel.Controls.Add($statusLabel)

# Log de instalación
$logBox = New-Object System.Windows.Forms.TextBox
$logBox.Size = New-Object System.Drawing.Size(460, 80)
$logBox.Location = New-Object System.Drawing.Point(10, 240)
$logBox.Multiline = $true
$logBox.ScrollBars = "Vertical"
$logBox.ReadOnly = $true
$logBox.Font = New-Object System.Drawing.Font("Consolas", 8)
$logBox.Visible = $false
$mainPanel.Controls.Add($logBox)

# Botón instalar
$installButton = New-Object System.Windows.Forms.Button
$installButton.Text = "Instalar"
$installButton.Font = New-Object System.Drawing.Font("Segoe UI", 11, [System.Drawing.FontStyle]::Bold)
$installButton.Size = New-Object System.Drawing.Size(140, 40)
$installButton.Location = New-Object System.Drawing.Point(10, 480)
$installButton.BackColor = $spotifyGreen
$installButton.ForeColor = [System.Drawing.Color]::White
$installButton.FlatStyle = [System.Windows.Forms.FlatStyle]::Flat
$form.Controls.Add($installButton)

# Botón cerrar
$closeButton = New-Object System.Windows.Forms.Button
$closeButton.Text = "Cerrar"
$closeButton.Font = New-Object System.Drawing.Font("Segoe UI", 10)
$closeButton.Size = New-Object System.Drawing.Size(140, 40)
$closeButton.Location = New-Object System.Drawing.Point(330, 480)
$closeButton.Enabled = $false
$closeButton.Visible = $false
$form.Controls.Add($closeButton)

# Añadir paneles al formulario
$form.Controls.Add($headerPanel)
$form.Controls.Add($mainPanel)

# Función para buscar OBS
function Get-OBSPath {
    $paths = @(
        "B:\SteamLibrary\steamapps\common\OBS Studio",
        "D:\SteamLibrary\steamapps\common\OBS Studio",
        "$env:ProgramFiles\OBS Studio",
        "${env:ProgramFiles(x86)}\OBS Studio",
        "$env:LOCALAPPDATA\Programs\OBS Studio"
    )
    
    foreach ($path in $paths) {
        if (Test-Path $path) {
            return $path
        }
    }
    return $null
}

# Función de instalación
function Install-Plugin {
    $installButton.Enabled = $false
    $installButton.Text = "Instalando..."
    $progressBar.Visible = $true
    $logBox.Visible = $true
    $statusLabel.Text = "Estado: Buscando OBS Studio..."
    
    # Buscar OBS
    $obsPath = Get-OBSPath
    if (-not $obsPath) {
        $statusLabel.Text = "ERROR: OBS Studio no encontrado"
        $statusLabel.ForeColor = [System.Drawing.Color]::Red
        [System.Windows.Forms.MessageBox]::Show(
            "No se encontró OBS Studio.`n`nPor favor, instala OBS Studio primero.",
            "Error",
            [System.Windows.Forms.MessageBoxButtons]::OK,
            [System.Windows.Forms.MessageBoxIcon]::Error
        )
        $installButton.Enabled = $true
        $installButton.Text = "Reintentar"
        return
    }
    
    $logBox.Lines += "OBS encontrado en: $obsPath"
    $progressBar.Value = 25
    $statusLabel.Text = "Estado: Copiando archivos..."
    
    # Directorios
    $pluginDir = Join-Path $obsPath "obs-plugins\obs-spotify-overlay"
    $plugin64Dir = Join-Path $obsPath "obs-plugins\64bit"
    $dataDir = Join-Path $pluginDir "data"
    
    # Crear directorios
    try {
        if (-not (Test-Path $pluginDir)) {
            New-Item -ItemType Directory -Path $pluginDir -Force | Out-Null
        }
        if (-not (Test-Path $plugin64Dir)) {
            New-Item -ItemType Directory -Path $plugin64Dir -Force | Out-Null
        }
        $logBox.Lines += "Directorios creados"
    } catch {
        $logBox.Lines += "Error al crear directorios: $_"
    }
    
    $progressBar.Value = 50
    
    # Copiar DLL
    $dllSource = Join-Path $ScriptDir "obs-spotify-overlay.dll"
    $dllDest = Join-Path $plugin64Dir "obs-spotify-overlay.dll"
    
    if (Test-Path $dllSource) {
        try {
            Copy-Item $dllSource $dllDest -Force
            $logBox.Lines += "DLL copiada correctamente"
        } catch {
            $logBox.Lines += "Error al copiar DLL: $_"
        }
    } else {
        $logBox.Lines += "DLL no encontrada en: $dllSource"
    }
    
    $progressBar.Value = 75
    $statusLabel.Text = "Estado: Copiando datos del overlay..."
    
    # Copiar data
    $overlaySource = Join-Path $ScriptDir "data\overlay"
    $overlayDest = Join-Path $dataDir "overlay"
    
    if (Test-Path $overlaySource) {
        try {
            if (-not (Test-Path $overlayDest)) {
                New-Item -ItemType Directory -Path $overlayDest -Force | Out-Null
            }
            Copy-Item "$overlaySource\*" $overlayDest -Recurse -Force
            $logBox.Lines += "Archivos del overlay copiados"
        } catch {
            $logBox.Lines += "Error al copiar overlay: $_"
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
            $logBox.Lines += "Archivos de idioma copiados"
        } catch {
            $logBox.Lines += "Error al copiar locale: $_"
        }
    }
    
    $progressBar.Value = 100
    $statusLabel.Text = "Estado: ¡Instalación completada!"
    $statusLabel.ForeColor = [System.Drawing.Color]::FromArgb(29, 185, 84)
    
    $installButton.Text = "¡Instalado!"
    $installButton.BackColor = [System.Drawing.Color]::FromArgb(29, 185, 84)
    $closeButton.Enabled = $true
    $closeButton.Visible = $true
    
    # Mensaje final
    [System.Windows.Forms.MessageBox]::Show(
        "¡Instalación completada!`n`nAhora puedes:`n1. Abrir OBS Studio`n2. Añadir fuente 'Navegador'`n3. URL: http://localhost:9274/`n4. Tamaño: 450x150`n`n¡A disfrutar!",
        "Instalación completada",
        [System.Windows.Forms.MessageBoxButtons]::OK,
        [System.Windows.Forms.MessageBoxIcon]::Information
    )
}

# Eventos
$installButton.Add_Click({ Install-Plugin })
$closeButton.Add_Click({ $form.Close() })

# Mostrar formulario
$form.ShowDialog()
