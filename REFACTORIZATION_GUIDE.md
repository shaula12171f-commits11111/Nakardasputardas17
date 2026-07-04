# QuintiAmigas - Estructura del Proyecto Refactorizado

## 📁 Nueva Organización de Carpetas

El proyecto ha sido reorganizado para mejorar la mantenibilidad y escalabilidad:

```
/workspace
├── src/
│   ├── core/           # Lógica principal y configuración del sistema
│   │   ├── logica.js          # Motor principal de respuestas con Groq API
│   │   └── systemPrompt.js    # Prompts del sistema y variantes
│   │
│   ├── characters/     # Definición de personajes y personalidades
│   │   ├── personalidades.js      # Las quintillizas Nakano
│   │   ├── aldo.js                # Personaje Aldo
│   │   └── personajesMasculinos.js # Personajes masculinos adicionales
│   │
│   ├── systems/        # Sistemas y funcionalidades del chatbot
│   │   ├── imagenes.js          # URLs y tags de imágenes
│   │   ├── memorySystem.js      # Sistema de memorias/chats guardados
│   │   ├── chatSaveSystem.js    # Sistema de guardado de chats
│   │   ├── fallbacks.js         # Sistema de reintentos y respuestas de respaldo
│   │   └── antiRepeticion.js    # Detección y prevención de repeticiones
│   │
│   ├── stories/        # Historias y escenarios
│   │   ├── historiasParalelas.js  # Historias paralelas y sus datos
│   │   ├── historiasEscenarios.js # Escenarios de historias
│   │   └── nino_rpg.js            # Historia RPG de Nino
│   │
│   └── utils/          # Utilidades y helpers
│       └── parserAcciones.js      # Parser de acciones en texto
│
├── tests/              # Tests unitarios
│   ├── logica.test.js
│   └── parserAcciones.test.js
│
├── index.html          # Punto de entrada principal (UI)
├── README.md           # Este archivo
└── .gitignore
```

## 🔄 Cambios Realizados

### Reorganización
- **src/core/**: Contiene la lógica principal del sistema
- **src/characters/**: Todos los archivos relacionados con personajes
- **src/systems/**: Sistemas funcionales (imágenes, memoria, fallbacks, etc.)
- **src/stories/**: Historias y escenarios narrativos
- **src/utils/**: Funciones utilitarias y parsers
- **tests/**: Tests unitarios separados del código fuente

### Refactorización
- Se actualizaron todas las rutas de importación en `logica.js`
- Se mantuvo la compatibilidad con ES6 modules
- Se mejoró la documentación en los comentarios
- Código más fácil de navegar y mantener

## 🚀 Cómo Usar

El archivo principal sigue siendo `index.html` en la raíz. Este debe actualizar sus referencias a los módulos JS para apuntar a la nueva estructura `src/`.

### Actualizar index.html

Reemplaza las importaciones antiguas:
```html
<script type="module" src="./logica.js"></script>
```

Por las nuevas:
```html
<script type="module" src="./src/core/logica.js"></script>
```

## ✅ Beneficios

1. **Mejor organización**: Cada tipo de archivo tiene su lugar lógico
2. **Más escalable**: Fácil agregar nuevos personajes, sistemas o historias
3. **Mantenible**: Más fácil encontrar y modificar código específico
4. **Tests separados**: Los tests están en su propia carpeta
5. **Documentado**: La estructura es clara y autoexplicativa

## ⚠️ Notas Importantes

- Asegúrate de actualizar las referencias en `index.html`
- Los imports relativos entre módulos fueron actualizados
- Mantén la estructura de carpetas al agregar nuevos archivos
