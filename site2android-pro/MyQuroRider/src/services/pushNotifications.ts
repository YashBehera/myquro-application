import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { BACKEND_URL } from '../config';

export const RIDER_OFFERS_CHANNEL_ID = 'rider_offers';

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
  console.warn('[RiderPush] Failed to set notification handler:', err);
}

export async function ensureRiderNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelConfigured) return;
  try {
    await Notifications.setNotificationChannelAsync(RIDER_OFFERS_CHANNEL_ID, {
      name: 'Delivery Offers & Trip Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'order_alert.wav',
      vibrationPattern: [0, 500, 200, 500, 200, 500],
      enableLights: true,
      lightColor: '#10B981',
      lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
      bypassDnd: true,
      showBadge: true,
      audioAttributes: {
        usage: Notifications.AndroidAudioUsage.ALARM,
        contentType: Notifications.AndroidAudioContentType.SONIFICATION,
        flags: {
          enforceAudibility: true,
          requestHardwareAudioVideoSynchronization: false,
        },
      },
    });
    channelConfigured = true;
  } catch (err) {
    console.warn('[RiderPush] Channel setup failed:', err);
  }
}

async function getNativeDevicePushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    await ensureRiderNotificationChannels();

    const existingPerms = await Notifications.getPermissionsAsync();
    let finalStatus = existingPerms.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[RiderPush] Notification permission not granted:', finalStatus);
      return null;
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    const rawToken = typeof tokenData?.data === 'string' ? tokenData.data.trim() : '';
    if (!rawToken) return null;

    cachedDeviceToken = rawToken;
    return rawToken;
  } catch (err) {
    console.warn('[RiderPush] Unable to fetch native FCM token:', err);
    return null;
  }
}

export async function registerRiderPushToken(
  authToken: string,
  riderId?: string
): Promise<void> {
  if (!authToken) return;
  try {
    const pushToken = cachedDeviceToken || (await getNativeDevicePushToken());
    if (!pushToken) return;

    const dedupeKey = `${pushToken}::${authToken.slice(0, 12)}::${riderId || 'self'}`;
    if (lastRegisteredKey === dedupeKey) return;

    const res = await fetch(`${BACKEND_URL}/api/notifications/register-token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify({
        token: pushToken,
        appType: 'rider',
        platform: Platform.OS,
        riderId: riderId || undefined,
      }),
    });

    if (res.ok) {
      lastRegisteredKey = dedupeKey;
      console.log('🔔 [RiderPush] Registered FCM device token');
    }
  } catch (err) {
    console.warn('[RiderPush] Token registration failed:', err);
  }
}

export async function unregisterRiderPushToken(): Promise<void> {
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
    console.warn('[RiderPush] Token unregister failed:', err);
  }
}

export function subscribeRiderNotifications(
  onOfferEvent: (data: Record<string, any>) => void
): () => void {
  const subs: Array<{ remove: () => void }> = [];
  try {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = (notification?.request?.content?.data || {}) as Record<string, any>;
      onOfferEvent(data);
    });
    subs.push(receivedSub);

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response?.notification?.request?.content?.data || {}) as Record<string, any>;
      onOfferEvent(data);
    });
    subs.push(responseSub);

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const data = (lastResponse.notification?.request?.content?.data || {}) as Record<string, any>;
      onOfferEvent(data);
      try {
        Notifications.clearLastNotificationResponse();
      } catch {}
    }
  } catch (err) {
    console.warn('[RiderPush] Listener setup failed:', err);
  }

  return () => {
    subs.forEach((s) => {
      try {
        s.remove();
      } catch {}
    });
  };
}
