import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Users, UserCheck, Shield } from "lucide-react";
import { useFirebaseData } from "@/hooks/useFirebase";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { cambiarEstadoAcceso } from "@/services/acceso";

interface AutorizacionPendiente {
  id: string;
  tipo: "visitante" | "trabajador" | "proveedor";
  data: RegistroVisita | RegistroTrabajadores | RegistroProveedor;
  fechaCreacion: number;
}

function tsFrom(obj: any): number {
  const v = obj?.fechaCreacion ?? obj?.createdAt ?? 0;
  return typeof v === "number" ? v : 0;
}

export const AutorizacionesSeguridad = () => {
  const { toast } = useToast();
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionPendiente[]>([]);

  const { data: visitas } = useFirebaseData<Record<string, RegistroVisita>>("acceso/visitas");
  const { data: trabajadores } = useFirebaseData<Record<string, RegistroTrabajadores>>("acceso/trabajadores");
  const { data: proveedores } = useFirebaseData<Record<string, RegistroProveedor>>("acceso/proveedores");

  useEffect(() => {
    const pendientes: AutorizacionPendiente[] = [];

    if (visitas) {
      Object.entries(visitas).forEach(([id, v]) => {
        if ((v as any).estado === "pendiente") {
          pendientes.push({ id, tipo: "visitante", data: v, fechaCreacion: tsFrom(v) });
        }
      });
    }

    if (trabajadores) {
      Object.entries(trabajadores).forEach(([id, t]) => {
        if ((t as any).estado === "pendiente") {
          pendientes.push({ id, tipo: "trabajador", data: t, fechaCreacion: tsFrom(t) });
        }
      });
    }

    if (proveedores) {
      Object.entries(proveedores).forEach(([id, p]) => {
        if ((p as any).estado === "pendiente") {
          pendientes.push({ id, tipo: "proveedor", data: p, fechaCreacion: tsFrom(p) });
        }
      });
    }

    pendientes.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    setAutorizaciones(pendientes);
  }, [visitas, trabajadores, proveedores]);

  const manejarAutorizacion = async (
    id: string,
    tipo: "visitante" | "trabajador" | "proveedor",
    autorizar: boolean
  ) => {
    try {
      const porticoId =
        (autorizaciones.find((a) => a.id === id && a.tipo === tipo)?.data as any)?.porticoId || "principal";

      await cambiarEstadoAcceso(tipo, id, porticoId, autorizar ? "autorizado" : "denegado", "seguridad");

      toast({
        title: autorizar ? "Acceso Autorizado" : "Acceso Denegado",
        description: `El ${tipo} ha sido ${autorizar ? "autorizado" : "denegado"} correctamente.`,
        variant: autorizar ? "default" : "destructive",
      });
    } catch {
      toast({
        title: "Error",
        description: "No se pudo procesar la autorización",
        variant: "destructive",
      });
    }
  };

  const getIcono = (tipo: string) => {
    switch (tipo) {
      case "visitante":
        return Users;
      case "trabajador":
        return UserCheck;
      case "proveedor":
        return Shield;
      default:
        return Clock;
    }
  };

  const getColorBadge = (tipo: string) => {
    switch (tipo) {
      case "visitante":
        return "bg-blue-100 text-blue-800";
      case "trabajador":
        return "bg-green-100 text-green-800";
      case "proveedor":
        return "bg-orange-100 text-orange-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Autorizaciones Pendientes</h3>
          <p className="text-sm text-muted-foreground">{autorizaciones.length} solicitudes esperando autorización</p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {autorizaciones.length} pendientes
        </Badge>
      </div>

      {autorizaciones.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No hay autorizaciones pendientes</h3>
            <p className="text-muted-foreground">Todas las solicitudes han sido procesadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {autorizaciones.map((auth) => {
            const Icono = getIcono(auth.tipo);
            return (
              <Card key={auth.id} className="border-l-4 border-l-warning">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icono className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg capitalize">{auth.tipo}</CardTitle>
                        <CardDescription>Solicitud del {new Date(auth.fechaCreacion).toLocaleString()}</CardDescription>
                      </div>
                    </div>
                    <Badge className={getColorBadge(auth.tipo)}>{auth.tipo.toUpperCase()}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Tipo de Acceso:</span>
                        <p className="text-muted-foreground capitalize">{(auth.data as any).tipoAcceso}</p>
                      </div>
                      {(auth.data as any).placa && (
                        <div>
                          <span className="font-medium">Placa:</span>
                          <p className="text-muted-foreground">{(auth.data as any).placa}</p>
                        </div>
                      )}

                      {auth.tipo === "visitante" && (
                        <>
                          <div>
                            <span className="font-medium">Visitantes:</span>
                            <p className="text-muted-foreground">
                              {(auth.data as RegistroVisita).visitantes.length} personas
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Menores:</span>
                            <p className="text-muted-foreground">{(auth.data as RegistroVisita).menores}</p>
                          </div>
                        </>
                      )}

                      {auth.tipo === "trabajador" && (
                        <div>
                          <span className="font-medium">Trabajadores:</span>
                          <p className="text-muted-foreground">
                            {(auth.data as RegistroTrabajadores).trabajadores.length} personas
                          </p>
                        </div>
                      )}

                      {auth.tipo === "proveedor" && (
                        <div>
                          <span className="font-medium">Empresa:</span>
                          <p className="text-muted-foreground">{(auth.data as RegistroProveedor).empresa}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <Button onClick={() => manejarAutorizacion(auth.id, auth.tipo, true)} className="flex-1 bg-green-600 hover:bg-green-700">
                        <Check className="h-4 w-4 mr-2" />
                        Autorizar
                      </Button>
                      <Button onClick={() => manejarAutorizacion(auth.id, auth.tipo, false)} variant="destructive" className="flex-1">
                        <X className="h-4 w-4 mr-2" />
                        Denegar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
