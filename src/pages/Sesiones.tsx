import { Calendar, Users, Clock, CheckCircle, AlertCircle, Home } from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Sesiones = () => {
  // TODO: Conectar con datos reales de Firebase/API
  const proximasSesiones: any[] = [];
  const historialSesiones: any[] = [];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case "programada":
        return "secondary";
      case "convocada":
        return "default";
      case "realizada":
        return "outline";
      default:
        return "secondary";
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/'}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Inicio
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Sesiones y Asambleas</h1>
              <p className="text-muted-foreground">Convocatorias, quórum y acuerdos</p>
            </div>
          </div>
          <Button className="bg-primary hover:bg-primary-hover">
            <Calendar className="h-4 w-4 mr-2" />
            Nueva Sesión
          </Button>
        </div>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <Calendar className="h-6 w-6" />
            <span className="text-sm">Programar Sesión</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <Users className="h-6 w-6" />
            <span className="text-sm">Convocar</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <CheckCircle className="h-6 w-6" />
            <span className="text-sm">Asistencia</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <Clock className="h-6 w-6" />
            <span className="text-sm">Votaciones</span>
          </Button>
        </div>

        {/* Próximas Sesiones */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Calendar className="h-5 w-5" />
              <span>Próximas Sesiones</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {proximasSesiones.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay sesiones programadas</p>
                </div>
              ) : (
                proximasSesiones.map((sesion) => (
                  <div key={sesion.id} className="p-4 border rounded-lg space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-semibold">{sesion.tipo}</h3>
                        <p className="text-sm text-muted-foreground">
                          {sesion.fecha} - {sesion.hora}
                        </p>
                      </div>
                      <Badge variant={getEstadoColor(sesion.estado) as any}>
                        {sesion.estado}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="flex items-center space-x-1">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span>{sesion.asistentes} confirmados</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <CheckCircle className={`h-4 w-4 ${sesion.asistentes >= sesion.quorum ? 'text-success' : 'text-warning'}`} />
                        <span>Quórum: {sesion.quorum}</span>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">Ver Agenda</Button>
                      <Button size="sm" variant="outline">Gestionar</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Historial de Sesiones */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Sesiones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {historialSesiones.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay sesiones realizadas</p>
                </div>
              ) : (
                historialSesiones.map((sesion) => (
                  <div key={sesion.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex-1">
                      <p className="font-medium text-sm">{sesion.tipo}</p>
                      <p className="text-xs text-muted-foreground">{sesion.fecha}</p>
                    </div>
                    <div className="flex items-center space-x-4 text-sm">
                      <div className="text-center">
                        <p className="font-medium">{sesion.acuerdos}</p>
                        <p className="text-xs text-muted-foreground">acuerdos</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium">{sesion.asistencia}</p>
                        <p className="text-xs text-muted-foreground">asistencia</p>
                      </div>
                      <Button size="sm" variant="outline">Ver Acta</Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Sesiones;