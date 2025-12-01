# 📊 Módulo de Importación Masiva de Pagos - Cobranzas V2

## ✅ **Instalación Completada**

Se ha creado un módulo completo para importar pagos masivos desde Excel a tu sistema de Cobranzas V2.

---

## 📁 **Archivos Creados:**

### 1. **Servicio Principal**
- `src/services/importacion-pagos.ts` (410 líneas)
  - Función `procesarImportacionPagos()` - Procesa el archivo Excel
  - Función `validarDatosImportacion()` - Valida datos antes de importar
  - Función `exportarResultadoJSON()` - Exporta reporte
  - Manejo completo de errores y casos especiales

### 2. **Componente UI**
- `src/components/cobranzas/ImportarPagosMasivosModal.tsx` (368 líneas)
  - Modal con drag & drop de archivos
  - Preview de datos cargados
  - Botón de validación
  - Reporte detallado con estadísticas
  - Exportación de reporte en JSON

### 3. **Integración**
- `src/pages/CobranzasV2.tsx` - Actualizado
  - Botón "Importar Excel" en el panel de acciones
  - Modal integrado

### 4. **Archivo de Ejemplo**
- `importacion/ejemplo-pagos-2025.csv`
  - Formato de ejemplo con datos de prueba

---

## 🚀 **Cómo Usar:**

### **Paso 1: Preparar tu Excel**

Tu archivo Excel debe tener este formato:

```
Padron | Enero | Febrero | Marzo | Abril | Mayo | Junio | Julio | Agosto | Septiembre | Octubre | Noviembre | Diciembre
-------|-------|---------|-------|-------|------|-------|-------|--------|------------|---------|-----------|----------
P00354 | 50.00 | 50.00   | 50.00 | 50.00 | 50.00| 50.00 |       |        |            |         |           |
P00358 |       |         |       | 20.00 |      |       |       |        |            |         |           |
P00399 |       |         |       | 50.00 | 50.00| 50.00 | 50.00 |        |            |         |           |
```

**Reglas:**
- ✅ Columna `Padron` es **obligatoria**
- ✅ Los montos deben ser números: `50`, `50.00`, `20.00`
- ✅ Celdas vacías = **no pagó ese mes** (se ignora)
- ✅ Formato: `.xlsx`, `.xls` o `.csv`

### **Paso 2: Generar los Cargos**

**IMPORTANTE:** Antes de importar, debes generar los cargos mensuales:

1. Ve a **Cobranzas V2**
2. Click en **"Generar Desde 2025"** (si es primera vez)
3. O click en **"Mes Actual"** para el mes corriente

Esto crea los cargos base para todos los empadronados activos.

### **Paso 3: Importar los Pagos**

1. Ve a **Cobranzas V2**
2. Click en **"Importar Excel"** (botón azul)
3. Selecciona el año (por defecto 2025)
4. **Arrastra o selecciona** tu archivo Excel
5. (Opcional) Click en **"Validar Datos"** para revisar errores
6. Click en **"Importar [X] Filas"**
7. ¡Espera a que termine!

### **Paso 4: Revisar el Reporte**

El sistema te mostrará:

- ✅ **Exitosos**: Pagos completos importados
- 💰 **Parciales**: Pagos que cubrieron parte de la deuda
- ⚠️ **Warnings**: Cargos ya pagados, otros problemas menores
- ❌ **Errores**: Empadronados no encontrados, cargos no generados

Puedes **descargar el reporte completo** en JSON.

---

## 🔍 **Lógica de Importación:**

### **Casos Manejados:**

1. **Pago Completo** (Excel: 50, Cargo: 50)
   - ✅ Se registra y aprueba automáticamente
   - ✅ El cargo queda en estado "pagado"

2. **Pago Parcial** (Excel: 30, Cargo: 50)
   - 💰 Se abona 30 al cargo
   - ⚠️ Quedan 20 pendientes
   - Se marca como "pago parcial" en el reporte

3. **Pago Mayor** (Excel: 60, Cargo: 50)
   - ⚠️ Se genera warning
   - ❌ No se importa (para evitar errores)

