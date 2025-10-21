import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { User, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { db } from '@/config/firebase';
import {
  getSecurityQuestionsForRecovery,
  verifySecurityAnswers,
  SecurityQuestion,
} from '@/services/security-questions';
import { changePasswordAfterVerification } from '@/services/password-reset';

export default function RecuperarContrasena() {
  const [step, setStep] = useState<'identifier' | 'questions' | 'newPassword' | 'success'>('identifier');
  const [loading, setLoading] = useState(false);
  const [identifier, setIdentifier] = useState('');
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleIdentifierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      let foundUid: string | null = null;
      let foundEmail: string | null = null;
      const usersRef = ref(db, 'users');
      
      console.log('🔍 Buscando usuario:', identifier);
      
      // Si tiene @, buscar por email
      if (identifier.includes('@')) {
        const emailNormalized = identifier.trim().toLowerCase();
        console.log('📧 Buscando por email:', emailNormalized);
        
        const emailQuery = query(usersRef, orderByChild('email'), equalTo(emailNormalized));
        const snapshot = await get(emailQuery);
        
        console.log('📊 Resultado búsqueda email:', snapshot.exists());
        
        if (snapshot.exists()) {
          const userData = Object.entries(snapshot.val())[0];
          foundUid = userData[0];
          foundEmail = emailNormalized;
          console.log('✅ Usuario encontrado:', foundUid);
        }
      } else {
        // Buscar por username
        const usernameNormalized = identifier.trim().toLowerCase();
        console.log('👤 Buscando por username:', usernameNormalized);
        
        const usernameRef = ref(db, `usernames/${usernameNormalized}`);
        const usernameSnapshot = await get(usernameRef);
        
        console.log('📊 Username existe:', usernameSnapshot.exists());
        
        if (usernameSnapshot.exists()) {
          foundEmail = usernameSnapshot.val().email;
          console.log('📧 Email del username:', foundEmail);
          
          // Ahora buscar el uid por email
          const emailQuery = query(usersRef, orderByChild('email'), equalTo(foundEmail));
          const snapshot = await get(emailQuery);
          
          if (snapshot.exists()) {
            const userData = Object.entries(snapshot.val())[0];
            foundUid = userData[0];
            console.log('✅ UID encontrado:', foundUid);
          }
        }
      }

      if (!foundUid || !foundEmail) {
        console.log('❌ Usuario no encontrado');
        setError('No se encontró ningún usuario con ese identificador');
        setLoading(false);
        return;
      }

      console.log('🔐 Verificando preguntas de seguridad para UID:', foundUid);
      
      // Verificar que tenga preguntas de seguridad configuradas
      const userQuestions = await getSecurityQuestionsForRecovery(foundUid);
      
      console.log('📝 Preguntas encontradas:', userQuestions.length);

      if (userQuestions.length === 0) {
        setError('Este usuario no tiene preguntas de seguridad configuradas. Por favor contacta al administrador.');
        setLoading(false);
        return;
      }

      setUserId(foundUid);
      setEmail(foundEmail);
      setQuestions(userQuestions);
      setStep('questions');
      console.log('✅ Pasando a preguntas de seguridad');
    } catch (err: any) {
      console.error('❌ Error buscando usuario:', err);
      console.error('❌ Detalles del error:', err.message, err.code);
      setError(`Error al buscar el usuario: ${err.message || 'Intenta nuevamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar que todas las respuestas estén completas
      if (answers.some((a) => !a.trim())) {
        setError('Por favor responde todas las preguntas');
        setLoading(false);
        return;
      }

      // Verificar respuestas
      const securityAnswers: SecurityQuestion[] = questions.map((q, i) => ({
        pregunta: q,
        respuesta: answers[i],
      }));

      const isValid = await verifySecurityAnswers(userId, securityAnswers);

      if (!isValid) {
        setError('Las respuestas no son correctas. Por favor intenta nuevamente.');
        setLoading(false);
        return;
      }

      // Si las respuestas son correctas, pasar al paso de nueva contraseña
      setStep('newPassword');
    } catch (err) {
      console.error('Error verificando respuestas:', err);
      setError('Error al verificar las respuestas. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validar contraseñas
      if (newPassword.length < 6) {
        setError('La contraseña debe tener al menos 6 caracteres');
        setLoading(false);
        return;
      }

      if (newPassword !== confirmPassword) {
        setError('Las contraseñas no coinciden');
        setLoading(false);
        return;
      }

      // Cambiar la contraseña usando el servicio
      const result = await changePasswordAfterVerification(email, newPassword);
      
      if (result.success) {
        toast({
          title: 'Contraseña actualizada',
          description: 'Tu contraseña ha sido cambiada exitosamente. Ya puedes iniciar sesión.',
        });
        
        setStep('success');
      } else {
        setError(result.message);
      }
    } catch (err) {
      console.error('Error cambiando contraseña:', err);
      setError('Error al cambiar la contraseña. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary/20 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mb-4">
            {step === 'success' ? (
              <CheckCircle2 className="w-6 h-6 text-primary" />
            ) : (
              <KeyRound className="w-6 h-6 text-primary" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {step === 'success' ? '¡Listo!' : 'Recuperar Contraseña'}
          </CardTitle>
          <CardDescription>
            {step === 'identifier' && 'Ingresa tu usuario o email'}
            {step === 'questions' && 'Responde las preguntas de seguridad'}
            {step === 'newPassword' && 'Ingresa tu nueva contraseña'}
            {step === 'success' && 'Contraseña actualizada exitosamente'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'identifier' && (
            <form onSubmit={handleIdentifierSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Usuario o Email</Label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    className="pl-10"
                    placeholder="usuario o email@ejemplo.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    required
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Continuar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/login')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver al inicio de sesión
                </Button>
              </div>
            </form>
          )}

          {step === 'questions' && (
            <form onSubmit={handleQuestionsSubmit} className="space-y-4">
              {questions.map((question, index) => (
                <div key={index} className="space-y-2">
                  <Label>Pregunta {index + 1}</Label>
                  <p className="text-sm text-muted-foreground mb-2">{question}</p>
                  <Input
                    placeholder="Tu respuesta"
                    value={answers[index]}
                    onChange={(e) => {
                      const newAnswers = [...answers];
                      newAnswers[index] = e.target.value;
                      setAnswers(newAnswers);
                    }}
                    required
                  />
                </div>
              ))}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Verificar Respuestas
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('identifier');
                    setAnswers(['', '', '']);
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              </div>
            </form>
          )}

          {step === 'newPassword' && (
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nueva Contraseña</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  minLength={6}
                />
                <p className="text-xs text-muted-foreground">
                  Mínimo 6 caracteres
                </p>
              </div>

              <div className="space-y-2">
                <Label>Confirmar Contraseña</Label>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Cambiar Contraseña
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setStep('questions');
                    setNewPassword('');
                    setConfirmPassword('');
                    setError(null);
                  }}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
              </div>
            </form>
          )}

          {step === 'success' && (
            <div className="space-y-4">
              <Alert className="border-primary/50 bg-primary/5">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                <AlertDescription className="ml-2">
                  Tu contraseña ha sido actualizada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña.
                </AlertDescription>
              </Alert>

              <Button
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Ir al inicio de sesión
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
