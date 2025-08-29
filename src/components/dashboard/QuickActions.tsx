import { Plus, FileText, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const quickActions = [
  {
    title: "Nueva Sesión",
    description: "Programar reunión de JD",
    icon: Plus,
    variant: "primary" as const,
    href: "/sesiones/nueva"
  },
  {
    title: "Registrar Pago",
    description: "Cuotas y contribuciones",
    icon: DollarSign,
    variant: "success" as const,
    href: "/finanzas/pago"
  },
  {
    title: "Nueva Acta",
    description: "Redactar acta de sesión",
    icon: FileText,
    variant: "secondary" as const,
    href: "/actas/nueva"
  },
  {
    title: "Reportar Incidente",
    description: "Seguridad y vigilancia",
    icon: AlertTriangle,
    variant: "warning" as const,
    href: "/seguridad/incidente"
  }
];

export const QuickActions = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Button
              key={action.title}
              variant="outline"
              className="h-auto p-4 flex flex-col items-center space-y-2 hover:bg-muted"
              asChild
            >
              <a href={action.href}>
                <action.icon className="h-6 w-6 text-muted-foreground" />
                <div className="text-center">
                  <div className="font-medium text-sm">{action.title}</div>
                  <div className="text-xs text-muted-foreground">{action.description}</div>
                </div>
              </a>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};