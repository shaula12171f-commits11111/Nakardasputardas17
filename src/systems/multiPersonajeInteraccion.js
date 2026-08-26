// ============================================================
//  SISTEMA DE INTERACCIÓN MULTI-PERSONAJE MEJORADO
//  Archivo: multiPersonajeInteraccion.js
//  Ubicación: src/systems/multiPersonajeInteraccion.js
//  
//  CARACTERÍSTICAS IMPLEMENTADAS:
//  - Dinámica de grupo realista con personalidad emergente
//  - Turnos dinámicos basados en contexto y personalidad
//  - Reacciones cruzadas automáticas entre personajes
//  - Memoria de interacciones previas entre personajes específicos
//  - Detección de conflictos y alianzas naturales
//  - Sistema de "acotaciones internas" (pensamientos antes de hablar)
//  - Variación en longitud y estilo según quién habla
//  - Interrupciones naturales y solapamiento de diálogos
// ============================================================

import { PERSONALIDADES } from '../characters/personalidades.js';
import { PERSONAJES_MASCULINOS } from '../characters/personajesMasculinos.js';

// ============================================================
//  CONFIGURACIÓN DEL SISTEMA MULTI-PERSONAJE
// ============================================================

const CONFIG_MULTI_PERSONAJE = {
    maxPersonajesActivos: 5,           // Máximo personajes que pueden hablar en un turno
    probabilidadRespuestaMultiple: 0.7, // 70% chance de que otros personajes reaccionen
    minTurnosParaResumen: 3,           // Resumir cada 3 turnos en conversaciones grupales
    maxLongitudHistorialGrupo: 15,     // Historial máximo para conversaciones grupales
    umbralSimilitudTematica: 0.6,      // Umbral para detectar si personajes hablan de lo mismo
};

// ============================================================
//  MEMORIA DE RELACIONES ENTRE PERSONAJES
// ============================================================

/**
 * Almacena la historia de interacciones entre pares de personajes
 * Esto permite que las relaciones evolucionen naturalmente
 */
let memoriaRelacionesPersonajes = {
    // Formato: 'Personaje1_Personaje2': {
    //   nivelAmistad: 0-10,
    //   tensionRomantica: 0-10,
    //   conflictosNoResueltos: [],
    //   momentosCompartidos: [],
    //   temasFrecuentes: [],
    //   ultimaInteraccion: timestamp
    // }
};

/**
 * Actualiza la relación entre dos personajes basado en su interacción
 * @param {string} personaje1 - Nombre del primer personaje
 * @param {string} personaje2 - Nombre del segundo personaje
 * @param {string} tipoInteraccion - Tipo de interacción ('aliado', 'conflicto', 'romantico', 'neutral')
 * @param {number} intensidad - Intensidad de la interacción (0-10)
 */
