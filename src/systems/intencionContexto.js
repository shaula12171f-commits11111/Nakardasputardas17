// ============================================================
//  SISTEMA DE DETECCIÓN DE INTENCIÓN Y VARIABILIDAD
//  Archivo: intencionContexto.js
//  Descripción: Detecta si el usuario quiere continuar o cambiar
//               de acción, maneja variabilidad en respuestas y
//               análisis dinámico de imágenes
// ============================================================

/**
 * DETECCIÓN DE INTENCIÓN DEL USUARIO
 * Analiza frases para determinar si quiere continuar con la misma acción
 * o cambiar a otra diferente
 */

const PATRONES_CONTINUACION = [
    /sigue así/i,
    /continuá/i,
    /continua/i,
    /seguí/i,
    /segui/i,
    /mantené/i,
    /mantene/i,
    /no pares/i,
    /no te detengas/i,
    /hacelo de nuevo/i,
    /otra vez/i,
    /más/i,
    /dale/i,
    /vamos/i,
    /ok/i,
    /sí/i,
    /si/i,
    /yep/i,
    /ajá/i,
    /aja/i,
    /bien/i,
    /perfecto/i,
    /así me gusta/i,
    /me encanta/i,
    /quiero más/i,
    /no cambies/i,
    /quédate así/i,
    /igual/i,
    /mismo/i
];

const PATRONES_CAMBIO = [
    /ahora/i,
    /cambiá/i,
    /cambia/i,
    /pará/i,
    /para/i,
    /basta/i,
    /suficiente/i,
    /terminemos/i,
    /probemos/i,
    /hagamos/i,
    /quiero que/i,
    /mejor/i,
    /diferente/i,
    /otra cosa/i,
    /nuevo/i,
    /distinto/i,
    /pasemos a/i,
    /vamos a/i,
    /dejá eso/i,
    /deja eso/i,
    /cambiemos/i,
    /switch/i,
    /cambio/i
];

const PATRONES_TRANSICION_SUAVE = [
    /también/i,
    /además/i,
    /mientras/i,
    /al mismo tiempo/i,
    /podés/i,
    /puedes/i,
    /qué tal si/i,
    /te gustaría/i,
    /y si/i
];

/**
 * Detecta la intención del usuario basada en su mensaje
 * @param {string} mensaje - Mensaje del usuario
 * @param {string|null} accionEnCurso - Acción actual en curso
 * @returns {{intencion: string, confianza: number, tipo: string, sugerencia: string}}
 *          intencion: 'continuar', 'cambiar', 'transicion', 'neutral'
 *          confianza: 0-1 (nivel de certeza)
 *          tipo: 'explicito', 'implicito', 'ambiguo'
 *          sugerencia: sugerencia de respuesta contextual
 */
export function detectarIntencion(mensaje, accionEnCurso = null) {
    if (!mensaje || mensaje.trim() === '') {
        return {
            intencion: 'neutral',
            confianza: 0,
            tipo: 'ambiguo',
            sugerencia: 'Mantener estado actual'
        };
    }

    const mensajeLower = mensaje.toLowerCase();
    let puntajeContinuacion = 0;
    let puntajeCambio = 0;
    let puntajeTransicion = 0;
    let coincidencias = [];

    // Contar coincidencias con patrones de continuación
    for (const patron of PATRONES_CONTINUACION) {
        if (patron.test(mensaje)) {
            puntajeContinuacion++;
            coincidencias.push({ tipo: 'continuar', patron: patron.toString() });
        }
    }

    // Contar coincidencias con patrones de cambio
    for (const patron of PATRONES_CAMBIO) {
        if (patron.test(mensaje)) {
            puntajeCambio++;
            coincidencias.push({ tipo: 'cambiar', patron: patron.toString() });
        }
    }

    // Contar coincidencias con patrones de transición suave
    for (const patron of PATRONES_TRANSICION_SUAVE) {
        if (patron.test(mensaje)) {
            puntajeTransicion++;
            coincidencias.push({ tipo: 'transicion', patron: patron.toString() });
        }
    }

    // Determinar intención dominante
    const maxPuntaje = Math.max(puntajeContinuacion, puntajeCambio, puntajeTransicion);
    
    if (maxPuntaje === 0) {
        // No hay patrones claros, analizar contexto implícito
        return analizarIntencionImplicita(mensaje, accionEnCurso);
    }

    const confianza = Math.min(maxPuntaje / 3, 1); // Normalizar a 0-1
    let intencion = 'neutral';
    let tipo = maxPuntaje >= 2 ? 'explicito' : 'implicito';

    if (puntajeContinuacion > puntajeCambio && puntajeContinuacion > puntajeTransicion) {
        intencion = 'continuar';
    } else if (puntajeCambio > puntajeContinuacion && puntajeCambio > puntajeTransicion) {
        intencion = 'cambiar';
    } else if (puntajeTransicion > 0) {
        intencion = 'transicion';
    }

    // Generar sugerencia basada en la intención
    const sugerencia = generarSugerenciaRespuesta(intencion, accionEnCurso, confianza);

    return {
        intencion,
        confianza,
        tipo,
        sugerencia,
        coincidencias
    };
}

