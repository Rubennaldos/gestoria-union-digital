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
import { createUserProfile, getUserProfile, updateUserProfile } from "./rtdb";

export const signInWithEmailOrUsername = async (identifier: string, password: string) => {
  let email = identifier;
  
  console.log('🔐 Login attempt with identifier:', identifier);
  
  // Si no contiene @, buscar en usernames
  if (!identifier.includes("@")) {
    console.log('🔍 Looking up username in database...');
    const usernameRef = ref(db, `usernames/${identifier}`);
    const snapshot = await get(usernameRef);
    
    if (!snapshot.exists()) {
      console.log('❌ Username not found in database');
      throw new Error("Usuario no encontrado");
    }
    
    email = snapshot.val().email;
    console.log('✅ Username resolved to email:', email);
  }
  
  console.log('🔑 Attempting Firebase authentication...');
  const result = await signInWithEmailAndPassword(auth, email, password);
  console.log('✅ Firebase auth successful, checking user profile...');
  
  // Verificar que el usuario esté activo
  const profile = await getUserProfile(result.user.uid);
  console.log('👤 User profile:', profile);
  
  if (!profile?.activo) {
    console.log('❌ User is not active');
    
    // Si es el usuario presidencia, activarlo automáticamente
    if (profile?.roleId === 'presidencia') {
      console.log('🔧 Auto-activating presidencia user...');
      try {
        await updateUserProfile(result.user.uid, { activo: true }, result.user.uid);
        console.log('✅ Presidencia user activated successfully');
        // Re-cargar el perfil actualizado
        const updatedProfile = await getUserProfile(result.user.uid);
        console.log('✅ Updated profile:', updatedProfile);
        return result;
      } catch (error) {
        console.error('❌ Error activating presidencia user:', error);
      }
    }
    
    await signOut(auth);
    throw new Error("USUARIO_SUSPENDIDO: Tu acceso está deshabilitado, contacta a Presidencia.");
  }
  
  console.log('✅ Login successful');
  return result;
};

export const createUserAndProfile = async (userData: CreateUserForm): Promise<string> => {
  const { password, ...profileData } = userData;
  
  console.log('🔧 createUserAndProfile called with:', {
    email: userData.email,
    username: userData.username,
    displayName: userData.displayName,
    roleId: userData.roleId
  });
  
  // Verificar que el username sea único si se proporciona
  if (userData.username) {
    console.log('🔍 Checking username uniqueness:', userData.username);
    const usernameRef = ref(db, `usernames/${userData.username}`);
    const snapshot = await get(usernameRef);
    
    if (snapshot.exists()) {
      console.log('❌ Username already exists');
      throw new Error(`El usuario "${userData.username}" ya está en uso`);
    }
    console.log('✅ Username is available');
  }
  
  // Usar app secundaria para crear usuarios sin afectar la sesión principal
  console.log('🔐 Creating user in Firebase Auth with adminAuth...');
  const result = await createUserWithEmailAndPassword(adminAuth, userData.email, password);
  const uid = result.user.uid;
  console.log('✅ Firebase Auth user created with UID:', uid);
  
  try {
    // Crear perfil en RTDB
    console.log('💾 Creating user profile in RTDB...');
    await createUserProfile(uid, {
      ...profileData,
      uid,
      createdAt: Date.now()
    });
    console.log('✅ User profile created in RTDB');
    
    return uid;
  } finally {
    // IMPORTANTE: Cerrar sesión de la app secundaria para no afectar la sesión principal
    console.log('🚪 Signing out from adminAuth...');
    await signOut(adminAuth);
    console.log('✅ Signed out from adminAuth');
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