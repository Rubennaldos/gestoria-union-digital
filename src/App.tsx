import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
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

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <AuthzProvider>
            <Routes>
          {/* Página de inicio por defecto */}
          <Route path="/" element={<Index />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/users/new" element={<UserNew />} />
          <Route path="/admin/users/:uid/permissions" element={<UserPermissions />} />
          <Route path="/padron" element={<Empadronados />} />
          <Route path="/padron/nuevo" element={<EmpadronadoForm />} />
          <Route path="/padron/editar/:id" element={<EmpadronadoForm />} />
          <Route path="/login" element={<Login />} />
          <Route path="/inicio" element={<Index />} />
          
          <Route path="/sesiones" element={
            <ProtectedRoute>
              <Sesiones />
            </ProtectedRoute>
          } />
          <Route path="/cobranzas" element={
            <ProtectedRoute>
              <Cobranzas />
            </ProtectedRoute>
          } />
          <Route path="/sanciones" element={
            <ProtectedRoute>
              <Sanciones />
            </ProtectedRoute>
          } />
          <Route path="/deportes" element={
            <ProtectedRoute>
              <Deportes />
            </ProtectedRoute>
          } />
          <Route path="/patrimonio" element={
            <ProtectedRoute>
              <Patrimonio />
            </ProtectedRoute>
          } />
          <Route path="/usuarios" element={
            <ProtectedRoute>
              <Users />
            </ProtectedRoute>
          } />
          
          {/* Bootstrap inicial */}
          <Route path="/bootstrap" element={<AdminCreator />} />
          
          <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthzProvider>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
