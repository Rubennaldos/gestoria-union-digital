import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, Mail, Loader2, ArrowLeft, KeyRound, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ref, get, query, orderByChild, equalTo } from 'firebase/database';
import { db, auth } from '@/config/firebase';
import { sendPasswordResetEmail } from 'firebase/auth';
import {
  getSecurityQuestionsForRecovery,
  verifySecurityAnswers,
  SecurityQuestion,
} from '@/services/security-questions';

export default function RecuperarContrasena() {
  const [step, setStep] = useState<'email' | 'questions' | 'success'>('email');
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [userId, setUserId] = useState('');
  const [questions, setQuestions] = useState<string[]>([]);
  const [answers, setAnswers] = useState<string[]>(['', '', '']);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const emailNormalized = email.trim().toLowerCase();
      
      // Buscar usuario por email en /users
      const usersRef = ref(db, 'users');
      const emailQuery = query(usersRef, orderByChild('email'), equalTo(emailNormalized));
      const snapshot = await get(emailQuery);

      if (!snapshot.exists()) {
        setError('No se encontró ningún usuario con ese email');
        setLoading(false);
        return;
      }

      // Obtener el primer usuario que coincida
      const userData = Object.entries(snapshot.val())[0];
      const uid = userData[0];

      // Verificar que tenga preguntas de seguridad configuradas
      const userQuestions = await getSecurityQuestionsForRecovery(uid);

      if (userQuestions.length === 0) {
        setError('Este usuario no tiene preguntas de seguridad configuradas. Por favor contacta al administrador.');
        setLoading(false);
        return;
      }

      setUserId(uid);
      setQuestions(userQuestions);
      setStep('questions');
    } catch (err) {
      console.error('Error buscando usuario:', err);
      setError('Error al buscar el usuario. Intenta nuevamente.');
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

      // Si las respuestas son correctas, enviar email de recuperación
      await sendPasswordResetEmail(auth, email.trim().toLowerCase());

      toast({
        title: 'Verificación exitosa',
        description: 'Revisa tu correo para restablecer tu contraseña.',
      });

      setStep('success');
    } catch (err) {
      console.error('Error verificando respuestas:', err);
      setError('Error al verificar las respuestas. Intenta nuevamente.');
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
            {step === 'email' && 'Ingresa tu email para comenzar'}
            {step === 'questions' && 'Responde las preguntas de seguridad'}
            {step === 'success' && 'Revisa tu correo electrónico'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {step === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    className="pl-10"
                    placeholder="tu-email@ejemplo.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
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
                    setStep('email');
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

          {step === 'success' && (
            <div className="space-y-4">
              <Alert className="border-primary/50 bg-primary/5">
                <Mail className="h-4 w-4 text-primary" />
                <AlertDescription className="ml-2">
                  Hemos enviado un correo electrónico a <strong>{email}</strong> con las instrucciones para restablecer tu contraseña.
                </AlertDescription>
              </Alert>

              <div className="text-sm text-muted-foreground space-y-2">
                <p>• Revisa tu bandeja de entrada y la carpeta de spam</p>
                <p>• El enlace expirará en 1 hora por seguridad</p>
                <p>• Si no recibes el correo, intenta nuevamente</p>
              </div>

              <Button
                className="w-full"
                onClick={() => navigate('/login')}
              >
                Volver al inicio de sesión
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
