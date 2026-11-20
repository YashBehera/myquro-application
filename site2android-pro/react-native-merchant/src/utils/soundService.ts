import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, NativeModules } from 'react-native';
import { Asset } from 'expo-asset';

const KITCHEN_ALARM_KEY = '@myquro_kitchen_alarm_enabled';

type AudioBridgeCommand = 'START_ALARM' | 'STOP_ALARM' | 'PLAY_ONCE';
type BridgeCallback = (command: AudioBridgeCommand) => void;

let createAudioPlayer: any = null;
let setAudioModeAsync: any = null;

try {
  const expoAudio = require('expo-audio');
  createAudioPlayer = expoAudio.createAudioPlayer;
  setAudioModeAsync = expoAudio.setAudioModeAsync;
  console.log('🟢 [SoundService] expo-audio native engine loaded');
} catch (e) {
  console.log('ℹ️ [SoundService] expo-audio fallback mode:', e);
}

class SoundService {
  private bridgeCallback: BridgeCallback | null = null;
  private isAlarmPlaying: boolean = false;
  private hapticInterval: any = null;
  private nativePlayer: any = null;
  private isAudioModeConfigured: boolean = false;
  private localSoundUri: string | null = null;

  constructor() {
    // Pre-cache asset in memory
    this.prepareSoundAsset();
  }

  private async prepareSoundAsset(): Promise<string | null> {
    if (this.localSoundUri) return this.localSoundUri;
    try {
      const asset = Asset.fromModule(require('../../assets/sounds/order_alert.m4a'));
      await asset.downloadAsync();
      this.localSoundUri = asset.localUri || asset.uri;
      console.log('🔔 [SoundService] Asset downloaded to:', this.localSoundUri);
      return this.localSoundUri;
    } catch (e) {
      console.warn('[SoundService] Asset download fallback:', e);
      return null;
    }
  }

  private async configureAudioMode() {
    if (this.isAudioModeConfigured) return;
    if (setAudioModeAsync) {
      try {
        await setAudioModeAsync({
          playsInSilentMode: true,
          interruptionMode: 'duckOthers',
        });
        this.isAudioModeConfigured = true;
        console.log('🔊 [SoundService] Audio mode configured: playsInSilentMode=true');
      } catch (e) {
        console.warn('[SoundService] Error setting audio mode:', e);
      }
    }
  }

  public registerBridge(callback: BridgeCallback) {
    this.bridgeCallback = callback;
    if (this.isAlarmPlaying) {
      this.bridgeCallback('START_ALARM');
    }
  }

  public unregisterBridge() {
    this.bridgeCallback = null;
  }

  public async isAlarmEnabled(): Promise<boolean> {
    try {
      const val = await AsyncStorage.getItem(KITCHEN_ALARM_KEY);
      if (val === null) return true;
      return val === 'true';
    } catch {
      return true;
    }
  }

  public async setAlarmEnabled(enabled: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(KITCHEN_ALARM_KEY, enabled ? 'true' : 'false');
      if (!enabled) {
        await this.stopOrderAlarm();
      }
    } catch (e) {
      console.warn('[SoundService] Error saving alarm preference:', e);
    }
  }

  public async playOrderAlarm(): Promise<void> {
    const enabled = await this.isAlarmEnabled();
    if (!enabled) {
      console.log('🔇 [SoundService] Alarm is disabled in settings');
      return;
    }

    if (this.isAlarmPlaying) return;
    this.isAlarmPlaying = true;
    console.log('🚨 [SoundService] STARTING KITCHEN ORDER ALARM & HAPTICS');

    await this.configureAudioMode();
    const uri = await this.prepareSoundAsset();

    // 1. Native player
    if (createAudioPlayer) {
      try {
        if (!this.nativePlayer) {
          const source = uri ? { uri } : require('../../assets/sounds/order_alert.m4a');
          this.nativePlayer = createAudioPlayer(source, {
            downloadFirst: true,
          });
        }
        if (this.nativePlayer) {
          this.nativePlayer.loop = true;
          this.nativePlayer.volume = 1.0;
          this.nativePlayer.play();
          console.log('▶️ [SoundService] nativePlayer.play() called');
        }
      } catch (err) {
        console.warn('[SoundService] Native audio playback warning:', err);
      }
    }

    // 2. Web Audio bridge fallback
    if (this.bridgeCallback) {
      this.bridgeCallback('START_ALARM');
    }

    // 3. Android Standalone APK Native Alarm (STREAM_ALARM hardware buzzer override)
    if (Platform.OS === 'android' && NativeModules.SoundModule?.startAlarmLoop) {
      try {
        NativeModules.SoundModule.startAlarmLoop();
      } catch (e) {
        console.warn('[SoundService] Native SoundModule error:', e);
      }
    }

    // 4. Repeating physical haptics
    this.startHapticsLoop();
  }

  public async playSingleChime(): Promise<void> {
    console.log('🔔 [SoundService] Playing single chime preview');
    await this.configureAudioMode();
    const uri = await this.prepareSoundAsset();

    if (createAudioPlayer) {
      try {
        const source = uri ? { uri } : require('../../assets/sounds/order_alert.m4a');
        const chime = createAudioPlayer(source, { downloadFirst: true });
        chime.loop = false;
        chime.volume = 1.0;
        chime.play();
        console.log('▶️ [SoundService] chime.play() called');
      } catch (e) {
        console.warn('[SoundService] Error in single chime:', e);
      }
    }

    if (this.bridgeCallback) {
      this.bridgeCallback('PLAY_ONCE');
    }

    // Android APK Native Chime
    if (Platform.OS === 'android' && NativeModules.SoundModule?.playNotificationSound) {
      try {
        NativeModules.SoundModule.playNotificationSound();
      } catch {}
    }

    if (Platform.OS !== 'web') {
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch {}
    }
  }

  public async stopOrderAlarm(): Promise<void> {
    console.log('🛑 [SoundService] STOPPING KITCHEN ORDER ALARM');
    this.isAlarmPlaying = false;

    // 1. Stop native player
    if (this.nativePlayer) {
      try {
        this.nativePlayer.pause();
        if (typeof this.nativePlayer.seekTo === 'function') {
          this.nativePlayer.seekTo(0);
        }
      } catch (e) {
        console.warn('[SoundService] Error stopping native player:', e);
      }
    }

    // 2. Stop haptics
    if (this.hapticInterval) {
      clearInterval(this.hapticInterval);
      this.hapticInterval = null;
    }

    // 3. Stop bridge
    if (this.bridgeCallback) {
      this.bridgeCallback('STOP_ALARM');
    }

    // 4. Android Standalone APK Native Alarm stop
    if (Platform.OS === 'android' && NativeModules.SoundModule?.stopAlarmLoop) {
      try {
        NativeModules.SoundModule.stopAlarmLoop();
      } catch (e) {
        console.warn('[SoundService] Error stopping native SoundModule alarm loop:', e);
      }
    }
  }

  private startHapticsLoop() {
    if (this.hapticInterval) clearInterval(this.hapticInterval);

    const triggerVibe = () => {
      if (Platform.OS !== 'web') {
        try {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        } catch {}
      }
    };

    triggerVibe();
    this.hapticInterval = setInterval(triggerVibe, 1600);
  }
}

export const soundService = new SoundService();
