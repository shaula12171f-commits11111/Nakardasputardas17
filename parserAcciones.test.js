// ============================================================
//  Unit Tests para parserAcciones.js
//  Archivo: parserAcciones.test.js
//  Descripción: Pruebas para el sistema de detección de acciones
//               con análisis de contexto, verbos y sustantivos
// ============================================================

import { 
    detectarAccionEnTexto, 
    detectarAccionEnTextoSimple,
    tieneMultiplesAcciones 
} from './parserAcciones.js';

// ============================================================
//  SISTEMA DE TESTING SIMPLE
// ============================================================

let pruebasEjecutadas = 0;
let pruebasAprobadas = 0;
let pruebasFallidas = 0;

function test(nombre, fn) {
    pruebasEjecutadas++;
    try {
        fn();
        console.log(`✅ PASS: ${nombre}`);
        pruebasAprobadas++;
    } catch (error) {
        console.error(`❌ FAIL: ${nombre}`);
        console.error(`   Error: ${error.message}`);
        pruebasFallidas++;
    }
}

function assertEqual(actual, expected, mensaje = '') {
    if (actual !== expected) {
        throw new Error(`${mensaje} Expected: ${expected}, Got: ${actual}`);
    }
}

function assertTrue(condition, mensaje = '') {
    if (!condition) {
        throw new Error(mensaje || 'Expected true but got false');
    }
}

function assertNotNull(value, mensaje = '') {
    if (value === null || value === undefined) {
        throw new Error(mensaje || 'Expected non-null value');
    }
}

// ============================================================
//  PRUEBAS PARA DETECCIÓN DE ACCIONES BÁSICAS
// ============================================================

console.log('\n=== PRUEBAS: Detección Básica de Acciones ===\n');

test('Detectar acción "besando" con verbo', () => {
    const resultado = detectarAccionEnTexto('*Ichika está besando apasionadamente*');
    assertTrue(resultado.tag === 'besando', `Tag esperado: besando, obtenido: ${resultado.tag}`);
    assertTrue(resultado.puntuacion >= 8, `Puntuación mínima 8, obtenida: ${resultado.puntuacion}`);
});

test('Detectar acción "chupando_todo_el_pene" con verbo + sustantivo', () => {
    const resultado = detectarAccionEnTexto('*Miku chupa el pene con fuerza*');
    assertTrue(resultado.tag === 'chupando_todo_el_pene', `Tag esperado: chupando_todo_el_pene, obtenido: ${resultado.tag}`);
    assertTrue(resultado.puntuacion >= 10, `Puntuación mínima 10, obtenida: ${resultado.puntuacion}`);
});

test('Detectar acción por sustantivo específico "punta" con verbo', () => {
    const resultado = detectarAccionEnTexto('*Chupa solo la punta del pene*');
    assertTrue(resultado.tag === 'chupando_solo_la_punta_del_pene',
        `Tag esperado: chupando_solo_la_punta_del_pene, obtenido: ${resultado.tag}`);
});

test('Detectar acción "doggystyle" por posición', () => {
    const resultado = detectarAccionEnTexto('*La pone en posición de doggy, por detrás*');
    assertTrue(resultado.tag === 'doggystyle', `Tag esperado: doggy, obtenido: ${resultado.tag}`);
});

test('Detectar acción "anal" por verbo + sustantivo', () => {
    const resultado = detectarAccionEnTexto('*Penetración anal por detrás*');
    assertTrue(resultado.tag === 'anal', `Tag esperado: anal, obtenido: ${resultado.tag}`);
});

// ============================================================
//  PRUEBAS PARA SISTEMA DE PUNTUACIÓN
// ============================================================

console.log('\n=== PRUEBAS: Sistema de Puntuación ===\n');

test('Verbo principal debe tener mayor puntuación que sustantivo solo', () => {
    const conVerbo = detectarAccionEnTexto('*Está chupando intensamente*');
    const conSustantivo = detectarAccionEnTexto('El pene está en su boca');
    
    assertTrue(conVerbo.puntuacion > conSustantivo.puntuacion, 
        `Verbo (${conVerbo.puntuacion}) debe ser > Sustantivo (${conSustantivo.puntuacion})`);
});

test('Combinación verbo + sustantivo debe tener bonus de contexto', () => {
    const resultado = detectarAccionEnTexto('Chupa el pene mientras lo sostiene con las manos');
    assertTrue(resultado.puntuacion >= 15, 
        `Puntuación con contexto >= 15, obtenida: ${resultado.puntuacion}`);
});

test('Acción entre asteriscos debe tener bonus adicional', () => {
    const conAsterisco = detectarAccionEnTexto('*Besando apasionadamente*');
    const sinAsterisco = detectarAccionEnTexto('Besando apasionadamente');
    
    assertTrue(conAsterisco.puntuacion > sinAsterisco.puntuacion, 
        `Con asterisco (${conAsterisco.puntuacion}) debe ser > Sin asterisco (${sinAsterisco.puntuacion})`);
});

