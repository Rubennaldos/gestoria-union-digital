import { useState } from 'react';
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
import { useToast } from '@/hooks/use-toast';
import { Link2, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { findUserByIdentifier, designarUsuarioAEmpadronado } from '@/services/rtdb';
import { Empadronado } from '@/types/empadronados';

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
  const { toast } = useToast();

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
    try {
      const user = await findUserByIdentifier(identifier.trim());
      if (user) {
        setSearchResult(user);
        toast({
          title: 'Usuario encontrado',
          description: `Se encontró la cuenta: ${user.email}`
        });
      } else {
        setSearchResult(null);
        toast({
          title: 'No encontrado',
          description: 'No se encontró ninguna cuenta con ese email o username',
          variant: 'destructive'
        });
      }
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
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
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

          {searchResult && (
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
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={loading}>
            Cancelar
          </Button>
          <Button 
            onClick={handleLink}
            disabled={loading || !searchResult}
          >
            {loading ? 'Vinculando...' : 'Vincular Cuenta'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
