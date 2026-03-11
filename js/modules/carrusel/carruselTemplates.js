import { MediaHelper } from '../../utils/mediaHelper.js';

export const carruselTemplates = {
    /**
     * Renderiza la estructura base del editor
     */
    renderMain(isEdit, paso, config, items) {
        return `
        <div class="h-full w-full bg-slate-50/50 overflow-y-auto p-4 md:p-8 animate-fade-in custom-scrollbar">
            ${this._renderHeader(isEdit, paso)}
            <div class="max-w-[1400px] mx-auto">
                ${this._renderTabs(paso)}
                ${paso === 1
                ? this._renderPaso1(config)
                : this._renderPaso2(items, config.tipo) // Aquí enviamos la lista de items
            }
            </div>
        </div>
    `;
    },

    _renderHeader(isEdit, paso) {
        return `
            <div class="max-w-[1400px] mx-auto mb-8 flex items-center justify-between">
                <div class="flex items-center gap-4">
                    <button onclick="RegisterCarrusel.cancelarEdicion()" class="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-red-500 shadow-sm transition-all active:scale-95">
                        <span class="material-symbols-outlined">close</span>
                    </button>
                    <div>
                        <h2 class="text-2xl font-black text-slate-800 uppercase tracking-tight">${isEdit ? 'Editar' : 'Nuevo'} Carrusel</h2>
                        <p class="text-slate-500 text-[10px] font-black uppercase tracking-widest">Gestión de Contenido Dinámico y Ubicaciones</p>
                    </div>
                </div>
                <div class="flex gap-3">
                    ${paso === 2 ? `
                        <button onclick="RegisterCarrusel.cambiarPaso(1)" class="px-6 py-3 rounded-xl bg-white border border-slate-200 text-slate-700 font-black text-xs uppercase hover:bg-slate-50 transition-all">Atrás</button>
                        <button onclick="RegisterCarrusel.finalizarGuardado()" class="px-8 py-3 rounded-xl bg-blue-600 text-white font-black text-xs uppercase shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all">Publicar Cambios</button>
                    ` : `
                        <button onclick="RegisterCarrusel.irAPaso2()" class="px-8 py-3 rounded-xl bg-slate-900 text-white font-black text-xs uppercase flex items-center gap-2 shadow-lg shadow-slate-900/20 hover:bg-slate-800 transition-all">Siguiente Paso <span class="material-symbols-outlined text-sm">arrow_forward</span></button>
                    `}
                </div>
            </div>
        `;
    },

    _renderTabs(paso) {
        return `
            <div class="flex mb-8 bg-white p-2 rounded-3xl shadow-sm border border-slate-100 w-fit">
                <button onclick="RegisterCarrusel.cambiarPaso(1)" class="px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${paso === 1 ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}">1. Ubicación y Tipo</button>
                <button onclick="RegisterCarrusel.irAPaso2()" class="px-8 py-3 rounded-2xl text-[10px] font-black uppercase transition-all ${paso === 2 ? 'bg-slate-900 text-white' : 'text-slate-400 hover:text-slate-600'}">2. Selección de Contenido</button>
            </div>
        `;
    },

    _renderPaso1(c) {
        return `
            <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up">
                <div class="lg:col-span-8 space-y-6">
                    <div class="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
                        <h3 class="text-sm font-black text-slate-800 uppercase mb-8 flex items-center gap-3">
                            <span class="material-symbols-outlined text-blue-600">distance</span> Ubicación en la Web
                        </h3>
                        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div class="space-y-2 md:col-span-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Nombre Identificador (Interno)</label>
                                <input type="text" id="cfg_nombre" value="${c.nombre || ''}" placeholder="Ej: Carrusel de Ofertas Verano" class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl p-4 text-sm font-bold transition-all outline-none">
                            </div>

                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Sección Destino</label>
                                <select id="cfg_slug" onchange="RegisterCarrusel.actualizarOrdenAutomatico(this.value)" class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl p-4 text-sm font-bold outline-none cursor-pointer">
                                    <option value="home-top" ${c.ubicacion_slug === 'home-top' ? 'selected' : ''}>Inicio - Superior (Top)</option>
                                    <option value="home-middle" ${c.ubicacion_slug === 'home-middle' ? 'selected' : ''}>Inicio - Cuerpo (Middle)</option>
                                    <option value="home-bottom" ${c.ubicacion_slug === 'home-bottom' ? 'selected' : ''}>Inicio - Pie (Bottom)</option>
                                </select>
                            </div>

                            <div class="space-y-2">
                                <label class="text-[10px] font-black text-slate-400 uppercase ml-2">Prioridad en Sección</label>
                                <div class="relative">
                                    <input type="number" id="cfg_orden_seccion" value="${c.orden_seccion || 0}" readonly class="w-full bg-slate-100 border-2 border-transparent rounded-2xl p-4 text-sm font-bold text-slate-500 outline-none cursor-not-allowed">
                                    <span class="absolute right-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-slate-300 text-sm">lock</span>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div class="bg-white rounded-[2.5rem] p-10 shadow-xl border border-slate-100">
                        <label class="text-[10px] font-black text-slate-400 uppercase ml-2 block mb-2">Descripción o Notas</label>
                        <textarea id="cfg_descripcion" class="w-full bg-slate-50 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl p-4 text-sm font-bold h-24 transition-all outline-none resize-none">${c.descripcion || ''}</textarea>
                    </div>
                </div>

                <div class="lg:col-span-4 space-y-6">
                    <div class="bg-white rounded-[2.5rem] p-8 shadow-xl border border-slate-100">
                        <label class="text-[10px] font-black text-slate-400 uppercase mb-6 block ml-2">¿Qué mostrará este carrusel?</label>
                        <div class="grid gap-3">
                            ${['banners', 'productos', 'categorias'].map(t => `
                                <button onclick="RegisterCarrusel.cambiarTipo('${t}')" class="w-full p-5 rounded-2xl text-left transition-all flex items-center justify-between border-2 ${c.tipo === t ? 'border-blue-600 bg-blue-50/50 text-blue-600' : 'border-slate-50 bg-slate-50 text-slate-400 hover:border-slate-200'}">
                                    <div class="flex items-center gap-3">
                                        <span class="material-symbols-outlined text-xl">${t === 'banners' ? 'gallery_thumbnail' : t === 'productos' ? 'shopping_bag' : 'category'}</span>
                                        <span class="text-xs font-black uppercase">${t}</span>
                                    </div>
                                    <span class="material-symbols-outlined text-sm">${c.tipo === t ? 'radio_button_checked' : 'radio_button_unchecked'}</span>
                                </button>
                            `).join('')}
                        </div>
                        <p class="mt-6 text-[9px] text-slate-400 font-medium px-2 leading-relaxed">
                            <b class="text-slate-600">Nota:</b> Al cambiar el tipo, se reiniciará la lista de ítems para mantener la integridad de los datos.
                        </p>
                    </div>
                </div>
            </div>
        `;
    },

    _renderPaso2(items, tipo) {
        return `
        <div class="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-slide-up pb-20">
            <div class="lg:col-span-4">
                <div id="form_item_container" class="bg-white rounded-[2.5rem] p-8 shadow-xl sticky top-8 border border-slate-100">
                    ${this.renderFormItem(tipo, null)} 
                </div>
            </div>
            <div class="lg:col-span-8 space-y-8">
                <div id="live_preview_container">
                    ${this.renderLivePreview(items || [], 0, tipo)}
                </div>
                <div id="items_list_container">
                    ${this.renderItemsList(items || [])}
                </div>
            </div>
        </div>
    `;
    },
    renderFormItem(tipo, itemEdit = null) {
        const esCat = tipo === 'categorias';
        const esProd = tipo === 'productos';

        // NORMALIZACIÓN DE DATOS (Mapeo de base de datos vs estado local)
        // Esto asegura que si viene de Supabase (manual) o del State lo detecte igual
        const valorMedia = itemEdit?.imagen_preview || itemEdit?.icono_manual || itemEdit?.imagen_url_manual || '';
        const valorTitulo = itemEdit?.titulo || itemEdit?.titulo_manual || '';
        const valorSubtitulo = itemEdit?.subtitulo || itemEdit?.subtitulo_manual || '';
        const valorLink = itemEdit?.link || '';

        // DISEÑO PARA CATEGORÍAS Y PRODUCTOS
        if (tipo !== 'banners') {
            return `
        <h3 class="text-xs font-black uppercase mb-6 text-slate-800 flex items-center gap-2">
            <span class="material-symbols-outlined text-blue-500">${esCat ? 'grid_view' : 'search'}</span>
            ${itemEdit ? 'Editar' : 'Buscar'} ${esCat ? 'Categoría' : 'Producto'}
        </h3>
        
        <div class="space-y-4">
            <div class="relative">
                <input type="text" id="it_search" 
                       oninput="carruselActions.buscarRelacionados(this.value)"
                       placeholder="Escribe nombre de ${esCat ? 'categoría' : 'producto'}..." 
                       class="w-full bg-slate-100 border-2 border-transparent focus:border-blue-500/20 focus:bg-white rounded-2xl p-4 pl-12 pr-12 text-sm font-bold outline-none transition-all"
                       value="${valorTitulo}">
                
                <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">${esCat ? 'label' : 'search'}</span>
                
                <button onclick="carruselActions.limpiarBuscadorRapido()" 
                        class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors">
                    <span class="material-symbols-outlined text-xl">cancel</span>
                </button>
            </div>

            <div id="search_results_list" class="bg-white border-2 border-slate-100 rounded-2xl overflow-hidden hidden shadow-xl max-h-[300px] overflow-y-auto custom-scrollbar">
            </div>

            ${esCat ? `
                <div class="py-1">
                    <button type="button" 
                            onclick="carruselActions.cambiarIconoEdicion()" 
                            class="w-full py-3 border-2 border-dashed border-blue-200 rounded-2xl text-blue-600 text-[10px] font-black uppercase hover:bg-blue-100 hover:border-blue-400 transition-all flex items-center justify-center gap-2 group">
                        <i class="fa-solid fa-icons group-hover:scale-110 transition-transform"></i> 
                        Seleccionar Icono de FontAwesome
                    </button>
                </div>
            ` : ''}

            <input type="hidden" id="it_relacion_id" value="${itemEdit?.relacion_id || itemEdit?.id || ''}">
            <input type="hidden" id="it_titulo" value="${valorTitulo}">
            <input type="hidden" id="it_media_url" value="${valorMedia}">
            <input type="hidden" id="it_link" value="${valorLink}"> 
            <input type="hidden" id="it_subtitulo" value="${valorSubtitulo}"> 

            <div id="preview_box" class="aspect-square bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200 overflow-hidden flex items-center justify-center shadow-inner transition-all">
                ${valorMedia.startsWith('fa-')
                    ? `<i class="${valorMedia} text-6xl text-blue-600 animate-fade-in"></i>`
                    : (valorMedia
                        ? `<img src="${valorMedia}" class="w-full h-full object-cover animate-fade-in">`
                        : `<span class="material-symbols-outlined text-slate-200 text-5xl">image</span>`)
                }
            </div>

            <button onclick="RegisterCarrusel.agregarItemALista()" 
                    class="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-800 active:scale-[0.98] transition-all mt-2">
                ${itemEdit ? 'Actualizar Cambios' : 'Confirmar y Añadir'}
            </button>
        </div>`;
        }

        // DISEÑO PARA BANNERS (Manual)
        return `
    <h3 class="text-xs font-black uppercase mb-6 text-slate-800 flex items-center gap-2">
        <span class="material-symbols-outlined text-blue-500">${itemEdit ? 'edit_note' : 'add_circle'}</span>
        ${itemEdit ? 'Modificar Banner' : 'Nuevo Banner'}
    </h3>
    
    <div class="space-y-5">
        <div class="relative group/img-container aspect-video bg-slate-50 rounded-[1.5rem] border-2 border-dashed border-slate-200 overflow-hidden transition-all">
            <div id="preview_box" class="w-full h-full flex flex-col items-center justify-center">
                ${valorMedia
                ? `<img src="${valorMedia}" class="w-full h-full object-cover animate-fade-in">`
                : `
                    <span class="material-symbols-outlined text-slate-300 text-4xl mb-2">add_photo_alternate</span>
                    <p class="text-[9px] font-black text-slate-400 uppercase text-center px-4">Sube una imagen o video</p>
                `}
            </div>
            
            <div class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover/img-container:opacity-100 transition-all flex items-center justify-center gap-3">
                <button onclick="document.getElementById('file_item').click()" class="w-10 h-10 bg-white rounded-full text-slate-900 shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined">upload_file</span>
                </button>
                <button onclick="carruselActions.pedirUrlImagen()" class="w-10 h-10 bg-white rounded-full text-slate-900 shadow-lg flex items-center justify-center hover:scale-110 transition-transform">
                    <span class="material-symbols-outlined">link</span>
                </button>
            </div>
            
            <input type="file" id="file_item" hidden accept="image/*,video/*" onchange="carruselActions.previsualizarMediaLocal(this)">
            <input type="hidden" id="it_media_url" value="${valorMedia}">
        </div>

        <div class="grid gap-4">
            <div class="space-y-1">
                <label class="text-[9px] font-black text-slate-400 uppercase ml-2">Título Principal</label>
                <input type="text" id="it_titulo" value="${valorTitulo}" 
                       class="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold outline-none focus:bg-white border border-transparent focus:border-slate-200 transition-all">
            </div>
            <div class="space-y-1">
                <label class="text-[9px] font-black text-slate-400 uppercase ml-2">Texto del Botón / Subtítulo</label>
                <input type="text" id="it_subtitulo" value="${valorSubtitulo}" 
                       class="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold outline-none focus:bg-white border border-transparent focus:border-slate-200 transition-all">
            </div>
            <div class="space-y-1">
                <label class="text-[9px] font-black text-slate-400 uppercase ml-2">Enlace de Destino (URL)</label>
                <input type="text" id="it_link" value="${valorLink}" 
                       class="w-full bg-slate-50 rounded-xl p-3 text-xs font-bold outline-none focus:bg-white border border-transparent focus:border-slate-200 transition-all">
            </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-4">
            ${itemEdit ? `
                <button onclick="RegisterCarrusel.cancelarEdicionItem()" class="bg-slate-100 text-slate-600 p-4 rounded-xl font-black text-[10px] uppercase hover:bg-slate-200 transition-all">Cancelar</button>
                <button onclick="RegisterCarrusel.agregarItemALista()" class="bg-blue-600 text-white p-4 rounded-xl font-black text-[10px] uppercase hover:bg-blue-700 shadow-lg shadow-blue-500/20 transition-all">Actualizar</button>
            ` : `
                <button onclick="RegisterCarrusel.agregarItemALista()" class="col-span-2 bg-slate-900 text-white p-5 rounded-xl font-black text-[10px] uppercase shadow-lg hover:bg-slate-800 transition-all">Añadir al Carrusel</button>
            `}
        </div>
    </div>`;
    },
    renderLivePreview(items, activo = 0, tipo = 'banners') {
        if (items.length === 0) {
            return `<div class="aspect-[21/9] bg-slate-200 rounded-[3rem] flex items-center justify-center border-4 border-dashed border-slate-300">
            <div class="text-center opacity-30">
                <span class="material-symbols-outlined text-6xl text-slate-400">view_carousel</span>
                <p class="text-xs font-black uppercase mt-2 text-slate-400 tracking-widest">Vista previa vacía</p>
            </div>
        </div>`;
        }

        // VISTA PREVIA PARA PRODUCTOS Y CATEGORÍAS (Tarjetas)
        if (tipo !== 'banners') {
            const esCat = tipo === 'categorias';

            return `
            <div class="bg-slate-50 border-2 border-slate-100 rounded-[3rem] p-8 relative">
                <div class="flex justify-between items-center mb-6 ml-4">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previsualización de ${esCat ? 'Categorías' : 'Productos'}</p>
                    <div class="flex gap-1">
                        <div class="w-2 h-2 rounded-full bg-blue-500"></div>
                        <div class="w-2 h-2 rounded-full bg-slate-200"></div>
                    </div>
                </div>
                <div class="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
                    ${items.map((it) => {
                const esIcono = it.imagen_preview?.startsWith('fa-');

                return `
                        <div class="min-w-[160px] max-w-[160px] bg-white rounded-[2.5rem] p-4 shadow-sm border border-slate-100 flex-shrink-0 animate-fade-in group">
                            
                            <div class="aspect-square bg-slate-50 rounded-[2rem] mb-4 overflow-hidden relative flex items-center justify-center">
                                ${esIcono ?
                        `<i class="${it.imagen_preview} text-4xl text-blue-600 transition-all duration-500 group-hover:scale-125 group-hover:rotate-6"></i>` :
                        `<img src="${it.imagen_preview}" class="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" onerror="this.src='https://placehold.co/200?text=Error'">`
                    }
                            </div>

                            <p class="text-[11px] font-black uppercase text-slate-800 line-clamp-2 h-8 leading-tight text-center px-1">
                                ${it.titulo || 'Sin nombre'}
                            </p>

                            ${!esCat ? `
                                <div class="mt-4 flex justify-between items-center px-1">
                                    <span class="text-blue-600 font-black text-xs">
                                        ${it.subtitulo ? it.subtitulo : '$ --.--'}
                                    </span>
                                    <div class="w-7 h-7 bg-slate-900 text-white rounded-full flex items-center justify-center group-hover:bg-blue-600 transition-colors">
                                        <span class="material-symbols-outlined text-[14px]">shopping_cart</span>
                                    </div>
                                </div>
                            ` : `
                                <div class="mt-3 pt-3 border-t border-slate-50">
                                    <p class="text-[8px] font-black text-blue-500/40 text-center uppercase tracking-widest group-hover:text-blue-500 transition-colors">Ver Categoría</p>
                                </div>
                            `}
                        </div>
                    `}).join('')}
                </div>
            </div>`;
        }

        // VISTA PREVIA PARA BANNERS (Slider Gigante)
        const item = items[activo] || items[0];
        const media = MediaHelper.obtenerInfoVideo(item.imagen_preview);

        return `
        <div class="bg-slate-900 rounded-[3rem] p-2 shadow-2xl overflow-hidden relative group border-4 border-white animate-fade-in">
            <div class="aspect-[21/9] w-full bg-slate-800 rounded-[2.5rem] flex items-center justify-center relative overflow-hidden">
                <div class="absolute inset-0 bg-gradient-to-r from-black/90 via-black/40 to-transparent z-[1]"></div>
                <img src="${media.thumb}" class="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-[2s]">
                
                <div class="relative z-10 w-full h-full flex flex-col justify-center px-16 text-left">
                    <h4 class="text-white text-4xl font-black uppercase tracking-tighter max-w-lg leading-[0.9] mb-4 drop-shadow-lg">
                        ${item.titulo || 'SIN TÍTULO'}
                    </h4>
                    <div class="flex items-center gap-4">
                         <div class="px-8 py-3 bg-white text-slate-900 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:bg-blue-600 hover:text-white transition-all cursor-pointer">
                            ${item.subtitulo || 'EXPLORAR'}
                         </div>
                    </div>
                </div>

                <div class="absolute bottom-8 right-12 z-20 flex gap-3">
                    <button onclick="RegisterCarrusel.cambiarSlide(-1)" class="w-12 h-12 rounded-full bg-black/20 text-white backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all active:scale-90">
                        <span class="material-symbols-outlined">chevron_left</span>
                    </button>
                    <button onclick="RegisterCarrusel.cambiarSlide(1)" class="w-12 h-12 rounded-full bg-black/20 text-white backdrop-blur-xl border border-white/10 flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all active:scale-90">
                        <span class="material-symbols-outlined">chevron_right</span>
                    </button>
                </div>
            </div>
        </div>`;
    },
    renderItemsList(items) {
        return `
    <div class="space-y-4">
        <div class="flex justify-between items-center px-4">
            <h3 class="text-[10px] font-black text-slate-400 uppercase tracking-widest">Elementos en el Carrusel (${items.length})</h3>
            <p class="text-[9px] font-bold text-blue-500 uppercase tracking-tighter">Arrastra para reordenar</p>
        </div>
        <div class="grid gap-3">
            ${items.length === 0 ? `
                <div class="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-12 text-center">
                    <p class="text-xs font-bold text-slate-400 uppercase tracking-widest">No hay elementos agregados aún</p>
                </div>
            ` : items.map((item, idx) => {
            // Simplificamos la lógica de detección
            const esIcono = item.imagen_preview && item.imagen_preview.startsWith('fa-');

            // IMPORTANTE: Si MediaHelper falla, la imagen no carga. 
            // Agregamos un fallback por si item.imagen_preview es null
            const srcImagen = esIcono ? '' : (item.imagen_preview ? MediaHelper.obtenerInfoVideo(item.imagen_preview).thumb : 'https://placehold.co/100?text=No+Image');

            return `
                <div class="bg-white p-4 rounded-[2rem] flex items-center gap-4 shadow-sm border border-slate-100 group transition-all hover:border-blue-200 hover:shadow-md">
                    
                    <div class="flex flex-col gap-1">
                        <button onclick="RegisterCarrusel.reordenar(${idx}, -1)" class="material-symbols-outlined text-slate-300 hover:text-blue-500 transition-colors text-xl">expand_less</button>
                        <button onclick="RegisterCarrusel.reordenar(${idx}, 1)" class="material-symbols-outlined text-slate-300 hover:text-blue-500 transition-colors text-xl">expand_more</button>
                    </div>

                    <div class="w-20 h-16 rounded-2xl overflow-hidden bg-slate-50 border border-slate-100 flex-shrink-0 flex items-center justify-center">
                        ${esIcono ?
                    `<i class="${item.imagen_preview} text-2xl text-blue-600"></i>` :
                    `<img src="${srcImagen}" class="w-full h-full object-cover" onerror="this.src='https://placehold.co/100?text=Error'">`
                }
                    </div>

                    <div class="flex-1 min-w-0">
                        <div class="flex flex-col gap-0.5">
                            <p class="text-[11px] font-black text-slate-800 uppercase truncate">${item.titulo || 'SIN TÍTULO'}</p>
                            <span class="text-[9px] text-blue-500 font-bold italic truncate">${item.subtitulo || item.tipo_contenido || ''}</span>
                        </div>
                    </div>

                    <div class="flex gap-2 pr-2">
                        <button onclick="RegisterCarrusel.cargarItemParaEditar(${idx})" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-blue-600 hover:text-white transition-all flex items-center justify-center">
                            <span class="material-symbols-outlined text-sm">edit</span>
                        </button>
                        
                        <button onclick="RegisterCarrusel.quitarItem(${idx})" class="w-10 h-10 rounded-xl bg-slate-50 text-slate-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center">
                            <span class="material-symbols-outlined text-sm">delete</span>
                        </button>
                    </div>
                </div>
                `;
        }).join('')}
        </div>
    </div>`;
    },
    renderConsultaPro(items, indexActivo = 0, tipo) {
        if (!items || items.length === 0) return `<div class="p-10 text-center text-white/50">Sin Contenido</div>`;

        const esBanner = tipo === 'banners';
        let slidesHTML = '';
        let totalSlides = 0;

        if (esBanner) {
            totalSlides = items.length;
            slidesHTML = items.map((item, idx) => `
            <div class="modal-slide-consulta ${idx === indexActivo ? 'flex' : 'hidden'} animate-fade-in w-full justify-center">
                <div class="w-full max-w-[850px] aspect-[21/9] bg-white rounded-[3rem] overflow-hidden shadow-2xl border-4 border-white relative">
                    <img src="${item.imagen}" class="w-full h-full object-cover">
                    <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent flex flex-col justify-end p-10 text-left">
                        <h3 class="text-white text-4xl font-black uppercase leading-none">${item.titulo || ''}</h3>
                        <p class="text-blue-400 font-bold uppercase tracking-[0.3em] text-xs mt-2">${item.subtitulo || ''}</p>
                    </div>
                </div>
            </div>
        `).join('');
        } else {
            const grupos = [];
            for (let i = 0; i < items.length; i += 3) grupos.push(items.slice(i, i + 3));
            totalSlides = grupos.length;

            slidesHTML = grupos.map((grupo, idx) => `
            <div class="modal-slide-consulta ${idx === indexActivo ? 'flex' : 'hidden'} animate-fade-in w-full justify-center gap-6">
                ${grupo.map(item => {
                const esIcono = item.imagen && item.imagen.startsWith('fa-');
                return `
                        <div class="w-[280px] bg-white rounded-[3rem] p-8 shadow-2xl flex flex-col items-center text-center border border-white/20">
                            <div class="w-24 h-24 mb-6 flex items-center justify-center bg-slate-50 rounded-[2rem] overflow-hidden shadow-inner">
                                ${esIcono ? `<i class="${item.imagen} text-4xl text-blue-600"></i>` : `<img src="${item.imagen}" class="w-full h-full object-contain p-4">`}
                            </div>
                            <h4 class="font-black text-[13px] text-slate-800 uppercase line-clamp-2 h-10 leading-tight">${item.titulo}</h4>
                            <div class="w-10 h-1 bg-blue-500 rounded-full mt-4 mb-2"></div>
                            <p class="text-blue-600 font-black text-[10px] uppercase tracking-widest">${item.subtitulo || ''}</p>
                        </div>
                    `;
            }).join('')}
            </div>
        `).join('');
        }

        return `
        <div class="relative w-full max-w-7xl mx-auto px-16"> 
            <div id="modal-track-consulta" class="py-10 overflow-visible">${slidesHTML}</div>
            
            <div class="absolute inset-y-0 left-0 right-0 flex items-center justify-between pointer-events-none z-[9999]">
                <button onclick="event.stopPropagation(); carruselController_View.moverModalSlide(-1, ${totalSlides})" class="pointer-events-auto w-16 h-16 ml-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all shadow-2xl active:scale-90">
                    <span class="material-symbols-outlined text-4xl">chevron_left</span>
                </button>
                <button onclick="event.stopPropagation(); carruselController_View.moverModalSlide(1, ${totalSlides})" class="pointer-events-auto w-16 h-16 mr-2 rounded-full bg-white/10 backdrop-blur-xl border border-white/30 text-white flex items-center justify-center hover:bg-white hover:text-slate-900 transition-all shadow-2xl active:scale-90">
                    <span class="material-symbols-outlined text-4xl">chevron_right</span>
                </button>
            </div>

            <div class="flex justify-center gap-3 mt-4" id="modal-dots-consulta">
                ${Array.from({ length: totalSlides }).map((_, i) => `
                    <div class="h-1.5 transition-all duration-500 rounded-full ${i === indexActivo ? 'w-10 bg-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)]' : 'w-3 bg-white/20'}"></div>
                `).join('')}
            </div>
        </div>
    `;
    }
};
window.carruselTemplates = carruselTemplates;