import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
// Auth services imports
import { createUserAndProfile } from '@/services/auth';
import { applyMirrorPermissions } from '@/services/rtdb';
import { setBootstrapInitialized } from '@/utils/seedAuthData';
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
  onComplete: () => void;
}

export const BootstrapAdmin: React.FC<BootstrapAdminProps> = ({ onComplete }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const form = useForm<BootstrapForm>({
    defaultValues: {
      displayName: 'Administrador Presidencia',
      email: 'presidencia@jpusap.local',
      username: 'presidencia',
      password: 'jpusap2024',
      confirmPassword: 'jpusap2024'
    }
  });

  const onSubmit = async (data: BootstrapForm) => {
    console.log('🚀 BootstrapAdmin: Starting user creation process...');
    
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
      // Auto-generar email si está vacío
      let email = data.email.trim();
      const username = data.username?.trim() || 'presidencia';
      
      if (!email) {
        email = `${username}@jpusap.local`;
      }

      console.log('📧 Using email:', email);
      console.log('👤 Using username:', username);

      // Crear usuario admin (Presidencia)
      console.log('🔐 Creating user in Firebase Auth...');
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
        fechaFinMandato: Date.now() + (365 * 24 * 60 * 60 * 1000) // Un año
      });
      console.log('✅ User created with UID:', uid);

      // Asignar permisos admin a todos los módulos
      const adminPermissions: Record<string, "admin"> = {};
      const modules = [
        'sesiones', 'actas', 'archivos', 'finanzas', 'seguridad', 
        'comunicaciones', 'deportes', 'salud', 'ambiente', 'educacion', 
        'cultura', 'auditoria', 'padron', 'sanciones', 'patrimonio', 
        'planTrabajo', 'electoral'
      ];

      modules.forEach(module => {
        adminPermissions[module] = 'admin';
      });

      console.log('🛡️ Applying admin permissions...');
      await applyMirrorPermissions(uid, adminPermissions, uid);
      console.log('✅ Admin permissions applied');

      // Marcar bootstrap como inicializado
      console.log('🏁 Marking bootstrap as initialized...');
      await setBootstrapInitialized();
      console.log('✅ Bootstrap marked as initialized');

      toast({
        title: "Administrador creado",
        description: "El usuario Presidencia ha sido creado exitosamente.",
      });

      console.log('🎉 Bootstrap process completed successfully');
      onComplete();
    } catch (err: any) {
      console.error('Error creating admin:', err);
      let errorMessage = 'Error al crear el administrador';
      
      if (err.message.includes('email-already-in-use')) {
        errorMessage = 'El email ya está registrado';
      } else if (err.message.includes('weak-password')) {
        errorMessage = 'La contraseña es muy débil';
      } else if (err.message.includes('invalid-email')) {
        errorMessage = 'Email inválido';
      } else if (err.message.includes('ya está en uso')) {
        errorMessage = err.message; // Mensaje específico de username duplicado
      }
      
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
          <CardDescription>
            Crear cuenta de Presidencia (Administrador)
          </CardDescription>
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
                    message: 'Email inválido'
                  }
                }}
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email (opcional)</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                        <Input 
                          className="pl-10" 
                          placeholder="presidencia@jpusap.local (auto-generado)" 
                          type="email"
                          {...field} 
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                    <p className="text-xs text-muted-foreground">
                      Si se deja vacío, se auto-generará: usuario@jpusap.local
                    </p>
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
                      <Input placeholder="presidente" {...field} />
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
                  minLength: {
                    value: 6,
                    message: 'Mínimo 6 caracteres'
                  }
                }}
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
                Crear Administrador
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};