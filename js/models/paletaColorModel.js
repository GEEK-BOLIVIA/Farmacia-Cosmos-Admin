// js/models/paletaColorModel.js
import { supabase } from '../config/supabaseClient.js';

export const paletaColorModel = {
    
    /**
     * Obtiene solo las paletas visibles
     */
    async obtenerTodas() {
        const { data, error } = await supabase
            .from('paletas_colores')
            .select('*')
            .eq('visible', true) 
            .order('id', { ascending: true });

        if (error) {
            console.error('Error al obtener paletas:', error);
            return null;
        }
        return data;
    },

    /**
     * Crea una paleta usando los nuevos nombres de columna
     */
    async crearPaleta(paleta) {
        // Aseguramos visibilidad por defecto
        const nuevaPaleta = { ...paleta, visible: true };
        
        const { data, error } = await supabase
            .from('paletas_colores')
            .insert([nuevaPaleta])
            .select();

        if (error) return { exito: false, error };
        return { exito: true, data: data[0] };
    },

    /**
     * Actualiza los datos mapeando a la nueva estructura de tabla
     */
    async actualizarPaleta(id, datos) {
        try {
            const { data, error } = await supabase
                .from('paletas_colores')
                .update({
                    nombre: datos.nombre,
                    primary_color: datos.primary_color,
                    secondary_color: datos.secondary_color,
                    accent_color: datos.accent_color,
                    primary_dark_color: datos.primary_dark_color,
                    background_light_color: datos.background_light_color,
                    background_dark_color: datos.background_dark_color,
                    surface_dark_color: datos.surface_dark_color
                })
                .eq('id', Number(id))
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (error) {
            console.error('Error en actualizarPaleta:', error);
            return { exito: false, error: error.message };
        }
    },

    /**
     * Soft Delete: Mantenemos la lógica de visibilidad
     */
    async eliminarPaleta(id) {
        try {
            const { error } = await supabase
                .from('paletas_colores')
                .update({ visible: false }) 
                .eq('id', Number(id));

            if (error) throw error;
            return { exito: true };
            
        } catch (err) {
            console.error('Error en eliminarPaleta:', err);
            return { exito: false, error: err.message };
        }
    },

    /**
     * Activa una paleta específica
     */
    async activarPaleta(id) {
        try {
            const idNumerico = Number(id);

            // 1. Desactivar la actual
            await supabase
                .from('paletas_colores')
                .update({ es_activa: false })
                .eq('es_activa', true); 

            // 2. Activar la seleccionada
            const { data, error } = await supabase
                .from('paletas_colores')
                .update({ es_activa: true })
                .eq('id', idNumerico)
                .select();

            if (error) throw error;
            return { exito: true, paletaActiva: data[0] };
        } catch (error) {
            console.error('Error en activarPaleta:', error);
            return { exito: false, error: error.message };
        }
    }
};