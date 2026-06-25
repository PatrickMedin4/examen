/* ============================================================
   INICIALIZACIÓN DE CKEDITOR
   ============================================================ */
CKEDITOR.config.versionCheck = false;
CKEDITOR.replace('editor', {
    removePlugins: 'exportpdf,cloudservices,easyimage',
    height: 360
});

/* ============================================================
   SISTEMA DE TOASTS
   ============================================================ */
function mostrarToast(mensaje, tipo = 'info', duracion = 3000) {
    const contenedor = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${tipo}`;
    toast.textContent = mensaje;
    contenedor.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-saliendo');
        toast.addEventListener('animationend', () => toast.remove(), { once: true });
    }, duracion);
}

/* ============================================================
   CONTADOR DE PALABRAS
   ============================================================ */
function actualizarContadorPalabras() {
    const contenido = CKEDITOR.instances.editor
        ? CKEDITOR.instances.editor.getData()
        : '';
    const texto = contenido.replace(/<[^>]*>/g, ' ').trim();
    const palabras = texto ? texto.split(/\s+/).filter(Boolean).length : 0;
    const chars    = texto.replace(/\s/g, '').length;
    const el = document.getElementById('contador-palabras');
    if (el) el.textContent = `${palabras} palabra${palabras !== 1 ? 's' : ''} · ${chars} caracteres`;
}

/* ============================================================
   AUTOGUARDADO
   ============================================================ */
let autoguardadoTimer           = null;
let ultimoContenidoAutoguardado = '';
let ultimoTituloAutoguardado    = '';

function iniciarAutoguardado() {
    CKEDITOR.instances.editor.on('change', () => {
        programarAutoguardado();
        actualizarContadorPalabras();
    });
    CKEDITOR.instances.editor.on('key', () => {
        programarAutoguardado();
        actualizarContadorPalabras();
    });
    document.getElementById('titulo').addEventListener('input', programarAutoguardado);
    actualizarContadorPalabras();
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
        mostrarToast(`💾 Autoguardado: "${titulo}"`, 'exito', 2000);
    } catch (e) {
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
        guardado:  { texto: '✓ Guardado automáticamente', clase: 'ag-guardado'  },
        error:     { texto: '✕ Error al autoguardar',     clase: 'ag-error'     },
    };
    const { texto, clase } = estados[estado] || estados.inactivo;
    indicador.textContent = texto;
    indicador.className   = 'indicador-autoguardado ' + clase;
}

window.addEventListener('beforeunload', (e) => {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();
    const hayContenido = titulo && contenido;
    const hayPendiente = contenido !== ultimoContenidoAutoguardado || titulo !== ultimoTituloAutoguardado;
    if (hayContenido && hayPendiente) {
        e.preventDefault();
        e.returnValue = '';
    }
});

CKEDITOR.instances.editor.on('instanceReady', iniciarAutoguardado);

/* ============================================================
   GUARDAR NOTA
   ============================================================ */
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
    } catch (e) {
        mostrarToast('❌ Error al guardar. Almacenamiento lleno.', 'error');
    }
}

/* ============================================================
   CARGAR NOTA
   ============================================================ */
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
        actualizarContadorPalabras();
        mostrarToast(`📂 "${titulo}" cargada.`, 'exito');
    } else {
        mostrarToast(`❌ No existe ninguna nota llamada "${titulo}".`, 'error');
    }
}

/* ============================================================
   ELIMINAR NOTA
   ============================================================ */
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
            document.getElementById('titulo').value = '';
            ultimoContenidoAutoguardado = '';
            ultimoTituloAutoguardado    = '';
            clearTimeout(autoguardadoTimer);
            actualizarIndicador('inactivo');
            actualizarContadorPalabras();
            mostrarToast(`🗑 "${titulo}" eliminada.`, 'info');
        }
    );
}

/* ============================================================
   NUEVA HOJA
   ============================================================ */
function nuevaHoja() {
    const titulo    = document.getElementById('titulo').value.trim();
    const contenido = CKEDITOR.instances.editor.getData();
    const hayPendiente = (titulo || contenido) &&
        (contenido !== ultimoContenidoAutoguardado || titulo !== ultimoTituloAutoguardado);

    if (hayPendiente) {
        mostrarConfirmacion(
            '¿Crear nueva hoja?',
            'Tienes cambios sin guardar. Se perderán si continúas.',
            () => limpiarEditor()
        );
    } else {
        limpiarEditor();
    }
}

function limpiarEditor() {
    document.getElementById('titulo').value = '';
    CKEDITOR.instances.editor.setData('');
    ultimoTituloAutoguardado    = '';
    ultimoContenidoAutoguardado = '';
    clearTimeout(autoguardadoTimer);
    actualizarIndicador('inactivo');
    actualizarContadorPalabras();
    document.getElementById('titulo').focus();
    mostrarToast('✨ Nueva hoja lista.', 'exito', 2000);
}

/* ============================================================
   ESTADÍSTICAS
   ============================================================ */
function abrirEstadisticas() {
    const claves   = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
    const total    = claves.length;
    let totalPalab = 0;
    let totalChars = 0;
    let masLarga   = { titulo: '—', palabras: 0 };

    claves.forEach(clave => {
        const html   = localStorage.getItem(clave) || '';
        const texto  = html.replace(/<[^>]*>/g, ' ').trim();
        const palab  = texto ? texto.split(/\s+/).filter(Boolean).length : 0;
        totalPalab  += palab;
        totalChars  += texto.replace(/\s/g, '').length;
        if (palab > masLarga.palabras) masLarga = { titulo: clave.replace('nota__',''), palabras: palab };
    });

    const uso = calcularUsoLocalStorage();

    const grid = document.getElementById('stats-contenido');
    grid.innerHTML = `
        <div class="stat-card">
            <span class="stat-valor">${total}</span>
            <span class="stat-label">Notas guardadas</span>
        </div>
        <div class="stat-card">
            <span class="stat-valor">${totalPalab.toLocaleString()}</span>
            <span class="stat-label">Total palabras</span>
        </div>
        <div class="stat-card">
            <span class="stat-valor">${totalChars.toLocaleString()}</span>
            <span class="stat-label">Caracteres totales</span>
        </div>
        <div class="stat-card">
            <span class="stat-valor">${uso.kb} KB</span>
            <span class="stat-label">Almacenamiento usado</span>
        </div>
        ${masLarga.palabras > 0 ? `
        <div class="stat-card" style="grid-column: 1 / -1;">
            <span class="stat-valor" style="font-size:1rem; word-break:break-word;">${masLarga.titulo}</span>
            <span class="stat-label">Nota más larga (${masLarga.palabras} palabras)</span>
        </div>` : ''}
    `;

    document.getElementById('modal-stats').classList.add('abierto');
}

function cerrarEstadisticas() {
    document.getElementById('modal-stats').classList.remove('abierto');
}

function calcularUsoLocalStorage() {
    let total = 0;
    for (const k in localStorage) {
        if (!Object.prototype.hasOwnProperty.call(localStorage, k)) continue;
        total += (localStorage.getItem(k) || '').length + k.length;
    }
    return { kb: (total / 1024).toFixed(1) };
}

/* ============================================================
   DIÁLOGO DE CONFIRMACIÓN
   ============================================================ */
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
                <button class="dialogo-confirmar" id="dialogo-btn-confirmar">Confirmar</button>
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

/* ============================================================
   MODAL LISTA DE NOTAS
   ============================================================ */
let _notaItems = []; // cache para filtrar

function abrirModalNotas() {
    const contenedor = document.getElementById('lista-notas-contenido');
    contenedor.innerHTML = '';
    _notaItems = [];
    document.getElementById('modal-search-input').value = '';

    const claves = Object.keys(localStorage)
        .filter(k => k.startsWith('nota__'))
        .sort();

    if (claves.length === 0) {
        contenedor.innerHTML = '<p class="modal-vacio">No hay notas guardadas todavía.</p>';
    } else {
        claves.forEach(clave => {
            const tituloReal = clave.replace('nota__', '');
            const item = document.createElement('div');
            item.className = 'nota-item';
            item.dataset.titulo = tituloReal.toLowerCase();
            item.innerHTML = `
                <span onclick="cargarDesdeModal('${tituloReal}')">📄 ${tituloReal}</span>
                <button class="nota-borrar" onclick="borrarDesdeModal('${tituloReal}', this.parentElement)" title="Borrar nota">🗑</button>`;
            contenedor.appendChild(item);
            _notaItems.push(item);
        });
    }
    document.getElementById('modal-notas').classList.add('abierto');
}

function filtrarModalNotas(valor) {
    const q = valor.toLowerCase().trim();
    _notaItems.forEach(item => {
        item.style.display = item.dataset.titulo.includes(q) ? '' : 'none';
    });
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
        actualizarContadorPalabras();
        mostrarToast(`📂 "${titulo}" cargada.`, 'exito');
    }
    cerrarModalNotas();
}

function borrarDesdeModal(titulo, elemento) {
    localStorage.removeItem('nota__' + titulo);
    elemento.remove();
    _notaItems = _notaItems.filter(i => i !== elemento);
    mostrarToast(`🗑 "${titulo}" eliminada.`, 'info');
    const lista = document.getElementById('lista-notas-contenido');
    const visibles = lista.querySelectorAll('.nota-item');
    if (visibles.length === 0)
        lista.innerHTML = '<p class="modal-vacio">No hay notas guardadas todavía.</p>';
}

function cerrarModalNotas()    { document.getElementById('modal-notas').classList.remove('abierto'); }
function cerrarModalSiFondo(e) { if (e.target === document.getElementById('modal-notas')) cerrarModalNotas(); }

/* ============================================================
   UTILIDADES PDF
   ============================================================ */
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
        const canvas = document.createElement('canvas');
        const ctx    = canvas.getContext('2d');
        const imagen = new Image();
        imagen.crossOrigin = 'anonymous';
        imagen.onload = () => {
            canvas.width  = imagen.naturalWidth;
            canvas.height = imagen.naturalHeight;
            ctx.drawImage(imagen, 0, 0);
            try { img.src = canvas.toDataURL('image/png'); } catch (_) {}
            resolve();
        };
        imagen.onerror = resolve;
        imagen.src     = img.src;
    }));
    await Promise.all(promesas);
}

/* ── Barra de progreso PDF ── */
function mostrarProgresoPDF(porcentaje, mensaje) {
    let c = document.getElementById('pdf-progreso');
    if (!c) {
        c = document.createElement('div');
        c.id = 'pdf-progreso';
        c.setAttribute('role', 'status');
        c.setAttribute('aria-live', 'polite');
        c.innerHTML = `
            <p id="pdf-prog-msg"   style="margin:0 0 8px;font-size:13px;color:var(--texto);font-family:'DM Sans',sans-serif;"></p>
            <div style="background:var(--borde);border-radius:6px;height:8px;overflow:hidden;">
                <div id="pdf-prog-barra"
                     style="height:100%;width:0%;background:var(--acento);
                            border-radius:6px;transition:width .35s ease;"></div>
            </div>
            <p id="pdf-prog-pct"
               style="margin:6px 0 0;font-size:11px;color:var(--texto-muted);text-align:right;font-family:'DM Sans',sans-serif;"></p>`;
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
    c.style.transition = 'opacity .4s';
    setTimeout(() => c.remove(), 450);
}

/* ── Portada PDF ── */
function agregarPortada(doc, titulo) {
    doc.insertPage(1);
    doc.setPage(1);
    const { width, height } = doc.internal.pageSize;
    doc.setFillColor(250, 246, 237);
    doc.rect(0, 0, width, height, 'F');
    doc.setFillColor(139, 105, 20);
    doc.rect(0, 0, width, 8, 'F');
    doc.rect(0, height - 8, width, 8, 'F');
    doc.setDrawColor(180, 150, 80);
    doc.setLineWidth(0.6);
    doc.line(60, height / 2 - 60, width - 60, height / 2 - 60);
    doc.line(60, height / 2 + 40, width - 60, height / 2 + 40);
    doc.setFont('times', 'bold');
    doc.setFontSize(28);
    doc.setTextColor(58, 46, 34);
    const lineas = doc.splitTextToSize(titulo, width - 120);
    doc.text(lineas, width / 2, height / 2 - 20, { align: 'center', baseline: 'middle' });
    const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont('times', 'italic');
    doc.setFontSize(12);
    doc.setTextColor(120, 100, 60);
    doc.text(fecha, width / 2, height / 2 + 60, { align: 'center' });
}

function agregarMetadata(doc, titulo) {
    doc.setProperties({
        title:   titulo,
        subject: 'Nota exportada desde el editor',
        author:  'Cuaderno Digital INFRAMEN',
        keywords:'nota, editor, exportación, INFRAMEN',
        creator: 'Cuaderno Digital v3.0',
    });
}

function agregarPieDePagina(doc, nombreArchivo) {
    const total = doc.getNumberOfPages();
    const fecha = new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(140, 120, 90);
    for (let i = 1; i <= total; i++) {
        doc.setPage(i);
        const { width, height } = doc.internal.pageSize;
        doc.setDrawColor(200, 185, 155);
        doc.setLineWidth(0.3);
        doc.line(40, height - 30, width - 40, height - 30);
        doc.text(nombreArchivo,            40,         height - 18);
        doc.text(fecha,                    width / 2,  height - 18, { align: 'center' });
        doc.text(`Pág. ${i} / ${total}`,   width - 40, height - 18, { align: 'right'  });
    }
}

/* ── Vista previa PDF ── */
function mostrarVistaPreviaPDF(pdfBlob, nombreArchivo, onDescargar) {
    document.getElementById('pdf-preview-overlay')?.remove();
    const url = URL.createObjectURL(pdfBlob);

    const overlay = document.createElement('div');
    overlay.id = 'pdf-preview-overlay';
    overlay.style.cssText = `
        position:fixed;inset:0;background:rgba(20,14,7,.80);
        z-index:10000;display:flex;align-items:center;
        justify-content:center;animation:fadeInOv .25s ease;`;

    overlay.innerHTML = `
        <style>
            @keyframes fadeInOv { from{opacity:0} to{opacity:1} }
            #ppbox {
                background:var(--fondo-card,#231e17);
                border:1px solid var(--borde,#3a3020);
                border-radius:12px;
                width:min(820px,96vw);height:min(680px,90vh);
                display:flex;flex-direction:column;overflow:hidden;
                box-shadow:0 20px 60px rgba(0,0,0,.6);
            }
            #pphead {
                display:flex;align-items:center;justify-content:space-between;
                padding:12px 18px;background:#1a1208;
                color:var(--acento,#b09060);
                font-family:'DM Sans',sans-serif;font-size:14px;
            }
            #pphead button {
                background:none;border:none;cursor:pointer;
                color:var(--acento,#b09060);font-size:20px;
                line-height:1;padding:0 4px;border-radius:4px;
                transition:background .15s;
            }
            #pphead button:hover { background:rgba(255,255,255,.12); }
            #ppfoot {
                display:flex;gap:10px;padding:12px 18px;
                background:#1a1208;border-top:1px solid #3a3020;
                justify-content:flex-end;
            }
            .ppbtn {
                font-family:'DM Sans',sans-serif;font-size:13px;
                padding:8px 20px;border-radius:6px;cursor:pointer;
                border:1px solid #b09060;transition:background .15s,transform .1s;
            }
            .ppbtn:active { transform:scale(.97); }
            .ppbtn-ok  { background:#8b6914;color:#fff;border-color:#8b6914; }
            .ppbtn-ok:hover { background:#6d5010; }
            .ppbtn-no  { background:transparent;color:#b09060; }
            .ppbtn-no:hover { background:rgba(176,144,96,.1); }
        </style>
        <div id="ppbox">
            <div id="pphead">
                <span>📄 Vista previa — <em>${nombreArchivo}</em></span>
                <button id="pp-x" title="Cerrar">&times;</button>
            </div>
            <iframe src="${url}#toolbar=0"
                    style="flex:1;border:none;width:100%;"></iframe>
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

/* ============================================================
   GENERAR PDF
   ============================================================ */
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

        const el = document.createElement('div');
        el.innerHTML =
            `<h1 style="text-align:center;color:#3a2e22;font-family:Georgia,serif;
                        margin:0 0 8px;">${titulo}</h1>
             <hr style="border:none;border-top:1px solid #d4c9b0;margin:0 0 20px;">` +
            contenido;
        el.style.cssText = [
            `width:${AREA_W}px`,
            'padding:0',
            'font-family:Georgia,serif',
            'font-size:13px',
            'line-height:1.7',
            'color:#1a1a1a',
            'background:#ffffff',
            'box-sizing:border-box',
            'position:absolute',
            'left:-9999px',
            'top:0'
        ].join(';');
        document.body.appendChild(el);

        mostrarProgresoPDF(25, 'Procesando imágenes…');
        await convertirImagenesABase64(el);

        mostrarProgresoPDF(45, 'Capturando contenido…');
        const canvas = await html2canvas(el, {
            scale:           2,
            useCORS:         true,
            logging:         false,
            backgroundColor: '#ffffff',
            width:           AREA_W,
            windowWidth:     AREA_W,
        });

        mostrarProgresoPDF(65, 'Paginando…');
        const escala       = canvas.width / AREA_W;
        const alturaPagPx  = AREA_H * escala;

        const cortesNaturales = [0];
        const elRect = el.getBoundingClientRect();
        el.querySelectorAll('p,h1,h2,h3,h4,h5,h6,li,tr,div,img').forEach(bloque => {
            const rect = bloque.getBoundingClientRect();
            const yRel = (rect.top - elRect.top) * escala;
            if (yRel > 0) cortesNaturales.push(Math.round(yRel));
        });
        cortesNaturales.push(canvas.height);
        document.body.removeChild(el);

        const cortesPagina = [0];
        let pagAct = 1;
        while (true) {
            const idealY = pagAct * alturaPagPx;
            if (idealY >= canvas.height) break;
            let mejorCorte = idealY;
            for (let j = cortesNaturales.length - 1; j >= 0; j--) {
                if (cortesNaturales[j] <= idealY) { mejorCorte = cortesNaturales[j]; break; }
            }
            if (idealY - mejorCorte > alturaPagPx * 0.20) mejorCorte = idealY;
            cortesPagina.push(Math.round(mejorCorte));
            pagAct++;
        }
        cortesPagina.push(canvas.height);

        const doc = new jsPDF('p', 'pt', 'a4');
        agregarMetadata(doc, titulo);

        for (let i = 0; i < cortesPagina.length - 1; i++) {
            if (i > 0) doc.addPage();
            const srcY = cortesPagina[i];
            const srcH = cortesPagina[i + 1] - srcY;
            if (srcH <= 0) continue;

            const trozo = document.createElement('canvas');
            trozo.width  = canvas.width;
            trozo.height = Math.ceil(alturaPagPx);
            const ctx = trozo.getContext('2d');
            ctx.fillStyle = '#ffffff';
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

/* ============================================================
   LIBRO — CUADERNO ESPIRAL
   FIX PRINCIPAL: el bug de la tapa estaba en la mezcla de
   transform-origin y el uso de classList sin limpiar estados.
   Ahora la tapa usa puro CSS rotateY(-165deg) desde el lomo
   y el JS solo añade/quita la clase "abierta".
   ============================================================ */
let paginasLibro      = [];
let paginaActualLibro = 0;
let tapaAbierta       = false;
let _animandoTapa     = false;

/* Filtra las páginas del libro por título */
let _paginasFiltradas = [];

function filtrarNotasLibro(valor) {
    const q = valor.toLowerCase().trim();
    if (!q) {
        _paginasFiltradas = [...paginasLibro];
    } else {
        _paginasFiltradas = paginasLibro.filter(p => p.titulo.toLowerCase().includes(q));
    }
    const count = document.getElementById('libro-search-count');
    count.textContent = q ? `${_paginasFiltradas.length} resultado${_paginasFiltradas.length !== 1 ? 's' : ''}` : '';

    // Reconstruir dots
    const dotsContainer = document.getElementById('nav-dots');
    dotsContainer.innerHTML = '';
    _paginasFiltradas.forEach((_, i) => {
        const dot = document.createElement('button');
        dot.className = 'nav-dot' + (i === 0 ? ' activo' : '');
        dot.setAttribute('aria-label', `Página ${i + 1}`);
        dot.onclick = () => { paginaActualLibro = i; renderPaginaLibro(); };
        dotsContainer.appendChild(dot);
    });

    paginaActualLibro = 0;
    if (_paginasFiltradas.length > 0) renderPaginaLibro();
    else {
        document.getElementById('pagina-titulo').textContent = '— Sin resultados —';
        document.getElementById('pagina-cuerpo').innerHTML   = '<p style="color:#a09070;font-style:italic;">No se encontraron notas con ese término.</p>';
        document.getElementById('nav-info').textContent      = 'Pág 0 / 0';
    }
}

function generarEspiral() {
    const svg = document.getElementById('espiral-svg');
    if (!svg) return;
    svg.innerHTML = '';
    const total = 16, alturaTotal = 560, paso = alturaTotal / (total + 1);
    for (let i = 1; i <= total; i++) {
        const cy = paso * i;
        const arcAtras = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arcAtras.setAttribute('d', `M 6 ${cy - 7} A 7 7 0 0 0 6 ${cy + 7}`);
        arcAtras.setAttribute('fill', 'none');
        arcAtras.setAttribute('stroke', '#555');
        arcAtras.setAttribute('stroke-width', '2');
        arcAtras.setAttribute('stroke-linecap', 'round');
        svg.appendChild(arcAtras);
        const arcFrente = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arcFrente.setAttribute('d', `M 6 ${cy - 7} A 7 7 0 0 1 6 ${cy + 7}`);
        arcFrente.setAttribute('fill', 'none');
        arcFrente.setAttribute('stroke', '#b09060');
        arcFrente.setAttribute('stroke-width', '2.2');
        arcFrente.setAttribute('stroke-linecap', 'round');
        svg.appendChild(arcFrente);
    }
}

function renderPaginaLibro() {
    const lista = _paginasFiltradas.length > 0 ? _paginasFiltradas : paginasLibro;
    if (lista.length === 0) return;
    if (paginaActualLibro < 0)               paginaActualLibro = 0;
    if (paginaActualLibro >= lista.length)   paginaActualLibro = lista.length - 1;

    const p = lista[paginaActualLibro];
    document.getElementById('pagina-titulo').textContent = p.titulo;
    document.getElementById('pagina-cuerpo').innerHTML   = p.contenido;
    document.getElementById('pagina-numero').textContent = `${paginaActualLibro + 1}`;
    document.getElementById('nav-info').textContent      = `Pág ${paginaActualLibro + 1} / ${lista.length}`;
    document.getElementById('btn-prev').disabled = paginaActualLibro === 0;
    document.getElementById('btn-next').disabled = paginaActualLibro === lista.length - 1;

    document.querySelectorAll('.nav-dot').forEach((d, i) =>
        d.classList.toggle('activo', i === paginaActualLibro)
    );

    const cuerpo = document.getElementById('pagina-cuerpo');
    if (cuerpo) cuerpo.scrollTop = 0;
}

function cambiarPaginaLibro(dir) {
    const lista = _paginasFiltradas.length > 0 ? _paginasFiltradas : paginasLibro;
    const nuevo = paginaActualLibro + dir;
    if (nuevo < 0 || nuevo >= lista.length) return;
    paginaActualLibro = nuevo;
    renderPaginaLibro();
}


/* ============================================================
   MANEJADOR DE CLICK EN LA ESCENA DEL CUADERNO
   Un overlay transparente cubre toda la escena (z:25).
   - Si la tapa está CERRADA: cualquier click abre el libro
   - Si la tapa está ABIERTA: el overlay se desactiva (pointer-
     events:none) para que los clicks lleguen a las páginas.
     Solo la franja visible de la tapa (izquierda ~30px) sigue
     siendo clicable gracias a que el overlay se desactiva.
   ============================================================ */
function manejarClickEscena(event) {
    // Nunca procesar durante animación
    if (_animandoTapa) return;

    if (!tapaAbierta) {
        // Cuaderno cerrado: abrir
        toggleTapa();
    } else {
        // Cuaderno abierto: el overlay no debe estar activo
        // (se desactiva en toggleTapa al abrir), pero por si acaso:
        toggleTapa();
    }
}

/* ── TOGGLE TAPA ──────────────────────────────────────────────
   - Cerrada: click abre el libro (rotateY -170°)
   - Abierta:  click en la PASTA también cierra el libro.
     En CSS la clase .abierta mantiene pointer-events:auto y
     cursor:pointer para que la pasta sea clicable de vuelta.
   - El botón "Abrir/Cerrar cuaderno" también llama aquí.
   - El hint de texto cambia dinámicamente: "clic para abrir"
     / "clic para cerrar".
   ───────────────────────────────────────────────────────── */
function toggleTapa() {
    if (_animandoTapa) return;

    if (paginasLibro.length === 0) {
        mostrarToast('📖 No hay notas guardadas aún.', 'info');
        return;
    }

    _animandoTapa = true;
    tapaAbierta   = !tapaAbierta;

    const tapa      = document.getElementById('cuaderno-tapa');
    const paginas   = document.getElementById('cuaderno-paginas');
    const nav       = document.getElementById('libro-nav');
    const btnToggle = document.getElementById('btn-toggle-tapa');
    const hint      = tapa ? tapa.querySelector('.tapa-hint') : null;

    if (tapaAbierta) {
        /* ── ABRIR ── */
        tapa.classList.add('abierta');
        btnToggle.textContent = 'Cerrar cuaderno';
        btnToggle.classList.add('abierto');

        /* Páginas y nav aparecen a mitad del giro */
        setTimeout(() => { paginas.classList.add('visible'); }, 380);
        setTimeout(() => { nav.classList.add('visible');     }, 480);

        /* Actualizar hint */
        if (hint) hint.textContent = '— clic para cerrar —';

        /* Desactivar overlay: las páginas ya son interactivas */
        setTimeout(() => {
            const ov = document.getElementById('tapa-click-overlay');
            if (ov) ov.style.pointerEvents = 'none';
        }, 500);

    } else {
        /* ── CERRAR ── */
        paginas.classList.remove('visible');
        nav.classList.remove('visible');

        /* Reactivar overlay para capturar el próximo click de apertura */
        const ov = document.getElementById('tapa-click-overlay');
        if (ov) ov.style.pointerEvents = 'auto';

        /* La tapa vuelve después de que las páginas se ocultan */
        setTimeout(() => {
            tapa.classList.remove('abierta');
            btnToggle.textContent = 'Abrir cuaderno';
            btnToggle.classList.remove('abierto');
            if (hint) hint.textContent = '— clic para abrir —';
        }, 80);
    }

    /* Desbloquear tras la transición CSS (0.85s) */
    setTimeout(() => { _animandoTapa = false; }, 950);
}

function abrirLibro() {
    const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
    if (claves.length === 0) {
        mostrarToast('📖 El cuaderno está vacío. Guarda algunas notas primero.', 'info');
        return;
    }

    paginasLibro = claves.sort().map(clave => ({
        titulo:    clave.replace('nota__', ''),
        contenido: localStorage.getItem(clave)
    }));
    _paginasFiltradas  = [];
    paginaActualLibro  = 0;
    tapaAbierta        = false;
    _animandoTapa      = false;

    /* Reset visual */
    const tapa      = document.getElementById('cuaderno-tapa');
    const paginas   = document.getElementById('cuaderno-paginas');
    const nav       = document.getElementById('libro-nav');
    const btnToggle = document.getElementById('btn-toggle-tapa');
    const searchInp = document.getElementById('libro-search-input');
    const searchCnt = document.getElementById('libro-search-count');

    tapa.classList.remove('abierta');
    paginas.classList.remove('visible');
    nav.classList.remove('visible');
    btnToggle.textContent = 'Abrir cuaderno';
    btnToggle.classList.remove('abierto');
    if (searchInp) searchInp.value = '';
    if (searchCnt) searchCnt.textContent = '';

    /* Dots de navegación */
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
    seccion.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function cerrarLibro() {
    const seccion   = document.getElementById('seccion-libro');
    const tapa      = document.getElementById('cuaderno-tapa');
    const paginas   = document.getElementById('cuaderno-paginas');
    const nav       = document.getElementById('libro-nav');
    const btnToggle = document.getElementById('btn-toggle-tapa');

    if (tapaAbierta) {
        paginas.classList.remove('visible');
        nav.classList.remove('visible');
        setTimeout(() => {
            tapa.classList.remove('abierta');
            btnToggle.textContent = 'Abrir cuaderno';
            btnToggle.classList.remove('abierto');
            tapaAbierta = false;
        }, 80);
        setTimeout(() => { seccion.style.display = 'none'; }, 950);
    } else {
        seccion.style.display = 'none';
    }
}

/* Botón "Editar esta página" — carga la nota actual en el editor */
function editarPaginaActual() {
    const lista = _paginasFiltradas.length > 0 ? _paginasFiltradas : paginasLibro;
    if (lista.length === 0) return;
    const p = lista[paginaActualLibro];
    cerrarLibro();
    setTimeout(() => {
        document.getElementById('titulo').value = p.titulo;
        CKEDITOR.instances.editor.setData(p.contenido);
        ultimoTituloAutoguardado    = p.titulo;
        ultimoContenidoAutoguardado = p.contenido;
        clearTimeout(autoguardadoTimer);
        actualizarIndicador('guardado');
        actualizarContadorPalabras();
        document.getElementById('titulo').scrollIntoView({ behavior: 'smooth', block: 'center' });
        mostrarToast(`✏️ Editando "${p.titulo}".`, 'exito');
    }, 400);
}

/* ============================================================
   CARGA DE ARCHIVOS
   ============================================================ */
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

/* ── Lectores por tipo ── */
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
        const canvas   = document.createElement('canvas');
        canvas.width   = Math.floor(viewport.width);
        canvas.height  = Math.floor(viewport.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport }).promise;
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
        html += `
            <div style="margin-bottom:16px;">
                <p style="margin:0 0 4px;font-size:0.75rem;color:#8b6914;font-family:Georgia,serif;">
                    Página ${i} / ${pdf.numPages}
                </p>
                <img src="${dataUrl}" alt="Página ${i}"
                     style="display:block;width:100%;height:auto;
                            border:1px solid #d4c9b0;border-radius:4px;">
            </div>`;
        if (i < pdf.numPages)
            html += '<hr style="border:none;border-top:1px dashed #d4c9b0;margin:4px 0 16px;">';
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
                            box-shadow:0 2px 10px rgba(0,0,0,0.15);">
            </p>`;
            resolve(html);
        };
        reader.onerror = reject;
        reader.readAsDataURL(archivo);
    });
}

async function leerTexto(archivo) {
    const texto  = await archivo.text();
    const lineas = texto.split('\n');
    let html = '';
    lineas.forEach(linea => {
        const l = linea.trim();
        if (!l)              html += '<br>';
        else if (l.startsWith('# '))   html += `<h1>${escaparHTML(l.slice(2))}</h1>`;
        else if (l.startsWith('## '))  html += `<h2>${escaparHTML(l.slice(3))}</h2>`;
        else if (l.startsWith('### ')) html += `<h3>${escaparHTML(l.slice(4))}</h3>`;
        else                           html += `<p>${escaparHTML(l)}</p>`;
    });
    return html;
}

/* ── Modal de previsualización ── */
function abrirModalArchivo(icono, nombre, tipoDesc, htmlContenido, tituloSugerido) {
    document.getElementById('modal-archivo-icono').textContent  = icono;
    document.getElementById('modal-archivo-nombre').textContent = nombre;
    document.getElementById('modal-archivo-tipo').textContent   = tipoDesc;
    document.getElementById('modal-titulo-input').value         = tituloSugerido;
    document.getElementById('modal-archivo-preview').innerHTML  = htmlContenido;
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
        actualizarContadorPalabras();
        mostrarToast(`✅ "${tituloIngresado}" importada y guardada.`, 'exito', 3500);
    } catch (e) {
        mostrarToast('⚠️ Contenido insertado pero no guardado (almacenamiento lleno).', 'error');
    }
    cerrarModalArchivo();
    document.getElementById('titulo').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

/* ============================================================
   UTILIDAD
   ============================================================ */
function escaparHTML(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

/* ============================================================
   EXPORTAR / IMPORTAR NOTAS (backup JSON)
   ============================================================ */
function exportarNotas() {
    const claves = Object.keys(localStorage).filter(k => k.startsWith('nota__'));
    if (claves.length === 0) {
        mostrarToast('⚠️ No hay notas guardadas para exportar.', 'error');
        return;
    }
    const datos = {};
    claves.forEach(clave => { datos[clave.replace('nota__', '')] = localStorage.getItem(clave); });
    const json          = JSON.stringify(datos, null, 2);
    const blob          = new Blob([json], { type: 'application/json' });
    const url           = URL.createObjectURL(blob);
    const fecha         = new Date().toISOString().slice(0, 10);
    const nombreArchivo = `cuaderno-inframen-${fecha}.json`;
    const a    = document.createElement('a');
    a.href     = url;
    a.download = nombreArchivo;
    a.click();
    URL.revokeObjectURL(url);
    mostrarToast(`⬇ ${claves.length} nota(s) exportadas como "${nombreArchivo}".`, 'exito', 4000);
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
                mostrarToast('❌ El archivo no tiene el formato correcto.', 'error');
                return;
            }
            const entradas = Object.entries(datos);
            if (entradas.length === 0) {
                mostrarToast('⚠️ El archivo está vacío.', 'error');
                return;
            }
            let importadas = 0, errores = 0;
            entradas.forEach(([titulo, contenido]) => {
                if (typeof titulo === 'string' && typeof contenido === 'string') {
                    try {
                        localStorage.setItem('nota__' + titulo, contenido);
                        importadas++;
                    } catch (_) { errores++; }
                }
            });
            if (importadas > 0) {
                mostrarToast(
                    `✅ ${importadas} nota(s) importadas correctamente.` +
                    (errores > 0 ? ` (${errores} fallaron por espacio.)` : ''),
                    'exito', 4000
                );
            } else {
                mostrarToast('❌ No se pudo importar ninguna nota. Almacenamiento lleno.', 'error');
            }
        } catch (err) {
            mostrarToast('❌ Error al leer el archivo. ¿Es un JSON válido?', 'error');
            console.error('[importarNotas]', err);
        }
    };
    reader.readAsText(archivo);
}
