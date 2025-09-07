import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Search, Star } from "lucide-react";
import { obtenerFavoritosPorUsuario } from "@/services/acceso";
import { FavoritoUsuario } from "@/types/acceso";

interface BuscadorFavoritosProps {
  tipo: 'visitante' | 'trabajador' | 'proveedor';
  onSeleccionar: (favorito: FavoritoUsuario) => void;
}

export function BuscadorFavoritos({ tipo, onSeleccionar }: BuscadorFavoritosProps) {
  const [busqueda, setBusqueda] = useState('');
  const [favoritos, setFavoritos] = useState<FavoritoUsuario[]>([]);
  const [mostrarResultados, setMostrarResultados] = useState(false);

  useEffect(() => {
    cargarFavoritos();
  }, [tipo]);

  const cargarFavoritos = async () => {
    try {
      const empadronadoId = "user123"; // ID del usuario actual
      const favoritosData = await obtenerFavoritosPorUsuario(empadronadoId, tipo);
      setFavoritos(favoritosData);
    } catch (error) {
      console.error('Error al cargar favoritos:', error);
    }
  };

  const favoritosFiltrados = favoritos.filter(favorito =>
    favorito.nombre.toLowerCase().includes(busqueda.toLowerCase())
  );

  const handleSeleccionar = (favorito: FavoritoUsuario) => {
    onSeleccionar(favorito);
    setBusqueda('');
    setMostrarResultados(false);
  };

  return (
    <div className="space-y-2 relative">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={busqueda}
            onChange={(e) => {
              setBusqueda(e.target.value);
              setMostrarResultados(e.target.value.length > 0);
            }}
            placeholder={`Buscar ${tipo}s favoritos...`}
            className="pl-10"
            onFocus={() => setMostrarResultados(busqueda.length > 0)}
          />
        </div>
        <Star className="h-5 w-5 text-yellow-500" />
      </div>

      {mostrarResultados && favoritosFiltrados.length > 0 && (
        <Card className="absolute z-10 w-full p-2 max-h-40 overflow-y-auto bg-background border shadow-lg">
          <div className="space-y-1">
            {favoritosFiltrados.map((favorito) => (
              <Button
                key={favorito.id}
                variant="ghost"
                className="w-full justify-start h-auto p-2 text-left"
                onClick={() => handleSeleccionar(favorito)}
              >
                <div>
                  <p className="font-medium">{favorito.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(favorito.fechaCreacion).toLocaleDateString()}
                  </p>
                </div>
              </Button>
            ))}
          </div>
        </Card>
      )}

      {mostrarResultados && busqueda.length > 0 && favoritosFiltrados.length === 0 && (
        <Card className="absolute z-10 w-full p-4 bg-background border shadow-lg">
          <p className="text-sm text-muted-foreground text-center">
            No se encontraron favoritos
          </p>
        </Card>
      )}
    </div>
  );
}