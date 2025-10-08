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

import { useAuth } from '@/contexts/AuthContext';
import { Shield, Mail, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// 🔸 Leemos el flag directo del servicio RTDB
import { isBootstrapInitialized } from '@/services/rtdb';
// Para el fallback a admin existente
import { ref, get } from 'firebase/database';
import { db } from '@/config/firebase';

interface LoginForm {
  identifier: string;
  password: string;
}

const normalize = (v?: string | null) => (v || '').trim().toLowerCase();
const isSuperAdmin = (email?: string | null, roleId?: string | null | undefined) =>
  normalize(email) === 'presidencia@jpusap.com' || normalize(roleId || '') === 'super_admin';

// Fallback: si no hay flag, pero ya existe un admin en /users
const hasAnyAdminInDb = async () => {
  const snap = await get(ref(db, 'users'));
  if (!snap.exists()) return false;
  const users = Object.values(snap.val() as Record<string, any>);
  return users.some(
    (u: any) =>
      (u?.roleId === 'super_admin' || u?.roleId === 'presidencia') && u?.activo === true
  );
};

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bootstrapComplete, setBootstrapComplete] = useState<boolean | null>(null);

  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const form = useForm<LoginForm>({ defaultValues: { identifier: '', password: '' } });

  // Si ya está logueado, redirigimos a donde quería ir o /inicio
  useEffect(() => {
    console.log('🔍 Login: useEffect - user:', user?.email, 'profile:', profile?.roleId);
    if (!user) return;
    const from = (location.state as any)?.from?.pathname || '/inicio';
    console.log('➡️ Login: Redirecting to:', from);
    navigate(from, { replace: true });
  }, [user, location.state, navigate]);

  // Verificar bootstrap + fallback a admin ya existente
  useEffect(() => {
    const checkBootstrap = async () => {
      try {
        const initialized = await isBootstrapInitialized();
        if (initialized) {
          setBootstrapComplete(true);
          return;
        }
        // Fallback: si no hay flag pero ya hay admin en /users
        if (await hasAnyAdminInDb()) {
          setBootstrapComplete(true);
          return;
        }
        // Si no hay nada, mostrar BootstrapAdmin
        setBootstrapComplete(false);
      } catch (err) {
        console.error('❌ Error checking bootstrap:', err);
        // En error, mejor dejar entrar al login normal para no bloquear
        setBootstrapComplete(true);
      }
    };
    checkBootstrap();
  }, []);

  const onSubmit = async (data: LoginForm) => {
    console.log('🔐 Login: Attempting login with:', data.identifier);
    setLoading(true);
    setError(null);
    try {
      const result = await signInWithEmailOrUsername(data.identifier, data.password);
      console.log('✅ Login: Success, result:', result.user.uid);
      toast({ title: 'Inicio de sesión exitoso', description: 'Bienvenido al sistema.' });
      // La redirección ocurre en el useEffect de arriba
    } catch (err: any) {
      const msg = String(err?.message || '').toLowerCase();
      let errorMessage = 'Error al iniciar sesión';
      if (msg.includes('horario_no_permitido')) {
        errorMessage = 'Estás fuera de tu horario laboral, contáctate con el encargado de seguridad.';
      } else if (msg.includes('usuario_suspendido') || msg.includes('user-disabled')) {
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
    // BootstrapAdmin nos avisa que ya terminó (dejó el flag en true)
    setBootstrapComplete(true);
    toast({
      title: 'Sistema inicializado',
      description: 'Ahora puedes iniciar sesión con la cuenta de Presidencia.',
    });
  };

  // Muestra BootstrapAdmin si NO está inicializado
  if (bootstrapComplete === false) {
    return <BootstrapAdmin onComplete={handleBootstrapComplete} />;
  }

  // Loader mientras verificamos
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

  // Login normal
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
                          placeholder="presidencia@jpusap.com"
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
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
