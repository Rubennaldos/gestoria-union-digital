# 📋 Formato de Excel para Importación Masiva de Pagos

## ⚠️ IMPORTANTE: Formato Requerido

Esta guía te explica **exactamente** cómo debe estar estructurado tu archivo Excel para que la importación funcione correctamente.

---

## 📊 Estructura del Excel

### **Columnas Requeridas:**

Tu Excel **DEBE** tener estas columnas en la **primera fila** (encabezados):

| Columna Obligatoria | Columnas de Meses (al menos una) |
|---------------------|----------------------------------|
| **Padron** (o variantes) | **Enero**, **Febrero**, **Marzo**, **Abril**, **Mayo**, **Junio**, **Julio**, **Agosto**, **Septiembre**, **Octubre**, **Noviembre**, **Diciembre** |

---

## ✅ Nombres de Columnas Aceptados

### **Columna de Padrón (OBLIGATORIA):**

El sistema acepta cualquiera de estos nombres para la columna de padrón:

- ✅ `Padron`
- ✅ `Padrón` (con tilde)
- ✅ `padron` (minúsculas)
- ✅ `PADRON` (mayúsculas)
- ✅ `NumeroPadron`
- ✅ `Numero Padron`
- ✅ `N° Padron`
- ✅ `Nro Padron`
- ✅ `Nro`
- ✅ `N°`
- ✅ `Numero`

**💡 Recomendación:** Usa `Padron` (sin tilde) para evitar problemas.

### **Columnas de Meses:**

Cada mes puede tener cualquiera de estos nombres:

#### **Enero:**
- `Enero`, `enero`, `ENERO`, `Ene`, `ENE`, `01`, `1`

#### **Febrero:**
- `Febrero`, `febrero`, `FEBRERO`, `Feb`, `FEB`, `02`, `2`

#### **Marzo:**
- `Marzo`, `marzo`, `MARZO`, `Mar`, `MAR`, `03`, `3`

#### **Abril:**
- `Abril`, `abril`, `ABRIL`, `Abr`, `ABR`, `04`, `4`

#### **Mayo:**
- `Mayo`, `mayo`, `MAYO`, `May`, `MAY`, `05`, `5`

#### **Junio:**
- `Junio`, `junio`, `JUNIO`, `Jun`, `JUN`, `06`, `6`

#### **Julio:**
- `Julio`, `julio`, `JULIO`, `Jul`, `JUL`, `07`, `7`

#### **Agosto:**
- `Agosto`, `agosto`, `AGOSTO`, `Ago`, `AGO`, `08`, `8`

#### **Septiembre:**
- `Septiembre`, `septiembre`, `SEPTIEMBRE`, `Sep`, `SEP`, `Sept`, `09`, `9`

#### **Octubre:**
- `Octubre`, `octubre`, `OCTUBRE`, `Oct`, `OCT`, `10`

#### **Noviembre:**
- `Noviembre`, `noviembre`, `NOVIEMBRE`, `Nov`, `NOV`, `11`

#### **Diciembre:**
- `Diciembre`, `diciembre`, `DICIEMBRE`, `Dic`, `DIC`, `12`

**💡 Recomendación:** Usa los nombres completos con mayúscula inicial: `Enero`, `Febrero`, `Marzo`, etc.

---

## 📝 Formato de Datos

### **Números de Padrón:**

- ✅ **Aceptado:** `123`, `P123`, `P00123`, `p00123`, `P-123`
- ✅ El sistema extrae automáticamente los números
- ❌ **NO dejes celdas vacías** en la columna de padrón

**Ejemplos válidos:**
```
Padron
P00354
P00358
123
P-001
```

### **Montos de Pago:**

- ✅ **Aceptado:** `50`, `50.00`, `50.5`, `20.25`
- ✅ Puedes usar números sin decimales o con decimales
- ✅ **Celdas vacías = No pagó ese mes** (se ignora, no es error)
- ❌ **NO uses símbolos de moneda** en las celdas: `S/ 50` o `$50`
- ❌ **NO uses texto:** `cincuenta`, `pagado`, `si`, etc.

**Ejemplos válidos:**
```
Enero
50
50.00
20.5
30.25
```

**Ejemplos NO válidos:**
```
❌ S/ 50
❌ $50
❌ "50"
❌ cincuenta
❌ pagado
```

---

## 📋 Ejemplo Completo de Excel

### **Formato Recomendado (Simple):**

| Padron | Enero | Febrero | Marzo | Abril | Mayo | Junio | Julio | Agosto | Septiembre | Octubre | Noviembre | Diciembre |
|--------|-------|---------|-------|-------|------|-------|-------|---------|------------|---------|-----------|-----------|
| P00354 | 50    | 50      | 50    | 50    | 50   | 50    |       |         |            |         |           |           |
| P00358 |       |         |       | 20    |      |       |       |         |            |         |           |           |
| P00399 |       |         |       | 50    | 50   | 50    | 50    |         |            |         |           |           |
| 123    | 50.00 | 50.00   |       |       |      |       |       |         |            |         |           |           |

### **Formato Alternativo (Con nombres cortos):**

| Nro | Ene | Feb | Mar | Abr | May | Jun | Jul | Ago | Sep | Oct | Nov | Dic |
|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|-----|
| P00354 | 50 | 50 | 50 | 50 | 50 | 50 | | | | | | |
| P00358 | | | | 20 | | | | | | | | | |

---

## ⚠️ Errores Comunes y Cómo Evitarlos

### ❌ **Error 1: "No se encontró columna de padrón"**

**Causa:** El nombre de la columna no coincide con ninguno de los alias aceptados.

