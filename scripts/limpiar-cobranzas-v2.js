/**
 * Script de Limpieza Masiva de Cobranzas V2
 * 
 * ⚠️ ADVERTENCIA: Este script ELIMINA todos los datos de cobranzas_v2
 * excepto la configuración. Úsalo solo si estás seguro de querer empezar desde cero.
 * 
 * Este script:
 * 1. Hace backup automático de todos los datos antes de eliminar
 * 2. Elimina: charges, pagos, pagos_index, periods, ingresos, egresos
 * 3. MANTIENE: configuracion (para no perder la configuración)
 * 
 * USO:
 * node scripts/limpiar-cobranzas-v2.js
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  const serviceAccount = require('../serviceAccountKey.json');
  
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: 'https://gestoria-union-digital-default-rtdb.firebaseio.com'
  });
}

const db = admin.database();
const BASE_PATH = 'cobranzas_v2';

/**
 * Hacer backup de todos los datos antes de eliminar
 */
async function hacerBackup() {
  console.log('📦 Haciendo backup de los datos actuales...');
  
  try {
    const snapshot = await db.ref(BASE_PATH).once('value');
    const datos = snapshot.val();
    
    if (!datos) {
      console.log('⚠️ No hay datos en cobranzas_v2 para hacer backup');
      return null;
    }
    
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupDir = path.join(__dirname, '..', 'backups');
    
    // Crear directorio de backups si no existe
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    const backupFile = path.join(backupDir, `cobranzas_v2-backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(datos, null, 2));
    
    console.log(`✅ Backup guardado en: ${backupFile}`);
    return backupFile;
  } catch (error) {
    console.error('❌ Error haciendo backup:', error);
    throw error;
  }
}

/**
 * Obtener estadísticas de lo que se va a eliminar
 */
async function obtenerEstadisticas() {
  console.log('\n📊 Analizando datos a eliminar...');
  
  try {
    const snapshot = await db.ref(BASE_PATH).once('value');
    const datos = snapshot.val();
    
    if (!datos) {
      console.log('⚠️ No hay datos en cobranzas_v2');
      return {
        charges: 0,
        pagos: 0,
        ingresos: 0,
        egresos: 0,
        periods: 0,
        pagosIndex: 0
      };
    }
    
    const stats = {
      charges: 0,
      pagos: 0,
      ingresos: 0,
      egresos: 0,
      periods: 0,
      pagosIndex: 0
    };
    
    // Contar charges
    if (datos.charges) {
      for (const periodo in datos.charges) {
        for (const empId in datos.charges[periodo]) {
          stats.charges += Object.keys(datos.charges[periodo][empId] || {}).length;
        }
      }
    }
    
    // Contar pagos
    if (datos.pagos) {
      stats.pagos = Object.keys(datos.pagos).length;
    }
    
    // Contar ingresos
    if (datos.ingresos) {
      stats.ingresos = Object.keys(datos.ingresos).length;
    }
    
    // Contar egresos
    if (datos.egresos) {
      stats.egresos = Object.keys(datos.egresos).length;
    }
    
    // Contar periods
    if (datos.periods) {
      stats.periods = Object.keys(datos.periods).length;
    }
    
    // Contar pagos_index
    if (datos.pagos_index) {
      for (const empId in datos.pagos_index) {
        stats.pagosIndex += Object.keys(datos.pagos_index[empId] || {}).length;
      }
    }
    
    console.log(`   📋 Charges: ${stats.charges}`);
    console.log(`   💰 Pagos: ${stats.pagos}`);
    console.log(`   📥 Ingresos: ${stats.ingresos}`);
    console.log(`   📤 Egresos: ${stats.egresos}`);
    console.log(`   📅 Periods: ${stats.periods}`);
    console.log(`   🔍 Pagos Index: ${stats.pagosIndex}`);
    
    return stats;
  } catch (error) {
    console.error('❌ Error obteniendo estadísticas:', error);
    throw error;
  }
}

/**
 * Limpiar todos los datos excepto configuración
 */
async function limpiarDatos() {
  console.log('\n🧹 Iniciando limpieza de datos...');
  
  try {
    // Eliminar charges
    console.log('   Eliminando charges...');
    await db.ref(`${BASE_PATH}/charges`).remove();
    
    // Eliminar pagos
    console.log('   Eliminando pagos...');
    await db.ref(`${BASE_PATH}/pagos`).remove();
    
    // Eliminar pagos_index
    console.log('   Eliminando pagos_index...');
    await db.ref(`${BASE_PATH}/pagos_index`).remove();
    
    // Eliminar periods
    console.log('   Eliminando periods...');
    await db.ref(`${BASE_PATH}/periods`).remove();
    
    // Eliminar ingresos
    console.log('   Eliminando ingresos...');
    await db.ref(`${BASE_PATH}/ingresos`).remove();
    
    // Eliminar egresos
    console.log('   Eliminando egresos...');
    await db.ref(`${BASE_PATH}/egresos`).remove();
    
    console.log('✅ Limpieza completada');
    
    // Verificar que la configuración sigue intacta
    const configSnapshot = await db.ref(`${BASE_PATH}/configuracion`).once('value');
    if (configSnapshot.exists()) {
      console.log('✅ Configuración preservada correctamente');
    } else {
      console.log('⚠️ No hay configuración guardada (se creará automáticamente al usar el sistema)');
    }
    
  } catch (error) {
    console.error('❌ Error durante la limpieza:', error);
    throw error;
  }
}

/**
 * Función principal
 */
async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('🧹 LIMPIEZA MASIVA DE COBRANZAS V2');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('⚠️  ADVERTENCIA: Este script eliminará TODOS los datos');
  console.log('   de cobranzas_v2 excepto la configuración.');
  console.log('');
  console.log('   Se eliminará:');
  console.log('   - Todos los charges (boletas)');
  console.log('   - Todos los pagos');
  console.log('   - Todos los ingresos');
  console.log('   - Todos los egresos');
  console.log('   - Todos los periods');
  console.log('   - Todos los índices de pagos');
  console.log('');
  console.log('   Se MANTENDRÁ:');
  console.log('   - La configuración (monto mensual, días, etc.)');
  console.log('');
  
  // Obtener estadísticas
  const stats = await obtenerEstadisticas();
  
  const totalRegistros = stats.charges + stats.pagos + stats.ingresos + stats.egresos + stats.periods + stats.pagosIndex;
  
  if (totalRegistros === 0) {
    console.log('\n✅ No hay datos para eliminar. La base de datos ya está limpia.');
    process.exit(0);
  }
  
  console.log(`\n📊 Total de registros a eliminar: ${totalRegistros}`);
  console.log('');
  
  // Hacer backup
  const backupFile = await hacerBackup();
  
  if (!backupFile) {
    console.log('\n⚠️ No se pudo hacer backup. ¿Deseas continuar? (Ctrl+C para cancelar)');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
  
  // Confirmación final
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('🚨 CONFIRMACIÓN FINAL');
  console.log('═══════════════════════════════════════════════════════');
  console.log('');
  console.log('¿Estás SEGURO de que quieres eliminar todos estos datos?');
  console.log('Escribe "SI, ELIMINAR TODO" para continuar:');
  console.log('');
  
  // En un script real, aquí pedirías confirmación del usuario
  // Por ahora, comentamos esto y dejamos que el usuario lo ejecute manualmente
  // después de revisar el código
  
  // Para ejecución automática (descomentar solo si estás seguro):
  // await limpiarDatos();
  
  console.log('\n⚠️  Para ejecutar la limpieza, descomenta la línea:');
  console.log('   await limpiarDatos();');
  console.log('');
  console.log('   O ejecuta manualmente desde la consola de Firebase.');
  console.log('');
  
  process.exit(0);
}

// Ejecutar
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error fatal:', error);
    process.exit(1);
  });
}

module.exports = { hacerBackup, limpiarDatos, obtenerEstadisticas };



