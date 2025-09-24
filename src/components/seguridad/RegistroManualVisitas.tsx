import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Minus, Star, Users, Car, MapPin, Save } from "lucide-react";
import { getEmpadronado } from "@/services/empadronados";
import { useFirebaseWrite } from "@/hooks/useFirebase";
import { Visitante, RegistroVisita } from "@/types/acceso";
import { BuscadorFavoritos } from "@/components/acceso/BuscadorFavoritos";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";

export const RegistroManualVisitas = () => {
  const { toast } = useToast();
  const { pushData } = useFirebaseWrite();
  
  const [tipoAcceso, setTipoAcceso] = useState<'vehicular' | 'peatonal'>('peatonal');
  const [placa, setPlaca] = useState("");
  const [visitantes, setVisitantes] = useState<Visitante[]>([{ id: '1', nombre: '', dni: '' }]);
  const [menores, setMenores] = useState(0);
  const [direccion, setDireccion] = useState("");
  const [empadronadoId, setEmpadronadoId] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const agregarVisitante = () => {
    const nuevoId = (visitantes.length + 1).toString();
    setVisitantes([...visitantes, { id: nuevoId, nombre: '', dni: '' }]);
  };

  const eliminarVisitante = (id: string) => {
    if (visitantes.length > 1) {
      setVisitantes(visitantes.filter(v => v.id !== id));
    }
  };

  const actualizarVisitante = (id: string, campo: keyof Visitante, valor: string | boolean) => {
    setVisitantes(visitantes.map(v => 
      v.id === id ? { ...v, [campo]: valor } : v
    ));
  };

  const guardarFavorito = async () => {
    try {
      const favorito = {
        empadronadoId,
        tipo: 'visitante' as const,
        nombre: visitantes[0]?.nombre || 'Sin nombre',
        datos: {
          tipoAcceso,
          placa: tipoAcceso === 'vehicular' ? placa : undefined,
          visitantes,
          menores,
          direccion
        },
        fechaCreacion: Date.now()
      };

      await pushData(`usuarios/${empadronadoId}/favoritos`, favorito);
      
      toast({
        title: "Favorito Guardado",
        description: "La visita ha sido guardada en favoritos",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo guardar en favoritos",
        variant: "destructive",
      });
    }
  };

  const registrarVisita = async () => {
    // Validaciones
    if (!empadronadoId.trim()) {
      toast({
        title: "Error",
        description: "Seleccione un empadronado",
        variant: "destructive",
      });
      return;
    }

    if (!direccion.trim()) {
      toast({
        title: "Error",
        description: "Ingrese la dirección de destino",
        variant: "destructive",
      });
      return;
    }

    if (visitantes.some(v => !v.nombre.trim() || !v.dni.trim())) {
      toast({
        title: "Error",
        description: "Complete todos los datos de los visitantes",
        variant: "destructive",
      });
      return;
    }

    if (tipoAcceso === 'vehicular' && !placa.trim()) {
      toast({
        title: "Error",
        description: "Ingrese la placa del vehículo",
        variant: "destructive",
      });
      return;
    }

    // Mostrar confirmación antes de registrar
    setMostrarConfirmacion(true);
  };

  const confirmarRegistro = async () => {
    try {
      // Obtener información del empadronado
      const empadronado = await getEmpadronado(empadronadoId);
      
      const registro: Omit<RegistroVisita, 'id'> = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === 'vehicular' ? placa : undefined,
        visitantes,
        menores,
        fechaCreacion: Date.now(),
        estado: 'pendiente', // Será autorizado por seguridad
        vecinoSolicitante: empadronado ? {
          nombre: `${empadronado.nombre} ${empadronado.apellidos}`,
          numeroPadron: empadronado.numeroPadron
        } : {
          nombre: 'Vecino no identificado',
          numeroPadron: empadronadoId
        }
      };

      await pushData('acceso/visitas', registro);

      // También registrar en seguridad para seguimiento
      await pushData('seguridad/registros_manuales', {
        ...registro,
        tipo: 'visita',
        direccion,
        registradoPor: 'seguridad',
        fechaRegistro: Date.now()
      });

      toast({
        title: "Visita Registrada",
        description: "La visita ha sido registrada y enviada para autorización",
      });

      // Limpiar formulario
      setTipoAcceso('peatonal');
      setPlaca("");
      setVisitantes([{ id: '1', nombre: '', dni: '' }]);
      setMenores(0);
      setDireccion("");
      setEmpadronadoId("");
      setMostrarConfirmacion(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la visita",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Registro Manual de Visitas
          </CardTitle>
          <CardDescription>
            Registre manualmente las visitas que requieren autorización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Buscador de Favoritos */}
          <BuscadorFavoritos 
            tipo="visitante"
            onSeleccionar={(favorito) => {
              setTipoAcceso(favorito.datos.tipoAcceso);
              setPlaca(favorito.datos.placa || "");
              setVisitantes(favorito.datos.visitantes);
              setMenores(favorito.datos.menores);
              setDireccion(favorito.datos.direccion || "");
              setEmpadronadoId(favorito.empadronadoId);
            }}
          />

          {/* Tipo de Acceso */}
          <div className="space-y-3">
            <Label className="text-base font-medium">Tipo de Acceso</Label>
            <RadioGroup 
              value={tipoAcceso} 
              onValueChange={(value: 'vehicular' | 'peatonal') => setTipoAcceso(value)}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="peatonal" id="peatonal" />
                <Label htmlFor="peatonal" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Peatonal
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="vehicular" id="vehicular" />
                <Label htmlFor="vehicular" className="flex items-center gap-2">
                  <Car className="h-4 w-4" />
                  Vehicular
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Placa (solo si es vehicular) */}
          {tipoAcceso === 'vehicular' && (
            <div className="space-y-2">
              <Label>Placa del Vehículo</Label>
              <Input
                value={placa}
                onChange={(e) => setPlaca(e.target.value.toUpperCase())}
                placeholder="ABC-123"
                className="max-w-xs"
              />
            </div>
          )}

          {/* Datos de Visitantes */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="text-base font-medium">Datos de Visitantes</Label>
              <Button 
                onClick={agregarVisitante}
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Agregar Visitante
              </Button>
            </div>

            {visitantes.map((visitante, index) => (
              <div key={visitante.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Visitante {index + 1}</h4>
                  {visitantes.length > 1 && (
                    <Button
                      onClick={() => eliminarVisitante(visitante.id)}
                      variant="outline"
                      size="sm"
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nombre Completo</Label>
                    <Input
                      value={visitante.nombre}
                      onChange={(e) => actualizarVisitante(visitante.id, 'nombre', e.target.value)}
                      placeholder="Nombre del visitante"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>DNI / Documento</Label>
                    <Input
                      value={visitante.dni}
                      onChange={(e) => actualizarVisitante(visitante.id, 'dni', e.target.value)}
                      placeholder="12345678"
                    />
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={visitante.esMenor}
                    onCheckedChange={(checked) => actualizarVisitante(visitante.id, 'esMenor', checked as boolean)}
                  />
                  <Label>Es menor de edad</Label>
                </div>
              </div>
            ))}
          </div>

          {/* Cantidad de Menores */}
          <div className="space-y-2">
            <Label>Cantidad de Menores (sin datos personales)</Label>
            <div className="flex items-center gap-3 max-w-xs">
              <Button
                onClick={() => setMenores(Math.max(0, menores - 1))}
                variant="outline"
                size="sm"
              >
                <Minus className="h-4 w-4" />
              </Button>
              <span className="text-center font-medium min-w-[2rem]">{menores}</span>
              <Button
                onClick={() => setMenores(menores + 1)}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Dirección de Destino */}
          <div className="space-y-2">
            <Label>Dirección de Destino</Label>
            <div className="flex gap-2">
              <MapPin className="h-4 w-4 mt-3 text-muted-foreground" />
              <Input
                value={direccion}
                onChange={(e) => setDireccion(e.target.value)}
                placeholder="Mz. A Lt. 15, Calle Los Rosales"
                className="flex-1"
              />
            </div>
          </div>

          {/* ID del Empadronado */}
          <div className="space-y-2">
            <Label>ID del Empadronado que Autoriza</Label>
            <Input
              value={empadronadoId}
              onChange={(e) => setEmpadronadoId(e.target.value)}
              placeholder="ID del empadronado"
            />
          </div>

          {/* Botones de Acción */}
          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={guardarFavorito}
              variant="outline"
              className="flex items-center gap-2"
              disabled={!empadronadoId || visitantes.some(v => !v.nombre.trim())}
            >
              <Star className="h-4 w-4" />
              Guardar Favorito
            </Button>
            <Button 
              onClick={registrarVisita}
              className="flex-1 flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Registrar Visita
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmación */}
      <ConfirmacionDialog
        open={mostrarConfirmacion}
        onOpenChange={setMostrarConfirmacion}
        titulo="Confirmar Registro de Visita"
        mensaje="¿Confirma con el propietario que puede ingresar estas personas?"
        onConfirmar={confirmarRegistro}
      />
    </div>
  );
};