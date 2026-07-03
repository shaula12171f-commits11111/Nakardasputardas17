// ============================================================
//  HISTORIAS PARALELAS - Quintillizas Prueba
//  Archivo: historiasParalelas.js
//  Descripción: Sistema de historias paralelas con prompts independientes
//  Cada historia tiene su propio system prompt ADICIONAL y configuración
//  IMPORTA las historias desde la carpeta /historias/ en formato JSON
//  IMPORTANTE: El system prompt de las historias es ADICIONAL al normal
//  Ambos se combinan para dar contexto completo a la IA
// ============================================================

import { HISTORIAS_DATA, getHistoriaById, getHistoriasActivas as getHistoriasActivasFromData, existeHistoria as existeHistoriaFromData, getSystemPromptHistoria as getSystemPromptHistoriaFromData, getMensajeBienvenidaHistoria as getMensajeBienvenidaHistoriaFromData, getPersonajesHistoria as getPersonajesHistoriaFromData, getImagenSelectorHistoria as getImagenSelectorHistoriaFromData, getImagenTagsMapping as getImagenTagsMappingFromData } from './nino_rpg.js';

/**
 * Configuración de historias paralelas disponibles
 * Cada historia tiene:
 * - id: identificador único
 * - nombre: nombre visible en la UI
 * - descripcion: descripción de la historia
 * - systemPrompt: prompt específico para esta historia
 * - personajes: array de personajes disponibles en esta historia
 * - activa: si está habilitada o no
 */
export const HISTORIAS_PARALELAS = HISTORIAS_DATA;

/**
 * Obtiene la configuración de una historia paralela por ID
 * @param {string} historiaId - ID de la historia (ej: 'nino_rpg')
 * @returns {object|null} - Configuración de la historia o null si no existe
 */
export function getHistoriaParalela(historiaId) {
    return getHistoriaById(historiaId);
}

/**
 * Obtiene todas las historias paralelas activas disponibles
 * @returns {Array} - Array de objetos con información de historias activas
 */
export function getHistoriasActivas() {
    return getHistoriasActivasFromData();
}

/**
 * Verifica si una historia paralela existe y está activa
 * @param {string} historiaId - ID de la historia a verificar
 * @returns {boolean} - True si existe y está activa
 */
export function existeHistoria(historiaId) {
    return existeHistoriaFromData(historiaId);
}

/**
 * Obtiene el system prompt específico para una historia paralela
 * @param {string} historiaId - ID de la historia
 * @returns {string|null} - System prompt o null si no existe
 */
export function getSystemPromptHistoria(historiaId) {
    return getSystemPromptHistoriaFromData(historiaId);
}

/**
 * Obtiene el mensaje de bienvenida específico para una historia paralela
 * @param {string} historiaId - ID de la historia
 * @returns {string|null} - Mensaje de bienvenida o null si no existe
 */
export function getMensajeBienvenidaHistoria(historiaId) {
    return getMensajeBienvenidaHistoriaFromData(historiaId);
}

/**
 * Obtiene los personajes disponibles en una historia paralela
 * @param {string} historiaId - ID de la historia
 * @returns {Array} - Array de nombres de personajes o array vacío
 */
export function getPersonajesHistoria(historiaId) {
    return getPersonajesHistoriaFromData(historiaId);
}

/**
 * Obtiene la URL de la imagen selector para una historia paralela
 * @param {string} historiaId - ID de la historia
 * @returns {string|null} - URL de la imagen o null
 */
export function getImagenSelectorHistoria(historiaId) {
    return getImagenSelectorHistoriaFromData(historiaId);
}

/**
 * Obtiene el mapeo de imagen_tag a URL para una historia paralela
 * @param {string} historiaId - ID de la historia
 * @returns {object|null} - Objeto con el mapeo de tags a URLs o null
 */
export function getImagenTagsMapping(historiaId) {
    return getImagenTagsMappingFromData(historiaId);
}

// Exportación para compatibilidad con CommonJS (opcional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        HISTORIAS_PARALELAS,
        getHistoriaParalela,
        getHistoriasActivas,
        existeHistoria,
        getSystemPromptHistoria,
        getMensajeBienvenidaHistoria,
        getPersonajesHistoria,
        getImagenSelectorHistoria,
        getImagenTagsMapping
    };
}
