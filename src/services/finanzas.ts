// src/services/finanzas.ts
import { ref, push, set, get, update, query, orderByChild } from "firebase/database";
import { ref as storageRef, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/config/firebase";
import { MovimientoFinanciero, ResumenCaja, EstadisticasFinanzas, Comprobante } from "@/types/finanzas";

// Subir comprobante a Storage
export async function subirComprobante(
  file: File,
  movimientoId: string
): Promise<Comprobante> {
  const timestamp = Date.now();
  const fileName = `${timestamp}-${file.name}`;
  const fileRef = storageRef(storage, `finanzas/comprobantes/${movimientoId}/${fileName}`);
  
  await uploadBytes(fileRef, file);
  const url = await getDownloadURL(fileRef);
  
  return {
    nombre: file.name,
    url,
    tipo: file.type,
    tamano: file.size,
    fechaSubida: timestamp,
  };
}

// Crear movimiento financiero
export async function crearMovimientoFinanciero(
  data: Omit<MovimientoFinanciero, "id" | "createdAt" | "updatedAt">,
  archivos?: File[]
): Promise<string> {
  const movimientosRef = ref(db, "finanzas/movimientos");
  const newMovimientoRef = push(movimientosRef);
  const id = newMovimientoRef.key as string;

  let comprobantes: Comprobante[] = [];
  
  // Subir archivos si existen
  if (archivos && archivos.length > 0) {
    comprobantes = await Promise.all(
      archivos.map(archivo => subirComprobante(archivo, id))
    );
  }

  const movimiento: MovimientoFinanciero = {
    ...data,
    id,
    comprobantes,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await set(newMovimientoRef, movimiento);
  
  // Actualizar resumen de caja
  await actualizarResumenCaja();
  
  return id;
}

// Obtener todos los movimientos
export async function obtenerMovimientos(filtros?: {
  tipo?: "ingreso" | "egreso";
  fechaInicio?: string;
  fechaFin?: string;
}): Promise<MovimientoFinanciero[]> {
  const movimientosRef = ref(db, "finanzas/movimientos");
  const snapshot = await get(movimientosRef);
  
  if (!snapshot.exists()) return [];
  
  let movimientos: MovimientoFinanciero[] = Object.values(snapshot.val());
  
  // Aplicar filtros
  if (filtros?.tipo) {
    movimientos = movimientos.filter(m => m.tipo === filtros.tipo);
  }
  
  if (filtros?.fechaInicio) {
    movimientos = movimientos.filter(m => m.fecha >= filtros.fechaInicio!);
  }
  
  if (filtros?.fechaFin) {
    movimientos = movimientos.filter(m => m.fecha <= filtros.fechaFin!);
  }
  
  // Ordenar por fecha más reciente primero
  movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  
  return movimientos;
}

// Actualizar movimiento
export async function actualizarMovimiento(
  id: string,
  updates: Partial<MovimientoFinanciero>,
  nuevosArchivos?: File[]
): Promise<void> {
  const movimientoRef = ref(db, `finanzas/movimientos/${id}`);
  const snapshot = await get(movimientoRef);
  
  if (!snapshot.exists()) {
    throw new Error("Movimiento no encontrado");
  }
  
  const movimientoActual = snapshot.val();
  let comprobantes = movimientoActual.comprobantes || [];
  
  // Agregar nuevos archivos
  if (nuevosArchivos && nuevosArchivos.length > 0) {
    const nuevosComprobantes = await Promise.all(
      nuevosArchivos.map(archivo => subirComprobante(archivo, id))
    );
    comprobantes = [...comprobantes, ...nuevosComprobantes];
  }
  
  await update(movimientoRef, {
    ...updates,
    comprobantes,
    updatedAt: Date.now(),
  });
  
  await actualizarResumenCaja();
}

// Eliminar movimiento
export async function eliminarMovimiento(id: string): Promise<void> {
  const movimientoRef = ref(db, `finanzas/movimientos/${id}`);
  await set(movimientoRef, null);
  await actualizarResumenCaja();
}

// Calcular resumen de caja
async function calcularResumenCaja(): Promise<ResumenCaja> {
  const movimientos = await obtenerMovimientos();
  
  const totalIngresos = movimientos
    .filter(m => m.tipo === "ingreso")
    .reduce((sum, m) => sum + m.monto, 0);
    
  const totalEgresos = movimientos
    .filter(m => m.tipo === "egreso")
    .reduce((sum, m) => sum + m.monto, 0);
    
  const saldoActual = totalIngresos - totalEgresos;
  
  // Obtener saldo esperado de cobranzas (pagos realizados)
  let saldoEsperado = 0;
  try {
    const cobranzasRef = ref(db, "cobranzas-v2/pagos");
    const snapshot = await get(cobranzasRef);
    if (snapshot.exists()) {
      const pagos: any[] = Object.values(snapshot.val());
      saldoEsperado = pagos
        .filter((p: any) => p.estado === "pagado")
        .reduce((sum: number, p: any) => sum + (Number(p.monto) || 0), 0);
    }
  } catch (error) {
    console.error("Error al obtener saldo esperado:", error);
  }
  
  return {
    saldoActual,
    totalIngresos,
    totalEgresos,
    saldoEsperado: saldoEsperado + totalIngresos,
    diferencia: saldoActual - (saldoEsperado + totalIngresos),
    ultimaActualizacion: Date.now(),
  };
}

// Actualizar resumen de caja
export async function actualizarResumenCaja(): Promise<void> {
  const resumen = await calcularResumenCaja();
  const resumenRef = ref(db, "finanzas/resumenCaja");
  await set(resumenRef, resumen);
}

// Obtener resumen de caja
export async function obtenerResumenCaja(): Promise<ResumenCaja> {
  const resumenRef = ref(db, "finanzas/resumenCaja");
  const snapshot = await get(resumenRef);
  
  if (!snapshot.exists()) {
    await actualizarResumenCaja();
    const newSnapshot = await get(resumenRef);
    return newSnapshot.val();
  }
  
  return snapshot.val();
}

// Obtener estadísticas
export async function obtenerEstadisticas(): Promise<EstadisticasFinanzas> {
  const movimientos = await obtenerMovimientos();
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString();
  const inicioAnio = new Date(ahora.getFullYear(), 0, 1).toISOString();
  
  const movimientosMes = movimientos.filter(m => m.fecha >= inicioMes);
  const movimientosAnio = movimientos.filter(m => m.fecha >= inicioAnio);
  
  const ingresosDelMes = movimientosMes
    .filter(m => m.tipo === "ingreso")
    .reduce((sum, m) => sum + m.monto, 0);
    
  const egresosDelMes = movimientosMes
    .filter(m => m.tipo === "egreso")
    .reduce((sum, m) => sum + m.monto, 0);
    
  const ingresosDelAnio = movimientosAnio
    .filter(m => m.tipo === "ingreso")
    .reduce((sum, m) => sum + m.monto, 0);
    
  const egresosDelAnio = movimientosAnio
    .filter(m => m.tipo === "egreso")
    .reduce((sum, m) => sum + m.monto, 0);
  
  // Top categorías de egreso
  const egresosPorCategoria = new Map<string, number>();
  movimientosMes
    .filter(m => m.tipo === "egreso")
    .forEach(m => {
      const actual = egresosPorCategoria.get(m.categoria) || 0;
      egresosPorCategoria.set(m.categoria, actual + m.monto);
    });
  
  const topCategoriasEgreso = Array.from(egresosPorCategoria.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  // Top categorías de ingreso
  const ingresosPorCategoria = new Map<string, number>();
  movimientosMes
    .filter(m => m.tipo === "ingreso")
    .forEach(m => {
      const actual = ingresosPorCategoria.get(m.categoria) || 0;
      ingresosPorCategoria.set(m.categoria, actual + m.monto);
    });
  
  const topCategoriasIngreso = Array.from(ingresosPorCategoria.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  
  return {
    ingresosDelMes,
    egresosDelMes,
    balanceDelMes: ingresosDelMes - egresosDelMes,
    ingresosDelAnio,
    egresosDelAnio,
    balanceDelAnio: ingresosDelAnio - egresosDelAnio,
    topCategoriasEgreso,
    topCategoriasIngreso,
  };
}
