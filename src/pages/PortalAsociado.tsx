import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  CreditCard, 
  HelpCircle, 
  ShoppingCart, 
  MessageSquare, 
  Calendar,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign,
  Package,
  Star
} from 'lucide-react';
import { toast } from 'sonner';
import {
  obtenerSeguimientoPagos,
  obtenerResumenDeuda,
  obtenerEventos,
  obtenerEstadisticasPortal
} from '@/services/portal-asociado';
import { obtenerEmpadronadoPorAuthUid } from '@/services/empadronados';
import { SeguimientoPago, ResumenDeuda, Evento, EstadisticasPortal } from '@/types/portal-asociado';
import { Empadronado } from '@/types/empadronados';

export default function PortalAsociado() {
  const { user } = useAuth();
  const [empadronado, setEmpadronado] = useState<Empadronado | null>(null);
  const [pagos, setPagos] = useState<SeguimientoPago[]>([]);
  const [resumenDeuda, setResumenDeuda] = useState<ResumenDeuda | null>(null);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [estadisticas, setEstadisticas] = useState<EstadisticasPortal | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cargarDatos = async () => {
      if (!user?.uid) return;
      
      try {
        // Obtener datos del empadronado
        const empData = await obtenerEmpadronadoPorAuthUid(user.uid);
        if (!empData) {
          toast.error('No se encontró información de empadronado para este usuario');
          return;
        }
        
        setEmpadronado(empData);
        
        // Cargar datos del portal en paralelo
        const [pagosData, resumenData, eventosData, statsData] = await Promise.all([
          obtenerSeguimientoPagos(empData.id),
          obtenerResumenDeuda(empData.id),
          obtenerEventos(),
          obtenerEstadisticasPortal()
        ]);
        
        setPagos(pagosData);
        setResumenDeuda(resumenData);
        setEventos(eventosData);
        setEstadisticas(statsData);
        
      } catch (error) {
        console.error('Error cargando datos del portal:', error);
        toast.error('Error al cargar los datos del portal');
      } finally {
        setLoading(false);
      }
    };

    cargarDatos();
  }, [user?.uid]);

  const formatearFecha = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE');
  };

  const formatearMonto = (monto: number) => {
    return new Intl.NumberFormat('es-PE', {
      style: 'currency',
      currency: 'PEN'
    }).format(monto);
  };

  const getEstadoBadge = (estado: string) => {
    const variants = {
      pendiente: 'secondary',
      pagado: 'default',
      vencido: 'destructive'
    } as const;
    
    return <Badge variant={variants[estado as keyof typeof variants] || 'secondary'}>{estado}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Cargando portal del asociado...</p>
        </div>
      </div>
    );
  }

  if (!empadronado) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-center">Acceso Restringido</CardTitle>
            <CardDescription className="text-center">
              Tu cuenta no está vinculada a un empadronado. Contacta a la administración.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-primary to-primary/80 text-primary-foreground rounded-lg p-6">
        <h1 className="text-2xl font-bold mb-2">
          Portal del Asociado
        </h1>
        <p className="text-lg">
          Bienvenido, {empadronado.nombre} {empadronado.apellidos}
        </p>
        <p className="text-sm opacity-90">
          Padrón: {empadronado.numeroPadron} | Familia: {empadronado.familia}
        </p>
      </div>

      {/* Resumen de Deuda */}
      {resumenDeuda && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deuda Pendiente</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{formatearMonto(resumenDeuda.totalPendiente)}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Deuda Vencida</CardTitle>
              <AlertCircle className="h-4 w-4 text-destructive" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-destructive">
                {formatearMonto(resumenDeuda.totalVencido)}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Próximo Vencimiento</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              {resumenDeuda.proximoVencimiento ? (
                <div>
                  <div className="text-xl font-bold">
                    {formatearMonto(resumenDeuda.proximoVencimiento.monto)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatearFecha(resumenDeuda.proximoVencimiento.fecha)}
                  </p>
                </div>
              ) : (
                <div className="text-sm text-muted-foreground">Sin pagos pendientes</div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Módulos del Portal */}
      <Tabs defaultValue="pagos" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="pagos">
            <CreditCard className="h-4 w-4 mr-2" />
            Pagos
          </TabsTrigger>
          <TabsTrigger value="visitas">
            <Users className="h-4 w-4 mr-2" />
            Visitas
          </TabsTrigger>
          <TabsTrigger value="preguntas">
            <HelpCircle className="h-4 w-4 mr-2" />
            FAQ
          </TabsTrigger>
          <TabsTrigger value="tienda">
            <ShoppingCart className="h-4 w-4 mr-2" />
            Tienda
          </TabsTrigger>
          <TabsTrigger value="sugerencias">
            <MessageSquare className="h-4 w-4 mr-2" />
            Sugerencias
          </TabsTrigger>
          <TabsTrigger value="eventos">
            <Calendar className="h-4 w-4 mr-2" />
            Eventos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Seguimiento de Pagos</CardTitle>
              <CardDescription>
                Historial de tus cuotas y pagos realizados
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pagos.length === 0 ? (
                  <p className="text-center text-muted-foreground py-8">
                    No hay registros de pagos
                  </p>
                ) : (
                  pagos.slice(0, 10).map((pago, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <p className="font-medium">{pago.periodo}</p>
                        <p className="text-sm text-muted-foreground">
                          Vence: {formatearFecha(pago.fechaVencimiento)}
                        </p>
                        {pago.fechaPago && (
                          <p className="text-sm text-muted-foreground">
                            Pagado: {formatearFecha(pago.fechaPago)}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{formatearMonto(pago.monto)}</p>
                        {getEstadoBadge(pago.estado)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="visitas">
          <Card>
            <CardHeader>
              <CardTitle>Registro de Visitas</CardTitle>
              <CardDescription>
                Registra y gestiona las visitas a tu propiedad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Módulo de registro de visitas en desarrollo
                </p>
                <Button>Registrar Nueva Visita</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preguntas">
          <Card>
            <CardHeader>
              <CardTitle>Preguntas Frecuentes</CardTitle>
              <CardDescription>
                Encuentra respuestas a las preguntas más comunes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <HelpCircle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground">
                  Sección de preguntas frecuentes en desarrollo
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tienda">
          <Card>
            <CardHeader>
              <CardTitle>Tienda</CardTitle>
              <CardDescription>
                Productos y servicios disponibles para la comunidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Tienda en línea en desarrollo
                </p>
                <Button>Ver Catálogo</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sugerencias">
          <Card>
            <CardHeader>
              <CardTitle>Sugerencias</CardTitle>
              <CardDescription>
                Envía tus sugerencias, quejas o propuestas de mejora
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-muted-foreground mb-4">
                  Sistema de sugerencias en desarrollo
                </p>
                <Button>Nueva Sugerencia</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="eventos">
          <Card>
            <CardHeader>
              <CardTitle>Eventos</CardTitle>
              <CardDescription>
                Próximos eventos y actividades de la comunidad
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {eventos.length === 0 ? (
                  <div className="text-center py-8">
                    <Calendar className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                    <p className="text-muted-foreground">
                      No hay eventos programados
                    </p>
                  </div>
                ) : (
                  eventos.slice(0, 5).map((evento) => (
                    <div key={evento.id} className="p-4 border rounded-lg">
                      <h4 className="font-medium">{evento.titulo}</h4>
                      <p className="text-sm text-muted-foreground mb-2">
                        {evento.descripcion}
                      </p>
                      <div className="flex items-center justify-between">
                        <div className="text-sm">
                          <p>{formatearFecha(evento.fechaInicio)}</p>
                          <p className="text-muted-foreground">{evento.lugar}</p>
                        </div>
                        <Button size="sm">Ver Detalles</Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}