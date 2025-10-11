import { Plus, Trash2, Calendar, Clock, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { SesionEvento } from "@/types/eventos";

interface SesionesEventoFormProps {
  sesiones: Omit<SesionEvento, 'id'>[];
  onChange: (sesiones: Omit<SesionEvento, 'id'>[]) => void;
}

export const SesionesEventoForm = ({ sesiones, onChange }: SesionesEventoFormProps) => {
  const agregarSesion = () => {
    onChange([
      ...sesiones,
      {
        lugar: "",
        fecha: Date.now(),
        horaInicio: "",
        horaFin: "",
      },
    ]);
  };

  const eliminarSesion = (index: number) => {
    onChange(sesiones.filter((_, i) => i !== index));
  };

  const actualizarSesion = (index: number, campo: keyof Omit<SesionEvento, 'id'>, valor: any) => {
    const nuevasSesiones = [...sesiones];
    nuevasSesiones[index] = { ...nuevasSesiones[index], [campo]: valor };
    onChange(nuevasSesiones);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Sesiones del Evento</Label>
        <Button type="button" variant="outline" size="sm" onClick={agregarSesion}>
          <Plus className="h-4 w-4 mr-2" />
          Agregar Sesión
        </Button>
      </div>

      {sesiones.length === 0 && (
        <p className="text-sm text-muted-foreground text-center py-4">
          No hay sesiones agregadas. Haz clic en "Agregar Sesión" para comenzar.
        </p>
      )}

      {sesiones.map((sesion, index) => (
        <Card key={index}>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Sesión {index + 1}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => eliminarSesion(index)}
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2 md:col-span-2">
                  <Label>
                    <MapPin className="h-4 w-4 inline mr-2" />
                    Lugar
                  </Label>
                  <Input
                    value={sesion.lugar}
                    onChange={(e) => actualizarSesion(index, 'lugar', e.target.value)}
                    placeholder="Ej: Losa Deportiva de la Quinta Llana"
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    <Calendar className="h-4 w-4 inline mr-2" />
                    Fecha
                  </Label>
                  <Input
                    type="date"
                    value={
                      sesion.fecha
                        ? new Date(sesion.fecha).toISOString().split('T')[0]
                        : ""
                    }
                    onChange={(e) =>
                      actualizarSesion(index, 'fecha', new Date(e.target.value).getTime())
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>
                    <Clock className="h-4 w-4 inline mr-2" />
                    Hora Inicio
                  </Label>
                  <Input
                    type="time"
                    value={sesion.horaInicio}
                    onChange={(e) => actualizarSesion(index, 'horaInicio', e.target.value)}
                  />
                </div>

                <div className="space-y-2 md:col-start-2">
                  <Label>
                    <Clock className="h-4 w-4 inline mr-2" />
                    Hora Fin
                  </Label>
                  <Input
                    type="time"
                    value={sesion.horaFin}
                    onChange={(e) => actualizarSesion(index, 'horaFin', e.target.value)}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
