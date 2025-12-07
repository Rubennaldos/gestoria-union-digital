import React, { useMemo, useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CreditCard, Calendar, DollarSign, Download, FileText, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Empadronado } from '@/types/empadronados';
import type { ChargeV2, PagoV2 } from '@/types/cobranzas-v2';
import { obtenerPagosV2 } from '@/services/cobranzas-v2';

interface DetalleEmpadronadoModalV2Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  charges: ChargeV2[];
  onRegistrarPago: (chargeId: string, monto: number, metodoPago: string, numeroOperacion?: string, observaciones?: string) => Promise<void>;
}

interface DeudaItem {
  chargeId: string;
  periodo: string;
  saldo: number;
  estado: 'pendiente' | 'pagado' | 'moroso';
  fechaVencimiento: number;
  esMoroso: boolean;
  montoMorosidad?: number;
}

export default function DetalleEmpadronadoModalV2({ 
  open, 
  onOpenChange, 
  empadronado, 
  charges,
  onRegistrarPago 
}: DetalleEmpadronadoModalV2Props) {
  const [activeTab, setActiveTab] = useState("estado-cuenta");
  const [pagos, setPagos] = useState<PagoV2[]>([]);
  const [cargandoPagos, setCargandoPagos] = useState(false);
  const [nuevoPago, setNuevoPago] = useState({
    chargeId: '',
    monto: '',
    metodoPago: '',
    numeroOperacion: '',
    observaciones: ''
  });

  // Cargar pagos del empadronado cuando se abre el modal
  useEffect(() => {
    if (open && empadronado) {
      cargarPagosEmpadronado();
    }
  }, [open, empadronado]);

  const cargarPagosEmpadronado = async () => {
    if (!empadronado) return;
    
    setCargandoPagos(true);
    try {
      const todosPagos = await obtenerPagosV2();
      // Filtrar pagos del empadronado actual
      const pagosEmpadronado = todosPagos.filter(p => p.empadronadoId === empadronado.id);
      // Ordenar por fecha más reciente primero
      pagosEmpadronado.sort((a, b) => b.fechaCreacion - a.fechaCreacion);
      setPagos(pagosEmpadronado);
    } catch (error) {
      console.error('Error cargando pagos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los pagos del asociado",
        variant: "destructive"
      });
    } finally {
      setCargandoPagos(false);
    }
  };

  // Calcular deuda total y items (solo VENCIDOS, considerando pagos)
  const { deudaTotal, deudaItems, deudaFutura, deudaItemsFuturos } = useMemo(() => {
    // Esperar a que se carguen los pagos para calcular correctamente
    if (!empadronado || cargandoPagos) return { deudaTotal: 0, deudaItems: [], deudaFutura: 0, deudaItemsFuturos: [] };

    const ahora = Date.now();
    
    const allItems = charges
      .filter(charge => {
        if (charge.empadronadoId !== empadronado.id) return false;
        if (charge.saldo <= 0) return false;
        
        // Verificar si hay pagos pendientes/aprobados que cubran el cargo
        const pagosDelCargo = pagos.filter(p => 
          p.chargeId === charge.id && 
          (p.estado === 'aprobado' || p.estado === 'pendiente')
        );
        const totalPagado = pagosDelCargo.reduce((sum, p) => sum + p.monto, 0);
        
        return totalPagado < charge.montoOriginal;
      })
      .map(charge => {
        const pagosDelCargo = pagos.filter(p => 
          p.chargeId === charge.id && 
          (p.estado === 'aprobado' || p.estado === 'pendiente')
        );
        const totalPagado = pagosDelCargo.reduce((sum, p) => sum + p.monto, 0);
        const saldoReal = Math.max(0, charge.montoOriginal - totalPagado);
        
        return {
          chargeId: charge.id,
          periodo: charge.periodo,
          saldo: saldoReal,
          estado: charge.estado,
          fechaVencimiento: charge.fechaVencimiento,
          esMoroso: charge.esMoroso,
          montoMorosidad: charge.montoMorosidad,
          esVencido: ahora > charge.fechaVencimiento
        };
      })
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    // Separar vencidos de futuros
    const vencidos = allItems.filter(item => item.esVencido);
    const futuros = allItems.filter(item => !item.esVencido);
    
    const totalVencido = vencidos.reduce((sum, item) => sum + item.saldo, 0);
    const totalFuturo = futuros.reduce((sum, item) => sum + item.saldo, 0);

    return { 
      deudaTotal: totalVencido, 
      deudaItems: vencidos,
      deudaFutura: totalFuturo,
      deudaItemsFuturos: futuros
    };
  }, [empadronado, charges, pagos, cargandoPagos]);

  const generarLinkCompartir = () => {
    if (!empadronado) return '';
    const baseUrl = window.location.origin;
    return `${baseUrl}/#/portal-asociado/${empadronado.numeroPadron}`;
  };

  const copiarLink = () => {
    const link = generarLinkCompartir();
    navigator.clipboard.writeText(link).then(() => {
      toast({
        title: "Link copiado",
        description: "El enlace ha sido copiado al portapapeles"
      });
    });
  };

  const handleRegistrarPago = async () => {
    if (!nuevoPago.chargeId || !nuevoPago.monto || !nuevoPago.metodoPago) {
      toast({
        title: "Error",
        description: "Complete todos los campos obligatorios",
        variant: "destructive"
      });
      return;
    }

    try {
      await onRegistrarPago(
        nuevoPago.chargeId,
        parseFloat(nuevoPago.monto),
        nuevoPago.metodoPago,
        nuevoPago.numeroOperacion || undefined,
        nuevoPago.observaciones || undefined
      );

      // Limpiar form
      setNuevoPago({
        chargeId: '',
        monto: '',
        metodoPago: '',
        numeroOperacion: '',
        observaciones: ''
      });

      toast({
        title: "Pago registrado",
        description: "El pago ha sido registrado exitosamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Error al registrar el pago",
        variant: "destructive"
      });
    }
  };

  const formatearMoneda = (monto: number) => {
    return `S/ ${monto.toFixed(2)}`;
  };

  const formatearFecha = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE');
  };

  const formatearFechaHora = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatearMetodoPago = (metodo: string) => {
    const metodos: Record<string, string> = {
      'efectivo': 'Efectivo',
      'transferencia': 'Transferencia Bancaria',
      'yape': 'Yape',
      'plin': 'Plin',
      'tarjeta': 'Tarjeta',
      'importacion_masiva': 'Importación Masiva'
    };
    return metodos[metodo] || metodo;
  };

  const obtenerNombreMes = (periodo: string) => {
    // Formato: YYYYMM (ej: 202501)
    if (periodo.length !== 6) return periodo;
    
    const año = periodo.substring(0, 4);
    const mes = parseInt(periodo.substring(4, 6));
    
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    
    return `${meses[mes - 1]} ${año}`;
  };

  const getBadgeVariantEstado = (estado: string) => {
    switch (estado) {
      case 'aprobado': return 'default';
      case 'pendiente': return 'secondary';
      case 'rechazado': return 'destructive';
      default: return 'outline';
    }
  };

  if (!empadronado) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] w-[95vw] overflow-y-auto p-3 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
            <DollarSign className="h-4 w-4 sm:h-5 sm:w-5" />
            <span className="hidden sm:inline">Detalle de Asociado - Sistema V2</span>
            <span className="sm:hidden">Detalle Asociado V2</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información personal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label className="text-xs sm:text-sm font-medium">Nombre Completo</Label>
                <p className="text-xs sm:text-sm truncate">{empadronado.nombre} {empadronado.apellidos}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium">DNI</Label>
                <p className="text-xs sm:text-sm">{empadronado.dni}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium">Número de Padrón</Label>
                <p className="text-xs sm:text-sm">{empadronado.numeroPadron}</p>
              </div>
              <div>
                <Label className="text-xs sm:text-sm font-medium">Estado</Label>
                <Badge variant={empadronado.habilitado ? "default" : "secondary"} className="text-xs">
                  {empadronado.habilitado ? "Habilitado" : "Deshabilitado"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de deuda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Resumen de Deuda Vencida
                {cargandoPagos ? (
                  <span className="text-muted-foreground text-sm">Calculando...</span>
                ) : (
                  <span className={`text-2xl font-bold ${deudaTotal > 0 ? 'text-destructive' : 'text-green-600'}`}>
                    {formatearMoneda(deudaTotal)}
                  </span>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cargandoPagos ? (
                <div className="text-center py-4 text-muted-foreground">
                  Cargando información de pagos...
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-2 bg-red-50 rounded-lg">
                    <Label className="text-xs font-medium text-red-700">Meses vencidos</Label>
                    <p className="text-lg font-bold text-red-600">{deudaItems.length}</p>
                  </div>
                  <div className="p-2 bg-orange-50 rounded-lg">
                    <Label className="text-xs font-medium text-orange-700">Morosos</Label>
                    <p className="text-lg font-bold text-orange-600">{deudaItems.filter(item => item.esMoroso).length}</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Label className="text-xs font-medium text-blue-700">Próximos</Label>
                    <p className="text-lg font-bold text-blue-600">{deudaItemsFuturos.length}</p>
                  </div>
                  <div className="p-2 bg-gray-50 rounded-lg">
                    <Label className="text-xs font-medium text-gray-700">Deuda futura</Label>
                    <p className="text-sm font-bold text-gray-600">{formatearMoneda(deudaFutura)}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>


          {/* Tabs para detalles */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
            <TabsList className="grid w-full grid-cols-3 h-auto p-1">
              <TabsTrigger value="estado-cuenta" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Estado de Cuenta</span>
                <span className="sm:hidden">Estado</span>
              </TabsTrigger>
              <TabsTrigger value="historial-pagos" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Historial de Pagos</span>
                <span className="sm:hidden">Historial</span>
              </TabsTrigger>
              <TabsTrigger value="registrar-pago" className="text-xs sm:text-sm py-2">
                <span className="hidden sm:inline">Registrar Pago</span>
                <span className="sm:hidden">Pago</span>
              </TabsTrigger>
            </TabsList>

            {/* Estado de Cuenta */}
            <TabsContent value="estado-cuenta">
              <div className="space-y-4">
                {/* Deudas VENCIDAS */}
                <Card className="border-red-200">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base flex items-center gap-2 text-red-700">
                      <AlertCircle className="h-4 w-4" />
                      Deudas Vencidas ({deudaItems.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {deudaItems.length === 0 ? (
                        <p className="text-center text-green-600 py-2 text-sm">
                          ✓ Sin deudas vencidas
                        </p>
                      ) : (
                        deudaItems.map((item) => (
                          <div key={item.chargeId} className="flex items-center justify-between p-2 bg-red-50 rounded-lg gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{item.periodo}</div>
                              <div className="text-xs text-muted-foreground">
                                Venció: {formatearFecha(item.fechaVencimiento)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="font-bold text-red-600">{formatearMoneda(item.saldo)}</div>
                                <Badge variant="destructive" className="text-[10px]">
                                  {item.esMoroso ? 'Moroso' : 'Vencido'}
                                </Badge>
                              </div>
                              
                              <Button 
                                size="sm" 
                                onClick={() => {
                                  setNuevoPago({
                                    chargeId: item.chargeId,
                                    monto: item.saldo.toString(),
                                    metodoPago: '',
                                    numeroOperacion: '',
                                    observaciones: ''
                                  });
                                  setActiveTab("registrar-pago");
                                }}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Pagar
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Cuotas PRÓXIMAS */}
                {deudaItemsFuturos.length > 0 && (
                  <Card className="border-blue-200">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base flex items-center gap-2 text-blue-700">
                        <Calendar className="h-4 w-4" />
                        Próximas Cuotas ({deudaItemsFuturos.length})
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {deudaItemsFuturos.map((item) => (
                          <div key={item.chargeId} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg gap-2">
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">{item.periodo}</div>
                              <div className="text-xs text-muted-foreground">
                                Vence: {formatearFecha(item.fechaVencimiento)}
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <div className="text-right">
                                <div className="font-bold text-blue-600">{formatearMoneda(item.saldo)}</div>
                                <Badge variant="secondary" className="text-[10px]">
                                  Por vencer
                                </Badge>
                              </div>
                              
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => {
                                  setNuevoPago({
                                    chargeId: item.chargeId,
                                    monto: item.saldo.toString(),
                                    metodoPago: '',
                                    numeroOperacion: '',
                                    observaciones: ''
                                  });
                                  setActiveTab("registrar-pago");
                                }}
                              >
                                <CreditCard className="h-3 w-3 mr-1" />
                                Adelantar
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </TabsContent>

            {/* Historial de Pagos */}
            <TabsContent value="historial-pagos">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Historial de Pagos</span>
                    <Badge variant="outline">{pagos.length} pagos</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {cargandoPagos ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Cargando historial...
                    </div>
                  ) : pagos.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      No hay pagos registrados
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {pagos.map((pago) => {
                        const charge = charges.find(c => c.id === pago.chargeId);
                        
                        return (
                          <Card key={pago.id} className="border-l-4" style={{
                            borderLeftColor: 
                              pago.estado === 'aprobado' ? '#22c55e' : 
                              pago.estado === 'rechazado' ? '#ef4444' : 
                              '#94a3b8'
                          }}>
                            <CardContent className="p-4 space-y-3">
                              {/* Encabezado */}
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                <div>
                                  <div className="font-semibold text-base">
                                    {charge ? obtenerNombreMes(charge.periodo) : `Período: ${pago.periodo}`}
                                  </div>
                                  <div className="text-sm text-muted-foreground">
                                    ID: {pago.id}
                                  </div>
                                </div>
                                <div className="flex flex-col sm:items-end gap-1">
                                  <div className="text-xl font-bold text-primary">
                                    {formatearMoneda(pago.monto)}
                                  </div>
                                  <Badge variant={getBadgeVariantEstado(pago.estado)} className="w-fit">
                                    {pago.estado === 'aprobado' && <CheckCircle className="h-3 w-3 mr-1" />}
                                    {pago.estado === 'pendiente' && <Clock className="h-3 w-3 mr-1" />}
                                    {pago.estado === 'rechazado' && <XCircle className="h-3 w-3 mr-1" />}
                                    {pago.estado.charAt(0).toUpperCase() + pago.estado.slice(1)}
                                  </Badge>
                                </div>
                              </div>

                              {/* Detalles del pago */}
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                                <div>
                                  <Label className="text-xs font-medium text-muted-foreground">Método de Pago</Label>
                                  <p className="font-medium">{formatearMetodoPago(pago.metodoPago)}</p>
                                </div>
                                
                                {pago.numeroOperacion && (
                                  <div>
                                    <Label className="text-xs font-medium text-muted-foreground">Nº Operación</Label>
                                    <p className="font-medium">{pago.numeroOperacion}</p>
                                  </div>
                                )}

                                <div>
                                  <Label className="text-xs font-medium text-muted-foreground">Fecha de Pago</Label>
                                  <p>{formatearFecha(pago.fechaPagoRegistrada)}</p>
                                </div>

                                <div>
                                  <Label className="text-xs font-medium text-muted-foreground">Fecha de Registro</Label>
                                  <p>{formatearFechaHora(pago.fechaCreacion)}</p>
                                </div>

                                {pago.montoOriginal && pago.montoOriginal !== pago.monto && (
                                  <div>
                                    <Label className="text-xs font-medium text-muted-foreground">Monto Original</Label>
                                    <p>{formatearMoneda(pago.montoOriginal)}</p>
                                  </div>
                                )}

                                {pago.descuentoProntoPago && pago.descuentoProntoPago > 0 && (
                                  <div>
                                    <Label className="text-xs font-medium text-muted-foreground">Descuento Pronto Pago</Label>
                                    <p className="text-green-600 font-medium">
                                      -{formatearMoneda(pago.descuentoProntoPago)}
                                    </p>
                                  </div>
                                )}

                                {charge && (
                                  <div>
                                    <Label className="text-xs font-medium text-muted-foreground">Cargo Asociado</Label>
                                    <p className="text-xs">
                                      {formatearMoneda(charge.montoOriginal)}
                                      {charge.saldo > 0 && (
                                        <span className="text-orange-600 ml-1">
                                          (Saldo: {formatearMoneda(charge.saldo)})
                                        </span>
                                      )}
                                    </p>
                                  </div>
                                )}
                              </div>

                              {/* Observaciones */}
                              {pago.observaciones && (
                                <div className="pt-2 border-t">
                                  <Label className="text-xs font-medium text-muted-foreground">Observaciones</Label>
                                  <p className="text-sm mt-1">{pago.observaciones}</p>
                                </div>
                              )}

                              {/* Información de aprobación */}
                              {pago.estado === 'aprobado' && (
                                <div className="pt-2 border-t bg-green-50 -m-4 p-4 rounded-b-lg">
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                                    <div>
                                      <Label className="text-xs font-medium text-green-700">Estado</Label>
                                      <p className="font-medium text-green-900">Aprobado</p>
                                    </div>
                                    <div>
                                      <Label className="text-xs font-medium text-green-700">Fecha de Registro</Label>
                                      <p className="text-green-900">{formatearFechaHora(pago.fechaCreacion)}</p>
                                    </div>
                                  </div>
                                </div>
                              )}

                              {/* Información de rechazo */}
                              {pago.estado === 'rechazado' && pago.motivoRechazo && (
                                <div className="pt-2 border-t bg-red-50 -m-4 p-4 rounded-b-lg">
                                  <Label className="text-xs font-medium text-red-700">Motivo de Rechazo</Label>
                                  <p className="text-sm text-red-900 mt-1">{pago.motivoRechazo}</p>
                                </div>
                              )}

                              {/* Comprobante */}
                              {pago.archivoComprobante && (
                                <div className="pt-2 border-t">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => window.open(pago.archivoComprobante, '_blank')}
                                  >
                                    <Download className="h-4 w-4 mr-2" />
                                    Descargar Comprobante
                                  </Button>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Registrar Pago */}
            <TabsContent value="registrar-pago">
              <Card>
                <CardHeader>
                  <CardTitle>Registrar Nuevo Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="cargo">Período a Pagar</Label>
                      <Select 
                        value={nuevoPago.chargeId} 
                        onValueChange={(value) => {
                          const selectedCharge = deudaItems.find(item => item.chargeId === value);
                          setNuevoPago(prev => ({ 
                            ...prev, 
                            chargeId: value,
                            monto: selectedCharge ? selectedCharge.saldo.toString() : ''
                          }));
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un período" />
                        </SelectTrigger>
                        <SelectContent>
                          {deudaItems.map((item) => (
                            <SelectItem key={item.chargeId} value={item.chargeId}>
                              {item.periodo} - {formatearMoneda(item.saldo)}
                              {item.esMoroso && ' (Moroso)'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="monto">Monto</Label>
                      <Input
                        id="monto"
                        type="number"
                        step="0.01"
                        value={nuevoPago.monto}
                        onChange={(e) => setNuevoPago(prev => ({ ...prev, monto: e.target.value }))}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="metodo">Método de Pago</Label>
                      <Select 
                        value={nuevoPago.metodoPago} 
                        onValueChange={(value) => setNuevoPago(prev => ({ ...prev, metodoPago: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione método" />
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
                      <Label htmlFor="operacion">Número de Operación (Opcional)</Label>
                      <Input
                        id="operacion"
                        value={nuevoPago.numeroOperacion}
                        onChange={(e) => setNuevoPago(prev => ({ ...prev, numeroOperacion: e.target.value }))}
                        placeholder="Número de operación"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="observaciones">Observaciones (Opcional)</Label>
                    <Textarea
                      id="observaciones"
                      value={nuevoPago.observaciones}
                      onChange={(e) => setNuevoPago(prev => ({ ...prev, observaciones: e.target.value }))}
                      placeholder="Observaciones adicionales..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleRegistrarPago} className="w-full">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Registrar Pago
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
}