import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PermissionSelector } from '@/components/ui/permission-selector';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthz } from '@/contexts/AuthzContext';
import { 
  getUserProfile, 
  getUserPermissions, 
  listModules, 
  setPermission, 
  applyMirrorPermissions 
} from '@/services/rtdb';
import { UserProfile, Module, PermissionLevel, Permission } from '@/types/auth';
import { 
  ArrowLeft, 
  Settings, 
  Shield, 
  Copy,
  Save,
  User,
  Loader2
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function UserPermissions() {
  const { uid } = useParams<{ uid: string }>();
  const { user } = useAuth();
  const { isPresidencia } = useAuthz();
  const navigate = useNavigate();

  const [targetUser, setTargetUser] = useState<UserProfile | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [permissions, setPermissions] = useState<Permission>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isPresidencia) {
      navigate('/inicio');
      return;
    }

    if (!uid) {
      navigate('/admin/users');
      return;
    }

    loadData();
  }, [user, isPresidencia, uid, navigate]);

  const loadData = async () => {
    if (!uid) return;

    try {
      setLoading(true);
      const [userProfile, userPermissions, modulesData] = await Promise.all([
        getUserProfile(uid),
        getUserPermissions(uid),
        listModules()
      ]);

      if (!userProfile) {
        toast({
          title: "Usuario no encontrado",
          variant: "destructive"
        });
        navigate('/admin/users');
        return;
      }

      setTargetUser(userProfile);
      setPermissions(userPermissions);
      setModules(modulesData);
    } catch (error) {
      console.error('Error loading user permissions:', error);
      toast({
        title: "Error",
        description: "Error al cargar los permisos del usuario",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = async (moduleId: string, level: PermissionLevel) => {
    if (!uid || !user?.uid) return;

    try {
      setSaving(true);
      await setPermission(uid, moduleId, level, user.uid);
      
      // Actualizar estado local
      setPermissions(prev => ({
        ...prev,
        [moduleId]: level
      }));

      toast({
        title: "Permiso actualizado",
        description: `Permiso para ${modules.find(m => m.id === moduleId)?.nombre} actualizado.`
      });
    } catch (error) {
      console.error('Error updating permission:', error);
      toast({
        title: "Error",
        description: "Error al actualizar el permiso",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  const handleApplyMirror = async () => {
    if (!uid || !user?.uid) return;

    const mirrorPermissions: Permission = {
      // Permisos principales
      sesiones: 'read',
      actas: 'read',
      archivos: 'read',
      comunicaciones: 'read',
      auditoria: 'read'
    };

    try {
      setSaving(true);
      await applyMirrorPermissions(uid, mirrorPermissions, user.uid);
      
      // Actualizar estado local
      setPermissions(prev => ({
        ...prev,
        ...mirrorPermissions
      }));

      toast({
        title: "Permisos espejo aplicados",
        description: "Se han aplicado los permisos de lectura básicos."
      });
    } catch (error) {
      console.error('Error applying mirror permissions:', error);
      toast({
        title: "Error",
        description: "Error al aplicar permisos espejo",
        variant: "destructive"
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Cargando permisos...</p>
        </div>
      </div>
    );
  }

  if (!targetUser) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <User className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Usuario no encontrado</h3>
            <p className="text-muted-foreground mb-4">
              No se pudo cargar la información del usuario.
            </p>
            <Button asChild>
              <Link to="/admin/users">Volver a Usuarios</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" asChild>
                <Link to="/admin/users" className="gap-2">
                  <ArrowLeft className="w-4 h-4" />
                  Volver
                </Link>
              </Button>
              <div className="h-6 w-px bg-border" />
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-primary" />
                <div>
                  <h1 className="text-xl font-semibold">Permisos de Usuario</h1>
                  <p className="text-sm text-muted-foreground">
                    {targetUser.displayName} • {targetUser.email}
                  </p>
                </div>
              </div>
            </div>
            
            <Button 
              onClick={handleApplyMirror} 
              variant="outline" 
              disabled={saving}
              className="gap-2"
            >
              <Copy className="w-4 h-4" />
              Aplicar Espejo
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        {/* Información del usuario */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Información del Usuario
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Nombre</p>
                <p className="text-base">{targetUser.displayName}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Email</p>
                <p className="text-base">{targetUser.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Estado</p>
                <Badge variant={targetUser.activo ? "default" : "destructive"}>
                  {targetUser.activo ? "Activo" : "Suspendido"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Permisos por módulo */}
        <Card>
          <CardHeader>
            <CardTitle>Permisos por Módulo</CardTitle>
            <CardDescription>
              Configure los niveles de acceso para cada módulo del sistema.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {modules.map(module => {
                const currentPermission = permissions[module.id] || 'none';
                
                return (
                  <Card key={module.id} className="p-4">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                          <Shield className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{module.nombre}</h3>
                          <p className="text-xs text-muted-foreground">
                            Orden: {module.orden}
                          </p>
                        </div>
                      </div>
                      
                      <PermissionSelector
                        value={currentPermission}
                        onChange={(level) => handlePermissionChange(module.id, level)}
                        disabled={saving}
                        showAdmin={isPresidencia}
                        size="sm"
                      />
                      
                      {module.requiereAprobacion && (
                        <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded">
                          Requiere aprobación
                        </div>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Ayuda */}
        <Alert>
          <Shield className="h-4 w-4" />
          <AlertDescription>
            <strong>Niveles de permiso:</strong><br />
            • <strong>Sin acceso:</strong> No puede ver el módulo<br />
            • <strong>Lectura:</strong> Solo puede ver información<br />
            • <strong>Escritura:</strong> Puede crear y editar<br />
            • <strong>Aprobación:</strong> Puede aprobar documentos<br />
            • <strong>Administrador:</strong> Control total (solo para Presidencia)
          </AlertDescription>
        </Alert>
      </div>
    </div>
  );
}