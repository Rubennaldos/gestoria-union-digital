/* public/firebase-messaging-sw.js */
/* Compat para web: funciona con apps que usan SDK modular o compat. */
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/9.23.0/firebase-messaging-compat.js");

/* 👇 Usa tu config del proyecto (la misma que en la app) */
firebase.initializeApp({
  apiKey: "TU_API_KEY",
  authDomain: "TU_AUTH_DOMAIN",
  projectId: "TU_PROJECT_ID",
  storageBucket: "TU_BUCKET",
  messagingSenderId: "TU_SENDER_ID",
  appId: "TU_APP_ID"
});

const messaging = firebase.messaging();

/* Notificaciones en segundo plano (app cerrada / en otra tab) */
messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || "Notificación", {
    body: body || "",
    icon: icon || "/icons/icon-192.png",
    data: payload.data || {}
  });
});
