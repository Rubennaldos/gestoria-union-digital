import { ref, set, get } from "firebase/database";
import { db } from "@/config/firebase";

export const addPlanillaModule = async () => {
  try {
    // Primero verificamos si ya existe
    const modulesRef = ref(db, 'modules');
    const snapshot = await get(modulesRef);
    const modules = snapshot.exists() ? snapshot.val() : {};

    // Agregar el módulo de Planilla
    modules.planilla = {
      id: 'planilla',
      nombre: 'Planilla',
      icon: 'Briefcase',
      orden: 22,
      requiereAprobacion: false
    };

    // Guardar todos los módulos actualizados
    await set(modulesRef, modules);
    
    console.log('✅ Módulo Planilla agregado correctamente');
    return true;
  } catch (error) {
    console.error('❌ Error agregando módulo Planilla:', error);
    throw error;
  }
};
