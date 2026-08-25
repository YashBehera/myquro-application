import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, StatusBar, Image, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/services/apiClient';
import { useAuthStore } from '@/state/authStore';

export default function ProfileScreen() {
  const router = useRouter();
  const logout = useAuthStore((state) => state.logout);
  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchRestaurant = async () => {
      try {
        const res = await apiClient.get('/restaurants/my-restaurant');
        if (isMounted && res.data?.restaurant) {
          setRestaurant(res.data.restaurant);
        }
      } catch (err) {
        console.warn('Could not fetch restaurant in ProfileScreen:', err);
      }
    };
    fetchRestaurant();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleSignOut = () => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out of your merchant account?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Sign Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };

  const outletNameDisplay = restaurant?.restaurantName || 'My Restaurant';
  const outletIdDisplay = restaurant?.id
    ? `Outlet ID: MQ-${restaurant.id.slice(0, 8).toUpperCase()}`
    : 'Outlet ID: MQ-REST';
  const outletAddressDisplay = restaurant?.restaurantAddress
    ? `📍 ${restaurant.restaurantAddress}`
    : '📍 Location registered';

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />
      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <View style={styles.headerBar}>
          <Text style={styles.headerTitle}>Restaurant Profile</Text>
        </View>

        <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={styles.profileCard}>
            <View style={styles.avatarCircle}>
              {restaurant?.restaurantLogo ? (
                <Image
                  source={{ uri: restaurant.restaurantLogo }}
                  style={{ width: 64, height: 64, borderRadius: 32 }}
                />
              ) : (
                <Ionicons name="storefront" size={32} color="#E8C547" />
              )}
            </View>
            <Text style={styles.outletName}>{outletNameDisplay}</Text>
            <Text style={styles.outletId}>{outletIdDisplay}</Text>
            <Text style={styles.outletAddress}>{outletAddressDisplay}</Text>
          </View>

          <View style={styles.actionsList}>
            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/restaurant-information' as any)}
            >
              <Ionicons name="create-outline" size={20} color="#E8C547" />
              <Text style={styles.actionText}>Edit Restaurant Information</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E8E" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/restaurant-documents' as any)}
            >
              <Ionicons name="document-text-outline" size={20} color="#E8C547" />
              <Text style={styles.actionText}>FSSAI & Business Documents</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E8E" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/partner-contract' as any)}
            >
              <Ionicons name="ribbon-outline" size={20} color="#E8C547" />
              <Text style={styles.actionText}>Partner Agreement Contract</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E8E" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/help-support' as any)}
            >
              <Ionicons name="headset-outline" size={20} color="#E8C547" />
              <Text style={styles.actionText}>Help & Support</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E8E" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionItem}
              onPress={() => router.push('/app-settings' as any)}
            >
              <Ionicons name="settings-outline" size={20} color="#E8C547" />
              <Text style={styles.actionText}>App Settings</Text>
              <Ionicons name="chevron-forward" size={18} color="#8E8E8E" />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.signOutBtn}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={18} color="#EF4444" style={{ marginRight: 8 }} />
            <Text style={styles.signOutText}>Sign Out</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  headerBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  headerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileCard: {
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#141414',
    borderWidth: 1.5,
    borderColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  outletName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  outletId: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#E8C547',
    marginBottom: 4,
  },
  outletAddress: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
  },
  actionsList: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
  },
  actionText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
    marginLeft: 12,
  },
  signOutBtn: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#EF4444',
    paddingVertical: 14,
  },
  signOutText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#EF4444',
  },
});
