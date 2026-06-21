// ============================================================
//  QuintiAmigas - Lógica de respuesta con Groq API
//  Archivo: logica.js
//  Carpeta: quintillizasPrueba
//  
//  CARACTERÍSTICAS IMPLEMENTADAS:
//  - Sistema de reintentos multi-fase (basado en quintillizas.js)
//  - Logging detallado de errores en consola
//  - Selección automática de imágenes según contexto
//  - Rotación de API keys para alta disponibilidad
//  - System prompt separado en módulo independiente
//  - Personalidades separadas en módulo independiente
//  - Fallbacks y sistema de reintentos en módulo independiente
//  - SISTEMA DE CHICAS MÚLTIPLES: Cuando se menciona a otra chica,
//    esta se une al chat y responde también en MENSAJES SEPARADOS
//  - SISTEMA DE MEMORIA: Recuerda cosas puntuales durante la conversación
//  - REDUCCIÓN DE REPETICIONES: Evita diálogos y frases repetidas
//
//  DEPENDENCIAS:
//  - systemprompt.js: Prompts del sistema y variantes
//  - personalidades.js: Definición de personajes
//  - fallbacks.js: Sistema de reintentos y respuestas de respaldo
//  - imagenes.js: URLs y tags de imágenes
// ============================================================

import { generarSystemPrompt, QUINT_PRUEBA_SYSTEM_MINIMO, QUINT_PRUEBA_FASE1, QUINT_PRUEBA_FASE2, QUINT_PRUEBA_FASE3, QUINT_PRUEBA_FASE4, SYSTEM_PROMPT_INICIAL } from './systemPrompt.js';
import { PERSONALIDADES, getChicasDisponibles, existeChica, tieneImagenes } from './personalidades.js';
import { ALDO_PERSONALIDAD, ALDO_INSTRUCCIONES_SISTEMA, getAldoPersonalidad, esAldo, aldoDebeResponder } from './aldo.js';
import { obtenerMensajeError, generarPayloadFase, getOrdenFases, getInfoFase, obtenerFallbackLocal, obtenerFallbackAntiRepeticion } from './fallbacks.js';
import { QuintiImagenesPrueba } from './imagenes.js';
import { getImagenTagsMapping as getImagenTagsMappingHistoria } from './historiasParalelas.js';
import { detectarRepeticion, detectarRepeticionEntreChicas, agregarDialogoAlHistorial, generarPromptAntiRepeticion, getEstadisticasRepeticion, calcularSimilitud } from './antiRepeticion.js';
import { detectarAccionEnTexto, detectarAccionEnTextoSimple } from './parserAcciones.js';

// ============================================================
//  CONFIGURACIÓN DE API KEYS
// ============================================================

const _K = [
    ["gsk_Ab4b","EufREWBZFunx","DuzgWGdyb3FYvUfnaETyrJ7JpsXENg65Mknn"],
    ["gsk_Hf7e","UYXxcW02QXOw","pOcFWGdyb3FYg2p1lgVh4DxvfKrCiay4VPZl"],
    ["gsk_6E8F","57WlJAmRtPdp","iuvjWGdyb3FYCwoYPRqC9qMnUJaWUbL0toqD"],
    ["gsk_hhU0","lGUUZz0akDJ3","9Bc8WGdyb3FYIbnZloErkqMK9CmvdUMZ0NkM"],
    ["gsk_WZ5J","eXbz8Cdyobah","N2YOWGdyb3FYt26L4pNRknGmbQVSmwtYpov4"],
    ["gsk_eGDZ","VjFAmOx5PtSl","DdadWGdyb3FYm6DvoDLIqKxqmpaLCn5PbyR3"],
    ["gsk_UHXG","5P9bK5R89hid","YaRuWGdyb3FYJszztcUJt14qYDE4jekb486Q"],
    ["gsk_4gde","xolSNg07yo0W","QdfdWGdyb3FYpEtpBMbAy468Z4poTaZq9Ebm"],
    ["gsk_MIlZ","XtHbwn7MILGj","kEB7WGdyb3FYTqqcD3n2dBfX9f9hRGCp0QaP"],
    ["gsk_bIeI","gAZ9guyQaloQ","e9fOWGdyb3FYI3b0ML6OkllrTtywXadkJ8cM"],
];
const GROQ_KEYS = _K.map(partes => partes.join(""));
const MODELO_PRINCIPAL = "openai/gpt-oss-120b";

let indiceKeyActual = 0;
let chicaSeleccionada = null;
let historialConversacion = [];
const MAX_HISTORIAL = 20;
let chicasEnChat = new Set(); // Conjunto de chicas que están participando en el chat actual

// ============================================================
//  SISTEMA DE MEMORIA AVANZADO - IMPLEMENTACIÓN COMPLETA
// ============================================================

/**
 * SISTEMA DE MEMORIA MULTICAPA
 * 
 * 1. Memoria de Trabajo (Working Memory): Contexto inmediato de las últimas interacciones
 * 2. Memoria de Hechos (Fact Memory): Datos concretos y relevantes mencionados
 * 3. Memoria Narrativa (Narrative Memory): Resumen del hilo principal de conversación
 * 4. Memoria de Eventos Íntimos (Intimate Events): Contadores y eventos sexuales
 * 5. Memoria Emocional (Emotional Memory): Estado emocional y tono de la conversación
 */

// Memoria de Trabajo - Últimas interacciones y contexto inmediato
let memoriaTrabajo = {
    ultimosMensajes: [],        // Últimos 5 mensajes usuario-asistente
    contextoInmediato: '',       // Tema actual de conversación
    tiempoUltimaInteraccion: 0,  // Timestamp de la última interacción
    turnosEnTemaActual: 0,       // Cuántos turnos lleva el tema actual
    temaActual: null             // Tema principal actual
};
const MAX_MEMORIA_TRABAJO = 5;  // Mantener últimos 5 intercambios

// Memoria de Hechos - Datos concretos mencionados por el usuario
let memoriaHechos = {
    nombres: [],                 // Nombres mencionados (usuario, otras personas)
    preferencias: [],            // Gustos y preferencias del usuario
    lugares: [],                 // Lugares mencionados o donde ocurren acciones
    objetos: [],                 // Objetos importantes mencionados
    eventosPasados: [],          // Eventos importantes que ocurrieron
    relaciones: [],              // Relaciones entre personajes
    datosPersonales: [],         // Información personal del usuario
    accionesRecientes: []        // Acciones físicas recientes realizadas
};
const MAX_HECHOS_POR_CATEGORIA = 20;

// Memoria Narrativa - Resumen del hilo de conversación
let memoriaNarrativa = {
    resumenGeneral: '',          // Resumen de toda la conversación
    puntosClave: [],             // Puntos clave de la historia
    arcosNarrativos: [],         // Arcos o temas principales
    ultimoResumenTurno: 0,       // Turno en que se generó el último resumen
    turnosDesdeUltimoResumen: 0  // Turnos desde el último resumen
};
const TURNOS_PARA_RESUMEN = 6;   // Generar resumen cada 6 turnos (más frecuente)

// Memoria Emocional - Estado emocional de la conversación
let memoriaEmocional = {
    tonoActual: 'neutral',       // Tono emocional predominante
    intensidadEmocional: 0,      // Intensidad del momento (0-10)
    emocionesRecientes: [],      // Últimas emociones detectadas
    nivelConfianza: 0,           // Nivel de confianza/intimidad (0-10)
    momentosDestacados: []       // Momentos emocionalmente significativos
};

// Memoria de Eventos Íntimos - Contadores y eventos sexuales
let memoriaEventosIntimos = {
    totalBesos: 0,
    totalMamadas: 0,
    totalFolladas: 0,
    totalAnal: 0,
    totalHandjobs: 0,
    posicionesUsadas: [],        // Posiciones utilizadas
    lugaresIntimos: [],          // Lugares donde ocurrieron eventos
    fantasiasMencionadas: [],    // Fantasías o deseos expresados
    eventosImportantes: []       // Array de eventos importantes con timestamp y descripción
};

// Configuración general de memoria
const MAX_MEMORIA = 50; // Máximo total de elementos en memoria
const MAX_EVENTOS_IMPORTANTES = 30;

// Variables para mantener el estado de la acción en curso (persistencia natural de contexto)
let accionEnCurso = null; // Acción actual (ej: 'besando', 'chupando')
let contadorTurnosAccion = 0; // Turnos que lleva la acción actual
const MAX_TURNOS_ACCION = 3; // Después de 3 turnos, la acción puede terminar naturalmente

// SISTEMA DE BOOLEANOS DE ACCIONES EXPLÍCITAS - Estado detallado de cada acción
let estadoAccionesExplicitas = {
    besando: false,
    mamando: false,
    follando: false,
    siendoFollada: false,
    chupandoBolas: false,
    haciendoHandjob: false,
    enDoggystyle: false,
    enMisionero: false,
    enReverseCowgirl: false,
    haciendoAnal: false,
    desnuda: false,
    mostrandoCulo: false,
    lamiendoAno: false
};

/**
 * Actualiza el estado de la acción en curso desde logica.js
 * @param {string|null} nuevaAccion - La acción detectada en el mensaje del usuario
 */
function actualizarAccionEnCurso(nuevaAccion) {
    if (nuevaAccion) {
        // Nueva acción detectada: reiniciar contador
        if (accionEnCurso !== nuevaAccion) {
            accionEnCurso = nuevaAccion;
            contadorTurnosAccion = 1;
            logQuinti('DEBUG', `Nueva acción iniciada en logica.js: ${nuevaAccion}`);
            
            // Actualizar booleanos de acciones explícitas
            actualizarEstadoAccionesExplicitas(nuevaAccion, true);
            
            // Registrar evento importante en memoria
            registrarEventoImportante(`Inicio de acción: ${nuevaAccion}`);
        } else {
            // Misma acción continúa
            contadorTurnosAccion++;
            logQuinti('DEBUG', `Acción ${nuevaAccion} continúa en logica.js (turno ${contadorTurnosAccion}/${MAX_TURNOS_ACCION})`);
        }
    } else {
        // No hay acción explícita en el mensaje
        if (accionEnCurso && contadorTurnosAccion >= MAX_TURNOS_ACCION) {
            // La acción terminó naturalmente después de MAX_TURNOS_ACCION turnos
            logQuinti('DEBUG', `Acción ${accionEnCurso} terminó naturalmente en logica.js`);
            
            // Actualizar contadores de memoria de eventos íntimos
            actualizarMemoriaEventosIntimos(accionEnCurso);
            
            // Resetear booleanos de acciones explícitas
            resetearEstadoAccionesExplicitas();
            
            accionEnCurso = null;
            contadorTurnosAccion = 0;
        } else if (accionEnCurso) {
            // La acción aún está en curso pero el usuario no la mencionó explícitamente
            logQuinti('DEBUG', `Acción ${accionEnCurso} se mantiene implícita en logica.js (turno ${contadorTurnosAccion})`);
        }
    }
}

/**
 * Actualiza los booleanos de acciones explícitas según la acción detectada
 * @param {string} accion - La acción a activar
 * @param {boolean} estado - True para activar, false para desactivar
 */
function actualizarEstadoAccionesExplicitas(accion, estado) {
    // Primero resetear todos los booleanos
    resetearEstadoAccionesExplicitas();
    
    // Luego activar solo la acción correspondiente
    switch (accion.toLowerCase()) {
        case 'besando':
            estadoAccionesExplicitas.besando = estado;
            break;
        case 'mamando':
        case 'chupando':
            estadoAccionesExplicitas.mamando = estado;
            break;
        case 'follando':
        case 'siendoFollada':
            estadoAccionesExplicitas.follando = estado;
            estadoAccionesExplicitas.siendoFollada = estado;
            break;
        case 'chupandoBolas':
            estadoAccionesExplicitas.chupandoBolas = estado;
            break;
        case 'handjob':
        case 'paja':
            estadoAccionesExplicitas.haciendoHandjob = estado;
            break;
        case 'doggystyle':
            estadoAccionesExplicitas.enDoggystyle = estado;
            break;
        case 'misionero':
            estadoAccionesExplicitas.enMisionero = estado;
            break;
        case 'reverse_cowgirl':
        case 'cowgirl':
            estadoAccionesExplicitas.enReverseCowgirl = estado;
            break;
        case 'anal':
            estadoAccionesExplicitas.haciendoAnal = estado;
            break;
        case 'desnuda':
            estadoAccionesExplicitas.desnuda = estado;
            break;
        case 'mostrandoCulo':
            estadoAccionesExplicitas.mostrandoCulo = estado;
            break;
        case 'lamiendoAno':
            estadoAccionesExplicitas.lamiendoAno = estado;
            break;
        default:
            // Acción genérica - intentar detectar automáticamente
            for (const key of Object.keys(estadoAccionesExplicitas)) {
                if (accion.toLowerCase().includes(key)) {
                    estadoAccionesExplicitas[key] = estado;
                    break;
                }
            }
    }
    
    logQuinti('DEBUG', `Estado de acciones explícitas actualizado: ${JSON.stringify(estadoAccionesExplicitas)}`);
}

/**
 * Resetea todos los booleanos de acciones explícitas a false
 */
function resetearEstadoAccionesExplicitas() {
    for (const key of Object.keys(estadoAccionesExplicitas)) {
        estadoAccionesExplicitas[key] = false;
    }
}

/**
 * Actualiza la memoria de eventos íntimos cuando una acción termina
 * @param {string} accion - La acción que terminó
 */
function actualizarMemoriaEventosIntimos(accion) {
    switch (accion.toLowerCase()) {
        case 'besando':
            memoriaEventosIntimos.totalBesos++;
            break;
        case 'mamando':
        case 'chupando':
            memoriaEventosIntimos.totalMamadas++;
            break;
        case 'follando':
        case 'siendoFollada':
            memoriaEventosIntimos.totalFolladas++;
            break;
        case 'anal':
            memoriaEventosIntimos.totalAnal++;
            break;
        case 'handjob':
        case 'paja':
            memoriaEventosIntimos.totalHandjobs++;
            break;
    }
    
    logQuinti('INFO', `Memoria de eventos íntimos actualizada: ${JSON.stringify(memoriaEventosIntimos)}`);
}

/**
 * Registra un evento importante en la memoria
 * @param {string} descripcion - Descripción del evento
 */
function registrarEventoImportante(descripcion) {
    const evento = {
        timestamp: new Date().toISOString(),
        descripcion: descripcion,
        turno: historialConversacion.length
    };
    
    memoriaEventosIntimos.eventosImportantes.push(evento);
    
    // Mantener solo los últimos 30 eventos importantes
    if (memoriaEventosIntimos.eventosImportantes.length > MAX_EVENTOS_IMPORTANTES) {
        memoriaEventosIntimos.eventosImportantes.shift();
    }
    
    logQuinti('INFO', `📝 EVENTO IMPORTANTE REGISTRADO: ${descripcion}`);
}

/**
 * AGREGA UN HECHO A LA MEMORIA DE HECHOS
 * @param {string} categoria - Categoría del hecho (nombres, preferencias, lugares, objetos, eventosPasados, relaciones, datosPersonales, accionesRecientes)
 * @param {string} valor - El valor a recordar
 */
function agregarHechoMemoria(categoria, valor) {
    if (!memoriaHechos[categoria]) {
        memoriaHechos[categoria] = [];
    }
    
    // Verificar si ya existe para evitar duplicados
    const yaExiste = memoriaHechos[categoria].some(hecho => 
        hecho.toLowerCase().includes(valor.toLowerCase()) || 
        valor.toLowerCase().includes(hecho.toLowerCase())
    );
    
    if (!yaExiste && valor.trim() !== '') {
        memoriaHechos[categoria].push(valor);
        
        // Limitar cantidad por categoría
        if (memoriaHechos[categoria].length > MAX_HECHOS_POR_CATEGORIA) {
            memoriaHechos[categoria].shift();
        }
        
        logQuinti('INFO', `💾 HECHO GUARDADO [${categoria}]: ${valor}`);
    }
}

/**
 * ACTUALIZA LA MEMORIA DE TRABAJO CON CADA INTERACCIÓN
 * @param {string} mensajeUsuario - Mensaje del usuario
 * @param {string} respuestaAsistente - Respuesta de la chica
 */
