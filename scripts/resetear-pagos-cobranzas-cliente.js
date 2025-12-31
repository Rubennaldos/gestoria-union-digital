/**
 * Script para Resetear Pagos de Cobranzas V2 (Usando credenciales del cliente)
 * 
 * Este script usa las credenciales del cliente en lugar de Admin SDK
 * No requiere serviceAccountKey.json
 * 
 * USO:
 * node scripts/resetear-pagos-cobranzas-cliente.js
 */

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, remove, get, update } from 'firebase/database';

// Configuración de Firebase (desde firebase.ts)
const firebaseConfig = {
  apiKey: "AIzaSyBXcToF3ieWgLHOoVE44vShZS5whV4U1Xw",
  authDomain: "sis-jpusap.firebaseapp.com",
  databaseURL: "https://sis-jpusap-default-rtdb.firebaseio.com",
  projectId: "sis-jpusap",
  storageBucket: "sis-jpusap.firebasestorage.app",
  messagingSenderId: "784716205213",
  appId: "1:784716205213:web:de3a8dce709518cc841874",
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const BASE_PATH = 'cobranzas_v2';

/**
 * Obtener estadísticas antes del reset
 */
async function obtenerEstadisticas() {
  console.log('📊 Analizando datos actuales...\n');
  
  try {
    const [chargesSnap, pagosSnap, pagosIndexSnap] = await Promise.all([
      get(ref(db, `${BASE_PATH}/charges`)),
      get(ref(db, `${BASE_PATH}/pagos`)),
      get(ref(db, `${BASE_PATH}/pagos_index`))
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
    await remove(ref(db, `${BASE_PATH}/pagos`));
    console.log('   ✅ Pagos eliminados');
    
    // Paso 2: Eliminar todos los índices de pagos
    console.log('   Paso 2/3: Eliminando índices de pagos...');
    await remove(ref(db, `${BASE_PATH}/pagos_index`));
    console.log('   ✅ Índices eliminados');
    
    // Paso 3: Obtener y resetear todos los charges
    console.log('   Paso 3/3: Reseteando charges a estado inicial...');
    const chargesSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    
    if (!chargesSnapshot.exists()) {
      console.log('   ⚠️  No hay charges para resetear');
      return;
    }
    
    const allCharges = chargesSnapshot.val();
    const currentTime = Date.now();
    let chargesReseteados = 0;
    
    // Resetear cada charge individualmente
    for (const periodo in allCharges) {
      for (const empId in allCharges[periodo]) {
        for (const chargeId in allCharges[periodo][empId]) {
          const charge = allCharges[periodo][empId][chargeId];
          
          // Determinar estado según fecha de vencimiento
          const estaVencido = currentTime > charge.fechaVencimiento;
          const nuevoEstado = estaVencido ? 'moroso' : 'pendiente';
          
          // Preparar actualización
          const chargePath = `${BASE_PATH}/charges/${periodo}/${empId}/${chargeId}`;
          const updates = {
            saldo: charge.montoOriginal,
            montoPagado: 0,
            estado: nuevoEstado,
            esMoroso: estaVencido
          };
          
          // Si tiene montoMorosidad, resetearlo a 0
          if (charge.montoMorosidad !== undefined) {
            updates.montoMorosidad = 0;
          }
          
          await update(ref(db, chargePath), updates);
          chargesReseteados++;
          
          // Mostrar progreso cada 50 charges
          if (chargesReseteados % 50 === 0) {
            console.log(`   Procesados ${chargesReseteados} charges...`);
          }
        }
      }
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
    console.error('   Detalles:', error.message);
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