/**
 * Analiza intención implícita cuando no hay patrones explícitos
 * @param {string} mensaje - Mensaje del usuario
 * @param {string|null} accionEnCurso - Acción actual en curso
 * @returns {{intencion: string, confianza: number, tipo: string, sugerencia: string}}
 */
function analizarIntencionImplicita(mensaje, accionEnCurso) {
    const mensajeLower = mensaje.toLowerCase();
    
    // Si el mensaje es muy corto, probablemente sea continuación
    if (mensaje.length < 10) {
        return {
            intencion: 'continuar',
            confianza: 0.3,
            tipo: 'implicito',
            sugerencia: 'Mensaje corto sugiere continuidad'
        };
    }

    // Si menciona la acción en curso, es continuación
    if (accionEnCurso && mensajeLower.includes(accionEnCurso.toLowerCase())) {
        return {
            intencion: 'continuar',
            confianza: 0.6,
            tipo: 'implicito',
            sugerencia: `Usuario menciona la acción "${accionEnCurso}"`
        };
    }

    // Si hace una pregunta sobre el estado actual
    if (/[?¿]/.test(mensaje)) {
        return {
            intencion: 'transicion',
            confianza: 0.4,
            tipo: 'implicito',
            sugerencia: 'Pregunta puede indicar interés en explorar opciones'
        };
    }

    // Por defecto, neutral
    return {
        intencion: 'neutral',
        confianza: 0.2,
        tipo: 'ambiguo',
        sugerencia: 'Sin indicadores claros de intención'
    };
}

/**
 * Genera sugerencia de respuesta basada en la intención detectada
 * @param {string} intencion - Intención detectada
 * @param {string|null} accionEnCurso - Acción actual
 * @param {number} confianza - Nivel de confianza
 * @returns {string} Sugerencia de respuesta
 */
function generarSugerenciaRespuesta(intencion, accionEnCurso, confianza) {
    switch (intencion) {
        case 'continuar':
            if (confianza > 0.7) {
                return 'Mostrar progreso/enfasis en la acción actual con variación';
            } else {
                return 'Continuar acción actual sutilmente';
            }
        case 'cambiar':
            if (confianza > 0.7) {
                return 'Transición clara a nueva acción con confirmación';
            } else {
                return 'Preparar transición pero mantener opción de volver';
            }
        case 'transicion':
            return 'Explorar combinación de acción actual con nueva posibilidad';
        default:
            return 'Observar más contexto antes de decidir';
    }
}

/**
 * SISTEMA DE VARIABILIDAD EN RESPUESTAS
 * Genera diferentes frases según duración y estado de la acción
 */

const FRASES_CONTINUACION_CORTA = [
    "*continuo con lo que estábamos* {nombreUsuario}, esto recién empieza...",
    "*mantengo el ritmo mientras te miro* ¿Te gusta así, {nombreUsuario}?",
    "*sin detenerme ni un segundo* Mmm... {nombreUsuario}, sentís lo mismo que yo...",
    "*persisto en mi movimiento* Esto es solo el comienzo, {nombreUsuario}...",
    "*continuo exactamente igual* No pienso parar todavía, {nombreUsuario}..."
];

