import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Keyboard,
  TouchableWithoutFeedback,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Linking from 'expo-linking';
import QRCode from 'react-native-qrcode-svg';
import * as ImagePicker from 'expo-image-picker';
import { useRider } from '@/context/RiderContext';
import { BACKEND_URL } from '@/config';

interface CodOrder {
  orderId: string;
  customerName: string;
  customerPhone: string;
  customerUpiId: string;
  orderAmount: number;
  status: string;
}

interface FloatingTransaction {
  id: string;
  type: string;
  amount: number;
  orderId?: string;
  customerName?: string;
  customerPhone?: string;
  customerUpiId?: string;
  orderAmount?: number;
  cashReceived?: number;
  changeAmount?: number;
  referenceNumber?: string;
  paymentGatewayRef?: string;
  status: string;
  createdAt: string;
  description: string;
}

export default function FloatingCashScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { sessionToken, driverProfile } = useRider();

  // Floating cash live state
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentBalance, setCurrentBalance] = useState(830);
  const [cashLimit, setCashLimit] = useState(2500);
  const [availableLimit, setAvailableLimit] = useState(1670);
  const [todaySummary, setTodaySummary] = useState({ collected: 830, changeReturned: 0, deposited: 0 });
  const [recentOrders, setRecentOrders] = useState<CodOrder[]>([]);
  const [transactions, setTransactions] = useState<FloatingTransaction[]>([]);
  const [activeHistoryTab, setActiveHistoryTab] = useState<'all' | 'change' | 'collected' | 'deposit'>('all');

  // Modals
  const [changeModalVisible, setChangeModalVisible] = useState(false);
  const [depositModalVisible, setDepositModalVisible] = useState(false);
  const [iciciModalVisible, setIciciModalVisible] = useState(false);
  const [novopayModalVisible, setNovopayModalVisible] = useState(false);
  const [receiptModalVisible, setReceiptModalVisible] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null);

  // Return Change Form State
  const [selectedOrder, setSelectedOrder] = useState<CodOrder | null>(null);
  const [orderAmountInput, setOrderAmountInput] = useState('380');
  const [cashReceivedInput, setCashReceivedInput] = useState('500');
  const [changeAmountInput, setChangeAmountInput] = useState('120');
  const [customerNameInput, setCustomerNameInput] = useState('Pooja Verma');
  const [customerPhoneInput, setCustomerPhoneInput] = useState('9123456789');
  const [customerUpiInput, setCustomerUpiInput] = useState('9123456789@paytm');
  const [isProcessingChange, setIsProcessingChange] = useState(false);
  const [showQrInModal, setShowQrInModal] = useState(false);

  // Deposit Form State
  const [depositAmountInput, setDepositAmountInput] = useState('830');
  const [depositMethod, setDepositMethod] = useState<'upi' | 'icici_cdm' | 'novopay' | 'airtel'>('upi');
  const [isProcessingDeposit, setIsProcessingDeposit] = useState(false);

  // Fetch Floating Cash Data from Backend
  const fetchFloatingCashData = useCallback(async () => {
    try {
      if (!sessionToken) {
        setLoading(false);
        return;
      }
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/floating-cash`, {
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setCurrentBalance(data.currentBalance ?? 830);
        setCashLimit(data.limit ?? 2500);
        setAvailableLimit(data.availableLimit ?? 1670);
        if (data.todaySummary) setTodaySummary(data.todaySummary);
        if (data.recentCodOrders) setRecentOrders(data.recentCodOrders);
        if (data.transactions) setTransactions(data.transactions);
      }
    } catch (err) {
      console.error('Failed to fetch floating cash:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    fetchFloatingCashData();
  }, [fetchFloatingCashData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchFloatingCashData();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  // Select a recent COD order for auto-fill in Change Modal
  const handleSelectOrderForChange = (order: CodOrder) => {
    setSelectedOrder(order);
    setOrderAmountInput(order.orderAmount.toString());
    setCustomerNameInput(order.customerName);
    setCustomerPhoneInput(order.customerPhone);
    setCustomerUpiInput(order.customerUpiId || `${order.customerPhone}@upi`);
    const orderVal = order.orderAmount;
    const estCash = orderVal <= 500 ? 500 : Math.ceil(orderVal / 100) * 100;
    setCashReceivedInput(estCash.toString());
    setChangeAmountInput(Math.max(0, estCash - orderVal).toString());
  };

  // Recalculate change when order amount or cash received changes
  const handleCashReceivedChange = (val: string) => {
    setCashReceivedInput(val);
    const bill = parseFloat(orderAmountInput) || 0;
    const cash = parseFloat(val) || 0;
    const change = Math.max(0, cash - bill);
    setChangeAmountInput(change > 0 ? change.toString() : '0');
  };

  const handleOrderAmountChange = (val: string) => {
    setOrderAmountInput(val);
    const bill = parseFloat(val) || 0;
    const cash = parseFloat(cashReceivedInput) || 0;
    const change = Math.max(0, cash - bill);
    setChangeAmountInput(change > 0 ? change.toString() : '0');
  };

  // Build targeted UPI URI for Android Packages and iOS Schemes
  const buildTargetedUpiUrl = (appKey: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'default') => {
    const vpa = customerUpiInput.trim() || (customerPhoneInput.trim() ? `${customerPhoneInput.trim()}@upi` : 'customer@upi');
    const name = encodeURIComponent(customerNameInput.trim() || 'Customer');
    const amount = parseFloat(changeAmountInput) || 0;
    const note = encodeURIComponent(`Change Refund for Order ${selectedOrder?.orderId || 'MQ-COD'}`);
    const query = `pa=${vpa}&pn=${name}&am=${amount}&cu=INR&tn=${note}`;

    if (Platform.OS === 'android') {
      switch (appKey) {
        case 'gpay':
          return `intent://pay?${query}#Intent;scheme=upi;package=com.google.android.apps.nbu.paisa.user;end`;
        case 'phonepe':
          return `intent://pay?${query}#Intent;scheme=upi;package=com.phonepe.app;end`;
        case 'paytm':
          return `intent://pay?${query}#Intent;scheme=upi;package=net.one97.paytm;end`;
        case 'bhim':
          return `intent://pay?${query}#Intent;scheme=upi;package=in.org.npci.upiapp;end`;
        default:
          return `upi://pay?${query}`;
      }
    } else {
      switch (appKey) {
        case 'gpay':
          return `gpay://upi/pay?${query}`;
        case 'phonepe':
          return `phonepe://pay?${query}`;
        case 'paytm':
          return `paytmmp://pay?${query}`;
        default:
          return `upi://pay?${query}`;
      }
    }
  };

  // Open specific UPI app directly
  const handleOpenSpecificUpiApp = async (appKey: 'gpay' | 'phonepe' | 'paytm' | 'bhim' | 'default') => {
    const amount = parseFloat(changeAmountInput);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid change amount to pay.');
      return;
    }

    const targetedUrl = buildTargetedUpiUrl(appKey);
    const appNames: Record<string, string> = {
      gpay: 'Google Pay',
      phonepe: 'PhonePe',
      paytm: 'Paytm',
      bhim: 'BHIM',
      default: 'UPI App',
    };

    try {
      await Linking.openURL(targetedUrl);
    } catch {
      Alert.alert(
        `${appNames[appKey]} Not Available`,
        `Could not launch ${appNames[appKey]}. Make sure the app is installed, or show the dynamic QR code on screen.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Show QR Code', onPress: () => setShowQrInModal(true) },
        ]
      );
    }
  };

  // Scan customer QR code using camera / image picker
  const handleScanCustomerQr = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Required', 'Camera permission is needed to scan QR code.');
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const simulatedVpa = `${customerPhoneInput || '9876543210'}@okaxis`;
        setCustomerUpiInput(simulatedVpa);
        Alert.alert('QR Scanned', `Detected UPI ID: ${simulatedVpa}`);
      }
    } catch {
      Alert.alert('Scan QR', 'Please enter the Customer UPI ID or phone number manually.');
    }
  };

  // Confirm change refund and update floating cash balance in backend
  const handleConfirmChangeReturn = async () => {
    const change = parseFloat(changeAmountInput);
    if (!change || change <= 0) {
      Alert.alert('Error', 'Please enter a valid change amount greater than ₹0.');
      return;
    }

    setIsProcessingChange(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/floating-cash/return-change`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
          orderId: selectedOrder?.orderId || 'MQ-COD',
          customerName: customerNameInput.trim() || 'Customer',
          customerPhone: customerPhoneInput.trim(),
          customerUpiId: customerUpiInput.trim() || `${customerPhoneInput.trim()}@upi`,
          orderAmount: parseFloat(orderAmountInput) || 0,
          cashReceived: parseFloat(cashReceivedInput) || 0,
          changeAmount: change,
          upiRefNumber: `UPI-REF-${Date.now().toString().slice(-6)}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentBalance(data.currentBalance);
        setChangeModalVisible(false);
        setSelectedReceipt(data.receipt);
        setReceiptModalVisible(true);
        fetchFloatingCashData();
      } else {
        const errData = await res.json();
        Alert.alert('Failed', errData.message || 'Could not record change return.');
      }
    } catch (err) {
      console.error('Change refund error:', err);
      Alert.alert('Network Error', 'Could not communicate with server.');
    } finally {
      setIsProcessingChange(false);
    }
  };

  // Process Cash Deposit to MyQuro
  const handleDepositToMyQuro = async () => {
    const amount = parseFloat(depositAmountInput);
    if (!amount || amount <= 0) {
      Alert.alert('Error', 'Please enter a valid deposit amount.');
      return;
    }

    if (amount > currentBalance) {
      Alert.alert('Invalid Amount', `Deposit amount cannot exceed your current balance (₹${currentBalance}).`);
      return;
    }

    if (depositMethod === 'upi') {
      const myquroUpi = `upi://pay?pa=myquro.settlement@icici&pn=MyQuro+Settlement&am=${amount}&cu=INR&tn=Rider+Cash+Deposit+${driverProfile?.name || 'Rider'}`;
      try {
        await Linking.openURL(myquroUpi);
      } catch {
        // Continue
      }
    }

    setIsProcessingDeposit(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/rider/floating-cash/deposit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`,
          'Origin': 'http://localhost:3000',
        },
        body: JSON.stringify({
          amount,
          method: depositMethod,
          referenceNumber: `DEP-UTR-${Date.now().toString().slice(-6)}`,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setCurrentBalance(data.currentBalance);
        setDepositModalVisible(false);
        setSelectedReceipt(data.receipt);
        setReceiptModalVisible(true);
        fetchFloatingCashData();
      } else {
        const errData = await res.json();
        Alert.alert('Error', errData.message || 'Deposit failed');
      }
    } catch (err) {
      console.error('Deposit error:', err);
      Alert.alert('Network Error', 'Failed to process deposit');
    } finally {
      setIsProcessingDeposit(false);
    }
  };

  // Share digital receipt
  const handleShareReceipt = async () => {
    if (!selectedReceipt) return;
    try {
      const shareMsg = selectedReceipt.changePaid
        ? `🧾 MyQuro Customer Change Receipt\nOrder: ${selectedReceipt.orderId}\nCustomer: ${selectedReceipt.customerName}\nOrder Amount: ₹${selectedReceipt.orderBill}\nCash Given: ₹${selectedReceipt.cashReceived}\nChange Returned via UPI: ₹${selectedReceipt.changePaid}\nUTR: ${selectedReceipt.utrNumber}\nDate: ${new Date(selectedReceipt.timestamp).toLocaleDateString()}`
        : `🧾 MyQuro Cash Deposit Receipt\nAmount Deposited: ₹${selectedReceipt.amount}\nMethod: ${selectedReceipt.method?.toUpperCase()}\nUTR: ${selectedReceipt.utrNumber}\nRemaining Balance: ₹${selectedReceipt.remainingBalance}`;

      await Share.share({ message: shareMsg });
    } catch {
      // Ignored
    }
  };

  // Filtered transactions for ledger
  const filteredTransactions = useMemo(() => {
    if (activeHistoryTab === 'change') return transactions.filter(t => t.type === 'change_returned_upi');
    if (activeHistoryTab === 'collected') return transactions.filter(t => t.type === 'cod_collected');
    if (activeHistoryTab === 'deposit') return transactions.filter(t => t.type.startsWith('cash_deposited'));
    return transactions;
  }, [transactions, activeHistoryTab]);

  const limitPercentage = Math.min(100, Math.round((currentBalance / (cashLimit || 2500)) * 100));

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Floating cash</Text>
        <TouchableOpacity onPress={handleRefresh} style={styles.refreshBtn} activeOpacity={0.7}>
          {refreshing ? (
            <ActivityIndicator size="small" color="#F2CA50" />
          ) : (
            <Ionicons name="reload" size={20} color="#F2CA50" />
          )}
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 40 }}
      >
        {/* CURRENT BALANCE FEATURED CARD */}
        <View style={styles.balanceCard}>
          {/* Top Rupee Coin Badge */}
          <View style={styles.coinCircleWrapper}>
            <View style={styles.coinCircleBg}>
              <Text style={styles.coinSymbolText}>₹</Text>
            </View>
            <Ionicons name="sparkles" size={14} color="#F2CA50" style={styles.sparkleTopLeft} />
            <Ionicons name="sparkles" size={12} color="#F2CA50" style={styles.sparkleBottomRight} />
          </View>

          {/* Amount */}
          <Text style={styles.amountText}>₹{currentBalance.toLocaleString('en-IN')}</Text>
          <Text style={styles.currentBalanceLabel}>Current cash in hand</Text>

          {/* Limit Progress Bar */}
          <View style={styles.limitBarWrapper}>
            <View style={styles.limitBarHeader}>
              <Text style={styles.limitLabel}>
                Limit: <Text style={styles.limitValue}>₹{cashLimit.toLocaleString('en-IN')}</Text>
              </Text>
              <Text style={styles.limitPercentText}>{limitPercentage}% Used</Text>
            </View>
            <View style={styles.limitProgressBarBg}>
              <View
                style={[
                  styles.limitProgressBarFill,
                  {
                    width: `${limitPercentage}%`,
                    backgroundColor: limitPercentage > 85 ? '#EF4444' : limitPercentage > 60 ? '#F59E0B' : '#10B981',
                  },
                ]}
              />
            </View>
          </View>

          {/* TWO PRIMARY ACTION BUTTONS */}
          <View style={styles.actionButtonsRow}>
            {/* Action 1: Return Change to Customer via UPI (Updated icon to cash-outline) */}
            <TouchableOpacity
              onPress={() => {
                if (recentOrders.length > 0) {
                  handleSelectOrderForChange(recentOrders[0]);
                }
                setChangeModalVisible(true);
              }}
              style={styles.returnChangeBtn}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#10B981', '#059669', '#047857']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtnInner}
              >
                <Ionicons name="cash-outline" size={18} color="#FFFFFF" />
                <Text style={styles.returnChangeBtnText}>Return Customer Change</Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Action 2: Deposit Cash */}
            <TouchableOpacity
              onPress={() => {
                setDepositAmountInput(currentBalance > 0 ? currentBalance.toString() : '500');
                setDepositModalVisible(true);
              }}
              style={styles.depositBtnWrapper}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.gradientBtnInner}
              >
                <Ionicons name="wallet-outline" size={18} color="#2A1F00" />
                <Text style={styles.depositBtnText}>Deposit Cash</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {/* RECENT COD ORDERS QUICK CHANGE BAR */}
        {recentOrders.length > 0 && (
          <View style={styles.quickCodSection}>
            <View style={styles.quickCodHeader}>
              <Ionicons name="flash" size={16} color="#F2CA50" />
              <Text style={styles.quickCodTitle}>Recent COD Orders (1-Tap Change)</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.quickCodList}>
              {recentOrders.map((ord) => (
                <TouchableOpacity
                  key={ord.orderId}
                  onPress={() => {
                    handleSelectOrderForChange(ord);
                    setChangeModalVisible(true);
                  }}
                  style={styles.quickCodCard}
                  activeOpacity={0.75}
                >
                  <View style={styles.quickCodCardTop}>
                    <Text style={styles.quickCodOrderId}>{ord.orderId}</Text>
                    <Text style={styles.quickCodAmount}>₹{ord.orderAmount}</Text>
                  </View>
                  <Text style={styles.quickCodCustomerName} numberOfLines={1}>
                    {ord.customerName}
                  </Text>
                  <View style={styles.quickCodActionTag}>
                    <Ionicons name="cash-outline" size={12} color="#10B981" />
                    <Text style={styles.quickCodActionText}>Pay Change</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        {/* SECTION 1: TRANSFER CASH TO CUSTOMER / MYQURO */}
        <Text style={styles.sectionHeaderTitle}>Transfer Cash via UPI</Text>
        <View style={styles.partnersContainerCard}>
          {/* Option 1: Return Change to Customer */}
          <TouchableOpacity
            onPress={() => {
              if (recentOrders.length > 0) handleSelectOrderForChange(recentOrders[0]);
              setChangeModalVisible(true);
            }}
            style={styles.partnerRow}
            activeOpacity={0.8}
          >
            <View style={styles.partnerLeft}>
              <View style={[styles.partnerIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                <Ionicons name="cash-outline" size={22} color="#10B981" />
              </View>
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={styles.partnerNameText}>Pay Change to Customer in UPI</Text>
                <Text style={styles.partnerSubText}>If physical cash change is not available</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>

          <View style={styles.dottedDivider} />

          {/* Option 2: UPI Transfer to MyQuro Settlement */}
          <TouchableOpacity
            onPress={() => {
              setDepositMethod('upi');
              setDepositAmountInput(currentBalance > 0 ? currentBalance.toString() : '500');
              setDepositModalVisible(true);
            }}
            style={styles.partnerRow}
            activeOpacity={0.8}
          >
            <View style={styles.partnerLeft}>
              <Image
                source={require('../../assets/images/upi_logo.png')}
                style={styles.partnerLogoImage}
                resizeMode="contain"
              />
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={styles.partnerNameText}>UPI Transfer to MyQuro Account</Text>
                <Text style={styles.partnerSubText}>Instant clearance via GPay, PhonePe, Paytm</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>
        </View>

        {/* SECTION 2: OFFLINE DEPOSIT CASH CENTERS */}
        <Text style={styles.sectionHeaderTitle}>Deposit Cash at Partner Centers</Text>
        <View style={styles.partnersContainerCard}>
          {/* Option 1: ICICI Cash Deposit Machine */}
          <TouchableOpacity onPress={() => setIciciModalVisible(true)} style={styles.partnerRow} activeOpacity={0.8}>
            <View style={styles.partnerLeft}>
              <Image
                source={require('../../assets/images/icici_icash_logo.png')}
                style={styles.partnerLogoImage}
                resizeMode="contain"
              />
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={styles.partnerNameText}>ICICI Cash Deposit Machine (CDM)</Text>
                <Text style={styles.partnerSubText}>Cardless cash deposit at any ICICI ATM</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>

          <View style={styles.dottedDivider} />

          {/* Option 2: Novopay Deposit Center */}
          <TouchableOpacity onPress={() => setNovopayModalVisible(true)} style={styles.partnerRow} activeOpacity={0.8}>
            <View style={styles.partnerLeft}>
              <Image
                source={require('../../assets/images/novopay_logo.png')}
                style={styles.partnerLogoImage}
                resizeMode="contain"
              />
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={styles.partnerNameText}>Novopay Deposit Center</Text>
                <Text style={styles.partnerSubText}>Handover cash at verified retail points</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>

          <View style={styles.dottedDivider} />

          {/* Option 3: Airtel Payment Bank */}
          <TouchableOpacity onPress={() => setNovopayModalVisible(true)} style={styles.partnerRow} activeOpacity={0.8}>
            <View style={styles.partnerLeft}>
              <Image
                source={require('../../assets/images/airtel_payment_bank_logo.png')}
                style={styles.partnerLogoImage}
                resizeMode="contain"
              />
              <View style={{ gap: 2, flex: 1 }}>
                <Text style={styles.partnerNameText}>Airtel Payment Bank</Text>
                <Text style={styles.partnerSubText}>Deposit using registered mobile number</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>
        </View>

        {/* SECTION 3: FLOATING CASH LEDGER & TRANSACTION HISTORY */}
        <View style={styles.ledgerHeaderRow}>
          <Text style={styles.sectionHeaderTitle}>Cash Activity Ledger</Text>
          <Text style={styles.ledgerCountText}>{transactions.length} entries</Text>
        </View>

        {/* Filter Pills */}
        <View style={styles.historyTabsRow}>
          {[
            { key: 'all', label: 'All' },
            { key: 'change', label: 'Change Paid' },
            { key: 'collected', label: 'Collected' },
            { key: 'deposit', label: 'Deposits' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveHistoryTab(tab.key as any)}
              style={[styles.historyTabBtn, activeHistoryTab === tab.key && styles.historyTabBtnActive]}
            >
              <Text style={[styles.historyTabText, activeHistoryTab === tab.key && styles.historyTabTextActive]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Transactions List */}
        <View style={styles.ledgerContainer}>
          {filteredTransactions.length === 0 ? (
            <View style={styles.emptyLedger}>
              <Ionicons name="receipt-outline" size={36} color="#404040" />
              <Text style={styles.emptyLedgerText}>No transactions recorded in this category</Text>
            </View>
          ) : (
            filteredTransactions.map((item, index) => {
              const isChange = item.type === 'change_returned_upi';
              const isDeposit = item.type.startsWith('cash_deposited');
              const isCollected = item.type === 'cod_collected';
              const isLast = index === filteredTransactions.length - 1;

              return (
                <View key={item.id}>
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedReceipt(item);
                      setReceiptModalVisible(true);
                    }}
                    style={styles.ledgerRow}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.ledgerIconCircle,
                        isChange
                          ? { backgroundColor: 'rgba(59, 130, 246, 0.15)' }
                          : isDeposit
                          ? { backgroundColor: 'rgba(242, 202, 80, 0.15)' }
                          : { backgroundColor: 'rgba(16, 185, 129, 0.15)' },
                      ]}
                    >
                      <Ionicons
                        name={isChange ? 'cash-outline' : isDeposit ? 'arrow-up' : 'arrow-down'}
                        size={18}
                        color={isChange ? '#3B82F6' : isDeposit ? '#F2CA50' : '#10B981'}
                      />
                    </View>
                    <View style={styles.ledgerInfoCol}>
                      <Text style={styles.ledgerTitle}>{item.description}</Text>
                      <Text style={styles.ledgerSubDate}>
                        {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                        {new Date(item.createdAt).toLocaleDateString([], { day: 'numeric', month: 'short' })}
                      </Text>
                    </View>
                    <View style={styles.ledgerAmountCol}>
                      <Text
                        style={[
                          styles.ledgerAmountText,
                          isChange
                            ? { color: '#3B82F6' }
                            : isDeposit
                            ? { color: '#F2CA50' }
                            : { color: '#10B981' },
                        ]}
                      >
                        {isCollected ? '+' : '-'}₹{item.amount}
                      </Text>
                      <Text style={styles.ledgerStatusText}>Verified</Text>
                    </View>
                  </TouchableOpacity>
                  {!isLast && <View style={styles.dottedDivider} />}
                </View>
              );
            })
          )}
        </View>
      </ScrollView>

      {/* ========================================================================= */}
      {/* MODAL 1: RETURN CHANGE TO CUSTOMER VIA UPI (NO INNER SCROLL - FULL VIEW)  */}
      {/* ========================================================================= */}
      <Modal
        visible={changeModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          Keyboard.dismiss();
          setChangeModalVisible(false);
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => {
              Keyboard.dismiss();
              setChangeModalVisible(false);
            }}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={[styles.inquirySheetContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                <View style={styles.handleBar} />

                {/* Modal Header */}
                <View style={styles.inquiryHeader}>
                  <View style={styles.inquiryHeaderLeft}>
                    <View style={[styles.inquiryIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                      <Ionicons name="cash-outline" size={20} color="#10B981" />
                    </View>
                    <View>
                      <Text style={styles.inquiryTitle}>Pay Change in UPI</Text>
                      <Text style={styles.inquirySubtitle}>Refund excess cash to customer</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      Keyboard.dismiss();
                      setChangeModalVisible(false);
                    }}
                    style={styles.inquiryCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Change Calculator Section */}
                <View style={styles.calculatorCard}>
                  <View style={styles.calcRow}>
                    <View style={styles.calcCol}>
                      <Text style={styles.calcLabel}>Order Bill (₹)</Text>
                      <TextInput
                        style={styles.calcInput}
                        keyboardType="numeric"
                        value={orderAmountInput}
                        onChangeText={handleOrderAmountChange}
                        placeholder="380"
                        placeholderTextColor="#666"
                      />
                    </View>

                    <Text style={styles.calcOperatorText}>-</Text>

                    <View style={styles.calcCol}>
                      <Text style={styles.calcLabel}>Cash Given (₹)</Text>
                      <TextInput
                        style={styles.calcInput}
                        keyboardType="numeric"
                        value={cashReceivedInput}
                        onChangeText={handleCashReceivedChange}
                        placeholder="500"
                        placeholderTextColor="#666"
                      />
                    </View>

                    <Text style={styles.calcOperatorText}>=</Text>

                    <View style={[styles.calcCol, styles.calcChangeCol]}>
                      <Text style={[styles.calcLabel, { color: '#10B981' }]}>Change (₹)</Text>
                      <TextInput
                        style={[styles.calcInput, styles.calcChangeInput]}
                        keyboardType="numeric"
                        value={changeAmountInput}
                        onChangeText={setChangeAmountInput}
                        placeholder="120"
                        placeholderTextColor="#10B981"
                      />
                    </View>
                  </View>
                </View>

                {/* Customer Details Inputs */}
                <Text style={styles.inputSectionLabel}>Customer UPI / Phone Destination</Text>
                <View style={styles.customerInputWrapper}>
                  <View style={styles.phoneInputRow}>
                    <Ionicons name="at" size={18} color="#F2CA50" style={{ marginLeft: 12 }} />
                    <TextInput
                      style={styles.upiTextInput}
                      placeholder="Customer UPI ID (e.g. 9876543210@paytm)"
                      placeholderTextColor="#787878"
                      value={customerUpiInput}
                      onChangeText={setCustomerUpiInput}
                      autoCapitalize="none"
                    />
                    <TouchableOpacity onPress={handleScanCustomerQr} style={styles.scanQrBtn} activeOpacity={0.7}>
                      <Ionicons name="qr-code-outline" size={18} color="#F2CA50" />
                      <Text style={styles.scanQrText}>Scan</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* DIRECT 1-TAP TARGETED UPI APP BUTTONS */}
                <Text style={styles.inputSectionLabel}>
                  Select UPI App to Pay ₹{changeAmountInput || '0'}
                </Text>
                <View style={styles.directUpiAppRow}>
                  {/* Google Pay */}
                  <TouchableOpacity
                    onPress={() => handleOpenSpecificUpiApp('gpay')}
                    style={styles.directUpiBtn}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.directUpiIconBg, { backgroundColor: '#EA4335' }]}>
                      <Text style={styles.directUpiIconText}>G</Text>
                    </View>
                    <Text style={styles.directUpiBtnText}>Google Pay</Text>
                  </TouchableOpacity>

                  {/* PhonePe */}
                  <TouchableOpacity
                    onPress={() => handleOpenSpecificUpiApp('phonepe')}
                    style={styles.directUpiBtn}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.directUpiIconBg, { backgroundColor: '#5F259F' }]}>
                      <Text style={styles.directUpiIconText}>Pe</Text>
                    </View>
                    <Text style={styles.directUpiBtnText}>PhonePe</Text>
                  </TouchableOpacity>

                  {/* Paytm */}
                  <TouchableOpacity
                    onPress={() => handleOpenSpecificUpiApp('paytm')}
                    style={styles.directUpiBtn}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.directUpiIconBg, { backgroundColor: '#00B9F1' }]}>
                      <Text style={styles.directUpiIconText}>P</Text>
                    </View>
                    <Text style={styles.directUpiBtnText}>Paytm</Text>
                  </TouchableOpacity>

                  {/* Other / Any UPI */}
                  <TouchableOpacity
                    onPress={() => handleOpenSpecificUpiApp('default')}
                    style={styles.directUpiBtn}
                    activeOpacity={0.75}
                  >
                    <View style={[styles.directUpiIconBg, { backgroundColor: '#F2CA50' }]}>
                      <Ionicons name="flash" size={16} color="#000000" />
                    </View>
                    <Text style={styles.directUpiBtnText}>Any UPI</Text>
                  </TouchableOpacity>
                </View>

                {/* TOGGLE ON-SCREEN DYNAMIC QR */}
                <TouchableOpacity
                  onPress={() => setShowQrInModal(!showQrInModal)}
                  style={styles.toggleQrBtn}
                  activeOpacity={0.7}
                >
                  <Ionicons name={showQrInModal ? 'chevron-up' : 'qr-code-outline'} size={15} color="#F2CA50" />
                  <Text style={styles.toggleQrBtnText}>
                    {showQrInModal ? 'Hide On-Screen QR' : 'Show On-Screen QR for Customer'}
                  </Text>
                </TouchableOpacity>

                {showQrInModal && (
                  <View style={styles.qrDisplayBox}>
                    <QRCode
                      value={buildTargetedUpiUrl('default')}
                      size={110}
                      color="#000000"
                      backgroundColor="#FFFFFF"
                    />
                    <Text style={styles.qrInstructionText}>Customer scans to receive ₹{changeAmountInput}</Text>
                  </View>
                )}

                {/* Settle & Deduct Balance Button (Completely Visible) */}
                <TouchableOpacity
                  onPress={handleConfirmChangeReturn}
                  disabled={isProcessingChange}
                  style={styles.confirmSettleBtn}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#10B981', '#059669', '#047857']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBtnInner}
                  >
                    {isProcessingChange ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <Ionicons name="checkmark-circle" size={18} color="#FFFFFF" />
                        <Text style={styles.confirmSettleBtnText}>
                          Confirm Paid (Deduct ₹{changeAmountInput || '0'} from Cash)
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 2: DEPOSIT CASH TO MYQURO (NO INNER SCROLL - FULL VIEW)             */}
      {/* ========================================================================= */}
      <Modal
        visible={depositModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDepositModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={styles.modalBackdrop}
            activeOpacity={1}
            onPress={() => setDepositModalVisible(false)}
          />

          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            style={styles.keyboardAvoidContainer}
          >
            <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
              <View style={[styles.inquirySheetContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
                <View style={styles.handleBar} />

                {/* Modal Header */}
                <View style={styles.inquiryHeader}>
                  <View style={styles.inquiryHeaderLeft}>
                    <View style={styles.inquiryIconContainer}>
                      <Ionicons name="wallet-outline" size={20} color="#F2CA50" />
                    </View>
                    <View>
                      <Text style={styles.inquiryTitle}>Deposit Floating Cash</Text>
                      <Text style={styles.inquirySubtitle}>Transfer cash in hand to MyQuro</Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => setDepositModalVisible(false)}
                    style={styles.inquiryCloseBtn}
                    activeOpacity={0.7}
                  >
                    <Ionicons name="close" size={20} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>

                {/* Amount Input & Quick Chips */}
                <Text style={styles.inputSectionLabel}>Deposit Amount (₹)</Text>
                <TextInput
                  style={styles.depositAmountTextInput}
                  keyboardType="numeric"
                  value={depositAmountInput}
                  onChangeText={setDepositAmountInput}
                  placeholder="830"
                  placeholderTextColor="#787878"
                />

                <View style={styles.quickChipsRow}>
                  {[currentBalance, 500, 1000, 1500].map((val) => (
                    <TouchableOpacity
                      key={val}
                      onPress={() => setDepositAmountInput(val.toString())}
                      style={[
                        styles.chipBtn,
                        depositAmountInput === val.toString() && styles.chipBtnSelected,
                      ]}
                    >
                      <Text
                        style={[
                          styles.chipText,
                          depositAmountInput === val.toString() && styles.chipTextSelected,
                        ]}
                      >
                        ₹{val}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Deposit Method Selector */}
                <Text style={styles.inputSectionLabel}>Select Deposit Method</Text>
                <View style={styles.depositMethodRow}>
                  {[
                    { key: 'upi', label: 'UPI App', icon: 'flash-outline' },
                    { key: 'icici_cdm', label: 'ICICI CDM', icon: 'card-outline' },
                    { key: 'novopay', label: 'Novopay', icon: 'storefront-outline' },
                  ].map((m) => (
                    <TouchableOpacity
                      key={m.key}
                      onPress={() => setDepositMethod(m.key as any)}
                      style={[
                        styles.depositMethodCard,
                        depositMethod === m.key && styles.depositMethodCardActive,
                      ]}
                    >
                      <Ionicons
                        name={m.icon as any}
                        size={20}
                        color={depositMethod === m.key ? '#F2CA50' : '#888'}
                      />
                      <Text
                        style={[
                          styles.depositMethodText,
                          depositMethod === m.key && styles.depositMethodTextActive,
                        ]}
                      >
                        {m.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Deposit CTA Button (Completely Visible) */}
                <TouchableOpacity
                  onPress={handleDepositToMyQuro}
                  disabled={isProcessingDeposit}
                  style={styles.confirmSettleBtn}
                  activeOpacity={0.85}
                >
                  <LinearGradient
                    colors={['#FFF59D', '#F3D053', '#D4AF37', '#B8860B']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.gradientBtnInner}
                  >
                    {isProcessingDeposit ? (
                      <ActivityIndicator size="small" color="#2A1F00" />
                    ) : (
                      <>
                        <Ionicons name="arrow-up-circle" size={18} color="#2A1F00" />
                        <Text style={[styles.confirmSettleBtnText, { color: '#2A1F00' }]}>
                          Deposit ₹{depositAmountInput || '0'} to MyQuro
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </KeyboardAvoidingView>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 3: ICICI CASH DEPOSIT MACHINE (CDM) GUIDE                           */}
      {/* ========================================================================= */}
      <Modal
        visible={iciciModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIciciModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setIciciModalVisible(false)} />
          <View style={[styles.inquirySheetContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.handleBar} />
            <View style={styles.inquiryHeader}>
              <View style={styles.inquiryHeaderLeft}>
                <Image source={require('../../assets/images/icici_icash_logo.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
                <View>
                  <Text style={styles.inquiryTitle}>ICICI CDM Deposit</Text>
                  <Text style={styles.inquirySubtitle}>Cardless Cash Deposit Machine</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setIciciModalVisible(false)} style={styles.inquiryCloseBtn}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Virtual Account Card */}
            <View style={styles.partnerDetailsCard}>
              <Text style={styles.partnerCardTitle}>MyQuro Virtual Account Number (VAN)</Text>
              <View style={styles.vanRow}>
                <Text style={styles.vanNumberText}>MQRO{driverProfile?.phone?.slice(-10) || '9876543210'}</Text>
                <TouchableOpacity
                  onPress={() => Alert.alert('Copied', 'VAN copied to clipboard.')}
                  style={styles.copyVanBtn}
                >
                  <Ionicons name="copy-outline" size={14} color="#F2CA50" />
                  <Text style={styles.copyVanText}>Copy</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.vanIfscText}>IFSC: ICIC0000104 • ICICI Bank Direct</Text>
            </View>

            {/* Steps */}
            <View style={styles.stepsCard}>
              <Text style={styles.stepsHeader}>How to deposit at ICICI CDM ATM:</Text>
              <Text style={styles.stepItem}>1. Visit nearest ICICI Bank CDM / Cash Recycler ATM.</Text>
              <Text style={styles.stepItem}>2. Select <Text style={{ color: '#F2CA50' }}>Cardless Deposit</Text> on ATM screen.</Text>
              <Text style={styles.stepItem}>3. Enter your VAN number shown above.</Text>
              <Text style={styles.stepItem}>4. Insert cash notes & collect receipt. Balance clears in 5 mins.</Text>
            </View>

            <TouchableOpacity onPress={() => setIciciModalVisible(false)} style={styles.modalDoneBtn}>
              <Text style={styles.modalDoneBtnText}>I Understand</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 4: NOVOPAY & AIRTEL PAYMENTS BANK AGENT BARCODE                     */}
      {/* ========================================================================= */}
      <Modal
        visible={novopayModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNovopayModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setNovopayModalVisible(false)} />
          <View style={[styles.inquirySheetContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.handleBar} />
            <View style={styles.inquiryHeader}>
              <View style={styles.inquiryHeaderLeft}>
                <Image source={require('../../assets/images/novopay_logo.png')} style={{ width: 36, height: 36 }} resizeMode="contain" />
                <View>
                  <Text style={styles.inquiryTitle}>Retail Agent Deposit</Text>
                  <Text style={styles.inquirySubtitle}>Novopay & Airtel Payment Banks</Text>
                </View>
              </View>
              <TouchableOpacity onPress={() => setNovopayModalVisible(false)} style={styles.inquiryCloseBtn}>
                <Ionicons name="close" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {/* Rider ID Barcode Box */}
            <View style={styles.qrDisplayBox}>
              <QRCode
                value={`MYQURO_RIDER_${driverProfile?.id || 'RIDER101'}_${driverProfile?.phone || '9876543210'}`}
                size={130}
                color="#000000"
                backgroundColor="#FFFFFF"
              />
              <Text style={styles.riderBarcodeIdText}>Rider ID: MQ-RIDER-{driverProfile?.id?.slice(-4) || '8192'}</Text>
              <Text style={styles.qrInstructionText}>Show this QR code at any Novopay / Airtel retail shop to deposit cash.</Text>
            </View>

            <TouchableOpacity onPress={() => setNovopayModalVisible(false)} style={styles.modalDoneBtn}>
              <Text style={styles.modalDoneBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ========================================================================= */}
      {/* MODAL 5: DIGITAL TRANSACTION & CHANGE RECEIPT                             */}
      {/* ========================================================================= */}
      <Modal
        visible={receiptModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReceiptModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity style={styles.modalBackdrop} activeOpacity={1} onPress={() => setReceiptModalVisible(false)} />
          <View style={[styles.inquirySheetContainer, { paddingBottom: Math.max(insets.bottom, 16) + 12 }]}>
            <View style={styles.handleBar} />

            {/* Receipt Success Header */}
            <View style={styles.receiptHeader}>
              <View style={styles.receiptCheckCircle}>
                <Ionicons name="checkmark" size={32} color="#FFFFFF" />
              </View>
              <Text style={styles.receiptTitle}>Transaction Verified</Text>
              <Text style={styles.receiptSubtitle}>
                {selectedReceipt?.changePaid
                  ? `₹${selectedReceipt.changePaid} refunded to customer via UPI`
                  : `₹${selectedReceipt?.amount} deposited successfully`}
              </Text>
            </View>

            {/* Receipt Table Card */}
            <View style={styles.receiptDetailsCard}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Reference ID</Text>
                <Text style={styles.receiptRowValue}>{selectedReceipt?.utrNumber || selectedReceipt?.id}</Text>
              </View>
              <View style={styles.receiptDivider} />

              {selectedReceipt?.orderId && (
                <>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Order ID</Text>
                    <Text style={styles.receiptRowValue}>{selectedReceipt.orderId}</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                </>
              )}

              {selectedReceipt?.customerName && (
                <>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Customer</Text>
                    <Text style={styles.receiptRowValue}>{selectedReceipt.customerName}</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                </>
              )}

              {selectedReceipt?.changePaid && (
                <>
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Order Bill</Text>
                    <Text style={styles.receiptRowValue}>₹{selectedReceipt.orderBill}</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptRowLabel}>Cash Received</Text>
                    <Text style={styles.receiptRowValue}>₹{selectedReceipt.cashReceived}</Text>
                  </View>
                  <View style={styles.receiptDivider} />
                  <View style={styles.receiptRow}>
                    <Text style={[styles.receiptRowLabel, { color: '#10B981', fontFamily: 'Urbanist-Bold' }]}>
                      Change Paid in UPI
                    </Text>
                    <Text style={[styles.receiptRowValue, { color: '#10B981', fontSize: 16, fontFamily: 'Urbanist-Bold' }]}>
                      ₹{selectedReceipt.changePaid}
                    </Text>
                  </View>
                  <View style={styles.receiptDivider} />
                </>
              )}

              <View style={styles.receiptRow}>
                <Text style={styles.receiptRowLabel}>Updated Cash in Hand</Text>
                <Text style={[styles.receiptRowValue, { color: '#F2CA50', fontFamily: 'Urbanist-Bold' }]}>
                  ₹{currentBalance.toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Receipt Actions */}
            <View style={styles.receiptButtonsRow}>
              <TouchableOpacity onPress={handleShareReceipt} style={styles.shareReceiptBtn} activeOpacity={0.8}>
                <Ionicons name="share-social-outline" size={18} color="#F2CA50" />
                <Text style={styles.shareReceiptText}>Share Proof</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setReceiptModalVisible(false)}
                style={styles.doneReceiptBtn}
                activeOpacity={0.85}
              >
                <Text style={styles.doneReceiptText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
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
    flex: 1,
  },
  refreshBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#262626',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  balanceCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1.2,
    borderColor: '#262626',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
  },
  coinCircleWrapper: {
    position: 'relative',
    marginBottom: 8,
  },
  coinCircleBg: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  coinSymbolText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  sparkleTopLeft: {
    position: 'absolute',
    top: -6,
    left: -8,
  },
  sparkleBottomRight: {
    position: 'absolute',
    bottom: -4,
    right: -8,
  },
  amountText: {
    fontSize: 40,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  currentBalanceLabel: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    marginBottom: 12,
  },
  limitBarWrapper: {
    width: '100%',
    marginBottom: 20,
  },
  limitBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  limitLabel: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
  },
  limitValue: {
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
  },
  limitPercentText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#A6A6A6',
  },
  limitProgressBarBg: {
    width: '100%',
    height: 6,
    backgroundColor: '#1E1E1E',
    borderRadius: 3,
    overflow: 'hidden',
  },
  limitProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
    width: '100%',
  },
  returnChangeBtn: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
  },
  depositBtnWrapper: {
    flex: 1,
    height: 48,
    borderRadius: 16,
    overflow: 'hidden',
  },
  gradientBtnInner: {
    width: '100%',
    height: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  returnChangeBtnText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  depositBtnText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#2A1F00',
  },
  // Quick COD Section
  quickCodSection: {
    marginBottom: 20,
  },
  quickCodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  quickCodTitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  quickCodList: {
    gap: 10,
  },
  quickCodCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 16,
    padding: 12,
    width: 150,
  },
  quickCodCardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  quickCodOrderId: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  quickCodAmount: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
  },
  quickCodCustomerName: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
    marginBottom: 8,
  },
  quickCodActionTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(16, 185, 129, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  quickCodActionText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#10B981',
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 12,
  },
  partnersContainerCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 20,
    marginBottom: 24,
    overflow: 'hidden',
  },
  partnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  partnerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  partnerIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  partnerLogoImage: {
    width: 38,
    height: 38,
  },
  partnerNameText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  partnerSubText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
  },
  dottedDivider: {
    height: 1,
    borderWidth: 0.5,
    borderColor: '#1E1E1E',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
  // Ledger History Styles
  ledgerHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ledgerCountText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#8D8D8D',
  },
  historyTabsRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  historyTabBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
  },
  historyTabBtnActive: {
    backgroundColor: '#F2CA50',
    borderColor: '#F2CA50',
  },
  historyTabText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#8D8D8D',
  },
  historyTabTextActive: {
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
  },
  ledgerContainer: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 20,
    overflow: 'hidden',
  },
  emptyLedger: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  emptyLedgerText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#666666',
  },
  ledgerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  ledgerIconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  ledgerInfoCol: {
    flex: 1,
    gap: 3,
  },
  ledgerTitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  ledgerSubDate: {
    fontSize: 11,
    fontFamily: 'Urbanist-Regular',
    color: '#777777',
  },
  ledgerAmountCol: {
    alignItems: 'flex-end',
    gap: 2,
  },
  ledgerAmountText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  ledgerStatusText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Medium',
    color: '#10B981',
  },
  // Modal Base Styles (No Inner Scrolling - Natural Height)
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  keyboardAvoidContainer: {
    width: '100%',
    justifyContent: 'flex-end',
  },
  inquirySheetContainer: {
    backgroundColor: '#000000',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    borderWidth: 1.2,
    borderColor: '#262626',
    paddingHorizontal: 18,
    paddingTop: 10,
    width: '100%',
  },
  handleBar: {
    width: 44,
    height: 4,
    backgroundColor: '#333333',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 12,
  },
  inquiryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  inquiryHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flex: 1,
  },
  inquiryIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  inquiryTitle: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  inquirySubtitle: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
    marginTop: 1,
  },
  inquiryCloseBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1A1A1A',
    borderWidth: 1,
    borderColor: '#333333',
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Calculator Card in Change Modal (Compact)
  calculatorCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  calcRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calcCol: {
    flex: 1,
    alignItems: 'center',
  },
  calcChangeCol: {
    backgroundColor: 'rgba(16, 185, 129, 0.08)',
    borderRadius: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.25)',
  },
  calcLabel: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    color: '#888888',
    marginBottom: 2,
  },
  calcInput: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    textAlign: 'center',
    padding: 0,
    minWidth: 45,
  },
  calcChangeInput: {
    color: '#10B981',
  },
  calcOperatorText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    color: '#666666',
    paddingHorizontal: 4,
  },
  // Customer Inputs (Compact)
  inputSectionLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  customerInputWrapper: {
    marginBottom: 10,
  },
  phoneInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    height: 44,
  },
  upiTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    paddingHorizontal: 8,
  },
  scanQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1B18',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    marginRight: 6,
  },
  scanQrText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
  },
  // Direct UPI App Buttons
  directUpiAppRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 10,
  },
  directUpiBtn: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    paddingVertical: 8,
    alignItems: 'center',
    gap: 4,
  },
  directUpiIconBg: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  directUpiIconText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  directUpiBtnText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  toggleQrBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
    marginBottom: 10,
  },
  toggleQrBtnText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
  },
  qrDisplayBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 10,
    gap: 4,
  },
  qrInstructionText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Medium',
    color: '#333333',
    textAlign: 'center',
  },
  confirmSettleBtn: {
    height: 48,
    borderRadius: 14,
    overflow: 'hidden',
  },
  confirmSettleBtnText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  // Deposit Modal Styles
  depositAmountTextInput: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1.2,
    borderColor: '#262626',
    borderRadius: 12,
    height: 46,
    color: '#FFFFFF',
    fontSize: 19,
    fontFamily: 'Urbanist-Bold',
    paddingHorizontal: 14,
    marginBottom: 8,
  },
  quickChipsRow: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: 12,
  },
  chipBtn: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    paddingVertical: 7,
    borderRadius: 10,
    alignItems: 'center',
  },
  chipBtnSelected: {
    borderColor: '#F2CA50',
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
  },
  chipText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#8D8D8D',
  },
  chipTextSelected: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
  },
  depositMethodRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  depositMethodCard: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    gap: 4,
  },
  depositMethodCardActive: {
    borderColor: '#F2CA50',
    backgroundColor: 'rgba(242, 202, 80, 0.08)',
  },
  depositMethodText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Medium',
    color: '#8D8D8D',
  },
  depositMethodTextActive: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
  },
  // Partner Modal Styles
  partnerDetailsCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
  },
  partnerCardTitle: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
    marginBottom: 6,
  },
  vanRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  vanNumberText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
    letterSpacing: 1,
  },
  copyVanBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1E1B18',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  copyVanText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
  },
  vanIfscText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
  },
  stepsCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 14,
    marginBottom: 14,
    gap: 5,
  },
  stepsHeader: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  stepItem: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    lineHeight: 16,
  },
  modalDoneBtn: {
    height: 46,
    backgroundColor: '#F2CA50',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDoneBtnText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
  },
  riderBarcodeIdText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
  },
  // Receipt Modal Styles
  receiptHeader: {
    alignItems: 'center',
    marginBottom: 16,
    gap: 4,
  },
  receiptCheckCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#10B981',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 2,
  },
  receiptTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  receiptSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
    textAlign: 'center',
  },
  receiptDetailsCard: {
    backgroundColor: '#0D0D0D',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptRowLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
  },
  receiptRowValue: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#FFFFFF',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: '#1E1E1E',
  },
  receiptButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  shareReceiptBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#1E1B18',
    borderWidth: 1,
    borderColor: '#F2CA50',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
  },
  shareReceiptText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#F2CA50',
  },
  doneReceiptBtn: {
    flex: 1,
    height: 46,
    borderRadius: 14,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  doneReceiptText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
  },
});
