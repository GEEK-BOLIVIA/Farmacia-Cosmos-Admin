import { importacionView } from '../views/importacionView.js';
import { importacionModel } from '../models/importacionModel.js';
import { productoModel } from '../models/productoModel.js';
import { categoriasModel } from '../models/categoriasModel.js';
import { productoCategoriaModel } from '../models/productoCategoriaModel.js';
import { galeriaProductoModel } from '../models/galeriaProductoModel.js';
import { aplicarEstiloCabecera } from '../utils/excelHelper.js'; // Ajusta la ruta según tu carpeta

export const importacionController = {
    datosValidados: [],

    async inicializar() {
        const contentArea = document.getElementById('content-area');
        if (!contentArea) return;

        // 1. Renderizamos la interfaz
        contentArea.innerHTML = importacionView.render();

        // 2. Conectamos la Vista con el Controlador
        importacionView.initEventListeners(
            (file) => this.validarArchivo(file),      // onValidate
            () => this.iniciarCargaFinal(),           // onExecute
            () => this.descargarPlantilla()           // onDownload (Aquí se vincula el botón)
        );
    },

    descargarPlantilla() {
        // 1. Definición de Datos
        const encabezadosTecnicos = ["nombre", "descripcion", "precio", "stock", "subcategoria", "categoria_padre", "imagen_url", "habilitar_whatsapp", "imagenes_cant", "videos_cant"];
        const encabezadosAmigables = ["Nombre del Producto", "Descripción", "Precio", "Stock", "Subcategoría", "Categoría Padre", "URL Imagen", "¿WhatsApp? (SI/NO)", "Cant. Fotos", "Cant. Videos"];

        const ejemplos = [
            ["Ejemplo: Laptop Pro", "Potente laptop para diseño", 1200, 5, "Laptops", "Computación", "", "SI", 2, 1],
            ["Ejemplo: Silla Gamer", "Ergonómica con soporte lumbar", 250, 15, "Muebles", "", "", "NO", 1, 0]
        ];

        // 2. Creación de la Hoja (AOA = Array of Arrays)
        const ws = XLSX.utils.aoa_to_sheet([
            encabezadosTecnicos,
            encabezadosAmigables,
            ...ejemplos
        ]);

        // 3. Configuración Estructural
        ws['!rows'] = [{ hidden: true }]; // Oculta la Fila 1 (nombres técnicos)
        ws['!cols'] = encabezadosTecnicos.map(() => ({ wch: 22 })); // Ancho de columnas

        // 4. Aplicación de Estilos mediante tu Helper
        const range = XLSX.utils.decode_range(ws['!ref']);
        aplicarEstiloCabecera(ws, range);

        // 5. Generación del Archivo
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Plantilla_Geek");
        XLSX.writeFile(wb, "Plantilla_Importacion_Geek.xlsx");
    },

    async validarArchivo(file) {
        try {
            const data = await file.arrayBuffer();
            const workbook = XLSX.read(data, { type: 'array' });
            const hoja = workbook.Sheets[workbook.SheetNames[0]];

            /**
             * CONFIGURACIÓN CLAVE:
             * range: 2 -> Salta las filas 1 (técnica) y 2 (amigable). Empieza en la 3.
             * header: [...] -> Mapea las columnas manualmente para que coincidan con tu lógica.
             */
            const filas = XLSX.utils.sheet_to_json(hoja, {
                range: 2,
                header: [
                    "nombre", "descripcion", "precio", "stock", "subcategoria",
                    "categoria_padre", "imagen_url", "habilitar_whatsapp",
                    "imagenes_cant", "videos_cant"
                ],
                defval: "" // Evita que los campos vacíos sean undefined
            });

            const nombresExistentes = await importacionModel.obtenerNombresExistentes();
            const categoriasDB = await categoriasModel.obtenerTodas();

            const reporte = {
                validos: [],
                errores: [],
                totalFilas: filas.length
            };

            filas.forEach((fila, index) => {
                // Limpieza de datos básica
                const nombre = fila.nombre ? fila.nombre.toString().trim() : "";
                const subcatNom = fila.subcategoria ? fila.subcategoria.toString().trim() : "";
                const padreNom = fila.categoria_padre ? fila.categoria_padre.toString().trim() : "";
                const precioRaw = fila.precio ? fila.precio.toString().replace(',', '.') : "0";
                const precio = parseFloat(precioRaw);
                const stock = parseInt(fila.stock) || 0;

                let fallos = [];

                // 1. Validación de Nombre y Duplicados
                if (!nombre || nombre === "") {
                    fallos.push("Falta el nombre del producto");
                } else if (nombresExistentes.has(nombre.toLowerCase())) {
                    fallos.push("Este producto ya existe en la base de datos");
                }

                // 2. Validación de Precio
                if (isNaN(precio) || precio <= 0) {
                    fallos.push("El precio debe ser un número mayor a 0");
                }

                // 3. Validación de Categorías
                if (!subcatNom) {
                    fallos.push("Debe especificar una subcategoría");
                } else {
                    const subExiste = categoriasDB.some(c => c.nombre.toLowerCase() === subcatNom.toLowerCase());
                    // Si la subcategoría es nueva y no tiene un padre asignado
                    if (!subExiste && (!padreNom || padreNom === "")) {
                        fallos.push(`La subcategoría '${subcatNom}' es nueva. Debe indicar una 'Categoría Padre' para crearla.`);
                    }
                }

                // --- CONSTRUCCIÓN DEL REPORTE ---
                if (fallos.length > 0) {
                    reporte.errores.push({
                        fila: index + 3, // Fila real en el Excel
                        nombre: nombre || "Producto sin nombre", // Esto es lo que lee tu View
                        detalles: fallos // Array de strings que lee tu View
                    });
                } else {
                    // Objeto limpio para la carga final
                    reporte.validos.push({
                        nombre,
                        descripcion: fila.descripcion || "",
                        precio,
                        stock,
                        subcategoria: subcatNom,
                        categoria_padre: padreNom || null,
                        portada: fila.imagen_url || 'https://via.placeholder.com/600x400?text=Sin+Portada',
                        whatsapp: fila.habilitar_whatsapp?.toString().toUpperCase() === 'SI',
                        imagenes_cant: parseInt(fila.imagenes_cant) || 0,
                        videos_cant: parseInt(fila.videos_cant) || 0
                    });
                }
            });

            // Guardamos en el controlador para la ejecución final
            this.datosValidados = reporte.validos;
            return reporte;

        } catch (error) {
            console.error("Error crítico en validarArchivo:", error);
            throw new Error("El archivo Excel tiene un formato incompatible o está dañado.");
        }
    },
    async iniciarCargaFinal() {
        if (this.datosValidados.length === 0) {
            return Swal.fire('Atención', 'No hay datos válidos para cargar', 'warning');
        }

        try {
            importacionView.mostrarProgreso(0);

            const resultado = await this.procesarCarga(this.datosValidados, (porcentaje) => {
                importacionView.mostrarProgreso(porcentaje);
            });

            importacionView.notificarExitoFinal(resultado.exitos);
            this.datosValidados = [];
        } catch (error) {
            console.error(error);
            Swal.fire('Error crítico', 'Hubo un problema durante la carga: ' + error.message, 'error');
        }
    },

    async procesarCarga(datosValidados, onProgress) {
        let exitos = 0;
        const total = datosValidados.length;

        for (let i = 0; i < total; i++) {
            try {
                const prod = datosValidados[i];
                const idHija = await this._resolverJerarquia(prod.subcategoria, prod.categoria_padre);

                const res = await productoModel.crear({
                    nombre: prod.nombre,
                    descripcion: prod.descripcion || '',
                    portada: prod.portada,
                    precio: prod.precio,
                    stock: prod.stock,
                    price_visible: true,
                    ws_active: prod.whatsapp
                });

                if (res.exito) {
                    const nuevoId = res.data.id;
                    await Promise.all([
                        productoCategoriaModel.vincular(nuevoId, idHija),
                        this._crearGaleriaPlaceholder(nuevoId, prod.imagenes_cant, prod.videos_cant)
                    ]);
                    exitos++;
                }

                if (onProgress) onProgress(Math.round(((i + 1) / total) * 100));

            } catch (e) {
                console.error(`Error procesando fila ${i + 1}:`, e);
            }
        }
        return { exitos, totalProcesado: total };
    },

    async _resolverJerarquia(nombreHija, nombrePadre) {
        const categoriasActuales = await categoriasModel.obtenerTodas();

        const hijaExistente = categoriasActuales.find(c =>
            c.nombre.toLowerCase() === nombreHija.toLowerCase().trim()
        );

        if (hijaExistente) return hijaExistente.id;

        let idPadreFinal = null;
        if (nombrePadre) {
            const padreExistente = categoriasActuales.find(c =>
                c.nombre.toLowerCase() === nombrePadre.toLowerCase().trim()
            );

            if (padreExistente) {
                idPadreFinal = padreExistente.id;
            } else {
                const resPadre = await categoriasModel.crear({
                    nombre: nombrePadre.trim(),
                    id_padre: null,
                    visible: true
                });
                if (resPadre.exito) idPadreFinal = resPadre.data.id;
            }
        }

        const resHija = await categoriasModel.crear({
            nombre: nombreHija.trim(),
            id_padre: idPadreFinal,
            visible: true
        });

        return resHija.exito ? resHija.data.id : null;
    },

    async _crearGaleriaPlaceholder(prodId, imgCant, vidCant) {
        const items = [];
        const nImg = parseInt(imgCant) || 0;
        const nVid = parseInt(vidCant) || 0;

        for (let i = 0; i < nImg; i++) {
            items.push({ url: 'https://via.placeholder.com/800x600?text=Subir+Imagen', tipo: 'imagen', orden: i });
        }
        for (let j = 0; j < nVid; j++) {
            items.push({ url: 'https://www.w3schools.com/html/mov_bbb.mp4', tipo: 'video', orden: nImg + j });
        }

        if (items.length > 0) {
            await galeriaProductoModel.createLote(prodId, items);
        }
    }
};