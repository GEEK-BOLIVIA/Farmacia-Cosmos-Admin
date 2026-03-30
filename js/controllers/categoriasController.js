import { categoriasModel } from '../models/categoriasModel.js';
import { categoriasView } from '../views/categoriasView.js';

export const categoriasController = {
    // Definimos las columnas que el código necesita pero el usuario no debe configurar
    COLUMNAS_TECNICAS: ['id', 'visible'],

    COLUMNAS_PADRES: ['id', 'nombre', 'visible'],
    COLUMNAS_HIJOS: ['id', 'nombre', 'categoria_padre', 'visible'],
    REF_PADRES: 'categorias_padre',
    REF_HIJOS: 'subcategorias',

    _datosPadres: [],
    _datosHijos: [],
    _colsPadres: [],
    _colsHijos: [],

    async inicializar(pestanaPorDefecto = 'categorias') {
        try {
            categoriasView._estado.seleccionados = [];
            categoriasView._actualizarBarraFlotante?.();
            categoriasView.mostrarCargando('Cargando catálogo...');

            // 1. Obtenemos los datos desde Supabase
            const todas = await categoriasModel.obtenerTodas();

            // 2. CONFIGURACIÓN DE COLUMNAS: 
            // Usamos las constantes que ya definiste al inicio de tu controlador
            this._colsPadres = this.COLUMNAS_PADRES;
            this._colsHijos = this.COLUMNAS_HIJOS;

            // 3. SEPARACIÓN DE DATOS
            // Filtramos para saber quiénes son padres y quiénes hijos
            this._datosPadres = todas.filter(c => !c.id_padre);
            this._datosHijos = todas.filter(c => c.id_padre);

            // 4. Actualizamos el estado de la pestaña
            categoriasView._estado.pestanaActiva = pestanaPorDefecto;

            // 5. Pintamos la vista con la configuración y los datos
            this.refrescarVista();

            if (window.Swal) Swal.close();
        } catch (error) {
            console.error("Error al inicializar controlador:", error);
            categoriasView.notificarError('No se pudieron cargar los datos.');
        }
    },
    /**
     * REFRESCO DE VISTA
     */
    refrescarVista() {
        // Pasamos los datos completos; la vista hará el .slice() de la paginación internamente
        categoriasView.render(
            this._datosPadres,
            this._colsPadres,
            this._datosHijos,
            this._colsHijos
        );

        // Mantenemos tus configuraciones de eventos
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
            // Recargamos manteniendo la pestaña actual del estado de la vista
            this.inicializar(categoriasView._estado.pestanaActiva);
        } else {
            categoriasView.notificarError(res.mensaje);
        }
    },

    async mostrarFormularioCreacion(tipo) {
        categoriasView._estado.seleccionados = [];
        categoriasView.limpiarSeleccion?.();

        categoriasView._estado.pestanaActiva = (tipo === 'padre') ? 'categorias' : 'subcategorias';

        const datos = await categoriasView.mostrarFormulario({
            titulo: tipo === 'padre' ? 'Nueva Categoría Principal' : 'Nueva Subcategoría',
            categoriasPadre: this._datosPadres
        });

        if (datos) {
            const res = await categoriasModel.crear(datos);
            if (res.exito) {
                categoriasView.notificarExito('Registro creado con éxito');
                await this._recargarSilencioso();
            } else {
                categoriasView.notificarError('No se pudo crear el registro');
            }
        } else {
            // ✅ Usuario canceló — limpiar checkbox header igual
            categoriasView._actualizarCheckboxHeader?.();
            categoriasView._actualizarBarraFlotante?.();
        }
    },

    async editar(id) {
        categoriasView._estado.seleccionados = [];
        categoriasView.limpiarSeleccion?.();

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
                categoriasView.notificarExito('Cambios guardados correctamente');
                await this._recargarSilencioso();
            } else {
                categoriasView.notificarError('Error al actualizar');
            }
        } else {
            // ✅ Usuario canceló — limpiar checkbox header igual
            categoriasView._actualizarCheckboxHeader?.();
            categoriasView._actualizarBarraFlotante?.();
        }
    },

    async _recargarSilencioso() {
        try {
            // ✅ Limpiar selección antes de recargar
            categoriasView._estado.seleccionados = [];

            // ✅ Sin Promise.all innecesario — solo una consulta
            const todas = await categoriasModel.obtenerTodas();

            // ✅ Columnas fijas sin configuracionColumnas
            this._colsPadres = this.COLUMNAS_PADRES;
            this._colsHijos = this.COLUMNAS_HIJOS;

            this._datosPadres = todas.filter(c => !c.id_padre);
            this._datosHijos = todas.filter(c => c.id_padre);

            this.refrescarVista();
        } catch (error) {
            console.error('Error al recargar:', error);
        }
    },
    // --- LÓGICA DE INTERFAZ Y EVENTOS (Mantenida intacta) ---

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
        const configCat = document.getElementById('btn-config-cat');
        const nuevaCat = document.getElementById('btn-nueva-cat');
        const configSub = document.getElementById('btn-config-sub');
        const nuevaSub = document.getElementById('btn-nueva-sub');

        if (nuevaCat) nuevaCat.onclick = () => this.mostrarFormularioCreacion('padre');
        if (nuevaSub) nuevaSub.onclick = () => this.mostrarFormularioCreacion('hijo');
    },

    async eliminarLote(ids) {
        try {
            await Promise.all(ids.map(id => categoriasModel.eliminar(id)));
            return { exito: true };
        } catch (err) {
            console.error('Error en eliminarLote:', err.message);
            return { exito: false, mensaje: err.message };
        }
    },
};

window.categoriasController = categoriasController;