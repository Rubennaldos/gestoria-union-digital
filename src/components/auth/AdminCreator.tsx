import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Loader2, CheckCircle } from 'lucide-react';
import { createUserAndProfile } from '@/services/auth';
import { applyMirrorPermissions } from '@/services/rtdb';
import { isBootstrapInitialized, setBootstrapInitialized } from '@/utils/seedAuthData';
import { toast } from '@/hooks/use-toast';

export const AdminCreator: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    checkBootstrap();
  }, []);

  const checkBootstrap = async () => {
    try {
      const initialized = await isBootstrapInitialized();
      setIsInitialized(initialized);
    } catch (error) {
      console.error('Error checking bootstrap:', error);
    } finally {
      setChecking(false);
    }
  };

  const createPresidenciaAdmin = async () => {
    setLoading(true);
    try {
      // Crear usuario administrador de presidencia
      const uid = await createUserAndProfile({
        displayName: 'Administrador General JPUSAP',
        email: 'presidencia@jpusap.local',
        username: 'presidencia',
        roleId: 'presidencia',
        activo: true,
        password: 'jpusap2024',
        tipoUsuario: 'presidente',
        phone: undefined,
        empadronadoId: undefined,
        fechaInicioMandato: Date.now(),
        fechaFinMandato: Date.now() + (365 * 24 * 60 * 60 * 1000) // Un año
      });

      // Aplicar permisos completos a todos los módulos
      const allPermissions = {
        sesiones: 'admin' as const,
        actas: 'admin' as const,
        archivos: 'admin' as const,
        finanzas: 'admin' as const,
        seguridad: 'admin' as const,
        comunicaciones: 'admin' as const,
        deportes: 'admin' as const,
        salud: 'admin' as const,
        ambiente: 'admin' as const,
        educacion: 'admin' as const,
        cultura: 'admin' as const,
        auditoria: 'admin' as const,
        padron: 'admin' as const,
        sanciones: 'admin' as const,
        patrimonio: 'admin' as const,
        planTrabajo: 'admin' as const,
        electoral: 'admin' as const
      };

      await applyMirrorPermissions(uid, allPermissions, uid);

      // Marcar bootstrap como inicializado
      await setBootstrapInitialized();

      toast({
        title: "Usuario Administrador Creado",
        description: "Se ha creado el usuario administrador general exitosamente.",
      });

      // Redirigir al login
      navigate('/login');
    } catch (error: any) {
      console.error('Error creating admin:', error);
      toast({
        title: "Error",
        description: error.message || "Error al crear el usuario administrador",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Verificando sistema...</span>
        </div>
      </div>
    );
  }

  if (isInitialized) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="mx-auto w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <CardTitle>Sistema Inicializado</CardTitle>
            <CardDescription>
              El sistema ya ha sido configurado correctamente.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => navigate('/login')} 
              className="w-full"
            >
              Ir al Login
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle>Configuración Inicial del Sistema</CardTitle>
          <CardDescription>
            Crear usuario administrador general para la Presidencia de JPUSAP
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              Se creará un usuario administrador con acceso completo:
              <ul className="list-disc list-inside mt-2 space-y-1 text-sm">
                <li><strong>Usuario:</strong> presidencia</li>
                <li><strong>Email:</strong> presidencia@jpusap.local</li>
                <li><strong>Contraseña temporal:</strong> jpusap2024</li>
                <li><strong>Permisos:</strong> Administrador completo</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="space-y-2">
            <h4 className="font-medium">Este usuario tendrá acceso a:</h4>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="space-y-1">
                <div>• Gestión de Usuarios</div>
                <div>• Padrón de Vecinos</div>
                <div>• Finanzas y Cobranzas</div>
                <div>• Patrimonio</div>
                <div>• Sanciones</div>
                <div>• Deportes</div>
                <div>• Sesiones</div>
                <div>• Actas</div>
              </div>
              <div className="space-y-1">
                <div>• Archivos</div>
                <div>• Seguridad</div>
                <div>• Comunicaciones</div>
                <div>• Salud</div>
                <div>• Medio Ambiente</div>
                <div>• Educación</div>
                <div>• Cultura</div>
                <div>• Auditoría</div>
              </div>
            </div>
          </div>

          <Button 
            onClick={createPresidenciaAdmin} 
            disabled={loading}
            className="w-full"
            size="lg"
          >
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Crear Usuario Administrador
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Después de crear el usuario, se redirigirá automáticamente al login donde podrá acceder con las credenciales mostradas arriba.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};