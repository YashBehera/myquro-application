import React, { useState } from 'react';
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
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';
import { CustomAlertModal, ModalType } from '../../components/CustomAlertModal';

export default function MoreScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driverProfile, logout } = useRider();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    title: '',
    subtitle: '',
  });

  const showAlertModal = (config: {
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
  }) => {
    setCustomAlert({
      ...config,
      visible: true,
    });
  };

  const hideAlertModal = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  };

  const handleLogout = () => {
    showAlertModal({
      type: 'shift_cancel',
      title: 'Logout?',
      subtitle: 'Are you sure you want to logout? You will need to login again to start shifts and go online.',
      primaryButtonText: 'Logout',
      onPrimaryPress: async () => {
        hideAlertModal();
        await logout();
        router.replace('/onboarding');
      },
      secondaryButtonText: 'Cancel',
      onSecondaryPress: hideAlertModal,
    });
  };

  const menuItems = [
    {
      id: 'refer',
      title: 'Refer & Earn',
      icon: 'people-outline',
      badge: 'Upto ₹7,000',
      route: '/(tabs)/refer',
    },
    {
      id: 'partner',
      title: 'Partner club & Benefits',
      icon: 'ribbon-outline',
      route: '/benefits-loans',
    },
    {
      id: 'rent_ev',
      title: 'Rent EV Hub',
      icon: 'bicycle-outline',
      badge: 'Save ₹5k/mo',
      route: '/rent-ev',
    },
    {
      id: 'insurance',
      title: 'Insurance',
      icon: 'heart-outline',
      route: '/insurance',
    },
    {
      id: 'help',
      title: 'Help & Support',
      icon: 'headset-outline',
      route: '/help-support',
    },
    {
      id: 'ways',
      title: 'Ways to earn',
      icon: 'calculator-outline',
      route: '/ways-to-earn',
    },
    {
      id: 'store',
      title: 'MyQuro Store',
      icon: 'storefront-outline',
      route: '/myquro-store',
    },
    {
      id: 'shifts',
      title: 'Book Shifts',
      icon: 'calendar-outline',
      route: '/shifts',
    },
    {
      id: 'zone',
      title: 'My Zone & Map',
      icon: 'map-outline',
      route: '/my-zone',
    },
    {
      id: 'bags',
      title: 'MyQuro Reusable bags',
      icon: 'bag-handle-outline',
      route: '/reusable-bags',
    },
    {
      id: 'emergency',
      title: 'Emergency Contacts & SOS',
      icon: 'shield-checkmark-outline',
      route: '/sos',
    },
    {
      id: 'settings',
      title: 'App settings',
      icon: 'settings-outline',
      route: '/app-settings',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => router.push('/help-support')}
          style={styles.helpPillBtn}
          activeOpacity={0.8}
        >
          <Text style={styles.helpPillText}>Help</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. USER PROFILE CARD */}
        <TouchableOpacity
          onPress={() => router.push('/my-profile')}
          style={styles.profileCard}
          activeOpacity={0.85}
        >
          <View style={styles.profileInfo}>
            <Text style={styles.userNameText}>{driverProfile.name}</Text>
            <Text style={styles.deIdLabel}>
              DE ID : <Text style={styles.deIdValue}>{driverProfile.deId || '—'}</Text>
            </Text>
          </View>

          <View style={styles.avatarCircleBorder}>
            <View style={styles.avatarCircleBg}>
              {driverProfile.avatarUrl &&
              (driverProfile.avatarUrl.startsWith('http') ||
                driverProfile.avatarUrl.startsWith('file://') ||
                driverProfile.avatarUrl.startsWith('content://') ||
                driverProfile.avatarUrl.startsWith('data:')) ? (
                <Image
                  source={{ uri: driverProfile.avatarUrl }}
                  style={{ width: 50, height: 50, borderRadius: 25 }}
                  resizeMode="cover"
                />
              ) : (
                <Ionicons name="person" size={28} color="#F2CA50" />
              )}
            </View>
          </View>
        </TouchableOpacity>

        {/* 2. 3 QUICK ACTION CARDS GRID */}
        <View style={styles.quickGridRow}>
          {/* Card 1: My Profile */}
          <TouchableOpacity
            onPress={() => router.push('/my-profile')}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <Ionicons name="person-outline" size={22} color="#F2CA50" />
            <Text style={styles.quickCardLabel}>My Profile</Text>
          </TouchableOpacity>

          {/* Card 2: Floating Cash */}
          <TouchableOpacity
            onPress={() => router.push('/floating-cash')}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <Ionicons name="cash-outline" size={22} color="#F2CA50" />
            <Text style={styles.quickCardLabel}>Floating Cash</Text>
          </TouchableOpacity>

          {/* Card 3: Wrong Action */}
          <TouchableOpacity
            onPress={() => router.push('/wrong-action-details')}
            style={styles.quickCard}
            activeOpacity={0.85}
          >
            <Ionicons name="warning-outline" size={22} color="#F2CA50" />
            <Text style={styles.quickCardLabel}>Wrong Action</Text>
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
                    <Ionicons name={item.icon as any} size={20} color="#F2CA50" />
                    <Text style={styles.menuTitleText}>{item.title}</Text>
                    {item.badge && (
                      <View style={styles.badgePill}>
                        <Text style={styles.badgePillText}>{item.badge}</Text>
                      </View>
                    )}
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#A6A6A6" />
                </TouchableOpacity>
                {!isLast && <View style={styles.menuDivider} />}
              </View>
            );
          })}
        </View>

        {/* 4. BOTTOM ADDITIONAL ITEMS */}
        <View style={styles.additionalItemsBlock}>
          <TouchableOpacity
            onPress={() => router.push('/login-history')}
            style={styles.additionalRow}
            activeOpacity={0.8}
          >
            <Text style={styles.additionalText}>Login History</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => {
              showAlertModal({
                type: 'info',
                title: 'Orders on Hold',
                subtitle: 'You have 0 orders on hold. All assigned deliveries are clear.',
                primaryButtonText: 'View Orders',
                onPrimaryPress: () => {
                  hideAlertModal();
                  router.push('/(tabs)/orders');
                },
                secondaryButtonText: 'Dismiss',
                onSecondaryPress: hideAlertModal,
              });
            }}
            style={styles.additionalRow}
            activeOpacity={0.8}
          >
            <Text style={styles.additionalText}>Orders On hold</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push('/app-settings')}
            style={styles.additionalRow}
            activeOpacity={0.8}
          >
            <Text style={styles.additionalText}>Settings</Text>
          </TouchableOpacity>
        </View>

        {/* 5. LOGOUT BUTTON */}
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutCard}
          activeOpacity={0.85}
        >
          <Ionicons name="log-out-outline" size={20} color="#FF4444" />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* REUSABLE CUSTOM ALERT UI MODAL */}
      <CustomAlertModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        subtitle={customAlert.subtitle}
        primaryButtonText={customAlert.primaryButtonText}
        onPrimaryPress={customAlert.onPrimaryPress || hideAlertModal}
        secondaryButtonText={customAlert.secondaryButtonText}
        onSecondaryPress={customAlert.onSecondaryPress || hideAlertModal}
        onClose={hideAlertModal}
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  helpPillBtn: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 6,
  },
  helpPillText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  profileCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  profileInfo: {
    flex: 1,
  },
  userNameText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  deIdLabel: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
  },
  deIdValue: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  avatarCircleBorder: {
    width: 58,
    height: 58,
    borderRadius: 29,
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarCircleBg: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#1A1610',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quickGridRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  quickCard: {
    flex: 1,
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  quickCardLabel: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  menuContainerCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 22,
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
    gap: 12,
    flex: 1,
  },
  menuTitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  badgePill: {
    backgroundColor: '#F2CA50',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 4,
  },
  badgePillText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#231F1A',
  },
  additionalItemsBlock: {
    marginBottom: 20,
  },
  additionalRow: {
    paddingVertical: 12,
  },
  additionalText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  logoutCard: {
    backgroundColor: '#1A0D0D',
    borderWidth: 1.5,
    borderColor: '#FF4444',
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  logoutText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FF4444',
  },
});
