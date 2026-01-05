/**
 * Función AUTOMÁTICA para resetear todos los pagos de cuotas mensuales
 * 
 * Esta función:
 * 1. Elimina TODOS los pagos de cobranzas_v2
 * 2. Elimina todos los índices de pagos
 * 3. Resetea TODOS los charges a estado inicial (como si nadie hubiera pagado)
 * 
 * NO elimina:
 * - Configuración
 * - Ingresos/Egresos de finanzas
 * - Periods
 * - Cualquier otro dato
 * 
 * USO AUTOMÁTICO:
 * Esta función se ejecuta automáticamente al cargar la aplicación
 * O ejecuta manualmente: resetearPagosCobranzas()
 */

import { ref, remove, get, update } from "firebase/database";
import { db } from "@/config/firebase";
import type { ChargeV2 } from "@/types/cobranzas-v2";

const BASE_PATH = "cobranzas_v2";

/**
 * Resetea todos los pagos y charges a estado inicial
 * AUTOMÁTICO - Sin confirmaciones
 */
export async function resetearPagosCobranzas(): Promise<void> {
  try {
    console.log("🔄 Iniciando reset automático de pagos de cuotas mensuales...");
    
    // Paso 1: Eliminar todos los pagos
    console.log("   Eliminando todos los pagos...");
    await remove(ref(db, `${BASE_PATH}/pagos`));
    
    // Paso 2: Eliminar todos los índices de pagos
    console.log("   Eliminando índices de pagos...");
    await remove(ref(db, `${BASE_PATH}/pagos_index`));
    
    // Paso 3: Obtener todos los charges
    console.log("   Obteniendo charges...");
    const chargesSnapshot = await get(ref(db, `${BASE_PATH}/charges`));
    
    if (!chargesSnapshot.exists()) {
      console.log("✅ No hay charges para resetear");
      return;
    }
    
    const allCharges = chargesSnapshot.val();
    const currentTime = Date.now();
    let chargesReseteados = 0;
    
    // Paso 4: Resetear cada charge
    console.log("   Reseteando charges a estado inicial...");
    
    for (const periodo in allCharges) {
      for (const empId in allCharges[periodo]) {
        for (const chargeId in allCharges[periodo][empId]) {
          const charge: ChargeV2 = allCharges[periodo][empId][chargeId];
          
          // Determinar estado según fecha de vencimiento
          const estaVencido = currentTime > charge.fechaVencimiento;
          const nuevoEstado = estaVencido ? 'moroso' : 'pendiente';
          
          // Actualizar el charge a estado inicial
          const chargePath = `${BASE_PATH}/charges/${periodo}/${empId}/${chargeId}`;
          const updates: Partial<ChargeV2> = {
            saldo: charge.montoOriginal, // Saldo completo = monto original
            montoPagado: 0, // Nadie ha pagado
            estado: nuevoEstado,
            esMoroso: estaVencido,
            montoMorosidad: estaVencido ? 0 : undefined // Resetear morosidad si existe
          };
          
          // Solo incluir montoMorosidad si está vencido (para limpiar el campo si no está vencido)
          if (!estaVencido && charge.montoMorosidad !== undefined) {
            updates.montoMorosidad = 0;
          }
          
          await update(ref(db, chargePath), updates);
          chargesReseteados++;
        }
      }
    }
    
    console.log(`✅ Reset completado exitosamente`);
    console.log(`   - Pagos eliminados`);
    console.log(`   - Índices eliminados`);
    console.log(`   - ${chargesReseteados} charges reseteados`);
    console.log(`   - Todos los empadronados ahora deben todos los meses`);
    
  } catch (error) {
    console.error("❌ Error durante el reset:", error);
    throw error;
  }
}

// Exportar función global para usar desde consola (opcional)
if (typeof window !== "undefined") {
  (window as any).resetearPagosCobranzas = resetearPagosCobranzas;
}






