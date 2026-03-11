import { MediaHelper } from '../utils/mediaHelper.js';

export const deleteProductoView = {
    render: function (datos) {
        const producto = datos.producto || datos; 
        const nombreProducto = producto.nombre || producto.producto_nombre || 'Producto sin nombre';
        
        if (!producto) return `<div class="p-10 text-center text-slate-500 font-bold uppercase tracking-widest">No se encontraron datos del producto.</div>`;

        const portadaUrl = producto.imagen_url || producto.portada || 'https://via.placeholder.com/800x800?text=Sin+Imagen';
        const precio = new Intl.NumberFormat('es-BO', { style: 'currency', currency: 'BOB' }).format(producto.precio || 0);

        return `
        <div id="delete-view-container" 
             style="overflow-y: auto !important; height: 100% !important; max-height: 100vh !important;"
             class="w-full bg-slate-50/50 animate-fade-in">
            
            <div class="max-w-6xl mx-auto p-4 md:p-10">
                
                <div class="bg-white rounded-[40px] shadow-2xl border border-slate-100 flex flex-col lg:flex-row overflow-hidden mb-10">
                    
                    <div class="w-full lg:w-1/2 bg-[#0f172a] p-10 flex flex-col items-center justify-center relative">
                        <span class="absolute top-6 left-6 px-4 py-1.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-black uppercase tracking-widest">
                            Confirmar Borrado
                        </span>
                        
                        <img src="${portadaUrl}" class="w-full max-w-[300px] h-auto object-contain drop-shadow-2xl">
                        
                        <div class="w-full mt-10 grid grid-cols-2 gap-4">
                            <div class="bg-white/5 p-4 rounded-2xl text-center">
                                <p class="text-white/40 text-[9px] uppercase font-bold mb-1 tracking-widest">Precio</p>
                                <p class="text-white text-xl">${precio}</p>
                            </div>
                            <div class="bg-white/5 p-4 rounded-2xl text-center">
                                <p class="text-white/40 text-[9px] uppercase font-bold mb-1 tracking-widest">Stock</p>
                                <p class="text-white text-xl">${producto.stock || 0}</p>
                            </div>
                        </div>
                    </div>

                    <div class="w-full lg:w-1/2 p-8 md:p-14 flex flex-col justify-between bg-white">
                        <div>
                            <h4 class="text-indigo-600 text-[11px] font-black uppercase tracking-[0.3em] mb-4">Módulo de Inventario</h4>
                            <h2 class="text-4xl font-black text-slate-900 leading-tight mb-6 uppercase tracking-tighter">
                                ¿Eliminar ${nombreProducto}?
                            </h2>
                            
                            <div class="bg-slate-50 p-6 rounded-3xl border border-dashed border-slate-200 mb-8">
                                <p class="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Nota del sistema:</p>
                                <p class="text-slate-600 italic">"${producto.descripcion || 'Sin descripción.'}"</p>
                            </div>
                        </div>

                        <div class="space-y-4">
                            <button id="btnConfirmarEliminar" 
                                class="w-full py-6 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-lg shadow-red-200 transition-all active:scale-95 flex items-center justify-center gap-3">
                                <span class="material-symbols-outlined">delete</span>
                                Confirmar Eliminación
                            </button>
                            
                            <button id="btnCancelarEliminar" 
                                class="w-full py-4 text-slate-400 hover:text-slate-600 font-bold text-xs uppercase tracking-[0.2em] transition-all">
                                Cancelar y Volver
                            </button>
                        </div>
                    </div>
                </div>

                <div class="h-20 w-full"></div>
            </div>
        </div>
        `;
    },

    initEventListeners: function(onConfirm, onCancel) {
        document.getElementById('btnConfirmarEliminar')?.addEventListener('click', onConfirm);
        document.getElementById('btnCancelarEliminar')?.addEventListener('click', onCancel);
    }
};