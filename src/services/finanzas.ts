// src/services/finanzas.ts
import { ref, push, set, get, update, remove } from "firebase/database";
import {
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import { db, storage } from "@/config/firebase";
import {
  MovimientoFinanciero,
  ResumenCaja,
  EstadisticasFinanzas,
  Comprobante,
} from "@/types/finanzas";

/* ============ Subir comprobante a Storage (CORREGIDO) ============ */
export async function subirComprobante(
  file: File,
  movimientoId: string
): Promise<Comprobante> {
  const timestamp = Date.now();
  const safeName = file.name.replace(/[^\w\.\-]+/g, "_");
  const fileName = `${timestamp}-${safeName}`;
  const path = `finanzas/comprobantes/${movimientoId}/${fileName}`;
  const fileRef = storageRef(storage, path);

  // metadata ayuda a los preflight y a servir con el tipo correcto
  const task = uploadBytesResumable(fileRef, file, {
    contentType: file.type || "application/octet-stream",
    cacheControl: "public,max-age=31536000,immutable",
  });

  await new Promise<void>((resolve, reject) => {
    task.on(
      "state_changed",
      () => {},
      (err) => reject(err),
      () => resolve()
    );
  });

  const url = await getDownloadURL(task.snapshot.ref);

  return {
    nombre: file.name,
    url,
    tipo: file.type,
    tamano: file.size,
    fechaSubida: timestamp,
  };
}

/* ========================= Crear movimiento ========================= */
export async function crearMovimientoFinanciero(
  data: Omit<MovimientoFinanciero, "id" | "createdAt" | "updatedAt">,
  archivos?: File[]
): Promise<string> {
  const movimientosRef = ref(db, "finanzas/movimientos");
  const newMovimientoRef = push(movimientosRef);
  const id = newMovimientoRef.key as string;

  let comprobantes: Comprobante[] = [];
  if (archivos && archivos.length > 0) {
    comprobantes = await Promise.all(archivos.map((a) => subirComprobante(a, id)));
  }

  const movimiento: MovimientoFinanciero = {
    ...data,
    id,
    comprobantes,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };

  await set(newMovimientoRef, movimiento);
  await actualizarResumenCaja();
  return id;
}

/* ========================= Listar movimientos ========================= */
type FiltrosLista = { tipo?: "ingreso" | "egreso"; fechaInicio?: string; fechaFin?: string };

export async function obtenerMovimientos(filtros?: FiltrosLista): Promise<MovimientoFinanciero[]> {
  const mainPath = "finanzas/movimientos";
  let snapshot = await get(ref(db, mainPath));

  if (!snapshot.exists()) {
    const alt1 = await get(ref(db, "movimientos"));
    if (alt1.exists()) snapshot = alt1;
    else {
      const alt2 = await get(ref(db, "caja/movimientos"));
      if (alt2.exists()) snapshot = alt2;
    }
  }

  if (!snapshot.exists()) return [];

  const raw = snapshot.val() as Record<string, any>;
  let movimientos: MovimientoFinanciero[] = Object.entries(raw).map(([id, v]) => ({
    id,
    tipo: v.tipo,
    categoria: v.categoria,
    descripcion: v.descripcion ?? "",
    monto: Number(v.monto ?? 0),
    fecha: v.fecha ?? v.createdAt ?? Date.now(),
    registradoPor: v.registradoPor ?? "",
    registradoPorNombre: v.registradoPorNombre ?? v.registradoPor ?? "",
    comprobantes: Array.isArray(v.comprobantes) ? v.comprobantes : [],
    createdAt: v.createdAt ?? Date.now(),
    updatedAt: v.updatedAt ?? v.createdAt ?? Date.now(),
  }));

  if (filtros?.tipo) {
    movimientos = movimientos.filter((m) => m.tipo === filtros.tipo);
  }
  if (filtros?.fechaInicio) {
    const d = new Date(filtros.fechaInicio).getTime();
    movimientos = movimientos.filter((m) => new Date(m.fecha).getTime() >= d);
  }
  if (filtros?.fechaFin) {
    const d = new Date(filtros.fechaFin).getTime();
    movimientos = movimientos.filter((m) => new Date(m.fecha).getTime() <= d);
  }

  movimientos.sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime());
  return movimientos;
}

