import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRider } from '@/context/RiderContext';

export const LiveMap: React.FC = () => {
  const { isOnline, activeTrip, incomingRequest } = useRider();
  const [pulse, setPulse] = useState(1);

  // Pulse animation effect for radar
  useEffect(() => {
    const interval = setInterval(() => {
      setPulse((prev) => (prev >= 1.4 ? 1 : prev + 0.08));
    }, 150);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.mapContainer}>
      <View style={styles.mapBackground}>
        {/* Simulated Roads / Grid lines */}
        <View style={[styles.roadHorizontal, { top: '25%' }]} />
        <View style={[styles.roadHorizontal, { top: '55%' }]} />
        <View style={[styles.roadHorizontal, { top: '80%' }]} />
        <View style={[styles.roadVertical, { left: '30%' }]} />
        <View style={[styles.roadVertical, { left: '65%' }]} />

        {/* Surge Zone Heatmaps */}
        <View style={[styles.surgeZone, { top: '15%', left: '15%' }]}>
          <Ionicons name="flame" size={14} color="#EF4444" />
          <Text style={styles.surgeText}>Surge 1.8x</Text>
        </View>

        <View style={[styles.surgeZone, { top: '45%', left: '55%', backgroundColor: 'rgba(245, 158, 11, 0.25)' }]}>
          <Ionicons name="flame" size={14} color="#F59E0B" />
          <Text style={[styles.surgeText, { color: '#F59E0B' }]}>Surge 1.4x</Text>
        </View>

        {/* Radar Scanner ring when Online */}
        {isOnline && !activeTrip && (
          <View style={[styles.radarRing, { transform: [{ scale: pulse }] }]}>
            <View style={styles.radarInnerDot} />
          </View>
        )}

        {/* Rider Location Pin */}
        <View style={styles.riderMarker}>
          <View style={styles.riderPinHalo} />
          <View style={styles.riderPinCore}>
            <Ionicons name="navigate" size={18} color="#0F172A" style={{ transform: [{ rotate: '45deg' }] }} />
          </View>
        </View>

        {/* Active Trip Polyline & Pins */}
        {(activeTrip || incomingRequest) && (
          <>
            {/* Route Line */}
            <View style={styles.routeLine} />

            {/* Pickup Marker */}
            <View style={[styles.tripPin, styles.pickupPin, { top: '32%', left: '25%' }]}>
              <Ionicons name="location" size={14} color="#FFFFFF" />
              <Text style={styles.pinLabel}>Pickup</Text>
            </View>

            {/* Dropoff Marker */}
            <View style={[styles.tripPin, styles.dropoffPin, { top: '65%', left: '70%' }]}>
              <Ionicons name="location" size={14} color="#FFFFFF" />
              <Text style={styles.pinLabel}>Dropoff</Text>
            </View>
          </>
        )}

        {/* Compass Floating Widget */}
        <View style={styles.compassWidget}>
          <Ionicons name="compass" size={18} color="#00E5FF" />
          <Text style={styles.compassText}>GPS Active</Text>
        </View>

        {/* Offline Overlay Banner */}
        {!isOnline && (
          <View style={styles.offlineOverlay}>
            <Ionicons name="alert-circle" size={36} color="#94A3B8" />
            <Text style={styles.offlineTitle}>You are currently Offline</Text>
            <Text style={styles.offlineSub}>Toggle switch above to start receiving order & ride requests</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mapContainer: {
    flex: 1,
    backgroundColor: '#090D16',
    position: 'relative',
    overflow: 'hidden',
  },
  mapBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B132B',
  },
  roadHorizontal: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#1E293B',
  },
  roadVertical: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 12,
    backgroundColor: 'rgba(30, 41, 59, 0.7)',
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: '#1E293B',
  },
  surgeZone: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(239, 68, 68, 0.25)',
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  surgeText: {
    color: '#EF4444',
    fontSize: 11,
    fontWeight: '800',
  },
  radarRing: {
    position: 'absolute',
    top: '42%',
    left: '42%',
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: 'rgba(0, 229, 255, 0.4)',
    backgroundColor: 'rgba(0, 229, 255, 0.05)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarInnerDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00E5FF',
  },
  riderMarker: {
    position: 'absolute',
    top: '48%',
    left: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  riderPinHalo: {
    position: 'absolute',
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(0, 229, 255, 0.25)',
  },
  riderPinCore: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#00E5FF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: '#00E5FF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
  },
  routeLine: {
    position: 'absolute',
    top: '35%',
    left: '28%',
    width: '44%',
    height: 3,
    backgroundColor: '#00E5FF',
    transform: [{ rotate: '32deg' }],
  },
  tripPin: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
    elevation: 5,
  },
  pickupPin: {
    backgroundColor: '#10B981',
  },
  dropoffPin: {
    backgroundColor: '#2563EB',
  },
  pinLabel: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  compassWidget: {
    position: 'absolute',
    top: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0F172A',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1E293B',
    gap: 6,
  },
  compassText: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '700',
  },
  offlineOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(15, 23, 42, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  offlineTitle: {
    color: '#F8FAFC',
    fontSize: 18,
    fontWeight: '800',
    marginTop: 8,
  },
  offlineSub: {
    color: '#94A3B8',
    fontSize: 13,
    textAlign: 'center',
  },
});
