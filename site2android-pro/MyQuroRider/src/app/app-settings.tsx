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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function AppSettingsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [callSmsEnabled, setCallSmsEnabled] = useState(true);
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
      router.replace('/(tabs)/more');
    }
  };

  const handleBatterySettings = () => {
    Alert.alert(
      'Battery Optimization',
      'Battery settings are optimized for background order tracking without unexpected logouts.',
      [{ text: 'OK' }]
    );
  };

  const handleReloadConfig = () => {
    setIsReloadingConfig(true);
    // Reloads in ~0.20s - 0.45s as requested by user
    setTimeout(() => {
      setIsReloadingConfig(false);
    }, 450);
  };

  const handleCheckUpdates = () => {
    Alert.alert(
      'Up to Date! 🎉',
      'You are running the latest version of MyQuro Rider App (v54.0.8).',
      [{ text: 'Great' }]
    );
  };

  const handleDeviceHealth = () => {
    router.push('/troubleshooting');
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP BAR HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>App settings</Text>
      </View>

      {/* MAIN SCROLLABLE SETTINGS CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. CALL AND SMS PERMISSION TOGGLE CARD */}
        <View style={styles.toggleCard}>
          <View style={styles.toggleLeftGroup}>
            <View style={styles.callIconBadge}>
              <Ionicons name="call" size={20} color="#F2CA50" />
              <View style={styles.smsChatBubble}>
                <Ionicons name="chatbubble-ellipses" size={10} color="#000000" />
              </View>
            </View>

            <View style={styles.toggleTextCol}>
              <Text style={styles.cardTitleText}>Call and SMS permission</Text>
              <Text style={styles.cardSubtitleText}>
                Switch off for not getting a call{'\n'}from{' '}
                <Text style={styles.myquroGoldText}>MyQuro</Text>
              </Text>
            </View>
          </View>

          <Switch
            value={callSmsEnabled}
            onValueChange={setCallSmsEnabled}
            trackColor={{ false: '#3A352B', true: '#D97706' }}
            thumbColor={callSmsEnabled ? '#FFFFFF' : '#8E8E8E'}
          />
        </View>

        {/* 2. MULTI-ROW ACTION SETTINGS CARD */}
        <View style={styles.actionsContainerCard}>
          {/* Row 1: Change battery settings */}
          <TouchableOpacity
            onPress={handleBatterySettings}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="battery-charging-outline" size={22} color="#F2CA50" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Change battery settings</Text>
                <Text style={styles.actionSubtitleText}>
                  Ensures that you do not get automatically logged out
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 2: Reload configuration */}
          <TouchableOpacity
            onPress={handleReloadConfig}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="reload-outline" size={22} color="#F2CA50" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Reload configuration</Text>
                <Text style={styles.actionSubtitleText}>
                  Helps you refresh your app configuration settings
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 3: Check for app updates */}
          <TouchableOpacity
            onPress={handleCheckUpdates}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="download-outline" size={22} color="#F2CA50" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Check for app updates</Text>
                <Text style={styles.actionSubtitleText}>
                  Ensures that you are on the latest version of the app
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </View>
          </TouchableOpacity>

          <View style={styles.rowDivider} />

          {/* Row 4: Device Health & Troubleshooting */}
          <TouchableOpacity
            onPress={handleDeviceHealth}
            style={styles.actionRow}
            activeOpacity={0.8}
          >
            <View style={styles.actionRowLeft}>
              <View style={styles.iconCircle}>
                <Ionicons name="pulse-outline" size={22} color="#F2CA50" />
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionTitleText}>Device Health & Troubleshooting</Text>
                <Text style={styles.actionSubtitleText}>
                  Insights to troubleshoot issues for a seamless app experience.
                </Text>
              </View>
            </View>

            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* RELOADING CONFIGURATION BOTTOM SHEET MODAL */}
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
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  toggleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#26221C',
    borderRadius: 20,
    paddingHorizontal: 18,
    paddingVertical: 18,
    marginBottom: 16,
  },
  toggleLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 10,
  },
  callIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#221D12',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  smsChatBubble: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  toggleTextCol: {
    flex: 1,
  },
  cardTitleText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardSubtitleText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#9E9E9E',
    lineHeight: 18,
  },
  myquroGoldText: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
  },
  actionsContainerCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#26221C',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
  },
  actionRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
    paddingRight: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#221D12',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionTextCol: {
    flex: 1,
  },
  actionTitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  actionSubtitleText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    lineHeight: 17,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    backgroundColor: '#16130E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#221E18',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.68)',
    justifyContent: 'flex-end',
  },
  bottomSheetCard: {
    backgroundColor: '#12100C',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    borderColor: '#2A241A',
    paddingHorizontal: 24,
    paddingTop: 16,
    alignItems: 'center',
  },
  grabHandlePill: {
    width: 52,
    height: 4.5,
    borderRadius: 2.5,
    backgroundColor: '#F2CA50',
    marginBottom: 32,
  },
  spinnerWrapper: {
    width: 100,
    height: 100,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
  },
  spinnerGlowAmbient: {
    position: 'absolute',
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(242, 202, 80, 0.08)',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 4,
  },
  animatedSpinnerRing: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 3.5,
    borderColor: 'rgba(242, 202, 80, 0.2)',
    borderTopColor: '#F2CA50',
    borderRightColor: '#F2CA50',
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
  },
  spinnerHeadPoint: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F2CA50',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
  },
  reloadingTitleText: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    marginTop: 18,
    marginBottom: 8,
  },
  reloadingSubtitleText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#9E9E9E',
    textAlign: 'center',
  },
  fewGoldText: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
  },
});
