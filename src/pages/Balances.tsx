import { useState, useEffect, useMemo } from "react";
import { TopNavigation, BottomNavigation } from "@/components/layout/Navigation";
import BackButton from "@/components/layout/BackButton";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { 
  FileBarChart, 
  Search, 
  Filter, 
  CheckCircle,
  XCircle,
  AlertCircle,
  Users
} from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getEmpadronados } from "@/services/empadronados";
import { obtenerChargesV2, obtenerPagosV2 } from "@/services/cobranzas-v2";
import type { Empadronado } from "@/types/empadronados";
import type { ChargeV2, PagoV2 } from "@/types/cobranzas-v2";

interface FilaBalance {
  empadronado: Empadronado;
  mesesPagados: Record<string, boolean>; // "202501": true/false
  mesesDeuda: number;
  esAlDia: boolean;      // 0 meses
  esAtrasado: boolean;   // 1 mes
  esMoroso: boolean;     // 2 meses
  esDeudor: boolean;     // 3+ meses
}

const Balances = () => {
  const { toast } = useToast();
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [charges, setCharges] = useState<ChargeV2[]>([]);
  const [pagos, setPagos] = useState<PagoV2[]>([]);
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState<"todos" | "al-dia" | "atrasados" | "morosos" | "deudores">("todos");
  const [añoSeleccionado, setAñoSeleccionado] = useState(2025);

  // Cargar datos iniciales
  useEffect(() => {
    cargarDatos();
  }, []);

  const cargarDatos = async () => {
    setLoading(true);
    try {
      const [emps, chgs, pgs] = await Promise.all([
        getEmpadronados(),
        obtenerChargesV2(),
        obtenerPagosV2()
      ]);
      
      setEmpadronados(emps.filter(e => e.habilitado));
      setCharges(chgs);
      setPagos(pgs);
    } catch (error) {
      console.error('Error cargando datos:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Meses del año
  const meses = [
    { num: "01", nombre: "Ene" },
    { num: "02", nombre: "Feb" },
    { num: "03", nombre: "Mar" },
    { num: "04", nombre: "Abr" },
    { num: "05", nombre: "May" },
    { num: "06", nombre: "Jun" },
    { num: "07", nombre: "Jul" },
    { num: "08", nombre: "Ago" },
    { num: "09", nombre: "Sep" },
    { num: "10", nombre: "Oct" },
    { num: "11", nombre: "Nov" },
    { num: "12", nombre: "Dic" }
  ];

  // Procesar datos para la tabla
  const filasBalance = useMemo(() => {
    const filas: FilaBalance[] = empadronados.map(emp => {
      const chargesEmp = charges.filter(c => c.empadronadoId === emp.id);
      const pagosEmp = pagos.filter(p => p.empadronadoId === emp.id);
      const mesesPagados: Record<string, boolean> = {};
      
      // Para cada mes del año, verificar si está pagado
      meses.forEach(mes => {
        const periodo = `${añoSeleccionado}${mes.num}`;
        const charge = chargesEmp.find(c => c.periodo === periodo);
        
        if (!charge) {
          // No hay cargo para este período, considerarlo como no pagado
          mesesPagados[periodo] = false;
        } else {
          // Verificar si hay pagos para este cargo
          const pagosDelCargo = pagosEmp.filter(p => p.chargeId === charge.id);
          
          // Calcular total de pagos aprobados o pendientes
          const totalPagado = pagosDelCargo
            .filter(p => p.estado === 'aprobado' || p.estado === 'pendiente')
            .reduce((sum, p) => sum + p.monto, 0);
          
          // Está pagado si:
          // 1. El saldo del cargo es 0 (completamente pagado y aprobado), O
          // 2. Hay pagos pendientes/aprobados que cubren el monto original
          mesesPagados[periodo] = charge.saldo === 0 || totalPagado >= charge.montoOriginal;
        }
      });

      // Calcular meses de deuda (solo meses que ya pasaron o están en curso)
      const mesActual = new Date().getMonth() + 1; // 1-12
      const añoActual = new Date().getFullYear();
      
      let mesesDeuda = 0;
      meses.forEach((mes, idx) => {
        const numMes = idx + 1;
        const periodo = `${añoSeleccionado}${mes.num}`;
        
        // Solo contar si el mes ya pasó o es el actual (en el año seleccionado)
        if (añoSeleccionado < añoActual || (añoSeleccionado === añoActual && numMes <= mesActual)) {
          if (!mesesPagados[periodo]) {
            mesesDeuda++;
          }
        }
      });

      // Clasificación: 0=Al día, 1=Atrasado, 2=Moroso, 3+=Deudor
      const esAlDia = mesesDeuda === 0;
      const esAtrasado = mesesDeuda === 1;
      const esMoroso = mesesDeuda === 2;
      const esDeudor = mesesDeuda >= 3;

      return {
        empadronado: emp,
        mesesPagados,
        mesesDeuda,
        esAlDia,
        esAtrasado,
        esMoroso,
        esDeudor
      };
    });

    return filas;
  }, [empadronados, charges, pagos, añoSeleccionado]);

  // Filtrar y buscar
  const filasFiltradas = useMemo(() => {
    let resultado = filasBalance;

    // Filtro por estado
    if (filtroEstado === "al-dia") {
      resultado = resultado.filter(f => f.esAlDia);
    } else if (filtroEstado === "atrasados") {
      resultado = resultado.filter(f => f.esAtrasado);
    } else if (filtroEstado === "morosos") {
      resultado = resultado.filter(f => f.esMoroso);
    } else if (filtroEstado === "deudores") {
      resultado = resultado.filter(f => f.esDeudor);
    }

    // Búsqueda (inteligente para números de padrón)
    if (busqueda.trim()) {
      const termino = busqueda.toLowerCase().trim();
      
      // Si busca solo números, buscar también en el número de padrón sin prefijo
      const esNumero = /^\d+$/.test(termino);
      const numeroLimpio = parseInt(termino, 10);
      
      resultado = resultado.filter(f => {
        const emp = f.empadronado;
        const padron = emp.numeroPadron || "";
        
        // Si es número, comparar el número extraído del padrón
        if (esNumero && !isNaN(numeroLimpio)) {
          const numPadron = parseInt(padron.replace(/\D/g, "") || "0", 10);
          if (numPadron === numeroLimpio) return true;
        }
        
        // Búsqueda normal por texto
        return (
          padron.toLowerCase().includes(termino) ||
          emp.nombre?.toLowerCase().includes(termino) ||
          emp.apellidos?.toLowerCase().includes(termino) ||
          emp.manzana?.toLowerCase().includes(termino) ||
          emp.lote?.toLowerCase().includes(termino)
        );
      });
    }

    // Ordenar por número de padrón (extrae el número para ordenar correctamente)
    // Funciona con formatos: P00002, P002, P2, 002, etc.
    resultado.sort((a, b) => {
      const padronA = a.empadronado.numeroPadron || "";
      const padronB = b.empadronado.numeroPadron || "";
      
      // Extraer solo los dígitos del número de padrón
      const numA = parseInt(padronA.replace(/\D/g, "") || "0", 10);
      const numB = parseInt(padronB.replace(/\D/g, "") || "0", 10);
      
      return numA - numB;
    });

    return resultado;
  }, [filasBalance, filtroEstado, busqueda]);

  // Estadísticas
  const estadisticas = useMemo(() => {
    return {
      total: filasBalance.length,
      alDia: filasBalance.filter(f => f.esAlDia).length,
      atrasados: filasBalance.filter(f => f.esAtrasado).length,
      morosos: filasBalance.filter(f => f.esMoroso).length,
      deudores: filasBalance.filter(f => f.esDeudor).length
    };
  }, [filasBalance]);

  // Obtener inicial de un nombre
  const obtenerInicial = (texto: string | undefined): string => {
    if (!texto) return "";
    return texto.charAt(0).toUpperCase() + ".";
  };

  // Obtener primer y segundo nombre/apellido
  const dividirNombre = (nombreCompleto: string | undefined): { primero: string; segundo: string } => {
    if (!nombreCompleto) return { primero: "", segundo: "" };
    const partes = nombreCompleto.trim().split(/\s+/);
    return {
      primero: partes[0] || "",
      segundo: partes[1] || ""
    };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background pb-20 md:pb-0">
        <TopNavigation />
        <main className="container mx-auto px-4 py-6">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Cargando balances...</p>
          </div>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-0">
      <TopNavigation />
      <main className="container mx-auto px-4 py-6 space-y-6">
        <BackButton />

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <FileBarChart className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              Balances de Pagos
            </h1>
            <p className="text-muted-foreground">
              Estado de cuenta de todos los asociados
            </p>
          </div>
        </div>

        {/* Estadísticas */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Card>
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <Users className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="text-xs text-muted-foreground">Total</p>
                  <p className="text-xl font-bold">{estadisticas.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-6 w-6 text-green-600" />
                <div>
                  <p className="text-xs text-green-700">Al Día</p>
                  <p className="text-xl font-bold text-green-600">{estadisticas.alDia}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-orange-200 bg-orange-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-6 w-6 text-orange-600" />
                <div>
                  <p className="text-xs text-orange-700">Atrasados</p>
                  <p className="text-xl font-bold text-orange-600">{estadisticas.atrasados}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-200 bg-red-50/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-600" />
                <div>
                  <p className="text-xs text-red-700">Morosos</p>
                  <p className="text-xl font-bold text-red-600">{estadisticas.morosos}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-red-300 bg-red-100/50">
            <CardContent className="p-3">
              <div className="flex items-center gap-2">
                <XCircle className="h-6 w-6 text-red-800" />
                <div>
                  <p className="text-xs text-red-800">Deudores</p>
                  <p className="text-xl font-bold text-red-800">{estadisticas.deudores}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filtros y búsqueda */}
        <Card>
          <CardHeader>
            <CardTitle>Filtros y Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Año</label>
                <Select value={añoSeleccionado.toString()} onValueChange={(v) => setAñoSeleccionado(parseInt(v))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="2024">2024</SelectItem>
                    <SelectItem value="2025">2025</SelectItem>
                    <SelectItem value="2026">2026</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  <Filter className="h-4 w-4 inline mr-1" />
                  Estado
                </label>
                <Select value={filtroEstado} onValueChange={(v: any) => setFiltroEstado(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="al-dia">🟢 Al Día (0 meses)</SelectItem>
                    <SelectItem value="atrasados">🟠 Atrasados (1 mes)</SelectItem>
                    <SelectItem value="morosos">🔴 Morosos (2 meses)</SelectItem>
                    <SelectItem value="deudores">🔴 Deudores (3+ meses)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  <Search className="h-4 w-4 inline mr-1" />
                  Buscar
                </label>
                <Input
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Padrón, nombre, manzana..."
                />
              </div>
            </div>

            {/* Leyenda */}
            <div className="flex flex-wrap items-center gap-3 p-3 bg-muted rounded-lg text-xs">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <span>Pagado</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-red-600" />
                <span>No Pagado</span>
              </div>
              <span className="text-muted-foreground">|</span>
              <Badge className="bg-green-100 text-green-700 text-xs">Al Día</Badge>
              <span>0 meses</span>
              <Badge className="bg-orange-100 text-orange-700 text-xs">Atrasado</Badge>
              <span>1 mes</span>
              <Badge className="bg-red-100 text-red-700 text-xs">Moroso</Badge>
              <span>2 meses</span>
              <Badge className="bg-red-200 text-red-900 text-xs font-bold">Deudor</Badge>
              <span>3+ meses</span>
            </div>
          </CardContent>
        </Card>

        {/* Tabla de balances */}
        <Card>
          <CardHeader>
            <CardTitle>
              Balance de Pagos {añoSeleccionado}
              <Badge variant="outline" className="ml-2">
                {filasFiltradas.length} asociados
              </Badge>
            </CardTitle>
            <CardDescription>
              Vista tipo Excel con estado de pagos mensuales
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-muted">
                    <th className="border p-2 text-left sticky left-0 bg-muted z-10 min-w-[80px]">Padrón</th>
                    <th className="border p-2 text-left min-w-[100px]">Nombre</th>
                    <th className="border p-2 text-center min-w-[40px]">2°N</th>
                    <th className="border p-2 text-left min-w-[100px]">Apellido</th>
                    <th className="border p-2 text-center min-w-[40px]">2°A</th>
                    <th className="border p-2 text-left min-w-[120px]">Dirección</th>
                    {meses.map(mes => (
                      <th key={mes.num} className="border p-2 text-center min-w-[40px] bg-blue-50">
                        {mes.nombre}
                      </th>
                    ))}
                    <th className="border p-2 text-center min-w-[60px] bg-muted">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {filasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={18} className="text-center py-8 text-muted-foreground">
                        No se encontraron resultados
                      </td>
                    </tr>
                  ) : (
                    filasFiltradas.map((fila) => {
                      const emp = fila.empadronado;
                      const { primero: primerNombre, segundo: segundoNombre } = dividirNombre(emp.nombre);
                      const { primero: primerApellido, segundo: segundoApellido } = dividirNombre(emp.apellidos);
                      const direccion = `Mz ${emp.manzana || ""} Lt ${emp.lote || ""} ${emp.etapa || ""}`.trim();

                      return (
                        <tr key={emp.id} className="hover:bg-muted/50">
                          <td className="border p-2 font-medium sticky left-0 bg-background">
                            {emp.numeroPadron}
                          </td>
                          <td className="border p-2">{primerNombre}</td>
                          <td className="border p-2 text-center text-muted-foreground">
                            {obtenerInicial(segundoNombre)}
                          </td>
                          <td className="border p-2">{primerApellido}</td>
                          <td className="border p-2 text-center text-muted-foreground">
                            {obtenerInicial(segundoApellido)}
                          </td>
                          <td className="border p-2 text-xs">{direccion}</td>
                          
                          {/* Meses */}
                          {meses.map(mes => {
                            const periodo = `${añoSeleccionado}${mes.num}`;
                            const pagado = fila.mesesPagados[periodo];
                            
                            return (
                              <td 
                                key={mes.num} 
                                className={`border p-2 text-center ${pagado ? 'bg-green-50' : 'bg-red-50'}`}
                              >
                                {pagado ? (
                                  <CheckCircle className="h-4 w-4 text-green-600 mx-auto" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600 mx-auto" />
                                )}
                              </td>
                            );
                          })}

                          {/* Estado */}
                          <td className="border p-2 text-center">
                            {fila.esAlDia && (
                              <Badge className="bg-green-100 text-green-700 text-xs">
                                Al Día
                              </Badge>
                            )}
                            {fila.esAtrasado && (
                              <Badge className="bg-orange-100 text-orange-700 text-xs">
                                Atrasado
                              </Badge>
                            )}
                            {fila.esMoroso && (
                              <Badge className="bg-red-100 text-red-700 text-xs">
                                Moroso
                              </Badge>
                            )}
                            {fila.esDeudor && (
                              <Badge className="bg-red-200 text-red-900 text-xs font-bold">
                                Deudor ({fila.mesesDeuda}m)
                              </Badge>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
      <BottomNavigation />
    </div>
  );
};

export default Balances;
