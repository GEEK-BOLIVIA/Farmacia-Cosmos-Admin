/**
 * paletaColorController.js
 * Gestiona la lógica de negocio con alertas de confirmación SweetAlert2
 */
import { paletaColorModel } from '../models/paletaColorModel.js';
import { paletaColorView } from '../views/paletaColorView.js';

export const paletaColorController = {

    async inicializar() {
        const paletas = await paletaColorModel.obtenerTodas();
        // El modelo ya filtra las que tienen visible: true
        if (paletas) {
            paletaColorView.renderizarLista(paletas);
        }
    },

    async abrirFormularioCreacion() {
        try {
            const response = await fetch('../paleta_colores/create.html'); 
            if (!response.ok) throw new Error("No se pudo cargar create.html");
            const html = await response.text();

            paletaColorView.mostrarFormularioCreacion(html);

            const form = document.getElementById('formNuevaPaleta');
            if (form) {
                form.addEventListener('submit', (e) => this.handleCrearPaleta(e));
            }
        } catch (error) {
            console.error("Error al abrir formulario de creación:", error);
        }
    },

    async abrirFormularioEdicion(id) {
        try {
            const paletas = await paletaColorModel.obtenerTodas();
            const paleta = paletas.find(p => p.id === Number(id)); 
            
            if (!paleta) return console.error("Paleta no encontrada");

            const response = await fetch('../paleta_colores/edit.html');
            if (!response.ok) throw new Error("No se pudo cargar edit.html");
            const html = await response.text();

            paletaColorView.mostrarFormularioEdicion(html, paleta);

            const form = document.getElementById('formEditarPaleta');
            if (form) {
                form.addEventListener('submit', (e) => this.handleActualizarPaleta(e));
            }
        } catch (error) {
            console.error("Error al abrir formulario de edición:", error);
        }
    },

    /**
     * CONFIRMACIÓN: Crear nueva paleta
     */
    async handleCrearPaleta(event) {
        event.preventDefault();
        
        const result = await Swal.fire({
            title: '¿Guardar nueva paleta?',
            text: "Se añadirá esta configuración a tu lista de diseños.",
            icon: 'question',
            showCancelButton: true,
            confirmButtonColor: '#50B296',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Sí, guardar',
            cancelButtonText: 'Revisar'
        });

        if (result.isConfirmed) {
            const formData = new FormData(event.target);
            // Object.fromEntries tomará los "name" de tus inputs (ej: name="primary_color")
            const datosPaleta = Object.fromEntries(formData.entries());
            
            datosPaleta.es_activa = false;
            datosPaleta.visible = true; 

            const res = await paletaColorModel.crearPaleta(datosPaleta);
            if (res.exito) {
                paletaColorView.cerrarModal();
                Swal.fire({
                    icon: 'success',
                    title: '¡Creado!',
                    text: 'La paleta se guardó correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
                this.inicializar();
            } else {
                Swal.fire('Error', 'No se pudo guardar la paleta', 'error');
            }
        }
    },

    /**
     * CONFIRMACIÓN: Actualizar cambios
     */
    async handleActualizarPaleta(event) {
        event.preventDefault();

        const result = await Swal.fire({
            title: '¿Guardar cambios?',
            text: "Se actualizarán los colores de esta paleta.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#50B296',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Sí, actualizar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const formData = new FormData(event.target);
            const datos = Object.fromEntries(formData.entries());

            // IMPORTANTE: El ID viene del input hidden name="id"
            const res = await paletaColorModel.actualizarPaleta(datos.id, datos);
            
            if (res.exito) {
                paletaColorView.cerrarModal();
                Swal.fire({
                    icon: 'success',
                    title: '¡Actualizado!',
                    text: 'Los cambios se aplicaron correctamente.',
                    timer: 1500,
                    showConfirmButton: false
                });
                this.inicializar();
            } else {
                Swal.fire('Error', 'No se pudo actualizar la paleta.', 'error');
            }
        }
    },

    /**
     * CONFIRMACIÓN: Aplicar paleta a la tienda
     */
    async seleccionarPaleta(id) {
        const result = await Swal.fire({
            title: '¿Aplicar este diseño?',
            text: "Los colores de la tienda cambiarán visualmente para todos.",
            icon: 'info',
            showCancelButton: true,
            confirmButtonColor: '#50B296',
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Sí, aplicar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const res = await paletaColorModel.activarPaleta(id);
            if (res.exito) {
                Swal.fire({
                    title: '¡Diseño Aplicado!',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                this.inicializar();
            }
        }
    },

    /**
     * CONFIRMACIÓN: Eliminar paleta
     */
    async borrarPaleta(id) {
        const paletas = await paletaColorModel.obtenerTodas();
        const paletaADescartar = paletas.find(p => p.id === Number(id));

        if (paletaADescartar && paletaADescartar.es_activa) {
            return Swal.fire({
                title: 'Acción no permitida',
                text: 'No puedes eliminar la paleta que está activa actualmente.',
                icon: 'warning',
                confirmButtonColor: '#50B296'
            });
        }

        const result = await Swal.fire({
            title: '¿Eliminar paleta?',
            text: "Esta acción quitará la paleta de tu lista permanentemente.",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#EF4444', 
            cancelButtonColor: '#aaa',
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const res = await paletaColorModel.eliminarPaleta(id);
            
            if (res.exito) {
                await Swal.fire({
                    title: '¡Eliminado!',
                    text: 'La paleta ha sido eliminada correctamente.',
                    icon: 'success',
                    timer: 1500,
                    showConfirmButton: false
                });
                
                this.inicializar();
            } else {
                Swal.fire('Error', 'No se pudo procesar la eliminación.', 'error');
            }
        }
    },

    cerrarModal() {
        paletaColorView.cerrarModal();
    }
};

/** EXPOSICIÓN GLOBAL **/
window.abrirModalPaleta = () => paletaColorController.abrirFormularioCreacion();
window.cerrarModalPaleta = () => paletaColorController.cerrarModal();
window.handleActivarPaleta = (id) => paletaColorController.seleccionarPaleta(id);
window.handleEliminarPaleta = (id) => paletaColorController.borrarPaleta(id);
window.handleAbrirEditar = (id) => paletaColorController.abrirFormularioEdicion(id);