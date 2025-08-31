// src/components/auth/BootstrapAdmin.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Shield, Mail, Lock, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

import { createUserAndProfile } from '@/services/auth';
import { listModules, setBootstrapInitialized, setPermission } from '@/services/rtdb';

type FormValues = {
  displayName: string;
  email: string;
  username?: string;
  password: string;
  confirmPassword: string;
};

const normalize = (s: string) => (s || '').trim();

export const BootstrapAdmin: React.FC<{ onComplete?: () => void }> = ({ onComplete }) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const form = useForm<FormValues>({
    defaultValues: {
      displayName: 'Administrador Presidencia',
      email: 'presidencia@jpusap.com',
      username: 'presidencia',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: FormValues) => {
    setError(null);

    const displayName = normalize(values.displayName);
    const email = normalize(values.email || 'presidencia@jpusap.com');
    const username = normalize(values.username || 'presidencia');
    const password = values.password;
    const confirmPassword = values.confirmPassword;

    if (!displayName) {
      form.setError('displayName', { message: 'El nombre es obligatorio' });
      return;
    }
    if (!email) {
      form.setError('email', { message: 'El email es obligatorio' });
      return;
    }
    if (!password) {
      form.setError('password', { message: 'La contraseña es obligatoria' });
      return;
    }
    if (password !== confirmPassword) {
      form.setError('confirmPassword', { message: 'Las contraseñas no coinciden' });
      return;
    }

    try {
      setBusy(true);

      // 1) Crear usuario en Auth y perfil en RTDB
      const uid = await createUserAndProfile({
        email,
        password,
        displayName,
        username,
        roleId: 'super_admin',     // flag claro para super acceso
        activo: true,
      });

      // 2) Dar permisos admin a TODOS los módulos
      const modules = await listModules();
      await Promise.all(
        modules.map((m) => setPermission(uid, m.id, 'admin', uid))
      );

      // 3) Marcar el bootstrap y finalizar
      await setBootstrapInitialized();

      toast({
        title: 'Administrador creado',
        description: 'Ahora puedes iniciar sesión con presidencia@jpusap.com.',
      });

      onComplete?.();
      navigate('/login', { replace: true });
    } catch (e: any) {
      // Mensajes de error amigables
      const msg = String(e?.message || '').toLowerCase();
      let nice = 'Error al crear el administrador';

      if (msg.includes('email-already-in-use')) {
        nice = 'El correo ya está en uso. Ingresa por /login o elimina el usuario duplicado en Firebase Auth.';
      } else if (msg.includes('weak-password')) {
        nice = 'La contraseña es muy débil (Firebase exige al menos 6 caracteres).';
      } else if (msg.includes('usernames') && msg.includes('already')) {
        nice = 'El nombre de usuario ya existe. Prueba con otro.';
      }

      setError(nice);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración Inicial</CardTitle>
          <CardDescription>Crear cuenta de Presidencia (Administrador)</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
              <FormField
                control={form.control}
                name="displayName"
                rules={{ required: 'Requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                rules={{ required: 'Requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" type="email" {...field} />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Usa <b>presidencia@jpusap.com</b> para el acceso general.
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Usuario (opcional)</FormLabel>
                    <FormControl>
                      <Input placeholder="presidencia" {...field} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{ required: 'Requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" type="password" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{ required: 'Requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" type="password" {...field} />
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

              <Button type="submit" className="w-full" disabled={busy}>
                {busy ? 'Creando…' : 'Crear Administrador'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
