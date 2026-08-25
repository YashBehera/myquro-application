import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';
import { CustomAlertModal, ModalType } from '../components/CustomAlertModal';

export default function AddContactDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driverProfile, updateDriverProfile, sessionToken } = useRider();
  const [contactName, setContactName] = useState(driverProfile.emergencyContactName || '');
  const [contactNumber, setContactNumber] = useState(driverProfile.emergencyContactPhone || '');
  const [selectedRelationship, setSelectedRelationship] = useState(
    driverProfile.emergencyContactRelationship || 'spouse'
  );
  const [isSaving, setIsSaving] = useState(false);
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
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
  }) => {
    setCustomAlert({
      ...config,
      visible: true,
    });
  };

  const hideAlertModal = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/emergency-contacts');
    }
  };

  const relationships = [
    { id: 'spouse', label: 'Spouse (Husband/Wife)' },
    { id: 'parent', label: 'Parent (Father/Mother)' },
    { id: 'child', label: 'Child (Son/Daughter)' },
    { id: 'friend', label: 'Friend' },
    { id: 'others', label: 'Others' },
  ];

  const handleSaveContact = async () => {
    if (!contactName.trim()) {
      showAlertModal({
        type: 'warning',
        title: 'Required Field',
        subtitle: 'Please enter the emergency contact name.',
        primaryButtonText: 'Okay',
        onPrimaryPress: hideAlertModal,
      });
      return;
    }
    if (!contactNumber.trim() || contactNumber.trim().length < 10) {
      showAlertModal({
        type: 'warning',
        title: 'Invalid Number',
        subtitle: 'Please enter a valid 10-digit emergency contact phone number.',
        primaryButtonText: 'Okay',
        onPrimaryPress: hideAlertModal,
      });
      return;
    }

    setIsSaving(true);
    try {
      updateDriverProfile({
        emergencyContactName: contactName.trim(),
        emergencyContactPhone: contactNumber.trim(),
        emergencyContactRelationship: selectedRelationship,
      });

      if (sessionToken) {
        await fetch(`${BACKEND_URL}/api/delivery/rider/emergency-contact`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${sessionToken}`,
            Origin: 'http://localhost:3000',
          },
          body: JSON.stringify({
            contactName: contactName.trim(),
            contactNumber: contactNumber.trim(),
            relationship: selectedRelationship,
          }),
        });
      }

      showAlertModal({
        type: 'success_online',
        title: 'Contact Saved 🎉',
        subtitle: 'Emergency contact details have been successfully saved.',
        primaryButtonText: 'Done',
        onPrimaryPress: () => {
          hideAlertModal();
          router.replace('/emergency-contacts');
        },
      });
    } catch (e) {
      console.error('Error saving emergency contact:', e);
      showAlertModal({
        type: 'success_online',
        title: 'Contact Saved',
        subtitle: 'Emergency contact details saved locally.',
        primaryButtonText: 'Done',
        onPrimaryPress: () => {
          hideAlertModal();
          router.replace('/emergency-contacts');
        },
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add contact details</Text>
      </View>

      {/* MAIN SCROLLABLE FORM CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.formGroup}>
          {/* Input 1: Contact Name */}
          <View style={styles.inputBox}>
            <Ionicons name="person-outline" size={20} color="#F2CA50" />
            <TextInput
              style={styles.textInput}
              placeholder="Contact name"
              placeholderTextColor="#A6A6A6"
              value={contactName}
              onChangeText={setContactName}
              autoCapitalize="words"
            />
          </View>

          {/* Input 2: Contact Number */}
          <View style={styles.inputBox}>
            <Ionicons name="call-outline" size={20} color="#F2CA50" />
            <TextInput
              style={styles.textInput}
              placeholder="Contact number"
              placeholderTextColor="#A6A6A6"
              keyboardType="phone-pad"
              maxLength={10}
              value={contactNumber}
              onChangeText={setContactNumber}
            />
          </View>
        </View>

        {/* SELECT RELATIONSHIP SECTION */}
        <Text style={styles.sectionHeaderTitle}>Select Relationship</Text>

        <View style={styles.radioListContainer}>
          {relationships.map((rel, index) => {
            const isSelected = selectedRelationship === rel.id;
            const isLast = index === relationships.length - 1;

            return (
              <View key={rel.id}>
                <TouchableOpacity
                  onPress={() => setSelectedRelationship(rel.id)}
                  style={styles.radioRow}
                  activeOpacity={0.8}
                >
                  <View
                    style={[
                      styles.radioCircleOutline,
                      isSelected && styles.radioCircleSelectedBorder,
                    ]}
                  >
                    {isSelected && <View style={styles.radioCircleDot} />}
                  </View>

                  <Text style={styles.radioLabelText}>{rel.label}</Text>
                </TouchableOpacity>

                {!isLast && <View style={styles.radioDivider} />}
              </View>
            );
          })}
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* BOTTOM FIXED SAVE CONTACT BUTTON */}
      <View style={[styles.bottomBarContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={handleSaveContact}
          disabled={isSaving}
          style={[styles.saveContactBtn, isSaving && { opacity: 0.7 }]}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator color="#000000" size="small" />
          ) : (
            <Text style={styles.saveContactBtnText}>Save Contact</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* REUSABLE CUSTOM ALERT UI MODAL */}
      <CustomAlertModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        subtitle={customAlert.subtitle}
        primaryButtonText={customAlert.primaryButtonText}
        onPrimaryPress={customAlert.onPrimaryPress || hideAlertModal}
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
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  formGroup: {
    gap: 16,
    marginBottom: 24,
  },
  inputBox: {
    backgroundColor: '#0A0908',
    borderWidth: 1,
    borderColor: '#29241E',
    borderRadius: 16,
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 14,
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  radioListContainer: {
    gap: 4,
  },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  radioCircleOutline: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  radioCircleSelectedBorder: {
    borderColor: '#F2CA50',
  },
  radioCircleDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F2CA50',
  },
  radioLabelText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#FFFFFF',
  },
  radioDivider: {
    height: 1,
    backgroundColor: '#231F1A',
  },
  bottomBarContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#000000',
  },
  saveContactBtn: {
    backgroundColor: '#F2CA50',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  saveContactBtnText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
});
