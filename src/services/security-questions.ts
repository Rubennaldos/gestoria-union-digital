import { ref, set, get } from "firebase/database";
import { db } from "@/config/firebase";

export interface SecurityQuestion {
  pregunta: string;
  respuesta: string;
}

/**
 * Guarda las preguntas de seguridad de un usuario
 */
export const saveSecurityQuestions = async (
  uid: string,
  questions: SecurityQuestion[]
): Promise<void> => {
  // Normalizar respuestas (lowercase y trim) para comparación futura
  const normalizedQuestions = questions.map(q => ({
    pregunta: q.pregunta,
    respuesta: q.respuesta.toLowerCase().trim()
  }));

  const questionsRef = ref(db, `security_questions/${uid}`);
  await set(questionsRef, {
    questions: normalizedQuestions,
    createdAt: Date.now(),
    updatedAt: Date.now()
  });
};

/**
 * Obtiene las preguntas de seguridad de un usuario
 */
export const getSecurityQuestions = async (
  uid: string
): Promise<SecurityQuestion[]> => {
  const questionsRef = ref(db, `security_questions/${uid}`);
  const snapshot = await get(questionsRef);
  
  if (!snapshot.exists()) {
    return [];
  }

  const data = snapshot.val();
  return data.questions || [];
};

/**
 * Verifica si las respuestas proporcionadas coinciden con las guardadas
 */
export const verifySecurityAnswers = async (
  uid: string,
  answers: SecurityQuestion[]
): Promise<boolean> => {
  const savedQuestions = await getSecurityQuestions(uid);
  
  if (savedQuestions.length === 0) {
    return false;
  }

  // Verificar que todas las respuestas coincidan
  return answers.every((answer, index) => {
    const savedQuestion = savedQuestions[index];
    if (!savedQuestion) return false;
    
    // Comparar preguntas y respuestas (normalizadas)
    return (
      answer.pregunta === savedQuestion.pregunta &&
      answer.respuesta.toLowerCase().trim() === savedQuestion.respuesta
    );
  });
};

/**
 * Busca un usuario por email y devuelve sus preguntas de seguridad (sin respuestas)
 * Útil para el flujo de recuperación de contraseña
 */
export const getSecurityQuestionsForRecovery = async (
  uid: string
): Promise<string[]> => {
  const questions = await getSecurityQuestions(uid);
  return questions.map(q => q.pregunta);
};
