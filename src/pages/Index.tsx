import { 
  Users, FileText, Calendar, DollarSign, Shield, MessageSquare,
  Trophy, Heart, GraduationCap, Vote, Package, BarChart3,
  UserCheck, Search, Gavel, Building, UserCircle
} from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { ModuleCard } from "@/components/ui/module-card";
import { QuickActions } from "@/components/dashboard/QuickActions";
import { AlertsWidget } from "@/components/dashboard/AlertsWidget";
import { SeedDataButton } from "@/components/ui/seedDataButton";
import { useAuthz } from "@/contexts/AuthzContext";
import { useEffect, useState } from "react";
import { listModules } from "@/services/rtdb";
import { Module } from "@/types/auth";

// Mapa de iconos para los módulos
const moduleIcons: Record<string, any> = {
  padron: UserCheck,
  actas: FileText,
  sesiones: Calendar,
  cobranzas: DollarSign,
  sanciones: Gavel,
  seguridad: Shield,
  comunicaciones: MessageSquare,
  deportes: Trophy,
  salud: Heart,
  educacion: GraduationCap,
  electoral: Vote,
  patrimonio: Package,
  "plan-anual": BarChart3,
  auditoria: Search,
  obras: Building,
  "portal-asociado": UserCircle
};

// Mapa de colores para los módulos
const moduleColors: Record<string, "primary" | "warning" | "success" | "secondary"> = {
  padron: "secondary",
  actas: "primary",
  sesiones: "primary",
  cobranzas: "success",
  sanciones: "warning",
  seguridad: "warning",
  comunicaciones: "secondary",
  deportes: "success",
  salud: "success",
  educacion: "secondary",
  electoral: "primary",
  patrimonio: "secondary",
  "plan-anual": "primary",
  auditoria: "warning",
  obras: "secondary",
  "portal-asociado": "primary"
};

// Mapa de rutas para los módulos
const moduleRoutes: Record<string, string> = {
  padron: "/padron",
  actas: "/actas",
  sesiones: "/sesiones",
  cobranzas: "/cobranzas",
  sanciones: "/sanciones",
  seguridad: "/seguridad",
  comunicaciones: "/comunicaciones",
  deportes: "/deportes",
  salud: "/salud",
  educacion: "/educacion",
  electoral: "/electoral",
  patrimonio: "/patrimonio",
  "plan-anual": "/plan-anual",
  auditoria: "/auditoria",
  obras: "/obras",
  "portal-asociado": "/portal-asociado"
};

const Index = () => {
  const { can, loading: authLoading } = useAuthz();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadModules = async () => {
      try {
        const allModules = await listModules();
        // Filtrar módulos según permisos del usuario
        const accessibleModules = allModules.filter(module => 
          can(module.id, "read") // Solo mostrar módulos con al menos permiso de lectura
        );
        setModules(accessibleModules);
      } catch (error) {
        console.error("Error loading modules:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!authLoading) {
      loadModules();
    }
  }, [can, authLoading]);

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <TopNavigation />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center">Cargando módulos...</div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-2 md:space-y-0">
          <div className="text-center md:text-left">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Panel Principal
            </h1>
            <p className="text-muted-foreground">
              Sistema de Gestión - Junta Directiva
            </p>
          </div>
          <SeedDataButton />
        </div>

        {/* Quick Actions and Alerts - Mobile Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <QuickActions />
          <AlertsWidget />
        </div>

        {/* Modules Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Módulos del Sistema
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {modules.map((module) => {
              const icon = moduleIcons[module.id] || Package;
              const color = moduleColors[module.id] || "primary";
              const href = moduleRoutes[module.id] || `/${module.id}`;
              
              return (
                <ModuleCard
                  key={module.id}
                  title={module.nombre}
                  description={`Módulo ${module.nombre}`}
                  icon={icon}
                  href={href}
                  color={color}
                  badge={undefined}
                />
              );
            })}
          </div>
          {modules.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No tienes acceso a ningún módulo del sistema.
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Index;
