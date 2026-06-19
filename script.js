CKEDITOR.config.versionCheck = false;
CKEDITOR.replace('editor', {
    removePlugins: 'exportpdf,cloudservices,easyimage',
    height: 340
});

// ============================================================
//  SISTEMA DE TOASTS
// ============================================================
function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    const contenedor = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    contenedor.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-saliendo');
        toast.addEventListener('animationend', () => toast.remove());
    }, duracion);
}

// ============================================================
//  AUTOGUARDADO
// ============================================================
let autoguardadoTimer = null;
let ultimoContenidoAutoguardado = '';
let ultimoTituloAutoguardado = '';

function iniciarAutoguardado() {
    CKEDITOR.instances.editor.on('change', programarAutoguardado);
    CKEDITOR.instances.editor.on('key',    programarAutoguardado);
    document.getElementById('titulo').addEventListener('input', programarAutoguardado);
}

function programarAutoguardado() {
    clearTimeout(autoguardadoTimer);
    actualizarIndicador('esperando');
    autoguardadoTimer = setTimeout(ejecutarAutoguardado, 30000);
}

function ejecutarAutoguardado() {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();
    if (!titulo || !contenido) return;
    if (titulo === ultimoTituloAutoguardado && contenido === ultimoContenidoAutoguardado) return;
    try {
        localStorage.setItem('nota__' + titulo, contenido);
        ultimoTituloAutoguardado    = titulo;
        ultimoContenidoAutoguardado = contenido;
        actualizarIndicador('guardado');
        mostrarToast('💾 Autoguardado: "' + titulo + '"', 'exito', 2000);
    } catch(e) {
        actualizarIndicador('error');
        mostrarToast('⚠️ Autoguardado falló. Almacenamiento lleno.', 'error');
    }
}

function actualizarIndicador(estado) {
    const indicador = document.getElementById('indicador-autoguardado');
    if (!indicador) return;
    const estados = {
        inactivo:  { texto: '',                           clase: '' },
        esperando: { texto: '○ Cambios sin guardar',      clase: 'ag-esperando' },
        guardado:  { texto: '✓ Guardado automáticamente', clase: 'ag-guardado' },
        error:     { texto: '✕ Error al autoguardar',     clase: 'ag-error' },
    };
    const { texto, clase } = estados[estado] || estados.inactivo;
    indicador.textContent = texto;
    indicador.className   = 'indicador-autoguardado ' + clase;
}

window.addEventListener('beforeunload', (e) => {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();
    const hayContenido  = titulo && contenido;
    const hayPendiente  = contenido !== ultimoContenidoAutoguardado || titulo !== ultimoTituloAutoguardado;
    if (hayContenido && hayPendiente) {
        e.preventDefault();
        e.returnValue = '';
    }
});

CKEDITOR.instances.editor.on('instanceReady', iniciarAutoguardado);

// ============================================================
//  GUARDAR NOTA
// ============================================================
function guardarNota() {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();
    if (!titulo)    { mostrarToast('⚠️ Escribe un título primero.', 'error'); return; }
    if (!contenido) { mostrarToast('⚠️ El editor está vacío.',      'error'); return; }
    try {
        localStorage.setItem('nota__' + titulo, contenido);
        ultimoTituloAutoguardado    = titulo;
        ultimoContenidoAutoguardado = contenido;
        clearTimeout(autoguardadoTimer);
        actualizarIndicador('guardado');
        mostrarToast(`💾 "${titulo}" guardada correctamente.`, 'exito');
    } catch(e) {
        mostrarToast('❌ Error al guardar. Almacenamiento lleno.', 'error');
    }
}

// ============================================================
//  CARGAR NOTA
// ============================================================
function cargarNota() {
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) { abrirModalNotas(); return; }
    const contenido = localStorage.getItem('nota__' + titulo);
    if (contenido) {
        CKEDITOR.instances.editor.setData(contenido);
        ultimoTituloAutoguardado    = titulo;
        ultimoContenidoAutoguardado = contenido;
        clearTimeout(autoguardadoTimer);
        actualizarIndicador('guardado');
        mostrarToast(`📂 "${titulo}" cargada.`, 'exito');
    } else {
        mostrarToast(`❌ No existe ninguna nota llamada "${titulo}".`, 'error');
    }
}

// ============================================================
//  ELIMINAR NOTA
// ============================================================
function eliminarNota() {
    const titulo = document.getElementById('titulo').value.trim();
    if (!titulo) { mostrarToast('⚠️ Escribe el título a borrar.', 'error'); return; }
    const clave = 'nota__' + titulo;
    if (!localStorage.getItem(clave)) {
        mostrarToast(`❌ No existe una nota llamada "${titulo}".`, 'error');
        return;
    }
    mostrarConfirmacion(
        `¿Eliminar la nota "${titulo}"?`,
        'Esta acción no se puede deshacer.',
        () => {
            localStorage.removeItem(clave);
            CKEDITOR.instances.editor.setData('');
            ultimoContenidoAutoguardado = '';
            ultimoTituloAutoguardado    = '';
            clearTimeout(autoguardadoTimer);
            actualizarIndicador('inactivo');
            mostrarToast(`🗑 "${titulo}" eliminada.`, 'info');
        }
    );
}

