import { useRef, useState, useEffect, useMemo } from "react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Settings, FileSpreadsheet, Upload, Search, Filter, 
  Download, Printer, FileText, TrendingUp, TrendingDown,
  Users, DollarSign, CheckCircle, AlertCircle, X, ChevronDown,
  BarChart3, RefreshCw
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
import { db } from "@/config/firebase";
import { ref, push, set, get } from "firebase/database";
import { useToast } from "@/hooks/use-toast";
import logoUrbanizacion from "@/assets/logo-urbanizacion.png";

// Tipos
interface BalanceRecord {
  id: string;
  manzana: string;
  lote: string;
  nombre: string;
  meses: {
    enero: string | number;
    febrero: string | number;
    marzo: string | number;
    abril: string | number;
    mayo: string | number;
    junio: string | number;
    julio: string | number;
    agosto: string | number;
    septiembre: string | number;
    octubre: string | number;
    noviembre: string | number;
    diciembre: string | number;
  };
  busqueda_id: string;
  createdAt: number;
}

interface BalanceRow {
  Manzana: string;
  Lote: string;
  Nombre: string;
  Enero?: any;
  Febrero?: any;
  Marzo?: any;
  Abril?: any;
  Mayo?: any;
  Junio?: any;
  Julio?: any;
  Agosto?: any;
  Septiembre?: any;
  Octubre?: any;
  Noviembre?: any;
  Diciembre?: any;
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
const MESES_CORTOS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const AdminBalances = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { toast } = useToast();
  
  // Estados
  const [balances, setBalances] = useState<BalanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState(false);
  const [año, setAño] = useState("2025");
  
  // Filtros
  const [busqueda, setBusqueda] = useState("");
  const [filtroManzana, setFiltroManzana] = useState("todas");
  const [filtroEstado, setFiltroEstado] = useState("todos");
  const [filasSeleccionadas, setFilasSeleccionadas] = useState<Set<string>>(new Set());
  
