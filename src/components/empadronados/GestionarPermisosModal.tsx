import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Settings, KeyRound } from 'lucide-react';
import { Empadronado } from '@/types/empadronados';
import { Module, Permission, PermissionLevel } from '@/types/auth';
import { listModules, getUserPermissions } from '@/services/rtdb';
import { useAuth } from '@/contexts/AuthContext';

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

  const handleModuleToggle = (moduleId: string, enabled: boolean) => {
    setUserPermissions(prev => ({
      ...prev,
      [moduleId]: enabled ? 'admin' : 'none'
    }));
  };

  const savePermissions = async () => {
    if (!empadronado?.authUid) return;
    setLoading(true);
    try {
      // Construir el objeto modules para la RTDB
      const modulesPayload: Record<string, any> = {};
      Object.entries(userPermissions).forEach(([mod, level]) => {
        if (level === 'none') {
          modulesPayload[mod] = null; // Eliminar el nodo
        } else {
          modulesPayload[mod] = level; // Guardar el nivel (admin, write, read)
        }
      });
      // Guardar en /users/{uid}/modules
      const { ref, update } = await import('firebase/database');
      const { db } = await import('@/config/firebase');
      await update(ref(db, `/users/${empadronado.authUid}/modules`), modulesPayload);
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
                <p className="text-sm text-orange-700">
                  Para asignar permisos, este empadronado debe tener una cuenta de acceso. Puedes crearla desde la sección "Cuenta de Usuario del Sistema" en el formulario de edición del empadronado.
                </p>
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
                  const isEnabled = currentLevel !== 'none';
                  const isDisabled = !empadronado.authUid && !empadronado.emailAcceso;
                  
                  return (
                    <div key={module.id} className={`border rounded-lg p-4 ${isDisabled ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="font-medium">{module.nombre}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-sm text-muted-foreground">
                            {isEnabled ? 'Activado' : 'Desactivado'}
                          </span>
                          <Switch
                            checked={isEnabled}
                            onCheckedChange={(checked) => !isDisabled && handleModuleToggle(module.id, checked)}
                            disabled={isDisabled}
                          />
                        </div>
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