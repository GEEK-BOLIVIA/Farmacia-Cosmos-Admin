import { storageModel } from '../models/storageModel.js';

/**
 * StorageController - Lógica de procesamiento de archivos
 */
export const storageController = {
    /**
     * Procesa la subida de imágenes para el carrusel/banners
     * @param {File} file - Archivo proveniente de RegisterCarrusel
     * @returns {string} URL pública de la imagen
     */
    async uploadCarruselImage(file) {
        try {
            if (!file) throw new Error("No se proporcionó ningún archivo");

            // 1. Generar un nombre único basado en timestamp para evitar duplicados
            const extension = file.name.split('.').pop();
            const nombreUnico = `${Date.now()}.${extension}`;
            
            // 2. Definir la ruta dentro del bucket único
            const path = `carruseles/${nombreUnico}`;

            // 3. Ejecutar la subida mediante el modelo
            await storageModel.subirArchivo(path, file);

            // 4. Retornar la URL final para guardar en la base de datos
            return storageModel.obtenerUrlPublica(path);
            
        } catch (error) {
            console.error("Fallo en StorageController:", error.message);
            throw new Error("Error al procesar la imagen del banner");
        }
    },

    /**
     * Método genérico para otros tipos de archivos en el futuro
     */
    async uploadGeneralImage(file, carpeta = 'varios') {
        const extension = file.name.split('.').pop();
        const path = `${carpeta}/${Date.now()}.${extension}`;
        await storageModel.subirArchivo(path, file);
        return storageModel.obtenerUrlPublica(path);
    }
};