export function actualizarRelacionPersonajes(personaje1, personaje2, tipoInteraccion, intensidad = 5) {
    const key = [personaje1, personaje2].sort().join('_');
    
    if (!memoriaRelacionesPersonajes[key]) {
        memoriaRelacionesPersonajes[key] = {
            nivelAmistad: 5,
            tensionRomantica: 0,
            conflictosNoResueltos: [],
            momentosCompartidos: [],
            temasFrecuentes: [],
            ultimaInteraccion: Date.now(),
            interaccionesRecientes: []
        };
    }
    
    const relacion = memoriaRelacionesPersonajes[key];
    
    // Actualizar según tipo de interacción
    switch (tipoInteraccion) {
        case 'aliado':
            relacion.nivelAmistad = Math.min(10, relacion.nivelAmistad + (intensidad * 0.3));
            relacion.momentosCompartidos.push({
                tipo: 'alianza',
                descripcion: `Apoyo mutuo detectado`,
                timestamp: Date.now()
            });
            break;
            
        case 'conflicto':
            relacion.nivelAmistad = Math.max(0, relacion.nivelAmistad - (intensidad * 0.4));
            relacion.conflictosNoResueltos.push({
                descripcion: `Conflicto detectado`,
                timestamp: Date.now(),
                intensidad
            });
            // Mantener solo últimos 3 conflictos
            if (relacion.conflictosNoResueltos.length > 3) {
                relacion.conflictosNoResueltos.shift();
            }
            break;
            
        case 'romantico':
            relacion.tensionRomantica = Math.min(10, relacion.tensionRomantica + (intensidad * 0.5));
            relacion.momentosCompartidos.push({
                tipo: 'romantico',
                descripcion: `Tensión romántica detectada`,
                timestamp: Date.now()
            });
            break;
            
        case 'competencia':
            relacion.tensionRomantica = Math.min(10, relacion.tensionRomantica + (intensidad * 0.2));
            relacion.nivelAmistad = Math.max(0, relacion.nivelAmistad - (intensidad * 0.1));
            break;
    }
    
    // Registrar interacción reciente
    relacion.interaccionesRecientes.push({
        tipo: tipoInteraccion,
        intensidad,
        timestamp: Date.now()
    });
    
    // Mantener solo últimas 10 interacciones
    if (relacion.interaccionesRecientes.length > 10) {
        relacion.interaccionesRecientes.shift();
    }
    
    relacion.ultimaInteraccion = Date.now();
    
    console.log(`[RELACIÓN] ${personaje1} ↔ ${personaje2}: ${tipoInteraccion} (intensidad: ${intensidad})`);
    console.log(`  → Amistad: ${relacion.nivelAmistad.toFixed(1)}, Tensión romántica: ${relacion.tensionRomantica.toFixed(1)}`);
}

/**
 * Obtiene el estado actual de la relación entre dos personajes
 * @param {string} personaje1 
 * @param {string} personaje2 
 * @returns {Object|null} Estado de la relación o null si no existe
 */
export function obtenerRelacionPersonajes(personaje1, personaje2) {
    const key = [personaje1, personaje2].sort().join('_');
    return memoriaRelacionesPersonajes[key] || null;
}

/**
 * Genera un resumen de dinámicas grupales para incluir en el prompt
 * @param {Array<string>} personajesEnChat 
 * @returns {string} Descripción de dinámicas activas
 */
export function generarResumenDinamicasGrupales(personajesEnChat) {
    if (personajesEnChat.length < 2) return '';
    
    let resumen = '\n👥 DINÁMICAS GRUPALES ACTIVAS:\n';
    const dinamicas = [];
    
    // Analizar todas las parejas
    for (let i = 0; i < personajesEnChat.length; i++) {
        for (let j = i + 1; j < personajesEnChat.length; j++) {
            const p1 = personajesEnChat[i];
            const p2 = personajesEnChat[j];
            const relacion = obtenerRelacionPersonajes(p1, p2);
            
            if (relacion) {
                // Detectar dinámica significativa
                if (relacion.nivelAmistad >= 8) {
                    dinamicas.push(`• ${p1} y ${p2} tienen una AMISTAD MUY FUERTE. Se apoyan mutuamente.`);
                }
                if (relacion.nivelAmistad <= 3) {
                    dinamicas.push(`• ${p1} y ${p2} tienen TENSIÓN o CONFLICTO. Hay distancia entre ellos.`);
                }
                if (relacion.tensionRomantica >= 7) {
                    dinamicas.push(`• ${p1} y ${p2} tienen QUÍMICA ROMÁNTICA evidente. Hay atracción mutua.`);
                }
                if (relacion.conflictosNoResueltos.length > 0) {
                    dinamicas.push(`• ${p1} y ${p2} tienen CONFLICTOS SIN RESOLVER. Puede haber tensión.`);
                }
                
                // Analizar interacciones recientes
                const ultimasInteracciones = relacion.interaccionesRecientes.slice(-3);
                if (ultimasInteracciones.some(i => i.tipo === 'conflicto' && i.intensidad > 6)) {
                    dinamicas.push(`• ⚠️ ${p1} y ${p2} tuvieron un conflicto RECIÉN. La tensión está alta.`);
                }
                if (ultimasInteracciones.some(i => i.tipo === 'romantico' && i.intensidad > 6)) {
                    dinamicas.push(`• 💕 ${p1} y ${p2} compartieron un momento ÍNTIMO reciente.`);
                }
            }
        }
    }
    
    if (dinamicas.length === 0) {
        return '';
    }
    
    resumen += dinamicas.join('\n');
    resumen += '\n⚠️ ESTAS DINÁMICAS DEBEN INFLUIR CÓMO LOS PERSONAJES INTERACTÚAN ENTRE SÍ Y CON EL USUARIO.';
    
    return resumen;
}

