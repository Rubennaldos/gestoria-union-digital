// src/pages/Cobranzas.tsx
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
  RefreshCw,
  Wrench,
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
  generarPagosQuincenasTodos,
  obtenerPagos,
  obtenerEgresos,
  obtenerPagosPorEmpadronado,
  obtenerConfiguracion,
  actualizarConfiguracion,
} from "@/services/cobranzas";

import {
  ensureCurrentMonthChargesForAll,
  backfillChargesForAllEmpadronados,
  dedupePagosForAll,
  getEmpadronados,
} from "@/services/empadronados";

import { EstadisticasCobranzas, Pago, Egreso, ConfiguracionCobranzas } from "@/types/cobranzas";
import { Empadronado } from "@/types/empadronados";
import { RegistrarPagoModal } from "@/components/cobranzas/RegistrarPagoModal";
import { DeclaracionJuradaModal } from "@/components/cobranzas/DeclaracionJuradaModal";
import { SancionModal } from "@/components/cobranzas/SancionModal";
import { DetalleEmpadronadoModal } from "@/components/cobranzas/DetalleEmpadronadoModal";
import { PlantillaPagosMasivos } from "@/components/cobranzas/PlantillaPagosMasivos";
import { BandejaPagosEconomia } from "@/components/cobranzas/BandejaPagosEconomia";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

/* ──────────────────────────────────────────────────────────────
   Helpers genéricos
   ────────────────────────────────────────────────────────────── */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  let timer: any;
  const t = new Promise<T>((resolve) => {
    timer = setTimeout(() => resolve(fallback), ms);
  });
  return Promise.race([p, t]).finally(() => clearTimeout(timer));
}

/** Evita auto-inicializar toda la BD al abrir la pantalla si está vacía */
const AUTO_INIT = false;

/** Estadísticas por defecto (evita undefined en la UI) */
const DEFAULT_STATS: EstadisticasCobranzas = {
  totalEmpadronados: 0,
  totalRecaudado: 0,
  totalPendiente: 0,
  totalMorosos: 0,
  tasaCobranza: 0,
  ingresosMes: 0,
  egresosMes: 0,
  saldoActual: 0,
};

/** Configuración por defecto (para pintar la UI sin bloquearse) */
const DEFAULT_CFG: ConfiguracionCobranzas = {
  montoMensual: 50,
  montoQuincenal: 25,
  diaCierre: 14,
  diaVencimiento: 15,
  diasProntoPago: 3,
  porcentajeProntoPago: 0,
  porcentajeMorosidad: 0,
  porcentajeSancion: 0,
  serieComprobantes: "B001",
  numeroComprobanteActual: 1,
  sede: "Sede Principal",
  sistemaQuincenas: true,
};

/* ──────────────────────────────────────────────────────────────
   Helpers fechas / morosidad
   ────────────────────────────────────────────────────────────── */
const parseEs = (s?: string | null) => {
  if (!s) return null;
  const [dd, mm, aa] = s.split("/").map(Number);
  if (!dd || !mm || !aa) return null;
  return new Date(aa, mm - 1, dd);
};
const esMorosoUI = (p: Pago) => {
  const v = parseEs(p.fechaVencimiento);
  const vencido = v ? v.getTime() < Date.now() : false;
  return p.estado === "moroso" || (vencido && (p.estado === "pendiente" || p.estado === "sancionado"));
};
type Filtro = "todos" | "morosos" | "pendientes" | "aldia";

/* Normaliza entrada a YYYY-MM-DD (motor deuda) */
function ensureISO(v: string | number | undefined): string {
  if (!v) return new Date().toISOString().slice(0, 10);
  if (typeof v === "string" && /^\d{4}-\d{2}-\d{2}$/.test(v)) return v;
  if (typeof v === "string" && /^\d{8}$/.test(v)) return `${v.slice(0, 4)}-${v.slice(4, 6)}-${v.slice(6, 8)}`;
  if (typeof v === "number") return new Date(v).toISOString().slice(0, 10);
  return new Date().toISOString().slice(0, 10);
}

