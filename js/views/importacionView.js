export const importacionView = {
    render() {
        return `
            <div class="import-wrapper" style="
                animation: fadeIn 0.5s ease; 
                padding: 30px; 
                font-family: 'Segoe UI', Roboto, sans-serif; 
                background: #f8f9fa; 
                height: 100vh; 
                overflow-y: auto; 
                box-sizing: border-box;
            ">
                
                <div class="import-header" style="display: flex; align-items: center; gap: 20px; margin-bottom: 30px; background: white; padding: 25px; border-radius: 16px; box-shadow: 0 2px 10px rgba(0,0,0,0.03);">
                    <div style="background: linear-gradient(135deg, #5EC8AA, #48b496); color: white; padding: 15px; border-radius: 12px; box-shadow: 0 4px 12px rgba(94, 200, 170, 0.3);">
                        <svg width="28" height="28" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                            <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"/>
                        </svg>
                    </div>
                    <div>
                        <h2 style="margin: 0; color: #1e272e; font-weight: 700; letter-spacing: -0.5px;">Centro de Importación Masiva</h2>
                        <p style="margin: 0; color: #7f8c8d; font-size: 0.95rem;">Procesamiento inteligente de inventario y activos multimedia</p>
                    </div>
                </div>

                <div id="drop-zone" class="drop-zone" style="border: 2px dashed #5EC8AA; border-radius: 20px; padding: 60px 40px; text-align: center; background: white; transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); cursor: pointer; box-shadow: 0 4px 20px rgba(0,0,0,0.02);">
                    <div class="icon-container" style="color: #5EC8AA; margin-bottom: 20px;">
                        <svg width="72" height="72" fill="none" stroke="currentColor" stroke-width="1.2" viewBox="0 0 24 24">
                            <path d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/>
                        </svg>
                    </div>
                    <h3 style="color: #2d3436; margin-bottom: 12px; font-weight: 600;">Suelte su archivo Excel aquí</h3>
                    <p style="color: #a4b0be; font-size: 0.95rem; max-width: 400px; margin: 0 auto 20px auto;">El validador oculto procesará los nombres técnicos mientras usted trabaja con nombres amigables.</p>
                    
                    <div style="margin-bottom: 25px;">
                        <button id="btn-descargar-plantilla" style="background: white; border: 1.5px solid #5EC8AA; color: #5EC8AA; padding: 10px 20px; border-radius: 10px; font-size: 0.85rem; font-weight: 700; cursor: pointer; transition: 0.3s; display: inline-flex; align-items: center; gap: 8px;">
                            <svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                                <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/>
                            </svg>
                            Descargar Plantilla
                        </button>
                    </div>

                    <button class="btn-select" style="padding: 12px 35px; background: #5EC8AA; color: white; border: none; border-radius: 10px; font-weight: 600; cursor: pointer; box-shadow: 0 4px 14px rgba(94, 200, 170, 0.4); transition: 0.3s;">
                        Explorar Archivos
                    </button>
                    <input type="file" id="excel-input" accept=".xlsx, .xls" style="display: none;">
                </div>

                <div id="report-container" style="display: none; margin-top: 40px; animation: slideUp 0.6s ease; padding-bottom: 50px;">
                    <div id="summary-cards" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 35px;"></div>
                    
                    <div class="data-sections" style="display: flex; flex-direction: column; gap: 40px;">
                        <div id="error-box" style="display: none;">
                            <div style="display: flex; align-items: center; gap: 12px; color: #eb4d4b; margin-bottom: 18px; padding-left: 5px;">
                                <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                    <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>
                                </svg>
                                <h4 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Inconsistencias que requieren atención</h4>
                            </div>
                            <div style="background: white; border-radius: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.04); overflow: hidden; border: 1px solid #ffeaea;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #5EC8AA; color: white;">
                                        <tr>
                                            <th style="padding: 18px; text-align: left; width: 80px; color: white;">Fila</th>
                                            <th style="padding: 18px; text-align: left; color: white;">Referencia</th>
                                            <th style="padding: 18px; text-align: left; color: white;">Motivos del rechazo</th>
                                        </tr>
                                    </thead>
                                    <tbody id="error-tbody"></tbody>
                                </table>
                            </div>
                        </div>

                        <div id="valid-box" style="display: none;">
                            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 18px; padding: 0 5px; flex-wrap: wrap; gap: 15px;">
                                <div style="display: flex; align-items: center; gap: 12px; color: #5EC8AA;">
                                    <svg width="24" height="24" fill="none" stroke="currentColor" stroke-width="2.5" viewBox="0 0 24 24">
                                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/>
                                    </svg>
                                    <h4 style="margin: 0; font-size: 1.1rem; font-weight: 700;">Registros validados con éxito</h4>
                                </div>
                                <div style="display: flex; gap: 12px;">
                                    <button id="btn-cancel" style="padding: 10px 25px; border: 1px solid #dcdde1; background: white; border-radius: 10px; cursor: pointer; color: #7f8c8d; font-weight: 600; transition: 0.3s;">Anular</button>
                                    <button id="btn-execute" style="padding: 10px 30px; background: #5EC8AA; color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; box-shadow: 0 4px 14px rgba(94, 200, 170, 0.3); transition: 0.3s;">Ejecutar Importación</button>
                                </div>
                            </div>
                            <div style="background: white; border-radius: 16px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); overflow: hidden; border: 1px solid #e0f2ee;">
                                <table style="width: 100%; border-collapse: collapse;">
                                    <thead style="background: #5EC8AA; color: white;">
                                        <tr>
                                            <th style="padding: 18px; text-align: left; color: white;">Producto</th>
                                            <th style="padding: 18px; text-align: left; color: white;">Categoría</th>
                                            <th style="padding: 18px; text-align: left; color: white;">Precio</th>
                                            <th style="padding: 18px; text-align: left; color: white;">Stock</th>
                                        </tr>
                                    </thead>
                                    <tbody id="valid-tbody"></tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style>
                @keyframes fadeIn { from { opacity: 0; transform: translateY(15px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
                .drop-zone:hover { border-color: #48b496 !important; background: #f0fdfa !important; transform: translateY(-2px); }
                .btn-select:hover { background: #48b496 !important; transform: translateY(-1px); }
                #btn-descargar-plantilla:hover { background: #f0fdfa !important; transform: translateY(-1px); }
                #btn-execute:hover { background: #48b496 !important; transform: scale(1.02); }
                #btn-cancel:hover { background: #f1f2f6 !important; color: #2f3542 !important; }
                th { font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; }
                td { padding: 14px 18px; border-bottom: 1px solid #f1f2f6; color: #2f3542; font-size: 0.85rem; }
                tr:last-child td { border-bottom: none; }
                .import-wrapper::-webkit-scrollbar { width: 8px; }
                .import-wrapper::-webkit-scrollbar-thumb { background: #5EC8AA; border-radius: 10px; }
            </style>
        `;
    },

    initEventListeners(onValidate, onExecute, onDownload) {
        const input = document.getElementById('excel-input');
        const btnExecute = document.getElementById('btn-execute');
        const btnCancel = document.getElementById('btn-cancel');
        const dropZone = document.getElementById('drop-zone');
        const btnDescargar = document.getElementById('btn-descargar-plantilla');

        btnDescargar.onclick = (e) => {
            e.stopPropagation();
            if (onDownload) onDownload();
        };

        dropZone.onclick = () => input.click();

        input.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;

            Swal.fire({
                title: 'Analizando Estructura',
                text: 'Extrayendo datos y verificando duplicados...',
                allowOutsideClick: false,
                didOpen: () => Swal.showLoading()
            });

            try {
                const reporte = await onValidate(file);
                this.mostrarReporte(reporte);
                Swal.close();
            } catch (err) {
                Swal.fire('Error de Lectura', err.message, 'error');
            }
        };

        if (btnExecute) {
            btnExecute.onclick = () => {
                Swal.fire({
                    title: '¿Confirmar Importación?',
                    text: "Se registrarán los productos aptos en el sistema.",
                    icon: 'question',
                    showCancelButton: true,
                    confirmButtonColor: '#5EC8AA',
                    confirmButtonText: 'Sí, iniciar ahora',
                    cancelButtonText: 'Revisar'
                }).then((result) => {
                    if (result.isConfirmed) onExecute();
                });
            };
        }

        if (btnCancel) {
            btnCancel.onclick = () => {
                document.getElementById('report-container').style.display = 'none';
                input.value = '';
            };
        }
    },

    mostrarProgreso(porcentaje) {
        if (!Swal.isVisible()) {
            Swal.fire({
                title: 'Procesando Inventario',
                html: `
                    <div style="margin-top: 15px;">
                        <p id="swal-status-text" style="font-size: 0.9rem; color: #7f8c8d; margin-bottom: 15px;">Iniciando transferencia...</p>
                        <div style="width: 100%; background: #edf2f7; border-radius: 12px; height: 12px; overflow: hidden; position: relative;">
                            <div id="swal-progress-bar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #5EC8AA, #48b496); transition: width 0.4s ease; border-radius: 12px;"></div>
                        </div>
                        <div id="swal-progress-percent" style="margin-top: 10px; font-weight: 800; color: #2d3436; font-size: 1.2rem;">0%</div>
                    </div>
                `,
                showConfirmButton: false,
                allowOutsideClick: false
            });
        } else {
            const bar = document.getElementById('swal-progress-bar');
            const percent = document.getElementById('swal-progress-percent');
            const status = document.getElementById('swal-status-text');
            if (bar) bar.style.width = `${porcentaje}%`;
            if (percent) percent.innerText = `${porcentaje}%`;
            if (status) status.innerText = porcentaje < 100 ? `Sincronizando registros (${porcentaje}%)...` : 'Finalizando carga...';
        }
    },

    mostrarReporte(reporte) {
        const container = document.getElementById('report-container');
        container.style.display = 'block';
        
        const eBody = document.getElementById('error-tbody');
        const vBody = document.getElementById('valid-tbody');
        
        eBody.innerHTML = ''; 
        vBody.innerHTML = '';

        document.getElementById('summary-cards').innerHTML = this._renderCards(reporte);

        if (reporte.errores.length > 0) {
            document.getElementById('error-box').style.display = 'block';
            reporte.errores.forEach(err => {
                eBody.innerHTML += `
                    <tr>
                        <td style="font-weight:700; color:#e74c3c">#${err.fila}</td>
                        <td><span style="background:#fff5f5; padding:4px 8px; border-radius:4px; font-weight:600">${err.nombre}</span></td>
                        <td style="color:#c0392b; font-style:italic">${err.detalles.join(' • ')}</td>
                    </tr>`;
            });
        } else {
            document.getElementById('error-box').style.display = 'none';
        }

        if (reporte.validos.length > 0) {
            document.getElementById('valid-box').style.display = 'block';
            reporte.validos.forEach(p => {
                vBody.innerHTML += `
                    <tr>
                        <td><b style="color:#2d3436">${p.nombre}</b></td>
                        <td><span style="background:#f0fdfa; color:#48b496; border:1px solid #e0f2ee; padding:4px 10px; border-radius:20px; font-size:0.8rem">${p.subcategoria}</span></td>
                        <td style="font-weight:700; color:#48b496">Bs. ${p.precio.toLocaleString()}</td>
                        <td><span style="font-weight:600; color:#4b6584">${p.stock} uds.</span></td>
                    </tr>`;
            });
        } else {
            document.getElementById('valid-box').style.display = 'none';
        }

        container.scrollIntoView({ behavior: 'smooth' });
    },

    _renderCards(r) {
        const cardStyle = "background:white; padding:25px; border-radius:18px; box-shadow:0 4px 15px rgba(0,0,0,0.03); border-top:6px solid";
        return `
            <div style="${cardStyle} #4A90E2;">
                <div style="color:#7f8c8d; font-size:0.75rem; font-weight:800; text-transform:uppercase; margin-bottom:8px;">Total Archivo</div>
                <div style="font-size:2rem; font-weight:800; color:#2c3e50">${r.totalFilas}</div>
            </div>
            <div style="${cardStyle} #5EC8AA;">
                <div style="color:#7f8c8d; font-size:0.75rem; font-weight:800; text-transform:uppercase; margin-bottom:8px;">Aptos para Carga</div>
                <div style="font-size:2rem; font-weight:800; color:#5EC8AA">${r.validos.length}</div>
            </div>
            <div style="${cardStyle} #eb4d4b;">
                <div style="color:#7f8c8d; font-size:0.75rem; font-weight:800; text-transform:uppercase; margin-bottom:8px;">Errores Encontrados</div>
                <div style="font-size:2rem; font-weight:800; color:#eb4d4b">${r.errores.length}</div>
            </div>
        `;
    },

    notificarExitoFinal(exitos) {
        Swal.fire({
            title: '¡Importación Finalizada!',
            html: `Se han procesado <b>${exitos}</b> productos exitosamente.`,
            icon: 'success',
            confirmButtonText: 'Ver Productos',
            confirmButtonColor: '#5EC8AA'
        }).then(() => {
            window.location.hash = '/productos';
        });
    }
};