import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import BackButton from '@/components/layout/BackButton';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import {
  Users, UserPlus, Search, Edit3, Trash2, Home, Construction, MapPin, Eye,
  Download, KeyRound, Settings, Upload, Mail
} from 'lucide-react';
import { Empadronado, EmpadronadosStats } from '@/types/empadronados';
import { getEmpadronados, getEmpadronadosStats, deleteEmpadronado } from '@/services/empadronados';
import { ActualizacionMasivaModal } from '@/components/empadronados/ActualizacionMasivaModal';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthz } from '@/contexts/AuthzContext';
import { listModules, getUserPermissions, setUserPermissions as savePermissionsToRTDB } from '@/services/rtdb';
import { Module, Permission, PermissionLevel } from '@/types/auth';
import { GestionarPermisosModal } from '@/components/empadronados/GestionarPermisosModal';
import { CorreosAccesoModal } from '@/components/empadronados/CorreosAccesoModal';

// >>> XLSX: exportar / importar plantilla de DNI + fechaIngreso
import {
  exportEmpadronadosTemplateXLSX,
  importEmpadronadosXLSX
} from '@/services/empadronadosBulk';

const Empadronados: React.FC = () => {
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [filteredEmpadronados, setFilteredEmpadronados] = useState<Empadronado[]>([]);
  const [stats, setStats] = useState<EmpadronadosStats>({
    total: 0, viven: 0, construida: 0, construccion: 0, terreno: 0, masculinos: 0, femeninos: 0, habilitados: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEmpadronado, setSelectedEmpadronado] = useState<Empadronado | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteMotivo, setDeleteMotivo] = useState('');
  const [deletePdf, setDeletePdf] = useState<File | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [filterStatus, setFilterStatus] = useState<'all' | 'habilitado' | 'deshabilitado'>('all');
  const [filterVivienda, setFilterVivienda] = useState<'all' | 'construida' | 'construccion' | 'terreno'>('all');
  const [filterVive, setFilterVive] = useState<'all' | 'si' | 'no'>('all');
  const [filterManzana, setFilterManzana] = useState('');
  const [filterLote, setFilterLote] = useState('');
  const [filterEtapa, setFilterEtapa] = useState('');

  const [gestionarPermisosOpen, setGestionarPermisosOpen] = useState(false);
  const [modules, setModules] = useState<Module[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission>({});
  const [editingPermissions, setEditingPermissions] = useState(false);
  const [actualizacionMasivaOpen, setActualizacionMasivaOpen] = useState(false);
  const [correosAccesoOpen, setCorreosAccesoOpen] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { canDeleteWithoutAuth } = useAuthz();

  // XLSX: input de archivo
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    loadData();
    loadModules();
  }, []);

  const loadModules = async () => {
    try {
      const modulesData = await listModules();
      setModules(modulesData);
    } catch (error) {
      console.error('Error loading modules:', error);
    }
  };

  const loadUserPermissions = async (authUid?: string) => {
    if (!authUid) return;
    try {
      const permissions = await getUserPermissions(authUid);
      setUserPermissions(permissions || {});
    } catch (error) {
      console.error('Error loading user permissions:', error);
      setUserPermissions({});
    }
  };

  const saveUserPermissions = async (authUid?: string) => {
    if (!authUid) return;
    try {
      await savePermissionsToRTDB(authUid, userPermissions, user?.uid || 'system');
      toast({ title: "Éxito", description: "Permisos actualizados correctamente" });
      setEditingPermissions(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los permisos",
        variant: "destructive"
      });
    }
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [empadronadosData, statsData] = await Promise.all([
        getEmpadronados(),
        getEmpadronadosStats()
      ]);
      setEmpadronados(empadronadosData);
      setStats(statsData);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar los empadronados",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    applyFilters();
  }, [empadronados, searchTerm, filterStatus, filterVivienda, filterVive, filterManzana, filterLote, filterEtapa]);

  const applyFilters = () => {
    let filtered = [...empadronados];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(e =>
        e.nombre.toLowerCase().includes(term) ||
        e.apellidos.toLowerCase().includes(term) ||
        e.numeroPadron.toLowerCase().includes(term) ||
        e.dni.toLowerCase().includes(term) ||
        (e.miembrosFamilia &&
          e.miembrosFamilia.some(miembro =>
            miembro.nombre.toLowerCase().includes(term) ||
            miembro.apellidos.toLowerCase().includes(term)
          ))
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(e =>
        filterStatus === 'habilitado' ? e.habilitado : !e.habilitado
      );
    }

    if (filterManzana.trim()) {
      filtered = filtered.filter(e =>
        e.manzana?.toLowerCase().includes(filterManzana.toLowerCase())
      );
    }

    if (filterLote.trim()) {
      filtered = filtered.filter(e =>
        e.lote?.toLowerCase().includes(filterLote.toLowerCase())
      );
    }

    if (filterEtapa.trim()) {
      filtered = filtered.filter(e =>
        e.etapa?.toLowerCase().includes(filterEtapa.toLowerCase())
      );
    }

    if (filterVivienda !== 'all') {
      filtered = filtered.filter(e => e.estadoVivienda === filterVivienda);
    }

    if (filterVive !== 'all') {
      filtered = filtered.filter(e =>
        filterVive === 'si' ? e.vive : !e.vive
      );
    }

    setFilteredEmpadronados(filtered);
  };

  const handleDelete = async () => {
    if (!selectedEmpadronado || !deleteMotivo.trim()) {
      toast({
        title: "Error",
        description: "Debe especificar un motivo para la eliminación",
        variant: "destructive"
      });
      return;
    }

    if (!canDeleteWithoutAuth && deletePassword !== 'admin123') {
      toast({
        title: "Error",
        description: "Verifique la clave de presidencia",
        variant: "destructive"
      });
      return;
    }

    try {
      const success = await deleteEmpadronado(selectedEmpadronado.id, user?.uid || 'system', deleteMotivo);
      if (success) {
        toast({ title: "Éxito", description: "Empadronado eliminado correctamente" });
        setShowDeleteDialog(false);
        setDeletePassword('');
        setDeleteMotivo('');
        setDeletePdf(null);
        setSelectedEmpadronado(null);
        loadData();
      } else {
        throw new Error('Error al eliminar');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo eliminar el empadronado",
        variant: "destructive"
      });
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE');
  };

  const getViviendaIcon = (estado: string) => {
    switch (estado) {
      case 'construida': return <Home className="h-4 w-4" />;
      case 'construccion': return <Construction className="h-4 w-4" />;
      case 'terreno': return <MapPin className="h-4 w-4" />;
      default: return null;
    }
  };

  const getViviendaColor = (estado: string) => {
    switch (estado) {
      case 'construida': return 'bg-green-100 text-green-800';
      case 'construccion': return 'bg-yellow-100 text-yellow-800';
      case 'terreno': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // ───────── XLSX: Export/Import ─────────
  const onExportXLSX = async () => {
    await exportEmpadronadosTemplateXLSX();
    toast({ title: "Exportado", description: "Se descargó la plantilla Excel con instrucciones." });
  };

  const onClickImportXLSX = () => fileRef.current?.click();

  const onFileSelected: React.ChangeEventHandler<HTMLInputElement> = async (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setImporting(true);
    try {
      const actorUid = user?.uid || 'admin';
      const { ok, fail, errors } = await importEmpadronadosXLSX(f, actorUid);
      toast({
        title: "Importación completada",
        description: `Actualizados: ${ok} — Errores: ${fail}`
      });
      if (errors.length) console.warn('Errores importación:', errors);
      await loadData();
    } catch (err: any) {
      toast({
        title: "Error al importar",
        description: err?.message || "Revisa el archivo Excel",
        variant: "destructive"
      });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };
  // ───────────────────────────────────────

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 md:p-6 space-y-3 md:space-y-6">
      {/* Header - Mobile Optimized */}
      <div className="flex flex-col gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-4">
          <BackButton fallbackTo="/" />
          <div className="h-4 md:h-6 w-px bg-border" />
          <div>
            <h1 className="text-lg md:text-2xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Padrón de Asociados
            </h1>
            <p className="text-[10px] md:text-sm text-muted-foreground hidden sm:block">
              Gestión completa del registro de asociados
            </p>
          </div>
        </div>

        {/* Action Buttons - Mobile Grid */}
        <div className="grid grid-cols-2 md:flex md:flex-wrap gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className="h-8 md:h-9 text-xs md:text-sm transition-all hover:scale-105"
          >
            <Search className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Filtros</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={() => setCorreosAccesoOpen(true)}
            className="h-8 md:h-9 text-xs md:text-sm transition-all hover:scale-105"
          >
            <Mail className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Accesos</span>
          </Button>

          <Button 
            variant="outline" 
            size="sm"
            onClick={onExportXLSX}
            className="h-8 md:h-9 text-xs md:text-sm transition-all hover:scale-105"
          >
            <Download className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">Exportar</span>
          </Button>
          
          <Button 
            variant="outline" 
            size="sm"
            onClick={onClickImportXLSX} 
            disabled={importing}
            className="h-8 md:h-9 text-xs md:text-sm transition-all hover:scale-105"
          >
            <Upload className="h-3 w-3 md:h-4 md:w-4 md:mr-2" />
            <span className="hidden sm:inline">{importing ? 'Importando…' : 'Importar'}</span>
          </Button>
          
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
            onChange={onFileSelected}
          />

          <Button 
            onClick={() => navigate('/padron/nuevo')}
            size="sm"
            className="col-span-2 h-8 md:h-9 text-xs md:text-sm transition-all hover:scale-105"
          >
            <UserPlus className="h-3 w-3 md:h-4 md:w-4 mr-1.5 md:mr-2" />
            Nuevo Empadronado
          </Button>
        </div>
      </div>

      {/* Stats Cards - Modern & Compact */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4">
        <Card className="border-l-4 border-l-primary hover:shadow-md transition-all duration-300 animate-fade-in">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Total</CardTitle>
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-primary/10 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.total}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">{stats.habilitados} habilitados</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500 hover:shadow-md transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.1s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Activos</CardTitle>
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-green-500/10 flex items-center justify-center">
              <Home className="h-3.5 w-3.5 md:h-4 md:w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.viven}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Residen aquí</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 hover:shadow-md transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.2s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Viviendas</CardTitle>
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-blue-500/10 flex items-center justify-center">
              <Construction className="h-3.5 w-3.5 md:h-4 md:w-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.construida}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">
              {stats.construccion} constr., {stats.terreno} terreno
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500 hover:shadow-md transition-all duration-300 animate-fade-in" style={{ animationDelay: '0.3s' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-4">
            <CardTitle className="text-xs md:text-sm font-medium">Género</CardTitle>
            <div className="h-7 w-7 md:h-8 md:w-8 rounded-full bg-purple-500/10 flex items-center justify-center">
              <Users className="h-3.5 w-3.5 md:h-4 md:w-4 text-purple-600" />
            </div>
          </CardHeader>
          <CardContent className="p-3 md:p-4 pt-0 md:pt-0">
            <div className="text-xl md:text-2xl font-bold">{stats.masculinos}M / {stats.femeninos}F</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Distribución</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel - Compact */}
      {showFilters && (
        <Card className="animate-fade-in">
          <CardHeader className="p-3 md:p-4 bg-gradient-to-r from-primary/5 to-primary/10">
            <CardTitle className="text-sm md:text-lg">Filtros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 p-3 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
              <div>
                <Label htmlFor="search" className="text-xs md:text-sm">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Nombre, DNI, padrón..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-8 md:h-10 text-xs md:text-sm"
                />
              </div>

              <div>
                <Label className="text-xs md:text-sm">Estado</Label>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="habilitado">Habilitados</SelectItem>
                    <SelectItem value="deshabilitado">Deshabilitados</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs md:text-sm">Vivienda</Label>
                <Select value={filterVivienda} onValueChange={(value: any) => setFilterVivienda(value)}>
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todas</SelectItem>
                    <SelectItem value="construida">Construida</SelectItem>
                    <SelectItem value="construccion">En Construcción</SelectItem>
                    <SelectItem value="terreno">Solo Terreno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-xs md:text-sm">Residencia</Label>
                <Select value={filterVive} onValueChange={(value: any) => setFilterVive(value)}>
                  <SelectTrigger className="h-8 md:h-10 text-xs md:text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="si">Vive aquí</SelectItem>
                    <SelectItem value="no">No vive aquí</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-4">
              <div>
                <Label htmlFor="manzana" className="text-xs md:text-sm">Manzana</Label>
                <Input 
                  id="manzana" 
                  placeholder="Manzana..." 
                  value={filterManzana} 
                  onChange={(e) => setFilterManzana(e.target.value)} 
                  className="h-8 md:h-10 text-xs md:text-sm"
                />
              </div>

              <div>
                <Label htmlFor="lote" className="text-xs md:text-sm">Lote</Label>
                <Input 
                  id="lote" 
                  placeholder="Lote..." 
                  value={filterLote} 
                  onChange={(e) => setFilterLote(e.target.value)} 
                  className="h-8 md:h-10 text-xs md:text-sm"
                />
              </div>

              <div>
                <Label htmlFor="etapa" className="text-xs md:text-sm">Etapa</Label>
                <Input 
                  id="etapa" 
                  placeholder="Etapa..." 
                  value={filterEtapa} 
                  onChange={(e) => setFilterEtapa(e.target.value)} 
                  className="h-8 md:h-10 text-xs md:text-sm"
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterVivienda('all');
                    setFilterVive('all');
                    setFilterManzana('');
                    setFilterLote('');
                    setFilterEtapa('');
                  }}
                  className="w-full h-8 md:h-10 text-xs md:text-sm transition-all hover:scale-105"
                >
                  Limpiar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results count - Compact */}
      <div className="flex justify-between items-center px-1">
        <p className="text-xs md:text-sm text-muted-foreground">
          <span className="font-semibold">{filteredEmpadronados.length}</span> de {stats.total}
        </p>
      </div>

      {/* Table - Mobile Optimized */}
      <Card className="overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-gradient-to-r from-primary/5 to-primary/10">
                  <TableHead className="text-xs md:text-sm">Padrón</TableHead>
                  <TableHead className="text-xs md:text-sm">Nombre</TableHead>
                  <TableHead className="hidden md:table-cell text-xs md:text-sm">DNI</TableHead>
                  <TableHead className="hidden lg:table-cell text-xs md:text-sm">Email Acceso</TableHead>
                  <TableHead className="text-xs md:text-sm">Estado</TableHead>
                  <TableHead className="hidden sm:table-cell text-xs md:text-sm">Vivienda</TableHead>
                  <TableHead className="text-xs md:text-sm">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmpadronados.map((empadronado, idx) => (
                  <TableRow 
                    key={empadronado.id}
                    className="hover:bg-muted/50 transition-colors animate-fade-in"
                    style={{ animationDelay: `${idx * 0.02}s` }}
                  >
                    <TableCell className="font-medium text-xs md:text-sm py-2 md:py-4">
                      {empadronado.numeroPadron}
                    </TableCell>
                    <TableCell className="py-2 md:py-4">
                      <div>
                        <p className="font-medium text-xs md:text-sm">
                          {empadronado.nombre} {empadronado.apellidos}
                        </p>
                        <p className="text-[10px] md:text-xs text-muted-foreground">
                          {empadronado.familia}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-xs md:text-sm py-2 md:py-4">
                      {empadronado.dni}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell py-2 md:py-4">
                      {empadronado.emailAcceso ? (
                        <div className="space-y-1">
                          <div className="text-xs md:text-sm font-medium text-green-600">
                            {empadronado.emailAcceso}
                          </div>
                          <Badge variant="secondary" className="text-[10px] md:text-xs">
                            Activa
                          </Badge>
                        </div>
                      ) : (
                        <div className="text-xs md:text-sm text-muted-foreground">Sin acceso</div>
                      )}
                    </TableCell>
                    <TableCell className="py-2 md:py-4">
                      <Badge 
                        variant={empadronado.habilitado ? 'default' : 'secondary'}
                        className="text-[10px] md:text-xs"
                      >
                        {empadronado.habilitado ? 'Sí' : 'No'}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell py-2 md:py-4">
                      <div className="flex items-center gap-1.5">
                        {getViviendaIcon(empadronado.estadoVivienda)}
                        <Badge className={`${getViviendaColor(empadronado.estadoVivienda)} text-[10px] md:text-xs`}>
                          {empadronado.estadoVivienda === 'construida' ? 'Constr.'
                            : empadronado.estadoVivienda === 'construccion' ? 'En Constr.'
                              : 'Terreno'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="py-2 md:py-4">
                      <div className="flex gap-1">
                        <Sheet>
                          <SheetTrigger asChild>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setSelectedEmpadronado(empadronado)}
                              className="h-7 w-7 md:h-9 md:w-9 p-0 transition-all hover:scale-110"
                            >
                              <Eye className="h-3 w-3 md:h-4 md:w-4" />
                            </Button>
                          </SheetTrigger>

                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmpadronado(empadronado);
                              setGestionarPermisosOpen(true);
                            }}
                            className="h-7 w-7 md:h-9 md:w-9 p-0 transition-all hover:scale-110"
                          >
                            <Settings className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>

                        <SheetContent className="w-[600px] sm:w-[800px]">
                          {selectedEmpadronado && (
                            <>
                              <SheetHeader>
                                <SheetTitle>{selectedEmpadronado.nombre} {selectedEmpadronado.apellidos}</SheetTitle>
                                <SheetDescription>
                                  Padrón N° {selectedEmpadronado.numeroPadron} - {selectedEmpadronado.familia}
                                </SheetDescription>
                              </SheetHeader>

                              <div className="mt-6 space-y-6">
                                {/* Información personal */}
                                <div>
                                  <h4 className="font-semibold mb-3">Información Personal</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <Label className="text-muted-foreground">DNI</Label>
                                      <p>{selectedEmpadronado.dni}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Género</Label>
                                      <p className="capitalize">{selectedEmpadronado.genero}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Cumpleaños</Label>
                                      <p>{selectedEmpadronado.cumpleanos}</p>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Fecha Ingreso</Label>
                                      <p>{formatDate(selectedEmpadronado.fechaIngreso)}</p>
                                    </div>
                                  </div>
                                </div>

                                <Separator />

                                {/* Acceso al Sistema */}
                                {selectedEmpadronado && (
                                  <div>
                                    <h4 className="font-semibold mb-3">Acceso al Sistema</h4>
                                    <div className="space-y-4">
                                      {selectedEmpadronado.emailAcceso ? (
                                        <div className="space-y-3">
                                          <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                              <Label className="text-muted-foreground">Email de Acceso</Label>
                                              <p className="font-medium text-green-600">{selectedEmpadronado.emailAcceso}</p>
                                            </div>
                                            <div>
                                              <Label className="text-muted-foreground">Estado</Label>
                                              <Badge variant="secondary" className="text-xs">Cuenta activa</Badge>
                                            </div>
                                          </div>

                                          {/* Permisos de Módulos */}
                                          <div className="border rounded-lg p-4">
                                            <div className="flex items-center justify-between mb-3">
                                              <Label className="font-medium">Permisos de Módulos</Label>
                                              <Button
                                                size="sm"
                                                variant="outline"
                                                onClick={() => {
                                                  setEditingPermissions(!editingPermissions);
                                                  if (!editingPermissions) {
                                                    loadUserPermissions(selectedEmpadronado.authUid);
                                                    loadModules();
                                                  }
                                                }}
                                              >
                                                <Settings className="h-3 w-3 mr-1" />
                                                {editingPermissions ? 'Cancelar' : 'Editar'}
                                              </Button>
                                            </div>

                                            {editingPermissions ? (
                                              <div className="space-y-3">
                                                {modules.map((module) => {
                                                  const nivelActual = userPermissions[module.id] || 'none';
                                                  return (
                                                    <div key={module.id} className="border rounded-lg p-3 bg-muted/20">
                                                      <div className="flex items-center justify-between mb-2">
                                                        <span className="font-medium text-sm">{module.nombre}</span>
                                                        <Badge variant={
                                                          nivelActual === 'none' ? 'outline'
                                                            : nivelActual === 'read' ? 'secondary'
                                                              : nivelActual === 'write' ? 'default' : 'destructive'
                                                        }>
                                                          {nivelActual === 'none' ? 'Sin acceso'
                                                            : nivelActual === 'read' ? 'Lectura'
                                                              : nivelActual === 'write' ? 'Escritura' : 'Admin'}
                                                        </Badge>
                                                      </div>
                                                      <div className="grid grid-cols-4 gap-1">
                                                        {[
                                                          { valor: 'none', label: 'No', color: 'bg-muted text-muted-foreground' },
                                                          { valor: 'read', label: 'Leer', color: 'bg-blue-500 text-white' },
                                                          { valor: 'write', label: 'Escribir', color: 'bg-green-500 text-white' },
                                                          { valor: 'admin', label: 'Admin', color: 'bg-purple-500 text-white' }
                                                        ].map((opcion) => (
                                                          <button
                                                            key={opcion.valor}
                                                            onClick={() => setUserPermissions(prev => ({
                                                              ...prev,
                                                              [module.id]: opcion.valor as PermissionLevel
                                                            }))}
                                                            className={`text-xs px-2 py-1 rounded transition-all ${
                                                              nivelActual === opcion.valor
                                                                ? opcion.color
                                                                : 'bg-background border border-border hover:bg-muted text-muted-foreground'
                                                            }`}
                                                          >
                                                            {opcion.label}
                                                          </button>
                                                        ))}
                                                      </div>
                                                    </div>
                                                  );
                                                })}
                                                <div className="flex justify-end gap-2 mt-4">
                                                  <Button size="sm" variant="outline" onClick={() => setEditingPermissions(false)}>Cancelar</Button>
                                                  <Button size="sm" onClick={() => saveUserPermissions(selectedEmpadronado.authUid)}>Guardar Permisos</Button>
                                                </div>
                                              </div>
                                            ) : (
                                              <div className="space-y-2">
                                                {modules.map((module) => {
                                                  const nivel = userPermissions[module.id] || 'none';
                                                  return (
                                                    <div key={module.id} className="flex items-center justify-between p-2 rounded bg-muted/30">
                                                      <span className="text-sm">{module.nombre}</span>
                                                      <Badge variant={
                                                        nivel === 'none' ? 'outline'
                                                          : nivel === 'read' ? 'secondary'
                                                            : nivel === 'write' ? 'default' : 'destructive'
                                                      }>
                                                        {nivel === 'none' ? 'Sin acceso'
                                                          : nivel === 'read' ? 'Lectura'
                                                            : nivel === 'write' ? 'Escritura' : 'Admin'}
                                                      </Badge>
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <div className="text-center py-4 border-2 border-dashed rounded-lg">
                                          <KeyRound className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                          <p className="text-sm text-muted-foreground">No tiene acceso al sistema</p>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                <Separator />

                                {/* Contacto */}
                                <div>
                                  <h4 className="font-semibold mb-3">Contacto</h4>
                                  <div className="space-y-2 text-sm">
                                    <div>
                                      <Label className="text-muted-foreground">Dirección</Label>
                                      <p>Mz. {selectedEmpadronado.manzana} Lt. {selectedEmpadronado.lote} {selectedEmpadronado.etapa ? `Etapa ${selectedEmpadronado.etapa}` : ''}</p>
                                    </div>
                                    {selectedEmpadronado.telefonos && selectedEmpadronado.telefonos.length > 0 && (
                                      <div>
                                        <Label className="text-muted-foreground">Teléfonos</Label>
                                        <p>{selectedEmpadronado.telefonos.map(t => t.numero).filter(Boolean).join(', ')}</p>
                                      </div>
                                    )}
                                  </div>
                                </div>

                                <Separator />

                                {/* Vivienda y residencia */}
                                <div>
                                  <h4 className="font-semibold mb-3">Vivienda y Residencia</h4>
                                  <div className="grid grid-cols-2 gap-4 text-sm">
                                    <div>
                                      <Label className="text-muted-foreground">Estado Vivienda</Label>
                                      <div className="flex items-center gap-2 mt-1">
                                        {getViviendaIcon(selectedEmpadronado.estadoVivienda)}
                                        <Badge className={getViviendaColor(selectedEmpadronado.estadoVivienda)}>
                                          {selectedEmpadronado.estadoVivienda === 'construida' ? 'Construida'
                                            : selectedEmpadronado.estadoVivienda === 'construccion' ? 'En Construcción'
                                              : 'Solo Terreno'}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Vive aquí</Label>
                                      <div className="mt-1">
                                        <Badge variant={selectedEmpadronado.vive ? 'default' : 'outline'}>
                                          {selectedEmpadronado.vive ? 'Sí' : 'No'}
                                        </Badge>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                {/* Vehículos */}
                                {selectedEmpadronado.vehiculos && selectedEmpadronado.vehiculos.length > 0 && (
                                  <>
                                    <Separator />
                                    <div>
                                      <h4 className="font-semibold mb-3">Vehículos</h4>
                                      <div className="space-y-2">
                                        {selectedEmpadronado.vehiculos.map((vehiculo, index) => (
                                          <div key={index} className="flex items-center gap-2">
                                            <Badge variant="outline" className="text-xs">
                                              {vehiculo.placa} ({vehiculo.tipo})
                                            </Badge>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* Miembros de Familia */}
                                {selectedEmpadronado.miembrosFamilia && selectedEmpadronado.miembrosFamilia.length > 0 && (
                                  <>
                                    <Separator />
                                    <div>
                                      <h4 className="font-semibold mb-3">Miembros de Familia</h4>
                                      <div className="space-y-2">
                                        {selectedEmpadronado.miembrosFamilia.map((miembro, index) => (
                                          <div key={index} className="border-l-2 border-muted pl-3">
                                            <p className="font-medium">{miembro.nombre} {miembro.apellidos}</p>
                                            <p className="text-muted-foreground text-xs">{miembro.parentezco} • {miembro.cumpleanos}</p>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}

                                {/* Observaciones */}
                                {selectedEmpadronado.observaciones && (
                                  <>
                                    <Separator />
                                    <div>
                                      <h4 className="font-semibold mb-3">Observaciones</h4>
                                      <p className="text-sm">{selectedEmpadronado.observaciones}</p>
                                    </div>
                                  </>
                                )}
                              </div>
                            </>
                          )}
                        </SheetContent>
                      </Sheet>

                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => navigate(`/padron/editar/${empadronado.id}`)}
                        className="h-7 w-7 md:h-9 md:w-9 p-0 transition-all hover:scale-110"
                      >
                        <Edit3 className="h-3 w-3 md:h-4 md:w-4" />
                      </Button>

                      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedEmpadronado(empadronado);
                              setShowDeleteDialog(true);
                            }}
                            className="h-7 w-7 md:h-9 md:w-9 p-0 transition-all hover:scale-110"
                          >
                            <Trash2 className="h-3 w-3 md:h-4 md:w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Eliminar Empadronado</AlertDialogTitle>
                            <AlertDialogDescription>
                              Esta acción eliminará permanentemente a {empadronado.nombre} {empadronado.apellidos} del padrón.
                              {!canDeleteWithoutAuth && " Se requiere autorización de presidencia."}
                              {canDeleteWithoutAuth && " Como Presidente, puede eliminar directamente."}
                            </AlertDialogDescription>
                          </AlertDialogHeader>

                          <div className="space-y-4">
                            {!canDeleteWithoutAuth && (
                              <div>
                                <Label htmlFor="delete-password">Clave de Presidencia</Label>
                                <Input
                                  id="delete-password"
                                  type="password"
                                  value={deletePassword}
                                  onChange={(e) => setDeletePassword(e.target.value)}
                                  placeholder="Ingrese la clave"
                                />
                              </div>
                            )}

                            <div>
                              <Label htmlFor="delete-motivo">Motivo de Eliminación</Label>
                              <Textarea
                                id="delete-motivo"
                                value={deleteMotivo}
                                onChange={(e) => setDeleteMotivo(e.target.value)}
                                placeholder="Describa el motivo de la eliminación"
                              />
                            </div>

                            <div>
                              <Label htmlFor="delete-pdf">Acta de Eliminación (PDF)</Label>
                              <Input
                                id="delete-pdf"
                                type="file"
                                accept=".pdf"
                                onChange={(e) => setDeletePdf(e.target.files?.[0] || null)}
                              />
                            </div>
                          </div>

                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancelar</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={handleDelete}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Eliminar
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          </div>

          {filteredEmpadronados.length === 0 && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron empadronados</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== 'all' || filterVivienda !== 'all' || filterVive !== 'all'
                  ? 'Intente modificar los filtros de búsqueda'
                  : 'Comience agregando un nuevo empadronado'}
              </p>
              {(!searchTerm && filterStatus === 'all' && filterVivienda === 'all' && filterVive === 'all') && (
                <Button onClick={() => navigate('/padron/nuevo')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Agregar Primer Empadronado
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de gestionar permisos */}
      <GestionarPermisosModal
        open={gestionarPermisosOpen}
        onOpenChange={setGestionarPermisosOpen}
        empadronado={selectedEmpadronado}
        onAccountCreated={loadData}
      />

      {/* Modal de actualización masiva */}
      <ActualizacionMasivaModal
        open={actualizacionMasivaOpen}
        onOpenChange={setActualizacionMasivaOpen}
        onComplete={loadData}
      />

      {/* Modal de correos con acceso */}
      <CorreosAccesoModal
        open={correosAccesoOpen}
        onOpenChange={setCorreosAccesoOpen}
      />
    </div>
  );
};

export default Empadronados;
