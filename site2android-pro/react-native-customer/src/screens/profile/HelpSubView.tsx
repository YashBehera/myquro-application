import React, { useState, useEffect, useRef } from 'react';
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
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ArrowLeft,
  X,
  Check,
  Send,
  Camera,
  Image as ImageIcon,
  CheckCircle2,
  Clock,
  Sparkles,
  Phone,
  Mail,
} from 'lucide-react-native';
import { scale } from './profileUtils';
import { getSafeTopPadding, getSafeBottomPadding } from '../../utils/responsive';
import { BACKEND_URL } from '../../config';
import * as ImagePicker from 'expo-image-picker';

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
  initialComplaint?: any;
  onBack: () => void;
}

interface OrderItemEntry {
  id: string;
  name: string;
  variant?: string;
  quantity: number;
  isVeg: boolean;
  price?: number;
}

interface ChatMessage {
  id: string;
  sender: 'user' | 'support';
  senderType?: 'CUSTOMER' | 'RESTAURANT' | 'RIDER' | 'MYQURO_SUPPORT';
  senderName?: string;
  text: string;
  timestamp: string;
  actionCard?: 'SELECT_ITEMS' | 'ADD_PHOTOS' | 'COMPLAINT_CREATED';
  actionCardData?: any;
  imageUri?: string;
}

const CATEGORY_ITEMS = [
  {
    id: 'not_received',
    title: 'I did not receive this order',
    subtitle: "My order shows as delivered, but I haven't received it",
    type: 'delivery',
    botIntro:
      "Sorry to hear that your order hasn't arrived. We will immediately check the live delivery logs with your delivery partner.",
    needsItemSelection: false,
  },
  {
    id: 'portion_size',
    title: 'Item(s) portion size is not adequate',
    subtitle: 'The portion size is smaller than what I ordered',
    type: 'quality',
    botIntro: 'Sorry to hear that. We will do our best to assist you. You are our top priority today!',
    itemPrompt: 'Let us know which items were of insufficient quantity',
    needsItemSelection: true,
  },
  {
    id: 'missing_items',
    title: 'Few item(s) are missing in my order',
    subtitle: 'Ex. Ordered 3 items, but received only 2',
    type: 'missing',
    botIntro: 'We sincerely apologize for the missing items. We will take care of this right away.',
    itemPrompt: 'Let us know which items were missing from your order package',
    needsItemSelection: true,
  },
  {
    id: 'incorrect_items',
    title: 'Item(s) delivered are incorrect or wrong',
    subtitle: 'Received different dishes or incorrect variants than ordered',
    type: 'wrong',
    botIntro: 'We apologize for sending the wrong dish. Please let us know which items were incorrect.',
    itemPrompt: 'Select the items that were delivered incorrectly',
    needsItemSelection: true,
  },
  {
    id: 'poor_quality',
    title: 'Item(s) quality is poor',
    subtitle: 'Food was cold, stale, undercooked or taste was substandard',
    type: 'quality',
    botIntro: 'We hold our culinary partner standards very high and apologize that this fell short.',
    itemPrompt: 'Select the items that had quality issues',
    needsItemSelection: true,
  },
  {
    id: 'spillage',
    title: 'Item(s) has spillage issue',
    subtitle: 'Curry or beverage leaked or container packaging was broken',
    type: 'spillage',
    botIntro: 'Packaging integrity is very important to us. We will address this with the packaging station.',
    itemPrompt: 'Select the spilled or damaged items',
    needsItemSelection: true,
  },
  {
    id: 'coupon_query',
    title: 'I have coupon related query for this order',
    subtitle: 'Coupon discount was not applied or cashback was not credited',
    type: 'billing',
    botIntro: 'Let us review the promotional terms and voucher code applied to your order invoice.',
    needsItemSelection: false,
  },
  {
    id: 'payment_billing',
    title: 'Payment and billing related query',
    subtitle: 'Double deducted, charged extra or invoice request',
    type: 'billing',
    botIntro: 'Our billing specialist is reviewing the payment gateway transaction logs for this order.',
    needsItemSelection: false,
  },
];

