import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Check, X, Clock, Users, UserCheck, Shield, Eye, Download } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useFirebaseData } from "@/hooks/useFirebase";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { cambiarEstadoAcceso } from "@/services/acceso";
import { DetalleAutorizacionModal } from "./DetalleAutorizacionModal";

// 👇 resolvemos info del vecino (nombre + padrón)
import { getEmpadronado, getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";

import { useAuth } from "@/contexts/AuthContext";

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
  const [selectedAuth, setSelectedAuth] = useState<AutorizacionPendiente | null>(null);
  const [detalleOpen, setDetalleOpen] = useState(false);

  // Obtener estado de carga y usuario
  const { user, loading } = useAuth();

  // Leer de la misma ruta que el widget del dashboard
  const { data: pendientesPortico } = useFirebaseData<Record<string, any>>("seguridad/porticos/principal/pendientes");

  // Mostrar spinner/cargando mientras se carga el usuario
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-lg text-muted-foreground font-semibold">
          Cargando...
        </div>
      </div>
    );
    // Alternativamente: return null;
  }

  // Protección de permisos de módulo (ejemplo: seguridad)
  if (!user?.modules || !user.modules.seguridad) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center text-lg text-muted-foreground font-semibold">
          No tienes permiso para acceder a este módulo
        </div>
      </div>
    );
  }

  // 1) Armar lista de pendientes desde la misma ruta que el widget
  useEffect(() => {
    const pendientes: AutorizacionPendiente[] = [];

    if (pendientesPortico) {
      for (const [id, val] of Object.entries(pendientesPortico)) {
        // Solo incluir solicitudes que están pendientes (no aprobadas ni rechazadas)
        if (!val.estado || val.estado === "pendiente") {
          const tipo = val.tipo as "visitante" | "trabajador" | "proveedor";
          pendientes.push({
            id,
            tipo,
            data: val,
            fechaCreacion: val.createdAt || val.fechaCreacion || 0,
          });
        }
      }
    }

    pendientes.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
    setAutorizaciones(pendientes);
  }, [pendientesPortico]);

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

  const generarPDF = async (tipo: "visitante" | "trabajador" | "proveedor") => {
    const solicitudesFiltradas = items.filter((item) => item.tipo === tipo);

    if (solicitudesFiltradas.length === 0) {
      toast({
        title: "Sin solicitudes",
        description: `No hay solicitudes de ${tipo}s pendientes para exportar.`,
        variant: "default",
      });
      return;
    }

    const doc = new jsPDF();
    const tipoTitulo = tipo === "visitante" ? "Visitas" : tipo === "trabajador" ? "Trabajadores" : "Proveedores";

    doc.setFontSize(18);
    doc.text(`Solicitudes de ${tipoTitulo}`, 14, 22);

    doc.setFontSize(11);
    doc.text(`Fecha de generación: ${new Date().toLocaleString("es-ES")}`, 14, 30);
    doc.text(`Total de solicitudes: ${solicitudesFiltradas.length}`, 14, 36);

    // PDF especial para trabajadores con maestros como subtítulos
    if (tipo === "trabajador") {
      let startY = 42;
      
      for (const [solicitudIndex, auth] of solicitudesFiltradas.entries()) {
        const emp = auth.empadronado;
        const solicitante = emp ? `${emp.nombre} ${emp.apellidos} (Padrón: ${emp.numeroPadron})` : "No disponible";
        const fecha = auth.fechaCreacion ? new Date(auth.fechaCreacion).toLocaleString("es-ES") : "—";
        const tipoAcceso = (auth.data as any).tipoAcceso || "—";
        const placa = (auth.data as any).placa || (auth.data as any).placas?.join(", ") || "—";
        const trabajadorData = auth.data as RegistroTrabajadores;
        const trabajadores = trabajadorData.trabajadores || [];
        
        // Obtener información del maestro de obra
        let maestroInfo = null;
        if (trabajadorData.maestroObraTemporal) {
          maestroInfo = {
            nombre: trabajadorData.maestroObraTemporal.nombre,
            dni: trabajadorData.maestroObraTemporal.dni,
            temporal: true
          };
        } else if (trabajadorData.maestroObraId && trabajadorData.maestroObraId !== "temporal") {
          try {
            const { obtenerMaestroObraPorId } = await import("@/services/acceso");
            const maestro = await obtenerMaestroObraPorId(trabajadorData.maestroObraId);
            if (maestro) {
              maestroInfo = {
                nombre: maestro.nombre,
                dni: maestro.dni || "Sin DNI",
                temporal: false
              };
            }
          } catch (error) {
            console.error("Error al obtener maestro:", error);
          }
        }
        
        // Encabezado de la solicitud
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(`Solicitud #${solicitudIndex + 1}`, 14, startY);
        startY += 6;
        
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.text(`Solicitado por: ${solicitante}`, 14, startY);
        startY += 5;
        doc.text(`Fecha: ${fecha} | Tipo Acceso: ${tipoAcceso} | Placa(s): ${placa}`, 14, startY);
        startY += 8;
        
        // Maestro como subtítulo
        if (maestroInfo) {
          doc.setFontSize(11);
          doc.setFont(undefined, 'bold');
          const temporalText = maestroInfo.temporal ? " (Temporal)" : "";
          doc.text(`Encargado de Obra: ${maestroInfo.nombre} - DNI: ${maestroInfo.dni}${temporalText}`, 14, startY);
          startY += 8;
        }
        
        // Lista de trabajadores
        if (trabajadores.length > 0) {
          doc.setFontSize(10);
          doc.setFont(undefined, 'bold');
          doc.text(`Trabajadores (${trabajadores.length}):`, 14, startY);
          startY += 6;
          
          const trabajadoresData = trabajadores.map((t: any, idx: number) => [
            (idx + 1).toString(),
            t.nombre,
            t.dni
          ]);
          
          autoTable(doc, {
            head: [["#", "Nombre", "DNI"]],
            body: trabajadoresData,
            startY: startY,
            styles: { fontSize: 9, cellPadding: 2 },
            headStyles: { fillColor: [34, 197, 94], textColor: 255 },
            alternateRowStyles: { fillColor: [245, 245, 245] },
            margin: { left: 14, right: 14 },
          });
          
          startY = (doc as any).lastAutoTable.finalY + 10;
        } else {
          doc.setFontSize(9);
          doc.setFont(undefined, 'italic');
          doc.text("Sin trabajadores asociados", 20, startY);
          startY += 10;
        }
        
        // Agregar nueva página si es necesario
        if (startY > 250 && solicitudIndex < solicitudesFiltradas.length - 1) {
          doc.addPage();
          startY = 20;
        }
      }
    } else {
      // PDF normal para visitas y proveedores
      const tableData = solicitudesFiltradas.map((auth, index) => {
        const emp = auth.empadronado;
        const solicitante = emp ? `${emp.nombre} ${emp.apellidos} (Padrón: ${emp.numeroPadron})` : "No disponible";
        const fecha = auth.fechaCreacion ? new Date(auth.fechaCreacion).toLocaleString("es-ES") : "—";
        const tipoAcceso = (auth.data as any).tipoAcceso || "—";
        const placa = (auth.data as any).placa || (auth.data as any).placas?.join(", ") || "—";

        let detalles = "";
        if (tipo === "visitante") {
          const visitantes = (auth.data as RegistroVisita).visitantes || [];
          detalles = visitantes.map((v) => `${v.nombre} (${v.dni})`).join(", ");
        } else if (tipo === "proveedor") {
          detalles = (auth.data as RegistroProveedor).empresa || "—";
        }

        return [
          (index + 1).toString(),
          solicitante,
          fecha,
          tipoAcceso,
          placa,
          detalles
        ];
      });

      autoTable(doc, {
        head: [["#", "Solicitado por", "Fecha", "Tipo Acceso", "Placa(s)", tipo === "proveedor" ? "Empresa" : "Personas"]],
        body: tableData,
        startY: 42,
        styles: { fontSize: 9, cellPadding: 3 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: 14, right: 14 },
      });
    }

    doc.save(`Solicitudes_${tipoTitulo}_${new Date().toISOString().split("T")[0]}.pdf`);

    toast({
      title: "PDF generado",
      description: `Se ha descargado el reporte de ${tipoTitulo}.`,
    });
  };

  // Filtrar por tipo
  const visitantes = items.filter((item) => item.tipo === "visitante");
  const trabajadoresItems = items.filter((item) => item.tipo === "trabajador");
  const proveedoresItems = items.filter((item) => item.tipo === "proveedor");

  const renderSolicitudes = (solicitudes: AutorizacionPendiente[]) => {
    if (solicitudes.length === 0) {
      return (
        <Card>
          <CardContent className="py-8 text-center">
            <Check className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">
              No hay autorizaciones pendientes
            </h3>
            <p className="text-muted-foreground">Todas las solicitudes han sido procesadas</p>
          </CardContent>
        </Card>
      );
    }

    return (
      <div className="grid gap-4">
        {solicitudes.map((auth) => {
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
                        onClick={() => {
                          setSelectedAuth(auth);
                          setDetalleOpen(true);
                        }}
                        variant="outline"
                        size="icon"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
    );
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
        <Tabs defaultValue="visitantes" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="visitantes" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Visitas ({visitantes.length})
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

          <TabsContent value="visitantes" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => generarPDF("visitante")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
            {renderSolicitudes(visitantes)}
          </TabsContent>

          <TabsContent value="trabajadores" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => generarPDF("trabajador")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
            {renderSolicitudes(trabajadoresItems)}
          </TabsContent>

          <TabsContent value="proveedores" className="space-y-4">
            <div className="flex justify-end">
              <Button
                onClick={() => generarPDF("proveedor")}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
            {renderSolicitudes(proveedoresItems)}
          </TabsContent>
        </Tabs>
      )}

      {selectedAuth && (
        <DetalleAutorizacionModal
          open={detalleOpen}
          onOpenChange={setDetalleOpen}
          tipo={selectedAuth.tipo}
          data={selectedAuth.data}
          empadronado={selectedAuth.empadronado}
          fechaCreacion={selectedAuth.fechaCreacion}
        />
      )}
    </div>
  );
};
