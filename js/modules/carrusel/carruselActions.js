import { carruselState } from './carruselState.js';
import { RegisterCarrusel } from './registerCarrusel.js';

let searchTimer;
let ICONOS_GLOBALES = [];

// Mapa: base64 → File original (para subir al bucket al guardar)
const _archivosLocales = new Map();

async function cargarDiccionarioIconos() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/metadata/icons.json');
        const data = await response.json();
        ICONOS_GLOBALES = Object.keys(data).filter(key => data[key].styles.includes('solid'));
    } catch (error) {
        ICONOS_GLOBALES = ['tag', 'shop', 'heart', 'star', 'user', 'house', 'gear'];
    }
}
cargarDiccionarioIconos();

async function abrirBuscadorIconos(nombreCategoria) {
    return new Promise((resolve) => {
        let translationTimer;
        const sugeridos = ['shop', 'cart-shopping', 'tag', 'star', 'heart', 'truck', 'credit-card', 'user', 'shirt', 'laptop'];

        Swal.fire({
            title: `<span class="text-xs uppercase font-black">Icono para: ${nombreCategoria}</span>`,
            html: `
                <div class="p-2">
                    <input type="text" id="icon_search_input"
                           class="w-full p-3 rounded-xl border border-slate-200 mb-4 text-sm focus:outline-none focus:border-blue-500 shadow-sm"
                           placeholder="Busca en español (ej: zapato, comida, casa)..." autofocus>
                    <div id="icon_grid" class="grid grid-cols-4 gap-3 max-h-[350px] overflow-y-auto p-2">
                        ${generarGridHTML(sugeridos)}
                    </div>
                </div>`,
            showConfirmButton: false,
            showCancelButton: true,
            cancelButtonText: 'Cancelar',
            customClass: { popup: 'rounded-[2rem]' },
            didOpen: () => {
                const input = document.getElementById('icon_search_input');
                const grid = document.getElementById('icon_grid');
                input.addEventListener('input', (e) => {
                    const termOriginal = e.target.value.toLowerCase().trim();
                    clearTimeout(translationTimer);
                    if (termOriginal.length < 3) {
                        if (termOriginal.length === 0) grid.innerHTML = generarGridHTML(sugeridos);
                        return;
                    }
                    translationTimer = setTimeout(async () => {
                        grid.innerHTML = `<div class="col-span-4 text-center py-10"><i class="fa-solid fa-circle-notch fa-spin text-2xl text-blue-500"></i><p class="text-[10px] mt-2 font-bold uppercase text-slate-400">Traduciendo y buscando...</p></div>`;
                        const termIngles = await traducirBusqueda(termOriginal);
                        const filtrados = ICONOS_GLOBALES.filter(icon => icon.includes(termIngles) || icon.includes(termOriginal)).slice(0, 40);
                        grid.innerHTML = generarGridHTML(filtrados);
                    }, 600);
                });
            }
        });

        window.seleccionarIconoFinal = (clase) => { Swal.close(); resolve(clase); };
    });
}

function generarGridHTML(lista) {
    if (lista.length === 0) return `<div class="col-span-4 text-center py-10 text-slate-400 text-[10px] font-bold">SIN RESULTADOS</div>`;
    return lista.map(icon => {
        const nombreIcono = icon.startsWith('fa-') ? icon : `fa-${icon}`;
        const claseCompleta = `fa-solid ${nombreIcono}`;
        return `
            <div onclick="window.seleccionarIconoFinal('${claseCompleta}')"
                 class="flex flex-col items-center justify-center p-4 border border-slate-50 rounded-2xl hover:bg-blue-600 hover:text-white cursor-pointer transition-all group aspect-square">
                <i class="${claseCompleta} text-2xl mb-1 group-hover:scale-125 transition-transform"></i>
                <span class="text-[7px] uppercase font-black opacity-40 group-hover:opacity-100 truncate w-full text-center">${icon.replace('fa-', '')}</span>
            </div>`;
    }).join('');
}

