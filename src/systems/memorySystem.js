// Sistema de Memorias - Guarda chats completos con nombre, imagen de portada y todo el contenido
// Permite guardar conversaciones completas (textos, imágenes, audios) y cargarlas después
// También permite editar nombre y foto de portada de los chats guardados

const MemorySystem = {
    STORAGE_KEY: 'quinti_chat_memories_list',
    MEMORY_PREFIX: 'quinti_chat_memory_',
    
    /**
     * Inicializa el sistema de memorias
     */
    init() {
        this.loadMemoriesList();
        console.log('✅ Sistema de Memorias de Chats inicializado');
    },
    
    /**
     * Obtiene la lista de IDs de memorias guardadas
     * @returns {Array} Lista de IDs de memorias
     */
    loadMemoriesList() {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        return stored ? JSON.parse(stored) : [];
    },
    
    /**
     * Guarda la lista de IDs de memorias
     * @param {Array} memoryIds - Lista de IDs de memorias
     */
    saveMemoriesList(memoryIds) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(memoryIds));
    },
    
    /**
     * Genera una clave única para una memoria
     * @param {string} memoryId - ID de la memoria
     * @returns {string} Clave para localStorage
     */
    getMemoryKey(memoryId) {
        return `${this.MEMORY_PREFIX}${memoryId}`;
    },
    
    /**
     * Genera un ID único para una nueva memoria
     * @returns {string} ID único
     */
    generateMemoryId() {
        return `chat_memory_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    },
    
    /**
     * Guarda una nueva memoria (chat completo)
     * @param {Object} memoryData - Datos de la memoria (chat completo)
     * @returns {Object|null} Memoria guardada o null si falló
     */
    saveMemory(memoryData) {
        try {
            const memoryId = this.generateMemoryId();
            
            const memory = {
                id: memoryId,
                nombre: memoryData.nombre || 'Chat sin nombre',
                imagen: memoryData.imagen || null,
                descripcion: memoryData.descripcion || '',
                chatData: memoryData.chatData || null, // El chat completo con todos sus mensajes
                fechaCreacion: Date.now(),
                fechaModificacion: Date.now(),
                version: '2.0'
            };
            
            const serialized = JSON.stringify(memory);
            
            // Verificar tamaño
            if (serialized.length > 4 * 1024 * 1024) {
                console.warn('La memoria es demasiado grande para guardar.');
                alert('⚠️ El chat es demasiado grande. Por favor, usa una imagen más pequeña o reduce el número de mensajes.');
                return null;
            }
            
            localStorage.setItem(memoryId, serialized);
            
            // Actualizar lista de memorias
            let memoriesList = this.loadMemoriesList();
            memoriesList.push(memoryId);
            this.saveMemoriesList(memoriesList);
            
            console.log(`✅ Memoria guardada: ${memoryId}`);
            return memory;
        } catch (error) {
            console.error('Error al guardar la memoria:', error);
            if (error.name === 'QuotaExceededError') {
                alert('❌ No hay espacio suficiente en el navegador para guardar esta memoria.');
            }
            return null;
        }
    },
    
    /**
     * Carga una memoria por ID
     * @param {string} memoryId - ID de la memoria
     * @returns {Object|null} Datos de la memoria o null si no existe
     */
    loadMemory(memoryId) {
        try {
            const stored = localStorage.getItem(memoryId);
            
            if (!stored) {
                console.log(`La memoria ${memoryId} no existe.`);
                return null;
            }
            
            return JSON.parse(stored);
        } catch (error) {
            console.error('Error al cargar la memoria:', error);
            return null;
        }
    },
    
    /**
     * Actualiza una memoria existente
     * @param {string} memoryId - ID de la memoria a actualizar
     * @param {Object} updates - Campos a actualizar
     * @returns {boolean} True si se actualizó exitosamente
     */
    updateMemory(memoryId, updates) {
        try {
            const memory = this.loadMemory(memoryId);
            
            if (!memory) {
                console.error(`No se encontró la memoria ${memoryId}`);
                return false;
            }
            
            // Actualizar campos permitidos
            if (updates.nombre !== undefined) {
                memory.nombre = updates.nombre;
            }
            if (updates.imagen !== undefined) {
                memory.imagen = updates.imagen;
            }
            if (updates.descripcion !== undefined) {
                memory.descripcion = updates.descripcion;
            }
            if (updates.chatData !== undefined) {
                memory.chatData = updates.chatData;
            }
            
            memory.fechaModificacion = Date.now();
            
            localStorage.setItem(memoryId, JSON.stringify(memory));
            
            console.log(`✅ Memoria actualizada: ${memoryId}`);
            return true;
        } catch (error) {
            console.error('Error al actualizar la memoria:', error);
            return false;
        }
    },
    
    /**
     * Elimina una memoria
     * @param {string} memoryId - ID de la memoria a eliminar
     * @returns {boolean} True si se eliminó exitosamente
     */
    deleteMemory(memoryId) {
        try {
            localStorage.removeItem(memoryId);
            
            // Actualizar lista de memorias
            let memoriesList = this.loadMemoriesList();
            memoriesList = memoriesList.filter(id => id !== memoryId);
            this.saveMemoriesList(memoriesList);
            
            console.log(`✅ Memoria eliminada: ${memoryId}`);
            return true;
        } catch (error) {
            console.error('Error al eliminar la memoria:', error);
            return false;
        }
    },
    
    /**
     * Obtiene todas las memorias guardadas
     * @returns {Array} Lista de memorias
     */
    getAllMemories() {
        const memoriesList = this.loadMemoriesList();
        const memories = [];
        
        for (const memoryId of memoriesList) {
            const memory = this.loadMemory(memoryId);
            if (memory) {
                memories.push(memory);
            }
        }
        
        return memories.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    },
    
    /**
     * Renderiza el panel de memorias en el UI
     */
    renderMemoriesPanel() {
        const panel = document.getElementById('memoriesPanel');
        if (!panel) {
            console.warn('No se encontró el panel de memorias');
            return;
        }
        
        const memories = this.getAllMemories();
        
        if (memories.length === 0) {
            panel.innerHTML = `
                <div class="no-memories">
                    <p style="text-align: center; color: #C4B5FD; font-size: 16px;">
                        📭 No tienes chats guardados aún.<br>
                        ¡Guarda tu primer chat completo con imágenes, textos y audios!
                    </p>
                </div>
            `;
            return;
        }
        
        let html = '<div class="memories-grid">';
        
        for (const memory of memories) {
            const fecha = new Date(memory.fechaCreacion).toLocaleString('es-ES');
            const mensajeCount = memory.chatData?.mensajes?.length || 0;
            const chicasEnChat = memory.chatData?.chicasEnChat || [];
            const imagenHTML = memory.imagen 
                ? `<img src="${memory.imagen}" alt="${memory.nombre}" class="memory-image">`
                : `<div class="memory-no-image">📷 Sin portada</div>`;
            
            html += `
                <div class="memory-card" data-id="${memory.id}">
                    <div class="memory-header">
                        <h3 class="memory-title">${this.escapeHtml(memory.nombre)}</h3>
                        <button class="memory-delete-btn" onclick="MemorySystem.confirmDelete('${memory.id}')">×</button>
                    </div>
                    <div class="memory-content">
                        ${imagenHTML}
                        ${memory.descripcion ? `<p class="memory-description">${this.escapeHtml(memory.descripcion)}</p>` : ''}
                        <p class="memory-chat-info" style="color: #A78BFA; font-size: 13px; margin-top: 8px;">
                            💬 ${mensajeCount} mensajes | 👥 ${chicasEnChat.join(', ') || 'Sin chicas'}
                        </p>
                    </div>
                    <div class="memory-footer">
                        <span class="memory-date">${fecha}</span>
                        <div class="memory-actions">
                            <button class="memory-edit-btn" onclick="MemorySystem.showEditDialog('${memory.id}')">✏️ Editar</button>
                            <button class="memory-load-btn" onclick="MemorySystem.loadChatMemory('${memory.id}')" style="background: linear-gradient(135deg, #10b981, #059669);">📂 Cargar Chat</button>
                        </div>
                    </div>
                </div>
            `;
        }
        
        html += '</div>';
        panel.innerHTML = html;
    },
    
    /**
     * Escapa caracteres HTML para prevenir XSS
     * @param {string} text - Texto a escapar
     * @returns {string} Texto escapado
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },
    
    /**
     * Muestra el diálogo para crear/editar memoria
     * @param {string|null} memoryId - ID de memoria a editar, o null para nueva
     */
    showEditDialog(memoryId = null) {
        const modal = document.getElementById('memoryEditModal');
        if (!modal) {
            console.error('No se encontró el modal de edición de memorias');
            return;
        }
        
        const titleEl = document.getElementById('memoryModalTitle');
        const nombreInput = document.getElementById('memoryNombreInput');
        const descripcionInput = document.getElementById('memoryDescripcionInput');
        const urlInput = document.getElementById('memoryUrlInput');
        const previewImg = document.getElementById('memoryPreviewImg');
        
        if (memoryId) {
            // Modo edición
            const memory = this.loadMemory(memoryId);
            if (!memory) {
                alert('❌ No se encontró la memoria');
                return;
            }
            
            if (titleEl) titleEl.textContent = '✏️ Editar Memoria';
            if (nombreInput) nombreInput.value = memory.nombre || '';
            if (descripcionInput) descripcionInput.value = memory.descripcion || '';
            if (urlInput) urlInput.value = memory.imagen || '';
            if (previewImg) {
                previewImg.src = memory.imagen || '';
                previewImg.style.display = memory.imagen ? 'block' : 'none';
            }
            
            // Guardar ID en el modal para saber que estamos editando
            modal.dataset.editingId = memoryId;
        } else {
            // Modo creación
            if (titleEl) titleEl.textContent = '➕ Nueva Memoria';
            if (nombreInput) nombreInput.value = '';
            if (descripcionInput) descripcionInput.value = '';
            if (urlInput) urlInput.value = '';
            if (previewImg) {
                previewImg.src = '';
                previewImg.style.display = 'none';
            }
            
            delete modal.dataset.editingId;
        }
        
        modal.style.display = 'flex';
    },
    
    /**
     * Cierra el modal de edición
     */
    closeEditModal() {
        const modal = document.getElementById('memoryEditModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Guarda la memoria desde el formulario del modal (chat completo)
     */
    saveMemoryFromModal() {
        const modal = document.getElementById('memoryEditModal');
        const editingId = modal ? modal.dataset.editingId : null;
        
        const nombre = document.getElementById('memoryNombreInput')?.value || 'Chat sin nombre';
        const descripcion = document.getElementById('memoryDescripcionInput')?.value || '';
        const urlImagen = document.getElementById('memoryUrlInput')?.value || '';
        
        // Obtener datos actuales del chat si estamos creando uno nuevo
        let chatData = null;
        if (!editingId && typeof window.getCurrentChatData === 'function') {
            chatData = window.getCurrentChatData();
        } else if (editingId) {
            // Si estamos editando, mantener los datos existentes del chat
            const existingMemory = this.loadMemory(editingId);
            if (existingMemory) {
                chatData = existingMemory.chatData;
            }
        }
        
        if (editingId) {
            // Actualizar memoria existente
            const success = this.updateMemory(editingId, {
                nombre: nombre,
                descripcion: descripcion,
                imagen: urlImagen
            });
            
            if (success) {
                alert('✅ Memoria actualizada exitosamente');
                this.closeEditModal();
                this.renderMemoriesPanel();
            } else {
                alert('❌ Error al actualizar la memoria');
            }
        } else {
            // Crear nueva memoria con el chat actual
            if (!chatData || !chatData.mensajes || chatData.mensajes.length === 0) {
                alert('⚠️ No hay mensajes en el chat actual para guardar.');
                return;
            }
            
            const memory = this.saveMemory({
                nombre: nombre,
                descripcion: descripcion,
                imagen: urlImagen,
                chatData: chatData
            });
            
            if (memory) {
                alert('✅ Chat guardado exitosamente como memoria');
                this.closeEditModal();
                this.renderMemoriesPanel();
            }
        }
    },
    
    /**
     * Confirma y elimina una memoria
     * @param {string} memoryId - ID de la memoria a eliminar
     */
    confirmDelete(memoryId) {
        const confirmed = confirm('¿Estás seguro de que quieres eliminar esta memoria?\n\nEsta acción no se puede deshacer.');
        if (confirmed) {
            const success = this.deleteMemory(memoryId);
            if (success) {
                alert('✅ Memoria eliminada exitosamente');
                this.renderMemoriesPanel();
            } else {
                alert('❌ Error al eliminar la memoria');
            }
        }
    },
    
    /**
     * Muestra una memoria en un modal de vista previa
     * @param {string} memoryId - ID de la memoria a ver
     */
    viewMemory(memoryId) {
        const memory = this.loadMemory(memoryId);
        if (!memory) {
            alert('❌ No se encontró la memoria');
            return;
        }
        
        // Guardar el ID actual para poder cargarlo después
        this.currentViewingId = memoryId;
        
        const modal = document.getElementById('memoryViewModal');
        if (!modal) {
            console.error('No se encontró el modal de vista de memorias');
            return;
        }
        
        const titleEl = document.getElementById('memoryViewTitle');
        const imgEl = document.getElementById('memoryViewImg');
        const descEl = document.getElementById('memoryViewDesc');
        const dateEl = document.getElementById('memoryViewDate');
        
        if (titleEl) titleEl.textContent = memory.nombre;
        if (imgEl) {
            if (memory.imagen) {
                imgEl.src = memory.imagen;
                imgEl.style.display = 'block';
            } else {
                imgEl.style.display = 'none';
            }
        }
        if (descEl) {
            descEl.textContent = memory.descripcion || 'Sin descripción';
        }
        if (dateEl) {
            dateEl.textContent = `Guardado: ${new Date(memory.fechaCreacion).toLocaleString('es-ES')}`;
        }
        
        modal.style.display = 'flex';
    },
    
    /**
     * Carga un chat guardado en una memoria y lo restaura en el chat actual
     * @param {string} memoryId - ID de la memoria con el chat a cargar
     */
    loadChatMemory(memoryId) {
        const memory = this.loadMemory(memoryId);
        
        if (!memory || !memory.chatData) {
            alert('❌ No se encontró el chat guardado o está corrupto.');
            return;
        }
        
        const confirmed = confirm(`¿Cargar el chat "${memory.nombre}"?\n\nFecha: ${new Date(memory.fechaCreacion).toLocaleString('es-ES')}\nMensajes: ${memory.chatData.mensajes?.length || 0}\n\n⚠️ Esto reemplazará el chat actual.`);
        
        if (confirmed && typeof window.restoreChatFromData === 'function') {
            window.restoreChatFromData(memory.chatData);
            this.closeViewModal();
            // Cerrar panel de memorias si está abierto
            const panel = document.getElementById('memoriesPanelContainer');
            if (panel) {
                panel.style.display = 'none';
            }
        } else if (!window.restoreChatFromData) {
            alert('❌ Error: La función para restaurar chats no está disponible.');
        }
    },
    
    /**
     * Cierra el modal de vista de memoria
     */
    closeViewModal() {
        const modal = document.getElementById('memoryViewModal');
        if (modal) {
            modal.style.display = 'none';
        }
    },
    
    /**
     * Maneja la pegada de imagen desde el clipboard
     * @param {ClipboardEvent} event - Evento de pegado
     */
    handlePaste(event) {
        const items = event.clipboardData?.items;
        if (!items) return;
        
        for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
                const blob = items[i].getAsFile();
                this.convertBlobToBase64(blob, (base64) => {
                    const previewImg = document.getElementById('memoryPreviewImg');
                    const urlInput = document.getElementById('memoryUrlInput');
                    
                    if (previewImg) {
                        previewImg.src = base64;
                        previewImg.style.display = 'block';
                    }
                    if (urlInput) {
                        urlInput.value = base64;
                    }
                    
                    alert('✅ Imagen pegada desde el portapapeles');
                });
                break;
            }
        }
    },
    
    /**
     * Maneja la subida de imagen desde archivo
     * @param {Event} event - Evento de cambio de input file
     */
    handleFileUpload(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        // Verificar tipo de archivo
        if (!file.type.startsWith('image/')) {
            alert('❌ Por favor selecciona un archivo de imagen válido');
            return;
        }
        
        // Verificar tamaño (máximo 2MB para evitar problemas con localStorage)
        if (file.size > 2 * 1024 * 1024) {
            alert('⚠️ La imagen es demasiado grande. Máximo 2MB.');
            return;
        }
        
        this.convertBlobToBase64(file, (base64) => {
            const previewImg = document.getElementById('memoryPreviewImg');
            const urlInput = document.getElementById('memoryUrlInput');
            
            if (previewImg) {
                previewImg.src = base64;
                previewImg.style.display = 'block';
            }
            if (urlInput) {
                urlInput.value = base64;
            }
            
            alert('✅ Imagen cargada exitosamente');
        });
    },
    
    /**
     * Convierte un Blob/File a Base64
     * @param {Blob} blob - Blob o File a convertir
     * @param {Function} callback - Callback con el resultado Base64
     */
    convertBlobToBase64(blob, callback) {
        const reader = new FileReader();
        reader.onload = () => {
            callback(reader.result);
        };
        reader.onerror = () => {
            console.error('Error al convertir imagen:', reader.error);
            alert('❌ Error al procesar la imagen');
        };
        reader.readAsDataURL(blob);
    },
    
    /**
     * Exporta todas las memorias a un archivo JSON
     */
    exportAllMemories() {
        const memories = this.getAllMemories();
        
        if (memories.length === 0) {
            alert('No hay chats guardados para exportar.');
            return;
        }
        
        const exportData = {
            version: '2.0',
            exportDate: new Date().toISOString(),
            totalMemories: memories.length,
            memories: memories
        };
        
        const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `quinti_chats_memories_backup_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert(`✅ ${memories.length} chats exportados exitosamente.`);
    },
    
    /**
     * Importa memorias desde un archivo JSON
     * @param {File} file - Archivo JSON a importar
     */
    importMemories(file) {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            try {
                const importData = JSON.parse(event.target.result);
                
                if (!importData.memories || !Array.isArray(importData.memories)) {
                    throw new Error('Formato de archivo inválido');
                }
                
                let importedCount = 0;
                
                for (const memoryData of importData.memories) {
                    // Generar nuevo ID para evitar conflictos
                    const newMemory = this.saveMemory({
                        nombre: memoryData.nombre,
                        imagen: memoryData.imagen,
                        descripcion: memoryData.descripcion,
                        chatData: memoryData.chatData
                    });
                    
                    if (newMemory) {
                        importedCount++;
                    }
                }
                
                this.renderMemoriesPanel();
                alert(`✅ Importación completada.\nImportados: ${importedCount}`);
            } catch (error) {
                console.error('Error al importar:', error);
                alert('❌ Error al importar el archivo. Asegúrate de que sea un backup válido.');
            }
        };
        
        reader.readAsText(file);
    },

    /**
     * Renderiza el historial de memorias en el panel dentro del chat
     * Ahora muestra la memoria contextual específica del chat actual
     */
    renderMemoryHistoryInChat() {
        const contentEl = document.getElementById('memoryHistoryContent');
        if (!contentEl) {
            console.warn('No se encontró el contenedor del historial de memorias en el chat');
            return;
        }

        // Obtener el personaje actual del chat
        const currentCharacter = window.currentChica || null;
        
        if (!currentCharacter) {
            contentEl.innerHTML = `
                <div class="no-memories-history">
                    <p>📭 No hay un chat activo seleccionado.</p>
                </div>
            `;
            return;
        }

        // Obtener memoria contextual específica de este personaje/chat
        const contextualMemory = this.getContextualMemory(currentCharacter.nombre);
        
        if (!contextualMemory) {
            contentEl.innerHTML = `
                <div class="no-memories-history">
                    <p>📝 No hay memoria contextual generada para ${currentCharacter.nombre} aún.</p>
                    <p style="font-size: 13px; color: #A78BFA; margin-top: 8px;">
                        La memoria se genera automáticamente después de varios mensajes.
                    </p>
                </div>
            `;
            return;
        }

        const fecha = new Date(contextualMemory.fechaCreacion).toLocaleString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });

        let html = `
            <div class="memory-contextual-card">
                <div class="memory-contextual-header">
                    <h4>🧠 Memoria Contextual: ${this.escapeHtml(currentCharacter.nombre)}</h4>
                    <span class="memory-contextual-date">${fecha}</span>
                </div>
                
                <div class="memory-contextual-content">
                    <div class="memory-section">
                        <h5>📌 Puntos Clave</h5>
                        <ul class="memory-key-points">
                            ${contextualMemory.puntosClave.map(punto => `<li>${this.escapeHtml(punto)}</li>`).join('')}
                        </ul>
                    </div>
                    
                    ${contextualMemory.resumenChat ? `
                    <div class="memory-section">
                        <h5>📝 Resumen del Chat</h5>
                        <p class="memory-resumen">${this.escapeHtml(contextualMemory.resumenChat)}</p>
                    </div>
                    ` : ''}
                    
                    ${contextualMemory.datosUsuario && Object.keys(contextualMemory.datosUsuario).length > 0 ? `
                    <div class="memory-section">
                        <h5>👤 Datos del Usuario Recordados</h5>
                        <div class="memory-user-data">
                            ${Object.entries(contextualMemory.datosUsuario).map(([key, value]) => `
                                <div class="user-data-item">
                                    <strong>${this.escapeHtml(key)}:</strong> ${this.escapeHtml(value)}
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    ` : ''}
                    
                    <div class="memory-section">
                        <h5>💬 Mensajes Analizados</h5>
                        <p class="memory-stats">Total: ${contextualMemory.mensajesAnalizados || 0} mensajes procesados</p>
                    </div>
                </div>
                
                <div class="memory-contextual-actions">
                    <button class="memory-item-btn delete" onclick="MemorySystem.clearContextualMemory('${currentCharacter.nombre}')">🗑️ Limpiar Memoria</button>
                    <button class="memory-item-btn" onclick="MemorySystem.forceGenerateContextualMemory('${currentCharacter.nombre}')">🔄 Forzar Actualización</button>
                </div>
            </div>
        `;

        contentEl.innerHTML = html;
    },

    /**
     * Obtiene la memoria contextual de un personaje específico
     * @param {string} characterName - Nombre del personaje
     * @returns {Object|null} Memoria contextual o null si no existe
     */
    getContextualMemory(characterName) {
        const key = `quinti_contextual_memory_${characterName}`;
        const stored = localStorage.getItem(key);
        return stored ? JSON.parse(stored) : null;
    },

    /**
     * Guarda/actualiza la memoria contextual de un personaje
     * @param {string} characterName - Nombre del personaje
     * @param {Object} memoryData - Datos de la memoria contextual
     */
    saveContextualMemory(characterName, memoryData) {
        const key = `quinti_contextual_memory_${characterName}`;
        const memory = {
            character: characterName,
            puntosClave: memoryData.puntosClave || [],
            resumenChat: memoryData.resumenChat || '',
            datosUsuario: memoryData.datosUsuario || {},
            mensajesAnalizados: memoryData.mensajesAnalizados || 0,
            fechaCreacion: Date.now(),
            fechaActualizacion: Date.now(),
            version: '1.0'
        };
        
        try {
            localStorage.setItem(key, JSON.stringify(memory));
            console.log(`✅ Memoria contextual guardada para ${characterName}`);
            return memory;
        } catch (error) {
            console.error('Error al guardar memoria contextual:', error);
            return null;
        }
    },

    /**
     * Limpia la memoria contextual de un personaje
     * @param {string} characterName - Nombre del personaje
     */
    clearContextualMemory(characterName) {
        const confirmed = confirm(`¿Estás seguro de limpiar la memoria contextual de ${characterName}?`);
        if (confirmed) {
            const key = `quinti_contextual_memory_${characterName}`;
            localStorage.removeItem(key);
            alert(`✅ Memoria contextual de ${characterName} eliminada`);
            this.renderMemoryHistoryInChat();
        }
    },

    /**
     * Fuerza la generación/actualización de memoria contextual
     * @param {string} characterName - Nombre del personaje
     */
    forceGenerateContextualMemory(characterName) {
        if (typeof window.generarMemoriaContextual === 'function') {
            window.generarMemoriaContextual(characterName);
            alert(`🔄 Actualizando memoria contextual de ${characterName}...`);
            setTimeout(() => this.renderMemoryHistoryInChat(), 2000);
        } else {
            alert('⚠️ La función de generación de memoria no está disponible');
        }
    },

    /**
     * Obtiene los últimos mensajes del chat actual para generar memoria
     * @returns {Array} Últimos mensajes del chat
     */
    getRecentMessages(limit = 20) {
        const messagesDiv = document.getElementById('chatMessages');
        if (!messagesDiv) return [];
        
        const messageElements = messagesDiv.querySelectorAll('.message');
        const messages = [];
        
        for (let i = Math.max(0, messageElements.length - limit); i < messageElements.length; i++) {
            const msgEl = messageElements[i];
            const isUser = msgEl.classList.contains('user-message');
            const textContent = msgEl.textContent.trim();
            
            messages.push({
                role: isUser ? 'user' : 'assistant',
                content: textContent
            });
        }
        
        return messages;
    }
};

// Hacer el sistema accesible globalmente
window.MemorySystem = MemorySystem;

// Auto-inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => MemorySystem.init());
} else {
    MemorySystem.init();
}
