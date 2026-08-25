import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Switch,
  Alert,
  Modal,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function AppSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [kitchenAlarmEnabled, setKitchenAlarmEnabled] = useState(true);
  const [autoAcceptRush, setAutoAcceptRush] = useState(false);
  const [isReloadingConfig, setIsReloadingConfig] = useState(false);

  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isReloadingConfig) {
      spinValue.setValue(0);
      Animated.loop(
        Animated.timing(spinValue, {
          toValue: 1,
          duration: 900,
          easing: Easing.linear,
          useNativeDriver: true,
        })
      ).start();
    }
  }, [isReloadingConfig]);

  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more' as any);
    }
  };

  const handleBatterySettings = () => {
    Alert.alert(
      'Battery & Background Optimization',
      'Battery settings are optimized for high-priority background kitchen order receipts so you never miss an incoming customer order.',
      [{ text: 'OK' }]
    );
  };

  const handleReloadConfig = () => {
    setIsReloadingConfig(true);
    // Reloads in ~450ms as per rider app spec
    setTimeout(() => {
      setIsReloadingConfig(false);
      Alert.alert('Configuration Synced! ⚡', 'Menu pricing, active discounts, and outlet slots are fully updated with the live server.');
    }, 500);
  };

  const handleCheckUpdates = () => {
    Alert.alert(
      'Up to Date! 🎉',
      'You are running the latest version of My Quro Merchant App (v54.0.8).',
      [{ text: 'Great' }]
    );
  };

  const handleDeviceHealth = () => {
    router.push('/troubleshooting' as any);
  };

  const handlePrinterSettings = () => {
    Alert.alert(
      'Thermal Printer & Bluetooth',
      'Auto-KOT receipt printing is currently configured for 58mm & 80mm Bluetooth ESC/POS printers.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Print Test Receipt', onPress: () => Alert.alert('Test Sent', 'Test KOT printed successfully!') },
      ]
    );
  };

  const handleSoundSettings = () => {
    Alert.alert(
      'Kitchen Alert Alarm Tone',
      'Current alarm tone: "High Pitch Kitchen Bell" (Loud, repeats every 5s until accepted).',
      [{ text: 'OK' }]
    );
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP BAR HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#E8C547" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App settings</Text>
      </View>

      {/* MAIN SCROLLABLE SETTINGS CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. KITCHEN ALARM SOUND TOGGLE CARD */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeftGroup}>
            <View style={styles.callIconBadge}>
              <Ionicons name="notifications" size={20} color="#E8C547" />
              <View style={styles.smsChatBubble}>
                <Ionicons name="volume-high" size={10} color="#000000" />
              </View>
            </View>

            <View style={styles.toggleTextCol}>
              <Text style={styles.cardTitleText}>Kitchen Order Alarm</Text>
              <Text style={styles.cardSubtitleText}>
                Switch off for not getting high-pitch sound alerts from{' '}
                <Text style={styles.myquroGoldText}>MyQuro</Text>
              </Text>
            </View>
          </View>

          <Switch
            value={kitchenAlarmEnabled}
            onValueChange={setKitchenAlarmEnabled}
            trackColor={{ false: '#3A352B', true: '#D97706' }}
            thumbColor={kitchenAlarmEnabled ? '#FFFFFF' : '#8E8E8E'}
          />
        </View>

        {/* 2. AUTO-ACCEPT ORDERS TOGGLE CARD */}
        <View style={[styles.toggleCard, { marginTop: 12 }]}>
          <View style={styles.toggleLeftGroup}>
            <View style={styles.callIconBadge}>
              <Ionicons name="flash" size={20} color="#E8C547" />
            </View>

            <View style={styles.toggleTextCol}>
              <Text style={styles.cardTitleText}>Auto-Accept Rush Orders</Text>
              <Text style={styles.cardSubtitleText}>
                Instantly accept incoming customer orders during rush hours
              </Text>
            </View>
          </View>

          <Switch
            value={autoAcceptRush}
            onValueChange={setAutoAcceptRush}
            trackColor={{ false: '#3A352B', true: '#D97706' }}
            thumbColor={autoAcceptRush ? '#FFFFFF' : '#8E8E8E'}
          />
        </View>

        {/* 3. MULTI-ROW ACTION SETTINGS CARD */}
        <View style={styles.actionsContainerCard}>
          {/* Row 1: Kitchen Sound & Alarm Tone */}
          <TouchableOpacity
            onPress={handleSoundSettings}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="volume-high-outline" size={22} color="#E8C547" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Kitchen alarm & sound settings</Text>
                <Text style={styles.actionSubtitleText}>
                  Choose alarm ringtone, volume level, and repeat interval
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#E8C547" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 2: Change battery settings */}
          <TouchableOpacity
            onPress={handleBatterySettings}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="battery-charging-outline" size={22} color="#E8C547" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Change battery settings</Text>
                <Text style={styles.actionSubtitleText}>
                  Ensures that your kitchen device does not get logged out
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#E8C547" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 3: Reload configuration */}
          <TouchableOpacity
            onPress={handleReloadConfig}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="reload-outline" size={22} color="#E8C547" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Reload configuration</Text>
                <Text style={styles.actionSubtitleText}>
                  Helps you refresh menu pricing and operational settings
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#E8C547" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 4: Thermal Printer Setup */}
          <TouchableOpacity
            onPress={handlePrinterSettings}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="print-outline" size={22} color="#E8C547" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Thermal printer & Bluetooth setup</Text>
                <Text style={styles.actionSubtitleText}>
                  Connect 58mm / 80mm ESC/POS printer for kitchen tickets
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#E8C547" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 5: Check for app updates */}
          <TouchableOpacity
            onPress={handleCheckUpdates}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="download-outline" size={22} color="#E8C547" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Check for app updates</Text>
                <Text style={styles.actionSubtitleText}>
                  Ensures that you are on the latest version of the app
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#E8C547" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 6: Device Health & Troubleshooting */}
          <TouchableOpacity
            onPress={handleDeviceHealth}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="pulse-outline" size={22} color="#E8C547" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Device Health & Diagnostics</Text>
                <Text style={styles.actionSubtitleText}>
                  Test WebSocket order relay latency and internet stability
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#E8C547" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* RELOADING CONFIGURATION BOTTOM SHEET MODAL (Rider App Animation Style) */}
      <Modal
        visible={isReloadingConfig}
        transparent
        animationType="fade"
        onRequestClose={() => setIsReloadingConfig(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setIsReloadingConfig(false)}
          />

          <View style={[styles.bottomSheetCard, { paddingBottom: Math.max(insets.bottom, 20) + 24 }]}>
            {/* Top Golden Grab Handle */}
            <View style={styles.grabHandlePill} />

            {/* Glowing Golden Circular Spinner Animation */}
            <View style={styles.spinnerWrapper}>
              {/* Background ambient glow */}
              <View style={styles.spinnerGlowAmbient} />

              <Animated.View
                style={[
                  styles.animatedSpinnerRing,
                  { transform: [{ rotate: spin }] },
                ]}
              >
                <View style={styles.spinnerHeadPoint} />
              </Animated.View>
            </View>

            {/* Title */}
            <Text style={styles.reloadingTitleText}>Reloading configuration</Text>

            {/* Subtitle */}
            <Text style={styles.reloadingSubtitleText}>
              This may take a <Text style={styles.fewGoldText}>few</Text> moments
            </Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 16,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 21,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  /* Toggle Card */
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
  },
  toggleLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  callIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginRight: 14,
  },
  smsChatBubble: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: '#E8C547',
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextCol: {
    flex: 1,
  },
  cardTitleText: {
    fontSize: 15.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardSubtitleText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    marginTop: 2,
    lineHeight: 16,
  },
  myquroGoldText: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  /* Action Rows Card */
  actionsContainerCard: {
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    marginTop: 18,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actionSubtitleText: {
    fontSize: 11.5,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    marginTop: 2,
    lineHeight: 15,
  },
  chevronCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#191919',
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    alignItems: 'center',
    paddingTop: 14,
    paddingHorizontal: 24,
  },
  grabHandlePill: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8C547',
    marginBottom: 26,
  },
  spinnerWrapper: {
    width: 76,
    height: 76,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 20,
  },
  spinnerGlowAmbient: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(232, 197, 71, 0.2)',
  },
  animatedSpinnerRing: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 3,
    borderColor: 'transparent',
    borderTopColor: '#E8C547',
    borderRightColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  spinnerHeadPoint: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFFFF',
  },
  reloadingTitleText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  reloadingSubtitleText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
  },
  fewGoldText: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
});
