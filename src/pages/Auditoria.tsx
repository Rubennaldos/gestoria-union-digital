import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import BackButton from '@/components/layout/BackButton';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import {
  Search, 
  Calendar as CalendarIcon, 
  Users, 
  CreditCard, 
  Shield, 
  Building,
  Download,
  RefreshCw,
  Activity,
  Clock,
  User,
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  DollarSign,
  UserPlus,
  Settings,
  Ban,
  Loader2,
  Trophy,
  PartyPopper,
  MessageSquare,
  FileText,
  Briefcase,
  Scale
} from 'lucide-react';
import { listAuditLogs } from '@/services/rtdb';
import { AuditLog } from '@/types/auth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Configuración de todos los módulos del sistema
const MODULOS_TABS = [
  { id: 'todos', label: 'Todos', icon: Activity },
  { id: 'empadronados', label: 'Padrón', icon: Users },
  { id: 'cobranzas', label: 'Cobranzas', icon: CreditCard },
  { id: 'finanzas', label: 'Finanzas', icon: DollarSign },
  { id: 'seguridad', label: 'Seguridad', icon: Shield },
  { id: 'deportes', label: 'Deportes', icon: Trophy },
  { id: 'eventos', label: 'Eventos', icon: PartyPopper },
  { id: 'patrimonio', label: 'Patrimonio', icon: Building },
  { id: 'comunicaciones', label: 'Comunicaciones', icon: MessageSquare },
  { id: 'sanciones', label: 'Sanciones', icon: Scale },
  { id: 'planilla', label: 'Planilla', icon: Briefcase },
  { id: 'usuarios', label: 'Usuarios', icon: UserPlus },
  { id: 'permisos', label: 'Permisos', icon: Settings },
];

// Descripciones amigables de las acciones
const ACCIONES_LEGIBLES: Record<string, { texto: string; icono: React.ElementType; color: string }> = {
  crear_empadronado: { texto: 'Registró nuevo asociado', icono: Plus, color: 'text-green-600' },
  actualizar_empadronado: { texto: 'Actualizó datos de asociado', icono: Edit, color: 'text-blue-600' },
  eliminar_empadronado: { texto: 'Eliminó asociado', icono: Trash2, color: 'text-red-600' },
  registrar_pago: { texto: 'Registró un pago', icono: CreditCard, color: 'text-green-600' },
  aprobar_pago: { texto: 'Aprobó un pago', icono: CheckCircle, color: 'text-green-600' },
  rechazar_pago: { texto: 'Rechazó un pago', icono: Ban, color: 'text-red-600' },
  anular_cargo: { texto: 'Anuló una boleta', icono: Ban, color: 'text-orange-600' },
  crear_usuario: { texto: 'Creó nuevo usuario', icono: UserPlus, color: 'text-green-600' },
  actualizar_permisos: { texto: 'Modificó permisos', icono: Settings, color: 'text-blue-600' },
  crear_delegacion: { texto: 'Creó delegación', icono: Plus, color: 'text-green-600' },
  revocar_delegacion: { texto: 'Revocó delegación', icono: Trash2, color: 'text-red-600' },
  crear_modulo: { texto: 'Creó módulo', icono: Plus, color: 'text-green-600' },
  actualizar_modulo: { texto: 'Actualizó módulo', icono: Edit, color: 'text-blue-600' },
  crear_rol: { texto: 'Creó rol', icono: Plus, color: 'text-green-600' },
  actualizar_rol: { texto: 'Actualizó rol', icono: Edit, color: 'text-blue-600' },
  bootstrap: { texto: 'Inicializó el sistema', icono: Settings, color: 'text-purple-600' },
  registrar_reserva: { texto: 'Registró reserva deportiva', icono: Trophy, color: 'text-green-600' },
  cancelar_reserva: { texto: 'Canceló reserva deportiva', icono: Ban, color: 'text-red-600' },
  crear_evento: { texto: 'Creó evento', icono: PartyPopper, color: 'text-green-600' },
  inscribir_evento: { texto: 'Inscribió a evento', icono: Plus, color: 'text-green-600' },
  crear_sancion: { texto: 'Registró sanción', icono: Scale, color: 'text-red-600' },
  enviar_mensaje: { texto: 'Envió mensaje', icono: MessageSquare, color: 'text-blue-600' },
};

