import React, { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Routes, Route, Navigate } from "react-router-dom"; // 👈 el Router está en main.tsx
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthzProvider } from "@/contexts/AuthzContext";
import { BillingConfigProvider } from "@/contexts/BillingConfigContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminCreator } from "@/components/auth/AdminCreator";
import { useVersionCheck } from "@/hooks/useVersionCheck";

// 🔔 NUEVO: botón e init de notificaciones
import { NotificationsButton } from "@/components/NotificationsButton";
import { ensureMessagingReady } from "@/messaging";
import { MensajeMasivoOverlay } from "@/components/comunicaciones/MensajeMasivoOverlay";

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
import Eventos from "./pages/Eventos";
import AdminEventos from "./pages/AdminEventos";
import AdminDeportes from "./pages/AdminDeportes";
import Modulos from "./pages/Modulos";
import RecuperarContrasena from "./pages/RecuperarContrasena";
import Comunicaciones from "./pages/Comunicaciones";

const queryClient = new QueryClient();

const App: React.FC = () => {
  // Check for updates every minute
  useVersionCheck(60000);

  // 🔔 Prepara el SW y el listener de mensajes en foreground (no pide permiso aquí)
  useEffect(() => {
    ensureMessagingReady();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />

        {/* Barra superior simple con el botón de notificaciones */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderBottom: "1px solid #eee",
            background: "#fff",
          }}
        >
          <span style={{ fontWeight: 600 }}>Administración de Seguridad</span>
          <NotificationsButton />
        </div>

        {/* 👇 NINGÚN Router aquí. El Router va en main.tsx */}
        <AuthProvider>
          {/* Overlay de mensajes masivos - aparece globalmente para todos los usuarios autenticados */}
          <MensajeMasivoOverlay />
          
          {/* BillingConfigProvider depends on authenticated profile/modules, mount it inside AuthProvider */}
          <BillingConfigProvider>
            <AuthzProvider>
            <Routes>
              {/* Raíz → /inicio */}
              <Route path="/" element={<Navigate to="/inicio" replace />} />

              {/* Público */}
              <Route path="/login" element={<Login />} />
              <Route path="/recuperar-contrasena" element={<RecuperarContrasena />} />
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

              {/* Eventos */}
              <Route
                path="/eventos"
                element={
                  <ProtectedRoute>
                    <Eventos />
                  </ProtectedRoute>
                }
              />

              {/* Administración de Eventos */}
              <Route
                path="/admin-eventos"
                element={
                  <ProtectedRoute>
                    <AdminEventos />
                  </ProtectedRoute>
                }
              />

              {/* Comunicaciones */}
              <Route
                path="/comunicaciones"
                element={
                  <ProtectedRoute>
                    <Comunicaciones />
                  </ProtectedRoute>
                }
              />

              {/* Administración de Deportes */}
              <Route
                path="/admin-deportes"
                element={
                  <ProtectedRoute>
                    <AdminDeportes />
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

              {/* Más - Opciones adicionales */}
              <Route
                path="/modulos"
                element={
                  <ProtectedRoute>
                    <Modulos />
                  </ProtectedRoute>
                }
              />

              {/* 404 */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            </AuthzProvider>
          </BillingConfigProvider>
        </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
