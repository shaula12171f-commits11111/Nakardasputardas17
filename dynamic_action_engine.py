import os
import re
import time

class DynamicActionEngine:
    def __init__(self, image_folder):
        self.image_folder = image_folder
        self.available_images = []
        self.current_state = None
        self.load_images()

    def load_images(self):
        """Carga imágenes y extrae acciones dinámicamente de los nombres."""
        if not os.path.exists(self.image_folder):
            print(f"La carpeta {self.image_folder} no existe.")
            return

        files = [f for f in os.listdir(self.image_folder) if f.endswith(('.png', '.jpg', '.jpeg'))]
        
        # Estructura para almacenar imágenes agrupadas por "acción" inferida
        # Ejemplo: "person_running_01.png" -> acción: "running", estado: "01"
        self.available_images = []
        
        for f in files:
            # Limpiar extensión
            name_base = os.path.splitext(f)[0]
            # Intentar parsear nombre: asumimos formato accion_estado o similar
            # Esto es dinámico: lo que esté en el nombre define la acción
            parts = name_base.split('_')
            action_type = parts[0] if parts else "unknown"
            
            self.available_images.append({
                "filename": f,
                "full_name": name_base,
                "inferred_action": action_type,
                "tags": parts[1:] if len(parts) > 1 else []
            })
        
        print(f"[Sistema] Cargadas {len(self.available_images)} imágenes disponibles para acciones dinámicas.")

    def find_best_match(self, context_intent, current_image_name):
        """
        Busca la mejor imagen basada en la intención del contexto.
        No hay acciones fijas, solo coincidencia de patrones en nombres.
        """
        candidates = []
        
        for img in self.available_images:
            score = 0
            # Lógica simple de coincidencia dinámica
            if context_intent.lower() in img['full_name'].lower():
                score += 10
            if context_intent.lower() in img['inferred_action'].lower():
                score += 5
            
            # Evitar recomendar la misma imagen si ya estamos en ella
            if img['filename'] == current_image_name:
                score -= 100 
            
            if score > 0:
                candidates.append((score, img))
        
        if candidates:
            # Ordenar por puntaje y devolver la mejor
            candidates.sort(key=lambda x: x[0], reverse=True)
            return candidates[0][1]
        
        return None

    def run_interaction_loop(self, initial_context):
        """
        Bucle principal de iteración y confirmación.
        """
        current_image = None
        context = initial_context
        is_active = True

        print("\n--- Iniciando Bucle Dinámico ---")
        print(f"Contexto inicial: '{context}'")

        while is_active:
            # 1. Analizar contexto actual para encontrar imagen candidata
            candidate = self.find_best_match(context, current_image['filename'] if current_image else None)
            
            action_required = False
            next_image = current_image

            # 2. Decisión: ¿Cambiar imagen?
            if candidate and current_image != candidate:
                print(f"\n[Análisis] El contexto '{context}' sugiere cambiar a: '{candidate['filename']}'")
                print(f"   Acción inferida del nombre: {candidate['inferred_action']}")
                
                # Iteración de confirmación
                while True:
                    user_confirm = input("¿Desea aplicar este cambio de imagen? (s/n/revisar): ").lower()
                    if user_confirm in ['s', 'si', 'yes']:
                        next_image = candidate
                        action_required = True
                        print(f"[Acción] Imagen cambiada a: {next_image['filename']}")
                        break
                    elif user_confirm in ['n', 'no']:
                        print("[Acción] Se mantiene la imagen actual.")
                        next_image = current_image
                        break
                    elif user_confirm == 'revisar':
                        print(f"   Detalles candidato: {candidate}")
                    else:
                        print("Entrada no válida, use 's', 'n' o 'revisar'.")
            
            elif not candidate:
                print(f"\n[Análisis] No se encontró una imagen que coincida claramente con '{context}'.")
                keep_current = input("¿Mantener la acción/imagen actual? (s/n): ").lower()
                if keep_current != 's':
                    new_intent = input("Ingrese una nueva palabra clave para buscar en los nombres de archivo: ")
                    context = new_intent
                    continue # Reiniciar loop con nuevo contexto
                next_image = current_image

            # 3. Decisión: ¿Continuar la acción?
            if next_image:
                print(f"\n[Estado] Imagen actual: {next_image['filename']}")
                continue_action = input("¿Seguimos haciendo esta acción? (s/n/cambiar_contexto): ").lower()
                
                if continue_action in ['s', 'si', 'yes']:
                    # Simular continuidad
                    print("...continuando acción...")
                    time.sleep(1) 
                    # El contexto podría evolucionar aquí automáticamente si fuera un juego real
                elif continue_action == 'n':
                    print("[Sistema] Deteniendo acción.")
                    is_active = False
                elif continue_action == 'cambiar_contexto':
                    new_context = input("Ingrese el nuevo contexto o intención: ")
                    context = new_context
                    # No cambiamos is_active, el loop continúa con nuevo contexto
                else:
                    print("Entrada no reconocida, asumiendo continuación.")
            
            current_image = next_image

# Configuración de ejemplo
# Nota: En un caso real, esto leería de una carpeta real.
# Creamos una carpeta temporal simulada para la demostración si no existe.
demo_folder = "./dynamic_assets"
if not os.path.exists(demo_folder):
    os.makedirs(demo_folder)
    # Crear archivos dummy para probar la lógica dinámica
    dummy_files = [
        "idle_01.png", "idle_02.png",
        "run_forward_01.png", "run_forward_02.png",
        "jump_high_01.png",
        "attack_sword_01.png", "attack_sword_02.png",
        "death_01.png"
    ]
    for f in dummy_files:
        open(os.path.join(demo_folder, f), 'w').close()

if __name__ == "__main__":
    engine = DynamicActionEngine(demo_folder)
    
    # Iniciar con un contexto
    start_context = "run" 
    engine.run_interaction_loop(start_context)