const FRASES_CONTINUACION_MEDIA = [
    "*llevamos un rato así y cada vez me excita más* {nombreUsuario}, ¿cuánto más aguantás?",
    "*el tiempo vuela cuando estamos así* {nombreUsuario}, nunca me cansaría de esto...",
    "*ya perdí la noción del tiempo* {nombreUsuario}, esto se siente tan bien...",
    "*después de todo este tiempo juntos* {nombreUsuario}, cada vez quiero más...",
    "*insisto sin parar* {nombreUsuario}, tu reacción me vuelve loca..."
];

const FRASES_CONTINUACION_LARGA = [
    "*llevamos tanto tiempo que mis piernas tiemblan* {nombreUsuario}, esto es increíble...",
    "*después de tanto rato sigo tan excitada como al principio* {nombreUsuario}, sos adictivo...",
    "*mi cuerpo ya no aguanta mucho más pero no quiero parar* {nombreUsuario}, haceme tuya...",
    "*el sudor nos cubre después de tanto tiempo* {nombreUsuario}, esta noche será legendaria...",
    "*mis músculos arden pero continuo por vos* {nombreUsuario}, valés cada gota de esfuerzo..."
];

const FRASES_TRANSICION_SUAVE = [
    "*sin romper el ritmo, propongo algo nuevo* {nombreUsuario}, ¿qué te parece si probamos...?",
    "*manteniendo la conexión, sugiero* {nombreUsuario}, podríamos intentar algo diferente...",
    "*en lugar de parar, evoluciono la acción* {nombreUsuario}, dejame llevarte más lejos...",
    "*con una sonrisa pícara, cambio suavemente* {nombreUsuario}, preparate para esto...",
    "*fluyendo naturalmente hacia algo nuevo* {nombreUsuario}, esto te va a encantar..."
];

const FRASES_CAMBIO_EXPLICITO = [
    "*detengo lo que estaba haciendo y te miro* {nombreUsuario}, cambiemos de posición...",
    "*paro en seco y sonrío* {nombreUsuario}, tengo una idea mejor...",
    "*rompo el momento y propongo* {nombreUsuario}, ¿te animás a probar esto?",
    "*me separo un poco y te invito* {nombreUsuario}, vamos a hacer algo distinto...",
    "*finalizo la acción anterior* {nombreUsuario}, ahora hagamos esto..."
];

/**
 * Obtiene una frase variable según el estado de la acción
 * @param {string} tipo - Tipo de frase ('continuar_corta', 'continuar_media', 'continuar_larga', 'transicion', 'cambiar')
 * @param {string} nombreUsuario - Nombre del usuario para personalizar
 * @returns {string} Frase seleccionada aleatoriamente
 */
export function obtenerFraseVariable(tipo, nombreUsuario = 'usuario') {
    let frases = [];
    
    switch (tipo) {
        case 'continuar_corta':
            frases = FRASES_CONTINUACION_CORTA;
            break;
        case 'continuar_media':
            frases = FRASES_CONTINUACION_MEDIA;
            break;
        case 'continuar_larga':
            frases = FRASES_CONTINUACION_LARGA;
            break;
        case 'transicion':
            frases = FRASES_TRANSICION_SUAVE;
            break;
        case 'cambiar':
            frases = FRASES_CAMBIO_EXPLICITO;
            break;
        default:
            frases = FRASES_CONTINUACION_CORTA;
    }

    // Reemplazar {nombreUsuario} en la frase
    const fraseSeleccionada = frases[Math.floor(Math.random() * frases.length)];
    return fraseSeleccionada.replace(/{nombreUsuario}/g, nombreUsuario);
}

/**
 * Determina el tipo de variación basado en turnos de duración
 * @param {number} turnosDuracion - Cantidad de turnos que lleva la acción
 * @returns {string} Tipo de variación recomendada
 */