function actualizarMemoriaTrabajo(mensajeUsuario, respuestaAsistente) {
    const intercambio = {
        usuario: mensajeUsuario,
        asistente: respuestaAsistente,
        timestamp: new Date().toISOString()
    };
    
    memoriaTrabajo.ultimosMensajes.push(intercambio);
    
    // Mantener solo los últimos MAX_MEMORIA_TRABAJO intercambios
    if (memoriaTrabajo.ultimosMensajes.length > MAX_MEMORIA_TRABAJO) {
        memoriaTrabajo.ultimosMensajes.shift();
    }
    
    memoriaTrabajo.tiempoUltimaInteraccion = Date.now();
    memoriaTrabajo.turnosEnTemaActual++;
    
    logQuinti('DEBUG', `🔄 MEMORIA DE TRABAJO ACTUALIZADA - Turnos en tema actual: ${memoriaTrabajo.turnosEnTemaActual}`);
}

/**
 * GENERA RESUMEN NARRATIVO PERIÓDICO
 * Se llama cada TURNOS_PARA_RESUMEN turnos para condensar la conversación
 */
function generarResumenNarrativo() {
    // Extraer puntos clave de los últimos mensajes
    const ultimosMensajes = memoriaTrabajo.ultimosMensajes.slice(-3);
    const puntosNuevos = ultimosMensajes.map(m => {
        const resumenCorto = m.usuario.substring(0, 50) + '...';
        return `- Usuario: ${resumenCorto}`;
    });
    
    // Actualizar el resumen general
    if (memoriaNarrativa.resumenGeneral === '') {
        memoriaNarrativa.resumenGeneral = 'Inicio de conversación. ' + puntosNuevos.join(' ');
    } else {
        memoriaNarrativa.resumenGeneral += ' Luego: ' + puntosNuevos.join(' ');
    }
    
    // Limitar longitud del resumen
    if (memoriaNarrativa.resumenGeneral.length > 1000) {
        memoriaNarrativa.resumenGeneral = memoriaNarrativa.resumenGeneral.substring(memoriaNarrativa.resumenGeneral.length - 1000);
    }
    
    memoriaNarrativa.ultimoResumenTurno = historialConversacion.length / 2;
    memoriaNarrativa.turnosDesdeUltimoResumen = 0;
    
    logQuinti('INFO', `📖 RESUMEN NARRATIVO GENERADO: ${memoriaNarrativa.resumenGeneral.substring(0, 150)}...`);
}

/**
 * OBTIENE EL ESTADO COMPLETO DE LA MEMORIA PARA INCLUIR EN EL PROMPT
 * @returns {string} - Texto formateado con toda la memoria relevante
 */
function obtenerEstadoMemoriaParaPrompt() {
    let estadoMemoria = '\\n\\n=== 🧠 SISTEMA DE MEMORIA ACTIVO ===\\n';
    
    // 1. Memoria Narrativa (Resumen general)
    if (memoriaNarrativa.resumenGeneral) {
        estadoMemoria += `📖 RESUMEN CONVERSACIÓN: ${memoriaNarrativa.resumenGeneral}\\n`;
    }
    
    // 2. Memoria de Hechos (Datos importantes)
    const hechosRelevantes = [];
    if (memoriaHechos.nombres.length > 0) {
        hechosRelevantes.push(`Nombres: ${memoriaHechos.nombres.slice(-5).join(', ')}`);
    }
    if (memoriaHechos.preferencias.length > 0) {
        hechosRelevantes.push(`Gustos: ${memoriaHechos.preferencias.slice(-5).join(', ')}`);
    }
    if (memoriaHechos.lugares.length > 0) {
        hechosRelevantes.push(`Lugares: ${memoriaHechos.lugares.slice(-5).join(', ')}`);
    }
    if (memoriaHechos.datosPersonales.length > 0) {
        hechosRelevantes.push(`Datos personales: ${memoriaHechos.datosPersonales.slice(-5).join(', ')}`);
    }
    if (memoriaHechos.accionesRecientes.length > 0) {
        hechosRelevantes.push(`Acciones recientes: ${memoriaHechos.accionesRecientes.slice(-5).join(', ')}`);
    }
    
    if (hechosRelevantes.length > 0) {
        estadoMemoria += `💾 DATOS RECORDADOS: ${hechosRelevantes.join(' | ')}\\n`;
    }
    
    // 3. Memoria de Eventos Íntimos
    if (memoriaEventosIntimos.totalBesos > 0 || memoriaEventosIntimos.totalMamadas > 0 || 
        memoriaEventosIntimos.totalFolladas > 0 || memoriaEventosIntimos.totalAnal > 0 ||
        memoriaEventosIntimos.totalHandjobs > 0) {
        estadoMemoria += `🔥 HISTORIAL ÍNTIMO: Besos(${memoriaEventosIntimos.totalBesos}) | Mamadas(${memoriaEventosIntimos.totalMamadas}) | Folladas(${memoriaEventosIntimos.totalFolladas}) | Anal(${memoriaEventosIntimos.totalAnal}) | Handjobs(${memoriaEventosIntimos.totalHandjobs})\\n`;
    }
    
    // 4. Acción en curso
    if (accionEnCurso) {
        estadoMemoria += `⚡ ACCIÓN EN CURSO: ${accionEnCurso} (desde hace ${contadorTurnosAccion} turnos)\\n`;
    }
    
    // 5. Últimos eventos importantes
    if (memoriaEventosIntimos.eventosImportantes.length > 0) {
        const ultimosEventos = memoriaEventosIntimos.eventosImportantes.slice(-5);
        estadoMemoria += `📌 EVENTOS RECIENTES:\\n`;
        ultimosEventos.forEach(evento => {
            estadoMemoria += `   - ${evento.descripcion}\\n`;
        });
    }
    
    estadoMemoria += `=================================\\n`;
    
    return estadoMemoria;
}

/**
 * PROCESA EL MENSAJE DEL USUARIO PARA EXTRAER INFORMACIÓN Y GUARDARLA EN MEMORIA
 * @param {string} mensaje - Mensaje del usuario
 */
function procesarMensajeParaMemoria(mensaje) {
    const mensajeLower = mensaje.toLowerCase();
    
    // Detectar nombres propios (palabras capitalizadas después de ciertos patrones)
    const patronesNombre = [/me llamo (\w+)/i, /mi nombre es (\w+)/i, /soy (\w+)/i];
    for (const patron of patronesNombre) {
        const match = mensaje.match(patron);
        if (match && match[1]) {
            agregarHechoMemoria('nombres', match[1]);
        }
    }
    
    // Detectar preferencias (me gusta, prefiero, odio, etc.)
    const patronesPreferencia = [/me gusta(n)? ([^.]+)/i, /prefiero ([^.]+)/i, /odio ([^.]+)/i, /no me gusta ([^.]+)/i];
    for (const patron of patronesPreferencia) {
        const match = mensaje.match(patron);
        if (match && match[2]) {
            agregarHechoMemoria('preferencias', match[2].trim().substring(0, 50));
        }
    }
    
    // Detectar lugares (estoy en, vamos a, en el/la)
    const patronesLugar = [/estoy en ([^.]+)/i, /vamos a ([^.]+)/i, /en el ([^.]+)/i, /en la ([^.]+)/i];
    for (const patron of patronesLugar) {
        const match = mensaje.match(patron);
        if (match && match[1]) {
            agregarHechoMemoria('lugares', match[1].trim().substring(0, 50));
        }
    }
    
    // Detectar acción en curso y guardarla
    const accionesPosibles = ['besando', 'mamando', 'chupando', 'follando', 'tocando', 'lamiendo', 'penetrando'];
    for (const accion of accionesPosibles) {
        if (mensajeLower.includes(accion)) {
            agregarHechoMemoria('accionesRecientes', accion);
            break;
        }
    }
    
    logQuinti('DEBUG', `🔍 MENSAJE PROCESADO PARA MEMORIA: "${mensaje.substring(0, 50)}..."`);
}

/**
 * Obtiene el estado de una acción específica
 * @param {string} accion - Nombre de la acción a verificar
 * @returns {boolean} - True si la acción está activa
 */
function getEstadoAccion(accion) {
    return estadoAccionesExplicitas[accion] || false;
}

/**
 * Obtiene toda la memoria de eventos íntimos
 * @returns {object} - Objeto con contadores y eventos
 */
function getMemoriaEventosIntimos() {
    return { ...memoriaEventosIntimos };
}

/**
 * Obtiene la acción en curso actual
 * @returns {string|null} - La acción en curso o null
 */
function getAccionEnCurso() {
    return accionEnCurso;
}

// ============================================================
//  NUEVA FUNCIÓN: VERIFICACIÓN DINÁMICA DE ACCIÓN EN CURSO
//  Consulta a la API para verificar si la acción anterior se detuvo
//  o si hay una nueva acción basada en el contexto real
// ============================================================

/**
 * Verifica dinámicamente con la API si la acción en curso continúa o cambió
 * Esta función hace una llamada ligera a la API para determinar la acción correcta
 * basada en el mensaje del usuario, la respuesta de la IA y las imágenes disponibles
 * 
 * @param {string} mensajeUsuario - El mensaje original del usuario
 * @param {string} respuestaIA - La respuesta completa de la IA
 * @param {string} chicaNombre - Nombre de la chica actual
 * @param {string} accionAnterior - La acción que estaba en curso previamente (o null)
 * @returns {Promise<{accion: string|null, cambioDetectado: boolean}>} - La acción verificada y si hubo cambio
 */
async function verificarAccionEnCurso(mensajeUsuario, respuestaIA, chicaNombre, accionAnterior) {
    const infoChica = QuintiImagenesPrueba[chicaNombre];
    if (!infoChica || !infoChica.imagenes) {
        logQuinti('DEBUG', `No hay imágenes para ${chicaNombre}, usando acción anterior`);
        return { accion: accionAnterior, cambioDetectado: false };
    }
    
    const tagsDisponibles = Object.keys(infoChica.imagenes);
    
    // Primero intentar detectar localmente sin llamada a API
    // Esto es más rápido y evita llamadas innecesarias
    
    // 1. Detectar acción en el mensaje del usuario (prioridad máxima)
    const resultadoMensaje = detectarAccionEnTexto(mensajeUsuario);
    const accionEnMensaje = resultadoMensaje.tag;
    
    if (accionEnMensaje && tagsDisponibles.includes(accionEnMensaje)) {
        logQuinti('INFO', `[VERIFICACIÓN] Acción detectada en mensaje del usuario: ${accionEnMensaje} (puntuación: ${resultadoMensaje.puntuacion})`);
        return { 
            accion: accionEnMensaje, 
            cambioDetectado: accionAnterior !== accionEnMensaje,
            detalle: resultadoMensaje
        };
    }
    
    // 2. Detectar acción en la respuesta de la IA (asteriscos)
    const resultadoRespuesta = detectarAccionEnTexto(respuestaIA);
    const accionEnRespuesta = resultadoRespuesta.tag;
    
    if (accionEnRespuesta && tagsDisponibles.includes(accionEnRespuesta)) {
        logQuinti('INFO', `[VERIFICACIÓN] Acción detectada en respuesta IA: ${accionEnRespuesta} (puntuación: ${resultadoRespuesta.puntuacion})`);
        return { 
            accion: accionEnRespuesta, 
            cambioDetectado: accionAnterior !== accionEnRespuesta,
            detalle: resultadoRespuesta
        };
    }
    
    // 3. Si hay una acción anterior y no se detectó nada nuevo, verificar si debería continuar
    if (accionAnterior && tagsDisponibles.includes(accionAnterior)) {
        // Buscar indicios de que la acción continuó en el contexto
        const palabrasContinuidad = ['sigue', 'continúa', 'mientras', 'todavía', 'aún', 'sigo', 'seguimos'];
        const contextoLower = (mensajeUsuario + ' ' + respuestaIA).toLowerCase();
        
        const hayContinuidad = palabrasContinuidad.some(palabra => contextoLower.includes(palabra));
        
        if (hayContinuidad) {
            logQuinti('INFO', `[VERIFICACIÓN] Acción ${accionAnterior} continúa por contexto`);
            return { accion: accionAnterior, cambioDetectado: false };
        }
        
        // Buscar indicios de que la acción terminó
        const palabrasFinAccion = ['termin', 'par', 'alto', 'basta', 'suficiente', 'después', 'luego', 'ya está'];
        const hayFinAccion = palabrasFinAccion.some(palabra => contextoLower.includes(palabra));
        
        if (hayFinAccion) {
            logQuinti('INFO', `[VERIFICACIÓN] Acción ${accionAnterior} terminó según contexto`);
            return { accion: 'hablando', cambioDetectado: true };
        }
        
        // Si no hay indicios claros, mantener la acción anterior (inercia de contexto)
        logQuinti('DEBUG', `[VERIFICACIÓN] Manteniendo acción ${accionAnterior} por inercia`);
        return { accion: accionAnterior, cambioDetectado: false };
    }
    
    // 4. Fallback: usar 'hablando' como default
    logQuinti('DEBUG', `[VERIFICACIÓN] Sin acción detectada, usando 'hablando'`);
    return { accion: tagsDisponibles.includes('hablando') ? 'hablando' : tagsDisponibles[0], cambioDetectado: false };
}

// ============================================================
//  SISTEMA DE LOGGING
// ============================================================

/**
 * Sistema de logging con timestamps y niveles de severidad
 */
function logQuinti(nivel, mensaje, datosExtra = null) {
    const timestamp = new Date().toLocaleTimeString('es-ES');
    const prefijo = `[QUINTI ${nivel}] ${timestamp}`;
    
    switch (nivel.toUpperCase()) {
        case 'ERROR':
            console.error(`${prefijo} ${mensaje}`);
            if (datosExtra) console.error(`${prefijo} Datos:`, datosExtra);
            break;
        case 'WARN':
            console.warn(`${prefijo} ${mensaje}`);
            if (datosExtra) console.warn(`${prefijo} Datos:`, datosExtra);
            break;
        case 'DEBUG':
            console.log(`${prefijo} ${mensaje}`);
            if (datosExtra) console.log(`${prefijo} Datos:`, datosExtra);
            break;
        default:
            console.log(`${prefijo} ${mensaje}`);
            if (datosExtra) console.log(`${prefijo} Datos:`, datosExtra);
    }
}

function logErrorAPI(contexto, error, metadata = {}) {
    logQuinti('ERROR', `Error en ${contexto}: ${error.message}`, {
        stack: error.stack,
        ...metadata
    });
}

function logReintento(intento, maxIntentos, razon) {
    logQuinti('WARN', `Reintento ${intento}/${maxIntentos}: ${razon}`);
}

function logRespuestaExitosa(modelo, longitudRespuesta, tiempoRespuesta) {
    logQuinti('INFO', `Respuesta exitosa - Modelo: ${modelo}, Longitud: ${longitudRespuesta} chars, Tiempo: ${tiempoRespuesta}ms`);
}

function logSeleccionImagen(chica, tag, contexto) {
    logQuinti('DEBUG', `Imagen seleccionada - Chica: ${chica}, Tag: ${tag}, Contexto: ${contexto}`);
}

// ============================================================
//  PROMPTS DE REINTENTOS (multi-fase como quintillizas.js)
//  NOTA: Estos prompts ahora están en systemprompt.js
//  Se mantienen aquí como referencias rápidas pero se importan del módulo
// ============================================================
// Importados desde systemprompt.js:
// - QUINT_PRUEBA_SYSTEM_MINIMO
// - QUINT_PRUEBA_FASE1
// - QUINT_PRUEBA_FASE2
// - QUINT_PRUEBA_FASE3
// - QUINT_PRUEBA_FASE4
// - generarSystemPrompt()

// ============================================================
//  PERSONALIDADES DE CHICAS
//  NOTA: Las personalidades ahora están en personalidades.js
//  Se mantiene el objeto PERSONALIDADES importado del módulo
// ============================================================
// Importado desde personalidades.js:
// - PERSONALIDADES (objeto con todas las chicas)
// - getPersonalidad(nombreChica)
// - getChicasDisponibles()
// - existeChica(nombreChica)

// ============================================================
//  SISTEMA DE SELECCIÓN DE IMÁGENES
// ============================================================

/**
 * Obtiene todas las tags de imagen disponibles para una chica
 * @param {string} nombreChica - Nombre de la chica
 * @returns {string[]} - Array con los nombres de las imágenes disponibles
 */
function obtenerTagsImagen(nombreChica) {
    if (!QuintiImagenesPrueba || !QuintiImagenesPrueba[nombreChica]) {
        return ['normal'];
    }
    const chicaData = QuintiImagenesPrueba[nombreChica];
    if (!chicaData.imagenes) {
        return ['normal'];
    }
    return Object.keys(chicaData.imagenes);
}

/**
 * Calcula el score de similitud entre dos strings usando múltiples criterios
 * @param {string} tag1 - Primer tag
 * @param {string} tag2 - Segundo tag
 * @returns {number} - Score de 0 a 100
 */
