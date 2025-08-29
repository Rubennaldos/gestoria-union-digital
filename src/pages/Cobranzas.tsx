import { useState, useEffect } from "react";
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  AlertCircle, 
  Home, 
  Users, 
  FileText, 
  Download, 
  Upload,
  Calendar,
  PlusCircle,
  Receipt
} from "lucide-react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { 
  generarEstadisticas, 
  ejecutarCierreMensual, 
  generarPagosMensuales,
  obtenerPagos,
  obtenerEgresos 
} from "@/services/cobranzas";
import { EstadisticasCobranzas, Pago, Egreso } from "@/types/cobranzas";

const Cobranzas = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [estadisticas, setEstadisticas] = useState<EstadisticasCobranzas | null>(null);
  const [pagos, setPagos] = useState<Pago[]>([]);
  const [egresos, setEgresos] = useState<Egreso[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [stats, pagosList, egresosList] = await Promise.all([
        generarEstadisticas(),
        obtenerPagos(),
        obtenerEgresos()
      ]);
      
      setEstadisticas(stats);
      setPagos(pagosList.slice(0, 10)); // Últimos 10 pagos
      setEgresos(egresosList.slice(0, 10)); // Últimos 10 egresos
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos de cobranzas",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const ejecutarCierre = async () => {
    if (!user) return;
    
    try {
      await ejecutarCierreMensual(user.uid);
      toast({
        title: "Éxito",
        description: "Cierre mensual ejecutado correctamente"
      });
      cargarDatos();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo ejecutar el cierre mensual",
        variant: "destructive"
      });
    }
  };

  const generarPagos = async () => {
    if (!user) return;
    
    const fecha = new Date();
    const mes = fecha.getMonth() + 1;
    const año = fecha.getFullYear();
    
    try {
      await generarPagosMensuales(mes, año, user.uid);
      toast({
        title: "Éxito",
        description: `Pagos generados para ${mes}/${año}`
      });
      cargarDatos();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron generar los pagos",
        variant: "destructive"
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0 flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4 animate-spin" />
          <p className="text-muted-foreground">Cargando datos de cobranzas...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => window.location.href = '/'}
              className="gap-2"
            >
              <Home className="w-4 h-4" />
              Inicio
            </Button>
            <div className="h-6 w-px bg-border" />
            <div>
              <h1 className="text-2xl font-bold text-foreground">Cobranzas</h1>
              <p className="text-muted-foreground">Gestión de pagos y cuotas mensuales</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={generarPagos}>
              <PlusCircle className="h-4 w-4 mr-2" />
              Generar Pagos
            </Button>
            <Button onClick={ejecutarCierre}>
              <Calendar className="h-4 w-4 mr-2" />
              Ejecutar Cierre
            </Button>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="border-success/20 bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-success" />
                <div>
                  <p className="text-sm text-success font-medium">Recaudado</p>
                  <p className="text-xl font-bold text-success">
                    S/ {estadisticas?.totalRecaudado.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-warning/20 bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <CreditCard className="h-5 w-5 text-warning" />
                <div>
                  <p className="text-sm text-warning font-medium">Pendiente</p>
                  <p className="text-xl font-bold text-warning">
                    S/ {estadisticas?.totalPendiente.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-destructive" />
                <div>
                  <p className="text-sm text-destructive font-medium">Morosos</p>
                  <p className="text-xl font-bold text-destructive">
                    {estadisticas?.totalMorosos || 0}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-primary font-medium">Tasa Cobranza</p>
                  <p className="text-xl font-bold text-primary">
                    {estadisticas?.tasaCobranza.toFixed(1) || '0.0'}%
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Acciones Rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <Receipt className="h-6 w-6" />
            <span className="text-sm">Registrar Pago</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <Download className="h-6 w-6" />
            <span className="text-sm">Plantilla Descuento</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <Upload className="h-6 w-6" />
            <span className="text-sm">Subir Sanción</span>
          </Button>
          <Button variant="outline" className="h-auto p-4 flex flex-col space-y-2">
            <FileText className="h-6 w-6" />
            <span className="text-sm">Reportes</span>
          </Button>
        </div>

        {/* Contenido Principal */}
        <Tabs defaultValue="pagos" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="pagos">Pagos Recientes</TabsTrigger>
            <TabsTrigger value="egresos">Egresos</TabsTrigger>
            <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          </TabsList>

          <TabsContent value="pagos">
            <Card>
              <CardHeader>
                <CardTitle>Últimos Pagos Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pagos.length === 0 ? (
                    <div className="text-center py-8">
                      <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay pagos registrados</p>
                      <p className="text-sm text-muted-foreground">
                        Usa "Generar Pagos" para crear los pagos del mes actual
                      </p>
                    </div>
                  ) : (
                    pagos.map((pago) => (
                      <div key={pago.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">Padrón: {pago.numeroPadron}</p>
                          <p className="text-xs text-muted-foreground">
                            {pago.mes}/{pago.año} - Vence: {pago.fechaVencimiento}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant={
                            pago.estado === 'pagado' ? 'default' : 
                            pago.estado === 'moroso' ? 'destructive' : 
                            pago.estado === 'sancionado' ? 'destructive' : 'secondary'
                          }>
                            S/ {pago.monto.toFixed(2)}
                          </Badge>
                          <Badge variant="outline">
                            {pago.estado}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="egresos">
            <Card>
              <CardHeader>
                <CardTitle>Últimos Egresos Registrados</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {egresos.length === 0 ? (
                    <div className="text-center py-8">
                      <CreditCard className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No hay egresos registrados</p>
                    </div>
                  ) : (
                    egresos.map((egreso) => (
                      <div key={egreso.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{egreso.concepto}</p>
                          <p className="text-xs text-muted-foreground">
                            {egreso.fecha} - {egreso.categoria}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Badge variant="destructive">
                            -S/ {egreso.monto.toFixed(2)}
                          </Badge>
                          <Badge variant="outline">
                            {egreso.estado}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="configuracion">
            <Card>
              <CardHeader>
                <CardTitle>Configuración de Cobranzas</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <DollarSign className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Configuración disponible próximamente</p>
                  <p className="text-sm text-muted-foreground">
                    Aquí podrás configurar montos, fechas y porcentajes
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Cobranzas;