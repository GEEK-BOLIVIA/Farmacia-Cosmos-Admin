// js/controllers/configuracionFrontendController.js

import { configuracionFrontendModel } from '../models/configuracionFrontendModel.js';
import { configuracionFrontendView } from '../views/configuracionFrontendView.js';
import { supabase } from '../config/supabaseClient.js';

export const configuracionFrontendController = {
    ajustesCache: [], // Para filtrar sin recargar de Supabase

    async inicializarIndex() {
        let ajustes = await configuracionFrontendModel.obtenerTodas();
        
        if (ajustes) {
            // Filtramos para no duplicar gestión de colores si se hace en otra vista
            ajustes = ajustes.filter(a => !a.clave.startsWith('color_'));
            
            // Guardamos en la memoria del controlador para el buscador
            this.ajustesCache = ajustes;
            
            // Render inicial
            this.refrescarInterfaz(this.ajustesCache);
            
            // ACTIVAR BUSCADOR
            this.configurarBuscador();
        }
    },

    configurarBuscador() {
        const inputBusqueda = document.getElementById('searchConfig');
        // Seleccionamos la sección de paletas buscando el ID del contenedor interno o la sección
        const seccionPaletas = document.querySelector('section:has(#paletasContainer)');
        
        if (!inputBusqueda) return;

        inputBusqueda.addEventListener('input', (e) => {
            const termino = e.target.value.toLowerCase().trim();

            // 1. MANEJO DE LA SECCIÓN DE PALETAS
            if (seccionPaletas) {
                const terminosColor = ['color', 'paleta', 'tema', 'diseño', 'visual', 'style'];
                const usuarioBuscaColores = terminosColor.some(t => t.includes(termino));

                // Si el buscador está vacío o el término se refiere a colores, mostrar. 
                // De lo contrario, ocultar.
                if (termino === '' || usuarioBuscaColores) {
                    seccionPaletas.classList.remove('hidden');
                } else {
                    seccionPaletas.classList.add('hidden');
                }
            }

            // 2. FILTRADO DE PARÁMETROS GENERALES
            if (termino === '') {
                this.refrescarInterfaz(this.ajustesCache);
                return;
            }

            const filtrados = this.ajustesCache.filter(ajuste => {
                const nombreLimpio = ajuste.clave.replace(/_/g, ' ').toLowerCase();
                const categoriaLimpia = (ajuste.categoria || '').toLowerCase();
                return nombreLimpio.includes(termino) || categoriaLimpia.includes(termino);
            });

            this.refrescarInterfaz(filtrados);
        });
    },

    refrescarInterfaz(datos) {
        configuracionFrontendView.renderizarLista(datos);
        this.actualizarContadores(datos.length);
    },

    actualizarContadores(total) {
        configuracionFrontendView.setTotalAjustes(total);
    }
};

/**
 * =========================================================================
 * FUNCIONES GLOBALES (Window)
 * =========================================================================
 */

window.solicitarArchivoImagen = async (clave) => {
    const { value: file } = await Swal.fire({
        title: 'Seleccionar Imagen',
        text: `Elige el nuevo archivo para ${clave.replace(/_/g, ' ')}`,
        input: 'file',
        inputAttributes: { 'accept': 'image/*', 'aria-label': 'Subir imagen' },
        showCancelButton: true,
        confirmButtonText: 'Ver Previa',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#50B296',
        inputValidator: (value) => {
            if (!value) return 'Debes seleccionar un archivo para continuar';
            if (value.size > 2 * 1024 * 1024) return 'El archivo es demasiado grande (Máx 2MB)';
        }
    });

    if (file) {
        const reader = new FileReader();
        Swal.showLoading();
        reader.onload = async (e) => {
            const confirmacion = await Swal.fire({
                title: '¿Confirmar esta imagen?',
                imageUrl: e.target.result, 
                imageAlt: 'Previsualización',
                imageHeight: 200,
                imageClass: 'rounded-xl border shadow-sm object-contain',
                showCancelButton: true,
                confirmButtonText: 'Sí, subir ahora',
                cancelButtonText: 'Elegir otra',
                confirmButtonColor: '#50B296',
                backdrop: `rgba(0,0,123,0.1)`
            });
            if (confirmacion.isConfirmed) window.handleSubirImagen(clave, file);
            else if (confirmacion.dismiss === Swal.DismissReason.cancel) window.solicitarArchivoImagen(clave);
        };
        reader.readAsDataURL(file);
    }
};