function calcularSimilitudTags(tag1, tag2) {
    if (!tag1 || !tag2) return 0;
    
    // Normalizar ambos tags
    const t1 = tag1.toLowerCase().replace(/_/g, ' ').trim();
    const t2 = tag2.toLowerCase().replace(/_/g, ' ').trim();
    
    // Coincidencia exacta
    if (t1 === t2) return 100;
    
    // Verificar si uno contiene al otro
    if (t1.includes(t2) || t2.includes(t1)) {
        const shorter = t1.length < t2.length ? t1 : t2;
        const longer = t1.length < t2.length ? t2 : t1;
        const ratio = shorter.length / longer.length;
        return 70 + (ratio * 30); // 70-100 basado en cuánto del string más largo está contenido
    }
    
    // Dividir en palabras y comparar
    const palabras1 = t1.split(' ').filter(p => p.length > 2);
    const palabras2 = t2.split(' ').filter(p => p.length > 2);
    
    if (palabras1.length === 0 || palabras2.length === 0) return 0;
    
    // Contar palabras coincidentes
    let coincidencias = 0;
    for (const p1 of palabras1) {
        for (const p2 of palabras2) {
            // Coincidencia exacta de palabra
            if (p1 === p2) {
                coincidencias++;
                break;
            }
            // Coincidencia parcial (una contiene a la otra)
            if (p1.includes(p2) || p2.includes(p1)) {
                coincidencias += 0.5;
                break;
            }
        }
    }
    
    const maxPalabras = Math.max(palabras1.length, palabras2.length);
    const porcentajePalabras = (coincidencias / maxPalabras) * 100;
    
    // Bonus por tener raíces similares
    let bonusRaiz = 0;
    const raicesComunes = [];
    for (const p1 of palabras1) {
        for (const p2 of palabras2) {
            // Si comparten los primeros 4 caracteres
            if (p1.length >= 4 && p2.length >= 4 && p1.substring(0, 4) === p2.substring(0, 4)) {
                raicesComunes.push(p1);
            }
        }
    }
    if (raicesComunes.length > 0) {
        bonusRaiz = Math.min(20, raicesComunes.length * 5);
    }
    
    return Math.min(100, porcentajePalabras + bonusRaiz);
}

/**
 * Encuentra el tag de imagen más pertinente basado en el contexto y acción descrita
 * Usa múltiples parámetros y condiciones para mejorar la precisión
 * @param {string} tagSolicitado - Tag que la IA intentó usar
 * @param {string[]} tagsDisponibles - Array de tags disponibles para esta chica
 * @param {string} dialogoContexto - El diálogo completo para extraer contexto adicional
 * @returns {string} - El tag más apropiado o null si no se encuentra coincidencia
 */
function encontrarTagMasPertinente(tagSolicitado, tagsDisponibles, dialogoContexto = '') {
    if (!tagSolicitado || !tagsDisponibles || tagsDisponibles.length === 0) {
        return null;
    }
    
    logQuinti('DEBUG', `Buscando tag pertinente: "${tagSolicitado}" entre ${tagsDisponibles.length} opciones`);
    
    const tagNormalizado = tagSolicitado.toLowerCase().replace(/_/g, ' ').trim();
    
    // ============================================
    // CRITERIO 1: Búsqueda exacta directa
    // ============================================
    if (tagsDisponibles.includes(tagSolicitado)) {
        logQuinti('DEBUG', `Coincidencia EXACTA encontrada: ${tagSolicitado}`);
        return tagSolicitado;
    }
    
    // ============================================
    // CRITERIO 2: Búsqueda normalizada (sin guiones bajos)
    // ============================================
    for (const tag of tagsDisponibles) {
        const tagNorm = tag.toLowerCase().replace(/_/g, ' ');
        if (tagNorm === tagNormalizado) {
            logQuinti('DEBUG', `Coincidencia NORMALIZADA: "${tagSolicitado}" -> "${tag}"`);
            return tag;
        }
    }
    
    // ============================================
    // CRITERIO 3: Inclusión de strings (uno contiene al otro)
    // ============================================
    for (const tag of tagsDisponibles) {
        const tagNorm = tag.toLowerCase().replace(/_/g, ' ');
        if (tagNorm.includes(tagNormalizado) || tagNormalizado.includes(tagNorm)) {
            logQuinti('DEBUG', `Coincidencia por INCLUSIÓN: "${tagSolicitado}" -> "${tag}"`);
            return tag;
        }
    }
    
    // ============================================
    // CRITERIO 4: PRIORIZAR ACCIÓN PRINCIPAL (VERBO) - MEJORA CRÍTICA
    // Extraer el verbo/acción principal y buscar coincidencia exacta de acción
    // Esto evita que "chupando_tetas" matchee con "agarra_tetas"
    // ============================================
    // Mapeo de variaciones verbales (gerundio, infinitivo, presente, etc.)
    const variacionesAcciones = {
        'chupando': ['chupando', 'chupa', 'chupar', 'chupé', 'chupaba'],
        'mamando': ['mamando', 'mama', 'mamar', 'mamé', 'mamaba'],
        'besando': ['besando', 'besa', 'besar', 'besé', 'besaba'],
        'follando': ['follando', 'folla', 'follar', 'follé', 'follaba'],
        'tocando': ['tocando', 'toca', 'tocar', 'toqué', 'tocaba'],
        'agarrando': ['agarrando', 'agarra', 'agarrar', 'agarré', 'agarraba'],
        'lamiendo': ['lamiendo', 'lame', 'lamer', 'lamí', 'lamía'],
        'penetrando': ['penetrando', 'penetra', 'penetrar', 'penetré', 'penetraba'],
        'corriendo': ['corriendo', 'corre', 'correr', 'corrí', 'corría'],
        'eyaculando': ['eyaculando', 'eyacula', 'eyacular', 'eyaculé', 'eyaculaba'],
        'mostrando': ['mostrando', 'muestra', 'mostrar', 'mostré', 'mostraba'],
        'enseñando': ['enseñando', 'enseña', 'enseñar', 'enseñé', 'enseñaba'],
        'quitando': ['quitando', 'quita', 'quitar', 'quité', 'quitaba'],
        'desvistiendo': ['desvistiendo', 'desviste', 'desvestir', 'desvestí', 'desvestía'],
        'moviendo': ['moviendo', 'mueve', 'mover', 'moví', 'movía'],
        'sujetando': ['sujetando', 'sujeta', 'sujetar', 'sujeté', 'sujetaba'],
        'empujando': ['empujando', 'empuja', 'empujar', 'empujé', 'empujaba']
    };
    
    // Detectar acción principal en el tag solicitado
    let accionPrincipalSolicitada = null;
    let formaVerbalDetectada = null;
    for (const [accionBase, variaciones] of Object.entries(variacionesAcciones)) {
        for (const variacion of variaciones) {
            if (tagNormalizado.includes(variacion)) {
                accionPrincipalSolicitada = accionBase;
                formaVerbalDetectada = variacion;
                break;
            }
        }
        if (accionPrincipalSolicitada) break;
    }
    
    // Si hay una acción principal, buscar tags que tengan ESA acción específica (en cualquier variación)
    if (accionPrincipalSolicitada) {
        logQuinti('DEBUG', `Acción principal detectada: "${formaVerbalDetectada}" (base: ${accionPrincipalSolicitada}) en "${tagSolicitado}"`);
        
        // Obtener todas las variaciones de esta acción para buscar en los tags disponibles
        const variacionesDeAccion = variacionesAcciones[accionPrincipalSolicitada];
        
        // Primero buscar coincidencia exacta de acción + objeto similar
        for (const tag of tagsDisponibles) {
            const tagNorm = tag.toLowerCase().replace(/_/g, ' ');
            
            // Verificar si el tag disponible tiene ALGUNA variación de la acción principal
            let variacionEncontrada = null;
            for (const variacion of variacionesDeAccion) {
                if (tagNorm.includes(variacion)) {
                    variacionEncontrada = variacion;
                    break;
                }
            }
            
            if (variacionEncontrada) {
                logQuinti('DEBUG', `  Tag "${tag}" tiene variación "${variacionEncontrada}" de la acción "${accionPrincipalSolicitada}"`);
                
                // Ahora verificar si también coincide el objeto/contexto
                // Remover la variación encontrada del tag para comparar el resto
                const palabrasRestantesSolicitado = tagNormalizado.replace(formaVerbalDetectada, '').split(' ').filter(p => p.length > 2);
                const palabrasRestantesTag = tagNorm.replace(variacionEncontrada, '').split(' ').filter(p => p.length > 2);
                
                let coincidenciasObjeto = 0;
                for (const palabraS of palabrasRestantesSolicitado) {
                    for (const palabraT of palabrasRestantesTag) {
                        if (palabraS.includes(palabraT) || palabraT.includes(palabraS) || palabraS === palabraT) {
                            coincidenciasObjeto++;
                            break;
                        }
                    }
                }
                
                // Si coincide al menos un objeto o no hay objetos específicos
                if (coincidenciasObjeto > 0 || palabrasRestantesSolicitado.length === 0) {
                    logQuinti('DEBUG', `Coincidencia por ACCIÓN PRINCIPAL (${formaVerbalDetectada}->${variacionEncontrada}): "${tagSolicitado}" -> "${tag}"`);
                    return tag;
                }
            }
        }
    }
    
    // ============================================
    // CRITERIO 5: Similitud de palabras clave principales (sin priorizar acción)
    // Extraer sustantivos/verbos clave del tag solicitado
    // ============================================
    const palabrasClave = tagNormalizado.split(' ').filter(p => p.length > 3);
    
    if (palabrasClave.length > 0) {
        for (const tag of tagsDisponibles) {
            const tagNorm = tag.toLowerCase().replace(/_/g, ' ');
            let coincidenciasCount = 0;
            
            for (const palabra of palabrasClave) {
                if (tagNorm.includes(palabra) || palabra.includes(tagNorm.replace(/_/g, ' '))) {
                    coincidenciasCount++;
                }
            }
            
            // Si coincide más del 50% de las palabras clave
            if (coincidenciasCount >= Math.ceil(palabrasClave.length * 0.5)) {
                logQuinti('DEBUG', `Coincidencia por PALABRAS CLAVE (${coincidenciasCount}/${palabrasClave.length}): "${tagSolicitado}" -> "${tag}"`);
                return tag;
            }
        }
    }
    
    // ============================================
    // CRITERIO 5: Cálculo de similitud scoring
    // ============================================
    let mejorTag = null;
    let mejorScore = 0;
    
    for (const tag of tagsDisponibles) {
        const score = calcularSimilitudTags(tagSolicitado, tag);
        
        // Ajustar score basado en contexto del diálogo
        let scoreAjustado = score;
        if (dialogoContexto) {
            const dialogoLower = dialogoContexto.toLowerCase();
            const tagNorm = tag.toLowerCase().replace(/_/g, ' ');
            
            // Bonus si el tag aparece en el diálogo
            if (dialogoLower.includes(tagNorm)) {
                scoreAjustado += 15;
            }
            
            // Bonus si palabras del tag aparecen en el diálogo
            const palabrasTag = tagNorm.split(' ').filter(p => p.length > 3);
            for (const palabra of palabrasTag) {
                if (dialogoLower.includes(palabra)) {
                    scoreAjustado += 5;
                }
            }
        }
        
        if (scoreAjustado > mejorScore) {
            mejorScore = scoreAjustado;
            mejorTag = tag;
        }
    }
    
    // Solo retornar si el score es suficientemente alto (mínimo 60%)
    if (mejorScore >= 60) {
        logQuinti('DEBUG', `Coincidencia por SIMILITUD (score: ${mejorScore.toFixed(1)}): "${tagSolicitado}" -> "${mejorTag}"`);
        return mejorTag;
    }
    
    // ============================================
    // CRITERIO 6: Búsqueda por categoría semántica
    // Mapeo de conceptos relacionados - AHORA CON ACCIONES ESPECÍFICAS
    // ============================================
    const mapeoSemanitico = {
        'desvestir': ['quitandose_la_ropa', 'desnuda', 'mostrando_bra'],
        'ropa': ['quitandose_la_ropa', 'ropa_elegante', 'ropa_sexy', 'desnuda'],
        'besar': ['besando', 'abriendo_la_boca_para_besar'],
        'chupar': ['chupando_solo_la_punta_del_pene', 'chupando_todo_el_pene', 'chupando_bolas', 'lamiendo_pene'],
        'follar': ['doggystyle', 'misionero', 'reverse_cowgirl', 'standfuck_follando_de_pie'],
        'ano': ['anal', 'enseñando_ano', 'rozo_mi_verga_en_su_ano'],
        'culo': ['moviendo_el_culo', 'mostrando_culo_tanga_negra', 'le_agarro_el_culo'],
        'pecho': ['mostrando_tetas', 'mostrando_bra'],
        'mano': ['handjob_paja', 'manos_alrededor_del_cuello'],
        // Acciones específicas con tetas/pechos - PRIORIZAR LA ACCIÓN CORRECTA
        // Solo Ichika tiene estas tags por ahora
        'chupando_tetas': ['usuario_chupa_tetas_de_ichika'],
        'chupa_tetas': ['usuario_chupa_tetas_de_ichika'],
        'agarra_tetas': ['usuario_agarra_tetas_de_ichika'],
        'toca_tetas': ['usuario_toca_tetas_de_ichika']
    };
    
    for (const [concepto, tagsRelacionados] of Object.entries(mapeoSemanitico)) {
        if (tagNormalizado.includes(concepto)) {
            for (const tagRelacionado of tagsRelacionados) {
                if (tagsDisponibles.includes(tagRelacionado)) {
                    logQuinti('DEBUG', `Coincidencia SEMÁNTICA: "${tagSolicitado}" (concepto: ${concepto}) -> "${tagRelacionado}"`);
                    return tagRelacionado;
                }
            }
        }
    }
    
    // ============================================
    // CRITERIO 7: Búsqueda por raíz de palabra (MEJORA NUEVA)
    // Comparar raíces de palabras ignorando variaciones menores
    // ============================================
    const palabrasSolicitado = tagNormalizado.split(' ').filter(p => p.length > 2);
    for (const tag of tagsDisponibles) {
        const tagNorm = tag.toLowerCase().replace(/_/g, ' ');
        const palabrasTag = tagNorm.split(' ').filter(p => p.length > 2);
        
        // Contar cuántas palabras comparten la misma raíz (primeros 4-5 caracteres)
        let coincidenciasRaiz = 0;
        for (const palabraS of palabrasSolicitado) {
            for (const palabraT of palabrasTag) {
                const minLen = Math.min(palabraS.length, palabraT.length);
                if (minLen >= 4 && palabraS.substring(0, Math.min(5, minLen)) === palabraT.substring(0, Math.min(5, minLen))) {
                    coincidenciasRaiz++;
                    break;
                }
                // También verificar si una palabra contiene a la otra
                if (palabraS.includes(palabraT) || palabraT.includes(palabraS)) {
                    coincidenciasRaiz++;
                    break;
                }
            }
        }
        
        // Si al menos la mitad de las palabras coinciden por raíz
        if (coincidenciasRaiz >= Math.ceil(Math.max(palabrasSolicitado.length, palabrasTag.length) * 0.5)) {
            logQuinti('DEBUG', `Coincidencia por RAÍZ DE PALABRA (${coincidenciasRaiz} coincidencias): "${tagSolicitado}" -> "${tag}"`);
            return tag;
        }
    }
    
    // ============================================
    // CRITERIO 8: Búsqueda por patrón de acción similar (MEJORA NUEVA)
    // Para acciones como "quitando_la_ropa2" vs "quitandose_la_ropa_2"
    // ============================================
    const patronAccion = /(?:quitando|quitandose|desvistiendo|sacando)\s*(?:la\s*)?(?:ropa)?/i;
    if (patronAccion.test(tagNormalizado)) {
        for (const tag of tagsDisponibles) {
            const tagNorm = tag.toLowerCase().replace(/_/g, ' ');
            if (patronAccion.test(tagNorm)) {
                logQuinti('DEBUG', `Coincidencia por PATRÓN DE ACCIÓN: "${tagSolicitado}" -> "${tag}"`);
                return tag;
            }
        }
    }
    
    // No se encontró coincidencia suficiente
    logQuinti('DEBUG', `No se encontró coincidencia pertinente para "${tagSolicitado}" (mejor score: ${mejorScore.toFixed(1)})`);
    return null;
}

/**
 * Selecciona automáticamente la mejor imagen basada en el contenido del diálogo
 * La IA decide qué imagen usar incluyendo las tags disponibles en el prompt
 * @param {string} dialogo - El diálogo generado por la IA
 * @param {string} nombreChica - Nombre de la chica
 * @returns {string} - Tag de la imagen seleccionada
 */
function seleccionarImagenAutomatica(dialogo, nombreChica) {
    const tagsDisponibles = obtenerTagsImagen(nombreChica);
    
    // Normalizar diálogo para búsqueda
    const dialogoLower = dialogo.toLowerCase();
    
    // Buscar coincidencias con las tags disponibles
    for (const tag of tagsDisponibles) {
        const tagNormalizado = tag.toLowerCase().replace(/_/g, ' ');
        if (dialogoLower.includes(tagNormalizado)) {
            logSeleccionImagen(nombreChica, tag, 'Coincidencia directa en diálogo');
            return tag;
        }
    }
    
    // Búsquedas específicas para acciones comunes
    if (dialogoLower.includes('bes') || dialogoLower.includes('kiss')) {
        if (tagsDisponibles.includes('besando')) {
            logSeleccionImagen(nombreChica, 'besando', 'Acción de beso detectada');
            return 'besando';
        }
    }
    
    if (dialogoLower.includes('chup') || dialogoLower.includes('oral')) {
        // Buscar tags de chupar más específicas
        for (const tag of tagsDisponibles) {
            if (tag.includes('chupando')) {
                logSeleccionImagen(nombreChica, tag, 'Acción oral detectada');
                return tag;
            }
        }
    }
    
    if (dialogoLower.includes('doggy') || dialogoLower.includes('cuatro patas')) {
        if (tagsDisponibles.includes('doggystyle')) {
            logSeleccionImagen(nombreChica, 'doggystyle', 'Posición doggy detectada');
            return 'doggystyle';
        }
    }
    
    if (dialogoLower.includes('misionero') || dialogoLower.includes('encima')) {
        if (tagsDisponibles.includes('misionero')) {
            logSeleccionImagen(nombreChica, 'misionero', 'Posición misionero detectada');
            return 'misionero';
        }
    }
    
    if (dialogoLower.includes('desnud') || dialogoLower.includes('sin ropa')) {
        if (tagsDisponibles.includes('desnuda')) {
            logSeleccionImagen(nombreChica, 'desnuda', 'Desnudez detectada');
            return 'desnuda';
        }
    }
    
    // Por defecto, usar imagen normal o hablando
    const fallback = tagsDisponibles.includes('hablando') ? 'hablando' : 'normal';
    logSeleccionImagen(nombreChica, fallback, 'Fallback por defecto');
    return fallback;
}

// ============================================================
//  FUNCIONES DE UTILIDAD PARA JSON
// ============================================================

/**
 * Parsea JSON eliminando posibles bloques de código markdown y texto extra
 * @param {string} raw - Texto crudo de la respuesta
 * @returns {object|null} - Objeto parseado o null si falla
 */
/**
 * Parsea contenido JSON de respuesta de la IA con múltiples estrategias de fallback
 * @param {string} raw - Contenido crudo de la respuesta
 * @returns {object|null} - Objeto JSON parseado o null si falla
 */
/**
 * PARSEA RESPUESTA JSON DE LA IA CON MÚLTIPLES ESTRATEGIAS
 * Maneja casos donde la IA devuelve texto narrativo en lugar de JSON puro
 * @param {string} raw - Respuesta cruda de la API
 * @returns {object|null} - Objeto parseado o null si falla todo
 */
