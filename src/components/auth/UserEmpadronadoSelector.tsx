import React, { useState, useEffect } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { getEmpadronados } from '@/services/empadronados';
import { Empadronado } from '@/types/empadronados';

interface UserEmpadronadoSelectorProps {
  value?: string;
  onChange: (empadronadoId: string, empadronado: Empadronado) => void;
  onClear?: () => void;
  placeholder?: string;
}

export const UserEmpadronadoSelector: React.FC<UserEmpadronadoSelectorProps> = ({
  value,
  onChange,
  onClear,
  placeholder = "Buscar empadronado..."
}) => {
  const [search, setSearch] = useState('');
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [filteredEmpadronados, setFilteredEmpadronados] = useState<Empadronado[]>([]);
  const [selectedEmpadronado, setSelectedEmpadronado] = useState<Empadronado | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadEmpadronados();
  }, []);

  useEffect(() => {
    if (value && empadronados.length > 0) {
      const empadronado = empadronados.find(e => e.id === value);
      setSelectedEmpadronado(empadronado || null);
    }
  }, [value, empadronados]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredEmpadronados([]);
      return;
    }

    const filtered = empadronados.filter(emp => 
      emp.nombre.toLowerCase().includes(search.toLowerCase()) ||
      emp.apellidos.toLowerCase().includes(search.toLowerCase()) ||
      emp.dni.includes(search) ||
      emp.numeroPadron.includes(search)
    );
    
    setFilteredEmpadronados(filtered.slice(0, 10)); // Mostrar máximo 10 resultados
  }, [search, empadronados]);

  const loadEmpadronados = async () => {
    setLoading(true);
    try {
      const data = await getEmpadronados();
      setEmpadronados(data.filter(e => e.habilitado)); // Solo empadronados habilitados
    } catch (error) {
      console.error('Error loading empadronados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = (empadronado: Empadronado) => {
    setSelectedEmpadronado(empadronado);
    onChange(empadronado.id, empadronado);
    setSearch('');
    setIsOpen(false);
  };

  const handleClear = () => {
    setSelectedEmpadronado(null);
    setSearch('');
    onClear?.();
  };

  const getInitials = (nombre: string, apellidos: string) => {
    return `${nombre.charAt(0)}${apellidos.charAt(0)}`.toUpperCase();
  };

  return (
    <div className="space-y-2">
      {selectedEmpadronado ? (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>
                    {getInitials(selectedEmpadronado.nombre, selectedEmpadronado.apellidos)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-medium">
                    {selectedEmpadronado.nombre} {selectedEmpadronado.apellidos}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    DNI: {selectedEmpadronado.dni} • Padrón: {selectedEmpadronado.numeroPadron}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="secondary" className="text-xs">
                      {selectedEmpadronado.familia}
                    </Badge>
                    {selectedEmpadronado.manzana && (
                      <Badge variant="outline" className="text-xs">
                        Manzana {selectedEmpadronado.manzana}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={handleClear}>
                Cambiar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="relative">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-10"
              placeholder={placeholder}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setIsOpen(true);
              }}
              onFocus={() => setIsOpen(true)}
            />
          </div>
          
          {isOpen && search.trim() && (
            <Card className="absolute top-full mt-1 w-full z-50 shadow-lg">
              <ScrollArea className="max-h-64">
                <div className="p-2">
                  {loading ? (
                    <div className="p-4 text-center text-muted-foreground">
                      Cargando...
                    </div>
                  ) : filteredEmpadronados.length > 0 ? (
                    <div className="space-y-1">
                      {filteredEmpadronados.map((empadronado) => (
                        <Button
                          key={empadronado.id}
                          variant="ghost"
                          className="w-full justify-start h-auto p-3"
                          onClick={() => handleSelect(empadronado)}
                        >
                          <div className="flex items-center gap-3 text-left">
                            <Avatar className="w-8 h-8">
                              <AvatarFallback className="text-xs">
                                {getInitials(empadronado.nombre, empadronado.apellidos)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="font-medium text-sm">
                                {empadronado.nombre} {empadronado.apellidos}
                              </div>
                              <div className="text-xs text-muted-foreground">
                                DNI: {empadronado.dni} • Padrón: {empadronado.numeroPadron}
                              </div>
                              <div className="flex items-center gap-1 mt-1">
                                <Badge variant="secondary" className="text-xs">
                                  {empadronado.familia}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </Button>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 text-center text-muted-foreground">
                      No se encontraron empadronados
                    </div>
                  )}
                </div>
              </ScrollArea>
            </Card>
          )}
        </div>
      )}
    </div>
  );
};