// ============================================================
//  SISTEMA DE TURNOS DINÁMICOS
// ============================================================

/**
 * Determina qué personajes deben responder basándose en:
 * - A quién se dirige el usuario
 * - Personalidad de cada personaje (extrovertido vs introvertido)
 * - Contexto emocional de la conversación
 * - Historial reciente (quién habló mucho/poco)
 * 
 * @param {Array<string>} personajesDisponibles 
 * @param {string} mensajeUsuario 
 * @param {Array<Object>} historialConversacion 
 * @returns {Array<{nombre: string, prioridad: number, razon: string}>}
 */
export function determinarOrdenTurnos(personajesDisponibles, mensajeUsuario, historialConversacion) {
    const ordenTurnos = [];
    
    // 1. Detectar si el usuario se dirige a alguien específico
    const personajeObjetivo = detectarPersonajeObjetivo(mensajeUsuario, personajesDisponibles);
    
    // 2. Calcular score para cada personaje
    for (const personaje of personajesDisponibles) {
        let score = 5; // Score base
        const razones = [];
        
        // Bonus por ser el objetivo directo
        if (personaje === personajeObjetivo) {
            score += 4;
            razones.push('objetivo_directo');
        }
        
        // Considerar personalidad
        const personalidad = obtenerPersonalidad(personaje);
        if (personalidad) {
            // Personajes extrovertidos tienen más chance de hablar
            if (esExtrovertido(personalidad)) {
                score += 2;
                razones.push('personalidad_extrovertida');
            }
            
            // Personajes tímidos necesitan más incentivo
            if (esIntrovertido(personalidad) && personaje !== personajeObjetivo) {
                score -= 1;
                razones.push('personalidad_introvertida');
            }
        }
        
        // Penalizar si habló recientemente (evitar dominar conversación)
        const vecesHabloRecientemente = contarIntervencionesRecientes(personaje, historialConversacion, 5);
        if (vecesHabloRecientemente >= 3) {
            score -= 2;
            razones.push('hablo_mucho_recientemente');
        } else if (vecesHabloRecientemente === 0 && personajesDisponibles.length > 2) {
            score += 1;
            razones.push('no_hablo_recientemente');
        }
        
        // Bonus si el tema coincide con intereses del personaje
        const temaActual = extraerTemaPrincipal(mensajeUsuario);
        if (temaActual && coincideConInteresesPersonaje(personaje, temaActual)) {
            score += 2;
            razones.push('interes_en_tema');
        }
        
        ordenTurnos.push({
            nombre: personaje,
            score,
            prioridad: score,
            razones
        });
    }
    
    // Ordenar por score descendente
    ordenTurnos.sort((a, b) => b.score - a.score);
    
    // Limitar número de personajes activos
    const maxActivos = Math.min(CONFIG_MULTI_PERSONAJE.maxPersonajesActivos, personajesDisponibles.length);
    
    return ordenTurnos.slice(0, maxActivos);
}

/**
 * Detecta a qué personaje se dirige específicamente el usuario
 */
function detectarPersonajeObjetivo(mensaje, personajes) {
    const mensajeLower = mensaje.toLowerCase();
    
    // Patrones de dirección directa
    const patrones = [
        /(?:oye|hey|eh)\s+([a-záéíóúñ]+)/i,
        /([a-záéíóúñ]+)\s*(?:,|\?|!)/i,
        /(?:tú|tu|te|ti)\s+([a-záéíóúñ]+)/i,
        /(?:habla|di|cuenta|responde)\s+([a-záéíóúñ]+)/i
    ];
    
    for (const patron of patrones) {
        const match = mensaje.match(patron);
        if (match) {
            const nombreDetectado = match[1].toLowerCase();
            for (const personaje of personajes) {
                if (personaje.toLowerCase().includes(nombreDetectado) || 
                    nombreDetectado.includes(personaje.toLowerCase())) {
                    return personaje;
                }
            }
        }
    }
    
    return null;
}

