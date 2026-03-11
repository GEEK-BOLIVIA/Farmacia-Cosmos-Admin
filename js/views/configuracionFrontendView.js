// js/views/configuracionFrontendView.js

export const configuracionFrontendView = {
    // 1. Configuración visual (Iconos y colores por categoría)
    mappingCategorias: {
        'colores': { icon: 'palette', color: 'bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-300' },
        'tipografia': { icon: 'match_case', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300' },
        'estilos': { icon: 'border_style', color: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300' },
        'general': { icon: 'settings', color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300' },
        'sistema': { icon: 'terminal', color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300' },
        'seguridad': { icon: 'shield_lock', color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' },
        'default': { icon: 'tune', color: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300' }
    },

    /**
     * RENDERIZADO PRINCIPAL
     */
    renderizarLista(ajustes) {
        const contenedor = document.getElementById('settingsContainer');
        if (!contenedor) return;

        // Limpiar contenedor
        contenedor.innerHTML = ''; 

        // Manejo de búsqueda sin resultados
        if (ajustes.length === 0) {
            contenedor.innerHTML = `
                <div class="flex flex-col items-center justify-center py-20 text-[#637588] animate-in fade-in zoom-in duration-300">
                    <span class="material-symbols-outlined text-6xl mb-4 opacity-20">search_off</span>
                    <p class="text-lg font-medium">No se encontraron configuraciones</p>
                    <p class="text-sm opacity-70">Intenta con otro término de búsqueda.</p>
                </div>
            `;
            return;
        }

        const categorias = [...new Set(ajustes.map(a => a.categoria))];

        categorias.forEach(cat => {
            const nombreNormalizado = cat ? cat.toLowerCase().trim()
                .normalize("NFD").replace(/[\u0300-\u036f]/g, "") : 'general';
            
            const configVisual = this.mappingCategorias[nombreNormalizado] || this.mappingCategorias['default'];

            const filasHtml = ajustes
                .filter(a => a.categoria === cat)
                .map(a => this.crearFilaConfiguracion(a))
                .join('');

            const seccion = document.createElement('section');
            seccion.className = "mb-10 animate-in fade-in slide-in-from-bottom-4 duration-500"; 
            seccion.innerHTML = `
                <h3 class="text-lg font-semibold text-[#111418] dark:text-white mb-4 flex items-center gap-2 capitalize">
                    <span class="p-1.5 rounded-lg ${configVisual.color}">
                        <span class="material-symbols-outlined text-[20px] block">${configVisual.icon}</span>
                    </span>
                    ${cat}
                </h3>
                <div class="bg-white dark:bg-[#1a222c] border border-[#dbe0e6] dark:border-[#2a3441] rounded-2xl shadow-sm overflow-hidden divide-y divide-[#f0f2f4] dark:divide-[#2a3441]">
                    ${filasHtml}
                </div>
            `;
            contenedor.appendChild(seccion);
        });
    },

    /**
     * TEMPLATE DE FILA
     */
    crearFilaConfiguracion(ajuste) {
        const esColor = /^#[0-9A-F]{6}$/i.test(ajuste.valor_actual);
        const esFuente = ajuste.clave === 'fuente_principal';
        const esImagen = ajuste.clave.toLowerCase().includes('logo') || ajuste.clave.toLowerCase().includes('imagen');
        
        return `
            <div class="p-6 flex flex-col lg:flex-row gap-6 lg:items-center justify-between hover:bg-gray-50/50 dark:hover:bg-[#242f3d]/50 transition-colors">
                <div class="lg:w-5/12">
                    <label class="block text-sm font-bold text-[#111418] dark:text-white mb-1 capitalize">
                        ${ajuste.clave.replace(/_/g, ' ')}
                    </label>
                    <p class="text-xs text-[#637588] dark:text-[#9ca3af] leading-relaxed">
                        Ajuste global para el parámetro ${ajuste.clave.toLowerCase().replace(/_/g, ' ')}.
                    </p>
                </div>

                <div class="lg:w-7/12 flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div class="flex-1 w-full flex items-center gap-3">
                        ${esColor ? `
                            <div class="relative w-10 h-10 rounded-full overflow-hidden border border-[#dbe0e6] dark:border-[#374151] shadow-inner shrink-0">
                                <input type="color" value="${ajuste.valor_actual}" 
                                    onchange="actualizarClave('${ajuste.clave}', this.value)"
                                    class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[160%] h-[160%] cursor-pointer border-0 p-0">
                            </div>` : ''}

                        ${esImagen ? this.renderControlImagen(ajuste) : 
                          esFuente ? this.renderSelectorFuente(ajuste) : `
                            <input type="text" value="${ajuste.valor_actual}" 
                                id="input-${ajuste.clave}"
                                class="w-full bg-[#f6f7f8] dark:bg-[#111418] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm text-[#111418] dark:text-white font-medium transition-all"
                                onchange="actualizarClave('${ajuste.clave}', this.value)">
                        `}
                    </div>

                    <button onclick="restaurarClave('${ajuste.clave}')" 
                        class="shrink-0 text-[#637588] hover:text-primary dark:text-[#9ca3af] dark:hover:text-primary transition-colors p-2.5 rounded-xl hover:bg-gray-100 dark:hover:bg-[#2a3441]" 
                        title="Restaurar Defecto">
                        <span class="material-symbols-outlined text-[22px]">history</span>
                    </button>
                </div>
            </div>
        `;
    },

    renderControlImagen(ajuste) {
        return `
            <div class="flex flex-col sm:flex-row items-center gap-4 w-full">
                <div onclick="configuracionFrontendView.ampliarImagen('${ajuste.valor_actual}', '${ajuste.clave}')" 
                     class="relative w-full sm:w-40 h-24 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-[#0d1014] flex items-center justify-center overflow-hidden shrink-0 group cursor-zoom-in">
                    
                    <div id="spinner-${ajuste.clave}" class="absolute inset-0 bg-white/60 dark:bg-black/60 z-10 flex items-center justify-center hidden">
                        <div class="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                    </div>

                    <img src="${ajuste.valor_actual}" 
                         id="img-preview-${ajuste.clave}" 
                         class="w-full h-full object-contain p-2 transition-all duration-500 group-hover:scale-110"
                         onerror="this.src='https://placehold.co/200x100?text=Sin+Imagen'">
                    
                    <div class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center pointer-events-none">
                         <span class="material-symbols-outlined text-white text-xl">zoom_in</span>
                    </div>
                </div>
                
                <button onclick="solicitarArchivoImagen('${ajuste.clave}')" 
                    class="w-full sm:w-auto flex items-center justify-center gap-2 py-2.5 px-5 bg-white dark:bg-[#1a222c] border border-[#dbe0e6] dark:border-[#2a3441] text-[#111418] dark:text-white rounded-xl text-xs font-bold hover:bg-gray-50 dark:hover:bg-[#242f3d] transition-all shadow-sm active:scale-95">
                    <span class="material-symbols-outlined text-[18px]">image</span>
                    Cambiar
                </button>
            </div>
        `;
    },

    ampliarImagen(url, clave) {
        const isDark = document.documentElement.classList.contains('dark');
        Swal.fire({
            title: clave.replace(/_/g, ' '),
            imageUrl: url,
            imageAlt: clave,
            showCloseButton: true,
            showConfirmButton: false,
            background: isDark ? '#1a222c' : '#fff',
            color: isDark ? '#fff' : '#111418',
            className: 'rounded-2xl',
            backdrop: `rgba(0,0,0,0.8)`
        });
    },

    renderSelectorFuente(ajuste) {
        const opciones = [
            { nombre: 'Poppins', valor: 'Poppins, sans-serif' },
            { nombre: 'Inter', valor: 'Inter, sans-serif' },
            { nombre: 'Montserrat', valor: 'Montserrat, sans-serif' },
            { nombre: 'Playfair Display', valor: "'Playfair Display', serif" },
            { nombre: 'Roboto Mono', valor: "'Roboto Mono', monospace" }
        ];

        return `
            <select id="input-${ajuste.clave}"
                onchange="actualizarClave('${ajuste.clave}', this.value)"
                class="w-full bg-[#f6f7f8] dark:bg-[#111418] border border-transparent focus:border-primary focus:ring-1 focus:ring-primary rounded-xl px-4 py-2.5 text-sm text-[#111418] dark:text-white font-medium transition-all outline-none cursor-pointer">
                ${opciones.map(opt => `
                    <option value="${opt.valor}" ${ajuste.valor_actual === opt.valor ? 'selected' : ''} style="font-family: ${opt.valor}">
                        ${opt.nombre}
                    </option>
                `).join('')}
            </select>
        `;
    },

    setTotalAjustes(total) {
        const el = document.getElementById('count-current');
        if (el) el.innerText = total;
    },

    sincronizarInputs(clave, valor) {
        const input = document.getElementById(`input-${clave}`);
        if (input) input.value = valor;
        
        const img = document.getElementById(`img-preview-${clave}`);
        const spinner = document.getElementById(`spinner-${clave}`);

        if (img) {
            if (spinner) spinner.classList.remove('hidden');
            img.style.transition = 'opacity 0.3s ease';
            img.style.opacity = '0.3';
            img.src = valor;
            img.onload = () => {
                img.style.opacity = '1';
                if (spinner) spinner.classList.add('hidden');
            };
        }
    }
};

window.configuracionFrontendView = configuracionFrontendView;