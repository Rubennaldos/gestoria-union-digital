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
import { Mail, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import securityGuardImage from '@/assets/security-guard-stop.png';
import logoUrbanizacion from '@/assets/logo-urbanizacion.png';

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
    
    // Esperar un momento para asegurar que no hay errores pendientes
    const timer = setTimeout(() => {
      const from = (location.state as any)?.from?.pathname || '/inicio';
      console.log('➡️ Login: Redirecting to:', from);
      navigate(from, { replace: true });
    }, 300);
    
    return () => clearTimeout(timer);
  }, [user, location.state, navigate, profile]);

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
      console.log('❌ Login error:', err);
      const msg = String(err?.message || '').toLowerCase();
      let errorMessage = 'Error al iniciar sesión';
      let isScheduleError = false;
      
      if (msg.includes('horario_no_permitido')) {
        console.log('🚫 Error de horario detectado');
        errorMessage = 'Estás fuera de tu horario laboral, contáctate con el encargado de seguridad.';
        isScheduleError = true;
      } else if (msg.includes('usuario_suspendido') || msg.includes('user-disabled')) {
        errorMessage = 'Tu acceso está deshabilitado, contacta a Presidencia.';
      } else if (msg.includes('user-not-found') || msg.includes('usuario no encontrado')) {
        errorMessage = 'Usuario no encontrado. Verifica tu email o nombre de usuario.';
      } else if (msg.includes('wrong-password') || msg.includes('invalid-credential')) {
        errorMessage = 'Usuario o contraseña incorrectos. Verifica tus credenciales.';
      } else if (msg.includes('invalid-email')) {
        errorMessage = 'El formato del email no es válido.';
      } else if (msg.includes('too-many-requests')) {
        errorMessage = 'Demasiados intentos fallidos. Espera unos minutos e intenta de nuevo.';
      }
      
      console.log('📝 Setting error message:', errorMessage);
      setError(errorMessage);
      
      if (isScheduleError) {
        // Scroll to top to show the image
        setTimeout(() => {
          window.scrollTo({ top: 0, behavior: 'smooth' });
        }, 100);
      }
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-blue-900 to-slate-800 p-4">
      <div className="w-full max-w-5xl flex flex-col lg:flex-row items-center gap-8 lg:gap-16">
        
        {/* Panel izquierdo - Logo y nombre */}
        <div className="flex-1 text-center lg:text-left space-y-6 px-4">
          <div className="flex flex-col items-center lg:items-start gap-4">
            <div className="w-32 h-32 lg:w-40 lg:h-40 bg-white/10 backdrop-blur-sm rounded-2xl p-4 shadow-2xl border border-white/20">
              <img 
                src={logoUrbanizacion} 
                alt="Logo Urbanización" 
                className="w-full h-full object-contain drop-shadow-lg"
              />
            </div>
            <div className="space-y-2">
              <h1 className="text-3xl lg:text-4xl font-bold text-white tracking-tight">
                Junta de Propietarios
              </h1>
              <h2 className="text-xl lg:text-2xl font-semibold text-blue-300">
                Urbanización San Antonio de Padua
              </h2>
              <p className="text-sm lg:text-base text-slate-300 max-w-md">
                Sistema de Gestión Vecinal
              </p>
            </div>
          </div>
          
          {/* Características destacadas - Solo en desktop */}
          <div className="hidden lg:flex flex-col gap-3 mt-8">
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-green-400"></div>
              <span className="text-sm">Control de acceso seguro</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-blue-400"></div>
              <span className="text-sm">Gestión de cobranzas</span>
            </div>
            <div className="flex items-center gap-3 text-slate-300">
              <div className="w-2 h-2 rounded-full bg-purple-400"></div>
              <span className="text-sm">Comunicación vecinal</span>
            </div>
          </div>
        </div>

        {/* Panel derecho - Formulario */}
        <Card className="w-full max-w-md shadow-2xl border-0 bg-white/95 backdrop-blur">
          <CardHeader className="text-center pb-2">
            <CardTitle className="text-2xl text-slate-800">Iniciar Sesión</CardTitle>
            <CardDescription className="text-slate-500">
              Ingresa tus credenciales para continuar
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
                      <FormLabel className="text-slate-700">Usuario o Email</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <Input
                            className="pl-10 h-11 border-slate-200 focus:border-blue-500"
                            placeholder="tu-email@ejemplo.com"
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
                      <FormLabel className="text-slate-700">Contraseña</FormLabel>
                      <FormControl>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
                          <Input
                            className="pl-10 h-11 border-slate-200 focus:border-blue-500"
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
                  <Alert variant="destructive" className="flex flex-col items-center gap-4 py-6">
                    {error.includes('horario laboral') && (
                      <img 
                        src={securityGuardImage} 
                        alt="Personal de Seguridad" 
                        className="w-32 h-32 object-contain"
                      />
                    )}
                    <AlertDescription className="text-center text-base">{error}</AlertDescription>
                  </Alert>
                )}

                <Button 
                  type="submit" 
                  className="w-full h-11 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-medium shadow-lg" 
                  disabled={loading}
                >
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Iniciar Sesión
                </Button>

                <Button
                  type="button"
                  variant="link"
                  className="w-full text-sm text-slate-500 hover:text-blue-600"
                  onClick={() => navigate('/recuperar-contrasena')}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
      
      {/* Footer */}
      <div className="fixed bottom-4 text-center w-full">
        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} JPUSAP - Soluciones de Software Arquisia  Todos los derechos reservados - www.arquisia.com
        </p>
      </div>
    </div>
  );
}
