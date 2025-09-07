import { useState, useEffect } from "react";
import {
  Home,
  Download,
  Upload,
  Calculator,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Heart,
  Frown,
  Smile,
  CreditCard,
  Calendar
} from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { obtenerPagosPorEmpadronado } from "@/services/cobranzas";
import { Pago } from "@/types/cobranzas";
import { getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";

interface PagoSolicitud {
  id: string;
  empadronadoId: string;
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
}

const bancosPeru = [
  "BCP - Banco de Crédito del Perú",
  "BBVA - Banco BBVA",
  "Scotiabank",
  "Interbank", 
  "BanBif",
  "Banco Pichincha",
  "Banco Falabella",
  "Banco Ripley",
  "Banco Azteca",
  "Banco Cencosud",
  "Mi Banco",
  "Banco de la Nación",
  "Caja Arequipa",
  "Caja Cusco",
  "Caja Huancayo",
  "Caja Piura",
  "Caja Sullana",
  "Caja Trujillo",
  "Yape",
  "Plin",
  "Lukita",
  "Tunki"
];

const PagosCuotas = () => {
  const { user } = useAuth();
  const { toast } = useToast();

  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [cuotas, setCuotas] = useState<Pago[]>([]);
  const [cuotasSeleccionadas, setCuotasSeleccionadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  const [historialPagos, setHistorialPagos] = useState<PagoSolicitud[]>([]);
  const [pagosEmpadronados, setPagosEmpadronados] = useState<Record<string, Pago[]>>({});
  
  // Formulario de pago
  const [metodoPago, setMetodoPago] = useState<string>("");
  const [banco, setBanco] = useState<string>("");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [fechaPago, setFechaPago] = useState("");
  const [comprobante, setComprobante] = useState<File | null>(null);

  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  useEffect(() => {
    if (user) {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Obtener TODOS los empadronados (excepto rol seguridad)
      const todosEmpadronados = await getEmpadronados();
      
      // Filtrar empadronados excluyendo rol seguridad
      const empadronadosFiltrados = todosEmpadronados.filter(emp => 
        emp.habilitado !== false && 
        // Excluir usuarios con rol de seguridad/pórtico
        !emp.observaciones?.toLowerCase().includes('seguridad') &&
        !emp.observaciones?.toLowerCase().includes('pórtico')
      );

      setEmpadronados(empadronadosFiltrados);

      // Cargar deudas de TODOS los empadronados
      const todasLasCuotas: Pago[] = [];
      const mapaPagosEmpadronados: Record<string, Pago[]> = {};

      for (const emp of empadronadosFiltrados) {
        try {
          const pagosEmp = await obtenerPagosPorEmpadronado(emp.id);
          const cuotasPendientes = pagosEmp.filter(c => 
            c.estado === 'pendiente' || c.estado === 'moroso'
          );
          
          mapaPagosEmpadronados[emp.id] = cuotasPendientes;
          
          // Agregar información del empadronado a cada cuota
          const cuotasConInfo = cuotasPendientes.map(cuota => ({
            ...cuota,
            empadronadoNombre: `${emp.nombre} ${emp.apellidos}`,
            numeroPadron: emp.numeroPadron
          }));
          
          todasLasCuotas.push(...cuotasConInfo);
        } catch (error) {
          console.warn(`Error cargando pagos para ${emp.nombre}:`, error);
        }
      }

      setCuotas(todasLasCuotas);
      setPagosEmpadronados(mapaPagosEmpadronados);

      // Cargar historial de pagos (simulado por ahora)
      setHistorialPagos([]);

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de deudas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalSeleccionado = () => {
    return cuotas
      .filter(c => cuotasSeleccionadas.has(c.id))
      .reduce((total, c) => total + c.monto, 0);
  };

  const calcularMora = (cuota: Pago) => {
    if (!cuota.fechaVencimiento) return 0;
    
    const [dd, mm, aa] = cuota.fechaVencimiento.split('/');
    const vencimiento = new Date(Number(aa), Number(mm) - 1, Number(dd));
    const hoy = new Date();
    
    if (hoy <= vencimiento) return 0;
    
    const diasVencidos = Math.floor((hoy.getTime() - vencimiento.getTime()) / (1000 * 60 * 60 * 24));
    const porcentajeMora = 0.1; // 10% de mora por mes
    const mesesVencidos = Math.ceil(diasVencidos / 30);
    
    return cuota.montoOriginal * (porcentajeMora * mesesVencidos);
  };

  const calcularDescuentoProntoPago = (cuota: Pago) => {
    // Descuento del 10% si paga antes del día 5
    const hoy = new Date();
    if (hoy.getDate() <= 5) {
      return cuota.montoOriginal * 0.1;
    }
    return 0;
  };

  const handleSeleccionarCuota = (cuotaId: string, seleccionada: boolean) => {
    const nuevasSeleccionadas = new Set(cuotasSeleccionadas);
    if (seleccionada) {
      nuevasSeleccionadas.add(cuotaId);
    } else {
      nuevasSeleccionadas.delete(cuotaId);
    }
    setCuotasSeleccionadas(nuevasSeleccionadas);
  };

  const handleRegistrarPago = async () => {
    if (cuotasSeleccionadas.size === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos una cuota",
        variant: "destructive"
      });
      return;
    }

    if (!metodoPago || !banco || !numeroOperacion || !fechaPago) {
      toast({
        title: "Error", 
        description: "Completa todos los campos requeridos",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmarPago = async () => {
    try {
      setProcesandoPago(true);

      // Simular subida de comprobante y registro del pago
      const solicitudPago: PagoSolicitud = {
        id: `pago_${Date.now()}`,
        empadronadoId: "multiple", // Múltiples empadronados
        cuotasSeleccionadas: Array.from(cuotasSeleccionadas),
        totalMonto: calcularTotalSeleccionado(),
        metodoPago,
        banco,
        numeroOperacion,
        fechaPago,
        comprobante: comprobante ? "archivo_comprobante.pdf" : undefined,
        estado: 'pendiente',
        fechaSolicitud: new Date().toLocaleDateString('es-PE')
      };

      // En implementación real: guardar en Firebase y notificar a economía
      setHistorialPagos(prev => [solicitudPago, ...prev]);

      toast({
        title: "✅ Pago registrado",
        description: "Tu pago está por confirmar. Economía revisará tu comprobante.",
      });

      // Limpiar formulario
      setCuotasSeleccionadas(new Set());
      setMetodoPago("");
      setBanco("");
      setNumeroOperacion("");
      setFechaPago("");
      setComprobante(null);
      setShowConfirmModal(false);

    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
    } finally {
      setProcesandoPago(false);
    }
  };

  const obtenerEstadoGeneral = () => {
    const deudaTotal = cuotas.reduce((total, c) => total + c.monto, 0);
    const totalEmpadronados = empadronados.length;
    const empadronadosConDeuda = new Set(cuotas.map(c => c.empadronadoId)).size;
    const tieneMorosos = cuotas.some(c => c.estado === 'moroso');
    
    if (deudaTotal === 0) {
      return {
        emoji: "😊",
        mensaje: `Todos los ${totalEmpadronados} asociados están al día`,
        color: "text-green-600",
        bgColor: "bg-green-50"
      };
    } else if (tieneMorosos) {
      return {
        emoji: "😔",
        mensaje: `${empadronadosConDeuda} asociados tienen deudas pendientes`,
        color: "text-red-600", 
        bgColor: "bg-red-50"
      };
    } else {
      return {
        emoji: "⏰",
        mensaje: `${empadronadosConDeuda} asociados con pagos pendientes`,
        color: "text-yellow-600",
        bgColor: "bg-yellow-50"
      };
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0 flex items-center justify-center">
        <div className="text-center">
          <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-pulse" />
          <p className="text-muted-foreground">Cargando deudas de todos los asociados...</p>
        </div>
      </div>
    );
  }

  const estadoGeneral = obtenerEstadoGeneral();
  const totalSeleccionado = calcularTotalSeleccionado();

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
              <h1 className="text-2xl font-bold text-foreground">Panel de Deudas</h1>
              <p className="text-muted-foreground">Gestión de deudas de todos los asociados</p>
            </div>
          </div>
        </div>

        {/* Estado General - Móvil Friendly */}
        <Card className={`${estadoGeneral.bgColor} border-2`}>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">{estadoGeneral.emoji}</div>
              <h2 className={`text-xl font-bold ${estadoGeneral.color} mb-2`}>
                Resumen General de Deudas
              </h2>
              <p className={`${estadoGeneral.color} text-lg`}>
                {estadoGeneral.mensaje}
              </p>
              <div className="mt-4 flex justify-center gap-4 text-sm text-muted-foreground">
                <span>Total: S/ {cuotas.reduce((sum, c) => sum + c.monto, 0).toFixed(2)}</span>
                <span>•</span>
                <span>{cuotas.length} cuotas pendientes</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cuotas Pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Todas las Deudas Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {cuotas.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  ¡Excelente!
                </h3>
                <p className="text-muted-foreground">
                  Todos los asociados están al día con sus pagos
                </p>
              </div>
              ) : (
                <div className="space-y-3">
                  {/* Agrupar cuotas por empadronado */}
                  {Object.entries(
                    cuotas.reduce((grupos, cuota) => {
                      const empId = cuota.empadronadoId;
                      if (!grupos[empId]) {
                        grupos[empId] = [];
                      }
                      grupos[empId].push(cuota);
                      return grupos;
                    }, {} as Record<string, Pago[]>)
                  ).map(([empadronadoId, cuotasEmpadronado]) => {
                    const empadronado = empadronados.find(e => e.id === empadronadoId);
                    const deudaTotalEmp = cuotasEmpadronado.reduce((total, c) => total + c.monto, 0);
                    
                    return (
                      <div key={empadronadoId} className="border rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-lg">
                              {empadronado?.nombre} {empadronado?.apellidos}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Padrón: {empadronado?.numeroPadron} • Total: S/ {deudaTotalEmp.toFixed(2)}
                            </p>
                          </div>
                          <Badge variant="destructive" className="text-sm">
                            {cuotasEmpadronado.length} cuota(s)
                          </Badge>
                        </div>
                        
                        <div className="space-y-2">
                          {cuotasEmpadronado.map((cuota) => {
                            const mora = calcularMora(cuota);
                            const descuento = calcularDescuentoProntoPago(cuota);
                            const montoFinal = cuota.monto + mora - descuento;
                            const seleccionada = cuotasSeleccionadas.has(cuota.id);

                            return (
                              <div
                                key={cuota.id}
                                className={`p-3 border rounded transition-all ml-4 ${
                                  seleccionada ? 'border-primary bg-primary/5' : 'border-border'
                                }`}
                              >
                                <div className="flex items-start gap-3">
                                  <Checkbox
                                    checked={seleccionada}
                                    onCheckedChange={(checked) => 
                                      handleSeleccionarCuota(cuota.id, !!checked)
                                    }
                                    className="mt-1"
                                  />
                                  
                                  <div className="flex-1">
                                    <div className="flex items-center justify-between mb-2">
                                      <h5 className="font-medium">
                                        {new Date(cuota.año, cuota.mes - 1).toLocaleDateString('es-PE', {
                                          month: 'long',
                                          year: 'numeric'
                                        })}
                                      </h5>
                                      <Badge variant={cuota.estado === 'moroso' ? 'destructive' : 'secondary'}>
                                        {cuota.estado === 'moroso' ? 'Moroso' : 'Pendiente'}
                                      </Badge>
                                    </div>
                                    
                                    <div className="text-sm space-y-1">
                                      <div className="flex justify-between">
                                        <span>Monto base:</span>
                                        <span>S/ {cuota.montoOriginal.toFixed(2)}</span>
                                      </div>
                                      
                                      {mora > 0 && (
                                        <div className="flex justify-between text-red-600">
                                          <span>Mora:</span>
                                          <span>+ S/ {mora.toFixed(2)}</span>
                                        </div>
                                      )}
                                      
                                      {descuento > 0 && (
                                        <div className="flex justify-between text-green-600">
                                          <span>Descuento pronto pago:</span>
                                          <span>- S/ {descuento.toFixed(2)}</span>
                                        </div>
                                      )}
                                      
                                      <div className="flex justify-between font-semibold border-t pt-1">
                                        <span>Total:</span>
                                        <span>S/ {montoFinal.toFixed(2)}</span>
                                      </div>
                                      
                                      <div className="text-xs text-muted-foreground">
                                        Vence: {cuota.fechaVencimiento}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barra de Total Seleccionado */}
        {cuotasSeleccionadas.size > 0 && (
          <Card className="sticky bottom-24 md:bottom-6 border-primary shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {cuotasSeleccionadas.size} cuota(s) seleccionada(s)
                  </p>
                  <p className="text-xl font-bold text-primary">
                    Total: S/ {totalSeleccionado.toFixed(2)}
                  </p>
                </div>
                <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                  <DialogTrigger asChild>
                    <Button size="lg" className="gap-2">
                      <CreditCard className="h-4 w-4" />
                      Pagar Ahora
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md mx-auto">
                    <DialogHeader>
                      <DialogTitle>Registrar Pago</DialogTitle>
                    </DialogHeader>
                    
                    <div className="space-y-4">
                      <div>
                        <Label>Método de Pago *</Label>
                        <Select value={metodoPago} onValueChange={setMetodoPago}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar método" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="transferencia">Transferencia Bancaria</SelectItem>
                            <SelectItem value="deposito">Depósito Bancario</SelectItem>
                            <SelectItem value="yape">Yape</SelectItem>
                            <SelectItem value="plin">Plin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Banco *</Label>
                        <Select value={banco} onValueChange={setBanco}>
                          <SelectTrigger>
                            <SelectValue placeholder="Seleccionar banco" />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {bancosPeru.map((b) => (
                              <SelectItem key={b} value={b}>{b}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label>Número de Operación *</Label>
                        <Input
                          value={numeroOperacion}
                          onChange={(e) => setNumeroOperacion(e.target.value)}
                          placeholder="Ingresa el número de operación"
                        />
                      </div>

                      <div>
                        <Label>Fecha de Pago *</Label>
                        <Input
                          type="date"
                          value={fechaPago}
                          onChange={(e) => setFechaPago(e.target.value)}
                          max={new Date().toISOString().split('T')[0]}
                        />
                      </div>

                      <div>
                        <Label>Comprobante de Pago</Label>
                        <Input
                          type="file"
                          accept="image/*,.pdf"
                          onChange={(e) => setComprobante(e.target.files?.[0] || null)}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Máximo 5MB - Formatos: JPG, PNG, PDF
                        </p>
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Resumen del Pago</h4>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Cuotas seleccionadas:</span>
                            <span>{cuotasSeleccionadas.size}</span>
                          </div>
                          <div className="flex justify-between font-semibold">
                            <span>Total a pagar:</span>
                            <span>S/ {totalSeleccionado.toFixed(2)}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => setShowConfirmModal(false)}
                          className="flex-1"
                        >
                          Cancelar
                        </Button>
                        <Button
                          onClick={confirmarPago}
                          disabled={procesandoPago}
                          className="flex-1"
                        >
                          {procesandoPago ? "Procesando..." : "Confirmar Pago"}
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de Pagos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {historialPagos.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tienes pagos registrados aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {historialPagos.map((pago) => (
                  <div key={pago.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">
                          Pago de {pago.cuotasSeleccionadas.length} cuota(s)
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {pago.fechaSolicitud} • {pago.banco}
                        </p>
                      </div>
                      <Badge
                        variant={
                          pago.estado === 'confirmado' ? 'default' :
                          pago.estado === 'rechazado' ? 'destructive' : 'secondary'
                        }
                      >
                        {pago.estado === 'confirmado' && <CheckCircle className="h-3 w-3 mr-1" />}
                        {pago.estado === 'rechazado' && <XCircle className="h-3 w-3 mr-1" />}
                        {pago.estado === 'pendiente' && <Clock className="h-3 w-3 mr-1" />}
                        {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Monto:</span>
                        <span className="font-semibold">S/ {pago.totalMonto.toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>N° Operación:</span>
                        <span>{pago.numeroOperacion}</span>
                      </div>
                      {pago.motivo && (
                        <div className="mt-2 p-2 bg-red-50 rounded text-red-700 text-xs">
                          <strong>Motivo del rechazo:</strong> {pago.motivo}
                        </div>
                      )}
                    </div>
                    
                    {pago.comprobante && (
                      <Button variant="outline" size="sm" className="mt-2 gap-2">
                        <Download className="h-3 w-3" />
                        Descargar Comprobante
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default PagosCuotas;