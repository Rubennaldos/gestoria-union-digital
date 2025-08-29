import { Calendar, Users, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const Sesiones = () => {
  const proximasSesiones = [
    {
      id: 1,
      fecha: "2024-09-15",
      hora: "19:00",
      tipo: "Junta Directiva",
      estado: "programada",
      asistentes: 8,
      quorum: 5
    },
    {
      id: 2,
      fecha: "2024-09-30",
      hora: "10:00",
      tipo: "Asamblea General",
      estado: "convocada",
      asistentes: 45,
      quorum: 30
    }
  ];

  const historialSesiones = [
    {
      id: 1,
      fecha: "2024-08-15",
      tipo: "Junta Directiva",
      estado: "realizada",
      acuerdos: 6,
      asistencia: "9/9"
    },
    {
      id: 2,
      fecha: "2024-07-28",
      tipo: "Asamblea Extraordinaria",
      estado: "realizada",
      acuerdos: 3,
      asistencia: "52/67"
    },
    {
      id: 3,
      fecha: "2024-07-15",
      tipo: "Junta Directiva",
      estado: "realizada",
      acuerdos: 8,
      asistencia: "8/9"
    }
  ];

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
          <div>
            <h1 className="text-2xl font-bold text-foreground">Sesiones y Asambleas</h1>
            <p className="text-muted-foreground">Convocatorias, quórum y acuerdos</p>
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
              {proximasSesiones.map((sesion) => (
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
              ))}
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
              {historialSesiones.map((sesion) => (
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
              ))}
            </div>
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Sesiones;