import { supabase } from '../config/supabaseClient.js';
import { carruselModel } from '../models/carruselModel.js';
import { carruselController_View } from '../views/carruselView.js';
import { RegisterCarrusel } from '../modules/carrusel/registerCarrusel.js';
import { productoModel } from '../models/productoModel.js';
import { categoriasModel } from '../models/categoriasModel.js';
import { carruselState } from '../modules/carrusel/carruselState.js';

/**
 * Carrusel Controller - Nexus Admin Suite
 */
export const carruselController = {

    // ==========================================
    // NAVEGACIÓN Y FLUJO
    // ==========================================

    async inicializar() {
        await carruselController_View.render();
    },

    async abrirEditor(id = null) {
        if (id) {
            // 1. Obtenemos la configuración del carrusel (Cabecera)
            const lista = await this.cargarCarruseles();
            const config = lista.find(c => c.id == id);

            // 2. CORRECCIÓN: Usar el método del MODELO que trae las relaciones (producto/categoria)
            // No uses 'cargarContenidoCarrusel' si esa función no hace el JOIN completo.
            const items = await carruselModel.obtenerItems(id);

            const datosCargar = {
                id: id,
                ...config,
                items: items // Ahora 'items' sí contiene el objeto 'producto' con su 'imagen_url'
            };

            console.log("DATOS ENVIADOS AL STATE:", datosCargar); // Verifica que aquí aparezca 'producto'
            await RegisterCarrusel.init('content-area', datosCargar);
        }
    },
    // ==========================================
    // GESTIÓN DE CONFIGURACIÓN Y ORDEN
    // ==========================================

    async obtenerSiguienteOrden(slug) {
        try {
            const proximoOrden = await carruselModel.obtenerSiguienteOrden(slug);
            return proximoOrden;
        } catch (error) {
            console.error("Error al obtener siguiente orden:", error);
            return 0;
        }
    },

    async cargarCarruseles() {
        try {
            return await carruselModel.listar();
        } catch (error) {
            console.error("Error al obtener carruseles:", error);
            return [];
        }
    },
    async cargarItemsPorCarrusel(id) {
        try {
            // Usamos obtenerItems porque este ya trae producto:producto_id(...) y categoria:categoria_id(...)
            const dataRaw = await carruselModel.obtenerItems(id);

            // Mapeamos para que el template reciba propiedades estandarizadas
            return dataRaw.map(item => ({
                titulo: item.titulo_manual || item.producto?.nombre || item.categoria?.nombre || 'Sin título',
                subtitulo: item.subtitulo_manual || (item.producto?.precio ? `$ ${item.producto.precio}` : ''),
                // Prioridad de imagen: manual -> producto -> categoría
                imagen: item.imagen_url_manual || item.producto?.imagen_url || item.categoria?.imagen || 'fa-solid fa-image',
                tipo: item.producto_id ? 'producto' : (item.categoria_id ? 'categoria' : 'banner')
            }));
        } catch (error) {
            console.error("Error en cargarItemsPorCarrusel:", error);
            return [];
        }
    },

    async guardarConfiguracion(datos, id = null) {
        try {
            let carruselId = id;

            // 1. Guardar o Actualizar la CABECERA (Se mantiene igual)
            if (id) {
                const res = await carruselModel.actualizar(id, datos);
                if (!res.exito) throw new Error(res.mensaje);
            } else {
                const res = await carruselModel.crear(datos);
                if (res.exito && res.data) {
                    carruselId = res.data.id;
                } else {
                    throw new Error(res.mensaje || "Error al crear registro");
                }
            }

            // 2. GESTIÓN DE ÍTEMS
            // Detectamos si el array está directo o anidado en .items
            const itemsParaGuardar = carruselState.items.items || carruselState.items;

            if (carruselId) {
                // A. Limpiamos lo que había antes
                await carruselModel.limpiarItemsCarrusel(carruselId);

                // B. Insertamos los ítems actuales
                for (let i = 0; i < itemsParaGuardar.length; i++) {
                    const item = itemsParaGuardar[i];

                    // Mapeo de seguridad: Buscamos el icono/imagen en todas las propiedades posibles
                    const valorMedia = item.imagen_url_manual || item.imagen_preview || item.icono_manual || null;

                    await carruselModel.agregarItem({
                        carrusel_id: carruselId,
                        orden: i,
                        titulo_manual: item.titulo_manual || item.titulo || null,
                        subtitulo_manual: item.subtitulo_manual || item.subtitulo || null,
                        // Aquí enviamos el fa-icon o la URL a la columna de la DB
                        imagen_url_manual: valorMedia,
                        link_destino_manual: item.link || item.link_destino_manual || null,
                        producto_id: item.producto_id || null,
                        categoria_id: item.categoria_id || null
                    });
                }
            }

            return { exito: true, id: carruselId };

        } catch (error) {
            console.error("Error en guardarConfiguracion Completo:", error.message);
            return { exito: false, mensaje: error.message };
        }
    },

    // Dentro de carruselController.js
    async borrarCarruselCompleto(id) {
        try {
            // 1. Obtenemos la lista actualizada para encontrar el nombre real
            const carruseles = await carruselModel.listar();

            // Buscamos el objeto que coincida con el ID
            const carruselEncontrado = carruseles.find(c => String(c.id) === String(id));

            // Si lo encuentra usa el nombre, si no, usa el respaldo
            const nombreParaMostrar = carruselEncontrado ? carruselEncontrado.nombre : 'este registro';

            // 2. Llamamos a la confirmación de la Vista pasando el nombre real
            const confirmado = await carruselController_View.confirmarEliminacion(nombreParaMostrar);

            if (confirmado) {
                Swal.fire({
                    title: 'Eliminando...',
                    didOpen: () => Swal.showLoading(),
                    background: 'transparent'
                });

                const resultado = await carruselModel.eliminar(id);

                if (resultado.exito) {
                    carruselController_View.notificarExito(`"${nombreParaMostrar}" eliminado correctamente`);
                    carruselController_View.render(); // Recarga la tabla
                } else {
                    carruselController_View.notificarError("Error: " + resultado.mensaje);
                }
            }
        } catch (error) {
            console.error("Error en el proceso de borrado:", error);
            carruselController_View.notificarError("Ocurrió un error inesperado.");
        }
    },

    // ==========================================
    // GESTIÓN DE ÍTEMS Y BÚSQUEDA
    // ==========================================

    /**
     * Búsqueda de ítems relacionados.
     * CORRECCIÓN: Se usa el Model directamente para evitar errores de scope de Supabase.
     */
    async buscarItemsRelacionados(tipo, termino) {
        try {
            if (!termino || termino.length < 2) return [];

            if (tipo === 'productos') {
                // LLAMADA AL MODELO (Él ya tiene la lógica de supabase y el slug)
                const productos = await productoModel.buscarPorNombre(termino);

                return productos.map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    imagen: p.imagen_url || p.imagen,
                    // Forzamos la lectura de p.precio
                    precio: parseFloat(p.precio) || 0,
                    // Aseguramos el link basado en el slug que viene del model
                    link: ''
                }));
            }

            if (tipo === 'categorias') {
                const categorias = await categoriasModel.buscarPorNombre(termino);
                return categorias.map(c => ({
                    id: c.id,
                    nombre: c.nombre,
                    imagen: 'fa-solid fa-layer-group',
                    precio: 0,
                    link: ''
                }));
            }
        } catch (error) {
            console.error("Error en carruselController.buscarItemsRelacionados:", error);
            return [];
        }
        return [];
    },

    async cargarContenidoCarrusel(carruselId) {
        try {
            const items = await carruselModel.obtenerItems(carruselId);
            return items.map(item => {
                // Lógica para determinar el subtítulo (precio si es producto)
                let subtitulo = item.subtitulo_manual;

                // Si es un producto y no tiene subtítulo manual, intentamos sacar el precio del objeto producto
                if (item.producto_id && !subtitulo && item.producto?.precio) {
                    subtitulo = `$ ${item.producto.precio}`;
                }

                return {
                    id: item.id,
                    tipo_label: item.producto_id ? 'Producto' : (item.categoria_id ? 'Categoría' : 'Banner'),
                    nombre_label: item.producto?.nombre || item.categoria?.nombre || item.titulo_manual || 'Sin Título',
                    preview_img: item.producto?.imagen_url || item.categoria?.imagen || item.imagen_url_manual,
                    link_destino_manual: item.link_destino_manual,
                    producto_id: item.producto_id,
                    categoria_id: item.categoria_id,
                    titulo_manual: item.titulo_manual || item.producto?.nombre,
                    subtitulo_manual: subtitulo, // <--- IMPORTANTE
                    orden: item.orden
                };
            });
        } catch (error) {
            console.error("Error cargando ítems:", error);
            return [];
        }
    },
    async limpiarItemsCarrusel(carruselId) {
        try {
            // Llama al modelo para ejecutar un DELETE FROM carrusel_items WHERE carrusel_id = id
            const res = await carruselModel.eliminarItemsPorCarrusel(carruselId);
            if (!res.exito) throw new Error(res.mensaje);
            return true;
        } catch (error) {
            console.error("Error limpiando items:", error);
            throw error;
        }
    },


    async vincularItemSinRefrescar(dataItem) {
        // Mapeamos los campos del frontend a los nombres de columna de la DB
        const payloadDB = {
            carrusel_id: dataItem.carrusel_id,
            orden: dataItem.orden,
            titulo_manual: dataItem.titulo_manual,
            subtitulo_manual: dataItem.subtitulo_manual,
            // Prioridad: Si viene icono_manual lo usamos, si no, lo extraemos de imagen_preview si es fa-
            icono_manual: dataItem.icono_manual || (dataItem.imagen_preview?.startsWith('fa-') ? dataItem.imagen_preview : null),
            imagen_url_manual: dataItem.imagen_url_manual || (!dataItem.imagen_preview?.startsWith('fa-') ? dataItem.imagen_preview : null),
            link_destino_manual: dataItem.link_destino_manual,
            producto_id: dataItem.producto_id || null,
            categoria_id: dataItem.categoria_id || null,
            activo: true
        };

        console.log("📤 Controller enviando al Model:", payloadDB);
        return await carruselModel.agregarItem(payloadDB);
    }
};

// Exponer globalmente para que las acciones del DOM puedan invocarlo
window.carruselController = carruselController;