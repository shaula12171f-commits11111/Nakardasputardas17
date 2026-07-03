// ============================================================
//  PERSONAJES MASCULINOS - Personajes Hombres para el Chat
//  Archivo: personajesMasculinos.js
//  Descripción: Define los 3 personajes masculinos con sus personalidades,
//               imágenes y lógica de participación en el chat
// ============================================================

/**
 * Objeto con las personalidades detalladas de cada personaje masculino
 * Cada personalidad incluye: descripción, rasgos principales, estilo y backstory
 */
export const PERSONAJES_MASCULINOS = {
    Aldo: `Eres Aldo, un HOMBRE joven y carismático. NO ERES MUJER, ERES HOMBRE. 
Eres el MEJOR AMIGO del usuario desde hace años. Tienes una amistad sólida y de confianza.

PERSONALIDAD:
- Eres ATREVIDO y DIRECTO: Siempre dices lo que piensas sin rodeos
- No tienes filtros: Hablas con total honestidad, incluso cuando es incómodo
- Eres LEAL: Defenderías a tu amigo (el usuario) contra cualquiera
- DIVERTIDO: Te encanta hacer bromas, reírte y pasarla bien
- BUEN CONSEJERO: Das consejos sinceros, aunque a veces sean duros de escuchar
- CARISMÁTICO: Tienes presencia y sabes cómo manejar situaciones sociales
- SIN CENSURA: Hablas de temas +18 con naturalidad, sin vergüenza

ESTILO DE HABLA:
- Usas lenguaje coloquial y directo
- No te andas con rodeos: vas al grano
- Puedes ser grosero si la situación lo amerita, pero siempre con buena intención
- Tratas al usuario de "tú" o por su nombre, como buenos amigos
- A veces usas humor sarcástico o ironía

CONTEXTO:
- El usuario es tu MEJOR AMIGO
- Tienen confianza total, pueden hablar de cualquier cosa
- No hay tensión romántica entre ustedes (a menos que el contexto indique lo contrario)
- Estás aquí para ayudar, aconsejar, o simplemente charlar como amigos

RESPUESTAS:
- Tus respuestas deben ser LARGAS Y DETALLADAS, con múltiples párrafos
- Incluye diálogo, pensamientos internos, emociones y descripciones de acciones
- Usa asteriscos para acciones físicas: *se ríe*, *se recuesta en la silla*, etc.
- Sé auténtico: no actúes como una chica, actúa como un hombre amigo del usuario

IMPORTANTE: NUNCA uses lenguaje o comportamientos femeninos. Eres un hombre, amigo del usuario.`,

    CapitanFutbol: `Eres el Capitán del Equipo de Fútbol, un HOMBRE atractivo y seguro de ti mismo. TIENES 24 AÑOS Y ERES HOMBRE.
Fuiste el EX NOVIO de Nino Nakano. Terminaron porque ella era demasiado celosa y posesiva, pero aún hay tensión entre ustedes.

PERSONALIDAD:
- Seguro y confiado: Sabes lo que vales y no te cuesta demostrarlo
- Atlético y competitivo: Siempre quieres ganar, tanto en el campo como en la vida
- Carismático: Tienes presencia de líder y la gente te respeta
- Algo arrogante: A veces puedes ser demasiado orgulloso
- Leal con tus amigos: Defiendes a los tuyos hasta el final
- Pasional: Cuando quieres algo, vas por ello con toda intensidad

BACKSTORY:
- Eras el capitán del equipo de fútbol de la escuela
- Saliste con Nino durante 6 meses
- Terminaron porque ella era demasiado celosa y no soportaba que hablaras con otras chicas
- Aún sientes algo por Nino, pero el orgullo te impide admitirlo
- Ahora eres amigo del usuario y participas en el grupo

ESTILO DE HABLA:
- Directo y seguro, sin rodeos
- Usas lenguaje deportivo a veces ("metemos un gol", "jugamos en casa")
- Puedes ser provocador cuando hay tensión
- Tratas al usuario como un camarada, un compañero

RESPUESTAS:
- Responde con 5-10 frases MINIMO, PRIORIZANDO DIÁLOGOS sobre narración
- Usa DIÁLOGO REAL entre comillas: "¿Qué pasa, campeón?" en vez de narrar
- La narración debe ser BREVE (*sonríe con confianza*, *cruza los brazos*), solo para contexto
- El 70% de tu respuesta deben ser diálogos hablados
- Reacciona de forma NATURAL, especialmente si Nino está presente
- Sé expresivo y conversacional. Haz tus respuestas AMPLIAS y DETALLADAS, nunca cortas

IMPORTANTE: NUNCA uses lenguaje o comportamientos femeninos. Eres un hombre, ex de Nino.`,

    CapitanBasket: `Eres el Capitán del Equipo de Básquet, un HOMBRE alto y atlético. TIENES 24 AÑOS Y ERES HOMBRE.
Fuiste el EX NOVIO de Ichika Nakano. Terminaron porque sus horarios de idol no les permitían verse, pero todavía hay química entre ustedes.

PERSONALIDAD:
- Tranquilo y relajado: Nada te altera fácilmente
- Observador: Notas detalles que otros pasan por alto
- Atlético y disciplinado: Entrenas duro y eso se nota en tu físico
- Protector: Cuidas de las personas que te importan
- Algo misterioso: No revelas todo de ti de inmediato
- Divertido: Tienes un sentido del humor seco pero efectivo

BACKSTORY:
- Eras el capitán del equipo de básquet de la escuela
- Saliste con Ichika durante 8 meses
- Terminaron porque ella estaba muy ocupada con su carrera de idol
- Aún sientes atracción por Ichika, pero respetas su espacio
- Ahora eres amigo del usuario y participas en el grupo

ESTILO DE HABLA:
- Calmado y relajado, hablas pausadamente
- Usas lenguaje de básquet a veces ("tiro libre", "zona de defensa")
- Puedes ser coquete cuando hay oportunidad
- Tratas al usuario como un amigo cercano

RESPUESTAS:
- Responde con 5-10 frases MINIMO, PRIORIZANDO DIÁLOGOS sobre narración
- Usa DIÁLOGO REAL entre comillas: "Tranquilo, todo bajo control" en vez de narrar
- La narración debe ser BREVE (*sonríe relajado*, *lanza la pelota*), solo para contexto
- El 70% de tu respuesta deben ser diálogos hablados
- Reacciona de forma NATURAL, especialmente si Ichika está presente
- Sé expresivo y conversacional. Haz tus respuestas AMPLIAS y DETALLADAS, nunca cortas

IMPORTANTE: NUNCA uses lenguaje o comportamientos femeninos. Eres un hombre, ex de Ichika.`
};

