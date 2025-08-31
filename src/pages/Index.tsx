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

// TODO: Los módulos deberían mostrar badges dinámicos basados en datos reales
const modules = [
  {
    title: "Usuarios y Permisos",
    description: "Gestión de usuarios, roles y niveles de acceso",
    icon: Users,
    href: "/usuarios",
    color: "primary" as const,
    restricted: true
  },
  {
    title: "Padrón y Delegados", 
    description: "Registro de asociados por etapas",
    icon: UserCheck,
    href: "/padron",
    color: "secondary" as const
  },
  {
    title: "Actas y Archivos",
    description: "Redacción y gestión documental",
    icon: FileText,
    href: "/actas", 
    color: "primary" as const
  },
  {
    title: "Sesiones y Asambleas",
    description: "Convocatorias, quórum y votaciones",
    icon: Calendar,
    href: "/sesiones",
    color: "primary" as const
    // badge será dinámico basado en próximas sesiones
  },
  {
    title: "Cobranzas",
    description: "Gestión de pagos mensuales, descuentos y morosidad",
    icon: DollarSign,
    href: "/cobranzas", 
    color: "success" as const
    // badge será dinámico basado en pagos pendientes
  },
  {
    title: "Sanciones",
    description: "Procedimientos disciplinarios",
    icon: Gavel,
    href: "/sanciones",
    color: "warning" as const
  },
  {
    title: "Seguridad",
    description: "Incidentes y planes de vigilancia", 
    icon: Shield,
    href: "/seguridad",
    color: "warning" as const
  },
  {
    title: "Comunicaciones",
    description: "Publicaciones y comunicados",
    icon: MessageSquare,
    href: "/comunicaciones",
    color: "secondary" as const
  },
  {
    title: "Deportes",
    description: "Torneos y actividades recreativas",
    icon: Trophy,
    href: "/deportes", 
    color: "success" as const
  },
  {
    title: "Salud y Ambiente",
    description: "Campañas y mantenimiento",
    icon: Heart,
    href: "/salud",
    color: "success" as const
  },
  {
    title: "Educación y Cultura",
    description: "Talleres y programas educativos",
    icon: GraduationCap,
    href: "/educacion",
    color: "secondary" as const
  },
  {
    title: "Electoral",
    description: "Gestión de procesos electorales",
    icon: Vote,
    href: "/electoral",
    color: "primary" as const
  },
  {
    title: "Patrimonio",
    description: "Inventario y bienes",
    icon: Package,
    href: "/patrimonio",
    color: "secondary" as const
  },
  {
    title: "Plan Anual",
    description: "Presupuesto y seguimiento",
    icon: BarChart3,
    href: "/plan-anual",
    color: "primary" as const
  },
  {
    title: "Auditoría", 
    description: "Revisión y conformidad",
    icon: Search,
    href: "/auditoria",
    color: "warning" as const
  },
  {
    title: "Obras e Infraestructura",
    description: "Proyectos y mantenimiento",
    icon: Building,
    href: "/obras",
    color: "secondary" as const
  },
  {
    title: "Portal del Asociado",
    description: "Visitas, pagos, eventos y sugerencias",
    icon: UserCircle,
    href: "/portal-asociado",
    color: "primary" as const
  }
];

const Index = () => {
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
            {modules.map((module) => (
              <ModuleCard
                key={module.href}
                title={module.title}
                description={module.description}
                icon={module.icon}
                href={module.href}
                color={module.color}
                // badge será dinámico en el futuro
                badge={undefined}
              />
            ))}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Index;
