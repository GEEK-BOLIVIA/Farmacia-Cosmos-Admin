import { supabase } from '../config/supabaseClient.js';

export const usuariosModel = {
    /**
     * Obtiene todos los usuarios activos (visible = true)
     */
    async obtenerTodos() {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('visible', true)
                .order('apellido_paterno', { ascending: true });

            if (error) throw error;
            return data;
        } catch (error) {
            console.error('Error al obtener usuarios:', error.message);
            return [];
        }
    },

    /**
     * Obtiene un usuario específico por su UUID
     */
    async obtenerPorId(id) {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (error) {
            console.error(`Error al obtener usuario con ID ${id}:`, error.message);
            return null;
        }
    },

    /**
     * Función especial para el Owner: 
     * Obtiene la lista de usuarios (nombres completos) y los roles definidos en el ENUM
     */
    async obtenerDestinosConfiguracion() {
        try {
            // 1. Obtener usuarios simplificados para el selector
            const { data: usuarios, error: errUser } = await supabase
                .from('usuario')
                .select('id, nombres, apellido_paterno, apellido_materno, rol')
                .eq('visible', true);

            if (errUser) throw errUser;

            // 2. Extraer roles únicos presentes en la tabla 
            // (Nota: Como usas un tipo ENUM user_rol, esto tomará los valores actuales)
            const rolesUnicos = [...new Set(usuarios.map(u => u.rol))];

            return {
                usuarios: usuarios.map(u => ({
                    id: u.id,
                    nombreCompleto: `${u.apellido_paterno} ${u.apellido_materno} ${u.nombres}`
                })),
                roles: rolesUnicos
            };
        } catch (error) {
            console.error('Error en obtenerDestinosConfiguracion:', error.message);
            return { usuarios: [], roles: [] };
        }
    },

    /**
     * Actualiza datos parciales de un usuario
     */
    async actualizar(id, cambios) {
        try {
            const { data, error } = await supabase
                .from('usuario')
                .update(cambios)
                .eq('id', id);

            if (error) throw error;
            return { exito: true };
        } catch (error) {
            return { exito: false, mensaje: error.message };
        }
    }
};