// src/config/firebase.ts
import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getDatabase } from "firebase/database";

// Config exacta del proyecto
const firebaseConfig = {
  apiKey: "AIzaSyBXcToF3ieWgLHOoVE44vShZS5whV4U1Xw",
  authDomain: "sis-jpusap.firebaseapp.com",
  databaseURL: "https://sis-jpusap-default-rtdb.firebaseio.com", // ✅ necesario para RTDB
  projectId: "sis-jpusap",
  storageBucket: "sis-jpusap.appspot.com", // ✅ formato de bucket correcto
  messagingSenderId: "784716205213",
  appId: "1:784716205213:web:de3a8dce709518cc841874",
};

// App principal (sesión del usuario)
export const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getDatabase(app);

// App secundaria (opcional) para operaciones separadas, sin tocar la sesión actual
const existingAdmin = getApps().find((a) => a.name === "AdminApp");
export const adminApp = existingAdmin ?? initializeApp(firebaseConfig, "AdminApp");
export const adminAuth = getAuth(adminApp);
