import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Clock, Users, UserCheck, Shield, LogIn, LogOut, Clock3, ArrowLeft, Check, Search } from "lucide-react";
import { useFirebaseData } from "@/hooks/useFirebase";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { getEmpadronado, getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";
import { ref, update } from "firebase/database";
import { db } from "@/config/firebase";
import { useToast } from "@/hooks/use-toast";

interface AutorizacionAprobada {
  id: string;
  tipo: "visitante" | "trabajador" | "proveedor";
  data: RegistroVisita | RegistroTrabajadores | RegistroProveedor;
  fechaCreacion: number;
  empadronado?: Empadronado | null;
  ingresado?: boolean;
  horaIngreso?: number;
  horaSalidaRapida?: number;
  dentroActualmente?: boolean;
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
  const { toast } = useToast();
  const [autorizaciones, setAutorizaciones] = useState<AutorizacionAprobada[]>([]);
  const [empMap, setEmpMap] = useState<Record<string, Empadronado | null>>({});
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  const { data: visitas } = useFirebaseData<Record<string, RegistroVisita>>("acceso/visitas");
  const { data: trabajadores } =
    useFirebaseData<Record<string, RegistroTrabajadores>>("acceso/trabajadores");
  const { data: proveedores } =
    useFirebaseData<Record<string, RegistroProveedor>>("acceso/proveedores");

  // Obtener solo las autorizadas que NO han salido definitivamente
  useEffect(() => {
    const autorizadas: AutorizacionAprobada[] = [];

    if (visitas) {
      for (const [id, v] of Object.entries(visitas)) {
        const vAny = v as any;
        // Solo mostrar si está autorizado Y NO ha salido definitivamente
        if (vAny?.estado === "autorizado" && !vAny?.salidaDefinitiva) {
          // Usar campos del nivel raíz
          const dentroActualmente = vAny.ingresado && !vAny.horaSalida;
          
          autorizadas.push({
            id,
            tipo: "visitante",
            data: v,
            fechaCreacion: tsFrom(v),
            dentroActualmente: dentroActualmente,
            ingresado: vAny.ingresado || false,
          });
        }
      }
    }

    if (trabajadores) {
      for (const [id, t] of Object.entries(trabajadores)) {
        const tAny = t as any;
        // Solo mostrar si está autorizado Y NO ha salido definitivamente
        if (tAny?.estado === "autorizado" && !tAny?.salidaDefinitiva) {
          // Usar campos del nivel raíz
          const dentroActualmente = tAny.ingresado && !tAny.horaSalida;
          
          autorizadas.push({
            id,
            tipo: "trabajador",
            data: t,
            fechaCreacion: tsFrom(t),
            dentroActualmente: dentroActualmente,
            ingresado: tAny.ingresado || false,
          });
        }
      }
    }

    if (proveedores) {
      for (const [id, p] of Object.entries(proveedores)) {
        const pAny = p as any;
        // Solo mostrar si está autorizado Y NO ha salido definitivamente
        if (pAny?.estado === "autorizado" && !pAny?.salidaDefinitiva) {
          const dentroActualmente = pAny.ingresado && !pAny.horaSalida;
          
          autorizadas.push({
            id,
            tipo: "proveedor",
            data: p,
            fechaCreacion: tsFrom(p),
            dentroActualmente: dentroActualmente,
            ingresado: pAny.ingresado || false,
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

  const items = useMemo<AutorizacionAprobada[]>(() => {
    // Mapear con empadronados
    const itemsConEmp = autorizaciones.map((a) => {
      const empId = (a.data as any)?.empadronadoId;
      const emp = empId ? empMap[empId] : null;
      return { ...a, empadronado: emp };
    });

    // Si no hay búsqueda, retornar todos
    if (!busqueda.trim()) return itemsConEmp;

    // Filtrar por búsqueda
    const searchLower = busqueda.toLowerCase();
    return itemsConEmp.filter((item) => {
      // Buscar en datos del empadronado
      if (item.empadronado) {
        const nombreCompleto = `${item.empadronado.nombre} ${item.empadronado.apellidos}`.toLowerCase();
        const padron = (item.empadronado.numeroPadron?.toString() || "").toLowerCase();
        if (nombreCompleto.includes(searchLower) || padron.includes(searchLower)) {
          return true;
        }
      }

      // Buscar en visitantes
      if (item.tipo === "visitante") {
        const visitantes = (item.data as RegistroVisita).visitantes || [];
        const found = visitantes.some((v) => {
          const nombre = (v.nombre || "").toLowerCase();
          const dni = (v.dni || "").toLowerCase();
          return nombre.includes(searchLower) || dni.includes(searchLower);
        });
        if (found) return true;
      }

      // Buscar en trabajadores
      if (item.tipo === "trabajador") {
        const trabajadores = (item.data as any).trabajadores || [];
        const found = trabajadores.some((t: any) => {
          const nombre = (t.nombre || "").toLowerCase();
          const dni = (t.dni || "").toLowerCase();
          return nombre.includes(searchLower) || dni.includes(searchLower);
        });
        if (found) return true;
      }

      // Buscar en proveedores
      if (item.tipo === "proveedor") {
        const empresa = ((item.data as RegistroProveedor).empresa || "").toLowerCase();
        if (empresa.includes(searchLower)) return true;
      }

      // Buscar en placa
      const placa = ((item.data as any).placa || "").toLowerCase();
      if (placa.includes(searchLower)) return true;

      return false;
    });
  }, [autorizaciones, empMap, busqueda]);

  // Agrupar por tipo
  const visitantesItems = items.filter(i => i.tipo === "visitante");
  const trabajadoresItems = items.filter(i => i.tipo === "trabajador");
  const proveedoresItems = items.filter(i => i.tipo === "proveedor");

  // Funciones de control de acceso
  const handleIngreso = async (auth: AutorizacionAprobada) => {
    const loadingKey = `ingreso-${auth.id}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const now = Date.now();
      const basePath = auth.tipo === "visitante" ? "acceso/visitas" 
        : auth.tipo === "trabajador" ? "acceso/trabajadores" 
        : "acceso/proveedores";

      await update(ref(db, `${basePath}/${auth.id}`), {
        ingresado: true,
        horaIngreso: now,
        ultimoIngreso: now,
        horaSalida: null, // Limpiar campo de salida al reingresar
      });

      // Registrar en historial de seguridad
      await update(ref(db, `seguridad/historial/${auth.id}_ingreso_${now}`), {
        tipo: auth.tipo,
        registroId: auth.id,
        accion: "ingreso",
        timestamp: now,
        empadronadoId: (auth.data as any).empadronadoId,
      });

      toast({
        title: "Ingreso Registrado",
        description: "Se ha registrado el ingreso correctamente",
      });
    } catch (error) {
      console.error("Error al registrar ingreso:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el ingreso",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleSalidaRapida = async (auth: AutorizacionAprobada) => {
    const loadingKey = `salida-rapida-${auth.id}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const now = Date.now();
      const basePath = auth.tipo === "visitante" ? "acceso/visitas" 
        : auth.tipo === "trabajador" ? "acceso/trabajadores" 
        : "acceso/proveedores";

      await update(ref(db, `${basePath}/${auth.id}`), {
        horaSalida: now, // Marca que salió temporalmente
        horaSalidaRapida: now,
        ultimaSalidaRapida: now,
      });

      // Registrar en historial
      await update(ref(db, `seguridad/historial/${auth.id}_salida_rapida_${now}`), {
        tipo: auth.tipo,
        registroId: auth.id,
        accion: "salida_rapida",
        timestamp: now,
        empadronadoId: (auth.data as any).empadronadoId,
      });

      toast({
        title: "Salida Rápida Registrada",
        description: "Salida temporal registrada. Puede reingresar.",
      });
    } catch (error) {
      console.error("Error al registrar salida rápida:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la salida rápida",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleSalidaDefinitiva = async (auth: AutorizacionAprobada) => {
    const loadingKey = `salida-definitiva-${auth.id}`;
    setLoading(prev => ({ ...prev, [loadingKey]: true }));

    try {
      const now = Date.now();
      const basePath = auth.tipo === "visitante" ? "acceso/visitas" 
        : auth.tipo === "trabajador" ? "acceso/trabajadores" 
        : "acceso/proveedores";

      await update(ref(db, `${basePath}/${auth.id}`), {
        horaSalida: now,
        salidaDefinitiva: true,
        horaSalidaDefinitiva: now,
      });

      // Registrar en historial
      await update(ref(db, `seguridad/historial/${auth.id}_salida_definitiva_${now}`), {
        tipo: auth.tipo,
        registroId: auth.id,
        accion: "salida_definitiva",
        timestamp: now,
        empadronadoId: (auth.data as any).empadronadoId,
      });

      toast({
        title: "Salida Definitiva Registrada",
        description: "El registro se ha completado y archivado",
      });
    } catch (error) {
      console.error("Error al registrar salida definitiva:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la salida definitiva",
        variant: "destructive",
      });
    } finally {
      setLoading(prev => ({ ...prev, [loadingKey]: false }));
    }
  };

  const renderAutorizaciones = (items: AutorizacionAprobada[], tipoLabel: string) => {
    if (items.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              No hay {tipoLabel.toLowerCase()} activos
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
            <Card key={auth.id} className={`border-l-4 ${auth.dentroActualmente ? 'border-l-green-500' : 'border-l-yellow-500'}`}>
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
                  <Badge className={getColorBadge(auth.tipo)}>
                    {auth.dentroActualmente ? "ADENTRO" : auth.ingresado ? "AFUERA" : "PENDIENTE"}
                  </Badge>
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

                  {/* Botones de control */}
                  <div className="flex flex-wrap gap-2 pt-3 border-t">
                    {!auth.ingresado ? (
                      <Button
                        onClick={() => handleIngreso(auth)}
                        className="flex-1 min-w-[140px] bg-green-600 hover:bg-green-700"
                        disabled={loading[`ingreso-${auth.id}`]}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        {loading[`ingreso-${auth.id}`] ? "Registrando..." : "Registrar Ingreso"}
                      </Button>
                    ) : auth.dentroActualmente ? (
                      <>
                        <Button
                          onClick={() => handleSalidaRapida(auth)}
                          className="flex-1 min-w-[140px] bg-orange-600 hover:bg-orange-700"
                          disabled={loading[`salida-rapida-${auth.id}`]}
                        >
                          <Clock3 className="h-4 w-4 mr-2" />
                          {loading[`salida-rapida-${auth.id}`] ? "Registrando..." : "Salida Rápida"}
                        </Button>
                        <Button
                          onClick={() => handleSalidaDefinitiva(auth)}
                          className="flex-1 min-w-[140px] bg-red-600 hover:bg-red-700"
                          disabled={loading[`salida-definitiva-${auth.id}`]}
                        >
                          <LogOut className="h-4 w-4 mr-2" />
                          {loading[`salida-definitiva-${auth.id}`] ? "Registrando..." : "Salida Definitiva"}
                        </Button>
                      </>
                    ) : (
                      <Button
                        onClick={() => handleIngreso(auth)}
                        className="flex-1 min-w-[140px] bg-blue-600 hover:bg-blue-700"
                        disabled={loading[`ingreso-${auth.id}`]}
                      >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        {loading[`ingreso-${auth.id}`] ? "Registrando..." : "Reingresar"}
                      </Button>
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

      {/* Resumen */}
      <div className="grid grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
              <div className="text-2xl font-bold">{visitantesItems.length}</div>
              <div className="text-sm text-muted-foreground">Visitantes</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <UserCheck className="h-8 w-8 mx-auto mb-2 text-green-600" />
              <div className="text-2xl font-bold">{trabajadoresItems.length}</div>
              <div className="text-sm text-muted-foreground">Trabajadores</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Shield className="h-8 w-8 mx-auto mb-2 text-orange-600" />
              <div className="text-2xl font-bold">{proveedoresItems.length}</div>
              <div className="text-sm text-muted-foreground">Proveedores</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs por tipo */}
      <Tabs defaultValue="todos" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="todos">Todos ({items.length})</TabsTrigger>
          <TabsTrigger value="visitantes">Visitantes ({visitantesItems.length})</TabsTrigger>
          <TabsTrigger value="trabajadores">Trabajadores ({trabajadoresItems.length})</TabsTrigger>
          <TabsTrigger value="proveedores">Proveedores ({proveedoresItems.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="todos" className="mt-4">
          {items.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <Clock className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No hay autorizaciones activas</h3>
                <p className="text-muted-foreground">
                  Las autorizaciones autorizadas aparecerán aquí
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {visitantesItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Visitantes
                  </h3>
                  {renderAutorizaciones(visitantesItems, "Visitantes")}
                </div>
              )}
              {trabajadoresItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <UserCheck className="h-5 w-5" />
                    Trabajadores
                  </h3>
                  {renderAutorizaciones(trabajadoresItems, "Trabajadores")}
                </div>
              )}
              {proveedoresItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                    <Shield className="h-5 w-5" />
                    Proveedores
                  </h3>
                  {renderAutorizaciones(proveedoresItems, "Proveedores")}
                </div>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="visitantes" className="mt-4">
          {renderAutorizaciones(visitantesItems, "Visitantes")}
        </TabsContent>

        <TabsContent value="trabajadores" className="mt-4">
          {renderAutorizaciones(trabajadoresItems, "Trabajadores")}
        </TabsContent>

        <TabsContent value="proveedores" className="mt-4">
          {renderAutorizaciones(proveedoresItems, "Proveedores")}
        </TabsContent>
      </Tabs>
    </div>
  );
};
