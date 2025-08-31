import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { Shield, User, Mail, Lock, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

import { createUserAndProfile } from '@/services/auth';
import { applyMirrorPermissions, setBootstrapInitialized } from '@/services/rtdb';

interface BootstrapForm {
  displayName: string;
  email?: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

interface BootstrapAdminProps {
  onComplete: () => void;
}

const DEFAULT_EMAIL = 'presidencia@jpusap.com';
const DEFAULT_USERNAME = 'presidencia';

export const BootstrapAdmin: React.FC<BootstrapAdminProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const form = useForm<BootstrapForm>({
    defaultValues: {
      displayName: 'Administrador Presidencia',
      email: DEFAULT_EMAIL,
      username: DEFAULT_USERNAME,
      password: '',
      confirmPassword: '',
    },
  });

  const finishAndGoLogin = async (message?: string) => {
    await setBootstrapInitialized();
    if (message) {
      toast({ title: 'Listo', description: message });
    }
    onComplete?.();
    navigate('/login', { replace: true });
  };

  const onSubmit = async (data: BootstrapForm) => {
    setError(null);

    if (data.password !== data.confirmPassword) {
      form.setError('confirmPassword', { message: 'Las contraseñas no coinciden' });
      return;
    }
    if (data.password.length < 6) {
      form.setError('password', { message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setLoading(true);
    try {
      const email = (data.email || DEFAULT_EMAIL).trim().toLowerCase();
      const username = (data.username || DEFAULT_USERNAME).trim().toLowerCase();

      // Crea el usuario en Auth con app secundaria y su perfil en RTDB
      const uid = await createUserAndProfile({
        email,
        password: data.password,
        username,
        displayName: data.displayName.trim(),
        roleId: 'super_admin',   // acceso total
        activo: true,
        phone: '',               // evita "undefined" en RTDB
      });

      // Permisos admin para todos los módulos
      const adminPermissions: Record<string, 'admin'> = {};
      [
        'sesiones', 'actas', 'archivos', 'finanzas', 'seguridad',
        'comunicaciones', 'deportes', 'salud', 'ambiente', 'educacion',
        'cultura', 'auditoria', 'padron', 'sanciones', 'patrimonio',
        'planTrabajo', 'electoral'
      ].forEach((m) => (adminPermissions[m] = 'admin'));

      await applyMirrorPermissions(uid, adminPermissions, uid);

      await finishAndGoLogin('Administrador creado. Inicia sesión con tu cuenta de Presidencia.');
    } catch (e: any) {
      // Si el correo ya existe en Firebase Auth, marcamos bootstrap como hecho y vamos a login
      const code = String(e?.code || '').toLowerCase();
      const msg = String(e?.message || '').toLowerCase();

      if (code.includes('auth/email-already-in-use') || msg.includes('email-already-in-use')) {
        await finishAndGoLogin('El correo ya existe. Te llevamos al inicio de sesión.');
        return;
      }

      // Username duplicado (mensaje custom desde RTDB)
      if (msg.includes('ya está en uso') || msg.includes('username')) {
        setError(e?.message || 'El usuario ya está en uso');
      } else if (code.includes('auth/invalid-email') || msg.includes('invalid-email')) {
        setError('Email inválido');
      } else if (code.includes('auth/weak-password') || msg.includes('weak-password')) {
        setError('La contraseña es muy débil');
      } else {
        setError('Error al crear el administrador');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            <Shield className="w-6 h-6 text-primary" />
          </div>
          <CardTitle className="text-2xl">Configuración Inicial</CardTitle>
          <CardDescription>Crear cuenta de Presidencia (Administrador)</CardDescription>
        </CardHeader>

        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="displayName"
                rules={{ required: 'El nombre es requerido' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre Completo</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" placeholder="Juan Pérez" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                rules={{
                  pattern: {
                    value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                    message: 'Email inválido',
                  },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input
                          className="pl-10"
                          type="email"
                          placeholder={DEFAULT_EMAIL}
                          {...field}
                        />
                      </div>
                    </FormControl>
                    <p className="text-xs text-muted-foreground mt-1">
                      Sugerido: <b>{DEFAULT_EMAIL}</b>
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
                      <Input placeholder={DEFAULT_USERNAME} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{
                  required: 'La contraseña es requerida',
                  minLength: { value: 6, message: 'Mínimo 6 caracteres' },
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" type="password" placeholder="••••••••" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="confirmPassword"
                rules={{ required: 'Confirma tu contraseña' }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Contraseña</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" type="password" placeholder="••••••••" {...field} />
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
                Crear Administrador
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};
