// src/messaging.ts
import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

// ⚠️ Rellena con tu config real
const firebaseConfig = {
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
};

const app = initializeApp(firebaseConfig);

export async function initMessaging() {
  if (!(await isSupported())) {
    console.warn("FCM no soportado en este navegador.");
    return null;
  }

  const messaging = getMessaging(app);

  // En Vite, BASE_URL = "/gestoria-union-digital/" en GitHub Pages (o "/" en local)
  const swPath = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
  const registration = await navigator.serviceWorker.register(swPath);

  // Pide permisos
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Permiso de notificación denegado");
    return null;
  }

  // VAPID pública (Firebase Console → Cloud Messaging → Web Push certificates)
  const vapidKey = "TU_VAPID_KEY_PUBLICA";
  const token = await getToken(messaging, {
    vapidKey,
    serviceWorkerRegistration: registration
  });

  console.log("FCM token:", token);

  // Notificaciones en foreground
  onMessage(messaging, (payload) => {
    const { title, body, icon } = payload.notification || {};
    new Notification(title || "Notificación", {
      body: body || "",
      icon: icon || "/icons/icon-192.png"
    });
  });

  return token;
}