async function traducirBusqueda(texto) {
    if (!texto) return '';
    try {
        const res = await fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(texto)}&langpair=es|en`);
        const data = await res.json();
        return data.responseData.translatedText.toLowerCase();
    } catch { return texto; }
}

export const carruselActions = {

    // ─── VALIDACIÓN PASO 1 ───────────────────────────────────────────
    validarPaso1() {
        const nombreInput = document.getElementById('cfg_nombre');
        const slugInput = document.getElementById('cfg_slug');
        const ordenInput = document.getElementById('cfg_orden_seccion');
        const descInput = document.getElementById('cfg_descripcion');
        const nombre = nombreInput ? nombreInput.value.trim() : '';
        const slug = slugInput ? slugInput.value : 'home-top';
        const orden = ordenInput ? parseInt(ordenInput.value) : 0;
        if (!nombre) { this._alertError("Ponle un nombre para identificarlo"); return false; }
        carruselState.config.nombre = nombre;
        carruselState.config.ubicacion_slug = slug;
        carruselState.config.orden_seccion = isNaN(orden) ? 0 : orden;
        carruselState.config.descripcion = descInput ? descInput.value.trim() : '';
        return true;
    },

    // ─── BÚSQUEDA ────────────────────────────────────────────────────
    buscarRelacionados(termino) {
        clearTimeout(searchTimer);
        const listaResultados = document.getElementById('search_results_list');
        if (!termino || termino.trim().length < 2) {
            if (listaResultados) { listaResultados.innerHTML = ''; listaResultados.classList.add('hidden'); }
            return;
        }
        searchTimer = setTimeout(async () => {
            try {
                const tipo = carruselState.config.tipo;
                const resultados = await window.carruselController.buscarItemsRelacionados(tipo, termino);
                if (!listaResultados) return;
                if (resultados && resultados.length > 0) {
                    listaResultados.innerHTML = resultados.map(res => {
                        const id = res.id;
                        const nombre = res.nombre || 'Sin nombre';
                        const imagen = res.imagen || 'https://placehold.co/100?text=No+Img';
                        const link = res.link || '';
                        const precio = res.precio || 0;
                        const ne = nombre.replace(/'/g, "\\'").replace(/"/g, "&quot;");
                        const ie = imagen.replace(/'/g, "\\'");
                        const le = link.replace(/'/g, "\\'");
                        const esCategoria = tipo === 'categorias' || imagen.startsWith('fa-');
                        return `
                            <div onclick="carruselActions.seleccionarResultado('${id}','${ne}','${ie}','${le}',${precio})"
                                 class="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer border-b border-slate-50 transition-colors group">
                                <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                    ${esCategoria ? `<i class="fa-solid fa-layer-group text-blue-500 text-lg"></i>` : `<img src="${imagen}" class="w-full h-full object-cover">`}
                                </div>
                                <div class="flex flex-col min-w-0 flex-1">
                                    <span class="text-xs font-black text-slate-700 uppercase truncate">${nombre}</span>
                                    ${precio > 0 ? `<span class="text-[10px] font-bold text-blue-600">Bs. ${precio.toLocaleString()}</span>` : ''}
                                </div>
                                <i class="fa-solid fa-plus text-slate-300 group-hover:text-blue-600 text-xs mr-2"></i>
                            </div>`;
                    }).join('');
                    listaResultados.classList.remove('hidden');
                } else {
                    listaResultados.innerHTML = `<div class="p-6 text-center"><p class="text-[10px] font-black text-slate-400 uppercase">Sin resultados para "${termino}"</p></div>`;
                    listaResultados.classList.remove('hidden');
                }
            } catch (error) { console.error("Error en búsqueda:", error); }
        }, 400);
    },

    async seleccionarResultado(id, nombre, imagen, link, precio) {
        let valorMedia = imagen;
        const tipo = carruselState.config.tipo;
        if (tipo === 'categorias') {
            const icono = await abrirBuscadorIconos(nombre);
            if (!icono) return;
            valorMedia = icono;
        }
        const inputRelacion = document.getElementById('it_relacion_id');
        const inputTitulo = document.getElementById('it_titulo');
        const inputMedia = document.getElementById('it_media_url');
        const inputLink = document.getElementById('it_link');
        const inputSubtitulo = document.getElementById('it_subtitulo');
        const previewBox = document.getElementById('preview_box');

        if (inputRelacion) inputRelacion.value = id;
        if (inputTitulo) inputTitulo.value = nombre;
        if (inputMedia) inputMedia.value = valorMedia;
        if (inputLink) inputLink.value = link || '';
        if (inputSubtitulo) inputSubtitulo.value = (precio > 0) ? `Bs. ${precio.toLocaleString()}` : '';

        if (previewBox) {
            if (valorMedia.startsWith('fa-')) {
                previewBox.innerHTML = `<div class="flex items-center justify-center w-full h-full bg-slate-50 rounded-xl"><i class="${valorMedia} text-6xl text-blue-600"></i></div>`;
            } else {
                const badge = precio > 0 ? `<div class="absolute bottom-2 right-2 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-full">BS. ${precio.toLocaleString()}</div>` : '';
                previewBox.innerHTML = `<div class="relative w-full h-full flex items-center justify-center bg-white rounded-xl overflow-hidden"><img src="${valorMedia}" class="max-w-full max-h-full object-contain p-2" onerror="this.src='https://placehold.co/400?text=Error'">${badge}</div>`;
            }
        }
        this.limpiarBuscadorRapido();
    },

    limpiarBuscadorRapido() {
        const b = document.getElementById('it_search');
        const l = document.getElementById('search_results_list');
        if (b) b.value = '';
        if (l) { l.innerHTML = ''; l.classList.add('hidden'); }
    },

    // ─── PREVIEW LOCAL ───────────────────────────────────────────────
    previsualizarMediaLocal(input) {
        if (!input.files || !input.files[0]) return;
        const file = input.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            const base64 = e.target.result;
            const previewBox = document.getElementById('preview_box');
            const mediaUrlInput = document.getElementById('it_media_url');
            // Guardar File real para subir al bucket
            _archivosLocales.set(base64, file);
            if (mediaUrlInput) mediaUrlInput.value = base64;
            if (previewBox) {
                previewBox.innerHTML = file.type.startsWith('video/')
                    ? `<video src="${base64}" class="w-full h-full object-cover" autoplay muted loop></video>`
                    : `<img src="${base64}" class="w-full h-full object-cover">`;
            }
        };
        reader.readAsDataURL(file);
    },

    async pedirUrlImagen() {
        const { value: url } = await Swal.fire({
            title: 'URL de Multimedia', input: 'url',
            inputLabel: 'Pega el link de la imagen o video',
            showCancelButton: true, confirmButtonColor: '#0f172a',
            customClass: { popup: 'rounded-[2rem]' }
        });
        if (url) {
            const mediaUrlInput = document.getElementById('it_media_url');
            if (mediaUrlInput) mediaUrlInput.value = url;
            const previewBox = document.getElementById('preview_box');
            if (previewBox) previewBox.innerHTML = `<img src="${url}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/600x400?text=Error+Link'">`;
        }
    },

    // ─── CAPTURAR ÍTEM ───────────────────────────────────────────────
    capturarItem() {
        const elMedia = document.getElementById('it_media_url');
        const elTitulo = document.getElementById('it_titulo');
        const elSubtitulo = document.getElementById('it_subtitulo');
        const elLink = document.getElementById('it_link');
        const elRelacion = document.getElementById('it_relacion_id');

        const mediaUrl = elMedia?.value?.trim() || '';
        const titulo = elTitulo?.value?.trim() ?? '';
        const subtitulo = elSubtitulo?.value?.trim() ?? '';
        const link = elLink?.value?.trim() || '';
        const relacionId = elRelacion?.value || null;
        const tipo = carruselState.config.tipo;

        if (!mediaUrl && tipo === 'banners') {
            Swal.fire("Error", "Los banners deben tener una imagen o contenido visual", "warning");
            return null;
        }

        const esBase64 = mediaUrl.startsWith('data:');
        const esIcono = mediaUrl.startsWith('fa-');
        const archivoLocal = esBase64 ? (_archivosLocales.get(mediaUrl) || null) : null;

        return {
            imagen_preview: mediaUrl,
            titulo,
            subtitulo,
            link,
            relacion_id: relacionId,
            tipo_contenido: tipo,
            _archivoLocal: archivoLocal,
            titulo_manual: titulo !== '' ? titulo : null,
            subtitulo_manual: subtitulo !== '' ? subtitulo : null,
            link_destino_manual: link !== '' ? link : null,
            imagen_url_manual: esIcono ? null : (esBase64 ? null : (mediaUrl || null)),
            icono_manual: esIcono ? mediaUrl : null,
            producto_id: tipo === 'productos' ? (relacionId ? parseInt(relacionId) : null) : null,
            categoria_id: tipo === 'categorias' ? (relacionId ? parseInt(relacionId) : null) : null,
        };
    },

    async cambiarIconoEdicion() {
        const elTitulo = document.getElementById('it_titulo');
        const elMedia = document.getElementById('it_media_url');
        const nombre = elTitulo?.value || 'Categoría';
        const nuevoIcono = await abrirBuscadorIconos(nombre);
        if (nuevoIcono) {
            if (elMedia) elMedia.value = nuevoIcono;
            this._actualizarPreviewLocal(nuevoIcono);
            Swal.fire({ toast: true, position: 'top-end', icon: 'success', title: 'Icono actualizado', showConfirmButton: false, timer: 2000 });
        }
    },

    async editarItem(index) {
        const item = carruselState.items[index];
        if (!item) return;
        const elMedia = document.getElementById('it_media_url');
        const elTitulo = document.getElementById('it_titulo');
        const elSubtitulo = document.getElementById('it_subtitulo');
        const elLink = document.getElementById('it_link');
        const elRelacion = document.getElementById('it_relacion_id');
        if (elMedia) elMedia.value = item.imagen_preview || '';
        if (elTitulo) elTitulo.value = item.titulo ?? '';
        if (elSubtitulo) elSubtitulo.value = item.subtitulo ?? '';
        if (elLink) elLink.value = item.link || '';
        if (elRelacion) elRelacion.value = item.producto_id || item.categoria_id || '';
        this._actualizarPreviewLocal(item.imagen_preview);
        carruselState.items.splice(index, 1);
        this.renderItems();
        Swal.fire({ toast: true, position: 'top-end', icon: 'info', title: 'Modo edición activo', showConfirmButton: false, timer: 2500 });
    },

    _actualizarPreviewLocal(media) {
        const previewBox = document.getElementById('preview_box');
        if (!previewBox) return;
        if (!media || media.trim() === '') {
            previewBox.innerHTML = `<div class="flex flex-col items-center justify-center text-slate-300"><span class="material-symbols-outlined text-5xl">image</span><span class="text-xs mt-2 uppercase font-semibold">Sin Contenido</span></div>`;
            return;
        }
        if (media.includes('fa-')) {
            previewBox.innerHTML = `<div class="flex items-center justify-center w-full h-full"><i class="${media} text-6xl text-blue-600"></i></div>`;
            return;
        }
        previewBox.innerHTML = `<img src="${media}" class="w-full h-full object-cover rounded-lg" onerror="this.onerror=null;this.src='https://placehold.co/400x400?text=Error';">`;
    },

    renderItems() {
        const contenedor = document.getElementById('items_agregados_list');
        if (!contenedor) return;
        if (carruselState.items.length === 0) {
            contenedor.innerHTML = `<div class="text-center p-8 text-slate-400">No hay elementos</div>`;
            return;
        }
        contenedor.innerHTML = carruselState.items.map((item, index) => `
            <div class="flex items-center gap-3 p-3 bg-white border border-slate-100 rounded-2xl mb-2 shadow-sm group">
                <div class="w-12 h-12 rounded-lg bg-slate-50 flex items-center justify-center overflow-hidden flex-shrink-0">
                    ${item.imagen_preview?.startsWith('fa-')
                ? `<i class="${item.imagen_preview} text-blue-500 text-xl"></i>`
                : `<img src="${item.imagen_preview}" class="w-full h-full object-cover">`
            }
                </div>
                <div class="flex-1 min-w-0">
                    <p class="text-[10px] font-black uppercase truncate ${item.titulo ? 'text-slate-700' : 'text-slate-300 italic'}">
                        ${item.titulo || 'Sin título'}
                    </p>
                    <p class="text-[9px] text-slate-400 truncate">${item.subtitulo || ''}</p>
                    ${item._archivoLocal instanceof File
                ? `<p class="text-[8px] text-amber-500 font-bold flex items-center gap-1 mt-0.5"><i class="fa-solid fa-cloud-arrow-up"></i> Pendiente de subir</p>`
                : ''}
                </div>
                <div class="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onclick="carruselActions.editarItem(${index})" class="p-2 text-blue-500 hover:bg-blue-50 rounded-lg">
                        <i class="fa-solid fa-pen-to-square text-xs"></i>
                    </button>
                    <button onclick="carruselActions.eliminarItem(${index})" class="p-2 text-red-500 hover:bg-red-50 rounded-lg">
                        <i class="fa-solid fa-trash text-xs"></i>
                    </button>
                </div>
            </div>`).join('');
    },

    eliminarItem(index) {
        const item = carruselState.items[index];
        if (item?.imagen_preview?.startsWith('data:')) _archivosLocales.delete(item.imagen_preview);
        carruselState.items.splice(index, 1);
        this.renderItems();
    },

    seleccionarIcono(nombreIcono) {
        const inputMedia = document.getElementById('it_media_url');
        if (inputMedia) { inputMedia.value = nombreIcono; this._actualizarPreviewLocal(nombreIcono); }
    },

    _alertError(msg) {
        Swal.fire({ toast: true, position: 'top-end', icon: 'error', title: msg, showConfirmButton: false, timer: 3000 });
    },

    // ─── COMPRESIÓN DE IMAGEN ────────────────────────────────────────
    async _comprimirImagen(file, maxWidth = 1280, quality = 0.82) {
        if (!file.type.startsWith('image/')) return file; // videos pasan directo
        return new Promise((resolve) => {
            const img = new Image();
            const objUrl = URL.createObjectURL(file);
            img.onload = () => {
                URL.revokeObjectURL(objUrl);
                let { width, height } = img;
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                canvas.getContext('2d').drawImage(img, 0, 0, width, height);
                canvas.toBlob(
                    (blob) => {
                        if (!blob) { resolve(file); return; }
                        resolve(new File([blob], file.name, { type: 'image/jpeg' }));
                    },
                    'image/jpeg',
                    quality
                );
            };
            img.onerror = () => { URL.revokeObjectURL(objUrl); resolve(file); };
            img.src = objUrl;
        });
    },

    // ─── ENVIAR AL SERVIDOR ──────────────────────────────────────────
    async enviarAlServidor() {
        const state = window.carruselState;
        const listaItems = Array.isArray(state.items) ? state.items : (state.items?.items || []);

        if (!state || listaItems.length === 0) {
            Swal.fire({ title: "Lista vacía", text: "Agrega al menos un ítem antes de publicar.", icon: "warning", customClass: { popup: 'rounded-[2rem]' } });
            return;
        }

        const nombreCarrusel = state.config.nombre || "nuevo carrusel";
        const itemsConArchivo = listaItems.filter(i => i._archivoLocal instanceof File);
        const totalSubidas = itemsConArchivo.length;

        const result = await Swal.fire({
            title: `¿Publicar "${nombreCarrusel}"?`,
            text: totalSubidas > 0
                ? `Se subirán ${totalSubidas} imagen${totalSubidas > 1 ? 'es' : ''} al servidor.`
                : "La configuración y los ítems se actualizarán en la base de datos.",
            icon: 'question', showCancelButton: true,
            confirmButtonText: 'Sí, publicar', cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb', customClass: { popup: 'rounded-[2rem]' }
        });

        if (!result.isConfirmed) return;

        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Publicando...</span>',
            html: `
                <div class="space-y-3 py-2">
                    <div class="flex items-center gap-3 text-sm text-slate-600">
                        <span id="swal-step-1" class="material-symbols-outlined text-slate-300 text-lg">radio_button_unchecked</span>
                        ${totalSubidas > 0 ? `Subiendo ${totalSubidas} archivo${totalSubidas > 1 ? 's' : ''}` : 'Preparando datos'}
                    </div>
                    <div class="flex items-center gap-3 text-sm text-slate-600">
                        <span id="swal-step-2" class="material-symbols-outlined text-slate-300 text-lg">radio_button_unchecked</span>
                        Guardando configuración
                    </div>
                    <div class="flex items-center gap-3 text-sm text-slate-600">
                        <span id="swal-step-3" class="material-symbols-outlined text-slate-300 text-lg">radio_button_unchecked</span>
                        Vinculando ítems
                    </div>
                </div>`,
            showConfirmButton: false, allowOutsideClick: false,
            customClass: { popup: 'rounded-[32px] shadow-2xl' }
        });

        const setStep = (n, ok = true) => {
            const el = document.getElementById(`swal-step-${n}`);
            if (el) {
                el.innerText = ok ? 'check_circle' : 'error';
                el.className = `material-symbols-outlined text-lg ${ok ? 'text-emerald-500' : 'text-red-500'}`;
            }
        };

        try {
            const ctrl = window.carruselController;
            if (!ctrl) throw new Error("El controlador no está inicializado");
            if (!window.productoController?._uploadToSupabase) throw new Error("productoController._uploadToSupabase no disponible");

            // ✅ PASO 1 + PASO 2 EN PARALELO:
            // Comprimir + subir archivos  Y  guardar cabecera al mismo tiempo
            const [, resConfig] = await Promise.all([

                // Comprimir y subir todos los archivos locales en paralelo
                Promise.all(listaItems.map(async (item) => {
                    if (!(item._archivoLocal instanceof File)) return;
                    const comprimido = await this._comprimirImagen(item._archivoLocal);
                    const urlBucket = await window.productoController._uploadToSupabase(
                        comprimido, 'carrusel', state.config.nombre || 'carrusel'
                    );
                    const base64Anterior = item.imagen_preview;
                    item.imagen_preview = urlBucket;
                    item.imagen_url_manual = urlBucket;
                    item._archivoLocal = null;
                    _archivosLocales.delete(base64Anterior);
                })),

                // Guardar cabecera al mismo tiempo
                ctrl.guardarConfiguracion(state.config, state._id)
            ]);

            if (!resConfig.exito) throw new Error(resConfig.mensaje);
            const carruselId = resConfig.id;
            setStep(1);
            setStep(2);

            // ✅ PASO 3: Limpiar registros anteriores
            await ctrl.limpiarItemsCarrusel(carruselId);

            // ✅ PASO 3: Insertar todos los ítems EN PARALELO (no for loop)
            const resultados = await Promise.all(
                listaItems.map((item, i) => {
                    const medioVisual = item.imagen_url_manual || item.imagen_preview || item.icono_manual || null;
                    const mediaFinal = (medioVisual?.startsWith('data:')) ? null : medioVisual;

                    const payload = {
                        carrusel_id: carruselId,
                        orden: i,
                        titulo_manual: item.titulo_manual || null,
                        subtitulo_manual: item.subtitulo_manual || null,
                        imagen_url_manual: mediaFinal,
                        link_destino_manual: item.link_destino_manual || item.link || null,
                        producto_id: item.producto_id || null,
                        categoria_id: item.categoria_id || null
                    };
                    if (payload.titulo_manual === '') payload.titulo_manual = null;
                    if (payload.subtitulo_manual === '') payload.subtitulo_manual = null;

                    return ctrl.vincularItemSinRefrescar(payload);
                })
            );

            const errores = resultados.filter(r => r?.exito === false);
            if (errores.length > 0) throw new Error(`Error en ${errores.length} ítem(s): ${errores[0]?.mensaje}`);

            setStep(3);
            await new Promise(r => setTimeout(r, 300));
            Swal.close();

            Swal.fire({
                icon: 'success', title: '¡Publicado!',
                text: `"${nombreCarrusel}" actualizado correctamente.`,
                timer: 2000, showConfirmButton: false,
                customClass: { popup: 'rounded-[2rem]' }
            });

            if (window.carruselController_View) window.carruselController_View.render();
            if (window.RegisterCarrusel?.cerrarYRefrescar) window.RegisterCarrusel.cerrarYRefrescar();
            else location.reload();

        } catch (error) {
            console.error("Error crítico:", error);
            Swal.fire({ title: "Fallo en el guardado", text: error.message, icon: "error", customClass: { popup: 'rounded-[2rem]' } });
        }
    }
};