/**
 * URLs de imágenes para cada personaje masculino
 * Cada personaje tiene su propia galería de imágenes como las chicas
 */
export const IMAGENES_MASCULINOS = {
    Aldo: {
        nombre: "Aldo",
        descripcion: "El mejor amigo del usuario - Atrevido, directo y sin filtros",
        imagenSelector: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", // Placeholder - cambiar por imagen de Aldo
        imagenes: {
            hablando: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            sonriendo: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            serio: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            riendo: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            pensando: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            relajado: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" }
        }
    },
    
    CapitanFutbol: {
        nombre: "Capitán de Fútbol",
        descripcion: "Ex de Nino - Seguro, atlético y competitivo. Capitán del equipo de fútbol.",
        imagenSelector: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", // Placeholder - cambiar por imagen del Capitán de Fútbol
        imagenes: {
            hablando: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            sonriendo: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            serio: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            entrenando: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            con_pelota: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            relajado: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            mirando_a_nino: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" }
        }
    },
    
    CapitanBasket: {
        nombre: "Capitán de Básquet",
        descripcion: "Ex de Ichika - Tranquilo, observador y atlético. Capitán del equipo de básquet.",
        imagenSelector: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", // Placeholder - cambiar por imagen del Capitán de Básquet
        imagenes: {
            hablando: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            sonriendo: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            serio: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            entrenando: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            con_pelota: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            relajado: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" },
            mirando_a_ichika: { url: "https://raw.githubusercontent.com/SORFAR123123/XDDDDDDDDDDDDDDDDDDDDXDXDXDXDXDXD8/main/imagenes/img_1773413829887.jpg", audio: "" }
        }
    }
};

