// ============================================================
//  SISTEMA DE CUESTIONARIO INTERACTIVO (DRAG & DROP)
// ============================================================

let elementoArrastrado = null;
let contenedorOriginal = null;

// Inicializar eventos al cargar el documento
document.addEventListener('DOMContentLoaded', () => {
    inicializarEventosPreguntas();
    inicializarEventosRespuestas();
    crearBotonReiniciar();
});

// --- Configuración de las Preguntas Arrastrables ---
function inicializarEventosPreguntas() {
    document.querySelectorAll('.pregunta').forEach(pregunta => {
        // Guardar el bloque contenedor original antes de moverla
        if (!pregunta.dataset.bloqueOriginal) {
            pregunta.dataset.bloqueOriginal = pregunta.closest('.bloque').id || '';
            // Asignamos IDs automáticos a los bloques para rastrearlos
            const bloque = pregunta.closest('.bloque');
            const index = Array.from(document.querySelectorAll('.bloque')).indexOf(bloque);
            bloque.id = `bloque-${index}`;
            pregunta.dataset.bloqueOriginal = `bloque-${index}`;
        }

        pregunta.addEventListener('dragstart', (e) => {
            elementoArrastrado = pregunta;
            contenedorOriginal = pregunta.parentElement;
            pregunta.classList.add('arrastrando');
            e.dataTransfer.effectAllowed = 'move';
        });

        pregunta.addEventListener('dragend', () => {
            pregunta.classList.remove('arrastrando');
        });
    });
}

// --- Configuración de las Zonas de Destino (Respuestas y Bloques) ---
function inicializarEventosRespuestas() {
    // 1. Gestionar las casillas de respuestas posibles
    document.querySelectorAll('.respuesta').forEach(casilla => {
        casilla.addEventListener('dragover', (e) => {
            e.preventDefault();
            // Solo permitir soltar si la casilla está vacía
            if (!casilla.querySelector('.pregunta')) {
                casilla.classList.add('over');
            }
        });

        casilla.addEventListener('dragleave', () => {
            casilla.classList.remove('over');
        });

        casilla.addEventListener('drop', (e) => {
            e.preventDefault();
            casilla.classList.remove('over');
            
            if (!casilla.querySelector('.pregunta') && elementoArrastrado) {
                casilla.appendChild(elementoArrastrado);
            }
        });
    });

    // 2. Permitir devolver la pregunta a su bloque original si el alumno cambia de opinión
    document.querySelectorAll('.bloque').forEach(bloque => {
        bloque.addEventListener('dragover', (e) => {
            e.preventDefault();
        });

        bloque.addEventListener('drop', (e) => {
            e.preventDefault();
            // Validar que la pregunta pertenezca a este bloque específico y que no esté ya ahí
            if (elementoArrastrado && elementoArrastrado.dataset.bloqueOriginal === bloque.id) {
                const preguntaExistente = bloque.querySelector('.pregunta');
                if (!preguntaExistente) {
                    bloque.insertBefore(elementoArrastrado, bloque.querySelector('.respuestas-grupo'));
                }
            }
        });
    });
}

// --- Sistema de Calificación ---
function calcularNota() {
    let nota = 0;
    const casillasRespondidas = document.querySelectorAll('.respuesta');
    const bloquesTotales = document.querySelectorAll('.bloque').length;

    casillasRespondidas.forEach(casilla => {
        const pieza = casilla.querySelector('.pregunta');
        
        // Validar si la respuesta es la correcta según la pregunta arrastrada
        if (pieza && pieza.dataset.respuesta === casilla.dataset.correcta) {
            nota++;
            casilla.style.borderColor = "#2E7D32"; // Borde verde para aciertos visuales opcionales
        } else if (pieza) {
            casilla.style.borderColor = "#D32F2F"; // Borde rojo para errores
        }
    });

    // Mostrar resultado animado
    const resultadoDiv = document.getElementById('resultado');
    resultadoDiv.textContent = `🎯 Tu nota es: ${nota} / ${bloquesTotales}`;
    resultadoDiv.style.display = "block";
    
    // Mostrar botón de reinicio
    const btnReiniciar = document.getElementById('btn-reiniciar');
    if (btnReiniciar) btnReiniciar.style.display = "inline-flex";
}

// --- Utilidades: Reinicio del Juego ---
function crearBotonReiniciar() {
    const zonaAccion = document.querySelector('.action-zone');
    if (!zonaAccion) return;

    const btn = document.createElement('button');
    btn.id = 'btn-reiniciar';
    btn.className = 'notebook-btn';
    btn.textContent = '🔄 Intentar de nuevo';
    btn.style.backgroundColor = '#323330';
    btn.style.color = '#F7DF1E';
    btn.style.display = 'none'; // Oculto hasta que terminen el test
    btn.onclick = reiniciarCuestionario;

    zonaAccion.appendChild(btn);
}

function reiniciarCuestionario() {
    // Regresar cada pregunta a su bloque correspondiente
    document.querySelectorAll('.pregunta').forEach(pregunta => {
        const idBloque = pregunta.dataset.bloqueOriginal;
        const bloqueDestino = document.getElementById(idBloque);
        if (bloqueDestino) {
            bloqueDestino.insertBefore(pregunta, bloqueDestino.querySelector('.respuestas-grupo'));
        }
    });

    // Limpiar estilos de las casillas de respuestas
    document.querySelectorAll('.respuesta').forEach(casilla => {
        casilla.style.borderColor = '';
    });

    // Ocultar textos de calificación y el propio botón
    document.getElementById('resultado').textContent = '';
    document.getElementById('resultado').style.display = 'none';
    document.getElementById('btn-reiniciar').style.display = 'none';
}