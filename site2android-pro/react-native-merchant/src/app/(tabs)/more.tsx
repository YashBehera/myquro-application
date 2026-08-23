import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { apiClient } from '@/services/apiClient';
import { useAuthStore } from '@/state/authStore';

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const logout = useAuthStore((state) => state.logout);

  const [restaurant, setRestaurant] = useState<any>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchMyRestaurant = async () => {
      try {
        const res = await apiClient.get('/restaurants/my-restaurant');
        if (isMounted && res.data?.restaurant) {
          setRestaurant(res.data.restaurant);
        }
      } catch (err) {
        console.warn('Could not fetch restaurant details in MoreScreen:', err);
      }
    };

    fetchMyRestaurant();
    return () => {
      isMounted = false;
    };
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)' as any);
    }
  };

  const handleLogout = () => {
    Alert.alert(
      'Log Out',
      'Are you sure you want to log out of your restaurant merchant terminal?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Log Out',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login' as any);
          },
        },
      ]
    );
  };

  const ratingVal = restaurant?.rating && Number(restaurant.rating) > 0
    ? `${Number(restaurant.rating).toFixed(1)} ★`
    : 'New';

  const menuItems = [
    {
      id: 'finance',
      title: 'Finance & Bank Settlements',
      icon: 'wallet-outline',
      badge: 'Weekly Payouts',
      route: '/finance',
    },
    {
      id: 'analytics',
      title: 'Sales & Business Analytics',
      icon: 'trending-up-outline',
      badge: 'Live Insights',
      route: '/analytics',
    },
    {
      id: 'menu-setup',
      title: 'Menu Setup & Cuisines',
      icon: 'restaurant-outline',
      badge: 'Active',
      route: '/menu-setup',
    },
    {
      id: 'past-orders',
      title: 'Order History & Log',
      icon: 'time-outline',
      route: '/past-orders',
    },
    {
      id: 'ratings',
      title: 'Customer Ratings & Reviews',
      icon: 'star-outline',
      badge: ratingVal,
      route: '/ratings',
    },
    {
      id: 'complaints',
      title: 'Customer Complaints & Disputes',
      icon: 'alert-circle-outline',
      route: '/complaints',
    },
    {
      id: 'help',
      title: 'Help & Support Center',
      icon: 'headset-outline',
      route: '/help-support',
    },
    {
      id: 'documents',
      title: 'Restaurant Documents & FSSAI',
      icon: 'document-text-outline',
      route: '/restaurant-documents',
    },
    {
      id: 'contract',
      title: 'Partner Agreement & Contract',
      icon: 'ribbon-outline',
      route: '/partner-contract',
    },
    {
      id: 'settings',
      title: 'App Settings & Alarms',
      icon: 'settings-outline',
      route: '/app-settings',
    },
  ];

  const outletLocationDisplay = restaurant?.city
    ? `📍 ${restaurant.city}${restaurant.state ? `, ${restaurant.state}` : ''} • ${restaurant.fssaiLicenseNumber ? 'FSSAI Verified' : 'Registered'}`
    : restaurant?.restaurantAddress
    ? `📍 ${restaurant.restaurantAddress.split(',')[0]} • ${restaurant.fssaiLicenseNumber ? 'FSSAI Verified' : 'Registered'}`
    : '📍 Location registered';

  const outletIdDisplay = restaurant?.id
    ? `MQ-${restaurant.id.slice(0, 8).toUpperCase()}`
    : 'MQ-REST';

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#E8C547" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/help-support' as any)}
          style={styles.helpPillBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.helpPillText}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* 1. RESTAURANT PROFILE CARD */}
        <TouchableOpacity
          onPress={() => router.push('/restaurant-information' as any)}
          style={styles.profileCard}
          activeOpacity={0.85}
        >
          <View style={styles.profileInfo}>
            <Text style={styles.userNameText}>
              {restaurant?.restaurantName || 'My Restaurant'}
            </Text>
            <Text style={styles.deIdLabel}>
              OUTLET ID : <Text style={styles.deIdValue}>{outletIdDisplay}</Text>
            </Text>
            <Text style={styles.outletLocationText}>{outletLocationDisplay}</Text>
          </View>

          <View style={styles.avatarCircleBorder}>
            {restaurant?.restaurantLogo ? (
              <Image
                source={{ uri: restaurant.restaurantLogo }}
                style={{ width: 44, height: 44, borderRadius: 22 }}
              />
            ) : (
              <View style={styles.avatarCircleBg}>
                <Ionicons name="storefront" size={26} color="#E8C547" />
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* 2. 4 QUICK ACTION CARDS GRID */}
        <View style={styles.quickGridRow}>
          {/* Card 1: Finance */}
          <TouchableOpacity
            onPress={() => router.push('/finance' as any)}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <Ionicons name="wallet-outline" size={22} color="#E8C547" />
            <Text style={styles.quickCardLabel}>Finance</Text>
          </TouchableOpacity>

          {/* Card 2: Analytics */}
          <TouchableOpacity
            onPress={() => router.push('/analytics' as any)}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <Ionicons name="trending-up-outline" size={22} color="#E8C547" />
            <Text style={styles.quickCardLabel}>Analytics</Text>
          </TouchableOpacity>

          {/* Card 3: Ratings */}
          <TouchableOpacity
            onPress={() => router.push('/ratings' as any)}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <Ionicons name="star-outline" size={22} color="#E8C547" />
            <Text style={styles.quickCardLabel}>Ratings</Text>
          </TouchableOpacity>

          {/* Card 4: Complaints */}
          <TouchableOpacity
            onPress={() => router.push('/complaints' as any)}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <Ionicons name="alert-circle-outline" size={22} color="#E8C547" />
            <Text style={styles.quickCardLabel}>Complaints</Text>
          </TouchableOpacity>
        </View>

        {/* 3. MAIN MENU LIST CARD */}
        <View style={styles.menuContainerCard}>
          {menuItems.map((item, index) => {
            const isLast = index === menuItems.length - 1;
            return (
              <View key={item.id}>
                <TouchableOpacity
                  onPress={() => item.route && router.push(item.route as any)}
                  style={styles.menuRow}
                  activeOpacity={0.8}
                >
                  <View style={styles.menuRowLeft}>
                    <Ionicons name={item.icon as any} size={20} color="#E8C547" />
                    <Text style={styles.menuTitleText}>{item.title}</Text>
                    {item.badge && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#8E8E8E" />
                </TouchableOpacity>
                {!isLast && <View style={styles.menuDivider} />}
              </View>
            );
          })}
        </View>

        {/* 4. BOTTOM ADDITIONAL ITEMS */}
        <View style={styles.additionalItemsBlock}>
          <TouchableOpacity
            onPress={() => router.push('/login-history' as any)}
            style={styles.additionalRow}
            activeOpacity={0.8}
          >
            <Text style={styles.additionalText}>Login & Device History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/troubleshooting' as any)}
            style={styles.additionalRow}
            activeOpacity={0.8}
          >
            <Text style={styles.additionalText}>Device Health & Diagnostics</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/app-settings' as any)}
            style={styles.additionalRow}
            activeOpacity={0.8}
          >
            <Text style={styles.additionalText}>App Settings</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleLogout}
            style={[styles.additionalRow, { borderTopWidth: 1, borderColor: '#2A2A2A', marginTop: 6 }]}
            activeOpacity={0.8}
          >
            <Text style={[styles.additionalText, { color: '#EF4444' }]}>Log Out</Text>
          </TouchableOpacity>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
  helpPillBtn: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#E8C547',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  helpPillText: {
    fontSize: 13.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
  },

  /* Profile Card */
  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 16,
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
    marginRight: 10,
  },
  userNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deIdLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5,
    color: '#8E8E8E',
  },
  deIdValue: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#E8C547',
  },
  outletLocationText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#8E8E8E',
    marginTop: 4,
  },
  avatarCircleBorder: {
    width: 52,
    height: 52,
    borderRadius: 26,
    borderWidth: 1.5,
    borderColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleBg: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#141414',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Quick Grid */
  quickGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 18,
    marginHorizontal: -3,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#191919',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingVertical: 12,
    alignItems: 'center',
    marginHorizontal: 3,
  },
  quickCardLabel: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 5,
  },

  /* Menu List Card */
  menuContainerCard: {
    backgroundColor: '#191919',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  menuRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  menuTitleText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#FFFFFF',
    marginLeft: 12,
  },
  badgePill: {
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  badgePillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5,
    fontWeight: '700',
    color: '#E8C547',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },

  /* Additional Items */
  additionalItemsBlock: {
    backgroundColor: '#191919',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 24,
  },
  additionalRow: {
    paddingVertical: 12,
  },
  additionalText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    fontWeight: '700',
    color: '#8E8E8E',
  },
});
