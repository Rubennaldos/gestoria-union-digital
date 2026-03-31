// src/lib/supabase.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl     = import.meta.env.VITE_SUPABASE_URL      as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
// Clave privilegiada: salta RLS. Solo para operaciones de administrador.
// ⚠️  En producción pública mover estas operaciones a Edge Functions.
const serviceRoleKey  = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY as string | undefined;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    '[supabase] Faltan variables de entorno VITE_SUPABASE_URL y/o VITE_SUPABASE_ANON_KEY. ' +
    'Crea un archivo .env en la raíz del proyecto con esas claves.'
  );
}

/** Cliente público — anon key. Usa este en todos los componentes y servicios. */
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/**
 * Cliente privilegiado — service_role key.
 * Disponible solo si VITE_SUPABASE_SERVICE_ROLE_KEY está en .env.
 * Úsalo únicamente en funciones de administrador (crear/borrar usuarios, etc.).
 * ⚠️  Este cliente ignora completamente las políticas RLS.
 */
export const supabaseAdmin = serviceRoleKey
  ? createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession:    false,
        autoRefreshToken:  false,
        detectSessionInUrl: false,
        // storageKey diferente evita el warning "Multiple GoTrueClient instances"
        storageKey: 'sb-admin-token',
      },
    })
  : null;
