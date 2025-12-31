# 🧹 Guía de Limpieza Masiva de Cobranzas V2

## ⚠️ ADVERTENCIA CRÍTICA

Este proceso **ELIMINA PERMANENTEMENTE** todos los datos de cobranzas_v2 excepto la configuración.

**Se eliminará:**
- ✅ Todos los charges (boletas/cargos mensuales)
- ✅ Todos los pagos registrados
- ✅ Todos los ingresos en finanzas relacionados
- ✅ Todos los egresos relacionados
- ✅ Todos los periods (cierres mensuales)
- ✅ Todos los índices de pagos

**Se MANTENDRÁ:**
- ✅ La configuración (monto mensual, días de vencimiento, etc.)
- ✅ Los empadronados (no se tocan)
- ✅ Todos los demás módulos del sistema

---

## 🚀 Método Rápido: Desde la Consola del Navegador (RECOMENDADO)

### Paso 1: Hacer Backup Manual (IMPORTANTE)

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Realtime Database**
4. Busca el nodo `cobranzas_v2`
5. Click en el menú (⋮) → **Exportar JSON**
6. Guarda el archivo como `backup-cobranzas-v2-ANTES-DE-LIMPIAR.json`
7. **Guarda este archivo en un lugar seguro**

### Paso 2: Ver Estadísticas

1. Abre tu aplicación en el navegador
2. Ve a cualquier página (por ejemplo, Cobranzas V2)
3. Abre la consola del navegador (F12 → Console)
4. Ejecuta:

```javascript
// Ver estadísticas sin eliminar nada
verEstadisticasCobranzas().then(stats => {
  console.log('📊 Estadísticas:', stats);
});
```

Esto mostrará cuántos registros hay en cada categoría.

### Paso 3: Ejecutar Limpieza

Si estás seguro de proceder, ejecuta:

```javascript
// Ejecutar limpieza completa (pedirá confirmación)
limpiarCobranzasV2()
```

Esto:
1. Mostrará las estadísticas
2. Pedirá confirmación
3. Eliminará todos los datos
4. Mostrará un resumen

---

## 📋 Método Alternativo: Desde Firebase Console

### Paso 1: Hacer Backup

Igual que en el método anterior.

### Paso 2: Eliminar Manualmente

En Firebase Console, elimina estos nodos uno por uno:

1. `cobranzas_v2/charges` → Click derecho → **Eliminar**
2. `cobranzas_v2/pagos` → Click derecho → **Eliminar**
3. `cobranzas_v2/pagos_index` → Click derecho → **Eliminar**
4. `cobranzas_v2/periods` → Click derecho → **Eliminar**
5. `cobranzas_v2/ingresos` → Click derecho → **Eliminar**
6. `cobranzas_v2/egresos` → Click derecho → **Eliminar**

**⚠️ NO ELIMINES:** `cobranzas_v2/configuracion`

---

## 🔄 Después de la Limpieza

### Paso 1: Regenerar Cargos

1. Ve a **Cobranzas V2** en tu aplicación
2. Click en **"Generar Desde 2025"** (o el año que corresponda)
3. Esto creará todos los cargos mensuales desde cero

### Paso 2: Reimportar Pagos (Opcional)

Si tienes un Excel con los pagos correctos:

1. Prepara tu Excel con el formato correcto (ver `FORMATO_EXCEL_PAGOS.md`)
2. Asegúrate de que:
   - La primera fila tenga el encabezado "Padron"
   - Los nombres de meses sean exactos: Enero, Febrero, etc.
   - Los montos sean números puros (sin símbolos)
3. Ve a **Cobranzas V2** → **"Importar Excel"**
4. Selecciona el año correcto
5. Importa los pagos

---

## 🆘 Restaurar desde Backup

Si algo sale mal y necesitas restaurar:

### Desde Firebase Console:

1. Ve a **Realtime Database**
2. Click en el menú (⋮) → **Importar JSON**
3. Selecciona tu archivo de backup
4. Confirma la importación

**⚠️ Esto SOBRESCRIBIRÁ todos los datos actuales**

---

## ✅ Checklist Completo

### Antes de Limpiar:

- [ ] Backup guardado en lugar seguro
- [ ] Backup verificado (abre el JSON y revisa que tenga datos)
- [ ] Confirmado que quieres empezar desde cero
- [ ] Excel con pagos preparado (si vas a reimportar)

### Durante la Limpieza:

- [ ] Estadísticas revisadas
- [ ] Confirmación dada
- [ ] Limpieza ejecutada
- [ ] Mensaje de éxito recibido

### Después de Limpiar:

- [ ] Configuración verificada (debe seguir existiendo)
- [ ] Empadronados verificados (no deben haberse tocado)
- [ ] Cargos regenerados
- [ ] Pagos reimportados (si aplica)
- [ ] Sistema funcionando correctamente

---

## 📊 Ejemplo de Uso desde Consola

```javascript
// 1. Ver estadísticas primero
verEstadisticasCobranzas().then(stats => {
  console.log('Charges:', stats.charges);
  console.log('Pagos:', stats.pagos);
  console.log('Total:', stats.total);
});

// 2. Si estás seguro, ejecutar limpieza
limpiarCobranzasV2()
  .then(() => {
    console.log('✅ Limpieza completada');
  })
  .catch(error => {
    console.error('❌ Error:', error);
  });
```

---

## 🐛 Solución de Problemas

### Error: "No se puede eliminar"

- Verifica que tengas permisos de administrador
- Verifica las reglas de seguridad en `database.rules.json`

### Error: "Configuración eliminada"

- Restaura desde backup
- O recrea la configuración manualmente desde la aplicación

### Los cargos no se regeneran

- Verifica que los empadronados estén habilitados
- Verifica que la configuración exista
- Revisa la consola del navegador para errores

---

## 📞 ¿Necesitas Ayuda?

Si encuentras algún problema:

1. **NO PANIQUEES** - Tienes el backup
2. **Restaura desde backup** usando Firebase Console
3. **Revisa los errores** en la consola del navegador
4. **Contacta al desarrollador** con el error específico

---

**Última actualización:** Diciembre 2024



