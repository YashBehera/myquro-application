import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch, Alert, Platform } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';

export default function ProfileScreen() {
  const router = useRouter();
  const { driverProfile, updateDriverProfile } = useRider();

  const vehicles = [
    { type: 'scooter', name: 'Hero Electric Nyx Scooter', plate: 'MH-02-EQ-4920' },
    { type: 'bike', name: 'Bajaj Chetak EV', plate: 'MH-01-EV-8821' },
    { type: 'car', name: 'Tata XPRES-T EV', plate: 'MH-04-TX-1029' },
  ] as const;

  const handleSelectVehicle = (vehicle: typeof vehicles[number]) => {
    updateDriverProfile({
      vehicleName: vehicle.name,
      vehiclePlate: vehicle.plate,
      vehicleType: vehicle.type,
    });
  };

  const handleSOS = () => {
    router.push('/sos');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header Card */}
      <View style={styles.profileCard}>
        <View style={styles.avatarRow}>
          <Image source={{ uri: driverProfile.avatarUrl }} style={styles.avatar} />
          <View style={styles.profileDetails}>
            <View style={styles.nameRow}>
              <Text style={styles.driverName}>{driverProfile.name}</Text>
              <Ionicons name="shield-checkmark" size={18} color="#10B981" />
            </View>
            <Text style={styles.driverSub}>Verified MyQuro Senior Rider</Text>

            <View style={styles.ratingPill}>
              <Ionicons name="star" size={13} color="#F59E0B" />
              <Text style={styles.ratingText}>{driverProfile.rating} Rating</Text>
            </View>
          </View>
        </View>

        {/* Stats Row */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{driverProfile.totalTrips}</Text>
            <Text style={styles.statLabel}>Total Trips</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{driverProfile.acceptanceRate}</Text>
            <Text style={styles.statLabel}>Acceptance</Text>
          </View>

          <View style={styles.statDivider} />

          <View style={styles.statItem}>
            <Text style={styles.statNumber}>{driverProfile.completionRate}</Text>
            <Text style={styles.statLabel}>Completion</Text>
          </View>
        </View>
      </View>

      {/* Vehicle Selection Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Active Vehicle</Text>
        {vehicles.map((v) => {
          const isSelected = driverProfile.vehiclePlate === v.plate;
          return (
            <TouchableOpacity
              key={v.plate}
              style={[styles.vehicleCard, isSelected && styles.vehicleCardSelected]}
              onPress={() => handleSelectVehicle(v)}
            >
              <View style={styles.vehicleLeft}>
                <View style={[styles.vehicleIcon, isSelected && styles.vehicleIconSelected]}>
                  <Ionicons name="bicycle" size={20} color={isSelected ? '#00E5FF' : '#94A3B8'} />
                </View>
                <View>
                  <Text style={styles.vehicleName}>{v.name}</Text>
                  <Text style={styles.vehiclePlate}>{v.plate}</Text>
                </View>
              </View>
              {isSelected && (
                <View style={styles.activePill}>
                  <Text style={styles.activePillText}>ACTIVE</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* App Preferences */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Rider Preferences</Text>
        <View style={styles.settingCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="flash" size={18} color="#00E5FF" />
              <View>
                <Text style={styles.settingTitle}>Auto-Accept Orders</Text>
                <Text style={styles.settingSub}>Automatically accept nearby trip requests</Text>
              </View>
            </View>
            <Switch
              value={driverProfile.autoAccept}
              onValueChange={(val) => updateDriverProfile({ autoAccept: val })}
              trackColor={{ false: '#334155', true: '#059669' }}
              thumbColor={driverProfile.autoAccept ? '#10B981' : '#94A3B8'}
            />
          </View>

          <View style={styles.settingRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="volume-high" size={18} color="#00E5FF" />
              <View>
                <Text style={styles.settingTitle}>Audio Navigation Alerts</Text>
                <Text style={styles.settingSub}>Voice alerts for turn-by-turn routing</Text>
              </View>
            </View>
            <Switch
              value={driverProfile.soundAlerts}
              onValueChange={(val) => updateDriverProfile({ soundAlerts: val })}
              trackColor={{ false: '#334155', true: '#059669' }}
              thumbColor={driverProfile.soundAlerts ? '#10B981' : '#94A3B8'}
            />
          </View>
        </View>
      </View>

      {/* Emergency & Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Safety & Support</Text>
        <TouchableOpacity style={styles.sosButton} onPress={handleSOS}>
          <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          <Text style={styles.sosButtonText}>TRIGGER EMERGENCY SOS</Text>
        </TouchableOpacity>

        <View style={styles.settingCard}>
          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="call" size={18} color="#94A3B8" />
              <Text style={styles.menuText}>24/7 Rider Support Hotline</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuRow}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle" size={18} color="#94A3B8" />
              <Text style={styles.menuText}>Help Center & Guidelines</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#64748B" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Footer Info */}
      <View style={styles.footer}>
        <Text style={styles.appVersion}>MyQuro Rider App (Expo SDK 54)</Text>
        <Text style={styles.copyright}>© 2026 MyQuro Technologies Inc.</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0F172A',
  },
  content: {
    padding: 16,
    paddingTop: Platform.OS === 'ios' ? 60 : 48,
    paddingBottom: 40,
  },
  profileCard: {
    backgroundColor: '#1E293B',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
  },
  avatarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 16,
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: '#00E5FF',
  },
  profileDetails: {
    gap: 3,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  driverName: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
  },
  driverSub: {
    color: '#94A3B8',
    fontSize: 12,
  },
  ratingPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    gap: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  ratingText: {
    color: '#F59E0B',
    fontSize: 11,
    fontWeight: '800',
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  statItem: {
    alignItems: 'center',
  },
  statNumber: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '900',
  },
  statLabel: {
    color: '#64748B',
    fontSize: 11,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#334155',
  },
  section: {
    marginBottom: 20,
    gap: 10,
  },
  sectionTitle: {
    color: '#F8FAFC',
    fontSize: 16,
    fontWeight: '800',
  },
  vehicleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1E293B',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  vehicleCardSelected: {
    borderColor: '#00E5FF',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
  },
  vehicleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  vehicleIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#0F172A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  vehicleIconSelected: {
    backgroundColor: 'rgba(0, 229, 255, 0.15)',
  },
  vehicleName: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  vehiclePlate: {
    color: '#64748B',
    fontSize: 12,
  },
  activePill: {
    backgroundColor: '#00E5FF',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  activePillText: {
    color: '#0F172A',
    fontSize: 10,
    fontWeight: '900',
  },
  settingCard: {
    backgroundColor: '#1E293B',
    borderRadius: 16,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#334155',
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  settingTitle: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '700',
  },
  settingSub: {
    color: '#64748B',
    fontSize: 11,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  menuText: {
    color: '#F8FAFC',
    fontSize: 14,
    fontWeight: '600',
  },
  sosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EF4444',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    elevation: 4,
  },
  sosButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  footer: {
    alignItems: 'center',
    marginTop: 10,
    gap: 4,
  },
  appVersion: {
    color: '#64748B',
    fontSize: 12,
  },
  copyright: {
    color: '#475569',
    fontSize: 11,
  },
});
