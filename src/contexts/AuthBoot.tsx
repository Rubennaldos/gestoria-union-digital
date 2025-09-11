// src/contexts/AuthBoot.tsx
import { createContext, useContext, useEffect, useState, PropsWithChildren } from "react";
import { getAuth, onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { app } from "@/config/firebase";

type Ctx = { user: User | null; ready: boolean };
const AuthBootCtx = createContext<Ctx>({ user: null, ready: false });

export function AuthBootProvider({ children }: PropsWithChildren<{}>) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const auth = getAuth(app);
    // Garantiza sesión (reglas usan auth != null)
    signInAnonymously(auth).catch(console.error);

    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u ?? null);
      setReady(true);
    });
    return () => unsub();
  }, []);

  return <AuthBootCtx.Provider value={{ user, ready }}>{children}</AuthBootCtx.Provider>;
}

export function useAuthBoot() {
  return useContext(AuthBootCtx);
}
