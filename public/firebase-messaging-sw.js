/* public/firebase-messaging-sw.js
   Service Worker para Firebase Cloud Messaging (Web Push)
   - Debe estar en la RAÍZ pública del sitio
   - Compatible con apps que usan SDK modular o compat
*/
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

// Config de tu proyecto (misma que en tu app)
firebase.initializeApp({
  apiKey: "AIzaSyBXcToF3ieWgLHOoVE44vShZS5whV4U1Xw",
  authDomain: "sis-jpusap.firebaseapp.com",
  databaseURL: "https://sis-jpusap-default-rtdb.firebaseio.com",
  projectId: "sis-jpusap",
  storageBucket: "sis-jpusap.appspot.com",
  messagingSenderId: "784716205213",
  appId: "1:784716205213:web:de3a8dce709518cc841874",
});

const messaging = firebase.messaging();

/**
 * Maneja mensajes cuando la app está en segundo plano
 * (pestaña en background o cerrada).
 * Si el payload trae notification, la mostramos; si trae solo data,
 * creamos una notificación con valores por defecto.
 */
messaging.onBackgroundMessage((payload) => {
  // payload.notification puede venir vacío en "data-only" messages
  const notif = payload.notification || {};
  const data = payload.data || {};

  const title = notif.title || data.title || "Notificación";
  const body = notif.body || data.body || "";
  const icon = notif.icon || data.icon || "/icons/icon-192.png";

  // Puedes pasar una URL de destino en data.url o notification.click_action
  const clickUrl = data.url || notif.click_action || null;

  self.registration.showNotification(title, {
    body,
    icon,
    badge: "/icons/icon-192.png",
    data: { ...data, url: clickUrl }, // queda disponible en notificationclick
    requireInteraction: false, // cambia a true si quieres que quede fija
  });
});

/**
 * Click en la notificación → enfocamos una pestaña abierta o abrimos una nueva.
 * Usa data.url si la envías desde tu servidor/console; si no, navega a la raíz.
 */
self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const targetUrl =
    (event.notification && event.notification.data && event.notification.data.url) ||
    self.registration.scope; // fallback: la raíz del SW

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        // Si ya hay una pestaña abierta de la app, enfócala y navega si hay URL
        for (const client of clientList) {
          if ("focus" in client) {
            client.focus();
            if (targetUrl) client.navigate(targetUrl);
            return;
          }
        }
        // Si no hay pestañas, abre nueva
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
      })
  );
});

/* (Opcional) Maneja actualizaciones del SW inmediatamente al publicar nueva versión */
// self.addEventListener("install", () => self.skipWaiting());
// self.addEventListener("activate", (event) => {
//   event.waitUntil(clients.claim());
// });
