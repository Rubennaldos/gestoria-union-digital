import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Mail, Search, Users, Edit } from 'lucide-react';
import { Empadronado } from '@/types/empadronados';
import { getEmpadronados } from '@/services/empadronados';
import { useToast } from '@/hooks/use-toast';
import { EditarAccesoModal } from './EditarAccesoModal';

interface CorreosAccesoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CorreosAccesoModal({ open, onOpenChange }: CorreosAccesoModalProps) {
  const [empadronadosConAcceso, setEmpadronadosConAcceso] = useState<Empadronado[]>([]);
  const [filteredEmpadronados, setFilteredEmpadronados] = useState<Empadronado[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [editingEmpadronado, setEditingEmpadronado] = useState<Empadronado | null>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      loadEmpadronadosConAcceso();
    }
  }, [open]);

  useEffect(() => {
    if (searchTerm.trim() === '') {
      setFilteredEmpadronados(empadronadosConAcceso);
    } else {
      const term = searchTerm.toLowerCase();
      const filtered = empadronadosConAcceso.filter(emp => 
        emp.nombre.toLowerCase().includes(term) ||
        emp.apellidos.toLowerCase().includes(term) ||
        emp.numeroPadron.toLowerCase().includes(term) ||
        emp.emailAcceso?.toLowerCase().includes(term)
      );
      setFilteredEmpadronados(filtered);
    }
  }, [searchTerm, empadronadosConAcceso]);

  const loadEmpadronadosConAcceso = async () => {
    setLoading(true);
    try {
      const allEmpadronados = await getEmpadronados();
      // Filtrar solo los que tienen authUid y emailAcceso
      const conAcceso = allEmpadronados.filter(emp => emp.authUid && emp.emailAcceso);
      // Ordenar por apellidos
      conAcceso.sort((a, b) => a.apellidos.localeCompare(b.apellidos));
      setEmpadronadosConAcceso(conAcceso);
      setFilteredEmpadronados(conAcceso);
    } catch (error) {
      console.error('Error loading empadronados con acceso:', error);
      toast({
        title: 'Error',
        description: 'No se pudieron cargar los correos con acceso',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEditAcceso = (emp: Empadronado) => {
    setEditingEmpadronado(emp);
    setEditModalOpen(true);
  };

  const handleAccesoUpdated = () => {
    loadEmpadronadosConAcceso();
  };

  return (
    <>
      <EditarAccesoModal
        open={editModalOpen}
        onOpenChange={setEditModalOpen}
        empadronado={editingEmpadronado}
        onUpdated={handleAccesoUpdated}
      />
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Correos con Acceso al Sistema
          </DialogTitle>
          <DialogDescription>
            Lista de todos los empadronados que tienen una cuenta de usuario activa
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Búsqueda y contador */}
          <div className="flex items-center justify-between gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nombre, padrón o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Badge variant="secondary" className="flex items-center gap-2">
              <Users className="h-3 w-3" />
              {filteredEmpadronados.length} cuentas
            </Badge>
          </div>

          {/* Tabla */}
          <ScrollArea className="h-[400px] rounded-md border">
            {loading ? (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">Cargando...</p>
              </div>
            ) : filteredEmpadronados.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full p-8 text-center">
                <Mail className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  {searchTerm ? 'No se encontraron resultados' : 'No hay empadronados con cuentas activas'}
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Padrón</TableHead>
                    <TableHead>Nombre Completo</TableHead>
                    <TableHead>Email de Acceso</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmpadronados.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.numeroPadron}</TableCell>
                      <TableCell>
                        <div>
                          <p className="font-medium">{emp.nombre} {emp.apellidos}</p>
                          {emp.familia && (
                            <p className="text-xs text-muted-foreground">Familia {emp.familia}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Mail className="h-3 w-3 text-muted-foreground" />
                          <span className="font-mono text-sm">{emp.emailAcceso}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={emp.habilitado ? 'default' : 'secondary'}>
                          {emp.habilitado ? 'Habilitado' : 'Deshabilitado'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditAcceso(emp)}
                          className="h-8 w-8 p-0"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </ScrollArea>

          {/* Footer info */}
          {!loading && filteredEmpadronados.length > 0 && (
            <p className="text-xs text-muted-foreground text-center">
              Mostrando {filteredEmpadronados.length} de {empadronadosConAcceso.length} cuentas activas
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
    </>
  );
}
