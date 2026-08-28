import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  Modal,
  ActivityIndicator,
  TouchableWithoutFeedback,
  Keyboard,
  Switch,
} from 'react-native';
import {
  ArrowLeft,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Info,
  CheckCircle2,
  Plus,
  Percent,
  CreditCard,
  X,
  Sparkles,
  HelpCircle,
  CornerDownLeft,
  CornerDownRight,
  ArrowRightLeft,
} from 'lucide-react-native';
import Svg, {
  Polygon,
  Rect,
  Path,
  Circle,
  Defs,
  LinearGradient as SvgLinearGradient,
  Stop,
  Text as SvgText,
} from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useViewModel } from '../state/MainViewModel';
import {
  SCALE,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
} from '../utils/responsive';

interface PayBillScreenProps {
  restaurant: any;
  onBack: () => void;
  onPaymentSuccess: (paymentData: any) => void;
}

// ─── Gold Hexagon Icon for DineCash ──────────────────────────────────────────
const DineCashHexagon: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon
          points="50,4 92,26 92,74 50,96 8,74 8,26"
          fill="#1C180A"
          stroke="#DEA430"
          strokeWidth="6"
        />
        <Polygon
          points="50,13 84,30 84,70 50,87 16,70 16,30"
          fill="#251F0D"
          stroke="#DEA430"
          strokeWidth="2.5"
        />
        <SvgText
          x="50"
          y="63"
          textAnchor="middle"
          fontSize="48"
          fontWeight="bold"
          fill="#DEA430"
        >
          ₹
        </SvgText>
      </Svg>
    </View>
  );
};

// ─── Emerald Green Hexagon Icon for DineCash (Checkout View) ─────────────────
const EmeraldDineCashHexagon: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Polygon
          points="50,4 92,26 92,74 50,96 8,74 8,26"
          fill="#06281E"
          stroke="#10B981"
          strokeWidth="6"
        />
        <Polygon
          points="50,13 84,30 84,70 50,87 16,70 16,30"
          fill="#0A3628"
          stroke="#10B981"
          strokeWidth="2.5"
        />
        <SvgText
          x="50"
          y="63"
          textAnchor="middle"
          fontSize="48"
          fontWeight="bold"
          fill="#34D399"
        >
          ₹
        </SvgText>
      </Svg>
    </View>
  );
};

// ─── Subtle Geometric Gold Background for Banner ─────────────────────────────
const DineCashBannerPattern: React.FC = () => {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <SvgLinearGradient id="bannerBgPay" x1="0%" y1="0%" x2="100%" y2="100%">
          <Stop offset="0%" stopColor="#1C170B" stopOpacity="0.85" />
          <Stop offset="50%" stopColor="#141414" stopOpacity="0.95" />
          <Stop offset="100%" stopColor="#181308" stopOpacity="0.9" />
        </SvgLinearGradient>
      </Defs>
      <Rect width="100%" height="100%" fill="url(#bannerBgPay)" rx={14 * SCALE} />
      <Circle cx="90%" cy="20%" r="50" stroke="#DEA430" strokeWidth="0.8" opacity={0.12} />
      <Circle cx="90%" cy="20%" r="75" stroke="#DEA430" strokeWidth="0.5" opacity={0.08} />
      <Circle cx="10%" cy="90%" r="40" stroke="#DEA430" strokeWidth="0.8" opacity={0.1} />
    </Svg>
  );
};

// ─── Starburst Percent Icon ─────────────────────────────────────────────────
const StarburstPercentIcon: React.FC<{ size?: number }> = ({ size = 28 }) => {
  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path
          d="M12 2L14.5 4.5L18 4L18.5 7.5L21.5 9.5L20 12.5L21.5 15.5L18.5 17.5L18 21L14.5 20.5L12 23L9.5 20.5L6 21L5.5 17.5L2.5 15.5L4 12.5L2.5 9.5L5.5 7.5L6 4L9.5 4.5L12 2Z"
          stroke="#DEA430"
          strokeWidth="1.6"
          strokeLinejoin="round"
          fill="#1C180A"
        />
        <SvgText
          x="12"
          y="15.5"
          textAnchor="middle"
          fontSize="10"
          fontWeight="bold"
          fill="#DEA430"
        >
          %
        </SvgText>
      </Svg>
    </View>
  );
};

// ─── Bank / HDFC Logo Icon ──────────────────────────────────────────────────
const MiniBankLogoIcon: React.FC<{ size?: number }> = ({ size = 26 }) => {
  return (
    <View
      style={{
        width: size,
        height: size,
        backgroundColor: '#004C8F',
        borderRadius: 4 * SCALE,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#003366',
      }}
    >
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderWidth: 1.5,
          borderColor: '#ED1C24',
          backgroundColor: '#FFFFFF',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <View style={{ width: size * 0.25, height: size * 0.25, backgroundColor: '#004C8F' }} />
      </View>
    </View>
  );
};

// ─── Visa Badge Icon ────────────────────────────────────────────────────────
const VisaBadgeIcon: React.FC<{ size?: number }> = ({ size = 28 }) => {
  return (
    <View
      style={{
        width: 32 * SCALE,
        height: 18 * SCALE,
        backgroundColor: '#1A1F71',
        borderRadius: 3 * SCALE,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 0.8,
        borderColor: '#FFFFFF',
        marginRight: 6 * SCALE,
      }}
    >
      <Text
        style={{
          color: '#FFFFFF',
          fontSize: 10 * SCALE,
          fontFamily: 'Urbanist-Bold',
          fontWeight: '900',
          fontStyle: 'italic',
          letterSpacing: 0.5,
        }}
      >
        VISA
      </Text>
    </View>
  );
};

