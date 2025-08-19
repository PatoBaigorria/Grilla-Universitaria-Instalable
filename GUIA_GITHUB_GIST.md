# 📋 Guía Completa: GitHub Gist para Grilla Universitaria

## 🎯 Resumen
Esta guía te permite configurar GitHub Gist como almacenamiento permanente para la aplicación Grilla Universitaria, reemplazando SheetDB que tenía límites restrictivos.

---

## 🔑 PASO 1: Crear Personal Access Token

### Ubicación
1. **Ir a GitHub** → Click en tu **avatar** (esquina superior derecha)
2. **Settings** 
3. **Developer settings** (al final del menú izquierdo)
4. **Personal access tokens** → **Tokens (classic)**
5. **Generate new token (classic)**

### Configuración del Token
- **Note**: `Grilla Universitaria Storage`
- **Expiration**: `No expiration` 
- **Scopes**: Solo marca `gist` ✅ (NO marcar nada más)
- **Generate token**

### ⚠️ Importante
- **Copiar y guardar** el token inmediatamente (solo se muestra una vez)
- Formato: `ghp_abc123...`
- **Tu token actual**: `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`

---

## 📄 PASO 2: Crear el Gist (Base de Datos)

### Crear Nuevo Gist
1. **Ir a**: https://gist.github.com/
2. **Click**: Botón verde "+" o "New gist"
3. **O ir directamente a**: https://gist.github.com/new

### Configurar el Gist
1. **Filename**: `grilla-universitaria-data.json`
2. **Contenido** (copiar exactamente):
```json
{
  "materias": {},
  "version": "1.0",
  "created": "2025-01-17"
}
```
3. **Click**: "Create public gist" (o "Create secret gist" si prefieres privado)

### Obtener Gist ID
- **URL resultante**: `https://gist.github.com/tu-usuario/GIST_ID_AQUI`
- **Tu Gist ID actual**: `d9b12f9924bc2adb6c91867580ec64aa`

---

## ⚙️ PASO 3: Configurar el Código

### Archivo a Modificar
`script-clean.js` (líneas 14-15)

### Configuración Actual
```javascript
// GitHub Gist configuración
const GITHUB_TOKEN = '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';
const GIST_ID = 'd9b12f9924bc2adb6c91867580ec64aa';
```

### Para Futuras Configuraciones
```javascript
// GitHub Gist configuración
const GITHUB_TOKEN = 'TU_NUEVO_TOKEN_AQUI';
const GIST_ID = 'TU_NUEVO_GIST_ID_AQUI';
```

---

## 🚀 PASO 4: Desplegar

### GitHub Pages
1. **Commit** y **push** los cambios
2. **GitHub Pages** se actualiza automáticamente
3. La aplicación estará disponible en tu URL de GitHub Pages

### Verificar Funcionamiento
- Abrir la aplicación en el navegador
- Marcar una materia
- Verificar en la consola del navegador: `🔄 Cargando desde GitHub Gist...`
- Verificar en tu Gist que se actualiza automáticamente

---

## 🔧 Estructura del Proyecto Final

### Archivos Necesarios
```
📁 Grilla Universitaria Instalable/
├── 📄 index.html          # Página principal
├── 📄 script-clean.js     # Lógica con GitHub Gist
├── 📄 style.css           # Estilos
├── 📄 confetti.js         # Animaciones
├── 📄 manifest.json       # PWA
├── 📄 service-worker.js   # PWA
├── 📄 pi.png              # Icono
└── 📄 GUIA_GITHUB_GIST.md # Esta guía
```

### Archivos Eliminados
- ❌ `script.js` (versión original con SheetDB)
- ❌ `script-optimized.js` (versión con SheetDB y backup)

---

## 💾 Cómo Funciona el Almacenamiento

### Prioridad de Guardado
1. **GitHub Gist** (principal, permanente en la nube)
2. **localStorage** (respaldo local)

### Flujo de Datos
1. Usuario marca materia → Se guarda en GitHub + localStorage
2. Si se limpia cache → localStorage se borra
3. Al recargar → App carga desde GitHub automáticamente
4. **No se pierde información** porque está en la nube

### Ventajas vs SheetDB
- ✅ **Gratis e ilimitado**
- ✅ **Sin límites de API**
- ✅ **Versionado automático**
- ✅ **Más confiable**
- ✅ **Respaldo permanente**

---

## 🔄 Para Crear Nuevo Proyecto

### Si Necesitas Replicar en Otro Proyecto
1. **Crear nuevo token** (siguiendo Paso 1)
2. **Crear nuevo Gist** (siguiendo Paso 2)
3. **Copiar `script-clean.js`** al nuevo proyecto
4. **Actualizar credenciales** en el código
5. **Configurar GitHub Pages** en el nuevo repositorio

### Reutilizar Mismo Gist
- Puedes usar el **mismo Gist** para múltiples proyectos
- Solo cambiar el `GIST_FILENAME` en cada proyecto
- Ejemplo: `grilla-proyecto1.json`, `grilla-proyecto2.json`

---

## 🆘 Solución de Problemas

### Error: "HTTP 401"
- **Problema**: Token inválido o expirado
- **Solución**: Generar nuevo token

### Error: "HTTP 404"
- **Problema**: Gist ID incorrecto
- **Solución**: Verificar Gist ID en la URL del Gist

### No se guardan datos
- **Verificar**: Consola del navegador para errores
- **Verificar**: Token tiene permisos de `gist`
- **Verificar**: Gist existe y es accesible

### Datos no se cargan
- **Verificar**: Estructura JSON correcta en el Gist
- **Verificar**: Filename exacto: `grilla-universitaria-data.json`

---

## 📞 Información de Contacto del Proyecto

### Credenciales Actuales (Enero 2025)
- **GitHub Token**: `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`
- **Gist ID**: `d9b12f9924bc2adb6c91867580ec64aa`
- **Gist URL**: https://gist.github.com/tu-usuario/d9b12f9924bc2adb6c91867580ec64aa

### Notas Importantes
- **Guardar esta guía** en lugar seguro
- **No compartir el token** públicamente
- **El Gist puede ser público** (solo contiene datos de materias)
- **Revocar token** si se compromete la seguridad

---

*Guía creada: Enero 2025*  
*Proyecto: Grilla Universitaria con GitHub Gist*
