import { useState, useEffect, useMemo } from "react";
import { get, ref as dbRef } from "firebase/database";
import { db } from "@/config/firebase";
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

  // Open detalle: ensure we have the full registro from acceso/{tipo}/{id}
  const openDetalle = async (auth: AutorizacionPendiente) => {
    try {
      const record = auth.data as any;
      let needsFetch = false;

      if (auth.tipo === 'trabajador') {
        // expect trabajadores array
        if (!record || !record.trabajadores) needsFetch = true;
      } else if (auth.tipo === 'visitante') {
        if (!record || !record.visitantes) needsFetch = true;
      } else if (auth.tipo === 'proveedor') {
        if (!record || !record.empresa) needsFetch = true;
      }

      if (needsFetch) {
        // fetch full registro from RTDB
        const path = `acceso/${auth.tipo === 'visitante' ? 'visitas' : auth.tipo === 'trabajador' ? 'trabajadores' : 'proveedores'}/${auth.id}`;
        const snap = await get(dbRef(db, path));
        if (snap.exists()) {
          const full = snap.val();
          setSelectedAuth({ ...auth, data: full, fechaCreacion: full.createdAt || full.fechaCreacion || auth.fechaCreacion });
        } else {
          // still set what we have
          setSelectedAuth(auth);
        }
      } else {
        setSelectedAuth(auth);
      }
    } catch (e) {
      console.error('Error fetching full registro for detalle:', e);
      setSelectedAuth(auth);
    } finally {
      setDetalleOpen(true);
    }
  };

  // Generar PDF unitario para una autorización (trabajador/visitante/proveedor)
  const generarPDFUnitario = async (authParam: AutorizacionPendiente) => {
    try {
      // Asegurar registro completo si el snapshot es parcial
      const needsFetch = (a: AutorizacionPendiente) => {
        const record = a.data as any;
        if (a.tipo === "trabajador") return !record || !record.trabajadores;
        if (a.tipo === "visitante") return !record || !record.visitantes;
        if (a.tipo === "proveedor") return !record || !record.empresa;
        return false;
      };

      let auth = authParam;
      if (needsFetch(authParam)) {
        const path = `acceso/${authParam.tipo === "visitante" ? "visitas" : authParam.tipo === "trabajador" ? "trabajadores" : "proveedores"}/${authParam.id}`;
        const snap = await get(dbRef(db, path));
        if (snap.exists()) {
          auth = { ...authParam, data: snap.val(), fechaCreacion: snap.val().createdAt || snap.val().fechaCreacion || authParam.fechaCreacion } as AutorizacionPendiente;
        }
      }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const pageWidth = (doc.internal.pageSize as any).getWidth();
      const margin = 36;
      let y = 48;

      doc.setFontSize(18);
      doc.setFont(undefined, "bold");
      // Mostrar correlativo si existe (especialmente para trabajadores)
      const correl = (auth.data as any)?.correlativo;
      if (correl) {
        doc.text(`Solicitud ${auth.tipo.toUpperCase()} — N°: ${correl}`, margin, y);
      } else {
        doc.text(`Solicitud ${auth.tipo.toUpperCase()} — ID: ${auth.id}`, margin, y);
      }
      y += 18;

      doc.setFontSize(10);
      doc.setFont(undefined, "normal");
      doc.text(`Generado: ${new Date().toLocaleString("es-ES")}`, margin, y);
      const fecha = auth.fechaCreacion ? new Date(auth.fechaCreacion).toLocaleString("es-ES") : "—";
      doc.text(`Fecha Solicitud: ${fecha}`, pageWidth - margin - 180, y);
      y += 14;

      // Solicitante (empadronado)
      const emp = auth.empadronado;
      const solicitante = emp ? `${emp.nombre} ${emp.apellidos} (Padrón: ${emp.numeroPadron})` : ((auth.data as any)?.solicitadoPorNombre || "No disponible");
      doc.setFontSize(11);
      doc.setFont(undefined, "bold");
      doc.text("Solicitado por:", margin, y);
      doc.setFont(undefined, "normal");
      doc.text(solicitante, margin + 110, y);
      y += 16;

      // Datos comunes
      doc.setFontSize(10);
      const tipoAcceso = (auth.data as any)?.tipoAcceso || "—";
      const placa = (auth.data as any)?.placa || (auth.data as any)?.placas?.join(", ") || "—";
      doc.text(`Tipo Acceso: ${tipoAcceso}`, margin, y);
      doc.text(`Placa(s): ${placa}`, margin + 250, y);
      y += 14;

      // Contenido por tipo
      if (auth.tipo === "trabajador") {
        const trabajadorData = auth.data as RegistroTrabajadores;

        // Maestro de obra (temporal o por id)
        let maestroInfo: { nombre?: string; dni?: string; telefono?: string; temporal?: boolean } | null = null;
        if (trabajadorData?.maestroObraTemporal) {
          maestroInfo = { nombre: trabajadorData.maestroObraTemporal.nombre, dni: trabajadorData.maestroObraTemporal.dni, temporal: true };
        } else if (trabajadorData?.maestroObraId && trabajadorData.maestroObraId !== "temporal") {
          try {
            const { obtenerMaestroObraPorId } = await import("@/services/acceso");
            const maestro = await obtenerMaestroObraPorId(trabajadorData.maestroObraId);
            if (maestro) maestroInfo = { nombre: maestro.nombre, dni: maestro.dni || "Sin DNI", telefono: maestro.telefono, temporal: false };
          } catch (e) {
            console.error("Error obteniendo maestro de obra para PDF unitario:", e);
          }
        }

        if (maestroInfo) {
          doc.setFontSize(11);
          doc.setFont(undefined, "bold");
          doc.text("Encargado de Obra:", margin, y);
          doc.setFont(undefined, "normal");
          const temporalText = maestroInfo.temporal ? " (Temporal)" : "";
          doc.text(`${maestroInfo.nombre || "—"}${temporalText}`, margin + 120, y);
          y += 14;
          doc.text(`DNI: ${maestroInfo.dni || "—"}${maestroInfo.telefono ? ` — Tel: ${maestroInfo.telefono}` : ""}`, margin + 120, y);
          y += 14;
        }

        const trabajadores = trabajadorData?.trabajadores || [];
        if (trabajadores.length > 0) {
          const body = trabajadores.map((t: any, i: number) => [(i + 1).toString(), t.nombre, t.dni]);
          autoTable(doc, {
            head: [["#", "Nombre", "DNI"]],
            body,
            startY: y,
            styles: { fontSize: 10, cellPadding: 4 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255 },
            margin: { left: margin, right: margin },
          });
          y = (doc as any).lastAutoTable.finalY + 12;
        } else {
          doc.setFontSize(10);
          doc.setFont(undefined, "italic");
          doc.text("Sin trabajadores asociados", margin, y);
          y += 14;
        }
      } else if (auth.tipo === "visitante") {
        const visita = auth.data as RegistroVisita;
        const visitantes = visita?.visitantes || [];
        if (visitantes.length > 0) {
          const body = visitantes.map((v: any, i: number) => [(i + 1).toString(), v.nombre, v.dni, v.esMenor ? "Menor" : "Adulto"]);
          autoTable(doc, {
            head: [["#", "Nombre", "DNI", "Edad"]],
            body,
            startY: y,
            styles: { fontSize: 10, cellPadding: 4 },
            headStyles: { fillColor: [59, 130, 246], textColor: 255 },
            margin: { left: margin, right: margin },
          });
          y = (doc as any).lastAutoTable.finalY + 12;
        }
        if (visita?.menores) {
          doc.setFontSize(10);
          doc.setFont(undefined, "italic");
          doc.text(`Menores adicionales: ${visita.menores}`, margin, y);
          y += 12;
        }
      } else if (auth.tipo === "proveedor") {
        const prov = auth.data as RegistroProveedor;
        doc.setFontSize(11);
        doc.setFont(undefined, "bold");
        doc.text("Empresa:", margin, y);
        doc.setFont(undefined, "normal");
        doc.text(prov?.empresa || "—", margin + 80, y);
        y += 14;
      }

      // Footer / guardar
      const filename = `Solicitud_${auth.tipo}_${auth.id}_${new Date().toISOString().split("T")[0]}.pdf`;
      doc.save(filename);

      toast({ title: "PDF descargado", description: `Se descargó ${filename}` });
    } catch (e) {
      console.error("Error generando PDF unitario:", e);
      toast({ title: "Error", description: "No se pudo generar el PDF unitario", variant: "destructive" });
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

    // Crear documento A4 en puntos para un layout más predecible
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const pageWidth = (doc.internal.pageSize as any).getWidth();
    const margin = 36; // pts
    const usableWidth = pageWidth - margin * 2;
    const tipoTitulo = tipo === "visitante" ? "Visitas" : tipo === "trabajador" ? "Trabajadores" : "Proveedores";

    // Cabecera
    let y = 48;
    doc.setFontSize(18);
    doc.setFont(undefined, "bold");
    doc.text(`Solicitudes de ${tipoTitulo}`, margin, y);

    doc.setFontSize(10);
    doc.setFont(undefined, "normal");
    y += 18;
    doc.text(`Fecha de generación: ${new Date().toLocaleString("es-ES")}`, margin, y);
    doc.text(`Total de solicitudes: ${solicitudesFiltradas.length}`, pageWidth - margin - 160, y);
    y += 12;

    // Helper: ensure we have the full registro para cada auth (RTDB snapshot puede ser parcial)
    const ensureFullRegistro = async (auth: AutorizacionPendiente) => {
      const record = auth.data as any;
      let needsFetch = false;

      if (auth.tipo === "trabajador") {
        if (!record || !record.trabajadores) needsFetch = true;
      } else if (auth.tipo === "visitante") {
        if (!record || !record.visitantes) needsFetch = true;
      } else if (auth.tipo === "proveedor") {
        if (!record || !record.empresa) needsFetch = true;
      }

      if (!needsFetch) return auth;

      try {
        const path = `acceso/${auth.tipo === "visitante" ? "visitas" : auth.tipo === "trabajador" ? "trabajadores" : "proveedores"}/${auth.id}`;
        const snap = await get(dbRef(db, path));
        if (snap.exists()) return { ...auth, data: snap.val(), fechaCreacion: snap.val().createdAt || snap.val().fechaCreacion || auth.fechaCreacion } as AutorizacionPendiente;
        return auth;
      } catch (e) {
        console.error("Error cargando registro completo para PDF:", e);
        return auth;
      }
    };

    if (tipo === "trabajador") {
      // Para trabajadores: mostrar maestro y tabla de trabajadores por solicitud
      let startY = y;

      for (const [solicitudIndex, rawAuth] of solicitudesFiltradas.entries()) {
        const auth = await ensureFullRegistro(rawAuth);
        const emp = auth.empadronado;
        const solicitante = emp ? `${emp.nombre} ${emp.apellidos} (Padrón: ${emp.numeroPadron})` : "No disponible";
        const fecha = auth.fechaCreacion ? new Date(auth.fechaCreacion).toLocaleString("es-ES") : "—";
        const tipoAcceso = (auth.data as any).tipoAcceso || "—";
        const placa = (auth.data as any).placa || (auth.data as any).placas?.join(", ") || "—";
        const trabajadorData = auth.data as RegistroTrabajadores;
        const trabajadores = (trabajadorData && trabajadorData.trabajadores) || [];

        // Maestro de obra
        let maestroInfo: { nombre?: string; dni?: string; telefono?: string; temporal?: boolean } | null = null;
        if (trabajadorData?.maestroObraTemporal) {
          maestroInfo = { nombre: trabajadorData.maestroObraTemporal.nombre, dni: trabajadorData.maestroObraTemporal.dni, temporal: true };
        } else if (trabajadorData?.maestroObraId && trabajadorData.maestroObraId !== "temporal") {
          try {
            const { obtenerMaestroObraPorId } = await import("@/services/acceso");
            const maestro = await obtenerMaestroObraPorId(trabajadorData.maestroObraId);
            if (maestro) maestroInfo = { nombre: maestro.nombre, dni: maestro.dni || "Sin DNI", telefono: maestro.telefono, temporal: false };
          } catch (e) {
            console.error("Error obteniendo maestro de obra para PDF:", e);
          }
        }

        // Bloque de solicitud
        doc.setFillColor(245, 245, 245);
        doc.rect(margin, startY - 6, usableWidth, 6, "F");

        doc.setFontSize(12);
        doc.setFont(undefined, "bold");
        doc.text(`Solicitud #${solicitudIndex + 1}`, margin, startY);
        startY += 16;

        doc.setFontSize(10);
        doc.setFont(undefined, "normal");
        doc.text(`Solicitado por: ${solicitante}`, margin, startY);
        doc.text(`Fecha: ${fecha}`, pageWidth - margin - 200, startY);
        startY += 14;
        doc.text(`Tipo Acceso: ${tipoAcceso} | Placa(s): ${placa}`, margin, startY);
        startY += 12;

        if (maestroInfo) {
          doc.setFontSize(11);
          doc.setFont(undefined, "bold");
          const temporalText = maestroInfo.temporal ? " (Temporal)" : "";
          doc.text(`Encargado de Obra:${temporalText}`, margin, startY);
          doc.setFont(undefined, "normal");
          doc.setFontSize(10);
          doc.text(`${maestroInfo.nombre || "—"} — DNI: ${maestroInfo.dni || "—"}${maestroInfo.telefono ? ` — Tel: ${maestroInfo.telefono}` : ""}`, margin + 120, startY);
          startY += 14;
        }

        if (trabajadores.length > 0) {
          const trabajadoresData = trabajadores.map((t: any, idx: number) => [ (idx + 1).toString(), t.nombre, t.dni ]);

          autoTable(doc, {
            head: [["#", "Nombre", "DNI"]],
            body: trabajadoresData,
            startY: startY,
            styles: { fontSize: 9, cellPadding: 4 },
            headStyles: { fillColor: [37, 99, 235], textColor: 255 },
            alternateRowStyles: { fillColor: [250, 250, 250] },
            margin: { left: margin, right: margin },
            tableWidth: usableWidth,
          });

          startY = (doc as any).lastAutoTable.finalY + 12;
        } else {
          doc.setFontSize(10);
          doc.setFont(undefined, "italic");
          doc.text("Sin trabajadores asociados", margin + 6, startY);
          startY += 14;
        }

        startY += 6;
        const pageHeight = (doc.internal.pageSize as any).getHeight();
        if (startY > pageHeight - margin - 80 && solicitudIndex < solicitudesFiltradas.length - 1) {
          doc.addPage();
          startY = margin;
        }
      }
    } else {
      // Visitas y proveedores: tabla compacta
      const tableData: any[] = [];
      for (const rawAuth of solicitudesFiltradas) {
        const auth = await ensureFullRegistro(rawAuth);
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

        tableData.push([
          solicitante,
          fecha,
          tipoAcceso,
          placa,
          detalles
        ]);
      }

      autoTable(doc, {
        head: [["Solicitado por", "Fecha", "Tipo Acceso", "Placa(s)", tipo === "proveedor" ? "Empresa" : "Personas"]],
        body: tableData,
        startY: y,
        styles: { fontSize: 9, cellPadding: 4 },
        headStyles: { fillColor: [59, 130, 246], textColor: 255 },
        alternateRowStyles: { fillColor: [245, 245, 245] },
        margin: { left: margin, right: margin },
        tableWidth: usableWidth,
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
                        onClick={() => openDetalle(auth)}
                        variant="outline"
                        size="icon"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {/* Botón para descargar PDF unitario de esta solicitud (trabajador) */}
                      <Button
                        onClick={() => generarPDFUnitario(auth)}
                        variant="outline"
                        size="icon"
                        title="Descargar PDF Unitario"
                        className="ml-2"
                      >
                        <Download className="h-4 w-4" />
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
