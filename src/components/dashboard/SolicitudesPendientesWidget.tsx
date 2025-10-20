import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ref, onValue, update } from "firebase/database";
import { db } from "@/config/firebase";
import { CheckCircle, XCircle, Clock, ArrowRight, Users, Briefcase, ShoppingBag, Wrench } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthz } from "@/contexts/AuthzContext";
import { cambiarEstadoAcceso } from "@/services/acceso";
import { useNavigate } from "react-router-dom";

interface SolicitudPendiente {
  id: string;
  tipo: "visitante" | "trabajador" | "proveedor" | "maestro";
  nombre: string;
  empadronadoId?: string;
  solicitadoPorNombre?: string;
  solicitadoPorPadron?: string;
  createdAt: number;
  porticoId?: string;
  datos?: any;
}

export const SolicitudesPendientesWidget = () => {
  const { user } = useAuth();
  const { can } = useAuthz();
  const navigate = useNavigate();
  const [solicitudes, setSolicitudes] = useState<SolicitudPendiente[]>([]);
  const [loading, setLoading] = useState(true);

  // Verificar si el usuario tiene acceso al módulo
  const tieneAcceso = can("admin_seguridad", "read");

  useEffect(() => {
    if (!tieneAcceso) {
      setLoading(false);
      return;
    }

    // Escuchar solicitudes de maestros de obra
    const maestrosRef = ref(db, "seguridad/solicitudes_maestros");
    const unsubMaestros = onValue(maestrosRef, (snapshot) => {
      const maestros: SolicitudPendiente[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.entries(data).forEach(([id, val]: any) => {
          if (val.estado === "pendiente") {
            maestros.push({
              id,
              tipo: "maestro",
              nombre: val.nombre,
              createdAt: val.fechaSolicitud,
              solicitadoPorNombre: val.solicitadoPorNombre,
              datos: val,
            });
          }
        });
      }
      actualizarSolicitudes(maestros, "maestros");
    });

    // Escuchar pendientes del pórtico principal
    const pendientesRef = ref(db, "seguridad/porticos/principal/pendientes");
    const unsubPendientes = onValue(pendientesRef, (snapshot) => {
      const pendientes: SolicitudPendiente[] = [];
      if (snapshot.exists()) {
        const data = snapshot.val();
        Object.entries(data).forEach(([id, val]: any) => {
          // Solo incluir solicitudes que están pendientes (no aprobadas ni rechazadas)
          if (!val.estado || val.estado === "pendiente") {
            pendientes.push({
              id,
              tipo: val.tipo,
              nombre: val.nombre || val.solicitadoPorNombre || "Sin nombre",
              empadronadoId: val.empadronadoId,
              solicitadoPorNombre: val.solicitadoPorNombre,
              solicitadoPorPadron: val.solicitadoPorPadron,
              createdAt: val.createdAt,
              porticoId: "principal",
              datos: val,
            });
          }
        });
      }
      actualizarSolicitudes(pendientes, "accesos");
      setLoading(false);
    });

    return () => {
      unsubMaestros();
      unsubPendientes();
    };
  }, [tieneAcceso]);

  const [maestrosSolicitudes, setMaestrosSolicitudes] = useState<SolicitudPendiente[]>([]);
  const [accesosSolicitudes, setAccesosSolicitudes] = useState<SolicitudPendiente[]>([]);

  const actualizarSolicitudes = (nuevas: SolicitudPendiente[], tipo: "maestros" | "accesos") => {
    if (tipo === "maestros") {
      setMaestrosSolicitudes(nuevas);
    } else {
      setAccesosSolicitudes(nuevas);
    }
  };

  useEffect(() => {
    const todas = [...maestrosSolicitudes, ...accesosSolicitudes].sort(
      (a, b) => b.createdAt - a.createdAt
    );
    setSolicitudes(todas);
  }, [maestrosSolicitudes, accesosSolicitudes]);

  const handleAprobar = async (solicitud: SolicitudPendiente) => {
    try {
      if (solicitud.tipo === "maestro") {
        const updates: any = {};
        updates[`seguridad/solicitudes_maestros/${solicitud.id}/estado`] = "aprobada";
        updates[`seguridad/solicitudes_maestros/${solicitud.id}/fechaRespuesta`] = Date.now();
        updates[`seguridad/solicitudes_maestros/${solicitud.id}/respondidoPor`] = user?.uid;
        updates[`acceso/maestrosObra/${solicitud.id}`] = {
          id: solicitud.id,
          nombre: solicitud.datos.nombre,
          dni: solicitud.datos.dni || "",
          telefono: solicitud.datos.telefono || "",
          empresa: solicitud.datos.empresa || "",
          notas: solicitud.datos.notas || "",
          activo: true,
          createdAt: Date.now(),
          creadoPorUid: user?.uid,
        };
        await update(ref(db), updates);
        toast.success("Maestro de obra aprobado");
      } else {
        await cambiarEstadoAcceso(
          solicitud.tipo as "visitante" | "trabajador" | "proveedor",
          solicitud.id,
          solicitud.porticoId || "principal",
          "autorizado",
          user?.uid || "sistema"
        );
        toast.success("Acceso autorizado");
      }
    } catch (error) {
      toast.error("Error al aprobar solicitud");
      console.error(error);
    }
  };

  const handleRechazar = async (solicitud: SolicitudPendiente) => {
    try {
      if (solicitud.tipo === "maestro") {
        const updates: any = {};
        updates[`seguridad/solicitudes_maestros/${solicitud.id}/estado`] = "rechazada";
        updates[`seguridad/solicitudes_maestros/${solicitud.id}/fechaRespuesta`] = Date.now();
        updates[`seguridad/solicitudes_maestros/${solicitud.id}/respondidoPor`] = user?.uid;
        await update(ref(db), updates);
        toast.success("Solicitud rechazada");
      } else {
        await cambiarEstadoAcceso(
          solicitud.tipo as "visitante" | "trabajador" | "proveedor",
          solicitud.id,
          solicitud.porticoId || "principal",
          "denegado",
          user?.uid || "sistema"
        );
        toast.success("Acceso denegado");
      }
    } catch (error) {
      toast.error("Error al rechazar solicitud");
      console.error(error);
    }
  };

  const getTipoIcon = (tipo: string) => {
    switch (tipo) {
      case "visitante":
        return <Users className="h-4 w-4" />;
      case "trabajador":
        return <Wrench className="h-4 w-4" />;
      case "proveedor":
        return <ShoppingBag className="h-4 w-4" />;
      case "maestro":
        return <Briefcase className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getTipoLabel = (tipo: string) => {
    switch (tipo) {
      case "visitante":
        return "Visita";
      case "trabajador":
        return "Trabajador";
      case "proveedor":
        return "Proveedor";
      case "maestro":
        return "Maestro Obra";
      default:
        return tipo;
    }
  };

  if (!tieneAcceso) {
    return null;
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5" />
            Solicitudes Pendientes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">Cargando...</p>
        </CardContent>
      </Card>
    );
  }

  if (solicitudes.length === 0) {
    return null; // No mostrar el widget si no hay solicitudes
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-base">
            <Clock className="h-5 w-5 text-warning" />
            Solicitudes Pendientes
            <Badge variant="secondary" className="ml-2">
              {solicitudes.length}
            </Badge>
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/admin-seguridad")}
            className="h-8"
          >
            Ver todas
            <ArrowRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {solicitudes.slice(0, 3).map((solicitud) => (
            <Card key={`${solicitud.tipo}-${solicitud.id}`} className="border-l-4 border-l-warning">
              <CardContent className="p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getTipoIcon(solicitud.tipo)}
                      <Badge variant="outline" className="text-xs">
                        {getTipoLabel(solicitud.tipo)}
                      </Badge>
                    </div>
                    <p className="font-medium text-sm truncate">{solicitud.nombre}</p>
                    {solicitud.solicitadoPorNombre && (
                      <p className="text-xs text-muted-foreground">
                        Por: {solicitud.solicitadoPorNombre}
                        {solicitud.solicitadoPorPadron && ` (${solicitud.solicitadoPorPadron})`}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-2 sm:flex-row flex-col sm:w-auto w-full">
                    <Button
                      size="sm"
                      onClick={() => handleAprobar(solicitud)}
                      className="bg-green-600 hover:bg-green-700 h-8 text-xs flex-1 sm:flex-initial"
                    >
                      <CheckCircle className="h-3 w-3 sm:mr-1" />
                      <span className="sm:inline">Aprobar</span>
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => handleRechazar(solicitud)}
                      className="h-8 text-xs flex-1 sm:flex-initial"
                    >
                      <XCircle className="h-3 w-3 sm:mr-1" />
                      <span className="sm:inline">Rechazar</span>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
          {solicitudes.length > 3 && (
            <Button
              variant="outline"
              className="w-full"
              size="sm"
              onClick={() => navigate("/admin-seguridad")}
            >
              Ver {solicitudes.length - 3} más
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
