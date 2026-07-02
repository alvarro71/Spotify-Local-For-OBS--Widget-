# Spotify Overlay para OBS Studio

Un plugin nativo para OBS Studio que muestra información de lo que estás reproduciendo en Spotify (u otras aplicaciones) con un diseño moderno y un espectro de audio opcional.

![Versión](https://img.shields.io/badge/versión-1.0.0-green)
![Plataforma](https://img.shields.io/badge/plataforma-Windows%2010%2B-blue)
![OBS](https://img.shields.io/badge/OBS-27.0%2B-orange)

## ✨ Características

- 🎵 **Detección automática** de música reproduciéndose en Spotify, Edge, Chrome y más
- 🎨 **Diseño moderno** con transparencias y efectos de desenfoque
- 🎚️ **Espectro de audio** en tiempo real (opcional)
- ⚡ **Nativo para Windows** - sin dependencias externas
- 🔌 **Fácil instalación** en OBS Studio
- 🌐 **API local** para integración con otras apps

## 📥 Instalación

### Opción 1: Instalador Automático (Recomendado)

1. Descarga el instalador: `SpotifyOverlay-Setup.exe`
2. Ejecuta el instalador
3. ¡Listo! El plugin se instalará en OBS automáticamente

### Opción 2: Instalación Manual

1. Abre PowerShell en la carpeta del plugin
2. Ejecuta:
   ```powershell
   .\install.ps1
   ```
3. Sigue las instrucciones en pantalla

### Opción 3: Compilar desde el código

Requisitos:
- Visual Studio 2022 con C++
- CMake 3.16+
- OBS Studio 27.0+

```bash
# Clonar el repositorio
git clone https://github.com/tu-usuario/spotify-overlay.git
cd spotify-overlay/OBS-PLUGIN

# Compilar
mkdir build
cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release

# Instalar
cd ..
powershell -ExecutionPolicy Bypass -File install.ps1
```

## 🚀 Cómo usar

1. **Abre OBS Studio**

2. **Añade una fuente Browser:**
   - Ve a "Fuentes" y haz clic en "+"
   - Selecciona "Navegador" (Browser)
   - Nómbrala "Spotify Overlay"

3. **Configura la fuente:**
   - **URL:** `http://localhost:9274/`
   - **Ancho:** `450`
   - **Alto:** `150`
   - Marca "Controlar audio vía OBS" (opcional)

4. **Personaliza (opcional):**
   - CSS personalizado:
   ```css
   body { background-color: rgba(0, 0, 0, 0); margin: 0px auto; overflow: hidden; }
   ```

5. **Activa el espectro de audio (opcional):**
   - Haz clic en "Activar Espectro de Audio" en el overlay
   - Selecciona "Audio del sistema" cuando se solicite

## 🎨 Personalización

### Cambiar tamaño
- En OBS, selecciona la fuente y usa las esquinas para redimensionar
- O edita las propiedades y cambia ancho/alto manualmente

### Colores
Edita `data/overlay/style.css` para cambiar:
- Colores del fondo
- Colores del espectro
- Fuentes y tamaños
- Animaciones

## 🔧 Solución de problemas

### El overlay no aparece
1. Verifica que el puerto 9274 no esté en uso
2. Reinicia OBS Studio
3. Comprueba que el plugin esté cargado en "Herramientas > Plugins"

### No muestra información de Spotify
1. Asegúrate de que Spotify esté reproduciendo música
2. Reinicia el plugin desde el menú de OBS
3. Verifica que Spotify tenga permitidos los controles multimedia

### Error al instalar
Ejecuta PowerShell como administrador:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\install.ps1
```

## 📁 Estructura de archivos

```
OBS-PLUGIN/
├── src/                    # Código fuente del plugin
│   ├── plugin-main.c       # Punto de entrada
│   ├── spotify-source.c    # Fuente de Spotify
│   ├── http-server.c       # Servidor web local
│   ├── media-monitor.c     # Monitor de multimedia
│   ├── audio-capture.c     # Captura de audio
│   └── platform/windows/   # Código específico de Windows
├── data/
│   ├── overlay/            # Archivos del overlay
│   │   ├── index.html
│   │   ├── style.css
│   │   └── script.js
│   └── locale/             # Traducciones
├── installer/              # Scripts de instalación
├── build.ps1               # Script de compilación
└── install.ps1             # Script de instalación
```

## 🛠️ Desarrollo

### Compilar el plugin

```bash
cd OBS-PLUGIN
mkdir build
cd build
cmake .. -G "Visual Studio 17 2022" -A x64
cmake --build . --config Release
```

### Ejecutar tests
(Próximamente)

## 📝 Licencia

Este proyecto está bajo la licencia MIT. Ver `LICENSE` para más detalles.

## 🤝 Contribuir

1. Haz un fork del proyecto
2. Crea una rama para tu feature (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 🙏 Agradecimientos

- [OBS Project](https://obsproject.com/) por el software de streaming
- [Spotify](https://spotify.com/) por la música
- Todos los contribuidores del plugin

## 📧 Contacto

- GitHub: [@tu-usuario](https://github.com/tu-usuario)
- Issue Tracker: [GitHub Issues](https://github.com/tu-usuario/spotify-overlay/issues)

---

**Hecho con ❤️ para la comunidad de OBS en español**