/**
 * Obtiene la personalidad de un personaje
 */
function obtenerPersonalidad(nombrePersonaje) {
    return PERSONALIDADES[nombrePersonaje] || PERSONAJES_MASCULINOS[nombrePersonaje]?.personalidad || null;
}

/**
 * Determina si una personalidad es extrovertida
 */
function esExtrovertido(personalidad) {
    const textoLower = personalidad.toLowerCase();
    return textoLower.includes('extrovertid') || 
           textoLower.includes('sociable') || 
           textoLower.includes('hablador') ||
           textoLower.includes('energétic') ||
           textoLower.includes('alegre') ||
           textoLower.includes('carismátic');
}

/**
 * Determina si una personalidad es introvertida
 */
function esIntrovertido(personalidad) {
    const textoLower = personalidad.toLowerCase();
    return textoLower.includes('introvertid') || 
           textoLower.includes('tímid') || 
           textoLower.includes('reservad') ||
           textoLower.includes('callad') ||
           textoLower.includes('tranquil');
}

/**
 * Cuenta cuántas veces un personaje intervino recientemente
 */
function contarIntervencionesRecientes(personaje, historial, ventanaTurnos) {
    const intervencionesRecientes = historial.slice(-ventanaTurnos).filter(msg => {
        return msg.role === 'assistant' && 
               (msg.name === personaje || msg.content.includes(`${personaje}:`));
    });
    return intervencionesRecientes.length;
}

/**
 * Extrae el tema principal de un mensaje
 */
function extraerTemaPrincipal(mensaje) {
    const temasClave = [
        'amor', 'sexo', 'beso', 'relación', 'amigo', 'trabajo', 
        'escuela', 'futuro', 'pasado', 'celos', 'confianza',
        'miedo', 'sueño', 'fantasía', 'deseo'
    ];
    
    const mensajeLower = mensaje.toLowerCase();
    for (const tema of temasClave) {
        if (mensajeLower.includes(tema)) {
            return tema;
        }
    }
    
    return null;
}

/**
 * Verifica si un tema coincide con los intereses de un personaje
 */
function coincideConInteresesPersonaje(personaje, tema) {
    // Mapeo simplificado de intereses por personaje
    const interesesPorPersonaje = {
        'Ichika': ['trabajo', 'esfuerzo', 'superación'],
        'Nino': ['amor', 'relación', 'celos', 'cocina'],
        'Miku': ['amigo', 'diversión', 'juegos'],
        'Yotsuba': ['deporte', 'energía', 'alegría'],
        'Itsuki': ['estudio', 'comida', 'responsabilidad']
    };
    
    const intereses = interesesPorPersonaje[personaje] || [];
    return intereses.some(interes => tema.toLowerCase().includes(interes.toLowerCase()));
}

// ============================================================
//  GENERADOR DE ACOTACIONES INTERNAS (PENSAMIENTOS)
// ============================================================

/**
 * Genera acotaciones internas que simulan el proceso de pensamiento
 * de un personaje antes de hablar
 * 
 * @param {string} personaje 
 * @param {string} contexto 
 * @param {Array<string>} respuestasOtros 
 * @returns {string} Acotación interna
 */
