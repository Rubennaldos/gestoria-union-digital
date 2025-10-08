import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Search, Users, Clock, ShieldCheck, UserCheck, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import BackButton from "@/components/layout/BackButton";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { PersonalPlanilla } from "@/types/planilla";
import { getPersonalPlanilla, getPlanillaStats, puedeAccederAhora } from "@/services/planilla";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { getEmpadronados } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";
import { createPersonalPlanilla } from "@/services/planilla";
import { Switch } from "@/components/ui/switch";

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
      
      setDialogOpen(false);
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
      console.error("Error creating personal:", error);
      toast({
        title: "Error",
        description: "No se pudo agregar el personal",
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
      <div className="container mx-auto px-4 py-6 space-y-6">
        <div className="flex items-center gap-4">
          <BackButton />
          <div>
            <h1 className="text-3xl font-bold">Planilla de Personal</h1>
            <p className="text-muted-foreground">Gestión de personal contratado y control de accesos</p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Personal</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalPersonal}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Activos</CardTitle>
              <UserCheck className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.activos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactivos</CardTitle>
              <UserX className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-muted-foreground">{stats.inactivos}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Con Acceso Sistema</CardTitle>
              <ShieldCheck className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">{stats.conAccesoSistema}</div>
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
              
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Agregar Personal
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Agregar Personal a Planilla</DialogTitle>
                  </DialogHeader>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="empadronado">Seleccionar Persona</Label>
                      <Select
                        value={formData.empadronadoId}
                        onValueChange={(value) => setFormData({ ...formData, empadronadoId: value })}
                        required
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione una persona" />
                        </SelectTrigger>
                        <SelectContent>
                          {empadronadosDisponibles.map((emp) => (
                            <SelectItem key={emp.id} value={emp.id}>
                              {emp.nombre} {emp.apellidos} - {emp.dni}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="funcion">Función / Cargo</Label>
                      <Input
                        id="funcion"
                        value={formData.funcion}
                        onChange={(e) => setFormData({ ...formData, funcion: e.target.value })}
                        placeholder="Ej: Guardia de seguridad, Personal de limpieza"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="area">Área Asignada (Opcional)</Label>
                      <Input
                        id="area"
                        value={formData.areaAsignada}
                        onChange={(e) => setFormData({ ...formData, areaAsignada: e.target.value })}
                        placeholder="Ej: Pórtico principal, Áreas verdes"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="fecha">Fecha de Contratación</Label>
                      <Input
                        id="fecha"
                        type="date"
                        value={formData.fechaContratacion}
                        onChange={(e) => setFormData({ ...formData, fechaContratacion: e.target.value })}
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="sueldo">Sueldo Mensual (Opcional)</Label>
                        <Input
                          id="sueldo"
                          type="number"
                          step="0.01"
                          value={formData.sueldo}
                          onChange={(e) => setFormData({ ...formData, sueldo: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="tipoContrato">Tipo de Contrato</Label>
                        <Select
                          value={formData.tipoContrato}
                          onValueChange={(value: any) => setFormData({ ...formData, tipoContrato: value })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="planilla">Planilla</SelectItem>
                            <SelectItem value="recibo_honorarios">Recibo por Honorarios</SelectItem>
                            <SelectItem value="temporal">Temporal</SelectItem>
                            <SelectItem value="indefinido">Indefinido</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="frecuencia">Frecuencia de Pago</Label>
                        <Select
                          value={formData.frecuenciaPago}
                          onValueChange={(value: any) => setFormData({ ...formData, frecuenciaPago: value })}
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
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="observaciones">Observaciones (Opcional)</Label>
                      <Input
                        id="observaciones"
                        value={formData.observaciones}
                        onChange={(e) => setFormData({ ...formData, observaciones: e.target.value })}
                        placeholder="Información adicional relevante"
                      />
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="activo"
                        checked={formData.activo}
                        onCheckedChange={(checked) => setFormData({ ...formData, activo: checked })}
                      />
                      <Label htmlFor="activo">Personal Activo</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="acceso"
                        checked={formData.tieneAccesoSistema}
                        onCheckedChange={(checked) => setFormData({ ...formData, tieneAccesoSistema: checked })}
                      />
                      <Label htmlFor="acceso">Permitir Acceso al Sistema</Label>
                    </div>

                    {formData.tieneAccesoSistema && (
                      <div className="space-y-3 border rounded-lg p-4">
                        <Label>Horarios de Acceso al Sistema</Label>
                        {formData.horariosAcceso.map((horario, index) => (
                          <div key={horario.dia} className="flex items-center gap-3">
                            <Checkbox
                              checked={horario.activo}
                              onCheckedChange={(checked) => {
                                const newHorarios = [...formData.horariosAcceso];
                                newHorarios[index].activo = checked as boolean;
                                setFormData({ ...formData, horariosAcceso: newHorarios });
                              }}
                            />
                            <span className="w-24 text-sm">{DIAS_SEMANA[index].label}</span>
                            <Input
                              type="time"
                              value={horario.horaInicio}
                              onChange={(e) => {
                                const newHorarios = [...formData.horariosAcceso];
                                newHorarios[index].horaInicio = e.target.value;
                                setFormData({ ...formData, horariosAcceso: newHorarios });
                              }}
                              disabled={!horario.activo}
                              className="w-32"
                            />
                            <span className="text-sm">a</span>
                            <Input
                              type="time"
                              value={horario.horaFin}
                              onChange={(e) => {
                                const newHorarios = [...formData.horariosAcceso];
                                newHorarios[index].horaFin = e.target.value;
                                setFormData({ ...formData, horariosAcceso: newHorarios });
                              }}
                              disabled={!horario.activo}
                              className="w-32"
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-end gap-2 pt-4">
                      <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit">Agregar Personal</Button>
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
