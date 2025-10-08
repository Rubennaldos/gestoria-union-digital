import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom"; // 👈 el Router está en main.tsx
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthzProvider } from "@/contexts/AuthzContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminCreator } from "@/components/auth/AdminCreator";
import { useVersionCheck } from "@/hooks/useVersionCheck";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Sesiones from "./pages/Sesiones";
import PagosCuotas from "./pages/PagosCuotas";
import NotFound from "./pages/NotFound";
import Users from "./pages/admin/Users";
import UserNew from "./pages/admin/UserNew";
import UserPermissions from "./pages/admin/UserPermissions";
import Empadronados from "./pages/Empadronados";
import EmpadronadoForm from "./pages/EmpadronadoForm";
import ImportacionRTDB from "./pages/ImportacionRTDB";
import Cobranzas from "./pages/Cobranzas";
import CobranzasV2 from "./pages/CobranzasV2";
import Sanciones from "./pages/Sanciones";
import Deportes from "./pages/Deportes";
import Patrimonio from "./pages/Patrimonio";
import PortalAsociado from "./pages/PortalAsociado";
import Acceso from "./pages/Acceso";
import Seguridad from "./pages/Seguridad";
import AdminSeguridad from "./pages/AdminSeguridad";
import Finanzas from "./pages/Finanzas";
import ConfiguracionCuenta from "./pages/ConfiguracionCuenta";
import Planilla from "./pages/Planilla";

const queryClient = new QueryClient();

const App: React.FC = () => {
  // Check for updates every minute
  useVersionCheck(60000);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/* 👇 NINGÚN Router aquí. El Router va en main.tsx */}
        <AuthProvider>
          <AuthzProvider>
            <Routes>
              {/* Raíz → /inicio */}
              <Route path="/" element={<Navigate to="/inicio" replace />} />

              {/* Público */}
              <Route path="/login" element={<Login />} />
              <Route path="/bootstrap" element={<AdminCreator />} />

              {/* Inicio protegido */}
              <Route
                path="/inicio"
                element={
                  <ProtectedRoute>
                    <Index />
                  </ProtectedRoute>
                }
              />

              {/* Admin (rol presidencia) */}
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute requireRole="presidencia">
                    <Users />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/new"
                element={
                  <ProtectedRoute requireRole="presidencia">
                    <UserNew />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users/:uid/permissions"
                element={
                  <ProtectedRoute requireRole="presidencia">
                    <UserPermissions />
                  </ProtectedRoute>
                }
              />

              {/* Padrones */}
              <Route
                path="/padron"
                element={
                  <ProtectedRoute>
                    <Empadronados />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/padron/nuevo"
                element={
                  <ProtectedRoute>
                    <EmpadronadoForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/padron/editar/:id"
                element={
                  <ProtectedRoute>
                    <EmpadronadoForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/importacion"
                element={
                  <ProtectedRoute>
                    <ImportacionRTDB />
                  </ProtectedRoute>
                }
              />

              {/* Módulos protegidos */}
              <Route
                path="/sesiones"
                element={
                  <ProtectedRoute>
                    <Sesiones />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/cobranzas"
                element={
                  <ProtectedRoute>
                    <Cobranzas />
                  </ProtectedRoute>
                }
              />

              {/* 🔧 CORREGIDO: usamos /cobranzas_v2 */}
              <Route
                path="/cobranzas_v2"
                element={
                  <ProtectedRoute>
                    <CobranzasV2 />
                  </ProtectedRoute>
                }
              />
              {/* Compat: si alguien entra a /cobranzas-v2, lo mando a /cobranzas_v2 */}
              <Route path="/cobranzas-v2" element={<Navigate to="/cobranzas_v2" replace />} />

              <Route
                path="/pagos-cuotas"
                element={
                  <ProtectedRoute>
                    <PagosCuotas />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sanciones"
                element={
                  <ProtectedRoute>
                    <Sanciones />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/deportes"
                element={
                  <ProtectedRoute>
                    <Deportes />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/patrimonio"
                element={
                  <ProtectedRoute>
                    <Patrimonio />
                  </ProtectedRoute>
                }
              />

              {/* Portal del Asociado */}
              <Route
                path="/portal-asociado"
                element={
                  <ProtectedRoute>
                    <PortalAsociado />
                  </ProtectedRoute>
                }
              />

              {/* Control de Acceso */}
              <Route
                path="/acceso"
                element={
                  <ProtectedRoute>
                    <Acceso />
                  </ProtectedRoute>
                }
              />

              {/* Seguridad Pórtico */}
              <Route
                path="/seguridad"
                element={
                  <ProtectedRoute>
                    <Seguridad />
                  </ProtectedRoute>
                }
              />

              {/* Administración de Seguridad */}
              <Route
                path="/admin-seguridad"
                element={
                  <ProtectedRoute>
                    <AdminSeguridad />
                  </ProtectedRoute>
                }
              />

              {/* Finanzas */}
              <Route
                path="/finanzas"
                element={
                  <ProtectedRoute>
                    <Finanzas />
                  </ProtectedRoute>
                }
              />

              {/* Configuración de Cuenta */}
              <Route
                path="/configuracion-cuenta"
                element={
                  <ProtectedRoute>
                    <ConfiguracionCuenta />
                  </ProtectedRoute>
                }
              />

              {/* Planilla de Personal */}
              <Route
                path="/planilla"
                element={
                  <ProtectedRoute>
                    <Planilla />
                  </ProtectedRoute>
                }
              />

              {/* Alias de /usuarios hacia admin/users */}
              <Route
                path="/usuarios"
                element={
                  <ProtectedRoute requireRole="presidencia">
                    <Users />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthzProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
