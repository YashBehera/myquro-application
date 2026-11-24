import React, { useState, useEffect } from 'react';
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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import {
  ChevronRight,
  ArrowLeft,
  Phone,
  Mail,
  Search,
  X,
  AlertCircle,
  CheckCircle2,
  Clock,
  MessageSquare,
  Send,
  PlusCircle,
  FileText,
  RotateCcw,
  ShieldAlert,
} from 'lucide-react-native';
import { scale } from './profileUtils';
import { getSafeTopPadding, getSafeBottomPadding } from '../../utils/responsive';
import { BACKEND_URL } from '../../config';

interface HelpSubViewProps {
  isDarkMode: boolean;
  initialOrder?: any;
  pastOrders?: any[];
  customerProfile?: {
    id?: string;
    name?: string;
    phone?: string;
    avatar?: string;
  };
  onBack: () => void;
}

type TabType = 'complaints' | 'faq';

const CATEGORIES = [
  { key: 'FOOD_QUALITY', label: 'Food Quality / Cold Food', icon: '🍲' },
  { key: 'ORDER_PACKAGING', label: 'Missing Item / Spill', icon: '📦' },
  { key: 'OTHER', label: 'Delayed Delivery / Rider', icon: '⏱️' },
  { key: 'RESTAURANT_OUTLET', label: 'Wrong Dish / Mistake', icon: '🍽️' },
];

const PRESET_REASONS: Record<string, string[]> = {
  FOOD_QUALITY: [
    'Food was completely cold on arrival',
    'Food was undercooked or raw',
    'Food taste or freshness was substandard',
    'Burnt items received',
  ],
  ORDER_PACKAGING: [
    'Items missing from package',
    'Curry/liquid gravy spilled or container broken',
    'Package seal was broken upon delivery',
    'Cutlery or condiments missing',
  ],
  OTHER: [
    'Delivery was more than 30 mins delayed',
    'Rider was unprofessional or rude',
    'Marked delivered but did not receive yet',
    'Rider asked for extra cash',
  ],
  RESTAURANT_OUTLET: [
    'Received completely wrong dish',
    'Non-veg item delivered instead of Veg',
    'Special cooking instructions ignored',
    'Portion size significantly smaller than described',
  ],
};

const FAQS = [
  {
    q: 'How long does a complaint resolution take?',
    a: 'Restaurant managers review and respond to complaints within 15–30 minutes. If a refund is approved, it is credited back to your original payment method instantly or within 24 hours.',
  },
  {
    q: 'Can I cancel my order after placement?',
    a: 'Orders can only be cancelled within 60 seconds of placement. After that, kitchens begin food preparation and ingredients are committed.',
  },
  {
    q: 'My payment was deducted, but order failed.',
    a: 'In rare banking gateway drops, your bank holds the amount and automatically reverses it within 3-5 business days. You can also write to our team with your transaction reference.',
  },
  {
    q: 'What is MyQURO membership benefits details?',
    a: 'MyQURO is our VIP membership offering unlimited free delivery, fast-track kitchen preparation, and exclusive dining discounts at elite outlets.',
  },
];

