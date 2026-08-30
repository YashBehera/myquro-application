import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { scale } from './profileUtils';

interface SettingsSubViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
  logout: () => void;
  deleteAccount?: () => Promise<void>;
}

export const SettingsSubView: React.FC<SettingsSubViewProps> = ({
  onBack,
  showToast,
  logout,
  deleteAccount,
}) => {
  const [settingsWhatsappEnabled, setSettingsWhatsappEnabled] = useState(true);
  const [settingsCacheSize, setSettingsCacheSize] = useState('2.41 MB');
  const [isDeleting, setIsDeleting] = useState(false);
  const settingsSmsEnabled = true;

  const handleClearCache = async () => {
    try {
      await AsyncStorage.multiRemove([
        '@all_food_items',
        '@placed_orders_history',
      ]);
      setSettingsCacheSize('0.00 KB');
      showToast('Cache cleared successfully');
    } catch (e) {
      showToast('Failed to clear cache');
    }
  };

  const handleDeleteAccount = () => {
    Alert.alert(
      'Delete Account',
      'Are you sure you want to permanently delete your MyQuro account and all personal data? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Permanently',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              if (deleteAccount) {
                await deleteAccount();
              } else {
                logout();
              }
              showToast('Account deleted successfully');
            } catch (err: any) {
              Alert.alert('Deletion Failed', err.message || 'Unable to delete account at this time. Please try again.');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={styles.favContainer}>
      {/* Header */}
      <View style={styles.favHeader}>
        <TouchableOpacity
          onPress={onBack}
          style={styles.favHeaderBackBtn}
          accessibilityRole="button"
          accessibilityLabel="Back to Profile"
        >
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.settingsHeaderTitle}>Settings</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: 24, paddingBottom: 40 }}
      >
        {/* Group 1: Recommendations & Reminders */}
        <Text style={styles.settingsSectionTitleMain}>RECOMMENDATIONS & REMINDERS</Text>
        <Text style={styles.settingsSectionDesc}>
          Keep this on to receive offer recommendations & timely reminders based on your interests.
        </Text>

        {/* SMS Row */}
        <View style={styles.settingsRowInline}>
          <Text style={styles.settingsRowLabel}>SMS</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              showToast('Order related SMS cannot be disabled');
            }}
            accessibilityRole="switch"
            accessibilityLabel="SMS notifications"
            style={[styles.settingsToggleContainer, settingsSmsEnabled ? styles.settingsToggleActive : styles.settingsToggleInactive]}
          >
            <View style={[styles.settingsToggleCircle, settingsSmsEnabled ? styles.settingsToggleCircleActive : styles.settingsToggleCircleInactive]} />
          </TouchableOpacity>
        </View>

        {/* WhatsApp Row */}
        <View style={styles.settingsRowInline}>
          <Text style={styles.settingsRowLabel}>WhatsApp</Text>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setSettingsWhatsappEnabled(!settingsWhatsappEnabled)}
            accessibilityRole="switch"
            accessibilityLabel="WhatsApp notifications"
            style={[styles.settingsToggleContainer, settingsWhatsappEnabled ? styles.settingsToggleActive : styles.settingsToggleInactive]}
          >
            <View style={[styles.settingsToggleCircle, settingsWhatsappEnabled ? styles.settingsToggleCircleActive : styles.settingsToggleCircleInactive]} />
          </TouchableOpacity>
        </View>

        <Text style={styles.settingsCaption}>
          Order related SMS cannot be disabled as they are critical to provide service.
        </Text>

        {/* Group 2: App Icon */}
        <Text style={styles.settingsSectionTitle}>APP ICON</Text>
        <View style={styles.settingsCardBox}>
          <TouchableOpacity
            style={styles.settingsCardItem}
            activeOpacity={0.7}
            onPress={() => showToast('App icon customization coming soon')}
            accessibilityRole="button"
            accessibilityLabel="Change App Icon"
          >
            <Text style={styles.settingsCardLabel}>Change App Icon</Text>
            <ChevronRight size={18} color="#d4af37" />
          </TouchableOpacity>
        </View>

        {/* Group 3: Cache */}
        <Text style={styles.settingsSectionTitle}>CACHE</Text>
        <View style={styles.settingsCardBox}>
          <TouchableOpacity
            style={styles.settingsCardItem}
            activeOpacity={0.7}
            onPress={handleClearCache}
            accessibilityRole="button"
            accessibilityLabel="Clear Cache"
          >
            <Text style={styles.settingsCardLabel}>Clear Cache</Text>
            <Text style={styles.settingsCardValue}>{settingsCacheSize}</Text>
          </TouchableOpacity>
        </View>

        {/* Group 4: Account Deletion */}
        <Text style={styles.settingsSectionTitle}>ACCOUNT DELETION</Text>
        <View style={styles.settingsCardBox}>
          <TouchableOpacity
            style={styles.settingsCardItem}
            activeOpacity={0.7}
            disabled={isDeleting}
            onPress={handleDeleteAccount}
            accessibilityRole="button"
            accessibilityLabel="Delete My Quro Account"
          >
            {isDeleting ? (
              <ActivityIndicator color="#ff5a5a" size="small" />
            ) : (
              <Text style={[styles.settingsCardLabel, { color: '#ff5a5a', fontFamily: 'Urbanist-Bold' }]}>
                Delete My Quro Account
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  favContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  favHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 8 : 14,
    backgroundColor: '#000000',
  },
  favHeaderBackBtn: {
    padding: 6,
  },
  settingsHeaderTitle: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 20 * scale,
    color: '#d0c5af',
    textAlign: 'center',
  },
  settingsSectionTitleMain: {
    fontFamily: 'Urbanist-Black',
    fontSize: 16 * scale,
    color: '#e3e3e3',
    letterSpacing: 0.65 * scale,
    marginTop: 32 * scale,
    marginBottom: 8 * scale,
  },
  settingsSectionTitle: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13 * scale,
    color: '#727272',
    letterSpacing: 0.65 * scale,
    textTransform: 'uppercase',
    marginTop: 32 * scale,
    marginBottom: 12 * scale,
  },
  settingsSectionDesc: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 15 * scale,
    color: '#a0a0a0',
    lineHeight: 24 * scale,
    marginBottom: 16 * scale,
  },
  settingsRowInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18 * scale,
    borderBottomWidth: 1,
    borderBottomColor: '#262626',
  },
  settingsRowLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 16 * scale,
    color: '#ffffff',
  },
  settingsToggleContainer: {
    width: 44 * scale,
    height: 26 * scale,
    borderRadius: 13 * scale,
    padding: 2 * scale,
    justifyContent: 'center',
  },
  settingsToggleActive: {
    backgroundColor: '#d4af37',
  },
  settingsToggleInactive: {
    backgroundColor: '#8e8e8e',
  },
  settingsToggleCircle: {
    width: 22 * scale,
    height: 22 * scale,
    borderRadius: 11 * scale,
    backgroundColor: '#000000',
  },
  settingsToggleCircleActive: {
    alignSelf: 'flex-end',
  },
  settingsToggleCircleInactive: {
    alignSelf: 'flex-start',
  },
  settingsCaption: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 14 * scale,
    color: '#727272',
    lineHeight: 19.25 * scale,
    marginTop: 16 * scale,
  },
  settingsCardBox: {
    backgroundColor: '#000000',
    borderRadius: 20 * scale,
    overflow: 'hidden',
  },
  settingsCardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18 * scale,
    paddingHorizontal: 24 * scale,
  },
  settingsCardLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 16 * scale,
    color: '#ffffff',
  },
  settingsCardValue: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 16 * scale,
    color: '#a0a0a0',
  },
});
