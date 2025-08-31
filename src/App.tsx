// src/App.tsx
import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthzProvider } from "@/contexts/AuthzContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { AdminCreator } from "@/components/auth/AdminCreator";

import Index from "./pages/Index";
import Login from "./pages/Login";
import Sesiones from "./pages/Sesiones";
import NotFound from "./pages/NotFound";
import Users from "./pages/admin/Users";
import UserNew from "./pages/admin/UserNew";
import UserPermissions from "./pages/admin/UserPermissions";
import Empadronados from "./pages/Empadronados";
import EmpadronadoForm from "./pages/EmpadronadoForm";
import Cobranzas from "./pages/Cobranzas";
import Sanciones from "./pages/Sanciones";
import Deportes from "./pages/Deportes";
import Patrimonio from "./pages/Patrimonio";

const queryClient = new QueryClient();

const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <AuthProvider>
            <AuthzProvider>
              <Routes>
                {/* Redirigir raíz a /inicio (ruta protegida) */}
                <Route path="/" element={<Navigate to="/inicio" replace />} />

                {/* Login público */}
                <Route path="/login" element={<Login />} />

                {/* Inicio protegido */}
                <Route
                  path="/inicio"
                  element={
                    <ProtectedRoute>
                      <Index />
                    </ProtectedRoute>
                  }
                />

                {/* Admin (solo rol presidencia; super admin por email pasa igual) */}
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
                {/* Alias de usuarios hacia admin/users (mismo control de rol) */}
                <Route
                  path="/usuarios"
                  element={
                    <ProtectedRoute requireRole="presidencia">
                      <Users />
                    </ProtectedRoute>
                  }
                />

                {/* Bootstrap inicial público */}
                <Route path="/bootstrap" element={<AdminCreator />} />

                {/* 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </AuthzProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
