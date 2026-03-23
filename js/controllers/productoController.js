import { productoModel } from '../models/productoModel.js';
import { productoView } from '../views/productoView.js';
import { categoriasModel } from '../models/categoriasModel.js';
import { productoCategoriaModel } from '../models/productoCategoriaModel.js';
import { galeriaProductoModel } from '../models/galeriaProductoModel.js';
import { productManager } from '../modals/createProduct.js';
import { supabase } from '../config/supabaseClient.js';
import { detallesProductoView } from '../views/detallesProductoView.js';
import { deleteProductoView } from '../views/deleteProductoView.js';

export const productoController = {

    async _uploadToSupabase(file, folder, nombreProducto = 'producto') {
        const slug = nombreProducto.toLowerCase().trim().replace(/ /g, '-').replace(/[^\w-]+/g, '');
        const fileExt = file.name.split('.').pop();
        const fileName = `${slug}_${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
        const filePath = `${folder}/${fileName}`;
        const { error } = await supabase.storage.from('Almacenamiento').upload(filePath, file);
        if (error) throw new Error("Error al subir archivo: " + error.message);
        const { data: publicUrl } = supabase.storage.from('Almacenamiento').getPublicUrl(filePath);
        return publicUrl.publicUrl;
    },

    async _procesarGaleria(galeriaRaw, nombreProducto) {
        if (!galeriaRaw || !Array.isArray(galeriaRaw) || galeriaRaw.length === 0) return [];
        const resultados = await Promise.all(
            galeriaRaw.map(async (item, index) => {
                const ordenFinal = (item.orden !== undefined && item.orden !== '') ? parseInt(item.orden) : index + 1;
                try {
                    if (item.file instanceof File) {
                        const url = await this._uploadToSupabase(item.file, 'galeria', nombreProducto);
                        return { url, tipo: item.file.type.startsWith('video') ? 'video' : 'imagen', orden: ordenFinal, nombre: item.nombre || item.file.name };
                    }
                    if (typeof item.url === 'string' && item.url.startsWith('http')) {
                        return { url: item.url, tipo: item.tipo || 'imagen', orden: ordenFinal, nombre: item.nombre || 'Archivo guardado' };
                    }
                    return null;
                } catch (err) {
                    console.error(`Error galería [${index}]:`, err.message);
                    return null;
                }
            })
        );
        return resultados.filter(r => r !== null).sort((a, b) => a.orden - b.orden);
    },

    // ✅ Refresco silencioso en background - no bloquea UI, no muestra loading
    async _refrescoSilencioso() {
        try {
            const [productos, categorias] = await Promise.all([
                productoModel.listarActivos(),
                categoriasModel.obtenerTodas()
            ]);
            this._todasLasCategorias = categorias;
            window.productosRaw = productos;
            productoView.render(productos, categorias);
        } catch (err) {
            console.error('Error en refresco silencioso:', err);
        }
    },

    // Helper para marcar pasos del modal de progreso
    _setStep(n, ok = true) {
        const el = document.getElementById(`swal-step-${n}`);
        if (el) {
            el.innerText = ok ? 'check_circle' : 'error';
            el.className = `material-symbols-outlined text-lg ${ok ? 'text-emerald-500' : 'text-red-500'}`;
        }
    },

    // Helper para mostrar modal de progreso con pasos
    _mostrarProgreso(pasos = []) {
        Swal.fire({
            title: '<span class="text-slate-800 font-black uppercase text-sm">Procesando...</span>',
            html: `<div class="space-y-3 py-2">${pasos.map((label, i) => `
                <div class="flex items-center gap-3 text-sm text-slate-600">
                    <span id="swal-step-${i + 1}" class="material-symbols-outlined text-slate-300 text-lg">radio_button_unchecked</span>
                    ${label}
                </div>`).join('')}</div>`,
            showConfirmButton: false,
            allowOutsideClick: false,
            customClass: { popup: 'rounded-[32px] shadow-2xl' }
        });
    },

    async inicializar() {
        window.resetearSidebarActivo?.();
        productoView._estado.seleccionados = [];
        productoView.mostrarCargando?.('Sincronizando inventario...');
        try {
            await this.refrescarVista();
            Swal.close();
        } catch (error) {
            console.error(error);
            productoView.notificarError?.('No se pudo cargar el catálogo.');
        }
    },

    async verDetalle(id) {
        try {
            productoView.mostrarCargando?.('Obteniendo información...');
            const [producto, idsCategorias, galeria, todasLasCategorias] = await Promise.all([
                productoModel.obtenerPorId(id),
                productoCategoriaModel.obtenerCategoriasPorProducto(id),
                galeriaProductoModel.getByProducto(id),
                categoriasModel.obtenerTodas()
            ]);
            if (!producto) throw new Error('No se encontró el producto.');
            const categoriasEnriquecidas = idsCategorias.map(idVinculado => {
                const catInfo = todasLasCategorias.find(c => c.id === idVinculado);
                return catInfo ? catInfo : { id: idVinculado, nombre: 'Categoría ' + idVinculado };
            });
            const productoNormalizado = {
                ...producto,
                nombre: producto.nombre || producto.producto_nombre || 'Sin nombre',
                mostrar_precio: producto.mostrar_precio ?? producto.price_visible ?? false,
                habilitar_whatsapp: producto.habilitar_whatsapp ?? producto.ws_active ?? false
            };
            Swal.close();
            const contenedor = document.getElementById('content-area');
            contenedor.innerHTML = detallesProductoView.render(
                { producto: productoNormalizado, categorias: categoriasEnriquecidas, subcategorias: [], galeria: galeria || [] },
                (p) => this.mostrarFormularioEditar(p.id),
                () => this.refrescarVista()
            );
            detallesProductoView.initEventListeners(
                productoNormalizado,
                (p) => this.mostrarFormularioEditar(p.id),
                () => this.refrescarVista()
            );
        } catch (error) {
            console.error("Error al mostrar detalle:", error);
            productoView.notificarError?.('No se pudo cargar la ficha del producto.');
        }
    },

    async refrescarVista() {
        try {
            const [productos, categorias] = await Promise.all([
                productoModel.listarActivos(),
                categoriasModel.obtenerTodas()
            ]);
            this._todasLasCategorias = categorias;
            window.productosRaw = productos;
            window.productManager = productManager;
            productoView.render(productos, categorias);
        } catch (error) {
            console.error("Error en refrescarVista:", error);
            productoView.notificarError?.('Error al refrescar los datos.');
        }
    },

    async toggleEstado(id, campo, nuevoEstado) {
        productoView.mostrarCargando?.('Actualizando...');
        try {
            const resultado = await productoModel.actualizar(id, { [campo]: nuevoEstado });
            if (resultado.exito) {
                Swal.close();
                productoView.notificarExito?.('Estado actualizado.');
                this._refrescoSilencioso(); // background
            } else {
                throw new Error(resultado.mensaje);
            }
        } catch (error) {
            productoView.notificarError?.(error.message || 'Error al cambiar el estado.');
            this._refrescoSilencioso();
        }
    },

    async toggleMasivoFiltrado(campo, nuevoEstado, ids) {
        if (!ids || ids.length === 0) return;
        productoView.mostrarCargando?.(`Actualizando ${ids.length} productos...`);
        try {
            const resultados = await Promise.all(ids.map(id => productoModel.actualizar(id, { [campo]: nuevoEstado })));
            const errores = resultados.filter(r => !r.exito);
            Swal.close();
            if (errores.length === 0) {
                productoView.notificarExito?.(`${ids.length} productos actualizados.`);
                this._refrescoSilencioso();
            } else {
                throw new Error(`Problemas con ${errores.length} productos.`);
            }
        } catch (error) {
            productoView.notificarError?.('No se pudo completar la actualización masiva.');
            this._refrescoSilencioso();
        }
    },

    /**
     * CREACIÓN
     * ✅ Progreso visible por pasos + refresco en background al finalizar
     */
    async mostrarFormularioCrear() {
        try {
            productoView._estado.seleccionados = [];
            productoView.limpiarSeleccion?.();
            Swal.fire({
                title: '<span class="text-slate-800 font-black uppercase text-sm">Preparando formulario...</span>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'rounded-[32px] shadow-xl' }
            });

            const [, categoriasHijas] = await Promise.all([
                categoriasModel.obtenerTodas(),
                categoriasModel.obtenerHijas()
            ]);

            Swal.close();

            const datosForm = await productManager.start('content-area', categoriasHijas);
            if (!datosForm) return;

            this._mostrarProgreso(['Subiendo imágenes', 'Creando producto', 'Vinculando categorías']);

            // PASO 1: Portada + galería en paralelo
            const [portadaUrl, itemsMultimedia] = await Promise.all([
                datosForm.portada instanceof File
                    ? this._uploadToSupabase(datosForm.portada, 'portadas', datosForm.nombre)
                    : Promise.resolve(typeof datosForm.portada === 'string' && datosForm.portada ? datosForm.portada : 'https://via.placeholder.com/400'),
                this._procesarGaleria(datosForm.galeria, datosForm.nombre)
            ]);
            this._setStep(1);

            // PASO 2: Crear producto
            const resultado = await productoModel.crear({ ...datosForm, portada: portadaUrl });
            if (!resultado.exito) { this._setStep(2, false); productoView.notificarError?.(resultado.mensaje); return; }
            this._setStep(2);

            // PASO 3: Categorías + galería en paralelo
            const nuevoId = resultado.data.id;
            const listaCategorias = datosForm.categoriasIds || [];
            const tareas = [];
            if (listaCategorias.length > 0) tareas.push(productoCategoriaModel.vincularMultiple(nuevoId, listaCategorias));
            if (itemsMultimedia.length > 0) tareas.push(galeriaProductoModel.createLote(nuevoId, itemsMultimedia));
            await Promise.all(tareas);
            this._setStep(3);

            // ✅ Notificar inmediatamente, refresco en segundo plano
            await new Promise(r => setTimeout(r, 350));
            Swal.close();
            productoView.notificarExito?.('¡Producto registrado!');
            this._refrescoSilencioso();

        } catch (error) {
            console.error(error);
            Swal.close();
            productoView.notificarError?.('Error al procesar la creación.');
        }
    },

    /**
     * EDICIÓN
     * ✅ Mismo patrón: pasos visibles + refresco en background
     */
    async mostrarFormularioEditar(id) {
        try {
            productoView._estado.seleccionados = [];
            productoView.limpiarSeleccion?.();
            Swal.fire({
                title: '<span class="text-slate-800 font-black uppercase text-sm">Cargando producto...</span>',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading(),
                customClass: { popup: 'rounded-[32px] shadow-xl' }
            });

            const [producto, categoriasHijas, categoriasVinculadas, galeriaActual] = await Promise.all([
                productoModel.obtenerPorId(id),
                categoriasModel.obtenerHijas(),
                productoCategoriaModel.obtenerCategoriasPorProducto(id),
                galeriaProductoModel.getByProducto(id)
            ]);

            Swal.close();

            if (!producto) throw new Error('Producto no encontrado');

            const productoParaEdicion = {
                id: producto.id,
                nombre: producto.producto_nombre || producto.nombre || '',
                precio: producto.precio || 0,
                stock: producto.stock || 0,
                descripcion: producto.descripcion || '',
                ws_active: producto.habilitar_whatsapp === true,
                price_visible: producto.mostrar_precio === true,
                portada: producto.imagen_url || '',
                categoriasIds: categoriasVinculadas || [],
                galeria: galeriaActual || []
            };

            const datosEditados = await productManager.start('content-area', categoriasHijas, productoParaEdicion);
            if (!datosEditados) return;

            this._mostrarProgreso(['Procesando archivos', 'Actualizando datos', 'Sincronizando galería']);

            // PASO 1: Portada + galería en paralelo
            const archivoPortada = datosEditados.portada?.data || datosEditados.portada;
            const [portadaFinal, nuevaGaleria] = await Promise.all([
                archivoPortada instanceof File
                    ? this._uploadToSupabase(archivoPortada, 'portadas', datosEditados.nombre)
                    : Promise.resolve(typeof datosEditados.portada === 'string' ? datosEditados.portada : producto.imagen_url),
                this._procesarGaleria(datosEditados.galeria, datosEditados.nombre)
            ]);
            this._setStep(1);

            // PASO 2: Actualizar producto
            const res = await productoModel.actualizar(id, {
                nombre: datosEditados.nombre.trim(),
                precio: parseFloat(datosEditados.precio),
                stock: parseInt(datosEditados.stock),
                descripcion: datosEditados.descripcion.trim(),
                ws_active: datosEditados.ws_active,
                price_visible: datosEditados.price_visible,
                portada: portadaFinal
            });
            if (!res.exito) { this._setStep(2, false); throw new Error(res.mensaje); }
            this._setStep(2);

            // PASO 3: Limpiar + re-vincular en paralelo, luego crear lote galería
            await Promise.all([
                productoCategoriaModel.actualizarRelaciones(id, datosEditados.categoriasIds),
                galeriaProductoModel.limpiarGaleria(id)
            ]);
            if (nuevaGaleria.length > 0) await galeriaProductoModel.createLote(id, nuevaGaleria);
            this._setStep(3);

            // ✅ Notificar inmediatamente, refresco en segundo plano
            await new Promise(r => setTimeout(r, 350));
            Swal.close();
            productoView.notificarExito?.('¡Producto actualizado!');
            this._refrescoSilencioso();

        } catch (error) {
            console.error("Error en edición:", error);
            Swal.close();
            productoView.notificarError?.('No se pudieron guardar los cambios: ' + error.message);
        }
    },

    async eliminar(id) {
        try {
            productoView.mostrarCargando?.('Cargando...');
            const [producto, idsCategorias, todasLasCategorias] = await Promise.all([
                productoModel.obtenerPorId(id),
                productoCategoriaModel.obtenerCategoriasPorProducto(id),
                categoriasModel.obtenerTodas()
            ]);
            if (!producto) throw new Error('No se encontró el producto.');
            const categoriasEnriquecidas = idsCategorias.map(idVinculado => {
                const catInfo = todasLasCategorias.find(c => c.id === idVinculado);
                return catInfo ? catInfo : { nombre: 'Categoría ' + idVinculado };
            });
            Swal.close();
            const contenedor = document.getElementById('content-area');
            contenedor.innerHTML = deleteProductoView.render({ producto, categorias: categoriasEnriquecidas });
            deleteProductoView.initEventListeners(
                async () => {
                    try {
                        productoView.mostrarCargando?.('Eliminando...');
                        const resultado = await productoModel.eliminar(id);
                        if (resultado.exito) {
                            Swal.close();
                            productoView.notificarExito?.('Producto eliminado.');
                            this._refrescoSilencioso();
                        } else {
                            throw new Error(resultado.mensaje);
                        }
                    } catch (err) {
                        productoView.notificarError?.(err.message || 'Error al eliminar.');
                    }
                },
                () => this.refrescarVista()
            );
        } catch (error) {
            console.error("Error al preparar eliminación:", error);
            productoView.notificarError?.('No se pudo cargar la confirmación.');
        }
    },
    async eliminarLote(ids) {
        try {
            await Promise.all(ids.map(id => productoModel.eliminar(id)));
            return { exito: true };
        } catch (err) {
            console.error('Error en eliminarLote:', err.message);
            return { exito: false, mensaje: err.message };
        }
    }
};

window.productoController = productoController;