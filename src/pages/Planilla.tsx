import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, Clock, ShieldCheck, UserCheck, UserX, Edit, Trash2, UserMinus, MoreVertical, Briefcase, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BackButton from "@/components/layout/BackButton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PersonalPlanilla } from "@/types/planilla";
import { getPersonalPlanilla, getPlanillaStats, puedeAccederAhora, updatePersonalPlanilla, deletePersonalPlanilla } from "@/services/planilla";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";
import { createPersonalPlanilla } from "@/services/planilla";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

const DIAS_SEMANA = [
  { value: 'lunes', label: 'Lunes' },
  { value: 'martes', label: 'Martes' },
  { value: 'miercoles', label: 'Miércoles' },
  { value: 'jueves', label: 'Jueves' },
  { value: 'viernes', label: 'Viernes' },
  { value: 'sabado', label: 'Sábado' },
  { value: 'domingo', label: 'Domingo' },
];

export default function Planilla() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [personal, setPersonal] = useState<PersonalPlanilla[]>([]);
  const [empadronados, setEmpadronados] = useState<Empadronado[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPersonal, setEditingPersonal] = useState<PersonalPlanilla | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [despedirConfirmOpen, setDespedirConfirmOpen] = useState(false);
  const [selectedPersonal, setSelectedPersonal] = useState<PersonalPlanilla | null>(null);
  
  // Stats
  const [stats, setStats] = useState({
    totalPersonal: 0,
    activos: 0,
    inactivos: 0,
    conAccesoSistema: 0,
  });
  
  // Form data
  const [formData, setFormData] = useState({
    empadronadoId: "",
    funcion: "",
    areaAsignada: "",
    fechaContratacion: new Date().toISOString().split('T')[0],
    activo: true,
    sueldo: "",
    tipoContrato: "indefinido" as "indefinido" | "planilla" | "recibo_honorarios" | "temporal",
    frecuenciaPago: "mensual" as "mensual" | "quincenal" | "semanal",
    tieneAccesoSistema: false,
    observaciones: "",
    horariosAcceso: DIAS_SEMANA.map(dia => ({
      dia: dia.value as any,
      horaInicio: "08:00",
      horaFin: "18:00",
      activo: false,
    })),
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [personalData, empadronadosData, statsData] = await Promise.all([
        getPersonalPlanilla(),
        getEmpadronados(),
        getPlanillaStats(),
      ]);
      
      setPersonal(personalData);
      setEmpadronados(empadronadosData);
      setStats(statsData);
    } catch (error) {
      console.error("Error loading data:", error);
      toast({
        title: "Error",
        description: "No se pudo cargar la información",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;
    
    try {
      if (editingPersonal) {
        // Actualizar personal existente
        await updatePersonalPlanilla(editingPersonal.id, {
          funcion: formData.funcion,
          areaAsignada: formData.areaAsignada || undefined,
          fechaContratacion: new Date(formData.fechaContratacion).getTime(),
          activo: formData.activo,
          sueldo: formData.sueldo ? parseFloat(formData.sueldo) : undefined,
          tipoContrato: formData.tipoContrato,
          frecuenciaPago: formData.frecuenciaPago,
          tieneAccesoSistema: formData.tieneAccesoSistema,
          horariosAcceso: formData.horariosAcceso,
          observaciones: formData.observaciones || undefined,
        }, user.uid);
        
        toast({
          title: "Personal actualizado",
          description: "Los datos del personal han sido actualizados exitosamente",
        });
      } else {
        // Crear nuevo personal
        await createPersonalPlanilla({
          empadronadoId: formData.empadronadoId,
          funcion: formData.funcion,
          areaAsignada: formData.areaAsignada || undefined,
          fechaContratacion: new Date(formData.fechaContratacion).getTime(),
          activo: formData.activo,
          sueldo: formData.sueldo ? parseFloat(formData.sueldo) : undefined,
          tipoContrato: formData.tipoContrato,
          frecuenciaPago: formData.frecuenciaPago,
          tieneAccesoSistema: formData.tieneAccesoSistema,
          horariosAcceso: formData.horariosAcceso,
          observaciones: formData.observaciones || undefined,
        }, user.uid);
        
        toast({
          title: "Personal agregado",
          description: "El personal ha sido agregado a la planilla exitosamente",
        });
      }
      
      setDialogOpen(false);
      setEditingPersonal(null);
      loadData();
      
      // Reset form
      setFormData({
        empadronadoId: "",
        funcion: "",
        areaAsignada: "",
        fechaContratacion: new Date().toISOString().split('T')[0],
        activo: true,
        sueldo: "",
        tipoContrato: "indefinido" as const,
        frecuenciaPago: "mensual" as const,
        tieneAccesoSistema: false,
        observaciones: "",
        horariosAcceso: DIAS_SEMANA.map(dia => ({
          dia: dia.value as any,
          horaInicio: "08:00",
          horaFin: "18:00",
          activo: false,
        })),
      });
    } catch (error) {
      console.error("Error saving personal:", error);
      toast({
        title: "Error",
        description: editingPersonal ? "No se pudo actualizar el personal" : "No se pudo agregar el personal",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (personal: PersonalPlanilla) => {
    setEditingPersonal(personal);
    setFormData({
      empadronadoId: personal.empadronadoId,
      funcion: personal.funcion,
      areaAsignada: personal.areaAsignada || "",
      fechaContratacion: new Date(personal.fechaContratacion).toISOString().split('T')[0],
      activo: personal.activo,
      sueldo: personal.sueldo?.toString() || "",
      tipoContrato: personal.tipoContrato || "indefinido",
      frecuenciaPago: personal.frecuenciaPago || "mensual",
      tieneAccesoSistema: personal.tieneAccesoSistema,
      observaciones: personal.observaciones || "",
      horariosAcceso: personal.horariosAcceso,
    });
    setDialogOpen(true);
  };

  const handleDespedir = async () => {
    if (!selectedPersonal || !user) return;
    
    try {
      await updatePersonalPlanilla(selectedPersonal.id, {
        activo: false,
        observaciones: `${selectedPersonal.observaciones || ''}\nDespedido el ${new Date().toLocaleDateString()}`.trim(),
      }, user.uid);
      
      toast({
        title: "Personal despedido",
        description: "El personal ha sido marcado como inactivo",
      });
      
      setDespedirConfirmOpen(false);
      setSelectedPersonal(null);
      loadData();
    } catch (error) {
      console.error("Error despidiendo personal:", error);
      toast({
        title: "Error",
        description: "No se pudo despedir al personal",
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!selectedPersonal) return;
    
    try {
      await deletePersonalPlanilla(selectedPersonal.id);
      
      toast({
        title: "Personal eliminado",
        description: "El personal ha sido eliminado de la planilla",
      });
      
      setDeleteConfirmOpen(false);
      setSelectedPersonal(null);
      loadData();
    } catch (error) {
      console.error("Error deleting personal:", error);
      toast({
        title: "Error",
        description: "No se pudo eliminar al personal",
        variant: "destructive",
      });
    }
  };

  const personalFiltrado = personal.filter(p => {
    const searchLower = busqueda.toLowerCase();
    return (
      p.nombreCompleto.toLowerCase().includes(searchLower) ||
      p.dni.includes(searchLower) ||
      p.funcion.toLowerCase().includes(searchLower)
    );
  });

  const empadronadosDisponibles = empadronados.filter(e => 
    !personal.some(p => p.empadronadoId === e.id)
  );

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 md:px-8 py-8 md:py-12 space-y-8 md:space-y-10">
        <div className="flex items-center gap-4 md:gap-6">
          <BackButton />
          <div className="space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              Planilla de Personal
            </h1>
            <p className="text-muted-foreground text-base md:text-lg">Gestión de personal contratado y control de accesos</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] border-2 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6 md:pt-8 px-6 md:px-8">
              <CardTitle className="text-sm md:text-base font-medium text-muted-foreground">Total Personal</CardTitle>
              <div className="p-4 md:p-5 bg-primary/10 rounded-2xl group-hover:bg-primary/20 group-hover:scale-110 transition-all duration-300">
                <Users className="h-6 w-6 md:h-7 md:w-7 text-primary" />
              </div>
            </CardHeader>
            <CardContent className="relative px-6 md:px-8 pb-6 md:pb-8">
              <div className="text-5xl md:text-6xl font-bold mb-3">{stats.totalPersonal}</div>
              <p className="text-sm md:text-base text-muted-foreground">Personal registrado</p>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] border-2 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-success/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6 md:pt-8 px-6 md:px-8">
              <CardTitle className="text-sm md:text-base font-medium text-muted-foreground">Activos</CardTitle>
              <div className="p-4 md:p-5 bg-success/10 rounded-2xl group-hover:bg-success/20 group-hover:scale-110 transition-all duration-300">
                <UserCheck className="h-6 w-6 md:h-7 md:w-7 text-success" />
              </div>
            </CardHeader>
            <CardContent className="relative px-6 md:px-8 pb-6 md:pb-8">
              <div className="text-5xl md:text-6xl font-bold mb-3 text-success">{stats.activos}</div>
              <p className="text-sm md:text-base text-muted-foreground">En servicio activo</p>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] border-2 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-muted/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6 md:pt-8 px-6 md:px-8">
              <CardTitle className="text-sm md:text-base font-medium text-muted-foreground">Inactivos</CardTitle>
              <div className="p-4 md:p-5 bg-muted/10 rounded-2xl group-hover:bg-muted/20 group-hover:scale-110 transition-all duration-300">
                <UserX className="h-6 w-6 md:h-7 md:w-7 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent className="relative px-6 md:px-8 pb-6 md:pb-8">
              <div className="text-5xl md:text-6xl font-bold mb-3 text-muted-foreground">{stats.inactivos}</div>
              <p className="text-sm md:text-base text-muted-foreground">Fuera de servicio</p>
            </CardContent>
          </Card>
          
          <Card className="group hover:shadow-2xl transition-all duration-300 hover:scale-[1.03] border-2 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-6 pt-6 md:pt-8 px-6 md:px-8">
              <CardTitle className="text-sm md:text-base font-medium text-muted-foreground">Con Acceso Sistema</CardTitle>
              <div className="p-4 md:p-5 bg-accent/10 rounded-2xl group-hover:bg-accent/20 group-hover:scale-110 transition-all duration-300">
                <ShieldCheck className="h-6 w-6 md:h-7 md:w-7 text-accent-foreground" />
              </div>
            </CardHeader>
            <CardContent className="relative px-6 md:px-8 pb-6 md:pb-8">
              <div className="text-5xl md:text-6xl font-bold mb-3 text-accent-foreground">{stats.conAccesoSistema}</div>
              <p className="text-sm md:text-base text-muted-foreground">Acceso autorizado</p>
            </CardContent>
          </Card>
        </div>

        {/* Search and Actions */}
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
              <div className="relative flex-1 w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nombre, DNI o función..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => {
                setDialogOpen(open);
                if (!open) {
                  setEditingPersonal(null);
                  setFormData({
                    empadronadoId: "",
                    funcion: "",
                    areaAsignada: "",
                    fechaContratacion: new Date().toISOString().split('T')[0],
                    activo: true,
                    sueldo: "",
                    tipoContrato: "indefinido" as const,
                    frecuenciaPago: "mensual" as const,
                    tieneAccesoSistema: false,
                    observaciones: "",
                    horariosAcceso: DIAS_SEMANA.map(dia => ({
                      dia: dia.value as any,
                      horaInicio: "08:00",
                      horaFin: "18:00",
                      activo: false,
                    })),
                  });
                }
              }}>
                <DialogTrigger asChild>
                  <Button size="lg" className="shadow-lg hover:shadow-2xl transition-all duration-300 h-12 md:h-14 px-6 md:px-8 text-base md:text-lg">
                    <Plus className="mr-2 h-5 w-5 md:h-6 md:w-6" />
                    Agregar Personal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-5xl max-h-[92vh] overflow-hidden flex flex-col p-0" aria-describedby="dialog-description">
                  <DialogHeader className="pb-6 pt-8 px-6 md:px-10 border-b">
                    <DialogTitle className="text-2xl md:text-3xl font-bold">{editingPersonal ? 'Editar Personal' : 'Agregar Personal a Planilla'}</DialogTitle>
                    <DialogDescription id="dialog-description" className="text-base md:text-lg mt-2">
                      {editingPersonal ? 'Actualiza la información del personal' : 'Completa el formulario para agregar personal a la planilla'}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto">
                    <Tabs defaultValue="basicos" className="w-full">
                      <div className="px-6 md:px-10 pt-6">
                        <TabsList className="grid w-full grid-cols-3 h-auto p-1.5 bg-muted/50">
                          <TabsTrigger value="basicos" className="gap-2 py-3.5 md:py-4 text-sm md:text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <Users className="h-4 w-4 md:h-5 md:w-5" />
                            <span className="hidden sm:inline">Datos Básicos</span>
                            <span className="sm:hidden">Básicos</span>
                          </TabsTrigger>
                          <TabsTrigger value="laborales" className="gap-2 py-3.5 md:py-4 text-sm md:text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <Briefcase className="h-4 w-4 md:h-5 md:w-5" />
                            <span className="hidden sm:inline">Datos Laborales</span>
                            <span className="sm:hidden">Laborales</span>
                          </TabsTrigger>
                          <TabsTrigger value="acceso" className="gap-2 py-3.5 md:py-4 text-sm md:text-base font-medium data-[state=active]:bg-background data-[state=active]:shadow-md">
                            <ShieldCheck className="h-4 w-4 md:h-5 md:w-5" />
                            <span className="hidden sm:inline">Acceso al Sistema</span>
                            <span className="sm:hidden">Acceso</span>
                          </TabsTrigger>
                        </TabsList>
                      </div>

                      {/* Tab: Datos Básicos */}
                      <TabsContent value="basicos" className="space-y-6 md:space-y-8 mt-8 px-6 md:px-10 pb-6">
                        {!editingPersonal && (
                          <div className="space-y-3">
                            <Label htmlFor="empadronado" className="text-base md:text-lg font-semibold">Seleccionar Persona *</Label>
                            <Select
                              value={formData.empadronadoId}
                              onValueChange={(value) => setFormData({ ...formData, empadronadoId: value })}
                              required
                            >
                              <SelectTrigger className="h-12 md:h-14 text-base">
                                <SelectValue placeholder="Seleccione una persona" />
                              </SelectTrigger>
                              <SelectContent>
                                {empadronadosDisponibles.map((emp) => (
                                  <SelectItem key={emp.id} value={emp.id} className="text-base">
                                    {emp.nombre} {emp.apellidos} - {emp.dni}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">Persona del padrón que será agregada</p>
                          </div>
                        )}

                        <div className="space-y-3">
                          <Label htmlFor="funcion" className="text-base md:text-lg font-semibold">Función / Cargo *</Label>
                          <Input
                            id="funcion"
                            value={formData.funcion}
                            onChange={(e) => setFormData({ ...formData, funcion: e.target.value })}
                            placeholder="Ej: Guardia de seguridad"
                            required
                            className="h-12 md:h-14 text-base"
                          />
                          <p className="text-sm text-muted-foreground">Rol o función que desempeñará</p>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="area" className="text-base md:text-lg font-semibold">Área Asignada</Label>
                          <Input
                            id="area"
                            value={formData.areaAsignada}
                            onChange={(e) => setFormData({ ...formData, areaAsignada: e.target.value })}
                            placeholder="Ej: Pórtico principal"
                            className="h-12 md:h-14 text-base"
                          />
                          <p className="text-sm text-muted-foreground">Zona donde trabajará (opcional)</p>
                        </div>

                        <div className="space-y-3">
                          <Label htmlFor="fecha" className="text-base md:text-lg font-semibold">Fecha de Contratación *</Label>
                          <Input
                            id="fecha"
                            type="date"
                            value={formData.fechaContratacion}
                            onChange={(e) => setFormData({ ...formData, fechaContratacion: e.target.value })}
                            required
                            className="h-12 md:h-14 text-base"
                          />
                          <p className="text-sm text-muted-foreground">Fecha de inicio de labores</p>
                        </div>

                        <div className="flex items-center justify-between p-5 md:p-7 bg-muted/30 rounded-xl border-2">
                          <div className="space-y-1.5">
                            <Label htmlFor="activo" className="text-base md:text-lg font-semibold cursor-pointer">Personal Activo</Label>
                            <p className="text-sm text-muted-foreground">Está actualmente en servicio</p>
                          </div>
                          <Switch
                            id="activo"
                            checked={formData.activo}
                            onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                            className="scale-110"
                          />
                        </div>
                      </TabsContent>

                       {/* Tab: Datos Laborales */}
                      <TabsContent value="laborales" className="space-y-6 md:space-y-8 mt-8 px-6 md:px-10 pb-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
                          <div className="space-y-3">
                            <Label htmlFor="sueldo" className="text-base md:text-lg font-semibold">Sueldo Mensual</Label>
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground text-base">S/</span>
                              <Input
                                id="sueldo"
                                type="number"
                                step="0.01"
                                value={formData.sueldo}
                                onChange={(e) => setFormData({ ...formData, sueldo: e.target.value })}
                                placeholder="0.00"
                                className="h-12 md:h-14 pl-10 md:pl-12 text-base"
                              />
                            </div>
                            <p className="text-sm text-muted-foreground">Remuneración (opcional)</p>
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="tipoContrato" className="text-base md:text-lg font-semibold">Tipo de Contrato</Label>
                            <Select
                              value={formData.tipoContrato}
                              onValueChange={(value: any) => setFormData({ ...formData, tipoContrato: value })}
                            >
                              <SelectTrigger className="h-12 md:h-14 text-base">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="planilla" className="text-base">Planilla</SelectItem>
                                <SelectItem value="recibo_honorarios" className="text-base">Recibo Honorarios</SelectItem>
                                <SelectItem value="temporal" className="text-base">Temporal</SelectItem>
                                <SelectItem value="indefinido" className="text-base">Indefinido</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">Modalidad</p>
                          </div>

                          <div className="space-y-3">
                            <Label htmlFor="frecuencia" className="text-base md:text-lg font-semibold">Frecuencia de Pago</Label>
                            <Select
                              value={formData.frecuenciaPago}
                              onValueChange={(value: any) => setFormData({ ...formData, frecuenciaPago: value })}
                            >
                              <SelectTrigger className="h-12 md:h-14 text-base">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="semanal" className="text-base">Semanal</SelectItem>
                                <SelectItem value="quincenal" className="text-base">Quincenal</SelectItem>
                                <SelectItem value="mensual" className="text-base">Mensual</SelectItem>
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">Periodicidad</p>
                          </div>
                        </div>

                        <Separator className="my-6 md:my-8" />

                        <div className="space-y-3">
                          <Label htmlFor="observaciones" className="text-base md:text-lg font-semibold">Observaciones</Label>
                          <Input
                            id="observaciones"
                            value={formData.observaciones}
                            onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                            placeholder="Información adicional"
                            className="h-12 md:h-14 text-base"
                          />
                          <p className="text-sm text-muted-foreground">Notas adicionales (opcional)</p>
                        </div>
                      </TabsContent>

                      {/* Tab: Acceso al Sistema */}
                      <TabsContent value="acceso" className="space-y-6 md:space-y-8 mt-8 px-6 md:px-10 pb-6">
                        <div className="flex items-center justify-between p-5 md:p-7 bg-gradient-to-r from-primary/5 to-accent/5 rounded-xl border-2 border-dashed border-primary/30">
                          <div className="space-y-1.5">
                            <Label htmlFor="acceso2" className="text-base md:text-lg font-semibold cursor-pointer">Permitir Acceso</Label>
                            <p className="text-sm text-muted-foreground">Inicio de sesión al sistema</p>
                          </div>
                          <Switch
                            id="acceso2"
                            checked={formData.tieneAccesoSistema}
                            onCheckedChange={(checked) => setFormData({ ...formData, tieneAccesoSistema: checked })}
                            className="scale-110"
                          />
                        </div>

                        {formData.tieneAccesoSistema && (
                          <div className="space-y-5 md:space-y-7 border-2 rounded-2xl p-5 md:p-8 bg-card shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b">
                              <div>
                                <Label className="text-lg md:text-xl font-bold">Horarios de Acceso</Label>
                                <p className="text-sm md:text-base text-muted-foreground mt-1.5">Define días y horarios permitidos</p>
                              </div>
                              <Button
                                type="button"
                                variant="outline"
                                size="lg"
                                onClick={() => {
                                  const newHorarios = formData.horariosAcceso.map(h => ({
                                    ...h,
                                    activo: true,
                                    horaInicio: "00:00",
                                    horaFin: "23:59",
                                  }));
                                  setFormData({ ...formData, horariosAcceso: newHorarios });
                                }}
                                className="gap-2 w-full md:w-auto h-11"
                              >
                                <Clock className="h-4 w-4" />
                                Habilitar 24h Todos
                              </Button>
                            </div>
                            
                            <div className="space-y-3 md:space-y-4">
                              {formData.horariosAcceso.map((horario, index) => (
                                <div key={horario.dia} className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-5 p-4 md:p-5 rounded-xl border-2 bg-gradient-to-r from-muted/30 to-muted/10 hover:from-muted/50 hover:to-muted/20 transition-all duration-200">
                                  <div className="flex items-center gap-4 min-w-[140px]">
                                    <Checkbox
                                      checked={horario.activo}
                                      onCheckedChange={(checked) => {
                                        const newHorarios = [...formData.horariosAcceso];
                                        newHorarios[index].activo = checked as boolean;
                                        setFormData({ ...formData, horariosAcceso: newHorarios });
                                      }}
                                      className="h-5 w-5"
                                    />
                                    <span className="text-sm md:text-base font-semibold min-w-[90px]">{DIAS_SEMANA[index].label}</span>
                                  </div>
                                  <div className="flex items-center gap-3 flex-1 w-full">
                                    <Input
                                      type="time"
                                      value={horario.horaInicio}
                                      onChange={(e) => {
                                        const newHorarios = [...formData.horariosAcceso];
                                        newHorarios[index].horaInicio = e.target.value;
                                        setFormData({ ...formData, horariosAcceso: newHorarios });
                                      }}
                                      disabled={!horario.activo}
                                      className="flex-1 h-11 md:h-12 text-sm md:text-base font-medium"
                                    />
                                    <span className="text-sm md:text-base text-muted-foreground font-semibold">a</span>
                                    <Input
                                      type="time"
                                      value={horario.horaFin}
                                      onChange={(e) => {
                                        const newHorarios = [...formData.horariosAcceso];
                                        newHorarios[index].horaFin = e.target.value;
                                        setFormData({ ...formData, horariosAcceso: newHorarios });
                                      }}
                                      disabled={!horario.activo}
                                      className="flex-1 h-11 md:h-12 text-sm md:text-base font-medium"
                                    />
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        const newHorarios = [...formData.horariosAcceso];
                                        newHorarios[index].horaInicio = "00:00";
                                        newHorarios[index].horaFin = "23:59";
                                        setFormData({ ...formData, horariosAcceso: newHorarios });
                                      }}
                                      disabled={!horario.activo}
                                      className="text-xs md:text-sm gap-1.5 h-9 md:h-10 px-3"
                                    >
                                      <Clock className="h-3.5 w-3.5" />
                                      <span>24h</span>
                                    </Button>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {!formData.tieneAccesoSistema && (
                          <div className="text-center py-12 md:py-16 px-6 border-2 border-dashed rounded-2xl bg-gradient-to-b from-muted/20 to-muted/5">
                            <ShieldCheck className="h-16 w-16 md:h-20 md:w-20 mx-auto text-muted-foreground/30 mb-5" />
                            <p className="text-sm md:text-base text-muted-foreground font-medium">Activa "Permitir Acceso" arriba para configurar horarios del sistema</p>
                          </div>
                        )}
                      </TabsContent>
                    </Tabs>

                    <Separator className="my-6 md:my-8" />

                    <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 md:gap-4 px-6 md:px-10 pb-6">
                      <Button type="button" variant="outline" size="lg" className="w-full sm:w-auto h-12 md:h-14 px-8 text-base" onClick={() => {
                        setDialogOpen(false);
                        setEditingPersonal(null);
                      }}>
                        Cancelar
                      </Button>
                      <Button type="submit" size="lg" className="w-full sm:w-auto md:min-w-[180px] h-12 md:h-14 px-8 text-base font-semibold shadow-lg hover:shadow-xl transition-all">
                        {editingPersonal ? 'Actualizar Personal' : 'Agregar Personal'}
                      </Button>
                    </div>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Cargando...</div>
            ) : personalFiltrado.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No se encontró personal
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>DNI</TableHead>
                    <TableHead>Función</TableHead>
                    <TableHead>Sueldo</TableHead>
                    <TableHead>Contrato</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead>Horario Sistema</TableHead>
                    <TableHead>Puede Acceder</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {personalFiltrado.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.nombreCompleto}</TableCell>
                      <TableCell>{p.dni}</TableCell>
                      <TableCell>
                        <div className="max-w-[200px]">
                          <div className="font-medium">{p.funcion}</div>
                          {p.areaAsignada && (
                            <div className="text-xs text-muted-foreground">{p.areaAsignada}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {p.sueldo ? (
                          <div>
                            <div className="font-medium">S/ {p.sueldo.toFixed(2)}</div>
                            <div className="text-xs text-muted-foreground capitalize">
                              {p.frecuenciaPago || 'mensual'}
                            </div>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.tipoContrato ? (
                          <Badge variant="outline">
                            {p.tipoContrato === 'planilla' && 'Planilla'}
                            {p.tipoContrato === 'recibo_honorarios' && 'Recibo Honorarios'}
                            {p.tipoContrato === 'temporal' && 'Temporal'}
                            {p.tipoContrato === 'indefinido' && 'Indefinido'}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.tipoPersonal === 'personal_seguridad' ? 'default' : 'secondary'}>
                          {p.tipoPersonal === 'personal_seguridad' ? 'Seguridad' : 'Residente'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.activo ? 'default' : 'secondary'}>
                          {p.activo ? 'Activo' : 'Inactivo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {p.tieneAccesoSistema ? (
                          <div className="text-xs">
                            {p.horariosAcceso.filter(h => h.activo).length > 0 ? (
                              <div className="space-y-1">
                                {p.horariosAcceso.filter(h => h.activo).slice(0, 2).map((h, i) => (
                                  <div key={i} className="text-muted-foreground">
                                    {h.dia.substring(0, 3).toUpperCase()}: {h.horaInicio} - {h.horaFin}
                                  </div>
                                ))}
                                {p.horariosAcceso.filter(h => h.activo).length > 2 && (
                                  <div className="text-muted-foreground">
                                    +{p.horariosAcceso.filter(h => h.activo).length - 2} más
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-muted-foreground">Sin horarios</span>
                            )}
                          </div>
                        ) : (
                          <Badge variant="secondary">Sin acceso</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {p.tieneAccesoSistema ? (
                          puedeAccederAhora(p) ? (
                            <Badge className="bg-green-600">Puede Acceder</Badge>
                          ) : (
                            <Badge variant="secondary">Fuera de Horario</Badge>
                          )
                        ) : (
                          <Badge variant="secondary">N/A</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEdit(p)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Editar
                            </DropdownMenuItem>
                            {p.activo && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedPersonal(p);
                                  setDespedirConfirmOpen(true);
                                }}
                                className="text-orange-600"
                              >
                                <UserMinus className="mr-2 h-4 w-4" />
                                Despedir/Renuncia
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedPersonal(p);
                                setDeleteConfirmOpen(true);
                              }}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Eliminar
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Confirm Despedir Dialog */}
        <AlertDialog open={despedirConfirmOpen} onOpenChange={setDespedirConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Despedir o registrar renuncia?</AlertDialogTitle>
              <AlertDialogDescription>
                Esto marcará a {selectedPersonal?.nombreCompleto} como inactivo. El registro se mantendrá en el sistema pero ya no podrá acceder.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedPersonal(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDespedir} className="bg-orange-600 hover:bg-orange-700">
                Confirmar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Confirm Delete Dialog */}
        <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Eliminar permanentemente?</AlertDialogTitle>
              <AlertDialogDescription>
                Esto eliminará a {selectedPersonal?.nombreCompleto} de la planilla de forma permanente. Esta acción no se puede deshacer.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setSelectedPersonal(null)}>Cancelar</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">
                Eliminar
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
}
