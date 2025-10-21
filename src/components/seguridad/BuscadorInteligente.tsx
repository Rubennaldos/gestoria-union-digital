import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { Search, Camera, User, XCircle, AlertCircle } from "lucide-react";
import { getEmpadronados } from "@/services/empadronados";

export const BuscadorInteligente = () => {
  const { toast } = useToast();
  
  const [busqueda, setBusqueda] = useState("");
  const [resultadoBusqueda, setResultadoBusqueda] = useState<any>(null);
  const [buscando, setBuscando] = useState(false);

  const buscarPersona = async () => {
    if (!busqueda.trim()) {
      toast({
        title: "Error",
        description: "Ingrese un DNI para buscar",
        variant: "destructive",
      });
      return;
    }

    setBuscando(true);
    try {
      // Buscar en el padrón
      const empadronados = await getEmpadronados();
      const encontrado = empadronados.find((emp) => emp.dni === busqueda.trim());

      if (encontrado) {
        // DNI registrado en el padrón
        // Verificar si es aportante según el estado habilitado
        const esAportante = encontrado.habilitado;
        
        setResultadoBusqueda({
          encontrado: true,
          datos: {
            nombre: `${encontrado.nombre} ${encontrado.apellidos}`,
            dni: encontrado.dni,
            padron: encontrado.numeroPadron,
            etapa: encontrado.etapa || "Sin etapa",
            esAportante: esAportante,
          }
        });
      } else {
        // DNI NO registrado
        setResultadoBusqueda({
          encontrado: false,
          dni: busqueda.trim()
        });
      }
    } catch (error) {
      console.error("Error en búsqueda:", error);
      toast({
        title: "Error",
        description: "Error al buscar en el padrón",
        variant: "destructive",
      });
    } finally {
      setBuscando(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-6">
      {/* Buscador de Personas por DNI - Mobile Optimized */}
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300">
        <CardHeader className="p-3 md:p-6 bg-gradient-to-r from-primary/5 to-primary/10">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <div className="p-1.5 md:p-2 rounded-lg bg-primary/10">
              <Search className="h-3.5 w-3.5 md:h-5 md:w-5 text-primary" />
            </div>
            Búsqueda por DNI
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Busque por número de DNI en el padrón
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
          <div className="flex gap-2">
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Ingrese DNI"
              className="flex-1 text-sm md:text-base h-9 md:h-10"
              maxLength={8}
              onKeyDown={(e) => {
                if (e.key === 'Enter') buscarPersona();
              }}
            />
            <Button 
              onClick={buscarPersona} 
              size="sm" 
              className="h-9 md:h-10 px-3 md:px-4"
              disabled={buscando}
            >
              <Search className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>

          {resultadoBusqueda && (
            <div className="space-y-3 animate-fade-in">
              {resultadoBusqueda.encontrado ? (
                <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-gradient-to-br from-background to-muted/20">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-full bg-green-500/10">
                      <User className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                    </div>
                    <h4 className="font-medium text-sm md:text-base">{resultadoBusqueda.datos.nombre}</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs md:text-sm">
                    <div>
                      <span className="font-medium">DNI:</span>
                      <p className="text-muted-foreground">{resultadoBusqueda.datos.dni}</p>
                    </div>
                    <div>
                      <span className="font-medium">Padrón:</span>
                      <p className="text-muted-foreground">{resultadoBusqueda.datos.padron}</p>
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">Etapa:</span>
                      <p className="text-muted-foreground">{resultadoBusqueda.datos.etapa}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 md:gap-2">
                    {resultadoBusqueda.datos.esAportante ? (
                      <Badge className="text-[10px] md:text-xs bg-green-100 text-green-800">
                        RESIDENTE
                      </Badge>
                    ) : (
                      <Badge className="text-[10px] md:text-xs bg-orange-100 text-orange-800">
                        RESIDENTE NO APORTANTE
                      </Badge>
                    )}
                  </div>
                </div>
              ) : (
                <div className="border rounded-lg p-3 md:p-4 space-y-3 bg-red-50/50">
                  <div className="flex items-center gap-2 text-red-600">
                    <XCircle className="h-4 w-4 md:h-5 md:w-5" />
                    <h4 className="font-medium text-sm md:text-base">DNI No Registrado</h4>
                  </div>
                  <p className="text-xs md:text-sm text-red-600 font-medium">
                    Persona Desconocida
                  </p>
                  <p className="text-xs md:text-sm text-muted-foreground">
                    El DNI <strong>{resultadoBusqueda.dni}</strong> no se encuentra registrado en el padrón.
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reconocimiento de Placas - Próximamente */}
      <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 opacity-60">
        <CardHeader className="p-3 md:p-6 bg-gradient-to-r from-blue-500/5 to-blue-500/10">
          <CardTitle className="flex items-center gap-2 text-sm md:text-base">
            <div className="p-1.5 md:p-2 rounded-lg bg-blue-500/10">
              <Camera className="h-3.5 w-3.5 md:h-5 md:w-5 text-blue-600" />
            </div>
            Reconocimiento de Placas
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            Búsqueda por placa vehicular
          </CardDescription>
        </CardHeader>
        <CardContent className="p-3 md:p-6 space-y-3 md:space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="ABC-123"
              className="flex-1 text-sm md:text-base h-9 md:h-10"
              disabled
            />
            <Button size="sm" className="h-9 md:h-10 px-3 md:px-4" disabled>
              <Camera className="h-3.5 w-3.5 md:h-4 md:w-4" />
            </Button>
          </div>

          <div className="border-2 border-dashed border-muted rounded-lg p-6 md:p-8 text-center bg-gradient-to-br from-background to-muted/20">
            <AlertCircle className="h-10 w-10 md:h-12 md:w-12 text-muted-foreground mx-auto mb-3 md:mb-4" />
            <p className="text-sm md:text-base font-medium text-muted-foreground mb-2">
              Próximamente
            </p>
            <p className="text-xs md:text-sm text-muted-foreground">
              La función de reconocimiento de placas estará disponible pronto
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
