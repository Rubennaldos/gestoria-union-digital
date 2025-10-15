// scripts/firebase.migracion.cjs
// Inicialización de Firebase para scripts de migración (CommonJS)
const { initializeApp, getApp, getApps } = require("firebase/app");

const firebaseConfig = {
  apiKey: "AIzaSyBXcToF3ieWgLHOoVE44vShZS5whV4U1Xw",
  authDomain: "sis-jpusap.firebaseapp.com",
  databaseURL: "https://sis-jpusap-default-rtdb.firebaseio.com",
  projectId: "sis-jpusap",
  storageBucket: "sis-jpusap.appspot.com",
  messagingSenderId: "784716205213",
  appId: "1:784716205213:web:de3a8dce709518cc841874",
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

module.exports = { app };
