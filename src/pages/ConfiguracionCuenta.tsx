import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Save, Eye, EyeOff, Shield, User, Lock, HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";
import { auth } from "@/config/firebase";
import { updateUserProfile, getUserProfile } from "@/services/rtdb";
import { obtenerEmpadronadoPorAuthUid } from "@/services/empadronados";
import { Empadronado } from "@/types/empadronados";
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

                <div className="flex justify-end pt-4">
                  <Button
                    onClick={handleUpdateProfile}
                    disabled={loading}
                    className="w-full sm:w-auto"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {loading ? "Guardando..." : "Guardar Cambios"}
                  </Button>
                </div>
              </CardContent>
            </Card>
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
