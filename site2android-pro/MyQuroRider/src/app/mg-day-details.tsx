import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  Keyboard,
  TouchableWithoutFeedback,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';

export default function MGDayFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { sessionToken } = useRider();
  
  const dateStr = (params.date as string) || 'Tuesday, 18 August';
  
  const [description, setDescription] = useState('');
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<1 | 2 | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Track uploaded file name and URI for slot 1 and slot 2
  const [slot1File, setSlot1File] = useState<string | null>(null);
  const [slot1Uri, setSlot1Uri] = useState<string | null>(null);
  const [slot2File, setSlot2File] = useState<string | null>(null);
  const [slot2Uri, setSlot2Uri] = useState<string | null>(null);

  const handleBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/daily-mg');
    }
  };

  const openUploadMenu = (slotNum: 1 | 2) => {
    setSelectedSlot(slotNum);
    Alert.alert(
      'Upload Proof Screenshot',
      'Select device upload source:',
      [
        {
          text: '📷 Take Photo (Camera)',
          onPress: () => handleSelectOption('camera', slotNum),
        },
        {
          text: '🖼️ Choose from Gallery',
          onPress: () => handleSelectOption('local', slotNum),
        },
        {
          text: '📄 Browse Files / Google Drive',
          onPress: () => handleSelectOption('drive', slotNum),
        },
        {
          text: 'Cancel',
          style: 'cancel',
        },
      ],
      { cancelable: true }
    );
  };

  const handleSelectOption = async (optionType: 'camera' | 'local' | 'drive', targetSlot?: 1 | 2 | null) => {
    setUploadModalVisible(false);
    const slot = targetSlot || selectedSlot || 1;
    
    try {
      if (optionType === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status === 'granted') {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            const uri = result.assets[0].uri;
            const name = uri.split('/').pop() || `MG_Photo_${Date.now().toString().slice(-4)}.jpg`;
            if (slot === 1) {
              setSlot1File(name);
              setSlot1Uri(uri);
            } else {
              setSlot2File(name);
              setSlot2Uri(uri);
            }
            Alert.alert('Screenshot Attached', 'Photo captured and attached successfully!');
            return;
          }
        } else {
          Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
        }
      } else if (optionType === 'local') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status === 'granted') {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.85,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            const uri = result.assets[0].uri;
            const name = result.assets[0].fileName || uri.split('/').pop() || `MG_Screenshot_${Date.now().toString().slice(-4)}.png`;
            if (slot === 1) {
              setSlot1File(name);
              setSlot1Uri(uri);
            } else {
              setSlot2File(name);
              setSlot2Uri(uri);
            }
            Alert.alert('Screenshot Attached', 'Image selected from gallery successfully!');
            return;
          }
        } else {
          Alert.alert('Permission Required', 'Gallery permission is needed to select photos.');
        }
      } else if (optionType === 'drive') {
        const docResult = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });
        if (!docResult.canceled && docResult.assets?.[0]) {
          const asset = docResult.assets[0];
          const name = asset.name || `Doc_${Date.now().toString().slice(-4)}.pdf`;
          if (slot === 1) {
            setSlot1File(name);
            setSlot1Uri(asset.uri);
          } else {
            setSlot2File(name);
            setSlot2Uri(asset.uri);
          }
          Alert.alert('Document Attached', `Document "${name}" attached successfully!`);
          return;
        }
      }
    } catch (err) {
      console.log('Picker error:', err);
    }
  };

  const handleRemoveFile = (slotNum: 1 | 2) => {
    if (slotNum === 1) {
      setSlot1File(null);
      setSlot1Uri(null);
    } else {
      setSlot2File(null);
      setSlot2Uri(null);
    }
  };

  const handleSubmit = async () => {
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue before submitting.');
      return;
    }

    setIsSubmitting(true);
    let ticketId = `MG-${Date.now().toString().slice(-5)}`;

    if (sessionToken) {
      try {
        const res = await fetch(`${BACKEND_URL}/api/delivery/rider/support-ticket`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionToken}`,
            'Origin': 'http://localhost:3000',
          },
          body: JSON.stringify({
            category: 'minimum_guarantee',
            subject: `Minimum Guarantee Dispute on ${dateStr}`,
            description,
            metadata: { dateStr, slot1File, slot2File },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ticket?.id) ticketId = data.ticket.id;
        }
      } catch (err) {
        console.error('MG dispute ticket error:', err);
      }
    }

    setIsSubmitting(false);
    Alert.alert('Dispute Submitted', `Your minimum guarantee dispute (Ticket #${ticketId}) for ${dateStr} has been submitted successfully. Our operations team will review your login hours and order acceptances.`, [
      {
        text: 'OK',
        onPress: () => {
          router.replace('/daily-mg');
        },
      },
    ]);
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

        {/* TOP HEADER BAR */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#F2CA50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Daily Minimum Guarantee Issue</Text>
        </View>

        {/* MAIN CONTENT */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Selected Date */}
          <Text style={styles.dateText}>{dateStr}</Text>
          <View style={styles.dottedDivider} />

          {/* Section 1: Describe the issue */}
          <Text style={styles.sectionLabel}>Describe the issue</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Describe the issue"
            placeholderTextColor="#787878"
            multiline
            numberOfLines={4}
            value={description}
            onChangeText={setDescription}
            blurOnSubmit={true}
            returnKeyType="done"
            onSubmitEditing={Keyboard.dismiss}
          />

          {/* Section 2: Attach the Incentive screenshot */}
          <Text style={styles.sectionLabel}>Attach the Incentive screenshot</Text>
          <View style={styles.uploadRow}>
            {/* Upload Slot 1 */}
            {slot1File ? (
              <View style={styles.uploadedSlot}>
                {slot1Uri ? (
                  <Image source={{ uri: slot1Uri }} style={styles.slotPreviewImg} resizeMode="cover" />
                ) : (
                  <Ionicons name="document-text" size={36} color="#22C55E" />
                )}
                <View style={styles.slotBadgeOverlay}>
                  <View style={styles.checkTag}>
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                    <Text style={styles.fileNameText} numberOfLines={1}>{slot1File}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFile(1)}
                  style={styles.removeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => openUploadMenu(1)}
                style={styles.uploadSlot}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={28} color="#F2CA50" />
                <Text style={styles.uploadText}>Slot 1</Text>
                <Text style={styles.uploadSubtext}>Tap to upload</Text>
              </TouchableOpacity>
            )}

            {/* Upload Slot 2 */}
            {slot2File ? (
              <View style={styles.uploadedSlot}>
                {slot2Uri ? (
                  <Image source={{ uri: slot2Uri }} style={styles.slotPreviewImg} resizeMode="cover" />
                ) : (
                  <Ionicons name="document-text" size={36} color="#22C55E" />
                )}
                <View style={styles.slotBadgeOverlay}>
                  <View style={styles.checkTag}>
                    <Ionicons name="checkmark-circle" size={14} color="#22C55E" />
                    <Text style={styles.fileNameText} numberOfLines={1}>{slot2File}</Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => handleRemoveFile(2)}
                  style={styles.removeBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name="close" size={16} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                onPress={() => openUploadMenu(2)}
                style={styles.uploadSlot}
                activeOpacity={0.7}
              >
                <Ionicons name="camera-outline" size={28} color="#F2CA50" />
                <Text style={styles.uploadText}>Slot 2</Text>
                <Text style={styles.uploadSubtext}>Tap to upload</Text>
              </TouchableOpacity>
            )}
          </View>
        </ScrollView>

        {/* SUBMIT BUTTON */}
        <View style={[styles.bottomContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity onPress={handleSubmit} activeOpacity={0.85} style={styles.submitBtnWrapper}>
            <LinearGradient
              colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.submitBtnGradient}
            >
              <Text style={styles.submitBtnText}>SUBMIT</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* ATTACHMENT MODAL */}
        <Modal
          visible={uploadModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setUploadModalVisible(false)}
        >
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setUploadModalVisible(false)}
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Choose Action</Text>

              {/* Option 1: Take Photo */}
              <TouchableOpacity
                onPress={() => handleSelectOption('camera')}
                style={styles.modalOption}
                activeOpacity={0.7}
              >
                <Ionicons name="camera" size={24} color="#F2CA50" />
                <Text style={styles.modalOptionText}>Take Photo</Text>
              </TouchableOpacity>

              {/* Option 2: Local Folders */}
              <TouchableOpacity
                onPress={() => handleSelectOption('local')}
                style={styles.modalOption}
                activeOpacity={0.7}
              >
                <Ionicons name="folder-open-outline" size={24} color="#F2CA50" />
                <Text style={styles.modalOptionText}>Choose from Local Folders</Text>
              </TouchableOpacity>

              {/* Option 3: Google Drive */}
              <TouchableOpacity
                onPress={() => handleSelectOption('drive')}
                style={styles.modalOption}
                activeOpacity={0.7}
              >
                <Ionicons name="logo-google" size={24} color="#F2CA50" />
                <Text style={styles.modalOptionText}>Choose from Google Drive</Text>
              </TouchableOpacity>

              {/* Cancel Button */}
              <TouchableOpacity
                onPress={() => setUploadModalVisible(false)}
                style={styles.modalCancelBtn}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
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
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  dateText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 16,
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#2A2520',
    borderStyle: 'dashed',
    marginBottom: 24,
  },
  sectionLabel: {
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  textArea: {
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 120,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    textAlignVertical: 'top',
    marginBottom: 24,
  },
  uploadRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  uploadSlot: {
    flex: 1,
    height: 150,
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    borderStyle: 'dashed',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  uploadedSlot: {
    flex: 1,
    height: 150,
    backgroundColor: '#11100E',
    borderWidth: 1.5,
    borderColor: '#22C55E',
    borderRadius: 20,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  slotPreviewImg: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  slotBadgeOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 6,
    paddingHorizontal: 8,
  },
  checkTag: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  fileNameText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Medium',
    color: '#FFFFFF',
    flexShrink: 1,
  },
  removeBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  uploadText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  uploadSubtext: {
    fontSize: 11,
    fontFamily: 'Urbanist-Regular',
    color: '#787878',
  },
  bottomContainer: {
    paddingHorizontal: 16,
    backgroundColor: '#000000',
  },
  submitBtnWrapper: {
    width: '100%',
    height: 56,
    borderRadius: 20,
    overflow: 'hidden',
  },
  submitBtnGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitBtnText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A1F00',
  },
  // Modal styles
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#141210',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    padding: 24,
    gap: 14,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    height: 56,
    borderWidth: 1.2,
    borderColor: '#2E2923',
    borderRadius: 16,
    paddingHorizontal: 16,
    backgroundColor: '#11100E',
  },
  modalOptionText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    color: '#FFFFFF',
  },
  modalCancelBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    marginTop: 10,
  },
  modalCancelText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EF4444',
  },
});
