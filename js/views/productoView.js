import { productManager } from '../modals/createProduct.js';
import { PaginationHelper } from '../utils/paginationHelper.js';

export const productoView = {
    _estado: {
        busqueda: '',
        categoriasSeleccionadas: [],
        orden: 'desc',
        paginaActual: 1,
        filasPorPagina: 10,
        seleccionados: []
    },

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

    _capitalizarPrimera(texto) {
        if (!texto) return '';
        return texto.charAt(0).toUpperCase() + texto.slice(1).toLowerCase();
    },

    _capitalizarCadaPalabra(texto) {
        if (!texto) return '';
        return texto
            .toLowerCase()
            .split(' ')
            .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
            .join(' ');
    },

    render(productos, todasLasCategorias = []) {
        const contenedor = document.getElementById('content-area');
        if (!contenedor) return;

        const activeElementId = document.activeElement ? document.activeElement.id : null;
        const cursorPosition = document.activeElement ? document.activeElement.selectionStart : null;

        if (todasLasCategorias.length > 0) {
            this._categoriasDisponibles = [
                ...new Set(todasLasCategorias.map(c => c.nombre).filter(Boolean))
            ].sort((a, b) => a.localeCompare(b));
            this._maestroCategorias = todasLasCategorias;
        } else {
            this._categoriasDisponibles = [...new Set(productos.map(p => p.nombre_categoria).filter(Boolean))];
        }

        let filtrados = this._ordenarDatos(this._filtrarDatos(productos));
        window._productosFiltrados = filtrados;

        const todosConWhatsapp = filtrados.length > 0 && filtrados.every(p => p.habilitar_whatsapp);
        const todosConPrecio = filtrados.length > 0 && filtrados.every(p => p.mostrar_precio);

        contenedor.innerHTML = `
            <div class="p-4 sm:p-5 lg:p-5 animate-fade-in max-h-[calc(100vh-64px)] overflow-y-auto text-[13px] leading-tight">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4 lg:mb-5">
                    <div>
                        <h1 class="text-lg sm:text-xl font-bold text-slate-800 tracking-tight">Gestión de Inventario</h1>
                        <p class="text-slate-500 text-xs mt-0.5">Control total de visibilidad y catálogo.</p>
                    </div>
                    <button onclick="productoController.mostrarFormularioCrear()" 
                            title="Agregar nuevo producto al catálogo"
                            class="bg-blue-600 hover:bg-blue-700 text-white px-3.5 py-2 rounded-lg transition-all shadow-sm font-semibold text-xs flex items-center gap-1.5 shrink-0">
                        <span class="material-symbols-outlined text-[18px]">add_box</span> Nuevo Producto
                    </button>
                </div>

                <div class="bg-slate-50/50 p-3 sm:p-4 rounded-2xl border border-slate-100 mb-4 space-y-3">
                    <div class="flex flex-wrap items-center gap-2 sm:gap-3">
                        <div class="relative flex items-center flex-1 min-w-[200px]">
                            <span class="material-symbols-outlined absolute left-3 text-slate-400 text-[18px]">search</span>
                            <input type="text" 
                                   id="main-search-input"
                                   oninput="productoView.gestionarBusqueda(this.value)" 
                                   value="${this._estado.busqueda}"
                                   class="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-9 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 font-medium transition-all" 
                                   placeholder="Nombre, código, categoría…">
                            <button id="btn-limpiar-main-search"
                                    onclick="productoView.limpiarBusquedaRapida()"
                                    class="${this._estado.busqueda ? '' : 'hidden'} absolute right-2.5 text-slate-300 hover:text-red-500 transition-colors flex items-center justify-center">
                                <span class="material-symbols-outlined text-base">cancel</span>
                            </button>
                        </div>

                        <div class="relative w-full sm:w-64 md:w-72">
                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-[18px]">sell</span>
                            <input type="text" 
                                   id="category-search-input"
                                   onkeyup="productoView.filtrarSugerencias(this.value)"
                                   onfocus="productoView.filtrarSugerencias(this.value)"
                                   class="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-3 text-xs outline-none focus:ring-2 focus:ring-blue-500/10 font-medium transition-all" 
                                   placeholder="Filtrar por categoría…"
                                   autocomplete="off">
                            <div id="suggestions-panel" class="hidden absolute z-[100] w-full mt-1.5 bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto p-1.5 text-xs"></div>
                        </div>

                        <div class="flex items-center gap-1.5">
                            <button onclick="productoView.gestionarOrden()" 
                                    title="Cambiar orden alfabético"
                                    class="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-all shadow-sm font-bold text-[10px] uppercase">
                                <span class="material-symbols-outlined text-base">${this._estado.orden === 'asc' ? 'sort_by_alpha' : 'text_rotate_vertical'}</span>
                                ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}
                            </button>
                        </div>
                    </div>

                    ${this._renderEtiquetasFiltro()}

                    <div class="flex flex-wrap items-center gap-4 sm:gap-5 bg-white/50 px-3 py-2 rounded-xl border border-dashed border-slate-200">
                        <div class="flex items-center gap-2 border-r border-slate-200 pr-4" title="Activar/Desactivar WhatsApp en productos filtrados">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-tight">Global WhatsApp</span>
                            ${this._renderSwitch('global', 'habilitar_whatsapp', todosConWhatsapp, 'emerald', true)}
                        </div>
                        <div class="flex items-center gap-2" title="Activar/Desactivar precios en productos filtrados">
                            <span class="text-[9px] font-black text-slate-400 uppercase tracking-tight">Global Precios</span>
                            ${this._renderSwitch('global', 'mostrar_precio', todosConPrecio, 'blue', true)}
                        </div>
                    </div>
                </div>

                <div class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden mb-6">
                    <div class="overflow-x-auto">
                        <table class="w-full text-left border-collapse text-sm">
                            <thead>
                                <tr class="bg-slate-50/80">
                                    <th class="px-2 sm:px-3 py-3 text-[11px] font-black text-slate-400 uppercase w-[4.5rem] sm:w-24 text-center">
                                        <div class="flex flex-col sm:flex-row items-center justify-center gap-0.5 sm:gap-1 cursor-pointer"
                                            onclick="productoView.toggleSeleccionTodos(window._productosFiltrados || [])">
                                            <input type="checkbox"
                                                id="checkbox-header"
                                                class="w-4 h-4 rounded accent-blue-600 cursor-pointer pointer-events-none">
                                            <span class="text-[10px] font-black text-slate-400 uppercase tracking-wide leading-tight text-center">Sel.</span>
                                        </div>
                                    </th>
                                    <th class="px-2 sm:px-3 py-3 text-[11px] font-black text-slate-400 uppercase min-w-[10rem]">Producto</th>
                                    <th class="px-2 sm:px-3 py-3 text-[11px] font-black text-slate-400 uppercase text-center whitespace-nowrap w-[8rem]">Código</th>
                                    <th class="px-2 sm:px-3 py-3 text-[11px] font-black text-slate-400 uppercase text-center">Precio</th>
                                    <th class="px-2 sm:px-3 py-3 text-[11px] font-black text-slate-400 uppercase text-center">Stock</th>
                                    <th class="px-2 sm:px-3 py-3 text-[11px] font-black text-slate-400 uppercase text-center">WhatsApp</th>
                                    <th class="px-2 sm:px-3 py-3 text-[11px] font-black text-slate-400 uppercase text-center">Pub. Precio</th>
                                    <th class="px-2 sm:px-3 py-3 text-[11px] font-black text-slate-400 uppercase text-center w-[6.5rem] sm:w-36">Acciones</th>
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
            ${this._renderBarraFlotante()}
        `;

        // Restaurar estado de barra y checkbox header tras render
        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();

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

        document.addEventListener('click', (e) => {
            const panel = document.getElementById('suggestions-panel');
            const input = document.getElementById('category-search-input');
            if (panel && !panel.contains(e.target) && e.target !== input) {
                panel.classList.add('hidden');
            }
        });
    },

    _generarFilas(datos) {
        const inicio = (this._estado.paginaActual - 1) * this._estado.filasPorPagina;
        const paged = datos.slice(inicio, inicio + this._estado.filasPorPagina);

        if (paged.length === 0) return `
            <tr><td colspan="9" class="px-4 py-10 text-center text-slate-400 italic text-xs">
                No se encontraron productos
            </td></tr>`;

        return paged.map((p, i) => {
            const dataEnc = btoa(unescape(encodeURIComponent(JSON.stringify(p))));
            const nombreMostrarCat = p.categoria_padre_nombre || 'General';
            const colorCat = this._obtenerColorCategoria(nombreMostrarCat);
            const estaSeleccionado = this._estado.seleccionados.includes(p.id);

            return `
                <tr class="hover:bg-blue-50/40 transition-colors group ${estaSeleccionado ? 'bg-blue-50/60' : ''}">
                    <td class="px-2 sm:px-3 py-3 text-center text-xs font-bold text-slate-400">
                        <div class="flex flex-col sm:flex-row items-center justify-center gap-1">
                            <input type="checkbox"
                                   class="fila-checkbox w-4 h-4 rounded accent-blue-600 cursor-pointer shrink-0"
                                   data-id="${p.id}"
                                   ${estaSeleccionado ? 'checked' : ''}
                                   onchange="productoView.toggleSeleccion('${p.id}')">
                            <span class="tabular-nums">${inicio + i + 1}</span>
                        </div>
                    </td>
                    <td class="px-2 sm:px-3 py-3">
                        <div class="flex items-center gap-2 min-w-0">
                            <img src="${p.imagen_url}" class="h-9 w-9 sm:h-10 sm:w-10 rounded-lg object-cover border border-slate-100 shadow-sm shrink-0">
                            <div class="flex flex-col text-left min-w-0">
                                <span class="text-slate-800 font-semibold text-xs sm:text-sm leading-tight line-clamp-2">${this._capitalizarCadaPalabra(p.nombre)}</span>
                                <span title="Ruta completa: ${p.nombre_categoria || 'General'}"
                                      class="px-2 py-0.5 rounded mt-1 text-[10px] font-bold w-fit max-w-full truncate ${colorCat} cursor-help">
                                    ${nombreMostrarCat}
                                </span>
                            </div>
                        </div>
                    </td>
                    <td class="px-2 sm:px-3 py-3 text-center">
                        <span class="inline-block font-mono text-xs font-semibold text-slate-700 tracking-wide tabular-nums max-w-[7rem] truncate align-middle" title="Código de producto">${p.codigo != null && String(p.codigo).trim() !== '' ? String(p.codigo) : '—'}</span>
                    </td>
                    <td class="px-2 sm:px-3 py-3 text-center font-bold text-slate-700 text-sm whitespace-nowrap">Bs. ${p.precio}</td>
                    <td class="px-2 sm:px-3 py-3 text-center">
                        <span class="px-2 py-1 rounded-md text-[10px] font-black uppercase inline-block ${p.stock > 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}">
                            ${p.stock}
                        </span>
                    </td>
                    <td class="px-2 sm:px-3 py-3 text-center">${this._renderSwitch(p.id, 'habilitar_whatsapp', p.habilitar_whatsapp, 'emerald', false, p.nombre)}</td>
                    <td class="px-2 sm:px-3 py-3 text-center">${this._renderSwitch(p.id, 'mostrar_precio', p.mostrar_precio, 'blue', false, p.nombre)}</td>
                    <td class="px-1 sm:px-2 py-3 text-center">
                        <div class="flex justify-center gap-0.5 sm:gap-1 opacity-80 group-hover:opacity-100">
                            <button onclick="productoController.mostrarFormularioEditar('${p.id}')"
                                    class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white transition-all shadow-sm"
                                    title="Editar">
                                <span class="material-symbols-outlined text-[18px]">edit</span>
                            </button>
                            <button onclick="productoController.verDetalle('${p.id}')"
                                    class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"
                                    title="Ver">
                                <span class="material-symbols-outlined text-[18px]">visibility</span>
                            </button>
                            <button onclick="productoView.confirmarEliminacion('${dataEnc}')"
                                    class="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center rounded-lg bg-red-50 text-red-500 hover:bg-red-600 hover:text-white transition-all shadow-sm"
                                    title="Eliminar">
                                <span class="material-symbols-outlined text-[18px]">delete</span>
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
                    <div class="w-8 h-[18px] bg-slate-200 rounded-full peer peer-checked:after:translate-x-[14px] peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-3.5 after:w-3.5 after:transition-all peer-checked:bg-${color}-500 shadow-inner"></div>
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
                        ${this._capitalizarPrimera(cat)}
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
                <div onclick="productoView.agregarFiltroCategoria('${cat}')" 
                     class="px-4 py-3 hover:bg-blue-50 rounded-xl cursor-pointer text-sm font-medium text-slate-700 transition-colors">
                    ${this._capitalizarPrimera(cat)}
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
                (x.codigo != null && String(x.codigo).toLowerCase().includes(t)) ||
                (x.nombre_categoria && x.nombre_categoria.toLowerCase().includes(t)) ||
                (x.categoria_padre_nombre && x.categoria_padre_nombre.toLowerCase().includes(t))
            );
        }

        if (this._estado.categoriasSeleccionadas.length > 0) {
            resultados = resultados.filter(x => {
                const todasCats = x._todas_categorias || [];
                const todosPadres = x._todos_padres || [];
                return this._estado.categoriasSeleccionadas.some(seleccionada =>
                    todasCats.includes(seleccionada) ||
                    todosPadres.includes(seleccionada)
                );
            });
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

    // ==========================================
    // SELECCIÓN POR LOTES
    // ==========================================

    toggleSeleccion(id) {
        const idStr = String(id);
        const idx = this._estado.seleccionados.indexOf(idStr);
        if (idx === -1) {
            this._estado.seleccionados.push(idStr);
        } else {
            this._estado.seleccionados.splice(idx, 1);
        }
        const fila = document.querySelector(`.fila-checkbox[data-id="${idStr}"]`)?.closest('tr');
        if (fila) fila.classList.toggle('bg-blue-50/60', this._estado.seleccionados.includes(idStr));

        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();
    },

    toggleSeleccionTodos(filtrados) {
        const todosIds = filtrados.map(p => String(p.id));
        const todosSeleccionados = todosIds.every(id => this._estado.seleccionados.includes(id));

        if (todosSeleccionados) {
            this._estado.seleccionados = [];
        } else {
            this._estado.seleccionados = [...todosIds];
        }

        document.querySelectorAll('.fila-checkbox').forEach(cb => {
            const seleccionado = this._estado.seleccionados.includes(cb.dataset.id);
            cb.checked = seleccionado;
            const fila = cb.closest('tr');
            if (fila) fila.classList.toggle('bg-blue-50/60', seleccionado);
        });

        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();
    },

    _actualizarCheckboxHeader() {
        const chkHeader = document.getElementById('checkbox-header');
        if (!chkHeader) return;
        const filtrados = this._ordenarDatos(this._filtrarDatos(window.productosRaw || []));
        const todosIds = filtrados.map(p => String(p.id));
        const seleccionados = this._estado.seleccionados;
        chkHeader.checked = todosIds.length > 0 && todosIds.every(id => seleccionados.includes(id));
        chkHeader.indeterminate = seleccionados.length > 0 && !chkHeader.checked;
    },
    _actualizarBarraFlotante() {
        const barra = document.getElementById('barra-acciones-lote');
        const contador = document.getElementById('lote-contador');
        const cantidad = this._estado.seleccionados.length;

        if (!barra) return;

        if (cantidad > 0) {
            barra.classList.remove('translate-y-full', 'opacity-0', 'pointer-events-none');
            barra.classList.add('translate-y-0', 'opacity-100');
        } else {
            barra.classList.add('translate-y-full', 'opacity-0', 'pointer-events-none');
            barra.classList.remove('translate-y-0', 'opacity-100');
        }

        if (contador) contador.textContent = cantidad;
    },

    _renderBarraFlotante() {
        return `
        <div id="barra-acciones-lote"
             class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 
                    translate-y-full opacity-0 pointer-events-none
                    transition-all duration-300 ease-out">
            <div class="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-5 py-3 rounded-2xl shadow-2xl">
                
                <div class="flex items-center gap-2 pr-4 border-r border-slate-200">
                    <div class="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                        <span class="material-symbols-outlined text-white text-[16px]">checklist</span>
                    </div>
                    <div class="flex flex-col leading-none">
                        <span class="text-[9px] font-black text-slate-400 uppercase">Seleccionados</span>
                        <span class="text-sm font-black text-slate-800"><span id="lote-contador">0</span> ítems</span>
                    </div>
                </div>

                <button onclick="productoView.accionLote('whatsapp', true)"
                        title="Activar WhatsApp"
                        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 transition-all text-[10px] font-black uppercase whitespace-nowrap">
                    <i class="fa-brands fa-whatsapp text-[15px]"></i>
                    Activar WS
                </button>

                <button onclick="productoView.accionLote('whatsapp', false)"
                        title="Desactivar WhatsApp"
                        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-700 transition-all text-[10px] font-black uppercase whitespace-nowrap">
                    <span class="relative inline-flex items-center justify-center w-4 h-4">
                        <i class="fa-brands fa-whatsapp text-[15px]"></i>
                        <span class="material-symbols-outlined text-[13px] absolute -top-1 -right-2 text-red-500">block</span>
                    </span>
                    Desactivar WS
                </button>

                <button onclick="productoView.accionLote('precio', true)"
                        title="Mostrar precio"
                        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white hover:border-blue-600 transition-all text-[10px] font-black uppercase whitespace-nowrap">
                    <span class="material-symbols-outlined text-[16px]">payments</span>
                    Mostrar precio
                </button>

                <button onclick="productoView.accionLote('precio', false)"
                        title="Ocultar precio"
                        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-700 transition-all text-[10px] font-black uppercase whitespace-nowrap">
                    <span class="material-symbols-outlined text-[16px]">money_off</span>
                    Ocultar precio
                </button>

                <div class="w-px h-8 bg-slate-200 mx-1"></div>

                <button onclick="productoView.accionLote('eliminar')"
                        title="Eliminar seleccionados"
                        class="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-[10px] font-black uppercase whitespace-nowrap">
                    <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
                    Eliminar
                </button>

                <button onclick="productoView.limpiarSeleccion()"
                        title="Cancelar selección"
                        class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all ml-1 border border-slate-200">
                    <span class="material-symbols-outlined text-[18px]">close</span>
                </button>
            </div>
        </div>
    `;
    },

    async accionLote(tipo, valor = null) {
        const ids = [...this._estado.seleccionados];
        if (ids.length === 0) return;
        const cantidad = ids.length;

        if (tipo === 'eliminar') {
            const confirm = await Swal.fire({
                title: `<span class="text-red-600 font-black uppercase text-sm">¿Eliminar ${cantidad} producto${cantidad > 1 ? 's' : ''}?</span>`,
                text: 'Esta acción no se puede deshacer.',
                icon: 'warning',
                showCancelButton: true,
                reverseButtons: true,
                confirmButtonText: `SÍ, ELIMINAR (${cantidad})`,
                cancelButtonText: 'CANCELAR',
                confirmButtonColor: '#dc2626',
                customClass: {
                    popup: 'rounded-[32px] shadow-2xl',
                    confirmButton: 'rounded-xl px-6 py-3 font-bold text-xs uppercase',
                    cancelButton: 'rounded-xl px-6 py-3 font-bold text-xs uppercase bg-slate-100 text-slate-500'
                }
            });

            if (!confirm.isConfirmed) return;

            Swal.fire({
                title: '<span class="text-slate-800 font-black uppercase text-sm">Eliminando...</span>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'rounded-[32px] shadow-xl' }
            });

            // ✅ Pasa por el controller igual que carrusel y categorías
            const resultado = await window.productoController.eliminarLote(ids);

            Swal.close();

            if (resultado.exito) {
                this.limpiarSeleccion();
                this.notificarExito(`${cantidad} producto${cantidad > 1 ? 's' : ''} eliminado${cantidad > 1 ? 's' : ''} correctamente`);
                window.productoController._refrescoSilencioso();
            } else {
                this.notificarError('Ocurrió un error al eliminar: ' + resultado.mensaje);
            }
            return;
        }

        // Activar/Desactivar WhatsApp o Precio
        const campo = tipo === 'whatsapp' ? 'habilitar_whatsapp' : 'mostrar_precio';
        const etiqueta = tipo === 'whatsapp' ? 'WhatsApp' : 'Precio';
        const accion = valor ? 'Activar' : 'Desactivar';

        const confirm = await Swal.fire({
            title: `<span class="text-slate-800 font-black uppercase text-sm">¿${accion} ${etiqueta}?</span>`,
            text: `Se aplicará a ${cantidad} producto${cantidad > 1 ? 's' : ''} seleccionado${cantidad > 1 ? 's' : ''}.`,
            icon: 'question',
            showCancelButton: true,
            reverseButtons: true,
            confirmButtonText: `SÍ, ${accion.toUpperCase()} (${cantidad})`,
            cancelButtonText: 'CANCELAR',
            confirmButtonColor: valor ? '#10b981' : '#3b82f6',
            customClass: {
                popup: 'rounded-[32px] shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold text-xs uppercase',
                cancelButton: 'rounded-xl px-6 py-3 font-bold text-xs uppercase bg-slate-100 text-slate-500'
            }
        });

        if (!confirm.isConfirmed) return;

        await window.productoController.toggleMasivoFiltrado(campo, valor, ids);
        this.limpiarSeleccion();
    },

    limpiarSeleccion() {
        this._estado.seleccionados = [];
        document.querySelectorAll('.fila-checkbox').forEach(cb => {
            cb.checked = false;
            const fila = cb.closest('tr');
            if (fila) fila.classList.remove('bg-blue-50/60');
        });
        const chkHeader = document.getElementById('checkbox-header');
        if (chkHeader) { chkHeader.checked = false; chkHeader.indeterminate = false; }
        this._actualizarBarraFlotante();
    },

    // ==========================================
    // ACCIONES DIRECTAS
    // ==========================================

    agregarFiltroCategoria(cat) {
        if (!this._estado.categoriasSeleccionadas.includes(cat)) {
            this._estado.categoriasSeleccionadas.push(cat);
            this._estado.paginaActual = 1;
            this._estado.busqueda = '';
            productoController.refrescarVista();
        }
    },

    quitarFiltroCategoria(cat) {
        this._estado.categoriasSeleccionadas = this._estado.categoriasSeleccionadas.filter(c => c !== cat);
        productoController.refrescarVista();
    },

    limpiarFiltros() {
        this._estado.categoriasSeleccionadas = [];
        this._estado.busqueda = '';
        productoController.refrescarVista();
    },

    verFichaDetalle(id) { productoController.verDetalle(id); },

    gestionarBusqueda(v) {
        this._estado.busqueda = v;
        this._estado.paginaActual = 1;
        const btnLimpiar = document.getElementById('btn-limpiar-main-search');
        if (btnLimpiar) btnLimpiar.classList.toggle('hidden', !v);
        productoController.refrescarVista();
    },

    gestionarOrden() {
        this._estado.orden = this._estado.orden === 'asc' ? 'desc' : 'asc';
        productoController.refrescarVista();
    },

    cambiarPagina(p) {
        this._estado.paginaActual = p;
        productoController.refrescarVista();
    },

    _ordenarDatos(d) {
        return [...d].sort((a, b) =>
            this._estado.orden === 'asc'
                ? a.nombre.localeCompare(b.nombre)
                : b.nombre.localeCompare(a.nombre)
        );
    }
};

window.productoView = productoView;
window.productManager = productManager;