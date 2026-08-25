import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  ScrollView,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';
import { CustomAlertModal, ModalType } from '../components/CustomAlertModal';

export default function EmergencyContactsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driverProfile, updateDriverProfile } = useRider();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/my-profile');
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

  const hasContact = !!(
    driverProfile.emergencyContactName && driverProfile.emergencyContactPhone
  );

  const handleDeleteContact = () => {
    showAlertModal({
      type: 'shift_cancel',
      title: 'Remove Contact?',
      subtitle: 'Are you sure you want to remove your emergency contact details?',
      primaryButtonText: 'Remove',
      onPrimaryPress: () => {
        hideAlertModal();
        updateDriverProfile({
          emergencyContactName: '',
          emergencyContactPhone: '',
          emergencyContactRelationship: '',
        });
      },
      secondaryButtonText: 'Cancel',
      onSecondaryPress: hideAlertModal,
    });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Emergency contacts</Text>
      </View>

      <View style={styles.dottedHeaderDivider} />

      {hasContact ? (
        <ScrollView style={styles.savedContent} showsVerticalScrollIndicator={false}>
          {/* Active Contact Card */}
          <View style={styles.premiumContactCard}>
            {/* Top Row: Avatar + Name + Relationship Badge */}
            <View style={styles.cardTopHeader}>
              <View style={styles.avatarGlowContainer}>
                <View style={styles.avatarInner}>
                  <Ionicons name="shield-checkmark" size={24} color="#000000" />
                </View>
              </View>

              <View style={styles.contactInfoCol}>
                <View style={styles.nameBadgeRow}>
                  <Text style={styles.contactName}>{driverProfile.emergencyContactName}</Text>
                  <View style={styles.verifiedPill}>
                    <Ionicons name="checkmark-circle" size={12} color="#16A34A" />
                    <Text style={styles.verifiedPillText}>Active</Text>
                  </View>
                </View>

                <View style={styles.relTag}>
                  <Ionicons name="people-outline" size={12} color="#F2CA50" />
                  <Text style={styles.relTagText}>
                    {driverProfile.emergencyContactRelationship
                      ? driverProfile.emergencyContactRelationship.toUpperCase()
                      : 'PRIMARY CONTACT'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Middle: Phone Number with Quick Call CTA */}
            <View style={styles.phoneHighlightBox}>
              <View style={styles.phoneLeft}>
                <View style={styles.phoneIconCircle}>
                  <Ionicons name="call" size={16} color="#16A34A" />
                </View>
                <View>
                  <Text style={styles.phoneLabel}>Emergency Hotline Number</Text>
                  <Text style={styles.phoneNumber}>+91 {driverProfile.emergencyContactPhone}</Text>
                </View>
              </View>
            </View>

            {/* Bottom Actions Row */}
            <View style={styles.cardActionsRow}>
              <TouchableOpacity
                onPress={() => router.push('/add-contact-details')}
                style={styles.editActionBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="create-outline" size={16} color="#F2CA50" />
                <Text style={styles.editActionText}>Edit Contact</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleDeleteContact}
                style={styles.deleteActionBtn}
                activeOpacity={0.8}
              >
                <Ionicons name="trash-outline" size={16} color="#EF4444" />
                <Text style={styles.deleteActionText}>Remove</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Safety & SOS Info Banner */}
          <View style={styles.sosBanner}>
            <View style={styles.sosIconCircle}>
              <Ionicons name="medical" size={20} color="#F2CA50" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.sosBannerTitle}>24/7 Rider Safety Assistance</Text>
              <Text style={styles.sosBannerDesc}>
                In case of any road emergency or incident during an active trip, our team and your emergency contact are automatically alerted.
              </Text>
            </View>
          </View>
        </ScrollView>
      ) : (
        /* CENTER EMPTY STATE HERO */
        <View style={styles.heroContent}>
          {/* Avatar Graphic Circle */}
          <View style={styles.avatarCircleWrapper}>
            <View style={styles.avatarOuterBorder}>
              <View style={styles.avatarInnerBg}>
                <Ionicons name="shield-outline" size={48} color="#F2CA50" />
              </View>
            </View>

            {/* Sparkles */}
            <Ionicons name="sparkles" size={16} color="#F2CA50" style={styles.sparkleTopRight} />
            <Ionicons name="sparkles" size={14} color="#F2CA50" style={styles.sparkleBottomLeft} />
          </View>

          {/* Reach out Text */}
          <Text style={styles.reachOutTitle}>No Emergency Contact Set</Text>
          <Text style={styles.reachOutText}>
            Add a trusted friend or family member for your peace of mind and safety while delivering on the road.
          </Text>

          {/* Golden Add Contact CTA Button */}
          <TouchableOpacity
            onPress={() => router.push('/add-contact-details')}
            style={styles.addContactBtn}
            activeOpacity={0.85}
          >
            <Ionicons name="add-circle" size={20} color="#000000" />
            <Text style={styles.addContactBtnText}>Add Emergency Contact</Text>
          </TouchableOpacity>
        </View>
      )}

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
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dottedHeaderDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#3D3528',
    borderStyle: 'dashed',
  },
  heroContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    marginTop: -40,
  },
  avatarCircleWrapper: {
    position: 'relative',
    marginBottom: 24,
  },
  avatarOuterBorder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 1.5,
    borderColor: '#2E2923',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  avatarInnerBg: {
    width: 108,
    height: 108,
    borderRadius: 54,
    backgroundColor: '#141210',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2CA50',
  },
  sparkleTopRight: {
    position: 'absolute',
    top: 6,
    right: -10,
  },
  sparkleBottomLeft: {
    position: 'absolute',
    bottom: 12,
    left: -12,
  },
  reachOutTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
  },
  reachOutText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A0A0A0',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    marginBottom: 32,
  },
  addContactBtn: {
    backgroundColor: '#F2CA50',
    height: 54,
    paddingHorizontal: 28,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  addContactBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  savedContent: {
    flex: 1,
    padding: 16,
  },
  premiumContactCard: {
    backgroundColor: '#141210',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    borderRadius: 24,
    padding: 20,
    gap: 16,
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 6,
  },
  cardTopHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  avatarGlowContainer: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: 'rgba(242, 202, 80, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2CA50',
  },
  avatarInner: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  contactInfoCol: {
    flex: 1,
    gap: 4,
  },
  nameBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contactName: {
    fontSize: 19,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  verifiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  verifiedPillText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#16A34A',
  },
  relTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  relTagText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
    letterSpacing: 0.5,
  },
  phoneHighlightBox: {
    backgroundColor: '#1E1B16',
    borderWidth: 1,
    borderColor: '#2F2A21',
    borderRadius: 16,
    padding: 14,
  },
  phoneLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  phoneIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(22, 163, 74, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  phoneLabel: {
    fontSize: 11,
    fontFamily: 'Urbanist-Medium',
    color: '#A0A0A0',
    marginBottom: 2,
  },
  phoneNumber: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  cardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  editActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#26221B',
    borderWidth: 1,
    borderColor: '#3E3830',
    height: 46,
    borderRadius: 14,
  },
  editActionText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  deleteActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.4)',
  },
  deleteActionText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EF4444',
  },
  sosBanner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 14,
    backgroundColor: '#161412',
    borderWidth: 1,
    borderColor: '#2F2A21',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
  },
  sosIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
  },
  sosBannerTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  sosBannerDesc: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#A0A0A0',
    lineHeight: 18,
  },
});