/* ========================= Actualizar movimiento ========================= */
export async function actualizarMovimiento(
  id: string,
  updates: Partial<MovimientoFinanciero>,
  nuevosArchivos?: File[]
): Promise<void> {
  const movimientoRef = ref(db, `finanzas/movimientos/${id}`);
  const snapshot = await get(movimientoRef);
  if (!snapshot.exists()) throw new Error("Movimiento no encontrado");

  const movimientoActual = snapshot.val();
  let comprobantes = movimientoActual.comprobantes || [];

  if (nuevosArchivos && nuevosArchivos.length > 0) {
    const nuevos = await Promise.all(nuevosArchivos.map((a) => subirComprobante(a, id)));
    comprobantes = [...comprobantes, ...nuevos];
  }

  await update(movimientoRef, { ...updates, comprobantes, updatedAt: Date.now() });
  await actualizarResumenCaja();
}

/* ========================= Eliminar movimiento ========================= */
export async function eliminarMovimiento(id: string): Promise<void> {
  if (!id) throw new Error("ID de movimiento vacío");

  const mainPath = `finanzas/movimientos/${id}`;
  await remove(ref(db, mainPath)).catch(async () => {
    await remove(ref(db, `movimientos/${id}`)).catch(async () => {
      await remove(ref(db, `caja/movimientos/${id}`));
    });
  });
  await actualizarResumenCaja();
}
export async function deleteMovimiento(id: string) { return eliminarMovimiento(id); }

/* ========================= Resumen de caja ========================= */
async function calcularResumenCaja(): Promise<ResumenCaja> {
  const movimientos = await obtenerMovimientos();

  const totalIngresos = movimientos.filter(m => m.tipo === "ingreso")
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const totalEgresos = movimientos.filter(m => m.tipo === "egreso")
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const saldoActual = totalIngresos - totalEgresos;

  return {
    saldoActual,
    totalIngresos,
    totalEgresos,
    saldoEsperado: saldoActual,
    diferencia: 0,
    ultimaActualizacion: Date.now(),
  };
}

export async function actualizarResumenCaja(): Promise<void> {
  const resumen = await calcularResumenCaja();
  await set(ref(db, "finanzas/resumenCaja"), resumen);
}

export async function obtenerResumenCaja(): Promise<ResumenCaja> {
  const resumenRef = ref(db, "finanzas/resumenCaja");
  const snapshot = await get(resumenRef);
  if (!snapshot.exists()) {
    await actualizarResumenCaja();
    const newSnap = await get(resumenRef);
    return newSnap.val();
  }
  return snapshot.val();
}

/* ========================= Estadísticas ========================= */
export async function obtenerEstadisticas(): Promise<EstadisticasFinanzas> {
  const movimientos = await obtenerMovimientos();
  const ahora = new Date();
  const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1);
  const inicioAnio = new Date(ahora.getFullYear(), 0, 1);

  const movimientosMes = movimientos.filter(m => new Date(m.fecha).getTime() >= inicioMes.getTime());
  const movimientosAnio = movimientos.filter(m => new Date(m.fecha).getTime() >= inicioAnio.getTime());

  const ingresosDelMes = movimientosMes.filter(m => m.tipo === "ingreso")
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const egresosDelMes = movimientosMes.filter(m => m.tipo === "egreso")
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const ingresosDelAnio = movimientosAnio.filter(m => m.tipo === "ingreso")
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const egresosDelAnio = movimientosAnio.filter(m => m.tipo === "egreso")
    .reduce((s, m) => s + Number(m.monto || 0), 0);

  const egresosPorCategoria = new Map<string, number>();
  movimientosMes.filter(m => m.tipo === "egreso").forEach(m => {
    egresosPorCategoria.set(m.categoria, (egresosPorCategoria.get(m.categoria) || 0) + Number(m.monto || 0));
  });
  const topCategoriasEgreso = Array.from(egresosPorCategoria.entries())
    .map(([categoria, total]) => ({ categoria, total }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  const ingresosPorCategoria = new Map<string, number>();
  movimientosMes.filter(m => m.tipo === "ingreso").forEach(m => {
    ingresosPorCategoria.set(m.categoria, (ingresosPorCategoria.get(m.categoria) || 0) + Number(m.monto || 0));
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
