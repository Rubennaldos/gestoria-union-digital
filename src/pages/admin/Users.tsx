import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Can } from '@/components/auth/Can';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthz } from '@/contexts/AuthzContext';
import { listUsers, listRoles, toggleUserActive } from '@/services/rtdb';
import { resetPassword } from '@/services/auth';
import { UserProfile, Role } from '@/types/auth';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Power, 
  PowerOff, 
  Mail, 
  Settings,
  Home,
  Loader2 
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function UsersAdmin() {
  const { user, profile } = useAuth();
  const { isPresidencia } = useAuthz();
  const navigate = useNavigate();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    roleId: '',
    activo: ''
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isPresidencia) {
      navigate('/inicio');
      return;
    }

    loadData();
  }, [user, isPresidencia, navigate]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [usersData, rolesData] = await Promise.all([
        listUsers(),
        listRoles()
      ]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (targetUid: string, newStatus: boolean) => {
    if (!user?.uid) return;

    try {
      await toggleUserActive(targetUid, newStatus, user.uid);
      await loadData(); // Recargar datos
      
      toast({
        title: newStatus ? "Usuario activado" : "Usuario suspendido",
        description: `El usuario ha sido ${newStatus ? 'activado' : 'suspendido'} exitosamente.`
      });
    } catch (error) {
      console.error('Error toggling user status:', error);
      toast({
        title: "Error",
        description: "Error al cambiar el estado del usuario",
        variant: "destructive"
      });
    }
  };

  const handleResetPassword = async (email: string) => {
    try {
      await resetPassword(email);
      toast({
        title: "Email enviado",
        description: "Se ha enviado un email para restablecer la contraseña."
      });
    } catch (error) {
      console.error('Error sending reset email:', error);
      toast({
        title: "Error",
        description: "Error al enviar el email de restablecimiento",
        variant: "destructive"
      });
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = !filters.search || 
      user.displayName.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.email.toLowerCase().includes(filters.search.toLowerCase()) ||
      user.username?.toLowerCase().includes(filters.search.toLowerCase());

    const matchesRole = !filters.roleId || user.roleId === filters.roleId;
    const matchesStatus = filters.activo === '' || user.activo.toString() === filters.activo;

    return matchesSearch && matchesRole && matchesStatus;
  });

  const getRoleName = (roleId: string) => {
    return roles.find(r => r.id === roleId)?.nombre || roleId;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando usuarios...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate('/inicio')}
                className="gap-2"
              >
                <Home className="w-4 h-4" />
                Inicio
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h1 className="text-xl font-semibold">Gestión de Usuarios</h1>
              </div>
            </div>
            
            <Can module="usuarios" level="write">
              <Button asChild>
                <Link to="/admin/users/new" className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nuevo Usuario
                </Link>
              </Button>
            </Can>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 space-y-6">
        {/* Filtros */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, email o usuario..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
              
              <Select 
                value={filters.roleId} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, roleId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los roles</SelectItem>
                  {roles.map(role => (
                    <SelectItem key={role.id} value={role.id}>
                      {role.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select 
                value={filters.activo} 
                onValueChange={(value) => setFilters(prev => ({ ...prev, activo: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Filtrar por estado" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos los estados</SelectItem>
                  <SelectItem value="true">Activos</SelectItem>
                  <SelectItem value="false">Suspendidos</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Users className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.length}</p>
                  <p className="text-sm text-muted-foreground">Total Usuarios</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                  <Power className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => u.activo).length}</p>
                  <p className="text-sm text-muted-foreground">Activos</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                  <PowerOff className="w-6 h-6 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{users.filter(u => !u.activo).length}</p>
                  <p className="text-sm text-muted-foreground">Suspendidos</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Lista de usuarios */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredUsers.map(user => (
            <Card key={user.uid} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{user.displayName}</CardTitle>
                    <CardDescription className="flex items-center gap-2">
                      <Mail className="w-3 h-3" />
                      {user.email}
                    </CardDescription>
                    {user.username && (
                      <p className="text-xs text-muted-foreground mt-1">
                        @{user.username}
                      </p>
                    )}
                  </div>
                  <Badge variant={user.activo ? "default" : "destructive"}>
                    {user.activo ? "Activo" : "Suspendido"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium">Rol</p>
                    <Badge variant="outline">{getRoleName(user.roleId)}</Badge>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      asChild
                      className="flex-1"
                    >
                      <Link to={`/admin/users/${user.uid}/permissions`}>
                        <Settings className="w-3 h-3 mr-1" />
                        Permisos
                      </Link>
                    </Button>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResetPassword(user.email)}
                    >
                      <Mail className="w-3 h-3" />
                    </Button>
                    
                    <Button
                      variant={user.activo ? "destructive" : "default"}
                      size="sm"
                      onClick={() => handleToggleActive(user.uid, !user.activo)}
                    >
                      {user.activo ? <PowerOff className="w-3 h-3" /> : <Power className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {filteredUsers.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No se encontraron usuarios</h3>
              <p className="text-muted-foreground mb-4">
                No hay usuarios que coincidan con los filtros aplicados.
              </p>
              <Button asChild>
                <Link to="/admin/users/new">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear Primer Usuario
                </Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}