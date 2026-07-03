// Sistema de Guardado de Chats - Guarda y carga conversaciones en slots de localStorage
// Autor: Implementación para QuintiAmigas Chat

const ChatSaveSystem = {
    STORAGE_KEY_PREFIX: 'quinti_chat_slot_',
    SLOTS_LIST_KEY: 'quinti_chat_slots_list',
    MAX_SLOTS: 10,
    MAX_MESSAGES_PER_SLOT: 500, // Límite para evitar exceder localStorage

    /**
     * Inicializa el sistema de guardado
     */
    init() {
        this.loadSlotsList();
        this.renderSlotsPanel();
    },

    /**
     * Obtiene la lista de slots disponibles/usados
     * @returns {Array} Lista de números de slot usados
     */
    loadSlotsList() {
        const stored = localStorage.getItem(this.SLOTS_LIST_KEY);
        return stored ? JSON.parse(stored) : [];
    },

    /**
     * Guarda la lista de slots usados
     * @param {Array} slots - Lista de números de slot
     */
    saveSlotsList(slots) {
        localStorage.setItem(this.SLOTS_LIST_KEY, JSON.stringify(slots));
    },

    /**
     * Genera una clave única para el slot
     * @param {number} slotNumber - Número del slot (1-10)
     * @returns {string} Clave para localStorage
     */
    getSlotKey(slotNumber) {
        return `${this.STORAGE_KEY_PREFIX}${slotNumber}`;
    },

    /**
     * Guarda el chat actual en un slot
     * @param {number} slotNumber - Número del slot donde guardar (1-10)
     * @param {Object} chatData - Datos del chat a guardar
     * @returns {boolean} True si se guardó exitosamente
     */
    saveChat(slotNumber, chatData) {
        if (slotNumber < 1 || slotNumber > this.MAX_SLOTS) {
            console.error('Número de slot inválido. Debe ser entre 1 y 10.');
            return false;
        }

        try {
            const slotKey = this.getSlotKey(slotNumber);
            
            // Estructura del chat guardado
            const savedChat = {
                slot: slotNumber,
                timestamp: Date.now(),
                fechaGuardado: new Date().toLocaleString('es-ES'),
                chicaPrincipal: chatData.chicaPrincipal || null,
                chicasEnChat: chatData.chicasEnChat || [],
                mensajes: chatData.mensajes || [],
                nombreUsuario: chatData.nombreUsuario || 'Anónimo',
                version: '1.0',
                version: '2.0'
            };

            // Serializar y guardar
            const serialized = JSON.stringify(savedChat);
            
            // Verificar tamaño (localStorage tiene límite de ~5MB)
            if (serialized.length > 4 * 1024 * 1024) {
                console.warn('El chat es demasiado grande para guardar.');
                alert('⚠️ El chat es demasiado largo. Por favor, inicia uno nuevo o elimina algunos mensajes.');
                return false;
            }

            localStorage.setItem(slotKey, serialized);

            // Actualizar lista de slots
            let slotsList = this.loadSlotsList();
            if (!slotsList.includes(slotNumber)) {
                slotsList.push(slotNumber);
                this.saveSlotsList(slotsList);
            }

            console.log(`✅ Chat guardado en slot ${slotNumber}`);
            return true;
        } catch (error) {
            console.error('Error al guardar el chat:', error);
            if (error.name === 'QuotaExceededError') {
                alert('❌ No hay espacio suficiente en el navegador para guardar este chat.');
            }
            return false;
        }
    },

    /**
     * Carga un chat desde un slot
     * @param {number} slotNumber - Número del slot a cargar (1-10)
     * @returns {Object|null} Datos del chat o null si no existe
     */
    loadChat(slotNumber) {
        if (slotNumber < 1 || slotNumber > this.MAX_SLOTS) {
            console.error('Número de slot inválido.');
            return null;
        }

        try {
            const slotKey = this.getSlotKey(slotNumber);
            const stored = localStorage.getItem(slotKey);
            
            if (!stored) {
                console.log(`El slot ${slotNumber} está vacío.`);
                return null;
            }

            const chatData = JSON.parse(stored);
            console.log(`✅ Chat cargado desde slot ${slotNumber}`, chatData);
            return chatData;
        } catch (error) {
            console.error('Error al cargar el chat:', error);
            return null;
        }
    },

    /**
     * Elimina un chat de un slot
     * @param {number} slotNumber - Número del slot a eliminar (1-10)
     * @returns {boolean} True si se eliminó exitosamente
     */
    deleteChat(slotNumber) {
        if (slotNumber < 1 || slotNumber > this.MAX_SLOTS) {
            return false;
        }

        try {
            const slotKey = this.getSlotKey(slotNumber);
            localStorage.removeItem(slotKey);

            // Actualizar lista de slots
            let slotsList = this.loadSlotsList();
            slotsList = slotsList.filter(s => s !== slotNumber);
            this.saveSlotsList(slotsList);

            console.log(`✅ Chat eliminado del slot ${slotNumber}`);
            return true;
        } catch (error) {
            console.error('Error al eliminar el chat:', error);
            return false;
        }
    },

    /**
     * Verifica si un slot tiene un chat guardado
     * @param {number} slotNumber - Número del slot a verificar (1-10)
     * @returns {boolean} True si el slot tiene datos
     */
    hasChat(slotNumber) {
        const slotKey = this.getSlotKey(slotNumber);
        return localStorage.getItem(slotKey) !== null;
    },

    /**
     * Obtiene metadata de todos los slots guardados
     * @returns {Array} Lista de metadata de slots
     */
    getAllSavedChats() {
        const slotsList = this.loadSlotsList();
        const savedChats = [];

        for (const slotNumber of slotsList) {
            const chatData = this.loadChat(slotNumber);
            if (chatData) {
                savedChats.push({
                    slot: slotNumber,
                    timestamp: chatData.timestamp,
                    fechaGuardado: chatData.fechaGuardado,
                    chicaPrincipal: chatData.chicaPrincipal,
                    chicasEnChat: chatData.chicasEnChat,
                    mensajeCount: chatData.mensajes?.length || 0,
                    nombreUsuario: chatData.nombreUsuario,
                    tituloPersonalizado: chatData.tituloPersonalizado,
                    imagenPersonalizada: chatData.imagenPersonalizada
                });
            }
        }

        return savedChats.sort((a, b) => b.timestamp - a.timestamp);
    },

    /**
     * Renderiza el panel de slots en el UI
     */
    renderSlotsPanel() {
        const panel = document.getElementById('chatSlotsPanel');
        if (!panel) return;

        const savedChats = this.getAllSavedChats();
        
        let html = '<div class="slots-grid">';
        
        for (let i = 1; i <= this.MAX_SLOTS; i++) {
            const chatInfo = savedChats.find(c => c.slot === i);
            const hasData = !!chatInfo;
            
            // Usar título personalizado o generar uno por defecto
            const tituloDisplay = chatInfo?.tituloPersonalizado || `Chat ${chatInfo?.chicaPrincipal || 'Vacío'}`;
            const imagenDisplay = chatInfo?.imagenPersonalizada || null;
            
            html += `
                <div class="slot-card ${hasData ? 'has-data' : 'empty'}" data-slot="${i}">
                    <div class="slot-header">
                        <span class="slot-number">Slot ${i}</span>
                        ${hasData ? '<span class="slot-status">💾</span>' : '<span class="slot-status empty">◻️</span>'}
                    </div>
                    ${hasData ? `
                        <div class="slot-info">
                            <div class="slot-title">${tituloDisplay}</div>
                            <div class="slot-date">${chatInfo.fechaGuardado}</div>
                            <div class="slot-chicas">${this.formatChicasList(chatInfo.chicasEnChat)}</div>
                            <div class="slot-messages">${chatInfo.mensajeCount} mensajes</div>
                            ${imagenDisplay ? `<img src="${imagenDisplay}" alt="Imagen personalizada" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; margin-top: 8px; border: 2px solid #8B5CF6;">` : ''}
                        </div>
                        <div class="slot-actions">
                            <button class="btn-load" onclick="ChatSaveSystem.loadAndRestoreChat(${i})">📂 Cargar</button>
                            <button class="btn-edit" onclick="ChatSaveSystem.editSlotMetadata(${i})">✏️ Editar</button>
                            <button class="btn-delete" onclick="ChatSaveSystem.confirmDelete(${i})">🗑️ Borrar</button>
                        </div>
                    ` : `
                        <div class="slot-empty-info">
                            <p>Slot vacío</p>
                            <button class="btn-save-here" onclick="ChatSaveSystem.showSaveDialog(${i})">💾 Guardar aquí</button>
                        </div>
                    `}
                </div>
            `;
        }
        
        html += '</div>';
        panel.innerHTML = html;
    },

    /**
     * Formatea la lista de chicas para mostrar
     * @param {Array} chicas - Lista de nombres de chicas
     * @returns {string} String formateado
     */
    formatChicasList(chicas) {
        if (!chicas || chicas.length === 0) return 'Sin chicas';
        if (chicas.length === 1) return chicas[0];
        if (chicas.length <= 3) return chicas.join(', ');
        return `${chicas.slice(0, 2).join(', ')} +${chicas.length - 2} más`;
    },

    /**
     * Muestra el diálogo para guardar chat en un slot específico
     * @param {number} slotNumber - Número del slot
     */
    showSaveDialog(slotNumber) {
        // Esta función será llamada desde el HTML
        if (typeof window.getCurrentChatData === 'function') {
            const chatData = window.getCurrentChatData();
            if (chatData && chatData.mensajes && chatData.mensajes.length > 0) {
                const confirmed = confirm(`¿Guardar el chat actual en el Slot ${slotNumber}?\n\nSe sobrescribirá cualquier dato existente.`);
                if (confirmed) {
                    const success = this.saveChat(slotNumber, chatData);
                    if (success) {
                        alert(`✅ Chat guardado exitosamente en el Slot ${slotNumber}`);
                        this.renderSlotsPanel();
                    }
                }
            } else {
                alert('⚠️ No hay mensajes en el chat actual para guardar.');
            }
        } else {
            alert('❌ Error: No se pudo obtener los datos del chat.');
        }
    },

    /**
     * Carga y restaura un chat desde un slot
     * @param {number} slotNumber - Número del slot a cargar
     */
    loadAndRestoreChat(slotNumber) {
        const chatData = this.loadChat(slotNumber);
        
        if (!chatData) {
            alert('❌ El slot está vacío.');
            return;
        }

        if (typeof window.restoreChatFromData === 'function') {
            const confirmed = confirm(`¿Cargar el chat del Slot ${slotNumber}?\n\nFecha: ${chatData.fechaGuardado}\nMensajes: ${chatData.mensajes?.length || 0}\n\n⚠️ Esto reemplazará el chat actual.`);
            if (confirmed) {
                window.restoreChatFromData(chatData);
                this.renderSlotsPanel();
            }
        } else {
            alert('❌ Error: No se pudo restaurar el chat.');
        }
    },

    /**
     * Confirma y elimina un chat de un slot
     * @param {number} slotNumber - Número del slot a eliminar
     */
    confirmDelete(slotNumber) {
        const confirmed = confirm(`¿Estás seguro de que quieres borrar el chat del Slot ${slotNumber}?\n\nEsta acción no se puede deshacer.`);
        if (confirmed) {
            const success = this.deleteChat(slotNumber);
            if (success) {
                alert(`✅ Chat eliminado del Slot ${slotNumber}`);
                this.renderSlotsPanel();
            }
        }
    },

    /**
     * Exporta todos los chats a un archivo JSON
     */
    exportAllChats() {
        const savedChats = this.getAllSavedChats();
        
        if (savedChats.length === 0) {
            alert('No hay chats guardados para exportar.');
            return;
        }

        const exportData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            totalChats: savedChats.length,
            chats: []
        };

        for (const chatInfo of savedChats) {
            const fullChat = this.loadChat(chatInfo.slot);
            if (fullChat) {
                exportData.chats.push(fullChat);
            }
        }

        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quinti_chats_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        alert(`✅ ${exportData.chats.length} chats exportados exitosamente.`);
    },

    /**
     * Importa chats desde un archivo JSON
     * @param {File} file - Archivo JSON a importar
     */
    importChats(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const importData = JSON.parse(event.target.result);
                
                if (!importData.chats || !Array.isArray(importData.chats)) {
                    throw new Error('Formato de archivo inválido');
                }

                let importedCount = 0;
                let skippedCount = 0;

                for (const chatData of importData.chats) {
                    if (chatData.slot >= 1 && chatData.slot <= this.MAX_SLOTS) {
                        // Buscar un slot disponible si el original está ocupado
                        let targetSlot = chatData.slot;
                        
                        while (this.hasChat(targetSlot) && targetSlot <= this.MAX_SLOTS) {
                            targetSlot++;
                        }

                        if (targetSlot <= this.MAX_SLOTS) {
                            chatData.slot = targetSlot;
                            if (this.saveChat(targetSlot, chatData)) {
                                importedCount++;
                            }
                        } else {
                            skippedCount++;
                        }
                    }
                }

                this.renderSlotsPanel();
                alert(`✅ Importación completada.\nImportados: ${importedCount}\nOmitidos (sin espacio): ${skippedCount}`);
            } catch (error) {
                console.error('Error al importar:', error);
                alert('❌ Error al importar el archivo. Asegúrate de que sea un backup válido.');
            }
        };

        reader.readAsText(file);
    }
};

// Hacer el sistema accesible globalmente
window.ChatSaveSystem = ChatSaveSystem;

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => ChatSaveSystem.init());
} else {
    ChatSaveSystem.init();
}
