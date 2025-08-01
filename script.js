// Función que se ejecuta cuando el DOM está listo, incluso si se carga dinámicamente
(function() {
    // Si el DOM ya está listo, ejecutar inmediatamente
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', iniciarApp);
    } else {
        // DOM ya está listo, ejecutar inmediatamente
        iniciarApp();
    }
    
    function iniciarApp() {
    // Configuración
    let estadosMaterias = {};
    const SHEETDB_URL = 'https://sheetdb.io/api/v1/zw9kz4mn56mi2';
    
    // Historial para la función deshacer (hasta 20 movimientos)
    const historialEstados = [];
    const maxHistorial = 20;
    
    // Rastrear qué materias han sido guardadas en Google Sheets
    let materiasEnGoogleSheets = new Set();

    // ========== COLORES ==========
    // Los colores se manejarán completamente por CSS con clases

    // ========== FUNCIONES DE SHEETDB ==========
    
    // Cargar estados desde Google Sheets
    async function cargarDesdeSheet() {
        try {
            console.log('🔄 Cargando desde Google Sheets...');
            const res = await fetch(SHEETDB_URL);
            const rows = await res.json();
            console.log(`📥 Recibidas ${rows.length} filas de Google Sheets`);
            
            // Limpiar estados actuales
            estadosMaterias = {};
            materiasEnGoogleSheets.clear(); // Limpiar el registro de materias en Google Sheets
            
            // Buscar el marcador de reinicio más reciente
            let ultimoReinicioIndex = -1;
            rows.forEach((row, index) => {
                if (row.id_materia === '_REINICIO_' && row.estado === 'reiniciado') {
                    ultimoReinicioIndex = index;
                }
            });
            
            // Si hay un marcador de reinicio, solo procesar filas posteriores a él
            const startIndex = ultimoReinicioIndex >= 0 ? ultimoReinicioIndex + 1 : 0;
            if (ultimoReinicioIndex >= 0) {
                console.log('🔄 Encontrado marcador de reinicio, procesando solo datos posteriores');
            }
            
            // Procesar cada fila de la hoja (solo las posteriores al último reinicio)
            for (let i = startIndex; i < rows.length; i++) {
                const row = rows[i];
                
                if (row.id_materia && row.estado && row.id_materia !== '_REINICIO_') {
                    // Sobrescribir el estado anterior (el último en el array será el final)
                    estadosMaterias[row.id_materia] = {
                        cursando: row.estado === 'cursando',
                        aprobada: row.estado === 'aprobada'
                    };
                    // Registrar que esta materia existe en Google Sheets
                    materiasEnGoogleSheets.add(row.id_materia);
                    console.log(`📝 Registrada ${row.id_materia} como existente en Google Sheets`);
                }
            }
            
            console.log(`✅ Cargadas ${Object.keys(estadosMaterias).length} materias desde Google Sheets`);
            
            // NO aplicar estados aquí - se hará en el orden correcto desde inicializar()
            console.log('Estados cargados correctamente desde Google Sheets');
            
            return true;
        } catch (error) {
            console.error('Error al cargar desde Google Sheets:', error);
            mostrarMensajeFlash('Error al cargar datos desde Google Sheets', 'error');
            return false;
        }
    }

    // Guardar estados en Google Sheets
    async function guardarEnSheet() {
        try {
            console.log('💾 Guardando en Google Sheets...');
            console.log(`📊 ${Object.keys(estadosMaterias).length} materias en memoria`);
            
            // Separar materias en dos grupos: activas y a eliminar
            const updates = []; // Materias con estado activo (cursando/aprobada)
            const toDelete = []; // Materias que volvieron al estado inicial o desaparecieron
            
            // 1. Procesar materias que están en estadosMaterias
            Object.entries(estadosMaterias).forEach(([id, estado]) => {
                if (estado.cursando || estado.aprobada) {
                    // Materia con estado activo - agregar/actualizar
                    let estadoTexto = '';
                    if (estado.aprobada) estadoTexto = 'aprobada';
                    else if (estado.cursando) estadoTexto = 'cursando';
                    
                    updates.push({
                        id_materia: id,
                        nombre: document.getElementById(id)?.textContent || id,
                        estado: estadoTexto
                    });
                    console.log(`📝 ${id}: ${estadoTexto} (será guardado)`);
                } else {
                    // Materia en estado inicial - eliminar de Google Sheets si existía
                    if (materiasEnGoogleSheets.has(id)) {
                        toDelete.push(id);
                        console.log(`🗑️ ${id}: estado inicial (será eliminado de Google Sheets)`);
                    }
                }
            });
            
            // 2. Buscar materias que estaban en Google Sheets pero ya no están en estadosMaterias
            // (esto puede pasar después de usar "Deshacer" y volver al estado original)
            materiasEnGoogleSheets.forEach(id => {
                if (!estadosMaterias.hasOwnProperty(id)) {
                    toDelete.push(id);
                    console.log(`🗑️ ${id}: desapareció tras deshacer (será eliminado de Google Sheets)`);
                }
            });

            console.log(`📤 ${updates.length} materias para guardar, ${toDelete.length} para eliminar`);

            // 1. Primero eliminar materias que volvieron al estado inicial
            if (toDelete.length > 0) {
                console.log('🗑️ Eliminando materias en estado inicial...');
                
                // Primero, obtener datos actuales de Google Sheets para verificar formato
                try {
                    const currentDataResponse = await fetch(SHEETDB_URL);
                    const currentData = await currentDataResponse.json();
                    console.log('📋 Datos actuales en Google Sheets:', currentData.slice(0, 2)); // Solo mostrar primeras 2 filas
                    
                    for (const id of toDelete) {
                        try {
                            // Buscar la fila exacta en los datos actuales
                            const existingRow = currentData.find(row => row.id_materia === id);
                            
                            if (existingRow) {
                                console.log(`🔍 Encontrada fila para ${id}:`, existingRow);
                                
                                // Intentar eliminar usando el formato estándar de SheetDB
                                const deleteResponse = await fetch(`${SHEETDB_URL}/id_materia/${id}`, {
                                    method: 'DELETE'
                                });
                                
                                if (deleteResponse.ok) {
                                    const deleteResult = await deleteResponse.json();
                                    console.log(`✅ ${id}: eliminado de Google Sheets`, deleteResult);
                                    materiasEnGoogleSheets.delete(id);
                                } else {
                                    const errorText = await deleteResponse.text();
                                    console.log(`❌ ${id}: DELETE falló (${deleteResponse.status}):`, errorText);
                                    
                                    // Como alternativa, intentar con POST para sobrescribir con datos vacíos
                                    console.log(`🔄 Intentando método alternativo para ${id}...`);
                                    const overwriteResponse = await fetch(SHEETDB_URL, {
                                        method: 'POST',
                                        headers: { 'Content-Type': 'application/json' },
                                        body: JSON.stringify([{
                                            id_materia: id,
                                            nombre: '',
                                            estado: '_ELIMINADO_'
                                        }])
                                    });
                                    
                                    if (overwriteResponse.ok) {
                                        console.log(`✅ ${id}: marcado como eliminado usando método alternativo`);
                                        materiasEnGoogleSheets.delete(id);
                                    } else {
                                        console.log(`❌ ${id}: método alternativo también falló`);
                                        materiasEnGoogleSheets.delete(id); // Remover del tracking de todas formas
                                    }
                                }
                            } else {
                                console.log(`ℹ️ ${id}: no encontrado en Google Sheets (ya eliminado o nunca existió)`);
                                materiasEnGoogleSheets.delete(id);
                            }
                        } catch (error) {
                            console.log(`⚠️ ${id}: error al eliminar:`, error.message);
                            materiasEnGoogleSheets.delete(id);
                        }
                    }
                } catch (error) {
                    console.error('❌ Error al obtener datos actuales de Google Sheets:', error);
                    // Si no podemos verificar, intentar eliminar de todas formas
                    for (const id of toDelete) {
                        materiasEnGoogleSheets.delete(id);
                    }
                }
            }

            // 2. Luego guardar/actualizar materias con estado activo
            if (updates.length > 0) {
                console.log('💾 Guardando materias con estado activo...');
                const response = await fetch(SHEETDB_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(updates)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('❌ Error al guardar:', errorText);
                    throw new Error(`Error HTTP ${response.status}: ${errorText}`);
                }
                
                // Registrar las materias guardadas exitosamente
                updates.forEach(update => {
                    materiasEnGoogleSheets.add(update.id_materia);
                    console.log(`📝 ${update.id_materia} registrado como guardado en Google Sheets`);
                });
                
                console.log('✅ Materias activas guardadas exitosamente');
            }
            
            // 3. Si no hay materias activas, guardar marcador de reinicio
            if (updates.length === 0 && Object.keys(estadosMaterias).length > 0) {
                console.log('📝 No hay materias activas - guardando marcador de reinicio...');
                const reinicioMarker = [{
                    id_materia: '_REINICIO_',
                    nombre: 'Estado Reiniciado',
                    estado: 'reiniciado',
                    timestamp: new Date().toISOString()
                }];
                
                const response = await fetch(SHEETDB_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(reinicioMarker)
                });
                
                if (!response.ok) {
                    const errorText = await response.text();
                    console.error('Error al guardar marcador de reinicio:', errorText);
                    throw new Error(`Error HTTP ${response.status}: ${errorText}`);
                }
                
                console.log('✅ Marcador de reinicio guardado exitosamente');
            }    
            
            console.log('Datos guardados exitosamente en Google Sheets');
            mostrarMensajeFlash('Progreso guardado en Google Sheets', 'success');
            return true;
        } catch (error) {
            console.error('Error al guardar en Google Sheets:', error);
            mostrarMensajeFlash('Error al guardar en Google Sheets: ' + error.message, 'error');
            return false;
        }
    }

    // Función para reiniciar todas las materias
    async function reiniciarMaterias() {
        try {
            console.log('Reiniciando todas las materias...');
            
            // Limpiar estados locales
            estadosMaterias = {};
            
            // NOTA: No limpiamos Google Sheets porque SheetDB no lo permite
            // Los datos antiguos quedarán en la hoja, pero el estado local se reinicia
            // La próxima vez que se guarde, se agregarán solo los nuevos datos
            console.log('Estados locales reiniciados (Google Sheets no se modifica)');
            
            // Aplicar cambios al DOM
            const todasLasMaterias = document.querySelectorAll('.materia');
            todasLasMaterias.forEach(materia => {
                materia.classList.remove('cursando', 'aprobada');
                aplicarEstilos(materia);
            });
            
            // Revisar correlatividades y actualizar progreso
            revisarCorrelativas();
            actualizarBarraProgreso();
            
            // Limpiar historial y actualizar botón
            historialEstados.length = 0;
            actualizarBotonDeshacer();
            
            console.log('Materias reiniciadas exitosamente');
            mostrarMensajeFlash('Todas las materias han sido reiniciadas', 'success');
            return true;
        } catch (error) {
            console.error('Error al reiniciar materias:', error);
            mostrarMensajeFlash('Error al reiniciar materias: ' + error.message, 'error');
            return false;
        }
    }

    // ========== FUNCIONES DE INTERFAZ ==========
    
    // Aplicar estados cargados al DOM
    function aplicarEstadosAlDOM() {
        console.log('=== APLICANDO ESTADOS AL DOM ===');
        console.log('Estados disponibles:', estadosMaterias);
        
        const todasLasMaterias = document.querySelectorAll('.materia');
        console.log('Materias encontradas en DOM:', todasLasMaterias.length);
        
        todasLasMaterias.forEach(materia => {
            const id = materia.id;
            console.log(`Procesando materia DOM: ${id}`);
            
            // Limpiar clases existentes
            materia.classList.remove('cursando', 'aprobada');
            
            // Aplicar estado guardado
            if (estadosMaterias[id]) {
                console.log(`Estado encontrado para ${id}:`, estadosMaterias[id]);
                if (estadosMaterias[id].cursando) {
                    console.log(`Aplicando clase 'cursando' a ${id}`);
                    materia.classList.add('cursando');
                } else if (estadosMaterias[id].aprobada) {
                    console.log(`Aplicando clase 'aprobada' a ${id}`);
                    materia.classList.add('aprobada');
                } else {
                    console.log(`${id} no tiene estado activo (cursando=false, aprobada=false)`);
                }
            } else {
                console.log(`No hay estado guardado para ${id} - debería quedar con color rosa fuerte`);
                // DEBUG: Verificar qué clases tiene después de limpiar
                console.log(`${id} clases después de limpiar:`, Array.from(materia.classList));
            }
            
            // Aplicar estilos visuales
            aplicarEstilos(materia);
            console.log(`Clases finales de ${id}:`, Array.from(materia.classList));
        });
        
        console.log('=== FIN APLICACIÓN ESTADOS ===');
        
        // Actualizar correlatividades y progreso
        revisarCorrelativas();
        actualizarBarraProgreso();
    }

    // Aplicar estilos - SOLO limpiar estilos inline, el CSS maneja todo
    function aplicarEstilos(materia) {
        console.log(`Aplicando estilos a ${materia.id}, clases:`, Array.from(materia.classList));
        
        // Limpiar TODOS los estilos inline para que el CSS tome control completo
        materia.style.backgroundColor = '';
        materia.style.color = '';
        materia.style.textDecoration = '';
        materia.style.textDecorationThickness = '';
        materia.style.opacity = '';
        materia.style.cursor = '';
        materia.style.border = '';
        materia.style.boxShadow = '';
        
        // El CSS maneja todos los colores y cursores según las clases
        console.log(`${materia.id}: Estilos limpiados - CSS maneja todo según clases`);
        console.log(`${materia.id}: Clases finales:`, Array.from(materia.classList));
    }

    // Inicializar estilos de todas las materias
    function inicializarMaterias() {
        const todasLasMaterias = document.querySelectorAll('.materia');
        todasLasMaterias.forEach(materia => {
            // Limpiar estilos inline para que el CSS tome control
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
        });
    }

    // NOTA: Las funciones configurarEventListeners, guardarEnHistorial y revisarCorrelativas
    // están implementadas más abajo en la sección correcta del código

    // ========== BARRA DE PROGRESO ==========
    
    function actualizarBarraProgreso() {
        console.log('=== ACTUALIZANDO BARRA DE PROGRESO ===');
        const todasLasMaterias = document.querySelectorAll('.materia');
        
        // Definir materias anuales que aparecen duplicadas
        const materiasAnuales = {
            'ingles': ['ingles', 'ingles-2']  // Inglés aparece como 'ingles' e 'ingles-2'
        };
        
        let materiasAprobadas = 0;
        let materiasCursando = 0;
        let materiasContadas = new Set(); // Para evitar contar duplicados
        
        // Calcular total real de materias (descontando duplicados anuales)
        let totalMateriasReales = todasLasMaterias.length;
        Object.values(materiasAnuales).forEach(grupo => {
            totalMateriasReales -= (grupo.length - 1); // Restar duplicados
        });

        console.log(`Total de materias en DOM: ${todasLasMaterias.length}`);
        console.log(`Total de materias reales (sin duplicados anuales): ${totalMateriasReales}`);
        console.log('Estados actuales:', estadosMaterias);

        todasLasMaterias.forEach(materia => {
            const id = materia.id;
            console.log(`Revisando materia ${id}:`, estadosMaterias[id]);
            
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
                    console.log(`${id}: Es materia anual (${nombreMateria}), verificando grupo completo:`, grupoAnual);
                    
                    // Verificar estado de todas las partes de la materia anual
                    const todasAprobadas = grupoAnual.every(idParte => 
                        estadosMaterias[idParte] && estadosMaterias[idParte].aprobada
                    );
                    
                    const algunaCursando = grupoAnual.some(idParte => 
                        estadosMaterias[idParte] && estadosMaterias[idParte].cursando
                    );
                    
                    if (todasAprobadas) {
                        materiasAprobadas++;
                        console.log(`${nombreMateria}: ANUAL APROBADA (todas las partes aprobadas) - total: ${materiasAprobadas}`);
                    } else if (algunaCursando) {
                        materiasCursando++;
                        console.log(`${nombreMateria}: ANUAL CURSANDO (alguna parte cursando) - total: ${materiasCursando}`);
                    } else {
                        console.log(`${nombreMateria}: ANUAL sin estado activo`);
                    }
                    
                    materiasContadas.add(nombreMateria);
                } else {
                    console.log(`${id}: Parte de materia anual ya contada (${nombreMateria})`);
                }
            } else {
                // Para materias normales (no anuales)
                if (estadosMaterias[id]) {
                    if (estadosMaterias[id].aprobada) {
                        materiasAprobadas++;
                        console.log(`${id}: APROBADA (total aprobadas: ${materiasAprobadas})`);
                    } else if (estadosMaterias[id].cursando) {
                        materiasCursando++;
                        console.log(`${id}: CURSANDO (total cursando: ${materiasCursando})`);
                    } else {
                        console.log(`${id}: Sin estado activo (cursando=false, aprobada=false)`);
                    }
                } else {
                    console.log(`${id}: No tiene estado guardado`);
                }
            }
        });
        
        // Usar el total real de materias para los cálculos
        const totalMaterias = totalMateriasReales;

        const porcentajeAprobadas = (materiasAprobadas / totalMaterias) * 100;
        const porcentajeCursando = (materiasCursando / totalMaterias) * 100;

        console.log(`RESULTADO: ${materiasAprobadas} aprobadas, ${materiasCursando} cursando de ${totalMaterias} materias`);
        console.log(`PORCENTAJES: ${porcentajeAprobadas.toFixed(1)}% aprobadas, ${porcentajeCursando.toFixed(1)}% cursando`);

        // Actualizar barra de progreso existente (solo materias aprobadas)
        const barraInterna = document.querySelector('.progress-bar-inner');
        const porcentajeElemento = document.querySelector('.progress-percentage');
        const materiasAprobadasElemento = document.querySelector('.materias-aprobadas');
        const totalMateriasElemento = document.querySelector('.total-materias');

        // Solo contar materias aprobadas para el porcentaje principal
        const porcentajePrincipal = (materiasAprobadas / totalMaterias) * 100;

        if (barraInterna) {
            barraInterna.style.width = porcentajePrincipal + '%';
            console.log(`Barra principal actualizada a: ${porcentajePrincipal.toFixed(1)}%`);
        } else {
            console.log('Elemento .progress-bar-inner no encontrado');
        }
        
        if (porcentajeElemento) {
            porcentajeElemento.textContent = porcentajePrincipal.toFixed(0) + '%';
            console.log(`Porcentaje principal actualizado: ${porcentajePrincipal.toFixed(0)}%`);
        } else {
            console.log('Elemento .progress-percentage no encontrado');
        }
        
        if (materiasAprobadasElemento) {
            materiasAprobadasElemento.textContent = materiasAprobadas;
            console.log(`Materias aprobadas actualizado: ${materiasAprobadas}`);
        } else {
            console.log('Elemento .materias-aprobadas no encontrado');
        }
        
        if (totalMateriasElemento) {
            totalMateriasElemento.textContent = totalMaterias;
            console.log(`Total materias actualizado: ${totalMaterias}`);
        } else {
            console.log('Elemento .total-materias no encontrado');
        }
        
        console.log('=== FIN ACTUALIZACIÓN BARRA DE PROGRESO ===');
    }

    // ========== SISTEMA DE CORRELATIVIDADES ==========
    
    // Revisar y actualizar el estado de las correlatividades
    function revisarCorrelativas() {
        console.log('=== INICIANDO REVISIÓN CORRELATIVIDADES ===');
        console.log('Estados actuales en estadosMaterias:', estadosMaterias);
        
        const materias = document.querySelectorAll('.materia');
        console.log(`Total de materias encontradas: ${materias.length}`);
        
        materias.forEach(materia => {
            const id = materia.id;
            const correlativasData = materia.getAttribute('data-correlativas');
            
            console.log(`\n--- PROCESANDO MATERIA: ${id} ---`);
            console.log(`${id}: Clases actuales:`, Array.from(materia.classList));
            console.log(`${id}: Correlatividades:`, correlativasData);
            
            // Si no tiene correlatividades, no hacer nada
            if (!correlativasData) {
                console.log(`${id}: Sin correlatividades - SALTANDO`);
                return;
            }
            
            try {
                const correlativas = JSON.parse(correlativasData);
                let puedeHabilitarse = true;
                let razonBloqueo = [];
                
                // Verificar cada correlativa
                for (const correlativa of correlativas) {
                    const idCorrelativa = correlativa.id;
                    const estadoRequerido = correlativa.estado; // "cursando" o "aprobada"
                    
                    const estadoActual = estadosMaterias[idCorrelativa];
                    
                    if (!estadoActual) {
                        // La correlativa no está ni cursando ni aprobada
                        puedeHabilitarse = false;
                        razonBloqueo.push(`${idCorrelativa}: necesita estar ${estadoRequerido}`);
                        continue;
                    }
                    
                    // Verificar si cumple el estado requerido
                    if (estadoRequerido === 'cursando') {
                        // Para "cursando", acepta tanto cursando como aprobada
                        if (!estadoActual.cursando && !estadoActual.aprobada) {
                            puedeHabilitarse = false;
                            razonBloqueo.push(`${idCorrelativa}: debe estar cursando o aprobada`);
                        }
                    } else if (estadoRequerido === 'aprobada') {
                        // Para "aprobada", solo acepta aprobada
                        if (!estadoActual.aprobada) {
                            puedeHabilitarse = false;
                            razonBloqueo.push(`${idCorrelativa}: debe estar aprobada`);
                        }
                    }
                }
                
                // Aplicar el resultado - Solo clases CSS
                if (puedeHabilitarse) {
                    // MATERIA HABILITADA
                    materia.classList.remove('bloqueada');
                    
                    // LIMPIEZA AGRESIVA: Si la materia no tiene un estado guardado específico,
                    // limpiar TODAS las clases excepto las básicas para que muestre rosa fuerte
                    console.log(`\n=== PROCESANDO MATERIA HABILITADA: ${id} ===`);
                    console.log(`${id}: Clases ANTES de limpiar:`, Array.from(materia.classList));
                    console.log(`${id}: Estado en estadosMaterias:`, estadosMaterias[id]);
                    
                    if (!estadosMaterias[id] || (!estadosMaterias[id].cursando && !estadosMaterias[id].aprobada)) {
                        // Remover cualquier clase de estado
                        console.log(`${id}: REMOVIENDO clases cursando y aprobada...`);
                        materia.classList.remove('cursando', 'aprobada');
                        
                        // DEBUG: Verificar clases después de limpiar
                        console.log(`${id}: Clases DESPUÉS de limpiar:`, Array.from(materia.classList));
                        
                        // Verificar color computado
                        const computedStyle = window.getComputedStyle(materia);
                        console.log(`${id}: Color de fondo computado:`, computedStyle.backgroundColor);
                        console.log(`${id}: Color de texto computado:`, computedStyle.color);
                        
                        console.log(`${id}: *** DEBERÍA MOSTRAR ROSA FUERTE ***`);
                    } else {
                        console.log(`${id}: MANTIENE estado guardado:`, estadosMaterias[id]);
                    }
                    console.log(`=== FIN PROCESAMIENTO ${id} ===\n`);
                    
                    console.log(`${id}: Correlativas cumplidas - HABILITADA`);
                } else {
                    // MATERIA BLOQUEADA
                    materia.classList.add('bloqueada');
                    console.log(`${id}: Correlativas NO cumplidas - BLOQUEADA`);
                    console.log(`  Razones: ${razonBloqueo.join(', ')}`);
                }
                
                // Aplicar estilos después de cambiar las clases
                aplicarEstilos(materia);
                
            } catch (error) {
                console.error(`Error al procesar correlativas de ${id}:`, error);
                // En caso de error, mantener bloqueada por seguridad
                materia.classList.add('bloqueada');
                aplicarEstilos(materia);
            }
        });
        
        console.log('=== FIN REVISIÓN CORRELATIVIDADES ===');
        
        // DEBUG: Mostrar clases finales de todas las materias habilitadas
        console.log('=== DEBUG: CLASES FINALES DE MATERIAS ===');
        const materiasParaDebug = document.querySelectorAll('.materia');
        materiasParaDebug.forEach(materia => {
            if (!materia.classList.contains('bloqueada')) {
                console.log(`${materia.id}: clases = [${Array.from(materia.classList).join(', ')}]`);
            }
        });
        console.log('=== FIN DEBUG ===');
    }
    
    // ========== SISTEMA DE HISTORIAL ==========
    
    // Guardar estado actual en historial antes de hacer cambios
    function guardarEnHistorial() {
        console.log('Guardando estado en historial...');
        
        // Crear una copia profunda del estado actual
        const estadoActual = JSON.parse(JSON.stringify(estadosMaterias));
        
        // Agregar al historial
        historialEstados.push(estadoActual);
        
        // Limitar el historial al máximo permitido
        if (historialEstados.length > maxHistorial) {
            historialEstados.shift(); // Remover el más antiguo
        }
        
        console.log(`Estado guardado en historial. Total: ${historialEstados.length}/${maxHistorial}`);
        
        // Actualizar botón deshacer
        actualizarBotonDeshacer();
    }
    
    // Actualizar estado del botón deshacer
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
    
    // Función deshacer corregida
    function deshacer() {
        console.log('=== DESHACIENDO ACCIÓN ===');
        
        if (historialEstados.length === 0) {
            mostrarMensajeFlash('No hay acciones para deshacer', 'info');
            return;
        }

        // Restaurar el último estado guardado
        const estadoAnterior = historialEstados.pop();
        estadosMaterias = JSON.parse(JSON.stringify(estadoAnterior));
        
        console.log('Estado restaurado:', estadosMaterias);
        console.log(`Estados restantes en historial: ${historialEstados.length}`);

        // Aplicar el estado restaurado al DOM
        aplicarEstadosAlDOM();
        
        // Actualizar botón deshacer
        actualizarBotonDeshacer();
        
        // NO guardar automáticamente en Google Sheets al deshacer
        // El usuario debe usar "Guardar progreso" manualmente si quiere persistir
        
        mostrarMensajeFlash('Acción deshecha', 'success');
        console.log('=== FIN DESHACER ===');
    }
    
    // ========== CONFIGURAR CLICKS EN MATERIAS ==========
    
    // Configurar clicks en materias
    function configurarEventListeners() {
        console.log('Configurando event listeners para materias...');
        const todasLasMaterias = document.querySelectorAll('.materia');
        console.log(`🔧 Encontradas ${todasLasMaterias.length} materias para configurar event listeners`);
        
        todasLasMaterias.forEach((materia, index) => {
            console.log(`🔧 Configurando listener para materia ${index + 1}: ${materia.id}`);
            materia.addEventListener('click', function () {
                console.log(`🖱️ CLICK DETECTADO en materia: ${this.id}`);
                console.log(`📊 Clases actuales de ${this.id}:`, Array.from(this.classList));
                
                // Verificar si la materia está bloqueada
                if (this.classList.contains('bloqueada')) {
                    console.log(`⚠️ ${this.id} tiene clase 'bloqueada', verificando si se permite el click...`);
                    // Para materias optativas: solo permitir click si tienen correlativas definidas
                    if (this.id.includes('optativa')) {
                        const correlativasData = this.getAttribute('data-correlativas');
                        if (!correlativasData) {
                            console.log(`${this.id} es optativa sin correlativas definidas, ignorando click`);
                            mostrarMensajeFlash('Esta materia optativa aún no tiene correlativas definidas', 'info');
                            return;
                        }
                        console.log(`${this.id} es optativa con correlativas, permitiendo click`);
                    } else {
                        // Para materias regulares: no permitir click si están bloqueadas
                        console.log(`${this.id} está bloqueada por correlativas, ignorando click`);
                        return;
                    }
                }

                // Guardar estado actual en historial antes de hacer cambios
                guardarEnHistorial();

                const id = this.id;
                
                // Inicializar estado si no existe
                if (!estadosMaterias[id]) {
                    estadosMaterias[id] = { cursando: false, aprobada: false };
                }
                
                const estado = estadosMaterias[id];
                console.log(`🖱️ CLICK DETECTADO en materia: ${id}`);
                console.log(`📊 Estado actual de ${id}:`, estado);
                
                // Ciclar estados: bloqueada -> cursando -> aprobada -> bloqueada
                if (!estado.cursando && !estado.aprobada) {
                    // De bloqueada a cursando
                    estado.cursando = true;
                    estado.aprobada = false;
                    console.log(`🟡 ${id}: bloqueada → cursando`);
                } else if (estado.cursando && !estado.aprobada) {
                    // De cursando a aprobada
                    estado.cursando = false;
                    estado.aprobada = true;
                    console.log(`🟢 ${id}: cursando → aprobada`);
                } else {
                    // De aprobada a bloqueada
                    estado.cursando = false;
                    estado.aprobada = false;
                    console.log(`⚪ ${id}: aprobada → bloqueada`);
                }
                
                console.log(`📊 Nuevo estado de ${id}:`, estado);
                
                // Actualizar clases CSS
                this.classList.remove('cursando', 'aprobada');
                if (estado.cursando) this.classList.add('cursando');
                if (estado.aprobada) this.classList.add('aprobada');
                console.log(`🎨 Clases CSS actualizadas para ${id}:`, Array.from(this.classList));
                
                // Aplicar estilos
                aplicarEstilos(this);
                
                // Revisar correlatividades y actualizar barra
                revisarCorrelativas();
                actualizarBarraProgreso();
                
                // Guardar automáticamente
                console.log(`💾 INICIANDO GUARDADO AUTOMÁTICO para ${id}...`);
                guardarEnSheet().then(exito => {
                    if (exito) {
                        console.log(`✅ ${id}: Guardado automático EXITOSO`);
                    } else {
                        console.error(`❌ ${id}: Guardado automático FALLÓ`);
                    }
                }).catch(error => {
                    console.error(`❌ ${id}: Error en guardado automático:`, error);
                });
            });
        });
        
        console.log(`Event listeners configurados para ${todasLasMaterias.length} materias`);
    }
    
    function mostrarMensajeFlash(mensaje, tipo = 'success', duracion = 3000) {
        // Usar el elemento flashMessage existente en el HTML
        const flashMessage = document.getElementById('flashMessage');
        if (!flashMessage) {
            console.error('Elemento #flashMessage no encontrado');
            return;
        }
        
        // Limpiar clases anteriores
        flashMessage.className = 'flash-message';
        
        // Aplicar clase según el tipo
        if (tipo === 'success') {
            flashMessage.classList.add('flash-success');
        } else if (tipo === 'error') {
            flashMessage.classList.add('flash-error');
        } else if (tipo === 'info') {
            flashMessage.classList.add('flash-info');
        }
        
        // Establecer el mensaje y mostrar
        flashMessage.textContent = mensaje;
        flashMessage.style.display = 'block';
        
        // Ocultar después de la duración especificada
        setTimeout(() => {
            flashMessage.style.display = 'none';
        }, duracion);
    }

    // ========== INICIALIZACIÓN ==========
    
    async function inicializar() {
        console.log('Inicializando aplicación...');
        
        // Inicializar estilos
        inicializarMaterias();
        
        // Configurar event listeners
        configurarEventListeners();
        
        // Cargar datos desde Google Sheets
        const cargaExitosa = await cargarDesdeSheet();
        
        if (cargaExitosa) {
            mostrarMensajeFlash('Datos cargados desde Google Sheets', 'success');
        } else {
            mostrarMensajeFlash('Iniciando con estado vacío', 'info');
        }
        
        // ORDEN CORRECTO DE APLICACIÓN:
        // 1. Aplicar estados guardados al DOM
        aplicarEstadosAlDOM();
        
        // 2. Revisar correlatividades (esto limpiará clases incorrectas en materias habilitadas)
        revisarCorrelativas();
        
        // 3. Actualizar barra de progreso
        actualizarBarraProgreso();
        
        // Inicializar botón deshacer
        actualizarBotonDeshacer();
        
        console.log('Aplicación inicializada correctamente');
    }

    // ========== CONFIGURAR BOTONES ==========
    
    // Botón de deshacer
    const deshacerBtn = document.getElementById('deshacerBtn');
    if (deshacerBtn) {
        deshacerBtn.addEventListener('click', deshacer);
    }

    // Botón de guardar (manual)
    const guardarBtn = document.getElementById('guardarBtn');
    if (guardarBtn) {
        guardarBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.textContent = 'Guardando...';
            
            const exito = await guardarEnSheet();
            
            this.disabled = false;
            this.textContent = 'Guardar progreso';
            
            if (exito) {
                mostrarMensajeFlash('Progreso guardado exitosamente', 'success');
            }
        });
    }

    // Botón de cargar (manual)
    const cargarBtn = document.getElementById('cargarBtn');
    if (cargarBtn) {
        cargarBtn.addEventListener('click', async function() {
            this.disabled = true;
            this.textContent = 'Cargando...';
            
            const exito = await cargarDesdeSheet();
            
            this.disabled = false;
            this.textContent = 'Cargar progreso';
            
            if (exito) {
                mostrarMensajeFlash('Progreso cargado exitosamente', 'success');
            }
        });
    }

    // Botón de reiniciar materias (abre modal de confirmación)
    const reiniciarBtn = document.getElementById('reiniciarBtn');
    if (reiniciarBtn) {
        reiniciarBtn.addEventListener('click', function() {
            // Mostrar modal de confirmación usando Bootstrap
            const reinicioModal = new bootstrap.Modal(document.getElementById('reinicioModal'));
            reinicioModal.show();
        });
    }

    // Botón de confirmación de reinicio (en el modal)
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

    // ========== INICIAR APLICACIÓN ==========
    inicializar();
    }
})();
