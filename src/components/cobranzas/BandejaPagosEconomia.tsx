import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle, XCircle, Clock, Eye, Download, AlertCircle,
  DollarSign, Calendar, User, CreditCard
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

// Firebase RTDB
import { db } from "@/config/firebase";
import { ref, query, orderByChild, equalTo, limitToFirst, get } from "firebase/database";

type EstadoPago = "pendiente" | "confirmado" | "rechazado";

interface PagoSolicitud {
  id: string;
  empadronadoId: string;
  empadronadoNombre: string;
  numeroPadron: string;
  cuotasSeleccionadas: string[];
  totalMonto: number;
  metodoPago: string;
  banco: string;
  numeroOperacion: string;
  fechaPago: string;
  comprobante?: string;
  estado: EstadoPago;
  motivo?: string;
  fechaSolicitud: string;
  fechaRespuesta?: string;
  respondidoPor?: string;
  detallesCuotas?: { periodo: string; monto: number; mora: number; descuento: number; }[];
}

/** Ajuste clave: página más pequeña para cargar rápido */
const PAGE_SIZE = 10;

/** Lectura indexada + paginada por estado */
async function fetchPagosByEstado(
  estado: EstadoPago,
  startKey?: string
): Promise<{ items: PagoSolicitud[]; nextKey?: string }> {
  const baseRef = ref(db, "cobranzas/pagos");

  if (!startKey) {
    const q1 = query(baseRef, orderByChild("estado"), equalTo(estado), limitToFirst(PAGE_SIZE));
    const s1 = await get(q1);
    const items: PagoSolicitud[] = [];
    let lastKey: string | undefined;
    s1.forEach((ch) => { items.push({ id: ch.key!, ...(ch.val() as any) }); lastKey = ch.key!; });
    return { items, nextKey: items.length === PAGE_SIZE ? lastKey : undefined };
  }

  const q2 = query(baseRef, orderByChild("estado"), equalTo(estado, startKey), limitToFirst(PAGE_SIZE + 1));
  const s2 = await get(q2);
  const buf: PagoSolicitud[] = [];
  let lastKey: string | undefined;
  s2.forEach((ch) => { buf.push({ id: ch.key!, ...(ch.val() as any) }); lastKey = ch.key!; });
  const items = buf.filter((x) => x.id !== startKey);
  return { items, nextKey: items.length === PAGE_SIZE ? lastKey : undefined };
}

