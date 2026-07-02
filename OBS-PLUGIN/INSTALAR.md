# 🎵 Spotify Overlay para OBS - Instrucciones de Instalación

## Opción Rápida (Recomendada para usuarios)

### 1️⃣ Ejecutar el instalador
```powershell
# Abre PowerShell en esta carpeta y ejecuta:
.\install.ps1
```

### 2️⃣ Abrir OBS Studio

### 3️⃣ Configurar en OBS
1. Ve a **Fuentes** (abajo)
2. Click en **+** (agregar)
3. Selecciona **Navegador** (Browser)
4. Configura:
   - **Nombre:** `Spotify Overlay`
   - **URL:** `http://localhost:9274/`
   - **Ancho:** `450`
   - **Alto:** `150`
5. Click en **Aceptar**

### 4️⃣ ¡Listo!
Reproduce música en Spotify y verás la información en tu overlay.

---

## Opción para Desarrolladores (Compilar desde código)

### Requisitos:
- Windows 10/11 64-bit
- Visual Studio 2022 con C++
- CMake 3.16+
- OBS Studio 27.0+

### Pasos:

1. **Compilar el plugin:**
```bash
# En PowerShell:
.\build.bat
```

2. **Instalar:**
```powershell
.\install.ps1
```

3. **Reiniciar OBS Studio**

---

## Solución de Problemas

### ❌ "OBS no encontrado"
Ejecuta PowerShell como **Administrador** e intenta de nuevo.

### ❌ "Puerto 9274 en uso"
Cierra otros programas que usen ese puerto o cambia el puerto en la configuración.

### ❌ El overlay no muestra información
1. Asegúrate de que Spotify esté reproduciendo
2. Reinicia OBS Studio
3. Verifica que el plugin esté cargado

### ❌ Error de permisos al instalar
Ejecuta en PowerShell:
```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
.\install.ps1
```

---

## Personalización

### Cambiar tamaño del overlay
En OBS, selecciona la fuente y:
- Opción A: Arrastra las esquinas para redimensionar
- Opción B: Doble click en "Navegador" y cambia Ancho/Alto

### Añadir espectro de audio
1. Haz click en "Activar Espectro de Audio" en el overlay
2. Selecciona "Audio del sistema" cuando se solicite
3. ¡Disfruta del visualizador en tiempo real!

---

## Soporte

¿Problemas? Revisa:
- 📖 README.md para documentación completa
- 💬 Issues en GitHub para reportar bugs
- 📧 Contacto: tu-email@ejemplo.com

---

**Hecho con ❤️ para la comunidad de streaming en español**
