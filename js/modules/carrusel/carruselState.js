export const carruselState = {
    _id: null,
    _paso: 1,
    _editingItemIdx: null,
    _slideActivo: 0,

    config: {
        nombre: '',
        descripcion: '',
        tipo: 'banners', // 'banners', 'productos', 'categorias'
        ubicacion_slug: 'home-top',
        orden_seccion: 0,
        activo: true
    },

    items: [],

    /**
     * Inicializa o resetea el estado para un nuevo carrusel o edición.
     * Soporta tanto datos nuevos como datos provenientes de Supabase.
     */
    init(id = null, datosExistentes = null) {
        this._id = id;
        this._paso = 1;
        this._editingItemIdx = null;
        this._slideActivo = 0;

        if (datosExistentes) {
            this.config = {
                nombre: datosExistentes.nombre || '',
                descripcion: datosExistentes.descripcion || '',
                tipo: datosExistentes.tipo || 'banners',
                ubicacion_slug: datosExistentes.ubicacion_slug || 'home-top',
                orden_seccion: parseInt(datosExistentes.orden_seccion) || 0,
                activo: datosExistentes.activo !== undefined ? datosExistentes.activo : true
            };

            if (datosExistentes.items && Array.isArray(datosExistentes.items)) {
                this.items = datosExistentes.items.map(item => {
                    const esCategoria = !!item.categoria_id;
                    const dataProducto = item.producto || {};
                    const dataCategoria = item.categoria || {};

                    // Normalizamos los IDs a Números
                    const pId = item.producto_id ? parseInt(item.producto_id) : null;
                    const cId = item.categoria_id ? parseInt(item.categoria_id) : null;

                    // --- LÓGICA DE IMAGEN / ICONO CORREGIDA ---
                    let imagenFinal = '';

                    // 1. Prioridad: ¿Hay un icono de FontAwesome guardado manualmente? (Caso categorías)
                    if (item.icono_manual && item.icono_manual.trim() !== '') {
                        imagenFinal = item.icono_manual;
                    }
                    // 2. ¿Hay una URL de imagen guardada manualmente? (Caso banners/productos)
                    else if (item.imagen_url_manual && item.imagen_url_manual.trim() !== '') {
                        imagenFinal = item.imagen_url_manual;
                    }
                    // 3. Si es producto y no hay manual, usamos la imagen original del producto
                    else if (dataProducto.imagen_url) {
                        imagenFinal = dataProducto.imagen_url;
                    }
                    // 4. Si es categoría pero no tiene icono manual, ponemos el de backup
                    else if (esCategoria) {
                        imagenFinal = 'fa-solid fa-layer-group';
                    }
                    // 5. Fallback total
                    else {
                        imagenFinal = 'https://placehold.co/400x300?text=Sin+Imagen';
                    }

                    return {
                        imagen_preview: imagenFinal,
                        titulo: item.titulo_manual || dataProducto.nombre || dataCategoria.nombre || 'Sin título',
                        subtitulo: item.subtitulo_manual || (dataProducto.precio ? `Bs. ${dataProducto.precio}` : ''),
                        link: item.link_destino_manual || '',
                        relacion_id: pId || cId || null,
                        producto_id: pId,
                        categoria_id: cId,
                        tipo_contenido: this.config.tipo
                    };
                });
            } else {
                this.items = [];
            }
        } else {
            this.resetConfig();
            this.items = [];
        }
    },
    /**
     * Limpia el estado a sus valores por defecto
     */
    resetConfig() {
        this.config = {
            nombre: '',
            descripcion: '',
            tipo: 'banners',
            ubicacion_slug: 'home-top',
            orden_seccion: 0,
            activo: true
        };
        this.items = [];
        this._id = null;
        this._paso = 1;
    },

    /**
     * Cambia el tipo de carrusel y limpia los items para evitar inconsistencias
     * @returns {boolean} true si hubo un cambio real de tipo
     */
    setTipo(nuevoTipo) {
        if (this.config.tipo !== nuevoTipo) {
            this.config.tipo = nuevoTipo;
            this.items = []; // Limpieza de seguridad: no mezclar banners con productos
            this._editingItemIdx = null;
            this._slideActivo = 0;
            return true;
        }
        return false;
    },

    /**
     * Agrega un nuevo ítem o actualiza uno existente si se está editando
     */
    agregarOActualizarItem(dataItem) {
        // 1. IMPORTANTE: Localizamos el array real de ítems
        // Si this.items es el objeto {id: 7, items: []}, trabajamos sobre this.items.items
        let listaReal = Array.isArray(this.items) ? this.items : this.items.items;

        if (!listaReal) {
            console.error("No se pudo encontrar la lista de ítems en el State");
            return;
        }

        // 2. Si estamos en modo edición explícita (clic en el lápiz)
        if (this._editingItemIdx !== null) {
            listaReal[this._editingItemIdx] = {
                ...listaReal[this._editingItemIdx],
                ...dataItem
            };
            this._editingItemIdx = null;
            return;
        }

        // 3. Verificamos duplicados por relacion_id (productos/categorías)
        const tieneRelacion = dataItem.relacion_id !== undefined && dataItem.relacion_id !== null;

        if (tieneRelacion) {
            const idxExistente = listaReal.findIndex(it =>
                it.relacion_id !== null &&
                Number(it.relacion_id) === Number(dataItem.relacion_id)
            );

            if (idxExistente !== -1) {
                listaReal[idxExistente] = {
                    ...listaReal[idxExistente],
                    ...dataItem
                };
                this._slideActivo = idxExistente;
                return;
            }
        }

        // 4. Si es realmente nuevo, lo agregamos al array real
        listaReal.push(dataItem);
        this._slideActivo = listaReal.length - 1;
    },
    /**
     * Cambia la posición de un ítem en el array
     */
    reordenarItems(idx, direccion) {
        const nuevaPos = idx + direccion;
        if (nuevaPos < 0 || nuevaPos >= this.items.length) return false;

        const temp = this.items[idx];
        this.items[idx] = this.items[nuevaPos];
        this.items[nuevaPos] = temp;
        this._slideActivo = nuevaPos;
        return true;
    }
};
window.carruselState = carruselState;