/* Deuda “oficial” en línea (mismo motor del modal) */
/* Deuda mostrada solo con pagos REALES de la BD */
function DebtInline({ pagos }: { pagos: Pago[] }) {
  const total = pagos.reduce((s, p) => s + (p.estado === "pagado" ? 0 : Number(p.monto || 0)), 0);
  const moroso = pagos.some(esMorosoUI);

  return (
    <div className="flex items-center space-x-3">
      <div className="text-right">
        <p className="text-sm font-medium">Deuda Total: S/ {total.toFixed(2)}</p>
        <p className="text-xs text-muted-foreground">{pagos.length} pagos generados</p>
      </div>
      <Badge variant={moroso ? "destructive" : "secondary"}>{moroso ? "Moroso" : "Al día"}</Badge>
    </div>
  );
}


/* Recalcular KPIs desde el mapa de pagos */
function recomputeKPIsFromMap(pagosMap: Record<string, Pago[]>) {
  let pendiente = 0;
  const morososSet = new Set<string>();

  Object.entries(pagosMap).forEach(([empId, arr]) => {
    let tieneMoroso = false;
    for (const p of arr) {
      const v = parseEs(p.fechaVencimiento);
      const vencido = v ? v.getTime() < Date.now() : false;
      const moroso = p.estado === "moroso" || (vencido && (p.estado === "pendiente" || p.estado === "sancionado"));
      if (moroso) tieneMoroso = true;
      if (p.estado === "pendiente" || moroso) pendiente += Number(p.monto || 0);
    }
    if (tieneMoroso) morososSet.add(empId);
  });

  return { totalPendiente: pendiente, totalMorosos: morososSet.size };
}

