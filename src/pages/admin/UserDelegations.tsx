import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { 
  ArrowLeft, 
  Calendar, 
  Clock, 
  Shield, 
  User, 
  AlertTriangle,
  CheckCircle,
  XCircle,
  Plus,
  Home
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthz } from '@/contexts/AuthzContext';
import { getUserProfile, getActiveDelegation, setDelegation, revokeDelegation } from '@/services/rtdb';
import { UserProfile, Delegation, Permission } from '@/types/auth';
import { toast } from '@/hooks/use-toast';

export default function UserDelegations() {
  const { uid } = useParams();
  const { user } = useAuth();
  const { isPresidencia } = useAuthz();
  const navigate = useNavigate();
  
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [delegation, setDelegationState] = useState<Delegation | null>(null);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  
  // Form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isPresidencia) {
      navigate('/inicio');
      return;
    }

    if (uid) {
      loadData();
    }
  }, [user, isPresidencia, uid, navigate]);

  const loadData = async () => {
    if (!uid) return;
    
    setLoading(true);
    try {
      const [profile, activeDelegation] = await Promise.all([
        getUserProfile(uid),
        getActiveDelegation(uid)
      ]);
      
      setUserProfile(profile);
      setDelegationState(activeDelegation);
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Error al cargar los datos del usuario",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDelegation = async () => {
    if (!uid || !user?.uid) return;
    
    if (!startDate || !endDate) {
      toast({
        title: "Error",
        description: "Debe seleccionar fechas de inicio y fin",
        variant: "destructive"
      });
      return;
    }

    const startTs = new Date(startDate).getTime();
    const endTs = new Date(endDate).getTime();

    if (startTs >= endTs) {
      toast({
        title: "Error",
        description: "La fecha de fin debe ser posterior a la fecha de inicio",
        variant: "destructive"
      });
      return;
    }

    setCreating(true);
    try {
      // Crear delegación temporal con permisos básicos
      const basicPermissions: Permission = {
        sesiones: 'read',
        actas: 'read',
        padron: 'read',
        comunicaciones: 'write'
      };

      await setDelegation({
        targetUid: uid,
        startTs,
        endTs,
        modules: basicPermissions
      }, user.uid);

      toast({
        title: "Delegación creada",
        description: "La delegación temporal ha sido creada exitosamente.",
      });

      setShowCreateForm(false);
      setStartDate('');
      setEndDate('');
      loadData();
    } catch (error) {
      console.error('Error creating delegation:', error);
      toast({
        title: "Error",
        description: "Error al crear la delegación",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeDelegation = async () => {
    if (!uid || !user?.uid) return;
    
    setCreating(true);
    try {
      await revokeDelegation(uid, user.uid);
      
      toast({
        title: "Delegación revocada",
        description: "La delegación ha sido revocada exitosamente.",
      });
      
      loadData();
    } catch (error) {
      console.error('Error revoking delegation:', error);
      toast({
        title: "Error",
        description: "Error al revocar la delegación",
        variant: "destructive"
      });
    } finally {
      setCreating(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleDateString('es-PE', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const isActive = (delegation: Delegation) => {
    const now = Date.now();
    return now >= delegation.startTs && now <= delegation.endTs;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 animate-spin" />
          <span>Cargando datos del usuario...</span>
        </div>
      </div>
    );
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Alert variant="destructive" className="max-w-md">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>Usuario no encontrado</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/20">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => navigate('/')} className="gap-2">
              <Home className="w-4 h-4" />
              Inicio
            </Button>
            <div className="h-6 w-px bg-border" />
            <Button variant="ghost" size="sm" asChild>
              <Link to="/admin/users" className="gap-2">
                <ArrowLeft className="w-4 h-4" />
                Usuarios
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">Delegaciones de {userProfile.displayName}</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 space-y-6">
        {/* User Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <CardTitle>{userProfile.displayName}</CardTitle>
                  <CardDescription>{userProfile.email}</CardDescription>
                </div>
              </div>
              <Badge variant={userProfile.activo ? "default" : "secondary"}>
                {userProfile.activo ? "Activo" : "Inactivo"}
              </Badge>
            </div>
          </CardHeader>
        </Card>

        {/* Current Delegation */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="w-5 h-5" />
                  Delegación Actual
                </CardTitle>
                <CardDescription>
                  Estado de la delegación temporal de permisos
                </CardDescription>
              </div>
              {!delegation && (
                <Button 
                  onClick={() => setShowCreateForm(!showCreateForm)}
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Nueva Delegación
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {delegation ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  {isActive(delegation) ? (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  <span className="font-medium">
                    {isActive(delegation) ? 'Delegación Activa' : 'Delegación Expirada'}
                  </span>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Fecha de Inicio</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(delegation.startTs)}
                    </p>
                  </div>
                  <div>
                    <Label>Fecha de Fin</Label>
                    <p className="text-sm text-muted-foreground">
                      {formatDate(delegation.endTs)}
                    </p>
                  </div>
                </div>

                {delegation.modules && (
                  <div>
                    <Label>Permisos Delegados</Label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {Object.entries(delegation.modules).map(([moduleId, level]) => (
                        <Badge key={moduleId} variant="outline" className="capitalize">
                          {moduleId}: {level}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Separator />
                
                <div className="flex justify-end">
                  <Button 
                    variant="destructive" 
                    onClick={handleRevokeDelegation}
                    disabled={creating}
                  >
                    Revocar Delegación
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No hay delegaciones activas para este usuario
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Create Delegation Form */}
        {showCreateForm && !delegation && (
          <Card>
            <CardHeader>
              <CardTitle>Crear Nueva Delegación</CardTitle>
              <CardDescription>
                Asignar permisos temporales al usuario
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="startDate">Fecha de Inicio</Label>
                  <Input
                    id="startDate"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">Fecha de Fin</Label>
                  <Input
                    id="endDate"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
              </div>

              <Alert>
                <Shield className="w-4 h-4" />
                <AlertDescription>
                  Se asignarán permisos básicos de lectura para sesiones, actas y padrón, 
                  y permisos de escritura para comunicaciones.
                </AlertDescription>
              </Alert>

              <div className="flex gap-4">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1"
                >
                  Cancelar
                </Button>
                <Button 
                  onClick={handleCreateDelegation}
                  disabled={creating}
                  className="flex-1"
                >
                  {creating ? "Creando..." : "Crear Delegación"}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}