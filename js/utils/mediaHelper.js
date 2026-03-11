/**
 * Utility for Media Processing (Images & Videos)
 * Centraliza la lógica de detección y renderizado de multimedia del Nexus Admin Suite.
 */

export const MediaHelper = {
    
    /**
     * Detecta el tipo de video y genera la información necesaria para el preview.
     * Soporta: Archivos File, Blobs de cámara, URLs directas y Redes Sociales.
     */
    obtenerInfoVideo(url, file = null, galeriaReferencia = []) {
        // 1. Prioridad: Si se pasa un objeto File (carga local o cámara)
        if (file && file instanceof File) {
            const esVideo = file.type.startsWith('video/');
            const blobUrl = URL.createObjectURL(file);
            return {
                tipo: esVideo ? 'video' : 'imagen',
                esArchivo: esVideo,
                thumb: esVideo ? 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png' : blobUrl,
                url: blobUrl
            };
        }

        if (!url) return { tipo: 'imagen', thumb: '', esArchivo: false };
        const urlStr = String(url);

        // 2. Detección de Blobs (Videos capturados por la cámara en la sesión actual)
        if (urlStr.startsWith('blob:')) {
            // Buscamos en la galería si este blob está marcado como video
            const itemEnGaleria = galeriaReferencia.find(i => i.url === urlStr);
            if (itemEnGaleria && itemEnGaleria.tipo === 'video') {
                return { 
                    tipo: 'video', 
                    esArchivo: true, 
                    thumb: 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png', 
                    url: urlStr 
                };
            }
            // Si es un blob pero no está en galería, verificamos si es video por el contexto
            return { tipo: 'video', esArchivo: true, thumb: 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png', url: urlStr };
        }

        // 3. Verificación por extensión de archivo (Links directos a .mp4, .mov, etc.)
        const esArchivoDirecto = urlStr.match(/\.(mp4|webm|ogg|mov|m4v)($|\?)/i);
        if (esArchivoDirecto) {
            return { 
                tipo: 'video', 
                esArchivo: true, 
                thumb: 'https://cdn-icons-png.flaticon.com/512/1179/1179120.png', 
                url: urlStr 
            };
        }

        // 4. Plataformas Externas (YouTube, FB, IG, TikTok)
        const ytMatch = urlStr.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts|live)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
        if (ytMatch) return { tipo: 'youtube', id: ytMatch[1], thumb: `https://img.youtube.com/vi/${ytMatch[1]}/hqdefault.jpg`, url: urlStr };
        
        if (urlStr.includes('facebook.com') || urlStr.includes('fb.watch')) {
            return { tipo: 'facebook', thumb: 'https://cdn-icons-png.flaticon.com/512/124/124010.png', url: urlStr };
        }
        
        if (urlStr.includes('instagram.com')) {
            return { tipo: 'instagram', thumb: 'https://cdn-icons-png.flaticon.com/512/174/174855.png', url: urlStr };
        }
        
        if (urlStr.includes('tiktok.com')) {
            const tkId = urlStr.split('/video/')[1]?.split('?')[0];
            return { tipo: 'tiktok', id: tkId, thumb: 'https://cdn-icons-png.flaticon.com/512/3046/3046121.png', url: urlStr };
        }

        // 5. Por defecto es imagen
        return { tipo: 'imagen', thumb: urlStr, url: urlStr, esArchivo: false };
    },

    /**
     * Genera el HTML del reproductor según el tipo de plataforma.
     */
    renderVideoPlayer(url, galeriaReferencia = []) {
        if (!url) return `<div class="p-10 bg-slate-100 text-center rounded-2xl font-bold">URL no válida</div>`;
        
        const info = this.obtenerInfoVideo(url, null, galeriaReferencia);
        const esLocal = url.startsWith('blob:');

        // Si es archivo físico (MP4/WebM) o un Blob de cámara
        if (info.esArchivo || esLocal) {
            return `
                <video src="${url}" controls autoplay class="w-full rounded-2xl shadow-2xl bg-black" 
                       style="max-height: 500px;" 
                       onerror="this.parentElement.innerHTML='<div class=\'p-10 bg-red-100 text-red-600 rounded-2xl\'>Error al cargar el video local</div>'">
                </video>`;
        }

        let iframeSrc = '';
        let aspect = '56.25%'; // 16:9 por defecto

        switch (info.tipo) {
            case 'youtube': 
                iframeSrc = `https://www.youtube.com/embed/${info.id}?autoplay=1&rel=0`; 
                break;
            case 'facebook': 
                iframeSrc = `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}&show_text=0&autoplay=1`; 
                aspect = '75%'; 
                break;
            case 'instagram': 
                iframeSrc = url.split('?')[0].replace(/\/$/, "") + '/embed'; 
                aspect = '125%'; 
                break;
            case 'tiktok': 
                if (info.id) { 
                    iframeSrc = `https://www.tiktok.com/embed/v2/${info.id}`; 
                    aspect = '177%'; 
                } 
                break;
        }

        if (iframeSrc) {
            return `
            <div style="position: relative; width: 100%; padding-top: ${aspect}; background: black; border-radius: 1.5rem; overflow: hidden;">
                <iframe src="${iframeSrc}" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" 
                        frameborder="0" allow="autoplay; fullscreen" allowfullscreen></iframe>
            </div>`;
        }

        return `<div class="p-10 bg-slate-100 text-center rounded-2xl font-bold">Formato de video no reconocido</div>`;
    },

    /**
     * Lanza el modal de SweetAlert con el preview de imagen o video.
     */
    verPreviewAmpliado(url, tipo = 'image', galeriaReferencia = []) {
        if (!url) return;
        
        const info = this.obtenerInfoVideo(url, null, galeriaReferencia);
        
        // Determinar si debemos tratarlo como video basándonos en la info detectada
        const esVideo = (tipo === 'video' || info.tipo !== 'imagen' || url.startsWith('blob:'));
        
        const content = esVideo 
            ? this.renderVideoPlayer(url, galeriaReferencia) 
            : `<img src="${url}" class="w-full rounded-2xl shadow-2xl object-contain" style="max-height: 85vh;">`;

        Swal.fire({ 
            html: content, 
            showConfirmButton: false, 
            background: 'transparent', 
            width: (info.tipo === 'tiktok' || info.tipo === 'instagram') ? '400px' : '850px', 
            backdrop: 'rgba(15, 23, 42, 0.95)', 
            showCloseButton: true 
        });
    }
};