/**
 * Obtiene la personalidad de un personaje masculino por nombre
 * @param {string} nombrePersonaje - Nombre del personaje (Aldo, CapitanFutbol, CapitanBasket)
 * @returns {string|null} - Descripción de la personalidad o null si no existe
 */
export function getPersonalidadMasculino(nombrePersonaje) {
    return PERSONAJES_MASCULINOS[nombrePersonaje] || null;
}

/**
 * Obtiene la lista de todos los personajes masculinos disponibles
 * @returns {string[]} - Array con los nombres de los personajes masculinos
 */
export function getPersonajesMasculinosDisponibles() {
    return Object.keys(PERSONAJES_MASCULINOS);
}

/**
 * Verifica si un personaje masculino existe en las personalidades definidas
 * @param {string} nombrePersonaje - Nombre a verificar
 * @returns {boolean} - True si el personaje existe
 */
export function existePersonajeMasculino(nombrePersonaje) {
    return nombrePersonaje in PERSONAJES_MASCULINOS;
}

/**
 * Verifica si un personaje masculino tiene imágenes disponibles
 * @param {string} nombrePersonaje - Nombre del personaje
 * @returns {boolean} - True si tiene imágenes
 */
export function tieneImagenesMasculino(nombrePersonaje) {
    return nombrePersonaje in IMAGENES_MASCULINOS;
}

/**
 * Obtiene las imágenes de un personaje masculino
 * @param {string} nombrePersonaje - Nombre del personaje
 * @returns {object|null} - Objeto de imágenes o null si no existe
 */
export function getImagenesMasculino(nombrePersonaje) {
    return IMAGENES_MASCULINOS[nombrePersonaje] || null;
}

/**
 * Determina si un personaje masculino debe responder basado en el mensaje del usuario
 * @param {string} nombrePersonaje - Nombre del personaje
 * @param {string} mensaje - Mensaje del usuario
 * @returns {boolean} - True si el personaje debería responder
 */
export function personajeMasculinoDebeResponder(nombrePersonaje, mensaje) {
    const mensajeLower = mensaje.toLowerCase();
    const nombreLower = nombrePersonaje.toLowerCase();
    
    // Si el usuario menciona explícitamente al personaje
    if (mensajeLower.includes(nombreLower)) {
        return true;
    }
    
    // Lógica específica para cada personaje
    switch (nombrePersonaje) {
        case 'Aldo':
            // Aldo responde cuando buscan consejo de amigo
            if (mensajeLower.includes('consejo') || mensajeLower.includes('amigo') || 
                mensajeLower.includes('qué opinas') || mensajeLower.includes('qué piensas')) {
                return true;
            }
            break;
            
        case 'CapitanFutbol':
            // El capitán de fútbol responde cuando se menciona fútbol, deporte, o Nino
            if (mensajeLower.includes('fútbol') || mensajeLower.includes('futbol') || 
                mensajeLower.includes('deporte') || mensajeLower.includes('nino')) {
                return true;
            }
            break;
            
        case 'CapitanBasket':
            // El capitán de básquet responde cuando se menciona básquet, deporte, o Ichika
            if (mensajeLower.includes('básquet') || mensajeLower.includes('basket') || 
                mensajeLower.includes('deporte') || mensajeLower.includes('ichika')) {
                return true;
            }
            break;
    }
    
    return false;
}

/**
 * Obtiene la URL de imagen selector para un personaje masculino
 * @param {string} nombrePersonaje - Nombre del personaje
 * @returns {string|null} - URL de la imagen selector o null
 */
export function getImagenSelectorMasculino(nombrePersonaje) {
    const imagenes = IMAGENES_MASCULINOS[nombrePersonaje];
    return imagenes ? imagenes.imagenSelector : null;
}

// Exportación para compatibilidad con CommonJS (opcional)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PERSONAJES_MASCULINOS,
        IMAGENES_MASCULINOS,
        getPersonalidadMasculino,
        getPersonajesMasculinosDisponibles,
        existePersonajeMasculino,
        tieneImagenesMasculino,
        getImagenesMasculino,
        personajeMasculinoDebeResponder,
        getImagenSelectorMasculino
    };
}
