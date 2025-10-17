// src/config/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage"; // <- NUEVO

const firebaseConfig = {
  apiKey: "AIzaSyBXcToF3ieWgLHOoVE44vShZS5whV4U1Xw",
  authDomain: "sis-jpusap.firebaseapp.com",
  databaseURL: "https://sis-jpusap-default-rtdb.firebaseio.com",
  projectId: "sis-jpusap",
  storageBucket: "sis-jpusap.firebasestorage.app", // <- DEJA SOLO ESTA
  messagingSenderId: "784716205213",
  appId: "1:784716205213:web:de3a8dce709518cc841874",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
// Debug RTDB only in dev.
// Debug RTDB only in development mode. Use import.meta?.env?.MODE to avoid
// evaluating in production bundles and wrap in try/catch for safety.
if (import.meta?.env?.MODE === 'development') {
  try {
    // dynamic import keeps build stable in production and avoids type mismatches
    import('firebase/database')
      .then((m: any) => m?.setLogLevel?.('debug'))
      .catch(() => {});
  } catch {
    // swallow any error to avoid breaking initialization
  }
}
export const fs = getFirestore(app);
export const storage = getStorage(app); // <- NUEVO

// (si usas app secundaria)
const existingAdmin = getApps().find((a) => a.name === "AdminApp");
export const adminApp = existingAdmin ?? initializeApp(firebaseConfig, "AdminApp");
export const adminAuth = getAuth(adminApp);
