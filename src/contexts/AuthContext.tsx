// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';
import { auth } from '@/config/firebase';
import { UserProfile, AuthUser } from '@/types/auth';
import { getUserProfile, onUserProfile, createUserProfile, getUserPermissions } from '@/services/rtdb';
import { registerForPushNotificationsAsync } from '@/services/pushNotifications';

interface AuthContextType {
  user: AuthUser | null;
  profile: UserProfile | null;
  profileLoaded: boolean;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  profileLoaded: false,
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
  const [profileLoaded, setProfileLoaded] = useState(false);
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
          let userProfile = await getUserProfile(fbUser.uid);
          console.log('👤 AuthContext: User profile loaded (raw):', userProfile);

          // If modules are missing in the profile node, try to read modules under users/{uid}/modules
          try {
            if (!userProfile?.modules) {
              const perms = await getUserPermissions(fbUser.uid);
              if (perms && Object.keys(perms).length > 0) {
                userProfile = { ...(userProfile || {}), modules: perms } as any;
                console.debug('[RTDB READ] Fallback loaded modules from users/{uid}/modules:', perms);
              }
            }
          } catch (e) {
            console.warn('AuthContext: Failed to load fallback modules:', e);
          }

          // Debug: confirm modules are read from users/{uid}/modules
          console.debug('[RTDB READ] auth.currentUser?.uid =', auth.currentUser?.uid);
          console.debug('[RTDB READ] path =', `users/${fbUser.uid}/modules`);
          console.debug('[RTDB READ] snapshot (modules) =', userProfile?.modules);
          
          // Si no hay perfil pero el usuario se autenticó, crear un perfil básico
          if (!userProfile && fbUser.email) {
            console.log('🔧 AuthContext: Creating basic profile for authenticated user without profile');
            const basicProfile = {
              uid: fbUser.uid,
              email: fbUser.email,
              displayName: fbUser.displayName || fbUser.email.split('@')[0],
              activo: true,
              fechaCreacion: new Date().toISOString().split('T')[0],
              roleId: 'usuario', // Rol básico
              etapa: 'Etapa 1',
              modules: {}
            };
            
            // Crear perfil en la base de datos
            await createUserProfile(fbUser.uid, basicProfile);
            setProfile(basicProfile);
            setUser({ ...authUser, profile: basicProfile, modules: basicProfile.modules });
          } else {
            setProfile(userProfile);
            // Ensure user.modules reflects nested profile.modules
            setUser({ ...authUser, profile: userProfile || undefined, modules: userProfile?.modules });
          }
          console.log('✅ AuthContext: User state updated');
          // Mark profile as loaded (initial fetch completed)
          setProfileLoaded(true);
          // Register for push notifications (non-blocking)
          registerForPushNotificationsAsync().catch((e) => console.warn('push registration failed', e));
        } else {
          console.log('🚪 AuthContext: User signed out');
          setUser(null);
          setProfile(null);
          setProfileLoaded(false);
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
    const stop = onUserProfile(user.uid, async (updated) => {
      // Debug realtime profile updates and modules path
      console.debug('[RTDB REALTIME] auth.currentUser?.uid =', auth.currentUser?.uid);
      console.debug('[RTDB REALTIME] path =', `users/${user.uid}/modules`);

      let finalProfile = updated;
      // If modules missing from realtime payload, fetch them explicitly
      if (!updated?.modules) {
        try {
          const perms = await getUserPermissions(user.uid);
          if (perms && Object.keys(perms).length > 0) {
            finalProfile = { ...(updated || {}), modules: perms } as any;
            console.debug('[RTDB REALTIME] Fallback loaded modules for realtime update:', perms);
          }
        } catch (e) {
          console.warn('AuthContext: Failed to load realtime fallback modules:', e);
        }
      }

      console.debug('[RTDB REALTIME] snapshot (modules) =', finalProfile?.modules);
      setProfile(finalProfile);
      setUser((u) => (u ? { ...u, profile: finalProfile || undefined, modules: finalProfile?.modules } : u));
      // Ensure we mark profileLoaded when realtime update arrives
      setProfileLoaded(true);
    });
    return () => stop && stop();
  }, [user?.uid]);

  const signOut = async () => {
    await fbSignOut(auth);
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, profile, profileLoaded, loading, signOut }),
    [user, profile, profileLoaded, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