function parsearJSON(raw) {
    if (!raw) {
        logQuinti('ERROR', 'parsearJSON: contenido vacío o null');
        return null;
    }
    
    // Guardar el texto original completo antes de cualquier limpieza
    const textoOriginalCompleto = raw;
    let texto = raw.trim();

    // ==========================================
    // LIMPIEZA INICIAL AGRESIVA
    // ==========================================
    texto = texto
        .replace(/```json|```/gi, '')           // Eliminar bloques de código markdown
        .replace(/^\s*\[[^\]]+\]\s*:\s*/i, '')  // Eliminar [Ichika]:, [Yume]:, etc.
        .replace(/^[\u200B-\u200D\uFEFF\s]+/, '') // Eliminar caracteres Unicode invisibles
        .replace(/\n\s*\n/g, '\n')              // Eliminar líneas vacías múltiples
        .trim();

    // ==========================================
    // ESTRATEGIA 1: Extraer el JSON más grande posible (la más común)
    // ==========================================
    const jsonMatch = texto.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
        try {
            const parsed = JSON.parse(jsonMatch[0]);
            parsed.texto_original = textoOriginalCompleto;
            return parsed;
        } catch (e) {
            logQuinti('DEBUG', `parsearJSON: Estrategia 1 falló - ${e.message}`);
        }
    }

    // ==========================================
    // ESTRATEGIA 2: Buscar JSON después de dos puntos (caso "aquí tienes: {...}")
    // ==========================================
    const despuesDeDosPuntos = texto.split(':').pop();
    if (despuesDeDosPuntos && despuesDeDosPuntos.includes('{')) {
        const jsonMatch2 = despuesDeDosPuntos.match(/\{[\s\S]*\}/);
        if (jsonMatch2) {
            try {
                const parsed = JSON.parse(jsonMatch2[0]);
                parsed.texto_original = textoOriginalCompleto;
                return parsed;
            } catch (e) {
                logQuinti('DEBUG', `parsearJSON: Estrategia 2 falló - ${e.message}`);
            }
        }
    }

    // ==========================================
    // ESTRATEGIA 3: Si todo el texto parece JSON (caso raro)
    // ==========================================
    try {
        const parsed = JSON.parse(texto);
        parsed.texto_original = textoOriginalCompleto;
        return parsed;
    } catch (e) {}

    // ==========================================
    // ESTRATEGIA 4: Intentar extraer JSON aunque tenga texto narrativo antes/después
    // Busca patrones como {"respuesta": "..."} incluso con ruido alrededor
    // ==========================================
    const jsonConRuido = texto.match(/\{\s*["']\w+["']\s*:[\s\S]*?\}/);
    if (jsonConRuido) {
        // Intentar limpiar el contenido interno
        let candidato = jsonConRuido[0];
        
        // Reparar comillas curvas y caracteres problemáticos
        candidato = candidato
            .replace(/"|"/g, '"')      // Comillas curvas dobles
            .replace(/'|'/g, "'")      // Comillas curvas simples
            .replace(/—|–/g, '-')      // Guiones largos
            .replace(/\n/g, '\\n');    // Saltos de línea reales a escapados
        
        try {
            const parsed = JSON.parse(candidato);
            parsed.texto_original = textoOriginalCompleto;
            logQuinti('INFO', 'parsearJSON: Estrategia 4 exitosa (JSON con ruido)');
            return parsed;
        } catch (e) {
            logQuinti('DEBUG', `parsearJSON: Estrategia 4 falló - ${e.message}`);
        }
    }

    // ==========================================
    // ESTRATEGIA 5: Último intento - reparación agresiva
    // Limpia comillas, escapa caracteres y repara JSON malformed
    // ==========================================
    let reparado = texto
        .replace(/"|"/g, '"')           // Comillas curvas dobles → rectas
        .replace(/'|'/g, "'")           // Comillas curvas simples → rectas
        .replace(/\\n/g, '\\\\n')       // Escapar saltos de línea
        .replace(/\t/g, '\\\\t')        // Escapar tabs
        .replace(/,\s*}/g, '}')         // Eliminar comas finales antes de }
        .replace(/,\s*]/g, ']')         // Eliminar comas finales antes de ]
        .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":'); // Asegurar comillas en keys

    try {
        const parsed = JSON.parse(reparado);
        parsed.texto_original = textoOriginalCompleto;
        logQuinti('INFO', 'parsearJSON: Estrategia 5 exitosa (reparación agresiva)');
        return parsed;
    } catch (e) {
        // ==========================================
        // ESTRATEGIA 6: REPARACIÓN DE STRINGS UNTERMINADOS (NUEVA)
        // El error "Unterminated string" significa que falta cerrar comillas
        // Esto pasa cuando la API corta la respuesta a mitad de un string
        // ==========================================
        const errorUnterminado = e.message.match(/Unterminated string in JSON at position (\d+)/);
        if (errorUnterminado) {
            const posicionError = parseInt(errorUnterminado[1]);
            logQuinti('WARN', `parsearJSON: String unterminado detectado en posición ${posicionError}, intentando reparar...`);
            
            // Extraer el JSON hasta la posición del error
            let jsonCortado = texto.substring(0, posicionError);
            
            // Buscar la última comilla abierta sin cerrar
            // y agregar el cierre faltante
            let comillasAbiertas = 0;
            let escapeActivo = false;
            let ultimaComillaAbierta = -1;
            
            for (let i = 0; i < jsonCortado.length; i++) {
                const char = jsonCortado[i];
                
                if (escapeActivo) {
                    escapeActivo = false;
                    continue;
                }
                
                if (char === '\\') {
                    escapeActivo = true;
                    continue;
                }
                
                if (char === '"') {
                    if (comillasAbiertas === 0) {
                        ultimaComillaAbierta = i;
                        comillasAbiertas++;
                    } else {
                        comillasAbiertas--;
                        ultimaComillaAbierta = -1;
                    }
                }
            }
            
            // Si hay una comilla abierta sin cerrar, cerrarla
            if (ultimaComillaAbierta !== -1) {
                logQuinti('DEBUG', `parsearJSON: Encontrada comilla sin cerrar en posición ${ultimaComillaAbierta}`);
                
                // Agregar cierre de comilla y llave
                jsonCortado += '"';
                
                // Verificar si también falta cerrar la llave
                const llavesAbiertas = (jsonCortado.match(/\{/g) || []).length;
                const llavesCerradas = (jsonCortado.match(/\}/g) || []).length;
                
                if (llavesAbiertas > llavesCerradas) {
                    jsonCortado += '}';
                    logQuinti('DEBUG', `parsearJSON: Agregada llave de cierre faltante`);
                }
                
                logQuinti('INFO', `parsearJSON: JSON reparado (longitud original: ${texto.length}, reparado: ${jsonCortado.length})`);
                
                try {
                    const parsed = JSON.parse(jsonCortado);
                    parsed.texto_original = textoOriginalCompleto;
                    parsed.fueReparado = true;
                    parsed.posicionReparada = posicionError;
                    logQuinti('INFO', 'parsearJSON: Estrategia 6 exitosa (reparación de string unterminado)');
                    return parsed;
                } catch (e2) {
                    logQuinti('DEBUG', `parsearJSON: Estrategia 6 falló - ${e2.message}`);
                }
            }
        }
        
        // ==========================================
        // ESTRATEGIA 7: EXTRACCIÓN FORZOSA DEL CONTENIDO VÁLIDO (NUEVA)
        // Si todo falla, extraer manualmente el valor de "respuesta" aunque el JSON esté roto
        // ==========================================
        logQuinti('WARN', 'parsearJSON: Intentando extracción forzosa del contenido...');
        
        // Buscar el patrón "respuesta":"..." o "respuesta": "..."
        const respuestaMatch = texto.match(/["']respuesta["']\s*:\s*["']([\s\S]*?)["']/);
        if (respuestaMatch) {
            const contenidoRespuesta = respuestaMatch[1];
            logQuinti('INFO', `parsearJSON: Contenido extraído manualmente (longitud: ${contenidoRespuesta.length})`);
            
            // Buscar también imagen_tag si existe
            const imagenTagMatch = texto.match(/["']imagen_?tag["']\s*:\s*["']([^"']+?)["']/);
            const imagenTag = imagenTagMatch ? imagenTagMatch[1] : null;
            
            // Devolver objeto reconstruido
            const resultado = {
                respuesta: contenidoRespuesta,
                fueReparado: true,
                metodoReparacion: 'extraccion_forzosa'
            };
            
            if (imagenTag) {
                resultado.imagen_tag = imagenTag;
            }
            
            logQuinti('INFO', 'parsearJSON: Estrategia 7 exitosa (extracción forzosa)');
            return resultado;
        }
        
        // ==========================================
        // FALLBACK FINAL: Si TODO falla, devolver null
        // El sistema usará fallbacks.js para generar respuesta alternativa
        // ==========================================
        logQuinti('ERROR', 'parsearJSON: TODOS LOS INTENTOS FALLARON', {
            contenidoInicio: texto.substring(0, 500),
            longitudTotal: texto.length,
            errorUltimoIntento: e.message,
            tipoError: e.name,
            stackTrace: e.stack?.substring(0, 200)
        });
        return null;
    }
}

/**
 * Formatea el texto para mostrar la narración entre asteriscos con estilo diferente
 * Convierte *texto* en <em class="narracion">texto</em> para styling CSS
 * @param {string} texto - Texto a formatear
 * @returns {string} - Texto formateado con HTML
 */
function formatearTextoConAsteriscos(texto) {
    if (!texto) return '';
    
    // Escapar caracteres HTML especiales primero para evitar XSS
    let textoEscapado = texto
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    
    // Reemplazar texto entre asteriscos con etiquetas <em> para styling
    // El patrón busca *texto* y lo convierte en <em class="narracion">texto</em>
    textoEscapado = textoEscapado.replace(/\*([^*]+)\*/g, '<em class="narracion">$1</em>');
    
    return textoEscapado;
}


/**
 * Valida que la respuesta tenga la estructura esperada
 * @param {object} datos - Objeto a validar
 * @returns {boolean} - True si es válido
 */
function esRespuestaValida(datos) {
    if (!datos) return false;
    
    // Debe tener respuesta (texto)
    if (!datos.respuesta || typeof datos.respuesta !== 'string') {
        return false;
    }
    
    // El diálogo no debe estar vacío o ser muy corto
    if (datos.respuesta.trim().length < 5) {
        return false;
    }
    
    // Validar que imagen_tag exista y no sea "none" o inválido
    if (datos.imagen_tag) {
        const tagInvalidos = ['none', 'null', 'undefined', '', 'invalid', 'error'];
        if (tagInvalidos.includes(datos.imagen_tag.toLowerCase().trim())) {
            return false;
        }
    }
    
    return true;
}

/**
 * Formatea un error para mostrarlo al usuario de forma amigable
 * Usa la función del módulo fallbacks.js
 */
function formatearErrorUsuario(error) {
    const esDebug = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    return obtenerMensajeError(esDebug, error);
}

// ============================================================
//  FUNCIÓN PRINCIPAL CON SISTEMA DE REINTENTOS
// ============================================================

/**
 * Función principal para obtener respuestas con sistema de reintentos multi-fase
 * Basado en el sistema de quintillizas.js
 * @param {string} mensaje - Mensaje del usuario
 * @param {Array} historialPrevio - Historial de conversación opcional
 * @returns {Promise<object>} - Objeto con {respuesta, imagen_tag, imagen_url, chicasRespondiendo}
 */
async function obtenerRespuestaGroq(mensaje, historialPrevio = []) {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const tiempoInicio = Date.now();
    
    // Detectar si se menciona a alguna otra chica en el mensaje
    const mensajeLower = mensaje.toLowerCase();
    const chicasMencionadas = [];
    
    for (const nombreChica of getChicasDisponibles()) {
        // Buscar el nombre de la chica en el mensaje (como palabra completa)
        const regex = new RegExp(`\\b${nombreChica.toLowerCase()}\\b`, 'i');
        if (regex.test(mensajeLower)) {
            chicasMencionadas.push(nombreChica);
        }
    }
    
    // Agregar las chicas mencionadas al conjunto de chicas en el chat
    // La chica seleccionada siempre está en el chat
    if (chicaSeleccionada) {
        chicasEnChat.add(chicaSeleccionada);
    }
    
    // Agregar chicas mencionadas al chat
    for (const chica of chicasMencionadas) {
        if (existeChica(chica)) {
            chicasEnChat.add(chica);
            logQuinti('INFO', `Chica mencionada y agregada al chat: ${chica}`);
        }
    }
    
    // ============================================
    // SISTEMA DE LLAMADAS SEPARADAS POR CHICA
    // Cuando hay múltiples chicas, hacer llamadas individuales
    // de forma SECUENCIAL para mantener coherencia contextual
    // IMPORTANTE: Cada chica responde SOLO al mensaje actual del usuario
    // PERO con contexto completo de lo que dijeron las demás
    // ============================================
    
    if (chicasEnChat.size > 1) {
        logQuinti('INFO', `Múltiples chicas detectadas (${chicasEnChat.size}). Iniciando llamadas secuenciales individuales.`);
        
        // MEJORA #2: ORDEN DE RESPUESTA SEGÚN A QUIÉN SE DIRIGE EL USUARIO
        // Detectar si el usuario se dirige específicamente a alguna chica
        let chicaObjetivo = null;
        
        // Patrones para detectar a quién se dirige el usuario
        const patronesDireccion = [
            /(?:^|\s)(?:oye\s+)?([a-z]+)(?:\s*(?:,|\?|!|\.))?\s*(?:tú|tu|te|ti|eres|tienes|estas|estás)/i,
            /(?:^|\s)(?:oye\s+)?([a-z]+)\s+(?:seguro|crees|puedes|quieres|sabes)/i,
            /(?:^|\s)([a-z]+)\s+(?:qué|cuál|cómo|cuándo|dónde|por qué)/i,
            /(?:^|\s)([a-z]+)\s*,/i,
            /(?:habla|di|cuenta|responde)\s+(?:tú\s+)?([a-z]+)/i
        ];
        
        for (const patron of patronesDireccion) {
            const match = mensaje.match(patron);
            if (match) {
                const nombreDetectado = match[1].toLowerCase();
                // Buscar coincidencia con nombres de chicas disponibles
                for (const nombreChica of getChicasDisponibles()) {
                    if (nombreChica.toLowerCase() === nombreDetectado) {
                        chicaObjetivo = nombreChica;
                        logQuinti('INFO', `Usuario se dirige específicamente a: ${chicaObjetivo}`);
                        break;
                    }
                }
                if (chicaObjetivo) break;
            }
        }
        
        // Ordenar array de chicas: la chica objetivo va PRIMERO
        let chicasArray = Array.from(chicasEnChat);
        if (chicaObjetivo && chicasArray.includes(chicaObjetivo)) {
            // Mover la chica objetivo al principio del array
            chicasArray = chicasArray.filter(c => c !== chicaObjetivo);
            chicasArray.unshift(chicaObjetivo);
            logQuinti('INFO', `Orden de respuesta ajustado: ${chicaObjetivo} responde primero`);
        }
        
        const respuestasPorChica = [];
        let errorGlobal = null;
        
        // SOLUCIÓN PROBLEMA #2: Unificar todo el historial en un solo mensaje de contexto
        // Esto mejora la coherencia y evita que mensajes se pierdan o no estén relacionados
        let contextoUnificado = '';
        if (historialPrevio.length > 0) {
            // Crear un resumen unificado del historial como un solo bloque narrativo
            contextoUnificado = '📜 CONTEXTO UNIFICADO DE LA CONVERSACIÓN (TODO LO QUE HA PASADO HASTA AHORA):\n';
            contextoUnificado += historialPrevio.map((msg, idx) => {
                if (msg.role === 'system') return '';
                const tipo = msg.role === 'user' ? 'Tú' : 'Respuesta';
                return `${idx}. ${tipo}: ${msg.content}`;
            }).filter(line => line).join('\n\n');
            contextoUnificado += '\n\n⚠️ ESTE ES EL HISTORIAL COMPLETO. USA ESTE CONTEXTO PARA MANTENER COHERENCIA.';
        }
        
        // SOLUCIÓN PROBLEMA #3: Agregar estado actual de acciones y posición
        if (accionEnCurso || Object.values(estadoAccionesExplicitas).some(v => v)) {
            const accionesActivas = Object.entries(estadoAccionesExplicitas)
                .filter(([_, activo]) => activo)
                .map(([accion, _]) => accion)
                .join(', ');
            
            contextoUnificado += `\n\n🔥 ESTADO ACTUAL DE LA ACCIÓN EN CURSO:\n`;
            contextoUnificado += `- Acción activa: ${accionEnCurso || 'Ninguna'}\n`;
            contextoUnificado += `- Acciones explícitas activas: ${accionesActivas || 'Ninguna'}\n`;
            contextoUnificado += `- Turnos llevando esta acción: ${contadorTurnosAccion}\n`;
            contextoUnificado += `⚠️ CRÍTICO: DEBES MANTENER ESTA POSICIÓN/ACCIÓN A MENOS QUE EL USUARIO INDIQUE EXPLÍCITAMENTE CAMBIARLA. NO LA OLVIDES.`;
        }
        
        // Procesar cada chica de forma secuencial
        for (let idx = 0; idx < chicasArray.length; idx++) {
            const nombreChica = chicasArray[idx];
            const esPrimeraChica = idx === 0;
            
            logQuinti('DEBUG', `Procesando llamada individual para: ${nombreChica} (${idx + 1}/${chicasArray.length})`);
            
            // Obtener personalidad específica de este personaje (quintilliza o Aldo)
            let personalidadChica;
            if (esAldo(nombreChica)) {
                personalidadChica = ALDO_PERSONALIDAD;
            } else {
                personalidadChica = PERSONALIDADES[nombreChica] || "Eres una chica amigable.";
            }
            
            // Construir instrucciones de imágenes SOLO para esta chica
            const tagsDisponibles = obtenerTagsImagen(nombreChica);
            const instruccionesImagen = `\n\nTU IMAGEN_TAG: Debes incluir "imagen_tag" con UNA de estas opciones: [${tagsDisponibles.join(', ')}]. Elige según lo que esté haciendo el personaje.`;
            
            // Instrucción anti-repetición reforzada para múltiples chicas
            const instruccionAntiRepeticion = `\n\n⚠️ ANTI-REPETICIÓN OBLIGATORIA: Tu respuesta debe ser COMPLETAMENTE DIFERENTE a las de las otras chicas. Prohibido usar las mismas frases, gestos, acciones o vocabulario.`;
            
            // SOLUCIÓN PROBLEMA #1: Instrucción reforzada para acciones en tiempo presente
            const instruccionAccionUsuario = `
🚨 PRIORIDAD ABSOLUTA - ACCIÓN DEL USUARIO:
El mensaje del usuario TIENE PRIORIDAD ABSOLUTA sobre cualquier otra cosa. Lo que el usuario diga está sucediendo AHORA MISMO.

Cuando el usuario use verbos en PRESENTE (ej: "beso", "chupo", "toco", "se desviste") o mencione una acción en curso:

DEBES HACER TRES COSAS OBLIGATORIAMENTE:
1. TU TEXTO: Describe ESA acción EXPLÍCITAMENTE en tu respuesta usando *acciones entre asteriscos* en TIEMPO PRESENTE. Ejemplo: si el usuario dice "se desviste", tú debes escribir "*mientras se desviste, te mira con deseo*" o "*te ayuda a desvestirse ahora mismo*". La acción YA está ocurriendo.
2. TU IMAGEN_TAG: DEBE coincidir EXACTAMENTE con la acción específica mencionada por el usuario. Si dice "se desviste" → usa "desvistiendo". Si dice "beso" → usa "besando". NO uses tags genéricas como "desnuda" cuando el usuario describió una acción específica.
3. MANTÉN EL CONTEXTO: Si ya había una acción en curso (ver "ESTADO ACTUAL" arriba), DEBES CONTINUAR ESA ACCIÓN a menos que el usuario indique explícitamente cambiarla.

⚠️ CRÍTICO: 
- El texto y la imagen DEBEN estar 100% alineados con la acción ESPECÍFICA que el usuario mencionó.
- NO uses tags genéricas ("desnuda", "hablando") cuando el usuario dijo algo específico ("se desviste", "beso").
`;
            // Instrucción de contexto sobre otras chicas (solo para chicas después de la primera)
            let instruccionContextoOtrasChicas = '';
            if (!esPrimeraChica && respuestasPorChica.length > 0) {
                const respuestasPrevias = respuestasPorChica.map(r => 
                    `• ${r.chica}: ${r.respuesta.substring(0, 200)}...`
                ).join('\\n');
                
                // MEJORA: La chica objetivo (a quien se dirige el usuario) responde PRIMERO
                // Las demás chicas deben basar su respuesta en lo que dijo la primera
                const esChicaObjetivo = nombreChica === chicaObjetivo;
                if (!esChicaObjetivo && chicaObjetivo) {
                    // Esta NO es la chica objetivo, debe responder BASÁNDOSE en la respuesta de la chica objetivo
                    instruccionContextoOtrasChicas = `\\n\\n📋 CONTEXTO - OTRAS CHICAS YA RESPONDIERON:\\n${respuestasPrevias}\\n\\n⚡ TU RESPUESTA DEBE SER DIFERENTE: No repitas sus palabras exactas, pero TODAS deben estar realizando la MISMA ACCIÓN que el usuario mencionó. Cada una con su estilo único pero la misma acción base.\\n\\n🖼️ IMAGEN COORDINADA OBLIGATORIA: Si el usuario dijo "beso", TODAS las chicas deben estar besando en su texto Y en su imagen_tag. La acción es la misma, la expresión de cada personalidad es diferente.\\n\\n🚫 PROHIBIDO HABLAR COMO OTRA CHICA: Tú eres ${nombreChica}. NO uses el estilo, vocabulario o frases de las otras chicas. Mantén TU propia personalidad y forma de hablar.\\n\\n💬 REACCIÓN A LA RESPUESTA PREVIA: Como ${chicaObjetivo} ya respondió primero (porque el usuario le habló directamente a ella), tu respuesta debe ser una REACCIÓN o COMENTARIO sobre lo que ${chicaObjetivo} dijo. Puedes estar de acuerdo, disentir, complementar o reaccionar con tu personalidad única, pero SIEMPRE manteniendo coherencia con la situación.`;
                } else {
                    // Esta ES la chica objetivo o no hay chica objetivo definida
                    instruccionContextoOtrasChicas = `\\n\\n📋 CONTEXTO - OTRAS CHICAS YA RESPONDIERON:\\n${respuestasPrevias}\\n\\n⚡ TU RESPUESTA DEBE SER DIFERENTE: No repitas sus palabras exactas, pero TODAS deben estar realizando la MISMA ACCIÓN que el usuario mencionó. Cada una con su estilo único pero la misma acción base.\\n\\n🖼️ IMAGEN COORDINADA OBLIGATORIA: Si el usuario dijo "beso", TODAS las chicas deben estar besando en su texto Y en su imagen_tag. La acción es la misma, la expresión de cada personalidad es diferente.\\n\\n🚫 PROHIBIDO HABLAR COMO OTRA CHICA: Tú eres ${nombreChica}. NO uses el estilo, vocabulario o frases de las otras chicas. Mantén TU propia personalidad y forma de hablar.`;
                }
            }
            
            // SOLUCIÓN PROBLEMA #2: Incluir contexto unificado en el system prompt
            const systemPromptIndividual = `${personalidadChica}${instruccionesImagen}${instruccionAntiRepeticion}${instruccionAccionUsuario}${instruccionContextoOtrasChicas}\n\n${contextoUnificado ? contextoUnificado + '\n\n' : ''}FORMATO JSON OBLIGATORIO - Respondé únicamente en formato JSON válido. RESPONDE SOLO CON JSON, SIN TEXTO ANTES NI DESPUES:\n{"respuesta":"tu diálogo con *acciones entre asteriscos*","imagen_tag":"una_imagen_disponible"}`;
            
            // Preparar mensajes para esta chica (SOLO el mensaje actual del usuario)
            const mensajesPayload = [
                { role: "system", content: systemPromptIndividual },
                { role: "user", content: mensaje }
            ];
            
            // Llamar a la API para esta chica
            let datos;
            let errorOcurrido = null;
            try {
                datos = await intentarLlamadaAPI(mensajesPayload, MODELO_PRINCIPAL);
            } catch (error) {
                errorOcurrido = error;
                // Si la PRIMERA chica falla, guardar error pero continuar con fallback para no romper todo el chat
                if (esPrimeraChica) {
                    logQuinti('ERROR', `La primera chica (${nombreChica}) falló`, { error: error.message });
                    errorGlobal = error;
                } else {
                    // Para chicas secundarias, registrar error pero continuar
                    logQuinti('ERROR', `Chica secundaria ${nombreChica} falló: ${error.message}`, { error: error.message });
                }
            }
            
            // SISTEMA DE REINTENTOS MULTI-FASE PARA CADA CHICA (igual que caso de una sola chica)
            // Si la llamada inicial falla o devuelve datos inválidos, intentar todas las fases de fallback
            if (!datos || !esRespuestaValida(datos)) {
                const razon = !datos ? 'datos nulos' : 'respuesta inválida';
                logQuinti('WARN', `Llamada para ${nombreChica} falló (${razon}), iniciando sistema de reintentos multi-fase`, { 
                    datosRecibidos: datos,
                    errorPrevio: errorOcurrido?.message 
                });
                
                // ========================================
                // FASE 1: Reintentos con prompts de corrección JSON
                // ========================================
                logQuinti('DEBUG', `${nombreChica} - FASE 1: Reintentos con corrección JSON`);
                const payloadFase1 = [...mensajesPayload];
                for (let i = 0; i < QUINT_PRUEBA_FASE1.length; i++) {
                    logReintento(i + 1, QUINT_PRUEBA_FASE1.length, `Corrección JSON (${nombreChica})`);
                    
                    payloadFase1.push({ role: "user", content: QUINT_PRUEBA_FASE1[i] });
                    try {
                        datos = await intentarLlamadaAPI(payloadFase1, MODELO_PRINCIPAL);
                    } catch (error) {
                        logQuinti('WARN', `${nombreChica} - FASE 1 intento ${i + 1} falló: ${error.message}`);
                    }
                    payloadFase1.pop(); // Remover prompt de corrección
                    
                    if (datos && esRespuestaValida(datos)) {
                        logQuinti('INFO', `${nombreChica} - FASE 1 exitosa en intento ${i + 1}`);
                        break;
                    }
                }
                
                // ========================================
                // FASE 2: Historial reducido (si FASE 1 falló)
                // ========================================
                if (!datos || !esRespuestaValida(datos)) {
                    logQuinti('WARN', `${nombreChica} - FASE 1 fallida, iniciando FASE 2: Historial reducido`);
                    const ultimos4 = historialPrevio.slice(-4);
                    const payloadFase2 = [
                        { role: "system", content: systemPromptIndividual },
                        ...ultimos4,
                        { role: "user", content: mensaje }
                    ];
                    
                    for (let i = 0; i < QUINT_PRUEBA_FASE2.length; i++) {
                        logReintento(i + 1, QUINT_PRUEBA_FASE2.length, `Historial reducido (${nombreChica})`);
                        
                        payloadFase2.push({ role: "user", content: QUINT_PRUEBA_FASE2[i] });
                        try {
                            datos = await intentarLlamadaAPI(payloadFase2, MODELO_PRINCIPAL);
                        } catch (error) {
                            logQuinti('WARN', `${nombreChica} - FASE 2 intento ${i + 1} falló: ${error.message}`);
                        }
                        payloadFase2.pop();
                        
                        if (datos && esRespuestaValida(datos)) {
                            logQuinti('INFO', `${nombreChica} - FASE 2 exitosa en intento ${i + 1}`);
                            break;
                        }
                    }
                }
                
                // ========================================
                // FASE 3: Contexto mínimo (si FASE 2 falló)
                // ========================================
                if (!datos || !esRespuestaValida(datos)) {
                    logQuinti('WARN', `${nombreChica} - FASE 2 fallida, iniciando FASE 3: Contexto mínimo`);
                    const ultimoMsgUser = historialPrevio.filter(m => m.role === "user").slice(-1);
                    
                    for (let i = 0; i < QUINT_PRUEBA_FASE3.length; i++) {
                        logReintento(i + 1, QUINT_PRUEBA_FASE3.length, `Contexto mínimo (${nombreChica})`);
                        
                        const minimo = [
                            { role: "system", content: QUINT_PRUEBA_SYSTEM_MINIMO },
                            ...ultimoMsgUser,
                            { role: "user", content: QUINT_PRUEBA_FASE3[i] }
                        ];
                        
                        try {
                            datos = await intentarLlamadaAPI(minimo, MODELO_PRINCIPAL);
                        } catch (error) {
                            logQuinti('WARN', `${nombreChica} - FASE 3 intento ${i + 1} falló: ${error.message}`);
                        }
                        
                        if (datos && esRespuestaValida(datos)) {
                            logQuinti('INFO', `${nombreChica} - FASE 3 exitosa en intento ${i + 1}`);
                            break;
                        }
                    }
                }
                
                // ========================================
                // FASE 4: Prompt agresivo directo (si FASE 3 falló)
                // ========================================
                if (!datos || !esRespuestaValida(datos)) {
                    logQuinti('WARN', `${nombreChica} - FASE 3 fallida, iniciando FASE 4: Prompt agresivo`);
                    const ultimoMsgUser = historialPrevio.filter(m => m.role === "user").slice(-1);
                    
                    for (let i = 0; i < QUINT_PRUEBA_FASE4.length; i++) {
                        logReintento(i + 1, QUINT_PRUEBA_FASE4.length, `Prompt agresivo (${nombreChica})`);
                        
                        const agresivo = [
                            { role: "system", content: QUINT_PRUEBA_SYSTEM_MINIMO },
                            ...ultimoMsgUser,
                            { role: "user", content: QUINT_PRUEBA_FASE4[i] }
                        ];
                        
                        try {
                            datos = await intentarLlamadaAPI(agresivo, MODELO_PRINCIPAL);
                        } catch (error) {
                            logQuinti('WARN', `${nombreChica} - FASE 4 intento ${i + 1} falló: ${error.message}`);
                        }
                        
                        if (datos && esRespuestaValida(datos)) {
                            logQuinti('INFO', `${nombreChica} - FASE 4 exitosa en intento ${i + 1}`);
                            break;
                        }
                    }
                }
                
                // ========================================
                // FALLBACK ANTI-REPETICIÓN: Si se detecta repetición entre chicas (nuevo)
                // Se usa ANTES del fallback local normal para evitar que las chicas copien diálogos
                // ========================================
                if (!datos || !esRespuestaValida(datos)) {
                    logQuinti('ERROR', `${nombreChica} - Todas las fases de reintento fallaron, usando fallback anti-repetición primero`);
                    const fallbackTag = tagsDisponibles.includes('hablando') ? 'hablando' : tagsDisponibles[0] || 'normal';
                    datos = {
                        respuesta: obtenerFallbackAntiRepeticion(),
                        imagen_tag: fallbackTag
                    };
                }
            }
            
            // Guardar respuesta de esta chica
            respuestasPorChica.push({
                chica: nombreChica,
                respuesta: datos && datos.respuesta ? datos.respuesta : '...',
                imagen_tag: (datos && datos.imagen_tag && datos.imagen_tag.toLowerCase().trim() !== 'none') ? datos.imagen_tag : 'hablando'
            });
            
            // Ya no se usa contextoAcumulado porque ahora todo el historial va en contextoUnificado
            // Esto evita que los mensajes se acumulen de forma fragmentada y mejora la coherencia
        }
        
        // Combinar todas las respuestas en formato [Nombre]: respuesta
        const respuestaCombinada = respuestasPorChica
            .map(r => `[${r.chica}]: ${r.respuesta}`)
            .join('\n\n');
        
        logQuinti('INFO', `Múltiples chicas respondieron exitosamente: ${respuestasPorChica.length} respuestas`, {
            chicas: respuestasPorChica.map(r => r.chica),
            longitudes: respuestasPorChica.map(r => `${r.chica}: ${r.respuesta.length} chars`)
        });
        
        // Usar la imagen de la chica principal (primera en responder)
        const chicaPrincipal = respuestasPorChica[0]?.chica || chicaSeleccionada;
        const tagImagenPrincipal = respuestasPorChica[0] && respuestasPorChica[0].imagen_tag && respuestasPorChica[0].imagen_tag.toLowerCase().trim() !== 'none' 
            ? respuestasPorChica[0].imagen_tag 
            : 'hablando';
        const historiaId = window.historiaParalelaActiva || null;
        const resultadoImagen = obtenerURLImagen(chicaPrincipal, tagImagenPrincipal, historiaId);
        const urlImagenPrincipal = resultadoImagen.urlImagen;
        const audioPrincipal = resultadoImagen.urlAudio;
        
        logRespuestaExitosa(MODELO_PRINCIPAL, respuestaCombinada.length, Date.now() - tiempoInicio);
        
        return {
            respuesta: respuestaCombinada,
            imagen_tag: tagImagenPrincipal,
            imagen_url: urlImagenPrincipal,
            audio_url: audioPrincipal,
            modelo: MODELO_PRINCIPAL,
            chicaPrincipal: chicaPrincipal,
            chicasRespondiendo: chicasArray,
            chicasEnChat: Array.from(chicasEnChat),
            respuestasIndividuales: respuestasPorChica
        };
    }
    
    // ============================================
    // CASO DE UNA SOLA CHICA (flujo original)
    // ============================================
    
    // Determinar personalidad y tags de imagen disponibles
    let personalidadPrincipal;
    if (esAldo(chicaSeleccionada)) {
        personalidadPrincipal = ALDO_PERSONALIDAD;
    } else if (chicaSeleccionada) {
        personalidadPrincipal = PERSONALIDADES[chicaSeleccionada];
    } else {
        personalidadPrincipal = "Eres QuintiAmigas, una amiga virtual divertida y útil.";
    }
    
    // Construir instrucciones de imágenes (Aldo no tiene imágenes)
    const tagsImagen = chicaSeleccionada && !esAldo(chicaSeleccionada) ? obtenerTagsImagen(chicaSeleccionada) : ['normal'];
    const instruccionesImagenes = esAldo(chicaSeleccionada) 
        ? `\n\nNOTA: Eres Aldo, un personaje masculino. No tienes imágenes asociadas, solo respondes con texto.`
        : `\n\nIMÁGENES DISPONIBLES: ${tagsImagen.join(', ')}. Debes incluir "imagen_tag" con UNA de estas opciones según lo que esté haciendo el personaje.`;
    
    // Instrucción anti-repetición mejorada
    const instruccionAntiRepeticion = `\n\nREGLA CRÍTICA ANTI-REPETICIÓN: NUNCA repitas frases, diálogos, acciones o expresiones que ya hayas usado antes en esta conversación. Revisa mentalmente el historial y asegúrate de que CADA respuesta sea única y fresca. Usa vocabulario variado, expresiones diferentes, reacciones distintas. Si ya dijiste algo similar antes, busca una forma completamente nueva de expresarlo. Esto es OBLIGATORIO.`;
    
    // SISTEMA DE MEMORIA MEJORADO: Obtener estado completo de la memoria
    const estadoMemoriaCompleto = obtenerEstadoMemoriaParaPrompt();
    const instruccionMemoria = `\n\n🧠 SISTEMA DE MEMORIA ACTIVO - INFORMACIÓN QUE DEBES RECORDAR:\n${estadoMemoriaCompleto}\nUSA ESTA INFORMACIÓN PARA DAR RESPUESTAS COHERENTES Y PERSONALIZADAS. REFERENCIA ESTOS DATOS CUANDO SEA RELEVANTE.`;
    
    // SOLUCIÓN PROBLEMA #1: Instrucción reforzada para acciones en tiempo presente (caso una sola chica)
    const instruccionAccionUsuario = `
🚨 PRIORIDAD ABSOLUTA - ACCIÓN DEL USUARIO:
El mensaje del usuario TIENE PRIORIDAD ABSOLUTA sobre cualquier otra cosa. Lo que el usuario diga está sucediendo AHORA MISMO.

Cuando el usuario use verbos en PRESENTE (ej: "beso", "chupo", "toco", "se desviste") o mencione una acción en curso:

DEBES HACER TRES COSAS OBLIGATORIAMENTE:
1. TU TEXTO: Describe ESA acción EXPLÍCITAMENTE en tu respuesta usando *acciones entre asteriscos* en TIEMPO PRESENTE. Ejemplo: si el usuario dice "se desviste", tú debes escribir "*mientras se desviste, te mira con deseo*" o "*te ayuda a desvestirse ahora mismo*". La acción YA está ocurriendo.
2. TU IMAGEN_TAG: DEBE coincidir EXACTAMENTE con la acción específica mencionada por el usuario. Si dice "se desviste" → usa "desvistiendo". Si dice "beso" → usa "besando". NO uses tags genéricas como "desnuda" cuando el usuario describió una acción específica.
3. MANTÉN EL CONTEXTO: Si ya había una acción en curso, DEBES CONTINUAR ESA ACCIÓN a menos que el usuario indique explícitamente cambiarla. NO olvides la posición actual (ej: si estaban de pie, siguen de pie hasta que se indique lo contrario).

⚠️ CRÍTICO: 
- El texto y la imagen DEBEN estar 100% alineados con la acción ESPECÍFICA que el usuario mencionó.
- NO uses tags genéricas ("desnuda", "hablando") cuando el usuario dijo algo específico ("se desviste", "beso").
- Si el usuario dice "X", la tag debe ser la versión en acción de X, no algo relacionado pero diferente.`;
    
    // SOLUCIÓN PROBLEMA #3: Agregar estado actual de acciones al prompt
    let contextoEstadoActual = '';
    if (accionEnCurso || Object.values(estadoAccionesExplicitas).some(v => v)) {
        const accionesActivas = Object.entries(estadoAccionesExplicitas)
            .filter(([_, activo]) => activo)
            .map(([accion, _]) => accion)
            .join(', ');
        
        contextoEstadoActual = `\n\n🔥 ESTADO ACTUAL DE LA ACCIÓN EN CURSO:\n`;
        contextoEstadoActual += `- Acción activa: ${accionEnCurso || 'Ninguna'}\n`;
        contextoEstadoActual += `- Acciones explícitas activas: ${accionesActivas || 'Ninguna'}\n`;
        contextoEstadoActual += `- Turnos llevando esta acción: ${contadorTurnosAccion}\n`;
        contextoEstadoActual += `⚠️ CRÍTICO: DEBES MANTENER ESTA POSICIÓN/ACCIÓN A MENOS QUE EL USUARIO INDIQUE EXPLÍCITAMENTE CAMBIARLA. NO LA OLVIDES.`;
    }
    
    const systemPrompt = `${personalidadPrincipal}${instruccionesImagenes}${instruccionAntiRepeticion}${instruccionMemoria}${instruccionAccionUsuario}${contextoEstadoActual}\n\nFORMATO DE RESPUESTA OBLIGATORIO - Respondé únicamente en formato JSON válido. JSON (SOLO JSON, SIN TEXTO ANTES NI DESPUES):\n{"respuesta":"tu diálogo con *acciones entre asteriscos*","imagen_tag":"nombre_de_una_imagen_disponible"}`;
    
    // Preparar mensajes
    const mensajesPayload = [
        { role: "system", content: systemPrompt },
        ...historialPrevio.slice(-MAX_HISTORIAL),
        { role: "user", content: mensaje }
    ];
    
    logQuinti('INFO', 'Iniciando solicitud a API Groq', { modelo: MODELO_PRINCIPAL, chica: chicaSeleccionada, chicasEnChat: Array.from(chicasEnChat) });
    
    // ========================================
    // FASE 0: Intento normal con historial completo
    // ========================================
    logQuinti('DEBUG', 'FASE 0: Intento normal con historial completo');
    let datos;
    try {
        datos = await intentarLlamadaAPI(mensajesPayload, MODELO_PRINCIPAL);
    } catch (error) {
        // Propagar error real al usuario en caso de una sola chica
        logQuinti('ERROR', 'Error en llamada API - propagando al usuario', { error: error.message });
        throw error;
    }
    
    if (datos && esRespuestaValida(datos)) {
        logRespuestaExitosa(MODELO_PRINCIPAL, datos.respuesta ? datos.respuesta.length : 0, Date.now() - tiempoInicio);
        return procesarRespuesta(datos, mensaje);
    }
    
    // ========================================
    // FASE 1: Reintentos con prompts de corrección JSON
    // ========================================
    logQuinti('WARN', 'FASE 0 fallida, iniciando FASE 1: Reintentos con corrección JSON');
    for (let i = 0; i < QUINT_PRUEBA_FASE1.length; i++) {
        logReintento(i + 1, QUINT_PRUEBA_FASE1.length, 'Corrección JSON');
        
        mensajesPayload.push({ role: "user", content: QUINT_PRUEBA_FASE1[i] });
        try {
            datos = await intentarLlamadaAPI(mensajesPayload, MODELO_PRINCIPAL);
        } catch (error) {
            // Continuar al siguiente reintento
            logQuinti('WARN', `FASE 1 intento ${i + 1} falló: ${error.message}`);
        }
        mensajesPayload.pop(); // Remover prompt de corrección
        
        if (datos && esRespuestaValida(datos)) {
            logQuinti('INFO', `FASE 1 exitosa en intento ${i + 1}`);
            return procesarRespuesta(datos, mensaje);
        }
    }
    
    // ========================================
    // FASE 2: Historial reducido
    // ========================================
    logQuinti('WARN', 'FASE 1 fallida, iniciando FASE 2: Historial reducido');
    const historialOriginal = [...mensajesPayload];
    const ultimos4 = historialPrevio.slice(-4);
    mensajesPayload.length = 0;
    mensajesPayload.push(
        { role: "system", content: systemPrompt },
        ...ultimos4,
        { role: "user", content: mensaje }
    );
    
    for (let i = 0; i < QUINT_PRUEBA_FASE2.length; i++) {
        logReintento(i + 1, QUINT_PRUEBA_FASE2.length, 'Historial reducido');
        
        mensajesPayload.push({ role: "user", content: QUINT_PRUEBA_FASE2[i] });
        try {
            datos = await intentarLlamadaAPI(mensajesPayload, MODELO_PRINCIPAL);
        } catch (error) {
            logQuinti('WARN', `FASE 2 intento ${i + 1} falló: ${error.message}`);
        }
        mensajesPayload.pop();
        
        if (datos && esRespuestaValida(datos)) {
            logQuinti('INFO', `FASE 2 exitosa en intento ${i + 1}`);
            return procesarRespuesta(datos, mensaje);
        }
    }
    
    // Restaurar historial original
    mensajesPayload.length = 0;
    mensajesPayload.push(...historialOriginal);
    
    // ========================================
    // FASE 3: Contexto mínimo
    // ========================================
    logQuinti('WARN', 'FASE 2 fallida, iniciando FASE 3: Contexto mínimo');
    const ultimoMsgUser = historialPrevio.filter(m => m.role === "user").slice(-1);
    
    for (let i = 0; i < QUINT_PRUEBA_FASE3.length; i++) {
        logReintento(i + 1, QUINT_PRUEBA_FASE3.length, 'Contexto mínimo');
        
        const minimo = [
            { role: "system", content: QUINT_PRUEBA_SYSTEM_MINIMO },
            ...ultimoMsgUser,
            { role: "user", content: QUINT_PRUEBA_FASE3[i] }
        ];
        
        try {
            datos = await intentarLlamadaAPI(minimo, MODELO_PRINCIPAL);
        } catch (error) {
            logQuinti('WARN', `FASE 3 intento ${i + 1} falló: ${error.message}`);
        }
        
        if (datos && esRespuestaValida(datos)) {
            logQuinti('INFO', `FASE 3 exitosa en intento ${i + 1}`);
            return procesarRespuesta(datos, mensaje);
        }
    }
    
    // ========================================
    // FASE 4: Prompt agresivo directo
    // ========================================
    logQuinti('WARN', 'FASE 3 fallida, iniciando FASE 4: Prompt agresivo');
    for (let i = 0; i < QUINT_PRUEBA_FASE4.length; i++) {
        logReintento(i + 1, QUINT_PRUEBA_FASE4.length, 'Prompt agresivo');
        
        const agresivo = [
            { role: "system", content: QUINT_PRUEBA_SYSTEM_MINIMO },
            ...ultimoMsgUser,
            { role: "user", content: QUINT_PRUEBA_FASE4[i] }
        ];
        
        try {
            datos = await intentarLlamadaAPI(agresivo, MODELO_PRINCIPAL);
        } catch (error) {
            logQuinti('WARN', `FASE 4 intento ${i + 1} falló: ${error.message}`);
        }
        
        if (datos && esRespuestaValida(datos)) {
            logQuinti('INFO', `FASE 4 exitosa en intento ${i + 1}`);
            return procesarRespuesta(datos, mensaje);
        }
    }
    
    // ========================================
    // FALLBACK: Si todo falla (último recurso) - Mostrar error al usuario
    // ========================================
    logQuinti('ERROR', 'Todas las fases fallaron - Lanzando error para mostrar al usuario');
    
    throw new Error('No se pudo obtener una respuesta después de múltiples intentos. Por favor, intenta de nuevo.');
}

/**
 * Intenta hacer una llamada a la API con rotación de keys
 * @param {Array} mensajes - Array de mensajes para la API
 * @param {string} modelo - Modelo a usar
 * @returns {Promise<object>} - Datos parseados
 * @throws {Error} - Error con detalles específicos de cada key intentada
 */
async function intentarLlamadaAPI(mensajes, modelo, forzarJSON = false) {
    const url = "https://api.groq.com/openai/v1/chat/completions";
    const erroresAcumulados = [];
    
    for (let k = 0; k < GROQ_KEYS.length; k++) {
        const keyIdx = (indiceKeyActual + k) % GROQ_KEYS.length;
        const apiKey = GROQ_KEYS[keyIdx];
        const keyNumero = keyIdx + 1;
        
        try {
            // Construir payload base SIN response_format por defecto
            // La mayoría de los modelos en Groq no necesitan este parámetro
            // y puede causar errores 400
            const payload = {
                model: modelo,
                messages: mensajes,
                temperature: 0.7,
                max_tokens: 1024
            };
            
            // Solo agregar response_format si se solicita explícitamente Y el modelo lo soporta
            // Nota: openai/gpt-oss-120b y otros modelos open-source pueden fallar con este parámetro
            if (forzarJSON) {
                logQuinti('DEBUG', `Intentando con response_format: json_object para ${modelo}`);
                payload.response_format = { type: "json_object" };
            }
            
            const response = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${apiKey}`
                },
                body: JSON.stringify(payload)
            });
            
            // MANEJO DE ERROR 400 - Reintentar sin response_format
            if (response.status === 400 && forzarJSON) {
                logQuinti('WARN', `Error 400 con response_format, reintentando sin él - Key ${keyNumero}`);
                
                // Remover response_format y reintentar
                delete payload.response_format;
                
                const responseRetry = await fetch(url, {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Authorization": `Bearer ${apiKey}`
                    },
                    body: JSON.stringify(payload)
                });
                
                // Usar la respuesta del retry
                if (!responseRetry.ok) {
                    const errorData = await responseRetry.json().catch(() => ({}));
                    const errorMsg = `Key ${keyNumero}: Error HTTP ${responseRetry.status} (retry) - ${errorData.error?.message || 'Sin detalles'}`;
                    logErrorAPI('Groq API (retry)', new Error(`Status ${responseRetry.status}`), { errorData, keyIdx });
                    erroresAcumulados.push(errorMsg);
                    indiceKeyActual = (keyIdx + 1) % GROQ_KEYS.length;
                    continue;
                }
                
                // Procesar respuesta exitosa del retry
                const data = await responseRetry.json();
                const contenido = data?.choices?.[0]?.message?.content;
                
                if (contenido) {
                    indiceKeyActual = (keyIdx + 1) % GROQ_KEYS.length;
                    const resultadoJSON = parsearJSON(contenido);
                    
                    if (resultadoJSON === null) {
                        logQuinti('ERROR', 'API devolvió contenido pero no es JSON válido (retry)', {
                            contenido: contenido.substring(0, 500),
                            longitudTotal: contenido.length,
                            keyUsada: keyNumero,
                            primeros100Chars: contenido.substring(0, 100),
                            ultimos100Chars: contenido.substring(Math.max(0, contenido.length - 100)),
                            contieneRespuestaTag: contenido.includes('"respuesta"') || contenido.includes("'respuesta'"),
                            contieneImagenTag: contenido.includes('"imagen_tag"') || contenido.includes("'imagen_tag'"),
                            tieneBloquesMarkdown: contenido.includes('```'),
                            caracteresEspeciales: JSON.stringify(contenido.substring(0, 200)).replace(/\\\\/g, '\\')
                        });
                    }
                    
                    return resultadoJSON;
                } else {
                    logQuinti('WARN', `API devolvió respuesta vacía en retry - Key ${keyNumero}`, {
                        dataCompleta: JSON.stringify(data).substring(0, 500)
                    });
                }
            }
            
            if (response.status === 429) {
                const errorMsg = `Key ${keyNumero}: Rate limit excedido (429)`;
                logQuinti('WARN', errorMsg);
                erroresAcumulados.push(errorMsg);
                indiceKeyActual = (keyIdx + 1) % GROQ_KEYS.length;
                continue;
            }
            
            if (response.status === 401) {
                const errorMsg = `Key ${keyNumero}: API Key inválida o expirada (401)`;
                logQuinti('WARN', errorMsg);
                erroresAcumulados.push(errorMsg);
                indiceKeyActual = (keyIdx + 1) % GROQ_KEYS.length;
                continue;
            }
            
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                const errorMsg = `Key ${keyNumero}: Error HTTP ${response.status} - ${errorData.error?.message || 'Sin detalles'}`;
                logErrorAPI('Groq API', new Error(`Status ${response.status}`), { errorData, keyIdx });
                erroresAcumulados.push(errorMsg);
                indiceKeyActual = (keyIdx + 1) % GROQ_KEYS.length;
                continue;
            }
            
            const data = await response.json();
            const contenido = data?.choices?.[0]?.message?.content;
            
            if (contenido) {
                indiceKeyActual = (keyIdx + 1) % GROQ_KEYS.length;
                const resultadoJSON = parsearJSON(contenido);
                
                // Si el parseo falla y devuelve null, registrar error detallado
                if (resultadoJSON === null) {
                    logQuinti('ERROR', 'API devolvió contenido pero no es JSON válido', {
                        contenido: contenido.substring(0, 500),
                        longitudTotal: contenido.length,
                        keyUsada: keyNumero,
                        primeros100Chars: contenido.substring(0, 100),
                        ultimos100Chars: contenido.substring(Math.max(0, contenido.length - 100)),
                        contieneRespuestaTag: contenido.includes('"respuesta"') || contenido.includes("'respuesta'"),
                        contieneImagenTag: contenido.includes('"imagen_tag"') || contenido.includes("'imagen_tag'"),
                        tieneBloquesMarkdown: contenido.includes('```'),
                        caracteresEspeciales: JSON.stringify(contenido.substring(0, 200)).replace(/\\\\/g, '\\')
                    });
                }
                
                return resultadoJSON;
            } else {
                logQuinti('WARN', `API devolvió respuesta vacía - Key ${keyNumero}`, {
                    dataCompleta: JSON.stringify(data).substring(0, 500)
                });
            }
            
        } catch (error) {
            const errorMsg = `Key ${keyNumero}: Timeout o error de conexión - ${error.message}`;
            logErrorAPI('Fetch Groq', error, { keyIdx, modelo });
            erroresAcumulados.push(errorMsg);
            indiceKeyActual = (keyIdx + 1) % GROQ_KEYS.length;
        }
    }
    
    // Todas las keys fallaron - lanzar error con detalles acumulados
    const errorDetalle = erroresAcumulados.length > 0 
        ? `Todas las API keys fallaron:\n${erroresAcumulados.join('\n')}`
        : 'Error desconocido al llamar a la API';
    
    throw new Error(errorDetalle);
}

