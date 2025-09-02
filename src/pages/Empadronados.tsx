import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Users, UserPlus, Search, Edit3, Trash2, Home, Construction, MapPin, Eye, Download, KeyRound, Settings, Check, X } from 'lucide-react';
import { Empadronado, EmpadronadosStats } from '@/types/empadronados';
import { getEmpadronados, getEmpadronadosStats, deleteEmpadronado } from '@/services/empadronados';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthz } from '@/contexts/AuthzContext';
import { createUserAndProfile } from '@/services/auth';
import { listModules, getUserPermissions, getUserProfile, setUserPermissions as savePermissionsToRTDB } from '@/services/rtdb';
import { Module, UserProfile, Permission, PermissionLevel } from '@/types/auth';
import { GestionarPermisosModal } from '@/components/empadronados/GestionarPermisosModal';

// ─────────────────────────────────────────────────────────────
// Modal local para crear acceso (Auth + Perfil RTDB) desde padrón
// ─────────────────────────────────────────────────────────────
type CrearAccesoProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  onCreated: () => void;
};

const toSlug = (s: string) =>
  (s || '')
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();

const sugerirCredenciales = (e: Empadronado) => {
  const baseUser = e.numeroPadron?.trim()
    ? `emp-${e.numeroPadron.trim().toLowerCase()}`
    : `emp-${toSlug(`${e.nombre} ${e.apellidos}`)}`;
  const email = `${baseUser}@jpusap.com`;
  const password = (e.dni && e.dni.length >= 6) ? e.dni : 'jpusap2024';
  return { email, username: baseUser, password };
};

