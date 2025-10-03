import { useState, useEffect } from "react";
import {
  Home,
  Calculator,
  CheckCircle,
  CreditCard,
  Calendar,
  AlertCircle
} from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChargeV2, PagoV2 } from "@/types/cobranzas-v2";
import { obtenerChargesPorEmpadronadoV2, registrarPagoV2, obtenerEstadoCuentaEmpadronado } from "@/services/cobranzas-v2";
import { Empadronado } from "@/types/empadronados";
import { useDeudaAsociado } from "@/hooks/useDeudaAsociado";
import { useBillingConfig } from "@/contexts/BillingConfigContext";

interface EstadoCuenta {
  charges: ChargeV2[];
  pagos: PagoV2[];
  totalDeuda: number;
  totalPagado: number;
}

const PagosCuotas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const config = useBillingConfig();

  const [empadronado, setEmpadronado] = useState<Empadronado | null>(null);
  const [charges, setCharges] = useState<ChargeV2[]>([]);
  const [pagos, setPagos] = useState<PagoV2[]>([]);
  const [chargesSeleccionados, setChargesSeleccionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  
  // Formulario de pago
  const [metodoPago, setMetodoPago] = useState<string>("");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [observaciones, setObservaciones] = useState("");

  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Calcular deuda usando el motor
  const deudaCalculada = useDeudaAsociado(empadronado || {});

  useEffect(() => {
    if (user) {
      cargarDatos();
    }
  }, [user]);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      
      // Primero intentar obtener empadronado vinculado por authUid
      const { obtenerEmpadronadoPorAuthUid, getEmpadronados, linkAuthToEmpadronado } = await import('@/services/empadronados');
      let miEmpadronado = await obtenerEmpadronadoPorAuthUid(user?.uid || '');

      // Si no está vinculado, buscar por email y vincular automáticamente
      if (!miEmpadronado && user?.email) {
        console.log('🔍 Buscando empadronado por email:', user.email);
        const empadronados = await getEmpadronados();
        const empadronadoPorEmail = empadronados.find(emp => 
          emp.emailAcceso?.toLowerCase() === user.email?.toLowerCase()
        );

        if (empadronadoPorEmail) {
          console.log('🔗 Vinculando usuario a empadronado:', empadronadoPorEmail.id);
          // Vincular automáticamente
          await linkAuthToEmpadronado(empadronadoPorEmail.id, user.uid, user.email);
          miEmpadronado = empadronadoPorEmail;
          
          toast({
            title: "✅ Cuenta vinculada",
            description: "Tu cuenta ha sido vinculada automáticamente a tu registro de empadronado",
          });
        }
      }

      if (!miEmpadronado) {
        toast({
          title: "Usuario no vinculado",
          description: "Tu cuenta no está vinculada a un registro de empadronado. Contacta al administrador.",
          variant: "destructive"
        });
        return;
      }

      setEmpadronado(miEmpadronado);

      // Obtener estado de cuenta desde Cobranzas V2
      const estadoCuenta = await obtenerEstadoCuentaEmpadronado(miEmpadronado.id);
      
      // Filtrar solo charges pendientes o morosos
      const chargesPendientes = estadoCuenta.charges.filter(c => 
        c.estado === 'pendiente' || c.estado === 'moroso'
      );
      
      setCharges(chargesPendientes);
      setPagos(estadoCuenta.pagos);

    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar tus datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const calcularTotalSeleccionado = () => {
    return charges
      .filter(c => chargesSeleccionados.has(c.id))
      .reduce((total, c) => total + c.saldo, 0);
  };

  const handleSeleccionarCharge = (chargeId: string, seleccionado: boolean) => {
    const nuevosSeleccionados = new Set(chargesSeleccionados);
    if (seleccionado) {
      nuevosSeleccionados.add(chargeId);
    } else {
      nuevosSeleccionados.delete(chargeId);
    }
    setChargesSeleccionados(nuevosSeleccionados);
  };

  const formatPeriodo = (periodo: string) => {
    // YYYYMM -> "Mes Año"
    const year = periodo.substring(0, 4);
    const month = parseInt(periodo.substring(4, 6));
    return new Date(parseInt(year), month - 1).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric'
    });
  };

  const handleRegistrarPago = async () => {
    if (chargesSeleccionados.size === 0) {
      toast({
        title: "Error",
        description: "Debes seleccionar al menos un cargo",
        variant: "destructive"
      });
      return;
    }

    if (!metodoPago || !numeroOperacion) {
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

      // Registrar pago para cada charge seleccionado
      const chargesArray = Array.from(chargesSeleccionados);
      
      for (const chargeId of chargesArray) {
        const charge = charges.find(c => c.id === chargeId);
        if (charge) {
          await registrarPagoV2(
            chargeId,
            charge.saldo, // pagar el saldo completo
            metodoPago as any,
            numeroOperacion,
            observaciones
          );
        }
      }

      toast({
        title: "✅ Pago registrado exitosamente",
        description: `Se registraron ${chargesArray.length} pago(s)`,
      });

      // Limpiar formulario y recargar datos
      setChargesSeleccionados(new Set());
      setMetodoPago("");
      setNumeroOperacion("");
      setObservaciones("");
      setShowConfirmModal(false);
      
      // Recargar datos
      await cargarDatos();

    } catch (error) {
      console.error('Error registrando pago:', error);
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
    const deudaTotal = charges.reduce((total, c) => total + c.saldo, 0);
    const tieneMorosos = charges.some(c => c.esMoroso);
    
    if (deudaTotal === 0) {
      return {
        emoji: "😊",
        mensaje: "¡Esta urbanización crece cada día gracias a ti!",
        color: "text-green-600",
        bgColor: "bg-green-50"
      };
    } else if (tieneMorosos) {
      return {
        emoji: "😔",
        mensaje: "Vamos, la urbanización también depende de ti",
        color: "text-red-600", 
        bgColor: "bg-red-50"
      };
    } else {
      return {
        emoji: "⏰",
        mensaje: "Recuerda pagar antes del vencimiento",
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
          <p className="text-muted-foreground">Cargando tus cuotas...</p>
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
              <h1 className="text-2xl font-bold text-foreground">Mis Cuotas</h1>
              <p className="text-muted-foreground">Gestiona tus pagos de manera fácil</p>
            </div>
          </div>
        </div>

        {/* Estado General - Móvil Friendly */}
        <Card className={`${estadoGeneral.bgColor} border-2`}>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-6xl mb-4">{estadoGeneral.emoji}</div>
              <h2 className={`text-xl font-bold ${estadoGeneral.color} mb-2`}>
                {empadronado?.nombre} {empadronado?.apellidos}
              </h2>
              <p className={`${estadoGeneral.color} text-lg`}>
                {estadoGeneral.mensaje}
              </p>
              <div className="mt-4 space-y-2">
                <div className="flex justify-center gap-4 text-sm text-muted-foreground">
                  <span>Padrón: {empadronado?.numeroPadron}</span>
                  <span>•</span>
                  <span>{charges.length} cargos pendientes</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  <div>Deuda calculada: <span className="font-semibold">S/ {deudaCalculada.monto.toFixed(2)}</span></div>
                  <div className="text-xs">({deudaCalculada.quincenas} quincenas desde {new Date(deudaCalculada.desde).toLocaleDateString('es-PE')})</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cargos Pendientes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Cargos Mensuales Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {charges.length === 0 ? (
              <div className="text-center py-8">
                <CheckCircle className="h-16 w-16 mx-auto text-green-500 mb-4" />
                <h3 className="text-lg font-semibold text-green-600 mb-2">
                  ¡Felicitaciones!
                </h3>
                <p className="text-muted-foreground">
                  Estás al día con todos tus pagos
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {charges.map((charge) => {
                  const seleccionado = chargesSeleccionados.has(charge.id);
                  const fechaVenc = new Date(charge.fechaVencimiento);
                  const hoy = new Date();
                  const diasVencidos = charge.esMoroso 
                    ? Math.floor((hoy.getTime() - fechaVenc.getTime()) / (1000 * 60 * 60 * 24))
                    : 0;

                  return (
                    <div
                      key={charge.id}
                      className={`p-4 border rounded-lg transition-all ${
                        seleccionado ? 'border-primary bg-primary/5' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={seleccionado}
                          onCheckedChange={(checked) => 
                            handleSeleccionarCharge(charge.id, !!checked)
                          }
                          className="mt-1"
                        />
                        
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">
                              {formatPeriodo(charge.periodo)}
                            </h4>
                            <Badge variant={charge.esMoroso ? 'destructive' : charge.estado === 'pagado' ? 'default' : 'secondary'}>
                              {charge.esMoroso ? `Moroso (${diasVencidos}d)` : charge.estado}
                            </Badge>
                          </div>
                          
                          <div className="text-sm space-y-1">
                            <div className="flex justify-between">
                              <span>Monto original:</span>
                              <span>S/ {charge.montoOriginal.toFixed(2)}</span>
                            </div>
                            
                            {charge.montoPagado > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Pagado:</span>
                                <span>- S/ {charge.montoPagado.toFixed(2)}</span>
                              </div>
                            )}

                            {charge.montoMorosidad && charge.montoMorosidad > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span>Morosidad ({config.recargoMoraPct}%):</span>
                                <span>+ S/ {charge.montoMorosidad.toFixed(2)}</span>
                              </div>
                            )}
                            
                            <div className="flex justify-between font-semibold border-t pt-1">
                              <span>Saldo:</span>
                              <span>S/ {charge.saldo.toFixed(2)}</span>
                            </div>
                            
                            <div className="text-xs text-muted-foreground">
                              Vence: {fechaVenc.toLocaleDateString('es-PE')}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Barra de Total Seleccionado */}
        {chargesSeleccionados.size > 0 && (
          <Card className="sticky bottom-24 md:bottom-6 border-primary shadow-lg">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {chargesSeleccionados.size} cargo(s) seleccionado(s)
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
                            <SelectItem value="efectivo">Efectivo</SelectItem>
                            <SelectItem value="transferencia">Transferencia</SelectItem>
                            <SelectItem value="yape">Yape</SelectItem>
                            <SelectItem value="plin">Plin</SelectItem>
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
                        <Label>Observaciones (opcional)</Label>
                        <Input
                          value={observaciones}
                          onChange={(e) => setObservaciones(e.target.value)}
                          placeholder="Notas adicionales"
                        />
                      </div>

                      <div className="bg-muted p-4 rounded-lg">
                        <h4 className="font-semibold mb-2">Resumen del Pago</h4>
                        <div className="text-sm space-y-1">
                          <div className="flex justify-between">
                            <span>Cargos seleccionados:</span>
                            <span>{chargesSeleccionados.size}</span>
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
              <Calendar className="h-5 w-5" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {pagos.length === 0 ? (
              <div className="text-center py-8">
                <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No tienes pagos registrados aún</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pagos.map((pago) => (
                  <div key={pago.id} className="p-4 border rounded-lg">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="font-semibold">
                          Pago - {formatPeriodo(pago.periodo)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(pago.fechaPago).toLocaleDateString('es-PE')} • {pago.metodoPago}
                        </p>
                      </div>
                      <Badge variant="default">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Confirmado
                      </Badge>
                    </div>
                    
                    <div className="text-sm space-y-1">
                      <div className="flex justify-between">
                        <span>Monto:</span>
                        <span className="font-semibold">S/ {pago.monto.toFixed(2)}</span>
                      </div>
                      {pago.numeroOperacion && (
                        <div className="flex justify-between">
                          <span>N° Operación:</span>
                          <span>{pago.numeroOperacion}</span>
                        </div>
                      )}
                      {pago.descuentoProntoPago && pago.descuentoProntoPago > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Descuento aplicado:</span>
                          <span>- S/ {pago.descuentoProntoPago.toFixed(2)}</span>
                        </div>
                      )}
                      {pago.observaciones && (
                        <div className="mt-2 p-2 bg-muted rounded text-xs">
                          <strong>Nota:</strong> {pago.observaciones}
                        </div>
                      )}
                    </div>
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