**Solución:**
- Verifica que la primera fila tenga exactamente uno de estos nombres: `Padron`, `Padrón`, `Nro`, `Numero`, etc.
- **NO uses:** `Número de Padrón`, `Código`, `ID`, `Identificador`, etc.

### ❌ **Error 2: "No se encontraron columnas de meses"**

**Causa:** Los nombres de las columnas de meses no coinciden con los alias aceptados.

**Solución:**
- Usa nombres exactos: `Enero`, `Febrero`, `Marzo`, etc.
- **NO uses:** `Enero 2025`, `Mes 1`, `01/2025`, `Enero-2025`, etc.
- Evita espacios extra o caracteres especiales

### ❌ **Error 3: "Número de padrón vacío"**

**Causa:** Hay filas con la celda de padrón vacía.

**Solución:**
- Asegúrate de que TODAS las filas tengan un número de padrón
- Elimina filas vacías al final del Excel
- Verifica que no haya espacios en blanco

### ❌ **Error 4: "Empadronado no encontrado en el sistema"**

**Causa:** El número de padrón en el Excel no existe en el sistema.

**Solución:**
- Verifica que el número de padrón coincida exactamente con el sistema
- El sistema busca por número (ej: `P00354` y `354` son equivalentes)
- Revisa que el empadronado esté activo en el sistema

### ❌ **Error 5: Montos no se importan**

**Causa:** Los montos tienen formato incorrecto (texto, símbolos, etc.)

**Solución:**
- Usa SOLO números: `50`, `50.00`, `20.5`
- **NO uses:** `S/ 50`, `$50`, `"50"`, `cincuenta`
- Si Excel formateó las celdas como texto, cambia el formato a "Número"

### ❌ **Error 6: "No existe cargo para ese período"**

**Causa:** Los cargos mensuales no han sido generados para ese año/mes.

**Solución:**
1. Ve a **Cobranzas V2**
2. Click en **"Generar Desde 2025"** (o el año correspondiente)
3. O click en **"Mes Actual"** para generar el mes actual
4. Luego intenta importar nuevamente

---

## ✅ Checklist Antes de Importar

Antes de importar tu Excel, verifica:

- [ ] **Primera fila tiene encabezados:** `Padron`, `Enero`, `Febrero`, etc.
- [ ] **Columna de padrón:** Tiene uno de los nombres aceptados
- [ ] **Columnas de meses:** Tienen nombres exactos (Enero, Febrero, etc.)
- [ ] **Números de padrón:** Todas las filas tienen un padrón válido
- [ ] **Montos:** Son números puros (sin símbolos, sin texto)
- [ ] **Formato de archivo:** `.xlsx`, `.xls` o `.csv`
- [ ] **Cargos generados:** Ya generaste los cargos mensuales en Cobranzas V2
- [ ] **Año correcto:** Verificaste que el año en el modal coincide con tus datos

---

## 🔧 Cómo Corregir un Excel con Errores

### **Paso 1: Verificar Encabezados**

1. Abre tu Excel
2. Verifica que la **primera fila** tenga exactamente:
   - Una columna de padrón: `Padron` (o variante aceptada)
   - Columnas de meses: `Enero`, `Febrero`, etc. (nombres exactos)

### **Paso 2: Limpiar Datos de Padrón**

1. Selecciona la columna de padrón
2. Elimina espacios en blanco al inicio/final
3. Verifica que no haya celdas vacías
4. Si usas formato `P001`, asegúrate de que sea consistente

### **Paso 3: Limpiar Montos**

1. Selecciona todas las columnas de meses
2. Cambia el formato de celda a **"Número"** (no texto)
3. Elimina símbolos de moneda (`S/`, `$`)
4. Elimina comillas o espacios
5. Si una celda está vacía (no pagó), déjala vacía (no pongas `0`)

### **Paso 4: Validar en el Sistema**

1. Abre el modal de importación
2. Carga tu Excel
3. Click en **"Validar Datos"** antes de importar
4. Revisa los errores que aparezcan
5. Corrige el Excel según los errores
6. Vuelve a validar hasta que no haya errores

---

## 📊 Ejemplo de Excel Correcto (CSV)

Si prefieres usar CSV, aquí tienes un ejemplo:

```csv
Padron,Enero,Febrero,Marzo,Abril,Mayo,Junio,Julio,Agosto,Septiembre,Octubre,Noviembre,Diciembre
P00354,50,50,50,50,50,50,,,,
P00358,,,,20,,,,,,
P00399,,,,50,50,50,50,,,,
123,50.00,50.00,,,,,,,,
```

**Nota:** En CSV, las celdas vacías se dejan sin nada (no pongas espacios).

---

## 🎯 Resumen Rápido

### ✅ **HACER:**
- Usar `Padron` como nombre de columna
- Usar `Enero`, `Febrero`, etc. para meses
- Usar números puros: `50`, `50.00`
- Dejar celdas vacías si no pagó ese mes
- Generar cargos antes de importar

### ❌ **NO HACER:**
- Usar nombres de columnas personalizados
- Usar símbolos de moneda en las celdas
- Usar texto en lugar de números
- Dejar filas con padrón vacío
- Importar sin generar cargos primero

---

## 📞 ¿Necesitas Ayuda?

Si después de seguir esta guía sigues teniendo problemas:

1. **Descarga el reporte de errores** después de intentar importar
2. Revisa qué errores específicos aparecen
3. Corrige el Excel según los errores
4. Vuelve a intentar

El sistema te mostrará exactamente qué filas y qué columnas tienen problemas.

---

**Última actualización:** Diciembre 2024

