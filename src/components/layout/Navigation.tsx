import { Home, Calendar, DollarSign, Shield, MoreHorizontal, Users, LogOut, Settings } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import { signOutUser } from "@/services/auth";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuthz } from "@/contexts/AuthzContext";
import { VersionBadge } from "@/components/layout/VersionBadge";
import { useAuth } from "@/contexts/AuthContext";

/** 👇 Rutas con sus módulos de permisos correspondientes */
const allNavigationItems = [
  { icon: Home, label: "Inicio", href: "/inicio", module: null }, // Inicio siempre visible
  { icon: Calendar, label: "Sesiones", href: "/sesiones", module: "deportes" },
  { icon: DollarSign, label: "Cobranzas", href: "/cobranzas", module: "cobranzas" },
  { icon: Users, label: "Portal", href: "/portal-asociado", module: "portal" },
  { icon: MoreHorizontal, label: "Más", href: "/modulos", module: null }, // Módulos siempre visible
];

export const BottomNavigation = () => {
  const location = useLocation();
  const { can, loading } = useAuthz();

  // Si está cargando, mostrar navegación básica
  if (loading) {
    return (
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
        <div className="flex items-center justify-around px-1 py-1">
          <Link
            to="/inicio"
            className="flex flex-col items-center py-2 px-2 rounded-lg transition-all duration-200 min-w-[55px] max-w-[70px] text-primary bg-primary/10"
          >
            <Home className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
            <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">Inicio</span>
          </Link>
        </div>
      </nav>
    );
  }

  // Filtrar los elementos de navegación según los permisos del usuario
  const navigationItems = allNavigationItems.filter(item => {
    // Inicio y Módulos siempre visibles
    if (!item.module) return true;
    
    // Verificar si el usuario tiene al menos permisos de lectura
    return can(item.module, 'read');
  });

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around px-1 py-1">
        {navigationItems.map((item) => {
          // activo si la ruta coincide o si estás en una subruta de ese item
          const isActive =
            location.pathname === item.href ||
            (item.href !== "/inicio" && location.pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-2 rounded-lg transition-all duration-200 min-w-[55px] max-w-[70px]",
                isActive
                  ? "text-primary bg-primary/10"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-4 w-4 sm:h-5 sm:w-5 mb-1" />
              <span className="text-[10px] sm:text-xs font-medium text-center leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export const TopNavigation = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();

  const handleLogout = async () => {
    try {
      await signOutUser();
      toast({
        title: "Sesión cerrada",
        description: "Has cerrado sesión exitosamente",
      });
      navigate("/login");
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al cerrar sesión",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-card border-b border-border backdrop-blur-sm">
      <div className="container mx-auto px-3 sm:px-4 h-14 sm:h-16 flex items-center justify-between">
        <div className="flex items-center gap-2 sm:gap-3">
          {/* 👇 Logo/Marca siempre vuelve a /inicio (NO a "/") */}
          <Link to="/inicio" className="text-lg sm:text-xl font-bold text-primary hover:underline truncate">
            <span className="hidden sm:inline">Gestoria Digital</span>
            <span className="sm:hidden">Gestoria</span>
          </Link>
          <VersionBadge />
        </div>
        <div className="flex items-center space-x-2 sm:space-x-4">
          <div className="hidden lg:flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Usuario:</span>
            <span className="text-sm font-medium">{profile?.displayName || "Usuario"}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/configuracion-cuenta")}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3"
          >
            <Settings className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-xs sm:text-sm">Configuración</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3"
          >
            <LogOut className="h-3 w-3 sm:h-4 sm:w-4" />
            <span className="hidden sm:inline text-xs sm:text-sm">Cerrar Sesión</span>
            <span className="sm:hidden text-xs">Salir</span>
          </Button>
        </div>
      </div>
    </header>
  );
};
