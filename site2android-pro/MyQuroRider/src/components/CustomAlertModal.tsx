import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Dimensions,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';

const { width } = Dimensions.get('window');

export type ModalType =
  | 'book_shift'
  | 'outside_shift'
  | 'permission_location'
  | 'gps_error'
  | 'success_online'
  | 'shift_booked'
  | 'shift_cancel'
  | 'error'
  | 'info'
  | 'warning'
  | 'bank'
  | 'wallet'
  | 'camera'
  | 'document'
  | 'battery'
  | 'sync'
  | 'phone'
  | 'sos'
  | 'scan'
  | 'copy'
  | 'bell'
  | 'logout';

export interface CustomAlertModalProps {
  visible: boolean;
  type?: ModalType;
  iconName?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  iconSize?: number;
  title: string;
  subtitle: string;
  primaryButtonText?: string;
  onPrimaryPress?: () => void;
  secondaryButtonText?: string;
  onSecondaryPress?: () => void;
  onClose: () => void;
}

export const CustomAlertModal: React.FC<CustomAlertModalProps> = ({
  visible,
  type = 'info',
  iconName,
  iconColor,
  iconSize,
  title,
  subtitle,
  primaryButtonText = 'Okay',
  onPrimaryPress,
  secondaryButtonText,
  onSecondaryPress,
  onClose,
}) => {
  const getIconConfig = (): { name: keyof typeof Ionicons.glyphMap; color: string; size: number } => {
    // 1. Direct explicit prop override
    if (iconName) {
      return {
        name: iconName,
        color:
          iconColor ||
          (type === 'shift_cancel' || type === 'error' || type === 'logout'
            ? '#EF4444'
            : type === 'success_online' || type === 'shift_booked'
            ? '#10B981'
            : '#F2CA50'),
        size: iconSize || 58,
      };
    }

    const t = (title || '').toLowerCase();

    // 2. Intelligent contextual mapping based on title keywords
    if (t.includes('logout')) {
      return { name: 'log-out-outline', color: '#EF4444', size: 58 };
    }
    if (t.includes('police') || t.includes('112')) {
      return { name: 'shield-checkmark-outline', color: '#EF4444', size: 58 };
    }
    if (t.includes('ambulance') || t.includes('108') || t.includes('medical')) {
      return { name: 'medkit-outline', color: '#EF4444', size: 58 };
    }
    if (t.includes('helpline') || t.includes('call')) {
      return { name: 'call-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('battery')) {
      return { name: 'battery-charging-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('sync') || t.includes('config')) {
      return { name: 'sync-circle-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('update') || t.includes('up to date')) {
      return { name: 'sparkles', color: '#F2CA50', size: 56 };
    }
    if (t.includes('bank') || t.includes('ifsc') || t.includes('account number')) {
      return { name: 'card-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('contact')) {
      return { name: 'people-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('ev') || t.includes('electric') || t.includes('vehicle')) {
      return { name: 'flash-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('store') || t.includes('shop')) {
      return { name: 'cart-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('email') || t.includes('subscribed')) {
      return { name: 'mail-open-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('photo') || t.includes('camera') || t.includes('selfie') || t.includes('screenshot')) {
      return { name: 'camera-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('document') || t.includes('proof') || t.includes('aadhaar')) {
      return { name: 'document-text-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('dispute') || t.includes('ticket') || t.includes('claim') || t.includes('inquiry')) {
      return { name: 'receipt-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('qr') || t.includes('barcode') || t.includes('scan')) {
      return { name: 'qr-code-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('passcode') || t.includes('password') || t.includes('pin')) {
      return { name: 'key-outline', color: type === 'error' ? '#EF4444' : '#F2CA50', size: 58 };
    }
    if (t.includes('amount') || t.includes('cash') || t.includes('fare') || t.includes('deposit') || t.includes('earning')) {
      return { name: 'wallet-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('copy') || t.includes('clipboard')) {
      return { name: 'copy-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('hold') || t.includes('order')) {
      return { name: 'cube-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('gps') || t.includes('location') || t.includes('zone')) {
      return { name: 'navigate-circle-outline', color: '#F2CA50', size: 58 };
    }
    if (t.includes('shift')) {
      return { name: 'calendar-outline', color: type === 'shift_cancel' ? '#EF4444' : '#F2CA50', size: 58 };
    }

    // 3. Explicit Type based mapping
    switch (type) {
      case 'logout':
        return { name: 'log-out-outline', color: '#EF4444', size: 58 };
      case 'bank':
        return { name: 'card-outline', color: '#F2CA50', size: 58 };
      case 'wallet':
        return { name: 'wallet-outline', color: '#F2CA50', size: 58 };
      case 'camera':
        return { name: 'camera-outline', color: '#F2CA50', size: 58 };
      case 'document':
        return { name: 'document-text-outline', color: '#F2CA50', size: 58 };
      case 'battery':
        return { name: 'battery-charging-outline', color: '#F2CA50', size: 58 };
      case 'sync':
        return { name: 'sync-circle-outline', color: '#F2CA50', size: 58 };
      case 'phone':
        return { name: 'call-outline', color: '#F2CA50', size: 58 };
      case 'sos':
        return { name: 'shield-half-outline', color: '#EF4444', size: 58 };
      case 'scan':
        return { name: 'qr-code-outline', color: '#F2CA50', size: 58 };
      case 'copy':
        return { name: 'copy-outline', color: '#F2CA50', size: 58 };
      case 'bell':
        return { name: 'notifications-outline', color: '#F2CA50', size: 58 };
      case 'book_shift':
        return { name: 'calendar-outline', color: '#F2CA50', size: 58 };
      case 'outside_shift':
        return { name: 'time-outline', color: '#F2CA50', size: 58 };
      case 'permission_location':
        return { name: 'navigate-circle-outline', color: '#F2CA50', size: 58 };
      case 'gps_error':
        return { name: 'locate-outline', color: '#F2CA50', size: 58 };
      case 'success_online':
      case 'shift_booked':
        return { name: 'checkmark-circle-outline', color: '#10B981', size: 58 };
      case 'shift_cancel':
        return { name: 'close-circle-outline', color: '#EF4444', size: 58 };
      case 'error':
        return { name: 'alert-circle-outline', color: '#EF4444', size: 58 };
      case 'warning':
        return { name: 'warning-outline', color: '#F2CA50', size: 58 };
      case 'info':
      default:
        return { name: 'information-circle-outline', color: '#F2CA50', size: 58 };
    }
  };

  const renderGraphic = () => {
    const icon = getIconConfig();
    const isSuccess = type === 'success_online' || type === 'shift_booked' || icon.color === '#10B981';
    const isDanger = type === 'shift_cancel' || type === 'error' || type === 'logout' || icon.color === '#EF4444';
    const sparkleColor = isDanger ? '#EF4444' : isSuccess ? '#10B981' : '#F2CA50';

    return (
      <View style={styles.graphicWrapper}>
        <Ionicons name="sparkles" size={13} color={sparkleColor} style={styles.sparkleLeft} />
        <Ionicons name="sparkles" size={15} color={sparkleColor} style={styles.sparkleRight} />
        <Ionicons name={icon.name} size={icon.size} color={icon.color} />
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <TouchableOpacity
          style={StyleSheet.absoluteFillObject}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.cardContainer}>
          {/* Top Right Close Button (X) */}
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="close" size={18} color="#F2CA50" />
          </TouchableOpacity>

          {/* Graphic Icon (Clean without background badge) */}
          {renderGraphic()}

          {/* Title */}
          <Text style={styles.titleText}>{title}</Text>

          {/* Subtitle */}
          <Text style={styles.subtitleText}>{subtitle}</Text>

          {/* Indicator Line with Center Dot */}
          <View style={styles.indicatorRow}>
            <View style={styles.indicatorLine} />
            <View style={styles.indicatorDot} />
            <View style={styles.indicatorLine} />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonsContainer}>
            {secondaryButtonText && (
              <TouchableOpacity
                onPress={onSecondaryPress || onClose}
                style={styles.secondaryBtn}
                activeOpacity={0.8}
              >
                <Text style={styles.secondaryBtnText}>{secondaryButtonText}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={onPrimaryPress || onClose}
              style={[
                styles.primaryBtn,
                secondaryButtonText ? { flex: 1.2 } : { width: '100%' },
                type === 'shift_cancel' || type === 'logout' ? styles.dangerPrimaryBtn : null,
              ]}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.primaryBtnText,
                  type === 'shift_cancel' || type === 'logout' ? styles.dangerPrimaryBtnText : null,
                ]}
              >
                {primaryButtonText}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#12100C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A241A',
    paddingHorizontal: 24,
    paddingTop: 30,
    paddingBottom: 26,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  closeBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.5)',
    backgroundColor: '#1E1A12',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  graphicWrapper: {
    width: 100,
    height: 72,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 4,
  },
  sparkleLeft: {
    position: 'absolute',
    left: 4,
    top: 12,
    opacity: 0.85,
  },
  sparkleRight: {
    position: 'absolute',
    right: 6,
    top: 6,
    opacity: 0.85,
  },
  titleText: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 28,
    marginTop: 10,
    marginBottom: 8,
  },
  subtitleText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#C5C5C5',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  indicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 18,
  },
  indicatorLine: {
    width: 50,
    height: 1,
    backgroundColor: '#2E271D',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F2CA50',
  },
  buttonsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: '#1C1914',
    borderWidth: 1,
    borderColor: '#3D3934',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#A6A6A6',
  },
  primaryBtn: {
    backgroundColor: '#F2CA50',
    height: 50,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  primaryBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  dangerPrimaryBtn: {
    backgroundColor: '#EF4444',
    shadowColor: '#EF4444',
  },
  dangerPrimaryBtnText: {
    color: '#FFFFFF',
  },
});

export default CustomAlertModal;