export const PayBillScreen: React.FC<PayBillScreenProps> = ({
  restaurant,
  onBack,
  onPaymentSuccess,
}) => {
  const insets = useSafeAreaInsets();
  const textInputRef = useRef<TextInput>(null);
  const { authState } = useViewModel();

  const userFirstName = authState?.type === 'Authenticated' && (authState as any).username ? (authState as any).username.split(' ')[0] : 'User';
  const restaurantName = restaurant?.name || '';
  const restaurantAddress =
    restaurant?.location || restaurant?.address || '';
  const restaurantCover =
    restaurant?.coverUrl ||
    restaurant?.image?.uri ||
    (typeof restaurant?.image === 'string' ? restaurant.image : '') ||
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&auto=format&fit=crop&q=80';

  // Navigation Step: 'enter_amount' | 'checkout_details'
  const [payStep, setPayStep] = useState<'enter_amount' | 'checkout_details'>('enter_amount');

  // Bill Amount Input State (defaults to 50 if empty on proceed)
  const [billAmount, setBillAmount] = useState('');
  const [useDineCash, setUseDineCash] = useState(false);
  const [tipAmount, setTipAmount] = useState(0);
  const [tipModalVisible, setTipModalVisible] = useState(false);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [infoModalVisible, setInfoModalVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [successReceiptModal, setSuccessReceiptModal] = useState<any | null>(null);

  // Computed Values
  const numericAmount = parseFloat(billAmount) > 0 ? parseFloat(billAmount) : 50;
  const regularDiscount = Math.round(numericAmount * 0.10); // 10% Regular discount = 5 on 50
  const postDiscountBill = numericAmount - regularDiscount; // 45
  const convenienceFee = 8.48;
  const gstFee = 1.52;
  const earnedDineCash = Math.round(postDiscountBill * 0.10); // 10% of 45 = 4
  const dineCashDeduction = useDineCash && numericAmount >= 1000 ? Math.min(200, Math.round(numericAmount * 0.1)) : 0;
  
  // Total To Pay rounded off matching screenshot
  const rawToPay = numericAmount - regularDiscount + convenienceFee + gstFee + tipAmount - dineCashDeduction;
  const totalToPayRounded = Math.round(rawToPay);
  const totalSavings = regularDiscount + dineCashDeduction;

  const handleApplyOffersAndProceed = () => {
    if (!billAmount || parseFloat(billAmount) <= 0) {
      setBillAmount('50');
    }
    setPayStep('checkout_details');
  };

  const handleFinalPay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      const receiptData = {
        txnId: `TXN_DINE_${Date.now()}`,
        restaurantName,
        restaurantAddress,
        billAmount: numericAmount,
        regularDiscount,
        convenienceFee,
        gstFee,
        tipAmount,
        dineCashDeduction,
        totalSavings,
        finalPaid: totalToPayRounded,
        paidAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
      };

      setSuccessReceiptModal(receiptData);
    }, 1200);
  };

  const handleFinishPayment = () => {
    if (successReceiptModal) {
      onPaymentSuccess(successReceiptModal);
      setSuccessReceiptModal(null);
    }
  };

  // ════════════════════════════════════════════════════════════════════════════
  // [VIEW 2] BILL DETAILS & PAYMENT CHECKOUT (PIXEL-PERFECT MATCHING SCREENSHOT)
  // ════════════════════════════════════════════════════════════════════════════
  if (payStep === 'checkout_details') {
    return (
      <View style={styles.screenContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />

        {/* Top Header */}
        <View
          style={[
            styles.checkoutHeaderContainer,
            { paddingTop: Math.max(insets.top, 12) + 4 },
          ]}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.circularBackBtn}
            activeOpacity={0.8}
            onPress={() => setPayStep('enter_amount')}
          >
            <ArrowLeft size={22 * SCALE} color="#DEA430" />
          </TouchableOpacity>

          {/* Title & Location */}
          <View style={styles.checkoutTitleCol}>
            <Text style={styles.checkoutTitleText} numberOfLines={1}>
              Paying: {restaurantName}
            </Text>
            <Text style={styles.checkoutSubtitleText} numberOfLines={1}>
              {restaurantAddress}
            </Text>
          </View>

          {/* Help Button ? */}
          <TouchableOpacity
            style={styles.circularHelpBtn}
            activeOpacity={0.8}
            onPress={() => setHelpModalVisible(true)}
          >
            <Text style={styles.helpQuestionText}>?</Text>
          </TouchableOpacity>
        </View>

        {/* Main Content Scrollable Area */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollInner}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── TOP HERO CARD: Your bill & Big Green Amount with Full Gold Gradient ─── */}
          <LinearGradient
            colors={['#4E3314', '#2E1C0B', '#160E07', '#0E0904']}
            locations={[0, 0.35, 0.72, 1]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={styles.yourBillHeroCard}
          >
            <Text style={styles.yourBillLabel}>Your bill</Text>
            <Text style={styles.strikethroughOriginalAmount}>₹ {numericAmount}</Text>
            <Text style={styles.bigGreenDiscountedAmount}>₹{postDiscountBill}</Text>

            {/* Speech bubble pointer */}
            <View style={styles.speechBubblePointer} />

            {/* Mint Green Savings Banner */}
            <View style={styles.savingsBannerMint}>
              <Text style={{ fontSize: 16 * SCALE, marginRight: 6 }}>😎</Text>
              <Text style={styles.savingsBannerText}>
                Woah! you're saving <Text style={styles.savingsBannerBold}>₹{regularDiscount}</Text>
              </Text>
            </View>
          </LinearGradient>

          {/* ─── CARD 2: You will earn 10% DineCash + Use DineCash Toggle ─── */}
          <View style={styles.dineCashCompositeCard}>
            {/* Top Earn Row */}
            <View style={styles.earnDineCashRow}>
              <Text style={styles.earnDineCashLeftText}>
                You will earn <Text style={styles.earnDineCashGreen}>10% DineCash</Text>
              </Text>
              <View style={styles.earnAmountRightRow}>
                <Svg width={18 * SCALE} height={18 * SCALE} viewBox="0 0 24 24" fill="none">
                  <Path
                    d="M7 16V4M7 4L3 8M7 4L11 8M17 8V20M17 20L21 16M17 20L13 16"
                    stroke="#10B981"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </Svg>
                <Text style={styles.earnAmountValText}>₹{earnedDineCash}</Text>
              </View>
            </View>

            <View style={styles.dottedDivider} />

            {/* Middle Use DineCash Toggle Row */}
            <View style={styles.dineCashToggleRow}>
              <EmeraldDineCashHexagon size={32 * SCALE} />
              <View style={styles.dineCashToggleTextCol}>
                <Text style={styles.dineCashToggleTitle}>Use DineCash</Text>
                <Text style={styles.dineCashToggleSub}>Available balance ₹200</Text>
              </View>

              <View style={styles.switchAmountRow}>
                <Switch
                  value={useDineCash}
                  onValueChange={(val) => setUseDineCash(val)}
                  trackColor={{ false: '#333333', true: '#064E3B' }}
                  thumbColor={useDineCash ? '#10B981' : '#888888'}
                  style={{ transform: [{ scaleX: 0.9 }, { scaleY: 0.9 }] }}
                />
                <Text style={styles.dineCashAppliedAmount}>
                  {useDineCash ? `₹${dineCashDeduction}` : '₹0'}
                </Text>
              </View>
            </View>

            {/* Bottom Banner note */}
            <View style={styles.dineCashConditionBanner}>
              <Text style={styles.dineCashConditionText}>
                DineCash can be used on post-discount bills above ₹1000
              </Text>
            </View>
          </View>

          {/* ─── SECTION 3: Additional Offers ─── */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitleHeader}>Additional Offers</Text>
            <TouchableOpacity
              style={styles.additionalOffersCard}
              activeOpacity={0.85}
              onPress={() => setInfoModalVisible(true)}
            >
              <View style={styles.additionalOffersLeftCol}>
                <MiniBankLogoIcon size={26 * SCALE} />
                <View style={styles.bankOfferTextGroup}>
                  <Text style={styles.applyCouponTitle}>Apply coupon & Bank Offers</Text>
                  <Text style={styles.bankOfferSubText} numberOfLines={1}>
                    Up to 10% off with HDFC Bank Credit Cards
                  </Text>
                </View>
              </View>
              <ChevronRight size={22 * SCALE} color="#DEA430" />
            </TouchableOpacity>
          </View>

          {/* ─── SECTION 4: Bill Details ─── */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitleHeader}>Bill Details</Text>
            <View style={styles.billDetailsCard}>
              {/* Total bill amount */}
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Total bill amount</Text>
                <Text style={styles.billDetailValue}>₹{numericAmount}</Text>
              </View>

              <View style={styles.dottedDivider} />

              {/* 10% Regular discount */}
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>10% Regular discount</Text>
                <Text style={[styles.billDetailValue, { color: '#10B981' }]}>
                  -₹{regularDiscount}
                </Text>
              </View>

              <View style={styles.dottedDivider} />

              {/* Convenience fee */}
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Convenience fee</Text>
                <Text style={styles.billDetailValue}>₹{convenienceFee.toFixed(2)}</Text>
              </View>

              {/* GST on convenience fee */}
              <View style={[styles.billDetailRow, { marginTop: 8 * SCALE }]}>
                <Text style={styles.billDetailLabel}>GST on convenience fee</Text>
                <Text style={styles.billDetailValue}>₹{gstFee.toFixed(2)}</Text>
              </View>

              <View style={styles.dottedDivider} />

              {/* Add Tip Row */}
              <TouchableOpacity
                style={styles.billDetailRow}
                activeOpacity={0.8}
                onPress={() => setTipModalVisible(true)}
              >
                <View>
                  <Text style={styles.addTipLabel}>+ Add Tip</Text>
                  <Text style={styles.tipSubText}>100% goes to the Waiters!</Text>
                </View>
                <Text style={styles.billDetailValue}>₹{tipAmount}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Extra Bottom Spacing for Split Bar */}
          <View style={{ height: 120 * SCALE }} />
        </ScrollView>

        {/* ─── Sticky Bottom Split Payment Bar ─── */}
        <View
          style={[
            styles.splitPaymentBottomBar,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          {/* Left: Payment Method Selector */}
          <View style={styles.payUsingCol}>
            <View style={styles.payUsingHeaderRow}>
              <VisaBadgeIcon />
              <Text style={styles.payUsingLabel}>PAY USING</Text>
              <ChevronUp size={14 * SCALE} color="#8E8E93" style={{ marginLeft: 3 }} />
            </View>
            <Text style={styles.cardHolderText}>{userFirstName}  ••  0484</Text>
          </View>

          {/* Right: Solid Gold Pay Button */}
          <TouchableOpacity
            style={styles.checkoutPayBtn}
            activeOpacity={0.88}
            onPress={handleFinalPay}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <ActivityIndicator color="#000000" size="small" />
            ) : (
              <Text style={styles.checkoutPayBtnText}>Pay ₹{totalToPayRounded}</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ─── Tip Selector Modal ─── */}
        <Modal
          visible={tipModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setTipModalVisible(false)}
        >
          <View style={styles.modalBackdropCenter}>
            <View style={styles.tipDialogCard}>
              <Text style={styles.tipDialogTitle}>Add a Tip for the Staff</Text>
              <Text style={styles.tipDialogSub}>100% of your tip goes directly to the restaurant crew.</Text>
              <View style={styles.tipPillsRow}>
                {[0, 30, 50, 100, 150].map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.tipPillBtn,
                      tipAmount === t && styles.tipPillBtnActive,
                    ]}
                    onPress={() => {
                      setTipAmount(t);
                      setTipModalVisible(false);
                    }}
                  >
                    <Text
                      style={[
                        styles.tipPillText,
                        tipAmount === t && styles.tipPillTextActive,
                      ]}
                    >
                      {t === 0 ? 'No Tip' : `₹${t}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>
        </Modal>

        {/* ─── Help Modal ─── */}
        <Modal
          visible={helpModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setHelpModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalSheetTitle}>Bill Payment Help</Text>
                <TouchableOpacity onPress={() => setHelpModalVisible(false)} style={styles.modalCloseBtn}>
                  <X size={20 * SCALE} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
              <Text style={styles.helpBodyText}>
                • Flat discounts and coupons apply automatically on the total bill before tax.{'\n'}
                • Convenience fee covers instant payment gateway settlement with the restaurant.{'\n'}
                • You can redeem DineCash on dining bills above ₹1,000.
              </Text>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.88}
                onPress={() => setHelpModalVisible(false)}
              >
                <Text style={styles.modalSubmitBtnText}>Understood</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ─── Success Receipt Modal ─── */}
        <Modal visible={!!successReceiptModal} transparent animationType="fade">
          <View style={styles.modalBackdropCenter}>
            <View style={styles.successReceiptCard}>
              <CheckCircle2 size={56 * SCALE} color="#DEA430" />
              <Text style={styles.successReceiptTitle}>Bill Paid Successfully!</Text>
              <Text style={styles.successReceiptSub}>
                {successReceiptModal?.restaurantName}
              </Text>

              <View style={styles.receiptBreakdownBox}>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Transaction ID</Text>
                  <Text style={styles.receiptVal}>{successReceiptModal?.txnId}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Date & Time</Text>
                  <Text style={styles.receiptVal}>
                    {successReceiptModal?.date} • {successReceiptModal?.paidAt}
                  </Text>
                </View>
                <View style={styles.receiptDivider} />
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Total Bill Amount</Text>
                  <Text style={styles.receiptVal}>₹{successReceiptModal?.billAmount?.toFixed(2)}</Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={[styles.receiptLabel, { color: '#10B981' }]}>10% Regular Discount</Text>
                  <Text style={[styles.receiptVal, { color: '#10B981' }]}>
                    -₹{successReceiptModal?.regularDiscount?.toFixed(2)}
                  </Text>
                </View>
                <View style={styles.receiptRow}>
                  <Text style={styles.receiptLabel}>Convenience Fee & GST</Text>
                  <Text style={styles.receiptVal}>₹10.00</Text>
                </View>
                {successReceiptModal?.tipAmount > 0 && (
                  <View style={styles.receiptRow}>
                    <Text style={styles.receiptLabel}>Staff Tip</Text>
                    <Text style={styles.receiptVal}>₹{successReceiptModal?.tipAmount?.toFixed(2)}</Text>
                  </View>
                )}
                <View style={[styles.receiptRow, styles.receiptTotalRow]}>
                  <Text style={styles.receiptTotalLabel}>Total Paid</Text>
                  <Text style={styles.receiptTotalVal}>
                    ₹{successReceiptModal?.finalPaid?.toFixed(2)}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.88}
                onPress={handleFinishPayment}
              >
                <Text style={styles.doneBtnText}>Awesome, Done!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    );
  }

  // ════════════════════════════════════════════════════════════════════════════
  // [VIEW 1] ENTER BILL AMOUNT SCREEN
  // ════════════════════════════════════════════════════════════════════════════
  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <View style={styles.screenContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        {/* Top Background with Fading Hero Image */}
        <View style={styles.heroBackgroundContainer}>
          <Image
            source={{ uri: restaurantCover }}
            style={styles.heroBackgroundImage}
            resizeMode="cover"
          />
          <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgLinearGradient id="payHeroGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <Stop offset="0%" stopColor="#000000" stopOpacity="0.75" />
                <Stop offset="45%" stopColor="#000000" stopOpacity="0.85" />
                <Stop offset="85%" stopColor="#000000" stopOpacity="1" />
                <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
              </SvgLinearGradient>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#payHeroGrad)" />
          </Svg>
        </View>

        {/* Floating Top Bar (Back Button) */}
        <View
          style={[
            styles.topBarContainer,
            { top: Math.max(insets.top, 12) + 2 },
          ]}
        >
          <TouchableOpacity
            style={styles.circularBackBtn}
            activeOpacity={0.8}
            onPress={onBack}
          >
            <ArrowLeft size={22 * SCALE} color="#DEA430" />
          </TouchableOpacity>
        </View>

        {/* Main Content Scrollable Area */}
        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={[
            styles.scrollInner,
            { paddingTop: Math.max(insets.top, 12) + 50 * SCALE },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header Title Section */}
          <View style={styles.headerTitleSection}>
            <View style={styles.payingBillToRow}>
              <View style={styles.flourishLine} />
              <Text style={styles.payingBillToText}>PAYING BILL TO</Text>
              <View style={styles.flourishLine} />
            </View>

            <Text style={styles.restaurantTitleText} numberOfLines={2}>
              {restaurantName}
            </Text>

            <TouchableOpacity
              style={styles.locationDropdownRow}
              activeOpacity={0.8}
              onPress={() => setInfoModalVisible(true)}
            >
              <Text style={styles.locationText} numberOfLines={1}>
                {restaurantAddress}
              </Text>
              <ChevronDown size={15 * SCALE} color="#DEA430" style={{ marginLeft: 4 }} />
            </TouchableOpacity>
          </View>

          {/* Massive Gold Interactive Rupee Input */}
          <TouchableOpacity
            style={styles.amountInputBlock}
            activeOpacity={1}
            onPress={() => textInputRef.current?.focus()}
          >
            <View style={styles.amountDisplayRow}>
              <Text style={styles.rupeeSymbolGold}>₹</Text>
              <TextInput
                ref={textInputRef}
                style={styles.amountTextInput}
                value={billAmount}
                onChangeText={(val) => {
                  const clean = val.replace(/[^0-9]/g, '');
                  setBillAmount(clean);
                }}
                keyboardType="numeric"
                placeholder="0"
                placeholderTextColor="#DEA430"
                maxLength={7}
                autoFocus={true}
              />
            </View>

            <Text style={styles.enterTotalSubText}>
              Enter total amount as shown on the bill
            </Text>
          </TouchableOpacity>

          {/* Offers & Discounts Composite Card */}
          <View style={styles.offersCompositeCard}>
            <View style={styles.offersTopSplitRow}>
              <View style={styles.offerColLeft}>
                <Text style={styles.offerColLabel}>Flat discount</Text>
                <View style={styles.offerColContentRow}>
                  <StarburstPercentIcon size={26 * SCALE} />
                  <View style={styles.offerTextGroup}>
                    <Text style={styles.offerMainTitle}>Flat 10% off</Text>
                    <Text style={styles.offerSubtitle}>on total bill</Text>
                  </View>
                </View>
              </View>

              <View style={styles.centerPlusCircle}>
                <Plus size={13 * SCALE} color="#DEA430" strokeWidth={2.5} />
              </View>

              <View style={styles.offerColRight}>
                <Text style={styles.offerColLabel}>Coupons</Text>
                <View style={styles.offerColContentRow}>
                  <MiniBankLogoIcon size={24 * SCALE} />
                  <View style={styles.offerTextGroup}>
                    <Text style={styles.offerMainTitle}>Flat 10% off*</Text>
                    <Text style={styles.offerSubtitle}>use HDFCCCEMI</Text>
                  </View>
                </View>
                <View style={styles.carouselDotsRow}>
                  <View style={[styles.miniDot, styles.miniDotActive]} />
                  <View style={styles.miniDot} />
                </View>
              </View>
            </View>

            <View style={styles.cardInternalDivider} />

            <Text style={styles.paymentPartnerTagText}>
              + Up to extra <Text style={styles.goldHighlight}>10%</Text> off with payment partner offers
            </Text>
          </View>

          <View style={{ height: 160 * SCALE }} />
        </ScrollView>

        {/* Sticky Bottom Section (Static "Apply offers & pay" Button) */}
        <View
          style={[
            styles.bottomStickyContainer,
            { paddingBottom: Math.max(insets.bottom, 16) + 4 },
          ]}
        >
          <TouchableOpacity
            style={styles.dineCashBannerCard}
            activeOpacity={0.85}
            onPress={() => setInfoModalVisible(true)}
          >
            <DineCashBannerPattern />
            <View style={styles.dineCashBannerContent}>
              <DineCashHexagon size={28 * SCALE} />
              <Text style={styles.dineCashBannerText}>
                Use up to <Text style={styles.goldHighlight}>₹200</Text> DineCash + Earn{' '}
                <Text style={styles.goldHighlight}>10%</Text> more
              </Text>
              <Info size={18 * SCALE} color="#DEA430" style={{ marginLeft: 6 }} />
            </View>
          </TouchableOpacity>

          {/* Static "Apply offers & pay" button */}
          <TouchableOpacity
            style={styles.applyOffersPayBtn}
            activeOpacity={0.88}
            onPress={handleApplyOffersAndProceed}
          >
            <Text style={styles.applyOffersPayBtnText}>Apply offers & pay</Text>
          </TouchableOpacity>
        </View>

        {/* Info Modal */}
        <Modal
          visible={infoModalVisible}
          transparent
          animationType="slide"
          onRequestClose={() => setInfoModalVisible(false)}
        >
          <View style={styles.modalBackdrop}>
            <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 24) }]}>
              <View style={styles.modalHeaderRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <DineCashHexagon size={30 * SCALE} />
                  <Text style={[styles.modalSheetTitle, { marginLeft: 10 }]}>DineCash & Partner Savings</Text>
                </View>
                <TouchableOpacity onPress={() => setInfoModalVisible(false)} style={styles.modalCloseBtn}>
                  <X size={20 * SCALE} color="#FFFFFF" />
                </TouchableOpacity>
              </View>

              <View style={styles.benefitItemCard}>
                <Percent size={20 * SCALE} color="#DEA430" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitItemTitle}>Flat 10% Instant Bill Savings</Text>
                  <Text style={styles.benefitItemDesc}>
                    Enjoy an immediate 10% deduction on your entire dining bill.
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItemCard}>
                <Sparkles size={20 * SCALE} color="#DEA430" style={{ marginRight: 12 }} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.benefitItemTitle}>Use up to ₹200 DineCash</Text>
                  <Text style={styles.benefitItemDesc}>
                    Redeem your available wallet DineCash balance towards the bill total.
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.modalSubmitBtn}
                activeOpacity={0.88}
                onPress={() => setInfoModalVisible(false)}
              >
                <Text style={styles.modalSubmitBtnText}>Got it!</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </TouchableWithoutFeedback>
  );
};

// ─── LUXURY BLACK & GOLD STYLES (MATCHING SCREENSHOT PIXEL-PERFECT) ──────────
const styles = StyleSheet.create({
  screenContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ─── Hero Background ───
  heroBackgroundContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.45,
    backgroundColor: '#000000',
  },
  heroBackgroundImage: {
    width: '100%',
    height: '100%',
    opacity: 0.28,
  },

  // ─── Top Bar Back Button ───
  topBarContainer: {
    position: 'absolute',
    left: 16 * SCALE,
    zIndex: 30,
  },
  circularBackBtn: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 22 * SCALE,
    borderWidth: 1.2,
    borderColor: '#DEA430',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Checkout Header (View 2) ───
  checkoutHeaderContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 14 * SCALE,
    backgroundColor: '#000000',
  },
  checkoutTitleCol: {
    flex: 1,
    marginLeft: 12 * SCALE,
    marginRight: 10 * SCALE,
  },
  checkoutTitleText: {
    color: '#FFFFFF',
    fontSize: 17.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  checkoutSubtitleText: {
    color: '#8E8E93',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  circularHelpBtn: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 18 * SCALE,
    borderWidth: 1.2,
    borderColor: '#DEA430',
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  helpQuestionText: {
    color: '#DEA430',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Scroll Content ───
  scrollContent: {
    flex: 1,
  },
  scrollInner: {
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 20 * SCALE,
  },

  // ─── NEW Top Hero Card: Your bill ───
  yourBillHeroCard: {
    borderRadius: 18 * SCALE,
    borderWidth: 1.2,
    borderColor: '#4A3718',
    paddingTop: 18 * SCALE,
    paddingBottom: 14 * SCALE,
    paddingHorizontal: 16 * SCALE,
    alignItems: 'center',
    marginTop: 8 * SCALE,
    marginBottom: 16 * SCALE,
    overflow: 'hidden',
  },
  yourBillLabel: {
    color: '#FFFFFF',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  strikethroughOriginalAmount: {
    color: '#8E8E93',
    fontSize: 19 * SCALE,
    fontFamily: 'Urbanist-Bold',
    textDecorationLine: 'line-through',
    marginTop: 4 * SCALE,
  },
  bigGreenDiscountedAmount: {
    color: '#A7F3D0',
    fontSize: 54 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
    lineHeight: 60 * SCALE,
  },
  speechBubblePointer: {
    width: 0,
    height: 0,
    borderLeftWidth: 8 * SCALE,
    borderRightWidth: 8 * SCALE,
    borderBottomWidth: 8 * SCALE,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#A3E6C5',
    alignSelf: 'center',
    marginBottom: -1,
    zIndex: 3,
  },
  savingsBannerMint: {
    backgroundColor: '#A3E6C5',
    borderRadius: 14 * SCALE,
    paddingVertical: 10 * SCALE,
    paddingHorizontal: 16 * SCALE,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsBannerText: {
    color: '#064E3B',
    fontSize: 14.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  savingsBannerBold: {
    color: '#064E3B',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },

  // ─── CARD 2: DineCash Composite Card ───
  dineCashCompositeCard: {
    backgroundColor: '#121212',
    borderRadius: 16 * SCALE,
    borderWidth: 1.2,
    borderColor: '#2A2210',
    overflow: 'hidden',
    marginBottom: 16 * SCALE,
  },
  earnDineCashRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * SCALE,
    paddingTop: 14 * SCALE,
    paddingBottom: 10 * SCALE,
  },
  earnDineCashLeftText: {
    color: '#FFFFFF',
    fontSize: 14.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  earnDineCashGreen: {
    color: '#10B981',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  earnAmountRightRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
  },
  earnAmountValText: {
    color: '#FFFFFF',
    fontSize: 15.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dineCashToggleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 12 * SCALE,
  },
  dineCashToggleTextCol: {
    flex: 1,
    marginLeft: 12 * SCALE,
  },
  dineCashToggleTitle: {
    color: '#FFFFFF',
    fontSize: 15.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dineCashToggleSub: {
    color: '#8E8E93',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  switchAmountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
  },
  dineCashAppliedAmount: {
    color: '#8E8E93',
    fontSize: 15.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    minWidth: 26 * SCALE,
    textAlign: 'right',
  },
  dineCashConditionBanner: {
    backgroundColor: '#1A1408',
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 8 * SCALE,
    borderTopWidth: 1,
    borderTopColor: 'rgba(222, 164, 48, 0.15)',
  },
  dineCashConditionText: {
    color: '#DEA430',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },

  // ─── Section Block Shared ───
  sectionBlock: {
    marginBottom: 16 * SCALE,
  },
  sectionTitleHeader: {
    color: '#FFFFFF',
    fontSize: 16 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 12 * SCALE,
  },

  // ─── Additional Offers Card (View 2) ───
  additionalOffersCard: {
    backgroundColor: '#121212',
    borderRadius: 16 * SCALE,
    borderWidth: 1.2,
    borderColor: '#2A2210',
    padding: 16 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  additionalOffersLeftCol: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 10 * SCALE,
  },
  bankOfferTextGroup: {
    marginLeft: 12 * SCALE,
    flex: 1,
  },
  applyCouponTitle: {
    color: '#FFFFFF',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 4 * SCALE,
  },
  bankOfferSubText: {
    color: '#8E8E93',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
  },

  // ─── Bill Details Card (View 2) ───
  billDetailsCard: {
    backgroundColor: '#121212',
    borderRadius: 16 * SCALE,
    borderWidth: 1.2,
    borderColor: '#2A2210',
    padding: 16 * SCALE,
  },
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  billDetailLabel: {
    color: '#FFFFFF',
    fontSize: 14.5 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  billDetailValue: {
    color: '#FFFFFF',
    fontSize: 14.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dottedDivider: {
    borderBottomWidth: 1.2,
    borderStyle: 'dotted',
    borderColor: 'rgba(255, 255, 255, 0.15)',
    marginVertical: 12 * SCALE,
  },
  addTipLabel: {
    color: '#DEA430',
    fontSize: 14.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  tipSubText: {
    color: '#8E8E93',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },

  // ─── Split Payment Bottom Bar (View 2) ───
  splitPaymentBottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#121212',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
    borderTopLeftRadius: 20 * SCALE,
    borderTopRightRadius: 20 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingTop: 14 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 30,
  },
  payUsingCol: {
    flex: 1,
  },
  payUsingHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4 * SCALE,
  },
  payUsingLabel: {
    color: '#8E8E93',
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 1,
  },
  cardHolderText: {
    color: '#FFFFFF',
    fontSize: 14.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  checkoutPayBtn: {
    backgroundColor: '#DEA430',
    height: 52 * SCALE,
    borderRadius: 14 * SCALE,
    paddingHorizontal: 28 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutPayBtnText: {
    color: '#000000',
    fontSize: 17 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Header Title Section (View 1) ───
  headerTitleSection: {
    alignItems: 'center',
    paddingHorizontal: 20 * SCALE,
  },
  payingBillToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8 * SCALE,
  },
  flourishLine: {
    width: 32 * SCALE,
    height: 1,
    backgroundColor: '#4A3B18',
    marginHorizontal: 8 * SCALE,
  },
  payingBillToText: {
    color: '#DEA430',
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    letterSpacing: 2,
  },
  restaurantTitleText: {
    color: '#FFFFFF',
    fontSize: 24 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    textAlign: 'center',
  },
  locationDropdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6 * SCALE,
    paddingHorizontal: 16 * SCALE,
  },
  locationText: {
    color: '#8E8E93',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
  },

  // ─── Massive Gold Amount Input (View 1) ───
  amountInputBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 34 * SCALE,
    marginBottom: 10 * SCALE,
  },
  amountDisplayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rupeeSymbolGold: {
    color: '#DEA430',
    fontSize: 48 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginRight: 4,
  },
  amountTextInput: {
    color: '#DEA430',
    fontSize: 48 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    minWidth: 40 * SCALE,
    textAlign: 'left',
    padding: 0,
    margin: 0,
  },
  enterTotalSubText: {
    color: '#8E8E93',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    marginTop: 10 * SCALE,
  },

  // ─── Offers & Discounts Composite Card (View 1) ───
  offersCompositeCard: {
    backgroundColor: '#121212',
    borderRadius: 18 * SCALE,
    borderWidth: 1.2,
    borderColor: 'rgba(222, 164, 48, 0.35)',
    padding: 16 * SCALE,
    marginTop: 26 * SCALE,
  },
  offersTopSplitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  offerColLeft: {
    flex: 1,
    paddingRight: 6 * SCALE,
  },
  offerColRight: {
    flex: 1,
    paddingLeft: 10 * SCALE,
  },
  offerColLabel: {
    color: '#8E8E93',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginBottom: 8 * SCALE,
  },
  offerColContentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerTextGroup: {
    marginLeft: 8 * SCALE,
    flex: 1,
  },
  offerMainTitle: {
    color: '#FFFFFF',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  offerSubtitle: {
    color: '#8E8E93',
    fontSize: 11.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 2,
  },
  centerPlusCircle: {
    width: 26 * SCALE,
    height: 26 * SCALE,
    borderRadius: 13 * SCALE,
    backgroundColor: '#1E1A10',
    borderWidth: 1.2,
    borderColor: '#4A3B18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  carouselDotsRow: {
    flexDirection: 'row',
    gap: 4 * SCALE,
    marginTop: 8 * SCALE,
    paddingLeft: 32 * SCALE,
  },
  miniDot: {
    width: 4 * SCALE,
    height: 4 * SCALE,
    borderRadius: 2 * SCALE,
    backgroundColor: '#333333',
  },
  miniDotActive: {
    backgroundColor: '#DEA430',
  },
  cardInternalDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 14 * SCALE,
  },
  paymentPartnerTagText: {
    color: '#CCCCCC',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
  },
  goldHighlight: {
    color: '#DEA430',
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Sticky Bottom Container (View 1) ───
  bottomStickyContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 16 * SCALE,
    paddingTop: 10 * SCALE,
    zIndex: 30,
  },
  dineCashBannerCard: {
    height: 52 * SCALE,
    borderRadius: 14 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.3)',
    marginBottom: 10 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'center',
    paddingHorizontal: 14 * SCALE,
  },
  dineCashBannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 2,
  },
  dineCashBannerText: {
    color: '#FFFFFF',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginLeft: 10 * SCALE,
    flex: 1,
  },
  applyOffersPayBtn: {
    backgroundColor: '#DEA430',
    height: 52 * SCALE,
    borderRadius: 14 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  applyOffersPayBtnText: {
    color: '#000000',
    fontSize: 17 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Tip Dialog ───
  tipDialogCard: {
    width: '100%',
    backgroundColor: '#141414',
    borderRadius: 20 * SCALE,
    borderWidth: 1.5,
    borderColor: '#DEA430',
    padding: 22 * SCALE,
    alignItems: 'center',
  },
  tipDialogTitle: {
    color: '#FFFFFF',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 6 * SCALE,
  },
  tipDialogSub: {
    color: '#8E8E93',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    marginBottom: 16 * SCALE,
  },
  tipPillsRow: {
    flexDirection: 'row',
    gap: 8 * SCALE,
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  tipPillBtn: {
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 10 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: '#1C1C1C',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  tipPillBtnActive: {
    backgroundColor: '#1C180A',
    borderColor: '#DEA430',
    borderWidth: 1.5,
  },
  tipPillText: {
    color: '#FFFFFF',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Bold',
  },
  tipPillTextActive: {
    color: '#DEA430',
  },

  // ─── Help Modal ───
  helpBodyText: {
    color: '#CCCCCC',
    fontSize: 13.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    lineHeight: 20 * SCALE,
    marginVertical: 14 * SCALE,
  },

  // ─── Receipt Modal ───
  modalBackdropCenter: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20 * SCALE,
  },
  successReceiptCard: {
    width: '100%',
    backgroundColor: '#141414',
    borderRadius: 20 * SCALE,
    borderWidth: 1.5,
    borderColor: '#DEA430',
    padding: 22 * SCALE,
    alignItems: 'center',
  },
  successReceiptTitle: {
    color: '#FFFFFF',
    fontSize: 21 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 12 * SCALE,
  },
  successReceiptSub: {
    color: '#DEA430',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Medium',
    marginTop: 4 * SCALE,
  },
  receiptBreakdownBox: {
    backgroundColor: '#1C1C1C',
    borderRadius: 14 * SCALE,
    padding: 16 * SCALE,
    width: '100%',
    marginVertical: 16 * SCALE,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8 * SCALE,
  },
  receiptLabel: {
    color: '#999999',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-Medium',
  },
  receiptVal: {
    color: '#FFFFFF',
    fontSize: 13 * SCALE,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
  },
  receiptDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    marginVertical: 8 * SCALE,
  },
  receiptTotalRow: {
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.12)',
    paddingTop: 10 * SCALE,
    marginTop: 4 * SCALE,
    marginBottom: 0,
  },
  receiptTotalLabel: {
    color: '#FFFFFF',
    fontSize: 15.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  receiptTotalVal: {
    color: '#DEA430',
    fontSize: 18 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  doneBtn: {
    backgroundColor: '#DEA430',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 24 * SCALE,
    paddingVertical: 12 * SCALE,
    width: '100%',
    alignItems: 'center',
  },
  doneBtnText: {
    color: '#000000',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },

  // ─── Info Modal ───
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    backgroundColor: '#121212',
    borderTopLeftRadius: 24 * SCALE,
    borderTopRightRadius: 24 * SCALE,
    paddingHorizontal: 20 * SCALE,
    paddingTop: 20 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16 * SCALE,
  },
  modalSheetTitle: {
    color: '#FFFFFF',
    fontSize: 17 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  modalCloseBtn: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 18 * SCALE,
    backgroundColor: '#1E1E1E',
    justifyContent: 'center',
    alignItems: 'center',
  },
  benefitItemCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#181818',
    borderRadius: 14 * SCALE,
    padding: 14 * SCALE,
    marginBottom: 12 * SCALE,
  },
  benefitItemTitle: {
    color: '#FFFFFF',
    fontSize: 14 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  benefitItemDesc: {
    color: '#999999',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Regular',
    marginTop: 3,
    lineHeight: 17 * SCALE,
  },
  modalSubmitBtn: {
    backgroundColor: '#DEA430',
    height: 50 * SCALE,
    borderRadius: 14 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 14 * SCALE,
  },
  modalSubmitBtnText: {
    color: '#000000',
    fontSize: 15 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
});
