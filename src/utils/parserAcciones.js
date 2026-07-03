// ============================================================
//  PARSER DE ACCIONES - Quintillizas Prueba
//  Archivo: parserAcciones.js
//  Descripción: Detecta acciones en el texto de la IA y divide
//               el mensaje para insertar imágenes en el lugar correcto
//               INCLUYE: análisis de contexto, verbos + sustantivos,
//               validación por puntuación y múltiples capas de detección
// ============================================================

/**
 * Lista de tags de acciones sexuales/explícitas que deben mostrar imagen
 * @type {string[]}
 */
const TAGS_ACCIONES_EXPLICITAS = [
    'besando',
    'chupando_solo_la_punta_del_pene',
    'chupando_solo_la_mitad_del_pene',
    'chupando_todo_el_pene',
    'chupando_todo_el_pene_mano_en_su_cabeza_empujandola',
    'chupando_bolas',
    'chupando_bola_izquierda',
    'chupando_bola_derecha',
    'doggystyle',
    'misionero',
    'desnuda',
    'standfuck_follando_de_pie',
    'follando_en_la_ventana',
    'handjob_paja',
    'reverse_cowgirl',
    'reverse_cowgirl_le_estiro_el_ano',
    'sidefuck',
    'anal',
    'anal_cumming',
    'ichika_licking_anus',
    'nino_licking_anus',
    'miku_licking_anus',
    'follando_en_el_aire',
    'me_corro_en_su_boca_de_ichika',
    'me_corro_en_su_boca_de_nino',
    'me_corro_en_su_boca_de_miku',
    'manos_alrededor_del_cuello',
    'laminedo_pene',
    'mostrando_culo_tanga_negra'
];

/**
 * Configuración de pesos para el sistema de puntuación
 * VERBOS tienen mayor peso (son la acción principal)
 * SUSTANTIVOS tienen peso medio (contexto de la acción)
 * ADVERBIOS/MODIFICADORES tienen peso menor (refuerzan la acción)
 */
const PESOS_DETECCION = {
    VERBO_PRINCIPAL: 10,      // Acción principal (ej: "besando", "chupando")
    SUSTANTIVO_OBJETO: 6,     // Objeto de la acción (ej: "pene", "culo", "bolas")
    SUSTANTIVO_POSICION: 5,   // Posición (ej: "doggystyle", "misionero")
    ADVERBIO_MODIFICADOR: 3,  // Modificadores (ej: "profundo", "fuerte")
    CONTEXTO_FRASE: 4,        // Frases contextuales completas
    ASTERISCO_ACCION: 8       // Acciones entre asteriscos *acción*
};

/**
 * Patrones para detectar acciones en el texto (entre asteriscos)
 * Cada patrón incluye verbos Y sustantivos relacionados
 * @type {Array<{patron: RegExp, tag: string, peso: number, tipo: string}>}
 */