export function generarAcotacionInterna(personaje, contexto, respuestasOtros = []) {
    const personalidad = obtenerPersonalidad(personaje);
    
    if (!personalidad) return '';
    
    // Determinar tono de pensamiento según personalidad
    let pensamientosPosibles = [];
    
    if (respuestasOtros.length > 0) {
        // Reaccionar a lo que dijeron otros
        pensamientosPosibles.push(
            `(¿Qué pienso sobre lo que dijeron los demás?)`,
            `(¿Estoy de acuerdo o debería decir algo diferente?)`,
            `(¿Cómo puedo aportar algo único a esta conversación?)`
        );
    }
    
    // Agregar pensamientos específicos según contexto
    if (contexto.toLowerCase().includes('sexo') || contexto.toLowerCase().includes('beso')) {
        pensamientosPosibles.push(
            `(¿Cómo me siento con esta situación íntima?)`,
            `(¿Qué deseo en este momento?)`,
            `(¿Cómo quiero que sea este momento?)`
        );
    }
    
    if (contexto.toLowerCase().includes('conflicto') || contexto.toLowerCase().includes('problema')) {
        pensamientosPosibles.push(
            `(¿Cómo puedo ayudar a resolver esto?)`,
            `(¿Debería tomar partido?)`,
            `(¿Qué es lo mejor para todos?)`
        );
    }
    
    // Seleccionar pensamiento aleatorio
    const pensamiento = pensamientosPosibles[Math.floor(Math.random() * pensamientosPosibles.length)];
    
    return pensamiento;
}

// ============================================================
//  DETECTOR DE SOLAPAMIENTO DE DIÁLOGOS
// ============================================================

/**
 * Detecta si hay solapamiento temático entre respuestas de personajes
 * y sugiere variaciones para evitar repetición
 * 
 * @param {Array<{personaje: string, respuesta: string}>} respuestas 
 * @returns {Object} Análisis de solapamiento
 */
export function analizarSolapamientoDialogos(respuestas) {
    if (respuestas.length < 2) return { solapamiento: false, sugerencias: [] };
    
    const analisis = {
        solapamiento: false,
        temasRepetidos: [],
        frasesSimilares: [],
        sugerencias: []
    };
    
    // Extraer temas de cada respuesta
    const temasPorPersonaje = respuestas.map(r => ({
        personaje: r.personaje,
        temas: extraerTemasDeTexto(r.respuesta)
    }));
    
    // Detectar temas repetidos
    const todosLosTemas = temasPorPersonaje.flatMap(t => t.temas);
    const conteoTemas = {};
    
    for (const tema of todosLosTemas) {
        conteoTemas[tema] = (conteoTemas[tema] || 0) + 1;
        if (conteoTemas[tema] === 2) {
            analisis.temasRepetidos.push(tema);
            analisis.solapamiento = true;
        }
    }
    
    // Generar sugerencias si hay solapamiento
    if (analisis.solapamiento) {
        analisis.sugerencias = temasPorPersonaje.map(tp => ({
            personaje: tp.personaje,
            sugerencia: `Intenta abordar un ángulo diferente de: ${tp.temas.join(', ')}`
        }));
    }
    
    return analisis;
}

/**
 * Extrae temas clave de un texto
 */
function extraerTemasDeTexto(texto) {
    const temas = [];
    const textoLower = texto.toLowerCase();
    
    const palabrasClave = {
        'amor': ['amor', 'querer', 'enamorado', 'corazón'],
        'acción_física': ['beso', 'tocar', 'acariciar', 'abrazo'],
        'emocion': ['feliz', 'triste', 'enojado', 'nervioso', 'emocionado'],
        'lugar': ['casa', 'habitación', 'cama', 'sofá', 'cocina'],
        'tiempo': ['ahora', 'después', 'antes', 'siempre', 'nunca']
    };
    
    for (const [categoria, palabras] of Object.entries(palabrasClave)) {
        for (const palabra of palabras) {
            if (textoLower.includes(palabra)) {
                temas.push(`${categoria}:${palabra}`);
                break;
            }
        }
    }
    
    return temas;
}

// ============================================================
//  EXPORTACIÓN DE FUNCIONES PRINCIPALES
// ============================================================

export default {
    actualizarRelacionPersonajes,
    obtenerRelacionPersonajes,
    generarResumenDinamicasGrupales,
    determinarOrdenTurnos,
    generarAcotacionInterna,
    analizarSolapamientoDialogos,
    CONFIG_MULTI_PERSONAJE
};