export const HelpSubView: React.FC<HelpSubViewProps> = ({
  isDarkMode,
  initialOrder,
  pastOrders = [],
  customerProfile,
  initialComplaint,
  onBack,
}) => {
  const insets = useSafeAreaInsets();
  const chatScrollRef = useRef<any>(null);

  // Active view: 'CATEGORIES' vs 'CHAT'
  const [viewMode, setViewMode] = useState<'CATEGORIES' | 'CHAT'>('CATEGORIES');
  const [selectedOrder, setSelectedOrder] = useState<any>(
    initialOrder || (pastOrders.length > 0 ? pastOrders[0] : null)
  );
  const [showOrderPicker, setShowOrderPicker] = useState(false);

  // Accordion expansion state
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  // Active Chat & Real Backend Ticket State
  const [activeCategory, setActiveCategory] = useState<any>(null);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [activeComplaintId, setActiveComplaintId] = useState<string | null>(null);
  const [activeComplaint, setActiveComplaint] = useState<any>(initialComplaint || null);
  const [customerTickets, setCustomerTickets] = useState<any[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isResolvingAction, setIsResolvingAction] = useState(false);

  // Item Selection Modal State
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [confirmedSelectedItems, setConfirmedSelectedItems] = useState<OrderItemEntry[]>([]);

  // Photo Options Bottom Sheet State
  const [showPhotoOptionsModal, setShowPhotoOptionsModal] = useState(false);
  const [isProcessingPhoto, setIsProcessingPhoto] = useState(false);

  const formatTimestamp = (dateVal?: any) => {
    const d = dateVal ? new Date(dateVal) : new Date();
    const targetDate = isNaN(d.getTime()) ? new Date() : d;
    let hours = targetDate.getHours();
    const minutes = targetDate.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    const strMinutes = minutes < 10 ? `0${minutes}` : `${minutes}`;
    const strHours = hours < 10 ? `0${hours}` : `${hours}`;
    return `${strHours}:${strMinutes} ${ampm}`;
  };

  const formatSenderLabel = (senderType?: string, senderName?: string) => {
    const t = String(senderType || '').toUpperCase();
    if (t === 'RESTAURANT') return senderName ? `Restaurant · ${senderName}` : 'Restaurant Partner';
    if (t === 'RIDER') return senderName ? `Delivery Partner · ${senderName}` : 'Delivery Partner';
    if (t === 'MYQURO_SUPPORT') return senderName || 'MyQuro Support';
    return senderName || 'Support';
  };

  const applyBackendComplaintToChat = (currentComp: any, catOverride?: any) => {
    if (!currentComp) return;
    setActiveComplaint(currentComp);
    setActiveComplaintId(currentComp.id);

    if (catOverride) {
      setActiveCategory(catOverride);
    } else if (!activeCategory) {
      setActiveCategory({
        id: currentComp.category || 'general',
        title: currentComp.reason || currentComp.categoryLabel || 'Order Dispute',
        botIntro: `Complaint #${currentComp.id} · ${currentComp.status}`,
      });
    }

    const rawMsgs = Array.isArray(currentComp.messages)
      ? currentComp.messages
      : typeof currentComp.messages === 'string'
      ? (() => {
          try {
            return JSON.parse(currentComp.messages || '[]');
          } catch {
            return [];
          }
        })()
      : [];

    const mapped: ChatMessage[] = rawMsgs.map((m: any, idx: number) => {
      const normalizedType = String(m.senderType || '').toUpperCase();
      const isUser =
        normalizedType === 'CUSTOMER' ||
        (Boolean(customerProfile?.id) && m.senderId === customerProfile?.id && !normalizedType);

      return {
        id: m.id || `db_msg_${idx}`,
        sender: isUser ? 'user' : 'support',
        senderType: (normalizedType || (isUser ? 'CUSTOMER' : 'MYQURO_SUPPORT')) as any,
        senderName: m.senderName,
        text: m.message || '',
        timestamp: formatTimestamp(m.timestamp),
        imageUri: m.attachmentUrl || undefined,
      };
    });

    const evidenceList = Array.isArray(currentComp.evidence)
      ? currentComp.evidence
      : typeof currentComp.evidence === 'string'
      ? (() => {
          try {
            return JSON.parse(currentComp.evidence || '[]');
          } catch {
            return [];
          }
        })()
      : [];

    const msgImageUris = mapped.filter((x) => x.imageUri).map((x) => x.imageUri);
    evidenceList.forEach((uri: string, i: number) => {
      if (uri && !msgImageUris.includes(uri)) {
        mapped.push({
          id: `evid_${i}_${currentComp.id}`,
          sender: 'user',
          senderType: 'CUSTOMER',
          senderName: currentComp.customerName || customerProfile?.name || 'Customer',
          text: 'Uploaded photo evidence',
          timestamp: formatTimestamp(currentComp.createdAt),
          imageUri: uri,
        });
      }
    });

    if (mapped.length === 0) {
      mapped.push({
        id: `msg_db_init_${currentComp.id}`,
        sender: 'user',
        senderType: 'CUSTOMER',
        text: currentComp.reason || currentComp.description || 'Support Ticket',
        timestamp: formatTimestamp(currentComp.createdAt),
      });
    }

    setChatMessages(mapped);
  };

  // Fetch customer's real tickets from PostgreSQL
  const fetchCustomerTickets = async () => {
    const cid = customerProfile?.id;
    if (!cid) {
      setCustomerTickets([]);
      return;
    }
    try {
      setIsLoadingTickets(true);
      const res = await fetch(`${BACKEND_URL}/api/complaints/customer/${encodeURIComponent(cid)}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.complaints)) {
          setCustomerTickets(data.complaints);
        }
      }
    } catch (err) {
      console.warn('Could not load customer support tickets:', err);
    } finally {
      setIsLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (viewMode === 'CATEGORIES' && !initialComplaint) {
      fetchCustomerTickets();
    }
  }, [viewMode, customerProfile?.id, initialComplaint?.id]);

  // Load initial complaint from database when opened from Order Details
  useEffect(() => {
    if (initialComplaint) {
      loadComplaintData(initialComplaint);
    }
  }, [initialComplaint?.id]);

  const loadComplaintData = async (comp: any) => {
    if (!comp) return;
    setViewMode('CHAT');
    applyBackendComplaintToChat(comp, {
      id: comp.category || 'general',
      title: comp.reason || comp.categoryLabel || 'Order Dispute',
      botIntro: `Complaint #${comp.id} · ${comp.status}`,
    });

    try {
      const res = await fetch(`${BACKEND_URL}/api/complaints/${comp.id}`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.complaint) {
          applyBackendComplaintToChat(data.complaint, {
            id: data.complaint.category || 'general',
            title: data.complaint.reason || data.complaint.categoryLabel || 'Order Dispute',
            botIntro: `Complaint #${data.complaint.id} · ${data.complaint.status}`,
          });
        }
      }
    } catch (e) {
      console.warn('Could not fetch latest complaint details:', e);
    }
  };

  // Real-time background polling for restaurant/rider/support updates when chat is open
  useEffect(() => {
    if (viewMode !== 'CHAT' || !activeComplaintId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/complaints/${activeComplaintId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.complaint) {
            applyBackendComplaintToChat(data.complaint);
          }
        }
      } catch {
        // Silent background refresh; next tick retries cleanly
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [viewMode, activeComplaintId]);

  // Parse real items from selected order (zero mock fallback)
  const orderItems: OrderItemEntry[] = React.useMemo(() => {
    if (!selectedOrder) return [];
    let rawItems: any[] = [];
    if (Array.isArray(selectedOrder.items)) {
      rawItems = selectedOrder.items;
    } else if (typeof selectedOrder.items === 'string') {
      try {
        const parsed = JSON.parse(selectedOrder.items);
        if (Array.isArray(parsed)) rawItems = parsed;
      } catch {}
    }

    if (rawItems.length === 0) return [];

    return rawItems.map((it: any, index: number) => {
      const name = it.name || it.itemName || it.title || `Item ${index + 1}`;
      const qty = Number(it.quantity || it.qty || 1);
      const isVeg =
        it.isVeg !== undefined
          ? Boolean(it.isVeg)
          : !name.toLowerCase().includes('chicken') &&
            !name.toLowerCase().includes('mutton') &&
            !name.toLowerCase().includes('egg') &&
            !name.toLowerCase().includes('fish');
      const variant = it.variantName || it.variant || (it.extras && it.extras.length > 0 ? '1 variant' : undefined);
      return {
        id: String(it.id || it.itemId || `it_${index}`),
        name,
        variant,
        quantity: qty,
        isVeg,
        price: it.price || it.unitPrice,
      };
    });
  }, [selectedOrder]);

  const toggleAccordion = (catId: string) => {
    setExpandedCategoryId((prev) => (prev === catId ? null : catId));
  };

  // Register real ticket in PostgreSQL via /api/complaints
  const registerBackendComplaint = async (cat: any, items: OrderItemEntry[] = []) => {
    try {
      const itemsText = items.map((it) => `${it.quantity} x ${it.name}`).join(', ');
      const customerId = customerProfile?.id;
      if (!customerId) {
        Alert.alert('Sign In Required', 'Please sign in to submit and track support requests.');
        return null;
      }

      const res = await fetch(`${BACKEND_URL}/api/complaints`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ticketType: 'order_complaint',
          orderId: selectedOrder?.id || selectedOrder?.orderId || null,
          orderNumber:
            selectedOrder?.orderNumber ||
            (selectedOrder?.id ? `#${String(selectedOrder.id).replace(/^order_/, '')}` : null),
          customerId,
          customerName: customerProfile?.name || 'Customer',
          customerPhone: customerProfile?.phone || null,
          customerAvatar: customerProfile?.avatar || null,
          outletId: selectedOrder?.restaurantId || selectedOrder?.outletId || null,
          outletName: selectedOrder?.restaurantName || selectedOrder?.outletName || null,
          riderId: selectedOrder?.riderId || selectedOrder?.delivery?.riderId || null,
          riderName: selectedOrder?.riderName || selectedOrder?.delivery?.riderName || null,
          riderPhone: selectedOrder?.riderPhone || selectedOrder?.delivery?.riderPhone || null,
          orderAmount: selectedOrder?.grandTotal || selectedOrder?.totalAmount || 0,
          category:
            cat?.type === 'quality'
              ? 'FOOD_QUALITY'
              : cat?.type === 'missing' || cat?.type === 'wrong' || cat?.type === 'spillage'
              ? 'ORDER_PACKAGING'
              : cat?.type === 'delivery'
              ? 'DELIVERY_DELAY'
              : 'OTHER',
          categoryLabel: cat?.title || 'Order Issue',
          reason: cat?.title || 'Order Support',
          description: itemsText ? `${cat?.title}: ${itemsText}` : cat?.subtitle || cat?.title || 'Order Support Request',
          relatedItem: itemsText || undefined,
          initialMessage: itemsText ? `${cat?.title} — Affected items: ${itemsText}` : cat?.title || 'Order Support Request',
          senderType: 'CUSTOMER',
        }),
      });

      const data = await res.json();
      if (!res.ok || !data?.success || !data?.complaint?.id) {
        Alert.alert('Support Error', data?.error || 'Could not create your support ticket. Please try again.');
        return null;
      }

      const ticket = { ...data.complaint, __deDuplicated: Boolean(data.deDuplicated) };
      applyBackendComplaintToChat(ticket, cat);
      return ticket;
    } catch (err: any) {
      console.warn('Could not register complaint to backend:', err);
      Alert.alert('Network Error', 'Could not reach support servers. Please check your connection and try again.');
      return null;
    }
  };

  // Start chat with selected issue category
  const handleStartChat = async (cat: any) => {
    setActiveCategory(cat);
    setActiveComplaint(null);
    setActiveComplaintId(null);
    setSelectedItemIds([]);
    setConfirmedSelectedItems([]);
    const timeStr = formatTimestamp();

    const needsSelection = Boolean(cat.needsItemSelection && orderItems.length > 0);
    if (needsSelection) {
      setChatMessages([
        {
          id: `msg_user_${Date.now()}`,
          sender: 'user',
          senderType: 'CUSTOMER',
          text: cat.title,
          timestamp: timeStr,
        },
        {
          id: `msg_bot_prompt_${Date.now()}`,
          sender: 'support',
          senderType: 'MYQURO_SUPPORT',
          senderName: 'MyQuro Support',
          text: cat.itemPrompt || 'Select the affected item(s) from your order below.',
          timestamp: timeStr,
          actionCard: 'SELECT_ITEMS',
        },
      ]);
      setViewMode('CHAT');
      return;
    }

    // Immediate real complaint creation for non-item or general queries
    setViewMode('CHAT');
    setChatMessages([
      {
        id: `msg_user_${Date.now()}`,
        sender: 'user',
        senderType: 'CUSTOMER',
        text: cat.title,
        timestamp: timeStr,
      },
    ]);
    await registerBackendComplaint(cat, []);
  };

  // Submit selected items from modal & register real DB complaint
  const handleConfirmItemSelection = async () => {
    if (selectedItemIds.length === 0) return;
    const selectedObjs = orderItems.filter((it) => selectedItemIds.includes(it.id));
    setConfirmedSelectedItems(selectedObjs);
    setShowItemModal(false);

    const created = await registerBackendComplaint(activeCategory, selectedObjs);
    if (created?.id && !(created as any).__deDuplicated && created.status !== 'RESOLVED' && created.status !== 'CLOSED') {
      setChatMessages((prev) => [
        ...prev,
        {
          id: `msg_photo_prompt_${Date.now()}`,
          sender: 'support',
          senderType: 'MYQURO_SUPPORT',
          senderName: 'MyQuro Support',
          text: `Complaint #${created.id} is registered with the restaurant & delivery team. Upload a photo of the affected item(s) if available.`,
          timestamp: formatTimestamp(),
          actionCard: 'ADD_PHOTOS',
        },
      ]);
    }
  };

  // Shared helper to upload selected photo as cross-device data URI to DB
  const pickPhotoAndUpload = async (source: 'camera' | 'gallery') => {
    setShowPhotoOptionsModal(false);
    try {
      setIsProcessingPhoto(true);
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        setIsProcessingPhoto(false);
        Alert.alert(
          source === 'camera' ? 'Camera Access Required' : 'Photo Library Access Required',
          `Please allow ${source === 'camera' ? 'camera' : 'photo library'} access in your device settings to attach photo proof.`,
          [{ text: 'OK' }]
        );
        return;
      }

      const pickerOptions: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        quality: 0.45,
        base64: true,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(pickerOptions)
          : await ImagePicker.launchImageLibraryAsync(pickerOptions);

      if (result.canceled || !result.assets?.length) {
        setIsProcessingPhoto(false);
        return;
      }

      const asset = result.assets[0];
      const photoDataUri = asset.base64
        ? `data:${asset.mimeType || 'image/jpeg'};base64,${asset.base64}`
        : asset.uri;

      let targetId = activeComplaintId;
      if (!targetId) {
        const created = await registerBackendComplaint(activeCategory, confirmedSelectedItems);
        targetId = created?.id || null;
      }

      if (!targetId) {
        setIsProcessingPhoto(false);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/complaints/${targetId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: customerProfile?.id,
          senderName: customerProfile?.name || 'Customer',
          senderType: 'CUSTOMER',
          message: 'Attached photo evidence',
          attachmentUrl: photoDataUri,
        }),
      });
      const data = await res.json();
      setIsProcessingPhoto(false);

      if (!res.ok || !data?.success || !data?.complaint) {
        Alert.alert('Upload Failed', data?.error || 'Could not upload photo evidence to server.');
        return;
      }

      applyBackendComplaintToChat(data.complaint);
    } catch (err: any) {
      setIsProcessingPhoto(false);
      console.warn(`Error capturing/picking photo (${source}):`, err);
      Alert.alert(
        source === 'camera' ? 'Camera Error' : 'Gallery Error',
        `Unable to open ${source === 'camera' ? 'camera' : 'photo library'}.`
      );
    }
  };

  // Send live message to backend DB
  const handleSendMessage = async () => {
    const userText = inputText.trim();
    if (!userText || isSending) return;

    setInputText('');
    setIsSending(true);
    try {
      let targetId = activeComplaintId;
      if (!targetId) {
        const created = await registerBackendComplaint(activeCategory, confirmedSelectedItems);
        targetId = created?.id || null;
      }

      if (!targetId) {
        setInputText(userText);
        setIsSending(false);
        return;
      }

      const res = await fetch(`${BACKEND_URL}/api/complaints/${targetId}/message`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          senderId: customerProfile?.id,
          senderName: customerProfile?.name || 'Customer',
          senderType: 'CUSTOMER',
          message: userText,
        }),
      });
      const data = await res.json();

      if (!res.ok || !data?.success || !data?.complaint) {
        setInputText(userText);
        Alert.alert('Message Not Sent', data?.error || 'Could not send message. Please try again.');
        setIsSending(false);
        return;
      }

      applyBackendComplaintToChat(data.complaint);
    } catch (err) {
      setInputText(userText);
      Alert.alert('Network Error', 'Could not send message. Please check your connection.');
    } finally {
      setIsSending(false);
    }
  };

  const handleResolutionDecision = async (decision: 'accept' | 'reject') => {
    if (!activeComplaintId || isResolvingAction) return;
    try {
      setIsResolvingAction(true);
      const endpoint = decision === 'accept' ? 'accept-resolution' : 'reject-resolution';
      const payload =
        decision === 'accept'
          ? { feedback: 'Customer accepted resolution', user: customerProfile?.name || 'Customer' }
          : { reason: 'Customer requested escalation for further review', user: customerProfile?.name || 'Customer' };

      const res = await fetch(`${BACKEND_URL}/api/complaints/${activeComplaintId}/${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok || !data?.success || !data?.complaint) {
        Alert.alert('Update Failed', data?.error || 'Could not update resolution response.');
        return;
      }
      applyBackendComplaintToChat(data.complaint);
    } catch {
      Alert.alert('Network Error', 'Could not submit your response. Please try again.');
    } finally {
      setIsResolvingAction(false);
    }
  };

  const toggleItemCheckbox = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId) ? prev.filter((id) => id !== itemId) : [...prev, itemId]
    );
  };

  return (
    <View style={styles.container}>
      {/* ───────────────── TOP HEADER ───────────────── */}
      <View style={[styles.header, { paddingTop: getSafeTopPadding(insets.top, 8) }]}>
        <TouchableOpacity
          onPress={() => {
            if (viewMode === 'CHAT' && !initialComplaint) {
              setViewMode('CATEGORIES');
            } else {
              onBack();
            }
          }}
          style={styles.backBtn}
          activeOpacity={0.8}
        >
          <ArrowLeft size={22} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {viewMode === 'CHAT' ? 'Support Chat' : 'Help & Support'}
        </Text>
        <View style={{ width: 36 }} />
      </View>

      {/* ───────────────── CATEGORIES & REAL TICKETS LIST ───────────────── */}
      {viewMode === 'CATEGORIES' ? (
        <ScrollView
          style={styles.scrollArea}
          contentContainerStyle={{ paddingBottom: getSafeBottomPadding(insets.bottom, 40) }}
          showsVerticalScrollIndicator={false}
        >

          {/* MAIN ISSUE ACCORDION CARD */}
          <View style={styles.accordionContainerCard}>
            {CATEGORY_ITEMS.map((item, index) => {
              const isExpanded = expandedCategoryId === item.id;
              const isLast = index === CATEGORY_ITEMS.length - 1;

              return (
                <View key={item.id} style={styles.accordionItemWrapper}>
                  <TouchableOpacity
                    style={styles.accordionHeaderRow}
                    onPress={() => toggleAccordion(item.id)}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.accordionTitleText}>{item.title}</Text>
                    {item.id === 'payment_billing' ? (
                      <ChevronRight size={20} color="#F2CA50" />
                    ) : isExpanded ? (
                      <ChevronUp size={20} color="#F2CA50" />
                    ) : (
                      <ChevronDown size={20} color="#8A8A8A" />
                    )}
                  </TouchableOpacity>

                  {isExpanded && (
                    <View style={styles.accordionExpandedBox}>
                      <Text style={styles.accordionSubtitleText}>{item.subtitle}</Text>

                      <TouchableOpacity
                        style={styles.chatWithUsBtn}
                        onPress={() => handleStartChat(item)}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.chatWithUsBtnText}>CHAT WITH US</Text>
                      </TouchableOpacity>

                      <View style={styles.waitTimeBox}>
                        <Text style={styles.waitTimeLabel}>Live Dispatch</Text>
                        <Text style={styles.waitTimeGold}>Connected directly to restaurant &amp; delivery partner</Text>
                      </View>
                    </View>
                  )}

                  {!isLast && <View style={styles.accordionDivider} />}
                </View>
              );
            })}
          </View>

          {/* REAL DATABASE SUPPORT TICKETS HISTORY */}
          {(isLoadingTickets || customerTickets.length > 0) && (
            <View style={styles.ticketListSection}>
              <Text style={styles.ticketSectionHeading}>YOUR CONVERSATIONS</Text>
              {isLoadingTickets && customerTickets.length === 0 ? (
                <ActivityIndicator size="small" color="#F2CA50" style={{ marginVertical: 16 }} />
              ) : (
                customerTickets.map((t) => (
                  <TouchableOpacity
                    key={t.id}
                    style={styles.ticketRowCard}
                    onPress={() => loadComplaintData(t)}
                    activeOpacity={0.85}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <Text style={styles.ticketRowTitle} numberOfLines={1}>
                        {t.reason || t.categoryLabel || 'Support Ticket'}
                      </Text>
                      <Text style={styles.ticketRowMeta} numberOfLines={1}>
                        {t.outletName ? `${t.outletName} · ` : ''}
                        {t.orderNumber || `#${t.id}`}
                      </Text>
                    </View>
                    <View style={styles.statusPillBadge}>
                      <Text style={styles.statusPillText}>{String(t.status || 'OPEN').replace(/_/g, ' ')}</Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </View>
          )}
        </ScrollView>
      ) : (
        /* ───────────────── LIVE CONNECTED CHAT VIEW ───────────────── */
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          {/* Ticket Status & Photo Shortcut Bar */}
          {activeComplaint && (
            <View style={styles.ticketContextBanner}>
              <View style={{ flex: 1, marginRight: 8 }}>
                <Text style={styles.ticketBannerTitle} numberOfLines={1}>
                  #{activeComplaint.id}
                  {activeComplaint.outletName ? ` · ${activeComplaint.outletName}` : ''}
                </Text>
                <Text style={styles.ticketBannerSub} numberOfLines={1}>
                  Status: {String(activeComplaint.status || 'OPEN').replace(/_/g, ' ')}
                </Text>
              </View>
              {!['RESOLVED', 'CLOSED'].includes(String(activeComplaint.status || '').toUpperCase()) && (
                <TouchableOpacity
                  style={styles.bannerPhotoBtn}
                  onPress={() => setShowPhotoOptionsModal(true)}
                  activeOpacity={0.8}
                >
                  <Camera size={14} color="#F2CA50" style={{ marginRight: 5 }} />
                  <Text style={styles.bannerPhotoBtnText}>Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <ScrollView
            ref={chatScrollRef}
            style={styles.chatScrollView}
            contentContainerStyle={styles.chatScrollContent}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {chatMessages.map((msg) => {
              const isUser = msg.sender === 'user';

              return (
                <View
                  key={msg.id}
                  style={[
                    styles.chatMessageRow,
                    isUser ? styles.chatMessageRowUser : styles.chatMessageRowSupport,
                  ]}
                >
                  {!isUser && (
                    <View style={styles.supportAvatarCircle}>
                      <Image
                        source={require('../../assets/favorite_quro.png')}
                        style={styles.supportAvatarImg}
                        resizeMode="contain"
                      />
                    </View>
                  )}

                  <View
                    style={[
                      styles.chatBubbleContainer,
                      isUser ? styles.chatBubbleUser : styles.chatBubbleSupport,
                    ]}
                  >
                    {!isUser && (
                      <Text style={styles.senderTagText}>
                        {formatSenderLabel(msg.senderType, msg.senderName)}
                      </Text>
                    )}

                    <Text style={[styles.chatBubbleText, isUser ? styles.chatTextUser : styles.chatTextSupport]}>
                      {msg.text}
                    </Text>

                    {msg.imageUri && (
                      <View style={styles.chatImageWrapper}>
                        <Image
                          source={{ uri: msg.imageUri }}
                          style={styles.chatImagePreview}
                          resizeMode="cover"
                        />
                      </View>
                    )}

                    {msg.actionCard === 'SELECT_ITEMS' && (
                      <View style={styles.actionCardBox}>
                        <TouchableOpacity
                          style={styles.selectItemsBtn}
                          onPress={() => setShowItemModal(true)}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.selectItemsBtnText}>SELECT ITEMS</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    {msg.actionCard === 'ADD_PHOTOS' && (
                      <View style={styles.actionCardBox}>
                        <TouchableOpacity
                          style={styles.addPhotosBtn}
                          onPress={() => setShowPhotoOptionsModal(true)}
                          activeOpacity={0.85}
                        >
                          <Camera size={16} color="#F2CA50" style={{ marginRight: 8 }} />
                          <Text style={styles.addPhotosBtnText}>Add photos</Text>
                        </TouchableOpacity>
                      </View>
                    )}

                    <View style={styles.msgFooterRow}>
                      <Text style={styles.msgTimestampText}>{msg.timestamp}</Text>
                      {isUser && <Text style={styles.msgCheckmarks}> ✓✓</Text>}
                    </View>
                  </View>
                </View>
              );
            })}

            {/* Proposed / Final Resolution Card Synced from Restaurant & Support */}
            {activeComplaint?.resolution && (
              <View style={styles.resolutionCard}>
                <Text style={styles.resolutionHeading}>
                  {activeComplaint.status === 'AWAITING_CUSTOMER'
                    ? 'PROPOSED RESOLUTION'
                    : activeComplaint.status === 'RESOLVED'
                    ? 'RESOLUTION COMPLETED'
                    : 'RESOLUTION UPDATE'}
                </Text>
                <Text style={styles.resolutionSummary}>
                  {activeComplaint.resolution.actionTaken || activeComplaint.resolution.resolutionType}
                </Text>
                {activeComplaint.resolution.refundAmount ? (
                  <Text style={styles.resolutionHighlight}>
                    Refund Amount: ₹{activeComplaint.resolution.refundAmount}
                  </Text>
                ) : null}
                {activeComplaint.resolution.replacementItem ? (
                  <Text style={styles.resolutionHighlight}>
                    Replacement: {activeComplaint.resolution.replacementItem}
                  </Text>
                ) : null}
                {activeComplaint.resolution.compensationCode ? (
                  <Text style={styles.resolutionHighlight}>
                    Voucher Code: {activeComplaint.resolution.compensationCode}
                  </Text>
                ) : null}
                {activeComplaint.resolution.note ? (
                  <Text style={styles.resolutionNoteText}>{activeComplaint.resolution.note}</Text>
                ) : null}

                {activeComplaint.status === 'AWAITING_CUSTOMER' && (
                  <View style={styles.resolutionActionsRow}>
                    <TouchableOpacity
                      style={[styles.resolutionAcceptBtn, isResolvingAction && { opacity: 0.6 }]}
                      onPress={() => handleResolutionDecision('accept')}
                      disabled={isResolvingAction}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.resolutionAcceptBtnText}>Accept Resolution</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.resolutionRejectBtn, isResolvingAction && { opacity: 0.6 }]}
                      onPress={() => handleResolutionDecision('reject')}
                      disabled={isResolvingAction}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.resolutionRejectBtnText}>Escalate</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </ScrollView>

          {/* BOTTOM MESSAGE INPUT BAR */}
          <View style={[styles.inputBarContainer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity
              style={styles.chatAttachBtn}
              onPress={() => setShowPhotoOptionsModal(true)}
              disabled={isProcessingPhoto}
              activeOpacity={0.8}
            >
              {isProcessingPhoto ? (
                <ActivityIndicator size="small" color="#F2CA50" />
              ) : (
                <Camera size={20} color="#F2CA50" />
              )}
            </TouchableOpacity>
            <TextInput
              placeholder="Type your message..."
              placeholderTextColor="#777777"
              value={inputText}
              onChangeText={setInputText}
              style={styles.chatInputField}
            />
            <TouchableOpacity
              style={[styles.chatSendBtn, (!inputText.trim() || isSending) && styles.chatSendBtnDisabled]}
              onPress={handleSendMessage}
              disabled={!inputText.trim() || isSending}
              activeOpacity={0.85}
            >
              {isSending ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <Send size={18} color="#000000" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      )}

      {/* ───────────────── SCREENSHOT 4: SELECT ITEMS MODAL SHEET ───────────────── */}
      <Modal
        visible={showItemModal}
        transparent={false}
        animationType="slide"
        onRequestClose={() => setShowItemModal(false)}
      >
        <View style={[styles.itemModalContainer, { paddingTop: getSafeTopPadding(insets.top, 8) }]}>
          {/* Modal Header */}
          <View style={styles.itemModalHeader}>
            <TouchableOpacity
              onPress={() => setShowItemModal(false)}
              style={styles.itemModalCloseBtn}
              activeOpacity={0.8}
            >
              <X size={22} color="#EAE1D4" />
            </TouchableOpacity>
            <Text style={styles.itemModalTitle}>SELECT ITEMS</Text>
            <View style={{ width: 36 }} />
          </View>

          {/* Items List (Screenshot 4) */}
          <ScrollView style={styles.itemsScrollView} showsVerticalScrollIndicator={false}>
            {orderItems.map((item) => {
              const isChecked = selectedItemIds.includes(item.id);

              return (
                <TouchableOpacity
                  key={item.id}
                  style={styles.itemRowCard}
                  onPress={() => toggleItemCheckbox(item.id)}
                  activeOpacity={0.85}
                >
                  {/* Veg / Non-Veg Icon */}
                  <View style={[styles.foodTypeBadge, item.isVeg ? styles.vegBadge : styles.nonVegBadge]}>
                    <View style={[styles.foodTypeDot, item.isVeg ? styles.vegDot : styles.nonVegDot]} />
                  </View>

                  {/* Item Title & Variant */}
                  <View style={styles.itemInfoCol}>
                    <Text style={styles.itemTitleText}>
                      {item.name} x {item.quantity}
                    </Text>
                    {item.variant && <Text style={styles.itemVariantText}>{item.variant}</Text>}
                  </View>

                  {/* Square Checkbox (Screenshot 4) */}
                  <View style={[styles.checkboxSquare, isChecked && styles.checkboxSquareChecked]}>
                    {isChecked && <Check size={14} color="#000000" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          {/* Modal Fixed Bottom Bar & SUBMIT Button (Screenshot 4) */}
          <View style={[styles.itemModalBottomBar, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <TouchableOpacity
              style={[
                styles.itemModalSubmitBtn,
                selectedItemIds.length === 0 && styles.itemModalSubmitBtnDisabled,
              ]}
              onPress={handleConfirmItemSelection}
              disabled={selectedItemIds.length === 0}
              activeOpacity={0.85}
            >
              <Text
                style={[
                  styles.itemModalSubmitBtnText,
                  selectedItemIds.length === 0 && styles.itemModalSubmitBtnTextDisabled,
                ]}
              >
                SUBMIT
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ───────────────── CHANGE ORDER MODAL ───────────────── */}
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
                      {ord.orderNumber || (ord.id ? `#${ord.id.slice(-5).toUpperCase()}` : `Order #${idx + 1}`)} · ₹
                      {ord.grandTotal || ord.totalAmount || 0}
                    </Text>
                  </View>
                  <ChevronRight size={16} color="#F2CA50" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ───────────────── PHOTO OPTIONS BOTTOM SHEET MODAL ───────────────── */}
      <Modal
        visible={showPhotoOptionsModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowPhotoOptionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowPhotoOptionsModal(false)}
        >
          <View
            style={[styles.photoPickerSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}
            onStartShouldSetResponder={() => true}
          >
            {/* Grabber handle */}
            <View style={styles.photoSheetGrabber} />

            {/* Header */}
            <View style={styles.photoSheetHeader}>
              <View style={{ flex: 1, paddingRight: 10 }}>
                <Text style={styles.photoSheetTitle}>Add Photo Evidence</Text>
                <Text style={styles.photoSheetSubtitle}>
                  Provide visual proof of the issue to speed up refund or replacement
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowPhotoOptionsModal(false)}
                style={styles.photoCloseBtn}
                activeOpacity={0.8}
              >
                <X size={20} color="#8A8A8A" />
              </TouchableOpacity>
            </View>

            {/* Option 1: Live Camera */}
            <TouchableOpacity
              style={styles.photoOptionCard}
              onPress={() => pickPhotoAndUpload('camera')}
              activeOpacity={0.85}
            >
              <View style={styles.photoIconBadge}>
                <Camera size={22} color="#000000" />
              </View>
              <View style={styles.photoOptionContent}>
                <Text style={styles.photoOptionTitle}>Take Live Photo</Text>
                <Text style={styles.photoOptionDesc}>
                  Use device camera to photograph the dish or package
                </Text>
              </View>
              <ChevronRight size={18} color="#F2CA50" />
            </TouchableOpacity>

            {/* Option 2: Gallery Picker */}
            <TouchableOpacity
              style={styles.photoOptionCard}
              onPress={() => pickPhotoAndUpload('gallery')}
              activeOpacity={0.85}
            >
              <View style={[styles.photoIconBadge, styles.photoGalleryBadge]}>
                <ImageIcon size={22} color="#F2CA50" />
              </View>
              <View style={styles.photoOptionContent}>
                <Text style={styles.photoOptionTitle}>Choose from Gallery</Text>
                <Text style={styles.photoOptionDesc}>
                  Select existing photo from your device library
                </Text>
              </View>
              <ChevronRight size={18} color="#F2CA50" />
            </TouchableOpacity>

            {/* Cancel Button */}
            <TouchableOpacity
              style={styles.photoCancelBtn}
              onPress={() => setShowPhotoOptionsModal(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.photoCancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  headerTitle: {
    fontSize: 18,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  scrollArea: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  orderContextCard: {
    backgroundColor: '#121212',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderContextLabel: {
    fontSize: 10,
    color: '#A99260',
    fontFamily: 'Urbanist-Bold',
    letterSpacing: 0.6,
  },
  orderContextRestName: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 2,
  },
  orderContextMeta: {
    fontSize: 12,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  changeOrderPill: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeOrderPillText: {
    fontSize: 12,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  // ─── ACCORDION CONTAINER (Screenshots 1 & 2) ───
  accordionContainerCard: {
    backgroundColor: '#0F0F0F',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    overflow: 'hidden',
  },
  accordionItemWrapper: {
    overflow: 'hidden',
  },
  accordionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 18,
  },
  accordionTitleText: {
    fontSize: 14.5,
    color: '#EAE1D4',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    flex: 1,
    marginRight: 10,
  },
  accordionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginHorizontal: 18,
  },
  accordionExpandedBox: {
    paddingHorizontal: 18,
    paddingBottom: 20,
    paddingTop: 2,
  },
  accordionSubtitleText: {
    fontSize: 13,
    color: '#999999',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 18,
    marginBottom: 16,
  },
  chatWithUsBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 24,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  chatWithUsBtnText: {
    fontSize: 13,
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  waitTimeBox: {
    marginTop: 2,
  },
  waitTimeLabel: {
    fontSize: 11,
    color: '#888888',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 2,
  },
  waitTimeGold: {
    fontSize: 12,
    color: '#F2CA50',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    marginBottom: 1,
  },
  waitTimeOthers: {
    fontSize: 11,
    color: '#777777',
    fontFamily: 'Urbanist-Regular',
  },
  // ─── CHAT VIEW (Screenshots 3 & 5) ───
  chatScrollView: {
    flex: 1,
    backgroundColor: '#000000',
  },
  chatScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  chatMessageRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  chatMessageRowUser: {
    justifyContent: 'flex-end',
  },
  chatMessageRowSupport: {
    justifyContent: 'flex-start',
  },
  supportAvatarCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F2CA50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginTop: 2,
    overflow: 'hidden',
  },
  supportAvatarImg: {
    width: 24,
    height: 24,
  },
  chatBubbleContainer: {
    maxWidth: '82%',
    borderRadius: 16,
    padding: 14,
  },
  chatBubbleUser: {
    backgroundColor: '#2A2214',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    borderBottomRightRadius: 4,
  },
  chatBubbleSupport: {
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderBottomLeftRadius: 4,
  },
  chatBubbleText: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Urbanist-Regular',
  },
  chatTextUser: {
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Medium',
  },
  chatTextSupport: {
    color: '#EAE1D4',
  },
  actionCardBox: {
    marginTop: 12,
  },
  selectItemsBtn: {
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selectItemsBtnText: {
    fontSize: 13,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  addPhotosBtn: {
    backgroundColor: '#000000',
    borderRadius: 12,
    height: 44,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addPhotosBtnText: {
    fontSize: 13,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  msgFooterRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 6,
  },
  msgTimestampText: {
    fontSize: 10,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
  },
  msgCheckmarks: {
    fontSize: 10,
    color: '#F2CA50',
    fontWeight: '700',
  },
  inputBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 8,
    backgroundColor: '#0F0F0F',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  chatInputField: {
    flex: 1,
    height: 44,
    backgroundColor: '#181818',
    borderRadius: 22,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  chatSendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2CA50',
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
  },
  chatSendBtnDisabled: {
    opacity: 0.4,
  },
  // ─── SELECT ITEMS MODAL (Screenshot 4) ───
  itemModalContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  itemModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemModalCloseBtn: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  itemModalTitle: {
    fontSize: 15,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.6,
  },
  itemsScrollView: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  itemRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  foodTypeBadge: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  vegBadge: {
    borderColor: '#10B981',
  },
  nonVegBadge: {
    borderColor: '#EF4444',
  },
  foodTypeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  vegDot: {
    backgroundColor: '#10B981',
  },
  nonVegDot: {
    backgroundColor: '#EF4444',
  },
  itemInfoCol: {
    flex: 1,
    marginRight: 12,
  },
  itemTitleText: {
    fontSize: 14.5,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  itemVariantText: {
    fontSize: 12,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  checkboxSquare: {
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 1.5,
    borderColor: '#555555',
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSquareChecked: {
    backgroundColor: '#F2CA50',
    borderColor: '#F2CA50',
  },
  itemModalBottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: '#0F0F0F',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  itemModalSubmitBtn: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#F2CA50',
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemModalSubmitBtnDisabled: {
    backgroundColor: '#222222',
  },
  itemModalSubmitBtnText: {
    fontSize: 14,
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  itemModalSubmitBtnTextDisabled: {
    color: '#666666',
  },
  // ─── CHANGE ORDER MODAL ───
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
  // ─── PHOTO ATTACHMENT & PREVIEW ───
  chatAttachBtn: {
    width: 40,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 4,
  },
  chatImageWrapper: {
    marginTop: 8,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    backgroundColor: '#000000',
  },
  chatImagePreview: {
    width: 220,
    height: 160,
    borderRadius: 11,
  },
  // ─── PHOTO OPTIONS BOTTOM SHEET MODAL ───
  photoPickerSheet: {
    backgroundColor: '#111111',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    paddingHorizontal: 20,
    paddingTop: 12,
  },
  photoSheetGrabber: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#333333',
    alignSelf: 'center',
    marginBottom: 16,
  },
  photoSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  photoSheetTitle: {
    fontSize: 17,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  photoSheetSubtitle: {
    fontSize: 12.5,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    lineHeight: 17,
    marginTop: 4,
  },
  photoCloseBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1C',
    borderRadius: 16,
  },
  photoOptionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#181818',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    padding: 14,
    marginBottom: 12,
  },
  photoIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F2CA50',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  photoGalleryBadge: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
  },
  photoOptionContent: {
    flex: 1,
    marginRight: 10,
  },
  photoOptionTitle: {
    fontSize: 14.5,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  photoOptionDesc: {
    fontSize: 12,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
    lineHeight: 16,
  },
  photoCancelBtn: {
    height: 46,
    borderRadius: 14,
    backgroundColor: '#161616',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  photoCancelBtnText: {
    fontSize: 13,
    color: '#999999',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  // ─── CONNECTED SUPPORT TICKETS & RESOLUTION UI ───
  ticketListSection: {
    marginTop: 22,
  },
  ticketSectionHeading: {
    fontSize: 11.5,
    color: '#A99260',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 1,
    marginBottom: 10,
  },
  ticketRowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#111111',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.22)',
    padding: 14,
    marginBottom: 10,
  },
  ticketRowTitle: {
    fontSize: 14,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  ticketRowMeta: {
    fontSize: 12,
    color: '#8A8A8A',
    fontFamily: 'Urbanist-Regular',
    marginTop: 3,
  },
  statusPillBadge: {
    backgroundColor: 'rgba(242, 202, 80, 0.16)',
    borderRadius: 8,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
  },
  statusPillText: {
    fontSize: 10,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  ticketContextBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#121212',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(242, 202, 80, 0.18)',
  },
  ticketBannerTitle: {
    fontSize: 13,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  ticketBannerSub: {
    fontSize: 11.5,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Medium',
    marginTop: 1,
  },
  bannerPhotoBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 202, 80, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  bannerPhotoBtnText: {
    fontSize: 12,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  senderTagText: {
    fontSize: 11,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  resolutionCard: {
    marginTop: 10,
    marginBottom: 16,
    backgroundColor: '#15120A',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.5)',
    padding: 16,
  },
  resolutionHeading: {
    fontSize: 11,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.8,
    marginBottom: 6,
  },
  resolutionSummary: {
    fontSize: 14.5,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    lineHeight: 20,
  },
  resolutionHighlight: {
    fontSize: 13.5,
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 6,
  },
  resolutionNoteText: {
    fontSize: 12.5,
    color: '#B8B0A0',
    fontFamily: 'Urbanist-Regular',
    marginTop: 6,
    lineHeight: 18,
  },
  resolutionActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  resolutionAcceptBtn: {
    flex: 1,
    backgroundColor: '#F2CA50',
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolutionAcceptBtnText: {
    fontSize: 13,
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  resolutionRejectBtn: {
    flex: 1,
    backgroundColor: '#1D1D1D',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resolutionRejectBtnText: {
    fontSize: 13,
    color: '#EAE1D4',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
});