// ============================================================
//  DIÁLOGO DE CONFIRMACIÓN
// ============================================================
function mostrarConfirmacion(titulo, subtexto, onConfirmar) {
    document.getElementById('dialogo-confirmacion')?.remove();
    const overlay = document.createElement('div');
    overlay.id        = 'dialogo-confirmacion';
    overlay.className = 'dialogo-overlay';
    overlay.innerHTML = `
        <div class="dialogo-box">
            <p class="dialogo-titulo">${titulo}</p>
            <p class="dialogo-sub">${subtexto}</p>
            <div class="dialogo-acciones">
                <button class="dialogo-cancelar"  id="dialogo-btn-cancelar">Cancelar</button>
                <button class="dialogo-confirmar" id="dialogo-btn-confirmar">Eliminar</button>
            </div>
        </div>`;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add('visible'));
    const cerrar = () => {
        overlay.classList.remove('visible');
        overlay.addEventListener('transitionend', () => overlay.remove(), { once: true });
    };
    document.getElementById('dialogo-btn-cancelar').onclick  = cerrar;
    document.getElementById('dialogo-btn-confirmar').onclick = () => { cerrar(); onConfirmar(); };
    overlay.addEventListener('click', (e) => { if (e.target === overlay) cerrar(); });
}

// ============================================================
//  MODAL LISTA DE NOTAS
// ============================================================
function abrirModalNotas() {
    const contenedor = document.getElementById('lista-notas-contenido');
    contenedor.innerHTML = '';
    const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
    if (claves.length === 0) {
        contenedor.innerHTML = '<p class="modal-vacio">No hay notas guardadas todavía.</p>';
    } else {
        claves.forEach(clave => {
            const tituloReal = clave.replace('nota__', '');
            const item = document.createElement('div');
            item.className = 'nota-item';
            item.innerHTML = `
                <span onclick="cargarDesdeModal('${tituloReal}')">📄 ${tituloReal}</span>
                <button class="nota-borrar" onclick="borrarDesdeModal('${tituloReal}', this.parentElement)">🗑</button>`;
            contenedor.appendChild(item);
        });
    }
    document.getElementById('modal-notas').classList.add('abierto');
}

function cargarDesdeModal(titulo) {
    document.getElementById('titulo').value = titulo;
    const contenido = localStorage.getItem('nota__' + titulo);
    if (contenido) {
        CKEDITOR.instances.editor.setData(contenido);
        ultimoTituloAutoguardado    = titulo;
        ultimoContenidoAutoguardado = contenido;
        clearTimeout(autoguardadoTimer);
        actualizarIndicador('guardado');
        mostrarToast(`📂 "${titulo}" cargada.`, 'exito');
    }
    cerrarModalNotas();
}

function borrarDesdeModal(titulo, elemento) {
    localStorage.removeItem('nota__' + titulo);
    elemento.remove();
    mostrarToast(`🗑 "${titulo}" eliminada.`, 'info');
    const lista = document.getElementById('lista-notas-contenido');
    if (lista.children.length === 0)
        lista.innerHTML = '<p class="modal-vacio">No hay notas guardadas todavía.</p>';
}

function cerrarModalNotas()       { document.getElementById('modal-notas').classList.remove('abierto'); }
function cerrarModalSiFondo(e)    { if (e.target === document.getElementById('modal-notas')) cerrarModalNotas(); }

