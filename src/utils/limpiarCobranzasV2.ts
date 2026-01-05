/**
 * Utilidad para limpiar todos los datos de Cobranzas V2
 * 
 * ⚠️ ADVERTENCIA: Esta función ELIMINA permanentemente:
 * - Todos los charges (boletas)
 * - Todos los pagos
 * - Todos los ingresos relacionados
 * - Todos los egresos relacionados
 * - Todos los periods
 * - Todos los índices de pagos
 * 
 * MANTIENE:
 * - La configuración (monto mensual, días, etc.)
 * - Los empadronados (no se tocan)
 * 
 * USO:
 * 1. Abre la consola del navegador (F12)
 * 2. Ve a cualquier página de Cobranzas V2
 * 3. Ejecuta: limpiarCobranzasV2()
 */

import { ref, remove, get } from "firebase/database";
import { db } from "@/config/firebase";

const BASE_PATH = "cobranzas_v2";

export interface EstadisticasLimpieza {
  charges: number;
  pagos: number;
  ingresos: number;
  egresos: number;
  periods: number;
  pagosIndex: number;
  total: number;
}

/**
 * Obtiene estadísticas de los datos actuales
 */
export async function obtenerEstadisticasLimpieza(): Promise<EstadisticasLimpieza> {
  const stats: EstadisticasLimpieza = {
    charges: 0,
    pagos: 0,
    ingresos: 0,
    egresos: 0,
    periods: 0,
    pagosIndex: 0,
    total: 0
  };

  try {
    // Obtener todos los datos
    const [chargesSnap, pagosSnap, ingresosSnap, egresosSnap, periodsSnap, pagosIndexSnap] = await Promise.all([
      get(ref(db, `${BASE_PATH}/charges`)),
      get(ref(db, `${BASE_PATH}/pagos`)),
      get(ref(db, `${BASE_PATH}/ingresos`)),
      get(ref(db, `${BASE_PATH}/egresos`)),
      get(ref(db, `${BASE_PATH}/periods`)),
      get(ref(db, `${BASE_PATH}/pagos_index`))
    ]);

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

    // Contar ingresos
    if (ingresosSnap.exists()) {
      stats.ingresos = Object.keys(ingresosSnap.val()).length;
    }

    // Contar egresos
    if (egresosSnap.exists()) {
      stats.egresos = Object.keys(egresosSnap.val()).length;
    }

    // Contar periods
    if (periodsSnap.exists()) {
      stats.periods = Object.keys(periodsSnap.val()).length;
    }

    // Contar pagos_index
    if (pagosIndexSnap.exists()) {
      const pagosIndex = pagosIndexSnap.val();
      for (const empId in pagosIndex) {
        stats.pagosIndex += Object.keys(pagosIndex[empId] || {}).length;
      }
    }

    stats.total = stats.charges + stats.pagos + stats.ingresos + stats.egresos + stats.periods + stats.pagosIndex;

    return stats;
  } catch (error) {
    console.error("Error obteniendo estadísticas:", error);
    throw error;
  }
}

/**
 * Limpia todos los datos de cobranzas_v2 excepto la configuración
 */
export async function limpiarCobranzasV2(): Promise<void> {
  try {
    console.log("🧹 Iniciando limpieza de Cobranzas V2...");

    // Eliminar cada nodo
    await Promise.all([
      remove(ref(db, `${BASE_PATH}/charges`)),
      remove(ref(db, `${BASE_PATH}/pagos`)),
      remove(ref(db, `${BASE_PATH}/pagos_index`)),
      remove(ref(db, `${BASE_PATH}/periods`)),
      remove(ref(db, `${BASE_PATH}/ingresos`)),
      remove(ref(db, `${BASE_PATH}/egresos`))
    ]);

    console.log("✅ Limpieza completada exitosamente");
  } catch (error) {
    console.error("❌ Error durante la limpieza:", error);
    throw error;
  }
}

/**
 * Función completa que muestra estadísticas y ejecuta limpieza
 * (Para usar desde la consola del navegador)
 */
export async function ejecutarLimpiezaCompleta(): Promise<void> {
  console.log("═══════════════════════════════════════════════════════");
  console.log("🧹 LIMPIEZA MASIVA DE COBRANZAS V2");
  console.log("═══════════════════════════════════════════════════════");
  console.log("");

  try {
    // Obtener estadísticas
    const stats = await obtenerEstadisticasLimpieza();

    console.log("📊 Estadísticas actuales:");
    console.log(`   📋 Charges: ${stats.charges}`);
    console.log(`   💰 Pagos: ${stats.pagos}`);
    console.log(`   📥 Ingresos: ${stats.ingresos}`);
    console.log(`   📤 Egresos: ${stats.egresos}`);
    console.log(`   📅 Periods: ${stats.periods}`);
    console.log(`   🔍 Pagos Index: ${stats.pagosIndex}`);
    console.log(`   📊 TOTAL: ${stats.total} registros`);
    console.log("");

    if (stats.total === 0) {
      console.log("✅ No hay datos para eliminar. La base de datos ya está limpia.");
      return;
    }

    console.log("⚠️  ADVERTENCIA: Esto eliminará TODOS los datos de cobranzas_v2");
    console.log("   excepto la configuración.");
    console.log("");
    console.log("   Se eliminará:");
    console.log("   - Todos los charges (boletas)");
    console.log("   - Todos los pagos");
    console.log("   - Todos los ingresos");
    console.log("   - Todos los egresos");
    console.log("   - Todos los periods");
    console.log("   - Todos los índices de pagos");
    console.log("");
    console.log("   Se MANTENDRÁ:");
    console.log("   - La configuración");
    console.log("   - Los empadronados");
    console.log("");

    // Pedir confirmación (en navegador, usar window.confirm)
    const confirmacion = window.confirm(
      `¿Estás SEGURO de que quieres eliminar ${stats.total} registros?\n\n` +
      "Esto NO se puede deshacer. Asegúrate de haber hecho backup primero."
    );

    if (!confirmacion) {
      console.log("❌ Operación cancelada por el usuario.");
      return;
    }

    // Ejecutar limpieza
    await limpiarCobranzasV2();

    console.log("");
    console.log("✅ Limpieza completada exitosamente!");
    console.log("");
    console.log("📋 Próximos pasos:");
    console.log("   1. Ve a Cobranzas V2");
    console.log("   2. Click en 'Generar Desde 2025' (o el año correspondiente)");
    console.log("   3. Reimporta los pagos desde Excel si es necesario");
    console.log("");
  } catch (error) {
    console.error("❌ Error durante la limpieza:", error);
    throw error;
  }
}

// Exportar función global para usar desde consola
if (typeof window !== "undefined") {
  (window as any).limpiarCobranzasV2 = ejecutarLimpiezaCompleta;
  (window as any).verEstadisticasCobranzas = obtenerEstadisticasLimpieza;
}






