import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  TextInput,
  Alert,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

interface IssueCategory {
  id: string;
  title: string;
  icon: keyof typeof Ionicons.glyphMap;
  description: string;
  faqs: { q: string; a: string }[];
}

export default function HelpSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [selectedIssue, setSelectedIssue] = useState<IssueCategory | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more' as any);
    }
  };

  const issuesList: IssueCategory[] = [
    {
      id: '1',
      title: 'Order & Kitchen Issues',
      icon: 'receipt-outline',
      description: 'Delayed delivery partner pickup, customer cancellations, or order disputes.',
      faqs: [
        { q: 'Delivery partner has not arrived yet?', a: 'If rider is delayed past 10 minutes from ready time, tap "Reassign Delivery Partner" in Live Orders.' },
        { q: 'Customer requested order modification after acceptance?', a: 'Use the live order chat to agree on changes or reject the order if items are unavailable.' },
      ],
    },
    {
      id: '2',
      title: 'Payouts & Settlement Issues',
      icon: 'wallet-outline',
      description: 'Daily payouts, bank account update, and commission calculations.',
      faqs: [
        { q: 'When are daily payouts settled?', a: 'Daily earnings are processed every morning at 6:00 AM directly to your registered bank account.' },
        { q: 'How to change registered bank account?', a: 'Go to More > Documents & Bank Details and submit your updated bank passbook/cheque.' },
      ],
    },
    {
      id: '3',
      title: 'Menu & Item Availability',
      icon: 'restaurant-outline',
      description: 'Dish out-of-stock toggles, price updates, and category reordering.',
      faqs: [
        { q: 'How to mark an item out of stock instantly?', a: 'Go to Menu tab, locate the item, and switch off the toggle. It updates in real time on the customer app.' },
        { q: 'How long does a price change take to reflect?', a: 'Price updates reflect within 60 seconds on the customer app upon saving.' },
      ],
    },
    {
      id: '4',
      title: 'Outlet Timings & Temporary Closure',
      icon: 'time-outline',
      description: 'Holiday mode, rainy surge prep time, and slot timing changes.',
      faqs: [
        { q: 'How to turn on Holiday / Maintenance Mode?', a: 'Toggle the Online switch on the Home screen to Offline to pause incoming orders.' },
        { q: 'How to increase prep time during rush hours?', a: 'Go to App Settings > Kitchen Prep Buffer and add +10 mins during high rush.' },
      ],
    },
    {
      id: '5',
      title: 'Customer Complaints & Disputes',
      icon: 'alert-circle-outline',
      description: 'Spillages, missing items dispute, and refund review requests.',
      faqs: [
        { q: 'How to dispute a false customer complaint?', a: 'Open Complaints > tap on the complaint > tap "Dispute / Escalate to Quro Partner Support".' },
      ],
    },
    {
      id: '6',
      title: 'Thermal POS & Bill Printer Setup',
      icon: 'print-outline',
      description: 'Bluetooth printer connection, auto-print KOTs, and format settings.',
      faqs: [
        { q: 'Printer disconnecting frequently?', a: 'Ensure Bluetooth permissions are granted and printer battery is above 20%.' },
      ],
    },
    {
      id: '7',
      title: 'Ratings & Review Moderation',
      icon: 'star-outline',
      description: 'Appeal unfair negative reviews or reply to customer feedback.',
      faqs: [
        { q: 'How to report abusive or fake reviews?', a: 'Go to Ratings > tap the review > tap "Report Review" for manual moderation by Quro team.' },
      ],
    },
    {
      id: '8',
      title: 'Tax & GST Invoicing',
      icon: 'document-text-outline',
      description: 'Monthly GST invoices, TDS certificates, and financial statements.',
      faqs: [
        { q: 'Where to download monthly GST invoice?', a: 'Invoices are available under More > Financial Reports on the 1st of every month.' },
      ],
    },
  ];

  const filteredIssues = searchQuery.trim() === ''
    ? issuesList
    : issuesList.filter(
        (item) =>
          item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );

  const handleCallSupport = () => {
    Linking.openURL('tel:18001087876').catch(() => {
      Alert.alert('Helpline', 'Call 24/7 Restaurant Partner Support at 1800-108-7876');
    });
  };

  const handleSubmitTicket = () => {
    if (!ticketMessage.trim()) {
      Alert.alert('Required', 'Please describe your issue so our support team can assist you.');
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Ticket Raised! 🎉',
        `Your priority support ticket for "${selectedIssue?.title}" has been registered. An executive will call you within 15 minutes.`,
        [{ text: 'Done', onPress: () => { setSelectedIssue(null); setTicketMessage(''); } }]
      );
    }, 800);
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#E8C547" />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleCallSupport}
          style={styles.callSupportPill}
          activeOpacity={0.8}
        >
          <Ionicons name="call" size={14} color="#0B0B0B" style={{ marginRight: 6 }} />
          <Text style={styles.callSupportText}>24/7 Helpline</Text>
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
      >
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <Text style={styles.welcomeSubtitle}>Welcome to the</Text>
          <Text style={styles.heroTitleText}>
            Restaurant Partner <Text style={styles.heroTitleGold}>Help Center</Text>
          </Text>

          {/* Underline Gold Arc Line */}
          <View style={styles.goldArcLine} />

          {/* 3D Support Agent Mascot Graphic */}
          <View style={styles.agentCircleWrapper}>
            <View style={styles.agentOuterCircle}>
              <Image
                source={require('../../assets/images/3d_support_agent_namaste.png')}
                style={styles.agentImage}
                resizeMode="cover"
              />
            </View>

            {/* Sparkles */}
            <Ionicons name="sparkles" size={16} color="#E8C547" style={styles.sparkleLeft} />
            <Ionicons name="sparkles" size={14} color="#E8C547" style={styles.sparkleRight} />
          </View>

          <Text style={styles.needHelpText}>Need any help with your outlet?</Text>
          <Text style={styles.myQuroText}>My Quro Partner Support is here for you 24/7.</Text>
        </View>

        {/* SEARCH BOX */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#E8C547" style={{ marginRight: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search issues (e.g. payout, printer, delayed rider)..."
            placeholderTextColor="#8E8E8E"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <Ionicons name="close-circle" size={18} color="#8E8E8E" />
            </TouchableOpacity>
          )}
        </View>

        {/* RAISE A NEW ISSUE SECTION */}
        <Text style={styles.sectionHeaderTitle}>Raise a New Issue</Text>

        <View style={styles.issuesCardContainer}>
          {filteredIssues.map((item, index) => {
            const isLast = index === filteredIssues.length - 1;

            return (
              <View key={item.id}>
                <TouchableOpacity
                  onPress={() => setSelectedIssue(item)}
                  style={styles.issueRow}
                  activeOpacity={0.8}
                >
                  <View style={styles.issueLeftGroup}>
                    {/* Circle Icon Box */}
                    <View style={styles.iconCircleBox}>
                      <Ionicons name={item.icon} size={20} color="#E8C547" />
                    </View>

                    <View style={styles.issueTextCol}>
                      <Text style={styles.issueTitleText}>{item.title}</Text>
                      <Text style={styles.issueDescText} numberOfLines={1}>
                        {item.description}
                      </Text>
                    </View>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#E8C547" />
                </TouchableOpacity>

                {!isLast && <View style={styles.dottedDivider} />}
              </View>
            );
          })}
        </View>

        {/* DIRECT CALL HELPLINE BANNER */}
        <TouchableOpacity
          onPress={handleCallSupport}
          style={styles.callBannerCard}
          activeOpacity={0.85}
        >
          <View style={styles.callBannerLeft}>
            <View style={styles.callBannerIconBox}>
              <Ionicons name="headset" size={24} color="#E8C547" />
            </View>
            <View>
              <Text style={styles.callBannerTitle}>Emergency Kitchen Support</Text>
              <Text style={styles.callBannerSubtitle}>Toll Free 1800-108-7876 • Instant Call Connect</Text>
            </View>
          </View>
          <Ionicons name="call-outline" size={20} color="#E8C547" />
        </TouchableOpacity>
      </ScrollView>

      {/* ISSUE DETAILS & TICKET MODAL */}
      {selectedIssue && (
        <Modal
          visible={selectedIssue !== null}
          transparent
          animationType="slide"
          onRequestClose={() => setSelectedIssue(null)}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) + 16 }]}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleRow}>
                  <Ionicons name={selectedIssue.icon} size={22} color="#E8C547" style={{ marginRight: 10 }} />
                  <Text style={styles.modalTitle}>{selectedIssue.title}</Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedIssue(null)}>
                  <Ionicons name="close" size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* FAQs */}
                <Text style={styles.faqSectionHeading}>Frequently Asked Solutions</Text>
                {selectedIssue.faqs.map((faq, idx) => (
                  <View key={idx} style={styles.faqItemBox}>
                    <Text style={styles.faqQuestion}>Q: {faq.q}</Text>
                    <Text style={styles.faqAnswer}>{faq.a}</Text>
                  </View>
                ))}

                {/* Ticket Form */}
                <Text style={styles.ticketSectionHeading}>Still need help? Raise a ticket</Text>
                <TextInput
                  style={styles.ticketInput}
                  placeholder="Describe your issue with order number or outlet details..."
                  placeholderTextColor="#8E8E8E"
                  multiline
                  numberOfLines={4}
                  value={ticketMessage}
                  onChangeText={setTicketMessage}
                />

                <TouchableOpacity
                  style={[styles.submitTicketBtn, isSubmitting && { opacity: 0.6 }]}
                  activeOpacity={0.8}
                  onPress={handleSubmitTicket}
                  disabled={isSubmitting}
                >
                  <Text style={styles.submitTicketBtnText}>
                    {isSubmitting ? 'Submitting...' : 'Submit Support Ticket'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  callSupportPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8C547',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  callSupportText: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#0B0B0B',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 20,
    paddingTop: 16,
  },
  welcomeSubtitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    marginBottom: 4,
  },
  heroTitleText: {
    fontSize: 23,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroTitleGold: {
    color: '#E8C547',
  },
  goldArcLine: {
    width: 200,
    height: 2,
    backgroundColor: '#E8C547',
    marginTop: 6,
    marginBottom: 16,
    borderRadius: 1,
  },
  agentCircleWrapper: {
    position: 'relative',
    marginBottom: 14,
  },
  agentOuterCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 2,
    borderColor: '#E8C547',
    backgroundColor: '#191919',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agentImage: {
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  sparkleLeft: {
    position: 'absolute',
    top: 8,
    left: -10,
  },
  sparkleRight: {
    position: 'absolute',
    top: 40,
    right: -12,
  },
  needHelpText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  myQuroText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    textAlign: 'center',
    marginTop: 2,
  },

  /* Search Input */
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
  },

  sectionHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  issuesCardContainer: {
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 4,
    marginBottom: 18,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
  },
  issueLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  iconCircleBox: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  issueTextCol: {
    flex: 1,
  },
  issueTitleText: {
    fontSize: 14.5,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  issueDescText: {
    fontSize: 11.5,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    marginTop: 2,
  },
  dottedDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
  },

  /* Call Helpline Banner */
  callBannerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E8C547',
    padding: 14,
    marginBottom: 20,
  },
  callBannerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  callBannerIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(232, 197, 71, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  callBannerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  callBannerSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11,
    color: '#E8C547',
    marginTop: 2,
  },

  /* Modal Styles */
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(11, 11, 11, 0.85)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#191919',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderColor: '#2A2A2A',
  },
  modalTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  modalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  faqSectionHeading: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#E8C547',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  faqItemBox: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    marginBottom: 10,
  },
  faqQuestion: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  faqAnswer: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    lineHeight: 17,
  },
  ticketSectionHeading: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#E8C547',
    marginTop: 16,
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  ticketInput: {
    backgroundColor: '#141414',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    padding: 12,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    textAlignVertical: 'top',
    height: 90,
    marginBottom: 16,
  },
  submitTicketBtn: {
    backgroundColor: '#E8C547',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 20,
  },
  submitTicketBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
    color: '#0B0B0B',
  },
});
