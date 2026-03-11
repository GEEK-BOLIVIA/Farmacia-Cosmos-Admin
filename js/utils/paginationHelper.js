export const PaginationHelper = {
    /**
     * Genera el HTML de una paginación inteligente
     * @param {number} totalItems - Total de registros
     * @param {number} itemsPerPage - Registros por página
     * @param {number} currentPage - Página actual
     * @param {string} instanceName - Nombre de la instancia (ej. 'productoView')
     */
    render(totalItems, itemsPerPage, currentPage, instanceName) {
        const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
        if (totalPages <= 1) return `<div class="px-6 py-4"></div>`;

        let buttons = [];
        const range = 1; // Cuántas páginas mostrar a los lados de la actual

        // Botón Primera Página e Izquierda
        buttons.push(this._buildBtn(1, 'first_page', currentPage === 1, instanceName, 'Primera página'));
        buttons.push(this._buildBtn(currentPage - 1, 'chevron_left', currentPage === 1, instanceName, 'Anterior'));

        // Lógica de números y puntos suspensivos
        for (let i = 1; i <= totalPages; i++) {
            if (i === 1 || i === totalPages || (i >= currentPage - range && i <= currentPage + range)) {
                buttons.push(`
                    <button onclick="${instanceName}.cambiarPagina(${i})" 
                        class="w-9 h-9 flex items-center justify-center rounded-xl text-[11px] font-black transition-all
                        ${currentPage === i 
                            ? 'bg-blue-600 text-white shadow-md shadow-blue-200' 
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-blue-400'}">
                        ${i}
                    </button>
                `);
            } else if (i === currentPage - range - 1 || i === currentPage + range + 1) {
                buttons.push(`<span class="text-slate-400 px-1">...</span>`);
            }
        }

        // Botón Derecha y Última Página
        buttons.push(this._buildBtn(currentPage + 1, 'chevron_right', currentPage >= totalPages, instanceName, 'Siguiente'));
        buttons.push(this._buildBtn(totalPages, 'last_page', currentPage >= totalPages, instanceName, 'Última página'));

        return `
            <div class="px-6 py-4 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between border-t border-slate-100 gap-4">
                <p class="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    Mostrando ${(currentPage - 1) * itemsPerPage + 1} - ${Math.min(currentPage * itemsPerPage, totalItems)} de ${totalItems}
                </p>
                <div class="flex items-center gap-1.5">
                    ${buttons.join('')}
                </div>
            </div>`;
    },

    _buildBtn(page, icon, disabled, instance, title) {
        return `
            <button onclick="${instance}.cambiarPagina(${page})" 
                ${disabled ? 'disabled' : ''} 
                title="${title}"
                class="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-slate-200 text-slate-600 
                       hover:text-blue-600 hover:border-blue-400 transition-all shadow-sm disabled:opacity-20 disabled:pointer-events-none">
                <span class="material-symbols-outlined text-[20px]">${icon}</span>
            </button>`;
    }
};