/**
 * Procesa la respuesta de la IA: selecciona imagen y actualiza historial
 * @param {object} datos - Datos de la respuesta
 * @param {string} mensajeOriginal - Mensaje original del usuario
 * @returns {object} - Respuesta procesada con URL de imagen y lista de chicas respondiendo
 */
async function procesarRespuesta(datos, mensajeOriginal) {
    // Verificar si tenemos respuestas individuales de múltiples chicas
    const tieneRespuestasIndividuales = datos.respuestasIndividuales && datos.respuestasIndividuales.length > 0;
    
    // SISTEMA ANTI-REPETICION: Verificar y regenerar dialogos repetidos
    if (tieneRespuestasIndividuales) {
        // Verificar repeticion para cada chica individualmente y regenerar si es necesario
        for (const respuestaIndividual of datos.respuestasIndividuales) {
            const nombreChica = respuestaIndividual.chica;
            const dialogo = respuestaIndividual.respuesta;
            
            // Detectar repeticion en el historial de esta chica
            const deteccionRepeticion = detectarRepeticion(dialogo, nombreChica);
            if (deteccionRepeticion.esRepetido) {
                logQuinti('WARN', `Repeticion detectada en ${nombreChica}, regenerando dialogo...`, { 
                    similitud: deteccionRepeticion.similitudMaxima,
                    dialogoSimilar: deteccionRepeticion.dialogoSimilar.substring(0, 100)
                });
                
                // Regenerar dialogo para esta chica
                const nuevoDialogo = await regenerarDialogoAntiRepeticion(nombreChica, mensajeOriginal, dialogo, deteccionRepeticion.dialogoSimilar);
                respuestaIndividual.respuesta = nuevoDialogo;
                logQuinti('INFO', `Dialogo regenerado exitosamente para ${nombreChica}`);
            }
            
            // Detectar repeticion con otras chicas
            const otrasChicas = datos.respuestasIndividuales
                .filter(r => r.chica !== nombreChica)
                .map(r => r.chica);
            
            const deteccionEntreChicas = detectarRepeticionEntreChicas(respuestaIndividual.respuesta, nombreChica, otrasChicas);
            if (deteccionEntreChicas.tieneConflicto) {
                logQuinti('WARN', `Repeticion entre chicas detectada: ${nombreChica} similar a ${deteccionEntreChicas.chicaSimilar}, regenerando...`, {
                    similitud: deteccionEntreChicas.similitud
                });
                
                // Regenerar dialogo para evitar repeticion entre chicas
                const nuevoDialogo = await regenerarDialogoAntiRepeticionEntreChicas(nombreChica, mensajeOriginal, respuestaIndividual.respuesta, deteccionEntreChicas.chicaSimilar);
                respuestaIndividual.respuesta = nuevoDialogo;
                logQuinti('INFO', `Dialogo regenerado exitosamente para ${nombreChica} (evitar repeticion con ${deteccionEntreChicas.chicaSimilar})`);
            }
            
            // Agregar al historial (ahora con el dialogo ya verificado/regenerado)
            agregarDialogoAlHistorial(respuestaIndividual.respuesta, nombreChica);
        }
        
        // Actualizar la respuesta combinada con los dialogos regenerados
        datos.respuesta = datos.respuestasIndividuales
            .map(r => `[${r.chica}]: ${r.respuesta}`)
            .join('\\n\\n');
    } else if (chicaSeleccionada) {
        // Caso de una sola chica
        const deteccionRepeticion = detectarRepeticion(datos.respuesta, chicaSeleccionada);
        if (deteccionRepeticion.esRepetido) {
            logQuinti('WARN', `Repeticion detectada en ${chicaSeleccionada}, regenerando dialogo...`, { 
                similitud: deteccionRepeticion.similitudMaxima,
                dialogoSimilar: deteccionRepeticion.dialogoSimilar.substring(0, 100)
            });
            
            // Regenerar dialogo
            const nuevoDialogo = await regenerarDialogoAntiRepeticion(chicaSeleccionada, mensajeOriginal, datos.respuesta, deteccionRepeticion.dialogoSimilar);
            datos.respuesta = nuevoDialogo;
            logQuinti('INFO', 'Dialogo regenerado exitosamente');
        }
        agregarDialogoAlHistorial(datos.respuesta, chicaSeleccionada);
    }
    
    // Agregar al historial general de conversacion
    historialConversacion.push(
        { role: "user", content: mensajeOriginal },
        { role: "assistant", content: datos.respuesta }
    );
    
    // Mantener historial dentro del limite
    if (historialConversacion.length > MAX_HISTORIAL * 2) {
        historialConversacion = historialConversacion.slice(-MAX_HISTORIAL * 2);
    }
    
    let tagImagen, urlImagen, urlAudio;
    
    // Obtener el ID de la historia paralela activa si existe
    const historiaId = window.historiaParalelaActiva || null;
    
    if (tieneRespuestasIndividuales && datos.respuestasIndividuales.length > 0) {
        // Usar la imagen de la primera chica como principal (para compatibilidad)
        const primeraChica = datos.respuestasIndividuales[0];
        tagImagen = primeraChica && primeraChica.imagen_tag && primeraChica.imagen_tag.toLowerCase().trim() !== 'none' 
            ? primeraChica.imagen_tag 
            : 'hablando';
        const resultadoImagen = obtenerURLImagen(primeraChica.chica, tagImagen, historiaId);
        urlImagen = resultadoImagen.urlImagen;
        urlAudio = resultadoImagen.urlAudio;
    } else {
        // Seleccionar imagen automaticamente para la chica principal (caso de una sola chica)
        tagImagen = datos && datos.imagen_tag && datos.imagen_tag.toLowerCase().trim() !== 'none' 
            ? datos.imagen_tag 
            : 'normal';
        const resultadoImagen = obtenerURLImagen(chicaSeleccionada, tagImagen, historiaId);
        urlImagen = resultadoImagen.urlImagen;
        urlAudio = resultadoImagen.urlAudio;
    }
    
    // Detectar que chicas estan respondiendo en el mensaje
    const chicasRespondiendo = [];
    const responsePattern = /\[(Ichika|Nino|Miku|Yotsuba|Itsuki)\]:/gi;
    let match;
    while ((match = responsePattern.exec(datos.respuesta)) !== null) {
        const nombreChica = match[1];
        if (!chicasRespondiendo.includes(nombreChica)) {
            chicasRespondiendo.push(nombreChica);
        }
    }
    
    // Si no hay formato [Nombre]: pero hay multiples chicas en chat, agregar la principal
    if (chicasRespondiendo.length === 0 && chicasEnChat.size > 0) {
        chicasRespondiendo.push(...Array.from(chicasEnChat));
    }
    
    // IMPORTANTE: Cuando hay multiples chicas en el chat y la respuesta NO tiene el formato [Nombre]:,
    // pero DEBERIA tenerlo (porque hay 2+ chicas), forzamos que TODAS las chicas en el chat aparezcan como respondiendo
    // Esto asegura que la UI muestre correctamente que todas participaron
    if (chicasEnChat.size > 1 && chicasRespondiendo.length < chicasEnChat.size) {
        // La IA fallo en usar el formato correcto, pero igual consideramos que todas respondieron
        // para que la UI lo maneje apropiadamente
        logQuinti('WARN', 'Multiples chicas en chat pero la respuesta no usa formato [Nombre]: correctamente', {
            chicasEnChat: Array.from(chicasEnChat),
            chicasDetectadas: chicasRespondiendo
        });
    }

    logQuinti('INFO', 'Respuesta procesada exitosamente', {
        longitud: datos.respuesta.length,
        imagenTag: tagImagen,
        tieneImagen: !!urlImagen,
        chicasRespondiendo: chicasRespondiendo,
        chicasEnChat: Array.from(chicasEnChat),
        tieneRespuestasIndividuales: tieneRespuestasIndividuales
    });
    
    return {
        respuesta: datos.respuesta,
        imagen_tag: tagImagen,
        imagen_url: urlImagen,
        audio_url: urlAudio,
        modelo: MODELO_PRINCIPAL,
        chicaPrincipal: datos.chicaPrincipal || chicaSeleccionada,
        chicasRespondiendo: chicasRespondiendo,
        chicasEnChat: Array.from(chicasEnChat),
        respuestasIndividuales: datos.respuestasIndividuales || []
    };
}

