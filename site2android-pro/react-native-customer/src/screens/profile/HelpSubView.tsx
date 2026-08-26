import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Linking,
  Alert,
  Platform,
  Image,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ChevronRight, ArrowLeft, Phone, Mail, Search, X } from 'lucide-react-native';
import { scale } from './profileUtils';

interface HelpSubViewProps {
  isDarkMode: boolean;
  onBack: () => void;
}

export const HelpSubView: React.FC<HelpSubViewProps> = ({ isDarkMode, onBack }) => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const favQuroImg = require('../../assets/favorite_quro.png');

  const FAQs = [
    { q: 'How can I track my live order?', a: 'You can check your order status directly from the Home screen or by visiting the My Orders tab in your profile dashboard.' },
    { q: 'Can I cancel my order after placing it?', a: 'Orders can only be cancelled within 60 seconds of placement. After that, kitchens begin preparation, and cancellation charges may apply.' },
    { q: 'My payment was deducted, but order failed.', a: 'Do not worry! In such cases, the bank usually reverts the amount within 3-5 business days. You can also write to us for instant verification.' },
    { q: 'What is MyQuro ONE benefits details?', a: 'MyQuro ONE is our premium membership that offers free deliveries, high-tier dining discounts, and fast culinary preparations.' },
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(prev => (prev === index ? null : index));
  };

  const makeCall = () => {
    Linking.openURL('tel:+917061903429').catch(() => {
      Alert.alert('Call Failed', 'Unable to make phone calls from this device.');
    });
  };

  const sendEmail = () => {
    Linking.openURL('mailto:info.myquro@gmail.com?subject=Support%20Request').catch(() => {
      Alert.alert('Email Error', 'Support Email: info.myquro@gmail.com');
    });
  };

  const filteredFAQs = FAQs.filter(
    faq =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.favContainer}>
      {/* Header */}
      <View style={styles.favHeader}>
        <TouchableOpacity onPress={onBack} style={styles.favHeaderBackBtn}>
          <ArrowLeft size={22} color="#eae1d4" />
        </TouchableOpacity>
        <Text style={styles.favHeaderTitle}>help & support</Text>
        <View style={{ width: 34 }} />
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* Branding Row */}
        <View style={styles.favLogoRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
            <Text style={styles.favLogoMy}>My</Text>
            <View style={styles.favQuroCropContainer}>
              <Image source={favQuroImg} style={styles.favQuroCropImage} resizeMode="stretch" />
            </View>
          </View>
        </View>

        {/* Floating Sparkle Decorative Row */}
        <View style={styles.sparkleRow}>
          <Svg width={24} height={24} viewBox="0 0 12.8333 12.8333" fill="none">
            <Path
              d="M10.5 4.66667L9.77083 3.0625L8.16667 2.33333L9.77083 1.60417L10.5 0L11.2292 1.60417L12.8333 2.33333L11.2292 3.0625L10.5 4.66667V4.66667M10.5 12.8333L9.77083 11.2292L8.16667 10.5L9.77083 9.77083L10.5 8.16667L11.2292 9.77083L12.8333 10.5L11.2292 11.2292L10.5 12.8333V12.8333M4.66667 11.0833L3.20833 7.875L0 6.41667L3.20833 4.95833L4.66667 1.75L6.125 4.95833L9.33333 6.41667L6.125 7.875L4.66667 11.0833V11.0833M4.66667 8.25417L5.25 7L6.50417 6.41667L5.25 5.83333L4.66667 4.57917L4.08333 5.83333L2.82917 6.41667L4.08333 7L4.66667 8.25417V8.25417M4.66667 6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667V6.41667"
              fill="#D4AF37"
              fillOpacity={0.8}
            />
          </Svg>
          <Text style={styles.sparkleTagline}>How can we assist you today?</Text>
        </View>

        {/* Real-time Search FAQ Input Bar */}
        <View style={styles.searchBarContainer}>
          <View style={styles.searchInputBox}>
            <Search size={18} color="#deb853" style={{ marginRight: 10 }} />
            <TextInput
              placeholder="Search help topics or FAQs..."
              placeholderTextColor="#9d9d9d"
              value={searchQuery}
              onChangeText={setSearchQuery}
              style={styles.searchInputField}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X size={16} color="#eae1d4" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Connect Actions Cards */}
        <Text style={styles.sectionHeading}>QUICK CONNECT</Text>
        <View style={styles.supportCardsRow}>
          <TouchableOpacity style={styles.supportCardBtn} onPress={makeCall} activeOpacity={0.85}>
            <View style={styles.supportCardIconCircle}>
              <Phone size={20} color="#f2ca50" />
            </View>
            <Text style={styles.supportCardTitle}>Call Helpdesk</Text>
            <Text style={styles.supportCardDesc}>Speak to our support representatives</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.supportCardBtn, styles.supportCardBtnDark]} onPress={sendEmail} activeOpacity={0.85}>
            <View style={[styles.supportCardIconCircle, styles.supportCardIconCircleDark]}>
              <Mail size={20} color="#eae1d4" />
            </View>
            <Text style={[styles.supportCardTitle, styles.textWhite]}>Write Email</Text>
            <Text style={styles.supportCardDesc}>Get responses directly to your inbox</Text>
          </TouchableOpacity>
        </View>

        {/* FAQ Section */}
        <Text style={styles.sectionHeading}>FREQUENTLY ASKED QUESTIONS</Text>
        <View style={styles.faqCardsContainer}>
          {filteredFAQs.length === 0 ? (
            <View style={styles.emptyResultsBox}>
              <Text style={styles.emptyResultsText}>No FAQs match your search query</Text>
            </View>
          ) : (
            filteredFAQs.map((faq, index) => {
              const isOpen = expandedFaq === index;
              return (
                <View key={index} style={styles.faqPremiumCard}>
                  <TouchableOpacity
                    style={styles.faqQuestionRow}
                    onPress={() => toggleFaq(index)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.faqQuestion}>{faq.q}</Text>
                    <ChevronRight
                      size={18}
                      color="#deb853"
                      style={{ transform: [{ rotate: isOpen ? '90deg' : '0deg' }] }}
                    />
                  </TouchableOpacity>
                  {isOpen && (
                    <View style={styles.faqAnswerContainer}>
                      <View style={styles.faqAnswerDivider} />
                      <Text style={styles.faqAnswer}>{faq.a}</Text>
                    </View>
                  )}
                </View>
              );
            })
          )}
        </View>

        {/* Premium Calligraphy Footer */}
        <View style={styles.favPremiumFooter}>
          <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
            <Text style={styles.favPremiumFooterSignature}>Live it</Text>
            <Text style={[styles.favPremiumFooterSignature, styles.favPremiumFooterUp, { fontSize: 58, marginLeft: -8 * scale }]}> up!</Text>
          </View>
          <Text style={styles.favPremiumFooterSubtitle}>
            Crafted with 💛 in{"\n"}Jharkhand, India
          </Text>
        </View>
      </ScrollView>
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
  favHeaderTitle: {
    fontSize: 20,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    textAlign: 'center',
  },
  favLogoRow: {
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 10,
  },
  favLogoMy: {
    fontSize: 50,
    color: '#deb853',
    fontFamily: 'Fasthand-Regular',
    letterSpacing: -1.5,
    height: 60,
    lineHeight: 70,
  },
  favQuroCropContainer: {
    width: 107,
    height: 60,
    overflow: 'hidden',
    marginLeft: 0,
  },
  favQuroCropImage: {
    width: 167,
    height: 90,
    marginLeft: -65,
    bottom: 20,
  },
  sparkleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 12,
  },
  sparkleTagline: {
    fontSize: 14 * scale,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Medium',
  },
  searchBarContainer: {
    paddingHorizontal: 22,
    marginVertical: 16,
  },
  searchInputBox: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    borderRadius: 20,
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchInputField: {
    flex: 1,
    fontSize: 15,
    color: '#ffffff',
    fontFamily: 'Urbanist-Regular',
  },
  sectionHeading: {
    fontSize: 12,
    fontWeight: '800',
    color: '#8a8a8a',
    letterSpacing: 1.2,
    marginBottom: 12,
    marginLeft: 24,
    marginTop: 20,
  },
  supportCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 22,
    gap: 14,
    marginBottom: 10,
  },
  supportCardBtn: {
    flex: 1,
    backgroundColor: 'rgba(242, 202, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    borderRadius: 20,
    padding: 16,
    alignItems: 'flex-start',
  },
  supportCardBtnDark: {
    backgroundColor: '#111',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  supportCardIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  supportCardIconCircleDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  supportCardTitle: {
    fontSize: 15 * scale,
    fontFamily: 'Urbanist-Bold',
    color: '#f2ca50',
    marginBottom: 4,
  },
  supportCardDesc: {
    fontSize: 11 * scale,
    fontFamily: 'Urbanist-Regular',
    color: '#8a8a8a',
    lineHeight: 15,
  },
  faqCardsContainer: {
    paddingHorizontal: 22,
    gap: 12,
  },
  faqPremiumCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    borderRadius: 18,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  faqQuestion: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 12,
  },
  faqAnswerContainer: {
    paddingHorizontal: 18,
    paddingBottom: 18,
  },
  faqAnswerDivider: {
    height: 1,
    backgroundColor: 'rgba(242, 202, 80, 0.1)',
    marginBottom: 12,
  },
  faqAnswer: {
    fontSize: 14,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 20,
  },
  emptyResultsBox: {
    alignItems: 'center',
    paddingVertical: 32,
  },
  emptyResultsText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    color: '#8a8a8a',
  },
  favPremiumFooter: {
    alignItems: 'flex-start',
    paddingHorizontal: 24,
    paddingVertical: 24,
    marginTop: 20,
    marginBottom: 40,
  },
  favPremiumFooterSignature: {
    fontSize: 50,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: -0.22,
    lineHeight: 65,
    paddingTop: 10,
  },
  favPremiumFooterUp: {
    fontFamily: 'Fasthand-Regular',
    color: '#f2ca50',
  },
  favPremiumFooterSubtitle: {
    fontSize: 18,
    color: '#d0c5af',
    fontFamily: 'Urbanist-SemiBold',
    textAlign: 'left',
    lineHeight: 22,
    letterSpacing: 0.6,
    marginTop: 8,
  },
  textWhite: {
    color: '#ffffff',
  },
});