// ============================================================
//  UTILIDADES PDF
// ============================================================
function sanitizarNombreArchivo(nombre) {
    return nombre
        .replace(/[\/\\:*?"<>|]/g, '_')
        .replace(/[\x00-\x1f\x7f]/g, '')
        .replace(/^\.+/, '')
        .trim() || 'Sin_Titulo';
}

async function convertirImagenesABase64(elemento) {
    const imgs = elemento.querySelectorAll('img');
    const promesas = Array.from(imgs).map(img => new Promise(resolve => {
        if (!img.src || img.src.startsWith('data:')) { resolve(); return; }
        const canvas  = document.createElement('canvas');
        const ctx     = canvas.getContext('2d');
        const imagen  = new Image();
        imagen.crossOrigin = 'anonymous';
        imagen.onload = () => {
            canvas.width  = imagen.naturalWidth;
            canvas.height = imagen.naturalHeight;
            ctx.drawImage(imagen, 0, 0);
            try { img.src = canvas.toDataURL('image/png'); } catch (_) {}
            resolve();
        };
        imagen.onerror = resolve;
        imagen.src = img.src;
    }));
    await Promise.all(promesas);
}

// ============================================================
//  BARRA DE PROGRESO FLOTANTE — TEMA OSCURO DORADO
// ============================================================
function mostrarProgresoPDF(porcentaje, mensaje) {
    let c = document.getElementById('pdf-progreso');
    if (!c) {
        c = document.createElement('div');
        c.id = 'pdf-progreso';
        c.setAttribute('role', 'status');
        c.setAttribute('aria-live', 'polite');
        c.style.cssText = `
            position:fixed; bottom:1.5rem; right:1.5rem; width:270px;
            background:#1c1915; border:1px solid #4a3e28; border-radius:10px;
            padding:14px 16px; box-shadow:0 8px 32px rgba(0,0,0,.75),0 0 20px rgba(200,153,26,.12);
            font-family:'DM Sans',system-ui,sans-serif; z-index:9999; transition:opacity .4s;`;
        c.innerHTML = `
            <p id="pdf-prog-msg"   style="margin:0 0 8px;font-size:12px;color:#c8b98a;letter-spacing:.03em;"></p>
            <div style="background:#0e0c0a;border:1px solid #2e2618;border-radius:6px;height:7px;overflow:hidden;">
                <div id="pdf-prog-barra"
                     style="height:100%;width:0%;background:linear-gradient(90deg,#7a5a0a,#c8991a);
                            border-radius:6px;transition:width .35s ease;box-shadow:0 0 8px rgba(200,153,26,.5);"></div>
            </div>
            <p id="pdf-prog-pct"
               style="margin:6px 0 0;font-size:10px;color:#7a6a50;text-align:right;font-family:'Courier New',monospace;"></p>`;
        document.body.appendChild(c);
    }
    document.getElementById('pdf-prog-msg').textContent   = mensaje;
    document.getElementById('pdf-prog-barra').style.width = porcentaje + '%';
    document.getElementById('pdf-prog-pct').textContent   = porcentaje + '%';
}

function ocultarProgresoPDF() {
    const c = document.getElementById('pdf-progreso');
    if (!c) return;
    c.style.opacity = '0';
    setTimeout(() => c.remove(), 450);
}

// ============================================================
//  PORTADA DECORATIVA — PALETA ACADEMIA OSCURA & DORADO
// ============================================================
function agregarPortada(doc, titulo) {
    doc.insertPage(1);
    doc.setPage(1);
    const { width, height } = doc.internal.pageSize;

    // Fondo base: casi negro cálido
    doc.setFillColor(18, 16, 14);
    doc.rect(0, 0, width, height, 'F');

    // Textura de líneas horizontales sutiles (simula papel rayado)
    doc.setDrawColor(30, 26, 18);
    doc.setLineWidth(0.3);
    for (let y = 60; y < height - 60; y += 14) {
        doc.line(0, y, width, y);
    }

    // Franjas doradas superior e inferior
    doc.setFillColor(122, 90, 10);
    doc.rect(0, 0, width, 10, 'F');
    doc.rect(0, height - 10, width, 10, 'F');

    // Borde interior dorado fino
    doc.setDrawColor(168, 124, 16);
    doc.setLineWidth(0.8);
    doc.rect(22, 22, width - 44, height - 44, 'S');

    // Esquineros decorativos
    const esq = 14;
    doc.setDrawColor(200, 153, 26);
    doc.setLineWidth(1.4);
    // Esquina superior izquierda
    doc.line(22, 22, 22 + esq, 22);
    doc.line(22, 22, 22, 22 + esq);
    // Esquina superior derecha
    doc.line(width - 22, 22, width - 22 - esq, 22);
    doc.line(width - 22, 22, width - 22, 22 + esq);
    // Esquina inferior izquierda
    doc.line(22, height - 22, 22 + esq, height - 22);
    doc.line(22, height - 22, 22, height - 22 - esq);
    // Esquina inferior derecha
    doc.line(width - 22, height - 22, width - 22 - esq, height - 22);
    doc.line(width - 22, height - 22, width - 22, height - 22 - esq);

    // Líneas divisorias horizontales del centro
    doc.setDrawColor(74, 62, 40);
    doc.setLineWidth(0.5);
    doc.line(60, height / 2 - 52, width - 60, height / 2 - 52);
    doc.line(60, height / 2 + 38, width - 60, height / 2 + 38);

    // Etiqueta "INFRAMEN" pequeña arriba
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(122, 90, 10);
    doc.text('INSTITUTO NACIONAL "GENERAL FRANCISCO MENÉNDEZ"', width / 2, height / 2 - 66, { align: 'center' });

    // Título principal
    doc.setFont('times', 'bold');
    doc.setFontSize(26);
    doc.setTextColor(200, 153, 26);
    const lineas = doc.splitTextToSize(titulo, width - 120);
    doc.text(lineas, width / 2, height / 2 - 14, { align: 'center', baseline: 'middle' });

    // Línea decorativa entre título y fecha
    doc.setDrawColor(122, 90, 10);
    doc.setLineWidth(0.4);
    doc.line(width / 2 - 50, height / 2 + 22, width / 2 + 50, height / 2 + 22);

    // Fecha
    const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont('times', 'italic');
    doc.setFontSize(11);
    doc.setTextColor(168, 124, 16);
    doc.text(fecha, width / 2, height / 2 + 52, { align: 'center' });

    // Pie de portada
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(74, 62, 40);
    doc.text('Cuaderno Digital · INFRAMEN', width / 2, height - 30, { align: 'center' });
}

function agregarMetadata(doc, titulo) {
    doc.setProperties({
        title:   titulo,
        subject: 'Nota exportada desde el editor',
        author:  'Cuaderno Digital INFRAMEN',
        keywords:'nota, editor, exportación, INFRAMEN',
        creator: 'Cuaderno Digital v2.0',
    });
}

function agregarPieDePagina(doc, nombreArchivo) {
    const total = doc.getNumberOfPages();
    const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        const { width, height } = doc.internal.pageSize;

        // Franja inferior oscura
        doc.setFillColor(18, 16, 14);
        doc.rect(0, height - 28, width, 28, 'F');

        // Línea dorada sobre la franja
        doc.setDrawColor(74, 62, 40);
        doc.setLineWidth(0.5);
        doc.line(30, height - 28, width - 30, height - 28);

        doc.setTextColor(122, 90, 10);
        doc.text(nombreArchivo,          30,         height - 13);
        doc.text(fecha,                  width / 2,  height - 13, { align: 'center' });
        doc.text(`Pág. ${i} / ${total}`, width - 30, height - 13, { align: 'right' });
    }
}

// ============================================================
//  VISTA PREVIA ANTES DE DESCARGAR — TEMA OSCURO DORADO
// ============================================================
function mostrarVistaPreviaPDF(pdfBlob, nombreArchivo, onDescargar) {
    document.getElementById('pdf-preview-overlay')?.remove();
    const url = URL.createObjectURL(pdfBlob);

    const overlay = document.createElement('div');
    overlay.id = 'pdf-preview-overlay';
    overlay.style.cssText = `
        position:fixed; inset:0; background:rgba(8,6,4,.82);
        z-index:10000; display:flex; align-items:center;
        justify-content:center; animation:fadeInOv .25s ease;
        backdrop-filter:blur(5px);`;

    overlay.innerHTML = `
        <style>
            @keyframes fadeInOv { from{opacity:0} to{opacity:1} }
            #ppbox {
                background:#1c1915; border:1px solid #4a3e28; border-radius:14px;
                width:min(820px,96vw); height:min(680px,90vh);
                display:flex; flex-direction:column; overflow:hidden;
                box-shadow:0 20px 60px rgba(0,0,0,.8),0 0 40px rgba(200,153,26,.1);
                position:relative;
            }
            #ppbox::before {
                content:''; position:absolute; top:0; left:0; right:0; height:3px;
                border-radius:14px 14px 0 0;
                background:linear-gradient(90deg,transparent,#c8991a,transparent);
            }
            #pphead {
                display:flex; align-items:center; justify-content:space-between;
                padding:12px 18px; background:#12100e;
                color:#c8b98a; font-family:'DM Sans',system-ui,sans-serif; font-size:13px;
                border-bottom:1px solid #2e2618;
            }
            #pphead strong { color:#c8991a; font-family:'Playfair Display',Georgia,serif; }
            #pphead button {
                background:none; border:none; cursor:pointer; color:#7a6a50;
                font-size:20px; line-height:1; padding:0 4px;
                border-radius:4px; transition:color .15s,background .15s;
            }
            #pphead button:hover { color:#f0e4c0; background:rgba(200,153,26,.15); }
            #ppfoot {
                display:flex; gap:10px; padding:12px 18px;
                background:#12100e; border-top:1px solid #2e2618;
                justify-content:flex-end;
            }
            .ppbtn {
                font-family:'DM Sans',system-ui,sans-serif; font-size:12px; font-weight:600;
                padding:8px 20px; border-radius:5px; cursor:pointer;
                transition:background .15s,transform .1s; letter-spacing:.03em;
            }
            .ppbtn:active { transform:scale(.97); }
            .ppbtn-ok  { background:#a87c10; color:#0e0c0a; border:1px solid #c8991a; }
            .ppbtn-ok:hover { background:#c8991a; }
            .ppbtn-no  { background:#2a2520; color:#c8b98a; border:1px solid #4a3e28; }
            .ppbtn-no:hover { background:#3a3025; color:#f0e4c0; }
        </style>
        <div id="ppbox">
            <div id="pphead">
                <span>📄 Vista previa — <strong>${nombreArchivo}</strong></span>
                <button id="pp-x" title="Cerrar">&times;</button>
            </div>
            <iframe src="${url}#toolbar=0"
                    style="flex:1;border:none;width:100%;background:#12100e;"></iframe>
            <div id="ppfoot">
                <button class="ppbtn ppbtn-no" id="pp-cancel">Cancelar</button>
                <button class="ppbtn ppbtn-ok" id="pp-dl">⬇ Descargar PDF</button>
            </div>
        </div>`;

    document.body.appendChild(overlay);

    const cerrar = () => {
        overlay.style.opacity = '0';
        overlay.style.transition = 'opacity .2s';
        setTimeout(() => { URL.revokeObjectURL(url); overlay.remove(); }, 220);
    };
    document.getElementById('pp-x').onclick      = cerrar;
    document.getElementById('pp-cancel').onclick = cerrar;
    document.getElementById('pp-dl').onclick     = () => { cerrar(); onDescargar(); };
    overlay.addEventListener('click', e => { if (e.target === overlay) cerrar(); });
}

// ============================================================
//  GENERAR PDF — con estilos del tema INFRAMEN
// ============================================================
const generarPDF = async () => {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();

    if (!titulo)    { mostrarToast('⚠️ Escribe un título primero.', 'error'); return; }
    if (!contenido) { mostrarToast('⚠️ El editor está vacío.',      'error'); return; }

    const nombreArchivo = sanitizarNombreArchivo(titulo);

    try {
        const { jsPDF } = window.jspdf;

        mostrarProgresoPDF(10, 'Preparando contenido…');

        const A4_W = 595, A4_H = 842;
        const MX = 45, MT = 50, MB = 62;
        const AREA_W = A4_W - MX * 2;
        const AREA_H = A4_H - MT - MB;

        // Contenedor con estilo academia oscura & dorado
        const el = document.createElement('div');
        el.innerHTML =
            `<div style="
                background:#12100e;
                padding:28px 32px 12px;
                border-bottom:2px solid #4a3e28;
                margin:-0px -0px 24px;
             ">
                <div style="
                    font-family:Georgia,serif;
                    font-size:7px;
                    letter-spacing:.12em;
                    color:#7a5a0a;
                    text-transform:uppercase;
                    margin-bottom:6px;
                ">INFRAMEN — Cuaderno Digital</div>
                <h1 style="
                    font-family:Georgia,serif;
                    font-size:22px;
                    color:#c8991a;
                    margin:0;
                    font-weight:bold;
                    line-height:1.3;
                ">${titulo}</h1>
             </div>` +
            contenido;

        el.style.cssText = [
            `width:${AREA_W}px`,
            'padding:0',
            'font-family:Georgia,serif',
            'font-size:13px',
            'line-height:1.75',
            'color:#c8b98a',          // texto dorado claro
            'background:#12100e',     // fondo casi negro
            'box-sizing:border-box',
            'position:absolute',
            'left:-9999px',
            'top:0'
        ].join(';');

        // Estilos internos para que el contenido HTML del editor se vea coherente
        const styleTag = document.createElement('style');
        styleTag.textContent = `
            h1,h2,h3,h4,h5,h6 {
                font-family:Georgia,serif;
                color:#c8991a;
                margin:.8em 0 .4em;
            }
            p  { margin-bottom:.6em; }
            a  { color:#a87c10; }
            strong, b { color:#f0e4c0; }
            em, i { color:#c8b98a; }
            code, pre {
                font-family:'Courier New',monospace;
                background:#1c1915;
                color:#c8991a;
                padding:.15em .4em;
                border-radius:3px;
                font-size:.9em;
            }
            pre  { padding:.7em 1em; white-space:pre-wrap; }
            blockquote {
                border-left:3px solid #4a3e28;
                padding-left:1em;
                color:#7a6a50;
                margin:.8em 0;
            }
            table {
                border-collapse:collapse;
                width:100%;
                margin:.8em 0;
                font-size:.88em;
            }
            th {
                background:#2a2520;
                color:#c8991a;
                border:1px solid #4a3e28;
                padding:.4em .7em;
                text-align:left;
            }
            td {
                border:1px solid #2e2618;
                padding:.35em .7em;
                color:#c8b98a;
            }
            tr:nth-child(even) td { background:#1c1915; }
            ul, ol { padding-left:1.4em; margin-bottom:.6em; }
            li     { margin-bottom:.25em; }
            hr     { border:none; border-top:1px solid #2e2618; margin:1em 0; }
        `;
        el.appendChild(styleTag);
        document.body.appendChild(el);

        mostrarProgresoPDF(25, 'Procesando imágenes…');
        await convertirImagenesABase64(el);

        mostrarProgresoPDF(45, 'Capturando contenido…');

        const canvas = await html2canvas(el, {
            scale:           2,
            useCORS:         true,
            logging:         false,
            backgroundColor: '#12100e',
            width:           AREA_W,
            windowWidth:     AREA_W,
        });

        mostrarProgresoPDF(65, 'Paginando…');

        const escala      = canvas.width / AREA_W;
        const alturaPagPx = AREA_H * escala;

        const cortesNaturales = [0];
        const elRect = el.getBoundingClientRect();
        const bloques = el.querySelectorAll('p, h1, h2, h3, h4, h5, h6, li, tr, div, img');
        bloques.forEach(bloque => {
            const rect = bloque.getBoundingClientRect();
            const yRelativo = (rect.top - elRect.top) * escala;
            if (yRelativo > 0) cortesNaturales.push(Math.round(yRelativo));
        });
        cortesNaturales.push(canvas.height);

        document.body.removeChild(el);

        const cortesPagina = [0];
        let paginaActual = 1;
        while (true) {
            const idealY = paginaActual * alturaPagPx;
            if (idealY >= canvas.height) break;
            let mejorCorte = idealY;
            for (let j = cortesNaturales.length - 1; j >= 0; j--) {
                if (cortesNaturales[j] <= idealY) { mejorCorte = cortesNaturales[j]; break; }
            }
            if (idealY - mejorCorte > alturaPagPx * 0.20) mejorCorte = idealY;
            cortesPagina.push(Math.round(mejorCorte));
            paginaActual++;
        }
        cortesPagina.push(canvas.height);

        const doc = new jsPDF('p', 'pt', 'a4');
        agregarMetadata(doc, titulo);

        for (let i = 0; i < cortesPagina.length - 1; i++) {
            if (i > 0) doc.addPage();

            // Fondo de página oscuro
            doc.setFillColor(18, 16, 14);
            doc.rect(0, 0, A4_W, A4_H, 'F');

            // Franja dorada superior de página
            doc.setFillColor(42, 37, 32);
            doc.rect(0, 0, A4_W, MT, 'F');
            doc.setDrawColor(74, 62, 40);
            doc.setLineWidth(0.5);
            doc.line(30, MT, A4_W - 30, MT);

            const srcY = cortesPagina[i];
            const srcH = cortesPagina[i + 1] - srcY;
            if (srcH <= 0) continue;

            const trozo = document.createElement('canvas');
            trozo.width  = canvas.width;
            trozo.height = Math.ceil(alturaPagPx);
            const ctx = trozo.getContext('2d');
            ctx.fillStyle = '#12100e';
            ctx.fillRect(0, 0, trozo.width, trozo.height);
            ctx.drawImage(canvas, 0, srcY, canvas.width, srcH, 0, 0, canvas.width, srcH);
            const imgData = trozo.toDataURL('image/jpeg', 0.93);
            doc.addImage(imgData, 'JPEG', MX, MT, AREA_W, AREA_H);
        }

        mostrarProgresoPDF(78, 'Añadiendo portada…');
        agregarPortada(doc, titulo);

        mostrarProgresoPDF(90, 'Añadiendo pies de página…');
        agregarPieDePagina(doc, nombreArchivo);

        mostrarProgresoPDF(98, 'Preparando vista previa…');
        const blob = doc.output('blob');
        ocultarProgresoPDF();

        const descargar = () => {
            doc.save(`${nombreArchivo}.pdf`);
            mostrarToast(`📄 "${nombreArchivo}.pdf" descargado.`, 'exito');
            ultimoTituloAutoguardado    = titulo;
            ultimoContenidoAutoguardado = contenido;
            clearTimeout(autoguardadoTimer);
            actualizarIndicador('guardado');
        };

        mostrarVistaPreviaPDF(blob, `${nombreArchivo}.pdf`, descargar);

    } catch (err) {
        ocultarProgresoPDF();
        if (err.message?.includes('QuotaExceededError')) {
            mostrarToast('❌ Almacenamiento lleno. Libera espacio e inténtalo.', 'error');
        } else {
            mostrarToast('❌ Error al generar el PDF. Revisa la consola.', 'error');
            console.error('[generarPDF]', err);
        }
    }
};

// ============================================================
//  LIBRO — CUADERNO ESPIRAL
// ============================================================
let paginasLibro       = [];
let paginaActualLibro  = 0;
let tapaAbierta        = false;

function generarEspiral() {
    const svg = document.getElementById('espiral-svg');
    if (!svg) return;
    svg.innerHTML = '';
    const total = 16, alturaTotal = 560, paso = alturaTotal / (total + 1);
    for (let i = 1; i <= total; i++) {
        const cy = paso * i;
        const arcAtras = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arcAtras.setAttribute('d', `M 6 ${cy-7} A 7 7 0 0 0 6 ${cy+7}`);
        arcAtras.setAttribute('fill', 'none');
        arcAtras.setAttribute('stroke', '#555');
        arcAtras.setAttribute('stroke-width', '2');
        arcAtras.setAttribute('stroke-linecap', 'round');
        svg.appendChild(arcAtras);
        const arcFrente = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arcFrente.setAttribute('d', `M 6 ${cy-7} A 7 7 0 0 1 6 ${cy+7}`);
        arcFrente.setAttribute('fill', 'none');
        arcFrente.setAttribute('stroke', '#c8991a');
        arcFrente.setAttribute('stroke-width', '2.2');
        arcFrente.setAttribute('stroke-linecap', 'round');
        svg.appendChild(arcFrente);
    }
}

function renderPaginaLibro() {
    if (paginasLibro.length === 0) return;
    const p = paginasLibro[paginaActualLibro];
    document.getElementById('pagina-titulo').textContent = p.titulo;
    document.getElementById('pagina-cuerpo').innerHTML   = p.contenido;
    document.getElementById('pagina-numero').textContent = `${paginaActualLibro + 1}`;
    document.getElementById('nav-info').textContent      = `Pág ${paginaActualLibro + 1} / ${paginasLibro.length}`;
    document.getElementById('btn-prev').disabled = paginaActualLibro === 0;
    document.getElementById('btn-next').disabled = paginaActualLibro === paginasLibro.length - 1;
    document.querySelectorAll('.nav-dot').forEach((d, i) => d.classList.toggle('activo', i === paginaActualLibro));
}

function cambiarPaginaLibro(dir) {
    const nuevo = paginaActualLibro + dir;
    if (nuevo < 0 || nuevo >= paginasLibro.length) return;
    paginaActualLibro = nuevo;
    renderPaginaLibro();
}

function toggleTapa() {
    if (paginasLibro.length === 0) { mostrarToast('📖 No hay notas guardadas aún.', 'info'); return; }
    tapaAbierta = !tapaAbierta;
    const tapa      = document.getElementById('cuaderno-tapa');
    const paginas   = document.getElementById('cuaderno-paginas');
    const nav       = document.getElementById('libro-nav');
    const btnToggle = document.getElementById('btn-toggle-tapa');
    tapa.classList.toggle('abierta', tapaAbierta);
    btnToggle.textContent = tapaAbierta ? 'Cerrar cuaderno' : 'Abrir cuaderno';
    btnToggle.classList.toggle('abierto', tapaAbierta);
    if (tapaAbierta) {
        setTimeout(() => { paginas.classList.add('visible'); nav.classList.add('visible'); }, 380);
    } else {
        paginas.classList.remove('visible');
        nav.classList.remove('visible');
    }
}

function abrirLibro() {
    const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
    if (claves.length === 0) { mostrarToast('📖 El cuaderno está vacío. Guarda algunas notas primero.', 'info'); return; }
    paginasLibro = claves.map(clave => ({
        titulo:    clave.replace('nota__', ''),
        contenido: localStorage.getItem(clave)
    }));
    paginaActualLibro = 0;
    tapaAbierta       = false;
    const tapa      = document.getElementById('cuaderno-tapa');
    const paginas   = document.getElementById('cuaderno-paginas');
    const nav       = document.getElementById('libro-nav');
    const btnToggle = document.getElementById('btn-toggle-tapa');
    tapa.classList.remove('abierta');
    paginas.classList.remove('visible');
    nav.classList.remove('visible');
    btnToggle.textContent = 'Abrir cuaderno';
    btnToggle.classList.remove('abierto');
    const dotsContainer = document.getElementById('nav-dots');
    dotsContainer.innerHTML = '';
    paginasLibro.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'nav-dot' + (i === 0 ? ' activo' : '');
        dot.setAttribute('aria-label', `Página ${i + 1}`);
        dot.onclick = () => { paginaActualLibro = i; renderPaginaLibro(); };
        dotsContainer.appendChild(dot);
    });
    generarEspiral();
    renderPaginaLibro();
    const seccion = document.getElementById('seccion-libro');
    seccion.style.display = 'block';
    seccion.scrollIntoView({ behavior: 'smooth' });
}

