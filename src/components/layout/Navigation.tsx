import { Home, Calendar, DollarSign, Shield, MoreHorizontal, Users } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";

const navigationItems = [
  { icon: Home, label: "Inicio", href: "/" },
  { icon: Calendar, label: "Sesiones", href: "/sesiones" },
  { icon: DollarSign, label: "Cobranzas", href: "/cobranzas" },
  { icon: Users, label: "Portal", href: "/portal-asociado" },
  { icon: MoreHorizontal, label: "Más", href: "/modulos" },
];

export const BottomNavigation = () => {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-50 md:hidden">
      <div className="flex items-center justify-around px-2 py-1">
        {navigationItems.map((item) => {
          const isActive = location.pathname === item.href;
          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex flex-col items-center py-2 px-3 rounded-lg transition-all duration-200 min-w-[60px]",
                isActive
                  ? "text-primary bg-primary-light"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              )}
            >
              <item.icon className="h-5 w-5 mb-1" />
              <span className="text-xs font-medium">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export const TopNavigation = () => {
  return (
    <header className="sticky top-0 z-40 w-full bg-card border-b border-border backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <h1 className="text-xl font-bold text-primary">Gestoria Digital</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="hidden md:flex items-center space-x-2">
            <span className="text-sm text-muted-foreground">Usuario:</span>
            <span className="text-sm font-medium">Administrador</span>
          </div>
        </div>
      </div>
    </header>
  );
};