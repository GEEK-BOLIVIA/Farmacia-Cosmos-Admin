import { supabase } from '../config/supabaseClient.js';

export const usuarioModel = {
    async login(email, password) {
        try {
            // 1. Autenticación en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password
            });

            if (authError) throw authError;

            // 2. Obtener datos extendidos de la tabla pública
            const { data: perfil, error: perfilError } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', authData.user.id)
                .single();

            if (perfilError) throw perfilError;

            return { exito: true, user: authData.user, perfil };
        } catch (err) {
            console.error('Error en usuarioModel.login:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Crea un usuario en Auth e inserta su perfil en la tabla pública
     */
    async crear(datos) {
        try {
            // 1. Registro en Supabase Auth
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email: datos.correo_electronico,
                password: datos.password,
            });

            if (authError) throw authError;
            if (!authData.user) throw new Error("No se pudo crear el usuario en Auth");

            // 2. Inserción en tabla pública 'usuario'
            const payload = {
                id: authData.user.id, // Vinculación obligatoria
                nombres: datos.nombres,
                apellido_paterno: datos.apellido_paterno,
                apellido_materno: datos.apellido_materno,
                correo_electronico: datos.correo_electronico,
                celular: datos.celular,
                ci: datos.ci,
                rol: datos.rol || 'cliente',
                visible: true
            };

            const { data: perfil, error: perfilError } = await supabase
                .from('usuario')
                .insert([payload])
                .select();

            if (perfilError) throw perfilError;

            return { exito: true, data: perfil[0] };
        } catch (err) {
            console.error('Error en usuarioModel.crear:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Obtiene los datos del usuario actual si hay una sesión activa
     */
    async obtenerSesionActual() {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data: perfil } = await supabase
                .from('usuario')
                .select('*')
                .eq('id', user.id)
                .single();

            return { ...user, perfil };
        } catch (err) {
            return null;
        }
    },

    /**
     * Cierra la sesión globalmente
     */
    // En usuarioModel.js
    async logout() {
        const { error } = await supabase.auth.signOut();
        sessionStorage.clear(); // Limpiamos datos locales
        return { exito: !error };
    }
};