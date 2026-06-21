// ============================================================
//  Sistema Anti-Repeticion de Dialogos
//  Archivo: antiRepeticion.js
//  Carpeta: quintillizasPrueba
//  
//  CARACTERÍSTICAS:
//  - Detecta similitud entre dialogos usando analisis semantico simple
//  - Compara dialogo actual con historial de cada chica
//  - Compara dialogos entre diferentes chicas en tiempo real
//  - Genera variaciones unicas cuando detecta repeticion
//  - API call independiente por chica para diversificar respuestas
//  - Umbral de similitud reducido para mayor sensibilidad
// ============================================================

import { logQuinti } from './logica.js';

// Historial de dialogos por chica para detectar repeticiones
const historialDialogosPorChica = {
    Ichika: [],
    Nino: [],
    Miku: [],
    Yotsuba: [],
    Itsuki: []
};

const MAX_HISTORIAL_DIALOGOS = 20; // Mantener ultimos 20 dialogos por chica (aumentado)

// Umbral de similitud (0-1) - si supera este valor, se considera repeticion
// REDUCIDO para ser más sensible y detectar más repeticiones
const UMBRAL_SIMILITUD = 0.55;

/**
 * Normaliza texto para comparacion (quita tildes, minusculas, etc)
 */
function normalizarTexto(texto) {
    return texto
        .toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Quitar tildes
        .replace(/[^\w\s]/g, '') // Quitar puntuacion
        .trim();
}

/**
 * Calcula similitud entre dos textos usando Jaccard similarity
 * @param {string} texto1 
 * @param {string} texto2 
 * @returns {number} - Valor entre 0 y 1 (1 = identicos)
 */
function calcularSimilitud(texto1, texto2) {
    const palabras1 = new Set(normalizarTexto(texto1).split(/\s+/));
    const palabras2 = new Set(normalizarTexto(texto2).split(/\s+/));
    
    if (palabras1.size === 0 || palabras2.size === 0) return 0;
    
    const interseccion = [...palabras1].filter(p => palabras2.has(p)).length;
    const union = new Set([...palabras1, ...palabras2]).size;
    
    return interseccion / union;
}

/**
 * Verifica si un dialogo es muy similar a otros en el historial
 * @param {string} nuevoDialogo - El dialogo a verificar
 * @param {string} nombreChica - Nombre de la chica
 * @returns {object} - { esRepetido: boolean, similitudMaxima: number, dialogoSimilar: string }
 */
function detectarRepeticion(nuevoDialogo, nombreChica) {
    const historial = historialDialogosPorChica[nombreChica] || [];
    
    let similitudMaxima = 0;
    let dialogoSimilar = '';
    
    for (const dialogoPrevio of historial) {
        const similitud = calcularSimilitud(nuevoDialogo, dialogoPrevio);
        if (similitud > similitudMaxima) {
            similitudMaxima = similitud;
            dialogoSimilar = dialogoPrevio;
        }
    }
    
    return {
        esRepetido: similitudMaxima >= UMBRAL_SIMILITUD,
        similitudMaxima,
        dialogoSimilar
    };
}

/**
 * Verifica si el dialogo de una chica es muy similar al de otra chica
 * @param {string} nuevoDialogo - El dialogo a verificar
 * @param {string} nombreChicaActual - Nombre de la chica actual
 * @param {string[]} otrasChicas - Nombres de las otras chicas en el chat
 * @returns {object} - { tieneConflicto: boolean, chicaSimilar: string, similitud: number }
 */
function detectarRepeticionEntreChicas(nuevoDialogo, nombreChicaActual, otrasChicas) {
    let similitudMaxima = 0;
    let chicaSimilar = '';
    
    for (const otraChica of otrasChicas) {
        if (otraChica === nombreChicaActual) continue;
        
        const ultimoDialogo = historialDialogosPorChica[otraChica]?.[0] || '';
        if (!ultimoDialogo) continue;
        
        const similitud = calcularSimilitud(nuevoDialogo, ultimoDialogo);
        if (similitud > similitudMaxima) {
            similitudMaxima = similitud;
            chicaSimilar = otraChica;
        }
    }
    
    return {
        tieneConflicto: similitudMaxima >= UMBRAL_SIMILITUD,
        chicaSimilar,
        similitud: similitudMaxima
    };
}

