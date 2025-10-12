// src/messaging.ts
import { app } from "@/config/firebase";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";

const VAPID_PUBLIC =
  "BGz2N4BNA_O6ySqUFRrCz8pr8H8Ao-u-PhTTIhj2NfyHsLjfGY95eqW-7UM0wAOOnteZpX720o-vDX26lryyNoE";

let messaging: Messaging | null = null;
let swReg: ServiceWorkerRegistration | null = null;
let foregroundHooked = false;

/** Prepara SW + listeners (NO pide permisos). Llamar 1 vez al arrancar. */
export async function ensureMessagingReady() {
  if (!(await isSupported())) {
    console.warn("Firebase Messaging no soportado en este navegador.");
    return null;
  }
  if (!messaging) messaging = getMessaging(app);
  if (!swReg) {
    const swPath = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
    swReg = await navigator.serviceWorker.register(swPath);
  }
  if (!foregroundHooked && messaging) {
    onMessage(messaging, (payload) => {
      const n = payload.notification || {};
      try {
        new Notification(n.title || "Notificación", {
          body: n.body || "",
          icon: n.icon || "/icons/icon-192.png",
        });
      } catch {
        console.log("Mensaje foreground:", payload);
      }
    });
    foregroundHooked = true;
  }
  return { messaging, swReg };
}

/** Llamar SOLO desde el onClick de “Activar Notificaciones”. */
export async function requestAndGetFcmToken() {
  const ready = await ensureMessagingReady();
  if (!ready || !ready.messaging || !ready.swReg) return null;

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Permiso no concedido:", permission);
    return null;
  }

  try {
    const token = await getToken(ready.messaging, {
      vapidKey: VAPID_PUBLIC,
      serviceWorkerRegistration: ready.swReg,
    });
    if (!token) {
      console.warn("No se obtuvo token FCM.");
      return null;
    }
    console.log("✅ FCM token:", token);
    return token;
  } catch (e) {
    console.error("getToken error:", e);
    return null;
  }
}
