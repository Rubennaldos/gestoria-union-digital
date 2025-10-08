import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Save, Eye, EyeOff, Shield, User, Lock, HelpCircle, Plus, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/config/firebase";
import { updateUserProfile, getUserProfile } from "@/services/rtdb";
import { obtenerEmpadronadoPorAuthUid, updateEmpadronado } from "@/services/empadronados";
import { Empadronado, FamilyMember, Vehicle, PhoneNumber } from "@/types/empadronados";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { 
  saveSecurityQuestions, 
  getSecurityQuestions, 
  SecurityQuestion 
} from "@/services/security-questions";

const PREGUNTAS_DISPONIBLES = [
  "¿Cuál es el nombre de tu primera mascota?",
  "¿En qué ciudad naciste?",
  "¿Cuál es el nombre de tu mejor amigo de la infancia?",
  "¿Cuál es tu comida favorita?",
  "¿Cuál es el apellido de soltera de tu madre?",
  "¿Cuál fue el nombre de tu primera escuela?",
  "¿Cuál es tu película favorita?",
  "¿En qué calle viviste cuando eras niño?",
];

const ConfiguracionCuenta: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();

  const [loading, setLoading] = useState(false);
  const [empadronado, setEmpadronado] = useState<Empadronado | null>(null);
  const [loadingEmpadronado, setLoadingEmpadronado] = useState(true);

  // Estados para información del perfil
  const [telefono, setTelefono] = useState("");
  const [username, setUsername] = useState("");

  // Estados para datos editables del empadronado
  const [genero, setGenero] = useState<"masculino" | "femenino">("masculino");
  const [estadoVivienda, setEstadoVivienda] = useState<"construida" | "construccion" | "terreno">("terreno");
  const [familia, setFamilia] = useState("");
  const [etapa, setEtapa] = useState("");
  const [cumpleanos, setCumpleanos] = useState("");
  const [telefonos, setTelefonos] = useState<PhoneNumber[]>([]);
  const [vehiculos, setVehiculos] = useState<Vehicle[]>([]);
  const [miembrosFamilia, setMiembrosFamilia] = useState<FamilyMember[]>([]);
  const [vive, setVive] = useState(true);

  // Estados para agregar nuevos elementos
  const [newPhone, setNewPhone] = useState("");
  const [newVehicle, setNewVehicle] = useState<Vehicle>({ placa: "", tipo: "vehiculo" });
  const [newFamilyMember, setNewFamilyMember] = useState<FamilyMember>({
    nombre: "",
    apellidos: "",
    parentezco: "",
    cumpleanos: "",
  });

  // Estados para cambio de contraseña
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);

  // Estados para preguntas de seguridad
  const [securityQuestions, setSecurityQuestions] = useState<SecurityQuestion[]>([
    { pregunta: "", respuesta: "" },
    { pregunta: "", respuesta: "" },
    { pregunta: "", respuesta: "" },
  ]);
  const [savingQuestions, setSavingQuestions] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // Cargar datos del usuario
  useEffect(() => {
    const loadData = async () => {
      if (!user?.uid) return;

      try {
        setLoadingEmpadronado(true);
        
        // Cargar datos del perfil
        const userProfile = await getUserProfile(user.uid);
        if (userProfile) {
          setTelefono(userProfile.phone || "");
          setUsername(userProfile.username || "");
        }

        // Cargar datos del empadronado si está vinculado
        if (profile?.empadronadoId) {
          const empData = await obtenerEmpadronadoPorAuthUid(user.uid);
          if (empData) {
            setEmpadronado(empData);
            // Inicializar estados editables
            setGenero(empData.genero || "masculino");
            setEstadoVivienda(empData.estadoVivienda || "terreno");
            setFamilia(empData.familia || "");
            setEtapa(empData.etapa || "");
            setCumpleanos(empData.cumpleanos || "");
            setTelefonos(empData.telefonos || []);
            setVehiculos(empData.vehiculos || []);
            setMiembrosFamilia(empData.miembrosFamilia || []);
            setVive(empData.vive !== undefined ? empData.vive : true);
          }
        }

        // Cargar preguntas de seguridad existentes
        const existingQuestions = await getSecurityQuestions(user.uid);
        if (existingQuestions && existingQuestions.length > 0) {
          setSecurityQuestions(existingQuestions);
        }
      } catch (error) {
        console.error("Error cargando datos:", error);
      } finally {
        setLoadingEmpadronado(false);
      }
    };

    loadData();
  }, [user?.uid, profile?.empadronadoId]);

  const handleUpdateProfile = async () => {
    if (!user?.uid) return;

    setLoading(true);
    try {
      await updateUserProfile(
        user.uid,
        {
          phone: telefono || undefined,
          username: username || undefined,
        },
        user.uid
      );

      toast({
        title: "Perfil actualizado",
        description: "Tus datos se han actualizado correctamente",
      });
    } catch (error: any) {
      console.error("Error actualizando perfil:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar el perfil",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateEmpadronado = async () => {
    if (!empadronado?.id || !user?.uid) return;

    // Validar formato de cumpleaños
    if (cumpleanos && !/^\d{2}\/\d{2}\/\d{4}$/.test(cumpleanos)) {
      toast({
        title: "Error",
        description: "El formato de cumpleaños debe ser DD/MM/YYYY",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await updateEmpadronado(
        empadronado.id,
        {
          genero,
          estadoVivienda,
          familia,
          etapa,
          cumpleanos,
          telefonos,
          vehiculos,
          miembrosFamilia,
          vive,
        },
        user.uid
      );

      toast({
        title: "Datos actualizados",
        description: "Tu información personal se ha actualizado correctamente",
      });

      // Recargar datos
      const empData = await obtenerEmpadronadoPorAuthUid(user.uid);
      if (empData) {
        setEmpadronado(empData);
      }
    } catch (error: any) {
      console.error("Error actualizando empadronado:", error);
      toast({
        title: "Error",
        description: error.message || "No se pudo actualizar la información",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Funciones para teléfonos
  const addPhone = () => {
    if (newPhone.trim()) {
      setTelefonos([...telefonos, { numero: newPhone.trim() }]);
      setNewPhone("");
    }
  };

  const removePhone = (index: number) => {
    setTelefonos(telefonos.filter((_, i) => i !== index));
  };

  // Funciones para vehículos
  const addVehicle = () => {
    if (newVehicle.placa.trim()) {
      setVehiculos([...vehiculos, { ...newVehicle, placa: newVehicle.placa.toUpperCase() }]);
      setNewVehicle({ placa: "", tipo: "vehiculo" });
    }
  };

  const removeVehicle = (index: number) => {
    setVehiculos(vehiculos.filter((_, i) => i !== index));
  };

  // Funciones para miembros de familia
  const addFamilyMember = () => {
    if (
      newFamilyMember.nombre.trim() &&
      newFamilyMember.apellidos.trim() &&
      newFamilyMember.parentezco.trim()
    ) {
      setMiembrosFamilia([...miembrosFamilia, newFamilyMember]);
      setNewFamilyMember({
        nombre: "",
        apellidos: "",
        parentezco: "",
        cumpleanos: "",
      });
    }
  };

  const removeFamilyMember = (index: number) => {
    setMiembrosFamilia(miembrosFamilia.filter((_, i) => i !== index));
  };

  const handleChangePassword = async () => {
    if (!auth.currentUser || !user?.email) {
      toast({
        title: "Error",
        description: "No hay sesión activa",
        variant: "destructive",
      });
      return;
    }

    // Validaciones
    if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Todos los campos son obligatorios",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      toast({
        title: "Error",
        description: "La nueva contraseña debe tener al menos 6 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast({
        title: "Error",
        description: "Las contraseñas no coinciden",
        variant: "destructive",
      });
      return;
    }

    setChangingPassword(true);
    try {
      // Reautenticar usuario
      const credential = EmailAuthProvider.credential(
        user.email,
        passwordData.currentPassword
      );
      await reauthenticateWithCredential(auth.currentUser, credential);

      // Cambiar contraseña
      await updatePassword(auth.currentUser, passwordData.newPassword);

      toast({
        title: "Contraseña actualizada",
        description: "Tu contraseña se ha cambiado correctamente",
      });

      // Limpiar formulario
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      console.error("Error cambiando contraseña:", error);
      let errorMessage = "No se pudo cambiar la contraseña";
      
      if (error.code === "auth/wrong-password") {
        errorMessage = "La contraseña actual es incorrecta";
      } else if (error.code === "auth/weak-password") {
        errorMessage = "La nueva contraseña es muy débil";
      }

      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSaveSecurityQuestions = async () => {
    if (!user?.uid) return;

    // Validar que las 3 preguntas estén completas
    const allFilled = securityQuestions.every(q => q.pregunta && q.respuesta.trim());
    if (!allFilled) {
      toast({
        title: "Error",
        description: "Debes completar las 3 preguntas de seguridad",
        variant: "destructive",
      });
      return;
    }

    // Validar que no haya preguntas repetidas
    const preguntasUnicas = new Set(securityQuestions.map(q => q.pregunta));
    if (preguntasUnicas.size !== 3) {
      toast({
        title: "Error",
        description: "No puedes seleccionar la misma pregunta más de una vez",
        variant: "destructive",
      });
      return;
    }

    setSavingQuestions(true);
    try {
      await saveSecurityQuestions(user.uid, securityQuestions);
      setShowSuccessDialog(true);
    } catch (error: any) {
      console.error("Error guardando preguntas:", error);
      toast({
        title: "Error",
        description: "No se pudieron guardar las preguntas de seguridad",
        variant: "destructive",
      });
    } finally {
      setSavingQuestions(false);
    }
  };

  if (loadingEmpadronado) {
    return (
      <div className="min-h-screen bg-background p-3 md:p-6">
        <div className="container mx-auto max-w-4xl">
          <div className="flex items-center justify-center py-12">
            <div className="text-center space-y-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
              <p className="text-muted-foreground">Cargando configuración...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-3 md:p-6">
      <div className="container mx-auto max-w-4xl space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/inicio")}
              className="h-8 w-8"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-foreground">
                Configuración de Cuenta
              </h1>
              <p className="text-sm text-muted-foreground">
                Gestiona tu información personal y seguridad
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="perfil" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="perfil" className="text-xs sm:text-sm">
              <User className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Perfil</span>
            </TabsTrigger>
            <TabsTrigger value="password" className="text-xs sm:text-sm">
              <Lock className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Contraseña</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="text-xs sm:text-sm">
              <Shield className="h-4 w-4 mr-1 sm:mr-2" />
              <span className="hidden sm:inline">Seguridad</span>
            </TabsTrigger>
          </TabsList>

          {/* Tab Perfil */}
          <TabsContent value="perfil" className="space-y-4 mt-4">
            {/* Información Personal Básica */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Información Personal
                </CardTitle>
                <CardDescription>
                  Datos básicos de tu cuenta. Los campos con 🔒 no se pueden modificar.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Campos de solo lectura */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Número de Padrón
                    </Label>
                    <Input
                      value={empadronado?.numeroPadron || "No vinculado"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      DNI
                    </Label>
                    <Input
                      value={empadronado?.dni || "No vinculado"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Nombres
                    </Label>
                    <Input
                      value={empadronado?.nombre || profile?.displayName || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Apellidos
                    </Label>
                    <Input
                      value={empadronado?.apellidos || ""}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Fecha de Cumpleaños</Label>
                    <Input
                      value={cumpleanos}
                      onChange={(e) => setCumpleanos(e.target.value)}
                      placeholder="DD/MM/YYYY"
                    />
                    <p className="text-xs text-muted-foreground">
                      Formato: DD/MM/YYYY (ejemplo: 15/03/1990)
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Género</Label>
                    <Select
                      value={genero}
                      onValueChange={(value: "masculino" | "femenino") => setGenero(value)}
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

                  <div className="space-y-2">
                    <Label>Familia</Label>
                    <Input
                      value={familia}
                      onChange={(e) => setFamilia(e.target.value)}
                      placeholder="Ingresa tu familia"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Etapa</Label>
                    <Input
                      value={etapa}
                      onChange={(e) => setEtapa(e.target.value)}
                      placeholder="Ingresa tu etapa"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Estado del Terreno</Label>
                    <Select
                      value={estadoVivienda}
                      onValueChange={(value: "construida" | "construccion" | "terreno") =>
                        setEstadoVivienda(value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="construida">Construida</SelectItem>
                        <SelectItem value="construccion">En Construcción</SelectItem>
                        <SelectItem value="terreno">Solo Terreno</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>¿Vive Aquí?</Label>
                    <Select
                      value={vive ? "si" : "no"}
                      onValueChange={(value) => setVive(value === "si")}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="si">Sí</SelectItem>
                        <SelectItem value="no">No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Ubicación y Contacto - Solo lectura */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Manzana
                    </Label>
                    <Input
                      value={empadronado?.manzana || "No registrada"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Lote
                    </Label>
                    <Input
                      value={empadronado?.lote || "No registrado"}
                      disabled
                      className="bg-muted"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <Lock className="h-3 w-3" />
                      Fecha de Ingreso
                    </Label>
                    <Input
                      value={
                        empadronado?.fechaIngreso
                          ? new Date(empadronado.fechaIngreso).toLocaleDateString("es-PE")
                          : "No registrada"
                      }
                      disabled
                      className="bg-muted"
                    />
                  </div>
                </div>

                <Separator />

                {/* Campos editables */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={user?.email || ""}
                      disabled
                      className="bg-muted"
                    />
                    <p className="text-xs text-muted-foreground">
                      El email no se puede cambiar desde aquí
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label>Teléfono</Label>
                    <Input
                      type="tel"
                      value={telefono}
                      onChange={(e) => setTelefono(e.target.value)}
                      placeholder="Ingresa tu teléfono"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Nombre de Usuario</Label>
                    <Input
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Ingresa un nombre de usuario"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Rol</Label>
                    <div className="flex items-center h-10">
                      <Badge variant="secondary">{profile?.roleId || "usuario"}</Badge>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="w-full sm:w-auto"
                    variant="outline"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Guardar Perfil
                  </Button>
                  {empadronado && (
                    <Button
                      onClick={handleUpdateEmpadronado}
                      disabled={loading}
                      className="w-full sm:w-auto"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      {loading ? "Guardando..." : "Guardar Datos Personales"}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Teléfonos de Contacto - Editable */}
            {empadronado && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    📱 Teléfonos de Contacto
                  </CardTitle>
                  <CardDescription>
                    Administra tus números de teléfono
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Lista de teléfonos */}
                  {telefonos.map((tel, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-3 bg-accent/30 rounded-lg"
                    >
                      <Input
                        value={typeof tel === "string" ? tel : tel.numero}
                        onChange={(e) => {
                          const newTelefonos = [...telefonos];
                          newTelefonos[index] = { numero: e.target.value };
                          setTelefonos(newTelefonos);
                        }}
                        placeholder="999888777"
                      />
                      {telefonos.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removePhone(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  
                  {/* Agregar nuevo teléfono */}
                  <div className="flex gap-2 pt-2">
                    <Input
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      placeholder="Agregar otro teléfono"
                    />
                    <Button type="button" variant="outline" onClick={addPhone}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Vehículos - Editable */}
            {empadronado && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    🚗 Vehículos Registrados
                  </CardTitle>
                  <CardDescription>
                    Administra tus vehículos
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Lista de vehículos */}
                  {vehiculos.map((vehiculo, index) => (
                    <div
                      key={index}
                      className="flex items-center gap-2 p-4 bg-accent/30 rounded-lg border"
                    >
                      <div className="p-2 bg-primary/10 rounded-full">
                        <span className="text-2xl">
                          {vehiculo.tipo === "vehiculo" ? "🚗" : "🏍️"}
                        </span>
                      </div>
                      <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          value={vehiculo.placa}
                          onChange={(e) => {
                            const newVehiculos = [...vehiculos];
                            newVehiculos[index].placa = e.target.value.toUpperCase();
                            setVehiculos(newVehiculos);
                          }}
                          placeholder="ABC-123"
                        />
                        <Select
                          value={vehiculo.tipo}
                          onValueChange={(value: "vehiculo" | "moto") => {
                            const newVehiculos = [...vehiculos];
                            newVehiculos[index].tipo = value;
                            setVehiculos(newVehiculos);
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vehiculo">Vehículo</SelectItem>
                            <SelectItem value="moto">Moto</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVehicle(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                  
                  {/* Agregar nuevo vehículo */}
                  <div className="flex flex-col sm:flex-row gap-2 pt-2">
                    <Input
                      value={newVehicle.placa}
                      onChange={(e) =>
                        setNewVehicle({ ...newVehicle, placa: e.target.value.toUpperCase() })
                      }
                      placeholder="ABC-123"
                      className="flex-1"
                    />
                    <Select
                      value={newVehicle.tipo}
                      onValueChange={(value: "vehiculo" | "moto") =>
                        setNewVehicle({ ...newVehicle, tipo: value })
                      }
                    >
                      <SelectTrigger className="w-full sm:w-32">
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
                </CardContent>
              </Card>
            )}

            {/* Miembros de Familia - Editable */}
            {empadronado && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    👨‍👩‍👧‍👦 Miembros de la Familia
                  </CardTitle>
                  <CardDescription>
                    Administra los miembros de tu familia
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Lista de miembros */}
                  {miembrosFamilia.map((miembro, index) => (
                    <div
                      key={index}
                      className="p-4 bg-accent/30 rounded-lg border"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="space-y-1 flex-1">
                          <p className="font-semibold">
                            {miembro.nombre} {miembro.apellidos}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {miembro.parentezco}
                          </p>
                          {miembro.cumpleanos && (
                            <p className="text-xs text-muted-foreground flex items-center gap-1">
                              🎂 {miembro.cumpleanos}
                            </p>
                          )}
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFamilyMember(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                      
                      {/* Editar miembro */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <Input
                          value={miembro.nombre}
                          onChange={(e) => {
                            const newMiembros = [...miembrosFamilia];
                            newMiembros[index].nombre = e.target.value;
                            setMiembrosFamilia(newMiembros);
                          }}
                          placeholder="Nombre"
                        />
                        <Input
                          value={miembro.apellidos}
                          onChange={(e) => {
                            const newMiembros = [...miembrosFamilia];
                            newMiembros[index].apellidos = e.target.value;
                            setMiembrosFamilia(newMiembros);
                          }}
                          placeholder="Apellidos"
                        />
                        <Input
                          value={miembro.parentezco}
                          onChange={(e) => {
                            const newMiembros = [...miembrosFamilia];
                            newMiembros[index].parentezco = e.target.value;
                            setMiembrosFamilia(newMiembros);
                          }}
                          placeholder="Parentezco"
                        />
                        <Input
                          value={miembro.cumpleanos}
                          onChange={(e) => {
                            const newMiembros = [...miembrosFamilia];
                            newMiembros[index].cumpleanos = e.target.value;
                            setMiembrosFamilia(newMiembros);
                          }}
                          placeholder="DD/MM/YYYY"
                        />
                      </div>
                    </div>
                  ))}
                  
                  {/* Agregar nuevo miembro */}
                  <div className="border-t pt-4 mt-4">
                    <Label className="mb-2 block">Agregar Nuevo Miembro</Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <Input
                        value={newFamilyMember.nombre}
                        onChange={(e) =>
                          setNewFamilyMember({ ...newFamilyMember, nombre: e.target.value })
                        }
                        placeholder="Nombre"
                      />
                      <Input
                        value={newFamilyMember.apellidos}
                        onChange={(e) =>
                          setNewFamilyMember({ ...newFamilyMember, apellidos: e.target.value })
                        }
                        placeholder="Apellidos"
                      />
                      <Input
                        value={newFamilyMember.parentezco}
                        onChange={(e) =>
                          setNewFamilyMember({ ...newFamilyMember, parentezco: e.target.value })
                        }
                        placeholder="Parentezco (ej: Hijo/a, Esposo/a)"
                      />
                      <Input
                        value={newFamilyMember.cumpleanos}
                        onChange={(e) =>
                          setNewFamilyMember({ ...newFamilyMember, cumpleanos: e.target.value })
                        }
                        placeholder="DD/MM/YYYY"
                      />
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={addFamilyMember}
                      className="mt-2 w-full sm:w-auto"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Familiar
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Tab Contraseña */}
          <TabsContent value="password" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Lock className="h-5 w-5" />
                  Cambiar Contraseña
                </CardTitle>
                <CardDescription>
                  Actualiza tu contraseña para mantener tu cuenta segura
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="currentPassword">Contraseña Actual</Label>
                    <div className="relative">
                      <Input
                        id="currentPassword"
                        type={showCurrentPassword ? "text" : "password"}
                        value={passwordData.currentPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, currentPassword: e.target.value })
                        }
                        placeholder="Ingresa tu contraseña actual"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      >
                        {showCurrentPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="newPassword">Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="newPassword"
                        type={showNewPassword ? "text" : "password"}
                        value={passwordData.newPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, newPassword: e.target.value })
                        }
                        placeholder="Mínimo 6 caracteres"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                      >
                        {showNewPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="confirmPassword">Confirmar Nueva Contraseña</Label>
                    <div className="relative">
                      <Input
                        id="confirmPassword"
                        type={showConfirmPassword ? "text" : "password"}
                        value={passwordData.confirmPassword}
                        onChange={(e) =>
                          setPasswordData({ ...passwordData, confirmPassword: e.target.value })
                        }
                        placeholder="Repite la nueva contraseña"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleChangePassword}
                    disabled={changingPassword}
                    className="w-full sm:w-auto"
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    {changingPassword ? "Cambiando..." : "Cambiar Contraseña"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tab Seguridad */}
          <TabsContent value="security" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Preguntas de Seguridad
                </CardTitle>
                <CardDescription>
                  Configura 3 preguntas de seguridad para recuperar tu contraseña en el futuro
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {securityQuestions.map((question, index) => (
                  <div key={index} className="space-y-3 p-4 border rounded-lg bg-accent/30">
                    <div className="flex items-center gap-2 mb-2">
                      <HelpCircle className="h-4 w-4 text-primary" />
                      <Label className="text-sm font-semibold">
                        Pregunta {index + 1}
                      </Label>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor={`pregunta-${index}`} className="text-xs">
                        Selecciona una pregunta
                      </Label>
                      <Select
                        value={question.pregunta}
                        onValueChange={(value) => {
                          const newQuestions = [...securityQuestions];
                          newQuestions[index].pregunta = value;
                          setSecurityQuestions(newQuestions);
                        }}
                      >
                        <SelectTrigger id={`pregunta-${index}`}>
                          <SelectValue placeholder="Elige una pregunta" />
                        </SelectTrigger>
                        <SelectContent>
                          {PREGUNTAS_DISPONIBLES.map((pregunta) => (
                            <SelectItem key={pregunta} value={pregunta}>
                              {pregunta}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`respuesta-${index}`} className="text-xs">
                        Tu respuesta
                      </Label>
                      <Input
                        id={`respuesta-${index}`}
                        value={question.respuesta}
                        onChange={(e) => {
                          const newQuestions = [...securityQuestions];
                          newQuestions[index].respuesta = e.target.value;
                          setSecurityQuestions(newQuestions);
                        }}
                        placeholder="Ingresa tu respuesta"
                      />
                    </div>
                  </div>
                ))}

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleSaveSecurityQuestions}
                    disabled={savingQuestions}
                    className="w-full sm:w-auto"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {savingQuestions ? "Guardando..." : "Guardar Preguntas"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Diálogo de éxito */}
      <AlertDialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-green-500" />
              Preguntas Guardadas
            </AlertDialogTitle>
            <AlertDialogDescription>
              Tus preguntas de seguridad se han configurado correctamente. 
              Podrás usarlas para recuperar tu contraseña en caso de olvidarla.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction>Entendido</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default ConfiguracionCuenta;
