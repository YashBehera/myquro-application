import React, { useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Platform,
  Switch,
  Modal,
  StatusBar,
  ToastAndroid,
} from 'react-native';
import {
  ArrowLeft,
  ChevronRight,
  Check,
  Plus,
  CreditCard,
  Banknote,
  Wallet,
  Landmark,
  Receipt,
} from 'lucide-react-native';
import Svg, { Path, Circle, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SCALE } from '../utils/responsive';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export interface PaymentOptionsSheetProps {
  visible: boolean;
  onClose: () => void;
  finalTotal: number;
  totalItemsCount: number;
  restaurantName: string;
  deliveryTime?: string;
  deliveryAddressLabel?: string;
  deliveryAddressText?: string;
  selectedPayment: string;
  onSelectPayment: (paymentMethod: string) => void;
  onProceedToPayWithMethod?: (paymentMethod: string) => void;
}

export const PaymentOptionsSheet: React.FC<PaymentOptionsSheetProps> = ({
  visible,
  onClose,
  finalTotal,
  totalItemsCount,
  restaurantName,
  deliveryTime = '25–30 mins',
  deliveryAddressLabel = 'Home',
  deliveryAddressText = 'Visalakshi Nagar, Jyothi...',
  selectedPayment,
  onSelectPayment,
  onProceedToPayWithMethod,
}) => {
  const insets = useSafeAreaInsets();
  const [activeMethod, setActiveMethod] = useState<string>(selectedPayment || 'Google Pay');
  const [quroMoneyEnabled, setQuroMoneyEnabled] = useState<boolean>(true);
  const [currentSubView, setCurrentSubView] = useState<'main' | 'cod'>('main');

  // Sync with prop when visible
  React.useEffect(() => {
    if (selectedPayment) {
      setActiveMethod(selectedPayment);
      if (selectedPayment === 'COD') {
        // Keep in sync
      }
    }
  }, [selectedPayment, visible]);

  const handleSelect = (method: string) => {
    setActiveMethod(method);
    onSelectPayment(method);
  };

  const handlePayNow = (method: string) => {
    handleSelect(method);
    handleCloseAll();
  };

  const handleCloseAll = () => {
    setCurrentSubView('main');
    onClose();
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={currentSubView === 'cod' ? () => setCurrentSubView('main') : handleCloseAll}
    >
      <View style={[styles.root, { paddingTop: insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 44 : 12) }]}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" translucent={false} />

        {/* ════════════════════════════════════════════════════════════════════════
            [VIEW 1] COD (PAY ON DELIVERY) SUBVIEW
            ════════════════════════════════════════════════════════════════════════ */}
        {currentSubView === 'cod' ? (
          <View style={styles.subViewContainer}>
            {/* COD Header */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={() => setCurrentSubView('main')}
              >
                <ArrowLeft size={22 * SCALE} color="#DEA430" strokeWidth={2.2} />
              </TouchableOpacity>

              <View style={styles.headerTitleCol}>
                <Text style={styles.headerMainTitle}>Pay on delivery</Text>
                <Text style={styles.headerSubtitle}>
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} • Total: ₹{finalTotal}
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 36 * SCALE },
              ]}
            >
              {/* Card 1: My Quro Money */}
              <View style={styles.quroMoneyCard}>
                <View style={styles.quroMoneyLeft}>
                  <View style={styles.quroPinIconBox}>
                    <Svg width={20 * SCALE} height={20 * SCALE} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"
                        fill="#000000"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.quroMoneyLabel}>My Quro Money</Text>
                </View>

                <View style={styles.quroMoneyRight}>
                  <Text style={styles.quroMoneyBalance}>₹2</Text>
                  <Switch
                    value={quroMoneyEnabled}
                    onValueChange={setQuroMoneyEnabled}
                    trackColor={{ false: '#27272A', true: '#DEA430' }}
                    thumbColor={quroMoneyEnabled ? '#000000' : '#71717A'}
                    style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  />
                </View>
              </View>

              {/* Card 2: Pay on Delivery (Cash/UPI) */}
              <TouchableOpacity
                style={[
                  styles.codCardContainer,
                  activeMethod === 'COD' && styles.codCardContainerActive,
                ]}
                activeOpacity={0.8}
                onPress={() => handleSelect('COD')}
              >
                <View style={styles.codCardTopRow}>
                  <View style={styles.optionLeft}>
                    {/* Note/Cash with ₹ symbol icon */}
                    <View style={styles.codCurrencyIconBox}>
                      <Svg width={24 * SCALE} height={24 * SCALE} viewBox="0 0 24 24" fill="none">
                        <Rect x="2" y="5" width="20" height="14" rx="3" stroke="#DEA430" strokeWidth="1.6" />
                        <Circle cx="12" cy="12" r="3" stroke="#DEA430" strokeWidth="1.6" />
                        <Path d="M12 9.8V14.2M10.8 11H13.2" stroke="#DEA430" strokeWidth="1.4" strokeLinecap="round" />
                      </Svg>
                    </View>

                    <View style={styles.codTextCol}>
                      <Text style={styles.codTitleText}>Pay on Delivery (Cash/UPI)</Text>
                      <Text style={styles.codSubText}>Pay cash or ask for QR code</Text>
                    </View>
                  </View>

                  {/* Radio Indicator */}
                  <View style={[styles.radioCircle, activeMethod === 'COD' && styles.radioCircleActive]}>
                    {activeMethod === 'COD' && <Check size={12 * SCALE} color="#000000" strokeWidth={3} />}
                  </View>
                </View>

                {/* Sub-Button when COD is active */}
                {activeMethod === 'COD' && (
                  <TouchableOpacity
                    style={[styles.payViaMethodBtn, { marginTop: 16 * SCALE, marginBottom: 4 * SCALE }]}
                    activeOpacity={0.85}
                    onPress={() => handlePayNow('COD')}
                  >
                    <Text style={styles.payViaMethodBtnText}>Pay on Delivery (₹{finalTotal})</Text>
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        ) : (
          /* ════════════════════════════════════════════════════════════════════════
              [VIEW 2] MAIN PAYMENT OPTIONS LIST
              ════════════════════════════════════════════════════════════════════════ */
          <View style={{ flex: 1 }}>
            {/* [1] TOP HEADER: BACK ARROW + "Payment Options" + Subtitle */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backBtn}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                onPress={handleCloseAll}
              >
                <ArrowLeft size={22 * SCALE} color="#DEA430" strokeWidth={2.2} />
              </TouchableOpacity>

              <View style={styles.headerTitleCol}>
                <Text style={styles.headerMainTitle}>Payment Options</Text>
                <Text style={styles.headerSubtitle}>
                  {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'items'} • Total: ₹{finalTotal}
                </Text>
              </View>
            </View>

            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: insets.bottom + 36 * SCALE },
              ]}
            >
              {/* [2] RESTAURANT & DELIVERY ADDRESS SUMMARY CARD */}
              <View style={styles.summaryCard}>
                {/* Left Connected Route Nodes */}
                <View style={styles.routeCol}>
                  <View style={styles.routeTopCircle} />
                  <View style={styles.routeLine} />
                  <View style={styles.routeBottomCircle} />
                </View>

                {/* Right Details */}
                <View style={styles.summaryInfoCol}>
                  <View style={styles.summaryLineRow}>
                    <Text style={styles.summaryResName} numberOfLines={1}>
                      {restaurantName || "Domino's Pizza"}
                    </Text>
                    <Text style={styles.summaryDivider}>|</Text>
                    <Text style={styles.summaryDeliveryPrefix}>
                      Delivery in:{' '}
                      <Text style={styles.summaryDeliveryTime}>{deliveryTime}</Text>
                    </Text>
                  </View>

                  <View style={[styles.summaryLineRow, { marginTop: 6 * SCALE }]}>
                    <Text style={styles.summaryAddressLabel} numberOfLines={1}>
                      {deliveryAddressLabel || 'Home'}
                    </Text>
                    <Text style={styles.summaryDivider}>|</Text>
                    <Text style={styles.summaryAddressText} numberOfLines={1}>
                      {deliveryAddressText}
                    </Text>
                  </View>
                </View>
              </View>

              {/* [3] SAVE MORE WITH PAYMENT OFFERS */}
              <TouchableOpacity
                style={styles.offersRowCard}
                activeOpacity={0.8}
                onPress={() => {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show('Available bank & UPI offers loaded!', ToastAndroid.SHORT);
                  }
                }}
              >
                <View style={styles.offersLeft}>
                  <View style={styles.offerBadgeBox}>
                    <Svg width={22 * SCALE} height={22 * SCALE} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 2L14.4 3.9L17.5 3.6L18.8 6.4L21.7 7.7L21.4 10.8L23.3 13.2L21.4 15.6L21.7 18.7L18.8 20L17.5 22.8L14.4 22.5L12 24.4L9.6 22.5L6.5 22.8L5.2 20L2.3 18.7L2.6 15.6L0.7 13.2L2.6 10.8L2.3 7.7L5.2 6.4L6.5 3.6L9.6 3.9L12 2Z"
                        fill="#DEA430"
                      />
                      <Path
                        d="M9 8.5C9 9.3 8.3 10 7.5 10C6.7 10 6 9.3 6 8.5C6 7.7 6.7 7 7.5 7C8.3 7 9 7.7 9 8.5ZM18 17.5C18 18.3 17.3 19 16.5 19C15.7 19 15 18.3 15 17.5C15 16.7 15.7 16 16.5 16C17.3 16 18 16.7 18 17.5ZM17.3 7.2L6.7 18.8"
                        stroke="#000000"
                        strokeWidth={2}
                        strokeLinecap="round"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.offersText}>Save more with payment offers</Text>
                </View>
                <ChevronRight size={18 * SCALE} color="#DEA430" />
              </TouchableOpacity>

              {/* [4] MYQURO UPI PROMOTIONAL BANNER */}
              <View style={styles.upiBannerCard}>
                <View style={styles.upiBannerLeft}>
                  <Text style={styles.upiBannerTitle}>
                    UPI payments, now <Text style={styles.upiBannerTitleGold}>3X Faster</Text>
                  </Text>
                  <Text style={styles.upiBannerSub}>
                    Unlock faster in-app UPI for instant payments!
                  </Text>

                  <TouchableOpacity
                    style={styles.upiActivateBtn}
                    activeOpacity={0.8}
                    onPress={() => {
                      if (Platform.OS === 'android') {
                        ToastAndroid.show('MyQuro 1-Click Fast UPI Activated!', ToastAndroid.SHORT);
                      }
                    }}
                  >
                    <Text style={styles.upiActivateBtnText}>Activate in 10s</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.upiLogoCol}>
                  <Text style={styles.quroUpiBrandTitle}>MYQURO</Text>
                  <View style={styles.quroUpiSymbolRow}>
                    <Text style={styles.quroUpiSymbolText}>UPI</Text>
                    <View style={styles.upiArrowsWrap}>
                      <Text style={styles.upiArrowGreen}>▲</Text>
                      <Text style={styles.upiArrowGold}>▼</Text>
                    </View>
                  </View>
                  <Text style={styles.upiSubtitleText}>UNIFIED PAYMENTS INTERFACE</Text>
                </View>
              </View>

              {/* [5] MYQURO MONEY SECTION (WITH TOGGLE) */}
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionHeading}>MyQuro Money</Text>
                <View style={styles.newBadgePill}>
                  <Text style={styles.newBadgeText}>NEW</Text>
                </View>
              </View>

              <View style={styles.quroMoneyCard}>
                <View style={styles.quroMoneyLeft}>
                  <View style={styles.quroPinIconBox}>
                    <Svg width={20 * SCALE} height={20 * SCALE} viewBox="0 0 24 24" fill="none">
                      <Path
                        d="M12 2C8.13 2 5 5.13 5 9C5 14.25 12 22 12 22C12 22 19 14.25 19 9C19 5.13 15.87 2 12 2ZM12 11.5C10.62 11.5 9.5 10.38 9.5 9C9.5 7.62 10.62 6.5 12 6.5C13.38 6.5 14.5 7.62 14.5 9C14.5 10.38 13.38 11.5 12 11.5Z"
                        fill="#000000"
                      />
                    </Svg>
                  </View>
                  <Text style={styles.quroMoneyLabel}>My Quro Money</Text>
                </View>

                <View style={styles.quroMoneyRight}>
                  <Text style={styles.quroMoneyBalance}>₹2</Text>
                  <Switch
                    value={quroMoneyEnabled}
                    onValueChange={setQuroMoneyEnabled}
                    trackColor={{ false: '#27272A', true: '#DEA430' }}
                    thumbColor={quroMoneyEnabled ? '#000000' : '#71717A'}
                    style={{ transform: [{ scaleX: 0.85 }, { scaleY: 0.85 }] }}
                  />
                </View>
              </View>

              {/* [6] PREFERRED PAYMENT SECTION */}
              <Text style={[styles.sectionHeading, { marginTop: 22 * SCALE, marginBottom: 12 * SCALE }]}>
                Preferred Payment
              </Text>

              <View style={styles.preferredPaymentCard}>
                {/* Google Pay */}
                <TouchableOpacity
                  style={styles.paymentOptionRow}
                  activeOpacity={0.8}
                  onPress={() => handleSelect('Google Pay')}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.gpayIconBox}>
                      <Text style={styles.gpayIconLetterG}>G</Text>
                      <Text style={styles.gpayIconText}>Pay</Text>
                    </View>
                    <Text style={styles.optionNameText}>Google Pay</Text>
                  </View>

                  <View style={[styles.radioCircle, activeMethod === 'Google Pay' && styles.radioCircleActive]}>
                    {activeMethod === 'Google Pay' && <Check size={12 * SCALE} color="#000000" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>

                {activeMethod === 'Google Pay' && (
                  <TouchableOpacity
                    style={styles.payViaMethodBtn}
                    activeOpacity={0.85}
                    onPress={() => handlePayNow('Google Pay')}
                  >
                    <Text style={styles.payViaMethodBtnText}>Pay via GooglePay</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.optionDivider} />

                {/* Saved Visa Card */}
                <TouchableOpacity
                  style={styles.paymentOptionRow}
                  activeOpacity={0.8}
                  onPress={() => handleSelect('Card')}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.visaBadgeBox}>
                      <Text style={styles.visaBadgeText}>VISA</Text>
                    </View>
                    <Text style={styles.optionNameText}>
                      Yash <Text style={styles.cardMaskDivider}>|</Text> •••• 0484
                    </Text>
                  </View>

                  <View style={[styles.radioCircle, activeMethod === 'Card' && styles.radioCircleActive]}>
                    {activeMethod === 'Card' && <Check size={12 * SCALE} color="#000000" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>

                {activeMethod === 'Card' && (
                  <TouchableOpacity
                    style={styles.payViaMethodBtn}
                    activeOpacity={0.85}
                    onPress={() => handlePayNow('Card')}
                  >
                    <Text style={styles.payViaMethodBtnText}>Pay via Card (•••• 0484)</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.optionDivider} />

                {/* super.money */}
                <TouchableOpacity
                  style={styles.paymentOptionRow}
                  activeOpacity={0.8}
                  onPress={() => handleSelect('super.money')}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.superMoneyIconBox}>
                      <Svg width={18 * SCALE} height={18 * SCALE} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12 2L4 7V17L12 22L20 17V7L12 2Z"
                          fill="#FFFFFF"
                        />
                        <Path
                          d="M12 6L7 9.5V14.5L12 18L17 14.5V9.5L12 6Z"
                          fill="#4F46E5"
                        />
                      </Svg>
                    </View>
                    <Text style={styles.optionNameText}>super.money</Text>
                  </View>

                  <View style={[styles.radioCircle, activeMethod === 'super.money' && styles.radioCircleActive]}>
                    {activeMethod === 'super.money' && <Check size={12 * SCALE} color="#000000" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>

                {activeMethod === 'super.money' && (
                  <TouchableOpacity
                    style={styles.payViaMethodBtn}
                    activeOpacity={0.85}
                    onPress={() => handlePayNow('super.money')}
                  >
                    <Text style={styles.payViaMethodBtnText}>Pay via super.money</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* [7] PAY BY ANY UPI APP */}
              <View style={styles.upiHeaderRow}>
                <View style={styles.upiBrandBadge}>
                  <Text style={styles.upiBrandText}>UPI</Text>
                  <View style={styles.upiInlineChevrons}>
                    <Text style={styles.upiInlineGreen}>▲</Text>
                    <Text style={styles.upiInlineGold}>▼</Text>
                  </View>
                </View>
                <Text style={styles.sectionHeading}>Pay by any UPI App</Text>
              </View>

              <View style={styles.upiOptionsCard}>
                {/* 1. Unlock MyQuro UPI [NEW] */}
                <TouchableOpacity
                  style={styles.paymentOptionRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      ToastAndroid.show('Setting up 1-Click Fast MyQuro UPI...', ToastAndroid.SHORT);
                    }
                  }}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.myquroUpiIconBadge}>
                      <Text style={styles.myquroUpiMiniLogo}>MY QURO</Text>
                      <Text style={styles.myquroUpiMiniSub}>UPI</Text>
                    </View>
                    <View style={styles.optionTitleSubCol}>
                      <View style={styles.titleWithBadgeRow}>
                        <Text style={styles.optionNameTextNoMargin}>Unlock MyQuro UPI</Text>
                        <View style={styles.goldNewBadge}>
                          <Text style={styles.goldNewBadgeText}>NEW</Text>
                        </View>
                      </View>
                      <Text style={styles.optionSubtext}>Activate fastest UPI in 10 seconds</Text>
                    </View>
                  </View>
                  <ChevronRight size={18 * SCALE} color="#DEA430" />
                </TouchableOpacity>

                <View style={styles.optionDivider} />

                {/* 2. PhonePe UPI */}
                <TouchableOpacity
                  style={styles.paymentOptionRow}
                  activeOpacity={0.8}
                  onPress={() => handleSelect('PhonePe')}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.phonepeIconBox}>
                      <Text style={styles.phonepeLetter}>पे</Text>
                    </View>
                    <Text style={styles.optionNameText}>PhonePe UPI</Text>
                  </View>

                  <View style={[styles.radioCircle, activeMethod === 'PhonePe' && styles.radioCircleActive]}>
                    {activeMethod === 'PhonePe' && <Check size={12 * SCALE} color="#000000" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>

                {activeMethod === 'PhonePe' && (
                  <TouchableOpacity
                    style={styles.payViaMethodBtn}
                    activeOpacity={0.85}
                    onPress={() => handlePayNow('PhonePe')}
                  >
                    <Text style={styles.payViaMethodBtnText}>Pay via PhonePe</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.optionDivider} />

                {/* 3. Amazon Pay UPI */}
                <TouchableOpacity
                  style={styles.paymentOptionRow}
                  activeOpacity={0.8}
                  onPress={() => handleSelect('Amazon Pay')}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.amazonPayIconBox}>
                      <Text style={styles.amazonPayText}>pay</Text>
                      <View style={styles.amazonPaySmile} />
                    </View>
                    <Text style={styles.optionNameText}>Amazon Pay UPI</Text>
                  </View>

                  <View style={[styles.radioCircle, activeMethod === 'Amazon Pay' && styles.radioCircleActive]}>
                    {activeMethod === 'Amazon Pay' && <Check size={12 * SCALE} color="#000000" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>

                {activeMethod === 'Amazon Pay' && (
                  <TouchableOpacity
                    style={styles.payViaMethodBtn}
                    activeOpacity={0.85}
                    onPress={() => handlePayNow('Amazon Pay')}
                  >
                    <Text style={styles.payViaMethodBtnText}>Pay via Amazon Pay</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.optionDivider} />

                {/* 4. WhatsApp */}
                <TouchableOpacity
                  style={styles.paymentOptionRow}
                  activeOpacity={0.8}
                  onPress={() => handleSelect('WhatsApp')}
                >
                  <View style={styles.optionLeft}>
                    <View style={styles.whatsappIconBox}>
                      <Svg width={20 * SCALE} height={20 * SCALE} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91C2.13 13.66 2.59 15.36 3.45 16.86L2.05 22L7.3 20.62C8.75 21.41 10.38 21.83 12.04 21.83C17.5 21.83 21.95 17.38 21.95 11.92C21.95 9.27 20.92 6.78 19.05 4.91C17.18 3.03 14.69 2 12.04 2ZM12.04 20.15C10.56 20.15 9.11 19.76 7.85 19.01L7.55 18.83L4.43 19.65L5.26 16.61L5.06 16.29C4.24 14.99 3.81 13.47 3.81 11.91C3.81 7.37 7.5 3.68 12.04 3.68C14.25 3.68 16.31 4.54 17.87 6.1C19.42 7.66 20.28 9.72 20.28 11.92C20.28 16.46 16.58 20.15 12.04 20.15ZM16.56 14.41C16.31 14.29 15.09 13.69 14.86 13.61C14.63 13.52 14.47 13.48 14.3 13.73C14.14 13.98 13.66 14.54 13.52 14.71C13.37 14.87 13.23 14.9 12.98 14.77C12.73 14.65 11.93 14.39 10.98 13.54C10.24 12.88 9.74 12.06 9.6 11.81C9.45 11.56 9.58 11.43 9.71 11.31C9.82 11.2 9.96 11.02 10.08 10.88C10.2 10.74 10.25 10.63 10.33 10.47C10.41 10.3 10.37 10.16 10.31 10.04C10.25 9.92 9.76 8.71 9.55 8.22C9.35 7.74 9.15 7.8 9 7.79C8.86 7.79 8.7 7.79 8.53 7.79C8.37 7.79 8.1 7.85 7.87 8.1C7.65 8.35 7 8.95 7 10.18C7 11.41 7.9 12.59 8.02 12.76C8.15 12.92 9.78 15.44 12.28 16.51C12.87 16.77 13.33 16.92 13.69 17.03C14.29 17.22 14.83 17.19 15.26 17.13C15.74 17.06 16.74 16.52 16.95 15.95C17.15 15.37 17.15 14.88 17.09 14.77C17.03 14.67 16.89 14.58 16.64 14.46L16.56 14.41Z"
                          fill="#FFFFFF"
                        />
                      </Svg>
                    </View>
                    <Text style={styles.optionNameText}>WhatsApp</Text>
                  </View>

                  <View style={[styles.radioCircle, activeMethod === 'WhatsApp' && styles.radioCircleActive]}>
                    {activeMethod === 'WhatsApp' && <Check size={12 * SCALE} color="#000000" strokeWidth={3} />}
                  </View>
                </TouchableOpacity>

                {activeMethod === 'WhatsApp' && (
                  <TouchableOpacity
                    style={styles.payViaMethodBtn}
                    activeOpacity={0.85}
                    onPress={() => handlePayNow('WhatsApp')}
                  >
                    <Text style={styles.payViaMethodBtnText}>Pay via WhatsApp</Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* [8] CREDIT & DEBIT CARDS */}
              <Text style={[styles.sectionHeading, { marginTop: 24 * SCALE, marginBottom: 12 * SCALE }]}>
                Credit & Debit Cards
              </Text>

              <TouchableOpacity
                style={styles.addCardContainer}
                activeOpacity={0.8}
                onPress={() => {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show('Card checkout flow selected', ToastAndroid.SHORT);
                  }
                  handleSelect('Card');
                }}
              >
                <View style={styles.addCardPlusBox}>
                  <Plus size={20 * SCALE} color="#DEA430" strokeWidth={2.5} />
                </View>

                <View style={styles.addCardInfoCol}>
                  <Text style={styles.addCardTitle}>Add New Card</Text>
                  <Text style={styles.addCardSub}>Save and Pay via Cards.</Text>
                </View>
              </TouchableOpacity>

              {/* [9] MORE PAYMENT OPTIONS */}
              <Text style={[styles.sectionHeading, { marginTop: 24 * SCALE, marginBottom: 12 * SCALE }]}>
                More Payment Options
              </Text>

              <View style={styles.moreOptionsCard}>
                {/* 1. Pay Later */}
                <TouchableOpacity
                  style={styles.moreOptionRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      ToastAndroid.show('Simpl / Lazypay Pay Later available!', ToastAndroid.SHORT);
                    }
                  }}
                >
                  <View style={styles.moreOptionLeft}>
                    <View style={styles.goldOutlineIconBox}>
                      <Receipt size={17 * SCALE} color="#DEA430" />
                    </View>
                    <Text style={styles.moreOptionTitle}>Pay Later</Text>
                  </View>
                  <ChevronRight size={18 * SCALE} color="#DEA430" />
                </TouchableOpacity>

                <View style={styles.optionDivider} />

                {/* 2. Pluxee */}
                <TouchableOpacity
                  style={styles.moreOptionRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      ToastAndroid.show('Pluxee Sodexo meal card selected', ToastAndroid.SHORT);
                    }
                  }}
                >
                  <View style={styles.moreOptionLeft}>
                    <View style={styles.goldOutlineIconBox}>
                      <CreditCard size={17 * SCALE} color="#DEA430" />
                    </View>
                    <View style={styles.moreOptionTitleCol}>
                      <Text style={styles.moreOptionTitle}>Pluxee</Text>
                      <Text style={styles.moreOptionSub}>Pluxee card valid only on Food & Instamart</Text>
                    </View>
                  </View>
                  <ChevronRight size={18 * SCALE} color="#DEA430" />
                </TouchableOpacity>

                <View style={styles.optionDivider} />

                {/* 3. Wallets */}
                <TouchableOpacity
                  style={styles.moreOptionRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      ToastAndroid.show('Wallets: PhonePe, Paytm, Amazon Pay', ToastAndroid.SHORT);
                    }
                  }}
                >
                  <View style={styles.moreOptionLeft}>
                    <View style={styles.goldOutlineIconBox}>
                      <Wallet size={17 * SCALE} color="#DEA430" />
                    </View>
                    <View style={styles.moreOptionTitleCol}>
                      <Text style={styles.moreOptionTitle}>Wallets</Text>
                      <Text style={styles.moreOptionSub}>PhonePe, Amazon Pay & more</Text>
                    </View>
                  </View>
                  <ChevronRight size={18 * SCALE} color="#DEA430" />
                </TouchableOpacity>

                <View style={styles.optionDivider} />

                {/* 4. Netbanking */}
                <TouchableOpacity
                  style={styles.moreOptionRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    if (Platform.OS === 'android') {
                      ToastAndroid.show('Netbanking: HDFC, ICICI, SBI, Axis', ToastAndroid.SHORT);
                    }
                  }}
                >
                  <View style={styles.moreOptionLeft}>
                    <View style={styles.goldOutlineIconBox}>
                      <Landmark size={17 * SCALE} color="#DEA430" />
                    </View>
                    <View style={styles.moreOptionTitleCol}>
                      <Text style={styles.moreOptionTitle}>Netbanking</Text>
                      <Text style={styles.moreOptionSub}>HDFC, ICICI, SBI, Axis & more</Text>
                    </View>
                  </View>
                  <ChevronRight size={18 * SCALE} color="#DEA430" />
                </TouchableOpacity>

                <View style={styles.optionDivider} />

                {/* 5. Pay on Delivery (Cash/UPI) -> Navigates to dedicated COD view */}
                <TouchableOpacity
                  style={styles.moreOptionRow}
                  activeOpacity={0.8}
                  onPress={() => {
                    setCurrentSubView('cod');
                    handleSelect('COD');
                  }}
                >
                  <View style={styles.moreOptionLeft}>
                    <View style={styles.goldOutlineIconBox}>
                      <Banknote size={17 * SCALE} color="#DEA430" />
                    </View>
                    <View style={styles.moreOptionTitleCol}>
                      <Text style={styles.moreOptionTitle}>Pay on Delivery (Cash/UPI)</Text>
                      <Text style={styles.moreOptionSub}>Pay cash or ask for QR code</Text>
                    </View>
                  </View>
                  <ChevronRight size={18 * SCALE} color="#DEA430" />
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  subViewContainer: {
    flex: 1,
    backgroundColor: '#000000',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18 * SCALE,
    paddingVertical: 14 * SCALE,
    borderBottomWidth: 1,
    borderBottomColor: '#16171B',
  },
  backBtn: {
    padding: 6 * SCALE,
    marginRight: 10 * SCALE,
  },
  headerTitleCol: {
    flex: 1,
  },
  headerMainTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18 * SCALE,
    color: '#FFFFFF',
    letterSpacing: 0.2,
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13 * SCALE,
    color: '#A1A1AA',
    marginTop: 2 * SCALE,
  },
  scrollContent: {
    paddingHorizontal: 16 * SCALE,
    paddingTop: 14 * SCALE,
  },

  // ── Summary Card ──
  summaryCard: {
    backgroundColor: '#111215',
    borderRadius: 16 * SCALE,
    borderWidth: 1,
    borderColor: '#1E1F24',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 14 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12 * SCALE,
  },
  routeCol: {
    alignItems: 'center',
    marginRight: 14 * SCALE,
  },
  routeTopCircle: {
    width: 10 * SCALE,
    height: 10 * SCALE,
    borderRadius: 5 * SCALE,
    borderWidth: 2,
    borderColor: '#DEA430',
    backgroundColor: '#000000',
  },
  routeLine: {
    width: 2,
    height: 20 * SCALE,
    backgroundColor: '#DEA430',
    marginVertical: 2,
  },
  routeBottomCircle: {
    width: 10 * SCALE,
    height: 10 * SCALE,
    borderRadius: 5 * SCALE,
    borderWidth: 2,
    borderColor: '#DEA430',
    backgroundColor: '#000000',
  },
  summaryInfoCol: {
    flex: 1,
  },
  summaryLineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'nowrap',
  },
  summaryResName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#FFFFFF',
    maxWidth: '45%',
  },
  summaryDivider: {
    color: '#52525B',
    marginHorizontal: 8 * SCALE,
    fontSize: 12 * SCALE,
  },
  summaryDeliveryPrefix: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#D4D4D8',
  },
  summaryDeliveryTime: {
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },
  summaryAddressLabel: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13 * SCALE,
    color: '#FFFFFF',
  },
  summaryAddressText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#A1A1AA',
    flex: 1,
  },

  // ── Offers Row Card ──
  offersRowCard: {
    backgroundColor: '#111215',
    borderRadius: 14 * SCALE,
    borderWidth: 1,
    borderColor: '#1E1F24',
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 13 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14 * SCALE,
  },
  offersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerBadgeBox: {
    marginRight: 12 * SCALE,
  },
  offersText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5 * SCALE,
    color: '#F4F4F5',
  },

  // ── UPI Promotional Banner Card ──
  upiBannerCard: {
    backgroundColor: '#141416',
    borderRadius: 18 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.28)',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 16 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20 * SCALE,
  },
  upiBannerLeft: {
    flex: 1,
    paddingRight: 10 * SCALE,
  },
  upiBannerTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5 * SCALE,
    color: '#FFFFFF',
  },
  upiBannerTitleGold: {
    fontFamily: 'Urbanist-Black',
    color: '#DEA430',
  },
  upiBannerSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#A1A1AA',
    marginTop: 6 * SCALE,
    marginBottom: 12 * SCALE,
    lineHeight: 16 * SCALE,
  },
  upiActivateBtn: {
    backgroundColor: '#000000',
    borderWidth: 1.2,
    borderColor: '#DEA430',
    borderRadius: 20 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 7 * SCALE,
    alignSelf: 'flex-start',
  },
  upiActivateBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#DEA430',
  },
  upiLogoCol: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#09090B',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 10 * SCALE,
    borderWidth: 1,
    borderColor: '#27272A',
  },
  quroUpiBrandTitle: {
    fontFamily: 'Urbanist-Black',
    fontSize: 13 * SCALE,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  quroUpiSymbolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 2,
  },
  quroUpiSymbolText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 22 * SCALE,
    color: '#DEA430',
    letterSpacing: 1,
  },
  upiArrowsWrap: {
    marginLeft: 3,
    alignItems: 'center',
  },
  upiArrowGreen: {
    fontSize: 8 * SCALE,
    color: '#10B981',
    lineHeight: 8 * SCALE,
  },
  upiArrowGold: {
    fontSize: 8 * SCALE,
    color: '#DEA430',
    lineHeight: 8 * SCALE,
  },
  upiSubtitleText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 6 * SCALE,
    color: '#71717A',
    letterSpacing: 0.4,
  },

  // ── Quro Money Section ──
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10 * SCALE,
  },
  sectionHeading: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * SCALE,
    color: '#FFFFFF',
  },
  newBadgePill: {
    backgroundColor: '#352A12',
    borderRadius: 4 * SCALE,
    paddingHorizontal: 6 * SCALE,
    paddingVertical: 2 * SCALE,
    marginLeft: 8 * SCALE,
    borderWidth: 0.5,
    borderColor: '#DEA430',
  },
  newBadgeText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 9.5 * SCALE,
    color: '#DEA430',
    letterSpacing: 0.5,
  },
  quroMoneyCard: {
    backgroundColor: '#111215',
    borderRadius: 16 * SCALE,
    borderWidth: 1,
    borderColor: '#1E1F24',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 14 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12 * SCALE,
  },
  quroMoneyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quroPinIconBox: {
    width: 38 * SCALE,
    height: 38 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14 * SCALE,
  },
  quroMoneyLabel: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 15 * SCALE,
    color: '#FFFFFF',
  },
  quroMoneyRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quroMoneyBalance: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#FFFFFF',
    marginRight: 10 * SCALE,
  },

  // ── COD Dedicated Card ──
  codCardContainer: {
    backgroundColor: '#111215',
    borderRadius: 16 * SCALE,
    borderWidth: 1,
    borderColor: '#1E1F24',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 16 * SCALE,
    marginTop: 2 * SCALE,
  },
  codCardContainerActive: {
    borderColor: 'rgba(222, 164, 48, 0.4)',
  },
  codCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  codCurrencyIconBox: {
    width: 40 * SCALE,
    height: 34 * SCALE,
    borderRadius: 8 * SCALE,
    backgroundColor: '#16171B',
    borderWidth: 1.2,
    borderColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
  },
  codTextCol: {
    marginLeft: 14 * SCALE,
    flex: 1,
  },
  codTitleText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 15 * SCALE,
    color: '#FFFFFF',
  },
  codSubText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#A1A1AA',
    marginTop: 2 * SCALE,
  },

  // ── Preferred Payment Card ──
  preferredPaymentCard: {
    backgroundColor: '#111215',
    borderRadius: 18 * SCALE,
    borderWidth: 1,
    borderColor: '#1E1F24',
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 8 * SCALE,
  },
  paymentOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12 * SCALE,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  optionNameText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 14.5 * SCALE,
    color: '#FFFFFF',
    marginLeft: 12 * SCALE,
  },
  cardMaskDivider: {
    color: '#52525B',
    marginHorizontal: 4 * SCALE,
  },
  optionDivider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    marginVertical: 2 * SCALE,
  },

  // ── Pay by any UPI App ──
  upiHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 24 * SCALE,
    marginBottom: 12 * SCALE,
  },
  upiBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8 * SCALE,
  },
  upiBrandText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 16 * SCALE,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  upiInlineChevrons: {
    marginLeft: 2,
    alignItems: 'center',
  },
  upiInlineGreen: {
    fontSize: 6 * SCALE,
    color: '#10B981',
    lineHeight: 6 * SCALE,
  },
  upiInlineGold: {
    fontSize: 6 * SCALE,
    color: '#DEA430',
    lineHeight: 6 * SCALE,
  },
  upiOptionsCard: {
    backgroundColor: '#111215',
    borderRadius: 18 * SCALE,
    borderWidth: 1,
    borderColor: '#1E1F24',
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 8 * SCALE,
  },
  myquroUpiIconBadge: {
    width: 38 * SCALE,
    height: 38 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#1C1D22',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  myquroUpiMiniLogo: {
    fontFamily: 'Urbanist-Black',
    fontSize: 6.5 * SCALE,
    color: '#FFFFFF',
  },
  myquroUpiMiniSub: {
    fontFamily: 'Urbanist-Black',
    fontSize: 11 * SCALE,
    color: '#DEA430',
    marginTop: -1,
  },
  optionTitleSubCol: {
    marginLeft: 12 * SCALE,
    flex: 1,
  },
  titleWithBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  optionNameTextNoMargin: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 14.5 * SCALE,
    color: '#FFFFFF',
  },
  goldNewBadge: {
    backgroundColor: '#EAB308',
    borderRadius: 4 * SCALE,
    paddingHorizontal: 5 * SCALE,
    paddingVertical: 1.5 * SCALE,
    marginLeft: 8 * SCALE,
  },
  goldNewBadgeText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 9.5 * SCALE,
    color: '#000000',
  },
  optionSubtext: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#A1A1AA',
    marginTop: 2 * SCALE,
  },
  phonepeIconBox: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#5F259F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  phonepeLetter: {
    fontFamily: 'Urbanist-Black',
    fontSize: 18 * SCALE,
    color: '#FFFFFF',
  },
  amazonPayIconBox: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#18181B',
    borderWidth: 1,
    borderColor: '#27272A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  amazonPayText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#FFFFFF',
  },
  amazonPaySmile: {
    width: 14 * SCALE,
    height: 2,
    backgroundColor: '#F59E0B',
    borderRadius: 1,
    marginTop: 2,
  },
  whatsappIconBox: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#25D366',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // ── Credit & Debit Cards ──
  addCardContainer: {
    backgroundColor: '#111215',
    borderRadius: 18 * SCALE,
    borderWidth: 1,
    borderColor: '#1E1F24',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 14 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
  },
  addCardPlusBox: {
    width: 38 * SCALE,
    height: 38 * SCALE,
    borderRadius: 10 * SCALE,
    borderWidth: 1.2,
    borderColor: '#DEA430',
    backgroundColor: '#16171B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addCardInfoCol: {
    marginLeft: 14 * SCALE,
    flex: 1,
  },
  addCardTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5 * SCALE,
    color: '#DEA430',
  },
  addCardSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#A1A1AA',
    marginTop: 2 * SCALE,
  },

  // ── More Payment Options ──
  moreOptionsCard: {
    backgroundColor: '#111215',
    borderRadius: 18 * SCALE,
    borderWidth: 1,
    borderColor: '#1E1F24',
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 8 * SCALE,
  },
  moreOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12 * SCALE,
  },
  moreOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  goldOutlineIconBox: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#16171B',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  moreOptionTitleCol: {
    marginLeft: 12 * SCALE,
    flex: 1,
  },
  moreOptionTitle: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 14.5 * SCALE,
    color: '#FFFFFF',
    marginLeft: 12 * SCALE,
  },
  moreOptionSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#A1A1AA',
    marginTop: 2 * SCALE,
    marginLeft: 12 * SCALE,
  },

  // Radio circle
  radioCircle: {
    width: 22 * SCALE,
    height: 22 * SCALE,
    borderRadius: 11 * SCALE,
    borderWidth: 1.5,
    borderColor: '#DEA430',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
  },
  radioCircleActive: {
    backgroundColor: '#DEA430',
  },

  // Logos / Badges
  gpayIconBox: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  gpayIconLetterG: {
    fontFamily: 'Urbanist-Black',
    fontSize: 15 * SCALE,
    color: '#4285F4',
  },
  gpayIconText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#5F6368',
    marginLeft: 1,
  },
  visaBadgeBox: {
    width: 36 * SCALE,
    height: 26 * SCALE,
    borderRadius: 6 * SCALE,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  visaBadgeText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 11 * SCALE,
    color: '#1A1F71',
    letterSpacing: 0.5,
  },
  superMoneyIconBox: {
    width: 36 * SCALE,
    height: 36 * SCALE,
    borderRadius: 10 * SCALE,
    backgroundColor: '#4338CA',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Expanded Pay Button
  payViaMethodBtn: {
    backgroundColor: '#000000',
    borderWidth: 1.2,
    borderColor: '#DEA430',
    borderRadius: 12 * SCALE,
    height: 44 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4 * SCALE,
    marginBottom: 10 * SCALE,
  },
  payViaMethodBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#DEA430',
    letterSpacing: 0.3,
  },
});
