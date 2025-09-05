// src/routes/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

type Role = string;

interface ProtectedRouteProps {
  children: React.ReactNode;
  /**
   * Rol requerido para entrar a la ruta.
   * Puede ser un rol único ("TESORERIA") o un array ["TESORERIA","ADMIN"].
   * Si se omite, sólo se exige estar autenticado.
   */
  requireRole?: Role | Role[];
}

const normalize = (v?: string | null) => (v || '').trim().toLowerCase();

const userIsSuperAdmin = (email?: string | null, roleId?: string | null | undefined) => {
  const isEmailSuper = normalize(email) === 'presidencia@jpusap.com';
  const isRoleSuper = normalize(roleId || '') === 'super_admin';
  return isEmailSuper || isRoleSuper;
};

const hasRequiredRole = (userRole?: Role | null, required?: Role | Role[] | undefined) => {
  if (!required) return true; // no role required -> OK
  const requiredArr = Array.isArray(required) ? required : [required];
  return requiredArr.map(normalize).includes(normalize(userRole || ''));
};

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, requireRole }) => {
  const { user, loading } = useAuth();
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

  // 4) Si se requiere rol específico:
  //    - Si el perfil aún no está (p.ej. primera vez), permitimos pasar
  //      cuando NO se pidió rol. Si SÍ se pidió rol y no hay perfil,
  //      reenviamos a /inicio.
  if (requireRole) {
    const ok = hasRequiredRole(user.profile?.roleId, requireRole);
    if (!ok) {
      // Sin permiso -> mandamos a /inicio (o una página 403 si la tienes)
      return <Navigate to="/inicio" replace />;
    }
  }

  // 5) Autenticado (y con rol correcto si se pidió)
  return <>{children}</>;
};
