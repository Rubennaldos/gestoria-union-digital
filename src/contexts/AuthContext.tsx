// src/contexts/AuthContext.tsx
// ─────────────────────────────────────────────────────────────────────────────
//  Estado de autenticación — Supabase Auth + public.profiles
//
//  • Sesión :  supabase.auth (signInWithPassword, signOut, onAuthStateChange)
//  • Perfil :  SELECT * FROM public.profiles WHERE id = uid
//  • Realtime: suscripción a cambios en public.profiles (permisos en tiempo real)
//  • Empadronado: obtenerEmpadronadoPorAuthUid (ya usa Supabase)
//
//  La interfaz AuthContextType NO cambió → todos los componentes siguen igual.
// ─────────────────────────────────────────────────────────────────────────────

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { Session, User as SupabaseUser }  from '@supabase/supabase-js';
import { supabase }                             from '@/lib/supabase';
import { UserProfile, AuthUser }                from '@/types/auth';
import { Empadronado }                          from '@/types/empadronados';
import { ProfileRow, profileRowToUserProfile }  from '@/services/auth';
import { obtenerEmpadronadoPorAuthUid }         from '@/services/empadronados';
import { registerForPushNotificationsAsync }    from '@/services/pushNotifications';

// =============================================================================
// INTERFAZ PÚBLICA (sin cambios respecto al original)
// =============================================================================

interface AuthContextType {
  user:          AuthUser | null;
  profile:       UserProfile | null;
  empadronado:   Empadronado | null;
  profileLoaded: boolean;
  loading:       boolean;
  signOut:       () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user:          null,
  profile:       null,
  empadronado:   null,
  profileLoaded: false,
  loading:       true,
  signOut:       async () => {},
});

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
};

// =============================================================================
// HELPERS
// =============================================================================

function getDisplayName(supaUser: SupabaseUser): string | undefined {
  return (
    supaUser.user_metadata?.full_name        ??
    supaUser.user_metadata?.name             ??
    supaUser.user_metadata?.display_name     ??
    supaUser.email?.split('@')[0]
  );
}

function buildAuthUser(supaUser: SupabaseUser, profile?: UserProfile): AuthUser {
  return {
    uid:         supaUser.id,
    email:       supaUser.email ?? null,
    displayName: getDisplayName(supaUser) ?? null,
    profile,
    modules:     profile?.modules,
  };
}

// =============================================================================
// PROVIDER
// =============================================================================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user,          setUser]          = useState<AuthUser | null>(null);
  const [profile,       setProfile]       = useState<UserProfile | null>(null);
  const [empadronado,   setEmpadronado]   = useState<Empadronado | null>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [loading,       setLoading]       = useState(true);

  // ── Carga del perfil desde public.profiles ──────────────────────────────
  const loadUserData = async (supaUser: SupabaseUser) => {
    const uid = supaUser.id;
    console.log('📋 AuthContext: Loading profile for UID:', uid);

    // 1. Leer perfil desde Supabase
    const { data: profileRow, error: profileErr } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', uid)
      .maybeSingle();

    if (profileErr) {
      console.error('❌ AuthContext: Error leyendo perfil:', profileErr.message);
    }

    let userProfile: UserProfile | null = profileRow
      ? profileRowToUserProfile(profileRow as ProfileRow)
      : null;

    // 2. Si el usuario no tiene perfil en Supabase aún, crear uno básico
    if (!userProfile && supaUser.email) {
      console.log('🔧 AuthContext: Creando perfil básico para usuario sin perfil');
      const basicRow = {
        id:           uid,
        email:        supaUser.email,
        display_name: getDisplayName(supaUser) ?? supaUser.email.split('@')[0],
        role_id:      'usuario',
        activo:       true,
        modules:      {},
      };

      const { data: inserted, error: insertErr } = await supabase
        .from('profiles')
        .insert([basicRow])
        .select()
        .maybeSingle();

      if (insertErr) {
        console.error('❌ AuthContext: Error creando perfil básico:', insertErr.message);
      } else if (inserted) {
        userProfile = profileRowToUserProfile(inserted as ProfileRow);
        console.log('✅ AuthContext: Perfil básico creado');
      }
    }

    console.log('👤 AuthContext: Perfil cargado:', userProfile?.roleId, userProfile?.activo);

    setProfile(userProfile);
    setUser(buildAuthUser(supaUser, userProfile ?? undefined));

    // 3. Cargar empadronado vinculado
    try {
      const empData = await obtenerEmpadronadoPorAuthUid(uid);
      setEmpadronado(empData);
      if (empData) console.log('✅ AuthContext: Empadronado vinculado cargado');
    } catch (err) {
      console.warn('⚠️ AuthContext: No se pudo cargar empadronado:', err);
      setEmpadronado(null);
    }

    console.log('✅ AuthContext: Estado de usuario actualizado');
    setProfileLoaded(true);

    registerForPushNotificationsAsync().catch((e) =>
      console.warn('push registration failed', e)
    );
  };

  // ── Escucha de sesión Supabase ──────────────────────────────────────────
  useEffect(() => {
    // Sesión activa al montar
    supabase.auth.getSession().then(({ data: { session } }) => {
      handleSessionChange(session);
    });

    // Cambios posteriores (login, logout, token refresh…)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: string, session: Session | null) => {
        handleSessionChange(session);
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSessionChange = async (session: Session | null) => {
    console.log(
      '🔍 AuthContext: session changed →',
      session?.user?.email ?? 'signed out'
    );
    try {
      if (session?.user) {
        await loadUserData(session.user);
      } else {
        setUser(null);
        setProfile(null);
        setEmpadronado(null);
        setProfileLoaded(false);
      }
    } catch (err) {
      console.error('❌ AuthContext: Error en auth state change:', err);
    } finally {
      setLoading(false);
    }
  };

  // ── Supabase Realtime: cambios en public.profiles (permisos en tiempo real) ─
  useEffect(() => {
    if (!user?.uid) return;
    const uid = user.uid;

    const channel = supabase
      .channel(`profile_${uid}`)
      .on(
        'postgres_changes',
        {
          event:  '*',
          schema: 'public',
          table:  'profiles',
          filter: `id=eq.${uid}`,
        },
        (payload) => {
          console.debug('[Realtime] profiles actualizado para uid:', uid);
          const updated = payload.new as ProfileRow;
          if (!updated?.id) return;

          const updatedProfile = profileRowToUserProfile(updated);
          setProfile(updatedProfile);
          setUser((u) =>
            u
              ? { ...u, profile: updatedProfile, modules: updatedProfile.modules }
              : u
          );
          setProfileLoaded(true);
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.debug('[Realtime] Suscrito a cambios de perfil para uid:', uid);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.uid]);

  // ── signOut ─────────────────────────────────────────────────────────────
  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const value = useMemo<AuthContextType>(
    () => ({ user, profile, empadronado, profileLoaded, loading, signOut }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [user, profile, empadronado, profileLoaded, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