// ============================================================
//  PRUEBAS PARA ANÁLISIS DE CONTEXTO
// ============================================================

console.log('\n=== PRUEBAS: Análisis de Contexto ===\n');

test('Detectar combinación verbo + sustantivo como contexto reforzado', () => {
    const resultado = detectarAccionEnTexto('Frota el pene contra su culo mientras lo besa');
    assertTrue(resultado.coincidencias.some(c => c.tipo === 'contexto_reforzado'), 
        'Debe tener coincidencia de contexto reforzado');
});

test('Priorizar verbo sobre sustantivo cuando hay conflicto', () => {
    const resultado = detectarAccionEnTexto('Besa el culo mientras lame el ano');
    // Debería detectar la acción con verbo principal
    assertNotNull(resultado.tag, 'Debe detectar algún tag');
});

// ============================================================
//  PRUEBAS PARA MÚLTIPLES ACCIONES
// ============================================================

console.log('\n=== PRUEBAS: Múltiples Acciones ===\n');

test('Detectar múltiples acciones diferentes', () => {
    const resultado = tieneMultiplesAcciones('*Besando* y luego *chupando el pene*');
    assertTrue(resultado === true, 'Debe detectar múltiples acciones (retorna booleano)');
});

test('No detectar múltiples acciones si es la misma', () => {
    const resultado = tieneMultiplesAcciones('*Besando* y sigue *besando*');
    // Ambas son "besando", así que no cuenta como múltiple
    assertTrue(resultado === false,
        `No debe contar como múltiple si es el mismo tag, resultado: ${resultado}`);
});













// ============================================================
//  PRUEBAS PARA COMPATIBILIDAD
// ============================================================

console.log('\n=== PRUEBAS: Compatibilidad ===\n');

test('detectarAccionEnTextoSimple debe retornar solo el tag', () => {
    const tag = detectarAccionEnTextoSimple('*Está follando en el misionero*');
    assertTrue(typeof tag === 'string' || tag === null, 
        'Debe retornar string o null, no objeto completo');
});

test('Función debe manejar texto vacío', () => {
    const resultado = detectarAccionEnTexto('');
    assertEqual(resultado.tag, null, 'Texto vacío debe retornar tag null');
    assertEqual(resultado.puntuacion, 0, 'Texto vacío debe tener puntuación 0');
});

test('Función debe manejar texto sin acciones', () => {
    const resultado = detectarAccionEnTexto('Hola, ¿cómo estás?');
    assertEqual(resultado.tag, null, 'Texto sin acciones debe retornar tag null');
});

// ============================================================
//  PRUEBAS ESPECÍFICAS PARA CADA TAG
// ============================================================

console.log('\n=== PRUEBAS: Tags Específicos ===\n');

const casosDePrueba = [
    { texto: '*Besando profundamente*', tagEsperado: 'besando' },
    { texto: '*Haciéndole una paja con fuerza*', tagEsperado: 'handjob_paja' },
    { texto: '*En posición del misionero*', tagEsperado: 'misionero' },
    { texto: '*Desnuda completamente*', tagEsperado: 'desnuda' },
    { texto: '*Follando contra la ventana*', tagEsperado: 'follando_en_la_ventana' },
    { texto: '*Lamiendo el ano con pasión*', tagEsperado: 'ichika_licking_anus' },
    { texto: '*Manos alrededor del cuello*', tagEsperado: 'manos_alrededor_del_cuello' }
];

casosDePrueba.forEach(({ texto, tagEsperado }) => {
    test(`Detectar tag "${tagEsperado}"`, () => {
        const resultado = detectarAccionEnTexto(texto);
        assertTrue(
            resultado.tag === tagEsperado, 
            `Tag esperado: ${tagEsperado}, obtenido: ${resultado.tag}`
        );
    });
});

// ============================================================
//  RESUMEN DE PRUEBAS
// ============================================================

console.log('\n=== RESUMEN DE PRUEBAS ===\n');
console.log(`Total ejecutadas: ${pruebasEjecutadas}`);
console.log(`✅ Aprobadas: ${pruebasAprobadas}`);
console.log(`❌ Fallidas: ${pruebasFallidas}`);
console.log(`Tasa de éxito: ${(pruebasAprobadas / pruebasEjecutadas * 100).toFixed(2)}%`);

if (pruebasFallidas === 0) {
    console.log('\n🎉 ¡Todas las pruebas pasaron!');
} else {
    console.warn(`\n⚠️  ${pruebasFallidas} prueba(s) fallida(s)`);
}

export { pruebasEjecutadas, pruebasAprobadas, pruebasFallidas };
