import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { BACKEND_URL } from '../config';

export const CUSTOMER_UPDATES_CHANNEL_ID = 'customer_updates';

let channelConfigured = false;
let lastRegisteredKey: string | null = null;
let cachedDeviceToken: string | null = null;

try {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
} catch (err) {
  console.warn('[CustomerPush] Failed to set notification handler:', err);
}

export async function ensureCustomerNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelConfigured) return;
  try {
    await Notifications.setNotificationChannelAsync(CUSTOMER_UPDATES_CHANNEL_ID, {
      name: 'Live Order Status Updates',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'default',
      vibrationPattern: [0, 300, 150, 300],
      enableLights: true,
      lightColor: '#FF6B00',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      showBadge: true,
    });
    channelConfigured = true;
  } catch (err) {
    console.warn('[CustomerPush] Channel setup failed:', err);
  }
}

async function getNativeDevicePushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    await ensureCustomerNotificationChannels();

    const existingPerms = await Notifications.getPermissionsAsync();
    let finalStatus = existingPerms.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[CustomerPush] Notification permission not granted:', finalStatus);
      return null;
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    const rawToken = typeof tokenData?.data === 'string' ? tokenData.data.trim() : '';
    if (!rawToken) return null;

    cachedDeviceToken = rawToken;
    return rawToken;
  } catch (err) {
    console.warn('[CustomerPush] Unable to fetch native FCM token:', err);
    return null;
  }
}

export async function registerCustomerPushToken(authToken: string): Promise<void> {
  if (!authToken) return;
  try {
    const pushToken = cachedDeviceToken || (await getNativeDevicePushToken());
    if (!pushToken) return;

    const dedupeKey = `${pushToken}::${authToken.slice(0, 12)}`;
    if (lastRegisteredKey === dedupeKey) return;

    const res = await fetch(`${BACKEND_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        appType: 'customer',
        platform: Platform.OS,
      }),
    });

    if (res.ok) {
      lastRegisteredKey = dedupeKey;
      console.log('🔔 [CustomerPush] Registered FCM device token');
    }
  } catch (err) {
    console.warn('[CustomerPush] Token registration failed:', err);
  }
}

export async function unregisterCustomerPushToken(): Promise<void> {
  try {
    const tokenToRemove = cachedDeviceToken;
    lastRegisteredKey = null;
    if (!tokenToRemove) return;

    await fetch(`${BACKEND_URL}/api/notifications/unregister-token`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: tokenToRemove }),
    });
  } catch (err) {
    console.warn('[CustomerPush] Token unregister failed:', err);
  }
}

export function subscribeCustomerNotifications(callbacks: {
  onForegroundUpdate: (data: Record<string, any>) => void;
  onNotificationTap: (data: Record<string, any>) => void;
}): () => void {
  const subs: Array<{ remove: () => void }> = [];
  try {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = (notification?.request?.content?.data || {}) as Record<string, any>;
      callbacks.onForegroundUpdate(data);
    });
    subs.push(receivedSub);

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response?.notification?.request?.content?.data || {}) as Record<string, any>;
      callbacks.onNotificationTap(data);
    });
    subs.push(responseSub);

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const data = (lastResponse.notification?.request?.content?.data || {}) as Record<string, any>;
      callbacks.onNotificationTap(data);
      try {
        Notifications.clearLastNotificationResponse();
      } catch {}
    }
  } catch (err) {
    console.warn('[CustomerPush] Listener setup failed:', err);
  }

  return () => {
    subs.forEach((s) => {
      try {
        s.remove();
      } catch {}
    });
  };
}
