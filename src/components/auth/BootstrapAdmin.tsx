// src/components/auth/BootstrapAdmin.tsx
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';

import { createUserAndProfile } from '@/services/auth';
import { applyMirrorPermissions } from '@/services/rtdb';
import { setBootstrapInitialized } from '@/services/rtdb'; // ✅ usar services/rtdb
import { Shield, User, Mail, Lock, Loader2 } from 'lucide-react';
import { toast } from '@/hooks/use-toast';

interface BootstrapForm {
  displayName: string;
  email: string;
  username?: string;
  password: string;
  confirmPassword: string;
}

interface BootstrapAdminProps {
  onComplete: () => void; // el padre (Login) pondrá bootstrapComplete=true
}

export const BootstrapAdmin: React.FC<BootstrapAdminProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<BootstrapForm>({
    defaultValues: {
      displayName: 'Administrador Presidencia',
      email: 'presidencia@jpusap.com',   // ✅ mismo dominio que vas a usar
      username: 'presidencia',
      password: 'jpusap2024',
      confirmPassword: 'jpusap2024'
    }
  });

  const onSubmit = async (data: BootstrapForm) => {
    if (data.password !== data.confirmPassword) {
      form.setError('confirmPassword', { message: 'Las contraseñas no coinciden' });
      return;
    }
    if (data.password.length < 6) {
      form.setError('password', { message: 'La contraseña debe tener al menos 6 caracteres' });
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const email = (data.email || `${data.username || 'presidencia'}@jpusap.com`).trim();
      const username = (data.username || 'presidencia').trim();

      // 1) Crear usuario + perfil
      const uid = await createUserAndProfile({
        displayName: data.displayName,
        email,
        username,
        roleId: 'presidencia',
        activo: true,
        password: data.password,
        tipoUsuario: 'presidente',
        phone: undefined,
        empadronadoId: undefined,
        fechaInicioMandato: Date.now(),
        fechaFinMandato: Date.now() + 365 * 24 * 60 * 60 * 1000
      });

      // 2) Dar permisos admin a todos los módulos
      const modules = [
        'sesiones','actas','archivos','finanzas','seguridad',
        'comunicaciones','deportes','salud','ambiente','educacion',
        'cultura','auditoria','padron','sanciones','patrimonio',
        'planTrabajo','electoral'
      ] as const;

      const adminPermissions: Record<string, 'admin'> = {};
      modules.forEach(m => { adminPermissions[m] = 'admin'; });
      await applyMirrorPermissions(uid, adminPermissions, uid);

      // 3) Marcar bootstrap como hecho y salir a login
      await setBootstrapInitialized();
      toast({ title: 'Administrador creado', description: 'Ahora puedes iniciar sesión.' });
      onComplete();
    } catch (err: any) {
      // ✅ si el correo YA EXISTE, marcamos bootstrap y salimos del asistente
      const msg = String(err?.code || err?.message || '').toLowerCase();

      if (msg.includes('auth/email-already-in-use') || msg.includes('email-already-in-use')) {
        await setBootstrapInitialized();
        toast({
          title: 'Cuenta ya existente',
          description: 'La cuenta de presidencia ya existe. Continuando al inicio de sesión.',
        });
        onComplete(); // ← quita la pantalla de configuración y muestra el login
        return;
      }

      let errorMessage = 'Error al crear el administrador';
      if (msg.includes('weak-password')) errorMessage = 'La contraseña es muy débil';
      if (msg.includes('invalid-email')) errorMessage = 'Email inválido';
      if (msg.includes('ya está en uso')) errorMessage = err.message;

      setError(errorMessage);
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
                  pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Email inválido' }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input className="pl-10" type="email" placeholder="presidencia@jpusap.com" {...field} />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">Sugerido: presidencia@jpusap.com</p>
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
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                rules={{ required: 'La contraseña es requerida', minLength: { value: 6, message: 'Mínimo 6 caracteres' } }}
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
