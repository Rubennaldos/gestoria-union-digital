import { 
  FileText, Calendar, Shield, MessageSquare,
  Trophy, Heart, GraduationCap, Vote, Package, BarChart3,
  UserCheck, Search, Gavel, Building, UserCircle, CreditCard, Settings,
  Briefcase, PartyPopper, FileBarChart
} from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { ModuleCard } from "@/components/ui/module-card";
import { ModuleCircle } from "@/components/ui/module-circle";
import { QuickAccessSection } from "@/components/dashboard/QuickAccessSection";
import { SolicitudesPendientesWidget } from "@/components/dashboard/SolicitudesPendientesWidget";
import { PagosPendientesWidget } from "@/components/dashboard/PagosPendientesWidget";
import { useAuth } from "@/contexts/AuthContext";
import { useMemo } from "react";
import { Module } from "@/types/auth";
import { useModulePreferences } from "@/hooks/useModulePreferences";
import { useIsMobile } from "@/hooks/use-mobile";
import { DndContext, closestCenter, DragEndEvent } from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";

/** Roles con acceso completo al panel (ven todos los módulos si no tienen permisos explícitos) */
const ADMIN_ROLES = ['presidencia', 'administrador', 'super_admin', 'admin'];

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
  admin_eventos: Calendar,
  admin_deportes: Building,
  balances: FileBarChart,
  admin_balances: Settings
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
  admin_eventos: "warning",
  admin_deportes: "success",
  balances: "primary",
  admin_balances: "warning"
};

// Mapa de nombres legibles para cada módulo (antes venía de Firebase)
const moduleNames: Record<string, string> = {
  padron:           "Padrón de Socios",
  actas:            "Actas",
  sesiones:         "Sesiones",
  "cobranzas-v2":   "Cobranzas V2",
  cobranzas:        "Cobranzas V2",   // alias legacy → apunta al módulo V2
  sanciones:        "Sanciones",
  seguridad:        "Seguridad",
  comunicaciones:   "Comunicaciones",
  deportes:         "Deportes",
  salud:            "Salud",
  educacion:        "Educación",
  electoral:        "Electoral",
  patrimonio:       "Patrimonio",
  "plan-anual":     "Plan Anual",
  auditoria:        "Auditoría",
  obras:            "Obras",
  "portal-asociado":"Portal del Socio",
  acceso:           "Control de Acceso",
  pagosCuotas:      "Pagos de Cuotas",
  admin_seguridad:  "Admin. Seguridad",
  finanzas:         "Finanzas",
  planilla:         "Planilla",
  eventos:          "Eventos",
  admin_eventos:    "Admin. Eventos",
  admin_deportes:   "Admin. Deportes",
  balances:         "Balances",
  admin_balances:   "Admin. Balances",
};

// Mapa de rutas para los módulos
const moduleRoutes: Record<string, string> = {
  padron:           "/padron",
  actas:            "/actas",
  sesiones:         "/sesiones",
  "cobranzas-v2":   "/cobranzas-v2",
  cobranzas:        "/cobranzas-v2",  // alias legacy → redirige a V2
  sanciones:        "/sanciones",
  seguridad:        "/seguridad",
  comunicaciones:   "/comunicaciones",
  deportes:         "/deportes",
  salud:            "/salud",
  educacion:        "/educacion",
  electoral:        "/electoral",
  patrimonio:       "/patrimonio",
  "plan-anual":     "/plan-anual",
  auditoria:        "/auditoria",
  obras:            "/obras",
  "portal-asociado":"/portal-asociado",
  acceso:           "/acceso",
  pagosCuotas:      "/pagos-cuotas",
  admin_seguridad:  "/admin-seguridad",
  finanzas:         "/finanzas",
  planilla:         "/planilla",
  eventos:          "/eventos",
  admin_eventos:    "/admin-eventos",
  admin_deportes:   "/admin-deportes",
  balances:         "/balances",
  admin_balances:   "/admin-balances",
};

const Index = () => {
  const { user, profile, empadronado, loading: authLoading } = useAuth();
  const isMobile = useIsMobile();

  /**
   * Construye la lista de módulos directamente desde profile.modules (Supabase).
   * No llama a Firebase RTDB en ningún momento.
   *
   * Lógica:
   *  - Si el perfil tiene módulos explícitos → se usan esos.
   *  - Si el rol es admin/presidencia y no tiene módulos explícitos → se muestran
   *    todos los módulos conocidos (acceso completo).
   */
  const modules = useMemo((): Module[] => {
    if (!profile) return [];

    const roleId = (profile.roleId ?? '').toLowerCase();
    const isFullAdmin =
      ADMIN_ROLES.includes(roleId) ||
      (user?.email ?? '').toLowerCase() === 'presidencia@jpusap.com';

    // IDs con permiso explícito en Supabase profiles.modules
    const explicitIds = Object.entries(profile.modules ?? {})
      .filter(([, v]) => v && v !== 'none' && v !== false)
      .map(([id]) => id);

    // Admins sin módulos explícitos → todos los módulos del sistema
    const ids =
      isFullAdmin && explicitIds.length === 0
        ? Object.keys(moduleNames)
        : explicitIds;

    // Deduplicar: si el perfil tiene tanto 'cobranzas' como 'cobranzas-v2', 
    // mantener solo 'cobranzas-v2'. El alias 'cobranzas' ya apunta a la misma ruta.
    const dedupIds = ids.filter((id, _, arr) =>
      !(id === 'cobranzas' && arr.includes('cobranzas-v2'))
    );

    return dedupIds.map((id, idx) => ({
      id,
      nombre: moduleNames[id] ?? id,
      orden:  idx,
    }));
  }, [profile, user?.email]);

  const {
    favorites,
    toggleFavorite,
    updateOrder,
    getOrderedModules,
  } = useModulePreferences(modules);

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
    const nonFavorites = orderedModules
      .filter((m) => !newFavoriteOrder.includes(m.id))
      .map((m) => m.id);
    updateOrder([...newFavoriteOrder, ...nonFavorites]);
  };

  if (authLoading) {
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
            Bienvenido: {empadronado ? `${empadronado.nombre} ${empadronado.apellidos}` : (profile?.displayName || user?.displayName || user?.email || 'Usuario')}
          </h2>
          {empadronado && (
            <div className="text-sm text-muted-foreground space-y-1 mt-2">
              <p>Padrón N°: {empadronado.numeroPadron}</p>
              {empadronado.dni && <p>DNI: {empadronado.dni}</p>}
            </div>
          )}
          <p className="text-muted-foreground mt-2">
            Sistema de Gestión - Junta Directiva
          </p>
        </div>

        {/* Solicitudes Pendientes Widget */}
        <SolicitudesPendientesWidget />

        {/* Widget de Pagos Pendientes para aprobar */}
        <PagosPendientesWidget />

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
