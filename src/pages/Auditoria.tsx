import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  FileText, 
  Users, 
  CreditCard, 
  Shield, 
  Building,
  Download,
  Filter,
  RefreshCw,
  Activity,
  Clock,
  User,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Edit,
  Trash2,
  Plus,
  Eye,
  DollarSign,
  UserPlus,
  Settings,
  Ban,
  Loader2
} from 'lucide-react';
import { listAuditLogs } from '@/services/rtdb';
import { AuditLog } from '@/types/auth';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Mapeo de módulos con iconos y colores
const MODULOS_CONFIG: Record<string, { label: string; icon: React.ElementType; color: string }> = {
  empadronados: { label: 'Padrón', icon: Users, color: 'bg-blue-500' },
  cobranzas: { label: 'Cobranzas', icon: CreditCard, color: 'bg-green-500' },
  'cobranzas-v2': { label: 'Cobranzas V2', icon: DollarSign, color: 'bg-emerald-500' },
  seguridad: { label: 'Seguridad', icon: Shield, color: 'bg-red-500' },
  finanzas: { label: 'Finanzas', icon: DollarSign, color: 'bg-yellow-500' },
  deportes: { label: 'Deportes', icon: Activity, color: 'bg-purple-500' },
  eventos: { label: 'Eventos', icon: CalendarIcon, color: 'bg-pink-500' },
  patrimonio: { label: 'Patrimonio', icon: Building, color: 'bg-orange-500' },
  usuarios: { label: 'Usuarios', icon: UserPlus, color: 'bg-indigo-500' },
  permisos: { label: 'Permisos', icon: Settings, color: 'bg-slate-500' },
  sanciones: { label: 'Sanciones', icon: Ban, color: 'bg-rose-500' },
};

// Mapeo de acciones con iconos y descripciones
const ACCIONES_CONFIG: Record<string, { label: string; icon: React.ElementType; variant: 'default' | 'destructive' | 'secondary' | 'outline' }> = {
  crear_empadronado: { label: 'Crear empadronado', icon: Plus, variant: 'default' },
  actualizar_empadronado: { label: 'Actualizar empadronado', icon: Edit, variant: 'secondary' },
  eliminar_empadronado: { label: 'Eliminar empadronado', icon: Trash2, variant: 'destructive' },
  registrar_pago: { label: 'Registrar pago', icon: CreditCard, variant: 'default' },
  aprobar_pago: { label: 'Aprobar pago', icon: CheckCircle, variant: 'default' },
  rechazar_pago: { label: 'Rechazar pago', icon: AlertCircle, variant: 'destructive' },
  anular_cargo: { label: 'Anular cargo', icon: Ban, variant: 'destructive' },
  crear_usuario: { label: 'Crear usuario', icon: UserPlus, variant: 'default' },
  actualizar_permisos: { label: 'Actualizar permisos', icon: Settings, variant: 'secondary' },
  crear_delegacion: { label: 'Crear delegación', icon: Plus, variant: 'default' },
  revocar_delegacion: { label: 'Revocar delegación', icon: Trash2, variant: 'destructive' },
  crear_modulo: { label: 'Crear módulo', icon: Plus, variant: 'default' },
  actualizar_modulo: { label: 'Actualizar módulo', icon: Edit, variant: 'secondary' },
  crear_rol: { label: 'Crear rol', icon: Plus, variant: 'default' },
  actualizar_rol: { label: 'Actualizar rol', icon: Edit, variant: 'secondary' },
  bootstrap: { label: 'Inicialización sistema', icon: Settings, variant: 'outline' },
};

