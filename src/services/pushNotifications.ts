// src/services/pushNotifications.ts
// Push notifications disabled for web-only deployment
// This is a web application, not a native mobile app

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  console.debug('[pushNotifications] Push notifications not available in web-only environment');
  return null;
}

export default registerForPushNotificationsAsync;
