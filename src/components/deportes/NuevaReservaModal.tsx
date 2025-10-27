import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, User, Phone, FileText, Repeat, Calculator } from "lucide-react";
import { Cancha, FormReserva } from "@/types/deportes";
import { crearReserva, calcularPrecio, validarDisponibilidad, validarLimitesReserva } from "@/services/deportes";
import { toast } from "@/hooks/use-toast";
import { BusquedaEmpadronado } from "./BusquedaEmpadronado";
import { useAuth } from "@/contexts/AuthContext";

interface NuevaReservaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canchas: Cancha[];
  onSuccess: () => void;
  fechaInicioPredeterminada?: Date;
  fechaFinPredeterminada?: Date;
}

export const NuevaReservaModal = ({
  open,
  onOpenChange,
  canchas,
  onSuccess,
  fechaInicioPredeterminada,
  fechaFinPredeterminada
}: NuevaReservaModalProps) => {
  const { profile, empadronado } = useAuth();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState<FormReserva & { direccion?: string }>({
    canchaId: '',
    nombreCliente: '',
    dni: '',
    telefono: '',
    fechaInicio: '',
    fechaFin: '',
    esAportante: false,
    observaciones: '',
    direccion: ''
  });
  const [mostrarRecurrente, setMostrarRecurrente] = useState(false);
  const [precioCalculado, setPrecioCalculado] = useState<{
    base: number;
    luz: number;
    descuentoAportante: number;
    total: number;
  } | null>(null);

  useEffect(() => {
    if (open) {
      console.log('Modal abierto, canchas disponibles:', canchas);
      console.log('Empadronado data:', empadronado);
      
      // Cargar datos del empadronado si está vinculado, sino del perfil
      const nombreCompleto = empadronado 
        ? `${empadronado.nombre} ${empadronado.apellidos}`
        : (profile?.displayName || profile?.email || '');
      
      const telefono = empadronado?.telefonos?.[0]?.numero || profile?.phone || '';
      
      setForm({
        canchaId: canchas.length > 0 ? canchas[0].id : '',
        nombreCliente: nombreCompleto,
        dni: empadronado?.dni || '',
        telefono: telefono,
        fechaInicio: fechaInicioPredeterminada ? 
          fechaInicioPredeterminada.toISOString().slice(0, 16) : '',
        fechaFin: fechaFinPredeterminada ? 
          fechaFinPredeterminada.toISOString().slice(0, 16) : '',
        esAportante: false,
        observaciones: '',
        direccion: ''
      });
      setMostrarRecurrente(false);
      setPrecioCalculado(null);
    }
  }, [open, canchas, fechaInicioPredeterminada, fechaFinPredeterminada, profile, empadronado]);

  useEffect(() => {
    calcularPrecioReserva();
  }, [form.canchaId, form.fechaInicio, form.fechaFin, form.esAportante]);

  const calcularPrecioReserva = () => {
    if (!form.canchaId || !form.fechaInicio || !form.fechaFin) {
      setPrecioCalculado(null);
      return;
    }

    const cancha = canchas.find(c => c.id === form.canchaId);
    if (!cancha) return;

    const inicio = new Date(form.fechaInicio);
    const fin = new Date(form.fechaFin);
    const duracionHoras = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);

    if (duracionHoras <= 0) {
      setPrecioCalculado(null);
      return;
    }

    const precio = calcularPrecio(cancha, duracionHoras, form.esAportante);
    setPrecioCalculado(precio);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validarFormulario()) return;

    setLoading(true);
    try {
      // Validar disponibilidad
      const disponible = await validarDisponibilidad(
        form.canchaId,
        form.fechaInicio,
        form.fechaFin
      );

      if (!disponible) {
        toast({
          title: "Horario no disponible",
          description: "El horario seleccionado está ocupado",
          variant: "destructive"
        });
        return;
      }

      // Validar límites por usuario
      if (form.dni) {
        const dentroDelLimite = await validarLimitesReserva(form.dni, form.fechaInicio);
        if (!dentroDelLimite) {
          toast({
            title: "Límite de reservas",
            description: "Se ha alcanzado el límite de reservas por día para este usuario",
            variant: "destructive"
          });
          return;
        }
      }

      await crearReserva(form, 'current-user'); // TODO: obtener usuario actual
      
      toast({
        title: "Reserva creada",
        description: "La reserva se ha creado exitosamente"
      });

      onSuccess();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "No se pudo crear la reserva",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const validarFormulario = (): boolean => {
    if (!form.canchaId || !form.nombreCliente || !form.telefono || !form.fechaInicio || !form.fechaFin) {
      toast({
        title: "Campos requeridos",
        description: "Por favor complete todos los campos obligatorios",
        variant: "destructive"
      });
      return false;
    }

    const inicio = new Date(form.fechaInicio);
    const fin = new Date(form.fechaFin);
    
    if (fin <= inicio) {
      toast({
        title: "Horario inválido",
        description: "La hora de fin debe ser posterior a la hora de inicio",
        variant: "destructive"
      });
      return false;
    }

    const duracionHoras = (fin.getTime() - inicio.getTime()) / (1000 * 60 * 60);
    const cancha = canchas.find(c => c.id === form.canchaId);
    
    if (cancha) {
      if (duracionHoras < cancha.configuracion.horaMinima) {
        toast({
          title: "Duración mínima",
          description: `La duración mínima es ${cancha.configuracion.horaMinima} hora(s)`,
          variant: "destructive"
        });
        return false;
      }

      if (duracionHoras > cancha.configuracion.horaMaxima) {
        toast({
          title: "Duración máxima",
          description: `La duración máxima es ${cancha.configuracion.horaMaxima} hora(s)`,
          variant: "destructive"
        });
        return false;
      }
    }

    return true;
  };

  const handleEmpadronadoSelect = (empadronado: any) => {
    setForm(prev => ({
      ...prev,
      nombreCliente: `${empadronado.nombre} ${empadronado.apellidos}`,
      dni: empadronado.dni,
      telefono: empadronado.telefono || '',
      esAportante: empadronado.aporta || false
    }));
  };


  const canchaSeleccionada = canchas.find(c => c.id === form.canchaId);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Nueva Reserva
          </DialogTitle>
          <DialogDescription>
            Complete los datos para crear una nueva reserva
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Información del cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-4 w-4" />
                  Datos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  {empadronado && (
                    <div className="bg-primary/10 border border-primary/20 rounded-md p-3 mb-2">
                      <p className="text-sm font-medium">Datos del Padrón</p>
                      <p className="text-xs text-muted-foreground">Padrón N°: {empadronado.numeroPadron}</p>
                    </div>
                  )}
                  
                  <div>
                    <Label htmlFor="nombreCliente">Nombre Completo *</Label>
                    <Input
                      id="nombreCliente"
                      value={form.nombreCliente}
                      onChange={(e) => setForm(prev => ({ ...prev, nombreCliente: e.target.value }))}
                      placeholder="Nombre del cliente"
                      required
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      {empadronado 
                        ? `Reserva a nombre de: ${empadronado.nombre} ${empadronado.apellidos}` 
                        : `Reserva a nombre de: ${profile?.displayName || profile?.email}`}
                    </p>
                  </div>

                  <div>
                    <Label htmlFor="dni">DNI</Label>
                    <Input
                      id="dni"
                      value={form.dni}
                      onChange={(e) => setForm(prev => ({ ...prev, dni: e.target.value }))}
                      placeholder="12345678"
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div>
                    <Label htmlFor="telefono">Teléfono *</Label>
                    <Input
                      id="telefono"
                      value={form.telefono}
                      onChange={(e) => setForm(prev => ({ ...prev, telefono: e.target.value }))}
                      placeholder="987654321"
                      required
                    />
                  </div>

                  {form.esAportante && (
                    <Badge variant="secondary" className="w-fit">
                      ✓ Descuento de aportante aplicado
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Información de la reserva */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Clock className="h-4 w-4" />
                  Detalles de la Reserva
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="canchaId">Cancha *</Label>
                  <Select value={form.canchaId} onValueChange={(value) => setForm(prev => ({ ...prev, canchaId: value }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar cancha" />
                    </SelectTrigger>
                    <SelectContent className="bg-background border shadow-lg z-50">
                      {canchas.filter(cancha => cancha.activa).map(cancha => (
                        <SelectItem key={cancha.id} value={cancha.id}>
                          {cancha.nombre} - {cancha.ubicacion === 'boulevard' ? 'Boulevard' : 'Quinta Llana'}
                          {cancha.tipo === 'futbol' ? ' ⚽' : ' 🏐'}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="fechaInicio">Fecha y Hora de Inicio *</Label>
                    <Input
                      id="fechaInicio"
                      type="datetime-local"
                      value={form.fechaInicio}
                      onChange={(e) => setForm(prev => ({ ...prev, fechaInicio: e.target.value }))}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="fechaFin">Fecha y Hora de Fin *</Label>
                    <Input
                      id="fechaFin"
                      type="datetime-local"
                      value={form.fechaFin}
                      onChange={(e) => setForm(prev => ({ ...prev, fechaFin: e.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="observaciones">Observaciones</Label>
                  <Textarea
                    id="observaciones"
                    value={form.observaciones}
                    onChange={(e) => setForm(prev => ({ ...prev, observaciones: e.target.value }))}
                    placeholder="Comentarios adicionales..."
                    rows={3}
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <Switch
                    id="recurrente"
                    checked={mostrarRecurrente}
                    onCheckedChange={setMostrarRecurrente}
                  />
                  <Label htmlFor="recurrente">Reserva recurrente</Label>
                </div>

                {mostrarRecurrente && (
                  <Card className="border-dashed">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm flex items-center gap-2">
                        <Repeat className="h-4 w-4" />
                        Configuración Recurrente
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <Label>Frecuencia</Label>
                        <Select 
                          value={form.recurrente?.frecuencia || 'semanal'}
                          onValueChange={(value: 'semanal' | 'quincenal' | 'mensual') => 
                            setForm(prev => ({ 
                              ...prev, 
                              recurrente: { 
                                esRecurrente: true,
                                frecuencia: value,
                                fechaFin: prev.recurrente?.fechaFin || ''
                              }
                            }))
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="semanal">Semanal</SelectItem>
                            <SelectItem value="quincenal">Quincenal</SelectItem>
                            <SelectItem value="mensual">Mensual</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div>
                        <Label>Fecha Límite</Label>
                        <Input
                          type="date"
                          value={form.recurrente?.fechaFin || ''}
                          onChange={(e) => setForm(prev => ({ 
                            ...prev, 
                            recurrente: { 
                              esRecurrente: true,
                              frecuencia: prev.recurrente?.frecuencia || 'semanal',
                              fechaFin: e.target.value
                            }
                          }))}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Resumen de precio */}
          {precioCalculado && canchaSeleccionada && (
            <Card className="border-primary">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calculator className="h-4 w-4" />
                  Resumen de Precio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Precio Base</p>
                    <p className="text-lg font-medium">S/{precioCalculado.base.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Costo de Luz</p>
                    <p className="text-lg font-medium">S/{precioCalculado.luz.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Descuento Aportante</p>
                    <p className="text-lg font-medium text-green-600">-S/{precioCalculado.descuentoAportante.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total</p>
                    <p className="text-xl font-bold text-primary">S/{precioCalculado.total.toFixed(2)}</p>
                  </div>
                </div>
                
                {canchaSeleccionada && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground mb-2">Configuración de la cancha:</p>
                    <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 text-xs">
                      <span>Duración mín: {canchaSeleccionada.configuracion.horaMinima}h</span>
                      <span>Duración máx: {canchaSeleccionada.configuracion.horaMaxima}h</span>
                      <span>Descuento aportante: {canchaSeleccionada.configuracion.tarifaAportante}%</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </form>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button type="submit" onClick={handleSubmit} disabled={loading || !precioCalculado}>
            {loading ? "Creando..." : "Crear Reserva"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};