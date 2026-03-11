import { supabase } from '../config/supabaseClient.js';

export const importacionModel = {
    /**
     * Verifica qué nombres de productos ya existen para evitar duplicados.
     * Optimizamos para ignorar valores nulos y asegurar un Set limpio.
     */
    async obtenerNombresExistentes() {
        const { data, error } = await supabase
            .from('producto')
            .select('nombre');
            
        if (error) {
            console.error("Error al obtener nombres:", error);
            throw error;
        }

        // Filtramos para asegurar que p.nombre exista antes de aplicar trim()
        return new Set(
            data
                .filter(p => p.nombre) 
                .map(p => p.nombre.toLowerCase().trim())
        );
    },

    /**
     * Busca una categoría por nombre y padre.
     * Mejoramos la lógica para manejar estrictamente la comparación con NULL.
     */
    async buscarCategoria(nombre, idPadre) {
        if (!nombre) return null;

        let query = supabase
            .from('categoria')
            .select('id')
            .ilike('nombre', nombre.trim());

        // Si idPadre es null, usamos .is() para comparar con NULL en SQL
        // Si tiene valor, usamos .eq()
        if (idPadre === null) {
            query = query.is('id_padre', null);
        } else {
            query = query.eq('id_padre', idPadre);
        }

        const { data, error } = await query.maybeSingle();
        
        if (error) {
            console.warn(`Aviso: Error buscando categoría ${nombre}:`, error.message);
            return null;
        }

        return data;
    }
};