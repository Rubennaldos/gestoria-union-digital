import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { ResumenPatrimonio as ResumenData } from '@/types/patrimonio';
import { obtenerResumenPatrimonio } from '@/services/patrimonio';
import { 
  Package, 
  DollarSign, 
  Gift, 
  Wrench, 
  TrendingUp,
  Shield,
  AlertTriangle,
  CheckCircle,
  PieChart
} from 'lucide-react';

export function ResumenPatrimonio() {
  const [resumen, setResumen] = useState<ResumenData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarResumen = async () => {
      try {
        setLoading(true);
        const data = await obtenerResumenPatrimonio();
        setResumen(data);
      } catch (error) {
        console.error('Error cargando resumen:', error);
      } finally {
        setLoading(false);
      }
    };

    cargarResumen();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-muted rounded w-1/2"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!resumen) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertTriangle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">No se pudo cargar el resumen del patrimonio</p>
        </CardContent>
      </Card>
    );
  }

  const formatearMoneda = (valor: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(valor);
  };

  const porcentajeMantenimientoAlDia = resumen.totalItems > 0 
    ? (resumen.mantenimiento.alDia / resumen.totalItems) * 100 
    : 0;

  const porcentajeEstadoBueno = resumen.totalItems > 0 
    ? (resumen.itemsPorEstado.bueno / resumen.totalItems) * 100 
    : 0;

  return (
    <div className="space-y-6">
      {/* Métricas Principales */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Items</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.totalItems}</div>
            <p className="text-xs text-muted-foreground">
              Items registrados en el inventario
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total Patrimonio</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatearMoneda(resumen.valorTotalPatrimonio)}</div>
            <p className="text-xs text-muted-foreground">
              Valor estimado total de bienes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Donaciones</CardTitle>
            <Gift className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.donaciones.cantidad}</div>
            <p className="text-xs text-muted-foreground">
              {formatearMoneda(resumen.donaciones.valorTotal)} en donaciones
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mantenimiento Pendiente</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{resumen.mantenimiento.pendientes}</div>
            <p className="text-xs text-muted-foreground">
              Items que requieren mantenimiento
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Distribución por Estado */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Estado de Conservación
            </CardTitle>
            <CardDescription>
              Distribución de items por estado de conservación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  <span className="text-sm">Bueno</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{resumen.itemsPorEstado.bueno}</span>
                  <Badge variant="outline" className="bg-green-50 text-green-700">
                    {resumen.totalItems > 0 ? Math.round((resumen.itemsPorEstado.bueno / resumen.totalItems) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={resumen.totalItems > 0 ? (resumen.itemsPorEstado.bueno / resumen.totalItems) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  <span className="text-sm">Regular</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{resumen.itemsPorEstado.regular}</span>
                  <Badge variant="outline" className="bg-yellow-50 text-yellow-700">
                    {resumen.totalItems > 0 ? Math.round((resumen.itemsPorEstado.regular / resumen.totalItems) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={resumen.totalItems > 0 ? (resumen.itemsPorEstado.regular / resumen.totalItems) * 100 : 0} 
                className="h-2"
              />
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <span className="text-sm">Malo</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{resumen.itemsPorEstado.malo}</span>
                  <Badge variant="outline" className="bg-red-50 text-red-700">
                    {resumen.totalItems > 0 ? Math.round((resumen.itemsPorEstado.malo / resumen.totalItems) * 100) : 0}%
                  </Badge>
                </div>
              </div>
              <Progress 
                value={resumen.totalItems > 0 ? (resumen.itemsPorEstado.malo / resumen.totalItems) * 100 : 0} 
                className="h-2"
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="w-5 h-5" />
              Condición de Items
            </CardTitle>
            <CardDescription>
              Proporción de items nuevos vs usados
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <span className="text-sm">Nuevos</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{resumen.itemsPorCondicion.nuevo}</span>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    {resumen.totalItems > 0 ? Math.round((resumen.itemsPorCondicion.nuevo / resumen.totalItems) * 100) : 0}%
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-purple-500 rounded-full"></div>
                  <span className="text-sm">Segunda</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">{resumen.itemsPorCondicion.segunda}</span>
                  <Badge variant="outline" className="bg-purple-50 text-purple-700">
                    {resumen.totalItems > 0 ? Math.round((resumen.itemsPorCondicion.segunda / resumen.totalItems) * 100) : 0}%
                  </Badge>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estado de conservación general</span>
                  <span className="font-medium">
                    {porcentajeEstadoBueno.toFixed(0)}% en buen estado
                  </span>
                </div>
                <Progress value={porcentajeEstadoBueno} className="h-2" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Resumen de Mantenimiento */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wrench className="w-5 h-5" />
            Estado de Mantenimiento
          </CardTitle>
          <CardDescription>
            Resumen del estado de mantenimiento de los items
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{resumen.mantenimiento.alDia}</div>
              <p className="text-sm text-muted-foreground">Al día</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{resumen.mantenimiento.pendientes}</div>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{porcentajeMantenimientoAlDia.toFixed(0)}%</div>
              <p className="text-sm text-muted-foreground">Porcentaje al día</p>
            </div>
          </div>
          
          <div className="mt-4">
            <div className="flex justify-between text-sm mb-2">
              <span>Mantenimiento al día</span>
              <span>{porcentajeMantenimientoAlDia.toFixed(1)}%</span>
            </div>
            <Progress value={porcentajeMantenimientoAlDia} className="h-2" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}