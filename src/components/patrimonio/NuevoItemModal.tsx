import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { crearItem } from '@/services/patrimonio';
import { toast } from '@/hooks/use-toast';
import { CalendarIcon, Gift } from 'lucide-react';

const formSchema = z.object({
  nombre: z.string().min(2, 'El nombre debe tener al menos 2 caracteres'),
  descripcion: z.string().min(5, 'La descripción debe tener al menos 5 caracteres'),
  ubicacionZona: z.string().min(2, 'La zona es requerida'),
  ubicacionReferencia: z.string().optional(),
  cantidad: z.number().min(1, 'La cantidad debe ser mayor a 0'),
  estadoConservacion: z.enum(['bueno', 'regular', 'malo']),
  estadoCondicion: z.enum(['nuevo', 'segunda']),
  estadoObservaciones: z.string().optional(),
  fechaAdquisicion: z.string().min(1, 'La fecha de adquisición es requerida'),
  comprador: z.string().min(2, 'El comprador es requerido'),
  valorEstimado: z.number().min(0, 'El valor debe ser mayor o igual a 0'),
  responsable: z.string().min(2, 'El responsable es requerido'),
  mantenimientoRequiere: z.boolean(),
  mantenimientoEncargado: z.string().optional(),
  mantenimientoProximaFecha: z.string().optional(),
  documentacionTipo: z.enum(['factura', 'boleta', 'contrato', 'garantia', 'otro']).optional(),
  documentacionNumero: z.string().optional(),
  donacionEs: z.boolean(),
  donacionValor: z.number().optional(),
  donacionDonante: z.string().optional(),
  observaciones: z.string().optional(),
}).refine((data) => {
  if (data.mantenimientoRequiere && !data.mantenimientoEncargado) {
    return false;
  }
  return true;
}, {
  message: "Si requiere mantenimiento, debe especificar el encargado",
  path: ["mantenimientoEncargado"],
}).refine((data) => {
  if (data.donacionEs && !data.donacionValor) {
    return false;
  }
  return true;
}, {
  message: "Si es donación, debe especificar el valor aproximado",
  path: ["donacionValor"],
}).refine((data) => {
  if (data.donacionEs && !data.donacionDonante) {
    return false;
  }
  return true;
}, {
  message: "Si es donación, debe especificar el donante",
  path: ["donacionDonante"],
});

type FormData = z.infer<typeof formSchema>;

interface NuevoItemModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function NuevoItemModal({ open, onOpenChange, onSuccess }: NuevoItemModalProps) {
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('general');

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      nombre: '',
      descripcion: '',
      ubicacionZona: '',
      ubicacionReferencia: '',
      cantidad: 1,
      estadoConservacion: 'bueno',
      estadoCondicion: 'nuevo',
      estadoObservaciones: '',
      fechaAdquisicion: new Date().toISOString().split('T')[0],
      comprador: '',
      valorEstimado: 0,
      responsable: '',
      mantenimientoRequiere: false,
      mantenimientoEncargado: '',
      mantenimientoProximaFecha: '',
      documentacionTipo: undefined,
      documentacionNumero: '',
      donacionEs: false,
      donacionValor: undefined,
      donacionDonante: '',
      observaciones: '',
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      setLoading(true);

      const itemData = {
        nombre: data.nombre,
        descripcion: data.descripcion,
        ubicacion: {
          zona: data.ubicacionZona,
          referenciaInterna: data.ubicacionReferencia,
        },
        cantidad: data.cantidad,
        estado: {
          conservacion: data.estadoConservacion,
          condicion: data.estadoCondicion,
          observaciones: data.estadoObservaciones,
        },
        fechaAdquisicion: {
          fecha: data.fechaAdquisicion,
          comprador: data.comprador,
        },
        valorEstimado: data.valorEstimado,
        responsable: data.responsable,
        mantenimiento: {
          requiere: data.mantenimientoRequiere,
          encargado: data.mantenimientoEncargado,
          proximaFecha: data.mantenimientoProximaFecha,
        },
        documentacion: {
          tipoDocumento: data.documentacionTipo,
          numeroDocumento: data.documentacionNumero,
          archivos: [],
          fotos: [],
        },
        donacion: {
          esDonacion: data.donacionEs,
          valorAproximado: data.donacionValor,
          donante: data.donacionDonante,
        },
        observaciones: data.observaciones,
        activo: true,
      };

      await crearItem(itemData);

      toast({
        title: "Item creado",
        description: "El item ha sido agregado al inventario exitosamente",
      });

      form.reset();
      onOpenChange(false);
      onSuccess();
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo crear el item. Intente nuevamente.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const watchDonacion = form.watch('donacionEs');
  const watchMantenimiento = form.watch('mantenimientoRequiere');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Item de Patrimonio</DialogTitle>
          <DialogDescription>
            Complete la información del nuevo item para agregarlo al inventario.
            Se generará automáticamente un código correlativo y código de barras.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general">General</TabsTrigger>
                <TabsTrigger value="estado">Estado</TabsTrigger>
                <TabsTrigger value="mantenimiento">Mantenimiento</TabsTrigger>
                <TabsTrigger value="documentacion">Documentación</TabsTrigger>
              </TabsList>

