# 🧹 Guía de Limpieza Masiva de Cobranzas V2

## ⚠️ ADVERTENCIA IMPORTANTE

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

## 📋 Opción 1: Limpieza desde Firebase Console (RECOMENDADO)

### Paso 1: Hacer Backup Manual

1. Ve a [Firebase Console](https://console.firebase.google.com/)
2. Selecciona tu proyecto
3. Ve a **Realtime Database**
4. Busca el nodo `cobranzas_v2`
5. Click en el menú (⋮) → **Exportar JSON**
6. Guarda el archivo como `backup-cobranzas-v2-ANTES-DE-LIMPIAR.json`

### Paso 2: Eliminar Datos Manualmente

En Firebase Console, elimina estos nodos uno por uno:

1. `cobranzas_v2/charges` → Click derecho → **Eliminar**
2. `cobranzas_v2/pagos` → Click derecho → **Eliminar**
3. `cobranzas_v2/pagos_index` → Click derecho → **Eliminar**
4. `cobranzas_v2/periods` → Click derecho → **Eliminar**
5. `cobranzas_v2/ingresos` → Click derecho → **Eliminar**
6. `cobranzas_v2/egresos` → Click derecho → **Eliminar**

**⚠️ NO ELIMINES:** `cobranzas_v2/configuracion`

### Paso 3: Verificar

Después de eliminar, verifica que:
- ✅ El nodo `cobranzas_v2/configuracion` sigue existiendo
- ✅ Los empadronados no se tocaron
- ✅ El resto del sistema funciona

---

## 📋 Opción 2: Usar Script de Node.js

### Requisitos Previos

1. Tener `serviceAccountKey.json` en la raíz del proyecto
2. Tener Node.js instalado
3. Tener `firebase-admin` instalado: `npm install firebase-admin`

### Paso 1: Ejecutar Script de Estadísticas

```bash
cd gestoria-union-digital
node scripts/limpiar-cobranzas-v2.js
```

Esto mostrará:
- Cuántos registros hay en cada categoría
- Hará un backup automático
- Te pedirá confirmación antes de eliminar

### Paso 2: Modificar el Script para Ejecutar

Edita `scripts/limpiar-cobranzas-v2.js` y descomenta la línea:

```javascript
await limpiarDatos();
```

### Paso 3: Ejecutar Limpieza

```bash
node scripts/limpiar-cobranzas-v2.js
```

---

## 📋 Opción 3: Limpieza Selectiva (Solo Pagos y Charges)

Si solo quieres limpiar pagos y charges pero mantener ingresos/egresos:

### Desde Firebase Console:

1. Elimina solo: `cobranzas_v2/charges`
2. Elimina solo: `cobranzas_v2/pagos`
3. Elimina solo: `cobranzas_v2/pagos_index`
4. Elimina solo: `cobranzas_v2/periods`

**Mantén:** `ingresos` y `egresos` si quieres conservar el historial financiero.

---

## 🔄 Después de la Limpieza

### Paso 1: Regenerar Cargos

1. Ve a **Cobranzas V2** en tu aplicación
2. Click en **"Generar Desde 2025"** (o el año que corresponda)
3. Esto creará todos los cargos mensuales desde cero

### Paso 2: Reimportar Pagos (Opcional)

Si tienes un Excel con los pagos correctos:

1. Prepara tu Excel con el formato correcto (ver `FORMATO_EXCEL_PAGOS.md`)
2. Ve a **Cobranzas V2** → **"Importar Excel"**
3. Selecciona el año correcto
4. Importa los pagos

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

## ✅ Checklist Post-Limpieza

- [ ] Backup guardado en lugar seguro
- [ ] Datos eliminados correctamente
- [ ] Configuración preservada
- [ ] Empadronados intactos
- [ ] Cargos regenerados
- [ ] Pagos reimportados (si aplica)
- [ ] Sistema funcionando correctamente

---

## 📞 ¿Problemas?

Si encuentras algún problema:

1. **Restaura desde backup** usando Firebase Console
2. **Verifica los permisos** en `database.rules.json`
3. **Revisa la consola** del navegador para errores
4. **Contacta al desarrollador** con el error específico

---

**Última actualización:** Diciembre 2024