const Cobranzas = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [estadisticas, setEstadisticas] = useState<EstadisticasCobranzas | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [pagosEmpadronados, setPagosEmpadronados] = useState<Record<string, Pago[]>>({});
  const [loading, setLoading] = useState(true);
  const [loadingPagos, setLoadingPagos] = useState(false);
  const [autoInitHecho, setAutoInitHecho] = useState(false);
  const [configuracion, setConfiguracion] = useState<ConfiguracionCobranzas | null>(null);

  // NUEVOS estados
  const [working, setWorking] = useState(false);
  const [guardandoConfig, setGuardandoConfig] = useState(false);

  const [filtro, setFiltro] = useState<Filtro>("todos");

  // Modales
  const [registrarPagoModal, setRegistrarPagoModal] = useState<{ open: boolean; pago?: Pago }>({ open: false });
  const [declaracionModal, setDeclaracionModal] = useState<{ open: boolean; empadronadoId?: string }>({ open: false });
  const [sancionModal, setSancionModal] = useState<{ open: boolean; empadronadoId?: string }>({ open: false });
  const [detalleModal, setDetalleModal] = useState<{ open: boolean; empadronado?: Empadronado }>({ open: false });

  /* ──────────────────────────────────────────────────────────
     Acciones de mantenimiento (botones)
     ────────────────────────────────────────────────────────── */
  const guardarConfiguracion = async () => {
    if (!configuracion) return;
    try {
      setGuardandoConfig(true);
      await actualizarConfiguracion(configuracion);
      toast({ title: "Configuración guardada", description: "Los cambios se han guardado correctamente" });
    } catch {
      toast({ title: "Error", description: "No se pudo guardar la configuración", variant: "destructive" });
    } finally {
      setGuardandoConfig(false);
    }
  };

  const actualizarCampoConfig = (campo: keyof ConfiguracionCobranzas, valor: any) => {
    if (!configuracion) return;
    setConfiguracion({ ...configuracion, [campo]: valor });
  };

  // ===== TRABAJOS EN SEGUNDO PLANO (no bloquean UI) =====
  const generarPagosHistoricos = () => {
    if (!user) return;
    setWorking(true);
    toast({ title: "Generación iniciada", description: "Creando cuotas históricas en segundo plano…" });
    generarPagosDesdeEnero(user.uid)
      .then(() => toast({ title: "Éxito", description: "Se generaron todas las cuotas desde enero 2025" }))
      .catch(() =>
        toast({ title: "Error", description: "No se pudieron generar las cuotas históricas", variant: "destructive" })
      )
      .finally(async () => {
        await cargarDatos(true);
        setWorking(false);
      });
  };

  const generarPagosQuincenas = () => {
    if (!user) return;
    setWorking(true);
    toast({ title: "Procesando…", description: "Generando pagos por quincenas en segundo plano…" });
    generarPagosQuincenasTodos()
      .then((resultado) =>
        toast({
          title: "✅ Pagos de Quincenas Generados",
          description: `Procesados: ${resultado.procesados} • Nuevos: ${resultado.pagosCreados} • Limpiados: ${resultado.pagosLimpiados}`,
        })
      )
      .catch(() =>
        toast({ title: "Error", description: "No se pudieron generar los pagos de quincenas", variant: "destructive" })
      )
      .finally(async () => {
        await cargarDatos(true);
        setWorking(false);
      });
  };

  const generarMesActual = () => {
    setWorking(true);
    toast({ title: "Generando…", description: "Creando la cuota del mes actual en segundo plano…" });
    ensureCurrentMonthChargesForAll(user?.uid || "admin")
      .then((n) => toast({ title: "Mes actual", description: `Cuotas creadas: ${n}` }))
      .catch((e: any) =>
        toast({ title: "Error", description: e?.message || "No se pudo generar el mes actual", variant: "destructive" })
      )
      .finally(async () => {
        await cargarDatos(true);
        setWorking(false);
      });
  };

  const backfillReglas = () => {
    setWorking(true);
    toast({ title: "Backfill iniciado", description: "Se está ejecutando en segundo plano…" });
    backfillChargesForAllEmpadronados(undefined, user?.uid || "admin")
      .then((n) => toast({ title: "Backfill (reglas)", description: `Pagos generados: ${n}` }))
      .catch((e: any) =>
        toast({ title: "Error", description: e?.message || "No se pudo ejecutar el backfill", variant: "destructive" })
      )
      .finally(async () => {
        await cargarDatos(true);
        setWorking(false);
      });
  };

  const arreglarPagos = () => {
    setWorking(true);
    toast({ title: "Arreglando pagos…", description: "Buscando y eliminando duplicados en segundo plano…" });
    dedupePagosForAll()
      .then((r) =>
        toast({ title: "Arreglo completado", description: `Conservados: ${r.kept} • Eliminados (duplicados): ${r.removed}` })
      )
      .catch((e: any) =>
        toast({ title: "Error", description: e?.message || "No se pudo arreglar los pagos", variant: "destructive" })
      )
      .finally(async () => {
        await cargarDatos(true);
        setWorking(false);
      });
  };

  /* ──────────────────────────────────────────────────────────
     Carga principal (rápida + background)
     ────────────────────────────────────────────────────────── */
  useEffect(() => {
    cargarDatos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cargarDatos = async (reintentoTrasGenerar = false) => {
    try {
      setLoading(true);

      // 1) Trae lo mínimo con timeout y pinta la UI rápido
      const cfgRaw = await withTimeout(obtenerConfiguracion(), 4500, DEFAULT_CFG);
      const cfg: ConfiguracionCobranzas = { ...DEFAULT_CFG, ...cfgRaw };
      setConfiguracion(cfg);

      const empList = await withTimeout(getEmpadronados(), 4500, []);
      setEmpadronados(empList);

      const pagosList = await withTimeout(obtenerPagos(), 4500, []);
      setPagos(pagosList.slice(0, 10));

      const egresosList = await withTimeout(obtenerEgresos(), 4500, []);
      setEgresos(egresosList.slice(0, 10));

      const stats = await withTimeout(
        generarEstadisticas(),
        4500,
        { ...DEFAULT_STATS, totalEmpadronados: empList.length }
      );
      setEstadisticas(stats);

      setLoading(false);

      // 2) Auto-init (opcional, desactivado por defecto)
      if (AUTO_INIT && !autoInitHecho && empList.length > 0 && pagosList.length === 0) {
        try {
          setLoading(true);
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
          // no romper
        } finally {
          setLoading(false);
        }
      }

      // 3) Background: pagos por empadronado (lotes) + KPI vivo
      setLoadingPagos(true);
      const pagosMap: Record<string, Pago[]> = {};
      const batchSize = 10;

      for (let i = 0; i < empList.length; i += batchSize) {
        const lote = empList.slice(i, i + batchSize);
        const promesas = lote.map(async (emp) => {
          const pagosEmp = await withTimeout(obtenerPagosPorEmpadronado(emp.id), 7000, []);
          return { empId: emp.id, pagos: pagosEmp };
        });

        const resultados = await Promise.all(promesas);
        resultados.forEach(({ empId, pagos }) => {
          pagosMap[empId] = pagos;
        });

        setPagosEmpadronados((prev) => ({ ...prev, ...pagosMap }));
        if (i + batchSize < empList.length) await sleep(5);
      }

      setLoadingPagos(false);

      // Recalcular KPIs con toda la data detallada
      const { totalPendiente, totalMorosos } = recomputeKPIsFromMap(pagosMap);
      setEstadisticas((prev) =>
        prev ? { ...prev, totalPendiente, totalMorosos } : { ...DEFAULT_STATS, totalPendiente, totalMorosos }
      );
    } catch {
      setLoading(false);
      toast({ title: "Error", description: "No se pudieron cargar los datos de cobranzas", variant: "destructive" });
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

  /* Filtro UI */
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

  /* KPIs en vivo cuando llega el detalle */
  useEffect(() => {
    if (!estadisticas) return;
    const { totalPendiente, totalMorosos } = recomputeKPIsFromMap(pagosEmpadronados);
    setEstadisticas((prev) => (prev ? { ...prev, totalPendiente, totalMorosos } : prev));
  }, [pagosEmpadronados]); // eslint-disable-line

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0 flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
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
            <Button variant="ghost" size="sm" onClick={() => (window.location.href = "/")} className="gap-2">
              <Home className="w-4 h-4" />
              Inicio
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cobranzas</h1>
              <p className="text-muted-foreground">Gestión de pagos y cuotas mensuales</p>
            </div>
          </div>

          {/* Aviso sutil mientras corre un trabajo */}
          {working && (
            <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Procesando… puedes seguir usando la página.
            </div>
          )}

          <div className="flex gap-2">
            <Button onClick={generarPagosHistoricos} disabled={working || loading}>
              <Calendar className="h-4 w-4 mr-2" />
              Generar Desde Enero 2025
            </Button>
            <Button onClick={ejecutarCierre} disabled={working || loading}>
              <Calendar className="h-4 w-4 mr-2" />
              Ejecutar Cierre
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-success/20 bg-success/5 cursor-pointer" onClick={() => setFiltro("todos")} title="Quitar filtro">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-success font-medium">Recaudado</p>
                  <p className="text-xl font-bold text-success">S/ {estadisticas?.totalRecaudado.toFixed(2) || "0.00"}</p>
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
                  <p className="text-xl font-bold text-warning">S/ {estadisticas?.totalPendiente.toFixed(2) || "0.00"}</p>
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
                  <p className="text-xl font-bold text-destructive">{estadisticas?.totalMorosos || 0}</p>
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
                  <p className="text-xl font-bold text-primary">{estadisticas?.tasaCobranza.toFixed(1) || "0.0"}%</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2" onClick={() => setRegistrarPagoModal({ open: true })}>
            <Receipt className="h-6 w-6" />
            <span className="text-sm">Registrar Ingreso</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2" onClick={() => setDeclaracionModal({ open: true })}>
            <Download className="h-6 w-6" />
            <span className="text-sm">Plantilla Descuento</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2" onClick={() => setSancionModal({ open: true })}>
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

        {/* Contenido principal */}
        <Tabs defaultValue="empadronados" className="space-y-4">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="empadronados">Asociados</TabsTrigger>
            <TabsTrigger value="pagos">Pagos Recientes</TabsTrigger>
            <TabsTrigger value="masivos">Pagos Masivos</TabsTrigger>
            <TabsTrigger value="economia">Bandeja Economía</TabsTrigger>
            <TabsTrigger value="egresos">Egresos</TabsTrigger>
            <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="empadronados">
            <Card>
              <div className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <UserCheck className="h-5 w-5" />
                  <span className="font-semibold">Lista de Asociados y Estado de Pagos</span>
                  {loadingPagos && (
                    <div className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
                      <DollarSign className="h-4 w-4 animate-spin" />
                      Cargando detalles de pagos...
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  {empadronadosFiltrados.length === 0 ? (
                    <div className="text-center py-8">
                      <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No se encontraron asociados con el filtro actual</p>
                    </div>
                  ) : (
                    <div className="grid gap-4">
                      {empadronadosFiltrados.map((emp) => (
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
                            <DebtInline pagos={pagosEmpadronados[emp.id] || []} />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setDetalleModal({ open: true, empadronado: emp })}
                            >
                              Ver Detalles
                            </Button>
                          </div>
                        </div>
                      ))}
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

          <TabsContent value="masivos">
            <PlantillaPagosMasivos />
          </TabsContent>

          <TabsContent value="economia">
            <BandejaPagosEconomia />
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
              <div className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">Configuración de Cobranzas</h3>
                    <p className="text-sm text-muted-foreground">Configure los parámetros del sistema de cobranzas</p>
                  </div>
                  <Button onClick={guardarConfiguracion} disabled={guardandoConfig || working}>
                    {guardandoConfig ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>

                {configuracion && (
                  <div className="space-y-8">
                    {/* Sistema de Quincenas */}
                    <div className="border rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Sistema de Quincenas</h4>
                          <p className="text-sm text-muted-foreground">
                            Generar pagos basados en quincenas desde fecha de ingreso según reglas establecidas
                          </p>
                        </div>
                        <Switch
                          checked={configuracion.sistemaQuincenas ?? true}
                          onCheckedChange={(checked) => actualizarCampoConfig("sistemaQuincenas", checked)}
                        />
                      </div>

                      {configuracion.sistemaQuincenas && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="montoQuincenal">Monto por Quincena (S/)</Label>
                            <Input
                              id="montoQuincenal"
                              type="number"
                              step="0.01"
                              value={configuracion.montoQuincenal ?? (configuracion.montoMensual || 0) / 2}
                              onChange={(e) => actualizarCampoConfig("montoQuincenal", parseFloat(e.target.value) || 0)}
                              placeholder="25.00"
                            />
                            <p className="text-xs text-muted-foreground">Monto que se cobrará por cada quincena</p>
                          </div>

                          <div className="flex items-end gap-2">
                            <Button onClick={generarPagosQuincenas} disabled={working || loading} className="w-full">
                              {working || loading ? "Generando..." : "Generar Pagos por Quincenas"}
                            </Button>
                          </div>
                        </div>
                      )}

                      <div className="text-xs text-muted-foreground space-y-1">
                        <p><strong>Reglas:</strong></p>
                        <p>• Si ingreso antes del 15/01/2025: cobrar desde 15/01/2025</p>
                        <p>• Si ingreso ≥ 15/01/2025 y día 1-14: ese mes cuenta</p>
                        <p>• Si ingreso ≥ 15/01/2025 y día 15+: empieza mes siguiente</p>
                        <p>• Solo se cobran quincenas concluidas (1ª cierra día 14, 2ª cierra último día del mes)</p>
                      </div>
                    </div>

                    {/* Controles legacy */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="montoMensual">Monto Mensual (S/)</Label>
                        <Input
                          id="montoMensual"
                          type="number"
                          step="0.01"
                          value={configuracion.montoMensual}
                          onChange={(e) => actualizarCampoConfig("montoMensual", parseFloat(e.target.value) || 0)}
                          placeholder="50.00"
                        />
                        <p className="text-xs text-muted-foreground">
                          Cuota mensual que se cobrará a cada asociado (sistema legacy)
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="diaCierre">Día de Cierre del Mes</Label>
                        <Input
                          id="diaCierre"
                          type="number"
                          min="1"
                          max="28"
                          value={configuracion.diaCierre}
                          onChange={(e) => actualizarCampoConfig("diaCierre", parseInt(e.target.value) || 15)}
                          placeholder="14"
                        />
                        <p className="text-xs text-muted-foreground">Día del mes en que se ejecuta el cierre mensual</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="diaVencimiento">Día de Vencimiento</Label>
                        <Input
                          id="diaVencimiento"
                          type="number"
                          min="1"
                          max="31"
                          value={configuracion.diaVencimiento}
                          onChange={(e) => actualizarCampoConfig("diaVencimiento", parseInt(e.target.value) || 15)}
                          placeholder="15"
                        />
                        <p className="text-xs text-muted-foreground">Día del mes en que vencen los pagos</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="diasProntoPago">Días para Pronto Pago</Label>
                        <Input
                          id="diasProntoPago"
                          type="number"
                          min="1"
                          max="15"
                          value={configuracion.diasProntoPago}
                          onChange={(e) => actualizarCampoConfig("diasProntoPago", parseInt(e.target.value) || 3)}
                          placeholder="3"
                        />
                        <p className="text-xs text-muted-foreground">
                          Días desde inicio del mes para aplicar descuento por pronto pago
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="porcentajeProntoPago">Descuento Pronto Pago (%)</Label>
                        <Input
                          id="porcentajeProntoPago"
                          type="number"
                          step="0.1"
                          min="0"
                          max="50"
                          value={configuracion.porcentajeProntoPago}
                          onChange={(e) => actualizarCampoConfig("porcentajeProntoPago", parseFloat(e.target.value) || 0)}
                          placeholder="5.0"
                        />
                        <p className="text-xs text-muted-foreground">Porcentaje de descuento para pronto pago</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="porcentajeMorosidad">Recargo por Morosidad (%)</Label>
                        <Input
                          id="porcentajeMorosidad"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={configuracion.porcentajeMorosidad}
                          onChange={(e) => actualizarCampoConfig("porcentajeMorosidad", parseFloat(e.target.value) || 0)}
                          placeholder="10.0"
                        />
                        <p className="text-xs text-muted-foreground">Porcentaje de recargo para pagos vencidos</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="porcentajeSancion">Recargo por Sanción (%)</Label>
                        <Input
                          id="porcentajeSancion"
                          type="number"
                          step="0.1"
                          min="0"
                          max="100"
                          value={configuracion.porcentajeSancion}
                          onChange={(e) => actualizarCampoConfig("porcentajeSancion", parseFloat(e.target.value) || 0)}
                          placeholder="15.0"
                        />
                        <p className="text-xs text-muted-foreground">Porcentaje de recargo por sanciones</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="serieComprobantes">Serie de Comprobantes</Label>
                        <Input
                          id="serieComprobantes"
                          type="text"
                          value={configuracion.serieComprobantes}
                          onChange={(e) => actualizarCampoConfig("serieComprobantes", e.target.value)}
                          placeholder="B001"
                        />
                        <p className="text-xs text-muted-foreground">Serie para generar comprobantes de pago</p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="sede">Sede</Label>
                        <Input
                          id="sede"
                          type="text"
                          value={configuracion.sede}
                          onChange={(e) => actualizarCampoConfig("sede", e.target.value)}
                          placeholder="Sede Principal"
                        />
                        <p className="text-xs text-muted-foreground">Nombre de la sede de la organización</p>
                      </div>
                    </div>

                    {/* Herramientas de mantenimiento */}
                    <div className="border rounded-lg p-4 space-y-3">
                      <div className="flex items-center gap-2">
                        <Wrench className="h-5 w-5" />
                        <h4 className="font-medium">Herramientas de mantenimiento</h4>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <Button variant="outline" onClick={generarMesActual} disabled={working || loading}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Generar Mes Actual
                        </Button>
                        <Button variant="outline" onClick={backfillReglas} disabled={working || loading}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Backfill (Reglas)
                        </Button>
                        <Button variant="outline" onClick={arreglarPagos} disabled={working || loading}>
                          <Wrench className="h-4 w-4 mr-2" />
                          Arreglar Pagos (Duplicados)
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        • <strong>Mes Actual</strong>: crea la cuota del mes presente (sin duplicar).<br />
                        • <strong>Backfill (Reglas)</strong>: regenera histórico desde la fecha correcta para cada asociado.<br />
                        • <strong>Arreglar Pagos</strong>: elimina pagos duplicados (1 por mes y asociado).
                      </p>
                    </div>
                  </div>
                )}

                {!configuracion && (
                  <div className="text-center py-8">
                    <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Cargando configuración...</p>
                  </div>
                )}
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
