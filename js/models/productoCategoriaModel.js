import { supabase } from '../config/supabaseClient.js';

/**
 * Modelo para la tabla intermedia producto_categorias_rel
 * Maneja la relación Muchos a Muchos entre Productos y Categorías.
 */
export const productoCategoriaModel = {

    /**
     * Vincula un producto con una categoría.
     * @param {number} productoId 
     * @param {number} categoriaId 
     */
    async vincular(productoId, categoriaId) {
        try {
            const { error } = await supabase
                .from('producto_categorias_rel')
                .insert([{
                    id_producto: productoId,
                    id_categoria: categoriaId
                }]);

            if (error) {
                // Si el error es por duplicado (Pkey), lo ignoramos o manejamos
                if (error.code === '23505') return { exito: true, mensaje: 'Ya vinculado' };
                throw error;
            }

            return { exito: true };
        } catch (err) {
            console.error('Error al vincular producto-categoría:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * NUEVO: Vincula múltiples categorías a un producto en una sola transacción.
     * Ideal para el proceso de creación de producto.
     */
    async vincularMultiple(productoId, categoriasIds) {
        try {
            const payload = categoriasIds.map(idCat => ({
                id_producto: productoId,
                id_categoria: parseInt(idCat)
            }));

            const { error } = await supabase
                .from('producto_categorias_rel')
                .insert(payload);

            if (error) throw error;
            return { exito: true };
        } catch (err) {
            console.error('Error en vinculación múltiple:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Elimina una vinculación específica.
     */
    async desvincular(productoId, categoriaId) {
        try {
            const { error } = await supabase
                .from('producto_categorias_rel')
                .delete()
                .eq('id_producto', productoId)
                .eq('id_categoria', categoriaId);

            if (error) throw error;
            return { exito: true };
        } catch (err) {
            console.error('Error al desvincular:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Elimina TODAS las categorías de un producto.
     * Muy útil antes de realizar una actualización de categorías (Limpiar y Re-insertar).
     */
    async desvincularTodo(productoId) {
        try {
            const { error } = await supabase
                .from('producto_categorias_rel')
                .delete()
                .eq('id_producto', productoId);

            if (error) throw error;
            return { exito: true };
        } catch (err) {
            console.error('Error al limpiar categorías del producto:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * NUEVO: Actualiza las relaciones de un producto (Limpiar y Re-vincular).
     * Usado principalmente en la EDICIÓN de productos.
     */
    async actualizarRelaciones(productoId, nuevasCategoriasIds) {
        try {
            // 1. Borramos las existentes
            await this.desvincularTodo(productoId);
            
            // 2. Si hay nuevas, las vinculamos
            if (nuevasCategoriasIds && nuevasCategoriasIds.length > 0) {
                return await this.vincularMultiple(productoId, nuevasCategoriasIds);
            }
            
            return { exito: true };
        } catch (err) {
            console.error('Error al actualizar relaciones:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Obtiene los IDs de las categorías vinculadas a un producto.
     */
    async obtenerCategoriasPorProducto(productoId) {
        try {
            const { data, error } = await supabase
                .from('producto_categorias_rel')
                .select('id_categoria')
                .eq('id_producto', productoId);

            if (error) throw error;
            return data.map(rel => rel.id_categoria);
        } catch (err) {
            console.error('Error al obtener categorías del producto:', err.message);
            return [];
        }
    }
};