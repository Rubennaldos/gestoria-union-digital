# 🔄 Migración de Cobranzas Antiguo → Cobranzas V2

**Fecha:** ${new Date().toLocaleDateString('es-PE')}
**Estado:** ✅ Código actualizado - Pendiente limpieza en Firebase

---

## 📋 Resumen de Cambios Realizados

### ✅ 1. Actualización de `BillingConfigContext.tsx`
- **Antes:** Leía de `cobranzas/configuracion`
- **Ahora:** Lee de `cobranzas_v2/configuracion` ✅
- **Archivo:** `src/contexts/BillingConfigContext.tsx`

### ✅ 2. Actualización de `portal-asociado.ts`
- **Antes:** Leía de `cobranzas/cargos`
- **Ahora:** Lee de `cobranzas_v2/charges` ✅
- **Archivo:** `src/services/portal-asociado.ts`
- **Funciones actualizadas:**
  - `obtenerSeguimientoPagos()`
  - `obtenerResumenDeuda()`

### ✅ 3. Actualización de `database.rules.json`
- **Eliminado:** Nodo completo de `cobranzas` con sus reglas
- **Mantenido:** Solo `cobranzas_v2` con sus reglas ✅

---

## 🗂️ Archivos con Referencias Legacy (NO ACTIVOS)

Estos archivos contienen referencias al sistema antiguo pero **NO SE ESTÁN USANDO**:

### 1. `src/components/cobranzas/BandejaPagosEconomia.tsx`
- **Estado:** ❌ No usado en ninguna parte
- **Acción:** Se puede eliminar o actualizar si se desea usar en el futuro
- **Referencias:** `cobranzas/pagos`

### 2. `src/services/empadronados.ts`
- **Funciones legacy:**
  - `getCobranzasConfig()` - Lee de `cobranzas/configuracion`
  - `dedupePagosForAll()` - Lee de `cobranzas/pagos`
  - `cleanupPagosForAll()` - Lee de `cobranzas/pagos`
- **Estado:** ⚠️ Estas funciones parecen ser de limpieza/utilidades
- **Acción:** Verificar si se usan, si no, se pueden eliminar

### 3. `src/hooks/useFirebase.ts`
- **Referencias:** `cobranzas/charges`, `cobranzas/cierres`, `cobranzas/configuracion`
- **Estado:** ⚠️ Hook con funciones de generación de charges
- **Acción:** Revisar si este hook se usa activamente

### 4. `src/components/admin-seguridad/SancionesSeguridad.tsx`
- **Referencia:** `cobranzas/sanciones`
- **Estado:** ⚠️ Crea registros en el sistema antiguo
- **Acción:** Actualizar para que use `cobranzas_v2/sanciones` si se requiere

---

## 🎯 Sistema Activo: Cobranzas V2

### Archivos principales:
- ✅ `src/pages/CobranzasV2.tsx` (1,563 líneas)
- ✅ `src/services/cobranzas-v2.ts` (955 líneas)
- ✅ `src/types/cobranzas-v2.ts` (91 líneas)

### Componentes:
- ✅ `DetalleEmpadronadoModalV2.tsx`
- ✅ `RevisarPagoModal.tsx`
- ✅ `EnvioWhatsAppMasivoModal.tsx`

### Ruta activa:
- ✅ `/cobranzas_v2` (con redirect desde `/cobranzas-v2`)

---

## 🔥 Pasos para Eliminar el Sistema Antiguo de Firebase

### Paso 1: Backup (CRÍTICO)

#### Opción A: Usar script automático
```bash
# 1. Editar el archivo y completar las credenciales de Firebase
nano scripts/backup-cobranzas-antigua.js

# 2. Instalar dependencias si es necesario
npm install firebase

# 3. Ejecutar el backup
node scripts/backup-cobranzas-antigua.js

# 4. Verificar que se creó el archivo en backups/
ls -lh backups/
```

#### Opción B: Backup manual desde Firebase Console
1. Ir a Firebase Console → Realtime Database
2. Seleccionar el nodo `/cobranzas`
3. Click en el menú (⋮) → "Export JSON"
4. Guardar el archivo como `cobranzas-antigua-backup.json`

