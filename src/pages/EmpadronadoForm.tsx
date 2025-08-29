import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Save, Plus, X } from 'lucide-react';
import { CreateEmpadronadoForm, Empadronado } from '@/types/empadronados';
import { createEmpadronado, updateEmpadronado, getEmpadronado, isNumeroPadronUnique } from '@/services/empadronados';

const EmpadronadoForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [newHijo, setNewHijo] = useState('');
  
  // Form state
  const [formData, setFormData] = useState<CreateEmpadronadoForm>({
    numeroPadron: '',
    nombre: '',
    apellidos: '',
    dni: '',
    familia: '',
    placasVehiculares: '',
    habilitado: true,
    telefono1: '',
    telefono2: '',
    telefono3: '',
    fechaIngreso: Date.now(),
    direccion: '',
    genero: 'masculino',
    vive: true,
    estadoVivienda: 'terreno',
    cumpleanos: '',
    observaciones: '',
    hijos: []
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (isEditing && id) {
      loadEmpadronado();
    }
  }, [id, isEditing]);

  const loadEmpadronado = async () => {
    if (!id) return;
    
    setLoadingData(true);
    try {
      const empadronado = await getEmpadronado(id);
      if (empadronado) {
        setFormData({
          numeroPadron: empadronado.numeroPadron,
          nombre: empadronado.nombre,
          apellidos: empadronado.apellidos,
          dni: empadronado.dni,
          familia: empadronado.familia,
          placasVehiculares: empadronado.placasVehiculares || '',
          habilitado: empadronado.habilitado,
          telefono1: empadronado.telefono1 || '',
          telefono2: empadronado.telefono2 || '',
          telefono3: empadronado.telefono3 || '',
          fechaIngreso: empadronado.fechaIngreso,
          direccion: empadronado.direccion,
          genero: empadronado.genero,
          vive: empadronado.vive,
          estadoVivienda: empadronado.estadoVivienda,
          cumpleanos: empadronado.cumpleanos,
          observaciones: empadronado.observaciones || '',
          hijos: empadronado.hijos || []
        });
      } else {
        toast({
          title: "Error",
          description: "No se encontró el empadronado",
          variant: "destructive"
        });
        navigate('/padron');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "No se pudo cargar el empadronado",
        variant: "destructive"
      });
      navigate('/padron');
    } finally {
      setLoadingData(false);
    }
  };

  const validateForm = async (): Promise<boolean> => {
    const newErrors: Record<string, string> = {};

    // Validaciones requeridas
    if (!formData.numeroPadron.trim()) newErrors.numeroPadron = 'El número de padrón es requerido';
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es requerido';
    if (!formData.apellidos.trim()) newErrors.apellidos = 'Los apellidos son requeridos';
    if (!formData.dni.trim()) newErrors.dni = 'El DNI es requerido';
    if (!formData.familia.trim()) newErrors.familia = 'La familia es requerida';
    if (!formData.direccion.trim()) newErrors.direccion = 'La dirección es requerida';
    if (!formData.cumpleanos.trim()) newErrors.cumpleanos = 'El cumpleaños es requerido';

    // Validar formato de DNI (8 dígitos)
    if (formData.dni && !/^\d{8}$/.test(formData.dni)) {
      newErrors.dni = 'El DNI debe tener 8 dígitos';
    }

    // Validar formato de cumpleaños (DD/MM/YYYY)
    if (formData.cumpleanos && !/^\d{2}\/\d{2}\/\d{4}$/.test(formData.cumpleanos)) {
      newErrors.cumpleanos = 'El formato debe ser DD/MM/YYYY';
    }

    // Validar número de padrón único
    if (formData.numeroPadron) {
      const isUnique = await isNumeroPadronUnique(formData.numeroPadron, id);
      if (!isUnique) {
        newErrors.numeroPadron = 'Este número de padrón ya existe';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const isValid = await validateForm();
    if (!isValid) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        // Limpiar campos opcionales vacíos
        placasVehiculares: formData.placasVehiculares?.trim() || undefined,
        telefono1: formData.telefono1?.trim() || undefined,
        telefono2: formData.telefono2?.trim() || undefined,
        telefono3: formData.telefono3?.trim() || undefined,
        observaciones: formData.observaciones?.trim() || undefined,
        hijos: formData.hijos && formData.hijos.length > 0 ? formData.hijos : undefined
      };

      let success = false;
      if (isEditing && id) {
        success = await updateEmpadronado(id, submitData, 'admin-user');
      } else {
        const newId = await createEmpadronado(submitData, 'admin-user');
        success = Boolean(newId);
      }

      if (success) {
        toast({
          title: "Éxito",
          description: isEditing ? "Empadronado actualizado correctamente" : "Empadronado creado correctamente"
        });
        navigate('/padron');
      } else {
        throw new Error('Error en la operación');
      }
    } catch (error) {
      toast({
        title: "Error",
        description: isEditing ? "No se pudo actualizar el empadronado" : "No se pudo crear el empadronado",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const addHijo = () => {
    if (newHijo.trim()) {
      setFormData(prev => ({
        ...prev,
        hijos: [...(prev.hijos || []), newHijo.trim()]
      }));
      setNewHijo('');
    }
  };

  const removeHijo = (index: number) => {
    setFormData(prev => ({
      ...prev,
      hijos: prev.hijos?.filter((_, i) => i !== index) || []
    }));
  };

  if (loadingData) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-muted rounded w-1/4"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/padron')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Padrón
        </Button>
        <div>
          <h1 className="text-2xl font-bold">
            {isEditing ? 'Editar Empadronado' : 'Nuevo Empadronado'}
          </h1>
          <p className="text-muted-foreground">
            {isEditing ? 'Modifica los datos del empadronado' : 'Completa la información del nuevo empadronado'}
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información básica */}
        <Card>
          <CardHeader>
            <CardTitle>Información Básica</CardTitle>
            <CardDescription>Datos principales del empadronado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="numeroPadron">Número de Padrón *</Label>
                <Input
                  id="numeroPadron"
                  value={formData.numeroPadron}
                  onChange={(e) => setFormData(prev => ({ ...prev, numeroPadron: e.target.value }))}
                  placeholder="001"
                />
                {errors.numeroPadron && <p className="text-sm text-destructive mt-1">{errors.numeroPadron}</p>}
              </div>

              <div>
                <Label htmlFor="dni">DNI *</Label>
                <Input
                  id="dni"
                  value={formData.dni}
                  onChange={(e) => setFormData(prev => ({ ...prev, dni: e.target.value }))}
                  placeholder="12345678"
                  maxLength={8}
                />
                {errors.dni && <p className="text-sm text-destructive mt-1">{errors.dni}</p>}
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="habilitado"
                  checked={formData.habilitado}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, habilitado: checked }))}
                />
                <Label htmlFor="habilitado">Habilitado</Label>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="nombre">Nombre *</Label>
                <Input
                  id="nombre"
                  value={formData.nombre}
                  onChange={(e) => setFormData(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Juan Carlos"
                />
                {errors.nombre && <p className="text-sm text-destructive mt-1">{errors.nombre}</p>}
              </div>

              <div>
                <Label htmlFor="apellidos">Apellidos *</Label>
                <Input
                  id="apellidos"
                  value={formData.apellidos}
                  onChange={(e) => setFormData(prev => ({ ...prev, apellidos: e.target.value }))}
                  placeholder="García López"
                />
                {errors.apellidos && <p className="text-sm text-destructive mt-1">{errors.apellidos}</p>}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="familia">Familia *</Label>
                <Input
                  id="familia"
                  value={formData.familia}
                  onChange={(e) => setFormData(prev => ({ ...prev, familia: e.target.value }))}
                  placeholder="Familia García"
                />
                {errors.familia && <p className="text-sm text-destructive mt-1">{errors.familia}</p>}
              </div>

              <div>
                <Label htmlFor="genero">Género</Label>
                <Select 
                  value={formData.genero} 
                  onValueChange={(value: 'masculino' | 'femenino') => setFormData(prev => ({ ...prev, genero: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="masculino">Masculino</SelectItem>
                    <SelectItem value="femenino">Femenino</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="cumpleanos">Cumpleaños *</Label>
                <Input
                  id="cumpleanos"
                  value={formData.cumpleanos}
                  onChange={(e) => setFormData(prev => ({ ...prev, cumpleanos: e.target.value }))}
                  placeholder="15/08/1980"
                />
                {errors.cumpleanos && <p className="text-sm text-destructive mt-1">{errors.cumpleanos}</p>}
              </div>
            </div>

            <div>
              <Label htmlFor="fechaIngreso">Fecha de Ingreso</Label>
              <Input
                id="fechaIngreso"
                type="date"
                value={new Date(formData.fechaIngreso).toISOString().split('T')[0]}
                onChange={(e) => setFormData(prev => ({ ...prev, fechaIngreso: new Date(e.target.value).getTime() }))}
              />
            </div>
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
            <CardDescription>Información de contacto y ubicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="direccion">Dirección *</Label>
              <Textarea
                id="direccion"
                value={formData.direccion}
                onChange={(e) => setFormData(prev => ({ ...prev, direccion: e.target.value }))}
                placeholder="Mz. A Lote 15, Asociación..."
              />
              {errors.direccion && <p className="text-sm text-destructive mt-1">{errors.direccion}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="telefono1">Teléfono 1</Label>
                <Input
                  id="telefono1"
                  value={formData.telefono1}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono1: e.target.value }))}
                  placeholder="999888777"
                />
              </div>

              <div>
                <Label htmlFor="telefono2">Teléfono 2</Label>
                <Input
                  id="telefono2"
                  value={formData.telefono2}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono2: e.target.value }))}
                  placeholder="999888777"
                />
              </div>

              <div>
                <Label htmlFor="telefono3">Teléfono 3</Label>
                <Input
                  id="telefono3"
                  value={formData.telefono3}
                  onChange={(e) => setFormData(prev => ({ ...prev, telefono3: e.target.value }))}
                  placeholder="999888777"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="placasVehiculares">Placas Vehiculares</Label>
              <Input
                id="placasVehiculares"
                value={formData.placasVehiculares}
                onChange={(e) => setFormData(prev => ({ ...prev, placasVehiculares: e.target.value }))}
                placeholder="ABC-123, DEF-456"
              />
            </div>
          </CardContent>
        </Card>

        {/* Vivienda y Residencia */}
        <Card>
          <CardHeader>
            <CardTitle>Vivienda y Residencia</CardTitle>
            <CardDescription>Estado de la vivienda y residencia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="estadoVivienda">Estado de Vivienda</Label>
                <Select 
                  value={formData.estadoVivienda} 
                  onValueChange={(value: 'construida' | 'construccion' | 'terreno') => setFormData(prev => ({ ...prev, estadoVivienda: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="construida">Casa Construida</SelectItem>
                    <SelectItem value="construccion">En Construcción</SelectItem>
                    <SelectItem value="terreno">Solo Terreno</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="vive"
                  checked={formData.vive}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, vive: checked }))}
                />
                <Label htmlFor="vive">Vive en la asociación</Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Hijos */}
        <Card>
          <CardHeader>
            <CardTitle>Hijos</CardTitle>
            <CardDescription>Lista de hijos del empadronado</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                value={newHijo}
                onChange={(e) => setNewHijo(e.target.value)}
                placeholder="Nombre del hijo"
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addHijo())}
              />
              <Button type="button" variant="outline" onClick={addHijo}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {formData.hijos && formData.hijos.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {formData.hijos.map((hijo, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center gap-1">
                    {hijo}
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-auto p-0 w-4 h-4"
                      onClick={() => removeHijo(index)}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </Badge>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Observaciones */}
        <Card>
          <CardHeader>
            <CardTitle>Observaciones</CardTitle>
            <CardDescription>Información adicional relevante</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={formData.observaciones}
              onChange={(e) => setFormData(prev => ({ ...prev, observaciones: e.target.value }))}
              placeholder="Cualquier información adicional importante..."
              rows={4}
            />
          </CardContent>
        </Card>

        {/* Botones de acción */}
        <div className="flex gap-4 justify-end">
          <Button 
            type="button" 
            variant="outline" 
            onClick={() => navigate('/padron')}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? (
              <>Guardando...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                {isEditing ? 'Actualizar' : 'Crear'} Empadronado
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EmpadronadoForm;