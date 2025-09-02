import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { EffectivePermissions, PermissionLevel, Delegation } from '@/types/auth';
import { getEffectivePermissions, getActiveDelegation, onPermissions } from '@/services/rtdb';

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
  const [delegation, setDelegation] = useState<Delegation | null>(null);
  const [loading, setLoading] = useState(true);

  const isPresidencia = profile?.roleId === 'presidencia';
  const isAdministrador = profile?.roleId === 'administrador';
  const isPresidente = profile?.roleId === 'presidencia'; // Presidente es el admin general

  const loadPermissions = async () => {
    if (!user?.uid) {
      setPermissions({});
      setDelegation(null);
      setLoading(false);
      return;
    }

    try {
      const [effectivePerms, activeDelegation] = await Promise.all([
        getEffectivePermissions(user.uid),
        getActiveDelegation(user.uid)
      ]);

      setPermissions(effectivePerms);
      setDelegation(activeDelegation);
    } catch (error) {
      console.error('Error loading permissions:', error);
      setPermissions({});
      setDelegation(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPermissions();
  }, [user?.uid]);

  // Suscribirse a cambios en permisos
  useEffect(() => {
    if (!user?.uid) return;

    const unsubscribePermissions = onPermissions(user.uid, () => {
      loadPermissions();
    });

    return unsubscribePermissions;
  }, [user?.uid]);

  const can = (moduleId: string, requiredLevel: PermissionLevel): boolean => {
    // Presidente (presidencia) tiene acceso total a todo como administrador general
    if (isPresidente || isAdministrador) return true;

    const userLevel = permissions[moduleId] || 'none';
    const userLevelValue = PERMISSION_HIERARCHY[userLevel];
    const requiredLevelValue = PERMISSION_HIERARCHY[requiredLevel];

    return userLevelValue >= requiredLevelValue;
  };

  const value: AuthzContextType = {
    permissions,
    delegation,
    loading,
    can,
    isPresidencia,
    isAdministrador,
    isPresidente,
    canDeleteWithoutAuth: isPresidente, // Solo el Presidente puede eliminar sin autorización
    canChangeRoles: isPresidente, // Solo el Presidente puede cambiar roles
    refresh: loadPermissions
  };

  return (
    <AuthzContext.Provider value={value}>
      {children}
    </AuthzContext.Provider>
  );
};