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
  const [fechaPago, setFechaPago] = useState<string>(new Date().toISOString().split('T')[0]);
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);

  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pagoEnviado, setPagoEnviado] = useState(false);

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

    if (!metodoPago || !numeroOperacion || !fechaPago || !archivoComprobante) {
      toast({
        title: "Error", 
        description: "Completa todos los campos requeridos (incluyendo archivo)",
        variant: "destructive"
      });
      return;
    }

    setShowConfirmModal(true);
  };

  const confirmarPago = async () => {
    try {
      setProcesandoPago(true);

      if (!archivoComprobante || !empadronado) {
        throw new Error("Falta archivo o empadronado");
      }

      // Subir archivo primero
      const { subirComprobanteCobranza } = await import('@/services/storage');
      const chargesArray = Array.from(chargesSeleccionados);
      const primerCharge = charges.find(c => c.id === chargesArray[0]);
      
      if (!primerCharge) throw new Error("Cargo no encontrado");

      console.log('📤 Subiendo comprobante...');
      const archivoUrl = await subirComprobanteCobranza(
        empadronado.id,
        primerCharge.periodo,
        archivoComprobante
      );
      console.log('✅ Comprobante subido:', archivoUrl);

      // Registrar pago para cada charge seleccionado
      const fechaPagoTimestamp = new Date(fechaPago).getTime();
      
      for (const chargeId of chargesArray) {
        const charge = charges.find(c => c.id === chargeId);
        if (charge) {
          await registrarPagoV2(
            chargeId,
            charge.saldo,
            metodoPago as any,
            fechaPagoTimestamp,
            archivoUrl,
            numeroOperacion,
            observaciones
          );
        }
      }

      // Marcar como enviado
      setPagoEnviado(true);

      toast({
        title: "✅ Pago enviado",
        description: "Tu pago está siendo revisado. Recibirás una confirmación pronto.",
      });

      // Limpiar formulario
      setChargesSeleccionados(new Set());
      setMetodoPago("");
      setNumeroOperacion("");
      setObservaciones("");
      setFechaPago(new Date().toISOString().split('T')[0]);
      setArchivoComprobante(null);
      
      // Esperar 2 segundos para mostrar el mensaje y luego cerrar
      setTimeout(() => {
        setShowConfirmModal(false);
        setPagoEnviado(false);
        setProcesandoPago(false);
        cargarDatos();
      }, 2000);

    } catch (error) {
      console.error('❌ Error registrando pago:', error);
      
      // Mensajes de error más específicos
      let errorMessage = "No se pudo registrar el pago";
      if (error instanceof Error) {
        if (error.message.includes('CORS')) {
          errorMessage = "Error de permisos al subir el archivo. Verifica la configuración de Firebase Storage.";
        } else if (error.message.includes('storage')) {
          errorMessage = "Error al subir el comprobante. Intenta con un archivo más pequeño.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      });
      
      setProcesandoPago(false);
      setPagoEnviado(false);
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

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Header - Compacto y futurista */}
        <div className="flex items-center gap-2 md:gap-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => (window.location.href = "/")}
            className="h-8 md:h-9 gap-1 md:gap-2 text-xs md:text-sm hover:scale-105 transition-transform"
          >
            <Home className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Inicio</span>
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mis Cuotas
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground hidden sm:block">Gestiona tus pagos de manera fácil</p>
          </div>
        </div>

        {/* Estado General - Compacto para móvil */}
        <Card className={`${estadoGeneral.bgColor} border-2 animate-fade-in`}>
          <CardContent className="p-4 md:p-6">
            <div className="text-center">
              <div className="text-4xl md:text-6xl mb-2 md:mb-4">{estadoGeneral.emoji}</div>
              <h2 className={`text-base md:text-xl font-bold ${estadoGeneral.color} mb-1 md:mb-2`}>
                {empadronado?.nombre} {empadronado?.apellidos}
              </h2>
              <p className={`${estadoGeneral.color} text-sm md:text-lg`}>
                {estadoGeneral.mensaje}
              </p>
              <div className="mt-3 md:mt-4 space-y-1 md:space-y-2">
                <div className="flex flex-col sm:flex-row justify-center gap-1 sm:gap-4 text-xs md:text-sm text-muted-foreground">
                  <span>Padrón: {empadronado?.numeroPadron}</span>
                  <span className="hidden sm:inline">•</span>
                  <span>{charges.length} cargo{charges.length !== 1 ? 's' : ''} pendiente{charges.length !== 1 ? 's' : ''}</span>
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  <div>Deuda calculada: <span className="font-semibold">S/ {deudaCalculada.monto.toFixed(2)}</span></div>
                  <div className="text-[10px] md:text-xs">({deudaCalculada.meses} meses desde {new Date(deudaCalculada.desde).toLocaleDateString('es-PE')})</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Cargos Pendientes - Optimizado para móvil */}
        <Card className="animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calculator className="h-4 w-4 md:h-5 md:w-5" />
              Cargos Mensuales Pendientes
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {charges.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <CheckCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto text-green-500 mb-3 md:mb-4" />
                <h3 className="text-base md:text-lg font-semibold text-green-600 mb-1 md:mb-2">
                  ¡Felicitaciones!
                </h3>
                <p className="text-sm md:text-base text-muted-foreground">
                  Estás al día con todos tus pagos
                </p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
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
                      className={`p-3 md:p-4 border rounded-lg transition-all hover:shadow-md ${
                        seleccionado ? 'border-primary bg-primary/5 shadow-sm' : 'border-border'
                      }`}
                    >
                      <div className="flex items-start gap-2 md:gap-3">
                        <Checkbox
                          checked={seleccionado}
                          onCheckedChange={(checked) => 
                            handleSeleccionarCharge(charge.id, !!checked)
                          }
                          className="mt-0.5 md:mt-1"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1 md:mb-2 gap-2">
                            <h4 className="font-semibold text-sm md:text-base truncate">
                              {formatPeriodo(charge.periodo)}
                            </h4>
                            <Badge 
                              variant={charge.esMoroso ? 'destructive' : charge.estado === 'pagado' ? 'default' : 'secondary'}
                              className="text-[10px] md:text-xs shrink-0"
                            >
                              {charge.esMoroso ? `Moroso (${diasVencidos}d)` : charge.estado}
                            </Badge>
                          </div>
                          
                          <div className="text-xs md:text-sm space-y-0.5 md:space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Monto original:</span>
                              <span className="font-medium">S/ {charge.montoOriginal.toFixed(2)}</span>
                            </div>
                            
                            {charge.montoPagado > 0 && (
                              <div className="flex justify-between text-green-600">
                                <span>Pagado:</span>
                                <span className="font-medium">- S/ {charge.montoPagado.toFixed(2)}</span>
                              </div>
                            )}

                            {charge.montoMorosidad && charge.montoMorosidad > 0 && (
                              <div className="flex justify-between text-red-600">
                                <span className="text-[10px] md:text-xs">Morosidad ({config.recargoMoraPct}%):</span>
                                <span className="font-medium">+ S/ {charge.montoMorosidad.toFixed(2)}</span>
                              </div>
                            )}
                            
                            <div className="flex justify-between font-semibold border-t pt-1 text-sm md:text-base">
                              <span>Saldo:</span>
                              <span className="text-primary">S/ {charge.saldo.toFixed(2)}</span>
                            </div>
                            
                            <div className="text-[10px] md:text-xs text-muted-foreground">
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

        {/* Barra de Total Seleccionado - Compacta y responsive */}
        {chargesSeleccionados.size > 0 && (
          <Card className="sticky bottom-24 md:bottom-6 border-primary shadow-lg animate-fade-in">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {chargesSeleccionados.size} cargo{chargesSeleccionados.size !== 1 ? 's' : ''}
                  </p>
                  <p className="text-lg md:text-xl font-bold text-primary truncate">
                    S/ {totalSeleccionado.toFixed(2)}
                  </p>
                </div>
                <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 md:gap-2 h-9 md:h-10 text-xs md:text-sm hover:scale-105 transition-transform shrink-0">
                      <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Pagar Ahora</span>
                      <span className="sm:hidden">Pagar</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto" aria-describedby="dialog-description">
                    <DialogHeader>
                      <DialogTitle className="text-base md:text-lg">
                        {pagoEnviado ? "⏳ Esperando Confirmación" : "Registrar Pago"}
                      </DialogTitle>
                      <p id="dialog-description" className="sr-only">
                        {pagoEnviado 
                          ? "Tu pago está siendo procesado y revisado" 
                          : "Formulario para registrar un nuevo pago de cuotas"}
                      </p>
                    </DialogHeader>
                    
                    {pagoEnviado ? (
                      <div className="py-6 md:py-8 text-center">
                        <div className="text-4xl md:text-6xl mb-3 md:mb-4">⏳</div>
                        <h3 className="text-base md:text-lg font-semibold mb-2">
                          Tu pago está siendo revisado
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground">
                          Recibirás una confirmación en tu historial de pagos
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-3 md:space-y-4">
                        <div>
                          <Label className="text-xs md:text-sm">Fecha de Pago *</Label>
                          <Input
                            type="date"
                            value={fechaPago}
                            onChange={(e) => setFechaPago(e.target.value)}
                            max={new Date().toISOString().split('T')[0]}
                            className="h-9 md:h-10 text-xs md:text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-xs md:text-sm">Método de Pago *</Label>
                          <Select value={metodoPago} onValueChange={setMetodoPago}>
                            <SelectTrigger className="h-9 md:h-10 text-xs md:text-sm">
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
                          <Label className="text-xs md:text-sm">Número de Operación *</Label>
                          <Input
                            value={numeroOperacion}
                            onChange={(e) => setNumeroOperacion(e.target.value)}
                            placeholder="Ingresa el número de operación"
                            className="h-9 md:h-10 text-xs md:text-sm"
                          />
                        </div>

                        <div>
                          <Label className="text-xs md:text-sm">Comprobante de Pago * (PDF o JPG)</Label>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setArchivoComprobante(e.target.files?.[0] || null)}
                            className="cursor-pointer h-9 md:h-10 text-xs md:text-sm"
                          />
                          {archivoComprobante && (
                            <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                              ✓ {archivoComprobante.name} ({(archivoComprobante.size / 1024).toFixed(0)} KB)
                            </p>
                          )}
                        </div>

                        <div>
                          <Label className="text-xs md:text-sm">Observaciones (opcional)</Label>
                          <Input
                            value={observaciones}
                            onChange={(e) => setObservaciones(e.target.value)}
                            placeholder="Notas adicionales"
                            className="h-9 md:h-10 text-xs md:text-sm"
                          />
                        </div>

                        <div className="bg-gradient-to-br from-primary/5 to-primary/10 p-3 md:p-4 rounded-lg border border-primary/20">
                          <h4 className="font-semibold mb-2 text-sm md:text-base">Resumen del Pago</h4>
                          <div className="text-xs md:text-sm space-y-1">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Cargos seleccionados:</span>
                              <span className="font-medium">{chargesSeleccionados.size}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-sm md:text-base border-t border-primary/20 pt-1">
                              <span>Total a pagar:</span>
                              <span className="text-primary">S/ {totalSeleccionado.toFixed(2)}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            onClick={() => {
                              setShowConfirmModal(false);
                              setArchivoComprobante(null);
                            }}
                            className="flex-1 h-9 md:h-10 text-xs md:text-sm hover:scale-105 transition-transform"
                            disabled={procesandoPago}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={confirmarPago}
                            disabled={procesandoPago}
                            className="flex-1 h-9 md:h-10 text-xs md:text-sm hover:scale-105 transition-transform"
                          >
                            {procesandoPago ? "Procesando..." : "Confirmar Pago"}
                          </Button>
                        </div>
                      </div>
                    )}
                  </DialogContent>
                </Dialog>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Historial de Pagos - Compacto para móvil */}
        <Card className="animate-fade-in">
          <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-3 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base md:text-lg">
              <Calendar className="h-4 w-4 md:h-5 md:w-5" />
              Historial de Pagos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-6">
            {pagos.length === 0 ? (
              <div className="text-center py-6 md:py-8">
                <Calendar className="h-10 w-10 md:h-12 md:w-12 mx-auto text-muted-foreground mb-3 md:mb-4" />
                <p className="text-sm md:text-base text-muted-foreground">No tienes pagos registrados aún</p>
              </div>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {pagos.map((pago) => {
                  const getBadgeEstado = () => {
                    switch (pago.estado) {
                      case 'aprobado':
                        return <Badge variant="default" className="bg-green-600 text-[10px] md:text-xs"><CheckCircle className="h-2 w-2 md:h-3 md:w-3 mr-1" />Aprobado</Badge>;
                      case 'rechazado':
                        return <Badge variant="destructive" className="text-[10px] md:text-xs"><AlertCircle className="h-2 w-2 md:h-3 md:w-3 mr-1" />Rechazado</Badge>;
                      default:
                        return <Badge variant="secondary" className="text-[10px] md:text-xs"><AlertCircle className="h-2 w-2 md:h-3 md:w-3 mr-1" />Pendiente</Badge>;
                    }
                  };

                  return (
                    <div key={pago.id} className="p-3 md:p-4 border rounded-lg hover:shadow-md transition-shadow bg-gradient-to-br from-background to-muted/20">
                      <div className="flex items-start justify-between mb-2 gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm md:text-base truncate">
                            Pago - {formatPeriodo(pago.periodo)}
                          </p>
                          <p className="text-xs md:text-sm text-muted-foreground">
                            {new Date(pago.fechaPagoRegistrada).toLocaleDateString('es-PE')} • {pago.metodoPago}
                          </p>
                        </div>
                        {getBadgeEstado()}
                      </div>
                      
                      <div className="text-xs md:text-sm space-y-0.5 md:space-y-1">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Monto:</span>
                          <span className="font-semibold">S/ {pago.monto.toFixed(2)}</span>
                        </div>
                        {pago.numeroOperacion && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">N° Operación:</span>
                            <span className="font-medium truncate ml-2">{pago.numeroOperacion}</span>
                          </div>
                        )}
                        {pago.descuentoProntoPago && pago.descuentoProntoPago > 0 && (
                          <div className="flex justify-between text-green-600">
                            <span>Descuento aplicado:</span>
                            <span className="font-medium">- S/ {pago.descuentoProntoPago.toFixed(2)}</span>
                          </div>
                        )}
                        {pago.archivoComprobante && (
                          <div className="mt-1 md:mt-2">
                            <a 
                              href={pago.archivoComprobante} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-[10px] md:text-xs text-primary hover:underline inline-flex items-center gap-1"
                            >
                              📎 Ver comprobante
                            </a>
                          </div>
                        )}
                        {pago.estado === 'rechazado' && pago.motivoRechazo && (
                          <div className="mt-1 md:mt-2 p-2 bg-red-50 border border-red-200 rounded text-[10px] md:text-xs text-red-600">
                            <strong>Motivo:</strong> {pago.motivoRechazo}
                          </div>
                        )}
                        {pago.observaciones && (
                          <div className="mt-1 md:mt-2 p-2 bg-muted rounded text-[10px] md:text-xs">
                            <strong>Nota:</strong> {pago.observaciones}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
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
