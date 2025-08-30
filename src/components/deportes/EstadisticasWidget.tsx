import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { TrendingUp, Users, Clock, MapPin } from "lucide-react";
import { EstadisticasDeportes } from "@/types/deportes";

interface EstadisticasWidgetProps {
  estadisticas: EstadisticasDeportes;
}

export const EstadisticasWidget = ({ estadisticas }: EstadisticasWidgetProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Canchas más usadas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <MapPin className="h-5 w-5" />
            Canchas Más Populares
          </CardTitle>
          <CardDescription>Ranking de canchas por número de reservas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {estadisticas.canchasMasUsadas.slice(0, 5).map((cancha, index) => (
              <div key={cancha.canchaId} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 p-0 flex items-center justify-center">
                    {index + 1}
                  </Badge>
                  <div>
                    <p className="font-medium">{cancha.nombre}</p>
                    <p className="text-sm text-muted-foreground">{cancha.reservas} reservas</p>
                  </div>
                </div>
                <Progress 
                  value={(cancha.reservas / estadisticas.canchasMasUsadas[0].reservas) * 100} 
                  className="w-20"
                />
              </div>
            ))}
            
            {estadisticas.canchasMasUsadas.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay datos de canchas disponibles</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Horarios populares */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5" />
            Horarios Más Solicitados
          </CardTitle>
          <CardDescription>Horas del día con mayor demanda</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {estadisticas.horariosPopulares.slice(0, 8).map((horario, index) => (
              <div key={horario.hora} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-16 text-center">
                    <span className="font-mono text-sm">{horario.hora}</span>
                  </div>
                  <div className="flex-1">
                    <Progress 
                      value={(horario.reservas / estadisticas.horariosPopulares[0].reservas) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div className="w-12 text-right">
                    <span className="text-sm font-medium">{horario.reservas}</span>
                  </div>
                </div>
              </div>
            ))}
            
            {estadisticas.horariosPopulares.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No hay datos de horarios disponibles</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Resumen de rendimiento */}
      <Card className="md:col-span-2">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <TrendingUp className="h-5 w-5" />
            Resumen de Rendimiento
          </CardTitle>
          <CardDescription>Métricas clave del período seleccionado</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{estadisticas.reservasDelMes}</div>
              <p className="text-sm text-muted-foreground">Reservas Totales</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">S/{estadisticas.ingresosTotales.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Ingresos Generados</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{estadisticas.ocupacionPromedio.toFixed(1)}%</div>
              <p className="text-sm text-muted-foreground">Ocupación Promedio</p>
            </div>
            
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">
                S/{estadisticas.reservasDelMes > 0 ? (estadisticas.ingresosTotales / estadisticas.reservasDelMes).toFixed(2) : '0.00'}
              </div>
              <p className="text-sm text-muted-foreground">Ingreso por Reserva</p>
            </div>
          </div>

          <div className="mt-6 pt-6 border-t">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-primary rounded"></div>
                <span className="text-sm">Ingresos</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded"></div>
                <span className="text-sm">Ocupación</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded"></div>
                <span className="text-sm">Promedio por reserva</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};