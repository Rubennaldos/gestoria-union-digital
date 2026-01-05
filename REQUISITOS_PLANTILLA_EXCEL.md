# 📋 Requisitos para la Plantilla de Importación de Pagos

Para que el sistema procese correctamente los pagos masivos sin errores, tu archivo Excel debe cumplir con los siguientes requisitos:

## 1. Estructura de Columnas (Encabezados)

La **primera fila** de tu Excel debe contener los nombres de las columnas. El sistema es flexible con los nombres, pero te recomiendo usar los siguientes para evitar confusiones:

| Columna Obligatoria | Columnas de Meses (Enero a Diciembre) |
| :--- | :--- |
| **Padron** | **Enero**, **Febrero**, **Marzo**, **Abril**, **Mayo**, **Junio**, **Julio**, **Agosto**, **Septiembre**, **Octubre**, **Noviembre**, **Diciembre** |

### Variantes aceptadas:
*   **Para Padrón:** Puedes usar `Padron`, `Padrón`, `Nro`, `Numero`, `N° Padron`.
*   **Para Meses:** Puedes usar el nombre completo (`Enero`), el corto (`Ene`), o el número (`01`).

---

## 2. Formato de los Datos

### A. Columna de Padrón
*   **Formato:** Puede ser el número solo (`123`) o con prefijo (`P00123`).
*   **Importante:** El sistema extraerá solo los números. Asegúrate de que el número coincida con el que está registrado en el sistema.
*   **Filas saltadas:** Si un empadronado no está en el Excel, el sistema simplemente no registrará pagos para él (seguirá debiendo). No es necesario incluirlos a todos si no pagaron nada.

### B. Columnas de Meses (Montos)
*   **Solo Números:** No pongas símbolos de moneda como "S/" o "$". Pon solo el número (ej: `50`, `20.50`).
*   **Celdas Vacías:** Si un empadronado **no ha pagado** un mes, deja la celda **totalmente vacía**. No pongas "0", ni "-", ni "no pagó".
*   **Pagos Parciales:** Si la cuota es de 50 y solo depositó 20, pon `20`. El sistema registrará el pago parcial y restará esos 20 de la deuda (quedará debiendo 30).

---

## 3. Reglas de Oro para evitar el "Zafarrancho"

1.  **Sin Filas de Totales:** No incluyas filas al final con la suma total de los pagos. El sistema tratará de procesar esa fila como si fuera un empadronado y dará error.
2.  **Un solo Año por Importación:** Asegúrate de que todos los pagos en el Excel correspondan al año que seleccionas en el sistema antes de importar (por defecto 2025).
3.  **Sin Celdas Combinadas:** No uses celdas combinadas en los encabezados ni en los datos.
4.  **Hojas de Cálculo:** El sistema solo leerá la **primera hoja** de tu archivo Excel.

---

## 💡 Recomendación de uso

1.  **Usa la "Plantilla Vacía":** Te recomiendo descargar la plantilla directamente desde el botón **"Plantilla Vacía"** que agregamos en el módulo de Cobranzas V2. Esa plantilla ya viene con todos los padrones ordenados y los encabezados correctos.
2.  **Copia y Pega con cuidado:** Si vas a copiar datos de otro cuadro, usa la opción **"Pegar Valores"** en Excel para no arrastrar formatos extraños o fórmulas.
3.  **Valida antes de Importar:** Usa el botón **"Validar Datos"** en el sistema antes de darle a importar. El sistema te avisará si detecta nombres de columnas incorrectos o formatos de números inválidos.

---
*Última actualización: Diciembre 2025*




