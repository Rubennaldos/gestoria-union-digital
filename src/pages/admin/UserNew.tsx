import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthz } from '@/contexts/AuthzContext';
import { createUserAndProfile } from '@/services/auth';
import { listRoles } from '@/services/rtdb';
import { CreateUserForm, Role } from '@/types/auth';
import { Empadronado } from '@/types/empadronados';
import { UserEmpadronadoSelector } from '@/components/auth/UserEmpadronadoSelector';
import { 
  ArrowLeft, 
  User, 
  Mail, 
  Lock, 
  Phone, 
  Shield,
  Loader2,
  Plus,
  Home
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

export default function UserNew() {
  const { user } = useAuth();
  const { isPresidencia } = useAuthz();
  const navigate = useNavigate();
  
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedEmpadronado, setSelectedEmpadronado] = useState<Empadronado | null>(null);

  const form = useForm<CreateUserForm & { confirmPassword: string }>({
    defaultValues: {
      displayName: '',
      email: '',
      username: '',
      phone: '',
      roleId: '',
      activo: true,
      password: '',
      confirmPassword: '',
      empadronadoId: '',
      tipoUsuario: 'asociado',
      fechaInicioMandato: undefined,
      fechaFinMandato: undefined
    }
  });

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    if (!isPresidencia) {
      navigate('/inicio');
      return;
    }

    loadRoles();
  }, [user, isPresidencia, navigate]);

  const loadRoles = async () => {
    try {
      const rolesData = await listRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
      toast({
        title: "Error",
        description: "Error al cargar los roles",
        variant: "destructive"
      });
    }
  };

  const onSubmit = async (data: CreateUserForm & { confirmPassword: string }) => {
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
      const { confirmPassword, ...userData } = data;
      
      // Auto-generar email si está vacío
      let email = userData.email.trim();
      const username = userData.username?.trim();
      
      if (!email && username) {
        email = `${username}@jpusap.local`;
      }

      const uid = await createUserAndProfile({
        ...userData,
        email,
        username: username || undefined,
        phone: userData.phone || undefined
      });

      toast({
        title: "Usuario creado",
        description: "El usuario ha sido creado exitosamente.",
      });

      // Redirigir a la página de permisos
      navigate(`/admin/users/${uid}/permissions`);
    } catch (err: any) {
      console.error('Error creating user:', err);
      let errorMessage = 'Error al crear el usuario';
      
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
                Volver
              </Link>
            </Button>
            <div className="h-6 w-px bg-border" />
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-semibold">Nuevo Usuario</h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Crear Nuevo Usuario
            </CardTitle>
            <CardDescription>
              Complete los datos del nuevo usuario. Se enviará un email de confirmación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Datos Personales */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Datos Personales</h3>
                    
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
                                placeholder="usuario@jpusap.local (auto-generado)" 
                                type="email"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                          <p className="text-xs text-muted-foreground">
                            Si se deja vacío, se auto-generará basado en el usuario
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
                            <Input placeholder="juan.perez" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Teléfono (opcional)</FormLabel>
                          <FormControl>
                            <div className="relative">
                              <Phone className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                              <Input 
                                className="pl-10" 
                                placeholder="+51 999 999 999" 
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
                      name="empadronadoId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Empadronado Asociado (opcional)</FormLabel>
                          <FormControl>
                            <UserEmpadronadoSelector
                              value={field.value}
                              onChange={(empadronadoId, empadronado) => {
                                field.onChange(empadronadoId);
                                setSelectedEmpadronado(empadronado);
                                // Auto-rellenar datos si están vacíos
                                if (!form.getValues('displayName')) {
                                  form.setValue('displayName', `${empadronado.nombre} ${empadronado.apellidos}`);
                                }
                                if (!form.getValues('phone') && empadronado.telefonos?.[0]) {
                                  form.setValue('phone', empadronado.telefonos[0].numero);
                                }
                              }}
                              onClear={() => {
                                field.onChange('');
                                setSelectedEmpadronado(null);
                              }}
                              placeholder="Buscar empadronado por nombre, DNI o padrón..."
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Configuración de Cuenta */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-medium border-b pb-2">Configuración de Cuenta</h3>
                    
                    <FormField
                      control={form.control}
                      name="tipoUsuario"
                      rules={{ required: 'El tipo de usuario es requerido' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo de Usuario</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar tipo" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="administrador">
                                <div>
                                  <div className="font-medium">Administrador</div>
                                  <div className="text-xs text-muted-foreground">Acceso total al sistema</div>
                                </div>
                              </SelectItem>
                              <SelectItem value="presidente">
                                <div>
                                  <div className="font-medium">Presidente</div>
                                  <div className="text-xs text-muted-foreground">Presidencia de JPUSAP</div>
                                </div>
                              </SelectItem>
                              <SelectItem value="directivo">
                                <div>
                                  <div className="font-medium">Directivo</div>
                                  <div className="text-xs text-muted-foreground">Miembro de junta directiva</div>
                                </div>
                              </SelectItem>
                              <SelectItem value="delegado">
                                <div>
                                  <div className="font-medium">Delegado</div>
                                  <div className="text-xs text-muted-foreground">Delegado por sector/manzana</div>
                                </div>
                              </SelectItem>
                              <SelectItem value="asociado">
                                <div>
                                  <div className="font-medium">Asociado</div>
                                  <div className="text-xs text-muted-foreground">Usuario básico del sistema</div>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="roleId"
                      rules={{ required: 'El rol es requerido' }}
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Rol Funcional</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Seleccionar rol" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {roles.map(role => (
                                <SelectItem key={role.id} value={role.id}>
                                  <div>
                                    <div className="font-medium">{role.nombre}</div>
                                    <div className="text-xs text-muted-foreground">{role.descripcion}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {(form.watch('tipoUsuario') === 'directivo' || form.watch('tipoUsuario') === 'delegado') && (
                      <>
                        <FormField
                          control={form.control}
                          name="fechaInicioMandato"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Inicio del Mandato</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).getTime() : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />

                        <FormField
                          control={form.control}
                          name="fechaFinMandato"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Fin del Mandato</FormLabel>
                              <FormControl>
                                <Input
                                  type="date"
                                  {...field}
                                  value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                                  onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value).getTime() : undefined)}
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </>
                    )}

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
                          <FormLabel>Contraseña Temporal</FormLabel>
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
                      rules={{ required: 'Confirma la contraseña' }}
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

                    <FormField
                      control={form.control}
                      name="activo"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel className="text-base">Usuario Activo</FormLabel>
                            <div className="text-sm text-muted-foreground">
                              El usuario podrá acceder al sistema
                            </div>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <div className="flex gap-4 pt-6">
                  <Button type="button" variant="outline" asChild className="flex-1">
                    <Link to="/admin/users">Cancelar</Link>
                  </Button>
                  <Button type="submit" disabled={loading} className="flex-1">
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Crear y Asignar Permisos
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}