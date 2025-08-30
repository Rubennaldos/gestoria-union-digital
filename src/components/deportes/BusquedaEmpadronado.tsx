import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, User, Check } from "lucide-react";
import { searchEmpadronados } from "@/services/empadronados";

interface EmpadronadoData {
  id: string;
  nombre: string;
  apellidos: string;
  dni: string;
  telefono?: string;
  aporta?: boolean;
}

interface BusquedaEmpadronadoProps {
  onSeleccionar: (empadronado: EmpadronadoData) => void;
  className?: string;
}

export const BusquedaEmpadronado = ({ onSeleccionar, className }: BusquedaEmpadronadoProps) => {
  const [busqueda, setBusqueda] = useState("");
  const [resultados, setResultados] = useState<EmpadronadoData[]>([]);
  const [loading, setLoading] = useState(false);
  const [mostrarResultados, setMostrarResultados] = useState(false);
  const [seleccionado, setSeleccionado] = useState<EmpadronadoData | null>(null);

  useEffect(() => {
    const buscarEmpadronados = async () => {
      if (busqueda.length < 3) {
        setResultados([]);
        setMostrarResultados(false);
        return;
      }

      setLoading(true);
      try {
        const empadronados = await searchEmpadronados(busqueda);
        const filtrados = empadronados.slice(0, 5).map(emp => ({
          id: emp.id,
          nombre: emp.nombre,
          apellidos: emp.apellidos,
          dni: emp.dni,
          telefono: emp.telefonos?.[0]?.numero,
          aporta: true // Todos los empadronados son aportantes por defecto
        }));

        setResultados(filtrados);
        setMostrarResultados(true);
      } catch (error) {
        console.error('Error al buscar empadronados:', error);
        setResultados([]);
      } finally {
        setLoading(false);
      }
    };

    const timeoutId = setTimeout(buscarEmpadronados, 300);
    return () => clearTimeout(timeoutId);
  }, [busqueda]);

  const handleSeleccionar = (empadronado: EmpadronadoData) => {
    setSeleccionado(empadronado);
    setBusqueda(`${empadronado.nombre} ${empadronado.apellidos}`);
    setMostrarResultados(false);
    onSeleccionar(empadronado);
  };

  const limpiarSeleccion = () => {
    setSeleccionado(null);
    setBusqueda("");
    setResultados([]);
    setMostrarResultados(false);
  };

  return (
    <div className={className}>
      <Label htmlFor="busquedaEmpadronado">Buscar Empadronado</Label>
      <div className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="busquedaEmpadronado"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre, DNI o teléfono..."
            className="pl-10"
          />
        </div>

        {/* Resultados de búsqueda */}
        {mostrarResultados && (
          <div className="absolute z-50 w-full mt-1 bg-background border rounded-md shadow-lg max-h-60 overflow-y-auto">
            {loading && (
              <div className="p-3 text-center text-muted-foreground">
                Buscando...
              </div>
            )}
            
            {!loading && resultados.length === 0 && busqueda.length >= 3 && (
              <div className="p-3 text-center text-muted-foreground">
                No se encontraron empadronados
              </div>
            )}
            
            {!loading && resultados.map(empadronado => (
              <div
                key={empadronado.id}
                className="p-3 hover:bg-accent cursor-pointer border-b last:border-b-0"
                onClick={() => handleSeleccionar(empadronado)}
              >
                <div className="flex items-center justify-between">
                  <div>
                     <p className="font-medium">{empadronado.nombre} {empadronado.apellidos}</p>
                     <p className="text-sm text-muted-foreground">
                       DNI: {empadronado.dni}
                       {empadronado.telefono && ` • Tel: ${empadronado.telefono}`}
                     </p>
                   </div>
                  <div className="flex items-center gap-2">
                    {empadronado.aporta && (
                      <Badge variant="secondary">Aportante</Badge>
                    )}
                    <User className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empadronado seleccionado */}
        {seleccionado && !mostrarResultados && (
          <Card className="mt-2 border-green-200 bg-green-50">
            <CardContent className="p-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-600" />
                  <div>
                    <p className="font-medium text-green-800">{seleccionado.nombre} {seleccionado.apellidos}</p>
                    <p className="text-sm text-green-600">
                      DNI: {seleccionado.dni}
                      {seleccionado.telefono && ` • Tel: ${seleccionado.telefono}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {seleccionado.aporta && (
                    <Badge variant="secondary">Aportante</Badge>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={limpiarSeleccion}
                  >
                    Cambiar
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};