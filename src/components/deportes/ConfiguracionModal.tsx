import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, Clock, DollarSign, Shield, MessageSquare } from "lucide-react";
import { ConfiguracionDeportes } from "@/types/deportes";
import { obtenerConfiguracion, actualizarConfiguracion } from "@/services/deportes";
import { toast } from "@/hooks/use-toast";

interface ConfiguracionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const ConfiguracionModal = ({
  open,
  onOpenChange,
  onSuccess
}: ConfiguracionModalProps) => {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<ConfiguracionDeportes>({
    limitesReservas: {
      reservasPorPersonaPorDia: 2,
      horasAntesParaCancelar: 2,
      horasAntesParaNoShow: 1
    },
    notificaciones: {
      whatsappTemplate: "Hola {nombre}, tu reserva para {cancha} el {fecha} de {horaInicio} a {horaFin} está confirmada. Total: S/{total}",
      recordatorioHoras: [24, 2]
    },
    horarios: {
      apertura: "06:00",
      cierre: "22:00",
      ultimaReserva: "21:00"
    },
    depositos: {
      requiereDeposito: false,
      montoDeposito: 50,
      equipos: {
        red: true,
        pelotas: true,
        tableros: false
      }
    }
  });

  useEffect(() => {
    if (open) {
      cargarConfiguracion();
    }
  }, [open]);

  const cargarConfiguracion = async () => {
    try {
      const configData = await obtenerConfiguracion();
      setConfig(configData);
    } catch (error) {
      console.error('Error al cargar configuración:', error);
      toast({
        title: "Error",
        description: "No se pudo cargar la configuración",
        variant: "destructive"
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setLoading(true);
    try {
      await actualizarConfiguracion(config);
      
      toast({
        title: "Configuración actualizada",
        description: "Los cambios se han guardado exitosamente"
      });

      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo actualizar la configuración",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Configuración del Módulo Deportes
          </DialogTitle>
          <DialogDescription>
            Configure las reglas de negocio, precios y políticas del sistema
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="limites" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="limites">Límites</TabsTrigger>
            <TabsTrigger value="horarios">Horarios</TabsTrigger>
            <TabsTrigger value="depositos">Depósitos</TabsTrigger>
            <TabsTrigger value="notificaciones">Notificaciones</TabsTrigger>
          </TabsList>

          <TabsContent value="limites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Límites y Validaciones
                </CardTitle>
                <CardDescription>
                  Configure los límites para prevenir el acaparamiento de reservas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="reservasPorDia">Reservas máximas por persona por día</Label>
                  <Input
                    id="reservasPorDia"
                    type="number"
                    min="1"
                    max="10"
                    value={config.limitesReservas.reservasPorPersonaPorDia}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      limitesReservas: {
                        ...prev.limitesReservas,
                        reservasPorPersonaPorDia: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Número máximo de reservas que una persona puede hacer en un día
                  </p>
                </div>

                <div>
                  <Label htmlFor="horasCancelar">Horas mínimas para cancelar</Label>
                  <Input
                    id="horasCancelar"
                    type="number"
                    min="1"
                    max="48"
                    value={config.limitesReservas.horasAntesParaCancelar}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      limitesReservas: {
                        ...prev.limitesReservas,
                        horasAntesParaCancelar: parseInt(e.target.value) || 1
                      }
                    }))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Horas mínimas de anticipación para poder cancelar una reserva
                  </p>
                </div>

                <div>
                  <Label htmlFor="horasNoShow">Horas para marcar como No-Show</Label>
                  <Input
                    id="horasNoShow"
                    type="number"
                    min="0.5"
                    max="24"
                    step="0.5"
                    value={config.limitesReservas.horasAntesParaNoShow}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      limitesReservas: {
                        ...prev.limitesReservas,
                        horasAntesParaNoShow: parseFloat(e.target.value) || 0.5
                      }
                    }))}
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Horas después del inicio para marcar automáticamente como No-Show si no hay pago
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="horarios" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Horarios de Funcionamiento
                </CardTitle>
                <CardDescription>
                  Defina los horarios de operación de las canchas
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="apertura">Hora de Apertura</Label>
                    <Input
                      id="apertura"
                      type="time"
                      value={config.horarios.apertura}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        horarios: {
                          ...prev.horarios,
                          apertura: e.target.value
                        }
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="cierre">Hora de Cierre</Label>
                    <Input
                      id="cierre"
                      type="time"
                      value={config.horarios.cierre}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        horarios: {
                          ...prev.horarios,
                          cierre: e.target.value
                        }
                      }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="ultimaReserva">Última Reserva</Label>
                    <Input
                      id="ultimaReserva"
                      type="time"
                      value={config.horarios.ultimaReserva}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        horarios: {
                          ...prev.horarios,
                          ultimaReserva: e.target.value
                        }
                      }))}
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Hora límite para iniciar nuevas reservas (por ruido vecinal)
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="depositos" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Depósitos y Equipamiento
                </CardTitle>
                <CardDescription>
                  Configure los depósitos por daños y el equipamiento disponible
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="requiereDeposito"
                    checked={config.depositos.requiereDeposito}
                    onCheckedChange={(checked) => setConfig(prev => ({
                      ...prev,
                      depositos: {
                        ...prev.depositos,
                        requiereDeposito: checked
                      }
                    }))}
                  />
                  <Label htmlFor="requiereDeposito">Requerir depósito por daños</Label>
                </div>

                {config.depositos.requiereDeposito && (
                  <div>
                    <Label htmlFor="montoDeposito">Monto del Depósito (S/)</Label>
                    <Input
                      id="montoDeposito"
                      type="number"
                      min="0"
                      step="0.01"
                      value={config.depositos.montoDeposito}
                      onChange={(e) => setConfig(prev => ({
                        ...prev,
                        depositos: {
                          ...prev.depositos,
                          montoDeposito: parseFloat(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                )}

                <Separator />

                <div>
                  <Label className="text-base">Equipamiento Disponible</Label>
                  <p className="text-sm text-muted-foreground mb-3">
                    Seleccione el equipamiento que se entrega con las reservas
                  </p>
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="equipoRed"
                        checked={config.depositos.equipos.red}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          depositos: {
                            ...prev.depositos,
                            equipos: {
                              ...prev.depositos.equipos,
                              red: checked
                            }
                          }
                        }))}
                      />
                      <Label htmlFor="equipoRed">Red de vóley/fútbol</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="equipoPelotas"
                        checked={config.depositos.equipos.pelotas}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          depositos: {
                            ...prev.depositos,
                            equipos: {
                              ...prev.depositos.equipos,
                              pelotas: checked
                            }
                          }
                        }))}
                      />
                      <Label htmlFor="equipoPelotas">Pelotas</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="equipoTableros"
                        checked={config.depositos.equipos.tableros}
                        onCheckedChange={(checked) => setConfig(prev => ({
                          ...prev,
                          depositos: {
                            ...prev.depositos,
                            equipos: {
                              ...prev.depositos.equipos,
                              tableros: checked
                            }
                          }
                        }))}
                      />
                      <Label htmlFor="equipoTableros">Tableros de básquet</Label>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notificaciones" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Notificaciones y WhatsApp
                </CardTitle>
                <CardDescription>
                  Configure las plantillas de mensajes y recordatorios
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="whatsappTemplate">Plantilla de WhatsApp</Label>
                  <textarea
                    id="whatsappTemplate"
                    className="w-full p-3 border rounded-md resize-none"
                    rows={4}
                    value={config.notificaciones.whatsappTemplate}
                    onChange={(e) => setConfig(prev => ({
                      ...prev,
                      notificaciones: {
                        ...prev.notificaciones,
                        whatsappTemplate: e.target.value
                      }
                    }))}
                    placeholder="Plantilla del mensaje de WhatsApp..."
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    Variables disponibles: {'{nombre}'}, {'{cancha}'}, {'{fecha}'}, {'{horaInicio}'}, {'{horaFin}'}, {'{total}'}
                  </p>
                </div>

                <div>
                  <Label>Horas de Recordatorio</Label>
                  <div className="space-y-2 mt-2">
                    <div className="grid grid-cols-2 gap-4">
                      <Input
                        type="number"
                        min="1"
                        max="168"
                        value={config.notificaciones.recordatorioHoras[0] || 24}
                        onChange={(e) => {
                          const newHours = [...config.notificaciones.recordatorioHoras];
                          newHours[0] = parseInt(e.target.value) || 24;
                          setConfig(prev => ({
                            ...prev,
                            notificaciones: {
                              ...prev.notificaciones,
                              recordatorioHoras: newHours
                            }
                          }));
                        }}
                        placeholder="Horas antes (ej: 24)"
                      />
                      <Input
                        type="number"
                        min="1"
                        max="24"
                        value={config.notificaciones.recordatorioHoras[1] || 2}
                        onChange={(e) => {
                          const newHours = [...config.notificaciones.recordatorioHoras];
                          newHours[1] = parseInt(e.target.value) || 2;
                          setConfig(prev => ({
                            ...prev,
                            notificaciones: {
                              ...prev.notificaciones,
                              recordatorioHoras: newHours
                            }
                          }));
                        }}
                        placeholder="Horas antes (ej: 2)"
                      />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Configure las horas de anticipación para enviar recordatorios automáticos
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading}>
            {loading ? "Guardando..." : "Guardar Configuración"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};