### Paso 2: Verificación de Funciones Legacy

Antes de eliminar el nodo en Firebase, verifica si estas funciones se usan:

```bash
# Buscar uso de funciones legacy
grep -r "dedupePagosForAll" src/
grep -r "cleanupPagosForAll" src/
grep -r "useFirebase" src/pages/
grep -r "BandejaPagosEconomia" src/
```

### Paso 3: Eliminar el Nodo en Firebase

**⚠️ ADVERTENCIA: Esta acción es IRREVERSIBLE**

1. Ir a Firebase Console → Realtime Database
2. Navegar al nodo `/cobranzas`
3. Click derecho → "Delete"
4. Confirmar la eliminación

### Paso 4: Desplegar Reglas Actualizadas

```bash
# Desplegar las nuevas reglas de seguridad
firebase deploy --only database
```

### Paso 5: Verificación Post-Eliminación

1. Probar el módulo de Cobranzas V2: `/cobranzas_v2`
2. Probar el Portal Asociado (pagos de cuotas)
3. Verificar que no hay errores en la consola del navegador
4. Revisar logs de Firebase para errores de permisos

---

## 📊 Estructura de Datos

### ❌ Sistema Antiguo (cobranzas/)
```
cobranzas/
├── configuracion/
├── cargos/{cargoId}
├── pagos/{pagoId}
├── pagos_index/{empadronadoId}/{periodo}
├── periods/{periodo}
├── charges/{YYYYMM}/{empId}/{chargeId}
├── cierres/{YYYYMM}
└── sanciones/{sancionId}
```

### ✅ Sistema Nuevo (cobranzas_v2/)
```
cobranzas_v2/
├── configuracion/
├── charges/{periodo}/{empadronadoId}/{chargeId}
├── pagos/{pagoId}
├── pagos_index/{empadronadoId}/{periodo}
├── periods/{periodo}/generated
├── ingresos/{ingresoId}
└── egresos/{egresoId}
```

---

## ✅ Checklist de Migración

- [x] Actualizar BillingConfigContext
- [x] Actualizar portal-asociado.ts
- [x] Actualizar database.rules.json
- [x] Crear script de backup
- [x] Documentar proceso de migración
- [ ] Verificar funciones legacy en empadronados.ts
- [ ] Verificar useFirebase.ts
- [ ] Actualizar SancionesSeguridad.tsx si es necesario
- [ ] Hacer backup del nodo cobranzas/
- [ ] Eliminar nodo cobranzas/ de Firebase
- [ ] Desplegar nuevas reglas de seguridad
- [ ] Probar sistema completo
- [ ] Eliminar archivos legacy del código (opcional)

---

## 🆘 Rollback (En caso de problemas)

Si algo sale mal después de eliminar el nodo:

### 1. Restaurar desde backup
```javascript
// En Firebase Console → Realtime Database
// 1. Seleccionar la raíz "/"
// 2. Click en menú (⋮) → "Import JSON"
// 3. Seleccionar el archivo de backup
// 4. Firebase restaurará el nodo completo
```

### 2. Revertir cambios de código
```bash
# Ver los commits recientes
git log --oneline -5

# Revertir al commit anterior a la migración
git revert HEAD
# O específicamente:
git revert <commit-hash>
```

### 3. Re-desplegar reglas antiguas
```bash
# Restaurar database.rules.json del git
git checkout HEAD~1 -- database.rules.json

# Desplegar
firebase deploy --only database
```

---

## 📞 Contacto

Si encuentras problemas durante la migración:
- Revisar logs de Firebase Console
- Verificar errores en la consola del navegador
- Revisar el archivo de backup antes de eliminar datos

---

## 📝 Notas Adicionales

- El sistema V2 tiene mejor estructura de datos (jerárquica por período)
- V2 incluye sistema de aprobación de pagos
- V2 se integra automáticamente con el módulo de Finanzas
- V2 tiene anti-duplicados mejorado
- V2 incluye gestión de ingresos y egresos

**Fecha de migración de código:** ${new Date().toLocaleDateString('es-PE')}
**Estado final:** Código actualizado, pendiente limpieza en Firebase

