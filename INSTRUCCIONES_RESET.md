# 🔄 Instrucciones para Resetear Pagos de Cobranzas V2

## ⚠️ IMPORTANTE

Este proceso elimina **TODOS los pagos** y resetea **TODOS los charges** a estado inicial (como si nadie hubiera pagado).

**Se elimina:**
- ✅ Todos los pagos de `cobranzas_v2/pagos`
- ✅ Todos los índices de `cobranzas_v2/pagos_index`
- ✅ Se resetean todos los charges (saldo = montoOriginal, montoPagado = 0)

**NO se elimina:**
- ✅ Configuración
- ✅ Ingresos/Egresos
- ✅ Periods
- ✅ Cualquier otro dato

---

## 📋 Paso 1: Crear serviceAccountKey.json

Para ejecutar el script desde terminal, necesitas las credenciales de Firebase Admin SDK:

1. Ve a: https://console.firebase.google.com/project/sis-jpusap/settings/serviceaccounts/adminsdk
2. Click en **"Generar nueva clave privada"**
3. Se descargará un archivo JSON
4. **Renombra** el archivo a `serviceAccountKey.json`
5. **Muévelo** a la raíz del proyecto `gestoria-union-digital/`
6. **⚠️ IMPORTANTE:** NO subas este archivo a Git (debe estar en .gitignore)

---

## 🚀 Paso 2: Ejecutar el Script

Una vez que tengas `serviceAccountKey.json` en la raíz del proyecto:

```bash
cd gestoria-union-digital
node scripts/resetear-pagos-cobranzas.js
```

El script:
1. Mostrará estadísticas de lo que va a eliminar
2. Eliminará todos los pagos
3. Eliminará todos los índices
4. Reseteará todos los charges
5. Mostrará un resumen

---

## ✅ Resultado Esperado

Después del reset:

- ✅ Todos los empadronados deben **todos los meses** (saldo = monto original)
- ✅ No hay pagos registrados
- ✅ Los charges están en estado `pendiente` o `moroso` según fecha de vencimiento
- ✅ La configuración sigue igual
- ✅ Todo lo demás sigue igual

---

## 🆘 Si Algo Sale Mal

1. **Restaura desde backup** usando Firebase Console
2. **Verifica** que `serviceAccountKey.json` esté en la raíz del proyecto
3. **Revisa** los errores en la consola

---

**Última actualización:** Diciembre 2024






