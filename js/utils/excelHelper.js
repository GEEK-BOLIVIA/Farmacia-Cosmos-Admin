// excelHelper.js
export const aplicarEstiloCabecera = (ws, range) => {
    // Usamos el objeto XLSX que cargó el CDN en el window
    const excelUtils = window.XLSX.utils; 

    for (let C = range.s.c; C <= range.e.c; ++C) {
        const address = excelUtils.encode_col(C) + "2"; 
        if (!ws[address]) continue;

        ws[address].s = {
            fill: { 
                patternType: "solid", // Algunas versiones requieren especificar el tipo de patrón
                fgColor: { rgb: "5EC8AA" } 
            },
            font: { 
                name: 'Arial', 
                sz: 11, 
                bold: true, 
                color: { rgb: "FFFFFF" } 
            },
            alignment: { 
                vertical: "center", 
                horizontal: "center" 
            },
            border: { 
                bottom: { style: "thin", color: { rgb: "48b496" } } 
            }
        };
    }
};