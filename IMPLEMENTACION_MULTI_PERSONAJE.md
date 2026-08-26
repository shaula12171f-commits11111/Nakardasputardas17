# Sistema de Interacción Multi-Personaje Mejorado

## Resumen de la Implementación

Se ha implementado un sistema avanzado para mejorar la interacción entre múltiples personajes en conversaciones grupales. Este sistema añade dinamismo, realismo y coherencia a las conversaciones con varios personajes.

## Archivos Creados/Modificados

### 1. `/workspace/src/systems/multiPersonajeInteraccion.js` (NUEVO)
Módulo especializado que gestiona las interacciones multi-personaje con las siguientes características:

#### Características Principales:

1. **Memoria de Relaciones entre Personajes**
   - Almacena el historial de interacciones entre pares de personajes
   - Niveles de amistad dinámicos (0-10)
   - Tensión romántica acumulativa
   - Conflictos no resueltos
   - Momentos compartidos registrados

2. **Sistema de Turnos Dinámicos**
   - Determina automáticamente qué personajes deben hablar
   - Considera:
     - A quién se dirige el usuario directamente
     - Personalidad del personaje (extrovertido vs introvertido)
     - Historial reciente (quién habló mucho/poco)
     - Intereses temáticos del personaje
   - Evita que un personaje domine la conversación

3. **Dinámicas Grupales Automáticas**
   - Detecta amistades fuertes entre personajes
   - Identifica tensiones o conflictos
   - Reconoce química romántica
   - Considera interacciones recientes

4. **Acotaciones Internas (Pensamientos)**
   - Genera pensamientos internos antes de hablar
   - Simula proceso de decisión del personaje
   - Considera lo que dijeron otros personajes

5. **Detector de Solapamiento de Diálogos**
   - Analiza si los personajes están repitiendo temas
   - Sugiere variaciones para evitar repetición
   - Extrae temas clave de cada respuesta

### 2. `/workspace/src/core/logica.js` (MODIFICADO)

#### Cambios Realizados:

1. **Importación del Nuevo Módulo** (línea 36)
```javascript
import { 
    actualizarRelacionPersonajes, 
    generarResumenDinamicasGrupales, 
    determinarOrdenTurnos, 
    generarAcotacionInterna, 
    analizarSolapamientoDialogos 
} from '../systems/multiPersonajeInteraccion.js';
```

2. **Orden de Turnos Dinámico** (líneas 2477-2487)
   - Reemplaza el sistema simple de "objetivo primero"
   - Usa algoritmo basado en personalidad y contexto
   - Log del orden determinado

3. **Dinámicas Grupales en Contexto** (líneas 2510-2516)
   - Genera resumen automático de relaciones entre personajes
   - Lo incluye en el contexto unificado para todos los personajes
   - Permite que los personajes reaccionen a relaciones existentes

4. **Actualización de Relaciones** (líneas 2879-2904)
   - Después de cada respuesta, analiza el contenido
   - Detecta tipo de interacción (aliado, conflicto, romántico, neutral)
   - Actualiza memoria de relaciones entre personajes
   - Crea evolución natural de relaciones

## Cómo Funciona el Sistema

### Flujo de Conversación Multi-Personaje:

1. **Detección de Personajes en Chat**
   - Se identifican todos los personajes mencionados
   - Se agregan al conjunto `chicasEnChat`

2. **Determinación de Orden de Turnos**
   ```javascript
   const ordenTurnos = determinarOrdenTurnos(
       personajesDisponibles,
       mensajeUsuario,
       historialConversacion
   );
   ```
   - Calcula score para cada personaje
   - Considera personalidad, historial y contexto
   - Devuelve array ordenado por prioridad

3. **Generación de Contexto Enriquecido**
   - Historial íntimo compartido
   - Dinámicas grupales activas
   - Relaciones previas (ex-parejas, etc.)
   - Estado actual de acciones
   - Historial unificado de conversación

4. **Llamadas Secuenciales a API**
   - Cada personaje recibe contexto completo
   - Ve respuestas de personajes anteriores
   - Instrucciones específicas para interactuar

5. **Actualización Post-Respuesta**
   - Analiza contenido de respuesta
   - Detecta tipo de interacción
   - Actualiza relación con personaje anterior
   - Guarda en memoria para futuro

## Ejemplo de Uso

### Situación: Usuario habla con Ichika, Nino y Miku

```javascript
// El sistema detecta 3 personajes en chat
// Calcula orden de turnos basado en:
// - ¿A quién se dirige el usuario?
// - Personalidad de cada una
// - Quién habló recientemente

// Orden resultante podría ser:
// 1. Nino (si el usuario le preguntó algo directo)
// 2. Yotsuba (extrovertida, no habló hace 2 turnos)
// 3. Itsuki (introvertida, pero el tema es estudio)

// Cada una ve:
// - Lo que dijo la anterior
// - Dinámicas grupales (ej: "Nino y Yotsuba tienen amistad fuerte")
// - Historial completo de conversación

// Después de responder:
// - Si Nino dice "Estoy de acuerdo con Yotsuba" → relación se fortalece
// - Si Yotsuba dice "No estoy de acuerdo" → posible conflicto registrado
```

## Beneficios de la Implementación

1. **Conversaciones Más Naturales**
   - Los personajes reaccionan entre sí
   - No son respuestas aisladas
   - Flujo conversacional realista

2. **Evolución de Relaciones**
   - Las relaciones cambian con el tiempo
   - Conflictos y alianzas emergentes
   - Memoria de interacciones pasadas

3. **Personalidad Coherente**
   - Extrovertidos hablan más
   - Introvertidos esperan su momento
   - Cada personaje mantiene su voz única

4. **Evita Repetición**
   - Detector de solapamiento temático
   - Cada personaje aborda ángulos diferentes
   - Anti-repetición reforzada

5. **Contexto Compartido**
   - Todos saben lo que pasó
   - Historial íntimo común
   - Dinámicas grupales conocidas

## Configuración

En `multiPersonajeInteraccion.js`:

```javascript
const CONFIG_MULTI_PERSONAJE = {
    maxPersonajesActivos: 5,           // Máximo que pueden hablar
    probabilidadRespuestaMultiple: 0.7, // 70% chance de reacción
    minTurnosParaResumen: 3,           // Resumir cada 3 turnos
    maxLongitudHistorialGrupo: 15,     // Historial máximo
    umbralSimilitudTematica: 0.6,      // Umbral detección temas
};
```

## Funciones Exportadas

```javascript
export {
    actualizarRelacionPersonajes,      // Actualiza relación entre 2 personajes
    obtenerRelacionPersonajes,         // Obtiene estado de relación
    generarResumenDinamicasGrupales,   // Genera resumen para prompt
    determinarOrdenTurnos,             // Calcula orden de habla
    generarAcotacionInterna,           // Crea pensamientos internos
    analizarSolapamientoDialogos,      // Detecta repetición
    CONFIG_MULTI_PERSONAJE             // Configuración
}
```

## Próximas Mejoras Sugeridas

1. **Sistema de Interrupciones**
   - Permitir que personajes interrumpan naturalmente
   - Basado en urgencia emocional y personalidad

2. **Diálogos Cruzados**
   - Que personajes se hagan preguntas entre sí
   - Conversaciones secundarias dentro del grupo

3. **Estados Emocionales Contagiosos**
   - Si un personaje está triste, afecta a otros
   - Propagación emocional en el grupo

4. **Memoria de Largo Plazo**
   - Guardar relaciones entre sesiones
   - Evolución persistente de vínculos

