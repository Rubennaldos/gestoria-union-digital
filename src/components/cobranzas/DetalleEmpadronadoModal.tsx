import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Receipt, CreditCard, FileText, User, Download } from "lucide-react";
import { Empadronado } from "@/types/empadronados";
import { Pago } from "@/types/cobranzas";
import { obtenerPagosPorEmpadronado } from "@/services/cobranzas";

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
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (empadronado && open) {
      cargarPagos();
    }
  }, [empadronado, open]);

  const cargarPagos = async () => {
    if (!empadronado) return;
    
    try {
      setLoading(true);
      const pagosList = await obtenerPagosPorEmpadronado(empadronado.id);
      setPagos(pagosList.sort((a, b) => b.año - a.año || b.mes - a.mes));
    } catch (error) {
      console.error('Error cargando pagos:', error);
    } finally {
      setLoading(false);
    }
  };

  const calcularDeudaTotal = () => {
    return pagos
      .filter(p => p.estado === 'pendiente' || p.estado === 'moroso')
      .reduce((total, p) => total + p.monto, 0);
  };

  const generarLinkCompartir = () => {
    if (!empadronado) return '';
    // En un sistema real, esto sería una URL real
    return `${window.location.origin}/consulta-deuda?dni=${empadronado.dni}&padron=${empadronado.numeroPadron}`;
  };

  const copiarLink = () => {
    navigator.clipboard.writeText(generarLinkCompartir());
    // Toast notification would go here
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
                <Badge variant={empadronado.habilitado ? "default" : "secondary"}>
                  {empadronado.habilitado ? "Habilitado" : "No habilitado"}
                </Badge>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Deuda Total</p>
                <p className="font-bold text-lg text-destructive">S/ {calcularDeudaTotal().toFixed(2)}</p>
              </div>
            </CardContent>
          </Card>

          {/* Link para compartir */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Link de Consulta para el Vecino</CardTitle>
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
                  Copiar
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                El vecino puede usar este link para consultar su deuda y descargar comprobantes
              </p>
            </CardContent>
          </Card>

          {/* Tabs de contenido */}
          <Tabs defaultValue="pagos">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="pagos">Historial de Pagos</TabsTrigger>
              <TabsTrigger value="comprobantes">Comprobantes</TabsTrigger>
            </TabsList>

            <TabsContent value="pagos" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Historial de Pagos</h3>
                <p className="text-sm text-muted-foreground">
                  Total de registros: {pagos.length}
                </p>
              </div>

              {loading ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
                  <p className="text-muted-foreground">Cargando pagos...</p>
                </div>
              ) : pagos.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No hay pagos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pagos.map((pago) => (
                    <div key={pago.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium">
                            Periodo {pago.mes}/{pago.año}
                          </p>
                          <Badge variant={
                            pago.estado === 'pagado' ? 'default' : 
                            pago.estado === 'moroso' ? 'destructive' : 
                            'secondary'
                          }>
                            {pago.estado}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Vencimiento: {pago.fechaVencimiento}
                          {pago.fechaPago && ` • Pagado: ${pago.fechaPago}`}
                        </p>
                        {pago.metodoPago && (
                          <p className="text-xs text-muted-foreground">
                            Método: {pago.metodoPago}
                            {pago.numeroOperacion && ` • Op: ${pago.numeroOperacion}`}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <p className="font-bold">S/ {pago.monto.toFixed(2)}</p>
                          {pago.montoOriginal !== pago.monto && (
                            <p className="text-xs text-muted-foreground line-through">
                              S/ {pago.montoOriginal.toFixed(2)}
                            </p>
                          )}
                        </div>
                        {pago.estado === 'pendiente' && (
                          <Button 
                            size="sm" 
                            onClick={() => onRegistrarPago(pago)}
                            className="ml-2"
                          >
                            Pagar
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="comprobantes" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">Comprobantes de Pago</h3>
              </div>

              <div className="space-y-3">
                {pagos.filter(p => p.estado === 'pagado' && p.comprobantePago).map((pago) => (
                  <div key={pago.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileText className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">Comprobante {pago.mes}/{pago.año}</p>
                        <p className="text-sm text-muted-foreground">
                          Pagado el {pago.fechaPago} • S/ {pago.monto.toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm">
                      <Download className="h-4 w-4 mr-2" />
                      Descargar
                    </Button>
                  </div>
                ))}
                
                {pagos.filter(p => p.estado === 'pagado' && p.comprobantePago).length === 0 && (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">No hay comprobantes disponibles</p>
                  </div>
                )}
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};