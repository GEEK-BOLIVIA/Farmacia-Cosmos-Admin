import { carruselState } from './carruselState.js';
import { carruselTemplates } from './carruselTemplates.js';
import { carruselActions } from './carruselActions.js';

export const RegisterCarrusel = {
    _container: null,
    _originalContent: null,
    _isEdit: false,

    /**
     * Punto de entrada principal
     */
    async init(containerId, data = null) {
        this._container = document.getElementById(containerId);
        this._originalContent = this._container.innerHTML;
        this._isEdit = !!data;

        // Inicializamos el estado con los datos o vacío
        carruselState.init(data?.id || null, data);

        // --- ACTUALIZACIÓN CRÍTICA ---
        // Exponemos las acciones al objeto global window para que el HTML las reconozca
        window.carruselActions = carruselActions;
        window.RegisterCarrusel = this;

        this.updateUI();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    /**
     * Refresca la pantalla basándose en el estado actual
     */
    updateUI() {
        this._container.innerHTML = carruselTemplates.renderMain(
            this._isEdit,
            carruselState._paso,
            carruselState.config,
            carruselState.items
        );
    },

    // --- NAVEGACIÓN ---

    cambiarPaso(n) {
        carruselState._paso = n;
        this.updateUI();
    },

    irAPaso2() {
        if (carruselActions.validarPaso1()) {
            this.cambiarPaso(2);
        }
    },

    // --- ACCIONES DE CONFIGURACIÓN ---

    cambiarTipo(tipo) {
        const cambio = carruselState.setTipo(tipo);
        if (cambio) {
            this.updateUI();
        }
    },

    // --- ACCIONES DE BUSQUEDA (NUEVO) ---

    /**
     * Conecta el input del template con la lógica de búsqueda de Actions
     */
    buscarEnCatalogo(termino) {
        carruselActions.buscarRelacionados(termino);
    },

    // --- ACCIONES DE ITEMS ---

    previsualizarMediaLocal(input) {
        carruselActions.previsualizarMediaLocal(input);
    },

    pedirUrlImagen() {
        carruselActions.pedirUrlImagen();
    },
    
    cerrarYRefrescar() {
        // 1. Quitar el formulario y restaurar el contenedor de la tabla
        if (this._container && this._originalContent) {
            this._container.innerHTML = this._originalContent;
        }

        // 2. Ejecutar el refresco de datos
        if (window.carruselController_View) {
            window.carruselController_View.render();
        }

        // 3. Hacer scroll hacia arriba para que el usuario vea la tabla
        window.scrollTo({ top: 0, behavior: 'smooth' });
    },

    agregarItemALista() {
        // 1. Capturamos el ítem usando la lógica de carruselActions
        const itemCapturado = carruselActions.capturarItem();

        // Verificación de seguridad para evitar que el proceso se rompa
        if (!itemCapturado) {
            console.error("Error: No se pudo capturar la información del ítem.");
            return;
        }

        const state = window.carruselState;

        // 2. Guardar en el State (Memoria temporal)
        if (state._editingItemIdx !== null && state._editingItemIdx !== undefined) {
            state.items[state._editingItemIdx] = itemCapturado;
            state._editingItemIdx = null; // Resetear el modo edición
        } else {
            state.items.push(itemCapturado);
        }

        // 3. REFRESCAR LA INTERFAZ (Lista de ítems)
        const container = document.getElementById('items_list_container');
        if (container && typeof carruselTemplates.renderItemsList === 'function') {
            container.innerHTML = carruselTemplates.renderItemsList(state.items);
        }

        // 4. Actualizar la Previsualización (Live Preview)
        const previewContainer = document.getElementById('live_preview_container');
        if (previewContainer && typeof carruselTemplates.renderLivePreview === 'function') {
            previewContainer.innerHTML = carruselTemplates.renderLivePreview(state.items, 0, state.config.tipo);
        }

        // 5. LIMPIAR EL FORMULARIO (Solución al error TypeError)
        // En lugar de llamar a una función externa que falla, ejecutamos la limpieza aquí
        this.limpiarFormularioItem();

        // Feedback visual para el usuario
        const toast = Swal.mixin({
            toast: true,
            position: 'top-end',
            showConfirmButton: false,
            timer: 2000
        });
        toast.fire({
            icon: 'success',
            title: 'Cambios aplicados en la lista'
        });
    },

    /**
     * Este es el método que faltaba y causaba el error en consola.
     * Limpia el formulario y lo devuelve a su estado original.
     */
    limpiarFormularioItem() {
        const state = window.carruselState;
        const formContainer = document.getElementById('form_item_container');

        if (formContainer && typeof carruselTemplates.renderFormItem === 'function') {
            // Re-renderizamos el formulario en modo "nuevo" (null)
            formContainer.innerHTML = carruselTemplates.renderFormItem(state.config.tipo, null);
        }

        // Aseguramos que el buscador esté vacío
        const searchInput = document.getElementById('it_search');
        if (searchInput) searchInput.value = '';
    },
    cargarItemParaEditar(idx) {
        // 1. Acceso seguro al array de ítems (manejando estructura anidada o directa)
        const itemsArray = Array.isArray(carruselState.items)
            ? carruselState.items
            : (carruselState.items.items || []);

        const item = itemsArray[idx];

        if (!item) {
            console.error("No se encontró el ítem para editar en el índice:", idx);
            return;
        }

        // Guardamos el índice en el estado global para saber qué fila sobreescribir al guardar
        carruselState._editingItemIdx = idx;

        // 2. Priorización de Media: Icono > Imagen Manual > Preview
        // Esto asegura que si hay un icono guardado, se cargue eso en el selector
        const valorMedia = item.icono_manual || item.imagen_url_manual || item.imagen_preview || '';
        const valorTitulo = item.titulo_manual || item.titulo || 'Sin título';
        const valorSubtitulo = item.subtitulo_manual || item.subtitulo || '';
        const valorLink = item.link_destino_manual || item.link || '';

        // 3. Preparamos el objeto "mapeado" para que el Template renderice correctamente
        const itemMapeado = {
            ...item,
            titulo: valorTitulo,
            subtitulo: valorSubtitulo,
            link: valorLink,
            imagen_preview: valorMedia // Usado por el template para dibujar el <img> o el <i>
        };

        const formContainer = document.getElementById('form_item_container');
        if (formContainer) {
            // Renderizamos el formulario (esto limpia el estado visual previo del form)
            formContainer.innerHTML = carruselTemplates.renderFormItem(carruselState.config.tipo, itemMapeado);

            // 4. Llenamos los inputs físicos. 
            // Es CRUCIAL que it_media_url tenga el valor para que capturarItem() lo detecte
            const elMedia = document.getElementById('it_media_url');
            const elTitulo = document.getElementById('it_titulo');
            const elSubtitulo = document.getElementById('it_subtitulo');
            const elLink = document.getElementById('it_link');
            const elRelacion = document.getElementById('it_relacion_id');

            if (elMedia) elMedia.value = valorMedia;
            if (elTitulo) elTitulo.value = valorTitulo;
            if (elSubtitulo) elSubtitulo.value = valorSubtitulo;
            if (elLink) elLink.value = valorLink;

            // Preservamos el ID de relación (producto_id o categoria_id)
            if (elRelacion) elRelacion.value = item.relacion_id || item.producto_id || item.categoria_id || '';

            // Si existe buscador (tipo productos/categorías), sincronizamos el texto de búsqueda
            const elSearch = document.getElementById('it_search');
            if (elSearch) elSearch.value = valorTitulo;

            // 5. Sincronización visual del Preview
            // Esto ejecuta la lógica de "Si empieza con fa- pon un icono, si no una imagen"
            if (typeof carruselActions._actualizarPreviewLocal === 'function') {
                carruselActions._actualizarPreviewLocal(valorMedia);
            }
        }
    },

    cancelarEdicionItem() {
        carruselState._editingItemIdx = null;
        this.updateUI();
    },

    quitarItem(idx) {
        carruselState.items.splice(idx, 1);
        this.updateUI();
    },

    reordenar(idx, direccion) {
        if (carruselState.reordenarItems(idx, direccion)) {
            this.updateUI();
        }
    },

    cambiarSlide(dir) {
        const total = carruselState.items.length;
        if (total === 0) return;

        carruselState._slideActivo = (carruselState._slideActivo + dir + total) % total;

        const previewContainer = document.getElementById('live_preview_container');
        if (previewContainer) {
            previewContainer.innerHTML = carruselTemplates.renderLivePreview(
                carruselState.items,
                carruselState._slideActivo,
                carruselState.config.tipo
            );
        }
    },

    async actualizarOrdenAutomatico(nuevoSlug) {
        carruselState.config.ubicacion_slug = nuevoSlug;
        // Asumimos que carruselController está disponible globalmente
        const proximoOrden = await window.carruselController.obtenerSiguienteOrden(nuevoSlug);

        carruselState.config.orden_seccion = proximoOrden;
        const inputOrden = document.getElementById('cfg_orden_seccion');
        if (inputOrden) inputOrden.value = proximoOrden;
    },

    // --- CIERRE Y GUARDADO ---

    finalizarGuardado() {
        carruselActions.enviarAlServidor();
    },

    cancelarEdicion() {
        if (carruselState.items.length > 0) {
            Swal.fire({
                title: '¿Salir del editor?',
                text: "Se perderán los cambios que no hayas guardado.",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#0f172a',
                confirmButtonText: 'Sí, salir',
                cancelButtonText: 'Seguir aquí'
            }).then((result) => {
                if (result.isConfirmed) this.cerrarYRefrescar();
            });
        } else {
            this.cerrarYRefrescar();
        }
    },

    cerrarYRefrescar() {
        this._container.innerHTML = this._originalContent;
        if (window.CarruselList) window.CarruselList.init();
    }
};

// --- IMPORTANTE: Exposición global inmediata ---
window.RegisterCarrusel = RegisterCarrusel;