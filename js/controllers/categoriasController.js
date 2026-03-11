import { categoriasModel } from '../models/categoriasModel.js';
import { categoriasView } from '../views/categoriasView.js';

export const categoriasController = {
    // Definimos las columnas fijas para la vista
    COLUMNAS_PADRES: ['nombre'],
    COLUMNAS_HIJOS: ['nombre', 'categoria_padre'],

    _datosPadres: [],
    _datosHijos: [],

    async inicializar(pestanaPorDefecto = 'categorias') {
        try {
            categoriasView.mostrarCargando('Cargando catálogo...');

            // 1. Cargar datos directamente desde el modelo
            const todas = await categoriasModel.obtenerTodas();
            this._datosPadres = todas.filter(c => !c.id_padre);
            this._datosHijos = todas.filter(c => c.id_padre);

            // 2. Sincronizar la pestaña en el estado de la vista
            categoriasView._estado.pestanaActiva = pestanaPorDefecto;

            // 3. Renderizar
            this.refrescarVista();

            Swal.close();
        } catch (error) {
            console.error("Error al inicializar:", error);
            categoriasView.notificarError('No se pudieron cargar los datos.');
        }
    },

    /**
     * REFRESCO DE VISTA
     */
    refrescarVista() {
        // Pasamos los datos y las columnas estáticas definidas arriba
        categoriasView.render(
            this._datosPadres, 
            this.COLUMNAS_PADRES, 
            this._datosHijos, 
            this.COLUMNAS_HIJOS
        );
        
        this._setupEventListeners();
        this._setupTabLogic(); 
    },

    async verDetalle(id) {
        const registro = await categoriasModel.obtenerPorId(id);
        if (registro) {
            categoriasView.mostrarDetalle(registro);
        }
    },

    async eliminarRegistro(id) {
        const res = await categoriasModel.eliminar(id);
        if (res.exito) {
            categoriasView.notificarExito('Registro eliminado correctamente');
            this.inicializar(categoriasView._estado.pestanaActiva); 
        } else {
            categoriasView.notificarError(res.mensaje);
        }
    },

    async mostrarFormularioCreacion(tipo) {
        categoriasView._estado.pestanaActiva = (tipo === 'padre') ? 'categorias' : 'subcategorias';

        const datos = await categoriasView.mostrarFormulario({
            titulo: tipo === 'padre' ? 'Nueva Categoría Principal' : 'Nueva Subcategoría',
            categoriasPadre: this._datosPadres
        });

        if (datos) {
            const res = await categoriasModel.crear(datos);
            if (res.exito) {
                this.inicializar(categoriasView._estado.pestanaActiva);
                categoriasView.notificarExito('Registro creado con éxito');
            } else {
                categoriasView.notificarError('No se pudo crear el registro');
            }
        }
    },

    async editar(id) {
        const registro = await categoriasModel.obtenerPorId(id);
        const padresDisponibles = this._datosPadres.filter(c => c.id !== id);

        categoriasView._estado.pestanaActiva = registro.id_padre ? 'subcategorias' : 'categorias';

        const nuevosDatos = await categoriasView.mostrarFormulario({
            titulo: 'Editar Registro',
            nombre: registro.nombre,
            id_padre: registro.id_padre,
            categoriasPadre: padresDisponibles 
        });

        if (nuevosDatos) {
            const res = await categoriasModel.actualizar(id, nuevosDatos);
            if (res.exito) {
                this.inicializar(categoriasView._estado.pestanaActiva);
                categoriasView.notificarExito('Cambios guardados correctamente');
            } else {
                categoriasView.notificarError('Error al actualizar');
            }
        }
    },

    // --- LÓGICA DE INTERFAZ Y EVENTOS ---

    activarPestanaSubcategorias() {
        const btnSub = document.getElementById('tab-subcategorias');
        const btnCat = document.getElementById('tab-categorias');
        const secSub = document.getElementById('seccion-subcategorias');
        const secCat = document.getElementById('seccion-categorias');
        if (btnSub && secSub) {
            this._ejecutarCambioVisualPestana(btnSub, btnCat, secSub, secCat);
            categoriasView._estado.pestanaActiva = 'subcategorias';
        }
    },

    _setupTabLogic() {
        const btnCat = document.getElementById('tab-categorias');
        const btnSub = document.getElementById('tab-subcategorias');
        const secCat = document.getElementById('seccion-categorias');
        const secSub = document.getElementById('seccion-subcategorias');
        
        if (!btnCat || !btnSub) return;

        btnCat.onclick = () => {
            this._ejecutarCambioVisualPestana(btnCat, btnSub, secCat, secSub);
            categoriasView._estado.pestanaActiva = 'categorias';
        };
        btnSub.onclick = () => {
            this._ejecutarCambioVisualPestana(btnSub, btnCat, secSub, secCat);
            categoriasView._estado.pestanaActiva = 'subcategorias';
        };
    },

    _ejecutarCambioVisualPestana(activeBtn, inactiveBtn, showSec, hideSec) {
        activeBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm', 'active');
        activeBtn.classList.remove('text-slate-500');
        inactiveBtn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm', 'active');
        inactiveBtn.classList.add('text-slate-500');
        showSec.classList.remove('hidden');
        hideSec.classList.add('hidden');
    },

    _setupEventListeners() {
        const nuevaCat = document.getElementById('btn-nueva-cat');
        const nuevaSub = document.getElementById('btn-nueva-sub');

        if (nuevaCat) nuevaCat.onclick = () => this.mostrarFormularioCreacion('padre');
        if (nuevaSub) nuevaSub.onclick = () => this.mostrarFormularioCreacion('hijo');
    }
};

window.categoriasController = categoriasController;