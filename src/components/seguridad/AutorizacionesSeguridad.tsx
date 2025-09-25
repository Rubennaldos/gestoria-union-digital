import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Users, UserCheck, Shield } from "lucide-react";
import { useFirebaseData } from "@/hooks/useFirebase";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { cambiarEstadoAcceso } from "@/services/acceso";

// 👇 resolvemos info del vecino (nombre + padrón)
import { getEmpadronado, getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";

/* ──────────────────────────────────────────────────────────────
   Tipos y utils
   ────────────────────────────────────────────────────────────── */
interface AutorizacionPendiente {
  id: string;
  tipo: "visitante" | "trabajador" | "proveedor";
  data: RegistroVisita | RegistroTrabajadores | RegistroProveedor;
  fechaCreacion: number;
  empadronado?: Empadronado | null;
}

function tsFrom(obj: any): number {
  const v = obj?.fechaCreacion ?? obj?.createdAt ?? 0;
  return typeof v === "number" ? v : 0;
}

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

/* ──────────────────────────────────────────────────────────────
   Componente
   ────────────────────────────────────────────────────────────── */
export const AutorizacionesSeguridad = () => {
  const { toast } = useToast();
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionPendiente[]>([]);
  const [empMap, setEmpMap] = useState<Record<string, Empadronado | null>>({});

  const { data: visitas } = useFirebaseData<Record<string, RegistroVisita>>("acceso/visitas");
  const { data: trabajadores } =
    useFirebaseData<Record<string, RegistroTrabajadores>>("acceso/trabajadores");
  const { data: proveedores } =
    useFirebaseData<Record<string, RegistroProveedor>>("acceso/proveedores");

  // 1) Armar lista de pendientes (independiente del snapshot guardado)
  useEffect(() => {
    const pendientes: AutorizacionPendiente[] = [];

    if (visitas) {
      for (const [id, v] of Object.entries(visitas)) {
        if ((v as any)?.estado === "pendiente") {
          pendientes.push({
            id,
            tipo: "visitante",
            data: v,
            fechaCreacion: tsFrom(v),
          });
        }
      }
    }

    if (trabajadores) {
      for (const [id, t] of Object.entries(trabajadores)) {
        if ((t as any)?.estado === "pendiente") {
          pendientes.push({
            id,
            tipo: "trabajador",
            data: t,
            fechaCreacion: tsFrom(t),
          });
        }
      }
    }

    if (proveedores) {
      for (const [id, p] of Object.entries(proveedores)) {
        if ((p as any)?.estado === "pendiente") {
          pendientes.push({
            id,
            tipo: "proveedor",
            data: p,
            fechaCreacion: tsFrom(p),
          });
        }
      }
    }

    pendientes.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    setAutorizaciones(pendientes);
  }, [visitas, trabajadores, proveedores]);

  // 2) Resolver empadronados EN BLOQUE para todos los pendientes visibles
  useEffect(() => {
    const resolverVecinos = async () => {
      const faltantes = new Set<string>();
      for (const a of autorizaciones) {
        const empId = (a.data as any)?.empadronadoId;
        if (empId && !(empId in empMap)) faltantes.add(empId);
      }
      if (faltantes.size === 0) return;

      try {
        if (faltantes.size > 8) {
          // muchos: trae todos una sola vez
          const all = await getEmpadronados();
          const nuevo: Record<string, Empadronado | null> = { ...empMap };
          for (const emp of all) nuevo[emp.id] = emp;
          for (const id of faltantes) if (!(id in nuevo)) nuevo[id] = null;
          setEmpMap(nuevo);
        } else {
          // pocos: trae individual
          const nuevo: Record<string, Empadronado | null> = { ...empMap };
          await Promise.all(
            Array.from(faltantes).map(async (id) => {
              const emp = await getEmpadronado(id);
              nuevo[id] = emp; // null si no existe
            })
          );
          setEmpMap(nuevo);
        }
      } catch (e) {
        console.error("No se pudieron resolver algunos empadronados:", e);
      }
    };
    if (autorizaciones.length) resolverVecinos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autorizaciones]);

  // 3) Proyectar vecino resuelto a cada autorización
  const items = useMemo<AutorizacionPendiente[]>(
    () =>
      autorizaciones.map((a) => {
        const empId = (a.data as any)?.empadronadoId;
        const emp = empId ? empMap[empId] : null;
        return { ...a, empadronado: emp };
      }),
    [autorizaciones, empMap]
  );

  const manejarAutorizacion = async (
    id: string,
    tipo: "visitante" | "trabajador" | "proveedor",
    autorizar: boolean
  ) => {
    try {
      const porticoId =
        (autorizaciones.find((a) => a.id === id && a.tipo === tipo)?.data as any)?.porticoId ||
        "principal";

      await cambiarEstadoAcceso(
        tipo,
        id,
        porticoId,
        autorizar ? "autorizado" : "denegado",
        "seguridad"
      );

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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Autorizaciones Pendientes</h3>
          <p className="text-sm text-muted-foreground">
            {items.length} solicitudes esperando autorización
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Clock className="h-3 w-3" />
          {items.length} pendientes
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay autorizaciones pendientes
            </h3>
            <p className="text-muted-foreground">Todas las solicitudes han sido procesadas</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((auth) => {
            const Icono = getIcono(auth.tipo);
            const emp = auth.empadronado; // puede ser undefined (cargando), null (no existe) o Empadronado

            return (
              <Card key={auth.id} className="border-l-4 border-l-warning">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icono className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg capitalize">{auth.tipo}</CardTitle>
                        <CardDescription>
                          Solicitud del{" "}
                          {auth.fechaCreacion
                            ? new Date(auth.fechaCreacion).toLocaleString()
                            : "—"}
                        </CardDescription>
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

                      {emp === undefined ? (
                        <p className="text-sm text-muted-foreground">
                          Cargando información del vecino…
                        </p>
                      ) : emp ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Vecino:</span>
                            <p className="text-muted-foreground">
                              {emp.nombre} {emp.apellidos}
                            </p>
                          </div>
                          <div>
                            <span className="font-medium">Padrón:</span>
                            <p className="text-muted-foreground">{emp.numeroPadron}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-muted-foreground">
                          Información del vecino no disponible
                        </p>
                      )}
                    </div>

                    {/* Datos específicos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Tipo de Acceso:</span>
                        <p className="text-muted-foreground capitalize">
                          {(auth.data as any).tipoAcceso}
                        </p>
                      </div>

                      {(auth.data as any).placa && (
                        <div>
                          <span className="font-medium">Placa:</span>
                          <p className="text-muted-foreground">{(auth.data as any).placa}</p>
                        </div>
                      )}

                      {auth.tipo === "visitante" && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Visitantes:</span>
                          <div className="mt-2 space-y-1">
                            {(auth.data as RegistroVisita).visitantes?.map((visitante, index) => (
                              <div
                                key={index}
                                className="text-muted-foreground flex items-center gap-2"
                              >
                                <span className="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center text-xs">
                                  {index + 1}
                                </span>
                                <span>{visitante.nombre}</span>
                                <span className="text-xs">({visitante.dni})</span>
                                {visitante.esMenor && (
                                  <Badge variant="outline" className="text-xs">
                                    Menor
                                  </Badge>
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
                      )}

                      {auth.tipo === "trabajador" && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Trabajadores:</span>
                          <div className="mt-2 space-y-1">
                            {(auth.data as any).trabajadores?.map(
                              (trabajador: any, index: number) => (
                                <div
                                  key={index}
                                  className="text-muted-foreground flex items-center gap-2"
                                >
                                  <span className="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center text-xs">
                                    {index + 1}
                                  </span>
                                  <span>{trabajador.nombre}</span>
                                  <span className="text-xs">({trabajador.dni})</span>
                                  {trabajador.esMaestroObra && (
                                    <Badge variant="outline" className="text-xs">
                                      Maestro de Obra
                                    </Badge>
                                  )}
                                </div>
                              )
                            )}
                          </div>
                        </div>
                      )}

                      {auth.tipo === "proveedor" && (
                        <div>
                          <span className="font-medium">Empresa:</span>
                          <p className="text-muted-foreground">
                            {(auth.data as RegistroProveedor).empresa}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        onClick={() => manejarAutorizacion(auth.id, auth.tipo, true)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                      >
                        <Check className="h-4 w-4 mr-2" />
                        Autorizar
                      </Button>
                      <Button
                        onClick={() => manejarAutorizacion(auth.id, auth.tipo, false)}
                        variant="destructive"
                        className="flex-1"
                      >
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
