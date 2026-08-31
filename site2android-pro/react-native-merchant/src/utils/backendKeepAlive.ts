import { AppState, AppStateStatus } from 'react-native';

const PING_INTERVAL_MS = 10 * 60 * 1000; // 10 minutes (Render spins down after 15 min)
let lastPingTime = 0;
let keepAliveInterval: ReturnType<typeof setInterval> | null = null;
let appStateSubscription: { remove: () => void } | null = null;

/**
 * Sends a lightweight non-blocking GET ping to the backend /health endpoint.
 * This ensures the Render container stays warm and avoids cold start delays for merchants.
 * Does zero database operations and has zero overhead.
 */
export async function pingBackend(backendUrl: string): Promise<void> {
  try {
    const url = `${backendUrl.replace(/\/+$/, '')}/health`;
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 15000) : null;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      signal: controller?.signal,
    }).catch(() => null);

    if (timeoutId) clearTimeout(timeoutId);
    lastPingTime = Date.now();
    if (response?.ok) {
      console.log('🟢 [KeepAlive] Merchant backend warm & responsive');
    }
  } catch {
    // Fail silently: never throw or block UI
  }
}

/**
 * Initializes the keep-alive monitor for merchant app:
 * 1. Pings immediately on app launch.
 * 2. Runs periodic heartbeat while the app is active.
 * 3. Wakes up backend whenever merchant app returns from background.
 */
export function initBackendKeepAlive(backendUrl: string): () => void {
  // 1. Initial immediate ping on app launch
  pingBackend(backendUrl);

  // 2. Periodic interval ping
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
  }
  keepAliveInterval = setInterval(() => {
    pingBackend(backendUrl);
  }, PING_INTERVAL_MS);

  // 3. Listen for app foreground transitions
  if (appStateSubscription) {
    appStateSubscription.remove();
  }
  appStateSubscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      const now = Date.now();
      if (now - lastPingTime > 5 * 60 * 1000) {
        pingBackend(backendUrl);
      }
    }
  });

  return () => {
    if (keepAliveInterval) {
      clearInterval(keepAliveInterval);
      keepAliveInterval = null;
    }
    if (appStateSubscription) {
      appStateSubscription.remove();
      appStateSubscription = null;
    }
  };
}
