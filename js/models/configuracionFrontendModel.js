import { supabase } from '../config/supabaseClient.js';

export const configuracionFrontendModel = {
    /**
     * Obtiene todas las configuraciones de la tabla.
     * @returns {Promise<Array|null>} Lista de configuraciones o null si hay error.
     */
    async obtenerTodas() {
        try {
            const { data, error } = await supabase
                .from('configuraciones_sitio')
                .select('*');

            if (error) {
                console.error('Error al obtener configuraciones:', error.message);
                return null;
            }
            return data;
        } catch (err) {
            console.error('Error inesperado:', err);
            return null;
        }
    },

    /**
     * Actualiza el valor_actual de una configuración específica por su clave.
     * @param {string} clave - La clave única (ej: 'color_primary').
     * @param {string} nuevoValor - El nuevo valor (ej: '#ffffff').
     */
    async actualizarConfiguracion(clave, nuevoValor) {
        try {
            const { data, error } = await supabase
                .from('configuraciones_sitio')
                .update({ valor_actual: nuevoValor })
                .eq('clave', clave);

            if (error) {
                console.error('Error al actualizar:', error.message);
                return { exito: false, mensaje: error.message };
            }
            return { exito: true, data };
        } catch (err) {
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Restaura el valor_actual usando el valor_defecto almacenado.
     * @param {string} clave - La clave de la configuración a resetear.
     */
    async restaurarPorDefecto(clave) {
        try {
            // 1. Primero obtenemos el valor por defecto de esa fila
            const { data: config, error: fetchError } = await supabase
                .from('configuraciones_sitio')
                .select('valor_defecto')
                .eq('clave', clave)
                .single();

            if (fetchError) throw fetchError;

            // 2. Actualizamos el valor_actual con lo que encontramos en valor_defecto
            const { error: updateError } = await supabase
                .from('configuraciones_sitio')
                .update({ valor_actual: config.valor_defecto })
                .eq('clave', clave);

            if (updateError) throw updateError;

            return { exito: true, valorRestaurado: config.valor_defecto };
        } catch (err) {
            console.error('Error al restaurar:', err.message);
            return { exito: false, mensaje: err.message };
        }
    }
};