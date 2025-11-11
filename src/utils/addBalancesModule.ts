import { ref, set, get } from "firebase/database";
import { db } from "@/config/firebase";

export const addBalancesModule = async () => {
  try {
    // Primero verificamos si ya existe
    const modulesRef = ref(db, 'modules');
    const snapshot = await get(modulesRef);
    const modules = snapshot.exists() ? snapshot.val() : {};

    // Agregar el módulo de Balances
    modules.balances = {
      id: 'balances',
      nombre: 'Balances',
      icon: 'FileBarChart',
      orden: 26,
      requiereAprobacion: false
    };

    // Guardar todos los módulos actualizados
    await set(modulesRef, modules);
    
    console.log('✅ Módulo Balances agregado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error agregando módulo Balances:', error);
    throw error;
  }
};
