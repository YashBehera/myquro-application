import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { ArrowLeft } from 'lucide-react-native';
import { scale } from './profileUtils';

interface LogoutSubViewProps {
  onBack: () => void;
  showToast: (msg: string) => void;
  logout: () => void;
}

export const LogoutSubView: React.FC<LogoutSubViewProps> = ({
  onBack,
  showToast,
  logout,
}) => {
  const deviceName = Platform.OS === 'ios' ? 'Apple iPhone18,3' : 'Android SDK built for x86';

  return (
    <View style={styles.favContainer}>
      {/* Header */}
      <View style={styles.favHeader}>
        <TouchableOpacity onPress={onBack} style={styles.favHeaderBackBtn}>
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.logoutHeaderTitle}>Logout</Text>
        <View style={{ width: 34 }} />
      </View>

      <View style={styles.logoutContentArea}>
        <View style={styles.logoutSectionHeader}>
          <Text style={styles.logoutSectionHeaderTitle}>CURRENT DEVICE</Text>
        </View>

        <View style={styles.logoutDeviceCard}>
          <View style={styles.logoutDeviceCardLeft}>
            <Text style={styles.logoutDeviceName}>{deviceName}</Text>
            <Text style={styles.logoutDeviceStatus}>Active now</Text>
          </View>
          <TouchableOpacity
            style={styles.logoutBtnAction}
            activeOpacity={0.8}
            onPress={() => {
              logout();
              showToast('Logged out successfully');
            }}
          >
            <Text style={styles.logoutBtnActionText}>LOGOUT</Text>
          </TouchableOpacity>
        </View>
      </View>
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
  logoutHeaderTitle: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 20 * scale,
    color: '#d0c5af',
    textAlign: 'center',
  },
  logoutContentArea: {
    flex: 1,
    backgroundColor: '#000000',
    paddingTop: 16 * scale,
  },
  logoutSectionHeader: {
    backgroundColor: '#0f0f0f',
    paddingVertical: 16 * scale,
    paddingHorizontal: 24 * scale,
    width: '100%',
  },
  logoutSectionHeaderTitle: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13 * scale,
    color: '#8a8a8a',
    letterSpacing: 0.65 * scale,
    textTransform: 'uppercase',
  },
  logoutDeviceCard: {
    backgroundColor: '#151515',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 24 * scale,
    borderRadius: 20 * scale,
    marginTop: 12 * scale,
    marginHorizontal: 16 * scale,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.05)',
  },
  logoutDeviceCardLeft: {
    flex: 1,
    gap: 4 * scale,
  },
  logoutDeviceName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20 * scale,
    color: '#ffffff',
  },
  logoutDeviceStatus: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 16 * scale,
    color: '#8a8a8a',
  },
  logoutBtnAction: {
    paddingVertical: 8 * scale,
    paddingHorizontal: 12 * scale,
  },
  logoutBtnActionText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * scale,
    color: '#d4af37',
    letterSpacing: 0.45 * scale,
  },
});
