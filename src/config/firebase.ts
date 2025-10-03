// src/config/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";
import { getFirestore } from "firebase/firestore"; // 👈 Firestore

const firebaseConfig = {
  apiKey: "AIzaSyBXcToF3ieWgLHOoVE44vShZS5whV4U1Xw",
  authDomain: "sis-jpusap.firebaseapp.com",
  databaseURL: "https://sis-jpusap-default-rtdb.firebaseio.com",
  projectId: "sis-jpusap",
  storageBucket: "sis-jpusap.appspot.com",
  messagingSenderId: "784716205213",
  appId: "1:784716205213:web:de3a8dce709518cc841874",
};

// App principal
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

// RTDB (lo que ya usabas)
export const db = getDatabase(app);

// Firestore (nuevo, para las rutas como bootstrap/ y companias/.../configuracion/)
export const fs = getFirestore(app);

// (Opcional) App secundaria para aislar auth admin si la usas
const existingAdmin = getApps().find((a) => a.name === "AdminApp");
export const adminApp = existingAdmin ?? initializeApp(firebaseConfig, "AdminApp");
export const adminAuth = getAuth(adminApp);
