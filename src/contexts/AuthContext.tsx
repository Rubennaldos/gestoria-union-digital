import React, { createContext, useContext, useEffect, useState } from 'react';
import { User as FirebaseUser, onAuthStateChanged } from 'firebase/auth';
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
  signOut: async () => {}
});

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser: FirebaseUser | null) => {
      console.log('🔄 Auth state changed:', firebaseUser ? 'User logged in' : 'User logged out');
      
      if (firebaseUser) {
        console.log('👤 Firebase user UID:', firebaseUser.uid);
        const authUser: AuthUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName
        };

        // Obtener perfil del usuario
        try {
          console.log('📖 Fetching user profile...');
          const userProfile = await getUserProfile(firebaseUser.uid);
          console.log('👤 User profile loaded:', userProfile);
          setProfile(userProfile);
          setUser({ ...authUser, profile: userProfile || undefined });
        } catch (error) {
          console.error('❌ Error loading user profile:', error);
          setProfile(null);
          setUser(authUser);
        }
      } else {
        console.log('👋 No user logged in');
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    });

    return unsubscribeAuth;
  }, []);

  // Suscribirse a cambios en el perfil del usuario
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribeProfile = onUserProfile(user.uid, (updatedProfile) => {
      setProfile(updatedProfile);
      if (user) {
        setUser({ ...user, profile: updatedProfile || undefined });
      }
    });

    return unsubscribeProfile;
  }, [user?.uid]);

  const signOutUser = async () => {
    await auth.signOut();
  };

  const value: AuthContextType = {
    user,
    profile,
    loading,
    signOut: signOutUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};