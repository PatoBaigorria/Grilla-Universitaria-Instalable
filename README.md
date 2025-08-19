# Grilla Universitaria - Seguimiento de Progreso Académico

Aplicación PWA para seguir el progreso de materias universitarias con sincronización multiplataforma usando GitHub Gist.

## 🚀 Características

- ✅ **Sincronización multiplataforma** - Funciona en PC, móvil y tablet
- 💾 **Persistencia segura** - Datos guardados en GitHub Gist (ilimitado y gratuito)
- 🔄 **Sincronización automática** - Los cambios se sincronizan entre dispositivos
- 📱 **PWA** - Instalable como aplicación nativa
- 🔒 **Seguro** - Token de GitHub protegido en servidor backend

## 🛠️ Instalación y Configuración

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
# Copia el archivo de ejemplo
cp .env.example .env.local

# Edita .env.local con tus datos:
GITHUB_TOKEN=tu_token_de_github
GIST_ID=tu_gist_id
PORT=3000
```

### 3. Iniciar el servidor
```bash
# Desarrollo (con auto-reload)
npm run dev

# Producción
npm start
```

### 4. Abrir la aplicación
- Frontend: `http://localhost:3000` (servir archivos estáticos)
- API: `http://localhost:3000/api/gist`
- Health check: `http://localhost:3000/health`

## 🔧 Arquitectura

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Backend       │    │   GitHub Gist   │
│   (PWA)         │◄──►│   (Express)     │◄──►│   (Storage)     │
│                 │    │                 │    │                 │
│ - HTML/CSS/JS   │    │ - CORS enabled  │    │ - JSON data     │
│ - Service Worker│    │ - Token secured │    │ - Version ctrl  │
│ - Offline ready │    │ - Error handling│    │ - Free & stable │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 📡 API Endpoints

- `GET /api/gist` - Cargar datos
- `POST /api/gist` - Guardar datos
- `GET /api/stats` - Estadísticas del Gist
- `GET /health` - Estado del servidor

## 🌐 Despliegue

### Opción 1: Railway
```bash
# Conectar repositorio y desplegar automáticamente
# Variables de entorno se configuran en el dashboard
```

### Opción 2: Render
```bash
# Conectar repositorio de GitHub
# Configurar variables de entorno en settings
```

### Opción 3: Heroku
```bash
heroku create tu-app-name
heroku config:set GITHUB_TOKEN=tu_token
heroku config:set GIST_ID=tu_gist_id
git push heroku main
```

## 🔐 Seguridad

- ✅ Token de GitHub nunca expuesto en frontend
- ✅ CORS configurado correctamente
- ✅ Variables de entorno protegidas
- ✅ Validación de datos en backend
- ✅ Manejo de errores robusto

## 🐛 Solución de Problemas

### Error de CORS en móvil
- Verificar que el servidor esté corriendo
- Comprobar la URL del API en `script.js`

### No se sincronizan los datos
- Verificar token de GitHub en `.env.local`
- Comprobar permisos del token (debe incluir `gist`)
- Revisar logs del servidor

### Error 500 en API
- Verificar que el Gist ID existe
- Comprobar que el token tiene permisos
- Revisar logs del servidor para más detalles

## 📝 Desarrollo

```bash
# Instalar dependencias de desarrollo
npm install

# Ejecutar en modo desarrollo
npm run dev

# Ver logs del servidor
# Los logs aparecen en la consola del servidor
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crear rama feature (`git checkout -b feature/nueva-funcionalidad`)
3. Commit cambios (`git commit -am 'Agregar nueva funcionalidad'`)
4. Push a la rama (`git push origin feature/nueva-funcionalidad`)
5. Crear Pull Request
