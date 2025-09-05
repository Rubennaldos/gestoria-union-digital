import { Plus, FileText, DollarSign, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

// TODO: Conectar con datos reales - estas acciones deberían ser dinámicas
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
  // TODO: Las acciones deberían basarse en permisos del usuario
  const availableActions = quickActions; // Filtrar según permisos
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Acciones Rápidas</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-3">
          {availableActions.length === 0 ? (
            <div className="col-span-2 text-center py-4">
              <p className="text-sm text-muted-foreground">No hay acciones disponibles</p>
            </div>
          ) : (
            availableActions.map((action) => (
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
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
};