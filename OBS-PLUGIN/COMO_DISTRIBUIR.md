# 📦 Guía de Distribución - Spotify Overlay para OBS

## 🎯 Objetivo

Crear un instalador fácil de usar para que tus amigos puedan instalar el plugin de Spotify en OBS sin complicaciones.

---

## 📋 Requisitos Previos

Para compilar y distribuir el plugin necesitas:

1. **Visual Studio 2022** (con carga de trabajo de C++)
2. **CMake 3.16+**
3. **OBS Studio** instalado
4. **PowerShell** (incluido en Windows 10/11)

---

## 🚀 Pasos para Compilar y Distribuir

### Opción A: Compilación Completa (Recomendado)

```bash
# 1. Abre PowerShell en la carpeta del plugin
cd OBS-PLUGIN

# 2. Ejecuta el script de compilación
.\build-all.ps1 -CreatePackage

# 3. El paquete estará en: OBS-PLUGIN/output/SpotifyOverlay-v1.0.0.zip
```

### Opción B: Usar Binarios Precompilados

Si no quieres compilar, puedes distribuir:
1. El DLL precompilado (si lo tienes)
2. Los archivos de datos (`data/`)
3. El script de instalación (`install.ps1`)

---

## 📁 Estructura del Paquete de Distribución

El paquete final debe contener:

```
SpotifyOverlay-v1.0.0/
├── obs-spotify-overlay.dll    # Plugin compilado
├── data/                      # Archivos del overlay
│   ├── overlay/
│   │   ├── index.html
│   │   ├── style.css
│   │   ├── script.js
│   │   └── fonts/
│   └── locale/
│       └── en-US.ini
├── install.ps1                # Script de instalación
├── README.md                  # Instrucciones
└── LICENSE                    # Licencia
```

---

## 🔧 Métodos de Distribución

### 1. ZIP Autocontenido (Más Simple)

**Ventajas:**
- Fácil de crear
- Sin dependencias
- Portable

**Pasos:**
1. Crea una carpeta con todos los archivos
2. Comprime como ZIP
3. Comparte el ZIP

**Instrucciones para el usuario:**
```
1. Extrae el ZIP
2. Ejecuta: .\install.ps1
3. Abre OBS Studio
4. Añade fuente Browser con URL: http://localhost:9274/
```

### 2. Instalador EXE (Inno Setup)

**Ventajas:**
- Parece profesional
- Instalación automática
- Registra el plugin correctamente

**Requisitos:**
- Inno Setup 6 (gratis)

**Comando:**
```bash
iscc installer\windows\spotify-overlay-installer.iss
```

### 3. Winget (Avanzado)

Para distribuir en winget.microsoft.com:
1. Crea un manifiesto winget
2. Envía tu paquete a winget-pkgs
3. Los usuarios pueden instalar con: `winget install tu-usuario.SpotifyOverlay`

---

## 📝 Instrucciones para el Usuario Final

### Método 1: Instalador Automático

```powershell
# Descargar el paquete
# Extraer el ZIP
# Ejecutar:
.\install.ps1

# ¡Listo! El plugin se instala automáticamente en OBS
```

### Método 2: Instalación Manual

1. Copiar `obs-spotify-overlay.dll` a:
   ```
   C:\Program Files\obs-studio\obs-plugins\64bit\
   ```

2. Copiar carpeta `data` a:
   ```
   C:\Program Files\obs-studio\obs-plugins\obs-spotify-overlay\data\
   ```

3. Reiniciar OBS Studio

4. Añadir fuente Browser:
   - URL: `http://localhost:9274/`
   - Ancho: `450`
   - Alto: `150`

---

## 🎨 Personalización del Installer

Para personalizar el instalador:

1. **Editar `installer/windows/spotify-overlay-installer.iss`:**
   - Cambiar nombre del autor
   - Cambiar versión
   - Cambiar URL de soporte

2. **Cambiar icono:**
   - Añade: `SetupIconFile=mi-icono.ico`

3. **Cambiar colores:**
   - Modifica las sepciones de `[Code]`

---

## ✅ Checklist de Distribución

Antes de distribuir:

- [ ] Compilar el plugin en modo Release
- [ ] Verificar que el DLL funciona
- [ ] Probar el script de instalación
- [ ] Incluir README con instrucciones
- [ ] Incluir LICENSE
- [ ] Probar en una PC limpia (sin dependencias)
- [ ] Verificar que los antivirus no lo bloquean

---

## 🛡️ Consideraciones de Seguridad

### Firmado del Código

Para evitar advertencias de Windows:

1. Obtén un certificado de código signing
2. Firma el DLL:
   ```bash
   signtool sign /fd SHA256 /t http://timestamp.digicert.com obs-spotify-overlay.dll
   ```

### SmartScreen

Si Windows SmartScreen bloquea la instalación:
- El archivo necesita más descargas para ganar reputación
- O firma el instalador con un certificado

---

## 📊 Tamaño del Paquete

Esperado:
- **DLL:** ~50-100 KB
- **Datos:** ~500 KB
- **Total:** ~1 MB

---

## 🔄 Actualizaciones

Para actualizar:

1. Incrementa la versión en:
   - `CMakeLists.txt`
   - `installer.iss`
   - `install.ps1`

2. Cambia el nombre del paquete:
   ```
   SpotifyOverlay-v1.1.0.zip
   ```

3. Notifica a los usuarios de los cambios

---

## 📞 Soporte para Usuarios

Crea un documento de FAQ con:

- Errores comunes
- Soluciones
- Contacto de soporte
- Link al repositorio

---

## 🎉 Ejemplo de Distribución

```powershell
# 1. Compilar
.\build-all.ps1 -CreatePackage

# 2. El paquete está en: output/SpotifyOverlay-v1.0.0.zip

# 3. Compartir en:
#    - GitHub Releases
#    - Google Drive
#    - Tu sitio web

# 4. Instrucciones para usuarios:
#    "Descarga el ZIP, ejecuta install.ps1, y disfruta!"
```

---

## 📚 Recursos Adicionales

- [OBS Plugin Development](https://obsproject.com/wiki/Plugin-Tutorial)
- [CMake Documentation](https://cmake.org/documentation/)
- [Inno Setup Help](https://jrsoftware.org/ishelp/)
- [PowerShell Documentation](https://docs.microsoft.com/powershell/)

---

**¡Éxito distribuyendo tu plugin! 🚀**
