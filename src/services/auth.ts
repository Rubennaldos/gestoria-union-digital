import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  sendPasswordResetEmail,
  User as FirebaseUser 
} from "firebase/auth";
import { auth } from "@/config/firebase";
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
  
  // Crear usuario en Firebase Auth
  const result = await createUserWithEmailAndPassword(auth, userData.email, password);
  const uid = result.user.uid;
  
  // Crear perfil en RTDB
  await createUserProfile(uid, {
    ...profileData,
    uid,
    createdAt: Date.now()
  });
  
  return uid;
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