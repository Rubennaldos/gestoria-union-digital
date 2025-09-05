import { useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ItemPatrimonio } from '@/types/patrimonio';
import { 
  Package, 
  MapPin, 
  User, 
  Calendar, 
  DollarSign, 
  Wrench, 
  Gift, 
  FileText, 
  Barcode,
  Eye,
  Edit,
  Trash2
} from 'lucide-react';
import JsBarcode from 'jsbarcode';

interface DetalleItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: ItemPatrimonio | null;
  onSuccess: () => void;
}

export function DetalleItemModal({ open, onOpenChange, item, onSuccess }: DetalleItemModalProps) {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (item && barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, item.codigoBarras, {
          format: "CODE128",
          width: 2,
          height: 40,
          displayValue: true,
          fontSize: 12,
          margin: 0
        });
      } catch (error) {
        console.error('Error generando código de barras:', error);
      }
    }
  }, [item]);

  if (!item) return null;

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(valor);
  };

  const formatearFecha = (fecha: string) => {
    return new Date(fecha).toLocaleDateString('es-CL');
  };

  const obtenerColorEstado = (estado: string) => {
    switch (estado) {
      case 'bueno': return 'bg-green-100 text-green-800';
      case 'regular': return 'bg-yellow-100 text-yellow-800';
      case 'malo': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const obtenerColorCondicion = (condicion: string) => {
    switch (condicion) {
      case 'nuevo': return 'bg-blue-100 text-blue-800';
      case 'segunda': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const valorMostrar = item.donacion.esDonacion 
    ? (item.donacion.valorAproximado || 0)
    : item.valorEstimado;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-start justify-between">
            <div>
              <DialogTitle className="text-xl">{item.nombre}</DialogTitle>
              <DialogDescription className="mt-2">
                Código: <span className="font-mono font-medium">{item.codigo}</span>
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {item.donacion.esDonacion && (
                <Badge variant="outline" className="text-blue-600">
                  <Gift className="w-3 h-3 mr-1" />
                  Donación
                </Badge>
              )}
              <Badge className={obtenerColorEstado(item.estado.conservacion)}>
                {item.estado.conservacion}
              </Badge>
              <Badge className={obtenerColorCondicion(item.estado.condicion)}>
                {item.estado.condicion}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Información General */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Información General
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Descripción</label>
                  <p className="text-sm">{item.descripcion}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Cantidad</label>
                  <p className="text-sm font-medium">{item.cantidad} unidad{item.cantidad !== 1 ? 'es' : ''}</p>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-4 h-4" />
                    Ubicación
                  </label>
                  <p className="text-sm">{item.ubicacion.zona}</p>
                  {item.ubicacion.referenciaInterna && (
                    <p className="text-xs text-muted-foreground font-mono">
                      Ref: {item.ubicacion.referenciaInterna}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <User className="w-4 h-4" />
                    Responsable
                  </label>
                  <p className="text-sm">{item.responsable}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Código de Barras */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Barcode className="w-5 h-5" />
                Código de Barras
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-center p-4 bg-white border rounded">
                <svg ref={barcodeRef}></svg>
              </div>
              <p className="text-center text-sm text-muted-foreground mt-2 font-mono">
                {item.codigoBarras}
              </p>
            </CardContent>
          </Card>

          {/* Estado y Valuación */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                Estado y Valuación
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                    <Calendar className="w-4 h-4" />
                    Fecha de Adquisición
                  </label>
                  <p className="text-sm">{formatearFecha(item.fechaAdquisicion.fecha)}</p>
                  <p className="text-xs text-muted-foreground">
                    Comprado por: {item.fechaAdquisicion.comprador}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    {item.donacion.esDonacion ? 'Valor Aproximado' : 'Valor Estimado'}
                  </label>
                  <p className="text-lg font-semibold">{formatearMoneda(valorMostrar)}</p>
                  {item.donacion.esDonacion && (
                    <p className="text-xs text-blue-600">
                      Donado por: {item.donacion.donante}
                    </p>
                  )}
                </div>
              </div>

              {item.estado.observaciones && (
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Observaciones del Estado</label>
                  <p className="text-sm">{item.estado.observaciones}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Mantenimiento */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Wrench className="w-5 h-5" />
                Mantenimiento
              </CardTitle>
            </CardHeader>
            <CardContent>
              {item.mantenimiento.requiere ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-orange-600">
                      Requiere mantenimiento
                    </Badge>
                  </div>
                  
                  {item.mantenimiento.encargado && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Encargado</label>
                      <p className="text-sm">{item.mantenimiento.encargado}</p>
                    </div>
                  )}

                  {item.mantenimiento.proximaFecha && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">Próximo Mantenimiento</label>
                      <p className="text-sm">{formatearFecha(item.mantenimiento.proximaFecha)}</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-green-600">
                    No requiere mantenimiento
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Documentación */}
          {(item.documentacion.tipoDocumento || item.documentacion.numeroDocumento) && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Documentación
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {item.documentacion.tipoDocumento && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Tipo de Documento</label>
                    <p className="text-sm capitalize">{item.documentacion.tipoDocumento}</p>
                  </div>
                )}

                {item.documentacion.numeroDocumento && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Número de Documento</label>
                    <p className="text-sm font-mono">{item.documentacion.numeroDocumento}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Observaciones */}
          {item.observaciones && (
            <Card>
              <CardHeader>
                <CardTitle>Observaciones</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm">{item.observaciones}</p>
              </CardContent>
            </Card>
          )}

          {/* Información del Sistema */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="grid gap-2 text-xs text-muted-foreground">
                <div className="flex justify-between">
                  <span>Fecha de creación:</span>
                  <span>{formatearFecha(item.fechaCreacion)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Última actualización:</span>
                  <span>{formatearFecha(item.fechaActualizacion)}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Separator />

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cerrar
          </Button>
          <Button variant="outline">
            <Edit className="w-4 h-4 mr-2" />
            Editar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}