4. **Cargo Ya Pagado**
   - ⚠️ Se genera warning
   - ❌ No se importa

5. **Empadronado No Existe**
   - ❌ Error: "Empadronado no encontrado"

6. **Cargo No Generado**
   - ❌ Error: "No existe cargo para ese período"
   - 💡 Solución: Generar primero los cargos

---

## 📊 **Ejemplo de Reporte:**

```json
{
  "fecha": "2025-12-01T15:30:00",
  "resumen": {
    "totalFilas": 25,
    "totalPagosIntentados": 180,
    "exitosos": 165,
    "parciales": 5,
    "warnings": 8,
    "errores": 2,
    "montoTotalImportado": 8250.00
  },
  "exitosos": [
    { "numeroPadron": "P00354", "mes": "Enero", "monto": 50.00 }
  ],
  "parciales": [
    { "numeroPadron": "P00358", "mes": "Abril", "montoPagado": 20.00, "saldoRestante": 30.00 }
  ],
  "warnings": [
    { "numeroPadron": "P00399", "mes": "Mayo", "razon": "El cargo ya está pagado" }
  ],
  "errores": [
    { "numeroPadron": "P99999", "razon": "Empadronado no encontrado" }
  ]
}
```

---

## ⚙️ **Configuración Técnica:**

### **Librerías Instaladas:**
- ✅ `xlsx` - Para leer archivos Excel

### **Método de Pago:**
- Los pagos importados se registran con método: **"importacion_masiva"**
- Se aprueban **automáticamente** (sin revisión manual)
- El número de operación es: **"IMPORT-{padron}-{periodo}"**

### **Integración con Sistema:**
- ✅ Se integra automáticamente con `cobranzas_v2`
- ✅ Los pagos aparecen en el historial
- ✅ Las estadísticas se actualizan automáticamente
- ✅ Se recalculan los saldos de los cargos

---

## 🐛 **Solución de Problemas:**

### **Error: "Empadronado no encontrado"**
- Verifica que el número de padrón en el Excel coincida exactamente con el sistema
- Revisa espacios en blanco o caracteres especiales

### **Error: "No existe cargo para ese período"**
- Genera primero los cargos desde el botón "Generar Desde 2025"
- Verifica que el año seleccionado es correcto

### **Warning: "El cargo ya está pagado"**
- El mes ya fue pagado anteriormente
- Revisa el historial de pagos del empadronado

### **El archivo no se carga**
- Verifica que sea formato `.xlsx`, `.xls` o `.csv`
- Asegúrate que tenga la columna "Padron"
- Verifica que los nombres de las columnas de meses estén correctos

---

## 📝 **Notas Importantes:**

1. **Backup Recomendado:**
   - Antes de importar muchos datos, haz un backup de Firebase
   - Usa el script `scripts/backup-cobranzas-antigua.js`

2. **Proceso Irreversible:**
   - Los pagos aprobados automáticamente no se pueden revertir fácilmente
   - Valida bien tus datos antes de importar

3. **Rendimiento:**
   - Para archivos grandes (+100 filas), el proceso puede tomar varios minutos
   - No cierres el navegador durante la importación

4. **Año Configurable:**
   - Por defecto usa 2025
   - Puedes cambiarlo en el modal antes de importar

---

## ✅ **Checklist de Uso:**

- [ ] Generar cargos mensuales en Cobranzas V2
- [ ] Preparar Excel con formato correcto
- [ ] Validar que los números de padrón coincidan
- [ ] (Opcional) Hacer backup de Firebase
- [ ] Importar el archivo
- [ ] Revisar el reporte de importación
- [ ] Verificar algunos pagos manualmente
- [ ] Descargar reporte para tus registros

---

## 🎉 **¡Listo para Usar!**

El módulo está completamente funcional y listo para importar pagos masivos.

**Ubicación del botón:** 
`Cobranzas V2` → Panel de Acciones → Botón **"Importar Excel"** (azul)

**Prueba con el archivo de ejemplo:**
`importacion/ejemplo-pagos-2025.csv`

---

¿Necesitas ayuda o encontraste algún problema? Avísame y te ayudo a resolverlo. 🚀

