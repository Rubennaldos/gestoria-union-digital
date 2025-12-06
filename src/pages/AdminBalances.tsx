import { useRef, useState, useEffect, useMemo } from "react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  FileSpreadsheet, Search, Filter, 
  Download, Printer, FileText, TrendingUp,
  Users, DollarSign, CheckCircle, AlertCircle, X, ChevronDown,
  BarChart3, RefreshCw, AlertTriangle, Skull
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { useToast } from "@/hooks/use-toast";
import logoUrbanizacion from "@/assets/logo-urbanizacion.png";

// Importar servicios reales
import { getEmpadronados } from "@/services/empadronados";
import { obtenerChargesV2, obtenerPagosV2 } from "@/services/cobranzas-v2";
import type { Empadronado } from "@/types/empadronados";
import type { ChargeV2, PagoV2 } from "@/types/cobranzas-v2";

// Tipos
interface BalanceRow {
  empadronado: Empadronado;
  meses: { [periodo: string]: { cargo: ChargeV2 | null; pagado: boolean; saldo: number } };
  totalPagado: number;
  totalDeuda: number;
  mesesPagados: number;
  mesesVencidos: number;
  estadoDeuda: 'al-dia' | 'atrasado' | 'moroso' | 'deudor';
}

const MESES_INFO = [
  { nombre: 'Enero', corto: 'Ene', periodo: '01' },
  { nombre: 'Febrero', corto: 'Feb', periodo: '02' },
  { nombre: 'Marzo', corto: 'Mar', periodo: '03' },
  { nombre: 'Abril', corto: 'Abr', periodo: '04' },
  { nombre: 'Mayo', corto: 'May', periodo: '05' },
  { nombre: 'Junio', corto: 'Jun', periodo: '06' },
  { nombre: 'Julio', corto: 'Jul', periodo: '07' },
  { nombre: 'Agosto', corto: 'Ago', periodo: '08' },
  { nombre: 'Septiembre', corto: 'Sep', periodo: '09' },
  { nombre: 'Octubre', corto: 'Oct', periodo: '10' },
  { nombre: 'Noviembre', corto: 'Nov', periodo: '11' },
  { nombre: 'Diciembre', corto: 'Dic', periodo: '12' },
];

