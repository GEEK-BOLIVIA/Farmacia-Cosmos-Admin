import { categoriasModel } from '../models/categoriasModel.js';

export const productManager = {
    _galeriaArchivos: [],
    _portadaArchivo: { tipo: 'local', data: null, url: '' },
    _pasoActual: 1,
    _categoriasSeleccionadas: [],
    _datosTemporales: { ws_active: true, price_visible: true, codigo: '', nombre: '', precio: '', stock: 0, descripcion: '' },
    _resolve: null,
    _originalContent: null,
    _mainContainer: null,
    _padreSeleccionadoId: null,
    _categoriasPadresList: [],

    _htmlEscape(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    },

    // ─────────────────────────────────────────────
    // TOOLTIPS — Tippy.js cargado una sola vez
    // ─────────────────────────────────────────────
    _tippyReady: false,

    async _cargarTippy() {
        if (this._tippyReady || window.tippy) { this._tippyReady = true; return; }
        const loadScript = src => new Promise((res, rej) => {
            const s = document.createElement('script');
            s.src = src; s.onload = res; s.onerror = rej;
            document.head.appendChild(s);
        });
        try {
            await loadScript('https://unpkg.com/@popperjs/core@2/dist/umd/popper.min.js');
            await loadScript('https://unpkg.com/tippy.js@6/dist/tippy-bundle.umd.min.js');
            this._tippyReady = true;
        } catch (e) {
            console.warn('Tippy no pudo cargarse:', e);
        }
    },

    _bindTippy(container) {
        if (!window.tippy || !container) return;
        // Destruir instancias previas para evitar duplicados
        container.querySelectorAll('[data-tippy-content]').forEach(el => {
            if (el._tippy) el._tippy.destroy();
        });
        tippy(container.querySelectorAll('[data-tippy-content]'), {
            theme: 'nexus',
            placement: 'top',
            animation: 'shift-away',
            arrow: true,
            duration: [120, 80],
            offset: [0, 8],
        });
    },

    // ─────────────────────────────────────────────
    // DRAG & DROP — sin re-render al reordenar
    // ─────────────────────────────────────────────
    _initDragGaleria() {
        const container = document.getElementById('galeria-drag-container');
        if (!container) return;

        let dragSrcEl = null;

        const getItems = () => [...container.querySelectorAll('.galeria-item')];

        getItems().forEach(item => {
            // dragstart
            item.addEventListener('dragstart', (e) => {
                dragSrcEl = item;
                e.dataTransfer.effectAllowed = 'move';
                e.dataTransfer.setData('text/plain', item.dataset.id);
                // Usar requestAnimationFrame para que el snapshot del browser se tome primero
                requestAnimationFrame(() => item.classList.add('is-dragging'));
            });

            // dragend
            item.addEventListener('dragend', () => {
                item.classList.remove('is-dragging');
                getItems().forEach(i => i.classList.remove('drag-over'));
                dragSrcEl = null;
            });

            // dragover — necesario para permitir drop
            item.addEventListener('dragover', (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dragSrcEl && item !== dragSrcEl) {
                    getItems().forEach(i => i.classList.remove('drag-over'));
                    item.classList.add('drag-over');
                }
            });

            item.addEventListener('dragleave', (e) => {
                // Solo quitar la clase si realmente salimos del item (no de un hijo)
                if (!item.contains(e.relatedTarget)) {
                    item.classList.remove('drag-over');
                }
            });

            // drop
            item.addEventListener('drop', (e) => {
                e.preventDefault();
                e.stopPropagation();
                item.classList.remove('drag-over');

                if (!dragSrcEl || dragSrcEl === item) return;

                // Insertar en el DOM
                const all = getItems();
                const srcIdx = all.indexOf(dragSrcEl);
                const dstIdx = all.indexOf(item);

                if (srcIdx < dstIdx) container.insertBefore(dragSrcEl, item.nextSibling);
                else container.insertBefore(dragSrcEl, item);

                // Actualizar estado interno y badges sin re-render
                const newOrder = getItems().map(el => el.dataset.id);
                newOrder.forEach((id, idx) => {
                    const archivo = this._galeriaArchivos.find(a => String(a.id) === String(id));
                    if (archivo) archivo.orden = idx + 1;

                    const row = container.querySelector(`[data-id="${id}"]`);
                    const badge = row?.querySelector('.pos-badge');
                    if (badge) badge.textContent = idx + 1;
                });

                this._galeriaArchivos.sort((a, b) => a.orden - b.orden);
            });
        });

        // Aplicar tooltips después de bindear el drag
        this._bindTippy(container);
    },

    // ─────────────────────────────────────────────
    // MOTOR DE CÁMARA
    // ─────────────────────────────────────────────
    _cameraEngine: {
        _stream: null,
        _timerInterval: null,
        async abrir(modo = 'video') {
            return new Promise(async (resolve) => {
                const esVideo = modo === 'video';
                const modalHtml = `
                <div style="background:#000;border-radius:2.5rem;overflow:hidden;position:relative;min-height:500px;">
                    <video id="n-video" autoplay muted playsinline style="width:100%;height:auto;max-height:70vh;object-fit:cover;"></video>
                    <div id="n-overlay" style="display:none;position:absolute;top:30px;left:30px;right:30px;flex-direction:column;gap:15px;z-index:10;">
                        <div style="display:flex;justify-content:space-between;align-items:center;">
                            <div style="color:red;font-weight:900;background:rgba(0,0,0,0.7);padding:8px 20px;border-radius:30px;font-size:12px;display:flex;align-items:center;gap:8px;">
                                <span style="animation:n-pulse 1s infinite;font-size:18px;">●</span> GRABANDO
                            </div>
                            <div id="n-timer" style="color:white;font-weight:900;background:rgba(0,0,0,0.7);padding:8px 20px;border-radius:30px;font-size:14px;font-family:monospace;">00:00 / 01:50</div>
                        </div>
                        <div style="width:100%;height:6px;background:rgba(255,255,255,0.2);border-radius:10px;overflow:hidden;">
                            <div id="n-progress" style="width:0%;height:100%;background:#dc2626;transition:width 1s linear;"></div>
                        </div>
                    </div>
                    <div style="padding:35px;display:flex;justify-content:center;gap:30px;background:#f8fafc;border-top:1px solid #e2e8f0;">
                        ${!esVideo
                        ? `<button id="n-btn-snap" style="width:80px;height:80px;border-radius:50%;background:#2563eb;color:white;border:8px solid #dbeafe;cursor:pointer;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:35px;">photo_camera</span></button>`
                        : `<button id="n-btn-rec" style="width:80px;height:80px;border-radius:50%;background:#dc2626;color:white;border:8px solid #fee2e2;cursor:pointer;display:flex;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:35px;">videocam</span></button>
                               <button id="n-btn-stop" style="display:none;width:80px;height:80px;border-radius:50%;background:#0f172a;color:white;border:8px solid #e2e8f0;cursor:pointer;align-items:center;justify-content:center;"><span class="material-symbols-outlined" style="font-size:35px;">stop</span></button>`
                    }
                    </div>
                    <style>@keyframes n-pulse{0%,100%{opacity:1}50%{opacity:.3}}</style>
                </div>`;
                Swal.fire({
                    title: esVideo ? 'NEXUS VIDEO RECORDER' : 'NEXUS PHOTO STUDIO',
                    html: modalHtml, showConfirmButton: false, width: '900px', background: '#f8fafc', padding: '0',
                    didOpen: async () => {
                        const videoEl = document.getElementById('n-video');
                        const btnSnap = document.getElementById('n-btn-snap');
                        const btnRec = document.getElementById('n-btn-rec');
                        const btnStop = document.getElementById('n-btn-stop');
                        const overlay = document.getElementById('n-overlay');
                        const timerEl = document.getElementById('n-timer');
                        const progressEl = document.getElementById('n-progress');
                        try {
                            this._stream = await navigator.mediaDevices.getUserMedia({
                                video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: esVideo
                            });
                            videoEl.srcObject = this._stream;
                        } catch { Swal.fire('Error', 'No se pudo acceder a la cámara o micrófono', 'error'); }

                        if (!esVideo) {
                            btnSnap.onclick = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = videoEl.videoWidth; canvas.height = videoEl.videoHeight;
                                canvas.getContext('2d').drawImage(videoEl, 0, 0);
                                canvas.toBlob(async blob => { resolve(await this.procesar(blob, 'imagen')); Swal.close(); }, 'image/jpeg', 0.95);
                            };
                        } else {
                            let chunks = [], seconds = 0;
                            btnRec.onclick = () => {
                                const recorder = new MediaRecorder(this._stream);
                                recorder.ondataavailable = e => chunks.push(e.data);
                                recorder.onstop = async () => { clearInterval(this._timerInterval); resolve(await this.procesar(new Blob(chunks, { type: 'video/webm' }), 'video')); };
                                recorder.start();
                                btnRec.style.display = 'none'; btnStop.style.display = 'flex'; overlay.style.display = 'flex';
                                this._timerInterval = setInterval(() => {
                                    seconds++;
                                    timerEl.innerText = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')} / 01:50`;
                                    progressEl.style.width = `${(seconds / 110) * 100}%`;
                                    if (seconds >= 110) { recorder.stop(); Swal.close(); }
                                }, 1000);
                                btnStop.onclick = () => { recorder.stop(); Swal.close(); };
                            };
                        }
                    },
                    willClose: () => {
                        if (this._stream) this._stream.getTracks().forEach(t => t.stop());
                        if (this._timerInterval) clearInterval(this._timerInterval);
                    }
                });
            });
        },
        async procesar(blob, tipo) {
            const ext = tipo === 'video' ? 'webm' : 'jpg';
            const file = new File([blob], `nexus_${Date.now()}.${ext}`, { type: tipo === 'video' ? 'video/webm' : 'image/jpeg' });
            return { archivo: file, url: URL.createObjectURL(file), tipo, nombre: file.name };
        }
    },

    // ─────────────────────────────────────────────
    // INICIALIZACIÓN
    // ─────────────────────────────────────────────
    async start(containerId, categoriasHijas, dPrevios = {}, categoriasPadres = []) {
        this._mainContainer = document.getElementById(containerId);
        if (!this._mainContainer) return;

        this._galeriaArchivos = [];
        this._categoriasSeleccionadas = [];
        this._portadaArchivo = { tipo: 'local', data: null, url: '' };
        this._pasoActual = 1;
        this._padreSeleccionadoId = null;
        this._originalContent = this._mainContainer.innerHTML;
        window.categoriasRaw = categoriasHijas || [];
        this._categoriasPadresList = Array.isArray(categoriasPadres) ? categoriasPadres : [];

        const codigoPrev = dPrevios.codigo != null ? String(dPrevios.codigo).replace(/\D/g, '').slice(0, 13) : '';
        this._datosTemporales = {
            codigo: codigoPrev,
            nombre: dPrevios.nombre || '',
            precio: dPrevios.precio || '',
            stock: dPrevios.stock || 0,
            descripcion: dPrevios.descripcion || '',
            ws_active: dPrevios.ws_active !== undefined ? dPrevios.ws_active : true,
            price_visible: dPrevios.price_visible !== undefined ? dPrevios.price_visible : true,
            id: dPrevios.id || null
        };

        const prevIds = dPrevios.categoriasIds;
        const firstId = Array.isArray(prevIds) && prevIds.length ? Number(prevIds[0]) : null;
        if (firstId != null && !Number.isNaN(firstId)) {
            const hijas = categoriasHijas || [];
            const padres = this._categoriasPadresList;
            const asHija = hijas.find(h => Number(h.id) === firstId);
            if (asHija) {
                this._padreSeleccionadoId = Number(asHija.id_padre);
                this._categoriasSeleccionadas = [firstId];
            } else if (padres.some(p => Number(p.id) === firstId)) {
                this._padreSeleccionadoId = firstId;
                const tieneHijos = hijas.some(h => Number(h.id_padre) === firstId);
                if (!tieneHijos) this._categoriasSeleccionadas = [firstId];
            }
        }

        if (Array.isArray(dPrevios.galeria)) {
            this._galeriaArchivos = dPrevios.galeria.map((item, index) => {
                const url = item.url || item.file_url;
                return {
                    id: item.id || `db-${index}`, tipo: item.tipo || 'imagen',
                    url, file: null,
                    thumb: item.tipo === 'video' ? 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png' : url,
                    nombre: item.nombre || 'Archivo guardado',
                    orden: item.orden !== undefined ? parseInt(item.orden) : index
                };
            }).sort((a, b) => a.orden - b.orden);
        }

        const pathPortada = dPrevios.portada || dPrevios.imagen_url;
        if (pathPortada) {
            this._portadaArchivo = typeof pathPortada === 'string'
                ? { tipo: 'url', url: pathPortada, data: null }
                : { tipo: 'local', data: pathPortada, url: URL.createObjectURL(pathPortada) };
        }

        // Precargar Tippy en background
        this._cargarTippy();

        this.render();
        this.injectStyles();
        return new Promise(resolve => { this._resolve = resolve; });
    },

    // ─────────────────────────────────────────────
    // RENDER PRINCIPAL
    // ─────────────────────────────────────────────
    render() { this.updateUI(); },

    updateUI() {
        const container = this._mainContainer;
        const d = this._datosTemporales;
        const hijosPadre = this._padreSeleccionadoId != null
            ? (window.categoriasRaw || []).filter(h => Number(h.id_padre) === Number(this._padreSeleccionadoId))
            : [];
        const padreNombre = this._padreSeleccionadoId != null
            ? (this._categoriasPadresList || []).find(p => Number(p.id) === Number(this._padreSeleccionadoId))?.nombre || ''
            : '';
        const selId = this._categoriasSeleccionadas[0];
        const selObj = selId != null
            ? ((window.categoriasRaw || []).find(c => Number(c.id) === Number(selId))
                || (this._categoriasPadresList || []).find(c => Number(c.id) === Number(selId)))
            : null;
        const seleccionadas = selObj ? [selObj] : [];

        const previewCategoriasHtml = seleccionadas.length === 0
            ? `<p class="text-[11px] text-slate-400 leading-relaxed">Sin categorías. Asigna al menos una en el paso <span class="font-medium text-slate-500">Categorías</span>.</p>`
            : `<div class="flex flex-wrap gap-1.5">${seleccionadas.map(s =>
                `<span class="inline-flex max-w-full truncate px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-medium text-slate-700 shadow-sm" title="${this._htmlEscape(s.nombre)}">${this._htmlEscape(s.nombre)}</span>`
            ).join('')}</div>`;

        container.innerHTML = `
        <div class="h-full min-h-0 w-full flex flex-col overflow-y-auto lg:overflow-hidden bg-slate-100/90 custom-scrollbar px-5 pt-4 pb-5 lg:px-8 lg:pt-5 lg:pb-6">

            <header class="shrink-0 flex flex-wrap items-center justify-between gap-4 mb-5 lg:mb-6 max-w-[1360px] mx-auto w-full border-b border-slate-200/80 pb-4">
                <div class="min-w-0 flex-1 pr-2">
                    <p class="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Editor de producto</p>
                    <p class="text-sm text-slate-600 mt-0.5">Completa los pasos y revisa la vista previa a la derecha.</p>
                </div>
                <button type="button" onclick="window.productManager.cancelarEdicion()"
                        class="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-lg shadow-sm hover:bg-slate-50 hover:text-red-700 hover:border-red-200 transition-colors shrink-0 ml-auto lg:ml-0">
                    <span class="material-symbols-outlined text-[20px] text-slate-500">close</span>
                    Cerrar
                </button>
            </header>

            <div class="max-w-[1360px] mx-auto w-full grid grid-cols-12 gap-6 lg:gap-10 lg:flex-1 lg:min-h-0 lg:h-full lg:grid-rows-1 lg:items-stretch">

                <!-- FORMULARIO -->
                <div class="col-span-12 lg:col-span-7 bg-white rounded-xl shadow-sm border border-slate-200/90 flex flex-col min-h-[800px] lg:min-h-0 lg:h-full lg:max-h-full overflow-hidden">

                    <div class="flex shrink-0 items-stretch border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-hidden gap-px">
                        ${this._renderTab(1, 'edit_square', 'Información')}
                        ${this._renderTab(2, 'account_tree', 'Categorías')}
                        ${this._renderTab(3, 'perm_media', 'Multimedia')}
                    </div>

                    <div class="p-6 sm:p-8 flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">

                        <!-- PASO 1 -->
                        <div class="${this._pasoActual === 1 ? 'block' : 'hidden'} space-y-5">
                            <div>
                                <h3 class="text-sm font-semibold text-slate-900 mb-1">Datos generales</h3>
                                <p class="text-xs text-slate-500 mb-4">Información visible para clientes en catálogo.</p>
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-xs font-medium text-slate-600">Código de producto <span class="text-red-500 font-semibold">*</span></label>
                                <p class="text-[11px] text-slate-500">13 dígitos numéricos (obligatorio).</p>
                                <input type="text" inputmode="numeric" pattern="[0-9]*" maxlength="13" autocomplete="off"
                                       value="${d.codigo || ''}"
                                       oninput="window.productManager.sincronizarCodigo(this)"
                                       placeholder="Ej. 7790123456789"
                                       class="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 font-mono tracking-widest placeholder:text-slate-400 placeholder:tracking-normal outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow">
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-xs font-medium text-slate-600">Nombre del producto</label>
                                <input type="text" value="${d.nombre}" oninput="window.productManager.sync(this,'nombre')"
                                       class="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow">
                            </div>
                            <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                <div class="space-y-1.5">
                                    <label class="block text-xs font-medium text-slate-600">Precio (Bs)</label>
                                    <input type="number" step="any" value="${d.precio}" oninput="window.productManager.sync(this,'precio')"
                                           class="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow">
                                </div>
                                <div class="space-y-1.5">
                                    <label class="block text-xs font-medium text-slate-600">Stock</label>
                                    <input type="number" value="${d.stock}" oninput="window.productManager.sync(this,'stock')"
                                           class="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow">
                                </div>
                            </div>
                            <div class="space-y-1.5">
                                <label class="block text-xs font-medium text-slate-600">Descripción</label>
                                <textarea oninput="window.productManager.sync(this,'descripcion')"
                                          rows="5"
                                          class="w-full bg-white border border-slate-200 rounded-lg px-3.5 py-2.5 text-sm text-slate-900 resize-y min-h-[7rem] outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-shadow">${d.descripcion}</textarea>
                            </div>
                        </div>

                        <!-- PASO 2 -->
                        <div class="${this._pasoActual === 2 ? 'block' : 'hidden'} space-y-4">
                            <div>
                                <h3 class="text-sm font-semibold text-slate-900 mb-1">Clasificación</h3>
                                <p class="text-xs text-slate-500">Seleccione la Categoría y si tiene subcategorías, una sola. Si no tiene subcategorias, el producto se asociará a la categoría.</p>
                            </div>
                            <div class="space-y-1.5">
                                <div class="flex items-center justify-between gap-2">
                                    <label class="block text-xs font-medium text-slate-600">Categoría <span class="text-red-500">*</span></label>
                                    <div class="flex items-center gap-1.5 shrink-0">
                                        <button type="button" onclick="window.productManager.mostrarFormCrearCategoria()"
                                                class="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 hover:border-blue-300 transition-colors"
                                                data-tippy-content="Crear nueva categoría">
                                            <span class="material-symbols-outlined text-[14px]">add_circle</span> Categoría
                                        </button>
                                        <button type="button" onclick="window.productManager.mostrarFormCrearSubcategoria()"
                                                class="inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md hover:bg-emerald-100 hover:border-emerald-300 transition-colors"
                                                data-tippy-content="Crear nueva subcategoría">
                                            <span class="material-symbols-outlined text-[14px]">add_circle</span> Subcategoría
                                        </button>
                                    </div>
                                </div>
                                <select id="pm-select-categoria-padre"
                                        onchange="window.productManager.onCambioPadre(this.value)"
                                        class="w-full bg-white border border-slate-200 rounded-lg px-3 py-2.5 text-sm text-slate-900 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500">
                                    <option value="">— Seleccione una Categoría —</option>
                                    ${(this._categoriasPadresList || []).map(p => `
                                        <option value="${p.id}" ${Number(this._padreSeleccionadoId) === Number(p.id) ? 'selected' : ''}>${this._htmlEscape(p.nombre)}</option>
                                    `).join('')}
                                </select>
                            </div>
                            <div class="grid grid-cols-1 md:grid-cols-2 gap-4 h-[min(26rem,50vh)] md:h-[26rem]">
                                <div class="overflow-y-auto custom-scrollbar rounded-lg p-3 bg-slate-50 border border-slate-200 min-h-[8rem]">
                                    ${this._padreSeleccionadoId == null
                ? `<p class="text-center text-slate-400 text-xs py-10 px-2">Seleccione una categoría para ver subcategorías o asociar el producto.</p>`
                : hijosPadre.length === 0
                    ? `<p class="text-center text-slate-600 text-xs py-10 px-3 leading-relaxed">
                            <span class="font-semibold text-slate-800">«${this._htmlEscape(padreNombre)}»</span> no tiene subcategorías.
                            <span class="block mt-2 text-slate-400">El producto quedará vinculado a esta Categoría.</span>
                       </p>`
                    : hijosPadre.map(h => {
                        const activa = Number(this._categoriasSeleccionadas[0]) === Number(h.id);
                        return `
                            <button type="button" onclick="window.productManager.toggleHija(${h.id})"
                                    class="w-full text-left px-3 py-2.5 rounded-md border mb-1.5 transition-colors flex justify-between items-center gap-2
                                           ${activa ? 'border-blue-500 bg-blue-50 text-blue-900' : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-slate-50'}">
                                <span class="text-xs font-medium">${this._htmlEscape(h.nombre)}</span>
                                <span class="material-symbols-outlined text-[18px] shrink-0 ${activa ? 'text-blue-600' : 'text-slate-300'}">${activa ? 'check_circle' : 'radio_button_unchecked'}</span>
                            </button>`;
                    }).join('')
            }
                                </div>
                                <div class="overflow-y-auto custom-scrollbar rounded-lg p-3 bg-white border border-slate-200 min-h-[8rem]">
                                    <p class="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 px-1">Categoría del producto</p>
                                    ${seleccionadas.length === 0
                ? `<p class="text-center text-slate-400 text-xs py-10">Ninguna categoría seleccionada</p>`
                : seleccionadas.map(s => `
                                            <div class="flex justify-between items-center gap-2 px-3 py-2.5 bg-slate-50 rounded-md border border-slate-200">
                                                <span class="text-xs font-medium text-slate-800">${this._htmlEscape(s.nombre)}</span>
                                                <button type="button" onclick="window.productManager.limpiarCategoriaProducto()" class="text-slate-400 hover:text-red-600 p-0.5 rounded transition-colors" title="Quitar">
                                                    <span class="material-symbols-outlined text-[18px]">close</span>
                                                </button>
                                            </div>`).join('')
            }
                                </div>
                            </div>
                        </div>

                        <!-- PASO 3 -->
                        <div class="${this._pasoActual === 3 ? 'block' : 'hidden'} space-y-5">

                            <!-- Portada -->
                            <div>
                                <h3 class="text-sm font-semibold text-slate-900 mb-1">Imagen de portada</h3>
                                <p class="text-xs text-slate-500 mb-3">Se mostrará como imagen principal del producto.</p>
                                <div class="relative group aspect-video bg-slate-100 rounded-lg overflow-hidden border border-dashed border-slate-300 flex items-center justify-center">
                                    ${this._portadaArchivo.url
                ? `<img src="${this._portadaArchivo.url}" alt="" class="w-full h-full object-cover">`
                : `<div class="flex flex-col items-center gap-2 text-slate-400">
                                               <span class="material-symbols-outlined text-5xl opacity-50">add_photo_alternate</span>
                                               <p class="text-xs">Pase el cursor para añadir</p>
                                           </div>`
            }
                                    <div class="absolute inset-0 bg-slate-900/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-wrap items-center justify-center gap-2 p-3">
                                        <button type="button" onclick="window.productManager.cambiarPortada('local')"
                                                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white text-slate-800 text-xs font-medium shadow-sm hover:bg-slate-50">
                                            <span class="material-symbols-outlined text-[18px]">upload_file</span> Subir
                                        </button>
                                        <button type="button" onclick="window.productManager.cambiarPortada('url')"
                                                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white text-slate-800 text-xs font-medium shadow-sm hover:bg-slate-50">
                                            <span class="material-symbols-outlined text-[18px]">link</span> URL
                                        </button>
                                        <button type="button" onclick="window.productManager.cambiarPortada('camera')"
                                                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white text-slate-800 text-xs font-medium shadow-sm hover:bg-slate-50">
                                            <span class="material-symbols-outlined text-[18px]">photo_camera</span> Cámara
                                        </button>
                                        ${this._portadaArchivo.url ? `
                                        <button type="button" onclick="window.productManager.verPortadaAmpliada()"
                                                class="inline-flex items-center gap-1.5 px-3 py-2 rounded-md bg-white/15 text-white text-xs font-medium border border-white/30 hover:bg-white/25">
                                            <span class="material-symbols-outlined text-[18px]">fullscreen</span> Ampliar
                                        </button>` : ''}
                                    </div>
                                </div>
                            </div>

                            <!-- Galería -->
                            <div>
                                <div class="flex flex-wrap items-center justify-between gap-2 mb-2">
                                    <div class="flex items-center gap-2">
                                        <span class="text-sm font-semibold text-slate-900">Galería</span>
                                        ${this._galeriaArchivos.length > 0
                ? `<span class="inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1.5 rounded bg-slate-100 text-slate-600 text-[11px] font-medium">${this._galeriaArchivos.length}</span>`
                : ''}
                                    </div>
                                    ${this._galeriaArchivos.length > 1
                ? `<span class="text-[11px] text-slate-500 inline-flex items-center gap-1">
                                               <span class="material-symbols-outlined text-sm text-slate-400">drag_indicator</span>
                                               Arrastre para reordenar
                                           </span>` : ''}
                                </div>

                                <div class="max-h-72 overflow-y-auto custom-scrollbar pr-0.5">
                                    ${this._renderGaleriaList()}
                                </div>

                                <button type="button" onclick="window.productManager.addGaleriaManual()"
                                        class="mt-3 w-full py-3 border border-dashed border-slate-300 rounded-lg text-sm font-medium text-slate-600 hover:border-blue-400 hover:text-blue-700 hover:bg-blue-50/50 transition-colors inline-flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-[20px]">add</span> Agregar archivo
                                </button>
                            </div>
                        </div>

                    </div>

                    <!-- FOOTER -->
                    <div class="px-5 py-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex shrink-0 flex-wrap items-center justify-between gap-3 rounded-b-xl">
                        <button type="button" onclick="window.productManager._pasoActual--; window.productManager.updateUI()"
                                class="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-slate-600 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition-colors ${this._pasoActual === 1 ? 'invisible pointer-events-none' : ''}">
                            <span class="material-symbols-outlined text-[18px]">arrow_back</span> Atrás
                        </button>
                        <div class="flex items-center gap-1.5 order-last sm:order-none w-full sm:w-auto justify-center sm:justify-start" aria-hidden="true">
                            ${[1, 2, 3].map(n => `<span class="h-1.5 rounded-full transition-all ${n === this._pasoActual ? 'bg-blue-600 w-6' : n < this._pasoActual ? 'bg-blue-300 w-1.5' : 'bg-slate-300 w-1.5'}"></span>`).join('')}
                        </div>
                        <button type="button" onclick="window.productManager.navSiguiente()"
                                class="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white text-sm font-semibold rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors">
                            ${this._pasoActual === 3
                ? `<span class="material-symbols-outlined text-[18px]">save</span> Guardar`
                : `Siguiente <span class="material-symbols-outlined text-[18px]">arrow_forward</span>`}
                        </button>
                    </div>
                </div>

                <!-- PREVIEW -->
                <div class="col-span-12 lg:col-span-5 min-h-0 flex flex-col lg:h-full">
                    <div class="sticky top-4 lg:top-6 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col lg:min-h-0 lg:h-full lg:max-h-full ring-1 ring-slate-900/[0.04]">
                        <div class="shrink-0 px-4 py-3 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-white flex items-center justify-between gap-3">
                            <div class="flex items-center gap-2 min-w-0">
                                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-sm">
                                    <span class="material-symbols-outlined text-[18px]">visibility</span>
                                </span>
                                <div class="min-w-0">
                                    <span class="block text-xs font-semibold text-slate-800 tracking-tight">Vista previa</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex-1 min-h-0 overflow-y-auto overflow-x-hidden custom-scrollbar">
                            <div class="p-4 sm:p-5 flex flex-col gap-4 min-h-full">
                                <div class="rounded-xl overflow-hidden border border-slate-200 bg-slate-100 aspect-[4/3] relative shadow-inner">
                            ${this._portadaArchivo.url
                ? `<img src="${this._portadaArchivo.url}" alt="" class="w-full h-full object-cover">`
                : `<div class="w-full h-full flex flex-col items-center justify-center text-slate-300 bg-slate-50"><span class="material-symbols-outlined text-5xl opacity-35">image</span><span class="text-xs mt-2 text-slate-400 font-medium">Añada una imagen de portada</span></div>`
            }
                                </div>

                                <div class="grid grid-cols-2 gap-3">
                                    <div class="col-span-2 rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
                                        <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Código</span>
                                        <p class="mt-1 font-mono text-sm font-semibold text-slate-900 tracking-wider tabular-nums break-all">
                                            <span class="preview-codigo">${d.codigo ? this._htmlEscape(d.codigo) : '—'}</span>
                                        </p>
                                    </div>
                                    <div class="rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
                                        <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Stock</span>
                                        <p class="mt-1 text-lg font-semibold text-slate-900 tabular-nums leading-none">
                                            <span class="preview-stock">${d.stock}</span><span class="text-xs font-normal text-slate-500 ml-1">uds.</span>
                                        </p>
                                    </div>
                                    <div class="rounded-lg border border-slate-200 bg-slate-50/80 p-3 shadow-sm">
                                        <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Galería</span>
                                        <p class="mt-1 text-lg font-semibold text-slate-900 tabular-nums leading-none">
                                            <span class="preview-galeria-count">${this._galeriaArchivos.length}</span><span class="text-xs font-normal text-slate-500 ml-1">archivos</span>
                                        </p>
                                    </div>
                                </div>

                                <div class="space-y-1">
                                    <h2 class="preview-nombre text-lg font-semibold text-slate-900 leading-snug break-words">${this._htmlEscape(d.nombre) || 'Nombre del producto'}</h2>
                                    <p class="text-[11px] text-slate-400">Título público del producto</p>
                                </div>

                                <div class="space-y-1.5">
                                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Categorías</span>
                                    <div class="preview-categorias-wrap">${previewCategoriasHtml}</div>
                                </div>

                                <div class="space-y-1.5 flex-1 min-h-0 flex flex-col">
                                    <span class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide">Descripción</span>
                                    <div class="preview-descripcion flex-1 min-h-[4.5rem] max-h-36 overflow-y-auto custom-scrollbar rounded-lg border border-slate-200 bg-slate-50/60 px-3 py-2.5 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">${String(d.descripcion || '').trim()
                ? this._htmlEscape(d.descripcion)
                : '<span class="text-slate-400 italic">Sin descripción aún</span>'}</div>
                                </div>

                                <div class="preview-price-box mt-auto pt-4 border-t border-slate-200" style="opacity:${d.price_visible ? '1' : '0'}">
                                    <div class="flex items-end justify-between gap-3">
                                        <div>
                                            <p class="text-[10px] font-semibold text-slate-500 uppercase tracking-wide mb-1">Precio de venta</p>
                                            <p class="text-2xl font-semibold text-slate-900 tracking-tight tabular-nums">
                                                <span class="preview-precio">${this._htmlEscape(d.precio) || '0.00'}</span>
                                                <span class="text-sm font-medium text-slate-500 ml-1">Bs</span>
                                            </p>
                                        </div>
                                        <span class="material-symbols-outlined text-slate-200 text-4xl hidden sm:block" aria-hidden="true">payments</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        // Paso 3: inicializar drag DESPUÉS de que el DOM esté completamente pintado
        if (this._pasoActual === 3) {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    this._initDragGaleria();
                });
            });
        }

    },

    // ─────────────────────────────────────────────
    // GALERÍA RENDER — badges de posición visibles
    // ─────────────────────────────────────────────
    _renderGaleriaList() {
        if (this._galeriaArchivos.length === 0) {
            return `
            <div class="py-12 text-center rounded-lg border border-dashed border-slate-200 bg-slate-50">
                <span class="material-symbols-outlined text-4xl text-slate-300">photo_library</span>
                <p class="text-slate-500 text-xs font-medium mt-2">Sin archivos en la galería</p>
            </div>`;
        }

        return `<div id="galeria-drag-container" class="space-y-1.5">
            ${this._galeriaArchivos.map((item, index) => `
            <div class="galeria-item flex items-center gap-3 p-2.5 bg-white rounded-lg border border-slate-200 hover:border-slate-300 transition-colors"
                 draggable="true"
                 data-id="${item.id}">

                <!-- Handle — cursor explícito en este elemento -->
                <div class="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing select-none"
                     style="touch-action:none;">
                    <span class="material-symbols-outlined text-xl leading-none">drag_indicator</span>
                </div>

                <!-- Badge posición -->
                <div class="flex-shrink-0 w-7 h-7 rounded-md bg-slate-100 border border-slate-200 flex items-center justify-center select-none">
                    <span class="pos-badge text-[11px] font-semibold text-slate-600 leading-none">${index + 1}</span>
                </div>

                <!-- Miniatura -->
                <div class="w-11 h-11 rounded-md overflow-hidden bg-slate-100 flex-shrink-0 relative pointer-events-none border border-slate-100">
                    <img src="${item.thumb || item.url}" class="w-full h-full object-cover" loading="lazy" draggable="false">
                    ${item.tipo === 'video'
                ? `<span class="material-symbols-outlined absolute inset-0 flex items-center justify-center text-white bg-black/30 text-base">play_circle</span>`
                : ''}
                </div>

                <!-- Nombre y tipo -->
                <div class="flex-1 min-w-0 pointer-events-none select-none">
                    <p class="text-xs font-medium text-slate-800 truncate leading-tight">${item.nombre}</p>
                    <p class="text-[11px] text-slate-500 mt-0.5 capitalize">${item.tipo}</p>
                </div>

                <!-- Acciones con Tippy (data-tippy-content) -->
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button type="button"
                        data-tippy-content="Previsualizar"
                        onclick="window.productManager.verPreviewAmpliado('${item.url}','${item.tipo}')"
                        class="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 border border-slate-200 hover:bg-slate-100 hover:text-slate-800 transition-colors">
                        <span class="material-symbols-outlined text-[18px] pointer-events-none">visibility</span>
                    </button>
                    <button type="button"
                        data-tippy-content="Eliminar archivo"
                        onclick="window.productManager.eliminarArchivo('${item.id}')"
                        class="w-8 h-8 flex items-center justify-center rounded-md text-slate-500 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors">
                        <span class="material-symbols-outlined text-[18px] pointer-events-none">delete</span>
                    </button>
                </div>
            </div>`).join('')}
        </div>`;
    },

    // ─────────────────────────────────────────────
    // PORTADA — modal ampliado
    // ─────────────────────────────────────────────
    verPortadaAmpliada() {
        if (!this._portadaArchivo.url) return;
        Swal.fire({
            html: `
        <img src="${this._portadaArchivo.url}" class="w-full rounded-2xl object-contain" style="max-height:80vh;">
        <div class="mt-4 flex justify-center">
            <label class="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-black uppercase transition-all flex items-center gap-2 cursor-pointer">
                <span class="material-symbols-outlined text-sm">upload_file</span> Cambiar portada
                <input type="file" accept="image/*" class="hidden" id="input-cambiar-portada-ampliada">
            </label>
        </div>`,
            showConfirmButton: false,
            background: 'transparent',
            width: '860px',
            backdrop: 'rgba(15,23,42,0.96)',
            showCloseButton: true,
            didOpen: () => {
                document.getElementById('input-cambiar-portada-ampliada')?.addEventListener('change', (e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    // ✅ Actualizar portada directamente sin otro Swal
                    this._portadaArchivo = {
                        tipo: 'imagen',
                        data: file,
                        url: URL.createObjectURL(file)
                    };
                    Swal.close();
                    this.updateUI();
                });
            }
        });
    },

    // ─────────────────────────────────────────────
    // VIDEO PLAYER
    // ─────────────────────────────────────────────
    obtenerInfoVideo(url, file = null) {
        if (!url && !file) return { tipo: 'imagen', thumb: '', esArchivo: false };
        if (file instanceof File) {
            const esVideo = file.type.startsWith('video/');
            const blobUrl = URL.createObjectURL(file);
            return { tipo: esVideo ? 'video' : 'imagen', esArchivo: esVideo, thumb: esVideo ? 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png' : blobUrl, url: blobUrl };
        }
        const s = String(url);
        if (s.startsWith('blob:')) { const it = this._galeriaArchivos.find(i => i.url === s); if (it?.tipo === 'video') return { tipo: 'video', esArchivo: true, thumb: 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png', url: s }; }
        if (s.match(/\.(mp4|webm|ogg|mov|m4v)($|\?)/i)) return { tipo: 'video', esArchivo: true, thumb: 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png', url: s };
        const yt = s.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (yt) return { tipo: 'youtube', id: yt[1], thumb: `https://img.youtube.com/vi/${yt[1]}/hqdefault.jpg`, url: s };
        if (s.includes('facebook.com') || s.includes('fb.watch')) return { tipo: 'facebook', thumb: 'https://cdn-icons-png.flaticon.com/512/124/124010.png', url: s };
        if (s.includes('instagram.com')) return { tipo: 'instagram', thumb: 'https://cdn-icons-png.flaticon.com/512/174/174855.png', url: s };
        if (s.includes('tiktok.com')) { const tkId = s.split('/video/')[1]?.split('?')[0]; return { tipo: 'tiktok', id: tkId, thumb: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png', url: s }; }
        return { tipo: 'imagen', thumb: s, url: s, esArchivo: false };
    },

    renderVideoPlayer(url) {
        if (!url) return `<div class="p-10 text-center rounded-2xl bg-slate-100">URL no válida</div>`;
        const info = this.obtenerInfoVideo(url);
        if (info.esArchivo || url.startsWith('blob:')) return `<video src="${url}" controls autoplay class="w-full rounded-2xl bg-black" style="max-height:500px;"></video>`;
        let src = '', asp = '56.25%';
        if (info.tipo === 'youtube') src = `https://www.youtube.com/embed/${info.id}?autoplay=1&rel=0`;
        if (info.tipo === 'facebook') { src = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`; asp = '75%'; }
        if (info.tipo === 'instagram') { src = url.split('?')[0].replace(/\/$/, '') + '/embed'; asp = '125%'; }
        if (info.tipo === 'tiktok' && info.id) { src = `https://www.tiktok.com/embed/v2/${info.id}`; asp = '177%'; }
        if (src) return `<div style="position:relative;width:100%;padding-top:${asp};background:#000;border-radius:1.5rem;overflow:hidden;"><iframe src="${src}" style="position:absolute;top:0;left:0;width:100%;height:100%;" frameborder="0" allow="autoplay;fullscreen" allowfullscreen></iframe></div>`;
        return `<div class="p-10 text-center rounded-2xl bg-slate-100">No se pudo cargar el reproductor</div>`;
    },

    verPreviewAmpliado(url, tipo = 'image') {
        if (!url) return;
        const info = this.obtenerInfoVideo(url);
        const esVideo = tipo === 'video' || info.tipo !== 'imagen';
        Swal.fire({
            html: esVideo ? this.renderVideoPlayer(url) : `<img src="${url}" class="w-full rounded-2xl object-contain" style="max-height:85vh;">`,
            showConfirmButton: false, background: 'transparent',
            width: (info.tipo === 'tiktok' || info.tipo === 'instagram') ? '400px' : '860px',
            backdrop: 'rgba(15,23,42,0.96)', showCloseButton: true
        });
    },

    // ─────────────────────────────────────────────
    // SYNC, PORTADA, GALERÍA, CATEGORÍAS
    // ─────────────────────────────────────────────
    sincronizarCodigo(el) {
        const solo = String(el?.value ?? '').replace(/\D/g, '').slice(0, 13);
        if (el) el.value = solo;
        this._datosTemporales.codigo = solo;
        const t = document.querySelector('.preview-codigo');
        if (t) t.textContent = solo || '—';
    },

    sync(el, campo, type = 'text') {
        this._datosTemporales[campo] = type === 'checkbox' ? el.checked : el.value;
        const map = { nombre: '.preview-nombre', stock: '.preview-stock', precio: '.preview-precio' };
        if (map[campo]) {
            const t = document.querySelector(map[campo]);
            if (!t) return;
            if (campo === 'nombre') t.textContent = el.value || 'Nombre del producto';
            else if (campo === 'stock') t.textContent = el.value === '' ? '0' : el.value;
            else if (campo === 'precio') t.textContent = (el.value === '' || el.value == null) ? '0.00' : String(el.value);
        }
        if (campo === 'descripcion') {
            const t = document.querySelector('.preview-descripcion');
            if (t) {
                const v = (el.value || '').trim();
                if (!v) t.innerHTML = '<span class="text-slate-400 italic">Sin descripción aún</span>';
                else t.textContent = v;
            }
        }
        if (campo === 'price_visible') { const b = document.querySelector('.preview-price-box'); if (b) b.style.opacity = el.checked ? '1' : '0'; }
    },

    async cambiarPortada(metodo) {
        if (metodo === 'camera') {
            const cap = await this._cameraEngine.abrir('foto');
            if (cap) { this._portadaArchivo = { tipo: 'imagen', data: cap.archivo, url: cap.url }; this.updateUI(); }
            return;
        }
        if (metodo === 'local') {
            const { value: file } = await Swal.fire({ title: 'Seleccionar imagen de portada', input: 'file', inputAttributes: { accept: 'image/*' } });
            if (file) { this._portadaArchivo = { tipo: 'imagen', data: file, url: URL.createObjectURL(file) }; this.updateUI(); }
        } else {
            const { value: url } = await Swal.fire({ title: 'Vincular URL de imagen', input: 'url', inputPlaceholder: 'https://...' });
            if (url) { this._portadaArchivo = { tipo: 'imagen', data: null, url }; this.updateUI(); }
        }
    },

    async addGaleriaManual() {
        const { value: fv } = await Swal.fire({
            title: 'Agregar archivo', width: '600px',
            html: `
            <div class="grid grid-cols-2 gap-6 p-4 text-left">
                <div>
                    <label class="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Tipo</label>
                    <select id="swal-tipo" class="w-full bg-slate-100 border-none rounded-xl p-4 font-bold outline-none">
                        <option value="imagen">Imagen</option><option value="video">Video</option>
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Origen</label>
                    <select id="swal-metodo" class="w-full bg-slate-100 border-none rounded-xl p-4 font-bold outline-none">
                        <option value="url">URL / Enlace</option>
                        <option value="local">Archivo Local</option>
                        <option value="camera">Cámara Nexus</option>
                    </select>
                </div>
            </div>`,
            confirmButtonText: 'Continuar',
            preConfirm: () => [document.getElementById('swal-tipo').value, document.getElementById('swal-metodo').value]
        });
        if (!fv) return;
        const [tipoManual, metodo] = fv;
        let url = '', file = null, nombre = '';

        if (metodo === 'camera') {
            const res = await this._cameraEngine.abrir(tipoManual);
            if (res) { url = res.url; file = res.archivo; nombre = res.nombre; }
        } else if (metodo === 'local') {
            const { value: f } = await Swal.fire({ title: 'Seleccionar archivo(s)', input: 'file', inputAttributes: { accept: tipoManual === 'video' ? 'video/*' : 'image/*', multiple: 'multiple' } });
            if (f) {
                const archivos = f instanceof FileList ? Array.from(f) : [f];
                for (const archivo of archivos) {
                    this._galeriaArchivos.push({
                        id: Date.now().toString() + Math.random(), tipo: tipoManual,
                        url: URL.createObjectURL(archivo), file: archivo,
                        thumb: tipoManual === 'video' ? 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png' : URL.createObjectURL(archivo),
                        nombre: archivo.name, orden: this._galeriaArchivos.length + 1
                    });
                }
                this._galeriaArchivos.sort((a, b) => a.orden - b.orden);
                this.updateUI(); return;
            }
        } else {
            const { value: u } = await Swal.fire({ title: 'Pegar URL del archivo', input: 'url', inputPlaceholder: 'https://...' });
            if (u) { url = u; nombre = tipoManual === 'video' ? 'Video externo' : 'Imagen externa'; }
        }

        if (url) {
            this._galeriaArchivos.push({
                id: Date.now().toString() + Math.random(), tipo: tipoManual, url, file,
                thumb: tipoManual === 'video' ? 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png' : url,
                nombre, orden: this._galeriaArchivos.length + 1
            });
            this._galeriaArchivos.sort((a, b) => a.orden - b.orden);
            this.updateUI();
        }
    },

    eliminarArchivo(id) {
        this._galeriaArchivos = this._galeriaArchivos.filter(i => i.id != id);
        this._galeriaArchivos.forEach((item, idx) => { item.orden = idx + 1; });
        this.updateUI();
    },


    onCambioPadre(val) {
        const pid = val === '' || val == null ? null : parseInt(String(val), 10);
        if (pid == null || Number.isNaN(pid)) {
            this._padreSeleccionadoId = null;
            this._categoriasSeleccionadas = [];
            this.updateUI();
            return;
        }
        this._padreSeleccionadoId = pid;
        const hijos = (window.categoriasRaw || []).filter(h => Number(h.id_padre) === pid);
        if (hijos.length === 0) {
            this._categoriasSeleccionadas = [pid];
        } else {
            const cur = this._categoriasSeleccionadas[0];
            if (cur != null && !hijos.some(h => Number(h.id) === Number(cur))) {
                this._categoriasSeleccionadas = [];
            }
        }
        this.updateUI();
    },

    limpiarCategoriaProducto() {
        this._categoriasSeleccionadas = [];
        this.updateUI();
    },

    toggleHija(id) {
        const n = Number(id);
        if (Number(this._categoriasSeleccionadas[0]) === n) this._categoriasSeleccionadas = [];
        else this._categoriasSeleccionadas = [n];
        this.updateUI();
    },

    // ─────────────────────────────────────────────
    // CREAR CATEGORÍA Y SUBCATEGORÍA
    // ─────────────────────────────────────────────
    async mostrarFormCrearCategoria() {
        const { value: formValues } = await Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Nueva Categoría</span>',
            html: `
                <div class="text-left space-y-5 pt-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Categoría</label>
                        <input id="swal-nombre-cat" type="text"
                               class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl p-4 font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none"
                               placeholder="Ej. Medicamentos, Cosméticos...">
                    </div>
                </div>`,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            didOpen: () => {
                const input = document.getElementById('swal-nombre-cat');
                if (input) input.focus();
            },
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-blue-600',
                cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-slate-100 text-slate-500'
            },
            preConfirm: () => {
                const nombreVal = document.getElementById('swal-nombre-cat').value.trim();
                if (!nombreVal) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return false;
                }
                return { nombre: nombreVal };
            }
        });

        if (formValues) {
            Swal.fire({
                title: '<span class="text-slate-800 font-black uppercase text-sm">Creando...</span>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'rounded-[32px] shadow-xl' }
            });

            const res = await categoriasModel.crear({ nombre: formValues.nombre, visible: true, id_padre: null });
            Swal.close();

            if (res.exito) {
                this._alertExito('Categoría creada con éxito');
                await this._recargarCategorias();
            } else {
                this._alertError('No se pudo crear la categoría');
            }
        }
    },

    async mostrarFormCrearSubcategoria() {
        if (this._categoriasPadresList.length === 0) {
            return this._alertError('No hay categorías padre disponibles. Cree primero una categoría.');
        }

        const optionsPadres = (this._categoriasPadresList || [])
            .map(p => `<option value="${p.id}">${this._htmlEscape(p.nombre)}</option>`)
            .join('');

        const svgIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E";

        const { value: formValues } = await Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Nueva Subcategoría</span>',
            html: `
                <div class="text-left space-y-5 pt-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la Subcategoría</label>
                        <input id="swal-nombre-subcat" type="text"
                               class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl p-4 font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none"
                               placeholder="Ej. Analgésicos, Labiales...">
                    </div>
                    <div class="flex flex-col gap-2">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Categoría Padre (Obligatorio)</label>
                        <div class="relative">
                            <select id="swal-id-padre-subcat"
                                    style="appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url('${svgIcon}'); background-repeat: no-repeat; background-position: right 1.25rem center; background-size: 1.25rem; padding-right: 3rem;"
                                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl p-4 font-semibold outline-none cursor-pointer shadow-sm hover:border-slate-300 transition-colors">
                                <option value="">-- Seleccione una categoría --</option>
                                ${optionsPadres}
                            </select>
                        </div>
                    </div>
                </div>`,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            didOpen: () => {
                const input = document.getElementById('swal-nombre-subcat');
                if (input) input.focus();
            },
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-emerald-600',
                cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-slate-100 text-slate-500'
            },
            preConfirm: () => {
                const nombreVal = document.getElementById('swal-nombre-subcat').value.trim();
                const padreVal = document.getElementById('swal-id-padre-subcat').value;
                if (!nombreVal) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return false;
                }
                if (!padreVal) {
                    Swal.showValidationMessage('Debe seleccionar una categoría padre');
                    return false;
                }
                return { nombre: nombreVal, id_padre: parseInt(padreVal) };
            }
        });

        if (formValues) {
            Swal.fire({
                title: '<span class="text-slate-800 font-black uppercase text-sm">Creando...</span>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'rounded-[32px] shadow-xl' }
            });

            const res = await categoriasModel.crear({ nombre: formValues.nombre, visible: true, id_padre: formValues.id_padre });
            Swal.close();

            if (res.exito) {
                this._alertExito('Subcategoría creada con éxito');
                await this._recargarCategorias();
            } else {
                this._alertError('No se pudo crear la subcategoría');
            }
        }
    },

    async _recargarCategorias() {
        try {
            const [padres, hijas] = await Promise.all([
                categoriasModel.obtenerPadres(),
                categoriasModel.obtenerHijas()
            ]);
            this._categoriasPadresList = padres;
            window.categoriasRaw = hijas;
            this.updateUI();
        } catch (error) {
            console.error('Error al recargar categorías:', error);
        }
    },

    _alertExito(msg) {
        Swal.fire({
            icon: 'success',
            title: '<span class="text-slate-800 font-black uppercase text-sm">¡Operación Exitosa!</span>',
            text: msg,
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    // ─────────────────────────────────────────────
    // GUARDADO Y NAVEGACIÓN
    // ─────────────────────────────────────────────
    navSiguiente() {
        const d = this._datosTemporales;
        if (this._pasoActual === 1) {
            const cod = String(d.codigo || '').replace(/\D/g, '');
            if (!/^\d{13}$/.test(cod)) return this._alertError('El código de producto debe tener exactamente 13 dígitos numéricos.');
            d.codigo = cod;
            if (!d.nombre.trim()) return this._alertError('El nombre del producto es obligatorio');
            if (!d.precio || parseFloat(d.precio) <= 0) return this._alertError('Ingrese un precio válido');
            if (!d.descripcion.trim()) return this._alertError('La descripción es obligatoria');
        }
        if (this._pasoActual === 2) {
            if (this._padreSeleccionadoId == null)
                return this._alertError('Seleccione una Categoría');
            if (this._categoriasSeleccionadas.length !== 1)
                return this._alertError('Debe definir la categoría del producto (subcategoría o la categoría si no tiene subcategorías).');
        }

        if (this._pasoActual === 3) {
            if (!this._portadaArchivo.url) return this._alertError('La portada es obligatoria');
            if (this._galeriaArchivos.length === 0) return this._alertError('La galería no puede estar vacía');

            const dataFinal = {
                id: d.id || null,
                codigo: String(d.codigo || '').replace(/\D/g, ''),
                nombre: d.nombre.trim(),
                ws_active: d.ws_active ? 1 : 0, price_visible: d.price_visible ? 1 : 0,
                precio: parseFloat(d.precio) || 0, stock: parseInt(d.stock) || 0,
                descripcion: d.descripcion.trim(),
                categoriasIds: [...this._categoriasSeleccionadas],
                portada: this._portadaArchivo.data || this._portadaArchivo.url,
                galeria: this._galeriaArchivos.map((i, idx) => ({
                    id: i.id, file: i.file || null, url: i.url,
                    tipo: i.tipo || 'imagen', orden: idx + 1, nombre: i.nombre || d.nombre
                }))
            };
            Swal.fire({ title: '¡Excelente!', text: 'Configuración finalizada', icon: 'success', timer: 800, showConfirmButton: false });
            if (this._mainContainer) this._mainContainer.innerHTML = this._originalContent;
            if (typeof this._resolve === 'function') this._resolve(dataFinal);
            return;
        }
        this._pasoActual++;
        this.updateUI();
    },

    _renderTab(num, icon, label) {
        const active = num === this._pasoActual;
        const done = num < this._pasoActual;
        return `
        <button type="button" onclick="window.productManager._pasoActual=${num}; window.productManager.updateUI()"
                class="flex-1 flex items-center justify-center gap-2 py-3.5 px-2 text-sm font-medium transition-colors min-w-0
                       ${active ? 'text-blue-700 bg-white shadow-[inset_0_-2px_0_0_#2563eb]' : done ? 'text-slate-600 hover:bg-white/70' : 'text-slate-500 hover:text-slate-700 hover:bg-white/50'}">
            <span class="material-symbols-outlined text-[20px] shrink-0 ${done && !active ? 'text-blue-600' : ''}">${done && !active ? 'check_circle' : icon}</span>
            <span class="hidden sm:inline truncate">${label}</span>
        </button>`;
    },

    _alertError(msg) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: msg, showConfirmButton: false, timer: 3500, timerProgressBar: true, background: '#fff1f2', color: '#be123c' });
    },

    cancelarEdicion() {
        Swal.fire({
            title: '¿Está Seguro de Salir?',
            text: 'Se perderán los cambios no guardados.',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563eb',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'SÍ, VOLVER AL LISTADO',
            cancelButtonText: 'CONTINUAR EDITANDO',
            reverseButtons: true,
            customClass: {
                confirmButton: 'rounded-2xl font-black text-[10px] uppercase px-8 py-4',
                cancelButton: 'rounded-2xl font-black text-[10px] uppercase px-8 py-4'
            }
        }).then(r => {
            if (r.isConfirmed) {
                if (this._mainContainer) this._mainContainer.innerHTML = this._originalContent;
                this._galeriaArchivos = [];
                this._portadaArchivo = { tipo: 'local', data: null, url: '' };
                this._categoriasSeleccionadas = [];
                this._padreSeleccionadoId = null;
                this._categoriasPadresList = [];
                this._pasoActual = 1;
                // ✅ Limpiar referencias para que popstate no lo detecte como activo
                this._mainContainer = null;
                this._originalContent = null;
                if (typeof this._resolve === 'function') this._resolve(null);
                this._resolve = null; // ✅ Limpiar resolve
            }
        });
    },
    injectStyles() {
        if (document.getElementById('nexus-pm-styles')) return;
        const s = document.createElement('style');
        s.id = 'nexus-pm-styles';
        s.innerHTML = `
            .custom-scrollbar::-webkit-scrollbar       { width:5px }
            .custom-scrollbar::-webkit-scrollbar-track { background:transparent }
            .custom-scrollbar::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:10px }

            /* Drag */
            .galeria-item { user-select:none; transition: box-shadow .15s ease, background .15s ease; }
            .galeria-item.is-dragging  { opacity:.4; box-shadow:0 8px 24px rgba(0,0,0,.15); }
            .galeria-item.drag-over    { border-color:#3b82f6 !important; background:#eff6ff !important; box-shadow:0 0 0 2px #bfdbfe; }

            /* Tippy tema Nexus */
            .tippy-box[data-theme~=nexus] {
                background:#0f172a; color:#f1f5f9;
                font-size:10px; font-weight:800;
                text-transform:uppercase; letter-spacing:.06em;
                border-radius:8px; padding:5px 11px;
                box-shadow:0 8px 20px rgba(0,0,0,.35);
            }
            .tippy-box[data-theme~=nexus][data-placement^=top]    > .tippy-arrow::before { border-top-color:#0f172a }
            .tippy-box[data-theme~=nexus][data-placement^=bottom] > .tippy-arrow::before { border-bottom-color:#0f172a }
            .tippy-box[data-theme~=nexus][data-placement^=left]   > .tippy-arrow::before { border-left-color:#0f172a }
            .tippy-box[data-theme~=nexus][data-placement^=right]  > .tippy-arrow::before { border-right-color:#0f172a }
        `;
        document.head.appendChild(s);
    }
};

window.productManager = productManager;