import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import { AuthzProvider } from "@/contexts/AuthzContext";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Finanzas from "./pages/Finanzas";
import Sesiones from "./pages/Sesiones";
import NotFound from "./pages/NotFound";
import Users from "./pages/admin/Users";
import UserNew from "./pages/admin/UserNew";

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
              <Route path="/" element={<Index />} />
              <Route path="/inicio" element={<Index />} />
              <Route path="/finanzas" element={<Finanzas />} />
              <Route path="/sesiones" element={<Sesiones />} />
              {/* Admin routes */}
              <Route path="/admin/users" element={<Users />} />
              <Route path="/admin/users/new" element={<UserNew />} />
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
