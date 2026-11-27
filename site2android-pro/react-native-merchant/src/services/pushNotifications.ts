import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { apiClient } from './apiClient';
import { secureStorage } from '../utils/storage';

export const MERCHANT_KITCHEN_CHANNEL_ID = 'kitchen_orders';

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
  console.warn('[MerchantPush] Failed to set notification handler:', err);
}

export async function ensureMerchantNotificationChannels(): Promise<void> {
  if (Platform.OS !== 'android' || channelConfigured) return;
  try {
    await Notifications.setNotificationChannelAsync(MERCHANT_KITCHEN_CHANNEL_ID, {
      name: 'New Kitchen Orders & Alerts',
      importance: Notifications.AndroidImportance.MAX,
      sound: 'order_alert.wav',
      vibrationPattern: [0, 500, 250, 500, 250, 500],
      enableLights: true,
      lightColor: '#FF6B00',
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
    console.warn('[MerchantPush] Channel setup failed:', err);
  }
}

async function getNativeDevicePushToken(): Promise<string | null> {
  if (Platform.OS === 'web') return null;
  try {
    await ensureMerchantNotificationChannels();

    const existingPerms = await Notifications.getPermissionsAsync();
    let finalStatus = existingPerms.status;
    if (finalStatus !== 'granted') {
      const requested = await Notifications.requestPermissionsAsync({
        ios: { allowAlert: true, allowBadge: true, allowSound: true },
      });
      finalStatus = requested.status;
    }

    if (finalStatus !== 'granted') {
      console.warn('[MerchantPush] Notification permission not granted:', finalStatus);
      return null;
    }

    const tokenData = await Notifications.getDevicePushTokenAsync();
    const rawToken = typeof tokenData?.data === 'string' ? tokenData.data.trim() : '';
    if (!rawToken) return null;

    cachedDeviceToken = rawToken;
    return rawToken;
  } catch (err) {
    console.warn('[MerchantPush] Unable to fetch native FCM token:', err);
    return null;
  }
}

export async function registerMerchantPushToken(restaurantId?: string): Promise<void> {
  try {
    const authToken = await secureStorage.getItem('auth_token');
    if (!authToken) return;

    const pushToken = cachedDeviceToken || (await getNativeDevicePushToken());
    if (!pushToken) return;

    const dedupeKey = `${pushToken}::${restaurantId || 'auto'}`;
    if (lastRegisteredKey === dedupeKey) return;

    await apiClient.post('/notifications/register-token', {
      token: pushToken,
      appType: 'merchant',
      platform: Platform.OS,
      restaurantId: restaurantId || undefined,
    });

    lastRegisteredKey = dedupeKey;
    console.log('🔔 [MerchantPush] Registered FCM device token');
  } catch (err) {
    console.warn('[MerchantPush] Token registration failed:', err);
  }
}

export async function unregisterMerchantPushToken(): Promise<void> {
  try {
    const tokenToRemove = cachedDeviceToken;
    lastRegisteredKey = null;
    if (!tokenToRemove) return;

    await apiClient.delete('/notifications/unregister-token', {
      data: { token: tokenToRemove },
    });
  } catch (err) {
    console.warn('[MerchantPush] Token unregister failed:', err);
  }
}

export function subscribeMerchantNotifications(
  onOrderEvent: (data: Record<string, any>) => void
): () => void {
  const subs: Array<{ remove: () => void }> = [];
  try {
    const receivedSub = Notifications.addNotificationReceivedListener((notification) => {
      const data = (notification?.request?.content?.data || {}) as Record<string, any>;
      onOrderEvent(data);
    });
    subs.push(receivedSub);

    const responseSub = Notifications.addNotificationResponseReceivedListener((response) => {
      const data = (response?.notification?.request?.content?.data || {}) as Record<string, any>;
      onOrderEvent(data);
    });
    subs.push(responseSub);

    const lastResponse = Notifications.getLastNotificationResponse();
    if (lastResponse) {
      const data = (lastResponse.notification?.request?.content?.data || {}) as Record<string, any>;
      onOrderEvent(data);
      try {
        Notifications.clearLastNotificationResponse();
      } catch {}
    }
  } catch (err) {
    console.warn('[MerchantPush] Listener setup failed:', err);
  }

  return () => {
    subs.forEach((s) => {
      try {
        s.remove();
      } catch {}
    });
  };
}
