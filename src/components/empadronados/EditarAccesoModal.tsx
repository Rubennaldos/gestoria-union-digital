import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Edit, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Empadronado } from '@/types/empadronados';
import { getUserProfile, updateUserProfile, listRoles } from '@/services/rtdb';
import { Role, UserProfile } from '@/types/auth';

interface EditarAccesoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  onUpdated: () => void;
}

export function EditarAccesoModal({ 
  open, 
  onOpenChange, 
  empadronado,
  onUpdated 
}: EditarAccesoModalProps) {
  const [loading, setLoading] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [roles, setRoles] = useState<Role[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (open && empadronado?.authUid) {
      loadUserProfile();
      loadRoles();
    }
  }, [open, empadronado]);

  const loadRoles = async () => {
    try {
      const rolesData = await listRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const loadUserProfile = async () => {
    if (!empadronado?.authUid) return;
    
    setLoading(true);
    try {
      const profile = await getUserProfile(empadronado.authUid);
      if (profile) {
        setUserProfile(profile);
        setSelectedRole(profile.roleId);
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      toast({
        title: 'Error',
        description: 'No se pudo cargar el perfil del usuario',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    if (!empadronado?.authUid || !userProfile) return;

    // Validar cambios
    if (selectedRole === userProfile.roleId) {
      toast({
        title: 'Sin cambios',
        description: 'No se realizaron cambios en el rol',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      await updateUserProfile(
        empadronado.authUid,
        { roleId: selectedRole },
        'admin-user' // Actor UID
      );

      toast({
        title: 'Éxito',
        description: 'El rol ha sido actualizado correctamente'
      });

      onUpdated();
      handleClose();
    } catch (error: any) {
      console.error('Error actualizando rol:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al actualizar el rol',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedRole('');
    setUserProfile(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Editar Acceso al Sistema
          </DialogTitle>
          <DialogDescription>
            Modifica el rol de acceso del usuario
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {empadronado && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>{empadronado.nombre} {empadronado.apellidos}</strong>
                <br />
                <span className="text-sm text-muted-foreground">
                  Padrón: {empadronado.numeroPadron} | Email: {empadronado.emailAcceso}
                </span>
              </AlertDescription>
            </Alert>
          )}

          {loading ? (
            <div className="py-8 text-center text-muted-foreground">
              Cargando datos del usuario...
            </div>
          ) : userProfile ? (
            <div className="space-y-4">
              <Alert className="border-blue-200 bg-blue-50">
                <AlertDescription className="text-sm text-blue-900">
                  <p><strong>Email actual:</strong> {userProfile.email}</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Para cambiar el email, contacta al administrador del sistema
                  </p>
                </AlertDescription>
              </Alert>

              <div className="space-y-2">
                <Label htmlFor="role">Rol de Acceso *</Label>
                <Select value={selectedRole} onValueChange={setSelectedRole}>
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Selecciona un rol" />
                  </SelectTrigger>
                  <SelectContent>
                    {roles.map((role) => (
                      <SelectItem key={role.id} value={role.id}>
                        {role.nombre}
                        {role.descripcion && (
                          <span className="text-xs text-muted-foreground ml-2">
                            - {role.descripcion}
                          </span>
                        )}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedRole !== userProfile.roleId && (
                  <p className="text-xs text-muted-foreground">
                    Se cambiará de <strong>{userProfile.roleId}</strong> a <strong>{selectedRole}</strong>
                  </p>
                )}
              </div>
            </div>
          ) : (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No se pudo cargar la información del usuario
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleUpdate}
            disabled={loading || !userProfile || selectedRole === userProfile?.roleId}
          >
            {loading ? 'Actualizando...' : 'Actualizar Rol'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
