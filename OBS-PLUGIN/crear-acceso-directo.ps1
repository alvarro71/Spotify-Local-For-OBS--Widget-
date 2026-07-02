# Crear acceso directo al instalador GUI
$scriptPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "installer-gui.ps1"
$shortcutPath = Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "Instalar.lnk"

$WScript = New-Object -ComObject WScript.Shell
$Shortcut = $WScript.CreateShortcut($shortcutPath)
$Shortcut.TargetPath = "powershell.exe"
$Shortcut.Arguments = "-ExecutionPolicy Bypass -File `"$scriptPath`""
$Shortcut.IconLocation = "powershell.exe,0"
$Shortcut.Description = "Instalar Spotify Overlay para OBS"
$Shortcut.WorkingDirectory = Split-Path -Parent $MyInvocation.MyCommand.Path
$Shortcut.Save()

Write-Host "Acceso directo creado: $shortcutPath" -ForegroundColor Green
