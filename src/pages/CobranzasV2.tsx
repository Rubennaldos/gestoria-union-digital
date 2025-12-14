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
  Receipt,
  Download,
  ArrowUpCircle,
  ArrowDownCircle,
  CheckCircle2,
  AlertTriangle,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MessageCircle,
  Trash2,
  XCircle,
} from "lucide-react";

import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

import {
  obtenerConfiguracionV2,
  actualizarConfiguracionV2,
  generarEstadisticasV2,
  obtenerPagosV2,
  obtenerEgresosV2,
  obtenerChargesV2,
  obtenerChargesPorEmpadronadoV2,
  crearEgresoV2,
  registrarPagoV2,
  aprobarPagoV2,
  rechazarPagoV2,
  eliminarPagoV2,
  crearIngresoV2,
  obtenerIngresosV2,
  obtenerReporteDeudores,
  verificarYGenerarCargosAutomaticos,
  aprobarPagosMasivosImportacion
} from "@/services/cobranzas-v2";

import { getEmpadronados } from "@/services/empadronados";
import DetalleEmpadronadoModalV2 from "@/components/cobranzas/DetalleEmpadronadoModalV2";
import { RevisarPagoModal } from "@/components/cobranzas/RevisarPagoModal";
import { EnvioWhatsAppMasivoModal } from "@/components/cobranzas/EnvioWhatsAppMasivoModal";
import ImportarPagosMasivosModal from "@/components/cobranzas/ImportarPagosMasivosModal";
import { migrarTodosComprobantesRTDBaStorage } from "@/services/migrarComprobantesRTDBaStorage";

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

  // Modal de revisión de pago
  const [pagoSeleccionado, setPagoSeleccionado] = useState<PagoV2 | null>(null);
  const [showRevisarPagoModal, setShowRevisarPagoModal] = useState(false);

  // Estados para formularios
  const [nuevoEgreso, setNuevoEgreso] = useState({
    concepto: '',
    monto: 0,
    categoria: '',
    metodoPago: 'efectivo',
    numeroOperacion: '',
    observaciones: ''
  });

  // Estados para selección y WhatsApp masivo
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  
  // Modal de importación masiva
  const [showImportarModal, setShowImportarModal] = useState(false);
  
  // Paginación de pagos pendientes
  const [paginaPagosPendientes, setPaginaPagosPendientes] = useState(1);
  const PAGOS_PENDIENTES_POR_PAGINA = 12;

  const [nuevoPago, setNuevoPago] = useState({
    empadronadoId: '',
    periodo: '',
    monto: 0,
    metodoPago: 'efectivo',
    numeroOperacion: '',
    observaciones: ''
  });

  // Estados de detalles
  const [empadronadoSeleccionado, setEmpadronadoSeleccionado] = useState<Empadronado | null>(null);
  const [chargesEmpadronado, setChargesEmpadronado] = useState<ChargeV2[]>([]);
  const [modalDetalleAbierto, setModalDetalleAbierto] = useState(false);

  // Estados de filtros y búsqueda
  const [busquedaTexto, setBusquedaTexto] = useState('');
  const [ordenarPor, setOrdenarPor] = useState<'nombre' | 'padron' | 'deuda' | 'estado'>('nombre');
  const [direccionOrden, setDireccionOrden] = useState<'asc' | 'desc'>('asc');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'morosos' | 'al-dia' | 'con-deuda'>('todos');

  // Migración automática de comprobantes (silenciosa, en segundo plano)
  const verificarYMigrarComprobantes = async (pagos: PagoV2[]) => {
    try {
      // Verificar si hay comprobantes en RTDB que necesiten migración
      const pagosConComprobanteRTDB = pagos.filter(p => 
        p.archivoComprobante && 
        (p.archivoComprobante.includes('cobranzas_v2/comprobantes') || 
         p.archivoComprobante.includes('firebaseio.com')) &&
        !p.archivoComprobante.startsWith('https://firebasestorage')
      );

      if (pagosConComprobanteRTDB.length === 0) {
        // No hay comprobantes para migrar
        return;
      }

      console.log(`🔄 Iniciando migración automática de ${pagosConComprobanteRTDB.length} comprobantes...`);
      
      // Ejecutar migración en segundo plano (sin bloquear UI)
      const resultado = await migrarTodosComprobantesRTDBaStorage();
      
      if (resultado.migrados > 0) {
        console.log(`✅ Migración automática completada: ${resultado.migrados} comprobantes migrados`);
        
        // Notificación silenciosa (solo si hay muchos migrados o errores)
        if (resultado.migrados >= 5 || resultado.errores > 0) {
          toast({
            title: "Migración de comprobantes",
            description: `Se migraron ${resultado.migrados} comprobantes a Storage${resultado.errores > 0 ? ` (${resultado.errores} errores)` : ''}`,
            variant: resultado.errores > 0 ? "default" : "default"
          });
        }
        
        // Recargar datos para reflejar los cambios
        setTimeout(() => {
          cargarDatos();
        }, 1000);
      }
    } catch (error) {
      console.error('Error en migración automática:', error);
      // No mostrar error al usuario, solo log
    }
  };

  useEffect(() => {
    cargarDatosRapido();
  }, []);

  // Carga rápida: primero los datos, luego verificación en segundo plano
  const cargarDatosRapido = async () => {
    try {
      setLoading(true);
      
      // Cargar datos inmediatamente
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
      setLoading(false);
      
      // Verificación automática en SEGUNDO PLANO (no bloquea la UI)
      verificarYGenerarCargosAutomaticos().then(resultado => {
        if (resultado.cargosGenerados > 0 || resultado.cierreEjecutado) {
          toast({
            title: "✅ Sistema actualizado",
            description: resultado.mensaje
          });
          // Recargar datos si hubo cambios
          recargarDatos();
        }
      }).catch(err => console.error("Error en verificación automática:", err));

      // Migración automática de comprobantes en segundo plano
      verificarYMigrarComprobantes(pagosData);
      
    } catch (error) {
      console.error("Error cargando datos V2:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
      setLoading(false);
    }
  };

  // Recarga silenciosa de datos
  const recargarDatos = async () => {
    try {
      const [statsData, chargesData] = await Promise.all([
        generarEstadisticasV2(),
        obtenerChargesV2()
      ]);
      setEstadisticas(statsData);
      setCharges(chargesData);
    } catch (error) {
      console.error("Error recargando datos:", error);
    }
  };

  // Función para recargar manualmente
  const cargarDatos = async () => {
    await cargarDatosRapido();
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

  // Verificar si un cargo está cubierto (considerando pagos pendientes y aprobados)
  // Esto es consistente con la lógica de Balances.tsx
  const estaCargoCubierto = (charge: ChargeV2): boolean => {
    // Si el saldo es 0, ya está pagado
    if (charge.saldo <= 0) return true;
    
    // Buscar pagos para este cargo que estén pendientes o aprobados
    const pagosDelCargo = pagos.filter(p => 
      p.chargeId === charge.id && 
      (p.estado === 'aprobado' || p.estado === 'pendiente')
    );
    
    // Sumar los montos de los pagos
    const totalPagado = pagosDelCargo.reduce((sum, p) => sum + p.monto, 0);
    
    // Está cubierto si los pagos cubren el monto original
    return totalPagado >= charge.montoOriginal;
  };

  // Calcular deuda real: SOLO cargos vencidos que NO están cubiertos por pagos
  const calcularDeudaEmpadronado = (empId: string): number => {
    const ahora = Date.now();
    return charges
      .filter(c => c.empadronadoId === empId && ahora > c.fechaVencimiento && !estaCargoCubierto(c))
      .reduce((total, charge) => {
        // Calcular deuda real: monto original menos pagos pendientes/aprobados
        const pagosDelCargo = pagos.filter(p => 
          p.chargeId === charge.id && 
          (p.estado === 'aprobado' || p.estado === 'pendiente')
        );
        const totalPagado = pagosDelCargo.reduce((sum, p) => sum + p.monto, 0);
        return total + Math.max(0, charge.montoOriginal - totalPagado);
      }, 0);
  };

  // Contar meses de deuda vencida (que no están cubiertos por pagos)
  const contarMesesDeuda = (empId: string): number => {
    const ahora = Date.now();
    return charges
      .filter(c => c.empadronadoId === empId && ahora > c.fechaVencimiento && !estaCargoCubierto(c))
      .length;
  };

  // Clasificación por meses de deuda:
  // 0 = Al día, 1 = Atrasado, 2 = Moroso, 3+ = Deudor
  const obtenerEstadoDeuda = (empId: string): { 
    estado: 'al-dia' | 'atrasado' | 'moroso' | 'deudor';
    label: string;
    meses: number;
  } => {
    const meses = contarMesesDeuda(empId);
    if (meses === 0) return { estado: 'al-dia', label: 'Al día', meses };
    if (meses === 1) return { estado: 'atrasado', label: 'Atrasado', meses };
    if (meses === 2) return { estado: 'moroso', label: 'Moroso', meses };
    return { estado: 'deudor', label: 'Deudor', meses };
  };

  // Para filtros (mantener compatibilidad)
  const esMoroso = (empId: string): boolean => {
    return contarMesesDeuda(empId) >= 2;
  };

  const verDetallesEmpadronado = async (empId: string) => {
    try {
      const chargesEmp = await obtenerChargesPorEmpadronadoV2(empId);
      const empadronado = empadronados.find(e => e.id === empId);
      if (empadronado) {
        setChargesEmpadronado(chargesEmp);
        setEmpadronadoSeleccionado(empadronado);
        setModalDetalleAbierto(true);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los detalles",
        variant: "destructive"
      });
    }
  };

  const handleAprobarPago = async (comentario: string) => {
    if (!pagoSeleccionado) return;
    
    try {
      // Obtener nombre del usuario que aprueba
      const nombreAprobador = user?.displayName || user?.email || 'Usuario';
      
      await aprobarPagoV2(
        pagoSeleccionado.id, 
        comentario,
        user?.uid,
        nombreAprobador
      );
      
      toast({
        title: "✅ Pago aprobado",
        description: "El pago ha sido aprobado exitosamente",
      });
      
      setShowRevisarPagoModal(false);
      setPagoSeleccionado(null);
      await cargarDatos();
    } catch (error) {
      console.error('Error aprobando pago:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo aprobar el pago",
        variant: "destructive"
      });
    }
  };

  const handleRechazarPago = async (motivo: string) => {
    if (!pagoSeleccionado) return;
    
    try {
      await rechazarPagoV2(pagoSeleccionado.id, motivo);
      
      toast({
        title: "❌ Pago rechazado",
        description: "El pago ha sido rechazado",
      });
      
      setShowRevisarPagoModal(false);
      setPagoSeleccionado(null);
      await cargarDatos();
    } catch (error) {
      console.error('Error rechazando pago:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo rechazar el pago",
        variant: "destructive"
      });
    }
  };


  const registrarPagoModal = async (chargeId: string, monto: number, metodoPago: string, fechaPagoRegistrada: number, numeroOperacion?: string, observaciones?: string, archivoComprobante?: string) => {
    try {
      // Manejar pago múltiple (chargeIds separados por coma)
      const chargeIds = chargeId.split(',').map(id => id.trim()).filter(id => id);
      
      if (chargeIds.length > 1) {
        // Pago conjunto: distribuir el monto entre los cargos
        // Nota: El comprobante solo se asocia al primer cargo en pagos múltiples
        const montoPorCargo = monto / chargeIds.length;
        
        for (let i = 0; i < chargeIds.length; i++) {
          const cId = chargeIds[i];
          // Solo asociar el comprobante al primer cargo
          await registrarPagoV2(cId, montoPorCargo, metodoPago, fechaPagoRegistrada, i === 0 ? archivoComprobante : undefined, numeroOperacion, observaciones);
        }
      } else {
        // Pago individual
        await registrarPagoV2(chargeId, monto, metodoPago, fechaPagoRegistrada, archivoComprobante, numeroOperacion, observaciones);
      }
      
      toast({
        title: "Pago registrado",
        description: chargeIds.length > 1 
          ? `Se registraron ${chargeIds.length} pagos correctamente`
          : "El pago se ha registrado correctamente"
      });
      
      // Recargar datos
      await cargarDatos();
      
      // Actualizar charges del empadronado seleccionado
      if (empadronadoSeleccionado) {
        const chargesEmp = await obtenerChargesPorEmpadronadoV2(empadronadoSeleccionado.id);
        setChargesEmpadronado(chargesEmp);
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el pago",
        variant: "destructive"
      });
      throw error;
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

  // Función para filtrar y ordenar empadronados
  const empadronadosFiltrados = empadronados.filter((emp) => {
    const deuda = calcularDeudaEmpadronado(emp.id);
    const moroso = esMoroso(emp.id);
    
    // Filtro por texto de búsqueda (inteligente para números de padrón)
    const termino = busquedaTexto.toLowerCase().trim();
    let cumpleBusqueda = termino === '';
    
    if (!cumpleBusqueda) {
      // Si busca solo números, también buscar en el número de padrón sin prefijo
      const esNumero = /^\d+$/.test(termino);
      const numeroLimpio = parseInt(termino, 10);
      
      if (esNumero && !isNaN(numeroLimpio)) {
        const numPadron = parseInt((emp.numeroPadron || '').replace(/\D/g, '') || '0', 10);
        if (numPadron === numeroLimpio) cumpleBusqueda = true;
      }
      
      // Búsqueda normal por texto
      if (!cumpleBusqueda) {
        const textoCompleto = `${emp.nombre} ${emp.apellidos} ${emp.numeroPadron} ${emp.dni}`.toLowerCase();
        cumpleBusqueda = textoCompleto.includes(termino);
      }
    }
    
    // Filtro por estado
    let cumpleEstado = true;
    switch (filtroEstado) {
      case 'morosos':
        cumpleEstado = moroso;
        break;
      case 'al-dia':
        cumpleEstado = !moroso && deuda === 0;
        break;
      case 'con-deuda':
        cumpleEstado = deuda > 0;
        break;
      default:
        cumpleEstado = true;
    }
    
    return cumpleBusqueda && cumpleEstado;
  }).sort((a, b) => {
    let resultado = 0;
    
    switch (ordenarPor) {
      case 'nombre':
        resultado = `${a.nombre} ${a.apellidos}`.localeCompare(`${b.nombre} ${b.apellidos}`);
        break;
      case 'padron':
        // Ordenar numéricamente extrayendo el número del padrón
        const numA = parseInt((a.numeroPadron || '').replace(/\D/g, '') || '0', 10);
        const numB = parseInt((b.numeroPadron || '').replace(/\D/g, '') || '0', 10);
        resultado = numA - numB;
        break;
      case 'deuda':
        const deudaA = calcularDeudaEmpadronado(a.id);
        const deudaB = calcularDeudaEmpadronado(b.id);
        resultado = deudaA - deudaB;
        break;
      case 'estado':
        const morosoA = esMoroso(a.id);
        const morosoB = esMoroso(b.id);
        if (morosoA && !morosoB) resultado = -1;
        else if (!morosoA && morosoB) resultado = 1;
        else resultado = calcularDeudaEmpadronado(b.id) - calcularDeudaEmpadronado(a.id);
        break;
    }
    
    return direccionOrden === 'asc' ? resultado : -resultado;
  });

  const cambiarOrden = (nuevoOrden: typeof ordenarPor) => {
    if (ordenarPor === nuevoOrden) {
      setDireccionOrden(direccionOrden === 'asc' ? 'desc' : 'asc');
    } else {
      setOrdenarPor(nuevoOrden);
      setDireccionOrden('asc');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <TopNavigation />
        <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
          {/* Spinner con animación */}
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 animate-ping" />
            <RefreshCw className="h-12 w-12 text-primary animate-spin relative z-10" />
          </div>
          <p className="text-lg font-medium animate-pulse">Cargando cobranzas...</p>
          <p className="text-sm text-muted-foreground">Preparando datos del sistema</p>
          {/* Puntos animados */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      
      <main className="container mx-auto px-3 md:px-6 py-4 space-y-4 md:space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 md:gap-4">
            <BackButton fallbackTo="/" />
            <div className="h-4 md:h-6 w-px bg-border" />
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
                  Cobranzas V2
                </h1>
                {procesando && (
                  <div className="flex items-center gap-1.5 text-primary">
                    <RefreshCw className="h-3.5 w-3.5 md:h-4 md:w-4 animate-spin" />
                    <span className="text-xs md:text-sm font-medium">Procesando...</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] md:text-sm text-muted-foreground">
                Sistema de cobranzas mensual
              </p>
            </div>
          </div>
        </div>

        {/* KPIs - Compact Mobile Design */}
        {estadisticas && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-4">
            <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-all duration-300 animate-fade-in">
              <CardHeader className="p-3 md:p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Recaudado
                  </CardTitle>
                  <div className="p-1.5 md:p-2 rounded-full bg-green-500/10">
                    <ArrowUpCircle className="h-3 w-3 md:h-4 md:w-4 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-base md:text-2xl font-bold text-green-600">
                  {formatearMoneda(estadisticas.recaudadoMes)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500 hover:shadow-lg transition-all duration-300 animate-fade-in" style={{animationDelay: '0.1s'}}>
              <CardHeader className="p-3 md:p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Pendiente
                  </CardTitle>
                  <div className="p-1.5 md:p-2 rounded-full bg-orange-500/10">
                    <AlertCircle className="h-3 w-3 md:h-4 md:w-4 text-orange-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-base md:text-2xl font-bold text-orange-600">
                  {formatearMoneda(estadisticas.pendienteTotal)}
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-red-500 hover:shadow-lg transition-all duration-300 animate-fade-in" style={{animationDelay: '0.2s'}}>
              <CardHeader className="p-3 md:p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Morosos
                  </CardTitle>
                  <div className="p-1.5 md:p-2 rounded-full bg-red-500/10">
                    <AlertTriangle className="h-3 w-3 md:h-4 md:w-4 text-red-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-base md:text-2xl font-bold text-red-600">
                  {estadisticas.morosos}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                  de {estadisticas.totalEmpadronados} asociados
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-300 animate-fade-in" style={{animationDelay: '0.3s'}}>
              <CardHeader className="p-3 md:p-4 pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-[10px] md:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Tasa
                  </CardTitle>
                  <div className="p-1.5 md:p-2 rounded-full bg-blue-500/10">
                    <TrendingUp className="h-3 w-3 md:h-4 md:w-4 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-3 md:p-4 pt-0">
                <div className="text-base md:text-2xl font-bold text-blue-600">
                  {formatearPorcentaje(estadisticas.tasaCobranza)}
                </div>
                <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">
                  {estadisticas.cargosMesPagados} de {estadisticas.cargosMesTotal} cargos
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Acciones Rápidas - Simplificado */}
        <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
          <CardHeader className="p-3 md:p-4 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="flex items-center justify-between text-sm md:text-base">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-green-500/10">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <span>Sistema Automático</span>
              </div>
              <span className="text-xs font-normal text-muted-foreground">
                Los cargos y cierres se generan automáticamente
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-wrap gap-2">
              <Button 
                onClick={async () => {
                  try {
                    const reporte = await obtenerReporteDeudores();
                    
                    if (reporte.length === 0) {
                      toast({
                        title: "Sin deudores",
                        description: "No hay empadronados con deudas pendientes"
                      });
                      return;
                    }

                    // Crear CSV del reporte
                    const csvHeaders = "Nombre,Apellidos,Padron,Deuda Total,Periodos Vencidos,Estado\n";
                    const csvData = reporte.map(item => 
                      `"${item.nombre}","${item.apellidos}","${item.numeroPadron}","${item.deudaTotal.toFixed(2)}","${item.periodosVencidos.join(', ')}","${item.esMoroso ? 'Moroso' : 'Pendiente'}"`
                    ).join('\n');

                    const blob = new Blob([csvHeaders + csvData], { type: 'text/csv' });
                    const url = window.URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `reporte_deudores_${new Date().toISOString().split('T')[0]}.csv`;
                    a.click();
                    window.URL.revokeObjectURL(url);

                    toast({
                      title: "Reporte generado",
                      description: `Se encontraron ${reporte.length} deudores`
                    });
                  } catch (error) {
                    toast({
                      title: "Error",
                      description: "Error generando el reporte",
                      variant: "destructive"
                    });
                  }
                }}
                disabled={procesando}
                variant="secondary"
                size="sm"
                className="justify-start gap-2 h-auto py-2.5 px-3 hover:scale-105 transition-transform"
              >
                <Download className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Exportar</span>
              </Button>

              <Button 
                onClick={() => setShowImportarModal(true)}
                disabled={procesando}
                variant="default"
                size="sm"
                className="justify-start gap-2 h-auto py-2.5 px-3 hover:scale-105 transition-transform bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                <FileText className="h-3.5 w-3.5 md:h-4 md:w-4" />
                <span className="text-xs md:text-sm">Importar Excel</span>
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Tabs principales - Mobile Optimized */}
        <Tabs defaultValue="asociados" className="space-y-3 md:space-y-4">
          <TabsList className="flex w-full h-auto p-1 gap-1 bg-muted/60 rounded-xl overflow-x-auto">
            <TabsTrigger 
              value="asociados" 
              className="flex-1 min-w-0 flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[9px] md:text-sm py-2.5 px-2 md:px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
            >
              <Users className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
              <span className="truncate">Asociados</span>
            </TabsTrigger>
            <TabsTrigger 
              value="pagos" 
              className="flex-1 min-w-0 flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[9px] md:text-sm py-2.5 px-2 md:px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
            >
              <CreditCard className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
              <span className="truncate">Pagos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="bandeja" 
              className="flex-1 min-w-0 flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[9px] md:text-sm py-2.5 px-2 md:px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
            >
              <FileText className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
              <span className="truncate">Bandeja</span>
            </TabsTrigger>
            <TabsTrigger 
              value="egresos" 
              className="flex-1 min-w-0 flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[9px] md:text-sm py-2.5 px-2 md:px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
            >
              <ArrowDownCircle className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
              <span className="truncate">Egresos</span>
            </TabsTrigger>
            <TabsTrigger 
              value="configuracion" 
              className="flex-1 min-w-0 flex flex-col md:flex-row items-center justify-center gap-0.5 md:gap-2 text-[9px] md:text-sm py-2.5 px-2 md:px-4 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:shadow-md transition-all duration-200"
            >
              <Settings className="h-4 w-4 md:h-4 md:w-4 shrink-0" />
              <span className="truncate">Config</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Asociados */}
          <TabsContent value="asociados">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Lista de Asociados ({empadronadosFiltrados.length} de {empadronados.length})
                  </CardTitle>
                  
                  {seleccionados.size > 0 && (
                    <Button
                      onClick={() => setShowWhatsAppModal(true)}
                      className="flex items-center gap-2"
                    >
                      <MessageCircle className="h-4 w-4" />
                      Enviar WhatsApp Masivo ({seleccionados.size})
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Controles de búsqueda y filtros */}
                <div className="space-y-4 mb-6">
                  {/* Búsqueda inteligente */}
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Buscar por nombre, apellido, padrón o DNI..."
                      value={busquedaTexto}
                      onChange={(e) => setBusquedaTexto(e.target.value)}
                      className="pl-10"
                    />
                  </div>

                  {/* Selección masiva */}
                  <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
                    <Checkbox
                      id="select-all"
                      checked={empadronadosFiltrados.length > 0 && seleccionados.size === empadronadosFiltrados.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          setSeleccionados(new Set(empadronadosFiltrados.map(e => e.id)));
                        } else {
                          setSeleccionados(new Set());
                        }
                      }}
                    />
                    <Label htmlFor="select-all" className="font-medium cursor-pointer">
                      Seleccionar todos ({empadronadosFiltrados.length})
                    </Label>
                    {seleccionados.size > 0 && (
                      <Badge variant="secondary">
                        {seleccionados.size} seleccionado(s)
                      </Badge>
                    )}
                  </div>

                  {/* Filtros y ordenación */}
                  <div className="flex flex-wrap gap-3">
                    {/* Filtro por estado */}
                    <div className="flex items-center gap-2">
                      <Filter className="h-4 w-4 text-muted-foreground" />
                      <Select value={filtroEstado} onValueChange={(value: any) => setFiltroEstado(value)}>
                        <SelectTrigger className="w-[140px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="todos">Todos</SelectItem>
                          <SelectItem value="morosos">Morosos</SelectItem>
                          <SelectItem value="con-deuda">Con Deuda</SelectItem>
                          <SelectItem value="al-dia">Al Día</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Botones de ordenación */}
                    <div className="flex gap-1">
                      <Button
                        variant={ordenarPor === 'nombre' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => cambiarOrden('nombre')}
                        className="flex items-center gap-1"
                      >
                        Nombre
                        {ordenarPor === 'nombre' && (
                          direccionOrden === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant={ordenarPor === 'padron' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => cambiarOrden('padron')}
                        className="flex items-center gap-1"
                      >
                        Padrón
                        {ordenarPor === 'padron' && (
                          direccionOrden === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant={ordenarPor === 'deuda' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => cambiarOrden('deuda')}
                        className="flex items-center gap-1"
                      >
                        Deuda
                        {ordenarPor === 'deuda' && (
                          direccionOrden === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                        )}
                      </Button>
                      
                      <Button
                        variant={ordenarPor === 'estado' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => cambiarOrden('estado')}
                        className="flex items-center gap-1"
                      >
                        Estado
                        {ordenarPor === 'estado' && (
                          direccionOrden === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Lista de asociados filtrada */}
                <div className="space-y-3">
                  {empadronadosFiltrados.length === 0 ? (
                    <div className="text-center p-8 text-muted-foreground">
                      <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No se encontraron asociados con los filtros aplicados</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setBusquedaTexto('');
                          setFiltroEstado('todos');
                          setOrdenarPor('nombre');
                          setDireccionOrden('asc');
                        }}
                      >
                        Limpiar filtros
                      </Button>
                    </div>
                  ) : (
                    empadronadosFiltrados.map((emp) => {
                      const deuda = calcularDeudaEmpadronado(emp.id);
                      const estadoDeuda = obtenerEstadoDeuda(emp.id);
                      const isSelected = seleccionados.has(emp.id);
                      
                      // Colores según estado
                      const badgeStyles = {
                        'al-dia': 'bg-green-100 text-green-700 border-green-300',
                        'atrasado': 'bg-orange-100 text-orange-700 border-orange-300',
                        'moroso': 'bg-red-100 text-red-700 border-red-300',
                        'deudor': 'bg-red-200 text-red-900 border-red-500 font-bold'
                      };
                      
                      return (
                        <div key={emp.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors">
                          <Checkbox
                            id={`select-${emp.id}`}
                            checked={isSelected}
                            onCheckedChange={(checked) => {
                              const newSeleccionados = new Set(seleccionados);
                              if (checked) {
                                newSeleccionados.add(emp.id);
                              } else {
                                newSeleccionados.delete(emp.id);
                              }
                              setSeleccionados(newSeleccionados);
                            }}
                          />
                          
                          <div className="flex-1">
                            <div className="font-medium">{emp.nombre} {emp.apellidos}</div>
                            <div className="text-sm text-muted-foreground">
                              Padrón: {emp.numeroPadron} | DNI: {emp.dni}
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <div className="text-right">
                              <div className={`font-medium ${deuda > 0 ? 'text-destructive' : 'text-green-600'}`}>
                                {formatearMoneda(deuda)}
                              </div>
                              <Badge className={badgeStyles[estadoDeuda.estado]}>
                                {estadoDeuda.label}
                                {estadoDeuda.meses > 0 && ` (${estadoDeuda.meses}m)`}
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
                    })
                  )}
                </div>
              </CardContent>
            </Card>

          </TabsContent>

          {/* Tab Pagos Recientes */}
          <TabsContent value="pagos">
            <div className="space-y-6">
              {/* Formulario de registro de pagos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Registrar Nuevo Pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="empadronado-pago">Empadronado</Label>
                      <Select
                        value={nuevoPago.empadronadoId}
                        onValueChange={(value) => setNuevoPago({...nuevoPago, empadronadoId: value})}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar empadronado" />
                        </SelectTrigger>
                        <SelectContent>
                          {empadronados.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.nombre} {emp.apellidos} ({emp.numeroPadron})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="periodo-pago">Período (YYYYMM)</Label>
                      <Input
                        id="periodo-pago"
                        placeholder="202501"
                        value={nuevoPago.periodo}
                        onChange={(e) => setNuevoPago({...nuevoPago, periodo: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="monto-pago">Monto</Label>
                      <Input
                        id="monto-pago"
                        type="number"
                        step="0.01"
                        value={nuevoPago.monto}
                        onChange={(e) => setNuevoPago({...nuevoPago, monto: parseFloat(e.target.value) || 0})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="metodo-pago">Método de Pago</Label>
                      <Select
                        value={nuevoPago.metodoPago}
                        onValueChange={(value) => setNuevoPago({...nuevoPago, metodoPago: value})}
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
                      <Label htmlFor="numero-operacion">Número de Operación</Label>
                      <Input
                        id="numero-operacion"
                        placeholder="Opcional"
                        value={nuevoPago.numeroOperacion}
                        onChange={(e) => setNuevoPago({...nuevoPago, numeroOperacion: e.target.value})}
                      />
                    </div>

                    <div>
                      <Label htmlFor="observaciones-pago">Observaciones</Label>
                      <Input
                        id="observaciones-pago"
                        placeholder="Opcional"
                        value={nuevoPago.observaciones}
                        onChange={(e) => setNuevoPago({...nuevoPago, observaciones: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="mt-4">
                    <Button onClick={async () => {
                      if (!nuevoPago.empadronadoId || !nuevoPago.periodo || nuevoPago.monto <= 0) {
                        toast({
                          title: "Error",
                          description: "Complete todos los campos requeridos",
                          variant: "destructive"
                        });
                        return;
                      }

                      try {
                        // Buscar el cargo correspondiente
                        const chargesEmp = await obtenerChargesPorEmpadronadoV2(nuevoPago.empadronadoId);
                        const cargo = chargesEmp.find(c => c.periodo === nuevoPago.periodo);
                        
                        if (!cargo) {
                          toast({
                            title: "Error",
                            description: "No se encontró cargo para este período",
                            variant: "destructive"
                          });
                          return;
                        }

                        await registrarPagoV2(
                          cargo.id,
                          nuevoPago.monto,
                          nuevoPago.metodoPago,
                          Date.now(),
                          undefined,
                          nuevoPago.numeroOperacion || undefined,
                          nuevoPago.observaciones || undefined
                        );

                        setNuevoPago({
                          empadronadoId: '',
                          periodo: '',
                          monto: 0,
                          metodoPago: 'efectivo',
                          numeroOperacion: '',
                          observaciones: ''
                        });

                        toast({
                          title: "Pago registrado",
                          description: "El pago se ha registrado correctamente"
                        });

                        await cargarDatos();
                      } catch (error: any) {
                        toast({
                          title: "Error",
                          description: error.message || "Error registrando el pago",
                          variant: "destructive"
                        });
                      }
                    }} disabled={procesando}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Registrar Pago
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Sección de Pagos Pendientes de Aprobar */}
              {(() => {
                const pagosPendientes = pagos.filter(p => p.estado === 'pendiente');
                const totalPaginas = Math.ceil(pagosPendientes.length / PAGOS_PENDIENTES_POR_PAGINA);
                const pagosPaginados = pagosPendientes.slice(
                  (paginaPagosPendientes - 1) * PAGOS_PENDIENTES_POR_PAGINA,
                  paginaPagosPendientes * PAGOS_PENDIENTES_POR_PAGINA
                );
                
                if (pagosPendientes.length === 0) return null;
                
                return (
                <Card className="border-amber-200 bg-amber-50/50">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3 md:justify-between">
                      <CardTitle className="flex items-center gap-2 text-amber-800">
                        <AlertTriangle className="h-5 w-5" />
                        Pagos Pendientes de Aprobar ({pagosPendientes.length})
                      </CardTitle>
                      
                      <div className="flex flex-wrap gap-2">
                        {/* Botón para aprobar TODAS las pendientes */}
                        <Button
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                          onClick={async () => {
                            if (!window.confirm(`¿Aprobar TODOS los ${pagosPendientes.length} pagos pendientes?`)) {
                              return;
                            }
                            
                            try {
                              setProcesando(true);
                              toast({ title: "Procesando...", description: `Aprobando ${pagosPendientes.length} pagos...` });
                              
                              const nombreAprobador = user?.displayName || user?.email || 'Usuario';
                              let aprobados = 0;
                              let errores = 0;
                              
                              for (const pago of pagosPendientes) {
                                try {
                                  await aprobarPagoV2(pago.id, "", user?.uid, nombreAprobador);
                                  aprobados++;
                                } catch (e) {
                                  errores++;
                                }
                              }
                              
                              toast({
                                title: "✅ Aprobación masiva completada",
                                description: `${aprobados} pagos aprobados, ${errores} errores`
                              });
                              
                              setPaginaPagosPendientes(1);
                              await cargarDatos();
                            } catch (error) {
                              toast({
                                title: "Error",
                                description: "Error en la aprobación masiva",
                                variant: "destructive"
                              });
                            } finally {
                              setProcesando(false);
                            }
                          }}
                          disabled={procesando}
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Aprobar Todas ({pagosPendientes.length})
                        </Button>
                        
                        {/* Botón para aprobar masivamente pagos de importación */}
                        {pagos.filter(p => p.estado === 'pendiente' && (p.metodoPago === 'importacion_masiva' || p.numeroOperacion?.startsWith('IMPORT-'))).length > 0 && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-green-300 text-green-700 hover:bg-green-50"
                            onClick={async () => {
                              const pagosImportacion = pagos.filter(p => 
                                p.estado === 'pendiente' && 
                                (p.metodoPago === 'importacion_masiva' || p.numeroOperacion?.startsWith('IMPORT-'))
                              ).length;
                              
                              if (!window.confirm(`¿Aprobar automáticamente ${pagosImportacion} pagos de importación masiva?`)) {
                                return;
                              }
                              
                              try {
                                setProcesando(true);
                                toast({ title: "Procesando...", description: "Aprobando pagos de importación masiva..." });
                                
                                const resultado = await aprobarPagosMasivosImportacion((procesados, total) => {});
                                
                                toast({
                                  title: "✅ Aprobación masiva completada",
                                  description: `${resultado.aprobados} pagos aprobados, ${resultado.errores} errores`
                                });
                                
                                setPaginaPagosPendientes(1);
                                await cargarDatos();
                              } catch (error) {
                                toast({
                                  title: "Error",
                                  description: "Error en la aprobación masiva",
                                  variant: "destructive"
                                });
                              } finally {
                                setProcesando(false);
                              }
                            }}
                            disabled={procesando}
                          >
                            <FileText className="h-4 w-4 mr-1" />
                            Solo Importación ({pagos.filter(p => p.estado === 'pendiente' && (p.metodoPago === 'importacion_masiva' || p.numeroOperacion?.startsWith('IMPORT-'))).length})
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {pagosPaginados.map((pago) => {
                        const emp = empadronados.find(e => e.id === pago.empadronadoId);
                        
                        return (
                          <div 
                            key={pago.id} 
                            className="p-3 bg-white rounded-lg border border-amber-200 shadow-sm"
                          >
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1 min-w-0">
                                <div className="font-medium text-sm truncate">
                                  {emp ? `${emp.nombre} ${emp.apellidos}` : 'No encontrado'}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {emp?.numeroPadron} • {pago.periodo}
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="font-bold text-amber-700">
                                  {formatearMoneda(pago.monto)}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  {formatearFecha(pago.fechaPagoRegistrada)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex gap-1.5">
                              <Button
                                size="sm"
                                variant="outline"
                                className="flex-1 h-7 text-xs"
                                onClick={() => {
                                  setPagoSeleccionado(pago);
                                  setShowRevisarPagoModal(true);
                                }}
                              >
                                <FileText className="h-3 w-3 mr-1" />
                                Detalle
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-green-600 border-green-300 hover:bg-green-50"
                                onClick={async () => {
                                  try {
                                    const nombreAprobador = user?.displayName || user?.email || 'Usuario';
                                    await aprobarPagoV2(pago.id, "", user?.uid, nombreAprobador);
                                    toast({ title: "✅ Pago aprobado" });
                                    await cargarDatos();
                                  } catch (error) {
                                    toast({ title: "Error", description: "No se pudo aprobar", variant: "destructive" });
                                  }
                                }}
                              >
                                <CheckCircle2 className="h-3 w-3" />
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs text-red-600 border-red-300 hover:bg-red-50"
                                onClick={() => {
                                  setPagoSeleccionado(pago);
                                  setShowRevisarPagoModal(true);
                                }}
                              >
                                <XCircle className="h-3 w-3" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    {/* Paginación */}
                    {totalPaginas > 1 && (
                      <div className="flex items-center justify-center gap-2 mt-4 pt-4 border-t">
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={paginaPagosPendientes === 1}
                          onClick={() => setPaginaPagosPendientes(p => p - 1)}
                        >
                          Anterior
                        </Button>
                        
                        <div className="flex gap-1">
                          {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((pagina) => (
                            <Button
                              key={pagina}
                              size="sm"
                              variant={pagina === paginaPagosPendientes ? "default" : "outline"}
                              className="w-8 h-8 p-0"
                              onClick={() => setPaginaPagosPendientes(pagina)}
                            >
                              {pagina}
                            </Button>
                          ))}
                        </div>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={paginaPagosPendientes === totalPaginas}
                          onClick={() => setPaginaPagosPendientes(p => p + 1)}
                        >
                          Siguiente
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
                );
              })()}

              {/* Lista de pagos recientes */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Pagos Recientes ({pagos.length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {pagos.slice(0, 20).map((pago) => {
                      const emp = empadronados.find(e => e.id === pago.empadronadoId);
                      
                      const getBadgeEstado = () => {
                        switch (pago.estado) {
                          case 'aprobado':
                            return <Badge className="bg-green-600">Aprobado</Badge>;
                          case 'rechazado':
                            return <Badge variant="destructive">Rechazado</Badge>;
                          default:
                            return <Badge variant="secondary">Pendiente</Badge>;
                        }
                      };
                      
                      return (
                        <div 
                          key={pago.id} 
                          className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex-1">
                            <div className="font-medium">
                              {emp ? `${emp.nombre} ${emp.apellidos}` : 'Empadronado no encontrado'}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              Período: {pago.periodo} | {formatearFecha(pago.fechaPagoRegistrada)}
                            </div>
                            {pago.descuentoProntoPago && (
                              <div className="text-xs text-green-600">
                                Descuento pronto pago: {formatearMoneda(pago.descuentoProntoPago)}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right flex items-center gap-2">
                            <div>
                              <div className="font-medium text-green-600">
                                {formatearMoneda(pago.monto)}
                              </div>
                              <Badge variant="outline" className="mt-1">
                                {pago.metodoPago}
                              </Badge>
                            </div>
                            {getBadgeEstado()}
                            
                            {/* Botón Ver Detalle - siempre visible */}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setPagoSeleccionado(pago);
                                setShowRevisarPagoModal(true);
                              }}
                            >
                              <FileText className="h-4 w-4 mr-1" />
                              Ver
                            </Button>
                            
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10"
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm('¿Está seguro de eliminar este pago? Esta acción no se puede deshacer.')) {
                                  try {
                                    await eliminarPagoV2(pago.id);
                                    toast({
                                      title: "Pago eliminado",
                                      description: "El pago ha sido eliminado correctamente"
                                    });
                                    await cargarDatos();
                                  } catch (error: any) {
                                    toast({
                                      title: "Error",
                                      description: error.message || "Error al eliminar el pago",
                                      variant: "destructive"
                                    });
                                  }
                                }
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Tab Bandeja Economía */}
          <TabsContent value="bandeja">
            <div className="space-y-6">
              {/* Resumen financiero */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {estadisticas ? formatearMoneda(estadisticas.ingresosMes) : 'S/ 0.00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Egresos del Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      {estadisticas ? formatearMoneda(estadisticas.egresosMes) : 'S/ 0.00'}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium">Saldo del Mes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${
                      estadisticas && estadisticas.saldoMes >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {estadisticas ? formatearMoneda(estadisticas.saldoMes) : 'S/ 0.00'}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Tabla de movimientos */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Movimientos Recientes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {/* Ingresos recientes */}
                    {pagos.slice(0, 5).map((pago) => {
                      const emp = empadronados.find(e => e.id === pago.empadronadoId);
                      
                      return (
                        <div key={`pago-${pago.id}`} className="flex items-center justify-between p-3 border rounded-lg bg-green-50">
                          <div className="flex items-center gap-3">
                            <ArrowUpCircle className="h-5 w-5 text-green-600" />
                            <div>
                              <div className="font-medium">
                                Pago - {emp ? `${emp.nombre} ${emp.apellidos}` : 'N/A'}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {formatearFecha(pago.fechaPagoRegistrada)} | Período: {pago.periodo}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-green-600">
                              +{formatearMoneda(pago.monto)}
                            </div>
                            <Badge variant="outline" className="text-xs">
                              {pago.metodoPago}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}

                    {/* Egresos recientes */}
                    {egresos.slice(0, 5).map((egreso) => (
                      <div key={`egreso-${egreso.id}`} className="flex items-center justify-between p-3 border rounded-lg bg-red-50">
                        <div className="flex items-center gap-3">
                          <ArrowDownCircle className="h-5 w-5 text-red-600" />
                          <div>
                            <div className="font-medium">{egreso.concepto}</div>
                            <div className="text-sm text-muted-foreground">
                              {formatearFecha(egreso.fecha)} | {egreso.categoria}
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-red-600">
                            -{formatearMoneda(egreso.monto)}
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {egreso.metodoPago}
                          </Badge>
                        </div>
                      </div>
                    ))}

                    {pagos.length === 0 && egresos.length === 0 && (
                      <div className="text-center p-8 text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No hay movimientos registrados</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Acciones rápidas */}
              <Card>
                <CardHeader>
                  <CardTitle>Acciones Rápidas</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-3">
                    <Button variant="outline" onClick={() => {
                      // Navegar al tab de pagos
                      const tabsTrigger = document.querySelector('[value="pagos"]') as HTMLElement;
                      tabsTrigger?.click();
                    }}>
                      <Receipt className="h-4 w-4 mr-2" />
                      Registrar Pago
                    </Button>

                    <Button variant="outline" onClick={() => {
                      // Navegar al tab de egresos
                      const tabsTrigger = document.querySelector('[value="egresos"]') as HTMLElement;
                      tabsTrigger?.click();
                    }}>
                      <ArrowDownCircle className="h-4 w-4 mr-2" />
                      Registrar Egreso
                    </Button>

                    <Button variant="outline" onClick={() => {
                      // Actualizar estadísticas
                      cargarDatos();
                    }}>
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Actualizar Datos
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
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

      {/* Modal de detalle del empadronado */}
      <DetalleEmpadronadoModalV2
        open={modalDetalleAbierto}
        onOpenChange={setModalDetalleAbierto}
        empadronado={empadronadoSeleccionado}
        charges={chargesEmpadronado}
        onRegistrarPago={registrarPagoModal}
      />

      {/* Modal de revisión de pago */}
      <RevisarPagoModal
        open={showRevisarPagoModal}
        onOpenChange={setShowRevisarPagoModal}
        pago={pagoSeleccionado}
        empadronado={pagoSeleccionado ? empadronados.find(e => e.id === pagoSeleccionado.empadronadoId) || null : null}
        onAprobar={handleAprobarPago}
        onRechazar={handleRechazarPago}
      />

      {/* Modal de envío masivo de WhatsApp */}
      <EnvioWhatsAppMasivoModal
        open={showWhatsAppModal}
        onOpenChange={setShowWhatsAppModal}
        empadronados={empadronados.filter(e => seleccionados.has(e.id))}
        deudas={new Map(
          empadronados
            .filter(e => seleccionados.has(e.id))
            .map(e => [e.id, calcularDeudaEmpadronado(e.id)])
        )}
      />

      {/* Modal de importación masiva de pagos */}
      <ImportarPagosMasivosModal
        open={showImportarModal}
        onOpenChange={setShowImportarModal}
        onImportacionCompleta={cargarDatos}
      />
    </div>
  );
}