export function BandejaPagosEconomia() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Tabs controladas para cargar historial sólo cuando se visita
  const [tab, setTab] = useState<"pendientes" | "historial">("pendientes");

  // Loading flags
  const [loadingPend, setLoadingPend] = useState<boolean>(true);
  const [loadingHist, setLoadingHist] = useState<boolean>(false);

  // Datos
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<PagoSolicitud[]>([]);
  const [historialPagos, setHistorialPagos] = useState<PagoSolicitud[]>([]);

  // Cursores
  const [nextPendKey, setNextPendKey] = useState<string | undefined>();
  const [nextHistConfKey, setNextHistConfKey] = useState<string | undefined>();
  const [nextHistRechKey, setNextHistRechKey] = useState<string | undefined>();

  // Rechazo
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<PagoSolicitud | null>(null);
  const [procesando, setProcesando] = useState<string | null>(null);

  /** Carga inicial: SOLO pendientes (historial se carga on-demand) */
  useEffect(() => {
    loadPendPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Cuando se cambia a la pestaña historial por primera vez, carga su primera página */
  useEffect(() => {
    if (tab === "historial" && historialPagos.length === 0 && !loadingHist) {
      void loadHistFirstPage();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  async function loadPendPage() {
    try {
      setLoadingPend(true);
      const { items, nextKey } = await fetchPagosByEstado("pendiente", nextPendKey);
      setSolicitudesPendientes((prev) => [...prev, ...items]);
      setNextPendKey(nextKey);
    } catch (err) {
      toast({ title: "Error", description: "No se pudieron cargar pendientes", variant: "destructive" });
    } finally {
      setLoadingPend(false);
    }
  }

  async function loadHistFirstPage() {
    try {
      setLoadingHist(true);
      const [conf, rech] = await Promise.all([
        fetchPagosByEstado("confirmado"),
        fetchPagosByEstado("rechazado"),
      ]);
      setHistorialPagos(sortHist([...conf.items, ...rech.items]));
      setNextHistConfKey(conf.nextKey);
      setNextHistRechKey(rech.nextKey);
    } catch (err) {
      toast({ title: "Error", description: "No se pudo cargar el historial", variant: "destructive" });
    } finally {
      setLoadingHist(false);
    }
  }

  async function loadMoreHist() {
    try {
      setLoadingHist(true);
      const [conf, rech] = await Promise.all([
        fetchPagosByEstado("confirmado", nextHistConfKey),
        fetchPagosByEstado("rechazado", nextHistRechKey),
      ]);
      setHistorialPagos((prev) => sortHist([...prev, ...conf.items, ...rech.items]));
      setNextHistConfKey(conf.nextKey ?? nextHistConfKey);
      setNextHistRechKey(rech.nextKey ?? nextHistRechKey);
    } catch (err) {
      toast({ title: "Error", description: "No se pudo cargar más historial", variant: "destructive" });
    } finally {
      setLoadingHist(false);
    }
  }

  function sortHist(arr: PagoSolicitud[]) {
    return [...arr].sort((a, b) => {
      const fa = a.fechaRespuesta || a.fechaPago || "";
      const fb = b.fechaRespuesta || b.fechaPago || "";
      return fb.localeCompare(fa);
    });
  }

  // Duplicados visibles
  const duplicados = useMemo(() => {
    const ops = new Set<string>();
    const dups: string[] = [];
    [...solicitudesPendientes, ...historialPagos.filter((h) => h.estado === "confirmado")].forEach((p) => {
      const key = `${p.banco}_${p.fechaPago}_${p.numeroOperacion}`.toLowerCase();
      if (ops.has(key)) dups.push(p.numeroOperacion);
      else ops.add(key);
    });
    return dups;
  }, [solicitudesPendientes, historialPagos]);

  async function confirmarPago(solicitudId: string) {
    try {
      setProcesando(solicitudId);
      const s = solicitudesPendientes.find((x) => x.id === solicitudId);
      if (!s) return;

      const confirmado: PagoSolicitud = {
        ...s,
        estado: "confirmado",
        fechaRespuesta: new Date().toLocaleDateString("es-PE"),
        respondidoPor: user?.uid,
      };

      setSolicitudesPendientes((prev) => prev.filter((x) => x.id !== solicitudId));
      setHistorialPagos((prev) => sortHist([confirmado, ...prev]));
      toast({ title: "Pago confirmado", description: `Pago de ${s.empadronadoNombre} confirmado.` });
    } catch {
      toast({ title: "Error", description: "No se pudo confirmar el pago", variant: "destructive" });
    } finally {
      setProcesando(null);
    }
  }

  async function rechazarPago() {
    if (!solicitudSeleccionada || !motivoRechazo.trim()) {
      toast({ title: "Error", description: "Debes indicar el motivo.", variant: "destructive" });
      return;
    }
    try {
      setProcesando(solicitudSeleccionada.id);
      const r: PagoSolicitud = {
        ...solicitudSeleccionada,
        estado: "rechazado",
        motivo: motivoRechazo,
        fechaRespuesta: new Date().toLocaleDateString("es-PE"),
        respondidoPor: user?.uid,
      };
      setSolicitudesPendientes((prev) => prev.filter((x) => x.id !== solicitudSeleccionada.id));
      setHistorialPagos((prev) => sortHist([r, ...prev]));
      setSolicitudSeleccionada(null);
      setMotivoRechazo("");
      toast({ title: "Pago rechazado", description: `Se rechazó el pago.`, variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "No se pudo rechazar el pago", variant: "destructive" });
    } finally {
      setProcesando(null);
    }
  }

  // ---------- UI ----------
  if (loadingPend && solicitudesPendientes.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Alertas */}
      {duplicados.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ Posibles duplicados:</strong> {duplicados.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4"><div className="flex items-center gap-2">
          <Clock className="h-5 w-5 text-yellow-500" />
          <div><p className="text-sm text-muted-foreground">Pendientes</p>
          <p className="text-2xl font-bold">{solicitudesPendientes.length}</p></div></div></CardContent></Card>

        <Card><CardContent className="p-4"><div className="flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-green-500" />
          <div><p className="text-sm text-muted-foreground">Monto Pendiente</p>
          <p className="text-2xl font-bold">S/ {solicitudesPendientes.reduce((sum, s) => sum + (s.totalMonto || 0), 0).toFixed(2)}</p></div></div></CardContent></Card>

        <Card><CardContent className="p-4"><div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-blue-500" />
          <div><p className="text-sm text-muted-foreground">Procesados Hoy</p>
          <p className="text-2xl font-bold">{historialPagos.filter(h => h.fechaRespuesta === new Date().toLocaleDateString("es-PE")).length}</p></div></div></CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendientes" className="gap-2"><Clock className="h-4 w-4" />Pendientes ({solicitudesPendientes.length})</TabsTrigger>
          <TabsTrigger value="historial" className="gap-2"><Calendar className="h-4 w-4" />Historial</TabsTrigger>
        </TabsList>

        {/* PENDIENTES */}
        <TabsContent value="pendientes">
          <Card>
            <CardHeader><CardTitle>Solicitudes Pendientes de Revisión</CardTitle></CardHeader>
            <CardContent>
              {solicitudesPendientes.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {solicitudesPendientes.map((solicitud) => (
                    <Card key={solicitud.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-semibold">{solicitud.empadronadoNombre}</span>
                              <Badge variant="outline">{solicitud.numeroPadron}</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2"><DollarSign className="h-3 w-3" /><span>Monto: S/ {Number(solicitud.totalMonto || 0).toFixed(2)}</span></div>
                              <div className="flex items-center gap-2"><CreditCard className="h-3 w-3" /><span>{solicitud.metodoPago} - {solicitud.banco}</span></div>
                              <div className="flex items-center gap-2"><span>Op: {solicitud.numeroOperacion}</span></div>
                              <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /><span>Pago: {solicitud.fechaPago}</span></div>
                            </div>
                            {solicitud.detallesCuotas?.length ? (
                              <div className="text-xs text-muted-foreground">
                                Cuotas: {solicitud.detallesCuotas.map((c) => c.periodo).join(", ")}
                              </div>
                            ) : null}
                          </div>

                          <div className="flex flex-col md:flex-row gap-2">
                            <Dialog>
                              <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Eye className="h-3 w-3" />Ver Detalle</Button></DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader><DialogTitle>Detalle del Pago</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-semibold mb-2">Información del Asociado</h4>
                                    <p><strong>Nombre:</strong> {solicitud.empadronadoNombre}</p>
                                    <p><strong>Padrón:</strong> {solicitud.numeroPadron}</p>
                                  </div>
                                  {solicitud.detallesCuotas?.length ? (
                                    <div>
                                      <h4 className="font-semibold mb-2">Detalles</h4>
                                      <div className="space-y-2 text-sm">
                                        {solicitud.detallesCuotas.map((cuota, idx) => (
                                          <div key={idx} className="flex justify-between p-2 bg-muted rounded">
                                            <span>{cuota.periodo}</span>
                                            <div className="text-right">
                                              <div>Base: S/ {cuota.monto.toFixed(2)}</div>
                                              {cuota.mora > 0 && <div className="text-red-600">Mora: +S/ {cuota.mora.toFixed(2)}</div>}
                                              {cuota.descuento > 0 && <div className="text-green-600">Desc: -S/ {cuota.descuento.toFixed(2)}</div>}
                                            </div>
                                          </div>
                                        ))}
                                        <div className="flex justify-between font-semibold pt-2 border-t"><span>Total:</span><span>S/ {Number(solicitud.totalMonto || 0).toFixed(2)}</span></div>
                                      </div>
                                    </div>
                                  ) : null}
                                  {solicitud.comprobante && <Button variant="outline" className="w-full gap-2"><Download className="h-4 w-4" />Ver Comprobante</Button>}
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button onClick={() => confirmarPago(solicitud.id)} disabled={procesando === solicitud.id} size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                              <CheckCircle className="h-3 w-3" />{procesando === solicitud.id ? "Confirmando..." : "Confirmar"}
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setSolicitudSeleccionada(solicitud)}>
                                  <XCircle className="h-3 w-3" />Rechazar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Rechazar Pago</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <p>¿Estás seguro de rechazar el pago de <strong>{solicitud.empadronadoNombre}</strong>?</p>
                                  <div>
                                    <Label>Motivo del rechazo *</Label>
                                    <Textarea value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} placeholder="Explica por qué se rechaza este pago..." rows={3} />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => { setSolicitudSeleccionada(null); setMotivoRechazo(""); }} className="flex-1">Cancelar</Button>
                                    <Button variant="destructive" onClick={rechazarPago} disabled={procesando === solicitud.id} className="flex-1">
                                      {procesando === solicitud.id ? "Rechazando..." : "Rechazar"}
                                    </Button>
                                  </div>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {/* Paginación pendientes */}
                  <div className="flex justify-center">
                    <Button variant="outline" onClick={loadPendPage} disabled={loadingPend || !nextPendKey}>
                      {loadingPend ? "Cargando..." : nextPendKey ? "Cargar más" : "No hay más"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* HISTORIAL (se carga al visitar la pestaña) */}
        <TabsContent value="historial">
          <Card>
            <CardHeader><CardTitle>Historial de Pagos Procesados</CardTitle></CardHeader>
            <CardContent>
              {loadingHist && historialPagos.length === 0 ? (
                <div className="h-64 bg-muted animate-pulse rounded-lg" />
              ) : historialPagos.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay pagos procesados aún</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {historialPagos.map((pago) => (
                      <div key={pago.id} className={`p-4 border rounded-lg ${pago.estado === "confirmado" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{pago.empadronadoNombre}</span>
                              <Badge variant="outline">{pago.numeroPadron}</Badge>
                              <Badge variant={pago.estado === "confirmado" ? "default" : "destructive"}>
                                {pago.estado === "confirmado" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {pago.estado === "rechazado" && <XCircle className="h-3 w-3 mr-1" />}
                                {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span>S/ {Number(pago.totalMonto || 0).toFixed(2)} • </span>
                              <span>{pago.banco} • </span>
                              <span>Op: {pago.numeroOperacion} • </span>
                              <span>Procesado: {pago.fechaRespuesta}</span>
                            </div>
                            {pago.motivo && <div className="text-sm bg-red-100 text-red-700 p-2 rounded mt-2"><strong>Motivo:</strong> {pago.motivo}</div>}
                          </div>
                          {pago.comprobante && <Button variant="outline" size="sm" className="gap-2"><Download className="h-3 w-3" />Comprobante</Button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Paginación historial */}
                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={loadMoreHist} disabled={loadingHist || (!nextHistConfKey && !nextHistRechKey)}>
                      {loadingHist ? "Cargando..." : (nextHistConfKey || nextHistRechKey) ? "Cargar más" : "No hay más"}
                    </Button>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