const PATRONES_ACCIONES = [
    // BESANDO - verbo + sustantivos relacionados
    { patron: /\*[^*]*(?:bes[ao]|besando|besar|beso|kiss|labios|boca)[^*]*\*/gi, tag: 'besando', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo' },
    
    // CHUPANDO PENE - verbo principal + sustantivos de objeto (pero NO punta/mitad para evitar falsos positivos)
    { patron: /\*[^*]*(?:chup[ao]|mam[ao]|oral|felaci)[^*]*(?:pene|miembro|verga|polla)[^*]*\*/gi, tag: 'chupando_todo_el_pene', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo' },
    { patron: /\*[^*]*(?:pene|miembro|verga|polla)[^*]*(?:chup|mam|oral|felaci)[^*]*\*/gi, tag: 'chupando_todo_el_pene', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'sustantivo+verbo' },
    
    // PUNTA DEL PENE - sustantivos específicos + verbos (debe tener contexto de acción oral)
    { patron: /\*[^*]*(?:chup[ao]|mam[ao]|lame|succiona)[^*]*(?:punta|cabeza del pene|glans|corona)[^*]*\*/gi, tag: 'chupando_solo_la_punta_del_pene', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo+sustantivo' },
    { patron: /\*[^*]*(?:punta del pene|punta de su miembro|cabeza del pene)[^*]*(?:chup|mam|lam|succion)[^*]*\*/gi, tag: 'chupando_solo_la_punta_del_pene', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'sustantivo+verbo' },
    
    // MITAD DEL PENE - sustantivos específicos con verbo
    { patron: /\*[^*]*(?:chup[ao]|mam[ao]|lame|succiona)[^*]*(?:mitad|medio pene|centro del pene)[^*]*\*/gi, tag: 'chupando_solo_la_mitad_del_pene', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo+sustantivo' },
    
    // BOLAS/TESTÍCULOS - sustantivos + verbos relacionados (requiere verbo para mayor precisión)
    { patron: /\*[^*]*(?:chup[ao]|mam[ao]|lame|succiona)[^*]*(?:bola[s]?|testículo[s]?|escroto|huevos)[^*]*\*/gi, tag: 'chupando_bolas', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo+sustantivo' },
    { patron: /\*[^*]*(?:bola[s]?|testículo[s]?|escroto|huevos)[^*]*(?:chup|mam|lam|succion)[^*]*\*/gi, tag: 'chupando_bolas', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'sustantivo+verbo' },
    
    // DOGGYSTYLE - posición (sustantivo) + verbos relacionados
    { patron: /\*[^*]*(?:doggy|cuatro patas|por detrás|culo hacia arriba|posición del perrito)[^*]*\*/gi, tag: 'doggystyle', peso: PESOS_DETECCION.SUSTANTIVO_POSICION, tipo: 'posicion' },
    
    // MISIONERO - posición + verbos
    { patron: /\*[^*]*(?:misioner[o]?|encima|cara a cara|tumbada debajo)[^*]*\*/gi, tag: 'misionero', peso: PESOS_DETECCION.SUSTANTIVO_POSICION, tipo: 'posicion' },
    
    // DESNUDA - verbo + estado
    { patron: /\*[^*]*(?:desnud[ao]|sin ropa|quit[ao] la ropa|desvistiendo|desnudez|cuerpo desnudo)[^*]*\*/gi, tag: 'desnuda', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo' },
    
    // ANAL - sustantivo + verbos relacionados (requiere contexto de acción)
    { patron: /\*[^*]*(?:penetr[ao]|met[ei]ndo|empuj[ao]|foll[ao])[^*]*(?:anal|culo|ano|trasero)[^*]*\*/gi, tag: 'anal', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo+sustantivo' },
    { patron: /\*[^*]*(?:anal|culo|ano|trasero)[^*]*(?:penetr|met|empuj|foll)[^*]*\*/gi, tag: 'anal', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'sustantivo+verbo' },
    
    // PAJA/HANDJOB - verbo + sustantivo
    { patron: /\*[^*]*(?:paja|handjob|masturb[ao]|mano[s]? en el pene|moviendo la mano)[^*]*\*/gi, tag: 'handjob_paja', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo' },
    
    // COWGIRL - posición + verbos
    { patron: /\*[^*]*(?:cowgirl|a caballo|encima suya|montand[o]?|subida encima)[^*]*\*/gi, tag: 'reverse_cowgirl', peso: PESOS_DETECCION.SUSTANTIVO_POSICION, tipo: 'posicion' },
    
    // SIDEFUCK - posición
    { patron: /\*[^*]*(?:sidefuck|de lado|posición lateral)[^*]*\*/gi, tag: 'sidefuck', peso: PESOS_DETECCION.SUSTANTIVO_POSICION, tipo: 'posicion' },
    
    // DE PIE - posición + verbo
    { patron: /\*[^*]*(?:de pie|parad[ao]|stand|follando de pie|penetración de pie)[^*]*\*/gi, tag: 'standfuck_follando_de_pie', peso: PESOS_DETECCION.SUSTANTIVO_POSICION, tipo: 'posicion' },
    
    // VENTANA - contexto de lugar + acción
    { patron: /\*[^*]*(?:ventana|cristal|vidrio|pared|contra la ventana)[^*]*\*/gi, tag: 'follando_en_la_ventana', peso: PESOS_DETECCION.CONTEXTO_FRASE, tipo: 'contexto' },
    
    // EN EL AIRE - posición específica
    { patron: /\*[^*]*(?:en el aire|levantad[ao]|suspendid[ao]|piernas al aire)[^*]*\*/gi, tag: 'follando_en_el_aire', peso: PESOS_DETECCION.CONTEXTO_FRASE, tipo: 'contexto' },
    
    // LAMIENDO ANO/CULO - verbo + sustantivo (requiere ambos para evitar falsos positivos)
    { patron: /\*[^*]*(?:lam[ei]ndo|lame|anilingus)[^*]*(?:culo|ano|hoyo)[^*]*\*/gi, tag: 'ichika_licking_anus', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo+sustantivo' },
    { patron: /\*[^*]*(?:culo|ano|hoyo)[^*]*(?:lam|limpiando con la lengua)[^*]*\*/gi, tag: 'ichika_licking_anus', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'sustantivo+verbo' },

    // CUELLO/GARGANTA - sustantivo + verbos de acción (requiere contexto de sujeción/ahorcamiento)
    { patron: /\*[^*]*(?:ahorcando|sujeta.*cuello|agarra.*cuello|rodea.*cuello|manos.*cuello)[^*]*\*/gi, tag: 'manos_alrededor_del_cuello', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo+sustantivo' },
    { patron: /\*[^*]*(?:cuello|garganta)[^*]*(?:sujeta|agarra|rodea|aprieta)[^*]*\*/gi, tag: 'manos_alrededor_del_cuello', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'sustantivo+verbo' },
    
    // CORRIDAS/EYACULACIÓN - verbo + sustantivo
    { patron: /\*[^*]*(?:corrida|eyacul[ao]|se viene|orgasmo|leche|esperma|terminando dentro)[^*]*\*/gi, tag: 'me_corro_en_su_boca_de_ichika', peso: PESOS_DETECCION.VERBO_PRINCIPAL, tipo: 'verbo' }
];

/**
 * Palabras clave para detectar acciones en texto narrativo (no entre asteriscos)
 * ORGANIZADO POR CATEGORÍAS: verbos, sustantivos, posiciones, contextos
 * @type {Array<{palabras: string[], tag: string, categoria: string, peso: number}>}
 */
const PALABRAS_CLAVE_ACCIONES = [
    // === BESANDO ===
    { palabras: ['beso', 'besa', 'besando', 'besar', 'besé', 'besos'], tag: 'besando', categoria: 'verbo', peso: PESOS_DETECCION.VERBO_PRINCIPAL },
    { palabras: ['labios', 'boca', 'lengua'], tag: 'besando', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    
    // === CHUPANDO PENE ===
    { palabras: ['chupa', 'chupando', 'mama', 'mamando', 'felación', 'oral', 'succiona'], tag: 'chupando_todo_el_pene', categoria: 'verbo', peso: PESOS_DETECCION.VERBO_PRINCIPAL },
    { palabras: ['pene', 'miembro', 'verga', 'polla', 'pirula'], tag: 'chupando_todo_el_pene', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    
    // === PUNTA DEL PENE ===
    { palabras: ['punta', 'cabeza del pene', 'glans', 'corona'], tag: 'chupando_solo_la_punta_del_pene', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    
    // === MITAD DEL PENE ===
    { palabras: ['mitad', 'medio pene', 'centro'], tag: 'chupando_solo_la_mitad_del_pene', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    
    // === BOLAS ===
    { palabras: ['bola', 'bolas', 'testículos', 'escroto', 'huevos'], tag: 'chupando_bolas', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    
    // === DOGGYSTYLE ===
    { palabras: ['doggy', 'cuatro patas', 'por detrás'], tag: 'doggystyle', categoria: 'posicion', peso: PESOS_DETECCION.SUSTANTIVO_POSICION },
    { palabras: ['culo hacia arriba', 'arqueada'], tag: 'doggystyle', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE },
    
    // === MISIONERO ===
    { palabras: ['misionero', 'encima', 'cara a cara'], tag: 'misionero', categoria: 'posicion', peso: PESOS_DETECCION.SUSTANTIVO_POSICION },
    { palabras: ['tumbada', 'debajo', 'acostada'], tag: 'misionero', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE },
    
    // === DESNUDA ===
    { palabras: ['desnuda', 'sin ropa', 'desviste', 'desnudando'], tag: 'desnuda', categoria: 'verbo', peso: PESOS_DETECCION.VERBO_PRINCIPAL },
    { palabras: ['ropa interior', 'sujetador', 'bragas', 'tanga'], tag: 'desnuda', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    
    // === ANAL ===
    { palabras: ['anal', 'culo', 'ano', 'trasero'], tag: 'anal', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    { palabras: ['penetración anal', 'metiendo en el culo'], tag: 'anal', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE },
    
    // === PAJA/HANDJOB ===
    { palabras: ['paja', 'handjob', 'masturba'], tag: 'handjob_paja', categoria: 'verbo', peso: PESOS_DETECCION.VERBO_PRINCIPAL },
    { palabras: ['mano', 'manos', 'moviendo'], tag: 'handjob_paja', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    
    // === COWGIRL ===
    { palabras: ['cowgirl', 'a caballo'], tag: 'reverse_cowgirl', categoria: 'posicion', peso: PESOS_DETECCION.SUSTANTIVO_POSICION },
    { palabras: ['montando', 'arriba', 'encima'], tag: 'reverse_cowgirl', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE },
    
    // === SIDEFUCK ===
    { palabras: ['de lado', 'sidefuck', 'lado a lado'], tag: 'sidefuck', categoria: 'posicion', peso: PESOS_DETECCION.SUSTANTIVO_POSICION },
    
    // === DE PIE ===
    { palabras: ['de pie', 'parada', 'stand'], tag: 'standfuck_follando_de_pie', categoria: 'posicion', peso: PESOS_DETECCION.SUSTANTIVO_POSICION },
    
    // === VENTANA ===
    { palabras: ['ventana', 'cristal', 'pared'], tag: 'follando_en_la_ventana', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE },
    { palabras: ['empujada contra', 'pegada a'], tag: 'follando_en_la_ventana', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE },
    
    // === EN EL AIRE ===
    { palabras: ['en el aire', 'levantada'], tag: 'follando_en_el_aire', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE },
    { palabras: ['piernas levantadas', 'sostenida en el aire'], tag: 'follando_en_el_aire', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE },
    
    // === LAMIENDO ANO ===
    { palabras: ['lamiendo', 'lame', 'anilingus'], tag: 'ichika_licking_anus', categoria: 'verbo', peso: PESOS_DETECCION.VERBO_PRINCIPAL },
    { palabras: ['culo', 'ano', 'hoyo'], tag: 'ichika_licking_anus', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    
    // === CUELLO ===
    { palabras: ['cuello', 'garganta'], tag: 'manos_alrededor_del_cuello', categoria: 'sustantivo', peso: PESOS_DETECCION.SUSTANTIVO_OBJETO },
    { palabras: ['ahorcando', 'apretando el cuello', 'manos alrededor', 'rodea el cuello', 'sujeta del cuello'], tag: 'manos_alrededor_del_cuello', categoria: 'contexto', peso: PESOS_DETECCION.CONTEXTO_FRASE }
];

/**
 * Detecta si un fragmento de texto contiene una acción específica
 * USA SISTEMA DE PUNTUACIÓN: verbos (mayor peso) + sustantivos (peso medio) + contexto
 * @param {string} texto - Fragmento de texto a analizar
 * @param {Object} opciones - Opciones adicionales
 * @param {boolean} opciones.usarContexto - Si debe analizar el contexto completo (default: true)
 * @param {number} opciones.umbralPuntuacion - Puntuación mínima para considerar acción detectada (default: 8)
 * @returns {{tag: string|null, puntuacion: number, coincidencias: Array}} - Resultado detallado
 */
export function detectarAccionEnTexto(texto, opciones = {}) {
    if (!texto) return { tag: null, puntuacion: 0, coincidencias: [] };
    
    const opcionesDefault = {
        usarContexto: true,
        umbralPuntuacion: 8
    };
    
    const config = { ...opcionesDefault, ...opciones };
    const textoLower = texto.toLowerCase();
    
    // Objeto para acumular puntuaciones por tag
    const puntuacionesPorTag = {};
    const coincidencias = [];
    
    // ==========================================
    // CAPA 1: Patrones entre asteriscos (máxima prioridad)
    // ==========================================
    const tieneAsteriscos = texto.includes('*');
    if (tieneAsteriscos) {
        for (const { patron, tag, peso, tipo } of PATRONES_ACCIONES) {
            patron.lastIndex = 0;
            const match = patron.exec(texto);
            if (match) {
                if (!puntuacionesPorTag[tag]) {
                    puntuacionesPorTag[tag] = 0;
                }
                // Bonus por estar entre asteriscos (acción narrativa explícita)
                const puntuacionTotal = peso + PESOS_DETECCION.ASTERISCO_ACCION;
                puntuacionesPorTag[tag] += puntuacionTotal;
                
                coincidencias.push({
                    tipo: 'asterisco',
                    tag: tag,
                    texto: match[0],
                    peso: puntuacionTotal,
                    categoria: tipo
                });
            }
        }
    }
    
    // ==========================================
    // CAPA 2: Palabras clave en texto narrativo
    // ==========================================
    for (const { palabras, tag, categoria, peso } of PALABRAS_CLAVE_ACCIONES) {
        let coincidenciasEnCategoria = 0;
        
        for (const palabra of palabras) {
            if (textoLower.includes(palabra.toLowerCase())) {
                coincidenciasEnCategoria++;
                
                if (!puntuacionesPorTag[tag]) {
                    puntuacionesPorTag[tag] = 0;
                }
                puntuacionesPorTag[tag] += peso;
                
                coincidencias.push({
                    tipo: 'palabra_clave',
                    tag: tag,
                    texto: palabra,
                    peso: peso,
                    categoria: categoria
                });
            }
        }
    }
    
    // ==========================================
    // CAPA 3: Análisis de contexto (validación adicional)
    // ==========================================
    if (config.usarContexto) {
        // Buscar combinaciones verbo + sustantivo que refuercen la detección
        const combinacionesContexto = [
            { verbos: ['bes', 'chup', 'mam', 'lam'], sustantivos: ['pene', 'boca', 'culo', 'ano'], bonus: 5 },
            { verbos: ['foll', 'penetr', 'met'], sustantivos: ['culo', 'vagina', 'coño'], bonus: 5 },
            { verbos: ['toc', 'acarici', 'sujeta'], sustantivos: ['pecho', 'teta', 'culo', 'pene'], bonus: 3 }
        ];
        
        for (const combo of combinacionesContexto) {
            const tieneVerbo = combo.verbos.some(v => textoLower.includes(v));
            const tieneSustantivo = combo.sustantivos.some(s => textoLower.includes(s));
            
            if (tieneVerbo && tieneSustantivo) {
                // Bonus por tener verbo Y sustantivo juntos (contexto reforzado)
                Object.keys(puntuacionesPorTag).forEach(tag => {
                    puntuacionesPorTag[tag] += combo.bonus;
                    coincidencias.push({
                        tipo: 'contexto_reforzado',
                        tag: tag,
                        texto: `verbo+${combo.sustantivos.join('|')}`,
                        peso: combo.bonus,
                        categoria: 'contexto'
                    });
                });
            }
        }
    }
    
    // ==========================================
    // CAPA 4: Seleccionar el tag con mayor puntuación
    // ==========================================
    let tagGanador = null;
    let puntuacionMaxima = 0;
    
    for (const [tag, puntuacion] of Object.entries(puntuacionesPorTag)) {
        if (puntuacion > puntuacionMaxima && puntuacion >= config.umbralPuntuacion) {
            puntuacionMaxima = puntuacion;
            tagGanador = tag;
        }
    }
    
    // Si hay múltiples tags con puntuación similar, priorizar verbos sobre sustantivos
    if (tagGanador) {
        const coincidenciasGanadoras = coincidencias.filter(c => c.tag === tagGanador);
        const tieneVerboPrincipal = coincidenciasGanadoras.some(c => 
            c.categoria === 'verbo' || c.tipo === 'asterisco'
        );
        
        // Bonus final si hay verbo principal confirmado
        if (tieneVerboPrincipal) {
            puntuacionMaxima += 3;
        }
    }
    
    return {
        tag: tagGanador,
        puntuacion: puntuacionMaxima,
        coincidencias: coincidencias,
        detectado: tagGanador !== null
    };
}

/**
 * Versión simplificada para compatibilidad (retorna solo el tag)
 * @param {string} texto - Fragmento de texto a analizar
 * @returns {string|null} - Tag de la acción detectada o null
 */
export function detectarAccionEnTextoSimple(texto) {
    const resultado = detectarAccionEnTexto(texto);
    return resultado.tag;
}

/**
 * Divide un mensaje en segmentos de texto e imágenes basados en las acciones descritas
 * @param {string} mensaje - Mensaje completo de la IA
 * @param {string} chicaNombre - Nombre de la chica que responde
 * @param {Object} imagenesChica - Objeto con las imágenes disponibles de la chica
 * @returns {Array<{tipo: 'texto'|'imagen', contenido: string, tag?: string}>} - Array de segmentos
 */
export function dividirMensajeConAcciones(mensaje, chicaNombre, imagenesChica) {
    if (!mensaje || !chicaNombre || !imagenesChica) {
        return [{ tipo: 'texto', contenido: mensaje }];
    }
    
    const segmentos = [];
    const tagsDisponibles = Object.keys(imagenesChica.imagenes || {});
    
    // Dividir el mensaje por asteriscos (acciones narrativas)
    // El formato es: texto *acción* texto *acción* texto
    const partes = mensaje.split(/(\*[^\*]+\*)/g);
    
    let bufferTexto = '';
    
    for (let i = 0; i < partes.length; i++) {
        const parte = partes[i];
        
        if (!parte) continue;
        
        // Es una acción entre asteriscos
        if (parte.startsWith('*') && parte.endsWith('*')) {
            // Primero agregar el buffer de texto acumulado si existe
            if (bufferTexto.trim()) {
                segmentos.push({ tipo: 'texto', contenido: bufferTexto.trim() });
                bufferTexto = '';
            }
            
            // Detectar qué acción se describe (usando versión simplificada para compatibilidad)
            const accionDetectada = detectarAccionEnTextoSimple(parte);
            
            // Verificar si la chica tiene imagen para esta acción
            if (accionDetectada && tagsDisponibles.includes(accionDetectada)) {
                segmentos.push({ 
                    tipo: 'imagen', 
                    tag: accionDetectada,
                    contenido: parte // Mantener la descripción de la acción
                });
            } else {
                // Si no hay imagen específica, tratar como texto normal
                bufferTexto += parte + ' ';
            }
        } else {
            // Es texto normal, acumular en el buffer
            bufferTexto += parte + ' ';
        }
    }
    
    // Agregar el último buffer de texto si existe
    if (bufferTexto.trim()) {
        segmentos.push({ tipo: 'texto', contenido: bufferTexto.trim() });
    }
    
    // Si no se detectaron acciones, devolver el mensaje original como un solo segmento
    if (segmentos.length === 0) {
        return [{ tipo: 'texto', contenido: mensaje }];
    }
    
    // Optimización: Si hay segmentos consecutivos del mismo tipo, combinarlos
    const segmentosOptimizados = [];
    for (const segmento of segmentos) {
        const ultimo = segmentosOptimizados[segmentosOptimizados.length - 1];
        if (ultimo && ultimo.tipo === segmento.tipo && segmento.tipo === 'texto') {
            ultimo.contenido += ' ' + segmento.contenido;
        } else {
            segmentosOptimizados.push(segmento);
        }
    }
    
    return segmentosOptimizados;
}

/**
 * Procesa un mensaje para extraer secuencias de texto-imagen-texto
 * Este es el método principal que debe usarse desde chat.html
 * @param {string} mensaje - Mensaje de la IA
 * @param {string} chicaNombre - Nombre de la chica
 * @param {Object} quintiImagenes - Objeto QuintiImagenesPrueba
 * @returns {Array<{texto: string, imagenURL?: string, imagenTag?: string}>} - Secuencia para mostrar
 */
export function procesarMensajeParaUI(mensaje, chicaNombre, quintiImagenes) {
    if (!mensaje || !chicaNombre || !quintiImagenes || !quintiImagenes[chicaNombre]) {
        return [{ texto: mensaje }];
    }
    
    const infoChica = quintiImagenes[chicaNombre];
    const segmentos = dividirMensajeConAcciones(mensaje, chicaNombre, infoChica);
    const resultado = [];
    
    for (const segmento of segmentos) {
        if (segmento.tipo === 'texto') {
            // Si ya hay un elemento en resultado y es de solo texto, combinar
            const ultimo = resultado[resultado.length - 1];
            if (ultimo && !ultimo.imagenURL) {
                ultimo.texto += ' ' + segmento.contenido;
            } else {
                resultado.push({ texto: segmento.contenido });
            }
        } else if (segmento.tipo === 'imagen') {
            // Obtener URL de la imagen
            const urlImagen = infoChica.imagenes?.[segmento.tag] || infoChica.imagenSelector;
            if (urlImagen) {
                resultado.push({
                    texto: segmento.contenido, // La descripción de la acción entre asteriscos
                    imagenURL: urlImagen,
                    imagenTag: segmento.tag
                });
            }
        }
    }
    
    // Si no se procesó nada, devolver el mensaje original
    if (resultado.length === 0) {
        return [{ texto: mensaje }];
    }
    
    return resultado;
}

/**
 * Versión simplificada para detectar si un mensaje contiene múltiples acciones
 * Útil para decidir si se debe usar el parser completo
 * @param {string} mensaje - Mensaje a verificar
 * @returns {boolean} - True si hay múltiples acciones detectadas
 */
export function tieneMultiplesAcciones(mensaje) {
    if (!mensaje) return false;
    
    // Contar cuántas acciones entre asteriscos hay
    const accionesEntreAsteriscos = mensaje.match(/\*[^\*]+\*/g);
    if (!accionesEntreAsteriscos || accionesEntreAsteriscos.length < 2) {
        return false;
    }
    
    // Verificar si al menos 2 de esas acciones son acciones explícitas diferentes
    const accionesDetectadas = new Set();
    for (const accion of accionesEntreAsteriscos) {
        const tag = detectarAccionEnTextoSimple(accion);
        if (tag) {
            accionesDetectadas.add(tag);
        }
    }
    
    return accionesDetectadas.size >= 2;
}

/**
 * Analiza el contexto completo de la respuesta para validar/reforzar la detección de acciones
 * Esta función actúa como SEGUNDA VALIDACIÓN después del análisis inicial
 * Considera:
 * 1. Co-ocurrencia de verbos + sustantivos en la misma frase
 * 2. Patrones contextuales específicos (ej: "se arrodilla y toma su pene")
 * 3. Modificadores que intensifican la acción (ej: "profundamente", "con fuerza")
 * @param {string} texto - Texto completo de la respuesta
 * @param {string|null} tagDetectado - Tag detectado en el análisis primario
 * @returns {{tagValidado: string|null, confianza: number, razones: Array}} - Resultado de validación
 */
export function validarAccionConContexto(texto, tagDetectado = null) {
    if (!texto) return { tagValidado: null, confianza: 0, razones: [] };
    
    const textoLower = texto.toLowerCase();
    const razones = [];
    let confianza = 0;
    let tagValidado = tagDetectado;
    
    // ==========================================
    // VALIDACIÓN 1: Co-ocurrencia verbo + sustantivo
    // ==========================================
    const combinacionesVerbosSustantivos = [
        {
            tag: 'chupando_todo_el_pene',
            verbos: ['chupa', 'chupando', 'mama', 'mamando', 'succiona', 'lame'],
            sustantivos: ['pene', 'miembro', 'verga', 'polla', 'pirula'],
            frases: ['toma en su boca', 'lo introduce en su boca', 'rodea con sus labios']
        },
        {
            tag: 'chupando_solo_la_punta_del_pene',
            verbos: ['chupa', 'lame', 'succiona'],
            sustantivos: ['punta', 'cabeza', 'glans', 'corona'],
            frases: ['solo la punta', 'únicamente la cabeza', 'la parte superior']
        },
        {
            tag: 'chupando_bolas',
            verbos: ['chupa', 'lame', 'succiona', 'toca con la lengua'],
            sustantivos: ['bolas', 'testículos', 'escroto', 'huevos'],
            frases: ['toma las bolas', 'las chupa suavemente']
        },
        {
            tag: 'besando',
            verbos: ['besa', 'besando', 'da besos', 'une sus labios'],
            sustantivos: ['labios', 'boca', 'lengua', 'beso'],
            frases: ['se besan apasionadamente', 'sus bocas se encuentran']
        },
        {
            tag: 'doggystyle',
            verbos: ['penetra', 'folla', 'entra por detrás', 'se coloca detrás'],
            sustantivos: ['culo', 'ano', 'trasero', 'nalga'],
            frases: ['por detrás', 'cuatro patas', 'culo hacia arriba', 'posición del perrito']
        },
        {
            tag: 'misionero',
            verbos: ['penetra', 'folla', 'está encima', 'se monta'],
            sustantivos: ['encima', 'cara a cara', 'tumbada'],
            frases: ['posición del misionero', 'uno encima del otro', 'cara a cara']
        },
        {
            tag: 'anal',
            verbos: ['penetra', 'mete', 'introduce', 'empuja en'],
            sustantivos: ['culo', 'ano', 'trasero', 'hoyo'],
            frases: ['penetración anal', 'dentro del culo', 'en el ano']
        },
        {
            tag: 'handjob_paja',
            verbos: ['masturba', 'hace una paja', 'mueve la mano', 'acaricia con la mano'],
            sustantivos: ['pene', 'miembro', 'mano', 'manos'],
            frases: ['moviendo la mano arriba y abajo', 'le hace una paja']
        },
        {
            tag: 'reverse_cowgirl',
            verbos: ['monta', 'se sienta', 'cabalga', 'se sube'],
            sustantivos: ['encima', 'a caballo', 'culo hacia él'],
            frases: ['de espaldas', 'dándole la espalda', 'posición cowgirl inversa']
        },
        {
            tag: 'standfuck_follando_de_pie',
            verbos: ['folla', 'penetra', 'levanta'],
            sustantivos: ['de pie', 'parada', 'pared'],
            frases: ['follando de pie', 'contra la pared', 'ambos parados']
        },
        {
            tag: 'ichika_licking_anus',
            verbos: ['lame', 'limpia con la lengua', 'hace anilingus'],
            sustantivos: ['culo', 'ano', 'trasero', 'hoyo'],
            frases: ['lame el ano', 'limpia su culo con la lengua']
        },
        {
            tag: 'manos_alrededor_del_cuello',
            verbos: ['sujeta', 'agarra', 'aprieta', 'rodea'],
            sustantivos: ['cuello', 'garganta'],
            frases: ['manos en el cuello', 'lo ahorca suavemente', 'aprieta su garganta']
        }
    ];
    
    // Buscar la combinación más fuerte
    for (const combo of combinacionesVerbosSustantivos) {
        let tieneVerbo = false;
        let tieneSustantivo = false;
        let tieneFrase = false;
        
        // Verificar verbos
        for (const verbo of combo.verbos) {
            if (textoLower.includes(verbo)) {
                tieneVerbo = true;
                razones.push(`Verbo detectado: "${verbo}"`);
                break;
            }
        }
        
        // Verificar sustantivos
        for (const sustantivo of combo.sustantivos) {
            if (textoLower.includes(sustantivo)) {
                tieneSustantivo = true;
                razones.push(`Sustantivo detectado: "${sustantivo}"`);
                break;
            }
        }
        
        // Verificar frases completas
        for (const frase of combo.frases) {
            if (textoLower.includes(frase)) {
                tieneFrase = true;
                razones.push(`Frase contextual: "${frase}"`);
                break;
            }
        }
        
        // Calcular puntuación de confianza
        let puntuacionCombo = 0;
        if (tieneVerbo) puntuacionCombo += 5;  // Verbo es lo más importante
        if (tieneSustantivo) puntuacionCombo += 4;  // Sustantivo da contexto
        if (tieneFrase) puntuacionCombo += 6;  // Frase completa es muy específica
        
        // Si hay verbo Y sustantivo, bonus adicional
        if (tieneVerbo && tieneSustantivo) {
            puntuacionCombo += 5;
            razones.push(`✓ Combinación reforzada: verbo + sustantivo para ${combo.tag}`);
        }
        
        // Si esta combinación supera la confianza actual, actualizar
        if (puntuacionCombo > confianza) {
            confianza = puntuacionCombo;
            tagValidado = combo.tag;
        }
    }
    
    // ==========================================
    // VALIDACIÓN 2: Si ya había un tag detectado, verificar consistencia
    // ==========================================
    if (tagDetectado) {
        const comboExistente = combinacionesVerbosSustantivos.find(c => c.tag === tagDetectado);
        if (comboExistente) {
            let coincideVerbo = comboExistente.verbos.some(v => textoLower.includes(v));
            let coincideSustantivo = comboExistente.sustantivos.some(s => textoLower.includes(s));
            
            if (coincideVerbo || coincideSustantivo) {
                confianza += 10;  // Bonus por consistencia con detección previa
                razones.push(`✓ Tag previamente detectado (${tagDetectado}) confirmado por contexto`);
            }
        }
    }
    
    // ==========================================
    // VALIDACIÓN 3: Detectar modificadores que intensifican
    // ==========================================
    const modificadoresIntensidad = [
        'profundamente', 'con fuerza', 'suavemente', 'lentamente',
        'rápidamente', 'apasionadamente', 'intensamente', 'con ganas'
    ];
    
    for (const modificador of modificadoresIntensidad) {
        if (textoLower.includes(modificador)) {
            confianza += 2;
            razones.push(`Modificador de intensidad: "${modificador}"`);
        }
    }
    
    // Umbral mínimo de confianza para validar
    const UMBRAL_CONFIANZA_MINIMA = 8;
    if (confianza < UMBRAL_CONFIANZA_MINIMA) {
        return {
            tagValidado: null,
            confianza: confianza,
            razones: [`Confianza insuficiente (${confianza}/${UMBRAL_CONFIANZA_MINIMA})`]
        };
    }
    
    return {
        tagValidado: tagValidado,
        confianza: confianza,
        razones: razones
    };
}

/**
 * Función principal mejorada que combina detección primaria + validación de contexto
 * @param {string} texto - Texto completo a analizar
 * @param {Object} opciones - Opciones de configuración
 * @returns {{tag: string|null, puntuacion: number, validacionContexto: Object, coincidencias: Array}}
 */
export function detectarAccionMejorada(texto, opciones = {}) {
    // Paso 1: Detección primaria
    const deteccionPrimaria = detectarAccionEnTexto(texto, opciones);
    
    // Paso 2: Validación con contexto (segunda validación)
    const validacionContexto = validarAccionConContexto(texto, deteccionPrimaria.tag);
    
    // Paso 3: Decisión final basada en ambas validaciones
    let tagFinal = deteccionPrimaria.tag;
    let puntuacionFinal = deteccionPrimaria.puntuacion;
    
    // Si la validación de contexto tiene más confianza, usar esa
    if (validacionContexto.tagValidado && validacionContexto.confianza > deteccionPrimaria.puntuacion) {
        tagFinal = validacionContexto.tagValidado;
        puntuacionFinal = validacionContexto.confianza;
    }
    
    // Bonus si ambas detecciones coinciden
    if (deteccionPrimaria.tag && validacionContexto.tagValidado && 
        deteccionPrimaria.tag === validacionContexto.tagValidado) {
        puntuacionFinal += 5;
    }
    
    return {
        tag: tagFinal,
        puntuacion: puntuacionFinal,
        validacionContexto: validacionContexto,
        coincidencias: deteccionPrimaria.coincidencias,
        detectado: tagFinal !== null
    };
}

/**
 * Extrae la última pregunta de un mensaje (para manejar respuestas cortas como "si"/"no")
 * @param {string} mensaje - Último mensaje de la chica
 * @returns {string|null} - La pregunta encontrada o null
 */
export function extraerUltimaPregunta(mensaje) {
    if (!mensaje) return null;
    
    // Buscar patrones de pregunta
    const patronesPregunta = [
        /([¿?].*?[?!])/g,  // Entre signos de interrogación
        /(\w+\s+qué\s+\w+[?!])/gi,  // preguntas con "qué"
        /(\w+\s+cómo\s+\w+[?!])/gi,  // preguntas con "cómo"
        /(\w+\s+cuándo\s+\w+[?!])/gi,  // preguntas con "cuándo"
        /(\w+\s+dónde\s+\w+[?!])/gi,  // preguntas con "dónde"
        /(\w+\s+por\s+qué\s+\w+[?!])/gi,  // preguntas con "por qué"
        /(\w+\s+quieres?\s+\w+[?!])/gi,  // preguntas con "quieres"
        /(\w+\s+puedes?\s+\w+[?!])/gi,  // preguntas con "puedes"
        /(\w+\s+te\s+gusta[rn]?\s+\w+[?!])/gi,  // preguntas con "te gusta"
        /(\w+\s+vas\s+a\s+\w+[?!])/gi,  // preguntas con "vas a"
    ];
    
    // Encontrar todas las preguntas en el mensaje
    const preguntas = [];
    for (const patron of patronesPregunta) {
        patron.lastIndex = 0;
        let match;
        while ((match = patron.exec(mensaje)) !== null) {
            preguntas.push(match[0]);
        }
    }
    
    // Devolver la última pregunta encontrada
    return preguntas.length > 0 ? preguntas[preguntas.length - 1] : null;
}

/**
 * Determina si una respuesta corta ("si", "no", etc.) es respuesta a una pregunta anterior
 * @param {string} respuestaUsuario - Respuesta del usuario (ej: "si", "no")
 * @param {string} ultimoMensajeChica - Último mensaje de la chica
 * @returns {{esRespuestaCorta: boolean, preguntaAnterior?: string, interpretacion?: string}}
 */
export function interpretarRespuestaCorta(respuestaUsuario, ultimoMensajeChica) {
    const respuestasCortas = ['si', 'sí', 'no', 'obvio', 'claro', 'tal vez', 'quizás', 'puede ser', 'seguro', 'y'];
    
    const respuestaLower = respuestaUsuario.toLowerCase().trim();
    
    if (!respuestasCortas.includes(respuestaLower)) {
        return { esRespuestaCorta: false };
    }
    
    const preguntaAnterior = extraerUltimaPregunta(ultimoMensajeChica);
    
    if (preguntaAnterior) {
        let interpretacion = '';
        
        if (['si', 'sí', 'obvio', 'claro', 'seguro'].includes(respuestaLower)) {
            interpretacion = `Sí, ${preguntaAnterior}`;
        } else if (respuestaLower === 'no') {
            interpretacion = `No, ${preguntaAnterior}`;
        } else if (['tal vez', 'quizás', 'puede ser'].includes(respuestaLower)) {
            interpretacion = `Tal vez, ${preguntaAnterior}`;
        }
        
        return {
            esRespuestaCorta: true,
            preguntaAnterior,
            interpretacion
        };
    }
    
    return {
        esRespuestaCorta: true,
        interpretacion: respuestaUsuario
    };
}

// Exportaciones para compatibilidad
export default {
    detectarAccionEnTexto,
    detectarAccionEnTextoSimple,
    detectarAccionMejorada,
    validarAccionConContexto,
    dividirMensajeConAcciones,
    procesarMensajeParaUI,
    tieneMultiplesAcciones,
    extraerUltimaPregunta,
    interpretarRespuestaCorta,
    TAGS_ACCIONES_EXPLICITAS,
    PATRONES_ACCIONES,
    PALABRAS_CLAVE_ACCIONES,
    PESOS_DETECCION
};