const AdminBalances = () => {
  const { toast } = useToast();
  
  // Estados
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [charges, setCharges] = useState<ChargeV2[]>([]);
  const [pagos, setPagos] = useState<PagoV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [año, setAño] = useState("2025");
  
  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroManzana, setFiltroManzana] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filasSeleccionadas, setFilasSeleccionadas] = useState<Set<string>>(new Set());
  
  // Cargar datos reales
  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [empsData, chargesData, pagosData] = await Promise.all([
        getEmpadronados(),
        obtenerChargesV2(),
        obtenerPagosV2()
      ]);
      
      // Solo empadronados habilitados
      setEmpadronados(empsData.filter(e => e.habilitado));
      setCharges(chargesData);
      setPagos(pagosData);
    } catch (error) {
      console.error("Error cargando datos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarDatos();
  }, []);

  // Obtener manzanas únicas
  const manzanasUnicas = useMemo(() => {
    const manzanas = new Set(empadronados.map(e => e.manzana || 'Sin Mz'));
    return Array.from(manzanas).sort();
  }, [empadronados]);

  // Construir datos de balance para cada empadronado
  const balancesData = useMemo(() => {
    const ahora = Date.now();
    
    return empadronados.map(emp => {
      const meses: { [periodo: string]: { cargo: ChargeV2 | null; pagado: boolean; saldo: number } } = {};
      let totalPagado = 0;
      let totalDeuda = 0;
      let mesesPagados = 0;
      let mesesVencidos = 0;
      
      // Procesar cada mes del año seleccionado
      MESES_INFO.forEach(mesInfo => {
        const periodo = `${año}${mesInfo.periodo}`;
        const cargo = charges.find(c => c.empadronadoId === emp.id && c.periodo === periodo);
        
        if (cargo) {
          // Calcular pagos para este cargo
          const pagosDelCargo = pagos.filter(p => 
            p.chargeId === cargo.id && 
            (p.estado === 'aprobado' || p.estado === 'pendiente')
          );
          const montoPagado = pagosDelCargo.reduce((sum, p) => sum + p.monto, 0);
          const saldo = Math.max(0, cargo.montoOriginal - montoPagado);
          const estaPagado = saldo === 0;
          
          meses[periodo] = {
            cargo,
            pagado: estaPagado,
            saldo
          };
          
          if (estaPagado) {
            mesesPagados++;
            totalPagado += cargo.montoOriginal;
          } else {
            // Solo contar como vencido si ya pasó la fecha
            if (ahora > cargo.fechaVencimiento) {
              mesesVencidos++;
              totalDeuda += saldo;
            }
          }
        } else {
          meses[periodo] = { cargo: null, pagado: false, saldo: 0 };
        }
      });
      
      // Determinar estado de deuda
      let estadoDeuda: 'al-dia' | 'atrasado' | 'moroso' | 'deudor' = 'al-dia';
      if (mesesVencidos === 1) estadoDeuda = 'atrasado';
      else if (mesesVencidos === 2) estadoDeuda = 'moroso';
      else if (mesesVencidos >= 3) estadoDeuda = 'deudor';
      
      return {
        empadronado: emp,
        meses,
        totalPagado,
        totalDeuda,
        mesesPagados,
        mesesVencidos,
        estadoDeuda
      } as BalanceRow;
    });
  }, [empadronados, charges, pagos, año]);

  // Filtrar registros
  const balancesFiltrados = useMemo(() => {
    let resultado = [...balancesData];

    // Búsqueda por nombre o padrón
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(b => {
        const nombreCompleto = `${b.empadronado.nombre} ${b.empadronado.apellidos}`.toLowerCase();
        const padron = (b.empadronado.numeroPadron || '').toLowerCase();
        const manzana = (b.empadronado.manzana || '').toLowerCase();
        const lote = (b.empadronado.lote || '').toLowerCase();
        return nombreCompleto.includes(termino) || 
               padron.includes(termino) ||
               manzana.includes(termino) ||
               lote.includes(termino);
      });
    }

    // Filtro por manzana
    if (filtroManzana !== "todas") {
      resultado = resultado.filter(b => (b.empadronado.manzana || 'Sin Mz') === filtroManzana);
    }

    // Filtro por estado
    if (filtroEstado === "aldia") {
      resultado = resultado.filter(b => b.estadoDeuda === 'al-dia');
    } else if (filtroEstado === "atrasado") {
      resultado = resultado.filter(b => b.estadoDeuda === 'atrasado');
    } else if (filtroEstado === "moroso") {
      resultado = resultado.filter(b => b.estadoDeuda === 'moroso');
    } else if (filtroEstado === "deudor") {
      resultado = resultado.filter(b => b.estadoDeuda === 'deudor');
    } else if (filtroEstado === "pendiente") {
      resultado = resultado.filter(b => b.mesesVencidos > 0);
    }

    // Ordenar por manzana y lote
    resultado.sort((a, b) => {
      const mzA = a.empadronado.manzana || '';
      const mzB = b.empadronado.manzana || '';
      if (mzA !== mzB) return mzA.localeCompare(mzB);
      const ltA = a.empadronado.lote || '';
      const ltB = b.empadronado.lote || '';
      return ltA.localeCompare(ltB);
    });

    return resultado;
  }, [balancesData, busqueda, filtroManzana, filtroEstado]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const totalRecords = balancesFiltrados.length;
    const totalRecaudado = balancesFiltrados.reduce((sum, b) => sum + b.totalPagado, 0);
    const totalPendiente = balancesFiltrados.reduce((sum, b) => sum + b.totalDeuda, 0);
    const alDia = balancesFiltrados.filter(b => b.estadoDeuda === 'al-dia').length;
    const atrasados = balancesFiltrados.filter(b => b.estadoDeuda === 'atrasado').length;
    const morosos = balancesFiltrados.filter(b => b.estadoDeuda === 'moroso').length;
    const deudores = balancesFiltrados.filter(b => b.estadoDeuda === 'deudor').length;

    return { totalRecords, totalRecaudado, totalPendiente, alDia, atrasados, morosos, deudores };
  }, [balancesFiltrados]);

  // Exportar a Excel
  const exportarExcel = () => {
    const datos = balancesFiltrados.map(b => {
      const row: any = {
        'Padrón': b.empadronado.numeroPadron,
        'Manzana': b.empadronado.manzana || '',
        'Lote': b.empadronado.lote || '',
        'Nombre': `${b.empadronado.nombre} ${b.empadronado.apellidos}`,
      };
      
      MESES_INFO.forEach(mesInfo => {
        const periodo = `${año}${mesInfo.periodo}`;
        const mesData = b.meses[periodo];
        row[mesInfo.nombre] = mesData?.pagado ? '✓ Pagado' : (mesData?.cargo ? `S/${mesData.saldo.toFixed(0)}` : '-');
      });
      
      row['Total Pagado'] = `S/ ${b.totalPagado.toFixed(2)}`;
      row['Deuda'] = `S/ ${b.totalDeuda.toFixed(2)}`;
      row['Estado'] = b.estadoDeuda === 'al-dia' ? 'Al día' : 
                      b.estadoDeuda === 'atrasado' ? 'Atrasado' :
                      b.estadoDeuda === 'moroso' ? 'Moroso' : 'Deudor';
      
      return row;
    });

    const ws = XLSX.utils.json_to_sheet(datos);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, `Balances ${año}`);
    XLSX.writeFile(wb, `balances_${año}_${new Date().toISOString().split('T')[0]}.xlsx`);

    toast({
      title: "✅ Excel exportado",
      description: `${datos.length} registros exportados`
    });
  };

  // Exportar a PDF
  const exportarPDF = async () => {
    const doc = new jsPDF('landscape');
    const pageWidth = doc.internal.pageSize.getWidth();

    // Cargar logo
    const loadImage = (src: string): Promise<HTMLImageElement> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => resolve(img);
        img.onerror = reject;
        img.src = src;
      });
    };

    try {
      const logoImg = await loadImage(logoUrbanizacion);
      
      // Encabezado
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 30, 'F');
      doc.addImage(logoImg, 'PNG', 10, 5, 20, 20);
      
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("JPUSAP - Reporte de Balances", 35, 15);
      doc.setFontSize(10);
      doc.text(`Año ${año} | Generado: ${new Date().toLocaleDateString('es-PE')}`, 35, 23);
    } catch {
      doc.setFillColor(30, 58, 138);
      doc.rect(0, 0, pageWidth, 25, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(14);
      doc.text("JPUSAP - Reporte de Balances", pageWidth / 2, 15, { align: "center" });
    }

    // Estadísticas
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Total: ${estadisticas.totalRecords}`, 15, 40);
    doc.text(`Recaudado: S/ ${estadisticas.totalRecaudado.toFixed(2)}`, 60, 40);
    doc.text(`Pendiente: S/ ${estadisticas.totalPendiente.toFixed(2)}`, 130, 40);
    doc.text(`Al Día: ${estadisticas.alDia}`, 200, 40);
    doc.text(`Morosos: ${estadisticas.morosos + estadisticas.deudores}`, 240, 40);

    // Tabla
    const headers = ['Padrón', 'Mz', 'Lt', 'Nombre', ...MESES_INFO.map(m => m.corto), 'Pagado', 'Deuda', 'Estado'];
    const rows = balancesFiltrados.map(b => [
      b.empadronado.numeroPadron || '',
      b.empadronado.manzana || '',
      b.empadronado.lote || '',
      `${b.empadronado.nombre} ${b.empadronado.apellidos}`.substring(0, 18),
      ...MESES_INFO.map(mesInfo => {
        const periodo = `${año}${mesInfo.periodo}`;
        const mesData = b.meses[periodo];
        return mesData?.pagado ? '✓' : (mesData?.cargo ? '-' : '');
      }),
      `S/${b.totalPagado.toFixed(0)}`,
      `S/${b.totalDeuda.toFixed(0)}`,
      b.estadoDeuda === 'al-dia' ? 'OK' : 
      b.estadoDeuda === 'atrasado' ? 'ATR' :
      b.estadoDeuda === 'moroso' ? 'MOR' : 'DEU'
    ]);

    autoTable(doc, {
      startY: 48,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], fontSize: 7, cellPadding: 1 },
      styles: { fontSize: 6, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 18 },
        1: { cellWidth: 8 },
        2: { cellWidth: 8 },
        3: { cellWidth: 30 },
      },
      margin: { left: 5, right: 5 }
    });

    doc.save(`balances_${año}_${new Date().toISOString().split('T')[0]}.pdf`);
    toast({
      title: "✅ PDF exportado",
      description: `${balancesFiltrados.length} registros exportados`
    });
  };

  // Imprimir
  const imprimir = () => {
    window.print();
  };

  // Toggle selección
  const toggleSeleccion = (id: string) => {
    const nuevas = new Set(filasSeleccionadas);
    if (nuevas.has(id)) {
      nuevas.delete(id);
    } else {
      nuevas.add(id);
    }
    setFilasSeleccionadas(nuevas);
  };

  const seleccionarTodos = () => {
    if (filasSeleccionadas.size === balancesFiltrados.length) {
      setFilasSeleccionadas(new Set());
    } else {
      setFilasSeleccionadas(new Set(balancesFiltrados.map(b => b.empadronado.id)));
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroManzana("todas");
    setFiltroEstado("todos");
  };

  // Estilos de badge según estado
  const getBadgeStyles = (estado: string) => {
    switch (estado) {
      case 'al-dia': return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'atrasado': return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
      case 'moroso': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'deudor': return 'bg-red-700/30 text-red-300 border-red-600/50 font-bold';
      default: return 'bg-slate-500/20 text-slate-400';
    }
  };

  const getEstadoLabel = (estado: string) => {
    switch (estado) {
      case 'al-dia': return 'Al día';
      case 'atrasado': return 'Atrasado';
      case 'moroso': return 'Moroso';
      case 'deudor': return 'Deudor';
      default: return estado;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 pb-20 md:pb-0">
      <TopNavigation />

      <main className="container mx-auto px-3 md:px-4 py-4 md:py-6 space-y-4 md:space-y-6">
        
        {/* Header Futurista */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-600 via-purple-600 to-blue-700 p-4 md:p-6 shadow-2xl">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2230%22 height=%2230%22 viewBox=%220 0 30 30%22 fill=%22none%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cpath d=%22M1.22676 0C1.91374 0 2.45351 0.539773 2.45351 1.22676C2.45351 1.91374 1.91374 2.45351 1.22676 2.45351C0.539773 2.45351 0 1.91374 0 1.22676C0 0.539773 0.539773 0 1.22676 0Z%22 fill=%22rgba(255,255,255,0.07)%22/%3E%3C/svg%3E')] opacity-50"></div>
          
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-3 md:gap-4">
              <BackButton />
              <div className="h-12 w-12 md:h-14 md:w-14 rounded-xl bg-white/20 backdrop-blur flex items-center justify-center">
                <BarChart3 className="h-6 w-6 md:h-7 md:w-7 text-white" />
              </div>
              <div>
                <h1 className="text-xl md:text-3xl font-bold text-white">
                  Administrador de Balances
                </h1>
                <p className="text-blue-100 text-sm md:text-base">
                  Datos en tiempo real • Año {año}
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Select value={año} onValueChange={setAño}>
                <SelectTrigger className="w-[100px] bg-white/20 border-white/30 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024">2024</SelectItem>
                  <SelectItem value="2025">2025</SelectItem>
                  <SelectItem value="2026">2026</SelectItem>
                </SelectContent>
              </Select>
              
              <Button 
                variant="secondary" 
                size="icon"
                onClick={cargarDatos}
                className="bg-white/20 hover:bg-white/30 text-white border-0"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </div>

        {/* Estadísticas Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Total Asociados</p>
                  <p className="text-2xl md:text-3xl font-bold text-white">{estadisticas.totalRecords}</p>
                </div>
                <Users className="h-8 w-8 text-blue-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Recaudado</p>
                  <p className="text-xl md:text-2xl font-bold text-emerald-400">
                    S/ {estadisticas.totalRecaudado.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <DollarSign className="h-8 w-8 text-emerald-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Al Día</p>
                  <p className="text-2xl md:text-3xl font-bold text-green-400">{estadisticas.alDia}</p>
                </div>
                <CheckCircle className="h-8 w-8 text-green-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-slate-400 text-xs md:text-sm">Deuda Total</p>
                  <p className="text-xl md:text-2xl font-bold text-red-400">
                    S/ {estadisticas.totalPendiente.toLocaleString('es-PE', { minimumFractionDigits: 0 })}
                  </p>
                </div>
                <AlertCircle className="h-8 w-8 text-red-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Mini estadísticas de estados */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-2 text-center">
            <p className="text-green-400 text-xs">Al Día</p>
            <p className="text-green-300 font-bold text-lg">{estadisticas.alDia}</p>
          </div>
          <div className="bg-orange-500/10 border border-orange-500/30 rounded-lg p-2 text-center">
            <p className="text-orange-400 text-xs">Atrasados</p>
            <p className="text-orange-300 font-bold text-lg">{estadisticas.atrasados}</p>
          </div>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-2 text-center">
            <p className="text-red-400 text-xs">Morosos</p>
            <p className="text-red-300 font-bold text-lg">{estadisticas.morosos}</p>
          </div>
          <div className="bg-red-700/20 border border-red-600/30 rounded-lg p-2 text-center">
            <p className="text-red-300 text-xs">Deudores</p>
            <p className="text-red-200 font-bold text-lg">{estadisticas.deudores}</p>
          </div>
        </div>

        {/* Barra de Acciones */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Búsqueda */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, padrón, manzana, lote..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10 bg-slate-900/50 border-slate-600 text-white placeholder:text-slate-400"
                />
                {busqueda && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 text-slate-400 hover:text-white"
                    onClick={() => setBusqueda("")}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              {/* Filtros */}
              <div className="flex gap-2 flex-wrap">
                <Select value={filtroManzana} onValueChange={setFiltroManzana}>
                  <SelectTrigger className="w-[120px] bg-slate-900/50 border-slate-600 text-white">
                    <Filter className="h-4 w-4 mr-2" />
                    <SelectValue placeholder="Manzana" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas">Todas</SelectItem>
                    {manzanasUnicas.map(m => (
                      <SelectItem key={m} value={m}>Mz {m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={filtroEstado} onValueChange={setFiltroEstado}>
                  <SelectTrigger className="w-[140px] bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aldia">✅ Al día</SelectItem>
                    <SelectItem value="atrasado">🟠 Atrasado</SelectItem>
                    <SelectItem value="moroso">🔴 Moroso</SelectItem>
                    <SelectItem value="deudor">💀 Deudor</SelectItem>
                    <SelectItem value="pendiente">⚠️ Con deuda</SelectItem>
                  </SelectContent>
                </Select>

                {(busqueda || filtroManzana !== "todas" || filtroEstado !== "todos") && (
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={limpiarFiltros}
                    className="text-slate-400 hover:text-white"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Limpiar
                  </Button>
                )}
              </div>
              
              {/* Acciones */}
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm" className="border-slate-600 text-slate-300 hover:bg-slate-700">
                      <Download className="h-4 w-4 mr-2" />
                      Exportar
                      <ChevronDown className="h-4 w-4 ml-1" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={exportarExcel}>
                      <FileSpreadsheet className="h-4 w-4 mr-2 text-green-500" />
                      Exportar Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={exportarPDF}>
                      <FileText className="h-4 w-4 mr-2 text-red-500" />
                      Exportar PDF
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={imprimir}>
                      <Printer className="h-4 w-4 mr-2" />
                      Imprimir
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de Balances */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur overflow-hidden">
          <CardHeader className="border-b border-slate-700 py-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-white text-lg flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-blue-400" />
                Balances {año}
                <Badge variant="secondary" className="ml-2 bg-slate-700">
                  {balancesFiltrados.length} registros
                </Badge>
              </CardTitle>
              {filasSeleccionadas.size > 0 && (
                <Badge className="bg-blue-600">
                  {filasSeleccionadas.size} seleccionados
                </Badge>
              )}
            </div>
          </CardHeader>
          
          <ScrollArea className="h-[400px] md:h-[500px]">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <RefreshCw className="h-8 w-8 text-blue-400 animate-spin" />
              </div>
            ) : balancesFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                <FileSpreadsheet className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg">No hay registros</p>
                <p className="text-sm">Ajusta los filtros para ver resultados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium w-10">
                        <input 
                          type="checkbox" 
                          checked={filasSeleccionadas.size === balancesFiltrados.length && balancesFiltrados.length > 0}
                          onChange={seleccionarTodos}
                          className="rounded border-slate-600"
                        />
                      </th>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium">Padrón</th>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium">Mz</th>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium">Lt</th>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium min-w-[150px]">Nombre</th>
                      {MESES_INFO.map((mes, i) => (
                        <th key={i} className="px-1 py-3 text-center text-slate-400 font-medium text-xs">
                          {mes.corto}
                        </th>
                      ))}
                      <th className="px-2 py-3 text-right text-slate-400 font-medium">Pagado</th>
                      <th className="px-2 py-3 text-right text-slate-400 font-medium">Deuda</th>
                      <th className="px-2 py-3 text-center text-slate-400 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {balancesFiltrados.map((balance) => {
                      return (
                        <tr 
                          key={balance.empadronado.id}
                          className={`hover:bg-slate-700/30 transition-colors ${
                            filasSeleccionadas.has(balance.empadronado.id) ? 'bg-blue-900/20' : ''
                          }`}
                        >
                          <td className="px-2 py-2">
                            <input 
                              type="checkbox"
                              checked={filasSeleccionadas.has(balance.empadronado.id)}
                              onChange={() => toggleSeleccion(balance.empadronado.id)}
                              className="rounded border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2 text-blue-400 font-mono text-xs">
                            {balance.empadronado.numeroPadron}
                          </td>
                          <td className="px-2 py-2 text-white font-medium">{balance.empadronado.manzana || '-'}</td>
                          <td className="px-2 py-2 text-white">{balance.empadronado.lote || '-'}</td>
                          <td className="px-2 py-2 text-white truncate max-w-[150px]" title={`${balance.empadronado.nombre} ${balance.empadronado.apellidos}`}>
                            {balance.empadronado.nombre} {balance.empadronado.apellidos}
                          </td>
                          {MESES_INFO.map((mes, i) => {
                            const periodo = `${año}${mes.periodo}`;
                            const mesData = balance.meses[periodo];
                            const tieneCargo = mesData?.cargo !== null;
                            const estaPagado = mesData?.pagado;
                            
                            return (
                              <td key={i} className="px-1 py-2 text-center">
                                {!tieneCargo ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/30 text-slate-600 text-xs">
                                    -
                                  </span>
                                ) : estaPagado ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-red-500/20 text-red-400 text-xs font-medium">
                                    ✗
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-right">
                            <span className="text-emerald-400 font-semibold">
                              S/ {balance.totalPagado.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-right">
                            <span className={balance.totalDeuda > 0 ? "text-red-400 font-semibold" : "text-slate-500"}>
                              S/ {balance.totalDeuda.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            <Badge className={getBadgeStyles(balance.estadoDeuda)}>
                              {balance.estadoDeuda === 'deudor' && <Skull className="h-3 w-3 mr-1" />}
                              {balance.estadoDeuda === 'moroso' && <AlertTriangle className="h-3 w-3 mr-1" />}
                              {getEstadoLabel(balance.estadoDeuda)}
                            </Badge>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </ScrollArea>
          
          {/* Footer con totales */}
          {balancesFiltrados.length > 0 && (
            <div className="border-t border-slate-700 bg-slate-900/50 px-4 py-3">
              <div className="flex flex-wrap items-center justify-between gap-4 text-sm">
                <div className="flex items-center gap-4 text-slate-400">
                  <span>Mostrando <strong className="text-white">{balancesFiltrados.length}</strong> de {balancesData.length}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-slate-400">Recaudado:</span>
                    <span className="text-emerald-400 font-bold text-lg">
                      S/ {estadisticas.totalRecaudado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-400" />
                    <span className="text-slate-400">Pendiente:</span>
                    <span className="text-red-400 font-semibold">
                      S/ {estadisticas.totalPendiente.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </Card>
      </main>

      <BottomNavigation />
      
      {/* Estilos para impresión */}
      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          main { padding: 0 !important; }
        }
      `}</style>
    </div>
  );
};

export default AdminBalances;
