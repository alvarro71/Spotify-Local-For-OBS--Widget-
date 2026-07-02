using System;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.IO;
using System.Reflection;
using System.Windows.Forms;

namespace SpotifyOverlayInstaller
{
    public class MainForm : Form
    {
        // Colors
        private readonly Color SpotifyGreen = Color.FromArgb(29, 185, 84);
        private readonly Color SpotifyGreenDark = Color.FromArgb(20, 150, 65);
        private readonly Color DarkBg = Color.FromArgb(18, 18, 18);
        private readonly Color DarkSurface = Color.FromArgb(28, 28, 28);
        private readonly Color DarkSurfaceLight = Color.FromArgb(42, 42, 42);
        private readonly Color TextSecondaryColor = Color.FromArgb(180, 180, 180);
        private readonly Color TextMutedColor = Color.FromArgb(120, 120, 120);

        private Button installButton;
        private Button uninstallButton;
        private Button closeButton;
        private CustomProgressBar progressBar;
        private Label statusLabel;
        private TextBox logBox;
        private Panel headerPanel;
        private Panel mainPanel;
        private Panel bottomPanel;
        private System.Windows.Forms.Timer fadeTimer;

        public MainForm()
        {
            this.Opacity = 0; // Start invisible for fade-in animation
            InitializeComponent();
            
            // Setup Fade-in Animation Timer
            fadeTimer = new System.Windows.Forms.Timer();
            fadeTimer.Interval = 15;
            fadeTimer.Tick += (s, e) =>
            {
                if (this.Opacity < 1.0)
                {
                    this.Opacity += 0.08;
                }
                else
                {
                    fadeTimer.Stop();
                }
            };
            this.Load += (s, e) => fadeTimer.Start();
        }

