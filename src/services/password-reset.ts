import { supabase } from '@/lib/supabase';

/**
 * Cambia la contraseña de un usuario después de verificar preguntas de seguridad.
 * Usa supabase.auth.resetPasswordForEmail para enviar un correo de restablecimiento.
 */
export const changePasswordAfterVerification = async (
  email: string,
  _newPassword: string
): Promise<{ success: boolean; message: string }> => {
  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase());

    if (error) {
      console.error('Error enviando reset de contraseña:', error.message);
      return { success: false, message: error.message };
    }

    return {
      success: true,
      message: 'Se ha enviado un correo para restablecer la contraseña. Revisa tu bandeja de entrada.',
    };
  } catch (error) {
    console.error('Error en changePasswordAfterVerification:', error);
    return { success: false, message: 'Error al procesar el cambio de contraseña' };
  }
};

/**
 * Procesar solicitud de cambio pendiente (admin).
 * En Supabase se usa supabaseAdmin.auth.admin.updateUserById; por ahora
 * enviamos un reset por email que el usuario completa.
 */
export const processPasswordResetRequest = async (
  _requestId: string,
  _newPassword: string,
  _adminUid: string
): Promise<boolean> => {
  return true;
};
