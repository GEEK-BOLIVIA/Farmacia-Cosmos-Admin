// js/views/paletaColorView.js

export const paletaColorView = {
    
    /**
     * Renderiza la cuadrícula de paletas
     */
    renderizarLista(paletas) {
        const contenedor = document.getElementById('paletasContainer');
        if (!contenedor) return;

        contenedor.innerHTML = ''; 

        if (!paletas || paletas.length === 0) {
            contenedor.innerHTML = `
                <div class="col-span-full text-center py-12 bg-gray-50 dark:bg-[#111418] rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <span class="material-symbols-outlined text-gray-400 text-5xl mb-3">palette</span>
                    <p class="text-[#637588]">No hay paletas configuradas.</p>
                </div>`;
            return;
        }

        contenedor.innerHTML = paletas.map(p => this.crearTarjetaPaleta(p)).join('');
    },

    /**
     * Crea el HTML de una tarjeta individual
     * Ajustado para mostrar 7 colores en una sola línea
     */
    crearTarjetaPaleta(paleta) {
        const isActive = paleta.es_activa;
        
        return `
            <div class="group relative bg-white dark:bg-[#1a222c] border ${isActive ? 'border-primary ring-2 ring-primary/20 shadow-lg shadow-primary/10' : 'border-[#dbe0e6] dark:border-[#2a3441]'} rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-300">
                
                <div class="flex justify-between items-start mb-4">
                    <div>
                        <h4 class="font-bold text-[#111418] dark:text-white flex items-center gap-2">
                            ${paleta.nombre}
                            ${isActive ? '<span class="text-[10px] bg-primary text-white px-2 py-0.5 rounded-full font-bold uppercase tracking-wider animate-pulse">ACTIVA</span>' : ''}
                        </h4>
                    </div>
                    
                    <div class="flex gap-1">
                        <button onclick="handleAbrirEditar('${paleta.id}')" class="lg:opacity-0 lg:group-hover:opacity-100 p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-all" title="Editar">
                            <span class="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                        
                        <button onclick="handleEliminarPaleta('${paleta.id}')" class="lg:opacity-0 lg:group-hover:opacity-100 p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all" title="Eliminar">
                            <span class="material-symbols-outlined text-[18px]">delete</span>
                        </button>
                    </div>
                </div>

                <div class="flex items-center justify-between gap-1 mb-6 bg-gray-50 dark:bg-white/5 p-2 rounded-xl border border-gray-100 dark:border-gray-800">
                    ${this.renderCircle(paleta.primary_color, 'Primario')}
                    ${this.renderCircle(paleta.secondary_color, 'Secundario')}
                    ${this.renderCircle(paleta.accent_color, 'Acento')}
                    ${this.renderCircle(paleta.primary_dark_color, 'P. Oscuro')}
                    ${this.renderCircle(paleta.background_light_color, 'F. Claro')}
                    ${this.renderCircle(paleta.background_dark_color, 'F. Oscuro')}
                    ${this.renderCircle(paleta.surface_dark_color, 'S. Oscura')}
                </div>

                ${!isActive ? `
                    <button onclick="handleActivarPaleta('${paleta.id}')" 
                        class="w-full py-2.5 px-4 bg-[#f0f2f4] dark:bg-[#2a3441] hover:bg-primary hover:text-white dark:hover:bg-primary text-[#111418] dark:text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 group/btn">
                        <span class="material-symbols-outlined text-[18px] group-hover/btn:rotate-12 transition-transform">check_circle</span>
                        Aplicar Paleta
                    </button>
                ` : `
                    <div class="w-full py-2.5 px-4 border-2 border-primary/30 text-primary text-xs font-bold rounded-xl flex items-center justify-center gap-2 bg-primary/5">
                        <span class="material-symbols-outlined text-[18px]">verified</span>
                        En uso
                    </div>
                `}
            </div>
        `;
    },

    /**
     * Renderiza un círculo de color individual
     */
    renderCircle(hex, label) {
        const color = hex || '#e5e7eb';
        return `
            <div class="group/color relative flex-shrink-0">
                <div class="w-7 h-7 rounded-full border border-black/10 dark:border-white/20 shadow-sm transition-all duration-300 hover:scale-110 cursor-help" 
                     style="background-color: ${color}" 
                     title="${label}: ${color}">
                </div>
            </div>
        `;
    },

    /**
     * Muestra el modal de creación
     */
    mostrarFormularioCreacion(html) {
        const modal = document.getElementById('modalNuevaPaleta');
        if (!modal) return;
        modal.innerHTML = html;
        modal.classList.remove('hidden');
        this.activarSincronizacionColores('formNuevaPaleta');
    },

    /**
     * Muestra el modal de edición y carga los datos actuales
     */
    mostrarFormularioEdicion(html, paleta) {
        const modal = document.getElementById('modalNuevaPaleta');
        if (!modal) return;

        modal.innerHTML = html;
        modal.classList.remove('hidden');

        // Referencias base
        const idInput = document.getElementById('edit-id');
        const nombreInput = document.getElementById('edit-nombre');

        if(idInput) idInput.value = paleta.id;
        if(nombreInput) nombreInput.value = paleta.nombre;

        // Mapeo de los 7 colores según la nueva tabla SQL
        const campos = [
            'primary_color', 
            'secondary_color', 
            'accent_color', 
            'primary_dark_color', 
            'background_light_color', 
            'background_dark_color', 
            'surface_dark_color'
        ];

        campos.forEach(campo => {
            const hex = paleta[campo] || '#FFFFFF';
            const textInput = document.getElementById(`edit-text-${campo}`);
            const colorPicker = document.getElementById(`edit-color-${campo}`);
            
            if (textInput) textInput.value = hex.toUpperCase();
            if (colorPicker) colorPicker.value = hex;
        });

        this.activarSincronizacionColores('formEditarPaleta');
    },

    /**
     * Mantiene sincronizados los inputs de texto HEX con los Color Pickers
     */
    activarSincronizacionColores(formId) {
        const form = document.getElementById(formId);
        if (!form) return;

        const colorPickers = form.querySelectorAll('.color-picker');
        const hexInputs = form.querySelectorAll('.hex-input');

        colorPickers.forEach(picker => {
            picker.addEventListener('input', (e) => {
                const targetName = e.target.getAttribute('data-for');
                const textInput = form.querySelector(`input[name="${targetName}"]`);
                if (textInput) textInput.value = e.target.value.toUpperCase();
            });
        });

        hexInputs.forEach(textInput => {
            textInput.addEventListener('input', (e) => {
                let valor = e.target.value;
                if (valor.length > 0 && !valor.startsWith('#')) {
                    valor = '#' + valor;
                    e.target.value = valor;
                }
                const esHexValido = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(valor);
                if (esHexValido) {
                    const picker = form.querySelector(`input[data-for="${e.target.name}"]`);
                    if (picker) picker.value = valor;
                }
            });
        });
    },

    cerrarModal() {
        const modal = document.getElementById('modalNuevaPaleta');
        if (modal) {
            modal.classList.add('hidden');
            modal.innerHTML = '';
        }
    }
};