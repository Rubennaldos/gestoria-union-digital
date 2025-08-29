import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { BootstrapAdmin } from '@/components/auth/BootstrapAdmin';
import { signInWithEmailOrUsername } from '@/services/auth';
import { isBootstrapInitialized, seedAuthData } from '@/utils/seedAuthData';
import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface LoginForm {
  identifier: string; // email o username
  password: string;
}

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapComplete, setBootstrapComplete] = useState<boolean | null>(null);
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const form = useForm<LoginForm>({
    defaultValues: {
      identifier: '',
      password: ''
    }
  });

  // Verificar si ya está logueado
  useEffect(() => {
    if (user && profile?.activo) {
      // Redirigir según rol
      if (profile.roleId === 'presidencia') {
        navigate('/admin/users');
      } else {
        navigate('/inicio');
      }
    }
  }, [user, profile, navigate]);

  // Verificar bootstrap al cargar
  useEffect(() => {
    const checkBootstrap = async () => {
      try {
        const initialized = await isBootstrapInitialized();
        if (!initialized) {
          // Cargar datos semilla
          await seedAuthData();
        }
        setBootstrapComplete(initialized);
      } catch (error) {
        console.error('Error checking bootstrap:', error);
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
        title: "Inicio de sesión exitoso",
        description: "Bienvenido al sistema.",
      });

    } catch (err: any) {
      console.error('Login error:', err);
      let errorMessage = 'Error al iniciar sesión';
      
      if (err.message.includes('USUARIO_SUSPENDIDO')) {
        errorMessage = 'Tu acceso está deshabilitado, contacta a Presidencia.';
      } else if (err.message.includes('user-not-found') || err.message.includes('Usuario no encontrado')) {
        errorMessage = 'Usuario no encontrado';
      } else if (err.message.includes('wrong-password')) {
        errorMessage = 'Contraseña incorrecta';
      } else if (err.message.includes('invalid-email')) {
        errorMessage = 'Email inválido';
      } else if (err.message.includes('user-disabled')) {
        errorMessage = 'Usuario deshabilitado';
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleBootstrapComplete = () => {
    setBootstrapComplete(true);
    toast({
      title: "Sistema inicializado",
      description: "Ahora puedes iniciar sesión con la cuenta de Presidencia.",
    });
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
          <CardDescription>
            Sistema de Gestión Vecinal JPUSAP
          </CardDescription>
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
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}