import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, CalendarIcon, Upload, Download, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { createSancion, getEntidadesSancionables } from "@/services/sanciones";
import { CreateSancionForm, TipoEntidad, TipoSancion } from "@/types/sanciones";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface NuevaSancionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const NuevaSancionModal = ({ open, onOpenChange, onSuccess }: NuevaSancionModalProps) => {
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<CreateSancionForm>();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [entidades, setEntidades] = useState<any[]>([]);
  const [loadingEntidades, setLoadingEntidades] = useState(false);
  const [fechaVencimiento, setFechaVencimiento] = useState<Date>();
  const [archivoDocumento, setArchivoDocumento] = useState<File | null>(null);

  const tipoEntidad = watch("tipoEntidad");
  const tipoSancion = watch("tipoSancion");

  const cargarEntidades = async (tipo: TipoEntidad) => {
    try {
      setLoadingEntidades(true);
      const data = await getEntidadesSancionables(tipo);
      setEntidades(data);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudieron cargar las entidades",
        variant: "destructive"
      });
    } finally {
      setLoadingEntidades(false);
    }
  };

  const handleTipoEntidadChange = (value: TipoEntidad) => {
    setValue("tipoEntidad", value);
    setValue("entidadId", "");
    setValue("entidadNombre", "");
    setValue("entidadDocumento", "");
    cargarEntidades(value);
  };

  const handleEntidadChange = (value: string) => {
    const entidad = entidades.find(e => e.id === value);
    if (entidad) {
      setValue("entidadId", entidad.id);
      setValue("entidadNombre", getEntidadNombre(entidad));
      setValue("entidadDocumento", getEntidadDocumento(entidad));
    }
  };

  const getEntidadNombre = (entidad: any) => {
    if ('nombre' in entidad && 'apellidos' in entidad) {
      return `${entidad.nombre} ${entidad.apellidos}`;
    }
    if ('nombre' in entidad) {
      return entidad.nombre;
    }
    if ('placa' in entidad) {
      return `Vehículo ${entidad.placa}`;
    }
    return entidad.id;
  };

  const descargarPlantillaSancion = () => {
    const plantilla = `
ACTA DE SANCIÓN N° _______________

RESOLUCIÓN N° _______________

FECHA: ${new Date().toLocaleDateString('es-PE')}

ANTECEDENTES:
En sesión de Junta Directiva de fecha _____________, se acordó aplicar la siguiente sanción:

DATOS DE LA PERSONA/ENTIDAD SANCIONADA:
- Nombre/Razón Social: _______________________________
- DNI/RUC/Placa: ___________________________________
- Domicilio/Ubicación: _____________________________

TIPO DE SANCIÓN: _____________________________________

MOTIVO: ____________________________________________
_________________________________________________
_________________________________________________

DESCRIPCIÓN DE LOS HECHOS:
_________________________________________________
_________________________________________________
_________________________________________________

MONTO DE LA MULTA (si aplica): S/ ___________________

FECHA DE VENCIMIENTO: _______________________________

DISPOSICIONES:
1. La presente sanción deberá ser cumplida en el plazo establecido.
2. El incumplimiento de la presente resolución acarreará las medidas adicionales previstas en el estatuto.
3. La presente resolución es apelable dentro de los 15 días calendario siguientes a su notificación.

OBSERVACIONES:
_________________________________________________
_________________________________________________

Dado en _____________ a los ____ días del mes de _________ del año 2024.


_____________________          _____________________
    PRESIDENTE                      FISCAL
   Junta Directiva               Junta Directiva


SELLO:
    `;
    
    const element = document.createElement('a');
    element.href = 'data:text/plain;charset=utf-8,' + encodeURIComponent(plantilla);
    element.download = `plantilla_sancion_${new Date().getTime()}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
    
    toast({
      title: "Plantilla descargada",
      description: "Complete los datos y obtenga las firmas correspondientes"
    });
  };

  const getEntidadDocumento = (entidad: any) => {
    if ('dni' in entidad) return entidad.dni;
    if ('ruc' in entidad) return entidad.ruc;
    if ('placa' in entidad) return entidad.placa;
    if ('licencia' in entidad) return entidad.licencia;
    return undefined;
  };

  const onSubmit = async (data: CreateSancionForm) => {
    try {
      setLoading(true);
      
      const sancionData: CreateSancionForm = {
        ...data,
        fechaVencimiento: fechaVencimiento ? fechaVencimiento.toISOString().split('T')[0] : undefined
      };

      await createSancion(sancionData, archivoDocumento || undefined);

      toast({
        title: "Sanción creada",
        description: "La sanción se ha registrado correctamente"
      });

      onSuccess();
      onOpenChange(false);
      reset();
      setFechaVencimiento(undefined);
      setArchivoDocumento(null);
      setEntidades([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear la sanción",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Nueva Sanción
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Descargar Plantilla */}
          <div className="p-3 bg-primary/10 border border-primary/20 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary">Plantilla de Sanción</p>
                <p className="text-xs text-primary/80">Descargue, complete y adjunte el documento firmado</p>
              </div>
              <Button 
                type="button" 
                onClick={descargarPlantillaSancion} 
                variant="outline" 
                size="sm"
                className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
              >
                <Download className="h-4 w-4 mr-2" />
                Descargar
              </Button>
            </div>
          </div>
          {/* Tipo de Entidad */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoEntidad">Tipo de Entidad *</Label>
              <Select onValueChange={handleTipoEntidadChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="empadronado">Empadronado</SelectItem>
                  <SelectItem value="maestro_obra">Maestro de Obra</SelectItem>
                  <SelectItem value="direccion">Dirección</SelectItem>
                  <SelectItem value="vehiculo">Vehículo</SelectItem>
                  <SelectItem value="negocio">Negocio</SelectItem>
                  <SelectItem value="delegado">Delegado</SelectItem>
                  <SelectItem value="junta_directiva">Junta Directiva</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipoEntidad && (
                <p className="text-sm text-destructive">Este campo es requerido</p>
              )}
            </div>

            {/* Entidad */}
            <div className="space-y-2">
              <Label htmlFor="entidadId">Entidad *</Label>
              <Select onValueChange={handleEntidadChange} disabled={!tipoEntidad || loadingEntidades}>
                <SelectTrigger>
                  <SelectValue placeholder={loadingEntidades ? "Cargando..." : "Seleccionar entidad"} />
                </SelectTrigger>
                <SelectContent>
                  {entidades.map((entidad) => (
                    <SelectItem key={entidad.id} value={entidad.id}>
                      {getEntidadNombre(entidad)}
                      {getEntidadDocumento(entidad) && ` - ${getEntidadDocumento(entidad)}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.entidadId && (
                <p className="text-sm text-destructive">Este campo es requerido</p>
              )}
            </div>
          </div>

          {/* Tipo de Sanción */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="tipoSancion">Tipo de Sanción *</Label>
              <Select onValueChange={(value) => setValue("tipoSancion", value as TipoSancion)}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="amonestacion">Amonestación</SelectItem>
                  <SelectItem value="multa">Multa</SelectItem>
                  <SelectItem value="suspension_temporal">Suspensión Temporal</SelectItem>
                  <SelectItem value="suspension_permanente">Suspensión Permanente</SelectItem>
                  <SelectItem value="inhabilitacion">Inhabilitación</SelectItem>
                  <SelectItem value="otros">Otros</SelectItem>
                </SelectContent>
              </Select>
              {errors.tipoSancion && (
                <p className="text-sm text-destructive">Este campo es requerido</p>
              )}
            </div>

            {/* Monto (solo si es multa) */}
            {tipoSancion === "multa" && (
              <div className="space-y-2">
                <Label htmlFor="montoMulta">Monto de Multa (S/) *</Label>
                <Input
                  id="montoMulta"
                  type="number"
                  min="0"
                  step="0.01"
                  {...register('montoMulta', { 
                    required: tipoSancion === "multa",
                    valueAsNumber: true,
                    min: 0
                  })}
                  placeholder="Ej: 100.00"
                />
                {errors.montoMulta && (
                  <p className="text-sm text-destructive">Ingrese un monto válido</p>
                )}
              </div>
            )}
          </div>

          {/* Motivo */}
          <div className="space-y-2">
            <Label htmlFor="motivo">Motivo de la Sanción *</Label>
            <Input
              id="motivo"
              {...register('motivo', { required: true })}
              placeholder="Ej: Incumplimiento de estatutos"
            />
            {errors.motivo && (
              <p className="text-sm text-destructive">Este campo es requerido</p>
            )}
          </div>

          {/* Descripción */}
          <div className="space-y-2">
            <Label htmlFor="descripcion">Descripción Detallada *</Label>
            <Textarea
              id="descripcion"
              {...register('descripcion', { required: true })}
              placeholder="Describa detalladamente los hechos que motivan la sanción"
              rows={3}
            />
            {errors.descripcion && (
              <p className="text-sm text-destructive">Este campo es requerido</p>
            )}
          </div>

          {/* Fecha de Vencimiento y Resolución */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fecha de Vencimiento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !fechaVencimiento && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {fechaVencimiento ? (
                      format(fechaVencimiento, "PPP", { locale: es })
                    ) : (
                      <span>Seleccionar fecha</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={fechaVencimiento}
                    onSelect={setFechaVencimiento}
                    disabled={(date) => date < new Date()}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="resolucion">Número de Acta de la Resolución</Label>
              <Input
                id="resolucion"
                {...register('resolucion')}
                placeholder="Ej: ACTA-001-2024"
              />
            </div>
          </div>

          {/* Observaciones */}
          <div className="space-y-2">
            <Label htmlFor="observaciones">Observaciones</Label>
            <Textarea
              id="observaciones"
              {...register('observaciones')}
              placeholder="Observaciones adicionales (opcional)"
              rows={2}
            />
          </div>

          {/* Documento de Sanción */}
          <div className="space-y-2">
            <Label htmlFor="archivo">Documento de Sanción Firmado *</Label>
            <p className="text-xs text-muted-foreground mb-2">
              Suba el acta de sanción firmada por el Presidente y Fiscal (PDF, JPG, PNG)
            </p>
            <div className="flex items-center gap-2">
              <Input
                type="file"
                accept="application/pdf,image/jpeg,image/jpg,image/png"
                onChange={(e) => setArchivoDocumento(e.target.files?.[0] || null)}
                className="flex-1"
                required
              />
              <Button type="button" variant="outline" size="sm">
                <Upload className="h-4 w-4" />
              </Button>
            </div>
            {archivoDocumento && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <FileText className="h-4 w-4" />
                <span>Archivo seleccionado: {archivoDocumento.name}</span>
              </div>
            )}
            <p className="text-xs text-destructive">
              * Este campo es obligatorio. Debe adjuntar el documento firmado.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || !archivoDocumento} variant="destructive">
              {loading ? "Creando..." : "Crear Sanción"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};