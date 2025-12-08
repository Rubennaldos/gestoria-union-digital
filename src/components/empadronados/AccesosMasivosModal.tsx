import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Lock, Users, Loader2 } from 'lucide-react';
import { Module, Permission } from '@/types/auth';
import { Empadronado } from '@/types/empadronados';
import { listModules, getUserPermissions } from '@/services/rtdb';
import { ref, update } from 'firebase/database';
import { db } from '@/config/firebase';
import { useAuth } from '@/contexts/AuthContext';

interface AccesosMasivosModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronados: Empadronado[];
  onComplete?: () => void;
}

export const AccesosMasivosModal: React.FC<AccesosMasivosModalProps> = ({
  open,
  onOpenChange,
  empadronados,
  onComplete
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [modules, setModules] = useState<Module[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  
  // Estado de cada módulo: true = activar para todos, false = desactivar para todos
  const [moduleActions, setModuleActions] = useState<Record<string, boolean>>({});

  // Empadronados con cuenta activa
  const empadronadosConCuenta = empadronados.filter(e => e.authUid);

  useEffect(() => {
    if (open) {
      loadModules();
    }
  }, [open]);

  const loadModules = async () => {
    setLoading(true);
    try {
      const modulesData = await listModules();
      setModules(modulesData);
      // Inicializar todos los toggles en false (desactivar)
      const initialActions: Record<string, boolean> = {};
      modulesData.forEach(m => {
        initialActions[m.id] = false;
      });
      setModuleActions(initialActions);
    } catch (error) {
      console.error('Error loading modules:', error);
      toast({
        title: "Error",
        description: "No se pudieron cargar los módulos",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (moduleId: string, activate: boolean) => {
    setModuleActions(prev => ({
      ...prev,
      [moduleId]: activate
    }));
  };

  const applyToAll = async () => {
    if (empadronadosConCuenta.length === 0) {
      toast({
        title: "Sin cuentas activas",
        description: "No hay empadronados con cuenta activa para modificar",
        variant: "destructive"
      });
      return;
    }

    setApplying(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const emp of empadronadosConCuenta) {
        if (!emp.authUid) continue;

        try {
          // Obtener permisos actuales del usuario
          const currentPermissions = await getUserPermissions(emp.authUid) || {};
          
          // Aplicar cambios según la acción de cada módulo
          const updatedModules: Record<string, any> = {};
          
          for (const [moduleId, activate] of Object.entries(moduleActions)) {
            const currentLevel = currentPermissions[moduleId] || 'none';
            const hasAccess = currentLevel !== 'none';
            
            if (activate) {
              // Si el toggle está en activar y el usuario no tiene acceso, dar acceso
              if (!hasAccess) {
                updatedModules[moduleId] = 'admin';
              }
              // Si ya tiene acceso, no hacer nada (mantener su nivel actual)
            } else {
              // Si el toggle está en desactivar y el usuario tiene acceso, quitar acceso
              if (hasAccess) {
                updatedModules[moduleId] = null;
              }
              // Si no tiene acceso, no hacer nada
            }
          }
          
          // Solo actualizar si hay cambios
          if (Object.keys(updatedModules).length > 0) {
            await update(ref(db, `/users/${emp.authUid}/modules`), updatedModules);
          }
          
          successCount++;
        } catch (error) {
          console.error(`Error updating permissions for ${emp.authUid}:`, error);
          errorCount++;
        }
      }

      if (errorCount === 0) {
        toast({
          title: "Éxito",
          description: `Permisos actualizados para ${successCount} usuarios`
        });
      } else {
        toast({
          title: "Parcialmente completado",
          description: `${successCount} actualizados, ${errorCount} con errores`,
          variant: "destructive"
        });
      }
      
      onComplete?.();
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying permissions:', error);
      toast({
        title: "Error",
        description: "Ocurrió un error al aplicar los permisos",
        variant: "destructive"
      });
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Gestión Masiva de Accesos
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Users className="h-4 w-4" />
            <span>{empadronadosConCuenta.length} empadronados con cuenta activa</span>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 bg-muted/30 rounded-lg text-sm space-y-1">
            <p><strong>Activar:</strong> Si el usuario no tiene el módulo, se le activa. Si ya lo tiene, se mantiene igual.</p>
            <p><strong>Desactivar:</strong> Si el usuario tiene el módulo, se le quita. Si no lo tiene, se mantiene igual.</p>
          </div>

          {loading ? (
            <div className="space-y-3">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-16 bg-muted/50 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {modules.map((module) => {
                const isActivate = moduleActions[module.id] ?? false;
                
                return (
                  <div key={module.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{module.nombre}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={isActivate ? "default" : "secondary"}>
                          {isActivate ? 'Activar' : 'Desactivar'}
                        </Badge>
                        <Switch
                          checked={isActivate}
                          onCheckedChange={(checked) => handleToggle(module.id, checked)}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
              Cancelar
            </Button>
            <Button 
              onClick={applyToAll} 
              disabled={loading || applying || empadronadosConCuenta.length === 0}
            >
              {applying ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Aplicando...
                </>
              ) : (
                `Aplicar a ${empadronadosConCuenta.length} usuarios`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
