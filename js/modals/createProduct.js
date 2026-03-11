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

    // --- MOTOR DE CÁMARA INTEGRADO ---
    _cameraEngine: {
        _ffmpeg: null, // Mantenido por estructura, pero ya no se usa para compresión
        _stream: null,
        _timerInterval: null,
        async init() {
            // No se carga FFmpeg para ahorrar recursos
            return;
        },
        async abrir(modo = 'video') {
            return new Promise(async (resolve) => {
                const esVideo = modo === 'video';
                const modalHtml = `
                <div class="camera-container" style="background:#000; border-radius:2.5rem; overflow:hidden; position:relative; min-height: 500px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                    <video id="n-video" autoplay muted playsinline style="width:100%; height:auto; max-height:70vh; object-fit:cover;"></video>
                    
                    <div id="n-overlay" style="display:none; position:absolute; top:30px; left:30px; right:30px; flex-direction:column; gap:15px; z-index:10;">
                        <div style="display:flex; justify-content:space-between; align-items:center;">
                            <div style="color:red; font-weight:900; background:rgba(0,0,0,0.7); padding:8px 20px; border-radius:30px; font-size:12px; display:flex; align-items:center; gap:8px; border:1px solid rgba(255,0,0,0.5); letter-spacing:1px;">
                                <span style="animation: n-pulse 1s infinite; font-size:18px;">●</span> GRABANDO
                            </div>
                            <div id="n-timer" style="color:white; font-weight:900; background:rgba(0,0,0,0.7); padding:8px 20px; border-radius:30px; font-size:14px; font-family:monospace; backdrop-filter:blur(5px);">00:00 / 01:50</div>
                        </div>
                        <div style="width:100%; height:6px; background:rgba(255,255,255,0.2); border-radius:10px; overflow:hidden;">
                            <div id="n-progress" style="width:0%; height:100%; background:#dc2626; transition: width 1s linear;"></div>
                        </div>
                    </div>

                    <div style="padding:35px; display:flex; justify-content:center; gap:30px; background:#f8fafc; border-top:1px solid #e2e8f0;">
                        ${!esVideo ? `
                            <button id="n-btn-snap" class="shadow-2xl hover:scale-110 active:scale-95 transition-all" style="width:80px; height:80px; border-radius:50%; background:#2563eb; color:white; border:8px solid #dbeafe; cursor:pointer; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-outlined" style="font-size:35px;">photo_camera</span></button>
                        ` : `
                            <button id="n-btn-rec" class="shadow-2xl hover:scale-110 active:scale-95 transition-all" style="width:80px; height:80px; border-radius:50%; background:#dc2626; color:white; border:8px solid #fee2e2; cursor:pointer; display:flex; align-items:center; justify-content:center;"><span class="material-symbols-outlined" style="font-size:35px;">videocam</span></button>
                            <button id="n-btn-stop" style="display:none; width:80px; height:80px; border-radius:50%; background:#0f172a; color:white; border:8px solid #e2e8f0; cursor:pointer; align-items:center; justify-content:center;"><span class="material-symbols-outlined" style="font-size:35px;">stop</span></button>
                        `}
                    </div>
                    <style>
                        @keyframes n-pulse { 0% { opacity: 1; } 50% { opacity: 0.3; } 100% { opacity: 1; } }
                    </style>
                </div>`;

                Swal.fire({
                    title: esVideo ? 'NEXUS VIDEO RECORDER' : 'NEXUS PHOTO STUDIO',
                    html: modalHtml,
                    showConfirmButton: false,
                    width: '900px',
                    background: '#f8fafc',
                    padding: '0',
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
                                video: { facingMode: "environment", width: { ideal: 1920 }, height: { ideal: 1080 } },
                                audio: esVideo
                            });
                            videoEl.srcObject = this._stream;
                        } catch (err) {
                            console.error("Error acceso cámara:", err);
                            Swal.fire('Error', 'No se pudo acceder a la cámara o micrófono', 'error');
                        }

                        if (!esVideo) {
                            btnSnap.onclick = () => {
                                const canvas = document.createElement('canvas');
                                canvas.width = videoEl.videoWidth;
                                canvas.height = videoEl.videoHeight;
                                canvas.getContext('2d').drawImage(videoEl, 0, 0);
                                canvas.toBlob(async (blob) => {
                                    const res = await this.procesar(blob, 'imagen');
                                    resolve(res);
                                    Swal.close();
                                }, 'image/jpeg', 0.95);
                            };
                        } else {
                            let chunks = [];
                            let seconds = 0;
                            const limit = 110;

                            btnRec.onclick = () => {
                                const recorder = new MediaRecorder(this._stream);
                                recorder.ondataavailable = e => chunks.push(e.data);
                                recorder.onstop = async () => {
                                    clearInterval(this._timerInterval);
                                    const blob = new Blob(chunks, { type: 'video/webm' });
                                    const res = await this.procesar(blob, 'video');
                                    resolve(res);
                                };

                                recorder.start();
                                btnRec.style.display = 'none';
                                btnStop.style.display = 'flex';
                                overlay.style.display = 'flex';

                                this._timerInterval = setInterval(() => {
                                    seconds++;
                                    const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
                                    const secs = (seconds % 60).toString().padStart(2, '0');
                                    const percent = (seconds / limit) * 100;

                                    timerEl.innerText = `${mins}:${secs} / 01:50`;
                                    progressEl.style.width = `${percent}%`;

                                    if (seconds >= limit) {
                                        recorder.stop();
                                        Swal.close();
                                    }
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
            // Se elimina la lógica de FFmpeg y compresión.
            // Se genera el archivo directamente desde el blob capturado.
            const extension = tipo === 'video' ? 'webm' : 'jpg';
            const mime = tipo === 'video' ? 'video/webm' : 'image/jpeg';
            const nombre = `nexus_${Date.now()}.${extension}`;

            const fileFinal = new File([blob], nombre, { type: mime });

            return {
                archivo: fileFinal,
                url: URL.createObjectURL(fileFinal),
                tipo,
                nombre
            };
        }
    },

    async start(containerId, categorias, dPrevios = {}) {
        this._mainContainer = document.getElementById(containerId);
        if (!this._mainContainer) return;

        // 1. Limpiar estados anteriores para evitar que se mezclen productos
        this._galeriaArchivos = [];
        this._categoriasSeleccionadas = [];
        this._portadaArchivo = { tipo: 'local', data: null, url: '' };

        this._originalContent = this._mainContainer.innerHTML;
        window.categoriasRaw = categorias;
        this._pasoActual = 1;

        // 2. Mapeo de datos temporales
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

        // 3. Carga y ORDENAMIENTO de Galería
        if (dPrevios.galeria && Array.isArray(dPrevios.galeria)) {
            this._galeriaArchivos = dPrevios.galeria.map((item, index) => {
                const url = item.url || item.file_url;
                const info = this.obtenerInfoVideo(url);
                return {
                    id: item.id || `db-${index}`,
                    tipo: item.tipo || 'imagen',
                    url: url,
                    file: null,
                    thumb: item.tipo === 'video' ? info.thumb : url,
                    nombre: item.nombre || 'Archivo guardado',
                    // Asegurar que el orden sea número y manejar el 0 correctamente
                    orden: (item.orden !== undefined) ? parseInt(item.orden) : index
                };
            });

            // Ordenar físicamente el array por el campo orden
            this._galeriaArchivos.sort((a, b) => a.orden - b.orden);
        }

        // 4. Carga de Portada
        const pathPortada = dPrevios.portada || dPrevios.imagen_url;
        if (pathPortada) {
            this._portadaArchivo = typeof pathPortada === 'string'
                ? { tipo: 'url', url: pathPortada, data: null }
                : { tipo: 'local', data: pathPortada, url: URL.createObjectURL(pathPortada) };
        }

        this.render();
        this.injectStyles();

        return new Promise((resolve) => {
            this._resolve = resolve;
        });
    },

    obtenerInfoVideo(url, file = null) {
        if (!url && !file) return { tipo: 'imagen', thumb: '', esArchivo: false };
        if (file && file instanceof File) {
            const esVideo = file.type.startsWith('video/');
            const blobUrl = URL.createObjectURL(file);
            return {
                tipo: esVideo ? 'video' : 'imagen',
                esArchivo: esVideo,
                thumb: esVideo ? 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png' : blobUrl,
                url: blobUrl
            };
        }
        const urlStr = String(url);
        if (urlStr.startsWith('blob:')) {
            const itemEnGaleria = this._galeriaArchivos.find(i => i.url === urlStr);
            if (itemEnGaleria && itemEnGaleria.tipo === 'video') {
                return { tipo: 'video', esArchivo: true, thumb: 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png', url: urlStr };
            }
        }
        const esArchivoDirecto = urlStr.match(/\.(mp4|webm|ogg|mov|m4v)($|\?)/i);
        if (esArchivoDirecto) return { tipo: 'video', esArchivo: true, thumb: 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png', url: urlStr };

        const ytMatch = urlStr.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (ytMatch) return { tipo: 'youtube', id: ytMatch[1], thumb: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`, url: urlStr };
        if (urlStr.includes('facebook.com') || urlStr.includes('fb.watch')) return { tipo: 'facebook', thumb: 'https://cdn-icons-png.flaticon.com/512/124/124010.png', url: urlStr };
        if (urlStr.includes('instagram.com')) return { tipo: 'instagram', thumb: 'https://cdn-icons-png.flaticon.com/512/174/174855.png', url: urlStr };
        if (urlStr.includes('tiktok.com')) {
            const tkId = urlStr.split('/video/')[1]?.split('?')[0];
            return { tipo: 'tiktok', id: tkId, thumb: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png', url: urlStr };
        }
        return { tipo: 'imagen', thumb: urlStr, url: urlStr, esArchivo: false };
    },

    renderVideoPlayer(url) {
        if (!url) return `<div class="p-10 bg-slate-100 text-center rounded-2xl font-bold">URL no válida</div>`;
        const info = this.obtenerInfoVideo(url);
        const esLocal = url.startsWith('blob:');
        if (info.esArchivo || esLocal) {
            return `<video src="${url}" controls autoplay class="w-full rounded-2xl shadow-2xl bg-black" style="max-height: 500px;"></video>`;
        }
        let iframeSrc = '';
        let aspect = '56.25%';
        switch (info.tipo) {
            case 'youtube': iframeSrc = `https://www.youtube.com/embed/${info.id}?autoplay=1&rel=0`; break;
            case 'facebook': iframeSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`; aspect = '75%'; break;
            case 'instagram': iframeSrc = url.split('?')[0].replace(/\/$/, "") + '/embed'; aspect = '125%'; break;
            case 'tiktok': if (info.id) { iframeSrc = `https://www.tiktok.com/embed/v2/${info.id}`; aspect = '177%'; } break;
        }
        if (iframeSrc) return `<div style="position: relative; width: 100%; padding-top: ${aspect}; background: black; border-radius: 1.5rem; overflow: hidden;"><iframe src="${iframeSrc}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe></div>`;
        return `<div class="p-10 bg-slate-100 text-center rounded-2xl font-bold">No se pudo cargar el reproductor</div>`;
    },

    verPreviewAmpliado(url, tipo = 'image') {
        if (!url) return;
        const info = this.obtenerInfoVideo(url);
        const esVideo = (tipo === 'video' || info.tipo !== 'imagen' || (url.startsWith('blob:') && tipo === 'video'));
        const content = esVideo ? this.renderVideoPlayer(url) : `<img src="${url}" class="w-full rounded-2xl shadow-2xl object-contain" style="max-height: 85vh;">`;
        Swal.fire({ html: content, showConfirmButton: false, background: 'transparent', width: (info.tipo === 'tiktok' || info.tipo === 'instagram') ? '400px' : '850px', backdrop: 'rgba(15, 23, 42, 0.95)', showCloseButton: true });
    },

    sync(el, campo, type = 'text') {
        this._datosTemporales[campo] = type === 'checkbox' ? el.checked : el.value;
        const selectors = { nombre: '.preview-nombre', precio: '.preview-precio', descripcion: '.preview-desc', stock: '.preview-stock' };
        if (selectors[campo]) {
            const target = document.querySelector(selectors[campo]);
            if (target) target.innerText = el.value || (campo === 'precio' ? '0.00' : campo === 'nombre' ? 'Nombre del Producto' : '...');
        }
        if (campo === 'price_visible') document.querySelector('.preview-price-box').style.opacity = el.checked ? '1' : '0';
        if (campo === 'ws_active') document.querySelector('.preview-ws-btn').style.display = el.checked ? 'flex' : 'none';
    },

    async cambiarPortada(metodo) {
        if (metodo === 'camera') {
            const capturado = await this._cameraEngine.abrir('foto');
            if (capturado) {
                this._portadaArchivo = { tipo: 'imagen', data: capturado.archivo, url: capturado.url };
                this.updateUI();
            }
            return;
        }

        if (metodo === 'local') {
            const { value: file } = await Swal.fire({ title: 'Cargar Imagen Local', input: 'file', inputAttributes: { 'accept': 'image/*' } });
            if (file) { this._portadaArchivo = { tipo: 'imagen', data: file, url: URL.createObjectURL(file) }; this.updateUI(); }
        } else {
            const { value: url } = await Swal.fire({ title: 'Vincular URL de Imagen', input: 'url' });
            if (url) { this._portadaArchivo = { tipo: 'imagen', data: null, url: url }; this.updateUI(); }
        }
    },

    async addGaleriaManual() {
        const { value: formValues } = await Swal.fire({
            title: 'Configurar Multimedia',
            width: '600px',
            html: `
            <div class="grid grid-cols-2 gap-6 p-4 text-left">
                <div>
                    <label class="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Formato</label>
                    <select id="swal-tipo" class="w-full bg-slate-100 border-none rounded-xl p-4 font-bold outline-none">
                        <option value="imagen">Imagen</option>
                        <option value="video">Video</option>
                    </select>
                </div>
                <div>
                    <label class="text-[10px] font-black uppercase text-slate-400 block mb-2 px-1">Carga</label>
                    <select id="swal-metodo" class="w-full bg-slate-100 border-none rounded-xl p-4 font-bold outline-none">
                        <option value="url">URL / Enlace</option>
                        <option value="local">Archivo Local</option>
                        <option value="camera">Cámara Nexus</option>
                    </select>
                </div>
            </div>`,
            confirmButtonText: 'Siguiente',
            preConfirm: () => [document.getElementById('swal-tipo').value, document.getElementById('swal-metodo').value]
        });

        if (!formValues) return;
        const [tipoManual, metodo] = formValues;
        let url = '', file = null, nombre = '';

        if (metodo === 'camera') {
            const res = await this._cameraEngine.abrir(tipoManual);
            if (res) { url = res.url; file = res.archivo; nombre = res.nombre; }
        } else if (metodo === 'local') {
            const acceptAttr = tipoManual === 'video' ? 'video/*' : 'image/*';
            const { value: f } = await Swal.fire({ title: 'Subir Archivo', input: 'file', inputAttributes: { 'accept': acceptAttr } });
            if (f) { file = f; url = URL.createObjectURL(f); nombre = f.name; }
        } else {
            const { value: u } = await Swal.fire({ title: 'Pegar URL', input: 'url' });
            if (u) { url = u; nombre = tipoManual.toUpperCase(); }
        }

        if (url) {
            this._galeriaArchivos.push({
                id: Date.now().toString() + Math.random(),
                tipo: tipoManual,
                url: url,
                file: file,
                thumb: tipoManual === 'video' ? 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png' : url,
                nombre: nombre,
                orden: this._galeriaArchivos.length + 1
            });
            this._galeriaArchivos.sort((a, b) => a.orden - b.orden);
            this.updateUI();
        }
    },

    handleSearch(el) {
        this._searchTerm = el.value.toLowerCase();
        const lista = document.getElementById('nexus-resultados-busqueda');
        const filtradas = window.categoriasRaw.filter(c => c.id_padre && c.nombre.toLowerCase().includes(this._searchTerm)).slice(0, 10);
        lista.innerHTML = filtradas.map(h => `
            <div onclick="window.productManager.toggleHija(${h.id})" class="p-3 bg-white rounded-xl border-2 cursor-pointer hover:border-blue-600 mb-2 flex justify-between items-center group transition-all">
                <p class="text-[11px] font-black text-slate-700 uppercase">${h.nombre}</p>
                <span class="material-symbols-outlined text-slate-300 group-hover:text-blue-600 text-sm">add_circle</span>
            </div>
        `).join('');
    },

    toggleHija(id) {
        this._categoriasSeleccionadas = this._categoriasSeleccionadas.includes(id)
            ? this._categoriasSeleccionadas.filter(i => i !== id)
            : [...this._categoriasSeleccionadas, id];
        this.updateUI();
    },

    setOrdenGaleria(id, nuevoValor) {
        const nuevoOrden = parseInt(nuevoValor) || 0;
        // Cambia esta línea para ser más flexible con los tipos de datos
        const itemCambiado = this._galeriaArchivos.find(i => i.id == id);

        if (!itemCambiado) return;

        const ordenAnterior = itemCambiado.orden;

        // 1. Buscamos si otro elemento ya tenía ese número de orden
        const itemEnDestino = this._galeriaArchivos.find(i => i.id !== id && i.orden === nuevoOrden);

        if (itemEnDestino) {
            // 2. Si existe, intercambiamos: el que estaba en el destino pasa a la posición vieja
            itemEnDestino.orden = ordenAnterior;
        }

        // 3. Asignamos el nuevo orden al elemento actual
        itemCambiado.orden = nuevoOrden;

        // 4. Re-ordenamos el array y refrescamos la interfaz
        this._galeriaArchivos.sort((a, b) => a.orden - b.orden);
        this.updateUI();
    },
    // --- GESTIÓN DE GALERÍA ---
    eliminarArchivo(id) {
        // IMPORTANTE: Asegúrate de usar != y de asignar el resultado de vuelta al array
        this._galeriaArchivos = this._galeriaArchivos.filter(item => item.id != id);

        // Re-ordenar para que no queden huecos en los índices
        this._galeriaArchivos.forEach((item, index) => {
            item.orden = index + 1;
        });

        // Actualizar la interfaz visual
        this.updateUI();
    },
    injectStyles() {
        if (document.getElementById('nexus-tooltips-styles')) return;
        const style = document.createElement('style');
        style.id = 'nexus-tooltips-styles';
        style.innerHTML = `
            [data-nexus-tooltip] { position: relative; }
            [data-nexus-tooltip]::before {
                content: attr(data-nexus-tooltip);
                position: absolute;
                bottom: 125%; left: 50%;
                transform: translateX(-50%) translateY(10px);
                background: #0f172a; color: white;
                padding: 8px 14px; border-radius: 10px;
                font-size: 10px; font-weight: 900;
                text-transform: uppercase; letter-spacing: 1px;
                white-space: nowrap; opacity: 0; visibility: hidden;
                transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                z-index: 9999; box-shadow: 0 10px 20px rgba(0,0,0,0.2);
            }
            [data-nexus-tooltip]:hover::before { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
            [data-nexus-tooltip]::after {
                content: ''; position: absolute;
                bottom: 110%; left: 50%; transform: translateX(-50%);
                border: 6px solid transparent; border-top-color: #0f172a;
                opacity: 0; visibility: hidden; transition: all 0.3s ease;
            }
            [data-nexus-tooltip]:hover::after { opacity: 1; visibility: visible; }
            .custom-scrollbar::-webkit-scrollbar { width: 5px; }
            .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
            .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        `;
        document.head.appendChild(style);
    },

    render() { this.updateUI(); },

    updateUI() {
        const container = this._mainContainer;
        const d = this._datosTemporales;
        const seleccionadas = window.categoriasRaw ? window.categoriasRaw.filter(c => this._categoriasSeleccionadas.includes(c.id)) : [];

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
            <div class="col-span-12 lg:col-span-7 bg-white rounded-[3rem] shadow-xl border border-slate-100 flex flex-col min-h-[800px]">
                <div class="flex bg-slate-50/50 border-b">
                    ${this._renderTab(1, 'edit_square', 'Información')}
                    ${this._renderTab(2, 'account_tree', 'Categorización')}
                    ${this._renderTab(3, 'media_output', 'Multimedia')}
                </div>

                <div class="p-10 flex-1">
                    <div class="${this._pasoActual === 1 ? 'block' : 'hidden'} space-y-6">
                        <div class="space-y-2">
                            <label class="text-[10px] font-black uppercase text-slate-400 ml-4">Nombre del Producto</label>
                            <input type="text" value="${d.nombre}" oninput="window.productManager.sync(this, 'nombre')" class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-semibold outline-none focus:border-blue-600 transition-colors">
                        </div>
                        <div class="grid grid-cols-2 gap-4">
                            <div class="space-y-2">
                                <label class="text-[10px] font-black uppercase text-slate-400 ml-4">Precio (Bs)</label>
                                <input type="number" value="${d.precio}" oninput="window.productManager.sync(this, 'precio')" class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-semibold outline-none focus:border-blue-600 transition-colors">
                            </div>
                            <div class="space-y-2">
                                <label class="text-[10px] font-black uppercase text-slate-400 ml-4">Stock</label>
                                <input type="number" value="${d.stock}" oninput="window.productManager.sync(this, 'stock')" class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 font-semibold outline-none focus:border-blue-600 transition-colors">
                            </div>
                        </div>
                        <div class="space-y-2">
                            <label class="text-[10px] font-black uppercase text-slate-400 ml-4">Descripción</label>
                            <textarea oninput="window.productManager.sync(this, 'descripcion')" class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-6 py-4 h-44 resize-none font-semibold outline-none focus:border-blue-600 transition-colors">${d.descripcion}</textarea>
                        </div>
                    </div>

                    <div class="${this._pasoActual === 2 ? 'block' : 'hidden'} space-y-6">
                        <div class="relative">
                            <span class="material-symbols-outlined absolute left-4 top-4 text-slate-400">search</span>
                            <input type="text" placeholder="Filtrar subcategorías..." oninput="window.productManager.handleSearch(this)" class="w-full bg-slate-50 border-2 border-slate-200 rounded-2xl px-12 py-4 font-semibold outline-none focus:border-blue-600">
                        </div>
                        <div class="grid grid-cols-2 gap-6 h-[450px]">
                            <div id="nexus-resultados-busqueda" class="overflow-y-auto bg-slate-50 rounded-[2rem] p-5 border-2 border-dashed border-slate-200">
                                <p class="text-center text-slate-400 text-[10px] font-bold mt-10 uppercase">Escribe para buscar</p>
                            </div>
                            <div class="overflow-y-auto bg-blue-50/30 rounded-[2rem] p-5 border border-blue-100">
                                ${seleccionadas.map(s => `
                                    <div class="flex justify-between items-center p-4 bg-white rounded-xl mb-2 shadow-sm border border-blue-100">
                                        <span class="text-[11px] font-black text-slate-700 uppercase">${s.nombre}</span>
                                        <button onclick="window.productManager.toggleHija(${s.id})" class="text-red-400"><span class="material-symbols-outlined text-base">cancel</span></button>
                                    </div>`).join('')}
                            </div>
                        </div>
                    </div>

                    <div class="${this._pasoActual === 3 ? 'block' : 'hidden'} space-y-8">
                        <div class="relative group aspect-video bg-slate-50 rounded-[2.5rem] overflow-hidden border-2 border-dashed border-slate-200 flex items-center justify-center transition-all">
                            ${this._portadaArchivo.url ? `<img src="${this._portadaArchivo.url}" class="w-full h-full object-cover">` : '<span class="material-symbols-outlined text-6xl text-slate-200">add_photo_alternate</span>'}
                            <div class="absolute inset-0 bg-slate-900/70 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center gap-4">
                                <button onclick="window.productManager.cambiarPortada('local')" class="p-3 bg-white rounded-full text-slate-900 hover:text-blue-600 transition-all"><span class="material-symbols-outlined">upload_file</span></button>
                                <button onclick="window.productManager.cambiarPortada('camera')" class="p-3 bg-white rounded-full text-slate-900 hover:text-blue-600 transition-all"><span class="material-symbols-outlined">photo_camera</span></button>
                            </div>
                        </div>
                        <div class="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                            ${this._renderGaleriaList()}
                        </div>
                    </div>
                </div>

                <div class="p-8 bg-slate-50 border-t flex justify-between items-center rounded-b-[3rem]">
                    <button onclick="window.productManager._pasoActual-- ; window.productManager.updateUI()" class="font-black text-[10px] uppercase text-slate-400 ${this._pasoActual === 1 ? 'invisible' : ''}">Atrás</button>
                    <button onclick="window.productManager.navSiguiente()" class="px-14 py-5 bg-blue-600 text-white rounded-[1.5rem] font-black text-[10px] uppercase shadow-xl hover:bg-blue-700 transition-all">
                        ${this._pasoActual === 3 ? 'Guardar Cambios' : 'Siguiente Paso'}
                    </button>
                </div>
            </div>

            <div class="col-span-12 lg:col-span-5">
                <div class="sticky top-12 bg-white rounded-[3.5rem] shadow-2xl overflow-hidden border border-slate-100 transform rotate-1">
                    <div class="aspect-square bg-slate-100 relative">
                        ${this._portadaArchivo.url ? `<img src="${this._portadaArchivo.url}" class="w-full h-full object-cover">` : ''}
                        <div class="absolute top-8 right-8 bg-white/90 backdrop-blur px-5 py-2 rounded-2xl font-black text-blue-600 text-xs shadow-xl uppercase">STOCK: <span class="preview-stock">${d.stock}</span></div>
                    </div>
                    <div class="p-12 space-y-6">
                        <h2 class="preview-nombre text-3xl font-black text-slate-900 leading-tight">${d.nombre || 'Nombre del Producto'}</h2>
                        <div class="flex items-center justify-between pt-10 border-t border-slate-100">
                            <div class="preview-price-box" style="opacity: ${d.price_visible ? '1' : '0'}">
                                <p class="text-[10px] font-black text-slate-400 uppercase">Inversión</p>
                                <p class="text-4xl font-black text-slate-900 tracking-tighter">${d.precio || '0.00'} <span class="text-base uppercase">Bs</span></p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>`;
    },

    _renderTab(num, icon, label) {
        const active = this._pasoActual === num;
        return `<button onclick="window.productManager._pasoActual = ${num}; window.productManager.updateUI()" class="flex-1 py-7 flex flex-col items-center gap-2 border-b-4 transition-all ${active ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-slate-400 hover:bg-slate-50'}">
            <span class="material-symbols-outlined text-2xl">${icon}</span>
            <span class="text-[10px] font-black uppercase tracking-widest">${label}</span>
        </button>`;
    },

    _renderGaleriaList() {
        if (this._galeriaArchivos.length === 0) {
            return `<div class="py-10 text-center border-2 border-dashed border-slate-100 rounded-3xl">
                    <p class="text-slate-400 text-[10px] font-black uppercase">No hay archivos en la galería</p>
                </div>`;
        }

        return this._galeriaArchivos.map((item) => `
        <div class="flex items-center gap-4 p-4 bg-slate-50 rounded-3xl border border-slate-100 group hover:bg-white hover:shadow-md transition-all">
            <div class="w-16 h-16 rounded-2xl overflow-hidden bg-slate-200 flex-shrink-0 relative">
                <img src="${item.thumb || item.url}" class="w-full h-full object-cover">
                ${item.tipo === 'video' ? '<span class="material-symbols-outlined absolute inset-0 flex items-center justify-center text-white bg-black/20 text-xl">play_circle</span>' : ''}
            </div>

            <div class="flex-1">
                <p class="text-[10px] font-black text-slate-800 uppercase truncate w-32">${item.nombre}</p>
                <div class="flex items-center gap-2 mt-1">
                    <span class="text-[9px] font-bold text-slate-400 uppercase">Posición:</span>
                    <input type="number" 
                        value="${item.orden}" 
                        min="0" 
                        onchange="window.productManager.setOrdenGaleria('${item.id}', this.value)"
                        class="w-12 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-center py-1 focus:border-blue-500 outline-none">
                </div>
            </div>

            <div class="flex items-center gap-2">
                <button onclick="window.productManager.verPreviewAmpliado('${item.url}', '${item.tipo}')" class="p-2 text-slate-400 hover:text-blue-600 transition-colors">
                    <span class="material-symbols-outlined text-xl">visibility</span>
                </button>
                <button onclick="window.productManager.eliminarArchivo('${item.id}')" class="p-2 text-slate-400 hover:text-red-500 transition-colors">
                    <span class="material-symbols-outlined text-xl">delete</span>
                </button>
            </div>
        </div>
    `).join('');
    },

    navSiguiente() {
        const d = this._datosTemporales;

        // --- VALIDACIÓN PASO 1: Información Detallada ---
        if (this._pasoActual === 1) {
            if (!d.nombre.trim()) return this._alertError('El nombre del producto es obligatorio');
            if (!d.precio || parseFloat(d.precio) <= 0) return this._alertError('Ingresa un precio válido');
            if (!d.descripcion.trim()) return this._alertError('La descripción es obligatoria');
        }

        // --- VALIDACIÓN PASO 2: Categorización ---
        if (this._pasoActual === 2) {
            if (this._categoriasSeleccionadas.length === 0) {
                return this._alertError('Selecciona al menos una subcategoría');
            }
        }

        // --- VALIDACIÓN PASO 3: Multimedia Obligatoria ---
        if (this._pasoActual === 3) {
            if (!this._portadaArchivo.url) return this._alertError('La portada es obligatoria');
            if (this._galeriaArchivos.length === 0) return this._alertError('La galería no puede estar vacía');

            // --- PROCESO DE GUARDADO FINAL ---

            // 1. Mapear SOLO los archivos que sobrevivieron al borrado en la vista
            const galeriaLimpia = this._galeriaArchivos.map((i, index) => ({
                id: i.id, // Importante para que el controller sepa si es nuevo o viejo
                file: i.file || null,
                url: i.url,
                tipo: i.tipo || 'imagen',
                orden: index + 1, // Resetear el orden correlativo
                nombre: i.nombre || d.nombre
            }));

            // 2. Construir objeto final
            const dataFinal = {
                id: d.id || null,
                nombre: d.nombre.trim(),
                ws_active: d.ws_active ? 1 : 0,
                price_visible: d.price_visible ? 1 : 0,
                precio: parseFloat(d.precio) || 0,
                stock: parseInt(d.stock) || 0,
                descripcion: d.descripcion.trim(),
                categoriasIds: [...this._categoriasSeleccionadas],
                portada: this._portadaArchivo.data || this._portadaArchivo.url,
                galeria: galeriaLimpia
            };

            Swal.fire({
                title: '¡Excelente!',
                text: 'Configuración finalizada',
                icon: 'success',
                timer: 1000,
                showConfirmButton: false
            });

            // 3. Limpieza de interfaz y resolución
            if (this._mainContainer) {
                this._mainContainer.innerHTML = this._originalContent;
            }

            if (typeof this._resolve === 'function') {
                this._resolve(dataFinal);
            }

        } else {
            // Avance de paso normal
            this._pasoActual++;
            this.updateUI();
        }
    },
    // Función auxiliar para alertas rápidas y limpias
    _alertError(mensaje) {
        Swal.fire({
            toast: true,
            position: 'top-end',
            icon: 'error',
            title: mensaje,
            showConfirmButton: false,
            timer: 3500,
            timerProgressBar: true,
            background: '#fff1f2',
            color: '#be123c'
        });
    },
    cancelarEdicion() {
        Swal.fire({
            title: '¿Está Seguro de Salir?',
            text: "Se perderán los cambios que no hayas guardado.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#2563eb', // Azul Nexus
            cancelButtonColor: '#64748b', // Slate 500
            confirmButtonText: 'SÍ, VOLVER AL LISTADO',
            cancelButtonText: 'CONTINUAR EDITANDO',
            reverseButtons: true, // Pone el botón de cancelar a la izquierda
            customClass: {
                confirmButton: 'rounded-2xl font-black text-[10px] uppercase px-8 py-4',
                cancelButton: 'rounded-2xl font-black text-[10px] uppercase px-8 py-4'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                // 1. Limpiar el contenido visual del contenedor principal
                if (this._mainContainer) {
                    this._mainContainer.innerHTML = '';
                    // Restaurar el contenido original (la tabla de productos)
                    this._mainContainer.innerHTML = this._originalContent;
                }

                // 2. Limpiar estados internos para evitar residuos en la próxima apertura
                this._galeriaArchivos = [];
                this._portadaArchivo = { tipo: 'local', data: null, url: '' };
                this._categoriasSeleccionadas = [];
                this._pasoActual = 1;

                // 3. Resolver la promesa con null 
                // Esto permite que el componente que llamó a productManager sepa que no hubo guardado.
                if (typeof this._resolve === 'function') {
                    this._resolve(null);
                }
            }
        });
    }
};

window.productManager = productManager;