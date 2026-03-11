import { supabase } from '../config/supabaseClient.js';
/**
 * StorageModel - Gestión de persistencia en Supabase Storage
 */
export const storageModel = {
    /**
     * Sube un archivo binario a una ruta específica del bucket 'almacenamiento'
     * @param {string} path - Ruta completa incluyendo carpeta y nombre (ej: 'carruseles/foto.jpg')
     * @param {File} file - El objeto File del input
     */
    async subirArchivo(path, file) {
        const { data, error } = await supabase.storage
            .from('almacenamiento')
            .upload(path, file, {
                cacheControl: '3600',
                upsert: true // Sobrescribe si el nombre ya existe
            });

        if (error) {
            console.error("Error técnico en StorageModel (Upload):", error);
            throw error;
        }
        return data;
    },

    /**
     * Obtiene la URL pública para mostrar la imagen en el navegador
     */
    obtenerUrlPublica(path) {
        const { data } = supabase.storage
            .from('almacenamiento')
            .getPublicUrl(path);
        
        return data.publicUrl;
    },

    /**
     * Elimina un archivo físico del servidor
     */
    async eliminarArchivo(path) {
        const { error } = await supabase.storage
            .from('almacenamiento')
            .remove([path]);
        
        if (error) {
            console.warn("No se pudo eliminar el archivo del storage:", error.message);
        }
    }
};