const CrearAccesoEmpadronadoModal: React.FC<CrearAccesoProps> = ({ open, onOpenChange, empadronado, onCreated }) => {
  const { toast } = useToast();
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('jpusap2024');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && empadronado) {
      const s = sugerirCredenciales(empadronado);
      setEmail(s.email);
      setUsername(s.username);
      setPassword(s.password);
    }
  }, [open, empadronado]);

  const crear = async () => {
    if (!empadronado) return;
    if (!email.trim() || !username.trim() || !password.trim()) {
      toast({ title: 'Faltan datos', description: 'Completa email, usuario y contraseña.', variant: 'destructive' });
      return;
    }
    if (password.length < 6) {
      toast({ title: 'Contraseña muy corta', description: 'Mínimo 6 caracteres.', variant: 'destructive' });
      return;
    }

    try {
      setLoading(true);
      await createUserAndProfile({
        displayName: `${empadronado.nombre} ${empadronado.apellidos}`,
        email: email.trim().toLowerCase(),
        username: username.trim().toLowerCase(),
        phone: empadronado.telefonos?.[0]?.numero || '',
        roleId: 'asociado',
        activo: true,
        password,
        empadronadoId: empadronado.id,
        tipoUsuario: 'asociado'
      });
      toast({ title: 'Acceso creado', description: 'Se creó la cuenta para el asociado.' });
      onOpenChange(false);
      onCreated();
    } catch (err: any) {
      const msg = String(err?.message || '');
      let friendly = 'No se pudo crear el acceso.';
      if (msg.includes('email-already-in-use')) friendly = 'El email ya está registrado.';
      if (msg.includes('ya está en uso')) friendly = msg;
      toast({ title: 'Error', description: friendly, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Crear acceso para el asociado</DialogTitle>
          <DialogDescription>
            Genera el usuario del sistema vinculado a este empadronado (rol: asociado).
          </DialogDescription>
        </DialogHeader>

        {empadronado && (
          <div className="space-y-3">
            <div className="p-3 bg-accent rounded">
              <div className="text-sm font-medium">
                {empadronado.nombre} {empadronado.apellidos}
              </div>
              <div className="text-xs text-muted-foreground">
                Padrón {empadronado.numeroPadron} • DNI {empadronado.dni}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Email</Label>
              <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@jpusap.com" />
            </div>

            <div className="space-y-2">
              <Label>Usuario</Label>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="emp-0001" />
              <p className="text-xs text-muted-foreground">Usa el padrón para estandarizar (ej: emp-0001).</p>
            </div>

            <div className="space-y-2">
              <Label>Contraseña temporal</Label>
              <Input value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder="••••••••" />
              <p className="text-xs text-muted-foreground">Recomienda cambiarla en el primer inicio de sesión.</p>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
              <Button onClick={crear} disabled={loading}>
                {loading ? 'Creando...' : 'Crear acceso'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

// ─────────────────────────────────────────────────────────────
// Página principal
// ─────────────────────────────────────────────────────────────
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

  const [crearAccesoOpen, setCrearAccesoOpen] = useState(false);
  const [gestionarPermisosOpen, setGestionarPermisosOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission>({});
  const [editingPermissions, setEditingPermissions] = useState(false);

  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const { canDeleteWithoutAuth, isPresidente } = useAuthz();

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
      toast({
        title: "Éxito",
        description: "Permisos actualizados correctamente"
      });
      setEditingPermissions(false);
    } catch (error) {
      toast({
        title: "Error", 
        description: "No se pudieron actualizar los permisos",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [empadronados, searchTerm, filterStatus, filterVivienda, filterVive, filterManzana, filterLote, filterEtapa]);

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

    // Solo verificar contraseña si no es Presidente
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
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Inicio
          </Button>
          <div className="h-6 w-px bg-border" />
          <div>
            <h1 className="text-2xl font-bold">Padrón de Asociados</h1>
            <p className="text-muted-foreground">Gestión completa del registro de asociados</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Search className="h-4 w-4 mr-2" />
            Filtros
          </Button>
          <Button onClick={() => navigate('/padron/nuevo')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Empadronado
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Empadronados</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground">
              {stats.habilitados} habilitados
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Residentes Activos</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.viven}</div>
            <p className="text-xs text-muted-foreground">
              Viven en la asociación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Viviendas Construidas</CardTitle>
            <Construction className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.construida}</div>
            <p className="text-xs text-muted-foreground">
              {stats.construccion} en construcción, {stats.terreno} solo terreno
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Distribución</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.masculinos}M / {stats.femeninos}F</div>
            <p className="text-xs text-muted-foreground">
              Masculinos / Femeninos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Filtros de Búsqueda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Buscar</Label>
                <Input
                  id="search"
                  placeholder="Nombre, apellidos, padrón, DNI o familia..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              
              <div>
                <Label>Estado</Label>
                <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
                  <SelectTrigger>
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
                <Label>Vivienda</Label>
                <Select value={filterVivienda} onValueChange={(value: any) => setFilterVivienda(value)}>
                  <SelectTrigger>
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
                <Label>Residencia</Label>
                <Select value={filterVive} onValueChange={(value: any) => setFilterVive(value)}>
                  <SelectTrigger>
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

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              <div>
                <Label htmlFor="manzana">Manzana</Label>
                <Input
                  id="manzana"
                  placeholder="Filtrar por manzana..."
                  value={filterManzana}
                  onChange={(e) => setFilterManzana(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="lote">Lote</Label>
                <Input
                  id="lote"
                  placeholder="Filtrar por lote..."
                  value={filterLote}
                  onChange={(e) => setFilterLote(e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="etapa">Etapa</Label>
                <Input
                  id="etapa"
                  placeholder="Filtrar por etapa..."
                  value={filterEtapa}
                  onChange={(e) => setFilterEtapa(e.target.value)}
                />
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterStatus('all');
                    setFilterVivienda('all');
                    setFilterVive('all');
                    setFilterManzana('');
                    setFilterLote('');
                    setFilterEtapa('');
                  }}
                  className="w-full"
                >
                  Limpiar Filtros
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results count */}
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">
          Mostrando {filteredEmpadronados.length} de {stats.total} empadronados
        </p>
        <Button variant="outline" size="sm">
          <Download className="h-4 w-4 mr-2" />
          Exportar
        </Button>
      </div>

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Padrón</TableHead>
                <TableHead>Nombre Completo</TableHead>
                <TableHead>DNI</TableHead>
                <TableHead>Email Acceso</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Vivienda</TableHead>
                <TableHead>Vive</TableHead>
                <TableHead>Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEmpadronados.map((empadronado) => (
                <TableRow key={empadronado.id}>
                  <TableCell className="font-medium">
                    {empadronado.numeroPadron}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{empadronado.nombre} {empadronado.apellidos}</p>
                      <p className="text-sm text-muted-foreground">{empadronado.familia}</p>
                    </div>
                  </TableCell>
                  <TableCell>{empadronado.dni}</TableCell>
                   <TableCell>
                    {empadronado.emailAcceso ? (
                      <div className="space-y-1">
                        <div className="text-sm font-medium text-green-600">
                          {empadronado.emailAcceso}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Cuenta activa
                        </Badge>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">Sin acceso</div>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant={empadronado.habilitado ? "default" : "secondary"}>
                      {empadronado.habilitado ? "Habilitado" : "Deshabilitado"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getViviendaIcon(empadronado.estadoVivienda)}
                      <Badge className={getViviendaColor(empadronado.estadoVivienda)}>
                        {empadronado.estadoVivienda === 'construida' ? 'Construida' :
                         empadronado.estadoVivienda === 'construccion' ? 'En Construcción' : 'Solo Terreno'}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={empadronado.vive ? "default" : "outline"}>
                      {empadronado.vive ? "Sí" : "No"}
                    </Badge>
                  </TableCell>
                   <TableCell>
                    <div className="flex gap-1">
                      <Sheet>
                        <SheetTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => setSelectedEmpadronado(empadronado)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </SheetTrigger>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setSelectedEmpadronado(empadronado);
                            setGestionarPermisosOpen(true);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                        <SheetContent className="w-[600px] sm:w-[800px]">
                          {selectedEmpadronado && (
                            <>
                              <SheetHeader>
                                <SheetTitle>
                                  {selectedEmpadronado.nombre} {selectedEmpadronado.apellidos}
                                </SheetTitle>
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
                                                            nivelActual === 'none' ? 'outline' :
                                                            nivelActual === 'read' ? 'secondary' :
                                                            nivelActual === 'write' ? 'default' : 'destructive'
                                                          }>
                                                            {nivelActual === 'none' ? 'Sin acceso' :
                                                             nivelActual === 'read' ? 'Lectura' :
                                                             nivelActual === 'write' ? 'Escritura' : 'Admin'}
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
                                                    <Button size="sm" variant="outline" onClick={() => setEditingPermissions(false)}>
                                                      Cancelar
                                                    </Button>
                                                    <Button size="sm" onClick={() => saveUserPermissions(selectedEmpadronado.authUid)}>
                                                      Guardar Permisos
                                                    </Button>
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
                                                          nivel === 'none' ? 'outline' :
                                                          nivel === 'read' ? 'secondary' :
                                                          nivel === 'write' ? 'default' : 'destructive'
                                                        }>
                                                          {nivel === 'none' ? 'Sin acceso' :
                                                           nivel === 'read' ? 'Lectura' :
                                                           nivel === 'write' ? 'Escritura' : 'Admin'}
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
                                          {selectedEmpadronado.estadoVivienda === 'construida' ? 'Construida' :
                                           selectedEmpadronado.estadoVivienda === 'construccion' ? 'En Construcción' : 'Solo Terreno'}
                                        </Badge>
                                      </div>
                                    </div>
                                    <div>
                                      <Label className="text-muted-foreground">Vive aquí</Label>
                                      <div className="mt-1">
                                        <Badge variant={selectedEmpadronado.vive ? "default" : "outline"}>
                                          {selectedEmpadronado.vive ? "Sí" : "No"}
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
                                             <p className="text-muted-foreground text-xs">
                                               {miembro.parentezco} • {miembro.cumpleanos}
                                             </p>
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

                      {/* Nuevo botón: Crear acceso */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedEmpadronado(empadronado);
                          setCrearAccesoOpen(true);
                        }}
                        title="Crear acceso"
                        className="text-primary"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => navigate(`/padron/editar/${empadronado.id}`)}
                      >
                        <Edit3 className="h-4 w-4" />
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
                          >
                            <Trash2 className="h-4 w-4" />
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

          {filteredEmpadronados.length === 0 && (
            <div className="p-8 text-center">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron empadronados</h3>
              <p className="text-muted-foreground mb-4">
                {searchTerm || filterStatus !== 'all' || filterVivienda !== 'all' || filterVive !== 'all'
                  ? 'Intente modificar los filtros de búsqueda'
                  : 'Comience agregando un nuevo empadronado'
                }
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
    </div>
  );
};

export default Empadronados;
