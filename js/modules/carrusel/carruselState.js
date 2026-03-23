export const carruselState = {
    _id: null,
    _paso: 1,
    _editingItemIdx: null,
    _slideActivo: 0,

    config: {
        nombre: '',
        descripcion: '',
        tipo: 'banners',
        ubicacion_slug: 'home-top',
        orden_seccion: 0,
        activo: true
    },

    items: [],

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
                    const dataProducto = item.producto || {};
                    const dataCategoria = item.categoria || {};
                    const esCategoria = !!item.categoria_id;

                    const pId = item.producto_id ? parseInt(item.producto_id) : null;
                    const cId = item.categoria_id ? parseInt(item.categoria_id) : null;

                    // Imagen/icono — sin fallbacks forzados
                    let imagenFinal = '';
                    if (item.icono_manual && item.icono_manual.trim() !== '') {
                        imagenFinal = item.icono_manual;
                    } else if (item.imagen_url_manual && item.imagen_url_manual.trim() !== '') {
                        imagenFinal = item.imagen_url_manual;
                    } else if (dataProducto.imagen_url) {
                        imagenFinal = dataProducto.imagen_url;
                    } else if (esCategoria) {
                        imagenFinal = 'fa-solid fa-layer-group';
                    } else {
                        imagenFinal = 'https://placehold.co/400x300?text=Sin+Imagen';
                    }

                    // ✅ FIX: Título y subtítulo respetan el vacío — no se fuerza ningún valor
                    // Si titulo_manual es null o '', lo dejamos como '' (no ponemos fallback)
                    const titulo = item.titulo_manual ?? '';
                    const subtitulo = item.subtitulo_manual ?? '';

                    return {
                        imagen_preview: imagenFinal,
                        titulo,
                        subtitulo,
                        link: item.link_destino_manual || '',
                        relacion_id: pId || cId || null,
                        producto_id: pId,
                        categoria_id: cId,
                        tipo_contenido: this.config.tipo,
                        // Preservar campos originales para el guardado
                        titulo_manual: titulo,
                        subtitulo_manual: subtitulo,
                        imagen_url_manual: item.imagen_url_manual || null,
                        icono_manual: item.icono_manual || null,
                        link_destino_manual: item.link_destino_manual || null,
                        id: item.id || null
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

    setTipo(nuevoTipo) {
        if (this.config.tipo !== nuevoTipo) {
            this.config.tipo = nuevoTipo;
            this.items = [];
            this._editingItemIdx = null;
            this._slideActivo = 0;
            return true;
        }
        return false;
    },

    agregarOActualizarItem(dataItem) {
        let listaReal = Array.isArray(this.items) ? this.items : this.items.items;
        if (!listaReal) { console.error("No se pudo encontrar la lista de ítems"); return; }

        if (this._editingItemIdx !== null) {
            listaReal[this._editingItemIdx] = { ...listaReal[this._editingItemIdx], ...dataItem };
            this._editingItemIdx = null;
            return;
        }

        const tieneRelacion = dataItem.relacion_id !== undefined && dataItem.relacion_id !== null;
        if (tieneRelacion) {
            const idxExistente = listaReal.findIndex(it =>
                it.relacion_id !== null && Number(it.relacion_id) === Number(dataItem.relacion_id)
            );
            if (idxExistente !== -1) {
                listaReal[idxExistente] = { ...listaReal[idxExistente], ...dataItem };
                this._slideActivo = idxExistente;
                return;
            }
        }

        listaReal.push(dataItem);
        this._slideActivo = listaReal.length - 1;
    },

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