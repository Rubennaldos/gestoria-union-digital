import { useEffect, useMemo, useState } from "react";
import {
  CheckCircle, XCircle, Clock, Eye, Download, AlertCircle,
  DollarSign, Calendar, User, CreditCard,
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
import { db } from "@/config/firebase";
import { useAuthBoot } from "@/contexts/AuthBoot";
import {
  ref, query, orderByChild, equalTo, limitToFirst, get,
} from "firebase/database";

// ------------------ Tipos ------------------
type EstadoPago = "pendiente" | "confirmado" | "rechazado";

interface PagoSolicitud {
  id: string;
  empadronadoId: string;
  empadronadoNombre: string;
  numeroPadron: string;
  cuotasSeleccionadas?: string[];
  totalMonto: number;
  metodoPago: string;
  banco: string;
  numeroOperacion: string;
  fechaPago: string;         // ISO o "YYYY-MM-DD"
  periodo?: string;          // "YYYY-MM" (recomendado)
  periodo_estado?: string;   // "YYYY-MM|pendiente" (recomendado)
  comprobante?: string;
  estado: EstadoPago;
  motivo?: string;
  fechaSolicitud?: string;
  fechaRespuesta?: string;
  respondidoPor?: string;
  detallesCuotas?: { periodo: string; monto: number; mora: number; descuento: number }[];
}

// ------------------ Constantes ------------------
const PAGE_SIZE = 10;
const UI_PAGE_SIZE = 10;
const HOY_PERIODO = new Date().toISOString().slice(0, 7); // "YYYY-MM"

// ------------------ Data Access ------------------
/**
 * Intenta la consulta MÁS BARATA:
 *   orderByChild("periodo_estado") + equalTo(`${periodo}|${estado}`)
 * Si no hay datos con ese campo, hace fallback a:
 *   orderByChild("estado") + equalTo(estado)
 */
async function fetchPagos(
  estado: EstadoPago,
  periodo: string | null,
  startKey?: string
): Promise<{ items: PagoSolicitud[]; nextKey?: string }> {
  const baseRef = ref(db, "cobranzas/pagos");

  // Helper para ejecutar una query
  async function run(orderKey: string, equal: string, limit: number) {
    const q = query(baseRef, orderByChild(orderKey), equalTo(equal, startKey), limitToFirst(limit));
    const snap = await get(q);
    const buf: PagoSolicitud[] = [];
    let lastKey: string | undefined;

    snap.forEach((ch) => {
      buf.push({ id: ch.key!, ...(ch.val() as any) });
      lastKey = ch.key!;
    });

    // Si hay startKey, RTDB incluye el último; filtramos
    const items = startKey ? buf.filter(x => x.id !== startKey) : buf;
    return { items, lastKey };
  }

  // 1) Si tenemos periodo, probamos periodo_estado (MUY rápido con índice)
  if (periodo) {
    const value = `${periodo}|${estado}`;
    const limit = PAGE_SIZE + (startKey ? 1 : 0);
    const { items, lastKey } = await run("periodo_estado", value, limit);

    // Si devolvió algo, usamos esto
    if (items.length > 0 || startKey) {
      return { items, nextKey: items.length === PAGE_SIZE ? lastKey : undefined };
    }
    // Si no hay datos con ese campo, caemos al modo por estado
  }

  // 2) Fallback: solo por estado (más registros = más lento)
  const limit = PAGE_SIZE + (startKey ? 1 : 0);
  const { items, lastKey } = await run("estado", estado, limit);
  return { items, nextKey: items.length === PAGE_SIZE ? lastKey : undefined };
}

// ================ Componente ================
export function BandejaPagosEconomia() {
  const { user, ready } = useAuthBoot();
  const { toast } = useToast();

  const [tab, setTab] = useState<"pendientes" | "historial">("pendientes");
  const [periodo, setPeriodo] = useState<string>(HOY_PERIODO); // ⬅️ filtro de mes

  // Datos crudos paginados
  const [pendRaw, setPendRaw] = useState<PagoSolicitud[]>([]);
  const [histRaw, setHistRaw] = useState<PagoSolicitud[]>([]);

  // Cursores server
  const [nextPendKey, setNextPendKey] = useState<string | undefined>();
  const [nextHistConfKey, setNextHistConfKey] = useState<string | undefined>();
  const [nextHistRechKey, setNextHistRechKey] = useState<string | undefined>();

  // Paginación visual
  const [pendUiPages, setPendUiPages] = useState(1);
  const [histUiPages, setHistUiPages] = useState(1);

  // Flags
  const [loadingPend, setLoadingPend] = useState(true);
  const [loadingHist, setLoadingHist] = useState(false);
  const [procesando, setProcesando] = useState<string | null>(null);

  // Modal rechazo
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [sel, setSel] = useState<PagoSolicitud | null>(null);

  // -------- Carga inicial (cuando hay user) --------
  useEffect(() => {
    if (!ready || !user) return;
    void reloadPendientes();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, user, periodo]); // ⬅️ si cambias el mes, recarga

  async function reloadPendientes() {
    try {
      setLoadingPend(true);
      const { items, nextKey } = await fetchPagos("pendiente", periodo);
      setPendRaw(items);
      setNextPendKey(nextKey);
      setPendUiPages(1);
    } catch {
      toast({ title: "Error", description: "No se pudieron cargar pendientes", variant: "destructive" });
    } finally {
      setLoadingPend(false);
    }
  }

  // Historial bajo demanda
  useEffect(() => {
    if (tab !== "historial" || histRaw.length > 0 || loadingHist || !user) return;
    void loadHistFirstPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, user, periodo]);

  async function loadMorePendServer() {
    if (!nextPendKey) return;
    setLoadingPend(true);
    try {
      const { items, nextKey } = await fetchPagos("pendiente", periodo, nextPendKey);
      setPendRaw(prev => [...prev, ...items]);
      setNextPendKey(nextKey);
    } finally {
      setLoadingPend(false);
    }
  }

  async function loadHistFirstPage() {
    try {
      setLoadingHist(true);
      const [conf, rech] = await Promise.all([
        fetchPagos("confirmado", periodo),
        fetchPagos("rechazado", periodo),
      ]);
      const sorted = [...conf.items, ...rech.items].sort((a, b) => {
        const fa = a.fechaRespuesta || a.fechaPago || "";
        const fb = b.fechaRespuesta || b.fechaPago || "";
        return fb.localeCompare(fa);
      });
      setHistRaw(sorted);
      setNextHistConfKey(conf.nextKey);
      setNextHistRechKey(rech.nextKey);
      setHistUiPages(1);
    } catch {
      toast({ title: "Error", description: "No se pudo cargar el historial", variant: "destructive" });
    } finally {
      setLoadingHist(false);
    }
  }

  async function loadMoreHistServer() {
    if (!nextHistConfKey && !nextHistRechKey) return;
    setLoadingHist(true);
    try {
      const [conf, rech] = await Promise.all([
        fetchPagos("confirmado", periodo, nextHistConfKey),
        fetchPagos("rechazado", periodo, nextHistRechKey),
      ]);
      const merged = [...histRaw, ...conf.items, ...rech.items].sort((a, b) => {
        const fa = a.fechaRespuesta || a.fechaPago || "";
        const fb = b.fechaRespuesta || b.fechaPago || "";
        return fb.localeCompare(fa);
      });
      setHistRaw(merged);
      setNextHistConfKey(conf.nextKey ?? nextHistConfKey);
      setNextHistRechKey(rech.nextKey ?? nextHistRechKey);
    } finally {
      setLoadingHist(false);
    }
  }

  // Vistas recortadas por UI
  const pendView = useMemo(() => pendRaw.slice(0, pendUiPages * UI_PAGE_SIZE), [pendRaw, pendUiPages]);
  const histView = useMemo(() => histRaw.slice(0, histUiPages * UI_PAGE_SIZE), [histRaw, histUiPages]);

  function handleMorePend() {
    const showed = pendUiPages * UI_PAGE_SIZE;
    if (showed < pendRaw.length) {
      setPendUiPages(p => p + 1);
    } else if (nextPendKey) {
      void loadMorePendServer().then(() => setPendUiPages(p => p + 1));
    }
  }
  function handleMoreHist() {
    const showed = histUiPages * UI_PAGE_SIZE;
    if (showed < histRaw.length) {
      setHistUiPages(p => p + 1);
    } else if (nextHistConfKey || nextHistRechKey) {
      void loadMoreHistServer().then(() => setHistUiPages(p => p + 1));
    }
  }

  // Duplicados
  const duplicados = useMemo(() => {
    const ops = new Set<string>();
    const dups: string[] = [];
    [...pendView, ...histView.filter(h => h.estado === "confirmado")].forEach(p => {
      const key = `${p.banco}_${p.fechaPago}_${p.numeroOperacion}`.toLowerCase();
      if (ops.has(key)) dups.push(p.numeroOperacion);
      else ops.add(key);
    });
    return dups;
  }, [pendView, histView]);

  async function confirmarPago(id: string) {
    try {
      setProcesando(id);
      const s = pendRaw.find(x => x.id === id);
      if (!s) return;
      const confirmado: PagoSolicitud = {
        ...s,
        estado: "confirmado",
        fechaRespuesta: new Date().toLocaleDateString("es-PE"),
        respondidoPor: user?.uid,
      };
      setPendRaw(prev => prev.filter(x => x.id !== id));
      setHistRaw(prev => [confirmado, ...prev]);
      setPendUiPages(1);
      toast({ title: "Pago confirmado", description: `Pago de ${s.empadronadoNombre} confirmado.` });
    } catch {
      toast({ title: "Error", description: "No se pudo confirmar el pago", variant: "destructive" });
    } finally {
      setProcesando(null);
    }
  }

  async function rechazarPago() {
    if (!sel || !motivoRechazo.trim()) {
      toast({ title: "Error", description: "Indica el motivo.", variant: "destructive" });
      return;
    }
    try {
      setProcesando(sel.id);
      const r: PagoSolicitud = {
        ...sel,
        estado: "rechazado",
        motivo: motivoRechazo,
        fechaRespuesta: new Date().toLocaleDateString("es-PE"),
        respondidoPor: user?.uid,
      };
      setPendRaw(prev => prev.filter(x => x.id !== sel.id));
      setHistRaw(prev => [r, ...prev]);
      setSel(null);
      setMotivoRechazo("");
      setPendUiPages(1);
      toast({ title: "Pago rechazado", description: "Se rechazó el pago.", variant: "destructive" });
    } catch {
      toast({ title: "Error", description: "No se pudo rechazar el pago", variant: "destructive" });
    } finally {
      setProcesando(null);
    }
  }

  // ---------------------- UI ----------------------
  if (loadingPend && pendView.length === 0) {
    return (
      <div className="space-y-4">
        <div className="h-32 bg-muted animate-pulse rounded-lg" />
        <div className="h-64 bg-muted animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtro de mes */}
      <div className="flex items-center gap-3">
        <Label className="text-sm">Período</Label>
        <input
          type="month"
          className="border rounded px-2 py-1 text-sm"
          value={periodo}
          onChange={(e) => setPeriodo(e.target.value || HOY_PERIODO)}
        />
        <Button variant="outline" onClick={() => setPeriodo(HOY_PERIODO)}>Mes actual</Button>
      </div>

      {duplicados.length > 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>⚠️ Posibles duplicados:</strong> {duplicados.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-yellow-500" />
            <div><p className="text-sm text-muted-foreground">Pendientes</p>
            <p className="text-2xl font-bold">{pendRaw.length}</p></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-500" />
            <div><p className="text-sm text-muted-foreground">Monto Pendiente</p>
            <p className="text-2xl font-bold">S/ {pendRaw.reduce((s, x) => s + (x.totalMonto || 0), 0).toFixed(2)}</p></div>
          </div>
        </CardContent></Card>

        <Card><CardContent className="p-4">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-blue-500" />
            <div><p className="text-sm text-muted-foreground">Procesados Hoy</p>
            <p className="text-2xl font-bold">{histRaw.filter(h => h.fechaRespuesta === new Date().toLocaleDateString("es-PE")).length}</p></div>
          </div>
        </CardContent></Card>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendientes" className="gap-2"><Clock className="h-4 w-4" />Pendientes ({pendView.length}/{pendRaw.length})</TabsTrigger>
          <TabsTrigger value="historial" className="gap-2"><Calendar className="h-4 w-4" />Historial ({histView.length}/{histRaw.length})</TabsTrigger>
        </TabsList>

        {/* Pendientes */}
        <TabsContent value="pendientes">
          <Card>
            <CardHeader><CardTitle>Solicitudes Pendientes</CardTitle></CardHeader>
            <CardContent>
              {pendView.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-muted-foreground">No hay solicitudes pendientes</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendView.map((s) => (
                    <Card key={s.id} className="border-l-4 border-l-yellow-500">
                      <CardContent className="p-4">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <User className="h-4 w-4" />
                              <span className="font-semibold">{s.empadronadoNombre}</span>
                              <Badge variant="outline">{s.numeroPadron}</Badge>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                              <div className="flex items-center gap-2"><DollarSign className="h-3 w-3" /><span>Monto: S/ {Number(s.totalMonto || 0).toFixed(2)}</span></div>
                              <div className="flex items-center gap-2"><CreditCard className="h-3 w-3" /><span>{s.metodoPago} - {s.banco}</span></div>
                              <div className="flex items-center gap-2"><span>Op: {s.numeroOperacion}</span></div>
                              <div className="flex items-center gap-2"><Calendar className="h-3 w-3" /><span>Pago: {s.fechaPago}</span></div>
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row gap-2">
                            <Dialog>
                              <DialogTrigger asChild><Button variant="outline" size="sm" className="gap-2"><Eye className="h-3 w-3" />Ver Detalle</Button></DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader><DialogTitle>Detalle del Pago</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <div><h4 className="font-semibold mb-2">Información del Asociado</h4>
                                    <p><strong>Nombre:</strong> {s.empadronadoNombre}</p>
                                    <p><strong>Padrón:</strong> {s.numeroPadron}</p></div>
                                  {s.detallesCuotas?.length ? (
                                    <div>
                                      <h4 className="font-semibold mb-2">Detalles</h4>
                                      <div className="space-y-2 text-sm">
                                        {s.detallesCuotas.map((c, i) => (
                                          <div key={i} className="flex justify-between p-2 bg-muted rounded">
                                            <span>{c.periodo}</span>
                                            <div className="text-right">
                                              <div>Base: S/ {c.monto.toFixed(2)}</div>
                                              {c.mora > 0 && <div className="text-red-600">Mora: +S/ {c.mora.toFixed(2)}</div>}
                                              {c.descuento > 0 && <div className="text-green-600">Desc: -S/ {c.descuento.toFixed(2)}</div>}
                                            </div>
                                          </div>
                                        ))}
                                        <div className="flex justify-between font-semibold pt-2 border-t"><span>Total:</span><span>S/ {Number(s.totalMonto || 0).toFixed(2)}</span></div>
                                      </div>
                                    </div>
                                  ) : null}
                                  {s.comprobante && <Button variant="outline" className="w-full gap-2"><Download className="h-4 w-4" />Ver Comprobante</Button>}
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button size="sm" className="gap-2 bg-green-600 hover:bg-green-700" onClick={() => confirmarPago(s.id)} disabled={procesando === s.id}>
                              <CheckCircle className="h-3 w-3" />{procesando === s.id ? "Confirmando..." : "Confirmar"}
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="destructive" size="sm" className="gap-2" onClick={() => setSel(s)}>
                                  <XCircle className="h-3 w-3" />Rechazar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Rechazar Pago</DialogTitle></DialogHeader>
                                <div className="space-y-4">
                                  <p>¿Rechazar el pago de <strong>{s.empadronadoNombre}</strong>?</p>
                                  <div>
                                    <Label>Motivo *</Label>
                                    <Textarea value={motivoRechazo} onChange={(e) => setMotivoRechazo(e.target.value)} rows={3} />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button variant="outline" onClick={() => { setSel(null); setMotivoRechazo(""); }} className="flex-1">Cancelar</Button>
                                    <Button variant="destructive" onClick={rechazarPago} disabled={procesando === s.id} className="flex-1">
                                      {procesando === s.id ? "Rechazando..." : "Rechazar"}
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

                  <div className="flex justify-center">
                    <Button variant="outline" onClick={handleMorePend} disabled={loadingPend || (!nextPendKey && pendView.length >= pendRaw.length)}>
                      {loadingPend ? "Cargando..." :
                        (pendView.length < pendRaw.length || nextPendKey) ? "Cargar más" : "No hay más"}
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Historial */}
        <TabsContent value="historial">
          <Card>
            <CardHeader><CardTitle>Historial de Pagos</CardTitle></CardHeader>
            <CardContent>
              {loadingHist && histView.length === 0 ? (
                <div className="h-64 bg-muted animate-pulse rounded-lg" />
              ) : histView.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay pagos procesados</p>
                </div>
              ) : (
                <>
                  <div className="space-y-3">
                    {histView.map((p) => (
                      <div key={p.id} className={`p-4 border rounded-lg ${p.estado === "confirmado" ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
                        <div className="flex items-center justify-between">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold">{p.empadronadoNombre}</span>
                              <Badge variant="outline">{p.numeroPadron}</Badge>
                              <Badge variant={p.estado === "confirmado" ? "default" : "destructive"}>
                                {p.estado === "confirmado" && <CheckCircle className="h-3 w-3 mr-1" />}
                                {p.estado === "rechazado" && <XCircle className="h-3 w-3 mr-1" />}
                                {p.estado.charAt(0).toUpperCase() + p.estado.slice(1)}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              <span>S/ {Number(p.totalMonto || 0).toFixed(2)} • </span>
                              <span>{p.banco} • </span>
                              <span>Op: {p.numeroOperacion} • </span>
                              <span>Procesado: {p.fechaRespuesta}</span>
                            </div>
                            {p.motivo && <div className="text-sm bg-red-100 text-red-700 p-2 rounded mt-2"><strong>Motivo:</strong> {p.motivo}</div>}
                          </div>
                          {p.comprobante && <Button variant="outline" size="sm" className="gap-2"><Download className="h-3 w-3" />Comprobante</Button>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="flex justify-center mt-4">
                    <Button variant="outline" onClick={handleMoreHist} disabled={loadingHist || (!nextHistConfKey && !nextHistRechKey && histView.length >= histRaw.length)}>
                      {loadingHist ? "Cargando..." :
                        (histView.length < histRaw.length || nextHistConfKey || nextHistRechKey) ? "Cargar más" : "No hay más"}
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
