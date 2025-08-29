import { AlertTriangle, Clock, CheckCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

const alerts = [
  {
    id: 1,
    type: "warning",
    title: "Cuotas vencidas",
    message: "15 asociados con cuotas pendientes",
    time: "2 horas",
    priority: "alta"
  },
  {
    id: 2,
    type: "info",
    title: "Acta por aprobar",
    message: "Sesión JD del 15/08 pendiente",
    time: "1 día",
    priority: "media"
  },
  {
    id: 3,
    type: "success",
    title: "Quórum alcanzado",
    message: "Próxima asamblea confirmada",
    time: "3 horas",
    priority: "baja"
  }
];

const getIcon = (type: string) => {
  switch (type) {
    case "warning":
      return AlertTriangle;
    case "info":
      return Clock;
    case "success":
      return CheckCircle;
    default:
      return AlertTriangle;
  }
};

const getVariant = (priority: string) => {
  switch (priority) {
    case "alta":
      return "destructive";
    case "media":
      return "secondary";
    case "baja":
      return "outline";
    default:
      return "secondary";
  }
};

export const AlertsWidget = () => {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Alertas y Notificaciones
          <Badge variant="secondary" className="text-xs">
            {alerts.filter(a => a.priority === "alta").length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {alerts.map((alert) => {
          const Icon = getIcon(alert.type);
          return (
            <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{alert.title}</h4>
                  <Badge variant={getVariant(alert.priority) as any} className="text-xs">
                    {alert.priority}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{alert.message}</p>
                <span className="text-xs text-muted-foreground">hace {alert.time}</span>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};