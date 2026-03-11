import { galeriaProductoModel } from '../models/galeriaProductoModel.js';

/**
 * GaleriaProducto Controller - Nexus Admin Suite
 * Maneja la lógica de negocio para recursos multimedia sin vista propia.
 */
export const galeriaProductoController = {

    /**
     * Carga y retorna la galería de un producto
     * @param {number} idProducto 
     */
    async obtenerGaleria(idProducto) {
        if (!idProducto) return [];
        return await galeriaProductoModel.getByProducto(idProducto);
    },

    /**
     * Añade un nuevo recurso a la galería
     * @param {Object} datos { idProducto, url, tipo, orden }
     */
    async agregarRecurso(datos) {
        try {
            if (!datos.url || !datos.idProducto) {
                throw new Error("URL e ID de producto son obligatorios");
            }

            const nuevoRecurso = await galeriaProductoModel.create(datos);
            
            // Notificación de éxito (Opcional, usando tu SweetAlert2)
            if (window.Swal) {
                Swal.fire({
                    icon: 'success',
                    title: 'Recurso añadido',
                    toast: true,
                    position: 'top-end',
                    showConfirmButton: false,
                    timer: 2000
                });
            }

            return nuevoRecurso;
        } catch (error) {
            console.error("Controller Error [agregarRecurso]:", error);
            return null;
        }
    },

    /**
     * Actualiza datos de un recurso (ej. cambiar orden o descripción)
     */
    async editarRecurso(id, cambios) {
        const resultado = await galeriaProductoModel.update(id, cambios);
        return resultado;
    },

    /**
     * Elimina (Soft Delete) un recurso de la galería
     */
    async eliminarRecurso(id) {
        try {
            const confirmado = await galeriaProductoModel.delete(id);
            
            if (confirmado && window.Swal) {
                Swal.fire({
                    icon: 'info',
                    title: 'Eliminado',
                    text: 'El recurso ha sido movido a la papelera (Soft Delete)',
                    timer: 1500
                });
            }
            
            return confirmado;
        } catch (error) {
            console.error("Controller Error [eliminarRecurso]:", error);
            return false;
        }
    },

    /**
     * Procesa el reordenamiento masivo (útil para Drag & Drop)
     * @param {Array} listaIds Orden exacto de IDs obtenidos de la UI
     */
    async guardarNuevoOrden(listaIds) {
        // Mapeamos a la estructura que el modelo espera: [{id, orden}, ...]
        const mapeoOrden = listaIds.map((id, index) => ({
            id: id,
            orden: index
        }));

        return await galeriaProductoModel.updateOrden(mapeoOrden);
    }
};