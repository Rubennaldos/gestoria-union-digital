import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User as FirebaseUser 
} from "firebase/auth";
import { auth, adminAuth } from "@/config/firebase";
import { get, ref } from "firebase/database";
import { db } from "@/config/firebase";
import { UserProfile, CreateUserForm } from "@/types/auth";
import { createUserProfile, getUserProfile } from "./rtdb";

export const signInWithEmailOrUsername = async (identifier: string, password: string) => {
  let email = identifier;
  
  // Si no contiene @, buscar en usernames
  if (!identifier.includes("@")) {
    const usernameRef = ref(db, `usernames/${identifier}`);
    const snapshot = await get(usernameRef);
    
    if (!snapshot.exists()) {
      throw new Error("Usuario no encontrado");
    }
    
    email = snapshot.val().email;
  }
  
  const result = await signInWithEmailAndPassword(auth, email, password);
  
  // Verificar que el usuario esté activo
  const profile = await getUserProfile(result.user.uid);
  if (!profile?.activo) {
    await signOut(auth);
    throw new Error("USUARIO_SUSPENDIDO: Tu acceso está deshabilitado, contacta a Presidencia.");
  }
  
  return result;
};

export const createUserAndProfile = async (userData: CreateUserForm): Promise<string> => {
  const { password, ...profileData } = userData;
  
  // Verificar que el username sea único si se proporciona
  if (userData.username) {
    const usernameRef = ref(db, `usernames/${userData.username}`);
    const snapshot = await get(usernameRef);
    
    if (snapshot.exists()) {
      throw new Error(`El usuario "${userData.username}" ya está en uso`);
    }
  }
  
  // Usar app secundaria para crear usuarios sin afectar la sesión principal
  const result = await createUserWithEmailAndPassword(adminAuth, userData.email, password);
  const uid = result.user.uid;
  
  try {
    // Crear perfil en RTDB
    await createUserProfile(uid, {
      ...profileData,
      uid,
      createdAt: Date.now()
    });
    
    return uid;
  } finally {
    // IMPORTANTE: Cerrar sesión de la app secundaria para no afectar la sesión principal
    await signOut(adminAuth);
  }
};

export const resetPassword = async (email: string) => {
  await sendPasswordResetEmail(auth, email);
};

export const signOutUser = async () => {
  await signOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};