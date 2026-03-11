import { productManager } from '../modals/createProduct.js';
import { PaginationHelper } from '../utils/paginationHelper.js';

export const productoView = {
    _estado: {
        busqueda: '',
        categoriasSeleccionadas: [],
        orden: 'desc',
        paginaActual: 1,
        filasPorPagina: 10
    },

    // --- MÉTODOS DE NOTIFICACIÓN ---
    notificarExito(mensaje) {
        Swal.fire({
            icon: 'success',
            title: '<span class="text-slate-800 font-black uppercase text-sm">¡Éxito!</span>',
            text: mensaje,
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    notificarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: '<span class="text-red-600 font-black uppercase text-sm">Error</span>',
            text: mensaje,
            confirmButtonColor: '#2563eb',
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    mostrarCargando(mensaje = 'Procesando...') {
        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Cargando</span>',
            text: mensaje,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    _obtenerColorCategoria(nombre) {
        if (!nombre) return 'bg-slate-100 text-slate-500';
        const coloresSeguros = [
            'bg-blue-100 text-blue-700', 'bg-emerald-100 text-emerald-700', 'bg-violet-100 text-violet-700',
            'bg-cyan-100 text-cyan-700', 'bg-indigo-100 text-indigo-700', 'bg-lime-100 text-lime-700',
            'bg-fuchsia-100 text-fuchsia-700', 'bg-sky-100 text-sky-700', 'bg-teal-100 text-teal-700'
        ];
        let hash = 0;
        for (let i = 0; i < nombre.length; i++) hash = nombre.charCodeAt(i) + ((hash << 5) - hash);
        return coloresSeguros[Math.abs(hash) % coloresSeguros.length];
    },

    /**
     * RENDER PRINCIPAL
     */
    render(productos, todasLasCategorias = []) {
        const contenedor = document.getElementById('content-area');
        if (!contenedor) return;

        // --- PRESERVACIÓN DE FOCO ---
        const activeElementId = document.activeElement ? document.activeElement.id : null;
        const cursorPosition = document.activeElement ? document.activeElement.selectionStart : null;

        if (todasLasCategorias.length > 0) {
            this._categoriasDisponibles = todasLasCategorias.map(c => c.nombre || c).filter(Boolean);
            this._maestroCategorias = todasLasCategorias;
        } else {
            this._categoriasDisponibles = [...new Set(productos.map(p => p.nombre_categoria).filter(Boolean))];
        }

        let filtrados = this._ordenarDatos(this._filtrarDatos(productos));

        const todosConWhatsapp = filtrados.length > 0 && filtrados.every(p => p.habilitar_whatsapp);
        const todosConPrecio = filtrados.length > 0 && filtrados.every(p => p.mostrar_precio);

        contenedor.innerHTML = `
            <div class="p-8 animate-fade-in max-h-[calc(100vh-64px)] overflow-y-auto">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Gestión de Inventario</h1>
                        <p class="text-slate-500 text-sm">Control total de visibilidad y catálogo.</p>
                    </div>
                    <button onclick="productoController.mostrarFormularioCrear()" 
                            title="Agregar nuevo producto al catálogo"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-md font-bold text-sm flex items-center gap-2">
                        <span class="material-symbols-outlined text-[20px]">add_box</span> Nuevo Producto
                    </button>
                </div>

                <div class="bg-slate-50/50 p-6 rounded-[32px] border border-slate-100 mb-6 space-y-4">
                    <div class="flex flex-wrap items-center gap-4">
                        <div class="relative flex-1 min-w-[280px]">
                            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">search</span>
                            <input type="text" 
                                   id="main-search-input"
                                   oninput="productoView.gestionarBusqueda(this.value)" 
                                   value="${this._estado.busqueda}"
                                   class="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-12 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 font-medium transition-all" 
                                   placeholder="Buscar por nombre, categoría o subcategoría...">
                            ${this._estado.busqueda ? `
                                <button onclick="productoView.limpiarBusquedaRapida()" class="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-red-500 transition-colors">
                                    <span class="material-symbols-outlined text-lg">cancel</span>
                                </button>
                            ` : ''}
                        </div>

                        <div class="relative w-full md:w-80">
                            <span class="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">sell</span>
                            <input type="text" 
                                   id="category-search-input"
                                   onkeyup="productoView.filtrarSugerencias(this.value)"
                                   onfocus="productoView.filtrarSugerencias(this.value)"
                                   class="w-full bg-white border border-slate-200 rounded-2xl py-3 pl-12 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 font-medium transition-all" 
                                   placeholder="Filtrar por categoría específica..."
                                   autocomplete="off">
                            <div id="suggestions-panel" class="hidden absolute z-[100] w-full mt-2 bg-white border border-slate-200 rounded-2xl shadow-2xl max-h-60 overflow-y-auto p-2"></div>
                        </div>

                        <div class="flex items-center gap-2">
                            <button onclick="productoView.gestionarOrden()" 
                                    title="Cambiar orden alfabético"
                                    class="flex items-center gap-2 px-5 py-3 bg-white border border-slate-200 rounded-2xl text-slate-600 hover:text-blue-600 transition-all shadow-sm font-bold text-xs uppercase">
                                <span class="material-symbols-outlined text-lg">${this._estado.orden === 'asc' ? 'sort_by_alpha' : 'text_rotate_vertical'}</span>
                                ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}
                            </button>
                        </div>
                    </div>

                    ${this._renderEtiquetasFiltro()}

                    <div class="flex items-center gap-6 bg-white/50 px-6 py-3 rounded-2xl border border-dashed border-slate-200">
                        <div class="flex items-center gap-3 border-r border-slate-200 pr-6" title="Activar/Desactivar WhatsApp en productos filtrados">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Global WhatsApp</span>
                            ${this._renderSwitch('global', 'habilitar_whatsapp', todosConWhatsapp, 'emerald', true)}
                        </div>
                        <div class="flex items-center gap-3" title="Activar/Desactivar precios en productos filtrados">
                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Global Precios</span>
                            ${this._renderSwitch('global', 'mostrar_precio', todosConPrecio, 'blue', true)}
                        </div>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-[32px] shadow-sm overflow-hidden mb-8">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse">
                            <thead>
                                <tr class="bg-slate-50/80">
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase w-20 text-center">N°</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase">Producto / Categoría Padre</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Precio</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Stock</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center">WhatsApp</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center">Precio Pub.</th>
                                    <th class="px-6 py-5 text-[10px] font-black text-slate-400 uppercase text-center w-48">Acciones</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100">
                                ${this._generarFilas(filtrados)}
                            </tbody>
                        </table>
                    </div>
                    ${this._generarPaginacion(filtrados.length)}
                </div>
            </div>
        `;

        // RE-APLICAR FOCO Y POSICIÓN DEL CURSOR TRAS EL RENDER
        if (activeElementId) {
            setTimeout(() => {
                const element = document.getElementById(activeElementId);
                if (element) {
                    element.focus();
                    if (cursorPosition !== null && (element.tagName === 'INPUT' || element.tagName === 'TEXTAREA')) {
                        element.setSelectionRange(cursorPosition, cursorPosition);
                    }
                }
            }, 0);
        }

        // Listener para cerrar paneles de sugerencias al hacer clic fuera
        document.addEventListener('click', (e) => {
            const panel = document.getElementById('suggestions-panel');
            const input = document.getElementById('category-search-input');
            if (panel && !panel.contains(e.target) && e.target !== input) {
                panel.classList.add('hidden');
            }
        });
    },

    // --- TABLA Y FILAS ---
    _generarFilas(datos) {
        const inicio = (this._estado.paginaActual - 1) * this._estado.filasPorPagina;
        const paged = datos.slice(inicio, inicio + this._estado.filasPorPagina);

        return paged.map((p, i) => {
            const dataEnc = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
            const nombreMostrarCat = p.categoria_padre_nombre || 'General';
            const colorCat = this._obtenerColorCategoria(nombreMostrarCat);

            return `
                <tr class="hover:bg-blue-50/40 transition-colors group">
                    <td class="px-6 py-5 text-center text-xs font-bold text-slate-400">${inicio + i + 1}</td>
                    <td class="px-6 py-5">
                        <div class="flex items-center gap-3">
                            <img src="${p.imagen_url}" class="h-11 w-11 rounded-xl object-cover border border-slate-100 shadow-sm">
                            <div class="flex flex-col text-left">
                                <span class="text-slate-800 font-bold uppercase text-[12px] tracking-wide mb-1 leading-none">${p.nombre}</span>
                                <span title="Ruta completa: ${p.nombre_categoria || 'General'}" 
                                      class="px-2 py-0.5 rounded text-[9px] font-black uppercase w-fit ${colorCat} cursor-help">
                                    ${nombreMostrarCat}
                                </span>
                            </div>
                        </div>
                    </td>
                    <td class="px-6 py-5 text-center font-black text-slate-700 text-sm">Bs. ${p.precio}</td>
                    <td class="px-6 py-5 text-center">
                        <span class="px-2 py-1 rounded-lg text-[10px] font-black uppercase ${p.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}">
                            ${p.stock} UDS
                        </span>
                    </td>
                    <td class="px-6 py-5 text-center">${this._renderSwitch(p.id, 'habilitar_whatsapp', p.habilitar_whatsapp, 'emerald', false, p.nombre)}</td>
                    <td class="px-6 py-5 text-center">${this._renderSwitch(p.id, 'mostrar_precio', p.mostrar_precio, 'blue', false, p.nombre)}</td>
                    <td class="px-6 py-4 text-center">
                        <div class="flex justify-center gap-2 opacity-80 group-hover:opacity-100">
                            <button onclick="productoController.mostrarFormularioEditar('${p.id}')" 
                                    class="w-9 h-9 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                                <span class="material-symbols-outlined text-sm">edit</span>
                            </button>
                           <button onclick="productoController.verDetalle('${p.id}')" 
                                class="w-9 h-9 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm">
                            <span class="material-symbols-outlined text-sm">visibility</span>
                        </button>
                            <button onclick="productoView.confirmarEliminacion('${dataEnc}')" 
                                    class="w-9 h-9 flex items-center justify-center rounded-xl bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm">
                                <span class="material-symbols-outlined text-sm">delete</span>
                            </button>
                        </div>
                    </td>
                </tr>`;
        }).join('');
    },

    async mostrarDetalle(p) {
        const niveles = p.nombre_categoria ? p.nombre_categoria.split(' > ') : ['General'];
        Swal.fire({
            title: `<span class="text-slate-800 font-black uppercase text-xs tracking-widest">Ficha de Producto</span>`,
            html: `
                <div class="text-left space-y-6">
                    <div class="flex gap-4 items-start bg-slate-50 p-4 rounded-[24px] border border-slate-100">
                        <img src="${p.imagen_url}" class="w-24 h-24 rounded-2xl object-cover shadow-md border-2 border-white">
                        <div class="flex-1">
                            <h3 class="text-lg font-bold text-slate-800 leading-tight uppercase mb-1">${p.nombre}</h3>
                            <div class="flex flex-wrap items-center gap-1">
                                ${niveles.map((n, i) => `
                                    <span class="text-[10px] font-bold ${i === niveles.length - 1 ? 'text-blue-600' : 'text-slate-400'} uppercase">
                                        ${n}
                                    </span>
                                    ${i < niveles.length - 1 ? '<span class="material-symbols-outlined text-[12px] text-slate-300">chevron_right</span>' : ''}
                                `).join('')}
                            </div>
                        </div>
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-blue-50/50 p-4 rounded-2xl border border-blue-100">
                            <span class="text-[9px] font-black text-blue-400 uppercase block mb-1">Precio</span>
                            <span class="text-xl font-black text-blue-700">Bs. ${p.precio}</span>
                        </div>
                        <div class="bg-emerald-50/50 p-4 rounded-2xl border border-emerald-100">
                            <span class="text-[9px] font-black text-emerald-400 uppercase block mb-1">Stock</span>
                            <span class="text-xl font-black text-emerald-700">${p.stock}</span>
                        </div>
                    </div>
                </div>
            `,
            confirmButtonText: 'CERRAR',
            confirmButtonColor: '#1e293b',
            customClass: { popup: 'rounded-[32px] shadow-2xl', confirmButton: 'rounded-xl px-8 py-3 font-bold text-xs' }
        });
    },

    _renderSwitch(id, campo, valor, color, esGlobal = false, nombreObj = '') {
        const checked = valor ? 'checked' : '';
        const params = `'${id}', '${campo}', ${valor}, ${esGlobal}, '${nombreObj.replace(/'/g, "\\'")}'`;
        return `
            <div class="flex justify-center">
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" class="sr-only peer" ${checked} 
                            onclick="event.preventDefault(); productoView.confirmarCambioSwitch(${params})">
                    <div class="w-9 h-5 bg-slate-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-${color}-500 shadow-inner"></div>
                </label>
            </div>`;
    },

    confirmarCambioSwitch(id, campo, valorActual, esGlobal, nombre) {
        const nuevoEstado = !valorActual;

        const esWhatsApp = campo === 'ws_active' || campo === 'habilitar_whatsapp';
        const etiquetaFeature = esWhatsApp ? 'WhatsApp' : 'Precio';
        const accionClave = nuevoEstado ? 'ACTIVAR' : 'DESACTIVAR';

        let titulo, mensaje;

        if (esGlobal) {
            const fuenteDatos = window.productosRaw || [];
            const filtrados = this._filtrarDatos(fuenteDatos);

            const productosAActualizar = filtrados.filter(p => p[campo] !== nuevoEstado);
            const cantidad = productosAActualizar.length;
            const idsParaActualizar = productosAActualizar.map(p => p.id);

            if (cantidad === 0) {
                return Swal.fire({
                    icon: 'info',
                    title: `<span class="text-xs font-black uppercase text-slate-800">Sin cambios</span>`,
                    text: `Todos los productos filtrados ya tienen ${etiquetaFeature} ${nuevoEstado ? 'activado' : 'desactivado'}.`,
                    confirmButtonColor: '#3b82f6',
                    customClass: { popup: 'rounded-[32px]' }
                });
            }

            titulo = `<span class="text-blue-600 font-black uppercase text-xs">¿${accionClave} UNIVERSAL?</span>`;
            mensaje = `Se han detectado <b>${cantidad}</b> productos con <b>${etiquetaFeature}</b> ${nuevoEstado ? 'apagado' : 'encendido'}. <br> ¿Deseas ${accionClave.toLowerCase()}los todos?`;

            Swal.fire({
                title: titulo,
                html: `<p class="text-sm text-slate-600">${mensaje}</p>`,
                icon: 'question',
                showCancelButton: true,
                reverseButtons: true,
                confirmButtonText: `SÍ, ${accionClave} (${cantidad})`,
                cancelButtonText: 'CANCELAR',
                confirmButtonColor: nuevoEstado ? '#10b981' : '#ef4444',
                customClass: {
                    popup: 'rounded-[32px] shadow-2xl',
                    confirmButton: 'rounded-xl px-5 py-2.5 text-xs font-bold uppercase',
                    cancelButton: 'rounded-xl px-5 py-2.5 text-xs font-bold uppercase'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    productoController.toggleMasivoFiltrado(campo, nuevoEstado, idsParaActualizar);
                }
            });
        } else {
            titulo = `<span class="text-slate-800 font-black uppercase text-xs">Confirmar cambio</span>`;
            mensaje = `¿Deseas ${accionClave.toLowerCase()} <b>${etiquetaFeature}</b> para <b>${nombre.toUpperCase()}</b>?`;

            Swal.fire({
                title: titulo,
                html: `<p class="text-sm text-slate-600">${mensaje}</p>`,
                icon: 'question',
                showCancelButton: true,
                reverseButtons: true,
                confirmButtonText: `SÍ, ${accionClave}`,
                cancelButtonText: 'CANCELAR',
                confirmButtonColor: nuevoEstado ? '#10b981' : '#3b82f6',
                customClass: {
                    popup: 'rounded-[32px] shadow-2xl',
                    confirmButton: 'rounded-xl px-5 py-2.5 text-xs font-bold uppercase',
                    cancelButton: 'rounded-xl px-5 py-2.5 text-xs font-bold uppercase'
                }
            }).then((result) => {
                if (result.isConfirmed) {
                    productoController.toggleEstado(id, campo, nuevoEstado);
                }
            });
        }
    },

    confirmarEliminacion(dataEncoded) {
        try {
            const p = JSON.parse(decodeURIComponent(escape(atob(dataEncoded))));
            productoController.eliminar(p.id);
        } catch (error) {
            console.error("Error al procesar datos para eliminación:", error);
            this.notificarError('No se pudo procesar la solicitud de eliminación.');
        }
    },

    limpiarBusquedaRapida() {
        this._estado.busqueda = '';
        this._estado.paginaActual = 1;
        productoController.refrescarVista();
        setTimeout(() => {
            const input = document.getElementById('main-search-input');
            if (input) input.focus();
        }, 50);
    },

    _renderEtiquetasFiltro() {
        if (this._estado.categoriasSeleccionadas.length === 0) return '';
        return `
            <div class="flex flex-wrap items-center gap-2 animate-fade-in">
                <span class="text-[10px] font-black text-slate-400 uppercase mr-2">Filtros Activos:</span>
                ${this._estado.categoriasSeleccionadas.map(cat => `
                    <div class="flex items-center gap-2 bg-blue-600 text-white pl-3 pr-1 py-1 rounded-full text-[11px] font-bold shadow-sm">
                        ${cat.toUpperCase()}
                        <button onclick="productoView.quitarFiltroCategoria('${cat}')" class="hover:bg-blue-500 rounded-full w-5 h-5 flex items-center justify-center transition-colors">
                            <span class="material-symbols-outlined text-sm">close</span>
                        </button>
                    </div>
                `).join('')}
                <button onclick="productoView.limpiarFiltros()" class="text-[10px] font-black text-red-500 hover:text-red-700 uppercase ml-2 underline">Limpiar Todo</button>
            </div>
        `;
    },

    filtrarSugerencias(query) {
        const panel = document.getElementById('suggestions-panel');
        if (!panel) return;
        const coincidencias = this._categoriasDisponibles.filter(cat =>
            cat.toLowerCase().includes(query.toLowerCase()) &&
            !this._estado.categoriasSeleccionadas.includes(cat)
        );
        if (coincidencias.length > 0) {
            panel.classList.remove('hidden');
            panel.innerHTML = coincidencias.map(cat => `
                <div onclick="productoView.agregarFiltroCategoria('${cat}')" class="px-4 py-3 hover:bg-blue-50 rounded-xl cursor-pointer text-sm font-medium text-slate-700 transition-colors">
                    ${cat}
                </div>
            `).join('');
        } else {
            panel.classList.remove('hidden');
            panel.innerHTML = `<div class="p-4 text-xs font-bold text-slate-400 text-center">Sin resultados</div>`;
            if (query === '') panel.classList.add('hidden');
        }
    },

    _filtrarDatos(d) {
        let resultados = [...d];
        if (this._estado.busqueda) {
            const t = this._estado.busqueda.toLowerCase();
            resultados = resultados.filter(x =>
                x.nombre.toLowerCase().includes(t) ||
                (x.nombre_categoria && x.nombre_categoria.toLowerCase().includes(t)) ||
                (x.categoria_padre_nombre && x.categoria_padre_nombre.toLowerCase().includes(t))
            );
        }
        if (this._estado.categoriasSeleccionadas.length > 0) {
            resultados = resultados.filter(x =>
                this._estado.categoriasSeleccionadas.includes(x.nombre_categoria) ||
                this._estado.categoriasSeleccionadas.includes(x.categoria_nombre) ||
                this._estado.categoriasSeleccionadas.includes(x.categoria_padre_nombre)
            );
        }
        return resultados;
    },

    _generarPaginacion(total) {
        return PaginationHelper.render(
            total,
            this._estado.filasPorPagina,
            this._estado.paginaActual,
            'productoView'
        );
    },

    agregarFiltroCategoria(cat) {
        if (!this._estado.categoriasSeleccionadas.includes(cat)) {
            this._estado.categoriasSeleccionadas.push(cat);
            this._estado.paginaActual = 1;
            this._estado.busqueda = '';
            productoController.refrescarVista();
        }
    },
    quitarFiltroCategoria(cat) { this._estado.categoriasSeleccionadas = this._estado.categoriasSeleccionadas.filter(c => c !== cat); productoController.refrescarVista(); },
    limpiarFiltros() { this._estado.categoriasSeleccionadas = []; this._estado.busqueda = ''; productoController.refrescarVista(); },
    verFichaDetalle(id) { productoController.verDetalle(id); },
    gestionarBusqueda(v) { this._estado.busqueda = v; this._estado.paginaActual = 1; productoController.refrescarVista(); },
    gestionarOrden() { this._estado.orden = this._estado.orden === 'asc' ? 'desc' : 'asc'; productoController.refrescarVista(); },
    cambiarPagina(p) { this._estado.paginaActual = p; productoController.refrescarVista(); },
    _ordenarDatos(d) { return [...d].sort((a, b) => this._estado.orden === 'asc' ? a.nombre.localeCompare(b.nombre) : b.nombre.localeCompare(a.nombre)); }
};

window.productoView = productoView;
window.productManager = productManager;