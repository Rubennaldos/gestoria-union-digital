import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Shield, Car, MapPin, Save, Users } from "lucide-react";
import { useFirebaseWrite } from "@/hooks/useFirebase";
import { RegistroProveedor } from "@/types/acceso";
import { ConfirmacionDialog } from "@/components/acceso/ConfirmacionDialog";

export const RegistroManualProveedores = () => {
  const { toast } = useToast();
  const { pushData } = useFirebaseWrite();
  
  const [tipoAcceso, setTipoAcceso] = useState<'vehicular' | 'peatonal'>('vehicular');
  const [placa, setPlaca] = useState("");
  const [empresa, setEmpresa] = useState("");
  const [tipoServicio, setTipoServicio] = useState<'gas' | 'delivery' | 'otro'>('otro');
  const [direccion, setDireccion] = useState("");
  const [empadronadoId, setEmpadronadoId] = useState("");
  const [mostrarConfirmacion, setMostrarConfirmacion] = useState(false);

  const registrarProveedor = async () => {
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

    if (!empresa.trim()) {
      toast({
        title: "Error",
        description: "Ingrese el nombre de la empresa",
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
      const registro: Omit<RegistroProveedor, 'id'> = {
        empadronadoId,
        tipoAcceso,
        placa: tipoAcceso === 'vehicular' ? placa : undefined,
        empresa,
        tipoServicio,
        fechaCreacion: Date.now(),
        estado: 'pendiente'
      };

      await pushData('acceso/proveedores', registro);

      // También registrar en seguridad para seguimiento
      await pushData('seguridad/registros_manuales', {
        ...registro,
        tipo: 'proveedor',
        direccion,
        registradoPor: 'seguridad',
        fechaRegistro: Date.now()
      });

      toast({
        title: "Proveedor Registrado",
        description: "El registro ha sido enviado para autorización",
      });

      // Limpiar formulario
      setTipoAcceso('vehicular');
      setPlaca("");
      setEmpresa("");
      setTipoServicio('otro');
      setDireccion("");
      setEmpadronadoId("");
      setMostrarConfirmacion(false);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar al proveedor",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Registro Manual de Proveedores
          </CardTitle>
          <CardDescription>
            Registre proveedores y servicios que requieren autorización
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
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

          {/* Datos de la Empresa */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Empresa / Servicio</Label>
              <Input
                value={empresa}
                onChange={(e) => setEmpresa(e.target.value)}
                placeholder="Nombre de la empresa"
              />
            </div>

            <div className="space-y-2">
              <Label>Tipo de Servicio</Label>
              <Select value={tipoServicio} onValueChange={(value: 'gas' | 'delivery' | 'otro') => setTipoServicio(value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gas">Gas</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                  <SelectItem value="otro">Otro</SelectItem>
                </SelectContent>
              </Select>
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

          {/* Información Importante */}
          <div className="bg-muted/50 p-4 rounded-lg">
            <h4 className="font-medium text-sm mb-2">Horarios de Atención</h4>
            <p className="text-sm text-muted-foreground">
              <strong>Lunes a Domingo:</strong> 7:20 AM - 6:30 PM
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              No se permite el ingreso fuera de estos horarios
            </p>
          </div>

          {/* Botón de Registro */}
          <div className="pt-4 border-t">
            <Button 
              onClick={registrarProveedor}
              className="w-full flex items-center gap-2"
            >
              <Save className="h-4 w-4" />
              Registrar Proveedor
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Dialog de Confirmación */}
      <ConfirmacionDialog
        open={mostrarConfirmacion}
        onOpenChange={setMostrarConfirmacion}
        titulo="Confirmar Registro de Proveedor"
        mensaje="¿Confirma con el propietario que puede ingresar este proveedor?"
        onConfirmar={confirmarRegistro}
      />
    </div>
  );
};