import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

export default function LoginHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const sessions = [
    {
      id: '1',
      device: 'Samsung Galaxy Tab A9 (Active)',
      location: 'Bhubaneswar, Odisha',
      time: 'Today at 10:30 AM',
      ip: '192.168.1.45',
      active: true,
    },
    {
      id: '2',
      device: 'OnePlus Nord CE 3 5G',
      location: 'Bhubaneswar, Odisha',
      time: 'Yesterday at 08:15 PM',
      ip: '103.120.24.11',
      active: false,
    },
    {
      id: '3',
      device: 'Chrome Browser (Partner Portal)',
      location: 'Cuttack, Odisha',
      time: '18 Aug 2026 at 02:40 PM',
      ip: '103.120.24.89',
      active: false,
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
        <Text style={styles.headerTitle}>Login & Device History</Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.sectionSubtitle}>
          Review all devices that have accessed your restaurant partner terminal.
        </Text>

        <View style={styles.sessionsCard}>
          {sessions.map((item, idx) => {
            const isLast = idx === sessions.length - 1;

            return (
              <View key={item.id}>
                <View style={styles.sessionRow}>
                  <View style={styles.deviceIconBox}>
                    <Ionicons
                      name={item.active ? 'phone-portrait' : 'phone-portrait-outline'}
                      size={22}
                      color="#E8C547"
                    />
                  </View>
                  <View style={styles.sessionTextCol}>
                    <View style={styles.deviceNameRow}>
                      <Text style={styles.deviceName}>{item.device}</Text>
                      {item.active && (
                        <View style={styles.activePill}>
                          <Text style={styles.activePillText}>Current</Text>
                        </View>
                      )}
                    </View>
                    <Text style={styles.sessionMeta}>{item.location} • {item.time}</Text>
                    <Text style={styles.sessionIp}>IP: {item.ip}</Text>
                  </View>
                </View>
                {!isLast && <View style={styles.rowDivider} />}
              </View>
            );
          })}
        </View>
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
  sectionSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#8E8E8E',
    marginBottom: 16,
    lineHeight: 18,
  },
  sessionsCard: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  deviceIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  sessionTextCol: {
    flex: 1,
  },
  deviceNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deviceName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  activePill: {
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 6,
  },
  activePillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10,
    fontWeight: '700',
    color: '#16A34A',
  },
  sessionMeta: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
    marginTop: 2,
  },
  sessionIp: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10.5,
    color: '#E8C547',
    marginTop: 2,
  },
  rowDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },
});
