import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Settings, KeyRound } from 'lucide-react';
import { Empadronado } from '@/types/empadronados';
import { Module, Permission, PermissionLevel } from '@/types/auth';
import { listModules, getUserPermissions, setUserPermissions as savePermissionsToRTDB } from '@/services/rtdb';
import { useAuth } from '@/contexts/AuthContext';
import { createUserAndProfile } from '@/services/auth';

interface GestionarPermisosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  onAccountCreated?: () => void;
}

export const GestionarPermisosModal: React.FC<GestionarPermisosModalProps> = ({
  open,
  onOpenChange,
  empadronado,
  onAccountCreated
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [userPermissions, setUserPermissions] = useState<Permission>({});
  const [loading, setLoading] = useState(false);
  const [creatingAccount, setCreatingAccount] = useState(false);

  useEffect(() => {
    if (open) {
      loadData();
    }
  }, [open, empadronado]);

  const loadData = async () => {
    setLoading(true);
    try {
      const modulesData = await listModules();
      setModules(modulesData);
      
      if (empadronado?.authUid) {
        const permissions = await getUserPermissions(empadronado.authUid);
        setUserPermissions(permissions || {});
      } else {
        setUserPermissions({});
      }
    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los datos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (moduleId: string, level: PermissionLevel) => {
    setUserPermissions(prev => ({
      ...prev,
      [moduleId]: level
    }));
  };

  const savePermissions = async () => {
    if (!empadronado?.authUid) return;
    
    setLoading(true);
    try {
      await savePermissionsToRTDB(empadronado.authUid, userPermissions, user?.uid || 'system');
      toast({
        title: "Éxito",
        description: "Permisos actualizados correctamente"
      });
      onOpenChange(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron actualizar los permisos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const createAccountAndSetPermissions = async () => {
    if (!empadronado) return;
    
    setCreatingAccount(true);
    try {
      // Crear credenciales sugeridas
      const baseUser = empadronado.numeroPadron?.trim()
        ? `emp-${empadronado.numeroPadron.trim().toLowerCase()}`
        : `emp-${empadronado.nombre.toLowerCase().replace(/\s+/g, '-')}`;
      const email = `${baseUser}@jpusap.com`;
      const password = (empadronado.dni && empadronado.dni.length >= 6) ? empadronado.dni : 'jpusap2024';

      // Crear la cuenta
      await createUserAndProfile({
        displayName: `${empadronado.nombre} ${empadronado.apellidos}`,
        email: email.trim().toLowerCase(),
        username: baseUser.trim().toLowerCase(),
        phone: empadronado.telefonos?.[0]?.numero || '',
        roleId: 'asociado',
        activo: true,
        password,
        empadronadoId: empadronado.id,
        tipoUsuario: 'asociado'
      });

      toast({
        title: "Cuenta creada",
        description: "Se creó la cuenta. Configurando permisos..."
      });

      // Notificar al componente padre para recargar datos
      if (onAccountCreated) {
        onAccountCreated();
      }

      // Esperar un momento para que se actualicen los datos
      setTimeout(async () => {
        await loadData();
      }, 1000);
    } catch (error: any) {
      const msg = String(error?.message || '');
      let friendly = 'No se pudo crear el acceso.';
      if (msg.includes('email-already-in-use')) friendly = 'El email ya está registrado.';
      if (msg.includes('ya está en uso')) friendly = msg;
      toast({
        title: "Error",
        description: friendly,
        variant: "destructive"
      });
    } finally {
      setCreatingAccount(false);
    }
  };

  if (!empadronado) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Gestionar Permisos de Acceso
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            {empadronado.nombre} {empadronado.apellidos} - Padrón {empadronado.numeroPadron}
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {empadronado.emailAcceso ? (
            <div className="p-3 bg-muted/30 rounded-lg">
              <Label className="text-sm font-medium">Email de Acceso</Label>
              <p className="text-green-600 font-medium">{empadronado.emailAcceso}</p>
            </div>
          ) : (
            <div className="p-3 bg-destructive/10 rounded-lg">
              <p className="text-sm text-destructive">Este usuario no tiene acceso al sistema</p>
            </div>
          )}

          <div className="space-y-3">
            <Label className="text-lg font-semibold">Permisos por Módulo</Label>
            
            {!empadronado.authUid && !empadronado.emailAcceso && (
              <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <KeyRound className="h-4 w-4 text-orange-600" />
                  <span className="text-sm font-medium text-orange-800">Cuenta requerida</span>
                </div>
                <p className="text-sm text-orange-700 mb-3">
                  Para asignar permisos, primero debes crear una cuenta de acceso para este empadronado.
                </p>
                <Button 
                  size="sm" 
                  onClick={createAccountAndSetPermissions}
                  disabled={creatingAccount}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {creatingAccount ? 'Creando cuenta...' : 'Crear Cuenta de Acceso'}
                </Button>
              </div>
            )}
            
            {loading ? (
              <div className="space-y-3">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
                ))}
              </div>
            ) : (
              <div className="space-y-3">
                {modules.map((module) => {
                  const currentLevel = userPermissions[module.id] || 'none';
                  const isDisabled = !empadronado.authUid && !empadronado.emailAcceso;
                  
                  return (
                    <div key={module.id} className={`border rounded-lg p-4 ${isDisabled ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <span className="font-medium">{module.nombre}</span>
                        </div>
                        <Badge variant={
                          currentLevel === 'none' ? 'outline' :
                          currentLevel === 'read' ? 'secondary' :
                          currentLevel === 'write' ? 'default' : 'destructive'
                        }>
                          {currentLevel === 'none' ? 'Sin acceso' :
                           currentLevel === 'read' ? 'Lectura' :
                           currentLevel === 'write' ? 'Escritura' : 'Admin'}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-4 gap-2">
                        {[
                          { value: 'none', label: 'Sin Acceso', color: 'bg-muted hover:bg-muted/80' },
                          { value: 'read', label: 'Lectura', color: 'bg-blue-500 hover:bg-blue-600 text-white' },
                          { value: 'write', label: 'Escritura', color: 'bg-green-500 hover:bg-green-600 text-white' },
                          { value: 'admin', label: 'Admin', color: 'bg-purple-500 hover:bg-purple-600 text-white' }
                        ].map((option) => (
                          <button
                            key={option.value}
                            onClick={() => !isDisabled && handlePermissionChange(module.id, option.value as PermissionLevel)}
                            disabled={isDisabled}
                            className={`text-sm px-3 py-2 rounded-md border transition-all ${
                              currentLevel === option.value && !isDisabled
                                ? option.color
                                : 'bg-background hover:bg-muted border-border'
                            } ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={savePermissions} 
              disabled={loading || !empadronado.authUid}
            >
              {loading ? 'Guardando...' : 'Guardar Permisos'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};