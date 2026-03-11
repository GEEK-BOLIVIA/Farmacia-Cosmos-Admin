export const tailwindConfig = {
    darkMode: "class",
    theme: {
        extend: {
            colors: {
                "primary": "#137fec",
                "background-light": "#f6f7f8",
                "background-dark": "#101922",
            },
            fontFamily: {
                // "Inter" es mucho más formal y profesional que Manrope
                "display": ["Inter", "system-ui", "sans-serif"]
            },
            borderRadius: { 
                "DEFAULT": "0.25rem", 
                "lg": "0.5rem", 
                "xl": "0.75rem", 
                "full": "9999px" 
            },
        },
    },
};

export function aplicarTailwind() {
    if (window.tailwind) {
        window.tailwind.config = tailwindConfig;
    }
}