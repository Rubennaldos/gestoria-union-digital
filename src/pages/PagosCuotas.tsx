import { useState, useEffect, useMemo } from "react";
import {
  Calculator,
  CheckCircle,
  CreditCard,
  Calendar,
  AlertCircle,
  Download,
  Clock,
  FileText,
  Filter,
  Eye,
  ExternalLink,
  XCircle,
  Loader2
} from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { ChargeV2, PagoV2 } from "@/types/cobranzas-v2";
import { 
  obtenerChargesPorEmpadronadoV2, 
  registrarPagoV2, 
  obtenerEstadoCuentaEmpadronado,
  obtenerPagosV2 
} from "@/services/cobranzas-v2";
import { Empadronado } from "@/types/empadronados";
import { useDeudaAsociado } from "@/hooks/useDeudaAsociado";
import { useBillingConfig } from "@/contexts/BillingConfigContext";

const PagosCuotas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const config = useBillingConfig();

  const [empadronado, setEmpadronado] = useState<Empadronado | null>(null);
  const [allCharges, setAllCharges] = useState<ChargeV2[]>([]);
  const [allPagos, setAllPagos] = useState<PagoV2[]>([]);
  const [chargesSeleccionados, setChargesSeleccionados] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [procesandoPago, setProcesandoPago] = useState(false);
  
  // Filtros
  const [filtroAnio, setFiltroAnio] = useState<string>(new Date().getFullYear().toString());
  const [activeTab, setActiveTab] = useState("pendientes");
  
  // Formulario de pago
  const [metodoPago, setMetodoPago] = useState<string>("");
  const [numeroOperacion, setNumeroOperacion] = useState("");
  const [observaciones, setObservaciones] = useState("");
  const [fechaPago, setFechaPago] = useState<string>(new Date().toISOString().split('T')[0]);
  const [archivoComprobante, setArchivoComprobante] = useState<File | null>(null);

  // Modal de confirmación
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pagoEnviado, setPagoEnviado] = useState(false);

  // Modal de detalle de pago
  const [pagoDetalle, setPagoDetalle] = useState<PagoV2 | null>(null);

  // Calcular deuda usando el motor
  const deudaCalculada = useDeudaAsociado(empadronado || {});

  // Generar lista de años disponibles (2025 hasta año actual)
  const aniosDisponibles = useMemo(() => {
    const anioActual = new Date().getFullYear();
    const anios: string[] = [];
    for (let i = 2025; i <= anioActual; i++) {
      anios.push(i.toString());
    }
    return anios;
  }, []);

  // Filtrar cuotas pendientes (saldo > 0)
  const chargesPendientes = useMemo(() => {
    return allCharges.filter(c => 
      c.saldo > 0 && 
      c.periodo.startsWith(filtroAnio)
    ).sort((a, b) => a.periodo.localeCompare(b.periodo));
  }, [allCharges, filtroAnio]);

  // Filtrar cuotas pagadas (saldo === 0 O estado === 'pagado' O montoPagado > 0)
  // Esto asegura que se muestren las cuotas pagadas aunque no haya registro de pago
  const chargesPagados = useMemo(() => {
    return allCharges.filter(c => 
      (c.saldo === 0 || c.estado === 'pagado' || c.montoPagado >= c.montoOriginal) && 
      c.periodo.startsWith(filtroAnio)
    ).sort((a, b) => b.periodo.localeCompare(a.periodo));
  }, [allCharges, filtroAnio]);

  // Filtrar pagos del empadronado
  const misPagos = useMemo(() => {
    return allPagos.filter(p => 
      p.periodo.startsWith(filtroAnio)
    ).sort((a, b) => b.fechaCreacion - a.fechaCreacion);
  }, [allPagos, filtroAnio]);

  // Estadísticas rápidas - basadas en los charges (más confiable)
  const estadisticas = useMemo(() => {
    const totalPendiente = chargesPendientes.reduce((sum, c) => sum + c.saldo, 0);
    // Total pagado: suma de montoPagado de todos los charges del año
    const totalPagado = allCharges
      .filter(c => c.periodo.startsWith(filtroAnio))
      .reduce((sum, c) => sum + (c.montoPagado || 0), 0);
    const cuotasMorosas = chargesPendientes.filter(c => c.esMoroso).length;
    const pagosPendientesAprobacion = misPagos.filter(p => p.estado === 'pendiente').length;
    
    return {
      totalPendiente,
      totalPagado,
      cuotasMorosas,
      pagosPendientesAprobacion
    };
  }, [chargesPendientes, allCharges, filtroAnio, misPagos]);

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

      // Obtener estado de cuenta completo desde Cobranzas V2
      const estadoCuenta = await obtenerEstadoCuentaEmpadronado(miEmpadronado.id);
      
      // Guardar TODOS los charges (pendientes y pagados)
      setAllCharges(estadoCuenta.charges);
      
      // Guardar TODOS los pagos del empadronado
      setAllPagos(estadoCuenta.pagos);

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
    return chargesPendientes
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
    const year = periodo.substring(0, 4);
    const month = parseInt(periodo.substring(4, 6));
    return new Date(parseInt(year), month - 1).toLocaleDateString('es-PE', {
      month: 'long',
      year: 'numeric'
    });
  };

  const formatFecha = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE', {
      day: '2-digit',
      month: 'short',
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
      const primerCharge = chargesPendientes.find(c => c.id === chargesArray[0]);
      
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
        const charge = chargesPendientes.find(c => c.id === chargeId);
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
    const deudaTotal = estadisticas.totalPendiente;
    const tieneMorosos = estadisticas.cuotasMorosas > 0;
    
    if (deudaTotal === 0) {
      return {
        emoji: "😊",
        mensaje: "¡Estás al día! Esta urbanización crece gracias a ti",
        color: "text-green-600",
        bgColor: "bg-green-50 border-green-200"
      };
    } else if (tieneMorosos) {
      return {
        emoji: "😔",
        mensaje: "Tienes cuotas vencidas. ¡Ponte al día!",
        color: "text-red-600", 
        bgColor: "bg-red-50 border-red-200"
      };
    } else {
      return {
        emoji: "⏰",
        mensaje: "Tienes cuotas pendientes de pago",
        color: "text-yellow-600",
        bgColor: "bg-yellow-50 border-yellow-200"
      };
    }
  };

  const getEstadoPagoBadge = (estado: string) => {
    switch (estado) {
      case 'aprobado':
        return <Badge className="bg-green-600 text-[10px] md:text-xs"><CheckCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />Aprobado</Badge>;
      case 'rechazado':
        return <Badge variant="destructive" className="text-[10px] md:text-xs"><XCircle className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />Rechazado</Badge>;
      default:
        return <Badge variant="secondary" className="text-[10px] md:text-xs"><Clock className="h-2.5 w-2.5 md:h-3 md:w-3 mr-1" />En revisión</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-12 w-12 mx-auto text-primary mb-4 animate-spin" />
          <p className="text-muted-foreground">Cargando tu estado de cuenta...</p>
        </div>
      </div>
    );
  }

  if (!empadronado) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0 flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertCircle className="h-12 w-12 mx-auto text-destructive mb-4" />
            <h2 className="text-lg font-semibold mb-2">Cuenta no vinculada</h2>
            <p className="text-muted-foreground text-sm">
              Tu cuenta de usuario no está vinculada a un registro de empadronado. 
              Contacta al administrador para resolver este problema.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const estadoGeneral = obtenerEstadoGeneral();
  const totalSeleccionado = calcularTotalSeleccionado();

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        {/* Header */}
        <div className="flex items-center gap-2 md:gap-4">
          <BackButton fallbackTo="/" />
          <div className="h-4 md:h-6 w-px bg-border" />
          <div className="flex-1">
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mis Cuotas
            </h1>
            <p className="text-[10px] md:text-sm text-muted-foreground hidden sm:block">
              {empadronado.nombre} {empadronado.apellidos} • Padrón: {empadronado.numeroPadron}
            </p>
          </div>
          
          {/* Filtro de año */}
          <Select value={filtroAnio} onValueChange={setFiltroAnio}>
            <SelectTrigger className="w-[100px] h-8 text-xs">
              <Filter className="h-3 w-3 mr-1" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {aniosDisponibles.map(anio => (
                <SelectItem key={anio} value={anio}>{anio}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Estado General - Resumen */}
        <Card className={`${estadoGeneral.bgColor} border-2 animate-fade-in`}>
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col md:flex-row md:items-center gap-4">
              <div className="text-4xl md:text-5xl">{estadoGeneral.emoji}</div>
              <div className="flex-1">
                <h2 className={`text-base md:text-lg font-bold ${estadoGeneral.color}`}>
                  {estadoGeneral.mensaje}
                </h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
                  <div className="text-center p-2 bg-white/50 rounded-lg">
                    <p className="text-lg md:text-xl font-bold text-red-600">
                      S/ {estadisticas.totalPendiente.toFixed(2)}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Por pagar</p>
                  </div>
                  <div className="text-center p-2 bg-white/50 rounded-lg">
                    <p className="text-lg md:text-xl font-bold text-green-600">
                      S/ {estadisticas.totalPagado.toFixed(2)}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Pagado {filtroAnio}</p>
                  </div>
                  <div className="text-center p-2 bg-white/50 rounded-lg">
                    <p className="text-lg md:text-xl font-bold text-orange-600">
                      {estadisticas.cuotasMorosas}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">Vencidas</p>
                  </div>
                  <div className="text-center p-2 bg-white/50 rounded-lg">
                    <p className="text-lg md:text-xl font-bold text-blue-600">
                      {estadisticas.pagosPendientesAprobacion}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">En revisión</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principales */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 h-auto">
            <TabsTrigger value="pendientes" className="text-xs md:text-sm py-2 data-[state=active]:bg-red-100 data-[state=active]:text-red-700">
              <AlertCircle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Pendientes ({chargesPendientes.length})
            </TabsTrigger>
            <TabsTrigger value="pagadas" className="text-xs md:text-sm py-2 data-[state=active]:bg-green-100 data-[state=active]:text-green-700">
              <CheckCircle className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Pagadas ({chargesPagados.length})
            </TabsTrigger>
            <TabsTrigger value="mis-pagos" className="text-xs md:text-sm py-2 data-[state=active]:bg-blue-100 data-[state=active]:text-blue-700">
              <FileText className="h-3 w-3 md:h-4 md:w-4 mr-1" />
              Mis Pagos ({misPagos.length})
            </TabsTrigger>
          </TabsList>

          {/* Tab: Cuotas Pendientes */}
          <TabsContent value="pendientes" className="mt-4">
            <Card>
              <CardHeader className="bg-gradient-to-r from-red-50 to-orange-50 p-3 md:p-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg text-red-700">
                  <Calculator className="h-4 w-4 md:h-5 md:w-5" />
                  Cuotas por Pagar - {filtroAnio}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4">
                {chargesPendientes.length === 0 ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                    <h3 className="text-base font-semibold text-green-600 mb-2">
                      ¡Felicitaciones!
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      No tienes cuotas pendientes en {filtroAnio}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {chargesPendientes.map((charge) => {
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
                          } ${charge.esMoroso ? 'border-l-4 border-l-red-500' : ''}`}
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
                              <div className="flex items-center justify-between mb-1 gap-2">
                                <h4 className="font-semibold text-sm md:text-base truncate capitalize">
                                  {formatPeriodo(charge.periodo)}
                                </h4>
                                <Badge 
                                  variant={charge.esMoroso ? 'destructive' : 'secondary'}
                                  className="text-[10px] md:text-xs shrink-0"
                                >
                                  {charge.esMoroso ? `Vencida (${diasVencidos}d)` : 'Pendiente'}
                                </Badge>
                              </div>
                              
                              <div className="text-xs md:text-sm space-y-0.5">
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">Monto:</span>
                                  <span className="font-medium">S/ {charge.montoOriginal.toFixed(2)}</span>
                                </div>
                                
                                {charge.montoPagado > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>Abonado:</span>
                                    <span>- S/ {charge.montoPagado.toFixed(2)}</span>
                                  </div>
                                )}

                                {charge.montoMorosidad && charge.montoMorosidad > 0 && (
                                  <div className="flex justify-between text-red-600">
                                    <span>Morosidad ({config.recargoMoraPct}%):</span>
                                    <span>+ S/ {charge.montoMorosidad.toFixed(2)}</span>
                                  </div>
                                )}
                                
                                <div className="flex justify-between font-semibold border-t pt-1 text-sm">
                                  <span>Saldo:</span>
                                  <span className="text-primary">S/ {charge.saldo.toFixed(2)}</span>
                                </div>
                                
                                <p className="text-[10px] md:text-xs text-muted-foreground mt-1">
                                  Vencimiento: {formatFecha(charge.fechaVencimiento)}
                                </p>
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
          </TabsContent>

          {/* Tab: Cuotas Pagadas */}
          <TabsContent value="pagadas" className="mt-4">
            <Card>
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50 p-3 md:p-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg text-green-700">
                  <CheckCircle className="h-4 w-4 md:h-5 md:w-5" />
                  Cuotas Pagadas - {filtroAnio}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4">
                {chargesPagados.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No hay cuotas pagadas en {filtroAnio}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {chargesPagados.map((charge) => (
                      <div
                        key={charge.id}
                        className="p-3 border rounded-lg bg-green-50/50 border-green-200"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-sm md:text-base capitalize">
                              {formatPeriodo(charge.periodo)}
                            </h4>
                            <p className="text-xs text-muted-foreground">
                              Pagado el {formatFecha(charge.fechaCreacion)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-green-600">
                              S/ {charge.montoOriginal.toFixed(2)}
                            </p>
                            <Badge className="bg-green-600 text-[10px]">
                              <CheckCircle className="h-2.5 w-2.5 mr-1" />
                              Pagado
                            </Badge>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab: Mis Pagos (Historial) */}
          <TabsContent value="mis-pagos" className="mt-4">
            <Card>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 p-3 md:p-4">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg text-blue-700">
                  <FileText className="h-4 w-4 md:h-5 md:w-5" />
                  Historial de Pagos - {filtroAnio}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 md:p-4">
                {misPagos.length === 0 ? (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No tienes pagos registrados en {filtroAnio}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 md:space-y-3">
                    {misPagos.map((pago) => (
                      <div
                        key={pago.id}
                        className={`p-3 md:p-4 border rounded-lg transition-shadow hover:shadow-md ${
                          pago.estado === 'aprobado' ? 'bg-green-50/30 border-green-200' :
                          pago.estado === 'rechazado' ? 'bg-red-50/30 border-red-200' :
                          'bg-yellow-50/30 border-yellow-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <h4 className="font-semibold text-sm md:text-base capitalize truncate">
                                {formatPeriodo(pago.periodo)}
                              </h4>
                              {getEstadoPagoBadge(pago.estado)}
                            </div>
                            
                            <div className="text-xs md:text-sm space-y-0.5">
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Monto:</span>
                                <span className="font-semibold">S/ {pago.monto.toFixed(2)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Método:</span>
                                <span className="capitalize">{pago.metodoPago}</span>
                              </div>
                              {pago.numeroOperacion && (
                                <div className="flex justify-between">
                                  <span className="text-muted-foreground">N° Operación:</span>
                                  <span className="font-mono text-xs">{pago.numeroOperacion}</span>
                                </div>
                              )}
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Fecha pago:</span>
                                <span>{formatFecha(pago.fechaPagoRegistrada)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Registrado:</span>
                                <span>{formatFecha(pago.fechaCreacion)}</span>
                              </div>

                              {pago.descuentoProntoPago && pago.descuentoProntoPago > 0 && (
                                <div className="flex justify-between text-green-600">
                                  <span>Descuento pronto pago:</span>
                                  <span>- S/ {pago.descuentoProntoPago.toFixed(2)}</span>
                                </div>
                              )}
                            </div>

                            {/* Motivo de rechazo */}
                            {pago.estado === 'rechazado' && pago.motivoRechazo && (
                              <div className="mt-2 p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                                <strong>Motivo de rechazo:</strong> {pago.motivoRechazo}
                              </div>
                            )}

                            {/* Observaciones */}
                            {pago.observaciones && (
                              <div className="mt-2 p-2 bg-muted rounded text-xs">
                                <strong>Nota:</strong> {pago.observaciones}
                              </div>
                            )}
                          </div>

                          {/* Botón de comprobante */}
                          {pago.archivoComprobante && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="shrink-0 h-8 text-xs"
                              onClick={() => window.open(pago.archivoComprobante, '_blank')}
                            >
                              <Download className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Ver</span>
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

        {/* Barra de Total Seleccionado - Solo visible en tab pendientes */}
        {activeTab === 'pendientes' && chargesSeleccionados.size > 0 && (
          <Card className="sticky bottom-24 md:bottom-6 border-primary shadow-lg animate-fade-in z-10">
            <CardContent className="p-3 md:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs md:text-sm text-muted-foreground">
                    {chargesSeleccionados.size} cuota{chargesSeleccionados.size !== 1 ? 's' : ''} seleccionada{chargesSeleccionados.size !== 1 ? 's' : ''}
                  </p>
                  <p className="text-lg md:text-xl font-bold text-primary truncate">
                    S/ {totalSeleccionado.toFixed(2)}
                  </p>
                </div>
                <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
                  <DialogTrigger asChild>
                    <Button size="sm" className="gap-1 md:gap-2 h-9 md:h-10 text-xs md:text-sm hover:scale-105 transition-transform shrink-0">
                      <CreditCard className="h-3 w-3 md:h-4 md:w-4" />
                      <span className="hidden sm:inline">Registrar Pago</span>
                      <span className="sm:hidden">Pagar</span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md mx-auto max-h-[90vh] overflow-y-auto" aria-describedby="dialog-description">
                    <DialogHeader>
                      <DialogTitle className="text-base md:text-lg">
                        {pagoEnviado ? "⏳ Pago Enviado" : "Registrar Pago"}
                      </DialogTitle>
                      <p id="dialog-description" className="sr-only">
                        {pagoEnviado 
                          ? "Tu pago está siendo procesado y revisado" 
                          : "Formulario para registrar un nuevo pago de cuotas"}
                      </p>
                    </DialogHeader>
                    
                    {pagoEnviado ? (
                      <div className="py-6 md:py-8 text-center">
                        <div className="text-4xl md:text-6xl mb-3 md:mb-4">✅</div>
                        <h3 className="text-base md:text-lg font-semibold mb-2">
                          ¡Pago enviado correctamente!
                        </h3>
                        <p className="text-sm md:text-base text-muted-foreground">
                          Tu pago será revisado y aprobado pronto. Puedes ver el estado en "Mis Pagos".
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
                              <SelectItem value="efectivo">💵 Efectivo</SelectItem>
                              <SelectItem value="transferencia">🏦 Transferencia</SelectItem>
                              <SelectItem value="yape">📱 Yape</SelectItem>
                              <SelectItem value="plin">📱 Plin</SelectItem>
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
                          <Label className="text-xs md:text-sm">Comprobante de Pago * (PDF, JPG, PNG)</Label>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => setArchivoComprobante(e.target.files?.[0] || null)}
                            className="cursor-pointer h-9 md:h-10 text-xs md:text-sm"
                          />
                          {archivoComprobante && (
                            <p className="text-[10px] md:text-xs text-green-600 mt-1">
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
                              <span className="text-muted-foreground">Cuotas seleccionadas:</span>
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
                            className="flex-1 h-9 md:h-10 text-xs md:text-sm"
                            disabled={procesandoPago}
                          >
                            Cancelar
                          </Button>
                          <Button
                            onClick={confirmarPago}
                            disabled={procesandoPago || !metodoPago || !numeroOperacion || !archivoComprobante}
                            className="flex-1 h-9 md:h-10 text-xs md:text-sm"
                          >
                            {procesandoPago ? (
                              <>
                                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                                Enviando...
                              </>
                            ) : (
                              "Confirmar Pago"
                            )}
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
      </main>

      <BottomNavigation />
    </div>
  );
};

export default PagosCuotas;
