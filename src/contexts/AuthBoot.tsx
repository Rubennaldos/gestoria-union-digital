// src/contexts/AuthBoot.tsx
// Provee un usuario "anónimo" que los componentes legacy necesitan (rules: auth != null).
// Ahora delega a Supabase Auth — si hay sesión activa, "ready" es true.
import { createContext, useContext, useEffect, useState, PropsWithChildren } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Ctx = { user: User | null; ready: boolean };
const AuthBootCtx = createContext<Ctx>({ user: null, ready: false });

export function AuthBootProvider({ children }: PropsWithChildren<{}>) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setReady(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
        setReady(true);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  return <AuthBootCtx.Provider value={{ user, ready }}>{children}</AuthBootCtx.Provider>;
}

export function useAuthBoot() {
  return useContext(AuthBootCtx);
}
