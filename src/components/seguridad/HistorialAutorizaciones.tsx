import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Clock, Users, UserCheck, Shield, Eye, Check, Search } from "lucide-react";
import { useFirebaseData } from "@/hooks/useFirebase";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { getEmpadronado, getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";
import { DetalleIngresoSalidaModal } from "./DetalleIngresoSalidaModal";

interface AutorizacionAprobada {
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

export const HistorialAutorizaciones = () => {
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionAprobada[]>([]);
  const [empMap, setEmpMap] = useState<Record<string, Empadronado | null>>({});
  const [selectedAuth, setSelectedAuth] = useState<AutorizacionAprobada | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  const { data: visitas } = useFirebaseData<Record<string, RegistroVisita>>("acceso/visitas");
  const { data: trabajadores } =
    useFirebaseData<Record<string, RegistroTrabajadores>>("acceso/trabajadores");
  const { data: proveedores } =
    useFirebaseData<Record<string, RegistroProveedor>>("acceso/proveedores");

  // Obtener solo las autorizadas
  useEffect(() => {
    const autorizadas: AutorizacionAprobada[] = [];

    if (visitas) {
      for (const [id, v] of Object.entries(visitas)) {
        if ((v as any)?.estado === "autorizado") {
          autorizadas.push({
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
        if ((t as any)?.estado === "autorizado") {
          autorizadas.push({
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
        if ((p as any)?.estado === "autorizado") {
          autorizadas.push({
            id,
            tipo: "proveedor",
            data: p,
            fechaCreacion: tsFrom(p),
          });
        }
      }
    }

    autorizadas.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    setAutorizaciones(autorizadas);
  }, [visitas, trabajadores, proveedores]);

  // Resolver empadronados
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
          const all = await getEmpadronados();
          const nuevo: Record<string, Empadronado | null> = { ...empMap };
          for (const emp of all) nuevo[emp.id] = emp;
          for (const id of faltantes) if (!(id in nuevo)) nuevo[id] = null;
          setEmpMap(nuevo);
        } else {
          const nuevo: Record<string, Empadronado | null> = { ...empMap };
          await Promise.all(
            Array.from(faltantes).map(async (id) => {
              const emp = await getEmpadronado(id);
              nuevo[id] = emp;
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

  const items = useMemo<AutorizacionAprobada[]>(
    () =>
      autorizaciones.map((a) => {
        const empId = (a.data as any)?.empadronadoId;
        const emp = empId ? empMap[empId] : null;
        return { ...a, empadronado: emp };
      }),
    [autorizaciones, empMap]
  );

  return (
    <div className="space-y-4">
      {/* Buscador */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, apellido, DNI, padrón, empresa o placa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Historial de Autorizaciones</h3>
          <p className="text-sm text-muted-foreground">
            {items.length} {busqueda.trim() ? "resultados encontrados" : "autorizaciones aprobadas"}
          </p>
        </div>
        <Badge variant="outline" className="flex items-center gap-1">
          <Check className="h-3 w-4" />
          {items.length} {busqueda.trim() ? "resultados" : "autorizadas"}
        </Badge>
      </div>

      {items.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay autorizaciones
            </h3>
            <p className="text-muted-foreground">
              Las autorizaciones aprobadas aparecerán aquí
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {items.map((auth) => {
            const Icono = getIcono(auth.tipo);
            const emp = auth.empadronado;

            return (
              <Card key={auth.id} className="border-l-4 border-l-green-500">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Icono className="h-5 w-5 text-muted-foreground" />
                      <div>
                        <CardTitle className="text-lg capitalize">{auth.tipo}</CardTitle>
                        <CardDescription>
                          Autorizado el{" "}
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

                    {/* Vista rápida de datos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      {auth.tipo === "visitante" && (
                        <div>
                          <span className="font-medium">Visitantes:</span>
                          <p className="text-muted-foreground">
                            {(auth.data as RegistroVisita).visitantes?.length || 0} persona(s)
                          </p>
                        </div>
                      )}

                      {auth.tipo === "trabajador" && (
                        <div>
                          <span className="font-medium">Trabajadores:</span>
                          <p className="text-muted-foreground">
                            {(auth.data as any).trabajadores?.length || 0} persona(s)
                          </p>
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

                      {(auth.data as any).placa && (
                        <div>
                          <span className="font-medium">Placa:</span>
                          <p className="text-muted-foreground">{(auth.data as any).placa}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex gap-2 pt-3 border-t">
                      <Button
                        onClick={() => {
                          setSelectedAuth(auth);
                          setDetalleOpen(true);
                        }}
                        className="flex-1"
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Ver Detalle y Control de Ingreso/Salida
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {selectedAuth && (
        <DetalleIngresoSalidaModal
          open={detalleOpen}
          onOpenChange={setDetalleOpen}
          tipo={selectedAuth.tipo}
          data={selectedAuth.data}
          empadronado={selectedAuth.empadronado}
          fechaCreacion={selectedAuth.fechaCreacion}
          registroId={selectedAuth.id}
        />
      )}
    </div>
  );
};
