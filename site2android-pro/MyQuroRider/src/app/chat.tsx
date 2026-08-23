import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '../context/RiderContext';

export default function ChatScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeTrip, chatMessages, sendChatMessage } = useRider();
  const [text, setText] = useState('');
  const scrollViewRef = useRef<ScrollView>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    sendChatMessage(text);
    setText('');
  };

  useEffect(() => {
    // Auto scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 200);
  }, [chatMessages]);

  const handleBack = () => {
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* HEADER BAR */}
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>{activeTrip?.customerName || 'Customer Chat'}</Text>
          <Text style={styles.headerSub}>Order #{activeTrip?.id || '...'}</Text>
        </View>
        <TouchableOpacity
          onPress={() => activeTrip?.customerPhone && router.push(`tel:${activeTrip.customerPhone}`)}
          style={styles.callBtn}
          activeOpacity={0.8}
        >
          <Ionicons name="call-outline" size={20} color="#F2CA50" />
        </TouchableOpacity>
      </View>

      {/* MESSAGES LIST */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatList}
        contentContainerStyle={[styles.chatListContent, { paddingBottom: 24 }]}
        showsVerticalScrollIndicator={false}
      >
        {chatMessages.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons name="chatbubbles-outline" size={48} color="#D4AF37" />
            </View>
            <Text style={styles.emptyTitle}>Live Chat Started</Text>
            <Text style={styles.emptySub}>Send a message to coordinate pickup or delivery details.</Text>
          </View>
        ) : (
          chatMessages.map((msg) => {
            const isMe = msg.sender === 'rider';
            return (
              <View
                key={msg.id || msg.createdAt}
                style={[
                  styles.messageRow,
                  isMe ? styles.messageRowRight : styles.messageRowLeft,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    isMe ? styles.bubbleMe : styles.bubbleOther,
                  ]}
                >
                  <Text style={styles.messageText}>{msg.text}</Text>
                  <Text style={isMe ? styles.timeTextMe : styles.timeTextOther}>
                    {new Date(msg.createdAt).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </Text>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* INPUT ROW */}
      <View style={[styles.inputContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TextInput
          style={styles.input}
          placeholder="Type your message..."
          placeholderTextColor="#787878"
          value={text}
          onChangeText={setText}
          onSubmitEditing={handleSend}
          multiline
        />
        <TouchableOpacity onPress={handleSend} style={styles.sendBtn} activeOpacity={0.85}>
          <Ionicons name="send" size={18} color="#000000" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: '#1A1A1A',
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  headerTitleContainer: {
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
    fontFamily: 'Urbanist-Bold',
  },
  headerSub: {
    color: '#A6A6A6',
    fontSize: 12,
    fontWeight: '600',
    fontFamily: 'Urbanist-SemiBold',
    marginTop: 2,
  },
  callBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#111111',
  },
  chatList: {
    flex: 1,
    paddingHorizontal: 16,
  },
  chatListContent: {
    paddingTop: 16,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 100,
    paddingHorizontal: 32,
  },
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(242, 202, 80, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
    fontFamily: 'Urbanist-Bold',
    marginBottom: 8,
  },
  emptySub: {
    color: '#A6A6A6',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'Urbanist-Regular',
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    width: '100%',
  },
  messageRowLeft: {
    justifyContent: 'flex-start',
  },
  messageRowRight: {
    justifyContent: 'flex-end',
  },
  bubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 16,
    maxWidth: '80%',
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
  },
  bubbleMe: {
    backgroundColor: '#F2CA50',
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: '#1E1E1E',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    color: '#FFFFFF',
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Urbanist-Regular',
  },
  timeTextMe: {
    fontSize: 10,
    color: 'rgba(0, 0, 0, 0.5)',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontFamily: 'Urbanist-Medium',
  },
  timeTextOther: {
    fontSize: 10,
    color: '#787878',
    alignSelf: 'flex-end',
    marginTop: 4,
    fontFamily: 'Urbanist-Medium',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: 1,
    borderColor: '#1A1A1A',
  },
  input: {
    flex: 1,
    backgroundColor: '#111111',
    color: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    maxHeight: 100,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
});
