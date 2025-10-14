// src/config/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore"; // si lo usas en otras rutas

const firebaseConfig = {
  apiKey: "AIzaSyBXcToF3ieWgLHOoVE44vShZS5whV4U1Xw",
  authDomain: "sis-jpusap.firebaseapp.com",
  databaseURL: "https://sis-jpusap-default-rtdb.firebaseio.com",
  projectId: "sis-jpusap",
  storageBucket: "sis-jpusap.appspot.com", // ← no se usa, pero puede quedar
  messagingSenderId: "784716205213",
  appId: "1:784716205213:web:de3a8dce709518cc841874",
};

export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);
export const fs = getFirestore(app);

// (opcional) app secundaria si la usas
const existingAdmin = getApps().find((a) => a.name === "AdminApp");
export const adminApp =
  existingAdmin ?? initializeApp(firebaseConfig, "AdminApp");
export const adminAuth = getAuth(adminApp);

// ❌ Nota: NO exportamos getStorage ni nada de "firebase/storage".
