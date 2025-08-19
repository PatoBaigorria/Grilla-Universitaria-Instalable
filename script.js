// Función que se ejecuta cuando el DOM está listo
(function() {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarApp);
    } else {
        iniciarApp();
    }
    
    function iniciarApp() {
        // Configuración
        let estadosMaterias = {};
        
        // Configuración del Proxy API
        const PROXY_API_URL = window.location.hostname === 'localhost' 
            ? 'http://localhost:3000/api/gist'  // Desarrollo local
            : '/api/gist'; // Producción (mismo dominio)
        
        // SOLO PARA GITHUB PAGES (INSEGURO):
        // const GITHUB_TOKEN = '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';
        // const GIST_ID = 'd9b12f9924bc2adb6c91867580ec64aa';
        
        // Historial para la función deshacer (hasta 20 movimientos)
        const historialEstados = [];
        const maxHistorial = 20;
        
        // Sistema de debouncing para reducir llamadas a la API
        let timeoutGuardado = null;
        let pendienteGuardar = false;
        const DELAY_GUARDADO = 3000; // 3 segundos de retraso
        
        // Control de estado
        let githubDisponible = true;
        let modoAlmacenamiento = 'github';

        // ========== FUNCIONES DE GITHUB GIST ==========
        
        // Cargar datos desde GitHub Gist vía proxy
        async function cargarDesdeGitHub() {
            try {
                console.log('🔄 Cargando desde GitHub Gist vía proxy...');
                
                const response = await fetch(PROXY_API_URL, {
                    method: 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    }
                });
                
                if (!response.ok) {
                    throw new Error(`Proxy Error: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success && result.data && result.data.materias) {
                    estadosMaterias = result.data.materias;
                    console.log(`📥 Cargadas ${Object.keys(estadosMaterias).length} materias desde GitHub`);
                    modoAlmacenamiento = 'github';
                    return true;
                }
                
                console.log('ℹ️ No hay datos en GitHub Gist, inicializando vacío');
                return false;
            } catch (error) {
                console.error('Error al cargar desde GitHub:', error);
                githubDisponible = false;
                return false;
            }
        }
        
        // Guardar datos en GitHub Gist vía proxy
        async function guardarEnGitHub() {
            try {
                console.log('💾 Guardando en GitHub Gist vía proxy...');
                
                const payload = {
                    materias: estadosMaterias
                };
                
                const response = await fetch(PROXY_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(payload)
                });
                
                if (!response.ok) {
                    throw new Error(`Proxy Error: ${response.status}`);
                }
                
                const result = await response.json();
                
                if (result.success) {
                    console.log('✅ Datos guardados exitosamente en GitHub');
                    return true;
                } else {
                    throw new Error(result.error || 'Error desconocido');
                }
            } catch (error) {
                console.error('Error al guardar en GitHub:', error);
                githubDisponible = false;
                return false;
            }
        }
        
        // Cargar datos con fallback a localStorage
        async function cargarDatos() {
            // Intentar GitHub primero
            if (githubDisponible) {
                const exitoGitHub = await cargarDesdeGitHub();
                if (exitoGitHub) {
                    mostrarMensajeFlash('Datos cargados desde GitHub', 'success');
                    return true;
                }
            }
            
            // Fallback a localStorage
            try {
                const datosGuardados = localStorage.getItem('estadosMaterias');
                if (datosGuardados) {
                    estadosMaterias = JSON.parse(datosGuardados);
                    console.log(`📥 Cargadas ${Object.keys(estadosMaterias).length} materias desde localStorage`);
                    modoAlmacenamiento = 'localStorage';
                    return true;
                }
            } catch (error) {
                console.error('Error al cargar desde localStorage:', error);
            }
            
            return false;
        }
        
        // Guardar datos con fallback a localStorage
        async function guardarDatos() {
            // Intentar GitHub primero
            if (githubDisponible) {
                const exitoGitHub = await guardarEnGitHub();
                if (exitoGitHub) {
                    // También guardar en localStorage como respaldo
                    localStorage.setItem('estadosMaterias', JSON.stringify(estadosMaterias));
                    mostrarMensajeFlash('Progreso guardado', 'success');
                    return true;
                }
            }
            
            // Fallback a localStorage
            try {
                localStorage.setItem('estadosMaterias', JSON.stringify(estadosMaterias));
                console.log(`✅ Guardadas ${Object.keys(estadosMaterias).length} materias en localStorage`);
                mostrarMensajeFlash('Progreso guardado localmente', 'info');
                return true;
            } catch (error) {
                console.error('Error al guardar en localStorage:', error);
                mostrarMensajeFlash('Error al guardar', 'error');
                return false;
            }
        }

        // ========== FUNCIONES DE INTERFAZ ==========
        
        // Aplicar estados cargados al DOM
        function aplicarEstadosAlDOM() {
            console.log('=== APLICANDO ESTADOS AL DOM ===');
            
            const todasLasMaterias = document.querySelectorAll('.materia');
            
            todasLasMaterias.forEach(materia => {
                const id = materia.id;
                
                // Limpiar clases existentes
                materia.classList.remove('cursando', 'aprobada');
                
                // Aplicar estado guardado
                if (estadosMaterias[id]) {
                    if (estadosMaterias[id].cursando) {
                        materia.classList.add('cursando');
                    } else if (estadosMaterias[id].aprobada) {
                        materia.classList.add('aprobada');
                    }
                }
                
                // Aplicar estilos visuales
                aplicarEstilos(materia);
            });
            
            // Actualizar correlatividades y progreso
            revisarCorrelativas();
            actualizarBarraProgreso();
        }

        // Aplicar estilos - limpiar estilos inline para que CSS tome control
        function aplicarEstilos(materia) {
            materia.style.backgroundColor = '';
            materia.style.color = '';
            materia.style.textDecoration = '';
            materia.style.opacity = '';
            materia.style.cursor = '';
            materia.style.border = '';
            materia.style.boxShadow = '';
            
            // Solo aplicar cursor específico según estado
            if (materia.classList.contains('bloqueada')) {
                materia.style.cursor = 'not-allowed';
            } else {
                materia.style.cursor = 'pointer';
            }
        }

        // Inicializar estilos de todas las materias
        function inicializarMaterias() {
            const todasLasMaterias = document.querySelectorAll('.materia');
            todasLasMaterias.forEach(materia => {
                aplicarEstilos(materia);
            });
        }

        // ========== BARRA DE PROGRESO ==========
        
        function actualizarBarraProgreso() {
            const todasLasMaterias = document.querySelectorAll('.materia');
            
            // Definir materias anuales que aparecen duplicadas
            const materiasAnuales = {
                'ingles': ['ingles', 'ingles-2']
            };
            
            let materiasAprobadas = 0;
            let materiasContadas = new Set();
            
            // Calcular total real de materias (descontando duplicados anuales)
            let totalMateriasReales = todasLasMaterias.length;
            Object.values(materiasAnuales).forEach(grupo => {
                totalMateriasReales -= (grupo.length - 1);
            });

            todasLasMaterias.forEach(materia => {
                const id = materia.id;
                
                // Verificar si es una materia anual
                let esAnual = false;
                let grupoAnual = null;
                let nombreMateria = null;
                
                for (const [nombre, ids] of Object.entries(materiasAnuales)) {
                    if (ids.includes(id)) {
                        esAnual = true;
                        grupoAnual = ids;
                        nombreMateria = nombre;
                        break;
                    }
                }
                
                if (esAnual) {
                    // Para materias anuales, verificar si ya fue contada
                    if (!materiasContadas.has(nombreMateria)) {
                        // Verificar estado de todas las partes de la materia anual
                        const todasAprobadas = grupoAnual.every(idParte => 
                            estadosMaterias[idParte] && estadosMaterias[idParte].aprobada
                        );
                        
                        if (todasAprobadas) {
                            materiasAprobadas++;
                        }
                        
                        materiasContadas.add(nombreMateria);
                    }
                } else {
                    // Para materias normales
                    if (estadosMaterias[id] && estadosMaterias[id].aprobada) {
                        materiasAprobadas++;
                    }
                }
            });
            
            // Actualizar elementos de la interfaz
            const totalMaterias = totalMateriasReales;
            const porcentaje = (materiasAprobadas / totalMaterias) * 100;

            const barraInterna = document.querySelector('.progress-bar-inner');
            const porcentajeElemento = document.querySelector('.progress-percentage');
            const materiasAprobadasElemento = document.querySelector('.materias-aprobadas');
            const totalMateriasElemento = document.querySelector('.total-materias');

            if (barraInterna) barraInterna.style.width = porcentaje + '%';
            if (porcentajeElemento) porcentajeElemento.textContent = porcentaje.toFixed(0) + '%';
            if (materiasAprobadasElemento) materiasAprobadasElemento.textContent = materiasAprobadas;
            if (totalMateriasElemento) totalMateriasElemento.textContent = totalMaterias;
        }

        // ========== SISTEMA DE CORRELATIVIDADES ==========
        
        function revisarCorrelativas() {
            const materias = document.querySelectorAll('.materia');
            
            materias.forEach(materia => {
                const id = materia.id;
                const correlativasData = materia.getAttribute('data-correlativas');
                
                if (!correlativasData) return;
                
                try {
                    const correlativas = JSON.parse(correlativasData);
                    let puedeHabilitarse = true;
                    
                    // Verificar cada correlativa
                    for (const correlativa of correlativas) {
                        const idCorrelativa = correlativa.id;
                        const estadoRequerido = correlativa.estado;
                        const estadoActual = estadosMaterias[idCorrelativa];
                        
                        if (!estadoActual) {
                            puedeHabilitarse = false;
                            continue;
                        }
                        
                        if (estadoRequerido === 'cursando') {
                            if (!estadoActual.cursando && !estadoActual.aprobada) {
                                puedeHabilitarse = false;
                            }
                        } else if (estadoRequerido === 'aprobada') {
                            if (!estadoActual.aprobada) {
                                puedeHabilitarse = false;
                            }
                        }
                    }
                    
                    // Aplicar el resultado
                    if (puedeHabilitarse) {
                        materia.classList.remove('bloqueada');
                    } else {
                        materia.classList.add('bloqueada');
                    }
                    
                    aplicarEstilos(materia);
                    
                } catch (error) {
                    console.error(`Error al procesar correlativas de ${id}:`, error);
                    materia.classList.add('bloqueada');
                    aplicarEstilos(materia);
                }
            });
        }
        
        // ========== SISTEMA DE HISTORIAL ==========
        
        function guardarEnHistorial() {
            const estadoActual = JSON.parse(JSON.stringify(estadosMaterias));
            historialEstados.push(estadoActual);
            
            if (historialEstados.length > maxHistorial) {
                historialEstados.shift();
            }
            
            actualizarBotonDeshacer();
        }
        
        function actualizarBotonDeshacer() {
            const deshacerBtn = document.getElementById('deshacerBtn');
            if (deshacerBtn) {
                if (historialEstados.length > 0) {
                    deshacerBtn.disabled = false;
                    deshacerBtn.textContent = `Deshacer (${historialEstados.length})`;
                } else {
                    deshacerBtn.disabled = true;
                    deshacerBtn.textContent = 'Deshacer';
                }
            }
        }
        
        function deshacer() {
            if (historialEstados.length === 0) {
                console.log('No hay acciones para deshacer');
                return;
            }
            
            // Restaurar el estado anterior
            const estadoAnterior = historialEstados.pop();
            estadosMaterias = estadoAnterior;
            
            // Aplicar al DOM
            aplicarEstadosAlDOM();
            
            // Actualizar botón
            actualizarBotonDeshacer();
            
            // Guardar automáticamente
            programarGuardadoAutomatico();
            
            mostrarMensajeFlash('Acción deshecha', 'info');
        }

        // ========== GUARDADO AUTOMÁTICO ==========
        
        function programarGuardadoAutomatico() {
            clearTimeout(timeoutGuardado);
            pendienteGuardar = true;
            
            timeoutGuardado = setTimeout(async () => {
                if (pendienteGuardar) {
                    try {
                        const exito = await guardarDatos();
                        if (exito) {
                            console.log('✅ Guardado automático completado');
                            let mensaje = 'Progreso guardado automáticamente';
                            if (modoAlmacenamiento === 'localStorage') {
                                mensaje = 'Progreso guardado localmente';
                            } else if (modoAlmacenamiento === 'github') {
                                mensaje = 'Progreso guardado en GitHub';
                            }
                            mostrarMensajeFlash(mensaje, 'success', 2000);
                        }
                    } catch (error) {
                        console.error('❌ Error en guardado automático:', error);
                        mostrarMensajeFlash('Error en guardado automático', 'error', 3000);
                    }
                    pendienteGuardar = false;
                }
            }, DELAY_GUARDADO);
        }

        // ========== FUNCIONES DE REINICIO ==========
        
        async function reiniciarMaterias() {
            try {
                console.log('Reiniciando todas las materias...');
                
                // Limpiar estados locales
                estadosMaterias = {};
                
                // Aplicar cambios al DOM
                const todasLasMaterias = document.querySelectorAll('.materia');
                todasLasMaterias.forEach(materia => {
                    materia.classList.remove('cursando', 'aprobada');
                    aplicarEstilos(materia);
                });
                
                // Revisar correlatividades y actualizar progreso
                revisarCorrelativas();
                actualizarBarraProgreso();
                
                // Limpiar historial
                historialEstados.length = 0;
                actualizarBotonDeshacer();
                
                // Guardar estado vacío
                await guardarDatos();
                
                console.log('Materias reiniciadas exitosamente');
                return true;
            } catch (error) {
                console.error('Error al reiniciar materias:', error);
                return false;
            }
        }

        // ========== CONFIGURACIÓN DE EVENTOS ==========
        
        function configurarEventListeners() {
            // Event listeners para materias
            const materias = document.querySelectorAll('.materia');
            materias.forEach(materia => {
                materia.addEventListener('click', function() {
                    if (this.classList.contains('bloqueada')) {
                        mostrarMensajeFlash('Esta materia está bloqueada por correlatividades', 'warning');
                        return;
                    }
                    
                    // Guardar estado antes del cambio
                    guardarEnHistorial();
                    
                    const id = this.id;
                    
                    // Inicializar estado si no existe
                    if (!estadosMaterias[id]) {
                        estadosMaterias[id] = { cursando: false, aprobada: false };
                    }
                    
                    // Ciclo de estados: disponible -> cursando -> aprobada -> disponible
                    if (!estadosMaterias[id].cursando && !estadosMaterias[id].aprobada) {
                        // Disponible -> Cursando
                        estadosMaterias[id].cursando = true;
                        estadosMaterias[id].aprobada = false;
                        this.classList.remove('aprobada');
                        this.classList.add('cursando');
                    } else if (estadosMaterias[id].cursando && !estadosMaterias[id].aprobada) {
                        // Cursando -> Aprobada
                        estadosMaterias[id].cursando = false;
                        estadosMaterias[id].aprobada = true;
                        this.classList.remove('cursando');
                        this.classList.add('aprobada');
                    } else {
                        // Aprobada -> Disponible
                        estadosMaterias[id].cursando = false;
                        estadosMaterias[id].aprobada = false;
                        this.classList.remove('cursando', 'aprobada');
                    }
                    
                    // Aplicar estilos y revisar correlatividades
                    aplicarEstilos(this);
                    revisarCorrelativas();
                    actualizarBarraProgreso();
                    
                    // Programar guardado automático
                    programarGuardadoAutomatico();
                });
            });

            // Botón guardar manual
            const guardarBtn = document.getElementById('guardarBtn');
            if (guardarBtn) {
                guardarBtn.addEventListener('click', async function() {
                    this.disabled = true;
                    this.textContent = 'Guardando...';
                    
                    const exito = await guardarDatos();
                    
                    this.disabled = false;
                    this.textContent = 'Guardar progreso';
                });
            }

            // Botón deshacer
            const deshacerBtn = document.getElementById('deshacerBtn');
            if (deshacerBtn) {
                deshacerBtn.addEventListener('click', deshacer);
            }

            // Botón reiniciar
            const reiniciarBtn = document.getElementById('reiniciarBtn');
            if (reiniciarBtn) {
                reiniciarBtn.addEventListener('click', function() {
                    const reinicioModal = new bootstrap.Modal(document.getElementById('reinicioModal'));
                    reinicioModal.show();
                });
            }

            // Botón de confirmación de reinicio
            const confirmarReinicioBtn = document.getElementById('confirmarReinicioBtn');
            if (confirmarReinicioBtn) {
                confirmarReinicioBtn.addEventListener('click', async function() {
                    this.disabled = true;
                    this.textContent = 'Reiniciando...';
                    
                    const exito = await reiniciarMaterias();
                    
                    this.disabled = false;
                    this.textContent = 'Reiniciar materias';
                    
                    // Cerrar modal
                    const reinicioModal = bootstrap.Modal.getInstance(document.getElementById('reinicioModal'));
                    if (reinicioModal) {
                        reinicioModal.hide();
                    }
                    
                    if (exito) {
                        mostrarMensajeFlash('Todas las materias han sido reiniciadas exitosamente', 'success');
                    }
                });
            }
        }

        // ========== FUNCIONES DE UTILIDAD ==========
        
        function mostrarMensajeFlash(mensaje, tipo = 'info', duracion = 4000) {
            // Crear elemento del mensaje
            const mensajeDiv = document.createElement('div');
            mensajeDiv.className = `alert alert-${tipo} alert-dismissible fade show position-fixed`;
            mensajeDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; max-width: 400px;';
            mensajeDiv.innerHTML = `
                ${mensaje}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            `;
            
            // Agregar al DOM
            document.body.appendChild(mensajeDiv);
            
            // Auto-remover después de la duración especificada
            setTimeout(() => {
                if (mensajeDiv.parentNode) {
                    mensajeDiv.remove();
                }
            }, duracion);
        }

        // ========== INICIALIZACIÓN ==========
        
        async function inicializar() {
            console.log('=== INICIANDO APLICACIÓN ===');
            
            // Inicializar estilos
            inicializarMaterias();
            
            // Cargar datos guardados
            await cargarDatos();
            
            // Aplicar estados al DOM
            aplicarEstadosAlDOM();
            
            // Configurar event listeners
            configurarEventListeners();
            
            // Actualizar botón deshacer
            actualizarBotonDeshacer();
            
            console.log('=== APLICACIÓN INICIADA ===');
        }

        // ========== INICIAR APLICACIÓN ==========
        inicializar();
    }
})();
