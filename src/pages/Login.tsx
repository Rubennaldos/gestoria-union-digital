// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BootstrapAdmin } from '@/components/auth/BootstrapAdmin';
import { signInWithEmailOrUsername } from '@/services/auth';
import { isBootstrapInitialized, seedAuthData } from '@/utils/seedAuthData';
import { resetBootstrap } from '@/utils/resetBootstrap';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface LoginForm {
  identifier: string; // email o username
  password: string;
}

const normalize = (v?: string | null) => (v || '').trim().toLowerCase();
const isSuperAdmin = (email?: string | null, roleId?: string | null | undefined) =>
  normalize(email) === 'presidencia@jpusap.com' || normalize(roleId || '') === 'super_admin';

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapComplete, setBootstrapComplete] = useState<boolean | null>(null);

  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginForm>({
    defaultValues: {
      identifier: '',
      password: ''
    }
  });

  // Si ya está logueado, enviamos a donde quería ir (o /inicio)
  useEffect(() => {
    if (!user) return;

    const from = (location.state as any)?.from?.pathname || '/inicio';
    // Super admin entra a todo; los demás también pasan al inicio.
    // Si en el futuro quieres redirigir por rol, aquí es el lugar.
    if (isSuperAdmin(user.email, profile?.roleId)) {
      navigate(from, { replace: true });
    } else {
      navigate(from, { replace: true });
    }
  }, [user, profile?.roleId, location.state, navigate]);

  // Verificar bootstrap al cargar (carga roles/módulos base y habilita BootstrapAdmin si falta)
  useEffect(() => {
    const checkBootstrap = async () => {
      try {
        const initialized = await isBootstrapInitialized();
        if (!initialized) {
          await seedAuthData();
          setBootstrapComplete(false); // Mostrar BootstrapAdmin
        } else {
          setBootstrapComplete(true); // Mostrar login normal
        }
      } catch (err) {
        console.error('❌ Error checking bootstrap:', err);
        setBootstrapComplete(false);
      }
    };
    checkBootstrap();
  }, []);

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailOrUsername(data.identifier, data.password);
      toast({
        title: 'Inicio de sesión exitoso',
        description: 'Bienvenido al sistema.',
      });
      // La redirección real ocurre en el useEffect que observa `user`
    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = 'Error al iniciar sesión';

      const msg = String(err?.message || '').toLowerCase();
      if (msg.includes('usuario_suspendido') || msg.includes('user-disabled')) {
        errorMessage = 'Tu acceso está deshabilitado, contacta a Presidencia.';
      } else if (msg.includes('user-not-found') || msg.includes('usuario no encontrado')) {
        errorMessage = 'Usuario no encontrado';
      } else if (msg.includes('wrong-password')) {
        errorMessage = 'Contraseña incorrecta';
      } else if (msg.includes('invalid-email')) {
        errorMessage = 'Email inválido';
      }

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrapComplete = () => {
    setBootstrapComplete(true);
    toast({
      title: 'Sistema inicializado',
      description: 'Ahora puedes iniciar sesión con la cuenta de Presidencia.',
    });
  };

  const handleResetBootstrap = async () => {
    if (!confirm('¿Estás seguro de que quieres resetear el sistema? Esto eliminará la configuración actual.')) return;
    try {
      await resetBootstrap();
      toast({
        title: 'Sistema reseteado',
        description: 'Puedes volver a configurar el administrador.',
      });
      setBootstrapComplete(false);
    } catch (err) {
      console.error('Error resetting bootstrap:', err);
      toast({
        title: 'Error',
        description: 'No se pudo resetear el sistema.',
        variant: 'destructive',
      });
    }
  };

  // Mostrar pantalla de bootstrap si no está inicializado
  if (bootstrapComplete === false) {
    return <BootstrapAdmin onComplete={handleBootstrapComplete} />;
  }

  // Mostrar loader mientras verifica bootstrap
  if (bootstrapComplete === null) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Iniciando sistema...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Iniciar Sesión</CardTitle>
          <CardDescription>Sistema de Gestión Vecinal JPUSAP</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="identifier"
                rules={{ required: 'Usuario o email es requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario o Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          placeholder="usuario@email.com"
                          autoComplete="username"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{ required: 'La contraseña es requerida' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          type="password"
                          placeholder="••••••••"
                          autoComplete="current-password"
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Iniciar Sesión
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full mt-2"
                onClick={handleResetBootstrap}
              >
                Resetear Sistema
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
