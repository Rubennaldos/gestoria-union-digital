import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireRole?: string;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireRole 
}) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  // Mostrar loading mientras se verifica la autenticación
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

  // Si no hay usuario, redirigir a login
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si se requiere un rol específico, verificar
  if (requireRole && user.profile?.roleId !== requireRole) {
    console.log('🚫 Access denied:', {
      requiredRole: requireRole,
      userRole: user.profile?.roleId,
      userProfile: user.profile,
      redirecting: 'to /inicio'
    });
    return <Navigate to="/inicio" replace />;
  }

  console.log('✅ Access granted:', {
    requiredRole: requireRole,
    userRole: user.profile?.roleId
  });

  return <>{children}</>;
};