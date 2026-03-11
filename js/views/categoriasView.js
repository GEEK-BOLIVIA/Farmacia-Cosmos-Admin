import { PaginationHelper } from '../utils/paginationHelper.js';

export const categoriasView = {
    // Variables de estado local para la vista
    _estado: {
        busqueda: '',
        orden: 'asc',
        paginaActualCat: 1,
        paginaActualSub: 1,
        filasPorPagina: 10,
        pestanaActiva: 'categorias'
    },

    /**
     * MÉTODOS DE NOTIFICACIÓN (SWEETALERT2)
     */
    notificarExito(mensaje) {
        Swal.fire({
            icon: 'success',
            title: '<span class="text-slate-800 font-black uppercase text-sm">¡Operación Exitosa!</span>',
            text: mensaje,
            timer: 2000,
            showConfirmButton: false,
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    notificarError(mensaje) {
        Swal.fire({
            icon: 'error',
            title: '<span class="text-red-600 font-black uppercase text-sm">Error en la Operación</span>',
            text: mensaje,
            confirmButtonColor: '#2563eb',
            customClass: {
                popup: 'rounded-[32px] border-none shadow-xl',
                confirmButton: 'rounded-xl px-6 py-2 font-bold text-xs uppercase'
            }
        });
    },

    mostrarCargando(mensaje = 'Procesando solicitud...') {
        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Cargando</span>',
            text: mensaje,
            allowOutsideClick: false,
            didOpen: () => Swal.showLoading(),
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    cambiarTab(idTab) {
        this._estado.pestanaActiva = idTab;
        categoriasController.refrescarVista();
    },

    /**
     * RENDER PRINCIPAL
     */
    render(datosPadres, columnasPadres, datosHijos, columnasHijos) {
        const contenedor = document.getElementById('content-area');
        if (!contenedor) return;

        const activeElementId = document.activeElement?.id;
        const selectionStart = document.activeElement?.selectionStart;

        let padresFiltrados = this._ordenarDatos(this._filtrarDatos(datosPadres));
        let hijosFiltrados = this._ordenarDatos(this._filtrarDatos(datosHijos));

        const colsPadresFiltradas = columnasPadres.filter(c => c !== 'id' && c !== 'visible');
        const colsHijosFiltradas = columnasHijos.filter(c => c !== 'id' && c !== 'visible');

        const esCat = this._estado.pestanaActiva === 'categorias';

        const html = `
            <div class="p-8 animate-fade-in max-h-[calc(100vh-64px)] overflow-y-auto">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Categorías - Clasificación de Inventario</h1>
                        <p class="text-slate-500 text-sm">Organiza y segmenta el catálogo de productos.</p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div class="flex gap-2 bg-slate-200/50 p-1 rounded-2xl w-fit border border-slate-200/60">
                        <button onclick="categoriasView.cambiarTab('categorias')" 
                            class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${esCat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            <span class="material-symbols-outlined text-[20px]">folder</span> Categorías
                        </button>
                        <button onclick="categoriasView.cambiarTab('subcategorias')" 
                            class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${!esCat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            <span class="material-symbols-outlined text-[20px]">account_tree</span> Subcategorías
                        </button>
                    </div>

                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <div class="relative flex-1 md:w-64">
                            <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-lg">search</span>
                            <input type="text" 
                                   id="input-busqueda"
                                   placeholder="Buscar por nombre..." 
                                   value="${this._estado.busqueda}"
                                   oninput="categoriasView.gestionarBusqueda(this.value)"
                                   class="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium">
                        </div>
                        
                        <button onclick="categoriasView.gestionarOrden()" 
                                title="Orden: ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}"
                                class="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-all shadow-sm font-bold text-sm">
                            <span class="material-symbols-outlined text-lg">${this._estado.orden === 'asc' ? 'sort_by_alpha' : 'text_rotate_vertical'}</span>
                            ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}
                        </button>
                    </div>
                </div>

                <div id="seccion-categorias" class="tab-content ${esCat ? 'block' : 'hidden'} animate-fade-in">
                    ${this._generarSeccionTabla('Categorías', 'btn-nueva-cat', padresFiltrados, colsPadresFiltradas, 'paginaActualCat')}
                </div>

                <div id="seccion-subcategorias" class="tab-content ${!esCat ? 'block' : 'hidden'} animate-fade-in">
                    ${this._generarSeccionTabla('Subcategorías', 'btn-nueva-sub', hijosFiltrados, colsHijosFiltradas, 'paginaActualSub')}
                </div>
            </div>
        `;

        contenedor.innerHTML = html;

        if (activeElementId) {
            const el = document.getElementById(activeElementId);
            if (el) {
                el.focus();
                if (selectionStart !== undefined && el.setSelectionRange) {
                    el.setSelectionRange(selectionStart, selectionStart);
                }
            }
        }
    },

    _filtrarDatos(datos) {
        if (!this._estado.busqueda) return [...datos];
        const term = this._estado.busqueda.toLowerCase();
        return datos.filter(item => item.nombre.toLowerCase().includes(term));
    },

    _ordenarDatos(datos) {
        return [...datos].sort((a, b) => {
            const nombreA = a.nombre.toLowerCase();
            const nombreB = b.nombre.toLowerCase();
            return this._estado.orden === 'asc' ? nombreA.localeCompare(nombreB) : nombreB.localeCompare(nombreA);
        });
    },

    gestionarBusqueda(valor) {
        this._estado.busqueda = valor;
        this._estado.paginaActualCat = 1;
        this._estado.paginaActualSub = 1;
        categoriasController.refrescarVista();
    },

    gestionarOrden() {
        this._estado.orden = this._estado.orden === 'asc' ? 'desc' : 'asc';
        categoriasController.refrescarVista();
    },

    cambiarPagina(nuevaPagina) {
        const tipoPagina = this._estado.pestanaActiva === 'categorias'
            ? 'paginaActualCat'
            : 'paginaActualSub';

        this._estado[tipoPagina] = nuevaPagina;
        categoriasController.refrescarVista();
    },

    _generarSeccionTabla(tipo, idNuevo, datos, columnas, tipoPagina) {
        const totalRegistros = datos.length;
        const inicio = (this._estado[tipoPagina] - 1) * this._estado.filasPorPagina;
        const fin = inicio + this._estado.filasPorPagina;
        const datosPaginados = datos.slice(inicio, fin);

        return `
        <div class="flex justify-between items-center mb-4 px-1">
            <h2 class="text-xs font-black text-slate-400 uppercase tracking-[0.15em]">Listado de ${tipo} (${totalRegistros})</h2>
            <div class="flex items-center gap-3">
                <button id="${idNuevo}" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-md font-bold text-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-[20px]">add</span> Nueva
                </button>
            </div>
        </div>

        <div class="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-8">
            <div class="overflow-x-auto"> 
                <table class="w-full text-left border-collapse table-auto"> 
                    <thead>
                        <tr class="bg-slate-50/80 border-b border-slate-200">
                            <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase w-24 text-center">N°</th>
                            ${columnas.map(col => {
                                const minWidth = col === 'nombre' ? 'min-w-[250px]' : 'min-w-[200px]';
                                return `<th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase ${minWidth} text-center">${col === 'categoria_padre' ? 'Vinculado a' : col.replace(/_/g, ' ')}</th>`;
                            }).join('')}
                            <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase text-center w-52">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-slate-100">
                        ${datosPaginados.length > 0
                            ? datosPaginados.map((item, index) => this._crearFila(item, columnas, inicio + index)).join('')
                            : `<tr><td colspan="10" class="px-6 py-12 text-center text-slate-400 italic text-sm">No se encontraron resultados</td></tr>`
                        }
                    </tbody>
                </table>
            </div>

            ${PaginationHelper.render(
                totalRegistros,
                this._estado.filasPorPagina,
                this._estado[tipoPagina],
                'categoriasView'
            )}
        </div>
    `;
    },

    _crearFila(item, columnasVisibles, index) {
        const colorEstado = item.visible ? 'bg-emerald-500' : 'bg-slate-300';
        const dataString = btoa(unescape(encodeURIComponent(JSON.stringify(item))));

        return `
            <tr class="hover:bg-blue-50/40 transition-colors group">
                <td class="px-6 py-4 text-sm text-slate-400 font-bold text-center border-r border-slate-50/50">
                    <div class="flex items-center justify-center gap-3">
                        <span class="w-2.5 h-2.5 rounded-full ${colorEstado} ring-4 ring-white shadow-sm"></span>
                        ${index + 1}
                    </div>
                </td>
                ${columnasVisibles.map(col => `
                    <td class="px-6 py-4 text-sm text-slate-600 font-semibold text-center">
                        <div class="flex justify-center items-center w-full">
                            ${this._formatearCelda(col, item[col], item)}
                        </div>
                    </td>
                `).join('')}
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button onclick="categoriasController.editar('${item.id}')" title="Editar" class="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                        <button onclick="categoriasView.verDetalle('${item.id}')" title="Ver Detalle" class="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
                        <button onclick="categoriasView.confirmarEliminacion('${dataString}')" title="Eliminar" class="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                </td>
            </tr>`;
    },

    _formatearCelda(columna, valor, item) {
        if (valor === null || valor === undefined) return '<span class="text-slate-300">-</span>';
        if (columna === 'nombre') return `<span class="text-slate-800 font-bold uppercase text-[13px] tracking-wide block truncate">${valor}</span>`;
        if (columna === 'categoria_padre') {
            const nombrePadre = item.nombre_padre || 'Principal';
            return `<span class="px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200 uppercase shadow-sm">${nombrePadre}</span>`;
        }
        return valor;
    },

    verDetalle(id) {
        categoriasController.verDetalle(id);
    },

    mostrarDetalle(registro) {
        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Detalle del Registro</span>',
            html: this._getHTMLDetalle(registro),
            icon: 'info',
            showCloseButton: true,
            showCancelButton: true,
            reverseButtons: true,
            confirmButtonText: 'Editar Registro',
            cancelButtonText: 'Cerrar',
            confirmButtonColor: '#2563eb',
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase order-2',
                cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-slate-100 text-slate-500 order-1'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                this.confirmarAccion('¿Está seguro que desea editar este registro?', () => {
                    categoriasController.editar(registro.id);
                });
            }
        });
    },

    confirmarEliminacion(dataEncoded) {
        const registro = JSON.parse(decodeURIComponent(escape(atob(dataEncoded))));

        Swal.fire({
            title: '<span class="text-red-600 font-black uppercase text-sm">¿Confirmar Eliminación?</span>',
            html: `
                <div class="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-[11px] font-bold leading-relaxed">
                    ATENCIÓN: Esta acción eliminará el registro y sus vinculaciones.
                </div>
                ${this._getHTMLDetalle(registro)}
            `,
            icon: 'warning',
            showCancelButton: true,
            reverseButtons: true,
            confirmButtonText: 'Sí, Eliminar Ahora',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase order-2',
                cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-slate-100 text-slate-500 order-1'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                Swal.fire({
                    title: '<span class="text-slate-800 font-black uppercase text-sm">Verificación Final</span>',
                    text: `¿Estás absolutamente seguro de borrar "${registro.nombre.toUpperCase()}"?`,
                    icon: 'error',
                    showCancelButton: true,
                    reverseButtons: true,
                    confirmButtonText: 'SÍ, BORRAR',
                    cancelButtonText: 'CANCELAR',
                    confirmButtonColor: '#000000',
                    customClass: {
                        popup: 'rounded-[32px] border-4 border-red-600 shadow-2xl',
                        confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase',
                        cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-slate-100 text-slate-500'
                    }
                }).then((finalResult) => {
                    if (finalResult.isConfirmed) {
                        categoriasController.eliminarRegistro(registro.id);
                    }
                });
            }
        });
    },

    _getHTMLDetalle(registro) {
        return `
            <div class="text-left space-y-4 p-2">
                <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Nombre</p>
                    <p class="text-slate-800 font-bold text-lg uppercase">${registro.nombre}</p>
                </div>
                <div class="grid grid-cols-2 gap-4">
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tipo</p>
                        <p class="text-slate-700 font-bold text-sm">${registro.id_padre ? 'Subcategoría' : 'Categoría'}</p>
                    </div>
                    <div class="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                        <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Estado</p>
                        <p class="text-emerald-600 font-bold text-sm">${registro.visible ? 'Activo' : 'Inactivo'}</p>
                    </div>
                </div>
            </div>`;
    },

    confirmarAccion(mensaje, callback) {
        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Confirmar Acción</span>',
            text: mensaje,
            icon: 'question',
            showCancelButton: true,
            reverseButtons: true,
            confirmButtonText: 'Confirmar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#2563eb',
            customClass: {
                popup: 'rounded-[25px]',
                confirmButton: 'rounded-xl px-6 py-2 font-bold text-xs uppercase',
                cancelButton: 'rounded-xl px-6 py-2 font-bold text-xs uppercase bg-slate-100 text-slate-500'
            }
        }).then((result) => {
            if (result.isConfirmed) callback();
        });
    },

    async mostrarFormulario({ titulo, nombre = '', id_padre = null, categoriasPadre = [] }) {
        const esSubcategoria = this._estado.pestanaActiva === 'subcategorias';
        const options = categoriasPadre
            .map(cat => `<option value="${cat.id}" ${cat.id === id_padre ? 'selected' : ''}>${cat.nombre.toUpperCase()}</option>`)
            .join('');

        const svgIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E";

        const { value: formValues } = await Swal.fire({
            title: `<span class="text-slate-800 font-black uppercase text-sm">${titulo}</span>`,
            html: `
                <div class="text-left space-y-5 pt-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                        <input id="swal-nombre" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl p-4 font-semibold uppercase focus:ring-2 focus:ring-blue-500/20 outline-none" value="${nombre}">
                    </div>
                    ${esSubcategoria ? `
                    <div class="flex flex-col gap-2">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Categoría Padre (Obligatorio)</label>
                        <div class="relative">
                            <select id="swal-id-padre" 
                                    style="appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url('${svgIcon}'); background-repeat: no-repeat; background-position: right 1.25rem center; background-size: 1.25rem; padding-right: 3rem;" 
                                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl p-4 font-semibold uppercase outline-none cursor-pointer shadow-sm hover:border-slate-300 transition-colors">
                                <option value="">-- ELIJA UNA CATEGORÍA --</option>
                                ${options}
                            </select>
                        </div>
                    </div>` : ''}
                </div>`,
            showCloseButton: true,
            showCancelButton: true,
            confirmButtonText: 'Guardar',
            cancelButtonText: 'Cancelar',
            reverseButtons: true,
            didOpen: () => document.getElementById('swal-nombre').focus(),
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-blue-600',
                cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-slate-100 text-slate-500'
            },
            preConfirm: () => {
                const nombreVal = document.getElementById('swal-nombre').value.trim();
                const selectPadre = document.getElementById('swal-id-padre');
                const padreVal = selectPadre ? selectPadre.value : null;

                if (!nombreVal) {
                    Swal.showValidationMessage('El nombre es obligatorio');
                    return false;
                }

                if (esSubcategoria && !padreVal) {
                    Swal.showValidationMessage('Debe seleccionar una categoría obligatoriamente');
                    return false;
                }

                return { nombre: nombreVal, id_padre: padreVal };
            }
        });

        if (formValues) {
            return new Promise((resolve) => {
                this.confirmarAccion('¿Está seguro de guardar estos cambios?', () => resolve(formValues));
            });
        }
    }
};

window.categoriasView = categoriasView;