function cerrarLibro() {
    if (tapaAbierta) {
        toggleTapa();
        setTimeout(() => { document.getElementById('seccion-libro').style.display = 'none'; }, 800);
    } else {
        document.getElementById('seccion-libro').style.display = 'none';
    }
}

// ============================================================
//  GUÍA DE INGLÉS
// ============================================================
function toggleIngles() {
    const seccion = document.getElementById('seccion-ingles');
    const visible = seccion.style.display === 'block';
    seccion.style.display = visible ? 'none' : 'block';
    if (!visible) seccion.scrollIntoView({ behavior: 'smooth' });
}

function cambiarTab(evt, tabId) {
    document.querySelectorAll('.contenido-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    document.getElementById(tabId).classList.add('active');
    evt.currentTarget.classList.add('active');
}

function verificarRespuestas() {
    const respuestas = [
        { id:'ex1', correcta:'is'      },
        { id:'ex2', correcta:'are'     },
        { id:'ex3', correcta:'are'     },
        { id:'ex4', correcta:'was'     },
        { id:'ex5', correcta:'will be' },
    ];
    let correctas = 0;
    respuestas.forEach(({ id, correcta }) => {
        const input = document.getElementById(id);
        const valor = input.value.trim().toLowerCase();
        if (valor === correcta) {
            input.classList.remove('incorrecto');
            input.classList.add('correcto');
            correctas++;
        } else {
            input.classList.remove('correcto');
            input.classList.add('incorrecto');
        }
    });
    if (correctas === respuestas.length) {
        mostrarToast('🎉 ¡Todas correctas! Excelente trabajo.', 'exito', 4000);
    } else {
        mostrarToast(`✏️ ${correctas}/${respuestas.length} correctas. ¡Revisa las marcadas en rojo!`, 'error', 4000);
    }
}

// ============================================================
//  CARGA DE ARCHIVOS — ESTADO GLOBAL
// ============================================================
let _archivoHTMLPendiente   = '';
let _archivoNombrePendiente = '';

async function manejarArchivoSubido(inputEl) {
    const archivo = inputEl.files[0];
    if (!archivo) return;
    inputEl.value = '';
    const nombre = archivo.name;
    const ext    = nombre.split('.').pop().toLowerCase();
    const titulo = nombre.replace(/\.[^/.]+$/, '');
    mostrarToast('⏳ Procesando archivo...', 'info', 2000);
    try {
        let htmlResultado = '';
        let icono    = '📄';
        let tipoDesc = '';
        if (ext === 'pdf') {
            icono = '📕'; tipoDesc = 'Documento PDF';
            htmlResultado = await leerPDF(archivo);
        } else if (ext === 'docx' || ext === 'doc') {
            icono = '📘'; tipoDesc = 'Documento Word';
            htmlResultado = await leerDOCX(archivo);
        } else if (['png','jpg','jpeg','gif','webp','bmp','svg'].includes(ext)) {
            icono = '🖼️'; tipoDesc = 'Imagen';
            htmlResultado = await leerImagen(archivo);
        } else if (['txt','md'].includes(ext)) {
            icono = '📝'; tipoDesc = 'Archivo de texto';
            htmlResultado = await leerTexto(archivo);
        } else {
            mostrarToast(`❌ Tipo de archivo ".${ext}" no soportado.`, 'error');
            return;
        }
        _archivoHTMLPendiente   = htmlResultado;
        _archivoNombrePendiente = titulo;
        abrirModalArchivo(icono, nombre, tipoDesc, htmlResultado, titulo);
    } catch (err) {
        console.error('[manejarArchivoSubido]', err);
        mostrarToast('❌ Error al procesar el archivo. Revisa la consola.', 'error');
    }
}

async function leerPDF(archivo) {
    if (typeof pdfjsLib === 'undefined') throw new Error('PDF.js no cargado');
    pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    const arrayBuffer = await archivo.arrayBuffer();
    const pdf         = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let html = '';
    const ESCALA = 1.5;
    for (let i = 1; i <= pdf.numPages; i++) {
        const page     = await pdf.getPage(i);
        const viewport = page.getViewport({ scale: ESCALA });
        const canvas  = document.createElement('canvas');
        canvas.width  = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        html += `
            <div style="margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:0.75rem;color:#7a5a0a;
                           font-family:Georgia,serif;letter-spacing:0.05em;">
                    Página ${i} / ${pdf.numPages}
                </p>
                <img src="${dataUrl}" alt="Página ${i}"
                     style="display:block;width:100%;height:auto;
                            border:1px solid #2e2618;border-radius:4px;
                            box-shadow:0 2px 8px rgba(0,0,0,0.4);">
            </div>`;
        if (i < pdf.numPages) html += '<hr style="border:none;border-top:1px dashed #2e2618;margin:4px 0 16px;">';
    }
    return html || '<p><em>(No se pudo renderizar el PDF.)</em></p>';
}

async function leerDOCX(archivo) {
    if (typeof mammoth === 'undefined') throw new Error('Mammoth.js no cargado');
    const arrayBuffer = await archivo.arrayBuffer();
    const resultado   = await mammoth.convertToHtml({ arrayBuffer });
    return resultado.value || '<p><em>(No se pudo extraer contenido del documento.)</em></p>';
}

async function leerImagen(archivo) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload  = e => {
            const src  = e.target.result;
            const html = `<p style="text-align:center;">
                            <img src="${src}" alt="${escaparHTML(archivo.name)}"
                                 style="max-width:100%;height:auto;border-radius:4px;
                                        box-shadow:0 2px 10px rgba(0,0,0,.5);">
                          </p>`;
            resolve(html);
        };
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

async function leerTexto(archivo) {
    const texto = await archivo.text();
    const lineas = texto.split('\n');
    let html = '';
    lineas.forEach(linea => {
        const l = linea.trim();
        if (!l)             html += '<br>';
        else if (l.startsWith('# '))   html += `<h1>${escaparHTML(l.slice(2))}</h1>`;
        else if (l.startsWith('## '))  html += `<h2>${escaparHTML(l.slice(3))}</h2>`;
        else if (l.startsWith('### ')) html += `<h3>${escaparHTML(l.slice(4))}</h3>`;
        else                           html += `<p>${escaparHTML(l)}</p>`;
    });
    return html;
}

// ============================================================
//  MODAL ARCHIVO
// ============================================================
function abrirModalArchivo(icono, nombre, tipoDesc, htmlContenido, tituloSugerido) {
    document.getElementById('modal-archivo-icono').textContent   = icono;
    document.getElementById('modal-archivo-nombre').textContent  = nombre;
    document.getElementById('modal-archivo-tipo').textContent    = tipoDesc;
    document.getElementById('modal-titulo-input').value          = tituloSugerido;
    document.getElementById('modal-archivo-preview').innerHTML   = htmlContenido;
    document.getElementById('modal-archivo').classList.add('abierto');
}

function cerrarModalArchivo() {
    document.getElementById('modal-archivo').classList.remove('abierto');
    _archivoHTMLPendiente   = '';
    _archivoNombrePendiente = '';
}

function cerrarModalArchivSiFondo(e) {
    if (e.target === document.getElementById('modal-archivo')) cerrarModalArchivo();
}

function insertarArchivoEnEditor() {
    const tituloIngresado = document.getElementById('modal-titulo-input').value.trim();
    if (!tituloIngresado) {
        mostrarToast('⚠️ Escribe un título para la hoja.', 'error');
        document.getElementById('modal-titulo-input').focus();
        return;
    }
    if (!_archivoHTMLPendiente) {
        mostrarToast('❌ No hay contenido para insertar.', 'error');
        return;
    }
    document.getElementById('titulo').value = tituloIngresado;
    CKEDITOR.instances.editor.setData(_archivoHTMLPendiente);
    try {
        localStorage.setItem('nota__' + tituloIngresado, _archivoHTMLPendiente);
        ultimoTituloAutoguardado    = tituloIngresado;
        ultimoContenidoAutoguardado = _archivoHTMLPendiente;
        clearTimeout(autoguardadoTimer);
        actualizarIndicador('guardado');
        mostrarToast(`✅ "${tituloIngresado}" importada y guardada.`, 'exito', 3500);
    } catch(e) {
        mostrarToast('⚠️ Contenido insertado pero no guardado (almacenamiento lleno).', 'error');
    }
    cerrarModalArchivo();
    document.getElementById('titulo').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

// ============================================================
//  UTILIDAD
// ============================================================
function escaparHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ============================================================
//  EXPORTAR / IMPORTAR NOTAS
// ============================================================
function exportarNotas() {
    const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
    if (claves.length === 0) { mostrarToast('⚠️ No hay notas guardadas para exportar.', 'error'); return; }
    const datos = {};
    claves.forEach(clave => { datos[clave.replace('nota__', '')] = localStorage.getItem(clave); });
    const json  = JSON.stringify(datos, null, 2);
    const blob  = new Blob([json], { type: 'application/json' });
    const url   = URL.createObjectURL(blob);
    const fecha = new Date().toISOString().slice(0, 10);
    const a     = document.createElement('a');
    a.href     = url;
    a.download = `cuaderno-inframen-${fecha}.json`;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast(`⬇ ${claves.length} nota(s) exportadas.`, 'exito', 4000);
}

function importarNotas(inputEl) {
    const archivo = inputEl.files[0];
    if (!archivo) return;
    inputEl.value = '';
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const datos = JSON.parse(e.target.result);
            if (typeof datos !== 'object' || Array.isArray(datos)) {
                mostrarToast('❌ El archivo no tiene el formato correcto.', 'error'); return;
            }
            const entradas = Object.entries(datos);
            if (entradas.length === 0) { mostrarToast('⚠️ El archivo está vacío.', 'error'); return; }
            let importadas = 0, errores = 0;
            entradas.forEach(([titulo, contenido]) => {
                if (typeof titulo === 'string' && typeof contenido === 'string') {
                    try { localStorage.setItem('nota__' + titulo, contenido); importadas++; }
                    catch (_) { errores++; }
                }
            });
            if (importadas > 0) {
                mostrarToast(
                    `✅ ${importadas} nota(s) importadas.` + (errores > 0 ? ` (${errores} fallaron.)` : ''),
                    'exito', 4000
                );
            } else {
                mostrarToast('❌ No se pudo importar ninguna nota. Almacenamiento lleno.', 'error');
            }
        } catch (err) {
            mostrarToast('❌ Error al leer el archivo.', 'error');
            console.error('[importarNotas]', err);
        }
    };
    reader.readAsText(archivo);
}