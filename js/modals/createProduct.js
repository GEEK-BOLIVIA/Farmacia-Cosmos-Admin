export const productManager = {
    _galeriaArchivos: [],
    _portadaArchivo: { tipo: 'local', data: null, url: '' },
    _pasoActual: 1,
    _categoriasSeleccionadas: [],
    _datosTemporales: { ws_active: true, price_visible: true, nombre: '', precio: '', stock: 0, descripcion: '' },
    _resolve: null,
    _originalContent: null,
    _mainContainer: null,
    _searchTerm: '',

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
    async start(containerId, categorias, dPrevios = {}) {
        this._mainContainer = document.getElementById(containerId);
        if (!this._mainContainer) return;

        this._galeriaArchivos = [];
        this._categoriasSeleccionadas = [];
        this._portadaArchivo = { tipo: 'local', data: null, url: '' };
        this._searchTerm = '';
        this._pasoActual = 1;
        this._originalContent = this._mainContainer.innerHTML;
        window.categoriasRaw = categorias;

        this._datosTemporales = {
            nombre: dPrevios.nombre || '',
            precio: dPrevios.precio || '',
            stock: dPrevios.stock || 0,
            descripcion: dPrevios.descripcion || '',
            ws_active: dPrevios.ws_active !== undefined ? dPrevios.ws_active : true,
            price_visible: dPrevios.price_visible !== undefined ? dPrevios.price_visible : true,
            id: dPrevios.id || null
        };

        this._categoriasSeleccionadas = dPrevios.categoriasIds || [];

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
        const seleccionadas = (window.categoriasRaw || []).filter(c => this._categoriasSeleccionadas.includes(c.id));

        container.innerHTML = `
        <div class="h-full w-full bg-slate-50/50 overflow-y-auto custom-scrollbar p-6 relative">

            <div class="absolute top-4 right-10 z-[100]">
                <button onclick="window.productManager.cancelarEdicion()"
                        class="flex items-center gap-2 px-4 py-2 bg-white/80 backdrop-blur-md border border-slate-200 text-slate-500 hover:text-red-600 hover:border-red-100 rounded-xl shadow-sm transition-all group active:scale-95">
                    <span class="text-[9px] font-black uppercase tracking-tighter">Cancelar y Volver</span>
                    <span class="material-symbols-outlined text-lg group-hover:rotate-90 transition-transform">close</span>
                </button>
            </div>

            <div class="max-w-[1400px] mx-auto grid grid-cols-12 gap-10 mt-8">

                <!-- FORMULARIO -->
                <div class="col-span-12 lg:col-span-7 bg-white rounded-[3rem] shadow-xl border border-slate-100 flex flex-col min-h-[800px]">

                    <div class="flex bg-slate-50/50 border-b rounded-t-[3rem] overflow-hidden">
                        ${this._renderTab(1, 'edit_square', 'Información')}
                        ${this._renderTab(2, 'account_tree', 'Categorización')}
                        ${this._renderTab(3, 'media_output', 'Multimedia')}
                    </div>

                    <div class="p-10 flex-1 overflow-y-auto custom-scrollbar">

                        <!-- PASO 1 -->
                        <div class="${this._pasoActual === 1 ? 'block' : 'hidden'} space-y-6">
                            <div class="space-y-2">
                                <label class="text-[10px] font-black uppercase text-slate-400 ml-4">Nombre del Producto</label>
                                <input type="text" value="${d.nombre}" oninput="window.productManager.sync(this,'nombre')"
                                       class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-semibold outline-none focus:border-blue-600 transition-colors">
                            </div>
                            <div class="grid grid-cols-2 gap-4">
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black uppercase text-slate-400 ml-4">Precio (Bs)</label>
                                    <input type="number" value="${d.precio}" oninput="window.productManager.sync(this,'precio')"
                                           class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-semibold outline-none focus:border-blue-600 transition-colors">
                                </div>
                                <div class="space-y-2">
                                    <label class="text-[10px] font-black uppercase text-slate-400 ml-4">Stock</label>
                                    <input type="number" value="${d.stock}" oninput="window.productManager.sync(this,'stock')"
                                           class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-semibold outline-none focus:border-blue-600 transition-colors">
                                </div>
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-black uppercase text-slate-400 ml-4">Descripción</label>
                                <textarea oninput="window.productManager.sync(this,'descripcion')"
                                          class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 h-44 resize-none font-semibold outline-none focus:border-blue-600 transition-colors">${d.descripcion}</textarea>
                            </div>
                        </div>

                        <!-- PASO 2 -->
                        <div class="${this._pasoActual === 2 ? 'block' : 'hidden'} space-y-6">
                            <div class="relative">
                                <span class="material-symbols-outlined absolute left-4 top-4 text-slate-400">search</span>
                                <input type="text" placeholder="Filtrar subcategorías..." value="${this._searchTerm}"
                                       oninput="window.productManager.handleSearch(this)"
                                       class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-12 py-4 font-semibold outline-none focus:border-blue-600">
                            </div>
                            <div class="grid grid-cols-2 gap-6 h-[450px]">
                                <div id="nexus-resultados-busqueda"
                                     class="overflow-y-auto bg-slate-50 rounded-[2rem] p-5 border-2 border-dashed border-slate-200">
                                    <p class="text-center text-slate-400 text-[10px] font-bold mt-10 uppercase">Cargando categorías...</p>
                                </div>
                                <div class="overflow-y-auto bg-blue-50/30 rounded-[2rem] p-5 border border-blue-100">
                                    ${seleccionadas.length === 0
                ? `<p class="text-center text-slate-400 text-[10px] font-bold mt-10 uppercase">Ninguna seleccionada</p>`
                : seleccionadas.map(s => `
                                            <div class="flex justify-between items-center p-4 bg-white rounded-xl mb-2 shadow-sm border border-blue-100">
                                                <span class="text-[11px] font-black text-slate-700 uppercase">${s.nombre}</span>
                                                <button onclick="window.productManager.toggleHija(${s.id})" class="text-red-400">
                                                    <span class="material-symbols-outlined text-base">cancel</span>
                                                </button>
                                            </div>`).join('')
            }
                                </div>
                            </div>
                        </div>

                        <!-- PASO 3 -->
                        <div class="${this._pasoActual === 3 ? 'block' : 'hidden'} space-y-6">

                            <!-- Portada -->
                            <div>
                                <label class="text-[10px] font-black uppercase text-slate-400 ml-1 mb-2 block">Imagen de Portada</label>
                                <div class="relative group aspect-video bg-slate-50 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center">
                                    ${this._portadaArchivo.url
                ? `<img src="${this._portadaArchivo.url}" class="w-full h-full object-cover">`
                : `<div class="flex flex-col items-center gap-2">
                                               <span class="material-symbols-outlined text-6xl text-slate-200">add_photo_alternate</span>
                                               <p class="text-[10px] font-black text-slate-300 uppercase">Pasa el cursor para agregar</p>
                                           </div>`
            }
                                    <div class="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                                        <button onclick="window.productManager.cambiarPortada('local')"
                                                class="flex flex-col items-center gap-1 p-4 bg-white/10 hover:bg-white/25 rounded-2xl text-white transition-all border border-white/20">
                                            <span class="material-symbols-outlined text-2xl">upload_file</span>
                                            <span class="text-[9px] font-black uppercase">Subir</span>
                                        </button>
                                        <button onclick="window.productManager.cambiarPortada('url')"
                                                class="flex flex-col items-center gap-1 p-4 bg-white/10 hover:bg-white/25 rounded-2xl text-white transition-all border border-white/20">
                                            <span class="material-symbols-outlined text-2xl">link</span>
                                            <span class="text-[9px] font-black uppercase">URL</span>
                                        </button>
                                        <button onclick="window.productManager.cambiarPortada('camera')"
                                                class="flex flex-col items-center gap-1 p-4 bg-white/10 hover:bg-white/25 rounded-2xl text-white transition-all border border-white/20">
                                            <span class="material-symbols-outlined text-2xl">photo_camera</span>
                                            <span class="text-[9px] font-black uppercase">Cámara</span>
                                        </button>
                                        ${this._portadaArchivo.url ? `
                                        <button onclick="window.productManager.verPortadaAmpliada()"
                                                class="flex flex-col items-center gap-1 p-4 bg-white/10 hover:bg-white/25 rounded-2xl text-white transition-all border border-white/20">
                                            <span class="material-symbols-outlined text-2xl">fullscreen</span>
                                            <span class="text-[9px] font-black uppercase">Ampliar</span>
                                        </button>` : ''}
                                    </div>
                                </div>
                            </div>

                            <!-- Galería -->
                            <div>
                                <div class="flex items-center justify-between mb-3">
                                    <label class="text-[10px] font-black uppercase text-slate-400 ml-1">
                                        Galería
                                        ${this._galeriaArchivos.length > 0
                ? `<span class="ml-2 px-2 py-0.5 bg-blue-100 text-blue-600 rounded-full text-[9px]">${this._galeriaArchivos.length}</span>`
                : ''}
                                    </label>
                                    ${this._galeriaArchivos.length > 1
                ? `<div class="flex items-center gap-1 text-slate-300">
                                               <span class="material-symbols-outlined text-sm">drag_indicator</span>
                                               <span class="text-[9px] font-bold uppercase">Arrastra para reordenar</span>
                                           </div>` : ''}
                                </div>

                                <div class="max-h-80 overflow-y-auto custom-scrollbar pr-1">
                                    ${this._renderGaleriaList()}
                                </div>

                                <button onclick="window.productManager.addGaleriaManual()"
                                        class="mt-3 w-full py-4 border-2 border-dashed border-slate-200 rounded-2xl text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all font-black text-[10px] uppercase flex items-center justify-center gap-2">
                                    <span class="material-symbols-outlined text-lg">add_circle</span> Agregar archivo
                                </button>
                            </div>
                        </div>

                    </div>

                    <!-- FOOTER -->
                    <div class="p-8 bg-slate-50 border-t flex justify-between items-center rounded-b-[3rem]">
                        <button onclick="window.productManager._pasoActual--; window.productManager.updateUI()"
                                class="font-black text-[10px] uppercase text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1 ${this._pasoActual === 1 ? 'invisible' : ''}">
                            <span class="material-symbols-outlined text-sm">arrow_back</span> Atrás
                        </button>
                        <div class="flex items-center gap-2">
                            ${[1, 2, 3].map(n => `<div class="h-2 rounded-full transition-all ${n === this._pasoActual ? 'bg-blue-600 w-6' : n < this._pasoActual ? 'bg-blue-300 w-2' : 'bg-slate-200 w-2'}"></div>`).join('')}
                        </div>
                        <button onclick="window.productManager.navSiguiente()"
                                class="px-10 py-4 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center gap-2">
                            ${this._pasoActual === 3
                ? `<span class="material-symbols-outlined text-sm">save</span> Guardar`
                : `Siguiente <span class="material-symbols-outlined text-sm">arrow_forward</span>`}
                        </button>
                    </div>
                </div>

                <!-- PREVIEW -->
                <div class="col-span-12 lg:col-span-5">
                    <div class="sticky top-12 bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100 transform rotate-1">
                        <div class="aspect-square bg-slate-100 relative">
                            ${this._portadaArchivo.url
                ? `<img src="${this._portadaArchivo.url}" class="w-full h-full object-cover">`
                : `<div class="w-full h-full flex items-center justify-center"><span class="material-symbols-outlined text-8xl text-slate-200">image</span></div>`
            }
                            <div class="absolute top-8 right-8 bg-white/90 backdrop-blur px-5 py-2 rounded-2xl font-black text-blue-600 text-xs shadow-xl uppercase">
                                STOCK: <span class="preview-stock">${d.stock}</span>
                            </div>
                        </div>
                        <div class="p-12 space-y-4">
                            <h2 class="preview-nombre text-3xl font-black text-slate-900 leading-tight">${d.nombre || 'Nombre del Producto'}</h2>
                            <div class="preview-price-box pt-4 border-t border-slate-100" style="opacity:${d.price_visible ? '1' : '0'}">
                                <p class="text-[10px] font-black text-slate-400 uppercase">Inversión</p>
                                <p class="text-4xl font-black text-slate-900 tracking-tighter">${d.precio || '0.00'} <span class="text-base uppercase">Bs</span></p>
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

        if (this._pasoActual === 2) {
            this.handleSearch({ value: this._searchTerm });
        }
    },

    // ─────────────────────────────────────────────
    // GALERÍA RENDER — badges de posición visibles
    // ─────────────────────────────────────────────
    _renderGaleriaList() {
        if (this._galeriaArchivos.length === 0) {
            return `
            <div class="py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                <span class="material-symbols-outlined text-4xl text-slate-200">photo_library</span>
                <p class="text-slate-400 text-[10px] font-black uppercase mt-2">Sin archivos aún</p>
            </div>`;
        }

        return `<div id="galeria-drag-container" class="space-y-2">
            ${this._galeriaArchivos.map((item, index) => `
            <div class="galeria-item flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100 hover:bg-white hover:shadow-sm transition-all"
                 draggable="true"
                 data-id="${item.id}">

                <!-- Handle — cursor explícito en este elemento -->
                <div class="flex-shrink-0 text-slate-300 hover:text-slate-500 transition-colors cursor-grab active:cursor-grabbing select-none"
                     style="touch-action:none;">
                    <span class="material-symbols-outlined text-xl leading-none">drag_indicator</span>
                </div>

                <!-- Badge posición -->
                <div class="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-200 flex items-center justify-center select-none">
                    <span class="pos-badge text-[11px] font-black text-slate-600 leading-none">${index + 1}</span>
                </div>

                <!-- Miniatura -->
                <div class="w-12 h-12 rounded-xl overflow-hidden bg-slate-200 flex-shrink-0 relative pointer-events-none">
                    <img src="${item.thumb || item.url}" class="w-full h-full object-cover" loading="lazy" draggable="false">
                    ${item.tipo === 'video'
                ? `<span class="material-symbols-outlined absolute inset-0 flex items-center justify-center text-white bg-black/30 text-base">play_circle</span>`
                : ''}
                </div>

                <!-- Nombre y tipo -->
                <div class="flex-1 min-w-0 pointer-events-none select-none">
                    <p class="text-[10px] font-black text-slate-700 uppercase truncate leading-tight">${item.nombre}</p>
                    <p class="text-[9px] text-slate-400 font-medium mt-0.5 capitalize">${item.tipo}</p>
                </div>

                <!-- Acciones con Tippy (data-tippy-content) -->
                <div class="flex items-center gap-1 flex-shrink-0">
                    <button
                        data-tippy-content="Previsualizar"
                        onclick="window.productManager.verPreviewAmpliado('${item.url}','${item.tipo}')"
                        class="w-8 h-8 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-500 border border-indigo-100 hover:bg-indigo-600 hover:text-white hover:border-indigo-600 transition-all">
                        <span class="material-symbols-outlined text-[16px] pointer-events-none">visibility</span>
                    </button>
                    <button
                        data-tippy-content="Eliminar archivo"
                        onclick="window.productManager.eliminarArchivo('${item.id}')"
                        class="w-8 h-8 flex items-center justify-center rounded-xl bg-red-50 text-red-400 border border-red-100 hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
                        <span class="material-symbols-outlined text-[16px] pointer-events-none">delete</span>
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
    sync(el, campo, type = 'text') {
        this._datosTemporales[campo] = type === 'checkbox' ? el.checked : el.value;
        const map = { nombre: '.preview-nombre', stock: '.preview-stock' };
        if (map[campo]) { const t = document.querySelector(map[campo]); if (t) t.innerText = el.value || (campo === 'nombre' ? 'Nombre del Producto' : '0'); }
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

    handleSearch(el) {
        this._searchTerm = (el.value || '').toLowerCase();
        const lista = document.getElementById('nexus-resultados-busqueda');
        if (!lista) return;
        const filtradas = (window.categoriasRaw || []).filter(c => {
            const tiene = c.id_padre !== null && c.id_padre !== undefined && c.id_padre !== 0 && c.id_padre !== '0' && c.id_padre !== '';
            const coincide = !this._searchTerm || c.nombre.toLowerCase().includes(this._searchTerm);
            return tiene && coincide;
        }).slice(0, 10);
        lista.innerHTML = filtradas.length === 0
            ? `<p class="text-center text-slate-400 text-[10px] font-bold mt-10 uppercase">Sin resultados</p>`
            : filtradas.map(h => `
                <div onclick="window.productManager.toggleHija(${h.id})"
                     class="p-3 bg-white rounded-xl border-2 cursor-pointer hover:border-blue-600 mb-2 flex justify-between items-center group transition-all">
                    <p class="text-[11px] font-black text-slate-700 uppercase">${h.nombre}</p>
                    <span class="material-symbols-outlined text-slate-300 group-hover:text-blue-600 text-sm">add_circle</span>
                </div>`).join('');
    },

    toggleHija(id) {
        this._categoriasSeleccionadas = this._categoriasSeleccionadas.includes(id)
            ? this._categoriasSeleccionadas.filter(i => i !== id)
            : [...this._categoriasSeleccionadas, id];
        this.updateUI();
    },

    // ─────────────────────────────────────────────
    // GUARDADO Y NAVEGACIÓN
    // ─────────────────────────────────────────────
    navSiguiente() {
        const d = this._datosTemporales;
        if (this._pasoActual === 1) {
            if (!d.nombre.trim()) return this._alertError('El nombre del producto es obligatorio');
            if (!d.precio || parseFloat(d.precio) <= 0) return this._alertError('Ingresa un precio válido');
            if (!d.descripcion.trim()) return this._alertError('La descripción es obligatoria');
        }
        if (this._pasoActual === 2 && this._categoriasSeleccionadas.length === 0)
            return this._alertError('Selecciona al menos una subcategoría');

        if (this._pasoActual === 3) {
            if (!this._portadaArchivo.url) return this._alertError('La portada es obligatoria');
            if (this._galeriaArchivos.length === 0) return this._alertError('La galería no puede estar vacía');

            const dataFinal = {
                id: d.id || null, nombre: d.nombre.trim(),
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
        <button onclick="window.productManager._pasoActual=${num}; window.productManager.updateUI()"
                class="flex-1 py-6 flex flex-col items-center gap-1.5 border-b-4 transition-all
                       ${active ? 'border-blue-600 text-blue-600 bg-white' : done ? 'border-blue-200 text-blue-400 hover:bg-slate-50' : 'border-transparent text-slate-400 hover:bg-slate-50'}">
            <span class="material-symbols-outlined text-xl">${done && !active ? 'check_circle' : icon}</span>
            <span class="text-[9px] font-black uppercase tracking-widest hidden sm:block">${label}</span>
        </button>`;
    },

    _alertError(msg) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: msg, showConfirmButton: false, timer: 3500, timerProgressBar: true, background: '#fff1f2', color: '#be123c' });
    },

    cancelarEdicion() {
        Swal.fire({
            title: '¿Está Seguro de Salir?',
            text: 'Se perderán los cambios que no hayas guardado.',
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
                this._pasoActual = 1;
                this._searchTerm = '';
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