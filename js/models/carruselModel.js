import { supabase } from '../config/supabaseClient.js';

/**
 * carruselModel - Nexus Admin Suite V6.8
 * Maneja la persistencia de Carruseles (Cabecera) y Carrusel_Items (Detalle)
 */
export const carruselModel = {

    // ==========================================
    // SECCIÓN 1: GESTIÓN DE CARRUSELES (CABECERA)
    // ==========================================

    /**
     * Lista todos los carruseles disponibles
     * CORRECCIÓN: Ahora ordena por slug y luego por orden_seccion
     */
    async listar() {
        try {
            const { data, error } = await supabase
                .from('carruseles')
                .select('*')
                // Primero agrupamos por ubicación y luego por el orden que definas
                .order('ubicacion_slug', { ascending: true })
                .order('orden_seccion', { ascending: true });

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error al listar carruseles:', err.message);
            return [];
        }
    },
    // Añadir esto dentro del objeto carruselModel en carruselModel.js

    /**
     * Calcula el siguiente orden disponible para un slug específico
     */
    async obtenerSiguienteOrden(slug) {
        try {
            const { data, error } = await supabase
                .from('carruseles')
                .select('orden_seccion')
                .eq('ubicacion_slug', slug)
                .order('orden_seccion', { ascending: false })
                .limit(1);

            if (error) throw error;

            // Si hay registros, sumamos 1 al mayor. Si no, empezamos en 0.
            const siguiente = data.length > 0 ? (parseInt(data[0].orden_seccion) + 1) : 0;
            return siguiente;
        } catch (err) {
            console.error('Error al calcular orden:', err.message);
            return 0;
        }
    },
    /**
     * Crea un nuevo carrusel (Solo la configuración inicial)
     * CORRECCIÓN: Se añadió 'orden_seccion' al payload
     */
    async crear(datos) {
        try {
            const payload = {
                nombre: datos.nombre.trim(),
                descripcion: datos.descripcion || '',
                tipo: datos.tipo, // 'banners', 'productos', 'categorias'
                ubicacion_slug: datos.ubicacion_slug.toLowerCase(),
                orden_seccion: parseInt(datos.orden_seccion) || 0, // Nuevo campo
                activo: datos.activo !== undefined ? datos.activo : true
            };

            const { data, error } = await supabase
                .from('carruseles')
                .insert([payload])
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error al crear carrusel:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Actualiza la configuración de un carrusel existente
     * CORRECCIÓN: Soporta la actualización de 'orden_seccion'
     */
    async actualizar(id, cambios) {
        try {
            // Aseguramos que si viene orden_seccion, sea un entero
            if (cambios.orden_seccion !== undefined) {
                cambios.orden_seccion = parseInt(cambios.orden_seccion) || 0;
            }

            const { data, error } = await supabase
                .from('carruseles')
                .update(cambios)
                .eq('id', id)
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error al actualizar carrusel:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },
    async obtenerItemsPorCarrusel(carruselId) {
        try {
            const { data, error } = await supabase
                .from('carrusel_items')
                .select('*')
                .eq('carrusel_id', carruselId)
                .order('orden', { ascending: true });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Error al obtener ítems del carrusel:', err.message);
            return [];
        }
    },
    /**
     * Elimina un carrusel y sus ítems
     */
    async eliminar(id) {
        try {
            // Paso A: Eliminar los ítems vinculados (hijos)
            const { error: errorItems } = await supabase
                .from('carrusel_items')
                .delete()
                .eq('carrusel_id', id);

            if (errorItems) throw errorItems;

            // Paso B: Eliminar el carrusel (padre)
            const { error: errorCarrusel } = await supabase
                .from('carruseles')
                .delete()
                .eq('id', id);

            if (errorCarrusel) throw errorCarrusel;

            return { exito: true };
        } catch (err) {
            console.error('Error en carruselModel.eliminar:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    // ==========================================
    // SECCIÓN 2: GESTIÓN DE ÍTEMS (DETALLE)
    // ==========================================

    /**
     * Obtiene los ítems vinculados a un carrusel específico
     */
    async obtenerItems(carruselId) {
        try {
            const { data, error } = await supabase
                .from('carrusel_items')
                .select(`
                *,
                producto:producto_id (id, nombre, imagen_url, precio),
                categoria:categoria_id (id, nombre) 
            `) // Quitamos "imagen" o "imagen_url" de aquí
                .eq('carrusel_id', carruselId)
                .order('orden', { ascending: true });

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error al obtener ítems:', err.message);
            return [];
        }
    },

    /**
     * Elimina todos los ítems de un carrusel.
     */
    async limpiarItemsCarrusel(carruselId) {
        try {
            // Validación de seguridad para evitar borrar todo si carruselId es null
            if (!carruselId) throw new Error("ID de carrusel no válido para limpiar");

            const { error } = await supabase
                .from('carrusel_items')
                .delete()
                .eq('carrusel_id', carruselId);

            if (error) throw error;
            return { exito: true };
        } catch (err) {
            console.error('Error al limpiar ítems previos:', err.message);
            return { exito: false };
        }
    },
    async eliminarItemsPorCarrusel(carruselId) {
        const { error } = await supabase
            .from('carrusel_items')
            .delete()
            .eq('carrusel_id', carruselId);

        if (error) return { exito: false, mensaje: error.message };
        return { exito: true };
    },

    /**
     * Inserta un ítem individual en la tabla carrusel_items
     */
    async agregarItem(item) {
        try {
            const payload = {
                carrusel_id: item.carrusel_id,
                orden: item.orden || 0,
                titulo_manual: item.titulo_manual || null,
                subtitulo_manual: item.subtitulo_manual || null,
                // Aquí centralizamos tanto la URL como el nombre del icono
                imagen_url_manual: item.imagen_url_manual || item.icono_manual || null,
                link_destino_manual: item.link_destino_manual || null,
                producto_id: item.producto_id || null,
                categoria_id: item.categoria_id || null
            };

            const { data, error } = await supabase
                .from('carrusel_items')
                .insert([payload])
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error al insertar ítem:', err.message);
            throw err;
        }
    }
};