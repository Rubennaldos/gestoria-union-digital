// src/messaging.ts
import { app } from "@/config/firebase";
import { getMessaging, getToken, onMessage, isSupported, Messaging } from "firebase/messaging";

let messaging: Messaging | null = null;
let swReady: ServiceWorkerRegistration | null = null;

export async function ensureMessagingReady() {
  if (!(await isSupported())) {
    console.warn("Firebase Messaging no soportado en este navegador.");
    return null;
  }
  if (!messaging) messaging = getMessaging(app);
  if (!swReady) {
    const swPath = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
    swReady = await navigator.serviceWorker.register(swPath);
  }
  // listener foreground (una sola vez)
  if (messaging) {
    onMessage(messaging, (payload) => {
      const n = payload.notification || {};
      try {
        new Notification(n.title || "Notificación", {
          body: n.body || "",
          icon: n.icon || "/icons/icon-192.png",
        });
      } catch {
        // En algunos browsers, muestra un fallback si no hay permiso
        console.log("Mensaje foreground:", payload);
      }
    });
  }
  return { messaging, swReady };
}

// Llama a esta función SOLO desde un handler de click del usuario.
export async function requestAndGetFcmToken() {
  const ready = await ensureMessagingReady();
  if (!ready || !ready.messaging || !ready.swReady) return null;

  // Solicitar permiso dentro del gesto de usuario
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    console.warn("Permiso no concedido:", permission);
    return null;
  }

  const vapidKey =
    "BGz2N4BNA_O6ySqUFRrCz8pr8H8Ao-u-PhTTIhj2NfyHsLjfGY95eqW-7UM0wAOOnteZpX720o-vDX26lryyNoE";

  try {
    const token = await getToken(ready.messaging, {
      vapidKey,
      serviceWorkerRegistration: ready.swReady,
    });
    console.log("✅ FCM token:", token);
    return token;
  } catch (err: any) {
    console.error("getToken error:", err?.code || err, err?.message);
    return null;
  }
}
