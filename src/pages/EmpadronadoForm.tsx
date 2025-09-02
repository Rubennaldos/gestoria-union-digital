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
import { ArrowLeft, Save, Plus, X, Home } from 'lucide-react';
import { CreateEmpadronadoForm, Empadronado, FamilyMember, PhoneNumber, Vehicle } from '@/types/empadronados';
import { createEmpadronado, updateEmpadronado, getEmpadronado, isNumeroPadronUnique } from '@/services/empadronados';
import { createAccountForEmpadronado } from '@/services/auth';
import { listRoles } from '@/services/rtdb';
import { Role } from '@/types/auth';

const EmpadronadoForm: React.FC = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const isEditing = Boolean(id);

  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(isEditing);
  const [newFamilyMember, setNewFamilyMember] = useState<FamilyMember>({
    nombre: '',
    apellidos: '',
    parentezco: '',
    cumpleanos: ''
  });
  const [isMinor, setIsMinor] = useState(false);
  const [newPhone, setNewPhone] = useState('');
  const [newVehicle, setNewVehicle] = useState<Vehicle>({
    placa: '',
    tipo: 'vehiculo'
  });

  // Estado para la creación de cuenta de usuario
  const [createUserAccount, setCreateUserAccount] = useState(false);
  const [userAccountData, setUserAccountData] = useState({
    email: '',
    password: '',
    username: '',
    roleId: 'asociado'
  });
  const [roles, setRoles] = useState<Role[]>([]);
  
  // Form state
  const [formData, setFormData] = useState<CreateEmpadronadoForm>({
    numeroPadron: '',
    nombre: '',
    apellidos: '',
    dni: '',
    familia: '',
    miembrosFamilia: [],
    vehiculos: [],
    habilitado: true,
    telefonos: [{ numero: '' }],
    fechaIngreso: Date.now(), // Initialize with current timestamp
    manzana: '',
    lote: '',
    etapa: '',
    genero: 'masculino',
    vive: true,
    estadoVivienda: 'terreno',
    cumpleanos: '',
    observaciones: ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Cargar roles siempre
    loadRoles();
    
    if (isEditing && id) {
      loadEmpadronado();
    }
  }, [id, isEditing]);

  const loadRoles = async () => {
    try {
      const rolesData = await listRoles();
      setRoles(rolesData);
    } catch (error) {
      console.error('Error loading roles:', error);
    }
  };

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
          miembrosFamilia: empadronado.miembrosFamilia || [],
          vehiculos: empadronado.vehiculos || [],
          habilitado: empadronado.habilitado,
          telefonos: empadronado.telefonos || [{ numero: '' }],
          fechaIngreso: empadronado.fechaIngreso,
          manzana: empadronado.manzana || '',
          lote: empadronado.lote || '',
          etapa: empadronado.etapa || '',
          genero: empadronado.genero,
          vive: empadronado.vive,
          estadoVivienda: empadronado.estadoVivienda,
          cumpleanos: empadronado.cumpleanos,
          observaciones: empadronado.observaciones || ''
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
    if (!formData.manzana?.trim()) newErrors.manzana = 'La manzana es requerida';
    if (!formData.lote?.trim()) newErrors.lote = 'El lote es requerido';
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

    // Validar datos de cuenta de usuario si está habilitada
    if (createUserAccount && !isEditing) {
      if (!userAccountData.email.trim()) newErrors.userEmail = 'El email es requerido para crear la cuenta';
      if (!userAccountData.password.trim()) newErrors.userPassword = 'La contraseña es requerida para crear la cuenta';
      if (userAccountData.password.length < 6) newErrors.userPassword = 'La contraseña debe tener al menos 6 caracteres';
      
      // Validar formato de email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (userAccountData.email && !emailRegex.test(userAccountData.email)) {
        newErrors.userEmail = 'El formato del email no es válido';
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
        // Limpiar campos completamente - solo incluir si tienen valor
        ...(formData.miembrosFamilia?.filter(miembro => 
          (miembro.nombre?.trim() && miembro.apellidos?.trim()) || miembro.nombre === 'Menor de edad'
        ).length > 0 && {
          miembrosFamilia: formData.miembrosFamilia.filter(miembro => 
            (miembro.nombre?.trim() && miembro.apellidos?.trim()) || miembro.nombre === 'Menor de edad'
          ).map(miembro => ({
            nombre: miembro.nombre.trim(),
            apellidos: miembro.apellidos.trim(),
            parentezco: miembro.parentezco?.trim() || '',
            cumpleanos: miembro.cumpleanos?.trim() || ''
          }))
        }),
        ...(formData.vehiculos?.filter(vehiculo => 
          vehiculo.placa?.trim()
        ).length > 0 && {
          vehiculos: formData.vehiculos.filter(vehiculo => 
            vehiculo.placa?.trim()
          ).map(vehiculo => ({
            placa: vehiculo.placa.trim(),
            tipo: vehiculo.tipo
          }))
        }),
        ...(formData.telefonos?.filter(t => t.numero?.trim()).length > 0 && {
          telefonos: formData.telefonos.filter(t => t.numero?.trim()).map(t => ({
            numero: t.numero.trim()
          }))
        }),
        ...(formData.observaciones?.trim() && {
          observaciones: formData.observaciones.trim()
        }),
        ...(formData.manzana?.trim() && {
          manzana: formData.manzana.trim()
        }),
        ...(formData.lote?.trim() && {
          lote: formData.lote.trim()
        }),
        ...(formData.etapa?.trim() && {
          etapa: formData.etapa.trim()
        })
      };

      let success = false;
      let empadronadoId = '';
      
      if (isEditing && id) {
        success = await updateEmpadronado(id, submitData, 'admin-user');
        empadronadoId = id;
        console.log('Empadronado actualizado:', id);
      } else {
        console.log('Creando empadronado con datos:', submitData);
        empadronadoId = await createEmpadronado(submitData, 'admin-user');
        success = Boolean(empadronadoId);
        console.log('Empadronado creado con ID:', empadronadoId, 'Success:', success);
      }

      // Si se creó el empadronado exitosamente y está habilitada la creación de cuenta
      if (success && createUserAccount && !isEditing && empadronadoId) {
        try {
          console.log('Creando cuenta para empadronado:', empadronadoId, userAccountData);
          await createAccountForEmpadronado(empadronadoId, {
            email: userAccountData.email.trim(),
            password: userAccountData.password,
            displayName: `${formData.nombre} ${formData.apellidos}`,
            username: userAccountData.username.trim() || undefined,
            roleId: userAccountData.roleId
          });
          console.log('Cuenta creada exitosamente');
          
          toast({
            title: "Éxito",
            description: "Empadronado y cuenta de usuario creados correctamente"
          });
        } catch (userError) {
          console.error('Error creando cuenta de usuario:', userError);
          // El empadronado se creó pero la cuenta falló
          toast({
            title: "Advertencia",
            description: `Empadronado creado, pero hubo un error al crear la cuenta de usuario: ${userError.message}`,
            variant: "destructive"
          });
        }
      } else if (success) {
        toast({
          title: "Éxito",
          description: isEditing ? "Empadronado actualizado correctamente" : "Empadronado creado correctamente"
        });
      }

      if (success) {
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

  const addFamilyMember = () => {
    if (isMinor) {
      // Para menores de edad solo requerimos parentezco y cumpleaños
      if (newFamilyMember.parentezco.trim() && newFamilyMember.cumpleanos.trim()) {
        const memberToAdd = {
          nombre: 'Menor de edad',
          apellidos: 'Menor de edad',
          parentezco: newFamilyMember.parentezco,
          cumpleanos: newFamilyMember.cumpleanos
        };
        setFormData(prev => ({
          ...prev,
          miembrosFamilia: [...(prev.miembrosFamilia || []), memberToAdd]
        }));
        setNewFamilyMember({ nombre: '', apellidos: '', parentezco: '', cumpleanos: '' });
        setIsMinor(false);
      }
    } else {
      // Para mayores de edad requerimos al menos nombre
      if (newFamilyMember.nombre.trim()) {
        setFormData(prev => ({
          ...prev,
          miembrosFamilia: [...(prev.miembrosFamilia || []), { ...newFamilyMember }]
        }));
        setNewFamilyMember({ nombre: '', apellidos: '', parentezco: '', cumpleanos: '' });
      }
    }
  };

  const removeFamilyMember = (index: number) => {
    setFormData(prev => ({
      ...prev,
      miembrosFamilia: prev.miembrosFamilia?.filter((_, i) => i !== index) || []
    }));
  };

  const addPhone = () => {
    if (newPhone.trim()) {
      setFormData(prev => ({
        ...prev,
        telefonos: [...(prev.telefonos || []), { numero: newPhone.trim() }]
      }));
      setNewPhone('');
    }
  };

  const removePhone = (index: number) => {
    setFormData(prev => ({
      ...prev,
      telefonos: prev.telefonos?.filter((_, i) => i !== index) || []
    }));
  };

  const addVehicle = () => {
    if (newVehicle.placa.trim()) {
      setFormData(prev => ({
        ...prev,
        vehiculos: [...(prev.vehiculos || []), { ...newVehicle }]
      }));
      setNewVehicle({ placa: '', tipo: 'vehiculo' });
    }
  };

  const removeVehicle = (index: number) => {
    setFormData(prev => ({
      ...prev,
      vehiculos: prev.vehiculos?.filter((_, i) => i !== index) || []
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
          onClick={() => navigate('/')}
          className="gap-2"
        >
          <Home className="w-4 h-4" />
          Inicio
        </Button>
        <div className="h-6 w-px bg-border" />
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate('/padron')}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Volver al Padrón
        </Button>
        <div className="h-6 w-px bg-border" />
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
                value={formData.fechaIngreso && !isNaN(formData.fechaIngreso) 
                  ? new Date(formData.fechaIngreso).toISOString().split('T')[0] 
                  : new Date().toISOString().split('T')[0]
                }
                onChange={(e) => {
                  const dateValue = e.target.value;
                  if (dateValue) {
                    setFormData(prev => ({ ...prev, fechaIngreso: new Date(dateValue).getTime() }));
                  }
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Miembros de Familia */}
        <Card>
          <CardHeader>
            <CardTitle>Miembros de la Familia</CardTitle>
            <CardDescription>Agregar otros miembros que viven en la familia</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isMinor"
                  checked={isMinor}
                  onCheckedChange={setIsMinor}
                />
                <Label htmlFor="isMinor">Es menor de edad (omitir algunos datos)</Label>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
                <Input
                  value={newFamilyMember.nombre}
                  onChange={(e) => setNewFamilyMember(prev => ({ ...prev, nombre: e.target.value }))}
                  placeholder="Nombre"
                  disabled={isMinor}
                />
                <Input
                  value={newFamilyMember.apellidos}
                  onChange={(e) => setNewFamilyMember(prev => ({ ...prev, apellidos: e.target.value }))}
                  placeholder="Apellidos"
                  disabled={isMinor}
                />
                <Input
                  value={newFamilyMember.parentezco}
                  onChange={(e) => setNewFamilyMember(prev => ({ ...prev, parentezco: e.target.value }))}
                  placeholder="Parentezco"
                />
                <Input
                  value={newFamilyMember.cumpleanos}
                  onChange={(e) => setNewFamilyMember(prev => ({ ...prev, cumpleanos: e.target.value }))}
                  placeholder="DD/MM/YYYY"
                />
                <Button type="button" variant="outline" onClick={addFamilyMember}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {formData.miembrosFamilia && formData.miembrosFamilia.length > 0 && (
              <div className="space-y-2">
                {formData.miembrosFamilia.map((miembro, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border rounded">
                    <span>{miembro.nombre} {miembro.apellidos} - {miembro.parentezco} ({miembro.cumpleanos})</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFamilyMember(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Contacto */}
        <Card>
          <CardHeader>
            <CardTitle>Contacto</CardTitle>
            <CardDescription>Información de contacto y ubicación</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="manzana">Manzana *</Label>
                <Input
                  id="manzana"
                  value={formData.manzana}
                  onChange={(e) => setFormData(prev => ({ ...prev, manzana: e.target.value }))}
                  placeholder="A"
                />
                {errors.manzana && <p className="text-sm text-destructive mt-1">{errors.manzana}</p>}
              </div>

              <div>
                <Label htmlFor="lote">Lote *</Label>
                <Input
                  id="lote"
                  value={formData.lote}
                  onChange={(e) => setFormData(prev => ({ ...prev, lote: e.target.value }))}
                  placeholder="15"
                />
                {errors.lote && <p className="text-sm text-destructive mt-1">{errors.lote}</p>}
              </div>

              <div>
                <Label htmlFor="etapa">Etapa</Label>
                <Input
                  id="etapa"
                  value={formData.etapa}
                  onChange={(e) => setFormData(prev => ({ ...prev, etapa: e.target.value }))}
                  placeholder="1"
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label>Teléfonos</Label>
              {formData.telefonos?.map((telefono, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={telefono.numero}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      telefonos: prev.telefonos?.map((t, i) => i === index ? { numero: e.target.value } : t)
                    }))}
                    placeholder="999888777"
                  />
                  {index > 0 && (
                    <Button type="button" variant="outline" size="sm" onClick={() => removePhone(index)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="Agregar otro teléfono"
                />
                <Button type="button" variant="outline" onClick={addPhone}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            <div>
              <Label>Vehículos</Label>
              {formData.vehiculos?.map((vehiculo, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <Input
                    value={vehiculo.placa}
                    readOnly
                    placeholder="Placa"
                  />
                  <Select
                    value={vehiculo.tipo}
                    disabled
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="vehiculo">Vehículo</SelectItem>
                      <SelectItem value="moto">Moto</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button type="button" variant="outline" size="sm" onClick={() => removeVehicle(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <div className="flex gap-2">
                <Input
                  value={newVehicle.placa}
                  onChange={(e) => setNewVehicle(prev => ({ ...prev, placa: e.target.value }))}
                  placeholder="ABC-123"
                />
                <Select
                  value={newVehicle.tipo}
                  onValueChange={(value: 'vehiculo' | 'moto') => setNewVehicle(prev => ({ ...prev, tipo: value }))}
                >
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="vehiculo">Vehículo</SelectItem>
                    <SelectItem value="moto">Moto</SelectItem>
                  </SelectContent>
                </Select>
                <Button type="button" variant="outline" onClick={addVehicle}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
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

        {/* Cuenta de Usuario - Solo para nuevos empadronados */}
        {!isEditing && (
          <Card>
            <CardHeader>
              <CardTitle>Cuenta de Usuario del Sistema</CardTitle>
              <CardDescription>Crear automáticamente una cuenta para que el asociado pueda acceder al sistema</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Switch
                  id="createUserAccount"
                  checked={createUserAccount}
                  onCheckedChange={setCreateUserAccount}
                />
                <Label htmlFor="createUserAccount">Crear cuenta de acceso al sistema</Label>
              </div>

              {createUserAccount && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="userEmail">Email de acceso *</Label>
                      <Input
                        id="userEmail"
                        type="email"
                        value={userAccountData.email}
                        onChange={(e) => setUserAccountData(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="juan.garcia@ejemplo.com"
                      />
                      {errors.userEmail && <p className="text-sm text-destructive mt-1">{errors.userEmail}</p>}
                    </div>

                    <div>
                      <Label htmlFor="userPassword">Contraseña *</Label>
                      <Input
                        id="userPassword"
                        type="password"
                        value={userAccountData.password}
                        onChange={(e) => setUserAccountData(prev => ({ ...prev, password: e.target.value }))}
                        placeholder="Mínimo 6 caracteres"
                      />
                      {errors.userPassword && <p className="text-sm text-destructive mt-1">{errors.userPassword}</p>}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="username">Nombre de usuario (opcional)</Label>
                      <Input
                        id="username"
                        value={userAccountData.username}
                        onChange={(e) => setUserAccountData(prev => ({ ...prev, username: e.target.value }))}
                        placeholder="juan.garcia"
                      />
                    </div>

                    <div>
                      <Label htmlFor="roleId">Rol del usuario</Label>
                      <Select 
                        value={userAccountData.roleId} 
                        onValueChange={(value) => setUserAccountData(prev => ({ ...prev, roleId: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {roles.map((role) => (
                            <SelectItem key={role.id} value={role.id}>
                              {role.nombre}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-800">
                      <strong>Información:</strong> Se creará automáticamente una cuenta de usuario vinculada a este empadronado. 
                      El asociado podrá usar estas credenciales para acceder al Portal del Asociado y gestionar sus visitas, 
                      pagos y demás servicios.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

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