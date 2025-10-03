import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ref, onValue } from "firebase/database";
import { db } from "@/config/firebase";
import { Calendar, Clock, Download, Search, User, Car, Building } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface RegistroAuditoria {
  id: string;
  tipo: "visitante" | "trabajador" | "proveedor";
  nombre: string;
  dni?: string;
  placa?: string;
  empadronadoNombre: string;
  empadronadoPadron: string;
  horaIngreso?: number;
  horaSalida?: number;
  estado: string;
  porticoId: string;
  autorizadoPor?: string;
}

export const AuditoriaAccesos = () => {
  const [registros, setRegistros] = useState<RegistroAuditoria[]>([]);
  const [filtrados, setFiltrados] = useState<RegistroAuditoria[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [fechaDesde, setFechaDesde] = useState("");
  const [fechaHasta, setFechaHasta] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [tipoFiltro, setTipoFiltro] = useState<string>("todos");
  const [estadoFiltro, setEstadoFiltro] = useState<string>("todos");

  useEffect(() => {
    const cargarDatos = () => {
      const todos: RegistroAuditoria[] = [];

      // Cargar visitas
      const visitasRef = ref(db, "acceso/visitas");
      const trabajadoresRef = ref(db, "acceso/trabajadores");
      const proveedoresRef = ref(db, "acceso/proveedores");

      onValue(visitasRef, (snapshot) => {
        if (snapshot.exists()) {
          Object.entries(snapshot.val()).forEach(([id, data]: any) => {
            todos.push({
              id,
              tipo: "visitante",
              nombre: data.visitantes?.[0]?.nombre || "",
              dni: data.visitantes?.[0]?.dni || "",
              placa: data.placa || "",
              empadronadoNombre: data.solicitadoPorNombre || "",
              empadronadoPadron: data.solicitadoPorPadron || "",
              horaIngreso: data.createdAt || data.fechaCreacion,
              horaSalida: data.horaSalida,
              estado: data.estado || "pendiente",
              porticoId: data.porticoId || "principal",
              autorizadoPor: data.autorizadoPor,
            });
          });
        }
      });

      onValue(trabajadoresRef, (snapshot) => {
        if (snapshot.exists()) {
          Object.entries(snapshot.val()).forEach(([id, data]: any) => {
            todos.push({
              id,
              tipo: "trabajador",
              nombre: data.trabajadores?.[0]?.nombre || "",
              dni: data.trabajadores?.[0]?.dni || "",
              placa: data.placa || "",
              empadronadoNombre: data.solicitadoPorNombre || "",
              empadronadoPadron: data.solicitadoPorPadron || "",
              horaIngreso: data.createdAt || data.fechaCreacion,
              horaSalida: data.horaSalida,
              estado: data.estado || "pendiente",
              porticoId: data.porticoId || "principal",
              autorizadoPor: data.autorizadoPor,
            });
          });
        }
      });

      onValue(proveedoresRef, (snapshot) => {
        if (snapshot.exists()) {
          Object.entries(snapshot.val()).forEach(([id, data]: any) => {
            todos.push({
              id,
              tipo: "proveedor",
              nombre: data.empresa || "",
              dni: "",
              placa: data.placa || "",
              empadronadoNombre: data.solicitadoPorNombre || "",
              empadronadoPadron: data.solicitadoPorPadron || "",
              horaIngreso: data.createdAt || data.fechaCreacion,
              horaSalida: data.horaSalida,
              estado: data.estado || "pendiente",
              porticoId: data.porticoId || "principal",
              autorizadoPor: data.autorizadoPor,
            });
          });
        }
        setRegistros(todos);
        setFiltrados(todos);
        setLoading(false);
      });
    };

    cargarDatos();
  }, []);

  useEffect(() => {
    let result = [...registros];

    // Filtro por tipo
    if (tipoFiltro !== "todos") {
      result = result.filter((r) => r.tipo === tipoFiltro);
    }

    // Filtro por estado
    if (estadoFiltro !== "todos") {
      result = result.filter((r) => r.estado === estadoFiltro);
    }

    // Filtro por búsqueda
    if (busqueda) {
      const termino = busqueda.toLowerCase();
      result = result.filter(
        (r) =>
          r.nombre.toLowerCase().includes(termino) ||
          r.dni?.toLowerCase().includes(termino) ||
          r.placa?.toLowerCase().includes(termino) ||
          r.empadronadoNombre.toLowerCase().includes(termino) ||
          r.empadronadoPadron.toLowerCase().includes(termino)
      );
    }

    // Filtro por fecha
    if (fechaDesde) {
      const desde = new Date(fechaDesde).getTime();
      result = result.filter((r) => (r.horaIngreso || 0) >= desde);
    }
    if (fechaHasta) {
      const hasta = new Date(fechaHasta).setHours(23, 59, 59, 999);
      result = result.filter((r) => (r.horaIngreso || 0) <= hasta);
    }

    // Ordenar por fecha descendente
    result.sort((a, b) => (b.horaIngreso || 0) - (a.horaIngreso || 0));

    setFiltrados(result);
  }, [registros, tipoFiltro, estadoFiltro, busqueda, fechaDesde, fechaHasta]);

  const exportarCSV = () => {
    const headers = ["Tipo", "Nombre/Empresa", "DNI", "Placa", "Empadronado", "Padrón", "Ingreso", "Salida", "Estado", "Pórtico"];
    const rows = filtrados.map((r) => [
      r.tipo,
      r.nombre,
      r.dni || "",
      r.placa || "",
      r.empadronadoNombre,
      r.empadronadoPadron,
      r.horaIngreso ? format(new Date(r.horaIngreso), "dd/MM/yyyy HH:mm", { locale: es }) : "",
      r.horaSalida ? format(new Date(r.horaSalida), "dd/MM/yyyy HH:mm", { locale: es }) : "",
      r.estado,
      r.porticoId,
    ]);

    const csv = [headers, ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-accesos-${format(new Date(), "yyyyMMdd")}.csv`;
    a.click();
  };

  const getBadgeColor = (tipo: string) => {
    switch (tipo) {
      case "visitante": return "bg-blue-500";
      case "trabajador": return "bg-green-500";
      case "proveedor": return "bg-purple-500";
      default: return "bg-gray-500";
    }
  };

  const getEstadoBadge = (estado: string) => {
    switch (estado) {
      case "autorizado": return "bg-green-500";
      case "denegado": return "bg-red-500";
      case "pendiente": return "bg-yellow-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Filtros de Búsqueda
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Desde</label>
              <Input
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Hasta</label>
              <Input
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Tipo</label>
              <Select value={tipoFiltro} onValueChange={setTipoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="visitante">Visitantes</SelectItem>
                  <SelectItem value="trabajador">Trabajadores</SelectItem>
                  <SelectItem value="proveedor">Proveedores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-2 block">Estado</label>
              <Select value={estadoFiltro} onValueChange={setEstadoFiltro}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos</SelectItem>
                  <SelectItem value="pendiente">Pendiente</SelectItem>
                  <SelectItem value="autorizado">Autorizado</SelectItem>
                  <SelectItem value="denegado">Denegado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="flex-1">
              <Input
                placeholder="Buscar por nombre, DNI, placa, padrón..."
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                className="w-full"
              />
            </div>
            <Button onClick={exportarCSV} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Exportar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{filtrados.length}</div>
            <p className="text-sm text-muted-foreground">Total Registros</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">
              {filtrados.filter((r) => r.estado === "autorizado").length}
            </div>
            <p className="text-sm text-muted-foreground">Autorizados</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-yellow-600">
              {filtrados.filter((r) => r.estado === "pendiente").length}
            </div>
            <p className="text-sm text-muted-foreground">Pendientes</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-red-600">
              {filtrados.filter((r) => r.estado === "denegado").length}
            </div>
            <p className="text-sm text-muted-foreground">Denegados</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabla de registros */}
      <Card>
        <CardHeader>
          <CardTitle>Registro de Accesos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Nombre/Empresa</TableHead>
                  <TableHead>DNI</TableHead>
                  <TableHead>Placa</TableHead>
                  <TableHead>Empadronado</TableHead>
                  <TableHead>Ingreso</TableHead>
                  <TableHead>Salida</TableHead>
                  <TableHead>Estado</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      Cargando...
                    </TableCell>
                  </TableRow>
                ) : filtrados.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center">
                      No se encontraron registros
                    </TableCell>
                  </TableRow>
                ) : (
                  filtrados.map((registro) => (
                    <TableRow key={registro.id}>
                      <TableCell>
                        <Badge className={getBadgeColor(registro.tipo)}>
                          {registro.tipo}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{registro.nombre}</TableCell>
                      <TableCell>{registro.dni || "-"}</TableCell>
                      <TableCell>{registro.placa || "-"}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{registro.empadronadoNombre}</div>
                          <div className="text-muted-foreground">{registro.empadronadoPadron}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {registro.horaIngreso
                          ? format(new Date(registro.horaIngreso), "dd/MM/yyyy HH:mm", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        {registro.horaSalida
                          ? format(new Date(registro.horaSalida), "dd/MM/yyyy HH:mm", { locale: es })
                          : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge className={getEstadoBadge(registro.estado)}>
                          {registro.estado}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
