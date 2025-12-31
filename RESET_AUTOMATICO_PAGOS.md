# 🔄 Reset Automático de Pagos de Cuotas Mensuales

## ✅ Configuración Actual

Se ha configurado un **reset automático** que se ejecuta **una sola vez** al cargar la aplicación.

### ¿Qué hace?

1. ✅ **Elimina TODOS los pagos** de `cobranzas_v2/pagos`
2. ✅ **Elimina todos los índices** de `cobranzas_v2/pagos_index`
3. ✅ **Resetea TODOS los charges** a estado inicial:
   - `saldo = montoOriginal` (deben el monto completo)
   - `montoPagado = 0` (nadie ha pagado)
   - `estado = 'pendiente'` o `'moroso'` (según fecha de vencimiento)
   - `esMoroso = true/false` (según fecha de vencimiento)

### ¿Qué NO elimina?

- ✅ **Configuración** (se mantiene intacta)
- ✅ **Ingresos/Egresos** de finanzas (se mantienen)
- ✅ **Periods** (se mantienen)
- ✅ **Empadronados** (no se tocan)
- ✅ **Cualquier otro dato** (se mantiene)

---

## 🚀 Ejecución Automática

El reset se ejecuta **automáticamente** la primera vez que se carga la aplicación después de este cambio.

**Protección:** Solo se ejecuta una vez gracias a `localStorage`. Si quieres ejecutarlo nuevamente, sigue las instrucciones abajo.

---

## 🔄 Ejecutar Manualmente (Si Necesitas)

### Opción 1: Desde la Consola del Navegador

1. Abre la consola (F12 → Console)
2. Ejecuta:

```javascript
resetearPagosCobranzas()
```

### Opción 2: Resetear el Flag y Recargar

1. Abre la consola (F12 → Console)
2. Ejecuta:

```javascript
localStorage.removeItem('pagos_reseteados');
location.reload();
```

Esto borrará el flag y recargará la página, ejecutando el reset nuevamente.

---

## 📋 Resultado Esperado

Después del reset:

- ✅ Todos los empadronados deben **todos los meses** (saldo = monto original)
- ✅ No hay pagos registrados
- ✅ Los charges están en estado `pendiente` o `moroso` según fecha de vencimiento
- ✅ La configuración sigue igual
- ✅ Todo lo demás sigue igual

---

## ⚠️ Importante

- El reset es **irreversible** (excepto restaurando desde backup)
- Se ejecuta **automáticamente** la primera vez
- Después de ejecutarse, **no se volverá a ejecutar** automáticamente
- Si necesitas ejecutarlo nuevamente, usa los métodos manuales arriba

---

## 🆘 Si Algo Sale Mal

1. **Restaura desde backup** usando Firebase Console
2. **Verifica la consola** del navegador para errores
3. **Ejecuta manualmente** desde consola si es necesario

---

**Última actualización:** Diciembre 2024



