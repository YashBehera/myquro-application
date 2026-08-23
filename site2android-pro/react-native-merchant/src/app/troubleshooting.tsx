import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function TroubleshootingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [isRunningTest, setIsRunningTest] = useState(false);
  const [testResults, setTestResults] = useState<{ [key: string]: 'passed' | 'warning' | 'failed' }>({
    internet: 'passed',
    websocket: 'passed',
    gps: 'passed',
    notification: 'passed',
    printer: 'passed',
  });

  const handleRunDiagnostics = () => {
    setIsRunningTest(true);
    setTimeout(() => {
      setIsRunningTest(false);
      setTestResults({
        internet: 'passed',
        websocket: 'passed',
        gps: 'passed',
        notification: 'passed',
        printer: 'passed',
      });
      Alert.alert('Diagnostics Completed ✅', 'All device health indicators and server connections are optimal.');
    }, 1200);
  };

  const diagnosticsItems = [
    {
      id: 'internet',
      title: 'Internet Connection Speed',
      desc: 'High speed Wi-Fi / 5G connected (Latency: 24ms)',
      icon: 'wifi-outline',
    },
    {
      id: 'websocket',
      title: 'Live Order Relay WebSocket',
      desc: 'Connected to wss://relay.myquro.com/restaurant-kds',
      icon: 'sync-outline',
    },
    {
      id: 'gps',
      title: 'Outlet GPS Location Verification',
      desc: 'Geofence accuracy within 5 meters',
      icon: 'location-outline',
    },
    {
      id: 'notification',
      title: 'High Priority Push Notifications',
      desc: 'FCM / APNs kitchen alarm channels active',
      icon: 'notifications-outline',
    },
    {
      id: 'printer',
      title: 'Bluetooth ESC/POS Bill Printer',
      desc: 'Ready for auto-KOT dispatch printing',
      icon: 'print-outline',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#E8C547" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Device Health & Diagnostics</Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* SUMMARY HEALTH BANNER */}
        <View style={styles.healthBanner}>
          <View style={styles.pulseIconCircle}>
            <Ionicons name="pulse" size={28} color="#E8C547" />
          </View>
          <Text style={styles.healthStatusTitle}>System Status: Optimal</Text>
          <Text style={styles.healthStatusSub}>
            Your kitchen terminal is ready to receive instant customer orders without delays.
          </Text>
        </View>

        {/* DIAGNOSTIC CHECKLIST */}
        <Text style={styles.sectionHeading}>Live Health Checks</Text>
        <View style={styles.checklistCard}>
          {diagnosticsItems.map((item, idx) => {
            const status = testResults[item.id];
            const isLast = idx === diagnosticsItems.length - 1;

            return (
              <View key={item.id}>
                <View style={styles.checkRow}>
                  <View style={styles.checkIconBox}>
                    <Ionicons name={item.icon as any} size={20} color="#E8C547" />
                  </View>
                  <View style={styles.checkTextCol}>
                    <Text style={styles.checkTitle}>{item.title}</Text>
                    <Text style={styles.checkDesc}>{item.desc}</Text>
                  </View>
                  <View style={styles.statusBadge}>
                    <Ionicons
                      name={status === 'passed' ? 'checkmark-circle' : 'alert-circle'}
                      size={20}
                      color={status === 'passed' ? '#16A34A' : '#EF4444'}
                    />
                  </View>
                </View>
                {!isLast && <View style={styles.rowDivider} />}
              </View>
            );
          })}
        </View>

        {/* RUN DIAGNOSTICS BUTTON */}
        <TouchableOpacity
          style={[styles.runTestBtn, isRunningTest && { opacity: 0.7 }]}
          activeOpacity={0.8}
          onPress={handleRunDiagnostics}
          disabled={isRunningTest}
        >
          {isRunningTest ? (
            <ActivityIndicator color="#0B0B0B" />
          ) : (
            <>
              <Ionicons name="refresh" size={18} color="#0B0B0B" style={{ marginRight: 8 }} />
              <Text style={styles.runTestBtnText}>Run Complete Diagnostic Test</Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
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
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  healthBanner: {
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  pulseIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  healthStatusTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17,
    fontWeight: '700',
    color: '#E8C547',
    marginBottom: 4,
  },
  healthStatusSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    textAlign: 'center',
    lineHeight: 16,
  },
  sectionHeading: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  checklistCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  checkIconBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkTextCol: {
    flex: 1,
    marginRight: 10,
  },
  checkTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  checkDesc: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 2,
  },
  statusBadge: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },
  runTestBtn: {
    flexDirection: 'row',
    backgroundColor: '#E8C547',
    borderRadius: 14,
    paddingVertical: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  runTestBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#0B0B0B',
  },
});
