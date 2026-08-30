import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  KeyboardAvoidingView,
  StatusBar,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Svg, { Path, Rect, Circle, Line, G } from 'react-native-svg';
import {
  ArrowLeft,
  X,
  Plus,
  Trash2,
  CheckCircle2,
  CreditCard,
  Building,
  Smartphone,
  ShieldCheck,
} from 'lucide-react-native';

// ─── CRISP BRAND SVG BADGES ──────────────────────────────────────────────────

// Swiggy/MyQuro UPI Badge Icon
const UpiBadgeIcon = () => (
  <View style={styles.upiBadgeContainer}>
    <Svg width={28} height={18} viewBox="0 0 40 24" fill="none">
      <Rect x="0.5" y="0.5" width="39" height="23" rx="4.5" stroke="#4A453A" strokeWidth="1" />
      <Path d="M8 7h4v7a3 3 0 0 1-3 3H8V7z" fill="#D4AF37" />
      <Path d="M16 7h3v6h3V7h3v10h-3v-2h-3v2h-3V7z" fill="#EAEAEA" />
      <Path d="M29 7h6v3h-3v1h3v3h-3v3h-3V7z" fill="#D4AF37" />
    </Svg>
  </View>
);

// VISA Logo Badge
const VisaCardBadge = () => (
  <View style={styles.cardBadgeBox}>
    <Svg width={30} height={20} viewBox="0 0 36 24" fill="none">
      <Rect width="36" height="24" rx="4" fill="#1A1A24" stroke="#2E2E3E" strokeWidth="1" />
      <Text style={styles.visaText}>VISA</Text>
    </Svg>
  </View>
);

// Mastercard Logo Badge
const MastercardBadge = () => (
  <View style={styles.cardBadgeBox}>
    <Svg width={30} height={20} viewBox="0 0 36 24" fill="none">
      <Rect width="36" height="24" rx="4" fill="#1A1A24" stroke="#2E2E3E" strokeWidth="1" />
      <Circle cx="14" cy="12" r="6" fill="#EB001B" />
      <Circle cx="22" cy="12" r="6" fill="#F79E1B" opacity="0.85" />
    </Svg>
  </View>
);

// PhonePe Logo Badge
const PhonePeBadge = () => (
  <View style={[styles.walletBadgeBox, { backgroundColor: '#5F259F' }]}>
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 14.5h-2.5V9.5H8.8V7.8h4.7c1.7 0 2.8 1.1 2.8 2.6 0 1.3-.9 2.3-2.1 2.5l2.4 3.6H14.1l-2.1-3.3h-1.5v3.3h2.5z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);

// Mobikwik Logo Badge
const MobikwikBadge = () => (
  <View style={[styles.walletBadgeBox, { backgroundColor: '#00A8E8' }]}>
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M4 6h3.5l4.5 7 4.5-7H20v12h-3v-7l-4.5 7h-1L7 11v7H4V6z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);

// Amazon Pay Logo Badge
const AmazonPayBadge = () => (
  <View style={[styles.walletBadgeBox, { backgroundColor: '#232F3E', borderWidth: 1, borderColor: '#37475A' }]}>
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 16c2.5 1.5 6.5 1.5 9.5 0"
        stroke="#FF9900"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <Path
        d="M17.5 15.2l.5 1.8-1.8.3"
        stroke="#FF9900"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M9 7h6v2h-4v2h3.5v2H11v4H9V7z"
        fill="#FFFFFF"
      />
    </Svg>
  </View>
);

// Corporate / Bill to Company Badge
const BillToCompanyBadge = () => (
  <View style={[styles.walletBadgeBox, { backgroundColor: '#1A1817', borderWidth: 1, borderColor: '#D4AF37' }]}>
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="1.8">
      <Rect x="2" y="7" width="20" height="14" rx="3" />
      <Path d="M16 7V5a3 3 0 0 0-3-3h-2a3 3 0 0 0-3 3v2" />
      <Line x1="12" y1="11" x2="12" y2="13" />
      <Line x1="8" y1="12" x2="16" y2="12" />
    </Svg>
  </View>
);