export function determinarVariacionPorDuracion(turnosDuracion) {
    if (turnosDuracion <= 2) {
        return 'continuar_corta';
    } else if (turnosDuracion <= 5) {
        return 'continuar_media';
    } else {
        return 'continuar_larga';
    }
}

/**
 * ANALISIS DINÁMICO DE IMÁGENES
 * Lee nombres de archivos de imagen para detectar posibles acciones
 */

/**
 * Extrae información de un nombre de archivo de imagen
 * @param {string} nombreArchivo - Nombre del archivo (ej: "ichika_besando_01.png")
 * @returns {{accionInferida: string, personaje: string, variante: string, tags: string[]}}
 */
export function analizarNombreImagen(nombreArchivo) {
    // Remover extensión
    const nombreBase = nombreArchivo.replace(/\.[^/.]+$/, "");
    
    // Dividir por guiones bajos
    const partes = nombreBase.split('_');
    
    if (partes.length === 0) {
        return {
            accionInferida: 'unknown',
            personaje: 'unknown',
            variante: '01',
            tags: []
        };
    }

    // Primera parte usualmente es el personaje
    const personaje = partes[0].toLowerCase();
    
    // Última parte usualmente es el número de variante
    const ultimaParte = partes[partes.length - 1];
    const variante = /^\d+$/.test(ultimaParte) ? ultimaParte : '01';
    
    // Partes del medio son la acción y tags
    const partesAccion = partes.slice(1, partes.length - 1);
    const accionInferida = partesAccion.join('_') || 'idle';
    
    // Tags adicionales
    const tags = partesAccion.filter(p => p.length > 2);

    return {
        accionInferida,
        personaje,
        variante,
        tags
    };
}

/**
 * Compara la entrada del usuario con nombres de imágenes disponibles
 * @param {string} entradaUsuario - Texto de entrada del usuario
 * @param {Array<string>} nombresArchivos - Lista de nombres de archivos disponibles
 * @returns {Array<{archivo: string, puntaje: number, coincidencias: string[]}>}
 */
export function buscarImagenPorEntrada(entradaUsuario, nombresArchivos) {
    const entradaLower = entradaUsuario.toLowerCase();
    const resultados = [];

    for (const archivo of nombresArchivos) {
        const analisis = analizarNombreImagen(archivo);
        let puntaje = 0;
        const coincidencias = [];

        // Verificar coincidencia con acción inferida
        if (analisis.accionInferida !== 'unknown') {
            if (entradaLower.includes(analisis.accionInferida.toLowerCase())) {
                puntaje += 10;
                coincidencias.push(`acción: ${analisis.accionInferida}`);
            }
            
            // Verificar palabras individuales de la acción
            const palabrasAccion = analisis.accionInferida.split('_');
            for (const palabra of palabrasAccion) {
                if (palabra.length > 3 && entradaLower.includes(palabra.toLowerCase())) {
                    puntaje += 3;
                    coincidencias.push(`palabra: ${palabra}`);
                }
            }
        }

        // Verificar coincidencia con tags
        for (const tag of analisis.tags) {
            if (entradaLower.includes(tag.toLowerCase())) {
                puntaje += 5;
                coincidencias.push(`tag: ${tag}`);
            }
        }

        // Bonus por coincidencia exacta
        if (entradaLower === analisis.accionInferida.toLowerCase()) {
            puntaje += 20;
            coincidencias.push('coincidencia_exacta');
        }

        if (puntaje > 0) {
            resultados.push({
                archivo,
                puntaje,
                coincidencias,
                analisis
            });
        }
    }

    // Ordenar por puntaje descendente
    resultados.sort((a, b) => b.puntaje - a.puntaje);

    return resultados;
}

/**
 * Sistema de memoria de contexto para acciones
 * Recuerda la acción anterior para dar continuidad
 */

export class MemoriaContextoAcciones {
    constructor() {
        this.historialAcciones = [];
        this.accionActual = null;
        this.turnosEnAccionActual = 0;
        this.progresoAccion = 0; // 0-100, indica cuánto se completó la acción
        this.estadoAnimacion = 'idle'; // idle, iniciando, activo, terminando
    }

