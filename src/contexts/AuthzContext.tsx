// src/contexts/AuthzContext.tsx
// Permisos obtenidos desde public.profiles (Supabase) — sin Firebase RTDB.
// El campo `modules` del perfil contiene el mapa { [moduleId]: PermissionLevel }.

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { EffectivePermissions, PermissionLevel, Delegation } from '@/types/auth';

interface AuthzContextType {
  permissions: EffectivePermissions;
  delegation: Delegation | null;
  loading: boolean;
  can: (moduleId: string, level: PermissionLevel) => boolean;
  isPresidencia: boolean;
  isAdministrador: boolean;
  isPresidente: boolean;
  canDeleteWithoutAuth: boolean;
  canChangeRoles: boolean;
  refresh: () => Promise<void>;
}

const AuthzContext = createContext<AuthzContextType>({
  permissions: {},
  delegation: null,
  loading: true,
  can: () => false,
  isPresidencia: false,
  isAdministrador: false,
  isPresidente: false,
  canDeleteWithoutAuth: false,
  canChangeRoles: false,
  refresh: async () => {}
});

export const useAuthz = () => {
  const context = useContext(AuthzContext);
  if (!context) {
    throw new Error('useAuthz must be used within AuthzProvider');
  }
  return context;
};

const PERMISSION_HIERARCHY: Record<PermissionLevel, number> = {
  none: 0,
  read: 1,
  write: 2,
  approve: 3,
  admin: 4
};

export const AuthzProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, profile } = useAuth();
  const [permissions, setPermissions] = useState<EffectivePermissions>({});
  const [loading, setLoading] = useState(true);

  const isPresidencia   = profile?.roleId === 'presidencia';
  const isAdministrador = profile?.roleId === 'administrador';
  const isPresidente    = profile?.roleId === 'presidencia';

  // Los permisos vienen directamente del campo `modules` del perfil ya cargado.
  // No se realiza ninguna llamada adicional a Firebase RTDB.
  useEffect(() => {
    if (!user?.uid) {
      setPermissions({});
      setLoading(false);
      return;
    }

    // Si el perfil aún no cargó, esperar
    if (profile === undefined) return;

    const mods = (profile?.modules ?? {}) as Record<string, string>;
    setPermissions(mods as EffectivePermissions);
    setLoading(false);
  }, [user?.uid, profile]);

  const refresh = async () => {
    // Los permisos se actualizan automáticamente cuando AuthContext recarga el perfil.
    // Esta función existe para compatibilidad con código que la llame.
  };

  const can = (moduleId: string, requiredLevel: PermissionLevel): boolean => {
    if (isPresidente || isAdministrador) return true;

    const userLevel = permissions[moduleId] || 'none';
    return PERMISSION_HIERARCHY[userLevel] >= PERMISSION_HIERARCHY[requiredLevel];
  };

  const value: AuthzContextType = {
    permissions,
    delegation: null,
    loading,
    can,
    isPresidencia,
    isAdministrador,
    isPresidente,
    canDeleteWithoutAuth: isPresidente,
    canChangeRoles: isPresidente,
    refresh
  };

  return (
    <AuthzContext.Provider value={value}>
      {children}
    </AuthzContext.Provider>
  );
};
