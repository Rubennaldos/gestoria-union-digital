import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, Shield, Car, User, LogIn, LogOut, Clock, CheckCircle2 } from "lucide-react";
import { RegistroVisita, RegistroTrabajadores, RegistroProveedor } from "@/types/acceso";
import { Empadronado } from "@/types/empadronados";
import { ref, update } from "firebase/database";
import { db } from "@/config/firebase";

interface DetalleIngresoSalidaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tipo: "visitante" | "trabajador" | "proveedor";
  data: RegistroVisita | RegistroTrabajadores | RegistroProveedor;
  empadronado?: Empadronado | null;
  fechaCreacion: number;
  registroId: string;
}

interface PersonaEstado {
  nombre: string;
  dni: string;
  ingresado: boolean;
  horaIngreso?: number;
  horaSalida?: number;
}

export const DetalleIngresoSalidaModal = ({
  open,
  onOpenChange,
  tipo,
  data,
  empadronado,
  fechaCreacion,
  registroId,
}: DetalleIngresoSalidaModalProps) => {
  const { toast } = useToast();
  const [personas, setPersonas] = useState<PersonaEstado[]>([]);
  const [loading, setLoading] = useState<Record<string, boolean>>({});

  // Inicializar el estado de las personas
  useEffect(() => {
    if (!open) return;

    let listaPersonas: PersonaEstado[] = [];

    if (tipo === "visitante") {
      const visitaData = data as RegistroVisita;
      listaPersonas = (visitaData.visitantes || []).map((v) => ({
        nombre: v.nombre,
        dni: v.dni,
        ingresado: (v as any).ingresado || false,
        horaIngreso: (v as any).horaIngreso,
        horaSalida: (v as any).horaSalida,
      }));
    } else if (tipo === "trabajador") {
      const trabajadorData = data as any;
      listaPersonas = (trabajadorData.trabajadores || []).map((t: any) => ({
        nombre: t.nombre,
        dni: t.dni,
        ingresado: t.ingresado || false,
        horaIngreso: t.horaIngreso,
        horaSalida: t.horaSalida,
      }));
    } else if (tipo === "proveedor") {
      const proveedorData = data as RegistroProveedor;
      // Para proveedores, creamos una entrada única
      listaPersonas = [
        {
          nombre: proveedorData.empresa,
          dni: "Proveedor",
          ingresado: (data as any).ingresado || false,
          horaIngreso: (data as any).horaIngreso,
          horaSalida: (data as any).horaSalida,
        },
      ];
    }

    setPersonas(listaPersonas);
  }, [open, tipo, data]);

  const getIcon = () => {
    switch (tipo) {
      case "visitante":
        return Users;
      case "trabajador":
        return UserCheck;
      case "proveedor":
        return Shield;
      default:
        return Users;
    }
  };

  const Icon = getIcon();

  const handleIngreso = async (index: number) => {
    const loadingKey = `ingreso-${index}`;
    setLoading((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const now = Date.now();

      if (tipo === "proveedor") {
        // Para proveedores, actualizar directamente en el registro
        await update(ref(db, `acceso/proveedores/${registroId}`), {
          ingresado: true,
          horaIngreso: now,
        });
      } else if (tipo === "visitante") {
        await update(ref(db, `acceso/visitas/${registroId}/visitantes/${index}`), {
          ingresado: true,
          horaIngreso: now,
        });
      } else if (tipo === "trabajador") {
        await update(ref(db, `acceso/trabajadores/${registroId}/trabajadores/${index}`), {
          ingresado: true,
          horaIngreso: now,
        });
      }

      // Actualizar estado local
      setPersonas((prev) =>
        prev.map((p, i) =>
          i === index ? { ...p, ingresado: true, horaIngreso: now } : p
        )
      );

      toast({
        title: "Ingreso Registrado",
        description: `${personas[index].nombre} ha ingresado correctamente.`,
      });
    } catch (error) {
      console.error("Error al registrar ingreso:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar el ingreso",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  const handleSalida = async (index: number) => {
    const loadingKey = `salida-${index}`;
    setLoading((prev) => ({ ...prev, [loadingKey]: true }));

    try {
      const now = Date.now();

      if (tipo === "proveedor") {
        await update(ref(db, `acceso/proveedores/${registroId}`), {
          horaSalida: now,
        });
      } else if (tipo === "visitante") {
        await update(ref(db, `acceso/visitas/${registroId}/visitantes/${index}`), {
          horaSalida: now,
        });
      } else if (tipo === "trabajador") {
        await update(ref(db, `acceso/trabajadores/${registroId}/trabajadores/${index}`), {
          horaSalida: now,
        });
      }

      // Actualizar estado local
      setPersonas((prev) =>
        prev.map((p, i) => (i === index ? { ...p, horaSalida: now } : p))
      );

      toast({
        title: "Salida Registrada",
        description: `${personas[index].nombre} ha salido correctamente.`,
      });
    } catch (error) {
      console.error("Error al registrar salida:", error);
      toast({
        title: "Error",
        description: "No se pudo registrar la salida",
        variant: "destructive",
      });
    } finally {
      setLoading((prev) => ({ ...prev, [loadingKey]: false }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5" />
            <DialogTitle>Control de Ingreso/Salida - {tipo.charAt(0).toUpperCase() + tipo.slice(1)}</DialogTitle>
          </div>
          <DialogDescription>
            Autorizado el {new Date(fechaCreacion).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Información del solicitante */}
          {empadronado && (
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 mb-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span className="font-semibold">Solicitado por:</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Vecino:</span>
                    <p className="font-medium">
                      {empadronado.nombre} {empadronado.apellidos}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Padrón:</span>
                    <p className="font-medium">{empadronado.numeroPadron}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Información general */}
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo de Acceso:</span>
                  <p className="font-medium capitalize">{(data as any).tipoAcceso}</p>
                </div>
                {(data as any).placa && (
                  <div>
                    <span className="text-muted-foreground">Placa:</span>
                    <div className="flex items-center gap-2">
                      <Car className="h-4 w-4" />
                      <p className="font-medium">{(data as any).placa}</p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Separator />

          {/* Lista de personas con control individual */}
          <div className="space-y-3">
            <h3 className="font-semibold flex items-center gap-2">
              <User className="h-4 w-4" />
              {tipo === "proveedor"
                ? "Control de Proveedor"
                : tipo === "visitante"
                ? "Control de Visitantes"
                : "Control de Trabajadores"}
            </h3>

            {personas.map((persona, index) => (
              <Card key={index} className="border-l-4 border-l-primary">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 bg-primary/20 rounded-full flex items-center justify-center text-xs font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-medium">{persona.nombre}</p>
                          <p className="text-sm text-muted-foreground">{persona.dni}</p>
                        </div>
                      </div>
                    </div>
                    {persona.horaSalida ? (
                      <Badge className="bg-gray-500">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Completado
                      </Badge>
                    ) : persona.ingresado ? (
                      <Badge className="bg-blue-500">
                        <Clock className="h-3 w-3 mr-1" />
                        Adentro
                      </Badge>
                    ) : (
                      <Badge variant="outline">Pendiente</Badge>
                    )}
                  </div>

                  {/* Horarios */}
                  {(persona.horaIngreso || persona.horaSalida) && (
                    <div className="text-xs text-muted-foreground mb-3 space-y-1">
                      {persona.horaIngreso && (
                        <div className="flex items-center gap-1">
                          <LogIn className="h-3 w-3" />
                          Ingreso: {new Date(persona.horaIngreso).toLocaleTimeString()}
                        </div>
                      )}
                      {persona.horaSalida && (
                        <div className="flex items-center gap-1">
                          <LogOut className="h-3 w-3" />
                          Salida: {new Date(persona.horaSalida).toLocaleTimeString()}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Botones de control */}
                  <div className="flex gap-2">
                    {!persona.ingresado ? (
                      <Button
                        onClick={() => handleIngreso(index)}
                        className="flex-1 bg-green-600 hover:bg-green-700"
                        disabled={loading[`ingreso-${index}`]}
                      >
                        <LogIn className="h-4 w-4 mr-2" />
                        {loading[`ingreso-${index}`] ? "Registrando..." : "Registrar Ingreso"}
                      </Button>
                    ) : !persona.horaSalida ? (
                      <Button
                        onClick={() => handleSalida(index)}
                        className="flex-1 bg-orange-600 hover:bg-orange-700"
                        disabled={loading[`salida-${index}`]}
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        {loading[`salida-${index}`] ? "Registrando..." : "Registrar Salida"}
                      </Button>
                    ) : (
                      <Button className="flex-1" disabled>
                        <CheckCircle2 className="h-4 w-4 mr-2" />
                        Completado
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
