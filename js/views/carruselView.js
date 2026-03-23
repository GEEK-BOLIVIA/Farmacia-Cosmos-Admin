import { carruselController } from '../controllers/carruselController.js';
import { RegisterCarrusel } from '../modules/carrusel/registerCarrusel.js';

export const carruselController_View = {
    _estado: {
        busqueda: '',
        orden: 'asc',
        paginaActual: 1,
        filasPorPagina: 10,
        seleccionados: []
    },
    _modalEstado: {
        indexActual: 0
    },

    notificarExito(mensaje) {
        Swal.fire({
            icon: 'success',
            title: `<span class="text-slate-800 font-black uppercase text-sm">${mensaje}</span>`,
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
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });
    },

    async confirmarEliminacion(nombre) {
        const nombreStr = nombre.toUpperCase();
        const primerPaso = await Swal.fire({
            title: '<span class="text-red-600 font-black uppercase text-sm">¿Confirmar Eliminación?</span>',
            html: `
                <div class="mb-4 p-4 bg-red-50 border border-red-100 rounded-2xl text-red-700 text-[11px] font-bold leading-relaxed text-center">
                    ATENCIÓN: Se eliminará la configuración y todos los banners vinculados.
                </div>
                <div class="text-left p-4 bg-slate-50 rounded-2xl border border-slate-100 shadow-inner">
                    <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1 text-center">Registro a eliminar</p>
                    <p class="text-slate-800 font-bold text-lg uppercase text-center">${nombreStr}</p>
                </div>`,
            icon: 'warning',
            showCancelButton: true,
            reverseButtons: true,
            confirmButtonText: 'Sí, Eliminar',
            cancelButtonText: 'Cancelar',
            confirmButtonColor: '#dc2626',
            customClass: {
                popup: 'rounded-[32px] border-none shadow-2xl',
                confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase',
                cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-slate-100 text-slate-500'
            }
        });

        if (primerPaso.isConfirmed) {
            const segundoPaso = await Swal.fire({
                title: '<span class="text-slate-800 font-black uppercase text-sm">Verificación Final</span>',
                text: `¿Estás absolutamente seguro de borrar "${nombreStr}"?`,
                icon: 'error',
                showCancelButton: true,
                reverseButtons: true,
                confirmButtonText: 'SÍ, BORRAR DEFINITIVAMENTE',
                cancelButtonText: 'CANCELAR',
                confirmButtonColor: '#000000',
                customClass: {
                    popup: 'rounded-[32px] border-4 border-red-600 shadow-2xl',
                    confirmButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase',
                    cancelButton: 'rounded-xl px-6 py-3 font-bold text-sm uppercase bg-slate-100 text-slate-500'
                }
            });
            return segundoPaso.isConfirmed;
        }
        return false;
    },

    async render() {
        const contenedor = document.getElementById('content-area');
        if (!contenedor) return;

        // ✅ Limpiar selección al re-renderizar la tabla
        this._estado.seleccionados = [];

        Swal.fire({
            title: 'Cargando registros',
            html: 'Sincronizando con la base de datos...',
            allowOutsideClick: false,
            didOpen: () => { Swal.showLoading(); },
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });

        try {
            this._datosCargados = await carruselController.cargarCarruseles();
            Swal.close();
            this._renderEstructura(contenedor);
            this._actualizarTabla();
        } catch (error) {
            Swal.close();
            this.notificarError("Error al conectar con el servidor.");
        }
    },

    _renderEstructura(contenedor) {
        contenedor.innerHTML = `
        <div class="p-8 animate-fade-in max-h-[calc(100vh-64px)] overflow-y-auto">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 class="text-2xl font-bold text-slate-800 tracking-tight">Carruseles y Banners</h1>
                    <p class="text-slate-500 text-sm">Gestiona la publicidad y colecciones de la página principal.</p>
                </div>
            </div>

            <div class="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div class="flex items-center gap-3 w-full md:w-auto">
                    <div class="relative flex items-center flex-1 md:w-64">
                        <span class="material-symbols-outlined absolute left-3 text-slate-400 text-lg">search</span>
                        <input type="text"
                            id="input-busqueda-carrusel"
                            placeholder="Buscar carrusel..."
                            value="${this._estado.busqueda}"
                            oninput="carruselController_View.gestionarBusqueda(this.value)"
                            class="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-9 text-sm outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 transition-all font-medium">
                        <button id="btn-limpiar-busqueda"
                                onclick="carruselController_View.limpiarBusqueda()"
                                class="${this._estado.busqueda ? '' : 'hidden'} absolute right-3 text-slate-300 hover:text-red-400 transition-colors flex items-center justify-center">
                            <span class="material-symbols-outlined text-[18px]">cancel</span>
                        </button>
                    </div>
                    <button onclick="carruselController_View.gestionarOrden()"
                            id="btn-orden-carrusel"
                            class="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 transition-all shadow-sm font-bold text-sm">
                        <span class="material-symbols-outlined text-lg">${this._estado.orden === 'asc' ? 'sort_by_alpha' : 'text_rotate_vertical'}</span>
                        ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}
                    </button>
                </div>
                <button onclick="RegisterCarrusel.init('content-area')"
                        class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl transition-all shadow-md font-bold text-sm flex items-center gap-2">
                    <span class="material-symbols-outlined text-[20px]">add</span> Nuevo Carrusel
                </button>
            </div>

            <div class="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden mb-8">
                <div class="overflow-x-auto">
                    <table class="w-full text-left border-collapse table-auto">
                        <thead>
                            <tr class="bg-slate-50/80 border-b border-slate-200">
                                <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase w-32 text-center">
                                    <div class="flex items-center justify-center gap-2 cursor-pointer"
                                         onclick="carruselController_View.toggleSeleccionTodos()">
                                        <input type="checkbox"
                                               id="carrusel-checkbox-header"
                                               class="w-4 h-4 rounded accent-red-500 cursor-pointer pointer-events-none">
                                        <span class="text-[9px] font-black text-slate-400 uppercase tracking-wide whitespace-nowrap">Selec. todo</span>
                                    </div>
                                </th>
                                <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase text-center min-w-[200px]">Nombre / Descripción</th>
                                <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase text-center min-w-[150px]">Ubicación</th>
                                <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase text-center min-w-[120px]">Tipo</th>
                                <th class="px-6 py-5 text-[11px] font-bold text-slate-400 uppercase text-center w-64">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="tbody-carruseles" class="divide-y divide-slate-100"></tbody>
                    </table>
                </div>
            </div>
        </div>
        ${this._renderBarraFlotante()}`;

        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();
    },

    _actualizarTabla() {
        const tbody = document.getElementById('tbody-carruseles');
        if (!tbody) return;

        const datosFiltrados = this._ordenarDatos(this._filtrarDatos(this._datosCargados || []));
        const inicio = (this._estado.paginaActual - 1) * this._estado.filasPorPagina;
        const datosPaginados = datosFiltrados.slice(inicio, inicio + this._estado.filasPorPagina);

        tbody.innerHTML = datosPaginados.length > 0
            ? datosPaginados.map((item, index) => this._crearFila(item, inicio + index)).join('')
            : `<tr><td colspan="5" class="px-6 py-12 text-center text-slate-400 italic text-sm">No se encontraron carruseles</td></tr>`;

        this._actualizarCheckboxHeader();
    },

    _crearFila(item, index) {
        const estaSeleccionado = this._estado.seleccionados.includes(String(item.id));
        return `
            <tr class="hover:bg-blue-50/40 transition-colors group ${estaSeleccionado ? 'bg-red-50/40' : ''}">
                <td class="px-6 py-4 text-sm text-slate-400 font-bold text-center border-r border-slate-50/50">
                    <div class="flex items-center justify-center gap-3">
                        <input type="checkbox"
                               class="carrusel-checkbox w-4 h-4 rounded accent-red-500 cursor-pointer"
                               data-id="${item.id}"
                               ${estaSeleccionado ? 'checked' : ''}
                               onchange="carruselController_View.toggleSeleccion('${item.id}')">
                        <span>${index + 1}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <div class="flex flex-col items-center">
                        <span class="text-slate-800 font-bold uppercase text-[13px] tracking-wide">${item.nombre}</span>
                        <span class="text-[10px] text-slate-400 font-medium">${item.descripcion || 'SIN DESCRIPCIÓN'}</span>
                    </div>
                </td>
                <td class="px-6 py-4 text-center">
                    <span class="px-4 py-1.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-black border border-slate-200 uppercase shadow-sm">
                        ${item.ubicacion_slug}
                    </span>
                </td>
                <td class="px-6 py-4 text-center text-sm text-slate-600 font-semibold uppercase">
                    ${item.tipo}
                </td>
                <td class="px-6 py-4">
                    <div class="flex items-center justify-center gap-2">
                        <button
                            onclick="this.disabled=true; this.classList.add('opacity-50','cursor-not-allowed'); carruselController.abrirEditor('${item.id}')"
                            title="Editar"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-600 hover:text-white transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        <button
                            onclick="carruselController_View.verDetalles('${item.id}', '${item.nombre}', '${item.tipo}')"
                            title="Vista Previa"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-800 hover:text-white transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                        <button
                            onclick="carruselController.borrarCarruselCompleto('${item.id}')"
                            title="Eliminar"
                            class="w-10 h-10 flex items-center justify-center rounded-xl bg-red-50 text-red-500 border border-red-100 hover:bg-red-500 hover:text-white transition-all shadow-sm">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </td>
            </tr>`;
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
        const fila = document.querySelector(`.carrusel-checkbox[data-id="${idStr}"]`)?.closest('tr');
        if (fila) fila.classList.toggle('bg-red-50/40', this._estado.seleccionados.includes(idStr));

        this._actualizarBarraFlotante();
        this._actualizarCheckboxHeader();
    },

    toggleSeleccionTodos() {
        const datosFiltrados = this._ordenarDatos(this._filtrarDatos(this._datosCargados || []));
        const todosIds = datosFiltrados.map(d => String(d.id));
        const todosSeleccionados = todosIds.every(id => this._estado.seleccionados.includes(id));

        if (todosSeleccionados) {
            this._estado.seleccionados = [];
        } else {
            this._estado.seleccionados = [...todosIds];
        }

        document.querySelectorAll('.carrusel-checkbox').forEach(cb => {
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
            const chkHeader = document.getElementById('carrusel-checkbox-header');
            if (!chkHeader) return;

            const datosFiltrados = this._ordenarDatos(this._filtrarDatos(this._datosCargados || []));
            const todosIds = datosFiltrados.map(d => String(d.id));
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
        const barra = document.getElementById('barra-lote-carrusel');
        const contador = document.getElementById('lote-carrusel-contador');
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
            <div id="barra-lote-carrusel"
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
                                <span id="lote-carrusel-contador">0</span> ítems
                            </span>
                        </div>
                    </div>

                    <button onclick="carruselController_View.eliminarSeleccionados()"
                            class="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-[10px] font-black uppercase whitespace-nowrap">
                        <span class="material-symbols-outlined text-[16px]">delete_sweep</span>
                        Eliminar seleccionados
                    </button>

                    <button onclick="carruselController_View.limpiarSeleccion()"
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
            title: `<span class="text-red-600 font-black uppercase text-sm">¿Eliminar ${cantidad} carrusel${cantidad > 1 ? 'es' : ''}?</span>`,
            text: 'Se eliminarán las configuraciones y todos sus ítems vinculados.',
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

        // ✅ Pasar por el controller — usa carruselModel.eliminar que ya borra ítems + cabecera
        const resultado = await window.carruselController.eliminarLote(ids);

        Swal.close();

        if (resultado.exito) {
            this.limpiarSeleccion();
            this.notificarExito(`${cantidad} carrusel${cantidad > 1 ? 'es' : ''} eliminado${cantidad > 1 ? 's' : ''} correctamente`);
            await this.render();
        } else {
            this.notificarError('Ocurrió un error al eliminar: ' + resultado.mensaje);
        }
    },

    limpiarSeleccion() {
        this._estado.seleccionados = [];
        document.querySelectorAll('.carrusel-checkbox').forEach(cb => {
            cb.checked = false;
            const fila = cb.closest('tr');
            if (fila) fila.classList.remove('bg-red-50/40');
        });
        const chkHeader = document.getElementById('carrusel-checkbox-header');
        if (chkHeader) { chkHeader.checked = false; chkHeader.indeterminate = false; }
        this._actualizarBarraFlotante();
    },

    // ==========================================
    // BÚSQUEDA Y ORDEN
    // ==========================================

    gestionarBusqueda(valor) {
        this._estado.busqueda = valor;
        this._estado.paginaActual = 1;
        const btnLimpiar = document.getElementById('btn-limpiar-busqueda');
        if (btnLimpiar) btnLimpiar.classList.toggle('hidden', !valor);
        this._actualizarTabla();
    },

    limpiarBusqueda() {
        this._estado.busqueda = '';
        this._estado.paginaActual = 1;
        const input = document.getElementById('input-busqueda-carrusel');
        const btnLimpiar = document.getElementById('btn-limpiar-busqueda');
        if (input) { input.value = ''; input.focus(); }
        if (btnLimpiar) btnLimpiar.classList.add('hidden');
        this._actualizarTabla();
    },

    gestionarOrden() {
        this._estado.orden = this._estado.orden === 'asc' ? 'desc' : 'asc';
        const btn = document.getElementById('btn-orden-carrusel');
        if (btn) {
            btn.innerHTML = `
            <span class="material-symbols-outlined text-lg">${this._estado.orden === 'asc' ? 'sort_by_alpha' : 'text_rotate_vertical'}</span>
            ${this._estado.orden === 'asc' ? 'A-Z' : 'Z-A'}`;
        }
        this._actualizarTabla();
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

    async verDetalles(id, nombre, tipo) {
        Swal.fire({ title: 'Cargando...', didOpen: () => Swal.showLoading(), background: 'transparent' });

        try {
            const items = await carruselController.cargarItemsPorCarrusel(id);
            this._modalEstado.indexActual = 0;
            if (this._autoplayInterval) clearInterval(this._autoplayInterval);

            Swal.fire({
                html: window.carruselTemplates.renderConsultaPro(items, 0, tipo),
                width: '1000px',
                background: 'transparent',
                showConfirmButton: false,
                showCloseButton: true,
                closeButtonHtml: '<span class="material-symbols-outlined text-white text-4xl">close</span>',
                customClass: {
                    htmlContainer: 'overflow-hidden-important',
                    popup: 'bg-transparent shadow-none'
                },
                didOpen: () => {
                    const slides = document.querySelectorAll('.modal-slide-consulta');
                    if (slides.length > 1) {
                        this._autoplayInterval = setInterval(() => {
                            this.moverModalSlide(1, slides.length);
                        }, 4000);
                    }
                },
                willClose: () => clearInterval(this._autoplayInterval)
            });
        } catch (error) {
            console.error(error);
        }
    },

    moverModalSlide(direccion, total) {
        if (total <= 1) return;
        this._modalEstado.indexActual = (this._modalEstado.indexActual + direccion + total) % total;

        const slides = document.querySelectorAll('.modal-slide-consulta');
        slides.forEach((slide, i) => {
            slide.classList.toggle('hidden', i !== this._modalEstado.indexActual);
            slide.classList.toggle('flex', i === this._modalEstado.indexActual);
        });

        const dots = document.querySelectorAll('#modal-dots-consulta div');
        dots.forEach((dot, i) => {
            dot.className = i === this._modalEstado.indexActual
                ? 'h-1.5 w-12 rounded-full bg-blue-500 transition-all duration-500 shadow-[0_0_15px_rgba(59,130,246,0.5)]'
                : 'h-1.5 w-3 rounded-full bg-white/30 transition-all duration-500';
        });
    },
};

window.carruselController_View = carruselController_View;