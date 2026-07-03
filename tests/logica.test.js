// ============================================================
//  Unit Tests para QuintiAmigas - lógica.js
//  Archivo: logica.test.js
//  Carpeta: quintillizasPrueba
//  
//  PROPÓSITO:
//  - Verificar que las funciones críticas funcionen correctamente
//  - Detectar regresiones cuando se hacen cambios en el código
//  - Documentar el comportamiento esperado de las funciones
//  - Automatizar pruebas de casos edge y errores comunes
//
//  EJECUCIÓN:
//  - En navegador: Abrir chat.html y revisar la consola
//  - Las pruebas se ejecutan automáticamente al cargar
// ============================================================

import { parsearJSON, formatearTextoConAsteriscos } from '../src/core/logica.js';

// ============================================================
//  SISTEMA DE TESTING SIMPLE (sin dependencias externas)
// ============================================================

let testsEjecutados = 0;
let testsExitosos = 0;
let testsFallidos = 0;

const resultados = [];

/**
 * Ejecuta una prueba unitaria
 * @param {string} nombre - Nombre descriptivo de la prueba
 * @param {Function} testFn - Función que contiene las aserciones
 */
function test(nombre, testFn) {
    testsEjecutados++;
    try {
        testFn();
        testsExitosos++;
        resultados.push({ nombre, estado: '✅ PASÓ', error: null });
        console.log(`✅ [TEST] ${nombre}`);
    } catch (error) {
        testsFallidos++;
        resultados.push({ nombre, estado: '❌ FALLÓ', error: error.message });
        console.error(`❌ [TEST] ${nombre}`);
        console.error(`   Error: ${error.message}`);
    }
}

/**
 * Aserción: verifica que dos valores sean iguales
 * @param {*} actual - Valor obtenido
 * @param {*} expected - Valor esperado
 * @param {string} mensaje - Mensaje de error si falla
 */
function assertEquals(actual, expected, mensaje) {
    if (actual !== expected) {
        throw new Error(`${mensaje || 'Valores no son iguales'}\n   Esperado: ${expected}\n   Obtenido: ${actual}`);
    }
}

/**
 * Aserción: verifica que un valor sea nulo
 * @param {*} actual - Valor obtenido
 * @param {string} mensaje - Mensaje de error si falla
 */
function assertNull(actual, mensaje) {
    if (actual !== null) {
        throw new Error(`${mensaje || 'Valor debería ser null'}\n   Obtenido: ${actual}`);
    }
}

/**
 * Aserción: verifica que un valor NO sea nulo
 * @param {*} actual - Valor obtenido
 * @param {string} mensaje - Mensaje de error si falla
 */
function assertNotNull(actual, mensaje) {
    if (actual === null) {
        throw new Error(mensaje || 'Valor no debería ser null');
    }
}

/**
 * Aserción: verifica que una condición sea verdadera
 * @param {boolean} condition - Condición a verificar
 * @param {string} mensaje - Mensaje de error si falla
 */
function assertTrue(condition, mensaje) {
    if (!condition) {
        throw new Error(mensaje || 'Condición no es verdadera');
    }
}

// ============================================================
//  TESTS PARA parsearJSON()
// ============================================================

console.log('\n🧪 =========================================');
console.log('🧪 INICIANDO TESTS PARA parsearJSON()');
console.log('🧪 =========================================\n');

test('parsearJSON: debe parsear JSON válido simple', () => {
    const input = '{"respuesta":"Hola","imagen_tag":"feliz"}';
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería retornar un objeto');
    assertEquals(resultado.respuesta, 'Hola', 'La respuesta debería ser "Hola"');
    assertEquals(resultado.imagen_tag, 'feliz', 'El tag de imagen debería ser "feliz"');
});

test('parsearJSON: debe manejar JSON con formato [Nombre]: antes', () => {
    // Este es el error reportado: "[Ichika]: *..." no es JSON válido
    const input = '[Ichika]: {"respuesta":"Hola","imagen_tag":"sonrisa"}';
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería parsear a pesar del prefijo [Ichika]:');
    assertEquals(resultado.respuesta, 'Hola', 'La respuesta debería ser "Hola"');
});

