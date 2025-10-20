import { 
  Users, FileText, Calendar, DollarSign, Shield, MessageSquare,
  Trophy, Heart, GraduationCap, Vote, Package, BarChart3,
  UserCheck, Search, Gavel, Building, UserCircle, CreditCard, Settings,
  Briefcase, PartyPopper
} from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { ModuleCard } from "@/components/ui/module-card";
import { ModuleCircle } from "@/components/ui/module-circle";
import { QuickAccessSection } from "@/components/dashboard/QuickAccessSection";
import { SolicitudesPendientesWidget } from "@/components/dashboard/SolicitudesPendientesWidget";
import { useAuthz } from "@/contexts/AuthzContext";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect, useState } from "react";
import { listModules } from "@/services/rtdb";
import { Module } from "@/types/auth";
import { useModulePreferences } from "@/hooks/useModulePreferences";
import { useIsMobile } from "@/hooks/use-mobile";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";

// Mapa de iconos para los módulos
const moduleIcons: Record<string, any> = {
  padron: UserCheck,
  actas: FileText,
  sesiones: Calendar,
  "cobranzas-v2": CreditCard,
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
  "portal-asociado": UserCircle,
  acceso: UserCheck,
  pagosCuotas: CreditCard,
  admin_seguridad: Shield,
  finanzas: BarChart3,
  planilla: Briefcase,
  eventos: PartyPopper,
  admin_eventos: Calendar
};

// Mapa de colores para los módulos
const moduleColors: Record<string, "primary" | "warning" | "success" | "secondary"> = {
  padron: "secondary",
  actas: "primary",
  sesiones: "primary",
  "cobranzas-v2": "success",
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
  "portal-asociado": "primary",
  acceso: "secondary",
  pagosCuotas: "success",
  admin_seguridad: "warning",
  finanzas: "success",
  planilla: "primary",
  eventos: "success",
  admin_eventos: "warning"
};

// Mapa de rutas para los módulos
const moduleRoutes: Record<string, string> = {
  padron: "/padron",
  actas: "/actas",
  sesiones: "/sesiones",
  "cobranzas-v2": "/cobranzas-v2",
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
  "portal-asociado": "/portal-asociado",
  acceso: "/acceso",
  pagosCuotas: "/pagos-cuotas",
  admin_seguridad: "/admin-seguridad",
  finanzas: "/finanzas",
  planilla: "/planilla",
  eventos: "/eventos",
  admin_eventos: "/admin-eventos"
};

const Index = () => {
  const { can, loading: authLoading } = useAuthz();
  const { user, profile } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(true);
  const isMobile = useIsMobile();

  const {
    favorites,
    toggleFavorite,
    updateOrder,
    getOrderedModules,
  } = useModulePreferences(modules);

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

  const orderedModules = getOrderedModules();

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const oldIndex = orderedModules.findIndex((m) => m.id === active.id);
      const newIndex = orderedModules.findIndex((m) => m.id === over.id);

      const newOrder = [...orderedModules];
      const [removed] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, removed);

      updateOrder(newOrder.map((m) => m.id));
    }
  };

  const handleFavoriteReorder = (newFavoriteOrder: string[]) => {
    // Actualizar el orden de favoritos
    const nonFavorites = orderedModules
      .filter((m) => !newFavoriteOrder.includes(m.id))
      .map((m) => m.id);
    updateOrder([...newFavoriteOrder, ...nonFavorites]);
  };

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
        <div className="text-center md:text-left">
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Panel Principal
          </h1>
          <p className="text-muted-foreground">
            Sistema de Gestión - Junta Directiva
          </p>
        </div>

        {/* Welcome Message */}
        <div className="bg-card border rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">
            Bienvenido: {profile?.displayName || user?.displayName || user?.email || 'Usuario'}
          </h2>
          <p className="text-muted-foreground">
            Sistema de Gestión - Junta Directiva
          </p>
        </div>

        {/* Solicitudes Pendientes Widget */}
        <SolicitudesPendientesWidget />

        {/* Quick Access Section - Only Mobile */}
        {isMobile && (
          <QuickAccessSection
            modules={modules}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onReorder={handleFavoriteReorder}
            moduleIcons={moduleIcons}
            moduleColors={moduleColors}
            moduleRoutes={moduleRoutes}
          />
        )}

        {/* Modules Grid */}
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">
            Módulos del Sistema
          </h2>
          
          {isMobile ? (
            // Mobile: Circular draggable modules
            <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext
                items={orderedModules.map((m) => m.id)}
                strategy={rectSortingStrategy}
              >
                <div className="flex flex-wrap gap-6 justify-start">
                  {orderedModules.map((module) => {
                    const icon = moduleIcons[module.id] || Package;
                    const color = moduleColors[module.id] || "primary";
                    const href = moduleRoutes[module.id] || `/${module.id}`;

                    return (
                      <ModuleCircle
                        key={module.id}
                        id={module.id}
                        title={module.nombre}
                        icon={icon}
                        href={href}
                        color={color}
                      />
                    );
                  })}
                </div>
              </SortableContext>
            </DndContext>
          ) : (
            // Desktop: Card layout
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {orderedModules.map((module) => {
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
          )}

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