const Auditoria = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModulo, setSelectedModulo] = useState<string>('todos');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);
  const [expandedLog, setExpandedLog] = useState<string | null>(null);

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
        description: 'No se pudieron cargar los registros de auditoría',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLogs();
  }, [dateFrom, dateTo]);

  // Obtener módulos únicos de los logs
  const modulosEncontrados = useMemo(() => {
    const modulos = new Set<string>();
    logs.forEach(log => {
      if (log.moduloId) {
        modulos.add(log.moduloId);
      }
    });
    return Array.from(modulos).sort();
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
        const matchesActor = log.actorUid?.toLowerCase().includes(searchLower);
        const matchesAccion = log.accion?.toLowerCase().includes(searchLower);
        const matchesModulo = log.moduloId?.toLowerCase().includes(searchLower);
        const matchesOld = JSON.stringify(log.old || {}).toLowerCase().includes(searchLower);
        const matchesNew = JSON.stringify(log.new || {}).toLowerCase().includes(searchLower);
        
        return matchesActor || matchesAccion || matchesModulo || matchesOld || matchesNew;
      }
      
      return true;
    });
  }, [logs, selectedModulo, searchTerm]);

  // Estadísticas
  const stats = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayTs = today.getTime();
    
    const thisWeek = new Date();
    thisWeek.setDate(thisWeek.getDate() - 7);
    const weekTs = thisWeek.getTime();

    return {
      total: logs.length,
      today: logs.filter(l => l.ts >= todayTs).length,
      thisWeek: logs.filter(l => l.ts >= weekTs).length,
      byModule: modulosEncontrados.reduce((acc, mod) => {
        acc[mod] = logs.filter(l => l.moduloId === mod).length;
        return acc;
      }, {} as Record<string, number>)
    };
  }, [logs, modulosEncontrados]);

  const formatTimestamp = (ts: number) => {
    return format(new Date(ts), "dd/MM/yyyy HH:mm:ss", { locale: es });
  };

  const formatTimeAgo = (ts: number) => {
    const now = Date.now();
    const diff = now - ts;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Ahora';
    if (minutes < 60) return `Hace ${minutes}m`;
    if (hours < 24) return `Hace ${hours}h`;
    return `Hace ${days}d`;
  };

  const getModuloConfig = (moduloId?: string) => {
    if (!moduloId) return { label: 'Sistema', icon: Settings, color: 'bg-gray-500' };
    return MODULOS_CONFIG[moduloId] || { label: moduloId, icon: FileText, color: 'bg-gray-400' };
  };

  const getAccionConfig = (accion: string) => {
    return ACCIONES_CONFIG[accion] || { label: accion, icon: Activity, variant: 'outline' as const };
  };

  const exportarCSV = () => {
    const headers = ['Fecha/Hora', 'Usuario', 'Módulo', 'Acción', 'Detalles'];
    const rows = filteredLogs.map(log => [
      formatTimestamp(log.ts),
      log.actorUid,
      log.moduloId || 'Sistema',
      log.accion,
      JSON.stringify(log.new || {})
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.map(c => `"${c}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `auditoria-${format(new Date(), 'yyyyMMdd-HHmmss')}.csv`;
    a.click();

    toast({
      title: 'Exportación completada',
      description: `Se exportaron ${filteredLogs.length} registros`
    });
  };

  const LogItem = ({ log }: { log: AuditLog }) => {
    const moduloConfig = getModuloConfig(log.moduloId);
    const accionConfig = getAccionConfig(log.accion);
    const AccionIcon = accionConfig.icon;
    const ModuloIcon = moduloConfig.icon;
    const isExpanded = expandedLog === log.id;

    return (
      <div 
        className={cn(
          "border rounded-lg p-3 sm:p-4 transition-all cursor-pointer hover:shadow-md",
          isExpanded ? "bg-muted/50 ring-1 ring-primary/20" : "bg-card hover:bg-muted/30"
        )}
        onClick={() => setExpandedLog(isExpanded ? null : log.id)}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icono del módulo */}
            <div className={cn("p-2 rounded-lg shrink-0", moduloConfig.color)}>
              <ModuloIcon className="h-4 w-4 text-white" />
            </div>
            
            <div className="flex-1 min-w-0">
              {/* Acción */}
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={accionConfig.variant} className="text-xs">
                  <AccionIcon className="h-3 w-3 mr-1" />
                  {accionConfig.label}
                </Badge>
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  en {moduloConfig.label}
                </span>
              </div>
              
              {/* Usuario y tiempo */}
              <div className="flex items-center gap-2 mt-1.5 text-sm">
                <User className="h-3 w-3 text-muted-foreground" />
                <span className="text-muted-foreground truncate max-w-[150px] sm:max-w-[250px]">
                  {log.actorUid}
                </span>
              </div>
            </div>
          </div>

          {/* Timestamp */}
          <div className="text-right shrink-0">
            <div className="text-xs font-medium">{formatTimeAgo(log.ts)}</div>
            <div className="text-[10px] text-muted-foreground hidden sm:block">
              {formatTimestamp(log.ts)}
            </div>
          </div>
        </div>

        {/* Detalles expandidos */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-3 animate-in fade-in duration-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div>
                <Label className="text-xs text-muted-foreground">Fecha completa</Label>
                <p className="font-medium">{formatTimestamp(log.ts)}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">ID de registro</Label>
                <p className="font-mono text-xs">{log.id}</p>
              </div>
              {log.targetUid && (
                <div className="col-span-full">
                  <Label className="text-xs text-muted-foreground">Objetivo</Label>
                  <p className="font-mono text-xs break-all">{log.targetUid}</p>
                </div>
              )}
            </div>
            
            {log.new && Object.keys(log.new).length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Datos nuevos/cambios</Label>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-32">
                  {JSON.stringify(log.new, null, 2)}
                </pre>
              </div>
            )}
            
            {log.old && Object.keys(log.old).length > 0 && (
              <div>
                <Label className="text-xs text-muted-foreground">Datos anteriores</Label>
                <pre className="mt-1 p-2 bg-muted rounded text-xs overflow-x-auto max-h-32">
                  {JSON.stringify(log.old, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto p-4 sm:p-6 max-w-7xl">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <BackButton />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
                <Activity className="h-7 w-7 text-primary" />
                Auditoría del Sistema
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Registro de todas las acciones importantes
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
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              <span className="hidden sm:inline">Actualizar</span>
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportarCSV}
              disabled={filteredLogs.length === 0}
            >
              <Download className="h-4 w-4 mr-1" />
              <span className="hidden sm:inline">Exportar CSV</span>
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <Card className="bg-gradient-to-br from-primary/10 to-primary/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-primary" />
                <span className="text-sm text-muted-foreground">Total</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.total}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-500/10 to-green-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Hoy</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.today}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-500/10 to-blue-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-muted-foreground">Esta semana</span>
              </div>
              <p className="text-2xl font-bold mt-1">{stats.thisWeek}</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-500/10 to-purple-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Filter className="h-5 w-5 text-purple-600" />
                <span className="text-sm text-muted-foreground">Filtrados</span>
              </div>
              <p className="text-2xl font-bold mt-1">{filteredLogs.length}</p>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Búsqueda */}
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por usuario, acción, módulo..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              {/* Fecha desde */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal w-full sm:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateFrom ? format(dateFrom, "dd/MM/yy") : "Desde"}
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

              {/* Fecha hasta */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="justify-start text-left font-normal w-full sm:w-auto">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateTo ? format(dateTo, "dd/MM/yy") : "Hasta"}
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

              {/* Limpiar filtros */}
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
          </CardContent>
        </Card>

        {/* Tabs por módulo */}
        <Tabs value={selectedModulo} onValueChange={setSelectedModulo} className="space-y-4">
          <TabsList className="w-full justify-start overflow-x-auto flex-nowrap h-auto p-1 bg-muted/50">
            <TabsTrigger value="todos" className="shrink-0">
              <Activity className="h-4 w-4 mr-1.5" />
              Todos
              <Badge variant="secondary" className="ml-1.5 text-xs">
                {logs.length}
              </Badge>
            </TabsTrigger>
            
            {modulosEncontrados.map(modulo => {
              const config = getModuloConfig(modulo);
              const ModIcon = config.icon;
              const count = stats.byModule[modulo] || 0;
              
              return (
                <TabsTrigger key={modulo} value={modulo} className="shrink-0">
                  <ModIcon className="h-4 w-4 mr-1.5" />
                  <span className="hidden sm:inline">{config.label}</span>
                  <Badge variant="secondary" className="ml-1.5 text-xs">
                    {count}
                  </Badge>
                </TabsTrigger>
              );
            })}
          </TabsList>

          <TabsContent value={selectedModulo} className="mt-4">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredLogs.length === 0 ? (
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Activity className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">Sin registros</h3>
                  <p className="text-muted-foreground text-sm text-center">
                    {searchTerm 
                      ? 'No se encontraron registros con los filtros aplicados'
                      : 'No hay registros de auditoría disponibles'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <ScrollArea className="h-[calc(100vh-450px)] min-h-[400px]">
                <div className="space-y-3 pr-4">
                  {filteredLogs.map(log => (
                    <LogItem key={log.id} log={log} />
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Auditoria;
