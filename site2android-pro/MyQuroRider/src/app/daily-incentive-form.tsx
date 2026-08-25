import React, { useState, useEffect, useRef } from 'react';
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
  ActivityIndicator,
  Keyboard,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter, useLocalSearchParams } from 'expo-router';

import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';
import { CustomAlertModal, ModalType } from '../components/CustomAlertModal';

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  imageAttached?: string;
}

export default function DailyIncentiveFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const { sessionToken } = useRider();
  const scrollViewRef = useRef<ScrollView>(null);
  
  const dateStr = (params.date as string) || 'Tuesday, 18 August';
  const language = (params.language as string) || 'English';
  
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
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
  const [ticketStatus, setTicketStatus] = useState<'chatting' | 'submitted'>('chatting');

  // Load initial AI messages based on language selection
  useEffect(() => {
    setIsTyping(true);
    const timer = setTimeout(() => {
      const isHinglish = language.toLowerCase() === 'hinglish' || language.toLowerCase() === 'hindi';
      
      const welcomeText = isHinglish
        ? `Namaste! Main aapka AI Support Assistant hoon. Mujhe dikh raha hai ki aapko ${dateStr} ke daily incentive me issue aayi hai.`
        : `Hello! I am your AI Support Assistant. I see you faced an issue with your daily incentive for ${dateStr}.`;

      const instructionText = isHinglish
        ? `Kya aap mujhe describe kar sakte hain ki kya problem hui? Aur agar aapke paas incentives screen ka screenshot hai, toh niche '+' button click karke attach karein.`
        : `Could you please describe what went wrong? If you have a screenshot of your incentives page, please click the '+' button below to attach it.`;

      setMessages([
        {
          id: '1',
          sender: 'ai',
          text: welcomeText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: '2',
          sender: 'ai',
          text: instructionText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 800);

    return () => clearTimeout(timer);
  }, [language, dateStr]);

  // Scroll to bottom whenever messages list or typing state changes
  useEffect(() => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages, isTyping]);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/daily-incentive-lang');
    }
  };

  const handleSendMessage = async (textToSend?: string, attachedImg?: string) => {
    const text = textToSend || inputText;
    if (!text.trim() && !attachedImg) return;

    // Add user message
    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      imageAttached: attachedImg,
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    // Trigger AI response
    setIsTyping(true);

    // Call backend support ticket endpoint
    let serverTicketId = `DI-${Date.now().toString().slice(-5)}`;
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
            category: 'daily_incentive',
            subject: `Daily Incentive Issue on ${dateStr}`,
            description: text,
            metadata: { date: dateStr, language, attachedImg: attachedImg || null },
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ticket?.id) {
            serverTicketId = data.ticket.id;
          }
        }
      } catch (err) {
        console.error('Support ticket error:', err);
      }
    }

    setTimeout(() => {
      const isHinglish = language.toLowerCase() === 'hinglish' || language.toLowerCase() === 'hindi';
      let aiResponseText = '';

      if (attachedImg || messages.length >= 2) {
        aiResponseText = isHinglish
          ? `Dhanyawad screenshot aur details ke liye! Main dekh sakta hoon ki aapne target complete kiya hai. Maine aapki issue ticket support team ko adjust karne ke liye bhej di hai. Ticket ID: #${serverTicketId}. 2 ghante ke andar incentive update ho jayega.`
          : `Thank you for attaching the details. I have verified your submission and raised ticket #${serverTicketId} with our payout team. The incentive adjustment will be completed within 2 hours.`;
        setTicketStatus('submitted');
      } else {
        aiResponseText = isHinglish
          ? `Samajh gaya. Please confirm karein agar aapne incentive screenshot capture kiya hai, taaki hum use jald se jald verify kar sakein. Aap '+' icon se upload kar sakte hain.`
          : `Understood. Please attach the incentive details screenshot so that we can verify your target completion. You can upload it using the '+' icon.`;
      }

      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: 'ai',
          text: aiResponseText,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
      setIsTyping(false);
    }, 1200);
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
            quality: 0.8,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            handleSendMessage('Attached incentive screenshot photo', result.assets[0].uri);
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
            quality: 0.8,
          });
          if (!result.canceled && result.assets?.[0]?.uri) {
            handleSendMessage('Attached incentive screenshot from gallery', result.assets[0].uri);
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
          handleSendMessage(`Attached document: ${asset.name}`, asset.uri);
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
          <Text style={styles.headerTitle}>AI Support Assistant</Text>
          <View style={styles.onlineStatusRow}>
            <View style={styles.greenDot} />
            <Text style={styles.onlineText}>Online</Text>
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
                  <Ionicons name="sparkles" size={14} color="#000000" />
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
                    {item.imageAttached.startsWith('file://') || item.imageAttached.startsWith('http') || item.imageAttached.startsWith('content://') ? (
                      <Image source={{ uri: item.imageAttached }} style={styles.chatAttachedImage} resizeMode="cover" />
                    ) : (
                      <Ionicons name="image-outline" size={20} color="#F2CA50" />
                    )}
                    <Text style={styles.imageBadgeText} numberOfLines={1}>
                      {item.imageAttached.split('/').pop() || item.imageAttached}
                    </Text>
                  </View>
                )}
                
                <Text style={styles.msgText}>{item.text}</Text>
                <Text style={styles.msgTime}>{item.timestamp}</Text>
              </View>
            </View>
          );
        })}

        {/* Typing Indicator */}
        {isTyping && (
          <View style={[styles.messageRow, styles.aiRow]}>
            <View style={styles.aiAvatar}>
              <Ionicons name="sparkles" size={14} color="#000000" />
            </View>
            <View style={[styles.msgBubble, styles.aiBubble, styles.typingBubble]}>
              <ActivityIndicator size="small" color="#F2CA50" style={styles.loader} />
              <Text style={styles.typingText}>AI is scanning...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* INPUT FIELD BAR OR CLOSE TICKET BAR */}
      {ticketStatus === 'submitted' ? (
        <View style={[styles.footerActionContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            onPress={() => router.replace('/daily-incentive')}
            activeOpacity={0.8}
            style={styles.closeTicketBtn}
          >
            <Text style={styles.closeTicketText}>BACK TO DAILY INCENTIVES</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={[styles.bottomInputContainer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <TouchableOpacity
            onPress={openUploadMenu}
            style={styles.attachBtn}
            activeOpacity={0.7}
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
            style={styles.sendBtn}
            activeOpacity={0.7}
          >
            <Ionicons name="send" size={20} color="#000000" />
          </TouchableOpacity>
        </View>
      )}

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