const Auditoria = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModulo, setSelectedModulo] = useState<string>('todos');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const filters: { startTs?: number; endTs?: number } = {};
      
      if (dateFrom) {
        filters.startTs = dateFrom.setHours(0, 0, 0, 0);
      }
      if (dateTo) {
        filters.endTs = dateTo.setHours(23, 59, 59, 999);
      }
      
      const data = await listAuditLogs(filters);
      setLogs(data);
    } catch (error) {
      console.error('Error loading audit logs:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los registros',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [dateFrom, dateTo]);

  // Contar logs por módulo
  const conteosPorModulo = useMemo(() => {
    const conteos: Record<string, number> = { todos: logs.length };
    MODULOS_TABS.forEach(m => {
      if (m.id !== 'todos') {
        conteos[m.id] = logs.filter(l => l.moduloId === m.id).length;
      }
    });
    return conteos;
  }, [logs]);

  // Filtrar logs
  const filteredLogs = useMemo(() => {
    return logs.filter(log => {
      // Filtro por módulo
      if (selectedModulo !== 'todos' && log.moduloId !== selectedModulo) {
        return false;
      }
      
      // Filtro por búsqueda
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const accionTexto = ACCIONES_LEGIBLES[log.accion]?.texto || log.accion;
        return accionTexto.toLowerCase().includes(searchLower);
      }
      
      return true;
    });
  }, [logs, selectedModulo, searchTerm]);

  const formatFecha = (ts: number) => {
    return format(new Date(ts), "dd 'de' MMMM, yyyy", { locale: es });
  };

  const formatHora = (ts: number) => {
    return format(new Date(ts), "HH:mm", { locale: es });
  };

  const formatTimeAgo = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora mismo';
    if (minutes < 60) return `Hace ${minutes} min`;
    if (hours < 24) return `Hace ${hours}h`;
    if (days === 1) return 'Ayer';
    if (days < 7) return `Hace ${days} días`;
    return formatFecha(ts);
  };

  const getAccionInfo = (accion: string) => {
    return ACCIONES_LEGIBLES[accion] || { 
      texto: accion.replace(/_/g, ' '), 
      icono: Activity, 
      color: 'text-gray-600' 
    };
  };

  const getDetalleAmigable = (log: AuditLog): string | null => {
    const data = log.new || log.old;
    if (!data) return null;

    // Extraer información relevante según el tipo de acción
    if (data.nombre && data.apellidos) {
      return `${data.nombre} ${data.apellidos}`;
    }
    if (data.nombreCompleto) {
      return data.nombreCompleto;
    }
    if (data.motivo) {
      return `Motivo: ${data.motivo}`;
    }
    if (data.monto) {
      return `S/ ${parseFloat(data.monto).toFixed(2)}`;
    }
    if (data.periodo) {
      const year = data.periodo.substring(0, 4);
      const month = parseInt(data.periodo.substring(4, 6));
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `Período: ${meses[month - 1]} ${year}`;
    }
    
    return null;
  };

  const exportarCSV = () => {
    const headers = ['Fecha', 'Hora', 'Acción', 'Módulo', 'Detalle'];
    const rows = filteredLogs.map(log => {
      const accionInfo = getAccionInfo(log.accion);
      const modulo = MODULOS_TABS.find(m => m.id === log.moduloId)?.label || 'Sistema';
      return [
        formatFecha(log.ts),
        formatHora(log.ts),
        accionInfo.texto,
        modulo,
        getDetalleAmigable(log) || ''
      ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${format(new Date(), 'dd-MM-yyyy')}.csv`;
    a.click();

    toast({
      title: 'Exportado',
      description: `${filteredLogs.length} registros exportados`
    });
  };

  // Agrupar logs por fecha
  const logsAgrupados = useMemo(() => {
    const grupos: Record<string, AuditLog[]> = {};
    
    filteredLogs.forEach(log => {
      const fecha = format(new Date(log.ts), 'yyyy-MM-dd');
      if (!grupos[fecha]) {
        grupos[fecha] = [];
      }
      grupos[fecha].push(log);
    });
    
    return Object.entries(grupos).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filteredLogs]);

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 max-w-6xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <FileText className="h-7 w-7 text-primary" />
                Auditoría
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Historial de acciones en el sistema
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={loadLogs}
              disabled={loading}
            >
              <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarCSV}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4 sm:mr-1" />
              <span className="hidden sm:inline">Exportar</span>
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar acción..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateFrom ? format(dateFrom, "dd/MM") : "Desde"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateFrom}
                onSelect={setDateFrom}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="w-full sm:w-auto">
                <CalendarIcon className="h-4 w-4 mr-2" />
                {dateTo ? format(dateTo, "dd/MM") : "Hasta"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={dateTo}
                onSelect={setDateTo}
                locale={es}
              />
            </PopoverContent>
          </Popover>

          {(dateFrom || dateTo || searchTerm) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
                setSearchTerm('');
              }}
            >
              Limpiar
            </Button>
          )}
        </div>

        {/* Tabs por módulo */}
        <Tabs value={selectedModulo} onValueChange={setSelectedModulo}>
          <ScrollArea className="w-full">
            <TabsList className="inline-flex h-auto p-1 mb-4 bg-muted/50 w-max min-w-full">
              {MODULOS_TABS.map(modulo => {
                const Icon = modulo.icon;
                const count = conteosPorModulo[modulo.id] || 0;
                
                return (
                  <TabsTrigger 
                    key={modulo.id} 
                    value={modulo.id} 
                    className="flex items-center gap-1.5 px-3 py-2 whitespace-nowrap"
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm">{modulo.label}</span>
                    {count > 0 && (
                      <Badge variant="secondary" className="text-xs h-5 px-1.5">
                        {count}
                      </Badge>
                    )}
                  </TabsTrigger>
                );
              })}
            </TabsList>
          </ScrollArea>

          <TabsContent value={selectedModulo} className="mt-0">
            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-16">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">Sin registros</h3>
                  <p className="text-muted-foreground text-sm text-center">
                    No hay acciones registradas en este módulo
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {logsAgrupados.map(([fecha, logsDelDia]) => (
                  <div key={fecha}>
                    {/* Encabezado de fecha */}
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="text-sm font-medium text-muted-foreground">
                        {formatFecha(logsDelDia[0].ts)}
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {logsDelDia.length} {logsDelDia.length === 1 ? 'acción' : 'acciones'}
                      </Badge>
                    </div>

                    {/* Lista de acciones del día */}
                    <div className="space-y-2">
                      {logsDelDia.map(log => {
                        const accionInfo = getAccionInfo(log.accion);
                        const AccionIcon = accionInfo.icono;
                        const detalle = getDetalleAmigable(log);
                        const moduloInfo = MODULOS_TABS.find(m => m.id === log.moduloId);

                        return (
                          <Card key={log.id} className="hover:shadow-sm transition-shadow">
                            <CardContent className="p-3 sm:p-4">
                              <div className="flex items-start gap-3">
                                {/* Icono de la acción */}
                                <div className={cn("p-2 rounded-full bg-muted shrink-0", accionInfo.color)}>
                                  <AccionIcon className="h-4 w-4" />
                                </div>

                                {/* Contenido principal */}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-start justify-between gap-2">
                                    <div>
                                      <p className="font-medium text-sm sm:text-base">
                                        {accionInfo.texto}
                                      </p>
                                      {detalle && (
                                        <p className="text-sm text-muted-foreground mt-0.5">
                                          {detalle}
                                        </p>
                                      )}
                                    </div>
                                    
                                    {/* Hora */}
                                    <div className="text-right shrink-0">
                                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                        <Clock className="h-3 w-3" />
                                        {formatHora(log.ts)}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Módulo (solo si estamos en "Todos") */}
                                  {selectedModulo === 'todos' && moduloInfo && (
                                    <Badge variant="outline" className="mt-2 text-xs">
                                      {moduloInfo.label}
                                    </Badge>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auditoria;
