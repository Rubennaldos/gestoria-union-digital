import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Users, LogIn, LogOut, Calendar } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { obtenerVisitasPorEmpadronado } from "@/services/acceso";
import { Skeleton } from "@/components/ui/skeleton";

interface VisitaHistorial {
  id: string;
  visitantes: Array<{ nombre: string; dni: string }>;
  tipoAcceso: string;
  tipoRegistro?: "visita" | "alquiler";
  horaIngreso?: number;
  horaSalida?: number;
  ingresado?: boolean;
  createdAt: number;
  estado: string;
}

export function HistorialAsociado() {
  const { empadronado } = useAuth();
  const empadronadoId = empadronado?.id;
  const [visitas, setVisitas] = useState<VisitaHistorial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (empadronadoId) {
      cargarHistorial();
    }
  }, [empadronadoId]);

  const cargarHistorial = async () => {
    if (!empadronadoId) return;
    
    setLoading(true);
    try {
      const data = await obtenerVisitasPorEmpadronado(empadronadoId);
      // Filtrar solo las autorizadas y ordenar por más reciente
      const autorizadas = data
        .filter((v: any) => v.estado === "autorizado")
        .sort((a: any, b: any) => (b.createdAt || 0) - (a.createdAt || 0));
      setVisitas(autorizadas);
    } catch (error) {
      console.error("Error al cargar historial:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatearFecha = (timestamp?: number) => {
    if (!timestamp) return "—";
    return new Date(timestamp).toLocaleString("es-ES", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de Visitas</CardTitle>
          <CardDescription>Cargando historial...</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </CardContent>
      </Card>
    );
  }

  if (visitas.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Historial de Visitas
          </CardTitle>
          <CardDescription>Registro de todas tus visitas autorizadas</CardDescription>
        </CardHeader>
        <CardContent className="py-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No tienes visitas registradas</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Historial de Visitas
        </CardTitle>
        <CardDescription>
          Registro de todas tus visitas autorizadas con horarios de entrada y salida
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {visitas.map((visita) => {
          const dentroActualmente = visita.ingresado && !visita.horaSalida;
          
          return (
            <Card key={visita.id} className={`border-l-4 ${dentroActualmente ? 'border-l-green-500' : 'border-l-gray-300'}`}>
              <CardContent className="pt-4">
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold">
                          {visita.visitantes.map(v => v.nombre).join(", ")}
                        </h4>
                        {visita.tipoRegistro && (
                          <Badge variant={visita.tipoRegistro === "alquiler" ? "default" : "secondary"} className="text-xs">
                            {visita.tipoRegistro === "alquiler" ? "Alquiler" : "Visita"}
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        Acceso {visita.tipoAcceso}
                      </p>
                    </div>
                    <Badge className={dentroActualmente ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}>
                      {dentroActualmente ? "ADENTRO" : visita.ingresado ? "SALIÓ" : "PENDIENTE"}
                    </Badge>
                  </div>

                  {/* Visitantes */}
                  <div className="bg-muted/50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center gap-2 text-sm font-medium">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      Visitantes ({visita.visitantes.length})
                    </div>
                    {visita.visitantes.map((v, idx) => (
                      <div key={idx} className="text-sm ml-6">
                        <p className="font-medium">{v.nombre}</p>
                        {v.dni && <p className="text-muted-foreground text-xs">DNI: {v.dni}</p>}
                      </div>
                    ))}
                  </div>

                  {/* Horarios */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div className="bg-blue-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <Calendar className="h-4 w-4 text-blue-600" />
                        <span className="font-medium text-blue-900">Autorizado</span>
                      </div>
                      <p className="text-blue-700 text-xs">
                        {formatearFecha(visita.createdAt)}
                      </p>
                    </div>

                    {visita.horaIngreso && (
                      <div className="bg-green-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <LogIn className="h-4 w-4 text-green-600" />
                          <span className="font-medium text-green-900">Ingreso</span>
                        </div>
                        <p className="text-green-700 text-xs">
                          {formatearFecha(visita.horaIngreso)}
                        </p>
                      </div>
                    )}

                    {visita.horaSalida && (
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-1">
                          <LogOut className="h-4 w-4 text-orange-600" />
                          <span className="font-medium text-orange-900">Salida</span>
                        </div>
                        <p className="text-orange-700 text-xs">
                          {formatearFecha(visita.horaSalida)}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </CardContent>
    </Card>
  );
}
