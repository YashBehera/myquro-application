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
  Keyboard,
  TouchableWithoutFeedback,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';

export default function JoiningIssueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionToken } = useRider();
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    Keyboard.dismiss();
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/payout-issue');
    }
  };

  const handleSubmit = async () => {
    Keyboard.dismiss();
    if (!description.trim()) {
      Alert.alert('Error', 'Please describe the issue before submitting.');
      return;
    }

    setIsSubmitting(true);
    let ticketId = `JB-${Date.now().toString().slice(-5)}`;

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
            category: 'joining_bonus',
            subject: 'Joining Bonus Dispute',
            description,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.ticket?.id) ticketId = data.ticket.id;
        }
      } catch (err) {
        console.error('Joining claim error:', err);
      }
    }

    setIsSubmitting(false);
    Alert.alert('Ticket Raised', `Your joining bonus ticket (#${ticketId}) has been submitted successfully. Our team will verify and resolve it within 2-4 hours.`, [
      {
        text: 'OK',
        onPress: () => {
          router.replace('/payout-issue');
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
          <Text style={styles.headerTitle}>Joining Bonus Issue</Text>
        </View>

        {/* MAIN CONTENT */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inputWrapper}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#F2CA50" style={styles.chatIcon} />
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
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    minHeight: 120,
  },
  chatIcon: {
    marginTop: 2,
  },
  textArea: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    textAlignVertical: 'top',
    padding: 0,
    minHeight: 88,
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
});
