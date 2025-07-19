document.addEventListener('DOMContentLoaded', function () {
    // Objeto para almacenar el estado de las materias
    let estadosMaterias = {};
    
    // Historial para la función deshacer (hasta 20 movimientos)
    const historialEstados = [];
    const maxHistorial = 20;
    
    // Definir colores para las materias (mover al inicio para evitar errores de referencia)
    // Colores para las materias habilitadas (como las de primer año)
    const colorFondoHabilitado = '#ffc0cb';
    const colorTextoHabilitado = '#a5374e';
    
    // Colores para las materias cursando
    const colorFondoCursando = '#ffe4e1';
    const colorTextoCursando = '#a5374e';
    
    // Colores para las materias aprobadas
    const colorFondoAprobada = '#ffe4e1';
    const colorTextoAprobada = '#9e737b';
    
    // Función para establecer una cookie
    function setCookie(name, value, days) {
        let expires = "";
        if (days) {
            const date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + encodeURIComponent(value) + expires + "; path=/";
    }
    
    // Función para obtener una cookie
    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return decodeURIComponent(c.substring(nameEQ.length, c.length));
        }
        return null;
    }
    
    // Función para cargar estados guardados
    function cargarEstadosGuardados() {
        try {
            let estadosCargados = false;
            
            // Paso 1: Intentar cargar desde localStorage
            try {
                const estadosGuardadosLS = localStorage.getItem('estadosMaterias');
                if (estadosGuardadosLS) {
                    estadosMaterias = JSON.parse(estadosGuardadosLS);
                    console.log('Estados cargados desde localStorage:', estadosMaterias);
                    estadosCargados = true;
                }
            } catch (errorLS) {
                console.warn('Error al cargar desde localStorage:', errorLS);
            }
            
            // Paso 2: Si no se cargaron estados desde localStorage, verificar cookies
            if (!estadosCargados) {
                const cookieGuardada = getCookie('estadosMaterias_guardado');
                if (cookieGuardada === 'true') {
                    console.log('Se detectó que hay estados guardados en cookies, pero no se pudieron recuperar completamente.');
                    // Aquí podríamos mostrar un mensaje al usuario para que use el botón de cargar
                }
            }
            
            // Aplicar los estados guardados a las materias
            const todasLasMaterias = document.querySelectorAll('.materia');
            todasLasMaterias.forEach(materia => {
                const id = materia.id;
                if (estadosMaterias[id]) {
                    // Eliminar clases existentes
                    materia.classList.remove('cursando', 'aprobada');
                    
                    // Aplicar clases según el estado guardado
                    if (estadosMaterias[id].cursando) {
                        materia.classList.add('cursando');
                    } else if (estadosMaterias[id].aprobada) {
                        materia.classList.add('aprobada');
                    }
                    
                    // Aplicar estilos
                    aplicarEstilos(materia);
                }
            });
            
            // Actualizar la barra de progreso
            actualizarBarraProgreso();
        } catch (error) {
            console.error('Error al cargar los estados guardados:', error);
            // Si hay un error, inicializar con un objeto vacío
            estadosMaterias = {};
        }
    }
    
    // Función para guardar estados
    function guardarEstados() {
        try {
            // Actualizar el objeto de estados con los valores actuales
            const todasLasMaterias = document.querySelectorAll('.materia');
            todasLasMaterias.forEach(materia => {
                const id = materia.id;
                estadosMaterias[id] = {
                    cursando: materia.classList.contains('cursando'),
                    aprobada: materia.classList.contains('aprobada')
                };
            });
            
            // Convertir a JSON
            const estadosJSON = JSON.stringify(estadosMaterias);
            
            // Guardar en localStorage
            localStorage.setItem('estadosMaterias', estadosJSON);
            
            // Guardar en cookies como respaldo (fragmentado si es necesario)
            try {
                // Las cookies tienen un límite de tamaño, así que guardamos solo un indicador
                setCookie('estadosMaterias_guardado', 'true', 365);
                // Y la fecha de la última actualización
                setCookie('estadosMaterias_timestamp', new Date().toISOString(), 365);
            } catch (cookieError) {
                console.warn('No se pudo guardar en cookies:', cookieError);
            }
            
            console.log('Estados guardados en localStorage y cookies:', estadosMaterias);
            
            return true;
        } catch (error) {
            console.error('Error al guardar los estados:', error);
            return false;
        }
    }

    // Cargar estados guardados al iniciar
    cargarEstadosGuardados();

    const todasLasMaterias = document.querySelectorAll('.materia');
    
    // Inicializar el estado de las materias si no se cargaron del localStorage
    if (Object.keys(estadosMaterias).length === 0) {
        todasLasMaterias.forEach(materia => {
            estadosMaterias[materia.id] = {
                cursando: materia.classList.contains('cursando'),
                aprobada: materia.classList.contains('aprobada')
            };
        });
    }

    // Función para aplicar estilos según el estado de la materia
    function aplicarEstilos(materia) {
        // Limpiar estilos anteriores
        materia.style.backgroundColor = '';
        materia.style.color = '';
        materia.style.textDecoration = '';
        materia.style.textDecorationThickness = '';
        
        // Aplicar estilos según el estado
        if (materia.classList.contains('bloqueada')) {
            // Aplicar estilo gris para materias bloqueadas
            materia.style.backgroundColor = '#e0e0e0';
            materia.style.color = '#555555';
            return;
        } else if (materia.classList.contains('cursando')) {
            // Estilo para materias cursando
            materia.style.backgroundColor = colorFondoCursando;
            materia.style.color = colorTextoCursando;
        } else if (materia.classList.contains('aprobada')) {
            // Estilo para materias aprobadas
            materia.style.backgroundColor = colorFondoAprobada;
            materia.style.color = colorTextoAprobada;
            materia.style.textDecoration = 'line-through';
            materia.style.textDecorationThickness = '2px';
        } else {
            // Estilo para materias habilitadas (no cursando ni aprobadas)
            materia.style.backgroundColor = colorFondoHabilitado;
            materia.style.color = colorTextoHabilitado;
        }
    }

    // Función para inicializar las materias
    function inicializarMaterias() {
        // Primero, marcar todas las materias como bloqueadas excepto las del primer año primer cuatrimestre
        todasLasMaterias.forEach(materia => {
            // Verificar si es materia del primer año primer cuatrimestre
            const esPrimerAnioPrimerCuatrimestre = [
                'algebra-1',
                'calculo-1',
                'matematica-computacion-1',
                'ingles',
                'seminario',
                'ingles-2'
            ].includes(materia.id);
            
            // Si no es del primer año primer cuatrimestre y no tiene estado guardado, marcarla como bloqueada
            if (!esPrimerAnioPrimerCuatrimestre && 
                !(estadosMaterias[materia.id] && 
                  (estadosMaterias[materia.id].cursando || estadosMaterias[materia.id].aprobada))) {
                
                // No bloquear si ya tiene la clase bloqueada (como matemática discreta y álgebra 2)
                if (!materia.classList.contains('bloqueada')) {
                    materia.classList.add('bloqueada');
                }
            }
            
            // Aplicar estilos según el estado
            aplicarEstilos(materia);
        });
    }
    
    // Aplicar estilos iniciales a todas las materias
    inicializarMaterias();

    // Función para guardar el estado actual en el historial
    function guardarEnHistorial() {
        // Crear una copia profunda del estado actual
        const estadoActual = JSON.parse(JSON.stringify(estadosMaterias));
        
        // Añadir al historial
        historialEstados.push(estadoActual);
        
        // Limitar el tamaño del historial
        if (historialEstados.length > maxHistorial) {
            historialEstados.shift(); // Eliminar el estado más antiguo
        }
        
        // Habilitar el botón de deshacer
        document.getElementById('deshacerBtn').disabled = false;
    }
    
    todasLasMaterias.forEach(materia => {
        materia.addEventListener('click', function () {
            // Verificar si la materia está bloqueada
            if (this.classList.contains('bloqueada')) {
                // No permitir cambios de estado en materias bloqueadas
                return;
            }

            const estaAprobada = this.classList.contains('aprobada');
            const estaCursando = this.classList.contains('cursando');
            
            // Guardar el estado actual en el historial antes de modificarlo
            guardarEnHistorial();

            if (!estaCursando && !estaAprobada) {
                this.classList.add('cursando');
                // Actualizar el estado guardado
                estadosMaterias[this.id] = { cursando: true, aprobada: false };
                // Ya no guardamos automáticamente
                // guardarEstados();
            } else if (estaCursando) {
                this.classList.remove('cursando');
                this.classList.add('aprobada');
                // Actualizar el estado guardado
                estadosMaterias[this.id] = { cursando: false, aprobada: true };
                // Ya no guardamos automáticamente
                // guardarEstados();
            } else if (estaAprobada) {
                this.classList.remove('aprobada');
                // Actualizar el estado guardado
                estadosMaterias[this.id] = { cursando: false, aprobada: false };
                // Ya no guardamos automáticamente
                // guardarEstados();
            }
            
            // Aplicar estilos según el nuevo estado
            aplicarEstilos(this);

            revisarCorrelativas();
            
            // Actualizar la barra de progreso después de cambiar el estado
            setTimeout(actualizarBarraProgreso, 100);
        });
    });

    function revisarCorrelativas() {
        const materias = document.querySelectorAll('.materia');
        
        // Restaurar estados guardados primero
        for (const id in estadosMaterias) {
            const materia = document.getElementById(id);
            if (!materia) continue;
            
            // Si la materia estaba cursando o aprobada, restauramos ese estado
            if (estadosMaterias[id].cursando) {
                materia.classList.remove('bloqueada');
                materia.classList.add('cursando');
                materia.classList.remove('aprobada');
                aplicarEstilos(materia);
            } else if (estadosMaterias[id].aprobada) {
                materia.classList.remove('bloqueada');
                materia.classList.remove('cursando');
                materia.classList.add('aprobada');
                aplicarEstilos(materia);
            }
        }
        
        // Caso especial para Cálculo 2
        const algebra1 = document.getElementById('algebra-1');
        const calculo1 = document.getElementById('calculo-1');
        const calculo2 = document.getElementById('calculo-2');
        
        if (calculo2 && algebra1 && calculo1) {
            // Si ya está cursando o aprobada, no la bloqueamos
            if (estadosMaterias[calculo2.id] && (estadosMaterias[calculo2.id].cursando || estadosMaterias[calculo2.id].aprobada)) {
                // No hacer nada, mantener el estado actual
            } else {
                // Verificar si ambas materias están cursando o aprobadas
                const algebra1Habilitante = algebra1.classList.contains('cursando') || algebra1.classList.contains('aprobada');
                const calculo1Habilitante = calculo1.classList.contains('cursando') || calculo1.classList.contains('aprobada');
                
                if (algebra1Habilitante && calculo1Habilitante) {
                    // Habilitar Cálculo 2
                    const estabaBloqueada = calculo2.classList.contains('bloqueada');
                    calculo2.classList.remove('bloqueada');
                    
                    // Aplicar estilos
                    aplicarEstilos(calculo2);
                    
                    // Añadir un efecto visual si recién se habilitó
                    if (estabaBloqueada) {
                        calculo2.style.transition = 'all 0.5s';
                        calculo2.style.boxShadow = '0 0 10px rgba(165, 55, 78, 0.7)';
                        setTimeout(() => {
                            calculo2.style.boxShadow = '';
                        }, 1000);
                    }
                } else {
                    calculo2.classList.add('bloqueada');
                }
            }
        }

        // Procesar todas las materias con correlatividades
        materias.forEach(materia => {
            // Si ya está cursando o aprobada, no la bloqueamos
            if (estadosMaterias[materia.id] && (estadosMaterias[materia.id].cursando || estadosMaterias[materia.id].aprobada)) {
                return;
            }
            
            const requisitosStr = materia.getAttribute('data-correlativas');
            
            // Si no tiene correlatividades definidas y no es del primer año primer cuatrimestre,
            // mantenerla bloqueada (esto afecta a las materias optativas)
            if (!requisitosStr) {
                // Verificar si es materia del primer año primer cuatrimestre
                const esPrimerAnioPrimerCuatrimestre = [
                    'algebra-1',
                    'calculo-1',
                    'matematica-computacion-1',
                    'ingles',
                    'seminario',
                    'ingles-2'
                ].includes(materia.id);
                
                // Si no es del primer año primer cuatrimestre, mantenerla bloqueada
                if (!esPrimerAnioPrimerCuatrimestre) {
                    materia.classList.add('bloqueada');
                    aplicarEstilos(materia);
                }
                return;
            }

            let requisitos;
            try {
                requisitos = JSON.parse(requisitosStr);
            } catch (e) {
                console.error(`Error al parsear requisitos de ${materia.id}`, e);
                return;
            }

            // Agrupar por materia base
            const grupos = {};
            requisitos.forEach(req => {
                if (!grupos[req.id]) grupos[req.id] = [];
                grupos[req.id].push(req.estado);
            });

            const cumpleTodos = Object.entries(grupos).every(([id, estados]) => {
                const materiaRequerida = document.getElementById(id);
                return materiaRequerida && estados.some(estado => materiaRequerida.classList.contains(estado));
            });

            const estabaBloqueada = materia.classList.contains('bloqueada');
            
            if (cumpleTodos) {
                materia.classList.remove('bloqueada');
                // Aplicar estilos si la materia acaba de desbloquearse
                // Aplicar estilos según el nuevo estado
                aplicarEstilos(materia);
                
                // Efecto visual para destacar que se ha habilitado
                if (estabaBloqueada) {
                    materia.style.transition = 'all 0.5s';
                    materia.style.boxShadow = '0 0 10px rgba(165, 55, 78, 0.7)';
                    setTimeout(() => {
                        materia.style.boxShadow = '';
                    }, 1000);
                }
            } else {
                materia.classList.add('bloqueada');
                aplicarEstilos(materia);
            }
        });
    }

    // Función para mezclar dos colores hex con un factor de mezcla
    function mezclarColores(color1, color2, factor) {
        // Convertir colores hex a RGB
        const r1 = parseInt(color1.substring(1, 3), 16);
        const g1 = parseInt(color1.substring(3, 5), 16);
        const b1 = parseInt(color1.substring(5, 7), 16);
        
        const r2 = parseInt(color2.substring(1, 3), 16);
        const g2 = parseInt(color2.substring(3, 5), 16);
        const b2 = parseInt(color2.substring(5, 7), 16);
        
        // Interpolar entre los dos colores
        const r = Math.round(r1 + factor * (r2 - r1));
        const g = Math.round(g1 + factor * (g2 - g1));
        const b = Math.round(b1 + factor * (b2 - b1));
        
        // Convertir de nuevo a hex
        return `#${(r).toString(16).padStart(2, '0')}${(g).toString(16).padStart(2, '0')}${(b).toString(16).padStart(2, '0')}`;
    }
    
    // Función para actualizar la barra de progreso
    function actualizarBarraProgreso() {
        // Obtener todas las materias excepto la segunda instancia de Inglés
        const todasLasMaterias = Array.from(document.querySelectorAll('.materia')).filter(materia => {
            // Excluir la segunda instancia de Inglés (ingles-2) del conteo total
            return materia.id !== 'ingles-2';
        });
        
        // Contar materias aprobadas, excluyendo la segunda instancia de Inglés
        const materiasAprobadas = Array.from(document.querySelectorAll('.materia.aprobada')).filter(materia => {
            return materia.id !== 'ingles-2';
        });
        
        const totalMaterias = todasLasMaterias.length;
        const totalAprobadas = materiasAprobadas.length;
        const porcentaje = totalMaterias > 0 ? Math.round((totalAprobadas / totalMaterias) * 100) : 0;
        
        // Actualizar elementos visuales
        document.querySelector('.progress-percentage').textContent = `${porcentaje}%`;
        document.querySelector('.progress-bar-inner').style.width = `${porcentaje}%`;
        document.querySelector('.materias-aprobadas').textContent = totalAprobadas;
        document.querySelector('.total-materias').textContent = totalMaterias;
        
        // Efecto visual cuando se actualiza el progreso
        const barraProgreso = document.querySelector('.progress-bar-inner');
        barraProgreso.style.transition = 'width 0.8s ease-in-out';
        
        // Verificar si se alcanzó el 100% para mostrar la celebración
        if (porcentaje === 100) {
            // Pequeño retraso para que se vea la barra completa primero
            setTimeout(() => {
                // Mostrar el modal de felicitaciones
                const congratsModal = new bootstrap.Modal(document.getElementById('congratsModal'));
                congratsModal.show();
                
                // Lanzar confeti
                confetti.start();
                
                // Detener el confeti después de 8 segundos
                setTimeout(() => {
                    confetti.stop();
                }, 8000);
                
                // Cuando se cierre el modal, detener el confeti
                document.getElementById('congratsModal').addEventListener('hidden.bs.modal', function () {
                    confetti.stop();
                });
            }, 600);  // Retraso para que se vea la animación de la barra primero
        }
        
        // Cambiar color de la barra según el progreso - transición suave de rosa a amarillo a verde
        let colorInicio, colorFin;
        
        if (porcentaje < 40) {
            // Rosa (inicio)
            const factor = porcentaje / 40;
            colorInicio = '#a5374e';
            colorFin = mezclarColores('#ff6b8b', '#ffb347', factor);
        } else if (porcentaje < 75) {
            // Rosa a amarillo (medio)
            const factor = (porcentaje - 40) / 35;
            colorInicio = mezclarColores('#a5374e', '#d4ac0d', factor);
            colorFin = mezclarColores('#ffb347', '#ffda44', factor);
        } else {
            // Amarillo a verde (final - a partir del 75%)
            const factor = (porcentaje - 75) / 25;
            colorInicio = mezclarColores('#d4ac0d', '#2e7d32', factor);
            colorFin = mezclarColores('#ffda44', '#66bb6a', factor);
        }
        
        barraProgreso.style.background = `linear-gradient(90deg, ${colorInicio}, ${colorFin})`;
        
        // Actualizar también el color del texto del porcentaje para que coincida
        document.querySelector('.progress-percentage').style.background = 
            `linear-gradient(45deg, ${colorInicio}, ${colorFin})`;
        document.querySelector('.progress-percentage').style.webkitBackgroundClip = 'text';
        document.querySelector('.progress-percentage').style.backgroundClip = 'text';
        document.querySelector('.progress-percentage').style.webkitTextFillColor = 'transparent';
        
        // Ya no guardamos automáticamente al actualizar la barra de progreso
        // guardarEstados();
    }

    // Ejecutar revisión inicial de correlatividades
    revisarCorrelativas();
    
    // Inicializar la barra de progreso
    actualizarBarraProgreso();
    
    // Ya no guardamos el estado inicial automáticamente
    // guardarEstados();
    
    // Configurar botón de guardado
    document.getElementById('guardarBtn').addEventListener('click', function() {
        try {
            // Mostrar indicador de carga
            this.disabled = true;
            this.innerHTML = 'Guardando...';
            
            // Guardar estados
            const resultado = guardarEstados();
            
            if (resultado) {
                // Mostrar confirmación con mensaje flash
                mostrarMensajeFlash('¡Progreso guardado correctamente!', 'success');
                console.log('Guardado exitoso en localStorage y cookies');
            } else {
                mostrarMensajeFlash('Error al guardar el progreso', 'error');
            }
        } catch (error) {
            console.error('Error en el proceso de guardado:', error);
            mostrarMensajeFlash('Error al guardar el progreso', 'error');
        } finally {
            // Restaurar el botón
            this.disabled = false;
            this.innerHTML = 'Guardar progreso';
        }
    });
    
    // Función para deshacer el último cambio
    function deshacer() {
        // Verificar si hay estados en el historial
        if (historialEstados.length === 0) {
            document.getElementById('deshacerBtn').disabled = true;
            return;
        }
        
        // Obtener el último estado guardado
        const estadoAnterior = historialEstados.pop();
        
        // Actualizar el estado actual
        estadosMaterias = estadoAnterior;
        
        // Actualizar la interfaz
        todasLasMaterias.forEach(materia => {
            // Limpiar clases actuales
            materia.classList.remove('cursando');
            materia.classList.remove('aprobada');
            
            // Aplicar estado anterior
            const estadoMateria = estadosMaterias[materia.id];
            if (estadoMateria) {
                if (estadoMateria.cursando) {
                    materia.classList.add('cursando');
                } else if (estadoMateria.aprobada) {
                    materia.classList.add('aprobada');
                }
            }
            
            // Aplicar estilos
            aplicarEstilos(materia);
        });
        
        // Revisar correlativas y actualizar estados
        revisarCorrelativas();
        
        // Actualizar barra de progreso
        actualizarBarraProgreso();
        
        // Ya no guardamos automáticamente
        // guardarEstados();
        
        // Mostrar mensaje flash
        mostrarMensajeFlash('Cambio deshecho correctamente', 'info');
        
        // Deshabilitar el botón si no hay más estados en el historial
        if (historialEstados.length === 0) {
            document.getElementById('deshacerBtn').disabled = true;
        }
    }
    
    // Ya no necesitamos el botón de cargar progreso
    
    // Configurar botón de deshacer
    document.getElementById('deshacerBtn').addEventListener('click', function() {
        deshacer();
    });
    
    // Configurar botón de reinicio
    document.getElementById('reiniciarBtn').addEventListener('click', function() {
        // Mostrar el modal de confirmación en lugar del alert
        const reinicioModal = new bootstrap.Modal(document.getElementById('reinicioModal'));
        reinicioModal.show();
    });
    
    // Configurar botón de confirmación dentro del modal
    document.getElementById('confirmarReinicioBtn').addEventListener('click', function() {
        try {
            // Guardar en historial antes de reiniciar
            guardarEnHistorial();
            
            // Ocultar el modal
            const reinicioModal = bootstrap.Modal.getInstance(document.getElementById('reinicioModal'));
            reinicioModal.hide();
            
            // Mostrar indicador de carga en el botón principal
            const reiniciarBtn = document.getElementById('reiniciarBtn');
            reiniciarBtn.disabled = true;
            reiniciarBtn.innerHTML = 'Reiniciando...';
            
            // Reiniciar estados de materias
            estadosMaterias = {};
            
            // Eliminar clases de todas las materias
            todasLasMaterias.forEach(materia => {
                materia.classList.remove('cursando');
                materia.classList.remove('aprobada');
            });
            
            // Reinicializar materias (esto aplicará las clases bloqueadas correctamente)
            inicializarMaterias();
            
            // Revisar correlativas para actualizar estados
            revisarCorrelativas();
            
            // Actualizar barra de progreso
            actualizarBarraProgreso();
            
            // Ya no guardamos automáticamente
            // guardarEstados();
            
            // Mostrar mensaje flash
            mostrarMensajeFlash('¡Materias reiniciadas correctamente!', 'success');
        } catch (error) {
            console.error('Error en el proceso de reinicio:', error);
            mostrarMensajeFlash('Error al reiniciar las materias', 'error');
        } finally {
            // Restaurar el botón principal
            const reiniciarBtn = document.getElementById('reiniciarBtn');
            reiniciarBtn.disabled = false;
            reiniciarBtn.innerHTML = 'Reiniciar materias';
        }
    });
    
    // Función para mostrar mensajes flash temporales
    function mostrarMensajeFlash(mensaje, tipo = 'success', duracion = 3000) {
        const flashContainer = document.getElementById('flashMessage');
        
        // Limpiar cualquier mensaje anterior
        flashContainer.textContent = '';
        flashContainer.className = 'flash-message';
        
        // Agregar clase según el tipo de mensaje
        flashContainer.classList.add(`flash-${tipo}`);
        
        // Establecer el mensaje
        flashContainer.textContent = mensaje;
        
        // Mostrar el mensaje
        flashContainer.style.display = 'block';
        
        // Efecto de aparición
        setTimeout(() => {
            flashContainer.style.opacity = '1';
        }, 10);
        
        // Ocultar después de la duración especificada
        setTimeout(() => {
            flashContainer.style.opacity = '0';
            
            // Eliminar el elemento después de la transición
            setTimeout(() => {
                flashContainer.style.display = 'none';
            }, 500);
        }, duracion);
    }
});