// src/services/recibos.ts
import { ref, get } from "firebase/database";
import { db } from "@/config/firebase";
import { generarVoucherEvento } from "@/lib/pdf/voucherEvento";
import { generarComprobanteFinanciero } from "@/lib/pdf/comprobanteFinanciero";

/* Utilidad de descarga */
function descargarBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/* Normaliza sesiones del evento a lo que espera el generador */
function mapSesiones(sesiones: any[] | undefined) {
  if (!Array.isArray(sesiones)) return [];
  return sesiones.map((s: any) => ({
    lugar: s.lugar || "",
    fecha: typeof s.fecha === "number" ? s.fecha : new Date(s.fecha || Date.now()).getTime(),
    horaInicio: s.horaInicio || "",
    horaFin: s.horaFin || "",
    precio: Number(s.precio || 0),
  }));
}

/* --------- DESCARGA: COMPROBANTE POR INSCRIPCIÓN --------- */
export async function descargarComprobantePorInscripcion(
  inscripcionId: string,
  filename = `Comprobante-${inscripcionId}.pdf`
): Promise<void> {
  if (!inscripcionId) throw new Error("ID de inscripción vacío");

  // 1) Intentar vía correlativo guardado (si existe)
  try {
    const byInsRef = ref(db, `receipts_by_inscripcion/${inscripcionId}`);
    const byInsSnap = await get(byInsRef);

    if (byInsSnap.exists()) {
      const receiptId = byInsSnap.val();
      const rSnap = await get(ref(db, `receipts/${receiptId}`));
      if (rSnap.exists()) {
        const r = rSnap.val();

        // datos mínimos
        const numeroVoucher: string =
          r.code || `INS-${inscripcionId.slice(-8).toUpperCase()}`;
        const montoTotal: number = Number(r.total || 0);
        const fechaPago = new Date(r.issuedAt || Date.now());
        const eventoTitulo: string = r.event?.name || "Evento";
        const eventoCategoria: string = "evento";

        // tratar de completar con evento e inscripción
        let personas = [{ nombre: r.customer?.name || "Asistente", dni: "" }];
        let sesiones = mapSesiones([]);

        try {
          const insSnap = await get(ref(db, `inscripcionesEventos/${inscripcionId}`));
          if (insSnap.exists()) {
            const ins = insSnap.val();
            if (ins?.nombreEmpadronado) {
              personas = [{ nombre: ins.nombreEmpadronado, dni: ins.dni || "" }];
            }
            const evSnap = await get(ref(db, `eventos/${ins.eventoId}`));
            if (evSnap.exists()) {
              sesiones = mapSesiones(evSnap.val()?.sesiones);
            }
          }
        } catch {
          /* continuar con lo que tengamos */
        }

        const blob = await generarVoucherEvento({
          eventoTitulo,
          eventoCategoria,
          personas,
          sesiones,
          montoTotal,
          fechaPago,
          numeroVoucher,
        });

        descargarBlob(blob, filename);
        return;
      }
    }
  } catch {
    /* si falla, seguimos con fallback */
  }

  // 2) Fallback: generar con datos actuales de RTDB (no depende de receipts)
  const insSnap = await get(ref(db, `inscripcionesEventos/${inscripcionId}`));
  if (!insSnap.exists()) {
    throw new Error("Inscripción no encontrada");
  }
  const ins = insSnap.val();

  // evento
  let eventoTitulo = "Evento";
  let eventoCategoria = "evento";
  let sesiones = mapSesiones([]);

  try {
    const evSnap = await get(ref(db, `eventos/${ins.eventoId}`));
    if (evSnap.exists()) {
      const ev = evSnap.val();
      eventoTitulo = ev.titulo || eventoTitulo;
      eventoCategoria = ev.categoria || eventoCategoria;
      sesiones = mapSesiones(ev.sesiones);
    }
  } catch {
    /* continuar */
  }

  // personas
  let personas: Array<{ nombre: string; dni: string }> = [
    { nombre: ins.nombreEmpadronado || "Asistente", dni: ins.dni || "" },
  ];

  // intentar leer observaciones como JSON (si viene del flujo nuevo)
  try {
    const obs = ins.observaciones ? JSON.parse(ins.observaciones) : null;
    if (obs?.persona && obs.personas == null) {
      personas = [{ nombre: obs.persona?.nombre || personas[0].nombre, dni: obs.persona?.dni || "" }];
    } else if (Array.isArray(obs?.personas) && obs.personas.length > 0) {
      personas = obs.personas.map((p: any) => ({
        nombre: p.nombre || "Asistente",
        dni: p.dni || "",
      }));
    }
    if (Array.isArray(obs?.sesiones) && obs.sesiones.length > 0) {
      sesiones = mapSesiones(obs.sesiones);
    }
  } catch {
    /* observaciones planas, continuar */
  }

  const numeroVoucher = `INS-${String(inscripcionId).slice(-8).toUpperCase()}`;
  const montoTotal = Number(ins.montoPagado || 0);
  const fechaPago = new Date(ins.fechaPago || ins.fechaInscripcion || Date.now());

  const blob = await generarVoucherEvento({
    eventoTitulo,
    eventoCategoria,
    personas,
    sesiones,
    montoTotal,
    fechaPago,
    numeroVoucher,
  });

  descargarBlob(blob, filename);
}

/* --------- DESCARGA: COMPROBANTE POR MOVIMIENTO --------- */
export async function descargarComprobantePorMovimiento(
  movimientoId: string,
  filename = `Comprobante-${movimientoId}.pdf`
): Promise<void> {
  if (!movimientoId) throw new Error("ID de movimiento vacío");

  const movSnap = await get(ref(db, `finanzas/movimientos/${movimientoId}`));
  if (!movSnap.exists()) {
    // compatibilidad con rutas antiguas
    const alt1 = await get(ref(db, `movimientos/${movimientoId}`));
    if (!alt1.exists()) {
      const alt2 = await get(ref(db, `caja/movimientos/${movimientoId}`));
      if (!alt2.exists()) throw new Error("Movimiento no encontrado");
      const m = alt2.val();
      await generarYDescargarMovimiento(m, filename);
      return;
    }
    const m = alt1.val();
    await generarYDescargarMovimiento(m, filename);
    return;
  }

  const m = movSnap.val();
  await generarYDescargarMovimiento(m, filename);
}

async function generarYDescargarMovimiento(m: any, filename: string) {
  // extra: si observaciones viene como JSON, extraer datos útiles
  let extras: any = {};
  if (m?.categoria === "evento" && typeof m?.observaciones === "string") {
    try {
      const obs = JSON.parse(m.observaciones);
      extras = {
        banco: obs.banco || "",
        numeroPadron: obs.numeroPadron || "",
        nombreAsociado: obs.nombreAsociado || "",
      };
    } catch {
      /* continuar */
    }
  }

  const blob = await generarComprobanteFinanciero({
    id: m.id,
    tipo: m.tipo,
    categoria: m.categoria,
    monto: Number(m.monto || 0),
    descripcion: m.descripcion || "",
    fecha: m.fecha || new Date().toISOString(),
    numeroComprobante: m.numeroComprobante,
    beneficiario: m.beneficiario,
    proveedor: m.proveedor,
    observaciones: m.observaciones,
    registradoPorNombre: m.registradoPorNombre || "Sistema",
    createdAt: m.createdAt || Date.now(),
    comprobantes: Array.isArray(m.comprobantes) ? m.comprobantes : [],
    ...extras,
  });

  descargarBlob(blob, filename);
}
