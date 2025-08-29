import { AlertTriangle, Clock, CheckCircle, DollarSign, Calendar, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useFirebaseData } from "@/hooks/useFirebase";
import { Alert } from "@/types/firebase";

const getIcon = (type: string) => {
  switch (type) {
    case "cuota_vencida":
      return DollarSign;
    case "sesion_proxima":
      return Calendar;
    case "incidente_seguridad":
      return AlertTriangle;
    case "comunicado_urgente":
      return AlertTriangle;
    case "quorum_faltante":
      return AlertTriangle;
    default:
      return Info;
  }
};

const getVariant = (priority: string) => {
  switch (priority) {
    case "alta":
    case "urgente":
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
  const { data: alerts, loading, error } = useFirebaseData<{ [key: string]: Alert }>('/alerts');
  
  const alertsList = alerts ? Object.values(alerts) : [];
  const highPriorityCount = alertsList.filter(alert => alert.prioridad === "alta" || alert.prioridad === "urgente").length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold flex items-center justify-between">
          Alertas y Notificaciones
          <Badge variant="secondary" className="text-xs">
            {highPriorityCount}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading && <p className="text-sm text-muted-foreground">Cargando alertas...</p>}
        {error && <p className="text-sm text-destructive">Error al cargar alertas: {error}</p>}
        {alertsList.map((alert) => {
          const Icon = getIcon(alert.tipo);
          return (
            <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors">
              <Icon className="h-5 w-5 mt-0.5 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-1">
                  <h4 className="font-medium text-sm">{alert.titulo}</h4>
                  <Badge variant={getVariant(alert.prioridad) as any} className="text-xs">
                    {alert.prioridad}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mb-1">{alert.mensaje}</p>
                <span className="text-xs text-muted-foreground">{new Date(alert.fecha).toLocaleDateString()}</span>
              </div>
            </div>
          );
        })}
        {!loading && !error && alertsList.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-4">No hay alertas pendientes</p>
        )}
      </CardContent>
    </Card>
  );
};