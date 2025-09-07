import { useState, useEffect } from "react";
import {
  CheckCircle,
  XCircle,
  Clock,
  Eye,
  Download,
  AlertCircle,
  DollarSign,
  Calendar,
  User,
  CreditCard
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
  estado: 'pendiente' | 'confirmado' | 'rechazado';
  motivo?: string;
  fechaSolicitud: string;
  fechaRespuesta?: string;
  respondidoPor?: string;
  detallesCuotas: {
    periodo: string;
    monto: number;
    mora: number;
    descuento: number;
  }[];
}

export function BandejaPagosEconomia() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [solicitudesPendientes, setSolicitudesPendientes] = useState<PagoSolicitud[]>([]);
  const [historialPagos, setHistorialPagos] = useState<PagoSolicitud[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState<string | null>(null);
  
  // Modal de rechazo
  const [motivoRechazo, setMotivoRechazo] = useState("");
  const [solicitudSeleccionada, setSolicitudSeleccionada] = useState<PagoSolicitud | null>(null);

  useEffect(() => {
    cargarSolicitudes();
  }, []);

  const cargarSolicitudes = async () => {
    try {
      setLoading(true);
      
      // En una implementación real, esto vendría de Firebase
      // Simulamos datos para mostrar la funcionalidad
      const solicitudesSimuladas: PagoSolicitud[] = [
        {
          id: "pago_001",
          empadronadoId: "emp_001",
          empadronadoNombre: "Juan Pérez García",
          numeroPadron: "A-001",
          cuotasSeleccionadas: ["cuota_01_2025", "cuota_02_2025"],
          totalMonto: 100.00,
          metodoPago: "transferencia",
          banco: "BCP - Banco de Crédito del Perú",
          numeroOperacion: "000123456789",
          fechaPago: "2025-01-15",
          comprobante: "comprobante_001.pdf",
          estado: 'pendiente',
          fechaSolicitud: "2025-01-15",
          detallesCuotas: [
            { periodo: "01/2025", monto: 50, mora: 0, descuento: 0 },
            { periodo: "02/2025", monto: 50, mora: 0, descuento: 0 }
          ]
        },
        {
          id: "pago_002",
          empadronadoId: "emp_002",
          empadronadoNombre: "María González López",
          numeroPadron: "B-015",
          cuotasSeleccionadas: ["cuota_12_2024"],
          totalMonto: 65.00,
          metodoPago: "yape",
          banco: "Yape",
          numeroOperacion: "YAP987654321",
          fechaPago: "2025-01-14",
          estado: 'pendiente',
          fechaSolicitud: "2025-01-14",
          detallesCuotas: [
            { periodo: "12/2024", monto: 50, mora: 15, descuento: 0 }
          ]
        }
      ];

      const historialSimulado: PagoSolicitud[] = [
        {
          id: "pago_003",
          empadronadoId: "emp_003",
          empadronadoNombre: "Carlos Rodríguez",
          numeroPadron: "C-025",
          cuotasSeleccionadas: ["cuota_01_2025"],
          totalMonto: 45.00,
          metodoPago: "transferencia",
          banco: "Interbank",
          numeroOperacion: "INT123456789",
          fechaPago: "2025-01-10",
          estado: 'confirmado',
          fechaSolicitud: "2025-01-10",
          fechaRespuesta: "2025-01-11",
          respondidoPor: user?.uid,
          detallesCuotas: [
            { periodo: "01/2025", monto: 50, mora: 0, descuento: 5 }
          ]
        }
      ];

      setSolicitudesPendientes(solicitudesSimuladas);
      setHistorialPagos(historialSimulado);

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las solicitudes",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const confirmarPago = async (solicitudId: string) => {
    try {
      setProcesando(solicitudId);

      // En implementación real: actualizar Firebase y marcar cuotas como pagadas
      const solicitud = solicitudesPendientes.find(s => s.id === solicitudId);
      if (!solicitud) return;

      const solicitudConfirmada: PagoSolicitud = {
        ...solicitud,
        estado: 'confirmado',
        fechaRespuesta: new Date().toLocaleDateString('es-PE'),
        respondidoPor: user?.uid
      };

      // Mover de pendientes a historial
      setSolicitudesPendientes(prev => prev.filter(s => s.id !== solicitudId));
      setHistorialPagos(prev => [solicitudConfirmada, ...prev]);

      toast({
        title: "Pago confirmado",
        description: `Pago de ${solicitud.empadronadoNombre} confirmado exitosamente`,
      });

      // Aquí también se actualizarían las cuotas en Firebase
      // marcándolas como 'pagado' y registrando la información del pago

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo confirmar el pago",
        variant: "destructive"
      });
    } finally {
      setProcesando(null);
    }
  };

  const rechazarPago = async () => {
    if (!solicitudSeleccionada || !motivoRechazo.trim()) {
      toast({
        title: "Error",
        description: "Debes proporcionar un motivo del rechazo",
        variant: "destructive"
      });
      return;
    }

    try {
      setProcesando(solicitudSeleccionada.id);

      const solicitudRechazada: PagoSolicitud = {
        ...solicitudSeleccionada,
        estado: 'rechazado',
        motivo: motivoRechazo,
        fechaRespuesta: new Date().toLocaleDateString('es-PE'),
        respondidoPor: user?.uid
      };

      // Mover de pendientes a historial
      setSolicitudesPendientes(prev => prev.filter(s => s.id !== solicitudSeleccionada.id));
      setHistorialPagos(prev => [solicitudRechazada, ...prev]);

      toast({
        title: "Pago rechazado",
        description: `Pago de ${solicitudSeleccionada.empadronadoNombre} rechazado`,
        variant: "destructive"
      });

      // Limpiar modal
      setSolicitudSeleccionada(null);
      setMotivoRechazo("");

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo rechazar el pago",
        variant: "destructive"
      });
    } finally {
      setProcesando(null);
    }
  };

  const detectarDuplicados = () => {
    const operaciones = new Set<string>();
    const duplicados: string[] = [];

    [...solicitudesPendientes, ...historialPagos.filter(h => h.estado === 'confirmado')]
      .forEach(pago => {
        const key = `${pago.banco}_${pago.fechaPago}_${pago.numeroOperacion}`;
        if (operaciones.has(key)) {
          duplicados.push(pago.numeroOperacion);
        } else {
          operaciones.add(key);
        }
      });

    return duplicados;
  };

  const duplicados = detectarDuplicados();

  if (loading) {
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
            <strong>⚠️ Posibles duplicados detectados:</strong>
            <br />
            Números de operación: {duplicados.join(", ")}
          </AlertDescription>
        </Alert>
      )}

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-yellow-500" />
              <div>
                <p className="text-sm text-muted-foreground">Pendientes</p>
                <p className="text-2xl font-bold">{solicitudesPendientes.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-sm text-muted-foreground">Monto Pendiente</p>
                <p className="text-2xl font-bold">
                  S/ {solicitudesPendientes.reduce((sum, s) => sum + s.totalMonto, 0).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-sm text-muted-foreground">Procesados Hoy</p>
                <p className="text-2xl font-bold">
                  {historialPagos.filter(h => 
                    h.fechaRespuesta === new Date().toLocaleDateString('es-PE')
                  ).length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pendientes" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pendientes" className="gap-2">
            <Clock className="h-4 w-4" />
            Pendientes ({solicitudesPendientes.length})
          </TabsTrigger>
          <TabsTrigger value="historial" className="gap-2">
            <Calendar className="h-4 w-4" />
            Historial
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pendientes">
          <Card>
            <CardHeader>
              <CardTitle>Solicitudes Pendientes de Revisión</CardTitle>
            </CardHeader>
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
                              <div className="flex items-center gap-2">
                                <DollarSign className="h-3 w-3" />
                                <span>Monto: S/ {solicitud.totalMonto.toFixed(2)}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <CreditCard className="h-3 w-3" />
                                <span>{solicitud.metodoPago} - {solicitud.banco}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span>Op: {solicitud.numeroOperacion}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                <span>Pago: {solicitud.fechaPago}</span>
                              </div>
                            </div>

                            <div className="text-xs text-muted-foreground">
                              Cuotas: {solicitud.detallesCuotas.map(c => c.periodo).join(", ")}
                            </div>
                          </div>

                          <div className="flex flex-col md:flex-row gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <Eye className="h-3 w-3" />
                                  Ver Detalle
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md">
                                <DialogHeader>
                                  <DialogTitle>Detalle del Pago</DialogTitle>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                  <div>
                                    <h4 className="font-semibold mb-2">Información del Asociado</h4>
                                    <p><strong>Nombre:</strong> {solicitud.empadronadoNombre}</p>
                                    <p><strong>Padrón:</strong> {solicitud.numeroPadron}</p>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold mb-2">Detalles del Pago</h4>
                                    <div className="space-y-2 text-sm">
                                      {solicitud.detallesCuotas.map((cuota, idx) => (
                                        <div key={idx} className="flex justify-between p-2 bg-muted rounded">
                                          <span>{cuota.periodo}</span>
                                          <div className="text-right">
                                            <div>Base: S/ {cuota.monto.toFixed(2)}</div>
                                            {cuota.mora > 0 && (
                                              <div className="text-red-600">Mora: +S/ {cuota.mora.toFixed(2)}</div>
                                            )}
                                            {cuota.descuento > 0 && (
                                              <div className="text-green-600">Desc: -S/ {cuota.descuento.toFixed(2)}</div>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                      <div className="flex justify-between font-semibold pt-2 border-t">
                                        <span>Total:</span>
                                        <span>S/ {solicitud.totalMonto.toFixed(2)}</span>
                                      </div>
                                    </div>
                                  </div>

                                  <div>
                                    <h4 className="font-semibold mb-2">Información de Pago</h4>
                                    <p><strong>Método:</strong> {solicitud.metodoPago}</p>
                                    <p><strong>Banco:</strong> {solicitud.banco}</p>
                                    <p><strong>N° Operación:</strong> {solicitud.numeroOperacion}</p>
                                    <p><strong>Fecha:</strong> {solicitud.fechaPago}</p>
                                  </div>

                                  {solicitud.comprobante && (
                                    <Button variant="outline" className="w-full gap-2">
                                      <Download className="h-4 w-4" />
                                      Ver Comprobante
                                    </Button>
                                  )}
                                </div>
                              </DialogContent>
                            </Dialog>

                            <Button
                              onClick={() => confirmarPago(solicitud.id)}
                              disabled={procesando === solicitud.id}
                              size="sm"
                              className="gap-2 bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="h-3 w-3" />
                              {procesando === solicitud.id ? "Confirmando..." : "Confirmar"}
                            </Button>

                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="gap-2"
                                  onClick={() => setSolicitudSeleccionada(solicitud)}
                                >
                                  <XCircle className="h-3 w-3" />
                                  Rechazar
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Rechazar Pago</DialogTitle>
                                </DialogHeader>
                                
                                <div className="space-y-4">
                                  <p>¿Estás seguro de rechazar el pago de <strong>{solicitud.empadronadoNombre}</strong>?</p>
                                  
                                  <div>
                                    <Label>Motivo del rechazo *</Label>
                                    <Textarea
                                      value={motivoRechazo}
                                      onChange={(e) => setMotivoRechazo(e.target.value)}
                                      placeholder="Explica por qué se rechaza este pago..."
                                      rows={3}
                                    />
                                  </div>

                                  <div className="flex gap-2">
                                    <Button
                                      variant="outline"
                                      onClick={() => {
                                        setSolicitudSeleccionada(null);
                                        setMotivoRechazo("");
                                      }}
                                      className="flex-1"
                                    >
                                      Cancelar
                                    </Button>
                                    <Button
                                      variant="destructive"
                                      onClick={rechazarPago}
                                      disabled={procesando === solicitud.id}
                                      className="flex-1"
                                    >
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
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="historial">
          <Card>
            <CardHeader>
              <CardTitle>Historial de Pagos Procesados</CardTitle>
            </CardHeader>
            <CardContent>
              {historialPagos.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay pagos procesados aún</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {historialPagos.map((pago) => (
                    <div
                      key={pago.id}
                      className={`p-4 border rounded-lg ${
                        pago.estado === 'confirmado' ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{pago.empadronadoNombre}</span>
                            <Badge variant="outline">{pago.numeroPadron}</Badge>
                            <Badge
                              variant={pago.estado === 'confirmado' ? 'default' : 'destructive'}
                            >
                              {pago.estado === 'confirmado' && <CheckCircle className="h-3 w-3 mr-1" />}
                              {pago.estado === 'rechazado' && <XCircle className="h-3 w-3 mr-1" />}
                              {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                            </Badge>
                          </div>
                          
                          <div className="text-sm text-muted-foreground">
                            <span>S/ {pago.totalMonto.toFixed(2)} • </span>
                            <span>{pago.banco} • </span>
                            <span>Op: {pago.numeroOperacion} • </span>
                            <span>Procesado: {pago.fechaRespuesta}</span>
                          </div>

                          {pago.motivo && (
                            <div className="text-sm bg-red-100 text-red-700 p-2 rounded mt-2">
                              <strong>Motivo:</strong> {pago.motivo}
                            </div>
                          )}
                        </div>

                        {pago.comprobante && (
                          <Button variant="outline" size="sm" className="gap-2">
                            <Download className="h-3 w-3" />
                            Comprobante
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}