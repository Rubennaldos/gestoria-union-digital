import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { 
  Plus, 
  Pencil, 
  Trash2, 
  Calendar as CalendarIcon, 
  Users, 
  User,
  Car,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { es } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { 
  crearListaTrabajadores,
  obtenerListasTrabajadores,
  actualizarListaTrabajadores,
  eliminarListaTrabajadores,
  obtenerMaestrosObra
} from "@/services/acceso";
import { Trabajador, MaestroObra } from "@/types/acceso";

interface GestionListasTrabajadoresProps {
  empadronadoId: string;
}

export function GestionListasTrabajadores({ empadronadoId }: GestionListasTrabajadoresProps) {
  const [listas, setListas] = useState<any[]>([]);
  const [maestrosObra, setMaestrosObra] = useState<MaestroObra[]>([]);
  const [modalAbierto, setModalAbierto] = useState(false);
  const [listaEdicion, setListaEdicion] = useState<any | null>(null);
  const [cargando, setCargando] = useState(false);
  
  // Form state
  const [nombreLista, setNombreLista] = useState("");
  const [maestroObraId, setMaestroObraId] = useState("");
  const [tipoAcceso, setTipoAcceso] = useState<"peatonal" | "vehicular">("peatonal");
  const [placas, setPlacas] = useState<{ id: string; placa: string }[]>([{ id: "1", placa: "" }]);
  const [trabajadores, setTrabajadores] = useState<Trabajador[]>([]);
  const [fechaInicio, setFechaInicio] = useState<Date>();
  const [fechaFin, setFechaFin] = useState<Date>();

  const { toast } = useToast();

  useEffect(() => {
    cargarDatos();
  }, [empadronadoId]);

  const cargarDatos = async () => {
    if (!empadronadoId) return;
    
    try {
      const [listasData, maestrosData] = await Promise.all([
        obtenerListasTrabajadores(empadronadoId),
        obtenerMaestrosObra()
      ]);
      setListas(listasData);
      setMaestrosObra(maestrosData);
    } catch (error) {
      console.error("Error al cargar datos:", error);
      toast({
        title: "Error",
        description: "No se pudieron cargar las listas de trabajadores",
        variant: "destructive",
      });
    }
  };

  const abrirModalNuevo = () => {
    resetearFormulario();
    setListaEdicion(null);
    setModalAbierto(true);
  };

  const abrirModalEditar = (lista: any) => {
    setListaEdicion(lista);
    setNombreLista(lista.nombreLista);
    setMaestroObraId(lista.maestroObraId);
    setTipoAcceso(lista.tipoAcceso);
    setPlacas(lista.placas?.map((p: string, i: number) => ({ id: String(i), placa: p })) || [{ id: "1", placa: "" }]);
    setTrabajadores(lista.trabajadores || []);
    setFechaInicio(new Date(lista.fechaInicio));
    setFechaFin(new Date(lista.fechaFin));
    setModalAbierto(true);
  };

  const resetearFormulario = () => {
    setNombreLista("");
    setMaestroObraId("");
    setTipoAcceso("peatonal");
    setPlacas([{ id: "1", placa: "" }]);
    setTrabajadores([]);
    setFechaInicio(undefined);
    setFechaFin(undefined);
  };

  const agregarPlaca = () => {
    setPlacas(prev => [...prev, { id: Date.now().toString(), placa: "" }]);
  };

  const actualizarPlaca = (id: string, valor: string) => {
    setPlacas(prev => prev.map(p => p.id === id ? { ...p, placa: valor.toUpperCase() } : p));
  };

  const eliminarPlaca = (id: string) => {
    setPlacas(prev => prev.length > 1 ? prev.filter(p => p.id !== id) : prev);
  };

  const agregarTrabajador = () => {
    setTrabajadores(prev => [...prev, { 
      id: Date.now().toString(), 
      nombre: "", 
      dni: "", 
      esMaestroObra: false 
    }]);
  };

  const actualizarTrabajador = (id: string, campo: "nombre" | "dni", valor: string) => {
    setTrabajadores(prev => prev.map(t => t.id === id ? { ...t, [campo]: valor } : t));
  };

  const eliminarTrabajador = (id: string) => {
    setTrabajadores(prev => prev.filter(t => t.id !== id));
  };

  const validarFormulario = (): boolean => {
    if (!nombreLista.trim()) {
      toast({ title: "Error", description: "Ingrese un nombre para la lista", variant: "destructive" });
      return false;
    }
    if (!maestroObraId) {
      toast({ title: "Error", description: "Seleccione un maestro de obra", variant: "destructive" });
      return false;
    }
    if (!fechaInicio || !fechaFin) {
      toast({ title: "Error", description: "Seleccione fechas de inicio y fin", variant: "destructive" });
      return false;
    }
    
    const diffDays = differenceInDays(fechaFin, fechaInicio);
    if (diffDays > 30) {
      toast({ title: "Error", description: "El período máximo es de 30 días", variant: "destructive" });
      return false;
    }
    if (diffDays < 0) {
      toast({ title: "Error", description: "La fecha de fin debe ser posterior a la de inicio", variant: "destructive" });
      return false;
    }

    if (tipoAcceso === "vehicular") {
      const placasValidas = placas.filter(p => p.placa.trim());
      if (placasValidas.length === 0) {
        toast({ title: "Error", description: "Agregue al menos una placa", variant: "destructive" });
        return false;
      }
    }

    const trabajadoresValidos = trabajadores.filter(t => t.nombre.trim() && t.dni.trim());
    if (trabajadoresValidos.length === 0) {
      toast({ title: "Error", description: "Agregue al menos un trabajador", variant: "destructive" });
      return false;
    }

    return true;
  };

  const guardarLista = async () => {
    if (!validarFormulario()) return;
    
    setCargando(true);
    try {
      const trabajadoresLimpios = trabajadores
        .filter(t => t.nombre.trim() && t.dni.trim())
        .map(t => ({ nombre: t.nombre.trim(), dni: t.dni.trim(), esMaestroObra: false }));

      const placasLimpias = placas
        .map(p => p.placa.trim().toUpperCase())
        .filter(p => p);

      const payload = {
        empadronadoId,
        nombreLista: nombreLista.trim(),
        maestroObraId,
        tipoAcceso,
        placa: tipoAcceso === "vehicular" && placasLimpias.length > 0 ? placasLimpias[0] : undefined,
        placas: tipoAcceso === "vehicular" ? placasLimpias : undefined,
        trabajadores: trabajadoresLimpios,
        fechaInicio: fechaInicio!.getTime(),
        fechaFin: fechaFin!.getTime(),
      };

      if (listaEdicion) {
        await actualizarListaTrabajadores(listaEdicion.id, payload);
        toast({ title: "Éxito", description: "Lista actualizada correctamente" });
      } else {
        await crearListaTrabajadores(payload);
        toast({ title: "Éxito", description: "Lista creada correctamente" });
      }

      setModalAbierto(false);
      await cargarDatos();
    } catch (error: any) {
      toast({ 
        title: "Error", 
        description: error.message || "No se pudo guardar la lista", 
        variant: "destructive" 
      });
    } finally {
      setCargando(false);
    }
  };

  const eliminarLista = async (id: string) => {
    if (!confirm("¿Está seguro de eliminar esta lista?")) return;
    
    try {
      await eliminarListaTrabajadores(id);
      toast({ title: "Éxito", description: "Lista eliminada correctamente" });
      await cargarDatos();
    } catch (error) {
      toast({ title: "Error", description: "No se pudo eliminar la lista", variant: "destructive" });
    }
  };

  const esListaActiva = (lista: any): boolean => {
    const ahora = Date.now();
    return lista.fechaInicio <= ahora && lista.fechaFin >= ahora && lista.activa;
  };

  const esListaVencida = (lista: any): boolean => {
    return lista.fechaFin < Date.now();
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Listas de Trabajadores Recurrentes</h3>
          <p className="text-sm text-muted-foreground">
            Gestione listas de trabajadores que ingresan regularmente
          </p>
        </div>
        <Button onClick={abrirModalNuevo} className="flex items-center gap-2">
          <Plus className="h-4 w-4" />
          Nueva Lista
        </Button>
      </div>

      <div className="grid gap-4">
        {listas.length === 0 ? (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No hay listas creadas</p>
              <p className="text-sm">Cree una lista para gestionar trabajadores recurrentes</p>
            </CardContent>
          </Card>
        ) : (
          listas.map((lista) => (
            <Card key={lista.id} className={cn(
              esListaActiva(lista) && "border-primary",
              esListaVencida(lista) && "opacity-60"
            )}>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      {lista.nombreLista}
                      {esListaActiva(lista) ? (
                        <Badge variant="default" className="flex items-center gap-1">
                          <CheckCircle2 className="h-3 w-3" />
                          Activa
                        </Badge>
                      ) : esListaVencida(lista) ? (
                        <Badge variant="secondary">Vencida</Badge>
                      ) : (
                        <Badge variant="outline">Programada</Badge>
                      )}
                    </CardTitle>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="h-3 w-3" />
                        {format(lista.fechaInicio, "dd MMM yyyy", { locale: es })} - {format(lista.fechaFin, "dd MMM yyyy", { locale: es })}
                      </span>
                      <span className="flex items-center gap-1">
                        {lista.tipoAcceso === "vehicular" ? <Car className="h-3 w-3" /> : <User className="h-3 w-3" />}
                        {lista.tipoAcceso === "vehicular" ? "Vehicular" : "Peatonal"}
                      </span>
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {lista.trabajadores?.length || 0} trabajadores
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => abrirModalEditar(lista)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => eliminarLista(lista.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="font-medium">Maestro de Obra: </span>
                    {maestrosObra.find(m => m.id === lista.maestroObraId)?.nombre || lista.maestroObraId}
                  </div>
                  {lista.tipoAcceso === "vehicular" && lista.placas && (
                    <div>
                      <span className="font-medium">Placas: </span>
                      {lista.placas.join(", ")}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Modal para crear/editar lista */}
      <Dialog open={modalAbierto} onOpenChange={setModalAbierto}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {listaEdicion ? "Editar Lista de Trabajadores" : "Nueva Lista de Trabajadores"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Nombre de la lista */}
            <div className="space-y-2">
              <Label>Nombre de la Lista *</Label>
              <Input
                value={nombreLista}
                onChange={(e) => setNombreLista(e.target.value)}
                placeholder="Ej: Trabajadores Construcción Lote 5"
              />
            </div>

            {/* Fechas */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha de Inicio *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaInicio && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaInicio ? format(fechaInicio, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaInicio}
                      onSelect={setFechaInicio}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Fin * (máx. 30 días)</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !fechaFin && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {fechaFin ? format(fechaFin, "PPP", { locale: es }) : "Seleccionar fecha"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={fechaFin}
                      onSelect={setFechaFin}
                      disabled={(date) => {
                        if (!fechaInicio) return false;
                        const diff = differenceInDays(date, fechaInicio);
                        return diff < 0 || diff > 30;
                      }}
                      initialFocus
                      className="pointer-events-auto"
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            {fechaInicio && fechaFin && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground p-3 bg-muted/30 rounded-lg">
                <AlertCircle className="h-4 w-4" />
                Duración: {differenceInDays(fechaFin, fechaInicio) + 1} días
              </div>
            )}

            <Separator />

            {/* Tipo de Acceso */}
            <div className="space-y-3">
              <Label className="text-base font-medium">Tipo de Acceso</Label>
              <RadioGroup value={tipoAcceso} onValueChange={(v) => setTipoAcceso(v as any)} className="flex gap-6">
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="peatonal" id="peatonal-lista" />
                  <Label htmlFor="peatonal-lista" className="flex items-center gap-2">
                    <User className="h-4 w-4" />Peatonal
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="vehicular" id="vehicular-lista" />
                  <Label htmlFor="vehicular-lista" className="flex items-center gap-2">
                    <Car className="h-4 w-4" />Vehicular
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Placas */}
            {tipoAcceso === "vehicular" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Placas de Vehículos *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={agregarPlaca}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Placa
                  </Button>
                </div>
                
                {placas.map((item, index) => (
                  <div key={item.id} className="flex gap-4 items-end">
                    <div className="flex-1 space-y-2">
                      <Label>Placa {index + 1}</Label>
                      <Input
                        value={item.placa}
                        onChange={(e) => actualizarPlaca(item.id, e.target.value)}
                        placeholder="ABC-123"
                        className="font-mono"
                      />
                    </div>
                    {placas.length > 1 && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => eliminarPlaca(item.id)}
                      >
                        Eliminar
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Separator />

            {/* Maestro de Obra */}
            <div className="space-y-2">
              <Label className="text-base font-medium">Maestro de Obra *</Label>
              <Select value={maestroObraId} onValueChange={setMaestroObraId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Seleccione un maestro de obra" />
                </SelectTrigger>
                <SelectContent>
                  {maestrosObra.map((maestro) => (
                    <SelectItem key={maestro.id} value={maestro.id}>
                      <div className="flex items-center justify-between w-full gap-3">
                        <span className="font-medium">{maestro.nombre}</span>
                        {maestro.dni && (
                          <span className="text-xs text-muted-foreground">DNI: {maestro.dni}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Separator />

            {/* Trabajadores */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-medium">Trabajadores *</Label>
                <Button type="button" variant="outline" size="sm" onClick={agregarTrabajador}>
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar
                </Button>
              </div>

              {trabajadores.map((t) => (
                <Card key={t.id} className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Nombre</Label>
                      <Input 
                        value={t.nombre} 
                        onChange={(e) => actualizarTrabajador(t.id, "nombre", e.target.value)} 
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>DNI</Label>
                      <Input 
                        value={t.dni} 
                        onChange={(e) => actualizarTrabajador(t.id, "dni", e.target.value)} 
                      />
                    </div>
                    <div className="flex items-end">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm" 
                        onClick={() => eliminarTrabajador(t.id)} 
                        className="w-full"
                      >
                        Eliminar
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setModalAbierto(false)}>
              Cancelar
            </Button>
            <Button onClick={guardarLista} disabled={cargando}>
              {cargando ? "Guardando..." : listaEdicion ? "Actualizar" : "Crear Lista"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
