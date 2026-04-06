import { PaginationHelper } from '../utils/paginationHelper.js';

export const categoriasView = {
    _estado: {
        busqueda: '',
        orden: 'asc',
        paginaActualCat: 1,
        paginaActualSub: 1,
        filasPorPagina: 10,
        pestanaActiva: 'categorias',
        seleccionados: [] // ✅ IDs seleccionados
    },

    _datosCargados: {
        padres: [],
        hijos: [],
        columnasPadres: [],
        columnasHijos: []
    },

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

    render(datosPadres, columnasPadres, datosHijos, columnasHijos) {
        this._estado.seleccionados = [];

        this._datosCargados = {
            padres: datosPadres,
            hijos: datosHijos,
            columnasPadres,
            columnasHijos
        };

        const contenedor = document.getElementById('content-area');
        if (!contenedor) return;

        const esCat = this._estado.pestanaActiva === 'categorias';

        contenedor.innerHTML = `
            <div class="p-8 animate-fade-in max-h-[calc(100vh-64px)] overflow-y-auto">
                <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Categorías - Clasificación de Inventario</h1>
                        <p class="text-slate-500 text-sm">Organiza y segmenta el catálogo de productos.</p>
                    </div>
                </div>

                <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                    <div class="flex gap-2 bg-slate-200/50 p-1 rounded-2xl w-fit border border-slate-200/60">
                        <button id="tab-btn-categorias"
                                onclick="categoriasView.cambiarTab('categorias')" 
                                class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${esCat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            <span class="material-symbols-outlined text-[20px]">folder</span> Categorías
                        </button>
                        <button id="tab-btn-subcategorias"
                                onclick="categoriasView.cambiarTab('subcategorias')" 
                                class="flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 ${!esCat ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}">
                            <span class="material-symbols-outlined text-[20px]">account_tree</span> Subcategorías
                        </button>
                    </div>

                    <div class="flex items-center gap-3 w-full md:w-auto">
                        <div class="relative flex items-center flex-1 md:w-64">
                            <span class="material-symbols-outlined absolute left-3 text-slate-400 text-lg">search</span>
                            <input type="text" 
                                   id="input-busqueda"
                                   placeholder="Buscar por nombre..." 
                                   value="${this._estado.busqueda}"
                                   oninput="categoriasView.gestionarBusqueda(this.value)"
                                   class="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium">
                            <button id="btn-limpiar-busqueda-cat"
                                    onclick="categoriasView.limpiarBusqueda()"
                                    class="${this._estado.busqueda ? '' : 'hidden'} absolute right-3 text-slate-300 hover:text-red-400 transition-colors flex items-center justify-center">
                                <span class="material-symbols-outlined text-[18px]">cancel</span>
                            </button>
                        </div>
                        
                        <button id="btn-orden-categorias"
                                onclick="categoriasView.gestionarOrden()" 
                                title="Orden: ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}"
                                class="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-all shadow-sm font-bold text-sm">
                            <span class="material-symbols-outlined text-lg">${this._estado.orden === 'asc' ? 'sort_by_alpha' : 'text_rotate_vertical'}</span>
                            ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}
                        </button>
                    </div>
                </div>

                <div id="seccion-categorias" class="tab-content ${esCat ? 'block' : 'hidden'} animate-fade-in">
                    <div id="tbody-wrapper-cat">
                        ${this._generarSeccionTabla('Categorías', 'btn-config-cat', 'btn-nueva-cat',
            this._ordenarDatos(this._filtrarDatos(datosPadres)),
            columnasPadres.filter(c => c !== 'id' && c !== 'visible'),
            'paginaActualCat')}
                    </div>
                </div>

                <div id="seccion-subcategorias" class="tab-content ${!esCat ? 'block' : 'hidden'} animate-fade-in">
                    <div id="tbody-wrapper-sub">
                        ${this._generarSeccionTabla('Subcategorías', 'btn-config-sub', 'btn-nueva-sub',
                this._ordenarDatos(this._filtrarDatos(datosHijos)),
                columnasHijos.filter(c => c !== 'id' && c !== 'visible'),
                'paginaActualSub')}
                    </div>
                </div>
            </div>
            ${this._renderBarraFlotante()}`;

        this._reenlazarBotones();
        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();
    },

    _actualizarTablas() {
        const { padres, hijos, columnasPadres, columnasHijos } = this._datosCargados;

        const wrapperCat = document.getElementById('tbody-wrapper-cat');
        const wrapperSub = document.getElementById('tbody-wrapper-sub');

        if (wrapperCat) {
            wrapperCat.innerHTML = this._generarSeccionTabla(
                'Categorías', 'btn-config-cat', 'btn-nueva-cat',
                this._ordenarDatos(this._filtrarDatos(padres)),
                columnasPadres.filter(c => c !== 'id' && c !== 'visible'),
                'paginaActualCat'
            );
        }

        if (wrapperSub) {
            wrapperSub.innerHTML = this._generarSeccionTabla(
                'Subcategorías', 'btn-config-sub', 'btn-nueva-sub',
                this._ordenarDatos(this._filtrarDatos(hijos)),
                columnasHijos.filter(c => c !== 'id' && c !== 'visible'),
                'paginaActualSub'
            );
        }

        this._reenlazarBotones();
        this._actualizarCheckboxHeader(); // ✅ con el setTimeout interno ya funciona
    },

    _reenlazarBotones() {
        const btnNuevaCat = document.getElementById('btn-nueva-cat');
        const btnNuevaSub = document.getElementById('btn-nueva-sub');
        if (btnNuevaCat) btnNuevaCat.onclick = () => window.categoriasController.mostrarFormularioCreacion('padre');
        if (btnNuevaSub) btnNuevaSub.onclick = () => window.categoriasController.mostrarFormularioCreacion('hijo');
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
        const fila = document.querySelector(`.cat-checkbox[data-id="${idStr}"]`)?.closest('tr');
        if (fila) fila.classList.toggle('bg-red-50/40', this._estado.seleccionados.includes(idStr));

        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();
    },

    toggleSeleccionTodos() {
        // ✅ Obtener todos los IDs visibles en la pestaña activa
        const esCat = this._estado.pestanaActiva === 'categorias';
        const datos = esCat
            ? this._ordenarDatos(this._filtrarDatos(this._datosCargados.padres))
            : this._ordenarDatos(this._filtrarDatos(this._datosCargados.hijos));

        const todosIds = datos.map(d => String(d.id));
        const todosSeleccionados = todosIds.every(id => this._estado.seleccionados.includes(id));

        if (todosSeleccionados) {
            this._estado.seleccionados = [];
        } else {
            this._estado.seleccionados = [...todosIds];
        }

        document.querySelectorAll('.cat-checkbox').forEach(cb => {
            const seleccionado = this._estado.seleccionados.includes(cb.dataset.id);
            cb.checked = seleccionado;
            const fila = cb.closest('tr');
            if (fila) fila.classList.toggle('bg-red-50/40', seleccionado);
        });

        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();
    },

    _actualizarCheckboxHeader() {
        setTimeout(() => {
            // ✅ Usar el ID correcto según la pestaña activa
            const esCat = this._estado.pestanaActiva === 'categorias';
            const checkboxHeaderId = esCat ? 'cat-checkbox-header-cat' : 'cat-checkbox-header-sub';
            const chkHeader = document.getElementById(checkboxHeaderId);
            if (!chkHeader) return;

            const datos = esCat
                ? this._ordenarDatos(this._filtrarDatos(this._datosCargados.padres))
                : this._ordenarDatos(this._filtrarDatos(this._datosCargados.hijos));

            const todosIds = datos.map(d => String(d.id));
            const seleccionados = this._estado.seleccionados;

            if (todosIds.length === 0) {
                chkHeader.checked = false;
                chkHeader.indeterminate = false;
                return;
            }

            const todosSeleccionados = todosIds.every(id => seleccionados.includes(id));
            const algunoSeleccionado = todosIds.some(id => seleccionados.includes(id));

            chkHeader.checked = todosSeleccionados;
            chkHeader.indeterminate = algunoSeleccionado && !todosSeleccionados;
        }, 0);
    },
    _actualizarBarraFlotante() {
        const barra = document.getElementById('barra-lote-cat');
        const contador = document.getElementById('lote-cat-contador');
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
            <div id="barra-lote-cat"
                 class="fixed bottom-6 left-1/2 -translate-x-1/2 z-50
                        translate-y-full opacity-0 pointer-events-none
                        transition-all duration-300 ease-out">
                <div class="flex items-center gap-3 bg-white border border-slate-200 px-5 py-3 rounded-2xl shadow-2xl">
                    
                    <div class="flex items-center gap-2 pr-4 border-r border-slate-200">
                        <div class="w-7 h-7 bg-red-600 rounded-lg flex items-center justify-center">
                            <span class="material-symbols-outlined text-white text-[16px]">checklist</span>
                        </div>
                        <div class="flex flex-col leading-none">
                            <span class="text-[9px] font-black text-slate-400 uppercase">Seleccionados</span>
                            <span class="text-sm font-black text-slate-800">
                                <span id="lote-cat-contador">0</span> ítems
                            </span>
                        </div>
                    </div>

                    <button onclick="categoriasView.eliminarSeleccionados()"
                            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-[10px] font-black uppercase whitespace-nowrap">
                        <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
                        Eliminar seleccionados
                    </button>

                    <button onclick="categoriasView.limpiarSeleccion()"
                            title="Cancelar selección"
                            class="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition-all border border-slate-200">
                        <span class="material-symbols-outlined text-[18px]">close</span>
                    </button>
                </div>
            </div>
        `;
    },

    async eliminarSeleccionados() {
        const ids = [...this._estado.seleccionados];
        if (ids.length === 0) return;
        const cantidad = ids.length;

        const confirm = await Swal.fire({
            title: `<span class="text-red-600 font-black uppercase text-sm">¿Eliminar ${cantidad} registro${cantidad > 1 ? 's' : ''}?</span>`,
            text: 'Esta acción eliminará los registros y sus vinculaciones.',
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

        // ✅ Usar window.categoriasController para evitar el problema de import circular
        const resultado = await window.categoriasController.eliminarLote(ids);

        Swal.close();

        if (resultado.exito) {
            this.limpiarSeleccion();
            this.notificarExito(`${cantidad} registro${cantidad > 1 ? 's' : ''} eliminado${cantidad > 1 ? 's' : ''} correctamente`);
            await window.categoriasController._recargarSilencioso();
        } else {
            this.notificarError('Ocurrió un error al eliminar: ' + resultado.mensaje);
        }
    },
    limpiarSeleccion() {
        this._estado.seleccionados = [];
        document.querySelectorAll('.cat-checkbox').forEach(cb => {
            cb.checked = false;
            const fila = cb.closest('tr');
            if (fila) fila.classList.remove('bg-red-50/40');
        });
        const chkHeader = document.getElementById('cat-checkbox-header');
        if (chkHeader) { chkHeader.checked = false; chkHeader.indeterminate = false; }
        this._actualizarBarraFlotante();
    },

    // ==========================================
    // FILTRADO Y ORDEN
    // ==========================================

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
        const btnLimpiar = document.getElementById('btn-limpiar-busqueda-cat');
        if (btnLimpiar) btnLimpiar.classList.toggle('hidden', !valor);
        this._actualizarTablas();
    },

    limpiarBusqueda() {
        this._estado.busqueda = '';
        this._estado.paginaActualCat = 1;
        this._estado.paginaActualSub = 1;
        const input = document.getElementById('input-busqueda');
        const btnLimpiar = document.getElementById('btn-limpiar-busqueda-cat');
        if (input) { input.value = ''; input.focus(); }
        if (btnLimpiar) btnLimpiar.classList.add('hidden');
        this._actualizarTablas();
    },

    gestionarOrden() {
        this._estado.orden = this._estado.orden === 'asc' ? 'desc' : 'asc';
        const btn = document.getElementById('btn-orden-categorias');
        if (btn) {
            btn.innerHTML = `
                <span class="material-symbols-outlined text-lg">${this._estado.orden === 'asc' ? 'sort_by_alpha' : 'text_rotate_vertical'}</span>
                ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}`;
        }
        this._actualizarTablas();
    },

    cambiarTab(idTab) {
        // ✅ Limpiar selección ANTES de cambiar tab
        this._estado.seleccionados = [];

        // ✅ Limpiar checkboxes visibles
        document.querySelectorAll('.cat-checkbox').forEach(cb => {
            cb.checked = false;
            const fila = cb.closest('tr');
            if (fila) fila.classList.remove('bg-red-50/40');
        });

        this._estado.pestanaActiva = idTab;

        const secCat = document.getElementById('seccion-categorias');
        const secSub = document.getElementById('seccion-subcategorias');
        const esCat = idTab === 'categorias';

        if (secCat) secCat.classList.toggle('hidden', !esCat);
        if (secSub) secSub.classList.toggle('hidden', esCat);

        const btnCat = document.getElementById('tab-btn-categorias');
        const btnSub = document.getElementById('tab-btn-subcategorias');

        const claseActivo = 'flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 bg-white text-blue-600 shadow-sm';
        const claseInactivo = 'flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all duration-300 text-slate-500 hover:text-slate-700';

        if (btnCat) btnCat.className = esCat ? claseActivo : claseInactivo;
        if (btnSub) btnSub.className = !esCat ? claseActivo : claseInactivo;

        // ✅ Sincronizar sidebar por ID directo
        const detailsCat = document.getElementById('sidebar-details-categorias');
        const detailsSub = document.getElementById('sidebar-details-subcategorias');

        if (esCat) {
            detailsCat?.setAttribute('open', '');
            detailsSub?.removeAttribute('open');
        } else {
            detailsSub?.setAttribute('open', '');
            detailsCat?.removeAttribute('open');
        }

        const summaryCat = detailsCat?.querySelector('summary');
        const summarySub = detailsSub?.querySelector('summary');
        const divCat = summaryCat?.querySelector('div');
        const divSub = summarySub?.querySelector('div');

        const claseActivoSidebar = 'flex items-center gap-3 flex-1 text-blue-600';
        const claseInactivoSidebar = 'flex items-center gap-3 flex-1';

        if (divCat) divCat.className = esCat ? claseActivoSidebar : claseInactivoSidebar;
        if (divSub) divSub.className = !esCat ? claseActivoSidebar : claseInactivoSidebar;

        const summaryCatClase = 'flex items-center justify-between rounded-lg px-3 py-2.5 transition-all cursor-pointer list-none';
        if (summaryCat) summaryCat.className = summaryCatClase + (esCat ? ' bg-blue-50 text-blue-600' : ' text-slate-500 hover:bg-blue-50 hover:text-blue-600');
        if (summarySub) summarySub.className = summaryCatClase + (!esCat ? ' bg-blue-50 text-blue-600' : ' text-slate-500 hover:bg-blue-50 hover:text-blue-600');

        // ✅ Ocultar barra flotante y resetear checkbox header
        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();
    },

    cambiarPagina(nuevaPagina) {
        const tipoPagina = this._estado.pestanaActiva === 'categorias'
            ? 'paginaActualCat'
            : 'paginaActualSub';
        this._estado[tipoPagina] = nuevaPagina;
        this._actualizarTablas();
    },

    // ==========================================
    // TABLA
    // ==========================================

    _generarSeccionTabla(tipo, idConfig, idNuevo, datos, columnas, tipoPagina) {
        const totalRegistros = datos.length;
        const inicio = (this._estado[tipoPagina] - 1) * this._estado.filasPorPagina;
        const fin = inicio + this._estado.filasPorPagina;
        const datosPaginados = datos.slice(inicio, fin);

        // ✅ ID único por tabla
        const checkboxHeaderId = tipoPagina === 'paginaActualCat'
            ? 'cat-checkbox-header-cat'
            : 'cat-checkbox-header-sub';

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
                        <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase w-32 text-center">
                            <div class="flex items-center justify-center gap-2 cursor-pointer"
                                 onclick="categoriasView.toggleSeleccionTodos()">
                                <input type="checkbox"
                                       id="${checkboxHeaderId}"
                                       class="w-4 h-4 rounded accent-red-500 cursor-pointer pointer-events-none">
                                <span class="text-[9px] font-black text-slate-400 uppercase tracking-wide whitespace-nowrap">Selec. todo</span>
                            </div>
                        </th>
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
    </div>`;
    },
    _crearFila(item, columnasVisibles, index) {
        const colorEstado = item.visible ? 'bg-emerald-500' : 'bg-slate-300';
        const dataString = btoa(unescape(encodeURIComponent(JSON.stringify(item))));
        const estaSeleccionado = this._estado.seleccionados.includes(String(item.id));

        return `
            <tr class="hover:bg-blue-50/40 transition-colors group ${estaSeleccionado ? 'bg-red-50/40' : ''}">
                <td class="px-6 py-4 text-sm text-slate-400 font-bold text-center border-r border-slate-50/50">
                    <div class="flex items-center justify-center gap-3">
                        <input type="checkbox"
                               class="cat-checkbox w-4 h-4 rounded accent-red-500 cursor-pointer"
                               data-id="${item.id}"
                               ${estaSeleccionado ? 'checked' : ''}
                               onchange="categoriasView.toggleSeleccion('${item.id}')">
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
                        <button onclick="window.categoriasController.editar('${item.id}')" title="Editar" class="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">edit</span></button>
                        <button onclick="categoriasView.verDetalle('${item.id}')" title="Ver Detalle" class="w-10 h-10 flex items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">visibility</span></button>
                        <button onclick="categoriasView.confirmarEliminacion('${dataString}')" title="Eliminar" class="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm"><span class="material-symbols-outlined text-[18px]">delete</span></button>
                    </div>
                </td>
            </tr>`;
    },

    _formatearCelda(columna, valor, item) {
        if (valor === null || valor === undefined) return '<span class="text-slate-300">-</span>';
        if (columna === 'nombre') return `<span class="text-slate-800 font-bold text-[13px] tracking-wide block truncate">${valor}</span>`;
        if (columna === 'categoria_padre') {
            const nombrePadre = item.nombre_padre || 'Principal';
            return `<span class="px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200 shadow-sm">${nombrePadre}</span>`;
        }
        return valor;
    },

    verDetalle(id) {
        window.categoriasController.verDetalle(id);
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
                    window.categoriasController.editar(registro.id);
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
                    text: `¿Estás absolutamente seguro de borrar "${registro.nombre}"?`,
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
                        window.categoriasController.eliminarRegistro(registro.id);
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
            .map(cat => `<option value="${cat.id}" ${cat.id === id_padre ? 'selected' : ''}>${cat.nombre}</option>`)
            .join('');

        const svgIcon = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E";

        const { value: formValues } = await Swal.fire({
            title: `<span class="text-slate-800 font-black uppercase text-sm">${titulo}</span>`,
            html: `
                <div class="text-left space-y-5 pt-4">
                    <div class="flex flex-col gap-2">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                        <input id="swal-nombre" type="text" class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl p-4 font-semibold focus:ring-2 focus:ring-blue-500/20 outline-none" value="${nombre}" placeholder="Ej. Medicamentos, Cosméticos...">
                    </div>
                    ${esSubcategoria ? `
                    <div class="flex flex-col gap-2">
                        <label class="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Seleccionar Categoría Padre</label>
                        <div class="relative">
                            <select id="swal-id-padre"
                                    style="appearance: none; -webkit-appearance: none; -moz-appearance: none; background-image: url('${svgIcon}'); background-repeat: no-repeat; background-position: right 1.25rem center; background-size: 1.25rem; padding-right: 3rem;"
                                    class="w-full bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-2xl p-4 font-semibold outline-none cursor-pointer shadow-sm hover:border-slate-300 transition-colors">
                                <option value="">-- Seleccione una categoría --</option>
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
            return formValues;
        }
    }
};

window.categoriasView = categoriasView;