test('parsearJSON: debe manejar JSON con formato [Nombre]: y texto narrativo', () => {
    const input = '[Ichika]: *sonríe* {"respuesta":"¡Hola!","imagen_tag":"feliz"}';
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería parsear con prefijo y narración');
    assertEquals(resultado.respuesta, '¡Hola!', 'La respuesta debería ser "¡Hola!"');
});

test('parsearJSON: debe manejar JSON dentro de bloques de código markdown', () => {
    const input = '```json\n{"respuesta":"Test","imagen_tag":"normal"}\n```';
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería parsear JSON en bloque markdown');
    assertEquals(resultado.respuesta, 'Test', 'La respuesta debería ser "Test"');
});

test('parsearJSON: debe extraer JSON de texto con contenido antes', () => {
    const input = 'Mi expresión cambia... {"respuesta":"Interesante","imagen_tag":"curiosa"}';
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería extraer JSON aunque haya texto antes');
    assertEquals(resultado.respuesta, 'Interesante', 'La respuesta debería ser "Interesante"');
});

test('parsearJSON: debe manejar texto narrativo entre asteriscos antes del JSON', () => {
    const input = '*se sonroja ligeramente* {"respuesta":"No sé qué decir","imagen_tag":"avergonzada"}';
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería parsear con narración en asteriscos antes');
    assertEquals(resultado.respuesta, 'No sé qué decir', 'La respuesta debería coincidir');
});

test('parsearJSON: debe retornar null para entrada vacía', () => {
    const resultado1 = parsearJSON('');
    const resultado2 = parsearJSON(null);
    const resultado3 = parsearJSON(undefined);
    assertNull(resultado1, 'Debería retornar null para string vacío');
    assertNull(resultado2, 'Debería retornar null para null');
    assertNull(resultado3, 'Debería retornar null para undefined');
});

test('parsearJSON: debe manejar JSON con comillas simples (reparación)', () => {
    const input = "{'respuesta':'Hola','imagen_tag':'feliz'}";
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería reparar comillas simples');
    assertEquals(resultado.respuesta, 'Hola', 'La respuesta debería ser "Hola"');
});

test('parsearJSON: debe adjuntar texto_original al resultado', () => {
    const input = '{"respuesta":"Test"}';
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería retornar un objeto');
    assertTrue(resultado.texto_original === input, 'Debería incluir texto_original');
});

// ============================================================
//  TESTS PARA CASO DE ERROR REPORTADO - TEXTO TRUNCADO
// ============================================================

test('parsearJSON: debe manejar texto narrativo puro truncado (caso error reportado)', () => {
    // Este es el caso del error: texto que comienza con * y no tiene JSON
    const input = `*Me acerco a ti, sintiendo la energía del momento* "fabrizio, me encanta la idea de compartir este placer con Aldo y Belinda" *beso tu mejilla y luego tus labios, dejando que la pasión fluya*`;
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería manejar texto narrativo puro');
    assertTrue(resultado.fueReparado === true, 'Debería marcar como reparado');
    assertTrue(resultado.respuesta.includes('Me acerco a ti'), 'Debería conservar el texto original');
});

test('parsearJSON: debe manejar JSON truncado con string sin cerrar', () => {
    // Caso donde el JSON está incompleto, falta cerrar comillas
    const input = `{"respuesta": "*Me acerco* Hola, cómo estás`;
    const resultado = parsearJSON(input);
    assertNotNull(resultado, 'Debería intentar recuperar texto aunque JSON esté roto');
});

test('parsearJSON: debe manejar respuesta con backslash antes de comilla de cierre', () => {
    // Caso donde hay backslash escapando la comilla de cierre
    const input = `{"respuesta": "Texto con barra \\\" al final`;
    const resultado = parsearJSON(input);
    // Debería poder extraer algo mediante extracción de campos
    if (resultado) {
        assertTrue(resultado.respuesta !== undefined, 'Debería tener respuesta si logra parsear');
    }
});