        private void InitializeComponent()
        {
            this.Text = "Spotify Overlay v1.0.0 - Instalador";
            this.Size = new Size(560, 680);
            this.StartPosition = FormStartPosition.CenterScreen;
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.BackColor = DarkBg;
            this.Font = new Font("Segoe UI", 9, FontStyle.Regular);
            this.ShowIcon = false;

            // Header Panel with custom paint gradient
            headerPanel = new Panel
            {
                Size = new Size(560, 150),
                Location = new Point(0, 0),
                BackColor = SpotifyGreen
            };
            headerPanel.Paint += (s, e) =>
            {
                Graphics g = e.Graphics;
                using (var brush = new LinearGradientBrush(
                    headerPanel.ClientRectangle,
                    SpotifyGreen,
                    Color.FromArgb(20, 130, 60),
                    LinearGradientMode.Horizontal))
                {
                    g.FillRectangle(brush, headerPanel.ClientRectangle);
                }
            };

            var logoLabel = new Label
            {
                Text = "♫",
                Font = new Font("Segoe UI", 48, FontStyle.Bold),
                ForeColor = Color.White,
                Size = new Size(90, 90),
                Location = new Point(20, 15),
                TextAlign = ContentAlignment.MiddleCenter,
                BackColor = Color.Transparent
            };
            headerPanel.Controls.Add(logoLabel);

            var titleLabel = new Label
            {
                Text = "Spotify Overlay",
                Font = new Font("Segoe UI", 28, FontStyle.Bold),
                ForeColor = Color.White,
                AutoSize = true,
                Location = new Point(120, 22),
                BackColor = Color.Transparent
            };
            headerPanel.Controls.Add(titleLabel);

            var subtitleLabel = new Label
            {
                Text = "para OBS Studio",
                Font = new Font("Segoe UI", 12),
                ForeColor = Color.FromArgb(200, 255, 255, 255),
                AutoSize = true,
                Location = new Point(122, 70),
                BackColor = Color.Transparent
            };
            headerPanel.Controls.Add(subtitleLabel);

            var versionLabel = new Label
            {
                Text = "v1.0.0",
                Font = new Font("Segoe UI", 9),
                ForeColor = Color.FromArgb(180, 255, 255, 255),
                AutoSize = true,
                Location = new Point(122, 95),
                BackColor = Color.Transparent
            };
            headerPanel.Controls.Add(versionLabel);

            // Main Panel
            mainPanel = new Panel
            {
                Size = new Size(540, 400),
                Location = new Point(10, 160),
                BackColor = DarkBg
            };

            var descLabel = new Label
            {
                Text = "Este instalador configurará automáticamente el plugin en tu OBS Studio.",
                Font = new Font("Segoe UI", 10),
                ForeColor = TextSecondaryColor,
                Size = new Size(520, 30),
                Location = new Point(10, 10)
            };
            mainPanel.Controls.Add(descLabel);

            var separator = new Label
            {
                Text = "",
                BackColor = DarkSurfaceLight,
                Size = new Size(520, 1),
                Location = new Point(10, 50)
            };
            mainPanel.Controls.Add(separator);

            var featuresHeader = new Label
            {
                Text = "✦ Características",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                ForeColor = SpotifyGreen,
                AutoSize = true,
                Location = new Point(10, 65)
            };
            mainPanel.Controls.Add(featuresHeader);

            var featureList = new Label
            {
                Text = "  ▶  Detección automática de Spotify y otras apps\r\n\r\n"
                     + "  ▶  Espectro de audio en tiempo real\r\n\r\n"
                     + "  ▶  Diseño moderno y personalizable (Estilo Glassmorphism)\r\n\r\n"
                     + "  ▶  100% compatible con Windows 10/11\r\n\r\n"
                     + "  ▶  Ligero, nativo y sin dependencias externas",
                 Font = new Font("Segoe UI", 9),
                 ForeColor = TextSecondaryColor,
                 Size = new Size(520, 170),
                 Location = new Point(10, 95)
            };
            mainPanel.Controls.Add(featureList);

            progressBar = new CustomProgressBar
            {
                Size = new Size(520, 25),
                Location = new Point(10, 275),
                Visible = false
            };
            mainPanel.Controls.Add(progressBar);

            statusLabel = new Label
            {
                Text = "Estado: Esperando para iniciar...",
                Font = new Font("Segoe UI", 9),
                ForeColor = TextMutedColor,
                Size = new Size(520, 25),
                Location = new Point(10, 310)
            };
            mainPanel.Controls.Add(statusLabel);

            logBox = new TextBox
            {
                Size = new Size(520, 70),
                Location = new Point(10, 340),
                Multiline = true,
                ScrollBars = ScrollBars.Vertical,
                ReadOnly = true,
                Font = new Font("Consolas", 8),
                BackColor = Color.FromArgb(24, 24, 24),
                ForeColor = TextSecondaryColor,
                BorderStyle = BorderStyle.FixedSingle,
                Visible = false,
                Text = ""
            };
            mainPanel.Controls.Add(logBox);

            // Bottom Panel
            bottomPanel = new Panel
            {
                Size = new Size(560, 90),
                Location = new Point(0, 560),
                BackColor = DarkSurface
            };

            var divider = new Label
            {
                Text = "",
                BackColor = DarkSurfaceLight,
                Size = new Size(560, 1),
                Location = new Point(0, 0)
            };
            bottomPanel.Controls.Add(divider);

            installButton = new Button
            {
                Text = "▶  Instalar ahora",
                Font = new Font("Segoe UI", 11, FontStyle.Bold),
                Size = new Size(180, 50),
                Location = new Point(20, 20),
                BackColor = SpotifyGreen,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                FlatAppearance = { BorderSize = 0 }
            };
            installButton.Click += InstallButton_Click;
            installButton.MouseEnter += (s, e) => installButton.BackColor = Color.FromArgb(35, 205, 96);
            installButton.MouseLeave += (s, e) => installButton.BackColor = SpotifyGreen;
            bottomPanel.Controls.Add(installButton);

            uninstallButton = new Button
            {
                Text = "🗑  Desinstalar",
                Font = new Font("Segoe UI", 11, FontStyle.Bold),
                Size = new Size(185, 50),
                Location = new Point(215, 20),
                BackColor = Color.FromArgb(40, 40, 40),
                ForeColor = Color.FromArgb(255, 100, 100),
                FlatStyle = FlatStyle.Flat,
                FlatAppearance = { BorderSize = 0 }
            };
            uninstallButton.Click += UninstallButton_Click;
            uninstallButton.MouseEnter += (s, e) => uninstallButton.BackColor = Color.FromArgb(50, 40, 40);
            uninstallButton.MouseLeave += (s, e) => uninstallButton.BackColor = Color.FromArgb(40, 40, 40);
            bottomPanel.Controls.Add(uninstallButton);

            closeButton = new Button
            {
                Text = "Cerrar",
                Font = new Font("Segoe UI", 10),
                Size = new Size(120, 50),
                Location = new Point(415, 20),
                BackColor = DarkSurfaceLight,
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                FlatAppearance = { BorderSize = 0 },
                Enabled = false,
                Visible = false
            };
            closeButton.Click += (s, e) => this.Close();
            closeButton.MouseEnter += (s, e) => closeButton.BackColor = Color.FromArgb(60, 60, 60);
            closeButton.MouseLeave += (s, e) => closeButton.BackColor = DarkSurfaceLight;
            bottomPanel.Controls.Add(closeButton);

            this.Controls.Add(headerPanel);
            this.Controls.Add(mainPanel);
            this.Controls.Add(bottomPanel);
        }

