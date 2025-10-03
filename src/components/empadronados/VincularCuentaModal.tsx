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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Link, AlertCircle, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { findUserByIdentifier, designarUsuarioAEmpadronado, createUserProfile, listRoles } from '@/services/rtdb';
import { Empadronado } from '@/types/empadronados';
import { Role } from '@/types/auth';
import { auth } from '@/config/firebase';
import { fetchSignInMethodsForEmail } from 'firebase/auth';

interface VincularCuentaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  empadronado: Empadronado | null;
  onLinked: () => void;
}

export function VincularCuentaModal({ 
  open, 
  onOpenChange, 
  empadronado,
  onLinked 
}: VincularCuentaModalProps) {
  const [identifier, setIdentifier] = useState('');
  const [loading, setLoading] = useState(false);
  const [searchResult, setSearchResult] = useState<any>(null);
  const [authOnlyAccount, setAuthOnlyAccount] = useState(false);
  const [selectedRole, setSelectedRole] = useState('asociado');
  const [roles, setRoles] = useState<Role[]>([]);
  const { toast } = useToast();

  // Cargar roles cuando se abre el modal
  useEffect(() => {
    if (open) {
      loadRoles();
    }
  }, [open]);

  const loadRoles = async () => {
    try {
      const rolesData = await listRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

  const handleSearch = async () => {
    if (!identifier.trim()) {
      toast({
        title: 'Error',
        description: 'Ingresa un email o username para buscar',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    setAuthOnlyAccount(false);
    try {
      // Primero buscar en RTDB
      const user = await findUserByIdentifier(identifier.trim());
      if (user) {
        setSearchResult(user);
        toast({
          title: 'Usuario encontrado',
          description: `Se encontró la cuenta: ${user.email}`
        });
        return;
      }

      // Si no está en RTDB pero el identifier es un email, buscar en Firebase Auth
      if (identifier.trim().includes('@')) {
        try {
          const methods = await fetchSignInMethodsForEmail(auth, identifier.trim());
          if (methods && methods.length > 0) {
            // La cuenta existe en Auth pero no en RTDB
            setSearchResult({ 
              email: identifier.trim(),
              isAuthOnly: true 
            });
            setAuthOnlyAccount(true);
            toast({
              title: 'Cuenta encontrada en Firebase Auth',
              description: 'Esta cuenta existe pero no tiene perfil. Puedes importarla.',
            });
            return;
          }
        } catch (authError) {
          console.error('Error checking Firebase Auth:', authError);
        }
      }

      // No se encontró en ningún lado
      setSearchResult(null);
      toast({
        title: 'No encontrado',
        description: 'No se encontró ninguna cuenta con ese email o username',
        variant: 'destructive'
      });
    } catch (error: any) {
      console.error('Error buscando usuario:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al buscar el usuario',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLink = async () => {
    if (!empadronado || !searchResult) return;

    setLoading(true);
    try {
      // Si es una cuenta solo de Auth, primero crear el perfil en RTDB
      if (authOnlyAccount) {
        // Necesitamos obtener el UID de Firebase Auth
        const methods = await fetchSignInMethodsForEmail(auth, searchResult.email);
        if (!methods || methods.length === 0) {
          throw new Error('La cuenta ya no existe en Firebase Auth');
        }

        // Importar usuario desde Auth - necesitamos crear el perfil con un UID temporal
        // En realidad no podemos obtener el UID sin que el usuario haga login
        toast({
          title: 'Advertencia',
          description: 'No se puede vincular una cuenta de Auth sin perfil. Pide al usuario que haga login primero.',
          variant: 'destructive'
        });
        return;
      }

      // Vincular usuario existente en RTDB
      await designarUsuarioAEmpadronado(
        empadronado.id,
        identifier.trim(),
        'admin-user' // Actor UID
      );

      toast({
        title: 'Éxito',
        description: 'La cuenta ha sido vinculada correctamente al empadronado'
      });

      onLinked();
      handleClose();
    } catch (error: any) {
      console.error('Error vinculando cuenta:', error);
      toast({
        title: 'Error',
        description: error.message || 'Error al vincular la cuenta',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setIdentifier('');
    setSearchResult(null);
    setAuthOnlyAccount(false);
    setSelectedRole('asociado');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Vincular Cuenta Existente
          </DialogTitle>
          <DialogDescription>
            Busca y vincula una cuenta existente a este empadronado
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {empadronado && (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Vinculando a: <strong>{empadronado.nombre} {empadronado.apellidos}</strong> (Padrón: {empadronado.numeroPadron})
              </AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="identifier">Email o Username</Label>
            <div className="flex gap-2">
              <Input
                id="identifier"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="email@ejemplo.com o username"
                disabled={loading}
              />
              <Button 
                onClick={handleSearch}
                disabled={loading || !identifier.trim()}
              >
                {loading ? 'Buscando...' : 'Buscar'}
              </Button>
            </div>
          </div>

          {searchResult && !authOnlyAccount && (
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="space-y-2">
                <p className="font-medium text-green-900">Usuario encontrado:</p>
                <div className="text-sm text-green-800">
                  <p><strong>Email:</strong> {searchResult.email}</p>
                  <p><strong>Nombre:</strong> {searchResult.displayName}</p>
                  {searchResult.username && (
                    <p><strong>Username:</strong> {searchResult.username}</p>
                  )}
                  <p><strong>Rol:</strong> {searchResult.roleId}</p>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {searchResult && authOnlyAccount && (
            <Alert className="border-orange-200 bg-orange-50">
              <AlertTriangle className="h-4 w-4 text-orange-600" />
              <AlertDescription className="space-y-3">
                <div>
                  <p className="font-medium text-orange-900">Cuenta en Firebase Auth sin perfil</p>
                  <div className="text-sm text-orange-800 mt-2">
                    <p><strong>Email:</strong> {searchResult.email}</p>
                    <p className="mt-2 text-xs">
                      Esta cuenta existe en Firebase Auth pero no tiene un perfil en el sistema. 
                      Para vincularla, el usuario debe hacer login primero, o debes crear una nueva cuenta.
                    </p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLink}
            disabled={loading || !searchResult || authOnlyAccount}
          >
            {loading ? 'Vinculando...' : 'Vincular Cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
