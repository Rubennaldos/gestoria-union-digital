// src/messaging.ts
import { app } from "@/config/firebase";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

export async function initMessaging() {
  try {
    if (!(await isSupported())) {
      console.warn("Firebase Messaging no soportado en este navegador.");
      return null;
    }

    const messaging = getMessaging(app);

    // Usa BASE_URL para que funcione en GitHub Pages (subcarpeta) y local
    const swPath = `${import.meta.env.BASE_URL}firebase-messaging-sw.js`;
    const registration = await navigator.serviceWorker.register(swPath);

    // Solicita permisos
    const permission = await Notification.requestPermission();
    if (permission !== "granted") {
      console.warn("Permiso de notificación denegado.");
      return null;
    }

    // ✅ Tu VAPID pública
    const vapidKey =
      "BGz2N4BNA_O6ySqUFRrCz8pr8H8Ao-u-PhTTIhj2NfyHsLjfGY95eqW-7UM0wAOOnteZpX720o-vDX26lryyNoE";

    const token = await getToken(messaging, {
      vapidKey,
      serviceWorkerRegistration: registration,
    });

    if (!token) {
      console.warn("No se obtuvo token FCM (revisa permisos/VAPID).");
      return null;
    }

    console.log("✅ FCM token:", token);
    // TODO: si quieres envíos dirigidos, guarda este token en tu RTDB/Firestore

    // Mensajes en primer plano
    onMessage(messaging, (payload) => {
      const n = payload.notification || {};
      new Notification(n.title || "Notificación", {
        body: n.body || "",
        icon: n.icon || "/icons/icon-192.png",
      });
    });

    return token;
  } catch (err) {
    console.error("Error inicializando FCM:", err);
    return null;
  }
}