/**
 * Regenera un dialogo cuando se detecta repeticion en el historial de una chica
 * @param {string} nombreChica - Nombre de la chica
 * @param {string} mensajeOriginal - Mensaje original del usuario
 * @param {string} dialogoOriginal - Dialogo original que se repitio
 * @param {string} dialogoSimilar - Dialogo similar detectado en el historial
 * @returns {Promise<string>} - Nuevo dialogo regenerado
 */
async function regenerarDialogoAntiRepeticion(nombreChica, mensajeOriginal, dialogoOriginal, dialogoSimilar) {
    try {
        const personalidadPrincipal = PERSONALIDADES[nombreChica] || "Eres una amiga virtual divertida y útil.";
        
        // Crear prompt especial anti-repeticion
        const promptAntiRepeticion = `⚠️ DETECCIÓN DE REPETICIÓN:\n\n` +
            `Tu respuesta anterior fue muy similar a esta que ya dijiste antes:\n"${dialogoSimilar.substring(0, 150)}..."\n\n` +
            `REESCRIBE tu respuesta de forma COMPLETAMENTE DIFERENTE:\n` +
            `- Usa otras palabras y expresiones\n` +
            `- Cambia la estructura de la oración\n` +
            `- Usa sinónimos\n` +
            `- Agrega o quita detalles\n` +
            `- Cambia el tono emocional\n\n` +
            `Responde al mensaje del usuario: "${mensajeOriginal}"\n` +
            `Evita usar las mismas frases o estructuras. Sé creativa y única.\n` +
            `Personalidad: ${personalidadPrincipal}\n\n` +
            `Tu nueva respuesta (solo el diálogo, sin formato JSON):`;
        
        const mensajesPayload = [
            { role: "system", content: QUINT_PRUEBA_SYSTEM_MINIMO },
            { role: "user", content: promptAntiRepeticion }
        ];
        
        let datosRegenerados;
        try {
            datosRegenerados = await intentarLlamadaAPI(mensajesPayload, MODELO_PRINCIPAL);
        } catch (error) {
            logQuinti('ERROR', `Error al regenerar dialogo anti-repeticion para ${nombreChica}: ${error.message}`);
            // Retornar dialogo original si falla la regeneracion
            return dialogoOriginal;
        }
        
        if (datosRegenerados && datosRegenerados.respuesta) {
            // Verificar que el nuevo dialogo no sea igual al anterior
            const nuevaSimilitud = calcularSimilitud(datosRegenerados.respuesta, dialogoOriginal);
            if (nuevaSimilitud < 0.8) {
                logQuinti('INFO', `Dialogo regenerado con exito (similitud reducida de 1.0 a ${nuevaSimilitud.toFixed(2)})`);
                return datosRegenerados.respuesta;
            } else {
                logQuinti('WARN', `Dialogo regenerado pero sigue siendo muy similar (${nuevaSimilitud.toFixed(2)})`);
                return datosRegenerados.respuesta;
            }
        }
        
        return dialogoOriginal;
    } catch (error) {
        logQuinti('ERROR', `Error inesperado en regenerarDialogoAntiRepeticion: ${error.message}`);
        return dialogoOriginal;
    }
}

