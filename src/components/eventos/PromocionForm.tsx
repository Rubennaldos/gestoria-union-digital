import { useState, useEffect } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PromocionEvento, TipoPromocion, TipoDescuento, EscalonPrecio } from "@/types/eventos";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { CalendarIcon, Info } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

interface PromocionFormProps {
  promocion: PromocionEvento | undefined;
  precioBase: number;
  onChange: (promocion: PromocionEvento | undefined) => void;
}

export const PromocionForm = ({ promocion, precioBase, onChange }: PromocionFormProps) => {
  const [activa, setActiva] = useState(!!promocion?.activa);
  
  // Sincronizar el estado cuando cambia la promoción desde fuera
  useEffect(() => {
    setActiva(!!promocion?.activa);
  }, [promocion?.activa]);

  const getTipoPromocionLabel = (tipo: TipoPromocion) => {
    const labels: Record<TipoPromocion, string> = {
      codigo: "Código promocional",
      acompanantes: "Descuento por acompañantes",
      early_bird: "Inscripción anticipada (Early Bird)",
      grupal: "Descuento grupal",
      porcentaje: "Descuento porcentual",
      custom: "Condición personalizada",
    };
    return labels[tipo];
  };

  const handleActivaChange = (checked: boolean) => {
    setActiva(checked);
    if (!checked) {
      onChange(undefined);
    } else {
      onChange({
        activa: true,
        tipo: 'codigo',
        nombre: '',
        tipoDescuento: 'fijo',
      });
    }
  };

  const handleChange = (field: keyof PromocionEvento, value: any) => {
    if (!promocion) return;
    onChange({
      ...promocion,
      [field]: value,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <Checkbox
          id="agregar-promocion"
          checked={activa}
          onCheckedChange={handleActivaChange}
        />
        <Label htmlFor="agregar-promocion" className="text-sm font-medium">
          Agregar promoción o descuento
        </Label>
      </div>

      {activa && promocion && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Configurar Promoción</CardTitle>
            <CardDescription>
              Define las condiciones y el descuento de tu promoción
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Tipo de promoción */}
            <div className="space-y-2">
              <Label>Tipo de promoción</Label>
              <Select
                value={promocion.tipo ?? ""}
                onValueChange={(value: TipoPromocion) => handleChange('tipo', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="codigo">{getTipoPromocionLabel('codigo')}</SelectItem>
                  <SelectItem value="acompanantes">{getTipoPromocionLabel('acompanantes')}</SelectItem>
                  <SelectItem value="early_bird">{getTipoPromocionLabel('early_bird')}</SelectItem>
                  <SelectItem value="grupal">{getTipoPromocionLabel('grupal')}</SelectItem>
                  <SelectItem value="porcentaje">{getTipoPromocionLabel('porcentaje')}</SelectItem>
                  <SelectItem value="custom">{getTipoPromocionLabel('custom')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Nombre de la promoción */}
            <div className="space-y-2">
              <Label>Nombre de la promoción *</Label>
              <Input
                value={promocion.nombre}
                onChange={(e) => handleChange('nombre', e.target.value)}
                placeholder="Ej: Descuento por traer amigos"
              />
            </div>

            {/* Descripción */}
            <div className="space-y-2">
              <Label>Descripción (opcional)</Label>
              <Textarea
                value={promocion.descripcion || ''}
                onChange={(e) => handleChange('descripcion', e.target.value)}
                placeholder="Describe las condiciones de la promoción"
                rows={2}
              />
            </div>

            {/* Código (solo para tipo código) */}
            {promocion.tipo === 'codigo' && (
              <div className="space-y-2">
                <Label>Código promocional *</Label>
                <Input
                  value={promocion.codigo || ''}
                  onChange={(e) => handleChange('codigo', e.target.value.toUpperCase())}
                  placeholder="Ej: YOMEQUIERO"
                />
              </div>
            )}

            {/* Configuración por acompañantes */}
            {promocion.tipo === 'acompanantes' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Mínimo de acompañantes</Label>
                  <Input
                    type="number"
                    min="1"
                    value={promocion.minimoAcompanantes || 1}
                    onChange={(e) => handleChange('minimoAcompanantes', parseInt(e.target.value))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Máximo (opcional)</Label>
                  <Input
                    type="number"
                    min={promocion.minimoAcompanantes || 1}
                    value={promocion.maximoAcompanantes || ''}
                    onChange={(e) => handleChange('maximoAcompanantes', e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="Sin límite"
                  />
                </div>
              </div>
            )}

            {/* Early Bird - Fecha límite */}
            {promocion.tipo === 'early_bird' && (
              <div className="space-y-2">
                <Label>Fecha límite de inscripción</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !promocion.fechaVencimiento && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {promocion.fechaVencimiento
                        ? format(new Date(promocion.fechaVencimiento), "PPP", { locale: es })
                        : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={promocion.fechaVencimiento ? new Date(promocion.fechaVencimiento) : undefined}
                      onSelect={(date) => handleChange('fechaVencimiento', date?.getTime())}
                      disabled={(date) => date < new Date()}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}

            {/* Promoción grupal */}
            {promocion.tipo === 'grupal' && (
              <div className="space-y-2">
                <Label>Mínimo de inscripciones en grupo</Label>
                <Input
                  type="number"
                  min="2"
                  value={promocion.minimoInscripciones || 2}
                  onChange={(e) => handleChange('minimoInscripciones', parseInt(e.target.value))}
                />
              </div>
            )}

            {/* Condición personalizada */}
            {promocion.tipo === 'custom' && (
              <div className="space-y-2">
                <Label>Condición personalizada</Label>
                <Textarea
                  value={promocion.condicionCustom || ''}
                  onChange={(e) => handleChange('condicionCustom', e.target.value)}
                  placeholder="Describe la condición especial (ej: Solo para estudiantes, Válido solo domingos, etc.)"
                  rows={3}
                />
              </div>
            )}

            {/* Tipo de descuento */}
            <div className="space-y-2">
              <Label>Tipo de descuento</Label>
              <Select
                value={promocion.tipoDescuento ?? ""}
                onValueChange={(value: TipoDescuento) => {
                  // Limpiar valores al cambiar tipo (sin usar undefined)
                  const nuevaPromocion: any = {
                    ...promocion,
                    tipoDescuento: value,
                  };
                  // Eliminar propiedades en lugar de usar undefined
                  delete nuevaPromocion.montoDescuento;
                  delete nuevaPromocion.precioFinal;
                  delete nuevaPromocion.escalones;
                  onChange(nuevaPromocion);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un tipo" />
                </SelectTrigger>
                <SelectContent position="popper" sideOffset={4}>
                  <SelectItem value="fijo">Precio fijo final</SelectItem>
                  <SelectItem value="porcentaje">Porcentaje de descuento</SelectItem>
                  <SelectItem value="escalonado">Precio por cantidad de personas</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Descuento */}
            {promocion.tipoDescuento === 'porcentaje' ? (
              <div className="space-y-2">
                <Label>Porcentaje de descuento (%)</Label>
                <Input
                  type="number"
                  min="1"
                  max="100"
                  value={promocion.montoDescuento || ''}
                  onChange={(e) => handleChange('montoDescuento', parseFloat(e.target.value))}
                  placeholder="Ej: 20"
                />
                {promocion.montoDescuento && precioBase > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <Info className="inline h-3 w-3 mr-1" />
                    Precio por persona: S/ {(precioBase * (1 - promocion.montoDescuento / 100)).toFixed(2)}
                  </p>
                )}
              </div>
            ) : promocion.tipoDescuento === 'escalonado' ? (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Precios por cantidad de personas</Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const escalones = promocion.escalones || [];
                      handleChange('escalones', [
                        ...escalones,
                        { cantidadPersonas: escalones.length + 1, precioPorPersona: precioBase }
                      ]);
                    }}
                  >
                    Agregar escalón
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Define el precio por persona según la cantidad total (incluyendo el titular)
                </p>
                {(!promocion.escalones || promocion.escalones.length === 0) && (
                  <p className="text-sm text-center text-muted-foreground p-4 border border-dashed rounded">
                    Agrega escalones de precio para comenzar
                  </p>
                )}
                {promocion.escalones && promocion.escalones.length > 0 && (
                  <div className="space-y-2">
                    {promocion.escalones.map((escalon, index) => (
                      <div key={index} className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                        <div className="flex-1 grid grid-cols-2 gap-2">
                          <div className="space-y-1">
                            <Label className="text-xs">Cantidad de personas</Label>
                            <Input
                              type="number"
                              min="1"
                              value={escalon.cantidadPersonas}
                              onChange={(e) => {
                                const nuevosEscalones = [...(promocion.escalones || [])];
                                nuevosEscalones[index] = {
                                  ...escalon,
                                  cantidadPersonas: parseInt(e.target.value) || 1
                                };
                                handleChange('escalones', nuevosEscalones);
                              }}
                            />
                          </div>
                          <div className="space-y-1">
                            <Label className="text-xs">Precio por persona (S/)</Label>
                            <Input
                              type="number"
                              min="0"
                              step="0.01"
                              value={escalon.precioPorPersona}
                              onChange={(e) => {
                                const nuevosEscalones = [...(promocion.escalones || [])];
                                nuevosEscalones[index] = {
                                  ...escalon,
                                  precioPorPersona: parseFloat(e.target.value) || 0
                                };
                                handleChange('escalones', nuevosEscalones);
                              }}
                            />
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const nuevosEscalones = promocion.escalones?.filter((_, i) => i !== index);
                            handleChange('escalones', nuevosEscalones);
                          }}
                        >
                          ✕
                        </Button>
                      </div>
                    ))}
                    {precioBase > 0 && promocion.escalones.length > 0 && (
                      <div className="text-xs space-y-1 p-3 bg-primary/5 rounded-lg">
                        <p className="font-medium">Ejemplo de precios totales:</p>
                        {promocion.escalones.slice(0, 3).map((escalon) => {
                          const total = escalon.cantidadPersonas * escalon.precioPorPersona;
                          const ahorro = (escalon.cantidadPersonas * precioBase) - total;
                          return (
                            <p key={escalon.cantidadPersonas} className="text-muted-foreground">
                              • {escalon.cantidadPersonas} {escalon.cantidadPersonas === 1 ? 'persona' : 'personas'}: 
                              S/ {total.toFixed(2)}
                              {ahorro > 0 && (
                                <span className="text-success ml-1">
                                  (Ahorro: S/ {ahorro.toFixed(2)})
                                </span>
                              )}
                            </p>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                <Label>Precio final con descuento (S/)</Label>
                <Input
                  type="number"
                  min="0"
                  max={precioBase}
                  step="0.01"
                  value={promocion.precioFinal || ''}
                  onChange={(e) => handleChange('precioFinal', parseFloat(e.target.value))}
                  placeholder="Ej: 5.00"
                />
                {promocion.precioFinal !== undefined && precioBase > 0 && (
                  <p className="text-sm text-muted-foreground">
                    <Info className="inline h-3 w-3 mr-1" />
                    Descuento: S/ {(precioBase - promocion.precioFinal).toFixed(2)} (
                    {((1 - promocion.precioFinal / precioBase) * 100).toFixed(0)}%)
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};