    /**
     * Registra una nueva acción o continúa la actual
     * @param {string} accion - Nombre de la acción
     * @param {boolean} esContinuidad - Si es continuación de la anterior
     */
    registrarAccion(accion, esContinuidad = false) {
        const timestamp = Date.now();

        if (esContinuidad && this.accionActual === accion) {
            // Continuar acción existente
            this.turnosEnAccionActual++;
            this.progresoAccion = Math.min(this.progresoAccion + 20, 100);
            this.estadoAnimacion = 'activo';
            
            console.log(`[MemoriaContexto] Continuando acción: ${accion} (turno ${this.turnosEnAccionActual})`);
        } else {
            // Nueva acción o cambio
            if (this.accionActual) {
                // Guardar acción anterior en historial
                this.historialAcciones.push({
                    accion: this.accionActual,
                    turnos: this.turnosEnAccionActual,
                    progresoFinal: this.progresoAccion,
                    finalizada: true
                });
            }

            // Iniciar nueva acción
            this.accionActual = accion;
            this.turnosEnAccionActual = 1;
            this.progresoAccion = 20;
            this.estadoAnimacion = 'iniciando';

            console.log(`[MemoriaContexto] Nueva acción iniciada: ${accion}`);
        }
    }

    /**
     * Obtiene el estado actual del contexto
     * @returns {{accion: string, turnos: number, progreso: number, estado: string, historial: Array}}
     */
    obtenerEstado() {
        return {
            accion: this.accionActual,
            turnos: this.turnosEnAccionActual,
            progreso: this.progresoAccion,
            estado: this.estadoAnimacion,
            historial: this.historialAcciones.slice(-5) // Últimas 5 acciones
        };
    }

    /**
     * Determina si debería haber transición basada en el progreso
     * @returns {boolean} True si sugiere transición
     */
    sugerirTransicion() {
        // Si lleva muchos turnos o el progreso es alto
        return this.turnosEnAccionActual >= 5 || this.progresoAccion >= 80;
    }

    /**
     * Obtiene mensaje de progreso para mostrar continuidad
     * @param {string} nombreUsuario - Nombre del usuario
     * @returns {string} Mensaje de progreso
     */
    obtenerMensajeProgreso(nombreUsuario = 'usuario') {
        if (!this.accionActual) {
            return "*esperando tu próxima acción* ¿Qué querés hacer, {nombreUsuario}?".replace(/{nombreUsuario}/g, nombreUsuario);
        }

        if (this.turnosEnAccionActual === 1) {
            return "*iniciando con entusiasmo* ¡Vamos, {nombreUsuario}!".replace(/{nombreUsuario}/g, nombreUsuario);
        } else if (this.turnosEnAccionActual < 4) {
            return "*manteniendo el ritmo* Esto se pone bueno, {nombreUsuario}...".replace(/{nombreUsuario}/g, nombreUsuario);
        } else if (this.turnosEnAccionActual < 7) {
            return "*cada vez más intensa* {nombreUsuario}, no puedo parar...".replace(/{nombreUsuario}/g, nombreUsuario);
        } else {
            return "*totalmente entregada* {nombreUsuario}, esto es demasiado...".replace(/{nombreUsuario}/g, nombreUsuario);
        }
    }

    /**
     * Resetea el contexto para una nueva sesión
     */
    resetear() {
        if (this.accionActual) {
            this.historialAcciones.push({
                accion: this.accionActual,
                turnos: this.turnosEnAccionActual,
                progresoFinal: this.progresoAccion,
                finalizada: true
            });
        }
        
        this.accionActual = null;
        this.turnosEnAccionActual = 0;
        this.progresoAccion = 0;
        this.estadoAnimacion = 'idle';
        
        console.log('[MemoriaContexto] Contexto reseteado');
    }
}

// Exportar instancia singleton para uso global
export const memoriaContextoGlobal = new MemoriaContextoAcciones();