/**
 * Agrega un dialogo al historial de una chica
 * @param {string} dialogo - El dialogo a agregar
 * @param {string} nombreChica - Nombre de la chica
 */
function agregarDialogoAlHistorial(dialogo, nombreChica) {
    if (!historialDialogosPorChica[nombreChica]) {
        historialDialogosPorChica[nombreChica] = [];
    }
    
    // Agregar al inicio del array
    historialDialogosPorChica[nombreChica].unshift(dialogo);
    
    // Mantener solo los ultimos MAX_HISTORIAL_DIALOGOS
    if (historialDialogosPorChica[nombreChica].length > MAX_HISTORIAL_DIALOGOS) {
        historialDialogosPorChica[nombreChica].pop();
    }
    
    logQuinti('DEBUG', `Dialogo agregado al historial de ${nombreChica}`, { 
        totalDialogos: historialDialogosPorChica[nombreChica].length 
    });
}

/**
 * Genera prompt especial para evitar repeticion
 * @param {string} nombreChica - Nombre de la chica
 * @param {string} dialogoOriginal - El dialogo original que se quiere variar
 * @param {string[]} dialogosSimilares - Lista de dialogos similares previos
 * @returns {string} - Prompt para regenerar respuesta sin repeticion
 */
function generarPromptAntiRepeticion(nombreChica, dialogoOriginal, dialogosSimilares) {
    const listaDialogos = dialogosSimilares
        .map((d, i) => `${i + 1}. "${d.substring(0, 100)}..."`)
        .join('\\n');
    
    return `⚠️ DETECCIÓN DE REPETICIÓN:\\n\\n` +
           `Tu respuesta anterior fue muy similar a estas que ya dijiste antes:\\n${listaDialogos}\\n\\n` +
           `REESCRIBE tu respuesta de forma COMPLETAMENTE DIFERENTE:\\n` +
           `- Usa otras palabras y expresiones\\n` +
           `- Cambia la estructura de la oración\\n` +
           `- Usa sinónimos\\n` +
           `- Agrega o quita detalles\\n` +
           `- Cambia el tono emocional\\n\\n` +
           `Evita usar las mismas frases o estructuras. Sé creativa y única.`;
}

/**
 * Limpia el historial de una chica específica
 * @param {string} nombreChica - Nombre de la chica
 */
function limpiarHistorialChica(nombreChica) {
    if (historialDialogosPorChica[nombreChica]) {
        historialDialogosPorChica[nombreChica] = [];
        logQuinti('INFO', `Historial de ${nombreChica} limpiado`);
    }
}

/**
 * Limpia todos los historiales
 */
function limpiarTodosLosHistoriales() {
    for (const chica of Object.keys(historialDialogosPorChica)) {
        historialDialogosPorChica[chica] = [];
    }
    logQuinti('INFO', 'Todos los historiales fueron limpiados');
}

/**
 * Obtiene estadísticas de repeticion por chica
 * @returns {object} - Estadisticas de cada chica
 */
function getEstadisticasRepeticion() {
    const estadisticas = {};
    
    for (const [chica, historial] of Object.entries(historialDialogosPorChica)) {
        estadisticas[chica] = {
            totalDialogos: historial.length,
            dialogosUnicos: new Set(historial.map(d => normalizarTexto(d))).size
        };
    }
    
    return estadisticas;
}

// Exportar funciones
export {
    detectarRepeticion,
    detectarRepeticionEntreChicas,
    agregarDialogoAlHistorial,
    generarPromptAntiRepeticion,
    limpiarHistorialChica,
    limpiarTodosLosHistoriales,
    getEstadisticasRepeticion,
    calcularSimilitud,
    historialDialogosPorChica
};
