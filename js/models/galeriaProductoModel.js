import { supabase } from '../config/supabaseClient.js';

/**
 * Modelo para la gestión de galería de productos
 * Nexus Admin Suite - Model Layer (Optimized for Sync)
 */
export const galeriaProductoModel = {

    /**
     * Obtiene los elementos multimedia activos de un producto
     */
    async getByProducto(idProducto) {
        try {
            const { data, error } = await supabase
                .from('galeria_producto')
                .select('*')
                .eq('id_producto', idProducto)
                .eq('visible', true)
                .order('orden', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error("Model Error [getByProducto]:", error.message);
            return [];
        }
    },

    /**
     * MÉTODO PRIVADO: Normalización de datos
     * Evita que se guarden objetos JSON en columnas de texto (URL).
     */
    _normalizarItem(item) {
        let urlFinal = '';
        let tipoFinal = 'imagen';

        if (typeof item === 'string') {
            urlFinal = item;
        } else if (item && typeof item === 'object') {
            urlFinal = item.url || item.file_url || '';
            tipoFinal = item.tipo || 'imagen';
        }

        return {
            url: String(urlFinal).trim(),
            tipo: String(tipoFinal).toLowerCase().includes('video') ? 'video' : 'imagen'
        };
    },

    /**
     * Inserta un solo elemento multimedia
     */
    async create(data) {
        try {
            const cleaned = this._normalizarItem(data);

            const { data: result, error } = await supabase
                .from('galeria_producto')
                .insert([{
                    id_producto: data.idProducto,
                    url: cleaned.url,
                    tipo: cleaned.tipo,
                    orden: parseInt(data.orden) || 0,
                    visible: true
                }])
                .select();

            if (error) throw error;
            return result[0];
        } catch (error) {
            console.error("Model Error [create]:", error.message);
            throw error;
        }
    },

    /**
     * Inserta elementos en lote (Bulk Insert)
     * Utilizado tras la limpieza física en ediciones.
     */
    async createLote(idProducto, itemsMultimedia) {
        try {
            if (!itemsMultimedia || itemsMultimedia.length === 0) return { exito: true, data: [] };

            const payload = itemsMultimedia.map(item => {
                const cleaned = this._normalizarItem(item);
                return {
                    id_producto: idProducto,
                    url: cleaned.url,
                    tipo: cleaned.tipo,
                    orden: parseInt(item.orden) || 0,
                    visible: true
                };
            });

            console.log(`DB: Intentando insertar lote de ${payload.length} elementos para producto ${idProducto}`);

            const { data, error } = await supabase
                .from('galeria_producto')
                .insert(payload)
                .select();

            if (error) throw error;

            console.log("DB: Lote insertado correctamente.");
            return { exito: true, data };
        } catch (error) {
            console.error("Model Error [createLote]:", error.message);
            throw error;
        }
    },

    /**
     * Actualiza un elemento multimedia individual
     */
    async update(id, updates) {
        try {
            const normalizado = this._normalizarItem(updates);
            const cleanUpdates = { ...updates };

            if (updates.url) cleanUpdates.url = normalizado.url;
            if (updates.tipo) cleanUpdates.tipo = normalizado.tipo;

            const { error } = await supabase
                .from('galeria_producto')
                .update(cleanUpdates)
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error("Model Error [update]:", error.message);
            return false;
        }
    },

    /**
     * Borrado lógico (Soft Delete)
     * Se usa normalmente para eliminaciones simples desde la lista.
     */
    async delete(id) {
        try {
            const { error } = await supabase
                .from('galeria_producto')
                .update({ visible: false })
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (error) {
            console.error("Model Error [delete]:", error.message);
            return false;
        }
    },

    /**
     * Borrado físico (Limpieza total por producto)
     * Crucial para el proceso de Edición: Borra todo para evitar duplicados 
     * antes de re-insertar el nuevo estado de la galería.
     */
    /**
 * Borrado físico de la galería para un producto.
 * Esto limpia el espacio antes de insertar el nuevo orden/archivos.
 */
    async limpiarGaleria(idProducto) {
        try {
            console.log(`DB: Ejecutando DELETE físico para producto ${idProducto}`);

            const { error, count } = await supabase
                .from('galeria_producto')
                .delete() // <--- Borrado físico real
                .eq('id_producto', idProducto);

            if (error) throw error;

            console.log("DB: Registros eliminados físicamente.");
            return true;
        } catch (error) {
            // Si falla el delete, intentamos un soft delete masivo como plan B
            console.error("Fallo el delete físico, intentando ocultarlos:", error.message);
            await supabase
                .from('galeria_producto')
                .update({ visible: false })
                .eq('id_producto', idProducto);
            return false;
        }
    }
};