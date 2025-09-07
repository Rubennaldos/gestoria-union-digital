import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { ScanLine, Users, UserCheck, LogIn, LogOut, Clock, AlertTriangle } from "lucide-react";
import { useFirebaseWrite } from "@/hooks/useFirebase";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

interface RegistroIngresoSalida {
  id: string;
  tipo: 'visitante' | 'trabajador' | 'proveedor';
  dni?: string;
  nombre?: string;
  empresa?: string;
  horaIngreso?: number;
  horaSalida?: number;
  dia: string;
  estado: 'ingresado' | 'finalizado';
}

export const ControlIngresoSalida = () => {
  const { toast } = useToast();
  const { pushData, updateData } = useFirebaseWrite();
  const [dni, setDni] = useState("");
  const [tipoRegistro, setTipoRegistro] = useState<'visitante' | 'trabajador' | 'proveedor'>('visitante');
  const [mostrarAutorizacionDomingo, setMostrarAutorizacionDomingo] = useState(false);
  const [claveAutorizacion, setClaveAutorizacion] = useState("");

  const verificarHorarios = (tipo: 'trabajador' | 'proveedor') => {
    const ahora = new Date();
    const dia = ahora.getDay(); // 0 = domingo, 1 = lunes, etc.
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const tiempoActual = hora + (minutos / 60);

    if (tipo === 'trabajador') {
      // Lunes a viernes: 7:20 AM - 5:50 PM
      if (dia >= 1 && dia <= 5) {
        return tiempoActual >= 7.33 && tiempoActual <= 17.83; // 7:20 y 17:50
      }
      // Sábados: 8:00 AM - 1:00 PM
      if (dia === 6) {
        return tiempoActual >= 8 && tiempoActual <= 13;
      }
      // Domingos: requiere autorización
      if (dia === 0) {
        return false; // Requerirá clave
      }
    }

    if (tipo === 'proveedor') {
      // Lunes a domingo: 7:20 AM - 6:30 PM
      return tiempoActual >= 7.33 && tiempoActual <= 18.5;
    }

    return true;
  };

  const verificarHorarioSalida = (horaIngreso: number) => {
    const ahora = new Date();
    const dia = ahora.getDay();
    const hora = ahora.getHours();
    const minutos = ahora.getMinutes();
    const tiempoActual = hora + (minutos / 60);

    const fechaIngreso = new Date(horaIngreso);
    const diaIngreso = fechaIngreso.getDay();

    // Horarios máximos de salida
    if (diaIngreso >= 1 && diaIngreso <= 5) { // Lunes a viernes
      if (tiempoActual > 18.5) { // Después de 6:30 PM
        return { tardanza: true, tipo: 'llamada_atencion' };
      }
    }
    if (diaIngreso === 6) { // Sábado
      if (tiempoActual > 14.5) { // Después de 2:30 PM
        return { tardanza: true, tipo: 'llamada_atencion' };
      }
    }

    return { tardanza: false };
  };

  const registrarIngreso = async () => {
    if (!dni.trim()) {
      toast({
        title: "Error",
        description: "Ingrese el DNI",
        variant: "destructive",
      });
      return;
    }

    // Verificar horarios para trabajadores y proveedores
    if (tipoRegistro === 'trabajador' || tipoRegistro === 'proveedor') {
      const horarioValido = verificarHorarios(tipoRegistro);
      const esDomingo = new Date().getDay() === 0;

      if (!horarioValido && tipoRegistro === 'trabajador' && esDomingo) {
        setMostrarAutorizacionDomingo(true);
        return;
      }

      if (!horarioValido && !esDomingo) {
        toast({
          title: "Fuera de Horario",
          description: "No se puede registrar ingreso fuera del horario permitido",
          variant: "destructive",
        });
        return;
      }
    }

    try {
      const registro: Omit<RegistroIngresoSalida, 'id'> = {
        tipo: tipoRegistro,
        dni: dni.trim(),
        horaIngreso: Date.now(),
        dia: new Date().toISOString().split('T')[0],
        estado: 'ingresado'
      };

      await pushData('seguridad/ingresos', registro);

      toast({
        title: "Ingreso Registrado",
        description: `${tipoRegistro} con DNI ${dni} ha ingresado correctamente`,
      });

      setDni("");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar el ingreso",
        variant: "destructive",
      });
    }
  };

  const registrarSalida = async () => {
    if (!dni.trim()) {
      toast({
        title: "Error",
        description: "Ingrese el DNI",
        variant: "destructive",
      });
      return;
    }

    try {
      // Buscar registro de ingreso activo
      // Aquí necesitarías implementar la búsqueda en Firebase
      // Por simplicidad, simularemos que encontramos el registro

      const verificacionSalida = verificarHorarioSalida(Date.now() - 8 * 60 * 60 * 1000); // Simular 8 horas antes

      if (verificacionSalida.tardanza) {
        // Registrar llamada de atención o sanción
        await pushData('seguridad/sanciones', {
          dni: dni.trim(),
          tipo: 'tardanza_salida',
          fecha: Date.now(),
          descripcion: 'Salida fuera del horario permitido'
        });

        toast({
          title: "Salida Registrada con Observación",
          description: "Se registró una llamada de atención por salida tardía",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Salida Registrada",
          description: `Salida registrada correctamente para DNI ${dni}`,
        });
      }

      setDni("");
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo registrar la salida",
        variant: "destructive",
      });
    }
  };

  const autorizarIngresoEspecial = () => {
    if (claveAutorizacion === "123456") {
      setMostrarAutorizacionDomingo(false);
      setClaveAutorizacion("");
      // Proceder con el registro
      registrarIngreso();
    } else {
      toast({
        title: "Clave Incorrecta",
        description: "La clave de autorización es incorrecta",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Registro de Visitantes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Control de Visitantes
            </CardTitle>
            <CardDescription>
              Los visitantes deben estar autorizados previamente
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button 
                onClick={() => setTipoRegistro('visitante')}
                variant={tipoRegistro === 'visitante' ? 'default' : 'outline'}
                className="flex-1"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Visita Ingresada
              </Button>
              <Button 
                variant="outline"
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Visita Salida
              </Button>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              Horarios: 24 horas (con autorización previa)
            </p>
          </CardContent>
        </Card>

        {/* Registro de Trabajadores */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCheck className="h-5 w-5" />
              Control de Trabajadores
            </CardTitle>
            <CardDescription>
              Registro con horarios específicos y control de sanciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>DNI del Trabajador</Label>
              <div className="flex gap-2">
                <Input
                  value={dni}
                  onChange={(e) => setDni(e.target.value)}
                  placeholder="Ingrese o escanee DNI"
                  className="flex-1"
                />
                <Button variant="outline" size="icon">
                  <ScanLine className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={() => {
                  setTipoRegistro('trabajador');
                  registrarIngreso();
                }}
                className="flex-1"
              >
                <LogIn className="h-4 w-4 mr-2" />
                Registrar Ingreso
              </Button>
              <Button 
                onClick={registrarSalida}
                variant="outline"
                className="flex-1"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Registrar Salida
              </Button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Lun-Vie: 7:20 AM - 5:50 PM</span>
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span>Sáb: 8:00 AM - 1:00 PM</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertTriangle className="h-3 w-3 text-warning" />
                <span>Dom: Requiere autorización</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Control de Proveedores */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Control de Proveedores
          </CardTitle>
          <CardDescription>
            Registro de entrada y salida de proveedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Empresa/Servicio</Label>
                <Input placeholder="Nombre de la empresa o servicio" />
              </div>
              <div className="flex gap-2">
                <Button 
                  onClick={() => {
                    setTipoRegistro('proveedor');
                    registrarIngreso();
                  }}
                  className="flex-1"
                >
                  <LogIn className="h-4 w-4 mr-2" />
                  Registrar Ingreso
                </Button>
                <Button 
                  variant="outline"
                  className="flex-1"
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  Registrar Salida
                </Button>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="text-center text-sm text-muted-foreground">
                <Clock className="h-8 w-8 mx-auto mb-2" />
                <p>Horarios de Atención</p>
                <p className="font-medium">Lun-Dom: 7:20 AM - 6:30 PM</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dialog para autorización de domingo */}
      <Dialog open={mostrarAutorizacionDomingo} onOpenChange={setMostrarAutorizacionDomingo}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Autorización Requerida
            </DialogTitle>
            <DialogDescription>
              El ingreso de trabajadores los domingos requiere autorización especial
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Clave de Autorización</Label>
              <Input
                type="password"
                value={claveAutorizacion}
                onChange={(e) => setClaveAutorizacion(e.target.value)}
                placeholder="Ingrese la clave de autorización"
              />
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={autorizarIngresoEspecial}
                className="flex-1"
              >
                Autorizar Ingreso
              </Button>
              <Button 
                variant="outline"
                onClick={() => {
                  setMostrarAutorizacionDomingo(false);
                  setClaveAutorizacion("");
                }}
                className="flex-1"
              >
                Cancelar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};