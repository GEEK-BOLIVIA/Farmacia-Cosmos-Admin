import { usuarioModel } from '../models/usuarioModel.js';

export const usuarioController = {
    
    /**
     * Maneja el evento de login del formulario - Restringido a OWNER
     */
    async manejarLogin(email, password) {
        // 1. Validaciones básicas
        if (!email || !password) {
            return { exito: false, mensaje: "Todos los campos son obligatorios" };
        }

        // 2. Llamada al modelo (Autenticación + Perfil)
        const respuesta = await usuarioModel.login(email, password);

        if (respuesta.exito) {
            // 3. Validar si el rol es estrictamente 'owner'
            const rol = respuesta.perfil.rol.toLowerCase();

            if (rol === 'admin') {
                // Guardar info mínima necesaria
                sessionStorage.setItem('usuario_rol', rol);
                sessionStorage.setItem('usuario_nombre', respuesta.perfil.nombres);
                
                // Redirección al panel administrativo
                window.location.href = '/administracion.html';
                return { exito: true };
            } else {
                // 4. Si es un usuario válido pero NO es owner, cerramos sesión por seguridad
                await usuarioModel.logout();
                return { 
                    exito: false, 
                    mensaje: "Acceso denegado: Se requieren permisos de Propietario (Owner)." 
                };
            }
        }

        // Si el login falló en el modelo (correo o pass incorrectos)
        return respuesta;
    },

    /**
     * Middleware para proteger rutas privadas
     */
    async verificarAcceso() {
        const usuario = await usuarioModel.obtenerSesionActual();
        
        // Si no hay sesión o el rol no es owner, fuera.
        if (!usuario || usuario.perfil.rol.toLowerCase() !== 'admin') {
            await usuarioModel.logout();
            window.location.href = '../index.html';
            return;
        }
    }
};