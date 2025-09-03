// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { UserProfile, AuthUser } from '@/types/auth';
import { getUserProfile, onUserProfile } from '@/services/rtdb';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  signOut: async () => {},
});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Escucha de sesión Firebase
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser: FirebaseUser | null) => {
      console.log('🔍 AuthContext: Firebase user changed:', fbUser?.email, fbUser?.uid);
      try {
        if (fbUser) {
          const authUser: AuthUser = {
            uid: fbUser.uid,
            email: fbUser.email,
            displayName: fbUser.displayName ?? undefined,
          };

          console.log('📋 AuthContext: Loading user profile for UID:', fbUser.uid);
          // Carga perfil (si no existe, devolverá null)
          const userProfile = await getUserProfile(fbUser.uid);
          console.log('👤 AuthContext: User profile loaded:', userProfile);
          
          // Always set the user regardless of profile existence
          // Profile can be null for users who haven't been created in the system yet
          setProfile(userProfile);
          setUser({ ...authUser, profile: userProfile || undefined });
          console.log('✅ AuthContext: User state updated');
        } else {
          console.log('🚪 AuthContext: User signed out');
          setUser(null);
          setProfile(null);
        }
      } catch (error) {
        console.error('❌ AuthContext: Error in auth state change:', error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Suscripción en tiempo real al perfil
  useEffect(() => {
    if (!user?.uid) return;
    const stop = onUserProfile(user.uid, (updated) => {
      setProfile(updated);
      setUser((u) => (u ? { ...u, profile: updated || undefined } : u));
    });
    return () => stop && stop();
  }, [user?.uid]);

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, profile, loading, signOut }),
    [user, profile, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
