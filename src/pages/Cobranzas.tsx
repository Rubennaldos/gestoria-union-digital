import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Home,
  Users,
  FileText,
  Download,
  Upload,
  Calendar,
  Receipt,
  UserCheck,
} from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import {
  generarEstadisticas,
  ejecutarCierreMensual,
  generarPagosDesdeEnero,
  obtenerPagos,
  obtenerEgresos,
  obtenerPagosPorEmpadronado,
} from "@/services/cobranzas";
import { EstadisticasCobranzas, Pago, Egreso } from "@/types/cobranzas";
import { getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";
import { RegistrarPagoModal } from "@/components/cobranzas/RegistrarPagoModal";
import { DeclaracionJuradaModal } from "@/components/cobranzas/DeclaracionJuradaModal";
import { SancionModal } from "@/components/cobranzas/SancionModal";
import { DetalleEmpadronadoModal } from "@/components/cobranzas/DetalleEmpadronadoModal";

/* Helpers para fechas y morosidad en UI */
const parseEs = (s?: string | null) => {
  if (!s) return null;
  const [dd, mm, aa] = s.split("/").map(Number);
  if (!dd || !mm || !aa) return null;
  return new Date(aa, mm - 1, dd);
};
const hoy = () => new Date();
const esMorosoUI = (p: Pago) => {
  const v = parseEs(p.fechaVencimiento);
  const vencido = v ? v.getTime() < hoy().getTime() : false;
  return p.estado === "moroso" || (vencido && (p.estado === "pendiente" || p.estado === "sancionado"));
};

type Filtro = "todos" | "morosos" | "pendientes" | "aldia";

const Cobranzas = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [estadisticas, setEstadisticas] = useState<EstadisticasCobranzas | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [pagosEmpadronados, setPagosEmpadronados] = useState<Record<string, Pago[]>>({});
  const [loading, setLoading] = useState(true);
  const [autoInitHecho, setAutoInitHecho] = useState(false);

  const [filtro, setFiltro] = useState<Filtro>("todos");

  // Modales
  const [registrarPagoModal, setRegistrarPagoModal] = useState<{ open: boolean; pago?: Pago }>({ open: false });
  const [declaracionModal, setDeclaracionModal] = useState<{ open: boolean; empadronadoId?: string }>({ open: false });
  const [sancionModal, setSancionModal] = useState<{ open: boolean; empadronadoId?: string }>({ open: false });
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; empadronado?: Empadronado }>({ open: false });

  useEffect(() => {
    cargarDatos(); // hará autogeneración si faltan cargos
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async (reintentoTrasGenerar = false) => {
    try {
      setLoading(true);

      const [stats, pagosList, egresosList, empadronadosList] = await Promise.all([
        generarEstadisticas(),
        obtenerPagos(),
        obtenerEgresos(),
        getEmpadronados(),
      ]);

      // Autogenera cargos desde enero si recién se instala
      if (!autoInitHecho && empadronadosList.length > 0 && pagosList.length === 0) {
        try {
          await generarPagosDesdeEnero(user?.uid || "system");
          setAutoInitHecho(true);
          toast({
            title: "Inicialización automática",
            description: "Se generaron los cargos desde enero 2025 para todos los asociados.",
          });
          if (!reintentoTrasGenerar) {
            await cargarDatos(true);
            return;
          }
        } catch {
          // seguimos sin romper
        }
      }

      setPagos(pagosList.slice(0, 10));
      setEgresos(egresosList.slice(0, 10));
      setEmpadronados(empadronadosList);

      // Cargar pagos por empadronado y calcular KPI reales (morosos por vencimiento)
      const pagosMap: Record<string, Pago[]> = {};
      for (const emp of empadronadosList) {
        const pagosEmp = await obtenerPagosPorEmpadronado(emp.id);
        pagosMap[emp.id] = pagosEmp;
      }
      setPagosEmpadronados(pagosMap);

      // --- KPI UI basados en vencimientos (no dependemos solo del estado "moroso") ---
      let deudaPendiente = 0;
      const morososSet = new Set<string>();

      Object.entries(pagosMap).forEach(([empId, arr]) => {
        let tieneMoroso = false;
        for (const p of arr) {
          const moroso = esMorosoUI(p);
          if (moroso) tieneMoroso = true;

          // Deuda pendiente = sumamos montos de pendientes o morosos (vencidos o no)
          if (p.estado === "pendiente" || moroso) deudaPendiente += Number(p.monto || 0);
        }
        if (tieneMoroso) morososSet.add(empId);
      });

      const statsAjustadas: EstadisticasCobranzas = {
        totalEmpadronados: stats.totalEmpadronados,
        totalRecaudado: stats.totalRecaudado,   // mes actual
        totalPendiente: deudaPendiente,        // acumulado todos los periodos
        totalMorosos: morososSet.size,         // asociados con al menos un periodo moroso
        tasaCobranza: stats.tasaCobranza,
        ingresosMes: stats.ingresosMes,
        egresosMes: stats.egresosMes,
        saldoActual: stats.saldoActual,
      };

      setEstadisticas(statsAjustadas);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de cobranzas",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const ejecutarCierre = async () => {
    if (!user) return;
    try {
      await ejecutarCierreMensual(user.uid);
      toast({ title: "Éxito", description: "Cierre mensual ejecutado correctamente" });
      cargarDatos();
    } catch {
      toast({ title: "Error", description: "No se pudo ejecutar el cierre mensual", variant: "destructive" });
    }
  };

  const calcularDeudaTotal = (empadronadoId: string): number => {
    const pagosEmp = pagosEmpadronados[empadronadoId] || [];
    return pagosEmp
      .filter((p) => p.estado === "pendiente" || esMorosoUI(p))
      .reduce((total, p) => total + Number(p.monto || 0), 0);
  };

  const obtenerEstadoEmpadronado = (empadronadoId: string): string => {
    const pagosEmp = pagosEmpadronados[empadronadoId] || [];
    const tieneMoroso = pagosEmp.some(esMorosoUI);
    if (tieneMoroso) return "moroso";
    const tienePendiente = pagosEmp.some((p) => p.estado === "pendiente" && !esMorosoUI(p));
    if (tienePendiente) return "pendiente";
    return "al_dia";
  };

  // Lista filtrada según el filtro activo
  const empadronadosFiltrados = empadronados.filter((emp) => {
    const arr = pagosEmpadronados[emp.id] || [];
    switch (filtro) {
      case "morosos":
        return arr.some(esMorosoUI);
      case "pendientes":
        return arr.some((p) => p.estado === "pendiente" && !esMorosoUI(p));
      case "aldia":
        return arr.every((p) => p.estado === "pagado" || (!esMorosoUI(p) && p.estado !== "moroso"));
      default:
        return true;
    }
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0 flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
          <p className="text-muted-foreground">Cargando datos de cobranzas...</p>
        </div>
      </div>
    );
  }

  const filtroLabel: Record<Filtro, string> = {
    todos: "Todos",
    morosos: "Morosos",
    pendientes: "Pendientes",
    aldia: "Al día",
  };

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />

      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => (window.location.href = "/")}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Inicio
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cobranzas</h1>
              <p className="text-muted-foreground">Gestión de pagos y cuotas mensuales</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button onClick={ejecutarCierre}>
              <Calendar className="h-4 w-4 mr-2" />
              Ejecutar Cierre
            </Button>
          </div>
        </div>

        {/* Estadísticas (cards clicables para filtrar) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card
            className="border-success/20 bg-success/5 cursor-pointer"
            onClick={() => setFiltro("todos")}
            title="Quitar filtro"
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-success font-medium">Recaudado</p>
                  <p className="text-xl font-bold text-success">
                    S/ {estadisticas?.totalRecaudado.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-warning/20 bg-warning/5 hover:bg-warning/10 cursor-pointer"
            onClick={() => setFiltro("pendientes")}
            title="Ver solo pendientes"
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm text-warning font-medium">Pendiente</p>
                  <p className="text-xl font-bold text-warning">
                    S/ {estadisticas?.totalPendiente.toFixed(2) || "0.00"}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card
            className="border-destructive/20 bg-destructive/5 hover:bg-destructive/10 cursor-pointer"
            onClick={() => setFiltro("morosos")}
            title="Ver solo morosos"
          >
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-destructive font-medium">Morosos</p>
                  <p className="text-xl font-bold text-destructive">
                    {estadisticas?.totalMorosos || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-primary font-medium">Tasa Cobranza</p>
                  <p className="text-xl font-bold text-primary">
                    {estadisticas?.tasaCobranza.toFixed(1) || "0.0"}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col space-y-2"
            onClick={() => setRegistrarPagoModal({ open: true })}
          >
            <Receipt className="h-6 w-6" />
            <span className="text-sm">Registrar Ingreso</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col space-y-2"
            onClick={() => setDeclaracionModal({ open: true })}
          >
            <Download className="h-6 w-6" />
            <span className="text-sm">Plantilla Descuento</span>
          </Button>
          <Button
            variant="outline"
            className="h-auto p-4 flex flex-col space-y-2"
            onClick={() => setSancionModal({ open: true })}
          >
            <Upload className="h-6 w-6" />
            <span className="text-sm">Subir Sanción</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <FileText className="h-6 w-6" />
            <span className="text-sm">Reportes</span>
          </Button>
        </div>

        {/* Filtro activo */}
        {filtro !== "todos" && (
          <div className="flex items-center gap-2">
            <Badge variant="outline">Filtro: {filtroLabel[filtro]}</Badge>
            <Button variant="ghost" size="sm" onClick={() => setFiltro("todos")}>
              Quitar filtro
            </Button>
          </div>
        )}

        {/* Contenido Principal */}
        <Tabs defaultValue="empadronados" className="space-y-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="empadronados">Asociados</TabsTrigger>
            <TabsTrigger value="pagos">Pagos Recientes</TabsTrigger>
            <TabsTrigger value="egresos">Egresos</TabsTrigger>
            <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="empadronados">
            <Card>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-5 w-5" />
                  <span className="font-semibold">Lista de Asociados y Estado de Pagos</span>
                </div>

                <div className="space-y-4">
                  {empadronadosFiltrados.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No se encontraron asociados con el filtro actual</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {empadronadosFiltrados.map((emp) => {
                        const deudaTotal = calcularDeudaTotal(emp.id);
                        const estado = obtenerEstadoEmpadronado(emp.id);
                        const cantidadPagos = pagosEmpadronados[emp.id]?.length || 0;

                        return (
                          <div
                            key={emp.id}
                            className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                          >
                            <div className="flex-1">
                              <div className="font-semibold text-sm">
                                {emp.nombre} {emp.apellidos}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                Padrón: {emp.numeroPadron} • DNI: {emp.dni}
                                {emp.manzana && emp.lote ? ` • Mz. ${emp.manzana} Lt. ${emp.lote}` : ""}
                              </div>
                            </div>

                            <div className="flex items-center space-x-3">
                              <div className="text-right">
                                <p className="text-sm font-medium">Deuda Total: S/ {deudaTotal.toFixed(2)}</p>
                                <p className="text-xs text-muted-foreground">{cantidadPagos} pagos generados</p>
                              </div>

                              <Badge
                                variant={
                                  estado === "al_dia"
                                    ? "default"
                                    : estado === "moroso"
                                    ? "destructive"
                                    : "secondary"
                                }
                              >
                                {estado === "al_dia" ? "Al día" : estado === "moroso" ? "Moroso" : "Pendiente"}
                              </Badge>

                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setDetalleModal({ open: true, empadronado: emp })}
                              >
                                Ver Detalles
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="pagos">
            <Card>
              <div className="p-4">
                <div className="font-semibold mb-2">Últimos Pagos Registrados</div>
                <div className="space-y-4">
                  {pagos.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay pagos registrados</p>
                    </div>
                  ) : (
                    pagos.map((pago) => (
                      <div key={pago.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Padrón: {pago.numeroPadron}</p>
                          <p className="text-xs text-muted-foreground">
                            {pago.mes}/{pago.año} - Vence: {pago.fechaVencimiento}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge
                            variant={
                              pago.estado === "pagado"
                                ? "default"
                                : pago.estado === "moroso"
                                ? "destructive"
                                : pago.estado === "sancionado"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            S/ {pago.monto.toFixed(2)}
                          </Badge>
                          <Badge variant="outline">{pago.estado}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="egresos">
            <Card>
              <div className="p-4">
                <div className="font-semibold mb-2">Últimos Egresos Registrados</div>
                <div className="space-y-4">
                  {egresos.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay egresos registrados</p>
                    </div>
                  ) : (
                    egresos.map((egreso) => (
                      <div key={egreso.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{egreso.concepto}</p>
                          <p className="text-xs text-muted-foreground">
                            {egreso.fecha} - {egreso.categoria}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive">-S/ {egreso.monto.toFixed(2)}</Badge>
                          <Badge variant="outline">{egreso.estado}</Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="configuracion">
            <Card>
              <div className="p-4 text-center py-8">
                <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Configuración disponible próximamente</p>
                <p className="text-sm text-muted-foreground">Aquí podrás configurar montos, fechas y porcentajes</p>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />

      {/* Modales */}
      <RegistrarPagoModal
        open={registrarPagoModal.open}
        onOpenChange={(open) => setRegistrarPagoModal({ open })}
        pago={registrarPagoModal.pago}
        onSuccess={cargarDatos}
      />

      <DeclaracionJuradaModal
        open={declaracionModal.open}
        onOpenChange={(open) => setDeclaracionModal({ open })}
        empadronadoId={declaracionModal.empadronadoId}
        onSuccess={cargarDatos}
      />

      <SancionModal
        open={sancionModal.open}
        onOpenChange={(open) => setSancionModal({ open })}
        empadronadoId={sancionModal.empadronadoId}
        onSuccess={cargarDatos}
      />

      <DetalleEmpadronadoModal
        open={detalleModal.open}
        onOpenChange={(open) => setDetalleModal({ open })}
        empadronado={detalleModal.empadronado || null}
        onRegistrarPago={(pago) => {
          setDetalleModal({ open: false });
          setRegistrarPagoModal({ open: true, pago });
        }}
      />
    </div>
  );
};

export default Cobranzas;
