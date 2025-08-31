import { ref, set } from "firebase/database";
import { db } from "@/config/firebase";

export const resetBootstrap = async () => {
  console.log('🔄 Resetting bootstrap...');
  
  // Resetear el flag de bootstrap
  const bootstrapRef = ref(db, 'bootstrap/initialized');
  await set(bootstrapRef, false);
  
  console.log('✅ Bootstrap reset completed');
};