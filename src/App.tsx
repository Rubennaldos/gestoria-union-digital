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

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <AuthzProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/inicio" element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } />
              <Route path="/finanzas" element={
                <ProtectedRoute>
                  <Finanzas />
                </ProtectedRoute>
              } />
              <Route path="/sesiones" element={
                <ProtectedRoute>
                  <Sesiones />
                </ProtectedRoute>
              } />
              {/* Rutas de usuarios */}
              <Route path="/usuarios" element={
                <ProtectedRoute requireRole="presidencia">
                  <Users />
                </ProtectedRoute>
              } />
              {/* Admin routes - solo para presidencia */}
              <Route path="/admin/users" element={
                <ProtectedRoute requireRole="presidencia">
                  <Users />
                </ProtectedRoute>
              } />
              <Route path="/admin/users/new" element={
                <ProtectedRoute requireRole="presidencia">
                  <UserNew />
                </ProtectedRoute>
              } />
              <Route path="/admin/users/:uid/permissions" element={
                <ProtectedRoute requireRole="presidencia">
                  <UserPermissions />
                </ProtectedRoute>
              } />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
        </TooltipProvider>
      </AuthzProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