/**
 * Regenera un dialogo cuando se detecta repeticion entre chicas
 * @param {string} nombreChica - Nombre de la chica
 * @param {string} mensajeOriginal - Mensaje original del usuario
 * @param {string} dialogoOriginal - Dialogo original que se repitio
 * @param {string} chicaSimilar - Nombre de la chica con la que se repitio
 * @returns {Promise<string>} - Nuevo dialogo regenerado
 */
async function regenerarDialogoAntiRepeticionEntreChicas(nombreChica, mensajeOriginal, dialogoOriginal, chicaSimilar) {
    try {
        const personalidadPrincipal = PERSONALIDADES[nombreChica] || "Eres una amiga virtual divertida y útil.";
        
        // Crear prompt especial anti-repeticion entre chicas
        const promptAntiRepeticion = `⚠️ DETECCIÓN DE REPETICIÓN ENTRE CHICAS:\n\n` +
            `Tu respuesta es muy similar a lo que dijo ${chicaSimilar}.\n\n` +
            `REESCRIBE tu respuesta de forma COMPLETAMENTE DIFERENTE:\n` +
            `- Usa otras palabras y expresiones\n` +
            `- Cambia la estructura de la oración\n` +
            `- Usa sinónimos\n` +
            `- Agrega o quita detalles\n` +
            `- Cambia el tono emocional\n` +
            `- Asegurate de tener tu propia voz y estilo unico\n\n` +
            `Responde al mensaje del usuario: "${mensajeOriginal}"\n` +
            `Evita sonar como ${chicaSimilar}. Sé creativa y única.\n` +
            `Personalidad: ${personalidadPrincipal}\n\n` +
            `Tu nueva respuesta (solo el diálogo, sin formato JSON):`;
        
        const mensajesPayload = [
            { role: "system", content: QUINT_PRUEBA_SYSTEM_MINIMO },
            { role: "user", content: promptAntiRepeticion }
        ];
        
        let datosRegenerados;
        try {
            datosRegenerados = await intentarLlamadaAPI(mensajesPayload, MODELO_PRINCIPAL);
        } catch (error) {
            logQuinti('ERROR', `Error al regenerar dialogo anti-repeticion entre chicas para ${nombreChica}: ${error.message}`);
            // Retornar dialogo original si falla la regeneracion
            return dialogoOriginal;
        }
        
        if (datosRegenerados && datosRegenerados.respuesta) {
            logQuinti('INFO', `Dialogo regenerado exitosamente para evitar repeticion con ${chicaSimilar}`);
            return datosRegenerados.respuesta;
        }
        
        return dialogoOriginal;
    } catch (error) {
        logQuinti('ERROR', `Error inesperado en regenerarDialogoAntiRepeticionEntreChicas: ${error.message}`);
        return dialogoOriginal;
    }
}

/**
 * Obtiene la URL de una imagen específica y su audio asociado
 * @param {string} nombreChica - Nombre de la chica
 * @param {string} tag - Tag de la imagen
 * @param {string} historiaId - ID de la historia paralela (opcional)
 * @returns {object} - Objeto con {urlImagen, urlAudio} o null
 */
function obtenerURLImagen(nombreChica, tag, historiaId = null) {
    // Si hay una historia paralela activa, intentar usar su mapeo de imagenTagsMapping
    if (historiaId) {
        const mappingHistoria = getImagenTagsMappingHistoria(historiaId);
        if (mappingHistoria && mappingHistoria[tag]) {
            return { urlImagen: mappingHistoria[tag], urlAudio: null };
        }
        // Si el tag no existe en el mapping pero existe el mapping, intentar con variantes
        if (mappingHistoria) {
            // Buscar tags que contengan el nombre del tag original
            for (const [mapTag, url] of Object.entries(mappingHistoria)) {
                if (mapTag.includes(tag) || tag.includes(mapTag.replace('nino_', ''))) {
                    return { urlImagen: url, urlAudio: null };
                }
            }
        }
    }
    
    // Aldo no tiene imágenes (personaje masculino)
    if (esAldo(nombreChica)) {
        return { urlImagen: null, urlAudio: null };
    }
    
    // Verificar si el personaje tiene imágenes disponibles
    if (!tieneImagenes(nombreChica)) {
        return { urlImagen: null, urlAudio: null };
    }
    
    if (!QuintiImagenesPrueba || !QuintiImagenesPrueba[nombreChica]) {
        return { urlImagen: null, urlAudio: null };
    }
    
    const chicaData = QuintiImagenesPrueba[nombreChica];
    
    if (tag === 'normal' || tag === 'hablando') {
        const imgObj = chicaData.imagenes?.['hablando'] || {};
        return { 
            urlImagen: chicaData.imagenSelector || imgObj.url || imgObj || null,
            urlAudio: imgObj.audio || null
        };
    }
    
    // Intentar obtener la imagen por tag
    const imgObj = chicaData.imagenes?.[tag];
    let urlImagen = imgObj?.url || imgObj;
    let urlAudio = imgObj?.audio || null;
    
    // MEJORA #1: Si no encuentra el tag exacto, usar el sistema inteligente de búsqueda de tags pertinentes
    if ((!urlImagen || tag.toLowerCase().trim() === 'none') && chicaData.imagenes && Object.keys(chicaData.imagenes).length > 0) {
        const tagsDisponibles = Object.keys(chicaData.imagenes);
        
        // Intentar encontrar el tag más pertinente usando múltiples criterios
        const tagPertinente = encontrarTagMasPertinente(tag, tagsDisponibles, '');
        
        if (tagPertinente) {
            const imgObjPertinente = chicaData.imagenes[tagPertinente];
            urlImagen = imgObjPertinente?.url || imgObjPertinente;
            urlAudio = imgObjPertinente?.audio || null;
            logQuinti('INFO', `Tag "${tag}" no encontrado, se encontró tag pertinente: "${tagPertinente}" para ${nombreChica}`);
        } else {
            // FALLBACK: Si no encuentra tag pertinente, usar la PRIMERA imagen disponible
            const primerTag = tagsDisponibles[0];
            const primerImgObj = chicaData.imagenes[primerTag];
            urlImagen = primerImgObj?.url || primerImgObj;
            urlAudio = primerImgObj?.audio || null;
            logQuinti('WARN', `Tag "${tag}" no encontrado para ${nombreChica}, usando primera imagen disponible: "${primerTag}"`);
        }
    }
    
    // Último fallback: imagenSelector
    if (!urlImagen) {
        urlImagen = chicaData.imagenSelector || null;
        urlAudio = null;
    }
    
    return { urlImagen, urlAudio };
}

// ============================================================
//  FUNCIONES PÚBLICAS DE LA API
// ============================================================

/**
 * Selecciona un personaje para el chat (puede ser una quintilliza o Aldo)
 * @param {string} nombrePersonaje - Nombre del personaje
 * @returns {boolean} - True si se seleccionó exitosamente
 */
function seleccionarChica(nombrePersonaje) {
    // Verificar si es Aldo o una quintilliza
    if (esAldo(nombrePersonaje) || PERSONALIDADES[nombrePersonaje]) {
        chicaSeleccionada = nombrePersonaje;
        historialConversacion = []; // Resetear historial al cambiar de personaje
        chicasEnChat = new Set([nombrePersonaje]); // Resetear conjunto de personajes en chat
        logQuinti('INFO', `Personaje seleccionado: ${nombrePersonaje}`);
        return true;
    }
    logQuinti('ERROR', `Intento de seleccionar personaje inválido: ${nombrePersonaje}`);
    return false;
}

/**
 * Obtiene el conjunto de chicas que están participando en el chat actual
 * @returns {Set} - Conjunto con los nombres de las chicas en el chat
 */
function getChicasEnChat() {
    return new Set(chicasEnChat);
}

/**
 * Limpia el conjunto de chicas en el chat (para cuando se cambia de chica o se reinicia)
 */
function limpiarChicasEnChat() {
    if (chicaSeleccionada) {
        chicasEnChat = new Set([chicaSeleccionada]);
    } else {
        chicasEnChat = new Set();
    }
    logQuinti('INFO', 'Chicas en chat reseteadas');
}

function getChicaSeleccionada() {
    return chicaSeleccionada;
}

function getImagenSelector(nombreChica) {
    if (QuintiImagenesPrueba && QuintiImagenesPrueba[nombreChica]) {
        return QuintiImagenesPrueba[nombreChica].imagenSelector;
    }
    return null;
}

/**
 * Conversa usando el historial acumulado internamente
 * @param {string} mensaje - Mensaje del usuario
 * @returns {Promise<object>} - Respuesta procesada
 */
async function conversar(mensaje) {
    // VERIFICAR si hay una historia paralela activa con su propio system prompt ADICIONAL
    const hayHistoriaParalela = window.historiaParalelaActiva && window.systemPromptHistoriaActual;
    
    // Agregar system prompt inicial solo si es el primer mensaje
    if (historialConversacion.length === 0 && chicaSeleccionada) {
        // Obtener el nombre del usuario desde la función global
        let nombreUsuario = 'usuario';
        if (typeof window !== 'undefined' && window.getNombreUsuario) {
            nombreUsuario = window.getNombreUsuario() || 'usuario';
        }
        
        // SIEMPRE agregar el system prompt base de logica.js primero
        const systemPromptConNombre = SYSTEM_PROMPT_INICIAL.replace(/{nombreUsuario}/g, nombreUsuario);
        historialConversacion.push({ role: "system", content: systemPromptConNombre });
        logQuinti('INFO', 'System prompt inicial de logica.js agregado', { prompt: systemPromptConNombre, nombreUsuario });
        
        // Si hay una historia paralela activa, agregar SU system prompt ADICIONAL después
        if (hayHistoriaParalela) {
            const systemPromptHistoria = window.systemPromptHistoriaActual;
            historialConversacion.push({ role: "system", content: systemPromptHistoria });
            logQuinti('INFO', 'System prompt ADICIONAL de historia paralela agregado', { 
                historia: window.historiaParalelaActiva, 
                promptLength: systemPromptHistoria.length 
            });
        }
    } else if (historialConversacion.length === 0 && !chicaSeleccionada && hayHistoriaParalela) {
        // Caso especial: historia paralela sin chica seleccionada (solo para RPG)
        // Obtener el nombre del usuario desde la función global
        let nombreUsuario = 'usuario';
        if (typeof window !== 'undefined' && window.getNombreUsuario) {
            nombreUsuario = window.getNombreUsuario() || 'usuario';
        }
        
        // Primero agregar system prompt minimo de logica.js con nombre de usuario
        const systemPromptConNombre = SYSTEM_PROMPT_INICIAL.replace(/{nombreUsuario}/g, nombreUsuario);
        historialConversacion.push({ role: "system", content: systemPromptConNombre });
        logQuinti('INFO', 'System prompt inicial de logica.js agregado (modo historia paralela)', { nombreUsuario });
        
        // Luego agregar el system prompt ADICIONAL de la historia
        const systemPromptHistoria = window.systemPromptHistoriaActual;
        historialConversacion.push({ role: "system", content: systemPromptHistoria });
        logQuinti('INFO', 'System prompt ADICIONAL de historia paralela agregado', { 
            historia: window.historiaParalelaActiva, 
            promptLength: systemPromptHistoria.length 
        });
    }
    
    return obtenerRespuestaGroq(mensaje, historialConversacion);
}

/**
 * Obtiene el historial de conversación actual
 * @returns {Array} - Historial de mensajes
 */
function getHistorial() {
    return [...historialConversacion];
}

/**
 * Limpia el historial de conversación
 */
function limpiarHistorial() {
    historialConversacion = [];
    logQuinti('INFO', 'Historial limpiado');
}

// Exportar funciones para uso en otros módulos (ES6 modules)
export {
    obtenerRespuestaGroq,
    conversar,
    seleccionarChica,
    getChicaSeleccionada,
    getImagenSelector,
    getChicasDisponibles,
    getChicasEnChat,
    limpiarChicasEnChat,
    getHistorial,
    limpiarHistorial,
    GROQ_KEYS,
    MODELO_PRINCIPAL,
    PERSONALIDADES,
    // Funciones de utilidad
    logQuinti,
    logErrorAPI,
    formatearErrorUsuario,
    seleccionarImagenAutomatica,
    obtenerTagsImagen,
    actualizarAccionEnCurso,
    getAccionEnCurso,
    verificarAccionEnCurso,  // NUEVA FUNCIÓN: Verificación dinámica de acción en curso
    getEstadoAccion,
    getMemoriaEventosIntimos,
    registrarEventoImportante,
    // Funciones de memoria mejoradas
    agregarHechoMemoria,
    actualizarMemoriaTrabajo,
    generarResumenNarrativo,
    obtenerEstadoMemoriaParaPrompt,
    procesarMensajeParaMemoria,
    // Funciones anti-repeticion
    detectarRepeticion,
    detectarRepeticionEntreChicas,
    agregarDialogoAlHistorial,
    generarPromptAntiRepeticion,
    getEstadisticasRepeticion,
    regenerarDialogoAntiRepeticion,
    regenerarDialogoAntiRepeticionEntreChicas,
    // Función de formateo de texto
    formatearTextoConAsteriscos,
    // Función de parseo de JSON (para tests)
    parsearJSON,
    // Función para obtener URLs de imágenes
    obtenerURLImagen
};

// Exportar para window (compatibilidad con browser)
if (typeof window !== 'undefined') {
    window.logQuinti = logQuinti;
    window.formatearErrorUsuario = formatearErrorUsuario;
    window.seleccionarImagenAutomatica = seleccionarImagenAutomatica;
    window.obtenerTagsImagen = obtenerTagsImagen;
    window.getChicasEnChat = getChicasEnChat;
    window.limpiarChicasEnChat = limpiarChicasEnChat;
    window.actualizarAccionEnCurso = actualizarAccionEnCurso;
    window.getAccionEnCurso = getAccionEnCurso;
    window.verificarAccionEnCurso = verificarAccionEnCurso;  // NUEVA FUNCIÓN
    window.getEstadoAccion = getEstadoAccion;
    window.getMemoriaEventosIntimos = getMemoriaEventosIntimos;
    window.registrarEventoImportante = registrarEventoImportante;
    window.limpiarHistorialConversacion = limpiarHistorial; // Para usar desde chat.html
    // Funciones de memoria mejoradas
    window.agregarHechoMemoria = agregarHechoMemoria;
    window.actualizarMemoriaTrabajo = actualizarMemoriaTrabajo;
    window.generarResumenNarrativo = generarResumenNarrativo;
    window.obtenerEstadoMemoriaParaPrompt = obtenerEstadoMemoriaParaPrompt;
    window.procesarMensajeParaMemoria = procesarMensajeParaMemoria;
    // Función de formateo de texto
    window.formatearTextoConAsteriscos = formatearTextoConAsteriscos;
    // Funciones del parser de acciones (se importan desde parserAcciones.js)
    window.procesarMensajeParaUI = null;
    window.tieneMultiplesAcciones = null;
    // Función de parseo de JSON (para tests)
    window.parsearJSON = parsearJSON;
    // Función para obtener URLs de imágenes
    window.obtenerURLImagen = obtenerURLImagen;
}

// Exportar funciones para uso en otros módulos (CommonJS - compatibilidad)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        obtenerRespuestaGroq,
        conversar,
        seleccionarChica,
        getChicaSeleccionada,
        getImagenSelector,
        getChicasDisponibles,
        getChicasEnChat,
        limpiarChicasEnChat,
        getHistorial,
        limpiarHistorial,
        GROQ_KEYS,
        MODELO_PRINCIPAL,
        PERSONALIDADES,
        // Funciones de utilidad
        logQuinti,
        formatearErrorUsuario,
        seleccionarImagenAutomatica,
        obtenerTagsImagen,
        actualizarAccionEnCurso,
        getAccionEnCurso,
        getEstadoAccion,
        getMemoriaEventosIntimos,
        registrarEventoImportante,
        obtenerURLImagen
    };
}
