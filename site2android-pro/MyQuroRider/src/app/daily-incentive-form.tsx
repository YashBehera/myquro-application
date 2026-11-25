import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  type ScrollViewInstance,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Alert,
  Modal,
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';
import { CustomAlertModal, ModalType } from '../components/CustomAlertModal';
import {
  submitRiderSupportTicket,
  sendRiderTicketMessage,
  formatDynamicFullDate,
} from '../utils/supportTicketApi';

interface Message {
  id: string;
  sender: 'support' | 'user';
  senderLabel?: string;
  text: string;
  timestamp: string;
  imageAttached?: string;
}

export default function DailyIncentiveFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { sessionToken, driverProfile } = useRider();
  const scrollViewRef = useRef<ScrollViewInstance>(null);

  const dateStr = (params.date as string) || formatDynamicFullDate();
  const language = (params.language as string) || 'English';

  const [activeTicketId, setActiveTicketId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
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

  const mapBackendMessages = (complaint: any) => {
    const rawMsgs = Array.isArray(complaint?.messages) ? complaint.messages : [];
    const mapped: Message[] = rawMsgs.map((m: any, i: number) => {
      const st = String(m.senderType || '').toUpperCase();
      const isRider = st === 'RIDER' || (Boolean(driverProfile?.id) && m.senderId === driverProfile?.id);
      let ts = '';
      if (m.timestamp) {
        try {
          ts = new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } catch {}
      }
      return {
        id: m.id || `msg_${i}`,
        sender: isRider ? 'user' : 'support',
        senderLabel: isRider ? 'You' : m.senderName || 'MyQuro Partner Support',
        text: m.message || '',
        timestamp: ts || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        imageAttached: m.attachmentUrl || undefined,
      };
    });
    if (mapped.length > 0) setMessages(mapped);
  };

  // Initial prompt before user creates the real backend ticket
  useEffect(() => {
    if (activeTicketId) return;
    const isHinglish = language.toLowerCase() === 'hinglish' || language.toLowerCase() === 'hindi';
    const promptText = isHinglish
      ? `Namaste! ${dateStr} ke daily incentive issue ke liye apna message likhein ya '+' button se incentive screenshot attach karein. Submit karte hi yeh sidha MyQuro Partner Support ko jayega.`
      : `Please describe your daily incentive issue for ${dateStr} or tap '+' to attach your incentive screenshot. Your message will create a tracked support ticket directly.`;

    setMessages([
      {
        id: 'prompt_1',
        sender: 'support',
        senderLabel: 'MyQuro Partner Support',
        text: promptText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
  }, [language, dateStr, activeTicketId]);

  // Live poll backend once ticket exists
  useEffect(() => {
    if (!activeTicketId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/complaints/${activeTicketId}`, {
          headers: sessionToken ? { Authorization: `Bearer ${sessionToken}` } : undefined,
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.success && data?.complaint) {
            mapBackendMessages(data.complaint);
          }
        }
      } catch {}
    }, 4000);
    return () => clearInterval(interval);
  }, [activeTicketId, sessionToken]);

  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isSending]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/daily-incentive-lang');
    }
  };

  const handleSendMessage = async (textToSend?: string, attachedImg?: string) => {
    const text = (textToSend ?? inputText).trim();
    if ((!text && !attachedImg) || isSending) return;

    const msgBody = text || 'Attached incentive screenshot';
    setInputText('');
    setIsSending(true);

    if (!activeTicketId) {
      const result = await submitRiderSupportTicket({
        sessionToken,
        category: 'daily_incentive',
        subject: `Daily Incentive Issue on ${dateStr}`,
        description: msgBody,
        attachments: attachedImg ? [attachedImg] : [],
        metadata: { date: dateStr, language },
      });
      setIsSending(false);

      if (!result.success || !result.ticket?.id) {
        if (!textToSend) setInputText(text);
        showAlertModal({
          type: 'warning',
          title: 'Ticket Failed',
          subtitle: result.error || 'Could not register your daily incentive ticket.',
          primaryButtonText: 'Okay',
          onPrimaryPress: hideAlertModal,
        });
        return;
      }

      setActiveTicketId(result.ticket.id);
      mapBackendMessages(result.ticket);
      return;
    }

    const replyRes = await sendRiderTicketMessage({
      sessionToken,
      ticketId: activeTicketId,
      senderId: driverProfile?.id || driverProfile?.deId || 'RIDER',
      senderName: driverProfile?.name || 'Delivery Partner',
      message: msgBody,
      attachmentUrl: attachedImg || null,
    });
    setIsSending(false);

    if (!replyRes.success || !replyRes.complaint) {
      if (!textToSend) setInputText(text);
      showAlertModal({
        type: 'warning',
        title: 'Message Failed',
        subtitle: replyRes.error || 'Could not send message to support server.',
        primaryButtonText: 'Okay',
        onPrimaryPress: hideAlertModal,
      });
      return;
    }

    mapBackendMessages(replyRes.complaint);
  };

  const openUploadMenu = () => {
    setUploadModalVisible(true);
  };

  const handleSelectOption = async (optionType: 'camera' | 'local' | 'drive') => {
    setUploadModalVisible(false);

    try {
      if (optionType === 'camera') {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status === 'granted') {
          const result = await ImagePicker.launchCameraAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.45,
            base64: true,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            const asset = result.assets[0];
            const uri = asset.base64
              ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
              : asset.uri;
            await handleSendMessage('Attached incentive screenshot photo', uri);
            return;
          }
        } else {
          showAlertModal({
            type: 'warning',
            title: 'Permission Required',
            subtitle: 'Camera permission is needed to capture screenshot photos.',
            primaryButtonText: 'Okay',
            onPrimaryPress: hideAlertModal,
          });
        }
      } else if (optionType === 'local') {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status === 'granted') {
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 0.45,
            base64: true,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            const asset = result.assets[0];
            const uri = asset.base64
              ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
              : asset.uri;
            await handleSendMessage('Attached incentive screenshot from gallery', uri);
            return;
          }
        } else {
          showAlertModal({
            type: 'warning',
            title: 'Permission Required',
            subtitle: 'Gallery permission is needed to select screenshot photos.',
            primaryButtonText: 'Okay',
            onPrimaryPress: hideAlertModal,
          });
        }
      } else if (optionType === 'drive') {
        const docResult = await DocumentPicker.getDocumentAsync({
          type: ['image/*', 'application/pdf'],
          copyToCacheDirectory: true,
        });
        if (!docResult.canceled && docResult.assets?.[0]) {
          const asset = docResult.assets[0];
          await handleSendMessage(`Attached document: ${asset.name}`, asset.uri);
          return;
        }
      }
    } catch (err) {
      console.log('Picker error:', err);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>

        <View style={styles.headerInfo}>
          <Text style={styles.headerTitle}>
            {activeTicketId ? `Ticket #${activeTicketId}` : 'Daily Incentive Support'}
          </Text>
          <View style={styles.onlineStatusRow}>
            <View style={styles.greenDot} />
            <Text style={styles.onlineText}>{activeTicketId ? 'Connected to Support' : 'Ready'}</Text>
          </View>
        </View>
      </View>

      {/* CONTEXT BAR */}
      <View style={styles.contextBar}>
        <Ionicons name="information-circle-outline" size={16} color="#F2CA50" />
        <Text style={styles.contextText}>Topic: Daily Incentive for {dateStr} ({language})</Text>
      </View>

      {/* CHAT MESSAGES PANEL */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {messages.map((item) => {
          const isUser = item.sender === 'user';
          return (
            <View
              key={item.id}
              style={[
                styles.messageRow,
                isUser ? styles.userRow : styles.aiRow,
              ]}
            >
              {!isUser && (
                <View style={styles.aiAvatar}>
                  <Ionicons name="headset" size={14} color="#000000" />
                </View>
              )}

              <View
                style={[
                  styles.msgBubble,
                  isUser ? styles.userBubble : styles.aiBubble,
                ]}
              >
                {item.imageAttached && (
                  <View style={styles.imageBadge}>
                    {item.imageAttached.startsWith('data:image/') ||
                    item.imageAttached.startsWith('file://') ||
                    item.imageAttached.startsWith('http') ||
                    item.imageAttached.startsWith('content://') ? (
                      <Image source={{ uri: item.imageAttached }} style={styles.chatAttachedImage} resizeMode="cover" />
                    ) : (
                      <Ionicons name="image-outline" size={20} color="#F2CA50" />
                    )}
                  </View>
                )}

                <Text style={styles.msgText}>{item.text}</Text>
                <Text style={styles.msgTime}>{item.timestamp}</Text>
              </View>
            </View>
          );
        })}

        {isSending && (
          <View style={[styles.messageRow, styles.aiRow]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sync" size={14} color="#000000" />
            </View>
            <View style={[styles.msgBubble, styles.aiBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#F2CA50" style={styles.loader} />
              <Text style={styles.typingText}>Syncing with support...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* INPUT FIELD BAR */}
      <View style={[styles.bottomInputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <TouchableOpacity
          onPress={openUploadMenu}
          style={styles.attachBtn}
          activeOpacity={0.7}
          disabled={isSending}
        >
          <Ionicons name="add-circle" size={32} color="#F2CA50" />
        </TouchableOpacity>

        <TextInput
          style={styles.chatInput}
          placeholder="Type your message..."
          placeholderTextColor="#787878"
          value={inputText}
          onChangeText={setInputText}
          onSubmitEditing={() => handleSendMessage()}
        />

        <TouchableOpacity
          onPress={() => handleSendMessage()}
          style={[styles.sendBtn, isSending && { opacity: 0.6 }]}
          disabled={isSending}
          activeOpacity={0.7}
        >
          <Ionicons name="send" size={20} color="#000000" />
        </TouchableOpacity>
      </View>

      {/* UPLOAD SELECTION MODAL */}
      <Modal
        visible={uploadModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setUploadModalVisible(false)}
        >
          <View style={styles.modalContent} onStartShouldSetResponder={() => true}>
            <Text style={styles.modalTitle}>Choose Source</Text>

            {/* Option 1: Take a Picture */}
            <TouchableOpacity
              onPress={() => handleSelectOption('camera')}
              style={styles.modalOption}
              activeOpacity={0.7}
            >
              <Ionicons name="camera-outline" size={24} color="#F2CA50" />
              <Text style={styles.modalOptionText}>Take a Picture (Camera)</Text>
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
    </KeyboardAvoidingView>
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
    borderBottomWidth: 1,
    borderBottomColor: '#1A1815',
  },
  backBtn: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerInfo: {
    flex: 1,
    gap: 2,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  onlineStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  greenDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#22C55E',
  },
  contextBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#11100E',
    borderBottomWidth: 1,
    borderBottomColor: '#2E2923',
    paddingVertical: 10,
    paddingHorizontal: 16,
    gap: 8,
  },
  contextText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#8D8D8D',
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
    width: '100%',
  },
  userRow: {
    justifyContent: 'flex-end',
  },
  aiRow: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgBubble: {
    maxWidth: '80%',
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  userBubble: {
    backgroundColor: '#2A2416',
    borderWidth: 1,
    borderColor: '#4A3E25',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderBottomLeftRadius: 4,
  },
  imageBadge: {
    flexDirection: 'column',
    backgroundColor: '#11100E',
    padding: 8,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#4A3E25',
    gap: 6,
    marginBottom: 6,
    overflow: 'hidden',
  },
  chatAttachedImage: {
    width: '100%',
    height: 140,
    borderRadius: 10,
  },
  imageBadgeText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#F2CA50',
  },
  msgText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  msgTime: {
    fontSize: 10,
    fontFamily: 'Urbanist-Regular',
    color: '#787878',
    alignSelf: 'flex-end',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  loader: {
    marginRight: 4,
  },
  typingText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#787878',
  },
  bottomInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#000000',
    gap: 12,
  },
  attachBtn: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  chatInput: {
    flex: 1,
    height: 48,
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    borderRadius: 24,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerActionContainer: {
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#000000',
  },
  closeTicketBtn: {
    width: '100%',
    height: 52,
    backgroundColor: '#EF4444',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeTicketText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  // Modal styles
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
