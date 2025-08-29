import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// TU CONFIG EXACTA
const firebaseConfig = {
  apiKey: "AIzaSyBXcToF3ieWgLHOoVE44vShZS5whV4U1Xw",
  authDomain: "sis-jpusap.firebaseapp.com",
  projectId: "sis-jpusap",
  storageBucket: "sis-jpusap.firebasestorage.app",
  messagingSenderId: "784716205213",
  appId: "1:784716205213:web:de3a8dce709518cc841874"
};

// App principal (sesión del admin)
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// ⭐ App secundaria SOLO para crear cuentas (no toca tu sesión)
export const adminApp = initializeApp(firebaseConfig, "AdminApp");
export const adminAuth = getAuth(adminApp);
