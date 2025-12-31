/**
 * Script para Resetear Pagos de Cobranzas V2
 * 
 * Este script:
 * 1. Elimina TODOS los pagos de cobranzas_v2/pagos
 * 2. Elimina TODOS los índices de cobranzas_v2/pagos_index
 * 3. Resetea TODOS los charges a estado inicial (como si nadie hubiera pagado)
 * 
 * NO elimina:
 * - Configuración
 * - Ingresos/Egresos
 * - Periods
 * - Cualquier otro dato
 * 
 * USO:
 * node scripts/resetear-pagos-cobranzas.js
 * 
 * REQUISITO:
 * Necesitas crear serviceAccountKey.json con las credenciales de Firebase Admin SDK
 * Obtenerlo desde: https://console.firebase.google.com/project/sis-jpusap/settings/serviceaccounts/adminsdk
 */

import admin from 'firebase-admin';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Inicializar Firebase Admin
if (!admin.apps.length) {
  // Intentar cargar serviceAccountKey.json
  const serviceAccountPath = path.join(__dirname, '..', 'serviceAccountKey.json');
  
  if (!fs.existsSync(serviceAccountPath)) {
    console.error('❌ Error: No se encontró serviceAccountKey.json');
    console.error('');
    console.error('📋 Para crear serviceAccountKey.json:');
    console.error('   1. Ve a: https://console.firebase.google.com/project/sis-jpusap/settings/serviceaccounts/adminsdk');
    console.error('   2. Click en "Generar nueva clave privada"');
    console.error('   3. Guarda el archivo JSON como "serviceAccountKey.json" en la raíz del proyecto');
    console.error('   4. Vuelve a ejecutar este script');
    console.error('');
    process.exit(1);
  }
  
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://sis-jpusap-default-rtdb.firebaseio.com'
  });
}

const db = admin.database();
const BASE_PATH = 'cobranzas_v2';

/**
 * Obtener estadísticas antes del reset
 */
async function obtenerEstadisticas() {
  console.log('📊 Analizando datos actuales...\n');
  
  try {
    const [chargesSnap, pagosSnap, pagosIndexSnap] = await Promise.all([
      db.ref(`${BASE_PATH}/charges`).once('value'),
      db.ref(`${BASE_PATH}/pagos`).once('value'),
      db.ref(`${BASE_PATH}/pagos_index`).once('value')
    ]);
    
    const stats = {
      charges: 0,
      pagos: 0,
      pagosIndex: 0
    };
    
    // Contar charges
    if (chargesSnap.exists()) {
      const charges = chargesSnap.val();
      for (const periodo in charges) {
        for (const empId in charges[periodo]) {
          stats.charges += Object.keys(charges[periodo][empId] || {}).length;
        }
      }
    }
    
    // Contar pagos
    if (pagosSnap.exists()) {
      stats.pagos = Object.keys(pagosSnap.val()).length;
    }
    
    // Contar pagos_index
    if (pagosIndexSnap.exists()) {
      const pagosIndex = pagosIndexSnap.val();
      for (const empId in pagosIndex) {
        stats.pagosIndex += Object.keys(pagosIndex[empId] || {}).length;
      }
    }
    
    console.log(`   📋 Charges: ${stats.charges}`);
    console.log(`   💰 Pagos: ${stats.pagos}`);
    console.log(`   🔍 Pagos Index: ${stats.pagosIndex}`);
    console.log('');
    
    return stats;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    throw error;
  }
}

/**
 * Resetear todos los pagos y charges
 */
async function resetearPagosCobranzas() {
  try {
    console.log('🔄 Iniciando reset de pagos de cuotas mensuales...\n');
    
    // Paso 1: Eliminar todos los pagos
    console.log('   Paso 1/3: Eliminando todos los pagos...');
    await db.ref(`${BASE_PATH}/pagos`).remove();
    console.log('   ✅ Pagos eliminados');
    
    // Paso 2: Eliminar todos los índices de pagos
    console.log('   Paso 2/3: Eliminando índices de pagos...');
    await db.ref(`${BASE_PATH}/pagos_index`).remove();
    console.log('   ✅ Índices eliminados');
    
    // Paso 3: Obtener y resetear todos los charges
    console.log('   Paso 3/3: Reseteando charges a estado inicial...');
    const chargesSnapshot = await db.ref(`${BASE_PATH}/charges`).once('value');
    
    if (!chargesSnapshot.exists()) {
      console.log('   ⚠️  No hay charges para resetear');
      return;
    }
    
    const allCharges = chargesSnapshot.val();
    const currentTime = Date.now();
    let chargesReseteados = 0;
    const updates = {};
    
    // Preparar todas las actualizaciones
    for (const periodo in allCharges) {
      for (const empId in allCharges[periodo]) {
        for (const chargeId in allCharges[periodo][empId]) {
          const charge = allCharges[periodo][empId][chargeId];
          
          // Determinar estado según fecha de vencimiento
          const estaVencido = currentTime > charge.fechaVencimiento;
          const nuevoEstado = estaVencido ? 'moroso' : 'pendiente';
          
          // Preparar actualización
          const chargePath = `${BASE_PATH}/charges/${periodo}/${empId}/${chargeId}`;
          updates[chargePath] = {
            saldo: charge.montoOriginal,
            montoPagado: 0,
            estado: nuevoEstado,
            esMoroso: estaVencido
          };
          
          // Si tiene montoMorosidad, resetearlo a 0
          if (charge.montoMorosidad !== undefined) {
            updates[chargePath].montoMorosidad = 0;
          }
          
          chargesReseteados++;
        }
      }
    }
    
    // Aplicar todas las actualizaciones de una vez
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }
    
    console.log(`   ✅ ${chargesReseteados} charges reseteados`);
    console.log('');
    
    console.log('═══════════════════════════════════════════════════════');
    console.log('✅ RESET COMPLETADO EXITOSAMENTE');
    console.log('═══════════════════════════════════════════════════════');
    console.log('');
    console.log('📋 Resumen:');
    console.log(`   - Pagos eliminados`);
    console.log(`   - Índices eliminados`);
    console.log(`   - ${chargesReseteados} charges reseteados`);
    console.log('');
    console.log('✅ Todos los empadronados ahora deben todos los meses');
    console.log('✅ La configuración se mantiene intacta');
    console.log('✅ Los demás datos se mantienen intactos');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error durante el reset:', error);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🔄 RESET AUTOMÁTICO DE PAGOS DE CUOTAS MENSUALES');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('Este script:');
  console.log('  ✅ Elimina TODOS los pagos');
  console.log('  ✅ Elimina TODOS los índices de pagos');
  console.log('  ✅ Resetea TODOS los charges (como si nadie hubiera pagado)');
  console.log('');
  console.log('NO elimina:');
  console.log('  ✅ Configuración');
  console.log('  ✅ Ingresos/Egresos');
  console.log('  ✅ Periods');
  console.log('  ✅ Cualquier otro dato');
  console.log('');
  
  try {
    // Obtener estadísticas
    const stats = await obtenerEstadisticas();
    
    if (stats.charges === 0 && stats.pagos === 0) {
      console.log('✅ No hay datos para resetear. La base de datos ya está limpia.');
      process.exit(0);
    }
    
    // Ejecutar reset
    await resetearPagosCobranzas();
    
    console.log('🎉 Proceso completado exitosamente');
    process.exit(0);
    
  } catch (error) {
    console.error('\n💥 Error fatal:', error);
    process.exit(1);
  }
}

// Ejecutar
main();

export { resetearPagosCobranzas, obtenerEstadisticas };
