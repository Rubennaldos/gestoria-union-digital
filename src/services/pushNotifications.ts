// src/services/pushNotifications.ts
// Register Expo push token and persist under users/{uid}/fcmTokens/{token}
import { auth } from '@/config/firebase';
import { ref, set } from 'firebase/database';
import { db } from '@/config/firebase';

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  try {
    const uid = auth.currentUser?.uid;
    if (!uid) {
      console.debug('[pushNotifications] No auth user available, skipping token registration');
      return null;
    }

    let expoNotifications: any;
    try {
      // Dynamic import so web builds that don't include Expo won't fail at bundle time
      expoNotifications = await import('expo-notifications');
    } catch (e) {
      console.warn('[pushNotifications] expo-notifications not available in this environment:', e);
      return null;
    }

    // Ask for permissions
    try {
      const { status: existingStatus } = await expoNotifications.getPermissionsAsync?.() ?? { status: 'undetermined' };
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await expoNotifications.requestPermissionsAsync?.() ?? { status: 'undetermined' };
        finalStatus = status;
      }

      if (finalStatus !== 'granted') {
        console.warn('[pushNotifications] Notification permissions not granted');
        return null;
      }
    } catch (e) {
      console.warn('[pushNotifications] Error while requesting notification permissions:', e);
      // continue and attempt to get token — some platforms behave differently
    }

    // Get Expo push token
    let tokenData: any;
    try {
      tokenData = await expoNotifications.getExpoPushTokenAsync?.();
    } catch (e) {
      console.warn('[pushNotifications] getExpoPushTokenAsync failed:', e);
      return null;
    }

    const token = tokenData?.data || tokenData?.token || String(tokenData);
    if (!token) {
      console.warn('[pushNotifications] No push token obtained');
      return null;
    }

    // Persist token under users/{uid}/fcmTokens/{token}
    try {
      const path = `users/${uid}/fcmTokens/${token}`;
      await set(ref(db, path), { createdAt: Date.now() });
      console.debug('[pushNotifications] Token saved', { uid, token, path });
      return token;
    } catch (e) {
      console.error('[pushNotifications] Failed to save token to RTDB:', e);
      return null;
    }
  } catch (err) {
    console.error('[pushNotifications] Unexpected error in registerForPushNotificationsAsync:', err);
    return null;
  }
}

export default registerForPushNotificationsAsync;
