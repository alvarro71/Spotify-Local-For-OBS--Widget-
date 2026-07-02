using System;
using System.Diagnostics;
using System.IO;
using System.Windows.Forms;

class Launcher
{
    [STAThread]
    static void Main()
    {
        string exeDir = AppDomain.CurrentDomain.BaseDirectory;
        string serverPath = Path.Combine(exeDir, "SpotifyOverlayServer.exe");
        
        if (!File.Exists(serverPath))
        {
            MessageBox.Show("No se encontró SpotifyOverlayServer.exe", "Error",
                MessageBoxButtons.OK, MessageBoxIcon.Error);
            return;
        }

        Process.Start(new ProcessStartInfo
        {
            FileName = serverPath,
            UseShellExecute = true,
            WindowStyle = ProcessWindowStyle.Hidden,
            CreateNoWindow = true
        });

        NotifyIcon tray = new NotifyIcon();
        tray.Icon = System.Drawing.Icon.ExtractAssociatedIcon(serverPath);
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
