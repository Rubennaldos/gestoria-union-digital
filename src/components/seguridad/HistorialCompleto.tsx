import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, UserCheck, Shield, Search } from "lucide-react";
import { useFirebaseData } from "@/hooks/useFirebase";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { getEmpadronado, getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";

interface AutorizacionHistorial {
  id: string;
  tipo: "visitante" | "trabajador" | "proveedor";
  data: RegistroVisita | RegistroTrabajadores | RegistroProveedor;
  fechaCreacion: number;
  empadronado?: Empadronado | null;
  salidaDefinitiva?: boolean;
  horaSalidaDefinitiva?: number;
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

export const HistorialCompleto = () => {
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionHistorial[]>([]);
  const [empMap, setEmpMap] = useState<Record<string, Empadronado | null>>({});
  const [busqueda, setBusqueda] = useState("");

  const { data: visitas } = useFirebaseData<Record<string, RegistroVisita>>("acceso/visitas");
  const { data: trabajadores } =
    useFirebaseData<Record<string, RegistroTrabajadores>>("acceso/trabajadores");
  const { data: proveedores } =
    useFirebaseData<Record<string, RegistroProveedor>>("acceso/proveedores");

  // Obtener TODAS las autorizaciones (incluyendo las que tienen salida definitiva)
  useEffect(() => {
    const autorizadas: AutorizacionHistorial[] = [];

    if (visitas) {
      for (const [id, v] of Object.entries(visitas)) {
        const vAny = v as any;
        // Mostrar todos los autorizados (con o sin salida definitiva)
        if (vAny?.estado === "autorizado") {
          autorizadas.push({
            id,
            tipo: "visitante",
            data: v,
            fechaCreacion: tsFrom(v),
            salidaDefinitiva: vAny.salidaDefinitiva || false,
            horaSalidaDefinitiva: vAny.horaSalidaDefinitiva,
          });
        }
      }
    }

    if (trabajadores) {
      for (const [id, t] of Object.entries(trabajadores)) {
        const tAny = t as any;
        if (tAny?.estado === "autorizado") {
          autorizadas.push({
            id,
            tipo: "trabajador",
            data: t,
            fechaCreacion: tsFrom(t),
            salidaDefinitiva: tAny.salidaDefinitiva || false,
            horaSalidaDefinitiva: tAny.horaSalidaDefinitiva,
          });
        }
      }
    }

    if (proveedores) {
      for (const [id, p] of Object.entries(proveedores)) {
        const pAny = p as any;
        if (pAny?.estado === "autorizado") {
          autorizadas.push({
            id,
            tipo: "proveedor",
            data: p,
            fechaCreacion: tsFrom(p),
            salidaDefinitiva: pAny.salidaDefinitiva || false,
            horaSalidaDefinitiva: pAny.horaSalidaDefinitiva,
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

  const items = useMemo<AutorizacionHistorial[]>(() => {
    const itemsConEmp = autorizaciones.map((a) => {
      const empId = (a.data as any)?.empadronadoId;
      const emp = empId ? empMap[empId] : null;
      return { ...a, empadronado: emp };
    });

    if (!busqueda.trim()) return itemsConEmp;

    const searchLower = busqueda.toLowerCase();
    return itemsConEmp.filter((item) => {
      if (item.empadronado) {
        const nombreCompleto = `${item.empadronado.nombre} ${item.empadronado.apellidos}`.toLowerCase();
        const padron = (item.empadronado.numeroPadron?.toString() || "").toLowerCase();
        if (nombreCompleto.includes(searchLower) || padron.includes(searchLower)) {
          return true;
        }
      }

      if (item.tipo === "visitante") {
        const visitantes = (item.data as RegistroVisita).visitantes || [];
        const found = visitantes.some((v) => {
          const nombre = (v.nombre || "").toLowerCase();
          const dni = (v.dni || "").toLowerCase();
          return nombre.includes(searchLower) || dni.includes(searchLower);
        });
        if (found) return true;
      }

      if (item.tipo === "trabajador") {
        const trabajadores = (item.data as any).trabajadores || [];
        const found = trabajadores.some((t: any) => {
          const nombre = (t.nombre || "").toLowerCase();
          const dni = (t.dni || "").toLowerCase();
          return nombre.includes(searchLower) || dni.includes(searchLower);
        });
        if (found) return true;
      }

      if (item.tipo === "proveedor") {
        const empresa = ((item.data as RegistroProveedor).empresa || "").toLowerCase();
        if (empresa.includes(searchLower)) return true;
      }

      const placa = ((item.data as any).placa || "").toLowerCase();
      if (placa.includes(searchLower)) return true;

      return false;
    });
  }, [autorizaciones, empMap, busqueda]);

  const visitantesItems = items.filter(i => i.tipo === "visitante");
  const trabajadoresItems = items.filter(i => i.tipo === "trabajador");
  const proveedoresItems = items.filter(i => i.tipo === "proveedor");

  const renderAutorizaciones = (items: AutorizacionHistorial[], tipoLabel: string) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay {tipoLabel.toLowerCase()} en el historial
            </p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {items.map((auth) => {
          const Icono = getIcono(auth.tipo);
          const emp = auth.empadronado;

          return (
            <Card key={auth.id} className={`border-l-4 ${auth.salidaDefinitiva ? 'border-l-gray-400' : 'border-l-green-500'}`}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Icono className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <CardTitle className="text-lg capitalize">{auth.tipo}</CardTitle>
                      <CardDescription>
                        Autorizado el {auth.fechaCreacion ? new Date(auth.fechaCreacion).toLocaleString() : "—"}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge className={auth.salidaDefinitiva ? "bg-gray-400 text-white" : getColorBadge(auth.tipo)}>
                    {auth.salidaDefinitiva ? "FINALIZADO" : "ACTIVO"}
                  </Badge>
                </div>
              </CardHeader>

              <CardContent>
                <div className="space-y-4">
                  <div className="bg-muted/50 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium text-sm">Solicitado por:</span>
                    </div>
                    {emp === undefined ? (
                      <p className="text-sm text-muted-foreground">Cargando…</p>
                    ) : emp ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                        <div>
                          <span className="font-medium">Vecino:</span>
                          <p className="text-muted-foreground">{emp.nombre} {emp.apellidos}</p>
                        </div>
                        <div>
                          <span className="font-medium">Padrón:</span>
                          <p className="text-muted-foreground">{emp.numeroPadron}</p>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Información no disponible</p>
                    )}
                  </div>

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
                    {auth.salidaDefinitiva && auth.horaSalidaDefinitiva && (
                      <div className="col-span-full">
                        <span className="font-medium">Salida Definitiva:</span>
                        <p className="text-muted-foreground">
                          {new Date(auth.horaSalidaDefinitiva).toLocaleString()}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl">Historial Completo de Autorizaciones</CardTitle>
            <CardDescription>
              Registro completo de todas las autorizaciones (activas y finalizadas)
            </CardDescription>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre, DNI, padrón o placa..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="todos" className="w-full">
          <TabsList className="grid w-full grid-cols-4 mb-6">
            <TabsTrigger value="todos" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Todos ({items.length})
            </TabsTrigger>
            <TabsTrigger value="visitantes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Visitantes ({visitantesItems.length})
            </TabsTrigger>
            <TabsTrigger value="trabajadores" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              Trabajadores ({trabajadoresItems.length})
            </TabsTrigger>
            <TabsTrigger value="proveedores" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Proveedores ({proveedoresItems.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="todos">
            {renderAutorizaciones(items, "Registros")}
          </TabsContent>

          <TabsContent value="visitantes">
            {renderAutorizaciones(visitantesItems, "Visitantes")}
          </TabsContent>

          <TabsContent value="trabajadores">
            {renderAutorizaciones(trabajadoresItems, "Trabajadores")}
          </TabsContent>

          <TabsContent value="proveedores">
            {renderAutorizaciones(proveedoresItems, "Proveedores")}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
