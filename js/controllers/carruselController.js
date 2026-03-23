import { supabase } from '../config/supabaseClient.js';
import { carruselModel } from '../models/carruselModel.js';
import { carruselController_View } from '../views/carruselView.js';
import { RegisterCarrusel } from '../modules/carrusel/registerCarrusel.js';
import { productoModel } from '../models/productoModel.js';
import { categoriasModel } from '../models/categoriasModel.js';
import { carruselState } from '../modules/carrusel/carruselState.js';

export const carruselController = {

    async inicializar() {
        window.resetearSidebarActivo?.();
        if (window.carruselController_View) {
            window.carruselController_View._estado.seleccionados = [];
            window.carruselController_View.limpiarSeleccion?.();
        }
        await carruselController_View.render();
    },

    async abrirEditor(id = null) {
        // ✅ Limpiar selección siempre al entrar al editor
        if (window.carruselController_View) {
            window.carruselController_View._estado.seleccionados = [];
            window.carruselController_View.limpiarSeleccion?.();
        }

        if (!id) {
            await RegisterCarrusel.init('content-area');
            return;
        }

        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Cargando editor...</span>',
            allowOutsideClick: false,
            showConfirmButton: false,
            didOpen: () => Swal.showLoading(),
            customClass: { popup: 'rounded-[32px] border-none shadow-xl' }
        });

        try {
            const [configResult, items] = await Promise.all([
                supabase.from('carruseles').select('*').eq('id', id).single(),
                carruselModel.obtenerItems(id)
            ]);

            if (configResult.error) throw configResult.error;

            const datosCargar = { id, ...configResult.data, items };

            Swal.close();
            await RegisterCarrusel.init('content-area', datosCargar);

        } catch (err) {
            console.error('Error al abrir editor:', err);
            Swal.close();
            carruselController_View.notificarError('No se pudo cargar el editor: ' + (err.message || err));
        }
    },

    // ==========================================
    // GESTIÓN DE CONFIGURACIÓN Y ORDEN
    // ==========================================

    async obtenerSiguienteOrden(slug) {
        try {
            return await carruselModel.obtenerSiguienteOrden(slug);
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
            const dataRaw = await carruselModel.obtenerItems(id);
            return dataRaw.map(item => ({
                titulo: item.titulo_manual || item.producto?.nombre || item.categoria?.nombre || '',
                subtitulo: item.subtitulo_manual || (item.producto?.precio ? `Bs. ${item.producto.precio}` : ''),
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

            // ✅ guardarConfiguracion SOLO maneja la cabecera (tabla carruseles)
            // Los ítems los maneja enviarAlServidor en carruselActions DESPUÉS de subir
            // archivos al bucket — así nunca llega un base64 a la DB
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

            return { exito: true, id: carruselId };

        } catch (error) {
            console.error("Error en guardarConfiguracion:", error.message);
            return { exito: false, mensaje: error.message };
        }
    },

    async borrarCarruselCompleto(id) {
        try {
            const carruseles = await carruselModel.listar();
            const encontrado = carruseles.find(c => String(c.id) === String(id));
            const nombreParaMostrar = encontrado ? encontrado.nombre : 'este registro';

            const confirmado = await carruselController_View.confirmarEliminacion(nombreParaMostrar);

            if (confirmado) {
                Swal.fire({ title: 'Eliminando...', didOpen: () => Swal.showLoading(), background: 'transparent' });

                const resultado = await carruselModel.eliminar(id);

                if (resultado.exito) {
                    carruselController_View.notificarExito(`"${nombreParaMostrar}" eliminado correctamente`);
                    carruselController_View.render();
                } else {
                    carruselController_View.notificarError("Error: " + resultado.mensaje);
                }
            }
        } catch (error) {
            console.error("Error en borrado:", error);
            carruselController_View.notificarError("Ocurrió un error inesperado.");
        }
    },

    // ==========================================
    // GESTIÓN DE ÍTEMS Y BÚSQUEDA
    // ==========================================

    async buscarItemsRelacionados(tipo, termino) {
        try {
            if (!termino || termino.length < 2) return [];

            if (tipo === 'productos') {
                const productos = await productoModel.buscarPorNombre(termino);
                return productos.map(p => ({
                    id: p.id,
                    nombre: p.nombre,
                    imagen: p.imagen_url || p.imagen,
                    precio: parseFloat(p.precio) || 0,
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
            console.error("Error en buscarItemsRelacionados:", error);
            return [];
        }
        return [];
    },

    async cargarContenidoCarrusel(carruselId) {
        try {
            const items = await carruselModel.obtenerItems(carruselId);
            return items.map(item => {
                let subtitulo = item.subtitulo_manual;
                if (item.producto_id && !subtitulo && item.producto?.precio) {
                    subtitulo = `$ ${item.producto.precio}`;
                }
                return {
                    id: item.id,
                    tipo_label: item.producto_id ? 'Producto' : (item.categoria_id ? 'Categoría' : 'Banner'),
                    nombre_label: item.producto?.nombre || item.categoria?.nombre || item.titulo_manual || '',
                    preview_img: item.producto?.imagen_url || item.categoria?.imagen || item.imagen_url_manual,
                    link_destino_manual: item.link_destino_manual,
                    producto_id: item.producto_id,
                    categoria_id: item.categoria_id,
                    titulo_manual: item.titulo_manual || null,
                    subtitulo_manual: subtitulo || null,
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
            const res = await carruselModel.eliminarItemsPorCarrusel(carruselId);
            if (!res.exito) throw new Error(res.mensaje);
            return true;
        } catch (error) {
            console.error("Error limpiando items:", error);
            throw error;
        }
    },

    async vincularItemSinRefrescar(dataItem) {
        const payloadDB = {
            carrusel_id: dataItem.carrusel_id,
            orden: dataItem.orden,
            icono_manual: dataItem.icono_manual || (dataItem.imagen_preview?.startsWith('fa-') ? dataItem.imagen_preview : null),
            imagen_url_manual: dataItem.imagen_url_manual || (!dataItem.imagen_preview?.startsWith('fa-') ? dataItem.imagen_preview : null),
            titulo_manual: dataItem.titulo_manual !== '' ? dataItem.titulo_manual : null,
            subtitulo_manual: dataItem.subtitulo_manual !== '' ? dataItem.subtitulo_manual : null,
            link_destino_manual: dataItem.link_destino_manual || null,
            producto_id: dataItem.producto_id || null,
            categoria_id: dataItem.categoria_id || null,
            activo: true
        };

        return await carruselModel.agregarItem(payloadDB);
    },
    async eliminarLote(ids) {
        try {
            await Promise.all(ids.map(id => carruselModel.eliminar(id)));
            return { exito: true };
        } catch (err) {
            console.error('Error en eliminarLote:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },
};

window.carruselController = carruselController;
window.RegisterCarrusel = RegisterCarrusel;