  // Cargar datos
  const cargarBalances = async () => {
    setLoading(true);
    try {
      const snapshot = await get(ref(db, `balances/${año}`));
      if (snapshot.exists()) {
        const data = snapshot.val();
        const lista: BalanceRecord[] = Object.entries(data).map(([id, val]: [string, any]) => ({
          id,
          ...val
        }));
        setBalances(lista);
      } else {
        setBalances([]);
      }
    } catch (error) {
      console.error("Error cargando balances:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los balances",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    cargarBalances();
  }, [año]);

  // Obtener manzanas únicas
  const manzanasUnicas = useMemo(() => {
    const manzanas = new Set(balances.map(b => b.manzana));
    return Array.from(manzanas).sort();
  }, [balances]);

  // Calcular total pagado por registro
  const calcularTotalPagado = (record: BalanceRecord): number => {
    return MESES.reduce((total, mes) => {
      const valor = record.meses[mes as keyof typeof record.meses];
      const num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[^\d.-]/g, '') || '0');
      return total + (isNaN(num) ? 0 : num);
    }, 0);
  };

  // Calcular meses pagados
  const calcularMesesPagados = (record: BalanceRecord): number => {
    return MESES.filter(mes => {
      const valor = record.meses[mes as keyof typeof record.meses];
      const num = typeof valor === 'number' ? valor : parseFloat(String(valor).replace(/[^\d.-]/g, '') || '0');
      return num > 0;
    }).length;
  };

  // Filtrar registros
  const balancesFiltrados = useMemo(() => {
    let resultado = [...balances];

    // Búsqueda por nombre
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase();
      resultado = resultado.filter(b => 
        b.nombre.toLowerCase().includes(termino) ||
        b.manzana.toLowerCase().includes(termino) ||
        b.lote.toLowerCase().includes(termino) ||
        b.busqueda_id.toLowerCase().includes(termino)
      );
    }

    // Filtro por manzana
    if (filtroManzana !== "todas") {
      resultado = resultado.filter(b => b.manzana === filtroManzana);
    }

    // Filtro por estado
    if (filtroEstado === "aldia") {
      resultado = resultado.filter(b => calcularMesesPagados(b) >= new Date().getMonth() + 1);
    } else if (filtroEstado === "pendiente") {
      resultado = resultado.filter(b => calcularMesesPagados(b) < new Date().getMonth() + 1);
    } else if (filtroEstado === "completo") {
      resultado = resultado.filter(b => calcularMesesPagados(b) === 12);
    }

    // Ordenar por manzana y lote
    resultado.sort((a, b) => {
      if (a.manzana !== b.manzana) return a.manzana.localeCompare(b.manzana);
      return a.lote.localeCompare(b.lote);
    });

    return resultado;
  }, [balances, busqueda, filtroManzana, filtroEstado]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    const totalRecords = balancesFiltrados.length;
    const totalRecaudado = balancesFiltrados.reduce((sum, b) => sum + calcularTotalPagado(b), 0);
    const alDia = balancesFiltrados.filter(b => calcularMesesPagados(b) >= new Date().getMonth() + 1).length;
    const pendientes = totalRecords - alDia;
    const promedioMeses = totalRecords > 0 
      ? balancesFiltrados.reduce((sum, b) => sum + calcularMesesPagados(b), 0) / totalRecords 
      : 0;

    return { totalRecords, totalRecaudado, alDia, pendientes, promedioMeses };
  }, [balancesFiltrados]);

  // Importar Excel
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setImporting(true);

      if (!/\.(xlsx|xls)$/i.test(file.name)) {
        toast({
          title: "Formato inválido",
          description: "Usa un archivo .xlsx o .xls",
          variant: "destructive"
        });
        return;
      }

      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[firstSheetName];
      const rows: BalanceRow[] = XLSX.utils.sheet_to_json(sheet, { defval: "" });

      const yearPath = `balances/${año}`;
      const baseRef = ref(db, yearPath);

      let count = 0;
      for (const row of rows) {
        if (!row.Manzana || !row.Lote || !row.Nombre) continue;

        const manzana = String(row.Manzana).trim();
        const lote = String(row.Lote).trim();
        const nombre = String(row.Nombre).trim();

        const meses = {
          enero: row.Enero ?? "",
          febrero: row.Febrero ?? "",
          marzo: row.Marzo ?? "",
          abril: row.Abril ?? "",
          mayo: row.Mayo ?? "",
          junio: row.Junio ?? "",
          julio: row.Julio ?? "",
          agosto: row.Agosto ?? "",
          septiembre: row.Septiembre ?? "",
          octubre: row.Octubre ?? "",
          noviembre: row.Noviembre ?? "",
          diciembre: row.Diciembre ?? ""
        };

        const newRef = push(baseRef);
        await set(newRef, {
          manzana,
          lote,
          nombre,
          meses,
          busqueda_id: `${manzana}-${lote}`,
          createdAt: Date.now()
        });
        count++;
      }

      toast({
        title: "✅ Importación completada",
        description: `${count} registros importados correctamente`
      });
      
      cargarBalances();
    } catch (err) {
      console.error("Error importando:", err);
      toast({
        title: "Error",
        description: "Error importando el archivo",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // Exportar a Excel
  const exportarExcel = () => {
    const datos = balancesFiltrados.map(b => ({
      Manzana: b.manzana,
      Lote: b.lote,
      Nombre: b.nombre,
      Enero: b.meses.enero || '',
      Febrero: b.meses.febrero || '',
      Marzo: b.meses.marzo || '',
      Abril: b.meses.abril || '',
      Mayo: b.meses.mayo || '',
      Junio: b.meses.junio || '',
      Julio: b.meses.julio || '',
      Agosto: b.meses.agosto || '',
      Septiembre: b.meses.septiembre || '',
      Octubre: b.meses.octubre || '',
      Noviembre: b.meses.noviembre || '',
      Diciembre: b.meses.diciembre || '',
      'Total Pagado': calcularTotalPagado(b).toFixed(2),
      'Meses Pagados': calcularMesesPagados(b)
    }));

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
    doc.text(`Total Asociados: ${estadisticas.totalRecords}`, 15, 40);
    doc.text(`Total Recaudado: S/ ${estadisticas.totalRecaudado.toFixed(2)}`, 80, 40);
    doc.text(`Al Día: ${estadisticas.alDia}`, 170, 40);
    doc.text(`Pendientes: ${estadisticas.pendientes}`, 220, 40);

    // Tabla
    const headers = ['Mz', 'Lt', 'Nombre', ...MESES_CORTOS, 'Total', 'Meses'];
    const rows = balancesFiltrados.map(b => [
      b.manzana,
      b.lote,
      b.nombre.substring(0, 20),
      ...MESES.map(m => {
        const val = b.meses[m as keyof typeof b.meses];
        return val ? String(val) : '-';
      }),
      `S/${calcularTotalPagado(b).toFixed(0)}`,
      calcularMesesPagados(b).toString()
    ]);

    autoTable(doc, {
      startY: 48,
      head: [headers],
      body: rows,
      theme: 'grid',
      headStyles: { fillColor: [30, 58, 138], fontSize: 7, cellPadding: 1 },
      styles: { fontSize: 6, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 10 },
        1: { cellWidth: 10 },
        2: { cellWidth: 35 },
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
      setFilasSeleccionadas(new Set(balancesFiltrados.map(b => b.id)));
    }
  };

  // Limpiar filtros
  const limpiarFiltros = () => {
    setBusqueda("");
    setFiltroManzana("todas");
    setFiltroEstado("todos");
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
                  Gestión financiera • Año {año}
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
                onClick={cargarBalances}
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
                  <p className="text-slate-400 text-xs md:text-sm">Pendientes</p>
                  <p className="text-2xl md:text-3xl font-bold text-amber-400">{estadisticas.pendientes}</p>
                </div>
                <AlertCircle className="h-8 w-8 text-amber-400 opacity-80" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Barra de Acciones */}
        <Card className="bg-slate-800/50 border-slate-700 backdrop-blur">
          <CardContent className="p-3 md:p-4">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Búsqueda */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Buscar por nombre, manzana, lote..."
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
                  <SelectTrigger className="w-[130px] bg-slate-900/50 border-slate-600 text-white">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="aldia">Al día</SelectItem>
                    <SelectItem value="pendiente">Pendiente</SelectItem>
                    <SelectItem value="completo">Completo</SelectItem>
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
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  className="hidden"
                  onChange={handleFileChange}
                />
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={importing}
                  className="border-slate-600 text-slate-300 hover:bg-slate-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {importing ? "Importando..." : "Importar"}
                </Button>
                
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
                <p className="text-lg">No hay balances registrados</p>
                <p className="text-sm">Importa un archivo Excel para comenzar</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-900/80 sticky top-0 z-10">
                    <tr>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium w-10">
                        <input 
                          type="checkbox" 
                          checked={filasSeleccionadas.size === balancesFiltrados.length}
                          onChange={seleccionarTodos}
                          className="rounded border-slate-600"
                        />
                      </th>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium">Mz</th>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium">Lt</th>
                      <th className="px-2 py-3 text-left text-slate-400 font-medium min-w-[150px]">Nombre</th>
                      {MESES_CORTOS.map((mes, i) => (
                        <th key={i} className="px-1 py-3 text-center text-slate-400 font-medium text-xs">
                          {mes}
                        </th>
                      ))}
                      <th className="px-2 py-3 text-right text-slate-400 font-medium">Total</th>
                      <th className="px-2 py-3 text-center text-slate-400 font-medium">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-700/50">
                    {balancesFiltrados.map((balance) => {
                      const totalPagado = calcularTotalPagado(balance);
                      const mesesPagados = calcularMesesPagados(balance);
                      const mesActual = new Date().getMonth() + 1;
                      const alDia = mesesPagados >= mesActual;
                      
                      return (
                        <tr 
                          key={balance.id}
                          className={`hover:bg-slate-700/30 transition-colors ${
                            filasSeleccionadas.has(balance.id) ? 'bg-blue-900/20' : ''
                          }`}
                        >
                          <td className="px-2 py-2">
                            <input 
                              type="checkbox"
                              checked={filasSeleccionadas.has(balance.id)}
                              onChange={() => toggleSeleccion(balance.id)}
                              className="rounded border-slate-600"
                            />
                          </td>
                          <td className="px-2 py-2 text-white font-medium">{balance.manzana}</td>
                          <td className="px-2 py-2 text-white">{balance.lote}</td>
                          <td className="px-2 py-2 text-white truncate max-w-[150px]" title={balance.nombre}>
                            {balance.nombre}
                          </td>
                          {MESES.map((mes, i) => {
                            const valor = balance.meses[mes as keyof typeof balance.meses];
                            const tienePago = valor && String(valor).trim() !== '';
                            return (
                              <td key={i} className="px-1 py-2 text-center">
                                {tienePago ? (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                                    ✓
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-700/50 text-slate-500 text-xs">
                                    -
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td className="px-2 py-2 text-right">
                            <span className="text-emerald-400 font-semibold">
                              S/ {totalPagado.toFixed(0)}
                            </span>
                          </td>
                          <td className="px-2 py-2 text-center">
                            {mesesPagados === 12 ? (
                              <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30">
                                Completo
                              </Badge>
                            ) : alDia ? (
                              <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                                Al día
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                                Debe {mesActual - mesesPagados}
                              </Badge>
                            )}
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
                  <span>Mostrando <strong className="text-white">{balancesFiltrados.length}</strong> de {balances.length}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-slate-400">Total:</span>
                    <span className="text-emerald-400 font-bold text-lg">
                      S/ {estadisticas.totalRecaudado.toLocaleString('es-PE', { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400">Promedio meses:</span>
                    <span className="text-blue-400 font-semibold">
                      {estadisticas.promedioMeses.toFixed(1)}
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
