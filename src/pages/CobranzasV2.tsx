import { useState, useEffect } from "react";
import {
  DollarSign,
  TrendingUp,
  CreditCard,
  AlertCircle,
  Users,
  FileText,
  RefreshCw,
  Settings,
  Play,
  Calendar,
  Receipt,
  UserCheck,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import {
  obtenerConfiguracionV2,
  actualizarConfiguracionV2,
  generarMesActual,
  generarDesdeEnero2025,
  ejecutarCierreMensualV2,
  generarEstadisticasV2,
  obtenerPagosV2,
  obtenerEgresosV2,
  obtenerChargesV2,
  obtenerChargesPorEmpadronadoV2,
  crearEgresoV2,
  registrarPagoV2,
  crearIngresoV2,
  obtenerIngresosV2
} from "@/services/cobranzas-v2";

import { getEmpadronados } from "@/services/empadronados";

import { 
  ConfiguracionCobranzasV2, 
  EstadisticasV2, 
  PagoV2, 
  EgresoV2, 
  ChargeV2 
} from "@/types/cobranzas-v2";
import { Empadronado } from "@/types/empadronados";

export default function CobranzasV2() {
  const { user } = useAuth();
  const { toast } = useToast();

  // Estados principales
  const [estadisticas, setEstadisticas] = useState<EstadisticasV2 | null>(null);
  const [configuracion, setConfiguracion] = useState<ConfiguracionCobranzasV2 | null>(null);
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [pagos, setPagos] = useState<PagoV2[]>([]);
  const [egresos, setEgresos] = useState<EgresoV2[]>([]);
  const [charges, setCharges] = useState<ChargeV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [procesando, setProcesando] = useState(false);

  // Estados para formularios
  const [nuevoEgreso, setNuevoEgreso] = useState({
    concepto: '',
    monto: 0,
    categoria: '',
    metodoPago: 'efectivo',
    numeroOperacion: '',
    observaciones: ''
  });

  const [nuevoPago, setNuevoPago] = useState({
    empadronadoId: '',
    periodo: '',
    monto: 0,
    metodoPago: 'efectivo',
    numeroOperacion: '',
    observaciones: ''
  });

  // Estados de detalles
  const [empadronadoSeleccionado, setEmpadronadoSeleccionado] = useState<string | null>(null);
  const [chargesEmpadronado, setChargesEmpadronado] = useState<ChargeV2[]>([]);

  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    try {
      setLoading(true);
      const [configData, statsData, empadronadosData, pagosData, egresosData, chargesData] = await Promise.all([
        obtenerConfiguracionV2(),
        generarEstadisticasV2(),
        getEmpadronados(),
        obtenerPagosV2(),
        obtenerEgresosV2(),
        obtenerChargesV2()
      ]);

      setConfiguracion(configData);
      setEstadisticas(statsData);
      setEmpadronados(empadronadosData.filter(e => e.habilitado));
      setPagos(pagosData);
      setEgresos(egresosData);
      setCharges(chargesData);
    } catch (error) {
      console.error("Error cargando datos V2:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const actualizarConfig = async () => {
    if (!configuracion) return;
    
    try {
      await actualizarConfiguracionV2(configuracion);
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado correctamente"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive"
      });
    }
  };

  const ejecutarAccion = async (accion: () => Promise<void>, mensaje: string) => {
    try {
      setProcesando(true);
      await accion();
      toast({
        title: "Proceso completado",
        description: mensaje
      });
      await cargarDatos();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error en el proceso",
        variant: "destructive"
      });
    } finally {
      setProcesando(false);
    }
  };

  const calcularDeudaEmpadronado = (empId: string): number => {
    return charges
      .filter(c => c.empadronadoId === empId)
      .reduce((total, charge) => total + charge.saldo, 0);
  };

  const esMoroso = (empId: string): boolean => {
    return charges
      .filter(c => c.empadronadoId === empId)
      .some(c => c.esMoroso);
  };

  const verDetallesEmpadronado = async (empId: string) => {
    try {
      const chargesEmp = await obtenerChargesPorEmpadronadoV2(empId);
      setChargesEmpadronado(chargesEmp);
      setEmpadronadoSeleccionado(empId);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles",
        variant: "destructive"
      });
    }
  };

  const crearEgreso = async () => {
    try {
      await crearEgresoV2({
        ...nuevoEgreso,
        metodoPago: nuevoEgreso.metodoPago as 'efectivo' | 'transferencia' | 'yape' | 'plin',
        fecha: Date.now()
      });
      
      setNuevoEgreso({
        concepto: '',
        monto: 0,
        categoria: '',
        metodoPago: 'efectivo',
        numeroOperacion: '',
        observaciones: ''
      });
      
      toast({
        title: "Egreso registrado",
        description: "El egreso se ha creado correctamente"
      });
      
      await cargarDatos();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el egreso",
        variant: "destructive"
      });
    }
  };

  const formatearMoneda = (monto: number) => `S/ ${monto.toFixed(2)}`;
  const formatearFecha = (timestamp: number) => new Date(timestamp).toLocaleDateString('es-PE');
  const formatearPorcentaje = (valor: number) => `${valor.toFixed(1)}%`;

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex items-center justify-center h-[60vh]">
          <RefreshCw className="h-8 w-8 animate-spin" />
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TopNavigation />
      
      <main className="container mx-auto p-4 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Cobranzas V2 (Mensual)</h1>
            <p className="text-muted-foreground">Sistema de cobranzas mensual con configuración flexible</p>
          </div>
          
          {procesando && (
            <div className="flex items-center gap-2 text-blue-600">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span className="text-sm">Procesando...</span>
            </div>
          )}
        </div>

        {/* KPIs */}
        {estadisticas && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Recaudado del Mes</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatearMoneda(estadisticas.recaudadoMes)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Pendiente Total</CardTitle>
                <AlertCircle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {formatearMoneda(estadisticas.pendienteTotal)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Morosos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {estadisticas.morosos}
                </div>
                <p className="text-xs text-muted-foreground">
                  de {estadisticas.totalEmpadronados} asociados
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Tasa de Cobranza</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatearPorcentaje(estadisticas.tasaCobranza)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {estadisticas.cargosMesPagados} de {estadisticas.cargosMesTotal} cargos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
                <ArrowUpCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatearMoneda(estadisticas.ingresosMes)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Egresos del Mes</CardTitle>
                <ArrowDownCircle className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {formatearMoneda(estadisticas.egresosMes)}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Saldo del Mes</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${estadisticas.saldoMes >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatearMoneda(estadisticas.saldoMes)}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Botones de Acción */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Play className="h-5 w-5" />
              Acciones del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button 
                onClick={() => ejecutarAccion(
                  () => generarDesdeEnero2025(user?.uid || 'sistema'),
                  'Backfill completado desde enero 2025'
                )}
                disabled={procesando}
                variant="default"
              >
                <Calendar className="h-4 w-4 mr-2" />
                Generar Desde Enero 2025
              </Button>

              <Button 
                onClick={() => ejecutarAccion(
                  () => generarMesActual(user?.uid || 'sistema'),
                  'Mes actual generado correctamente'
                )}
                disabled={procesando}
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Generar Mes Actual
              </Button>

              <Button 
                onClick={() => ejecutarAccion(
                  ejecutarCierreMensualV2,
                  'Cierre mensual ejecutado correctamente'
                )}
                disabled={procesando}
                variant="destructive"
              >
                <UserCheck className="h-4 w-4 mr-2" />
                Ejecutar Cierre
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principales */}
        <Tabs defaultValue="asociados" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="asociados">Asociados</TabsTrigger>
            <TabsTrigger value="pagos">Pagos Recientes</TabsTrigger>
            <TabsTrigger value="bandeja">Bandeja Economía</TabsTrigger>
            <TabsTrigger value="egresos">Egresos</TabsTrigger>
            <TabsTrigger value="configuracion">Configuración</TabsTrigger>
          </TabsList>

          {/* Tab Asociados */}
          <TabsContent value="asociados">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Lista de Asociados ({empadronados.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {empadronados.map((emp) => {
                    const deuda = calcularDeudaEmpadronado(emp.id);
                    const moroso = esMoroso(emp.id);
                    
                    return (
                      <div key={emp.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{emp.nombre} {emp.apellidos}</div>
                          <div className="text-sm text-muted-foreground">
                            Padrón: {emp.numeroPadron} | DNI: {emp.dni}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <div className="font-medium">{formatearMoneda(deuda)}</div>
                            <Badge variant={moroso ? "destructive" : "default"}>
                              {moroso ? "Moroso" : "Al día"}
                            </Badge>
                          </div>
                          
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => verDetallesEmpadronado(emp.id)}
                          >
                            Ver Detalles
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Modal de detalles del empadronado */}
            {empadronadoSeleccionado && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Historial de Cargos</span>
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => setEmpadronadoSeleccionado(null)}
                    >
                      Cerrar
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {chargesEmpadronado.map((charge) => (
                      <div key={charge.id} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <div className="font-medium">Período: {charge.periodo}</div>
                          <div className="text-sm text-muted-foreground">
                            Vence: {formatearFecha(charge.fechaVencimiento)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatearMoneda(charge.saldo)}</div>
                          <Badge variant={
                            charge.estado === 'pagado' ? 'default' : 
                            charge.esMoroso ? 'destructive' : 'secondary'
                          }>
                            {charge.estado}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Pagos Recientes */}
          <TabsContent value="pagos">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Receipt className="h-5 w-5" />
                  Pagos Recientes ({pagos.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pagos.slice(0, 20).map((pago) => {
                    const emp = empadronados.find(e => e.id === pago.empadronadoId);
                    
                    return (
                      <div key={pago.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">
                            {emp ? `${emp.nombre} ${emp.apellidos}` : 'Empadronado no encontrado'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Período: {pago.periodo} | {formatearFecha(pago.fechaPago)}
                          </div>
                          {pago.descuentoProntoPago && (
                            <div className="text-xs text-green-600">
                              Descuento pronto pago: {formatearMoneda(pago.descuentoProntoPago)}
                            </div>
                          )}
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium text-green-600">
                            {formatearMoneda(pago.monto)}
                          </div>
                          <Badge variant="outline">
                            {pago.metodoPago}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Bandeja Economía */}
          <TabsContent value="bandeja">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Bandeja Economía
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center p-8 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Funcionalidad de bandeja economía por implementar</p>
                  <p className="text-sm">Similar al módulo actual de cobranzas</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Egresos */}
          <TabsContent value="egresos">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Formulario nuevo egreso */}
              <Card>
                <CardHeader>
                  <CardTitle>Registrar Nuevo Egreso</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="concepto">Concepto</Label>
                    <Input
                      id="concepto"
                      value={nuevoEgreso.concepto}
                      onChange={(e) => setNuevoEgreso(prev => ({...prev, concepto: e.target.value}))}
                      placeholder="Describe el egreso..."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="monto">Monto (S/)</Label>
                    <Input
                      id="monto"
                      type="number"
                      step="0.01"
                      value={nuevoEgreso.monto}
                      onChange={(e) => setNuevoEgreso(prev => ({...prev, monto: parseFloat(e.target.value) || 0}))}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="categoria">Categoría</Label>
                    <Input
                      id="categoria"
                      value={nuevoEgreso.categoria}
                      onChange={(e) => setNuevoEgreso(prev => ({...prev, categoria: e.target.value}))}
                      placeholder="Ej: Mantenimiento, Servicios, etc."
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="metodoPago">Método de Pago</Label>
                    <Select 
                      value={nuevoEgreso.metodoPago} 
                      onValueChange={(value) => setNuevoEgreso(prev => ({...prev, metodoPago: value}))}
                    >
                      <SelectTrigger>
                        <SelectValue />
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
                    <Label htmlFor="numeroOperacion">Número de Operación</Label>
                    <Input
                      id="numeroOperacion"
                      value={nuevoEgreso.numeroOperacion}
                      onChange={(e) => setNuevoEgreso(prev => ({...prev, numeroOperacion: e.target.value}))}
                      placeholder="Opcional"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="observaciones">Observaciones</Label>
                    <Textarea
                      id="observaciones"
                      value={nuevoEgreso.observaciones}
                      onChange={(e) => setNuevoEgreso(prev => ({...prev, observaciones: e.target.value}))}
                      placeholder="Información adicional..."
                    />
                  </div>
                  
                  <Button 
                    onClick={crearEgreso}
                    disabled={!nuevoEgreso.concepto || nuevoEgreso.monto <= 0}
                    className="w-full"
                  >
                    <ArrowDownCircle className="h-4 w-4 mr-2" />
                    Registrar Egreso
                  </Button>
                </CardContent>
              </Card>

              {/* Lista de egresos */}
              <Card>
                <CardHeader>
                  <CardTitle>Egresos Recientes ({egresos.length})</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {egresos.map((egreso) => (
                      <div key={egreso.id} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex-1">
                          <div className="font-medium">{egreso.concepto}</div>
                          <div className="text-sm text-muted-foreground">
                            {egreso.categoria} | {formatearFecha(egreso.fecha)}
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <div className="font-medium text-red-600">
                            -{formatearMoneda(egreso.monto)}
                          </div>
                          <Badge variant="outline">
                            {egreso.metodoPago}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Configuración */}
          <TabsContent value="configuracion">
            {configuracion && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Settings className="h-5 w-5" />
                    Configuración del Sistema
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <Label htmlFor="montoMensual">Monto Mensual (S/)</Label>
                      <Input
                        id="montoMensual"
                        type="number"
                        step="0.01"
                        value={configuracion.montoMensual}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, montoMensual: parseFloat(e.target.value) || 0} : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="diaCierre">Día de Cierre</Label>
                      <Input
                        id="diaCierre"
                        type="number"
                        min="1"
                        max="31"
                        value={configuracion.diaCierre}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, diaCierre: parseInt(e.target.value) || 14} : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="diaVencimiento">Día de Vencimiento</Label>
                      <Input
                        id="diaVencimiento"
                        type="number"
                        min="1"
                        max="31"
                        value={configuracion.diaVencimiento}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, diaVencimiento: parseInt(e.target.value) || 15} : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="diasProntoPago">Días Pronto Pago</Label>
                      <Input
                        id="diasProntoPago"
                        type="number"
                        min="0"
                        value={configuracion.diasProntoPago}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, diasProntoPago: parseInt(e.target.value) || 0} : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="porcentajeProntoPago">% Descuento Pronto Pago</Label>
                      <Input
                        id="porcentajeProntoPago"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={configuracion.porcentajeProntoPago}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, porcentajeProntoPago: parseFloat(e.target.value) || 0} : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="porcentajeMorosidad">% Recargo Morosidad</Label>
                      <Input
                        id="porcentajeMorosidad"
                        type="number"
                        step="0.1"
                        min="0"
                        max="100"
                        value={configuracion.porcentajeMorosidad}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, porcentajeMorosidad: parseFloat(e.target.value) || 0} : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="serieComprobantes">Serie Comprobantes</Label>
                      <Input
                        id="serieComprobantes"
                        value={configuracion.serieComprobantes}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, serieComprobantes: e.target.value} : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="numeroComprobanteActual">Número Comprobante Actual</Label>
                      <Input
                        id="numeroComprobanteActual"
                        type="number"
                        min="1"
                        value={configuracion.numeroComprobanteActual}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, numeroComprobanteActual: parseInt(e.target.value) || 1} : null)}
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="sede">Sede</Label>
                      <Input
                        id="sede"
                        value={configuracion.sede}
                        onChange={(e) => setConfiguracion(prev => prev ? {...prev, sede: e.target.value} : null)}
                      />
                    </div>
                  </div>
                  
                  <Button onClick={actualizarConfig} className="w-full">
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Guardar Configuración
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </main>

      <BottomNavigation />
    </div>
  );
}