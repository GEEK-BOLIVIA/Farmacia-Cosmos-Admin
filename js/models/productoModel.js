import { supabase } from '../config/supabaseClient.js';

export const productoModel = {

    async listarActivos() {
        try {
            const { data, error } = await supabase
                .from('v_productos_detallados')
                .select('*')
                .eq('visible', true)
                .order('producto_id', { ascending: false });

            if (error) throw error;

            const mapaProductos = new Map();

            data.forEach(p => {
                if (!mapaProductos.has(p.producto_id)) {
                    mapaProductos.set(p.producto_id, {
                        ...p,
                        id: p.producto_id,
                        nombre: p.producto_nombre,
                        nombre_categoria: p.categoria_padre_nombre
                            ? `${p.categoria_padre_nombre} > ${p.categoria_nombre}`
                            : (p.categoria_nombre || 'Sin Categoría'),
                        // ✅ Arrays para acumular TODAS las categorías del producto
                        _todas_categorias: [],
                        _todos_padres: []
                    });
                }

                const prod = mapaProductos.get(p.producto_id);

                if (p.categoria_nombre && !prod._todas_categorias.includes(p.categoria_nombre)) {
                    prod._todas_categorias.push(p.categoria_nombre);
                }
                if (p.categoria_padre_nombre && !prod._todos_padres.includes(p.categoria_padre_nombre)) {
                    prod._todos_padres.push(p.categoria_padre_nombre);
                }
            });

            const ids = Array.from(mapaProductos.keys());
            if (ids.length > 0) {
                const { data: codRows, error: errCod } = await supabase
                    .from('producto')
                    .select('id, codigo')
                    .in('id', ids);
                if (!errCod && codRows?.length) {
                    const porId = new Map(codRows.map(r => [r.id, r.codigo]));
                    ids.forEach(id => {
                        const prod = mapaProductos.get(id);
                        if (prod) prod.codigo = porId.get(id) ?? prod.codigo ?? prod.producto_codigo ?? '';
                    });
                }
            }

            return Array.from(mapaProductos.values());

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
            const [{ data, error }, { data: filaBase }] = await Promise.all([
                supabase
                    .from('v_productos_detallados')
                    .select('*')
                    .eq('producto_id', id)
                    .limit(1),
                supabase
                    .from('producto')
                    .select('codigo')
                    .eq('id', id)
                    .maybeSingle()
            ]);

            if (error) throw error;

            if (!data || data.length === 0) return null;

            const producto = data[0];
            const codigo = filaBase?.codigo ?? producto.codigo ?? producto.producto_codigo ?? '';
            return { ...producto, id: producto.producto_id, codigo };
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
                codigo: cambios.codigo !== undefined && cambios.codigo !== null
                    ? String(cambios.codigo).trim() || null
                    : undefined,

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
            const codigo = datos.codigo != null ? String(datos.codigo).trim() : '';
            const payload = {
                nombre: datos.nombre ? datos.nombre.trim() : 'Sin Nombre',
                descripcion: datos.descripcion || '',
                imagen_url: datos.portada || '',
                precio: parseFloat(datos.precio) || 0,
                stock: parseInt(datos.stock) || 0,
                visible: true,
                codigo: codigo || null,
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