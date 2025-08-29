import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthzProvider } from "@/contexts/AuthzContext";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Finanzas from "./pages/Finanzas";
import Sesiones from "./pages/Sesiones";
import NotFound from "./pages/NotFound";
import Users from "./pages/admin/Users";
import UserNew from "./pages/admin/UserNew";
import UserPermissions from "./pages/admin/UserPermissions";
import Empadronados from "./pages/Empadronados";
import EmpadronadoForm from "./pages/EmpadronadoForm";
import Cobranzas from "./pages/Cobranzas";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
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
          <Route path="/finanzas" element={<Finanzas />} />
          <Route path="/sesiones" element={<Sesiones />} />
          <Route path="/cobranzas" element={<Cobranzas />} />
          <Route path="/usuarios" element={<Users />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
