import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Switch, Platform } from 'react-native';
import { useRider } from '@/context/RiderContext';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export const HeaderBar: React.FC = () => {
  const router = useRouter();
  const { isOnline, toggleOnlineStatus, driverProfile, todayEarnings, triggerDemoRequest, incomingRequest, activeTrip } = useRider();

  return (
    <View style={styles.container}>
      {/* Top Profile & Status row */}
      <View style={styles.topRow}>
        <View style={styles.driverInfo}>
          <Image source={{ uri: driverProfile.avatarUrl }} style={styles.avatar} />
          <View style={styles.nameContainer}>
            <View style={styles.nameRow}>
              <Text style={styles.driverName}>{driverProfile.name}</Text>
              <View style={styles.badge}>
                <Ionicons name="shield-checkmark" size={14} color="#10B981" />
                <Text style={styles.badgeText}>PRO</Text>
              </View>
            </View>
            <View style={styles.subRow}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{driverProfile.rating}</Text>
              <Text style={styles.dotDivider}>•</Text>
              <Text style={styles.vehicleText}>{driverProfile.vehicleName.split(' ')[0]}</Text>
            </View>
          </View>
        </View>

        {/* Online / Offline Switch */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={toggleOnlineStatus}
          style={[styles.statusPill, isOnline ? styles.onlinePill : styles.offlinePill]}
        >
          <View style={[styles.statusDot, isOnline ? styles.onlineDot : styles.offlineDot]} />
          <Text style={[styles.statusText, isOnline ? styles.onlineText : styles.offlineText]}>
            {isOnline ? 'ONLINE' : 'OFFLINE'}
          </Text>
          <Switch
            value={isOnline}
            onValueChange={toggleOnlineStatus}
            trackColor={{ false: '#334155', true: '#059669' }}
            thumbColor={isOnline ? '#10B981' : '#94A3B8'}
            style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
          />
        </TouchableOpacity>
      </View>

      {/* Bottom Summary Bar */}
      <View style={styles.bottomRow}>
        <View style={styles.earningMetric}>
          <Text style={styles.metricLabel}>Today's Earnings</Text>
          <Text style={styles.metricValue}>${todayEarnings.toFixed(2)}</Text>
        </View>

        {!incomingRequest && !activeTrip && isOnline && (
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.onboardingBtn} onPress={() => router.push('/onboarding')}>
              <Ionicons name="location-outline" size={14} color="#F2CA50" />
              <Text style={styles.onboardingBtnText}>Permission UI</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.demoBtn} onPress={triggerDemoRequest}>
              <Ionicons name="flash" size={14} color="#00E5FF" />
              <Text style={styles.demoBtnText}>Simulate Order</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 54 : 44,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#1E293B',
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  driverInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  nameContainer: {
    gap: 2,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    color: '#F8FAFC',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    gap: 2,
  },
  badgeText: {
    color: '#10B981',
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  subRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dotDivider: {
    color: '#64748B',
    fontSize: 12,
  },
  vehicleText: {
    color: '#94A3B8',
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 10,
    paddingRight: 4,
    paddingVertical: 4,
    borderRadius: 24,
    borderWidth: 1,
    gap: 6,
  },
  onlinePill: {
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderColor: '#10B981',
  },
  offlinePill: {
    backgroundColor: 'rgba(100, 116, 139, 0.15)',
    borderColor: '#475569',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  onlineDot: {
    backgroundColor: '#10B981',
  },
  offlineDot: {
    backgroundColor: '#94A3B8',
  },
  statusText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  onlineText: {
    color: '#10B981',
  },
  offlineText: {
    color: '#94A3B8',
  },
  bottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#1E293B',
  },
  earningMetric: {
    gap: 1,
  },
  metricLabel: {
    color: '#64748B',
    fontSize: 11,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    textTransform: 'uppercase',
  },
  metricValue: {
    color: '#00E5FF',
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  demoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(0, 229, 255, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  demoBtnText: {
    color: '#00E5FF',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  onboardingBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 202, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  onboardingBtnText: {
    color: '#F2CA50',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
});
