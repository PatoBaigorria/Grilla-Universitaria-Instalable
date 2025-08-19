const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración de GitHub
const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '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';
const GIST_ID = process.env.GIST_ID || 'd9b12f9924bc2adb6c91867580ec64aa';
const GIST_FILENAME = 'grilla-universitaria-data.json';
const GITHUB_API_URL = `https://api.github.com/gists/${GIST_ID}`;

// Middleware
app.use(cors({
    origin: '*', // En producción, especifica tu dominio
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (frontend)
app.use(express.static(path.join(__dirname, '..')));

// Logging middleware
app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
    next();
});

// Ruta de salud
app.get('/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        service: 'Grilla Universitaria Proxy'
    });
});

// Cargar datos desde GitHub Gist
app.get('/api/gist', async (req, res) => {
    try {
        console.log('🔄 Cargando desde GitHub Gist...');
        
        const response = await fetch(GITHUB_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Grilla-Universitaria-Proxy'
            }
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status} - ${response.statusText}`);
        }
        
        const gist = await response.json();
        
        if (gist.files && gist.files[GIST_FILENAME]) {
            const content = gist.files[GIST_FILENAME].content;
            const data = JSON.parse(content);
            
            console.log('✅ Datos cargados exitosamente desde GitHub');
            res.json({
                success: true,
                data: data,
                source: 'github',
                timestamp: new Date().toISOString()
            });
        } else {
            console.log('ℹ️ No hay datos en GitHub Gist, devolviendo estructura vacía');
            res.json({
                success: true,
                data: { 
                    materias: {}, 
                    timestamp: new Date().toISOString(), 
                    version: '1.0' 
                },
                source: 'empty',
                timestamp: new Date().toISOString()
            });
        }
        
    } catch (error) {
        console.error('❌ Error al cargar desde GitHub:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error al cargar datos desde GitHub Gist',
            timestamp: new Date().toISOString()
        });
    }
});

// Guardar datos en GitHub Gist
app.post('/api/gist', async (req, res) => {
    try {
        console.log('💾 Guardando en GitHub Gist...');
        
        const { materias } = req.body;
        
        if (!materias) {
            return res.status(400).json({
                success: false,
                error: 'Datos de materias requeridos',
                timestamp: new Date().toISOString()
            });
        }
        
        const datosParaGuardar = {
            materias: materias,
            timestamp: new Date().toISOString(),
            version: '1.0'
        };
        
        const payload = {
            files: {
                [GIST_FILENAME]: {
                    content: JSON.stringify(datosParaGuardar, null, 2)
                }
            }
        };
        
        const response = await fetch(GITHUB_API_URL, {
            method: 'PATCH',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'Content-Type': 'application/json',
                'User-Agent': 'Grilla-Universitaria-Proxy'
            },
            body: JSON.stringify(payload)
        });
        
        if (!response.ok) {
            throw new Error(`GitHub API Error: ${response.status} - ${response.statusText}`);
        }
        
        const result = await response.json();
        
        console.log('✅ Datos guardados exitosamente en GitHub');
        res.json({
            success: true,
            message: 'Datos guardados exitosamente',
            timestamp: datosParaGuardar.timestamp,
            gist_url: result.html_url
        });
        
    } catch (error) {
        console.error('❌ Error al guardar en GitHub:', error);
        res.status(500).json({
            success: false,
            error: error.message,
            details: 'Error al guardar datos en GitHub Gist',
            timestamp: new Date().toISOString()
        });
    }
});

// Ruta para estadísticas (opcional)
app.get('/api/stats', async (req, res) => {
    try {
        const response = await fetch(GITHUB_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `token ${GITHUB_TOKEN}`,
                'Accept': 'application/vnd.github.v3+json',
                'User-Agent': 'Grilla-Universitaria-Proxy'
            }
        });
        
        if (response.ok) {
            const gist = await response.json();
            res.json({
                success: true,
                stats: {
                    gist_id: GIST_ID,
                    updated_at: gist.updated_at,
                    created_at: gist.created_at,
                    public: gist.public,
                    files_count: Object.keys(gist.files || {}).length
                }
            });
        } else {
            throw new Error(`GitHub API Error: ${response.status}`);
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Ruta no encontrada',
        available_routes: [
            'GET /health',
            'GET /api/gist',
            'POST /api/gist',
            'GET /api/stats'
        ]
    });
});

// Manejo global de errores
app.use((error, req, res, next) => {
    console.error('❌ Error no manejado:', error);
    res.status(500).json({
        success: false,
        error: 'Error interno del servidor',
        timestamp: new Date().toISOString()
    });
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor proxy iniciado en puerto ${PORT}`);
    console.log(`📍 Health check: http://localhost:${PORT}/health`);
    console.log(`🔗 API endpoint: http://localhost:${PORT}/api/gist`);
    console.log(`🔑 GitHub Gist ID: ${GIST_ID}`);
});

module.exports = app;
