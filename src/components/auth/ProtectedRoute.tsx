// src/routes/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Role = string;

/**
 * Roles que tienen acceso al panel de administración (/inicio y módulos admin).
 * Cualquier roleId que NO esté en esta lista se considera "socio puro".
 */
const ADMIN_ROLES = new Set([
  'presidencia', 'administrador', 'super_admin', 'admin',
  'secretaria', 'tesoreria', 'vocal', 'seguridad', 'coordinador',
]);

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Rol requerido para entrar a la ruta.
   * Puede ser un rol único ("TESORERIA") o un array ["TESORERIA","ADMIN"].
   * Si se omite, sólo se exige estar autenticado.
   */
  requireRole?: Role | Role[];
  /**
   * Si es true, sólo usuarios con rol admin pueden entrar.
   * Los socios (rol no admin) son redirigidos a /portal-asociado.
   */
  soloAdmin?: boolean;
}

const normalize = (v?: string | null) => (v || '').trim().toLowerCase();

const userIsSuperAdmin = (email?: string | null, roleId?: string | null | undefined) => {
  const isEmailSuper = normalize(email) === 'presidencia@jpusap.com';
  const isRoleSuper = normalize(roleId || '') === 'super_admin';
  return isEmailSuper || isRoleSuper;
};

const hasRequiredRole = (userRole?: Role | null, required?: Role | Role[] | undefined) => {
  if (!required) return true;
  const requiredArr = Array.isArray(required) ? required : [required];
  return requiredArr.map(normalize).includes(normalize(userRole || ''));
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireRole,
  soloAdmin = false,
}) => {
  const { user, loading, profileLoaded } = useAuth();
  const location = useLocation();

  // 1) Mientras se resuelve la sesión
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin" />
          <p className="text-sm text-muted-foreground">Verificando autenticación...</p>
        </div>
      </div>
    );
  }

  // 2) Si no hay usuario -> al login (y guardamos a dónde quería ir)
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 3) SUPER ADMIN siempre entra (por email o por roleId)
  if (userIsSuperAdmin(user.email, user.profile?.roleId)) {
    return <>{children}</>;
  }

  // 4) soloAdmin: esperar que el perfil cargue y luego verificar rol
  if (soloAdmin && profileLoaded) {
    const roleId = normalize(user.profile?.roleId);
    if (!ADMIN_ROLES.has(roleId)) {
      return <Navigate to="/portal-asociado" replace />;
    }
  }

  // 5) Si se requiere rol específico
  if (requireRole) {
    const ok = hasRequiredRole(user.profile?.roleId, requireRole);
    if (!ok) {
      return <Navigate to="/inicio" replace />;
    }
  }

  // 6) Autenticado (y con rol correcto si se pidió)
  return <>{children}</>;
};
