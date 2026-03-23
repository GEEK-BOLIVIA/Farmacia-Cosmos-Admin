import { carruselState } from './carruselState.js';
import { carruselTemplates } from './carruselTemplates.js';
import { carruselActions } from './carruselActions.js';

export const RegisterCarrusel = {
    _container: null,
    _originalContent: null,
    _isEdit: false,

    async init(containerId, data = null) {
        this._container = document.getElementById(containerId);
        this._originalContent = this._container.innerHTML;
        this._isEdit = !!data;

        carruselState.init(data?.id || null, data);

        window.carruselActions = carruselActions;
        window.RegisterCarrusel = this;

        this.updateUI();

        // ✅ Solo para carruseles nuevos: calcular orden automático con el slug por defecto
        if (!this._isEdit) {
            const slugInicial = carruselState.config.ubicacion_slug || 'home-top';
            await this.actualizarOrdenAutomatico(slugInicial);
        }

        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    updateUI() {
        this._container.innerHTML = carruselTemplates.renderMain(
            this._isEdit,
            carruselState._paso,
            carruselState.config,
            carruselState.items
        );
    },

    cambiarPaso(n) { carruselState._paso = n; this.updateUI(); },

    irAPaso2() { if (carruselActions.validarPaso1()) this.cambiarPaso(2); },

    cambiarTipo(tipo) { if (carruselState.setTipo(tipo)) this.updateUI(); },

    buscarEnCatalogo(termino) { carruselActions.buscarRelacionados(termino); },

    previsualizarMediaLocal(input) { carruselActions.previsualizarMediaLocal(input); },

    pedirUrlImagen() { carruselActions.pedirUrlImagen(); },

    cerrarYRefrescar() {
        if (this._container && this._originalContent) {
            this._container.innerHTML = this._originalContent;
        }
        // ✅ Limpiar referencias
        this._container = null;
        this._originalContent = null;

        // ✅ Limpiar selección ANTES de re-renderizar
        if (window.carruselController_View) {
            window.carruselController_View._estado.seleccionados = [];
        }

        if (window.carruselController_View) window.carruselController_View.render();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },
    agregarItemALista() {
        const itemCapturado = carruselActions.capturarItem();
        if (!itemCapturado) return;

        const state = window.carruselState;

        if (state._editingItemIdx !== null && state._editingItemIdx !== undefined) {
            state.items[state._editingItemIdx] = itemCapturado;
            state._editingItemIdx = null;
        } else {
            state.items.push(itemCapturado);
        }

        const container = document.getElementById('items_list_container');
        if (container) container.innerHTML = carruselTemplates.renderItemsList(state.items);

        const previewContainer = document.getElementById('live_preview_container');
        if (previewContainer) previewContainer.innerHTML = carruselTemplates.renderLivePreview(state.items, 0, state.config.tipo);

        this.limpiarFormularioItem();

        Swal.mixin({ toast: true, position: 'top-end', showConfirmButton: false, timer: 2000 })
            .fire({ icon: 'success', title: 'Ítem añadido' });
    },

    limpiarFormularioItem() {
        const state = window.carruselState;
        const formContainer = document.getElementById('form_item_container');
        if (formContainer) formContainer.innerHTML = carruselTemplates.renderFormItem(state.config.tipo, null);
        const searchInput = document.getElementById('it_search');
        if (searchInput) searchInput.value = '';
    },

    /**
     * ✅ FIX: cargarItemParaEditar respeta títulos vacíos
     * Antes: valorTitulo = item.titulo_manual || item.titulo || 'Sin título'
     * Ahora: valorTitulo = item.titulo_manual ?? item.titulo ?? ''
     */
    cargarItemParaEditar(idx) {
        const itemsArray = Array.isArray(carruselState.items)
            ? carruselState.items
            : (carruselState.items.items || []);

        const item = itemsArray[idx];
        if (!item) { console.error("No se encontró el ítem en índice:", idx); return; }

        carruselState._editingItemIdx = idx;

        const valorMedia = item.icono_manual || item.imagen_url_manual || item.imagen_preview || '';
        // ✅ ?? en lugar de || para respetar cadena vacía
        const valorTitulo = item.titulo_manual ?? item.titulo ?? '';
        const valorSubtitulo = item.subtitulo_manual ?? item.subtitulo ?? '';
        const valorLink = item.link_destino_manual || item.link || '';

        const itemMapeado = {
            ...item,
            titulo: valorTitulo,
            subtitulo: valorSubtitulo,
            link: valorLink,
            imagen_preview: valorMedia
        };

        const formContainer = document.getElementById('form_item_container');
        if (formContainer) {
            formContainer.innerHTML = carruselTemplates.renderFormItem(carruselState.config.tipo, itemMapeado);

            const elMedia = document.getElementById('it_media_url');
            const elTitulo = document.getElementById('it_titulo');
            const elSubtitulo = document.getElementById('it_subtitulo');
            const elLink = document.getElementById('it_link');
            const elRelacion = document.getElementById('it_relacion_id');
            const elSearch = document.getElementById('it_search');

            if (elMedia) elMedia.value = valorMedia;
            if (elTitulo) elTitulo.value = valorTitulo;    // '' si estaba vacío
            if (elSubtitulo) elSubtitulo.value = valorSubtitulo; // '' si estaba vacío
            if (elLink) elLink.value = valorLink;
            if (elRelacion) elRelacion.value = item.relacion_id || item.producto_id || item.categoria_id || '';
            if (elSearch) elSearch.value = valorTitulo;    // '' si estaba vacío

            if (typeof carruselActions._actualizarPreviewLocal === 'function') {
                carruselActions._actualizarPreviewLocal(valorMedia);
            }
        }
    },

    cancelarEdicionItem() { carruselState._editingItemIdx = null; this.updateUI(); },

    quitarItem(idx) { carruselState.items.splice(idx, 1); this.updateUI(); },

    reordenar(idx, direccion) { if (carruselState.reordenarItems(idx, direccion)) this.updateUI(); },

    cambiarSlide(dir) {
        const total = carruselState.items.length;
        if (total === 0) return;
        carruselState._slideActivo = (carruselState._slideActivo + dir + total) % total;
        const previewContainer = document.getElementById('live_preview_container');
        if (previewContainer) {
            previewContainer.innerHTML = carruselTemplates.renderLivePreview(
                carruselState.items, carruselState._slideActivo, carruselState.config.tipo
            );
        }
    },

    async actualizarOrdenAutomatico(nuevoSlug) {
        carruselState.config.ubicacion_slug = nuevoSlug;
        const proximoOrden = await window.carruselController.obtenerSiguienteOrden(nuevoSlug);
        carruselState.config.orden_seccion = proximoOrden;
        const inputOrden = document.getElementById('cfg_orden_seccion');
        if (inputOrden) inputOrden.value = proximoOrden;
    },

    finalizarGuardado() { carruselActions.enviarAlServidor(); },

    cancelarEdicion() {
        if (carruselState.items.length > 0) {
            Swal.fire({
                title: '¿Salir del editor?', text: "Se perderán los cambios sin guardar.",
                icon: 'warning', showCancelButton: true,
                confirmButtonColor: '#0f172a', confirmButtonText: 'Sí, salir', cancelButtonText: 'Seguir aquí'
            }).then(result => { if (result.isConfirmed) this.cerrarYRefrescar(); });
        } else {
            this.cerrarYRefrescar();
        }
    }
};

window.RegisterCarrusel = RegisterCarrusel;