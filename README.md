# Chatbot Roleplay - Quintillizas Nakano

## Descripción

Este es un **chatbot de roleplay** interactivo que permite conversar con personajes personalizados usando IA. El sistema utiliza la API de Groq para generar respuestas contextuales e inmersivas.

## Características Principales

### 🎭 Personajes
- **Las 5 quintillizas Nakano**: Ichika, Nino, Miku, Yotsuba e Itsuki (todas de 23 años)
- **Personajes masculinos**: Aldo y otros personajes adicionales
- Cada personaje tiene personalidad única y distintiva

### 💬 Sistema de Chat
- Conversaciones naturales con contexto memorizado
- Sistema de memoria multicapa (trabajo, hechos, narrativa, emocional, eventos íntimos)
- Historial de conversación que mantiene coherencia
- Detección y prevención de repeticiones

### 🖼️ Sistema Visual
- Imágenes contextuales que cambian según la situación
- Tags de imágenes mapeados a acciones específicas
- Selector visual de personajes

### 📚 Historias Paralelas
- Escenarios de roleplay predefinidos
- System prompts adicionales para contextos específicos
- Mensajes de bienvenida personalizados por historia

### 🔧 Sistemas Implementados
- **Memory System**: Memoria avanzada en múltiples capas
- **Anti-Repeticion**: Detección de diálogos repetidos
- **Fallbacks**: Reintentos automáticos y respuestas de respaldo
- **Chat Save System**: Guardado y carga de conversaciones
- **Parser de Acciones**: Detección de acciones en texto

## Estructura del Proyecto

```
/workspace
├── src/
│   ├── core/           # Lógica principal del chatbot
│   │   ├── logica.js          # Motor de respuestas con Groq API
│   │   └── systemPrompt.js    # Prompts del sistema
│   │
│   ├── characters/     # Definición de personajes
│   │   ├── personalidades.js      # Las quintillizas Nakano
│   │   ├── aldo.js                # Personaje Aldo
│   │   └── personajesMasculinos.js # Personajes masculinos
│   │
│   ├── systems/        # Sistemas funcionales
│   │   ├── imagenes.js          # URLs y tags de imágenes
│   │   ├── memorySystem.js      # Memoria avanzada
│   │   ├── chatSaveSystem.js    # Guardado de chats
│   │   ├── fallbacks.js         # Reintentos y fallbacks
│   │   └── antiRepeticion.js    # Prevención de repeticiones
│   │
│   ├── stories/        # Historias y escenarios
│   │   ├── historiasParalelas.js  # Gestión de historias
│   │   ├── historiasEscenarios.js # Escenarios por chica
│   │   └── historiaNino.js        # Historia paralela de Nino
│   │
│   └── utils/          # Utilidades
│       └── parserAcciones.js      # Parser de acciones
│
├── tests/              # Tests unitarios
├── index.html          # Interfaz principal
└── README.md           # Este archivo
```

## Uso

1. Abrir `index.html` en un navegador web moderno
2. Seleccionar un personaje del selector
3. Comenzar a chatear
4. Opcional: Elegir una historia paralela para un escenario específico

## Tecnologías

- **Frontend**: HTML5, CSS3, JavaScript ES6+
- **IA**: Groq API (modelo openai/gpt-oss-120b)
- **Almacenamiento**: localStorage para persistencia local
- **Módulos**: ES6 Modules para organización del código

## Notas Importantes

- Es un **chatbot de roleplay**, no un juego
- Las respuestas se generan dinámicamente con IA
- El sistema mantiene contexto y memoria durante la conversación
- Soporta múltiples API keys para alta disponibilidad

## Licencia

Proyecto personal de chatbot roleplay.
