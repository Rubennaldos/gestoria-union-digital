/**
 * Script de Limpieza Masiva de Cobranzas V2
 * Versión simplificada para ejecutar desde la consola del navegador
 * 
 * ⚠️ ADVERTENCIA: Este script ELIMINA todos los datos de cobranzas_v2
 * excepto la configuración.
 * 
 * INSTRUCCIONES:
 * 1. Abre la consola del navegador (F12) en tu aplicación
 * 2. Ve a Cobranzas V2
 * 3. Copia y pega este código completo en la consola
 * 4. Presiona Enter
 * 5. Revisa los resultados
 */

(async function limpiarCobranzasV2() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧹 LIMPIEZA MASIVA DE COBRANZAS V2');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  
  // Importar funciones de Firebase
  const { ref, remove, get } = await import('https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js');
  const { db } = await import('/src/config/firebase.ts');
  
  const BASE_PATH = 'cobranzas_v2';
  
  try {
    // Obtener estadísticas antes de eliminar
    console.log('📊 Analizando datos actuales...');
    
    const chargesRef = ref(db, `${BASE_PATH}/charges`);
    const pagosRef = ref(db, `${BASE_PATH}/pagos`);
    const ingresosRef = ref(db, `${BASE_PATH}/ingresos`);
    const egresosRef = ref(db, `${BASE_PATH}/egresos`);
    const periodsRef = ref(db, `${BASE_PATH}/periods`);
    const pagosIndexRef = ref(db, `${BASE_PATH}/pagos_index`);
    
    const [chargesSnap, pagosSnap, ingresosSnap, egresosSnap, periodsSnap, pagosIndexSnap] = await Promise.all([
      get(chargesRef),
      get(pagosRef),
      get(ingresosRef),
      get(egresosRef),
      get(periodsRef),
      get(pagosIndexRef)
    ]);
    
    let stats = {
      charges: 0,
      pagos: 0,
      ingresos: 0,
      egresos: 0,
      periods: 0,
      pagosIndex: 0
    };
    
    if (chargesSnap.exists()) {
      const charges = chargesSnap.val();
      for (const periodo in charges) {
        for (const empId in charges[periodo]) {
          stats.charges += Object.keys(charges[periodo][empId] || {}).length;
        }
      }
    }
    
    if (pagosSnap.exists()) {
      stats.pagos = Object.keys(pagosSnap.val()).length;
    }
    
    if (ingresosSnap.exists()) {
      stats.ingresos = Object.keys(ingresosSnap.val()).length;
    }
    
    if (egresosSnap.exists()) {
      stats.egresos = Object.keys(egresosSnap.val()).length;
    }
    
    if (periodsSnap.exists()) {
      stats.periods = Object.keys(periodsSnap.val()).length;
    }
    
    if (pagosIndexSnap.exists()) {
      const pagosIndex = pagosIndexSnap.val();
      for (const empId in pagosIndex) {
        stats.pagosIndex += Object.keys(pagosIndex[empId] || {}).length;
      }
    }
    
    console.log(`   📋 Charges: ${stats.charges}`);
    console.log(`   💰 Pagos: ${stats.pagos}`);
    console.log(`   📥 Ingresos: ${stats.ingresos}`);
    console.log(`   📤 Egresos: ${stats.egresos}`);
    console.log(`   📅 Periods: ${stats.periods}`);
    console.log(`   🔍 Pagos Index: ${stats.pagosIndex}`);
    
    const total = stats.charges + stats.pagos + stats.ingresos + stats.egresos + stats.periods + stats.pagosIndex;
    
    if (total === 0) {
      console.log('\n✅ No hay datos para eliminar. La base de datos ya está limpia.');
      return;
    }
    
    console.log(`\n📊 Total de registros a eliminar: ${total}`);
    console.log('');
    console.log('⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de cobranzas_v2');
    console.log('   excepto la configuración.');
    console.log('');
    
    // Pedir confirmación
    const confirmacion = prompt('Escribe "ELIMINAR TODO" para confirmar:');
    
    if (confirmacion !== 'ELIMINAR TODO') {
      console.log('❌ Operación cancelada.');
      return;
    }
    
    console.log('\n🧹 Iniciando limpieza...');
    
    // Eliminar cada nodo
    console.log('   Eliminando charges...');
    await remove(chargesRef);
    
    console.log('   Eliminando pagos...');
    await remove(pagosRef);
    
    console.log('   Eliminando pagos_index...');
    await remove(pagosIndexRef);
    
    console.log('   Eliminando periods...');
    await remove(periodsRef);
    
    console.log('   Eliminando ingresos...');
    await remove(ingresosRef);
    
    console.log('   Eliminando egresos...');
    await remove(egresosRef);
    
    console.log('\n✅ Limpieza completada exitosamente!');
    console.log('');
    console.log('📋 Próximos pasos:');
    console.log('   1. Ve a Cobranzas V2');
    console.log('   2. Click en "Generar Desde 2025" (o el año correspondiente)');
    console.log('   3. Reimporta los pagos desde Excel si es necesario');
    console.log('');
    
  } catch (error) {
    console.error('\n❌ Error durante la limpieza:', error);
    console.log('\n⚠️  Si algo salió mal, restaura desde backup usando Firebase Console');
  }
})();






