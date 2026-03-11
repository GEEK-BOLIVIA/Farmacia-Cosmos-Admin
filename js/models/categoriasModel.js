import { supabase } from '../config/supabaseClient.js';

export const categoriasModel = {
    /**
     * Obtiene solo las categorías activas (Soft Delete: visible = true).
     * Realiza un join para obtener el nombre del padre.
     */
    async obtenerTodas() {
        try {
            const { data, error } = await supabase
                .from('categoria')
                .select(`
                    id,
                    nombre,
                    visible,
                    id_padre,
                    categoria_padre:id_padre (
                        nombre
                    )
                `)
                .eq('visible', true) // Filtro para ignorar registros "eliminados"
                .order('nombre', { ascending: true });

            if (error) throw error;

            return data.map(item => ({
                ...item,
                nombre_padre: item.categoria_padre ? item.categoria_padre.nombre : 'Principal'
            }));

        } catch (err) {
            console.error('Error en categoriasModel.obtenerTodas:', err.message);
            return [];
        }
    },

    /**
     * Obtiene una categoría específica por su ID incluyendo datos del padre.
     */
    async obtenerPorId(id) {
        try {
            const { data, error } = await supabase
                .from('categoria')
                .select(`
                    *,
                    categoria_padre:id_padre ( nombre )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;

            return {
                ...data,
                nombre_padre: data.categoria_padre ? data.categoria_padre.nombre : 'Ninguna (Es Principal)'
            };
        } catch (err) {
            console.error(`Error al obtener categoría ${id}:`, err.message);
            return null;
        }
    },

    /**
     * Crea una nueva categoría.
     */
    async crear(categoria) {
        try {
            const payload = {
                nombre: categoria.nombre.trim(),
                visible: categoria.visible ?? true,
                id_padre: categoria.id_padre || null
            };

            const { data, error } = await supabase
                .from('categoria')
                .insert([payload])
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error al crear categoría:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Actualiza una categoría existente.
     */
    async actualizar(id, cambios) {
        try {
            // Aseguramos que id_padre se maneje correctamente si viene vacío
            if (cambios.hasOwnProperty('id_padre')) {
                cambios.id_padre = cambios.id_padre || null;
            }

            const { data, error } = await supabase
                .from('categoria')
                .update(cambios)
                .eq('id', id)
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error al actualizar categoría:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Realiza un Soft Delete (Cambia visible a false).
     * Mantenemos el nombre de la función como 'eliminar' para consistencia con el Controller.
     */
    async eliminar(id) {
        try {
            const { data, error } = await supabase
                .from('categoria')
                .update({ visible: false })
                .eq('id', id)
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error en Soft Delete:', err.message);
            return {
                exito: false,
                mensaje: "No se pudo ocultar el registro: " + err.message
            };
        }
    },
    /**
     * Busca categorías activas por nombre
     */
    async buscarPorNombre(termino) {
        try {
            const { data, error } = await supabase
                .from('categoria')
                .select('id, nombre') // Solo las columnas que existen
                .ilike('nombre', `%${termino}%`)
                .eq('visible', true)
                .limit(10);

            if (error) throw error;

            return data.map(c => ({
                id: c.id,
                nombre: c.nombre,
                // Como tu tabla no tiene imagen, enviamos un placeholder
                imagen: 'https://placehold.co/400x400?text=Categoria'
            }));
        } catch (err) {
            console.error('Error buscando categorías:', err.message);
            return [];
        }
    }
};