export const HelpSubView: React.FC<HelpSubViewProps> = ({
  isDarkMode,
  initialOrder,
  pastOrders = [],
  customerProfile,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const favQuroImg = require('../../assets/favorite_quro.png');

  const [activeTab, setActiveTab] = useState<TabType>(initialOrder ? 'complaints' : 'complaints');
  const [selectedOrder, setSelectedOrder] = useState<any>(initialOrder || (pastOrders.length > 0 ? pastOrders[0] : null));
  const [showOrderPicker, setShowOrderPicker] = useState(false);

  // Complaint Form State
  const [category, setCategory] = useState<string>('FOOD_QUALITY');
  const [reason, setReason] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [relatedItem, setRelatedItem] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState<string | null>(null);

  // Customer's Existing Complaints
  const [myComplaints, setMyComplaints] = useState<any[]>([]);
  const [isLoadingComplaints, setIsLoadingComplaints] = useState(false);
  const [expandedComplaintId, setExpandedComplaintId] = useState<string | null>(null);
  const [replyTextMap, setReplyTextMap] = useState<Record<string, string>>({});
  const [isSendingReply, setIsSendingReply] = useState(false);

  // FAQ State
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Fetch complaints on mount
  useEffect(() => {
    fetchCustomerComplaints();
  }, [customerProfile?.id]);

  const fetchCustomerComplaints = async () => {
    const custId = customerProfile?.id;
    if (!custId) return;
    setIsLoadingComplaints(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/complaints/customer/${custId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.complaints && Array.isArray(data.complaints)) {
          setMyComplaints(data.complaints);
        }
      }
    } catch (err) {
      console.warn('[HelpSubView] Error fetching customer complaints:', err);
    } finally {
      setIsLoadingComplaints(false);
    }
  };

  const handleSubmitComplaint = async () => {
    if (!reason.trim()) {
      Alert.alert('Reason Required', 'Please select or enter the primary issue reason.');
      return;
    }
    if (!description.trim()) {
      Alert.alert('Description Required', 'Please describe what went wrong so the kitchen can resolve it.');
      return;
    }

    setIsSubmitting(true);
    try {
      const body = {
        ticketType: 'order_complaint',
        orderId: selectedOrder?.id || selectedOrder?.orderId || null,
        orderNumber: selectedOrder?.orderNumber || (selectedOrder?.id ? `#${selectedOrder.id.slice(-5).toUpperCase()}` : null),
        customerId: customerProfile?.id || 'CUST',
        customerName: customerProfile?.name || 'Customer',
        customerPhone: customerProfile?.phone || null,
        customerAvatar: customerProfile?.avatar || null,
        outletId: selectedOrder?.restaurantId || selectedOrder?.outletId || null,
        outletName: selectedOrder?.restaurantName || selectedOrder?.outletName || 'MyQuro Outlet',
        orderAmount: selectedOrder?.grandTotal || selectedOrder?.totalAmount || 0,
        category,
        categoryLabel: CATEGORIES.find((c) => c.key === category)?.label || category,
        reason: reason.trim(),
        description: description.trim(),
        relatedItem: relatedItem.trim() || undefined,
        initialMessage: description.trim(),
      };

      const res = await fetch(`${BACKEND_URL}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (res.ok && data.complaint) {
        setSubmissionSuccess(data.complaint.id);
        setDescription('');
        setReason('');
        setRelatedItem('');
        fetchCustomerComplaints();
      } else {
        Alert.alert('Error', data.error || 'Failed to submit complaint. Please try again.');
      }
    } catch (err) {
      console.error('[HelpSubView] Error creating complaint:', err);
      Alert.alert('Connection Error', 'Could not reach support server. Please check your network.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (complaintId: string) => {
    const text = replyTextMap[complaintId]?.trim();
    if (!text) return;

    setIsSendingReply(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/complaints/${complaintId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: customerProfile?.id || 'CUST',
          senderName: customerProfile?.name || 'Customer',
          senderType: 'CUSTOMER',
          message: text,
        }),
      });

      if (res.ok) {
        setReplyTextMap((prev) => ({ ...prev, [complaintId]: '' }));
        fetchCustomerComplaints();
      } else {
        Alert.alert('Error', 'Failed to send message.');
      }
    } catch (err) {
      console.error('Error replying to complaint:', err);
    } finally {
      setIsSendingReply(false);
    }
  };

  const handleAcceptResolution = async (complaintId: string) => {
    try {
      const res = await fetch(`${BACKEND_URL}/api/complaints/${complaintId}/accept-resolution`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback: 'Customer accepted proposed resolution.',
          user: customerProfile?.name || 'Customer',
        }),
      });
      if (res.ok) {
        Alert.alert('Resolution Accepted 🎉', 'Thank you! The resolution has been applied to your account.');
        fetchCustomerComplaints();
      }
    } catch (err) {
      Alert.alert('Error', 'Could not accept resolution.');
    }
  };

  const handleRejectResolution = async (complaintId: string) => {
    Alert.prompt
      ? Alert.prompt(
          'Request Review',
          'Please state what further assistance you require:',
          async (text) => {
            if (text) {
              await fetch(`${BACKEND_URL}/api/complaints/${complaintId}/reject-resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reason: text,
                  user: customerProfile?.name || 'Customer',
                }),
              });
              fetchCustomerComplaints();
            }
          }
        )
      : Alert.alert('Request Review', 'Would you like to escalate this complaint to Central Support?', [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Escalate',
            onPress: async () => {
              await fetch(`${BACKEND_URL}/api/complaints/${complaintId}/reject-resolution`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  reason: 'Customer requested senior review.',
                  user: customerProfile?.name || 'Customer',
                }),
              });
              fetchCustomerComplaints();
            },
          },
        ]);
  };

  const makeCall = () => {
    Linking.openURL('tel:+917061903429').catch(() => {
      Alert.alert('Call Failed', 'Unable to initiate call.');
    });
  };

  const sendEmail = () => {
    Linking.openURL('mailto:info.myquro@gmail.com?subject=MyQuro%20Customer%20Support').catch(() => {
      Alert.alert('Email Error', 'Support Email: info.myquro@gmail.com');
    });
  };

  const filteredFAQs = FAQS.filter(
    (faq) =>
      faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'OPEN':
        return { label: 'Open', color: '#EF4444', bg: 'rgba(239, 68, 68, 0.15)' };
      case 'IN_PROGRESS':
        return { label: 'In Progress', color: '#38BDF8', bg: 'rgba(56, 189, 248, 0.15)' };
      case 'AWAITING_CUSTOMER':
        return { label: 'Resolution Ready', color: '#F2CA50', bg: 'rgba(242, 202, 80, 0.18)' };
      case 'RESOLVED':
        return { label: 'Resolved', color: '#10B981', bg: 'rgba(16, 185, 129, 0.15)' };
      case 'ESCALATED':
        return { label: 'Under Review', color: '#F97316', bg: 'rgba(249, 115, 22, 0.15)' };
      default:
        return { label: status, color: '#D4AF37', bg: 'rgba(212, 175, 55, 0.15)' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: getSafeTopPadding(insets.top, 8) }]}>
        <TouchableOpacity onPress={onBack} style={styles.headerBackBtn} activeOpacity={0.8}>
          <ArrowLeft size={22} color="#EAE1D4" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Help & Complaints</Text>
        <TouchableOpacity onPress={fetchCustomerComplaints} style={styles.headerBackBtn} activeOpacity={0.8}>
          <RotateCcw size={18} color="#F2CA50" />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'complaints' && styles.tabItemActive]}
          onPress={() => setActiveTab('complaints')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'complaints' && styles.tabTextActive]}>
            Order Complaints {myComplaints.length > 0 ? `(${myComplaints.length})` : ''}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'faq' && styles.tabItemActive]}
          onPress={() => setActiveTab('faq')}
          activeOpacity={0.8}
        >
          <Text style={[styles.tabText, activeTab === 'faq' && styles.tabTextActive]}>
            FAQs & Helpdesk
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={{ flex: 1 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: getSafeBottomPadding(insets.bottom, 40) }}
      >
        {activeTab === 'complaints' ? (
          <View style={styles.contentWrap}>
            {/* SUCCESS BANNER */}
            {submissionSuccess && (
              <View style={styles.successBanner}>
                <CheckCircle2 size={22} color="#10B981" />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.successTitle}>Complaint Registered #{submissionSuccess}</Text>
                  <Text style={styles.successSubtitle}>
                    The restaurant manager has been notified and will resolve your issue within 15–30 mins.
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSubmissionSuccess(null)}>
                  <X size={18} color="#8A8A8A" />
                </TouchableOpacity>
              </View>
            )}

            {/* MY ACTIVE COMPLAINTS SECTION */}
            {myComplaints.length > 0 && (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>MY RAISED TICKETS</Text>
                {isLoadingComplaints ? (
                  <ActivityIndicator size="small" color="#F2CA50" style={{ marginVertical: 12 }} />
                ) : (
                  myComplaints.map((item) => {
                    const badge = getStatusBadge(item.status);
                    const isExpanded = expandedComplaintId === item.id;
                    const messages = Array.isArray(item.messages) ? item.messages : [];
                    const resolution = item.resolution;

                    return (
                      <View key={item.id} style={styles.complaintCard}>
                        {/* Header Row */}
                        <TouchableOpacity
                          style={styles.complaintCardHeader}
                          activeOpacity={0.85}
                          onPress={() => setExpandedComplaintId(isExpanded ? null : item.id)}
                        >
                          <View style={{ flex: 1 }}>
                            <View style={styles.ticketIdRow}>
                              <Text style={styles.ticketIdText}>{item.id}</Text>
                              <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                                <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                                  {badge.label}
                                </Text>
                              </View>
                            </View>
                            <Text style={styles.ticketOutletText}>
                              {item.outletName || 'Restaurant Partner'} · {item.orderNumber || (item.orderId ? `#${item.orderId.slice(-5).toUpperCase()}` : `#${item.id}`)}
                            </Text>
                            <Text style={styles.ticketReasonText}>{item.reason}</Text>
                          </View>
                          <ChevronRight
                            size={18}
                            color="#F2CA50"
                            style={{ transform: [{ rotate: isExpanded ? '90deg' : '0deg' }] }}
                          />
                        </TouchableOpacity>

                        {/* Expandable Section */}
                        {isExpanded && (
                          <View style={styles.complaintCardBody}>
                            <View style={styles.complaintDivider} />
                            <Text style={styles.detailLabel}>Details</Text>
                            <Text style={styles.detailDesc}>{item.description}</Text>
                            {item.relatedItem && (
                              <Text style={styles.detailItemText}>Item: {item.relatedItem}</Text>
                            )}

                            {/* PROPOSED RESOLUTION CARD */}
                            {resolution && (
                              <View style={styles.resolutionBox}>
                                <View style={styles.resolutionHeader}>
                                  <ShieldAlert size={18} color="#F2CA50" />
                                  <Text style={styles.resolutionTitle}>Proposed Resolution</Text>
                                </View>
                                <Text style={styles.resolutionTypeBadge}>
                                  Type: {resolution.resolutionType}
                                  {resolution.refundAmount ? ` (₹${resolution.refundAmount})` : ''}
                                </Text>
                                <Text style={styles.resolutionActionText}>{resolution.actionTaken}</Text>
                                {resolution.note ? (
                                  <Text style={styles.resolutionNoteText}>Note: {resolution.note}</Text>
                                ) : null}

                                {item.status === 'AWAITING_CUSTOMER' && (
                                  <View style={styles.resolutionActionsRow}>
                                    <TouchableOpacity
                                      style={styles.acceptBtn}
                                      onPress={() => handleAcceptResolution(item.id)}
                                      activeOpacity={0.85}
                                    >
                                      <CheckCircle2 size={16} color="#000000" style={{ marginRight: 6 }} />
                                      <Text style={styles.acceptBtnText}>Accept</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                      style={styles.rejectBtn}
                                      onPress={() => handleRejectResolution(item.id)}
                                      activeOpacity={0.85}
                                    >
                                      <Text style={styles.rejectBtnText}>Need More Help</Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              </View>
                            )}

                            {/* MESSAGES THREAD */}
                            {messages.length > 0 && (
                              <View style={styles.chatThread}>
                                <Text style={styles.detailLabel}>Activity & Messages</Text>
                                {messages.map((m: any, mIdx: number) => {
                                  const isCustomer = m.senderType === 'CUSTOMER';
                                  return (
                                    <View
                                      key={m.id || mIdx}
                                      style={[
                                        styles.chatBubble,
                                        isCustomer ? styles.chatBubbleCustomer : styles.chatBubbleStaff,
                                      ]}
                                    >
                                      <Text style={styles.chatSenderName}>
                                        {m.senderName || (isCustomer ? 'You' : 'Restaurant Support')}
                                      </Text>
                                      <Text style={styles.chatMessageText}>{m.message}</Text>
                                    </View>
                                  );
                                })}
                              </View>
                            )}

                            {/* REPLY INPUT */}
                            {item.status !== 'RESOLVED' && (
                              <View style={styles.replyRow}>
                                <TextInput
                                  placeholder="Send a reply to restaurant..."
                                  placeholderTextColor="#666"
                                  value={replyTextMap[item.id] || ''}
                                  onChangeText={(txt) => setReplyTextMap((prev) => ({ ...prev, [item.id]: txt }))}
                                  style={styles.replyInput}
                                />
                                <TouchableOpacity
                                  style={styles.sendReplyBtn}
                                  onPress={() => handleSendReply(item.id)}
                                  disabled={isSendingReply}
                                  activeOpacity={0.85}
                                >
                                  {isSendingReply ? (
                                    <ActivityIndicator size="small" color="#000" />
                                  ) : (
                                    <Send size={16} color="#000000" />
                                  )}
                                </TouchableOpacity>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })
                )}
              </View>
            )}

            {/* REPORT NEW ISSUE CARD */}
            <View style={styles.sectionBlock}>
              <Text style={styles.sectionTitle}>REPORT AN ISSUE WITH AN ORDER</Text>

              {/* Selected Order Box */}
              <View style={styles.selectedOrderCard}>
                {selectedOrder ? (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderCardLabel}>SELECTED ORDER</Text>
                    <Text style={styles.orderCardRestaurant}>
                      {selectedOrder.restaurantName || selectedOrder.outletName || 'Restaurant Order'}
                    </Text>
                    <Text style={styles.orderCardMeta}>
                      {selectedOrder.orderNumber || `#${selectedOrder.id ? selectedOrder.id.slice(-5).toUpperCase() : 'ORDER'}`}
                      {selectedOrder.grandTotal || selectedOrder.totalAmount ? ` · ₹${selectedOrder.grandTotal || selectedOrder.totalAmount}` : ''}
                    </Text>
                  </View>
                ) : (
                  <View style={{ flex: 1 }}>
                    <Text style={styles.orderCardLabel}>ORDER NOT SELECTED</Text>
                    <Text style={styles.orderCardRestaurant}>General Support Request</Text>
                    <Text style={styles.orderCardMeta}>
                      {pastOrders.length > 0 ? 'Select an order from your history' : 'No past orders on this account'}
                    </Text>
                  </View>
                )}
                {pastOrders.length > 0 && (
                  <TouchableOpacity
                    style={styles.changeOrderBtn}
                    onPress={() => setShowOrderPicker(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.changeOrderText}>{selectedOrder ? 'Change' : 'Select Order'}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Category Picker */}
              <Text style={styles.formLabel}>ISSUE CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.key;
                  return (
                    <TouchableOpacity
                      key={cat.key}
                      style={[styles.categoryChip, isSelected && styles.categoryChipActive]}
                      onPress={() => {
                        setCategory(cat.key);
                        setReason('');
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.categoryIcon}>{cat.icon}</Text>
                      <Text style={[styles.categoryChipText, isSelected && styles.categoryChipTextActive]}>
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Preset Reason Quick Buttons */}
              <Text style={styles.formLabel}>QUICK SELECT REASON</Text>
              <View style={styles.presetReasonsContainer}>
                {(PRESET_REASONS[category] || []).map((preset, pIdx) => {
                  const isSelected = reason === preset;
                  return (
                    <TouchableOpacity
                      key={pIdx}
                      style={[styles.presetReasonChip, isSelected && styles.presetReasonChipActive]}
                      onPress={() => setReason(preset)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.presetReasonText, isSelected && styles.presetReasonTextActive]}>
                        {preset}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Affected Item (Optional) */}
              <Text style={styles.formLabel}>AFFECTED ITEM (OPTIONAL)</Text>
              <TextInput
                placeholder="e.g. Butter Naan, Paneer Butter Masala"
                placeholderTextColor="#666"
                value={relatedItem}
                onChangeText={setRelatedItem}
                style={styles.textInputBox}
              />

              {/* Detailed Description */}
              <Text style={styles.formLabel}>DESCRIBE THE ISSUE</Text>
              <TextInput
                placeholder="Please describe what happened in detail..."
                placeholderTextColor="#666"
                value={description}
                onChangeText={setDescription}
                multiline
                numberOfLines={3}
                style={[styles.textInputBox, styles.textAreaBox]}
              />

              {/* Submit Button */}
              <TouchableOpacity
                style={styles.submitComplaintBtn}
                onPress={handleSubmitComplaint}
                disabled={isSubmitting}
                activeOpacity={0.85}
              >
                {isSubmitting ? (
                  <ActivityIndicator size="small" color="#000000" />
                ) : (
                  <>
                    <FileText size={18} color="#000000" style={{ marginRight: 8 }} />
                    <Text style={styles.submitComplaintBtnText}>Submit Complaint</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          /* FAQS & HELPDESK TAB */
          <View style={styles.contentWrap}>
            {/* Branding Row */}
            <View style={styles.favLogoRow}>
              <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
                <Text style={styles.favLogoMy}>My</Text>
                <View style={styles.favQuroCropContainer}>
                  <Image source={favQuroImg} style={styles.favQuroCropImage} resizeMode="stretch" />
                </View>
              </View>
            </View>

            {/* Sparkle Tagline */}
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

            {/* Search FAQ Input Bar */}
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

            {/* Quick Connect Cards */}
            <Text style={styles.sectionHeading}>DIRECT HELPDESK</Text>
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

            {/* FAQs List */}
            <Text style={styles.sectionHeading}>FREQUENTLY ASKED QUESTIONS</Text>
            <View style={styles.faqCardsContainer}>
              {filteredFAQs.map((faq, index) => {
                const isOpen = expandedFaq === index;
                return (
                  <View key={index} style={styles.faqPremiumCard}>
                    <TouchableOpacity
                      style={styles.faqQuestionRow}
                      onPress={() => setExpandedFaq(isOpen ? null : index)}
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
              })}
            </View>
          </View>
        )}

        {/* ORDER SELECTOR MODAL */}
        <Modal
          visible={showOrderPicker}
          transparent
          animationType="slide"
          onRequestClose={() => setShowOrderPicker(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.orderPickerSheet}>
              <View style={styles.orderPickerHeader}>
                <Text style={styles.orderPickerTitle}>Select Order</Text>
                <TouchableOpacity onPress={() => setShowOrderPicker(false)}>
                  <X size={20} color="#EAE1D4" />
                </TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 350 }}>
                {pastOrders.map((ord, idx) => (
                  <TouchableOpacity
                    key={ord.id || ord.orderId || idx}
                    style={styles.orderPickerItem}
                    onPress={() => {
                      setSelectedOrder(ord);
                      setShowOrderPicker(false);
                    }}
                    activeOpacity={0.8}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.pickerItemRestName}>
                        {ord.restaurantName || ord.outletName || 'Restaurant'}
                      </Text>
                      <Text style={styles.pickerItemMeta}>
                        {ord.orderNumber || (ord.id ? `#${ord.id.slice(-5).toUpperCase()}` : `Order #${idx + 1}`)} · ₹{ord.grandTotal || ord.totalAmount || 0}
                      </Text>
                    </View>
                    <ChevronRight size={16} color="#F2CA50" />
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  headerBackBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    color: '#EAE1D4',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '700',
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#0A0A0A',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(242, 202, 80, 0.12)',
  },
  tabItem: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 12,
  },
  tabItemActive: {
    backgroundColor: 'rgba(242, 202, 80, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
  },
  tabText: {
    fontSize: 13,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#F2CA50',
    fontWeight: '700',
  },
  contentWrap: {
    paddingTop: 16,
  },
  successBanner: {
    marginHorizontal: 16,
    marginBottom: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    flexDirection: 'row',
    alignItems: 'center',
  },
  successTitle: {
    fontSize: 14,
    color: '#10B981',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  successSubtitle: {
    fontSize: 12,
    color: '#A7F3D0',
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  sectionBlock: {
    marginHorizontal: 16,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 10,
  },
  complaintCard: {
    backgroundColor: '#0F0F0F',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    marginBottom: 12,
    overflow: 'hidden',
  },
  complaintCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  ticketIdRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  ticketIdText: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  ticketOutletText: {
    fontSize: 12,
    color: '#A99260',
    fontFamily: 'Urbanist-Medium',
  },
  ticketReasonText: {
    fontSize: 13,
    color: '#EAE1D4',
    fontFamily: 'Urbanist-Regular',
    marginTop: 4,
  },
  complaintCardBody: {
    padding: 14,
    paddingTop: 0,
  },
  complaintDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 11,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  detailDesc: {
    fontSize: 13,
    color: '#D4AF37',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18,
    marginBottom: 8,
  },
  detailItemText: {
    fontSize: 12,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Medium',
    marginBottom: 8,
  },
  resolutionBox: {
    backgroundColor: 'rgba(242, 202, 80, 0.08)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    padding: 12,
    marginVertical: 10,
  },
  resolutionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  resolutionTitle: {
    fontSize: 13,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  resolutionTypeBadge: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-SemiBold',
    marginBottom: 4,
  },
  resolutionActionText: {
    fontSize: 12,
    color: '#EAE1D4',
    fontFamily: 'Urbanist-Regular',
  },
  resolutionNoteText: {
    fontSize: 11,
    color: '#A99260',
    fontFamily: 'Urbanist-Regular',
    marginTop: 4,
    fontStyle: 'italic',
  },
  resolutionActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  acceptBtn: {
    flex: 1,
    backgroundColor: '#F2CA50',
    borderRadius: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  acceptBtnText: {
    fontSize: 12,
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  rejectBtn: {
    flex: 1,
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 10,
    paddingVertical: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rejectBtnText: {
    fontSize: 12,
    color: '#EF4444',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  chatThread: {
    marginTop: 10,
    gap: 6,
  },
  chatBubble: {
    padding: 10,
    borderRadius: 10,
    maxWidth: '85%',
  },
  chatBubbleCustomer: {
    backgroundColor: 'rgba(242, 202, 80, 0.12)',
    alignSelf: 'flex-end',
    borderBottomRightRadius: 2,
  },
  chatBubbleStaff: {
    backgroundColor: '#1C1C1C',
    alignSelf: 'flex-start',
    borderBottomLeftRadius: 2,
  },
  chatSenderName: {
    fontSize: 10,
    color: '#A99260',
    fontFamily: 'Urbanist-Bold',
    marginBottom: 2,
  },
  chatMessageText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
  },
  replyRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  replyInput: {
    flex: 1,
    backgroundColor: '#161616',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
  },
  sendReplyBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 10,
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectedOrderCard: {
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderCardLabel: {
    fontSize: 10,
    color: '#A99260',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  orderCardRestaurant: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 2,
  },
  orderCardMeta: {
    fontSize: 12,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  changeOrderBtn: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeOrderText: {
    fontSize: 12,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  formLabel: {
    fontSize: 11,
    color: '#A99260',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 0.8,
    marginTop: 10,
    marginBottom: 6,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 10,
  },
  categoryChip: {
    backgroundColor: '#111111',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  categoryChipActive: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    borderColor: '#F2CA50',
  },
  categoryIcon: {
    fontSize: 14,
  },
  categoryChipText: {
    fontSize: 12,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Medium',
  },
  categoryChipTextActive: {
    color: '#F2CA50',
    fontWeight: '700',
  },
  presetReasonsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
  },
  presetReasonChip: {
    backgroundColor: '#141414',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  presetReasonChipActive: {
    backgroundColor: 'rgba(242, 202, 80, 0.2)',
    borderColor: '#F2CA50',
  },
  presetReasonText: {
    fontSize: 11,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
  },
  presetReasonTextActive: {
    color: '#F2CA50',
    fontWeight: '600',
  },
  textInputBox: {
    backgroundColor: '#111111',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    color: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    marginBottom: 10,
  },
  textAreaBox: {
    height: 80,
    textAlignVertical: 'top',
  },
  submitComplaintBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  submitComplaintBtnText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  favLogoRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
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
    marginVertical: 10,
  },
  sparkleTagline: {
    fontSize: 14 * scale,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Medium',
  },
  searchBarContainer: {
    paddingHorizontal: 16,
    marginVertical: 12,
  },
  searchInputBox: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    borderRadius: 20,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  searchInputField: {
    flex: 1,
    fontSize: 14,
    color: '#ffffff',
    fontFamily: 'Urbanist-Regular',
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    color: '#8a8a8a',
    letterSpacing: 1.2,
    marginBottom: 10,
    marginLeft: 16,
    marginTop: 16,
  },
  supportCardsRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 8,
  },
  supportCardBtn: {
    flex: 1,
    backgroundColor: 'rgba(242, 202, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    borderRadius: 16,
    padding: 14,
    alignItems: 'flex-start',
  },
  supportCardBtnDark: {
    backgroundColor: '#111',
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  supportCardIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  supportCardIconCircleDark: {
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
  },
  supportCardTitle: {
    fontSize: 14 * scale,
    fontFamily: 'Urbanist-Bold',
    color: '#f2ca50',
    marginBottom: 3,
  },
  supportCardDesc: {
    fontSize: 11 * scale,
    fontFamily: 'Urbanist-Regular',
    color: '#8a8a8a',
    lineHeight: 14,
  },
  faqCardsContainer: {
    paddingHorizontal: 16,
    gap: 10,
  },
  faqPremiumCard: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    borderRadius: 14,
    overflow: 'hidden',
  },
  faqQuestionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 14,
  },
  faqQuestion: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#ffffff',
    flex: 1,
    marginRight: 10,
  },
  faqAnswerContainer: {
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  faqAnswerDivider: {
    height: 1,
    backgroundColor: 'rgba(242, 202, 80, 0.1)',
    marginBottom: 10,
  },
  faqAnswer: {
    fontSize: 13,
    color: '#d0c5af',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  orderPickerSheet: {
    backgroundColor: '#141414',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    borderTopWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    padding: 18,
  },
  orderPickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  orderPickerTitle: {
    fontSize: 16,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  orderPickerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  pickerItemRestName: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
  },
  pickerItemMeta: {
    fontSize: 12,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  textWhite: {
    color: '#ffffff',
  },
});
