import {
  ref,
  push,
  set,
  update,
  get,
  child,
  serverTimestamp,
  query,
  orderByChild,
  equalTo,
} from "firebase/database";
import { db } from "@/config/firebase";
import {
  RegistroVisita,
  RegistroTrabajadores,
  RegistroProveedor,
  FavoritoUsuario,
} from "@/types/acceso";

// Helpers para timestamps que pueden/no pueden existir en los types
function tsFrom(obj: any): number {
  const v = obj?.createdAt ?? obj?.fechaCreacion ?? 0;
  return typeof v === "number" ? v : 0;
}

type TipoAcceso = "visitante" | "trabajador" | "proveedor";

type BaseRegistro = {
  porticoId: string;
  estado?: "pendiente" | "autorizado" | "denegado";
  estadoPortico?: string;
  createdAt?: any; // no tipamos estricto para no chocar con tus types
};

function buildBase(porticoId: string, estado: BaseRegistro["estado"] = "pendiente") {
  return {
    porticoId,
    estado,
    estadoPortico: `${estado}#${porticoId}`,
    createdAt: serverTimestamp(),
  };
}

export async function registrarVisita(
  data: Omit<RegistroVisita, "estado" | "estadoPortico" | "createdAt"> & { porticoId: string }
) {
  const id = push(child(ref(db), "acceso/visitas")).key as string;
  const base = buildBase(data.porticoId, "pendiente");

  // Evitamos conflicto con tus types usando any
  const payload: any = { ...(data as any), ...base };

  const updates: Record<string, unknown> = {};
  updates[`acceso/visitas/${id}`] = payload;
  updates[`seguridad/porticos/${data.porticoId}/pendientes/${id}`] = {
    id,
    nombre: (data as any).visitantes?.[0]?.nombre ?? "",
    dni: (data as any).visitantes?.[0]?.dni ?? "",
    createdAt: base.createdAt,
    tipo: "visitante",
  };

  await update(ref(db), updates);
  return id;
}

export async function registrarTrabajadores(
  data: Omit<RegistroTrabajadores, "estado" | "estadoPortico" | "createdAt"> & { porticoId: string }
) {
  const id = push(child(ref(db), "acceso/trabajadores")).key as string;
  const base = buildBase(data.porticoId, "pendiente");
  const payload: any = { ...(data as any), ...base };

  const updates: Record<string, unknown> = {};
  updates[`acceso/trabajadores/${id}`] = payload;
  updates[`seguridad/porticos/${data.porticoId}/pendientes/${id}`] = {
    id,
    createdAt: base.createdAt,
    tipo: "trabajador",
  };

  await update(ref(db), updates);
  return id;
}

export async function registrarProveedor(
  data: Omit<RegistroProveedor, "estado" | "estadoPortico" | "createdAt"> & { porticoId: string }
) {
  const id = push(child(ref(db), "acceso/proveedores")).key as string;
  const base = buildBase(data.porticoId, "pendiente");
  const payload: any = { ...(data as any), ...base };

  const updates: Record<string, unknown> = {};
  updates[`acceso/proveedores/${id}`] = payload;
  updates[`seguridad/porticos/${data.porticoId}/pendientes/${id}`] = {
    id,
    createdAt: base.createdAt,
    tipo: "proveedor",
  };

  await update(ref(db), updates);
  return id;
}

export async function cambiarEstadoAcceso(
  tipo: TipoAcceso,
  id: string,
  porticoId: string,
  nuevo: "autorizado" | "denegado",
  actor: string
) {
  const registroPath = `acceso/${
    tipo === "visitante" ? "visitas" : tipo === "trabajador" ? "trabajadores" : "proveedores"
  }/${id}`;

  const updates: Record<string, unknown> = {};
  updates[`${registroPath}/estado`] = nuevo;
  updates[`${registroPath}/estadoPortico`] = `${nuevo}#${porticoId}`;
  updates[`${registroPath}/fechaAutorizacion`] = Date.now();
  updates[`${registroPath}/autorizadoPor`] = actor;

  // sacar de pendientes del pórtico
  updates[`seguridad/porticos/${porticoId}/pendientes/${id}`] = null;

  await update(ref(db), updates);
}

export async function obtenerFavoritosPorUsuario(
  empadronadoId: string,
  tipo: TipoAcceso
): Promise<FavoritoUsuario[]> {
  const q = query(ref(db, "acceso/favoritos"), orderByChild("empadronadoId"), equalTo(empadronadoId));
  const snap = await get(q);
  if (!snap.exists()) return [];
  const todos: FavoritoUsuario[] = Object.values(snap.val());

  return todos
    .filter((f: any) => f.tipo === tipo)
    .sort((a: any, b: any) => tsFrom(b) - tsFrom(a));
}
