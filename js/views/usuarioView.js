import { usuarioController } from '../controllers/usuarioController.js';

document.addEventListener('DOMContentLoaded', () => {
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const submitBtn = document.querySelector('button[type="button"]:not(#toggle-password)');
    const togglePasswordBtn = document.getElementById('toggle-password');
    const passwordIcon = document.getElementById('password-icon');

    /**
     * 1. Lógica exclusiva para Ver/Ocultar Contraseña
     * Esta función NO llama a ninguna validación, solo manipula el DOM.
     */
    if (togglePasswordBtn) {
        togglePasswordBtn.addEventListener('click', (e) => {
            // Bloqueamos cualquier acción de formulario o burbujeo
            e.preventDefault();
            e.stopPropagation();

            const isPassword = passwordInput.type === 'password';
            passwordInput.type = isPassword ? 'text' : 'password';

            // Cambio visual del icono
            passwordIcon.textContent = isPassword ? 'visibility_off' : 'visibility';
        });
    }

    /**
     * 2. Lógica de Autenticación (Solo para el botón de Ingresar)
     */
    const ejecutarLogin = async (e) => {
        // Aseguramos que el evento venga del botón de login o del Enter
        if (e) e.preventDefault();

        const email = emailInput.value.trim();
        const password = passwordInput.value.trim();

        if (!email || !password) {
            Swal.fire({
                icon: 'warning',
                title: 'Campos incompletos',
                text: 'Por favor, ingresa tu correo y contraseña.',
                confirmButtonColor: '#53B59D'
            });
            return;
        }

        // Feedback visual de carga en el botón de login
        const originalContent = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
            <span class="flex items-center justify-center">
                <svg class="animate-spin h-5 w-5 mr-3 text-white" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Verificando...
            </span>
        `;

        try {
            const resultado = await usuarioController.manejarLogin(email, password);

            if (!resultado.exito) {
                Swal.fire({
                    icon: 'error',
                    title: 'Acceso Denegado',
                    text: resultado.mensaje,
                    confirmButtonColor: '#162925'
                });

                submitBtn.disabled = false;
                submitBtn.innerHTML = originalContent;
            }
            // Si el login es exitoso, el controlador hace el redireccionamiento.
        } catch (error) {
            console.error("Error crítico:", error);
            Swal.fire({
                icon: 'error',
                title: 'Error de conexión',
                text: 'Hubo un problema al conectar con el servidor.',
                confirmButtonColor: '#162925'
            });
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalContent;
        }
    };

    // Asignación de eventos de Login
    submitBtn.addEventListener('click', ejecutarLogin);

    [emailInput, passwordInput].forEach(input => {
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') ejecutarLogin(e);
        });
    });
});