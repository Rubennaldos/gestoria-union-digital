import { ref, set, get } from "firebase/database";
import { db } from "@/config/firebase";

export const addAdminBalancesModule = async () => {
  try {
    // Primero verificamos si ya existe
    const modulesRef = ref(db, 'modules');
    const snapshot = await get(modulesRef);
    const modules = snapshot.exists() ? snapshot.val() : {};

    // Agregar el módulo de Administrador de Balances
    modules.admin_balances = {
      id: 'admin_balances',
      nombre: 'Administrador de Balances',
      icon: 'Settings',
      orden: 27,
      requiereAprobacion: true
    };

    // Guardar todos los módulos actualizados
    await set(modulesRef, modules);
    
    console.log('✅ Módulo Administrador de Balances agregado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error agregando módulo Administrador de Balances:', error);
    throw error;
  }
};
