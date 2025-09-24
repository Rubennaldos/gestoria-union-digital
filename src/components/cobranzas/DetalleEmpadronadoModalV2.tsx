import React, { useMemo, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Copy, CreditCard, Calendar, DollarSign } from 'lucide-react';
import { toast } from "@/hooks/use-toast";
import type { Empadronado } from '@/types/empadronados';
import type { ChargeV2, PagoV2 } from '@/types/cobranzas-v2';

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
  const [nuevoPago, setNuevoPago] = useState({
    chargeId: '',
    monto: '',
    metodoPago: '',
    numeroOperacion: '',
    observaciones: ''
  });

  // Calcular deuda total y items
  const { deudaTotal, deudaItems } = useMemo(() => {
    if (!empadronado) return { deudaTotal: 0, deudaItems: [] };

    const items: DeudaItem[] = charges
      .filter(charge => charge.empadronadoId === empadronado.id && charge.saldo > 0)
      .map(charge => ({
        chargeId: charge.id,
        periodo: charge.periodo,
        saldo: charge.saldo,
        estado: charge.estado,
        fechaVencimiento: charge.fechaVencimiento,
        esMoroso: charge.esMoroso,
        montoMorosidad: charge.montoMorosidad
      }))
      .sort((a, b) => a.periodo.localeCompare(b.periodo));

    const total = items.reduce((sum, item) => sum + item.saldo, 0);

    return { deudaTotal: total, deudaItems: items };
  }, [empadronado, charges]);

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

  if (!empadronado) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Detalle de Asociado - Sistema V2
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información personal */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-sm font-medium">Nombre Completo</Label>
                <p className="text-sm">{empadronado.nombre} {empadronado.apellidos}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">DNI</Label>
                <p className="text-sm">{empadronado.dni}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Número de Padrón</Label>
                <p className="text-sm">{empadronado.numeroPadron}</p>
              </div>
              <div>
                <Label className="text-sm font-medium">Estado</Label>
                <Badge variant={empadronado.habilitado ? "default" : "secondary"}>
                  {empadronado.habilitado ? "Habilitado" : "Deshabilitado"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Resumen de deuda */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center justify-between">
                Resumen de Deuda
                <span className="text-2xl font-bold text-primary">
                  {formatearMoneda(deudaTotal)}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <div>
                  <Label className="text-sm font-medium">Períodos pendientes</Label>
                  <p className="text-sm">{deudaItems.length}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Períodos morosos</Label>
                  <p className="text-sm">{deudaItems.filter(item => item.esMoroso).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Link para compartir */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Link de Consulta</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <Input 
                  value={generarLinkCompartir()} 
                  readOnly 
                  className="flex-1"
                />
                <Button onClick={copiarLink} variant="outline" size="sm">
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Comparte este enlace con el asociado para que consulte su estado de cuenta
              </p>
            </CardContent>
          </Card>

          {/* Tabs para detalles */}
          <Tabs defaultValue="estado-cuenta" className="space-y-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="estado-cuenta">Estado de Cuenta</TabsTrigger>
              <TabsTrigger value="registrar-pago">Registrar Pago</TabsTrigger>
            </TabsList>

            {/* Estado de Cuenta */}
            <TabsContent value="estado-cuenta">
              <Card>
                <CardHeader>
                  <CardTitle>Detalle de Deudas Pendientes</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {deudaItems.length === 0 ? (
                      <p className="text-center text-muted-foreground py-4">
                        No hay deudas pendientes
                      </p>
                    ) : (
                      deudaItems.map((item) => (
                        <div key={item.chargeId} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <div className="font-medium">Período: {item.periodo}</div>
                            <div className="text-sm text-muted-foreground">
                              Vence: {formatearFecha(item.fechaVencimiento)}
                              {item.montoMorosidad && (
                                <span className="ml-2 text-destructive">
                                  (+ {formatearMoneda(item.montoMorosidad)} mora)
                                </span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className="font-medium">{formatearMoneda(item.saldo)}</div>
                              <Badge variant={
                                item.estado === 'pagado' ? 'default' : 
                                item.esMoroso ? 'destructive' : 'secondary'
                              }>
                                {item.esMoroso ? 'Moroso' : item.estado}
                              </Badge>
                            </div>
                            
                            <Button 
                              size="sm" 
                              onClick={() => setNuevoPago(prev => ({ 
                                ...prev, 
                                chargeId: item.chargeId,
                                monto: item.saldo.toString()
                              }))}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
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
                  <div className="grid grid-cols-2 gap-4">
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