import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { ArrowLeft, ChevronRight } from 'lucide-react-native';
import { scale } from './profileUtils';

interface SettingsSubViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
  logout: () => void;
}

export const SettingsSubView: React.FC<SettingsSubViewProps> = ({
  onBack,
  showToast,
  logout,
}) => {
  const [settingsWhatsappEnabled, setSettingsWhatsappEnabled] = useState(true);
  const [settingsCacheSize, setSettingsCacheSize] = useState('2.41 MB');
  const settingsSmsEnabled = true;

  return (
    <View style={styles.favContainer}>
      {/* Header */}
      <View style={styles.favHeader}>
        <TouchableOpacity onPress={onBack} style={styles.favHeaderBackBtn}>
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
            onPress={() => {
              setSettingsCacheSize('0.00 KB');
              showToast('Cache cleared successfully');
            }}
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
            onPress={() => {
              Alert.alert(
                'Delete Account',
                'Are you sure you want to delete your Quro account? This action is permanent and cannot be undone.',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: () => {
                      logout();
                      showToast('Account deleted successfully');
                    }
                  }
                ]
              );
            }}
          >
            <Text style={[styles.settingsCardLabel, { color: '#ff5a5a', fontFamily: 'Urbanist-Bold' }]}>
              Delete My Quro Account
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  favContainer: {
    flex: 1,
    backgroundColor: '#191919',
  },
  favHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 52 : 16,
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