// ============================================================
//  TESTS PARA formatearTextoConAsteriscos()
// ============================================================

console.log('\n🧪 =========================================');
console.log('🧪 INICIANDO TESTS PARA formatearTextoConAsteriscos()');
console.log('🧪 =========================================\n');

test('formatearTextoConAsteriscos: debe convertir *texto* en <em class="narracion">', () => {
    const input = '*sonríe* Hola';
    const resultado = formatearTextoConAsteriscos(input);
    assertEquals(resultado, '<em class="narracion">sonríe</em> Hola', 'Debería formatear narración');
});

test('formatearTextoConAsteriscos: debe manejar múltiples narraciones', () => {
    const input = '*suspira* No lo sé *se encoge de hombros*';
    const resultado = formatearTextoConAsteriscos(input);
    assertTrue(resultado.includes('<em class="narracion">suspira</em>'), 'Debería formatear primera narración');
    assertTrue(resultado.includes('<em class="narracion">se encoge de hombros</em>'), 'Debería formatear segunda narración');
});

test('formatearTextoConAsteriscos: debe escapar caracteres HTML especiales', () => {
    const input = '*mira* <script>alert("xss")</script>';
    const resultado = formatearTextoConAsteriscos(input);
    assertTrue(!resultado.includes('<script>'), 'Debería escapar tags script');
    assertTrue(resultado.includes('&lt;script&gt;'), 'Debería tener entidades HTML escapadas');
});

test('formatearTextoConAsteriscos: debe manejar texto sin asteriscos', () => {
    const input = 'Hola, ¿cómo estás?';
    const resultado = formatearTextoConAsteriscos(input);
    assertEquals(resultado, 'Hola, ¿cómo estás?', 'Debería retornar texto sin cambios');
});

test('formatearTextoConAsteriscos: debe manejar entrada vacía', () => {
    const resultado1 = formatearTextoConAsteriscos('');
    const resultado2 = formatearTextoConAsteriscos(null);
    const resultado3 = formatearTextoConAsteriscos(undefined);
    assertEquals(resultado1, '', 'Debería retornar string vacío');
    assertEquals(resultado2, '', 'Debería retornar string vacío para null');
    assertEquals(resultado3, '', 'Debería retornar string vacío para undefined');
});

test('formatearTextoConAsteriscos: narración debe tener clase "narracion" para CSS', () => {
    const input = '*se acerca lentamente* Te veo';
    const resultado = formatearTextoConAsteriscos(input);
    assertTrue(resultado.includes('class="narracion"'), 'Debería tener clase "narracion"');
    assertTrue(resultado.includes('<em class="narracion">se acerca lentamente</em>'), 'Debería envolver narración correctamente');
});

// ============================================================
//  REPORTE FINAL DE TESTS
// ============================================================

console.log('\n🧪 =========================================');
console.log('🧪 REPORTE FINAL DE TESTS');
console.log('🧪 =========================================');
console.log(`\n📊 Total tests ejecutados: ${testsEjecutados}`);
console.log(`✅ Tests exitosos: ${testsExitosos}`);
console.log(`❌ Tests fallidos: ${testsFallidos}`);
console.log(`📈 Tasa de éxito: ${((testsExitosos / testsEjecutados) * 100).toFixed(1)}%`);

if (testsFallidos > 0) {
    console.log('\n⚠️  TESTS FALLIDOS:');
    resultados.filter(r => r.estado === '❌ FALLÓ').forEach(r => {
        console.log(`   - ${r.nombre}: ${r.error}`);
    });
} else {
    console.log('\n🎉 ¡TODOS LOS TESTS PASARON EXITOSAMENTE!');
}

console.log('\n==========================================\n');

// Exportar resultados para acceso externo (opcional)
export { testsEjecutados, testsExitosos, testsFallidos, resultados };
