import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, CreditCard, FileText, User, Download, Link2, Copy } from "lucide-react";
import { Empadronado } from "@/types/empadronados";
import { Pago, MetodoPago } from "@/types/cobranzas";
import { getMemberDebtSummary } from "@/hooks/useFirebase";
import { toast } from "sonner";

interface DetalleEmpadronadoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  onRegistrarPago: (pago: Pago) => void;
}

export const DetalleEmpadronadoModal = ({ 
  open, 
  onOpenChange, 
  empadronado, 
  onRegistrarPago 
}: DetalleEmpadronadoModalProps) => {
  const [deudaData, setDeudaData] = useState<{total: number; moroso: boolean; items: Array<{periodo: string; saldo: number; estado: string}>}>({total: 0, moroso: false, items: []});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (empadronado && open) {
      cargarDeuda();
    }
  }, [empadronado, open]);

  const cargarDeuda = async () => {
    if (!empadronado) return;
    
    setLoading(true);
    try {
      const resumen = await getMemberDebtSummary(empadronado.id);
      setDeudaData(resumen);
    } catch (error) {
      console.error('Error cargando deuda:', error);
    } finally {
      setLoading(false);
    }
  };

  const generarLinkCompartir = () => {
    if (!empadronado) return '';
    return `${window.location.origin}/consulta-deuda?dni=${empadronado.dni}&padron=${empadronado.numeroPadron}`;
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(generarLinkCompartir());
    toast.success("Link copiado al portapapeles");
  };

  const handleRegistrarPago = (periodo: string, monto: number) => {
    const [year, month] = periodo.split('-').map(Number);
    const pagoData: Pago = {
      id: '',
      empadronadoId: empadronado!.id,
      numeroPadron: empadronado!.numeroPadron,
      año: year,
      mes: month,
      monto: monto,
      montoOriginal: monto,
      estado: 'pendiente',
      fechaVencimiento: '15/' + String(month).padStart(2, '0') + '/' + year,
      metodoPago: 'efectivo' as MetodoPago,
      descuentos: [],
      recargos: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
      creadoPor: 'admin'
    };
    onRegistrarPago(pagoData);
  };

  if (!empadronado) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Detalle del Asociado
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información del Empadronado */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Información Personal</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nombre Completo</p>
                <p className="font-medium">{empadronado.nombre} {empadronado.apellidos}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">DNI</p>
                <p className="font-medium">{empadronado.dni}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Número de Padrón</p>
                <p className="font-medium">{empadronado.numeroPadron}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Ubicación</p>
                <p className="font-medium">
                  {empadronado.manzana && empadronado.lote 
                    ? `Mz. ${empadronado.manzana} Lt. ${empadronado.lote}` 
                    : 'No especificada'}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <div className="flex gap-2">
                  <Badge variant={empadronado.habilitado ? "default" : "secondary"}>
                    {empadronado.habilitado ? "Habilitado" : "No habilitado"}
                  </Badge>
                  {deudaData.moroso && (
                    <Badge variant="destructive">Moroso</Badge>
                  )}
                </div>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deuda Total</p>
                <p className={`font-bold text-lg ${deudaData.total > 0 ? 'text-destructive' : 'text-green-600'}`}>
                  S/ {deudaData.total.toFixed(2)}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Link para compartir */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Link2 className="h-5 w-5" />
                Link de Consulta para el Vecino
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <input 
                  type="text" 
                  value={generarLinkCompartir()} 
                  readOnly 
                  className="flex-1 p-2 border rounded text-sm bg-muted"
                />
                <Button onClick={copiarLink} variant="outline" size="sm">
                  <Copy className="h-4 w-4 mr-2" />
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                El vecino puede usar este link para consultar su deuda y descargar comprobantes
              </p>
            </CardContent>
          </Card>

          {/* Tabs de contenido */}
          <Tabs defaultValue="deuda">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="deuda">Estado de Cuenta</TabsTrigger>
              <TabsTrigger value="comprobantes">Comprobantes</TabsTrigger>
            </TabsList>

            <TabsContent value="deuda" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Estado de Cuenta</h3>
                <p className="text-sm text-muted-foreground">
                  Total de periodos: {deudaData.items.length}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                  <p className="text-muted-foreground">Cargando estado de cuenta...</p>
                </div>
              ) : deudaData.items.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay deudas registradas</p>
                  <p className="text-sm text-muted-foreground">El asociado está al día con sus pagos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {deudaData.items.map((item, index) => {
                    const [year, month] = item.periodo.split('-').map(Number);
                    const fechaVenc = `15/${String(month).padStart(2, '0')}/${year}`;
                    
                    return (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium">
                              Periodo {String(month).padStart(2, '0')}/{year}
                            </p>
                            <Badge variant={
                              item.estado === 'pagado' ? 'default' : 
                              item.estado === 'moroso' ? 'destructive' : 
                              'secondary'
                            }>
                              {item.estado}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Vencimiento: {fechaVenc}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Cuota mensual
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="font-bold">S/ {item.saldo.toFixed(2)}</p>
                            {item.estado === 'moroso' && (
                              <p className="text-xs text-destructive">
                                Incluye recargo por morosidad
                              </p>
                            )}
                          </div>
                          {item.estado !== 'pagado' && (
                            <Button 
                              size="sm" 
                              onClick={() => handleRegistrarPago(item.periodo, item.saldo)}
                              className="ml-2"
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Pagar
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comprobantes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Comprobantes de Pago</h3>
              </div>

              <div className="text-center py-8">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Funcionalidad en desarrollo</p>
                <p className="text-sm text-muted-foreground">Los comprobantes se mostrarán aquí una vez que se implementen los pagos</p>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};