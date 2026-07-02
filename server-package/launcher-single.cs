using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

class Launcher
{
    static void Main()
    {
        string tempDir = Path.Combine(Path.GetTempPath(), "SpotifyOverlay");
        Directory.CreateDirectory(tempDir);
        
        string serverPath = Path.Combine(tempDir, "SpotifyOverlayServer.exe");
        
        if (!File.Exists(serverPath))
        {
            // Extract embedded server from resources
            using (var stream = Assembly.GetExecutingAssembly().GetManifestResourceStream("server.exe"))
            using (var fs = new FileStream(serverPath, FileMode.Create, FileAccess.Write))
            {
                stream.CopyTo(fs);
            }
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = serverPath,
            UseShellExecute = true,
            WindowStyle = ProcessWindowStyle.Hidden,
            CreateNoWindow = true
        });

        NotifyIcon tray = new NotifyIcon();
        tray.Icon = SystemIcons.Application;
        tray.Text = "Spotify Overlay - Funcionando";
        tray.Visible = true;
        tray.ShowBalloonTip(2000, "Spotify Overlay", "Servidor iniciado en http://localhost:9274", ToolTipIcon.Info);

        MenuItem exitItem = new MenuItem("Cerrar", (s, e) => {
            foreach (var p in Process.GetProcessesByName("SpotifyOverlayServer"))
                p.Kill();
            tray.Visible = false;
            Application.Exit();
        });
        
        ContextMenu menu = new ContextMenu();
        menu.MenuItems.Add(exitItem);
        tray.ContextMenu = menu;
        
        Application.Run();
    }
}