              <TabsContent value="general" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Información General</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="nombre"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre del objeto o equipo *</FormLabel>
                            <FormControl>
                              <Input placeholder="ej. Extintor, Mueble de recepción" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="cantidad"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Cantidad *</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                min="1"
                                {...field}
                                onChange={(e) => field.onChange(Number(e.target.value))}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="descripcion"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Descripción técnica *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Marca, modelo, características técnicas..."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Incluya marca, modelo y características técnicas relevantes
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="ubicacionZona"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Zona común *</FormLabel>
                            <FormControl>
                              <Input placeholder="ej. Hall de ingreso, Azotea" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="ubicacionReferencia"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Referencia interna</FormLabel>
                            <FormControl>
                              <Input placeholder="Código o referencia interna" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="responsable"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Responsable *</FormLabel>
                          <FormControl>
                            <Input placeholder="Persona o cargo encargado" {...field} />
                          </FormControl>
                          <FormDescription>
                            Persona o cargo encargado de su mantenimiento o supervisión
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="estado" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Estado y Valuación</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="estadoConservacion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Estado de conservación *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar estado" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="bueno">Bueno</SelectItem>
                                <SelectItem value="regular">Regular</SelectItem>
                                <SelectItem value="malo">Malo</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="estadoCondicion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Condición *</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar condición" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="nuevo">Nuevo</SelectItem>
                                <SelectItem value="segunda">Segunda</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="estadoObservaciones"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observaciones del estado</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Desgaste, necesidad de mantenimiento, etc."
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="fechaAdquisicion"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Fecha de adquisición *</FormLabel>
                            <FormControl>
                              <Input type="date" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="comprador"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quien lo compró *</FormLabel>
                            <FormControl>
                              <Input placeholder="Nombre y cargo" {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="valorEstimado"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Valor estimado *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="0"
                              step="100"
                              placeholder="Valor en pesos chilenos"
                              {...field}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                            />
                          </FormControl>
                          <FormDescription>
                            Costo de adquisición o valor actual aproximado
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    {/* Sección de Donación */}
                    <Card className="border-dashed">
                      <CardContent className="pt-6">
                        <FormField
                          control={form.control}
                          name="donacionEs"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="flex items-center gap-2">
                                  <Gift className="w-4 h-4" />
                                  ¿Es una donación?
                                </FormLabel>
                                <FormDescription>
                                  Marque si este item fue recibido como donación
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />

                        {watchDonacion && (
                          <div className="space-y-4 mt-4">
                            <Badge variant="outline" className="text-blue-600">
                              <Gift className="w-3 h-3 mr-1" />
                              Item de donación
                            </Badge>
                            
                            <div className="grid gap-4 md:grid-cols-2">
                              <FormField
                                control={form.control}
                                name="donacionValor"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Valor aproximado de la donación *</FormLabel>
                                    <FormControl>
                                      <Input
                                        type="number"
                                        min="0"
                                        step="100"
                                        placeholder="Valor aproximado"
                                        {...field}
                                        onChange={(e) => field.onChange(Number(e.target.value))}
                                      />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <FormField
                                control={form.control}
                                name="donacionDonante"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Donante *</FormLabel>
                                    <FormControl>
                                      <Input placeholder="Quien hizo la donación" {...field} />
                                    </FormControl>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="mantenimiento" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Mantenimiento</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <FormField
                      control={form.control}
                      name="mantenimientoRequiere"
                      render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                          <div className="space-y-0.5">
                            <FormLabel>¿Requiere mantenimiento?</FormLabel>
                            <FormDescription>
                              Indique si este item necesita mantenimiento periódico
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />

                    {watchMantenimiento && (
                      <div className="space-y-4">
                        <div className="grid gap-4 md:grid-cols-2">
                          <FormField
                            control={form.control}
                            name="mantenimientoEncargado"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Encargado del mantenimiento *</FormLabel>
                                <FormControl>
                                  <Input placeholder="Empresa o persona encargada" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="mantenimientoProximaFecha"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Próxima fecha de mantenimiento</FormLabel>
                                <FormControl>
                                  <Input type="date" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="documentacion" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Documentación</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="documentacionTipo"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Tipo de documento</FormLabel>
                            <Select onValueChange={field.onChange} value={field.value}>
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Seleccionar tipo" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                <SelectItem value="factura">Factura</SelectItem>
                                <SelectItem value="boleta">Boleta</SelectItem>
                                <SelectItem value="contrato">Contrato</SelectItem>
                                <SelectItem value="garantia">Garantía</SelectItem>
                                <SelectItem value="otro">Otro</SelectItem>
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="documentacionNumero"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Número de documento</FormLabel>
                            <FormControl>
                              <Input placeholder="Número de factura, boleta, etc." {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>

                    <FormField
                      control={form.control}
                      name="observaciones"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Observaciones</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Notas sobre reparaciones, traslados, pérdidas, etc."
                              className="min-h-[80px]"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Información adicional sobre el item
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creando...' : 'Crear Item'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}