import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/config/firebase";
import { CheckCircle, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface SolicitudMaestro {
  id: string;
  nombre: string;
  dni?: string;
  telefono?: string;
  empresa?: string;
  notas?: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  solicitadoPor: string;
  solicitadoPorNombre?: string;
  fechaSolicitud: number;
  fechaRespuesta?: number;
  respondidoPor?: string;
}

export const SolicitudesMaestros = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudMaestro[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const solicitudesRef = ref(db, "seguridad/solicitudes_maestros");
    
    const unsubscribe = onValue(solicitudesRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = Object.entries(snapshot.val()).map(([id, val]: any) => ({
          id,
          ...val,
        }));
        setSolicitudes(data.sort((a: any, b: any) => b.fechaSolicitud - a.fechaSolicitud));
      } else {
        setSolicitudes([]);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAprobar = async (solicitud: SolicitudMaestro) => {
    try {
      const updates: any = {};
      updates[`seguridad/solicitudes_maestros/${solicitud.id}/estado`] = "aprobada";
      updates[`seguridad/solicitudes_maestros/${solicitud.id}/fechaRespuesta`] = Date.now();
      updates[`seguridad/solicitudes_maestros/${solicitud.id}/respondidoPor`] = user?.uid;

      // Crear el maestro de obra en acceso/maestrosObra
      updates[`acceso/maestrosObra/${solicitud.id}`] = {
        id: solicitud.id,
        nombre: solicitud.nombre,
        dni: solicitud.dni || "",
        telefono: solicitud.telefono || "",
        empresa: solicitud.empresa || "",
        notas: solicitud.notas || "",
        activo: true,
        createdAt: Date.now(),
        creadoPorUid: user?.uid,
      };

      await update(ref(db), updates);
      toast.success("Solicitud aprobada y maestro de obra creado");
    } catch (error) {
      toast.error("Error al aprobar solicitud");
      console.error(error);
    }
  };

  const handleRechazar = async (solicitud: SolicitudMaestro) => {
    try {
      const updates: any = {};
      updates[`seguridad/solicitudes_maestros/${solicitud.id}/estado`] = "rechazada";
      updates[`seguridad/solicitudes_maestros/${solicitud.id}/fechaRespuesta`] = Date.now();
      updates[`seguridad/solicitudes_maestros/${solicitud.id}/respondidoPor`] = user?.uid;

      await update(ref(db), updates);
      toast.success("Solicitud rechazada");
    } catch (error) {
      toast.error("Error al rechazar solicitud");
      console.error(error);
    }
  };

  const getBadgeVariant = (estado: string) => {
    switch (estado) {
      case "aprobada": return "default";
      case "rechazada": return "destructive";
      default: return "secondary";
    }
  };

  const pendientes = solicitudes.filter((s) => s.estado === "pendiente");
  const procesadas = solicitudes.filter((s) => s.estado !== "pendiente");

  return (
    <div className="space-y-6">
      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">{pendientes.length}</div>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {solicitudes.filter((s) => s.estado === "aprobada").length}
            </div>
            <p className="text-sm text-muted-foreground">Aprobadas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {solicitudes.filter((s) => s.estado === "rechazada").length}
            </div>
            <p className="text-sm text-muted-foreground">Rechazadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Solicitudes Pendientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Solicitudes Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center py-4">Cargando...</p>
          ) : pendientes.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No hay solicitudes pendientes
            </p>
          ) : (
            <div className="space-y-4">
              {pendientes.map((solicitud) => (
                <Card key={solicitud.id}>
                  <CardContent className="pt-6">
                    <div className="flex justify-between items-start">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{solicitud.nombre}</h3>
                          <Badge variant={getBadgeVariant(solicitud.estado)}>
                            {solicitud.estado}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="text-muted-foreground">DNI:</span>{" "}
                            {solicitud.dni || "No especificado"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Teléfono:</span>{" "}
                            {solicitud.telefono || "No especificado"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Empresa:</span>{" "}
                            {solicitud.empresa || "No especificado"}
                          </div>
                          <div>
                            <span className="text-muted-foreground">Fecha:</span>{" "}
                            {format(new Date(solicitud.fechaSolicitud), "dd/MM/yyyy HH:mm", {
                              locale: es,
                            })}
                          </div>
                        </div>
                        {solicitud.notas && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Notas:</span>{" "}
                            {solicitud.notas}
                          </div>
                        )}
                        {solicitud.solicitadoPorNombre && (
                          <div className="text-sm">
                            <span className="text-muted-foreground">Solicitado por:</span>{" "}
                            {solicitud.solicitadoPorNombre}
                          </div>
                        )}
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button
                          size="sm"
                          onClick={() => handleAprobar(solicitud)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprobar
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleRechazar(solicitud)}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rechazar
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Solicitudes Procesadas */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Solicitudes</CardTitle>
        </CardHeader>
        <CardContent>
          {procesadas.length === 0 ? (
            <p className="text-center py-4 text-muted-foreground">
              No hay solicitudes procesadas
            </p>
          ) : (
            <div className="space-y-2">
              {procesadas.map((solicitud) => (
                <div
                  key={solicitud.id}
                  className="flex justify-between items-center p-3 border rounded-lg"
                >
                  <div>
                    <div className="font-medium">{solicitud.nombre}</div>
                    <div className="text-sm text-muted-foreground">
                      {solicitud.dni} - {solicitud.empresa || "Sin empresa"}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={getBadgeVariant(solicitud.estado)}>
                      {solicitud.estado}
                    </Badge>
                    {solicitud.fechaRespuesta && (
                      <div className="text-xs text-muted-foreground mt-1">
                        {format(new Date(solicitud.fechaRespuesta), "dd/MM/yyyy", {
                          locale: es,
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