// Gold Plus Icon
const GoldPlusSquare = ({ size = 20 }: { size?: number }) => (
  <View style={styles.goldPlusBox}>
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinecap="round">
      <Line x1="12" y1="6" x2="12" y2="18" />
      <Line x1="6" y1="12" x2="18" y2="12" />
    </Svg>
  </View>
);

// Dotted/Dashed Line Divider
const DashedDivider = () => (
  <View style={styles.dashedDividerWrapper}>
    <View style={styles.dashedLine} />
  </View>
);

interface PaymentsSubViewProps {
  isDarkMode?: boolean;
  paymentsList?: any[];
  onBack: () => void;
  showToast?: (msg: string) => void;
}

interface SavedCard {
  id: string;
  name: string;
  number: string;
  exp: string;
  brand?: 'visa' | 'mastercard' | 'other';
}

export const PaymentsSubView: React.FC<PaymentsSubViewProps> = ({
  isDarkMode = true,
  paymentsList = [],
  onBack,
  showToast,
}) => {
  // Tabs: 'MyQuro' (Delivery) vs 'Mart' (Instamart / Dining)
  const [activeTab, setActiveTab] = useState<'myquro' | 'mart'>('myquro');

  // Saved Cards
  const [savedCards, setSavedCards] = useState<SavedCard[]>([]);

  // Wallet Link states
  const [linkedWallets, setLinkedWallets] = useState<{ [key: string]: boolean }>({
    phonepe: false,
    mobikwik: false,
    amazonpay: false,
    corporate: false,
  });

  // Modals
  const [showAddCardModal, setShowAddCardModal] = useState(false);
  const [showUpiModal, setShowUpiModal] = useState(false);
  const [showManageCardModal, setShowManageCardModal] = useState<SavedCard | null>(null);
  const [showWalletModal, setShowWalletModal] = useState<string | null>(null);

  // Add Card Form State
  const [cardHolderName, setCardHolderName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // UPI Form State
  const [upiId, setUpiId] = useState('');

  // Load persisted cards from storage
  useEffect(() => {
    const loadPersistedCards = async () => {
      try {
        const stored = await AsyncStorage.getItem('@myquro_saved_cards');
        if (stored) {
          setSavedCards(JSON.parse(stored));
        } else {
          setSavedCards([]);
        }

        const storedWallets = await AsyncStorage.getItem('@myquro_linked_wallets');
        if (storedWallets) {
          setLinkedWallets(JSON.parse(storedWallets));
        }
      } catch (e) {
        console.warn('Failed loading payment data:', e);
      }
    };
    loadPersistedCards();
  }, []);

  // Format Card Number (adds spaces every 4 digits)
  const handleCardNumberChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 16);
    const formatted = clean.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  // Format Expiry (MM/YY)
  const handleExpiryChange = (text: string) => {
    const clean = text.replace(/\D/g, '').slice(0, 4);
    if (clean.length >= 3) {
      setCardExpiry(`${clean.slice(0, 2)}/${clean.slice(2)}`);
    } else {
      setCardExpiry(clean);
    }
  };

  const handleSaveNewCard = async () => {
    if (!cardHolderName.trim()) {
      Alert.alert('Required Field', 'Please enter the name on the card.');
      return;
    }
    const rawDigits = cardNumber.replace(/\D/g, '');
    if (rawDigits.length < 16) {
      Alert.alert('Invalid Card', 'Please enter a valid 16-digit card number.');
      return;
    }
    if (cardExpiry.length < 5) {
      Alert.alert('Invalid Expiry', 'Please enter expiry in MM/YY format.');
      return;
    }

    const lastFour = rawDigits.slice(-4);
    const brand = rawDigits.startsWith('4') ? 'visa' : 'mastercard';

    const newCardItem: SavedCard = {
      id: `card_${Date.now()}`,
      name: cardHolderName.trim(),
      number: `•••• ${lastFour}`,
      exp: cardExpiry,
      brand,
    };

    const updated = [...savedCards, newCardItem];
    setSavedCards(updated);
    await AsyncStorage.setItem('@myquro_saved_cards', JSON.stringify(updated));

    setCardHolderName('');
    setCardNumber('');
    setCardExpiry('');
    setCardCvv('');
    setShowAddCardModal(false);
    showToast ? showToast('Card saved successfully!') : Alert.alert('Success', 'Card saved successfully!');
  };

  const handleDeleteCard = async (cardId: string) => {
    const updated = savedCards.filter((c) => c.id !== cardId);
    setSavedCards(updated);
    await AsyncStorage.setItem('@myquro_saved_cards', JSON.stringify(updated));
    setShowManageCardModal(null);
    showToast ? showToast('Card removed') : Alert.alert('Deleted', 'Card removed successfully.');
  };

  const toggleWalletLink = async (walletKey: string) => {
    const updated = {
      ...linkedWallets,
      [walletKey]: !linkedWallets[walletKey],
    };
    setLinkedWallets(updated);
    await AsyncStorage.setItem('@myquro_linked_wallets', JSON.stringify(updated));
    setShowWalletModal(null);
    const isLinked = updated[walletKey];
    const msg = isLinked ? 'Wallet linked successfully!' : 'Wallet unlinked.';
    showToast ? showToast(msg) : Alert.alert('Success', msg);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" />

      {/* ─── TOP HEADER ─── */}
      <View style={styles.headerRow}>
        <TouchableOpacity
          onPress={onBack}
          activeOpacity={0.7}
          style={styles.backButton}
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Payment Modes</Text>
      </View>

      {/* ─── TOP SERVICE TABS (MyQuro / Mart) ─── */}
      <View style={styles.tabsContainer}>
        {/* Tab 1: MyQuro / Delivery */}
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.8}
          onPress={() => setActiveTab('myquro')}
        >
          <Text style={[styles.tabText, activeTab === 'myquro' && styles.tabTextActive]}>
            MyQuro
          </Text>
          {activeTab === 'myquro' && <View style={styles.tabActiveBar} />}
        </TouchableOpacity>

        {/* Tab 2: Instamart / Mart */}
        <TouchableOpacity
          style={styles.tabButton}
          activeOpacity={0.8}
          onPress={() => setActiveTab('mart')}
        >
          <Text style={[styles.tabText, activeTab === 'mart' && styles.tabTextActive]}>
            Instamart
          </Text>
          {activeTab === 'mart' && <View style={styles.tabActiveBar} />}
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 1: UPI
            ══════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>UPI</Text>
        <View style={styles.groupedCard}>
          <View style={styles.cardRow}>
            {/* Left Badge */}
            <UpiBadgeIcon />

            {/* Middle Title */}
            <View style={styles.cardRowCenter}>
              <Text style={styles.cardRowTitle}>MyQuro UPI</Text>
            </View>

            {/* Right Action */}
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowUpiModal(true)}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>Manage</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 2: SAVED CARDS
            ══════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>Saved Cards</Text>
        <View style={styles.groupedCard}>
          {savedCards.map((card, index) => (
            <React.Fragment key={card.id}>
              <View style={styles.cardRow}>
                {/* Left Card Badge */}
                {card.brand === 'mastercard' ? <MastercardBadge /> : <VisaCardBadge />}

                {/* Middle Info */}
                <View style={styles.cardRowCenter}>
                  <Text style={styles.cardRowTitle}>{card.name}</Text>
                  <Text style={styles.cardRowSubtitle}>{card.number}</Text>
                </View>

                {/* Right Action */}
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => setShowManageCardModal(card)}
                  style={styles.actionBtn}
                >
                  <Text style={styles.actionBtnText}>Manage</Text>
                </TouchableOpacity>
              </View>

              <DashedDivider />
            </React.Fragment>
          ))}

          {/* Add New Card Row */}
          <TouchableOpacity
            style={styles.cardRow}
            activeOpacity={0.75}
            onPress={() => setShowAddCardModal(true)}
          >
            <GoldPlusSquare size={18} />
            <View style={[styles.cardRowCenter, { marginLeft: 14 }]}>
              <Text style={styles.addCardText}>Add new card</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 3: WALLETS
            ══════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>Wallets</Text>
        <View style={styles.groupedCard}>
          {/* Row 1: PhonePe */}
          <View style={styles.cardRow}>
            <PhonePeBadge />
            <View style={styles.cardRowCenter}>
              <Text style={styles.cardRowTitle}>Phonepe</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowWalletModal('phonepe')}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {linkedWallets.phonepe ? 'Linked' : 'Link Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <DashedDivider />

          {/* Row 2: Mobikwik */}
          <View style={styles.cardRow}>
            <MobikwikBadge />
            <View style={styles.cardRowCenter}>
              <Text style={styles.cardRowTitle}>Mobikwik</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowWalletModal('mobikwik')}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {linkedWallets.mobikwik ? 'Linked' : 'Link Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <DashedDivider />

          {/* Row 3: Amazon Pay */}
          <View style={styles.cardRow}>
            <AmazonPayBadge />
            <View style={styles.cardRowCenter}>
              <Text style={styles.cardRowTitle}>Amazon Pay</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowWalletModal('amazonpay')}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {linkedWallets.amazonpay ? 'Linked' : 'Link Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ══════════════════════════════════════════════════════════════════════
            SECTION 4: CORPORATE WALLETS
            ══════════════════════════════════════════════════════════════════════ */}
        <Text style={styles.sectionHeader}>Corporate Wallets</Text>
        <View style={styles.groupedCard}>
          <View style={styles.cardRow}>
            <BillToCompanyBadge />
            <View style={styles.cardRowCenter}>
              <Text style={styles.cardRowTitle}>Bill To Company</Text>
            </View>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setShowWalletModal('corporate')}
              style={styles.actionBtn}
            >
              <Text style={styles.actionBtnText}>
                {linkedWallets.corporate ? 'Linked' : 'Link Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Security Footer Note */}
        <View style={styles.securityFooter}>
          <ShieldCheck size={16} color="#D4AF37" />
          <Text style={styles.securityFooterText}>
            100% Safe & Secure Payments Powered by RBI regulated gateways
          </Text>
        </View>
      </ScrollView>

      {/* ─── MODAL: ADD NEW CARD ─── */}
      <Modal
        visible={showAddCardModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCardModal(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalBackdrop}
        >
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Add New Card</Text>
              <TouchableOpacity
                onPress={() => setShowAddCardModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#DDDDDC" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.inputLabel}>NAME ON CARD</Text>
              <View style={styles.inputBox}>
                <TextInput
                  value={cardHolderName}
                  onChangeText={setCardHolderName}
                  placeholder="e.g. Yash Behera"
                  placeholderTextColor="#666666"
                  style={styles.inputField}
                />
              </View>

              <Text style={styles.inputLabel}>CARD NUMBER</Text>
              <View style={styles.inputBox}>
                <TextInput
                  value={cardNumber}
                  onChangeText={handleCardNumberChange}
                  placeholder="xxxx xxxx xxxx xxxx"
                  placeholderTextColor="#666666"
                  keyboardType="numeric"
                  maxLength={19}
                  style={styles.inputField}
                />
              </View>

              <View style={styles.inputSplitRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>EXPIRY (MM/YY)</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      value={cardExpiry}
                      onChangeText={handleExpiryChange}
                      placeholder="MM/YY"
                      placeholderTextColor="#666666"
                      keyboardType="numeric"
                      maxLength={5}
                      style={styles.inputField}
                    />
                  </View>
                </View>

                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.inputLabel}>CVV</Text>
                  <View style={styles.inputBox}>
                    <TextInput
                      value={cardCvv}
                      onChangeText={(t) => setCardCvv(t.slice(0, 4))}
                      placeholder="123"
                      placeholderTextColor="#666666"
                      keyboardType="numeric"
                      secureTextEntry
                      maxLength={4}
                      style={styles.inputField}
                    />
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalPrimaryBtn}
                activeOpacity={0.8}
                onPress={handleSaveNewCard}
              >
                <Text style={styles.modalPrimaryBtnText}>Save Card</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* ─── MODAL: MANAGE CARD ─── */}
      <Modal
        visible={!!showManageCardModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowManageCardModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.manageCardSheet}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Manage Card</Text>
              <TouchableOpacity
                onPress={() => setShowManageCardModal(null)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#DDDDDC" />
              </TouchableOpacity>
            </View>

            {showManageCardModal && (
              <View style={{ marginVertical: 14 }}>
                <Text style={styles.manageCardName}>{showManageCardModal.name}</Text>
                <Text style={styles.manageCardNum}>{showManageCardModal.number} • Exp {showManageCardModal.exp}</Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.deleteCardBtn}
              activeOpacity={0.7}
              onPress={() => showManageCardModal && handleDeleteCard(showManageCardModal.id)}
            >
              <Trash2 size={18} color="#EF4444" style={{ marginRight: 8 }} />
              <Text style={styles.deleteCardBtnText}>Remove this card</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: MANAGE UPI ─── */}
      <Modal
        visible={showUpiModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUpiModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>MyQuro UPI</Text>
              <TouchableOpacity
                onPress={() => setShowUpiModal(false)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#DDDDDC" />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>PRIMARY UPI ID / VPA</Text>
            <View style={styles.inputBox}>
              <TextInput
                value={upiId}
                onChangeText={setUpiId}
                placeholder="e.g. mobile@upi"
                placeholderTextColor="#666666"
                style={styles.inputField}
              />
            </View>

            <TouchableOpacity
              style={styles.modalPrimaryBtn}
              activeOpacity={0.8}
              onPress={() => {
                setShowUpiModal(false);
                showToast ? showToast('UPI updated successfully!') : Alert.alert('Success', 'UPI settings updated.');
              }}
            >
              <Text style={styles.modalPrimaryBtnText}>Save UPI ID</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ─── MODAL: LINK WALLET ─── */}
      <Modal
        visible={!!showWalletModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowWalletModal(null)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.modalSheetContainer}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>
                {showWalletModal ? showWalletModal.toUpperCase() : 'Wallet'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowWalletModal(null)}
                style={styles.modalCloseBtn}
              >
                <X size={20} color="#DDDDDC" />
              </TouchableOpacity>
            </View>

            <Text style={[styles.inputLabel, { marginTop: 10 }]}>
              {showWalletModal && linkedWallets[showWalletModal]
                ? 'Your account is currently linked. You can unlink anytime.'
                : 'Link your wallet for seamless one-click payments on MyQuro.'}
            </Text>

            <TouchableOpacity
              style={[
                styles.modalPrimaryBtn,
                showWalletModal && linkedWallets[showWalletModal] && { backgroundColor: '#EF4444' },
              ]}
              activeOpacity={0.8}
              onPress={() => showWalletModal && toggleWalletLink(showWalletModal)}
            >
              <Text
                style={[
                  styles.modalPrimaryBtnText,
                  showWalletModal && linkedWallets[showWalletModal] && { color: '#FFFFFF' },
                ]}
              >
                {showWalletModal && linkedWallets[showWalletModal]
                  ? 'Unlink Account'
                  : 'Link Account'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 14 : (StatusBar.currentHeight || 16),
    paddingBottom: 14,
    backgroundColor: '#000000',
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },

  // ─── TABS ───
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#1A1817',
    backgroundColor: '#000000',
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    position: 'relative',
  },
  tabText: {
    fontSize: 15,
    fontFamily: 'Urbanist-SemiBold',
    color: '#707070',
  },
  tabTextActive: {
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  tabActiveBar: {
    position: 'absolute',
    bottom: 0,
    left: 24,
    right: 24,
    height: 3,
    backgroundColor: '#D4AF37',
    borderTopLeftRadius: 3,
    borderTopRightRadius: 3,
  },

  // ─── SCROLL BODY ───
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 12,
    paddingBottom: 40,
  },
  sectionHeader: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#DDDDDC',
    marginTop: 22,
    marginBottom: 10,
    paddingHorizontal: 20,
    letterSpacing: 0.2,
  },

  // ─── GROUPED CARDS (MATCHING SWIGGY SCREENSHOT) ───
  groupedCard: {
    backgroundColor: '#0E0D0C',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#24201A',
    marginHorizontal: 16,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 4,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 18,
  },
  cardRowCenter: {
    flex: 1,
    marginLeft: 14,
  },
  cardRowTitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  cardRowSubtitle: {
    fontSize: 12.5,
    fontFamily: 'Urbanist-Medium',
    color: '#787878',
    marginTop: 2,
    letterSpacing: 1,
  },
  actionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  actionBtnText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#D4AF37',
    letterSpacing: 0.2,
  },

  // ─── BADGES ───
  upiBadgeContainer: {
    width: 38,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#161513',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E2B24',
  },
  cardBadgeBox: {
    width: 38,
    height: 26,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  visaText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontStyle: 'italic',
    letterSpacing: 0.5,
    position: 'absolute',
    top: 3,
    left: 6,
  },
  walletBadgeBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  goldPlusBox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardText: {
    fontSize: 14.5,
    fontFamily: 'Urbanist-Bold',
    color: '#D4AF37',
  },

  // ─── DASHED DIVIDER ───
  dashedDividerWrapper: {
    paddingHorizontal: 18,
  },
  dashedLine: {
    height: 1,
    borderWidth: 0.8,
    borderColor: '#22201C',
    borderStyle: 'dashed',
  },

  // ─── SECURITY FOOTER ───
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 28,
    paddingHorizontal: 24,
  },
  securityFooterText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Medium',
    color: '#6E6E6E',
    textAlign: 'center',
    flex: 1,
  },

  // ─── MODALS ───
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheetContainer: {
    backgroundColor: '#121110',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderTopWidth: 1,
    borderColor: '#2C271F',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    maxHeight: '85%',
  },
  manageCardSheet: {
    backgroundColor: '#121110',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2C271F',
    marginHorizontal: 20,
    padding: 20,
    alignSelf: 'center',
    width: '90%',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  modalCloseBtn: {
    padding: 6,
  },
  inputLabel: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    color: '#A2802F',
    letterSpacing: 1.1,
    marginTop: 12,
    marginBottom: 6,
  },
  inputBox: {
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#24201A',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: 'center',
  },
  inputField: {
    fontSize: 14.5,
    fontFamily: 'Urbanist-Medium',
    color: '#FFFFFF',
  },
  inputSplitRow: {
    flexDirection: 'row',
  },
  modalPrimaryBtn: {
    backgroundColor: '#D4AF37',
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22,
  },
  modalPrimaryBtnText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    color: '#000000',
  },
  manageCardName: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    color: '#FFFFFF',
  },
  manageCardNum: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#8A8A8A',
    marginTop: 4,
  },
  deleteCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    backgroundColor: 'rgba(239, 68, 68, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.3)',
    borderRadius: 12,
    marginTop: 12,
  },
  deleteCardBtnText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    color: '#EF4444',
  },
});
