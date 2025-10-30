import { ref, set, get } from "firebase/database";
import { db } from "@/config/firebase";

export const addAdminDeportesModule = async () => {
  try {
    // Primero verificamos si ya existe
    const modulesRef = ref(db, 'modules');
    const snapshot = await get(modulesRef);
    const modules = snapshot.exists() ? snapshot.val() : {};

    // Agregar el módulo de Administración Deportes
    modules.admin_deportes = {
      id: 'admin_deportes',
      nombre: 'Administración Deportes',
      icon: 'Building',
      orden: 25,
      requiereAprobacion: false
    };

    // Guardar todos los módulos actualizados
    await set(modulesRef, modules);
    
    console.log('✅ Módulo Administración Deportes agregado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error agregando módulo Administración Deportes:', error);
    throw error;
  }
};
