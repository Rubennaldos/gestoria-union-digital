import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Users, UserCheck, Shield } from "lucide-react";
import { useFirebaseData } from "@/hooks/useFirebase";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { cambiarEstadoAcceso } from "@/services/acceso";
import { getEmpadronado } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";

interface AutorizacionPendiente {
  id: string;
  tipo: "visitante" | "trabajador" | "proveedor";
  data: RegistroVisita | RegistroTrabajadores | RegistroProveedor;
  fechaCreacion: number;
  empadronado?: Empadronado;
}

function tsFrom(obj: any): number {
  const v = obj?.fechaCreacion ?? obj?.createdAt ?? 0;
  return typeof v === "number" ? v : 0;
}

export const AutorizacionesSeguridad = () => {
  const { toast } = useToast();
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionPendiente[]>([]);
  const [cargando, setCargando] = useState(false);

  const { data: visitas } = useFirebaseData<Record<string, RegistroVisita>>("acceso/visitas");
  const { data: trabajadores } = useFirebaseData<Record<string, RegistroTrabajadores>>("acceso/trabajadores");
  const { data: proveedores } = useFirebaseData<Record<string, RegistroProveedor>>("acceso/proveedores");

  useEffect(() => {
    const cargarAutorizaciones = async () => {
      setCargando(true);
      console.log("Cargando autorizaciones...");
      const pendientes: AutorizacionPendiente[] = [];

      if (visitas) {
        console.log("Procesando visitas:", Object.keys(visitas).length);
        for (const [id, v] of Object.entries(visitas)) {
          if ((v as any).estado === "pendiente") {
            console.log(`Procesando visita ${id}, empadronadoId: ${v.empadronadoId}`);
            try {
              const empadronado = await getEmpadronado(v.empadronadoId);
              console.log(`Empadronado obtenido para ${id}:`, empadronado?.nombre || "No encontrado");
              pendientes.push({ 
                id, 
                tipo: "visitante", 
                data: v, 
                fechaCreacion: tsFrom(v),
                empadronado: empadronado || undefined
              });
            } catch (error) {
              console.error(`Error obteniendo empadronado para visita ${id}:`, error);
              pendientes.push({ 
                id, 
                tipo: "visitante", 
                data: v, 
                fechaCreacion: tsFrom(v),
                empadronado: undefined
              });
            }
          }
        }
      }

      if (trabajadores) {
        console.log("Procesando trabajadores:", Object.keys(trabajadores).length);
        for (const [id, t] of Object.entries(trabajadores)) {
          if ((t as any).estado === "pendiente") {
            console.log(`Procesando trabajador ${id}, empadronadoId: ${t.empadronadoId}`);
            try {
              const empadronado = await getEmpadronado(t.empadronadoId);
              console.log(`Empadronado obtenido para trabajador ${id}:`, empadronado?.nombre || "No encontrado");
              pendientes.push({ 
                id, 
                tipo: "trabajador", 
                data: t, 
                fechaCreacion: tsFrom(t),
                empadronado: empadronado || undefined
              });
            } catch (error) {
              console.error(`Error obteniendo empadronado para trabajador ${id}:`, error);
              pendientes.push({ 
                id, 
                tipo: "trabajador", 
                data: t, 
                fechaCreacion: tsFrom(t),
                empadronado: undefined
              });
            }
          }
        }
      }

      if (proveedores) {
        console.log("Procesando proveedores:", Object.keys(proveedores).length);
        for (const [id, p] of Object.entries(proveedores)) {
          if ((p as any).estado === "pendiente") {
            console.log(`Procesando proveedor ${id}, empadronadoId: ${p.empadronadoId}`);
            try {
              const empadronado = await getEmpadronado(p.empadronadoId);
              console.log(`Empadronado obtenido para proveedor ${id}:`, empadronado?.nombre || "No encontrado");
              pendientes.push({ 
                id, 
                tipo: "proveedor", 
                data: p, 
                fechaCreacion: tsFrom(p),
                empadronado: empadronado || undefined
              });
            } catch (error) {
              console.error(`Error obteniendo empadronado para proveedor ${id}:`, error);
              pendientes.push({ 
                id, 
                tipo: "proveedor", 
                data: p, 
                fechaCreacion: tsFrom(p),
                empadronado: undefined
              });
            }
          }
        }
      }

      console.log("Total pendientes procesados:", pendientes.length);
      pendientes.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
      setAutorizaciones(pendientes);
      setCargando(false);
    };

    cargarAutorizaciones();
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
                  <div className="space-y-4">
                    {/* Información del vecino solicitante */}
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Users className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">Solicitado por:</span>
                      </div>
                      {auth.empadronado ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Vecino:</span>
                            <p className="text-muted-foreground">
                              {auth.empadronado.nombre} {auth.empadronado.apellidos}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Padrón:</span>
                            <p className="text-muted-foreground">{auth.empadronado.numeroPadron}</p>
                          </div>
                        </div>
                      ) : cargando ? (
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
                          <span>Cargando información del vecino...</span>
                        </div>
                      ) : (
                        <div className="text-sm">
                          <p className="text-destructive mb-2">⚠️ Vecino no encontrado</p>
                          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded">
                            <div className="text-xs text-muted-foreground space-y-1">
                              <p><span className="font-medium">ID Solicitante:</span> {(auth.data as any).empadronadoId}</p>
                              <p className="text-yellow-700">El vecino puede haber sido eliminado o el ID es inválido</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

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
                          <div className="md:col-span-2">
                            <span className="font-medium">Visitantes:</span>
                            <div className="mt-2 space-y-1">
                              {(auth.data as RegistroVisita).visitantes.map((visitante, index) => (
                                <div key={index} className="text-muted-foreground flex items-center gap-2">
                                  <span className="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center text-xs">
                                    {index + 1}
                                  </span>
                                  <span>{visitante.nombre}</span>
                                  <span className="text-xs">({visitante.dni})</span>
                                  {visitante.esMenor && (
                                    <Badge variant="outline" className="text-xs">Menor</Badge>
                                  )}
                                </div>
                              ))}
                              {(auth.data as RegistroVisita).menores > 0 && (
                                <div className="text-muted-foreground flex items-center gap-2 mt-2">
                                  <span className="text-xs font-medium">
                                    + {(auth.data as RegistroVisita).menores} menores adicionales
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {auth.tipo === "trabajador" && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Trabajadores:</span>
                          <div className="mt-2 space-y-1">
                            {(auth.data as RegistroTrabajadores).trabajadores.map((trabajador, index) => (
                              <div key={index} className="text-muted-foreground flex items-center gap-2">
                                <span className="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center text-xs">
                                  {index + 1}
                                </span>
                                <span>{trabajador.nombre}</span>
                                <span className="text-xs">({trabajador.dni})</span>
                                {trabajador.esMaestroObra && (
                                  <Badge variant="outline" className="text-xs">Maestro de Obra</Badge>
                                )}
                              </div>
                            ))}
                          </div>
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