        private string FindOBSPath()
        {
            AppendLog("▶ Buscando OBS Studio en el sistema...");

            foreach (DriveInfo drive in DriveInfo.GetDrives())
            {
                if (!drive.IsReady) continue;
                string root = drive.RootDirectory.FullName;

                string[] quickPaths = {
                    Path.Combine(root, @"SteamLibrary\steamapps\common\OBS Studio"),
                    Path.Combine(root, @"Steam\steamapps\common\OBS Studio"),
                    Path.Combine(root, @"Program Files\OBS Studio"),
                    Path.Combine(root, @"Program Files (x86)\OBS Studio"),
                    Path.Combine(root, @"Programs\OBS Studio")
                };

                foreach (var p in quickPaths)
                {
                    if (Directory.Exists(p))
                    {
                        AppendLog("✓ OBS encontrado en: " + p);
                        return p;
                    }
                }
            }

            string[] userPaths = {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"Programs\OBS Studio"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData), @"OBS Studio"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "OBS Studio"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "OBS Studio")
            };

            foreach (var p in userPaths)
            {
                if (Directory.Exists(p))
                {
                    AppendLog("✓ OBS encontrado en: " + p);
                    return p;
                }
            }

            return null;
        }

        private void AppendLog(string text)
        {
            if (logBox.InvokeRequired)
            {
                logBox.Invoke(new Action<string>(AppendLog), text);
                return;
            }
            logBox.Text += text + Environment.NewLine;
            logBox.SelectionStart = logBox.Text.Length;
            logBox.ScrollToCaret();
        }

        private void SetStatus(string text, Color? color = null)
        {
            if (statusLabel.InvokeRequired)
            {
                statusLabel.Invoke(new Action(() => SetStatus(text, color)));
                return;
            }
            statusLabel.Text = "Estado: " + text;
            statusLabel.ForeColor = color ?? TextMutedColor;
        }

        private void SetProgress(int value)
        {
            if (progressBar.InvokeRequired)
            {
                progressBar.Invoke(new Action<int>(SetProgress), value);
                return;
            }
            progressBar.Value = value;
        }

        private void InstallButton_Click(object sender, EventArgs e)
        {
            installButton.Enabled = false;
            uninstallButton.Enabled = false;
            installButton.Text = "⏳ Instalando...";
            progressBar.Visible = true;
            logBox.Visible = true;
            logBox.Text = "";

            try
            {
                SetStatus("Buscando OBS Studio...", Color.White);
                AppendLog("▶ Buscando OBS Studio...");

                string obsPath = FindOBSPath();
                if (obsPath == null)
                {
                    SetStatus("✗ ERROR: OBS Studio no encontrado", Color.Red);
                    AppendLog("");
                    AppendLog("═══════════════════════════════════════════");
                    AppendLog("  OBS STUDIO NO ENCONTRADO");
                    AppendLog("═══════════════════════════════════════════");
                    AppendLog("");
                    AppendLog("  No se encontró OBS Studio en ningún disco.");
                    AppendLog("  Instala OBS Studio primero y vuelve a intentar.");

                    MessageBox.Show(
                        "OBS Studio no encontrado en el sistema.\n\nPor favor instalalo antes de continuar.",
                        "OBS no encontrado",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Warning);

                    installButton.Enabled = true;
                    uninstallButton.Enabled = true;
                    installButton.Text = "↻ Reintentar";
                    return;
                }

                AppendLog("✓ OBS encontrado en: " + obsPath);
                SetProgress(20);

                SetStatus("Preparando instalación...", Color.White);
                AppendLog("▶ Preparando directorios...");

                string plugin64Dir = Path.Combine(obsPath, @"obs-plugins\64bit");
                Directory.CreateDirectory(plugin64Dir);

                AppendLog("✓ Directorios creados correctamente");
                SetProgress(40);

                SetStatus("Instalando plugin nativo...", Color.White);
                string dllDest = Path.Combine(plugin64Dir, "obs-spotify-overlay.dll");
                ExtractResource("obs-spotify-overlay.dll", dllDest);
                AppendLog("✓ DLL del plugin instalada correctamente");
                SetProgress(65);

                SetStatus("Instalando servidor de datos...", Color.White);
                string exeDest = Path.Combine(plugin64Dir, "SpotifyOverlayServer.exe");
                ExtractResource("SpotifyOverlayServer.exe", exeDest);
                AppendLog("✓ Servidor de datos instalado correctamente");
                SetProgress(90);

                SetProgress(100);
                SetStatus("✓ ¡Instalación completada con éxito!", SpotifyGreen);

                installButton.Text = "✓ ¡Instalado!";
                installButton.BackColor = Color.FromArgb(29, 185, 84);
                closeButton.Enabled = true;
                closeButton.Visible = true;

                AppendLog("");
                AppendLog("═══════════════════════════════════════");
                AppendLog("✓ INSTALACIÓN COMPLETADA CON ÉXITO");
                AppendLog("═══════════════════════════════════════");

                MessageBox.Show(
                    "¡Instalación completada con éxito!\n\nAhora puedes:\n\n1. Abrir OBS Studio\n2. Añadir fuente 'Navegador' (Browser)\n3. URL: http://localhost:9274/\n4. Tamaño recomendado: 450×150\n5. ¡Reproduce música en Spotify!",
                    "✓ Instalación completada",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Information);
            }
            catch (Exception ex)
            {
                SetStatus("✗ Error durante la instalación", Color.Red);
                AppendLog("");
                AppendLog("✗ ERROR: " + ex.Message);
                AppendLog("  Detalles: " + ex.ToString());

                MessageBox.Show(
                    "Ocurrió un error durante la instalación:\n\n" + ex.Message,
                    "Error de instalación",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);

                installButton.Enabled = true;
                uninstallButton.Enabled = true;
                installButton.Text = "↻ Reintentar";
            }
        }

        private void UninstallButton_Click(object sender, EventArgs e)
        {
            var confirmResult = MessageBox.Show(
                "¿Estás seguro de que deseas desinstalar Spotify Overlay de tu OBS Studio?\n\nEsto eliminará el plugin nativo y el servidor de datos de tu instalación de OBS.",
                "Confirmar Desinstalación",
                MessageBoxButtons.YesNo,
                MessageBoxIcon.Warning);

            if (confirmResult != DialogResult.Yes)
            {
                return;
            }

            installButton.Enabled = false;
            uninstallButton.Enabled = false;
            uninstallButton.Text = "⏳ Desinstalando...";
            progressBar.Visible = true;
            logBox.Visible = true;
            logBox.Text = "";

            try
            {
                SetStatus("Buscando OBS Studio...", Color.White);
                AppendLog("▶ Iniciando desinstalación...");

                string obsPath = FindOBSPath();
                if (obsPath == null)
                {
                    SetStatus("✗ ERROR: OBS Studio no encontrado", Color.Red);
                    AppendLog("No se pudo encontrar la ruta de OBS Studio para desinstalar.");
                    uninstallButton.Enabled = true;
                    installButton.Enabled = true;
                    uninstallButton.Text = "🗑  Desinstalar";
                    return;
                }

                SetProgress(35);
                string plugin64Dir = Path.Combine(obsPath, @"obs-plugins\64bit");
                string dllPath = Path.Combine(plugin64Dir, "obs-spotify-overlay.dll");
                string exePath = Path.Combine(plugin64Dir, "SpotifyOverlayServer.exe");

                bool removedAny = false;
                SetStatus("Eliminando archivos...", Color.White);

                if (File.Exists(dllPath))
                {
                    File.Delete(dllPath);
                    AppendLog("✓ Eliminado: obs-spotify-overlay.dll");
                    removedAny = true;
                }
                else
                {
                    AppendLog("· No encontrado: obs-spotify-overlay.dll (ya desinstalado)");
                }

                SetProgress(70);

                if (File.Exists(exePath))
                {
                    File.Delete(exePath);
                    AppendLog("✓ Eliminado: SpotifyOverlayServer.exe");
                    removedAny = true;
                }
                else
                {
                    AppendLog("· No encontrado: SpotifyOverlayServer.exe (ya desinstalado)");
                }

                SetProgress(100);

                if (removedAny)
                {
                    SetStatus("✓ ¡Desinstalado con éxito!", SpotifyGreen);
                    AppendLog("");
                    AppendLog("═══════════════════════════════════════");
                    AppendLog("✓ DESINSTALACIÓN COMPLETADA CON ÉXITO");
                    AppendLog("═══════════════════════════════════════");

                    MessageBox.Show(
                        "¡Spotify Overlay se ha desinstalado correctamente de tu OBS Studio!",
                        "Desinstalación completada",
                        MessageBoxButtons.OK,
                        MessageBoxIcon.Information);
                }
                else
                {
                    SetStatus("✓ Ya estaba desinstalado", Color.Yellow);
                    AppendLog("No se encontraron archivos activos del plugin para eliminar.");
                }

                uninstallButton.Text = "✓ ¡Desinstalado!";
                uninstallButton.BackColor = Color.FromArgb(50, 50, 50);
                closeButton.Enabled = true;
                closeButton.Visible = true;
            }
            catch (Exception ex)
            {
                SetStatus("✗ Error durante la desinstalación", Color.Red);
                AppendLog("✗ ERROR: " + ex.Message);
                uninstallButton.Enabled = true;
                installButton.Enabled = true;
                uninstallButton.Text = "🗑  Desinstalar";

                MessageBox.Show(
                    "Ocurrió un error al intentar desinstalar:\n\n" + ex.Message,
                    "Error de desinstalación",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error);
            }
        }

        private void ExtractResource(string name, string outputPath)
        {
            var assembly = Assembly.GetExecutingAssembly();
            string[] resourceNames = assembly.GetManifestResourceNames();
            string resourceName = null;

            foreach (var rName in resourceNames)
            {
                if (rName.EndsWith(name, StringComparison.OrdinalIgnoreCase))
                {
                    resourceName = rName;
                    break;
                }
            }

            if (resourceName == null)
            {
                throw new Exception($"No se encontró el recurso '{name}' incrustado en el instalador.");
            }

            using (Stream stream = assembly.GetManifestResourceStream(resourceName))
            {
                if (stream == null)
                    throw new Exception($"Error al cargar el recurso '{resourceName}'.");

                using (FileStream fileStream = new FileStream(outputPath, FileMode.Create, FileAccess.Write))
                {
                    stream.CopyTo(fileStream);
                }
            }
        }
    }

    // Custom Rounded Progress Bar Control
    public class CustomProgressBar : Control
    {
        private int value = 0;
        public int Value
        {
            get => value;
            set
            {
                this.value = Math.Min(100, Math.Max(0, value));
                Invalidate();
            }
        }

        public CustomProgressBar()
        {
            this.DoubleBuffered = true;
            this.Size = new Size(520, 25);
            this.BackColor = Color.FromArgb(18, 18, 18);
        }

        protected override void OnPaint(PaintEventArgs e)
        {
            base.OnPaint(e);
            Graphics g = e.Graphics;
            g.SmoothingMode = SmoothingMode.AntiAlias;

            // Background track with rounded corners
            using (var bgBrush = new SolidBrush(Color.FromArgb(40, 40, 40)))
            {
                GraphicsExtensions.FillRoundedRectangle(g, bgBrush, 0, 0, this.Width, this.Height, 8);
            }

            // Foreground bar with horizontal gradient and rounded corners
            if (value > 0)
            {
                int progressWidth = (int)((value / 100.0) * this.Width);
                if (progressWidth > 16) // Enough width to draw arcs correctly
                {
                    using (var fillBrush = new LinearGradientBrush(
                        new Point(0, 0), new Point(this.Width, 0),
                        Color.FromArgb(29, 185, 84), Color.FromArgb(30, 215, 96)))
                    {
                        GraphicsExtensions.FillRoundedRectangle(g, fillBrush, 0, 0, progressWidth, this.Height, 8);
                    }
                }
                else if (progressWidth > 0)
                {
                    // Draw simple rect for small values to prevent path errors
                    using (var fillBrush = new SolidBrush(Color.FromArgb(29, 185, 84)))
                    {
                        g.FillRectangle(fillBrush, 0, 0, progressWidth, this.Height);
                    }
                }
            }

            // Centered Percentage Text
            string text = value + "%";
            using (var font = new Font("Segoe UI", 9, FontStyle.Bold))
            using (var brush = new SolidBrush(Color.White))
            {
                Size textSize = TextRenderer.MeasureText(text, font);
                g.DrawString(text, font, brush, (this.Width - textSize.Width) / 2.0f, (this.Height - textSize.Height) / 2.0f);
            }
        }
    }

    // Helper for Rounded Shapes in GDI+
    public static class GraphicsExtensions
    {
        public static void FillRoundedRectangle(Graphics g, Brush brush, float x, float y, float width, float height, float radius)
        {
            using (var path = new GraphicsPath())
            {
                float r = radius * 2;
                if (r > width) r = width;
                if (r > height) r = height;

                path.AddArc(x, y, r, r, 180, 90);
                path.AddArc(x + width - r, y, r, r, 270, 90);
                path.AddArc(x + width - r, y + height - r, r, r, 0, 90);
                path.AddArc(x, y + height - r, r, r, 90, 90);
                path.CloseAllFigures();
                g.FillPath(brush, path);
            }
        }
    }
}