window.handleSubirImagen = async (clave, archivo) => {
    if (!archivo) return;
    const spinner = document.getElementById(`spinner-${clave}`);
    if (spinner) spinner.classList.remove('hidden');

    Swal.fire({
        title: 'Subiendo...',
        text: 'Guardando en el servidor',
        allowOutsideClick: false,
        didOpen: () => Swal.showLoading()
    });

    try {
        const fileExt = archivo.name.split('.').pop();
        const fileName = `${clave}-${Date.now()}.${fileExt}`;
        const filePath = `config/${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('Almacenamiento')
            .upload(filePath, archivo);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
            .from('Almacenamiento')
            .getPublicUrl(filePath);

        const urlPublica = urlData.publicUrl;
        const res = await configuracionFrontendModel.actualizarConfiguracion(clave, urlPublica);

        if (res.exito) {
            configuracionFrontendView.sincronizarInputs(clave, urlPublica);
            const index = configuracionFrontendController.ajustesCache.findIndex(a => a.clave === clave);
            if(index !== -1) configuracionFrontendController.ajustesCache[index].valor_actual = urlPublica;

            await Swal.fire({
                title: '¡Éxito!',
                text: 'Imagen actualizada correctamente',
                icon: 'success',
                timer: 1500,
                showConfirmButton: false
            });
        }
    } catch (err) {
        console.error('Error:', err);
        Swal.fire('Error de subida', err.message, 'error');
        if (spinner) spinner.classList.add('hidden');
    }
};

window.actualizarClave = async (clave, valor) => {
    const esFuente = clave === 'fuente_principal';
    const result = await Swal.fire({
        title: '¿Guardar cambios?',
        text: `Se actualizará el valor de ${clave.replace(/_/g, ' ')}.`,
        icon: 'question',
        showCancelButton: true,
        confirmButtonColor: '#50B296',
        confirmButtonText: 'Sí, aplicar',
        cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
        const res = await configuracionFrontendModel.actualizarConfiguracion(clave, valor);
        if (res.exito) {
            Swal.fire({ title: '¡Listo!', icon: 'success', timer: 1000, showConfirmButton: false });
            configuracionFrontendView.sincronizarInputs(clave, valor);
            const index = configuracionFrontendController.ajustesCache.findIndex(a => a.clave === clave);
            if(index !== -1) configuracionFrontendController.ajustesCache[index].valor_actual = valor;
            if (esFuente) document.body.style.fontFamily = valor;
        } else {
            Swal.fire('Error', 'No se pudo actualizar en la base de datos.', 'error');
        }
    } else {
        configuracionFrontendController.refrescarInterfaz(configuracionFrontendController.ajustesCache);
    }
};

window.restaurarClave = async (clave) => {
    const result = await Swal.fire({
        title: '¿Restaurar valores?',
        text: `"${clave.replace(/_/g, ' ')}" volverá a su estado original.`,
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#EF4444',
        confirmButtonText: 'Sí, restaurar'
    });

    if (result.isConfirmed) {
        const res = await configuracionFrontendModel.restaurarPorDefecto(clave);
        if (res.exito) {
            await Swal.fire({ title: 'Restaurado', icon: 'success' });
            location.reload(); 
        } else {
            Swal.fire('Error', 'No se pudo restaurar el valor.', 'error');
        }
    }
};