using System;
using System.IO;
using System.Windows.Forms;
using System.Drawing;
using System.Diagnostics;

public class SpotifyOverlayInstaller
{
    [STAThread]
    public static void Main()
    {
        Application.EnableVisualStyles();
        Application.SetCompatibleTextRenderingDefault(false);
        
        string scriptDir = Path.GetDirectoryName(Application.StartupPath);
        string scriptPath = Path.Combine(scriptDir, "installer-gui.ps1");
        
        if (File.Exists(scriptPath))
        {
            Process.Start("powershell.exe", $"-ExecutionPolicy Bypass -File \"{scriptPath}\"");
        }
        else
        {
            MessageBox.Show("No se encontró el script del instalador.", "Error", 
                MessageBoxButtons.OK, MessageBoxIcon.Error);
        }
    }
}
