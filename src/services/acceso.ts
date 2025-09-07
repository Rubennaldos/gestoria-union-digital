import { ref, push, set, get, query, orderByChild, equalTo } from "firebase/database";
import { db } from "@/config/firebase";
import { 
  RegistroVisita, 
  RegistroTrabajadores, 
  RegistroProveedor, 
  MaestroObra, 
  FavoritoUsuario 
} from "@/types/acceso";

// Servicios para Visitas
export const registrarVisita = async (visita: Omit<RegistroVisita, "id">) => {
  const visitasRef = ref(db, "acceso/visitas");
  const nuevaVisitaRef = push(visitasRef);
  await set(nuevaVisitaRef, {
    ...visita,
    id: nuevaVisitaRef.key,
  });
  return nuevaVisitaRef.key;
};

export const obtenerVisitasPorEmpadronado = async (empadronadoId: string) => {
  const visitasRef = ref(db, "acceso/visitas");
  const q = query(visitasRef, orderByChild("empadronadoId"), equalTo(empadronadoId));
  const snapshot = await get(q);
  
  if (snapshot.exists()) {
    return Object.values(snapshot.val()) as RegistroVisita[];
  }
  return [];
};

// Servicios para Trabajadores
export const registrarTrabajadores = async (registro: Omit<RegistroTrabajadores, "id">) => {
  const trabajadoresRef = ref(db, "acceso/trabajadores");
  const nuevoRegistroRef = push(trabajadoresRef);
  await set(nuevoRegistroRef, {
    ...registro,
    id: nuevoRegistroRef.key,
  });
  return nuevoRegistroRef.key;
};

export const obtenerTrabajadoresPorEmpadronado = async (empadronadoId: string) => {
  const trabajadoresRef = ref(db, "acceso/trabajadores");
  const q = query(trabajadoresRef, orderByChild("empadronadoId"), equalTo(empadronadoId));
  const snapshot = await get(q);
  
  if (snapshot.exists()) {
    return Object.values(snapshot.val()) as RegistroTrabajadores[];
  }
  return [];
};

// Servicios para Maestros de Obra
export const crearMaestroObra = async (maestro: Omit<MaestroObra, "id">) => {
  const maestrosRef = ref(db, "acceso/maestros-obra");
  const nuevoMaestroRef = push(maestrosRef);
  await set(nuevoMaestroRef, {
    ...maestro,
    id: nuevoMaestroRef.key,
  });
  return nuevoMaestroRef.key;
};

export const obtenerMaestrosObra = async () => {
  const maestrosRef = ref(db, "acceso/maestros-obra");
  const snapshot = await get(maestrosRef);
  
  if (snapshot.exists()) {
    return Object.values(snapshot.val()) as MaestroObra[];
  }
  return [];
};

export const autorizarMaestroObra = async (maestroId: string, autorizado: boolean, autorizadoPor: string) => {
  const maestroRef = ref(db, `acceso/maestros-obra/${maestroId}`);
  await set(maestroRef, {
    autorizado,
    fechaAutorizacion: Date.now(),
    autorizadoPor,
  });
};

// Servicios para Proveedores
export const registrarProveedor = async (proveedor: Omit<RegistroProveedor, "id">) => {
  const proveedoresRef = ref(db, "acceso/proveedores");
  const nuevoProveedorRef = push(proveedoresRef);
  await set(nuevoProveedorRef, {
    ...proveedor,
    id: nuevoProveedorRef.key,
  });
  return nuevoProveedorRef.key;
};

export const obtenerProveedoresPorEmpadronado = async (empadronadoId: string) => {
  const proveedoresRef = ref(db, "acceso/proveedores");
  const q = query(proveedoresRef, orderByChild("empadronadoId"), equalTo(empadronadoId));
  const snapshot = await get(q);
  
  if (snapshot.exists()) {
    return Object.values(snapshot.val()) as RegistroProveedor[];
  }
  return [];
};

// Servicios para Favoritos
export const guardarFavorito = async (favorito: Omit<FavoritoUsuario, "id">) => {
  const favoritosRef = ref(db, "acceso/favoritos");
  const nuevoFavoritoRef = push(favoritosRef);
  await set(nuevoFavoritoRef, {
    ...favorito,
    id: nuevoFavoritoRef.key,
  });
  return nuevoFavoritoRef.key;
};

export const obtenerFavoritosPorUsuario = async (empadronadoId: string, tipo?: string) => {
  const favoritosRef = ref(db, "acceso/favoritos");
  const q = query(favoritosRef, orderByChild("empadronadoId"), equalTo(empadronadoId));
  const snapshot = await get(q);
  
  if (snapshot.exists()) {
    let favoritos = Object.values(snapshot.val()) as FavoritoUsuario[];
    if (tipo) {
      favoritos = favoritos.filter(f => f.tipo === tipo);
    }
    return favoritos;
  }
  return [];
};

// Función para enviar mensaje WhatsApp simulado
export const enviarMensajeWhatsApp = (mensaje: string) => {
  const numeroVigilancia = "+51999999999"; // Número de prueba
  const url = `https://wa.me/${numeroVigilancia}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, '_blank');
};