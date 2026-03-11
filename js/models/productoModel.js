import { supabase } from '../config/supabaseClient.js';

/**
 * Producto Model - Nexus Admin Suite
 * Versión corregida para Mapeo de Switches y Soporte de Multimedia
 */
export const productoModel = {

    /**
     * Obtiene productos usando la VISTA especializada.
     */
    async listarActivos() {
        try {
            const { data, error } = await supabase
                .from('v_productos_detallados')
                .select('*')
                .eq('visible', true)
                .order('producto_id', { ascending: false });

            if (error) throw error;

            const productosUnicos = [];
            const idsProcesados = new Set();

            data.forEach(p => {
                if (!idsProcesados.has(p.producto_id)) {
                    idsProcesados.add(p.producto_id);

                    productosUnicos.push({
                        ...p,
                        id: p.producto_id,
                        nombre: p.producto_nombre,
                        nombre_categoria: p.categoria_padre_nombre
                            ? `${p.categoria_padre_nombre} > ${p.categoria_nombre}`
                            : (p.categoria_nombre || 'Sin Categoría')
                    });
                }
            });

            return productosUnicos;
        } catch (err) {
            console.error('Error en productoModel.listarActivos:', err.message);
            return [];
        }
    },

    /**
     * Obtiene un producto por ID usando la vista
     */
    async obtenerPorId(id) {
        try {
            const { data, error } = await supabase
                .from('v_productos_detallados')
                .select('*')
                .eq('producto_id', id)
                .limit(1); // Cambiamos .single() por .limit(1)

            if (error) throw error;

            // Verificamos si hay datos y devolvemos el primero
            if (!data || data.length === 0) return null;

            const producto = data[0];
            return { ...producto, id: producto.producto_id };
        } catch (err) {
            console.error(`Error al obtener producto ${id}:`, err.message);
            return null;
        }
    },
    // productoModel.js -> Función actualizar corregida

    async actualizar(id, cambios) {
        try {
            // Construimos el payload asegurando compatibilidad de nombres
            const datosLimpios = {
                nombre: cambios.nombre || cambios.producto_nombre,
                descripcion: cambios.descripcion,
                precio: cambios.precio !== undefined ? parseFloat(cambios.precio) : undefined,
                stock: cambios.stock !== undefined ? parseInt(cambios.stock) : undefined,

                // CORRECCIÓN AQUÍ: Acepta tanto 'portada' como 'imagen_url'
                imagen_url: cambios.imagen_url || cambios.portada,

                mostrar_precio: cambios.mostrar_precio !== undefined ? cambios.mostrar_precio :
                    (cambios.price_visible !== undefined ? cambios.price_visible : undefined),

                habilitar_whatsapp: cambios.habilitar_whatsapp !== undefined ? cambios.habilitar_whatsapp :
                    (cambios.ws_active !== undefined ? cambios.ws_active : undefined)
            };

            // Limpiar undefined para no sobrescribir con nulos accidentalmente
            Object.keys(datosLimpios).forEach(key => {
                if (datosLimpios[key] === undefined) delete datosLimpios[key];
            });


            const { data, error } = await supabase
                .from('producto')
                .update(datosLimpios)
                .eq('id', id)
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error al actualizar producto:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },
    /**
     * Crea un nuevo registro (Tabla base: producto)
     * CORREGIDO: Mapeo de campos iniciales
     */
    async crear(datos) {
        try {
            const payload = {
                nombre: datos.nombre ? datos.nombre.trim() : 'Sin Nombre',
                descripcion: datos.descripcion || '',
                imagen_url: datos.portada || '',
                precio: parseFloat(datos.precio) || 0,
                stock: parseInt(datos.stock) || 0,
                visible: true,
                // Mapeo de nombres desde el componente
                mostrar_precio: datos.price_visible == 1 || datos.price_visible === true,
                habilitar_whatsapp: datos.ws_active == 1 || datos.ws_active === true
            };

            const { data, error } = await supabase
                .from('producto')
                .insert([payload])
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error al crear producto:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Víncula producto con categoría
     */
    async vincularCategoria(id_producto, id_categoria) {
        try {
            const { error } = await supabase
                .from('producto_categorias_rel')
                .insert([{ id_producto, id_categoria }]);

            if (error) throw error;
            return { exito: true };
        } catch (err) {
            console.error('Error al vincular categoría:', err.message);
            return { exito: false };
        }
    },

    /**
     * Actualización Masiva
     */
    async actualizarMasivo(campo, valor) {
        try {
            // Traducir campo si viene del componente
            let campoReal = campo;
            if (campo === 'ws_active') campoReal = 'habilitar_whatsapp';
            if (campo === 'price_visible') campoReal = 'mostrar_precio';

            const { data, error } = await supabase
                .from('producto')
                .update({ [campoReal]: valor })
                .eq('visible', true)
                .select();

            if (error) throw error;
            return { exito: true, total: data.length };
        } catch (err) {
            console.error(`Error en actualización masiva:`, err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Actualiza solo un grupo específico de IDs
     */
    async actualizarVarios(ids, datos) {
        try {
            const { data, error } = await supabase
                .from('producto')
                .update(datos)
                .in('id', ids);

            if (error) throw error;
            return { exito: true, data };
        } catch (err) {
            console.error("Error en actualizarVarios:", err.message);
            return { exito: false, mensaje: err.message };
        }
    },

    /**
     * Soft Delete
     */
    async eliminar(id) {
        try {
            const { data, error } = await supabase
                .from('producto')
                .update({ visible: false })
                .eq('id', id)
                .select();

            if (error) throw error;
            return { exito: true, data: data[0] };
        } catch (err) {
            console.error('Error en Soft Delete:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },
    async buscarPorNombre(termino) {
        try {
            const { data, error } = await supabase
                .from('producto')
                .select('id, nombre, imagen_url, precio, visible')
                .ilike('nombre', `%${termino}%`)
                .eq('visible', true)
                .limit(10);

            if (error) throw error;

            // NORMALIZACIÓN CORREGIDA:
            // Usamos los nombres reales de las columnas de tu tabla 'producto'
            return data.map(p => ({
                id: p.id,               // Antes decía p.producto_id (Error)
                nombre: p.nombre,       // Antes decía p.producto_nombre (Error)
                imagen: p.imagen_url,   // Correcto
                precio: p.precio        // ¡Faltaba incluir esto!
            }));
        } catch (err) {
            console.error('Error buscando productos:', err.message);
            return [];
        }
    }
};