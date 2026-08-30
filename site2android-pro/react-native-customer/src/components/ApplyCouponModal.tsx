/**
 * ApplyCouponModal.tsx — MyQuro Customer App
 * 
 * 100% Dynamic & Pixel-Perfect Implementation matching Figma Node 3029:1641
 * - Header with Back Arrow, "APPLY COUPON" & dynamic "Your cart: ₹{cartTotal}"
 * - Manual Coupon Code input box with golden ticket icon and APPLY CTA
 * - Cart Eligibility Info Banner (with dynamic savings/shortfall feedback)
 * - "MORE OFFERS" section header
 * - Ticket-style Coupon Cards with:
 *   * Vertical Left Stub (-90° rotated discount badge e.g. "40% OFF", "₹125 OFF", "3% OFF")
 *   * Left notch cutout and vertical dashed perforation
 *   * Promo Code Title + Gold Outline APPLY / Solid Gold APPLIED Button
 *   * Lock icon with dynamic "Add ₹X more to avail this offer" (or unlocked green state)
 *   * Discount benefit highlight with percent tag icon
 *   * Dashed divider line & detailed description
 *   * Expandable "+ MORE" / "- LESS" terms & conditions
 *   * "View Add-On Payment Offers ↓" accordion for DEALZONE & partner bank cashbacks
 */

import React, { useState, useEffect, useMemo } from 'react';
import { BACKEND_URL } from '../config';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
  Platform,
  Alert,
  ToastAndroid,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';

// ─── Figma Node 3029:1641 Coupon Assets ───────────────────────────────────────
const couponTicketIcon      = require('../assets/coupons/couponTicketIcon.png');
const couponInfoIcon        = require('../assets/coupons/couponInfoIcon.png');
const couponBackArrow       = require('../assets/coupons/couponBackArrow.png');
const couponLockIcon        = require('../assets/coupons/couponLockIcon.png');
const couponPercentTag      = require('../assets/coupons/couponPercentTag.png');
const couponDashedDivider   = require('../assets/coupons/couponDashedDivider.png');
const couponOfferBadge      = require('../assets/coupons/couponOfferBadge.png');
const couponDownArrow       = require('../assets/coupons/couponDownArrow.png');
const couponSidePerforation = require('../assets/coupons/couponSidePerforation.png');
const couponNotchLeft       = require('../assets/coupons/couponNotchLeft.png');

export interface SimCoupon {
  code: string;
  description: string;
  discount: number;
  minOrder: number;
  badge?: string;
  discountType?: 'percentage' | 'flat';
  discountValue?: number;
  maxDiscount?: number;
  benefitHighlight?: string;
  hasPaymentAddons?: boolean;
  terms?: string[];
}

export const ALL_COUPONS: SimCoupon[] = [
  {
    code: 'SWIGGYIT',
    badge: '40% OFF',
    discount: 80,
    minOrder: 199,
    discountType: 'percentage',
    discountValue: 40,
    maxDiscount: 80,
    benefitHighlight: 'Get 40% off',
    description: 'Use code SWIGGYIT & get 40% off on orders above ₹199. Maximum discount: ₹80.',
    terms: [
      'Valid on total order value above ₹199',
      'Maximum discount is capped at ₹80',
      'Applicable on all eligible menu items',
      'Cannot be clubbed with other promotional coupons',
    ],
  },
  {
    code: 'FLAVORFUL',
    badge: '₹125 OFF',
    discount: 125,
    minOrder: 399,
    discountType: 'flat',
    discountValue: 125,
    maxDiscount: 125,
    benefitHighlight: 'Get Flat Rs.125 off',
    description: 'Use code FLAVORFUL & get FLAT ₹125 Off on orders above ₹399',
    terms: [
      'Applicable on orders with food total ₹399 and above',
      'Flat instant discount of ₹125 applied to total bill',
      'Valid once per customer per day',
    ],
  },
  {
    code: 'DEALZONE',
    badge: '3% OFF',
    discount: 30,
    minOrder: 499,
    discountType: 'percentage',
    discountValue: 3,
    maxDiscount: 50,
    benefitHighlight: 'Get 3% off on all items',
    description: 'Use code DEALZONE & get 3% instant off + unlocked payment offers on orders above ₹499.',
    hasPaymentAddons: true,
    terms: [
      'Valid on orders above ₹499',
      '3% instant savings on order total',
      'Unlocks special bank & wallet cashback deals upon checkout',
    ],
  },
  {
    code: 'DELULU4FOOD',
    badge: '70% OFF',
    discount: 140,
    minOrder: 199,
    discountType: 'percentage',
    discountValue: 70,
    maxDiscount: 140,
    benefitHighlight: 'Get 70% off up to ₹140',
    description: 'Use code DELULU4FOOD & get 70% OFF up to ₹140 on orders above ₹199.',
    terms: [
      'Special introductory foodie offer',
      'Maximum discount is capped at ₹140',
      'Applicable on orders of ₹199 and above',
    ],
  },
  {
    code: 'MYQURO',
    badge: '₹50 OFF',
    discount: 50,
    minOrder: 249,
    discountType: 'flat',
    discountValue: 50,
    maxDiscount: 50,
    benefitHighlight: 'Get Flat ₹50 off',
    description: 'Exclusive benefit for MyQURO Gold Members on orders above ₹249.',
    terms: [
      'Active MyQURO membership required',
      'Flat ₹50 savings on food total above ₹249',
    ],
  },
  {
    code: 'FLAT300',
    badge: '₹300 OFF',
    discount: 300,
    minOrder: 500,
    discountType: 'flat',
    discountValue: 300,
    maxDiscount: 300,
    benefitHighlight: 'Get Flat ₹300 off',
    description: 'Use code FLAT300 & get FLAT ₹300 Off on bulk orders above ₹500.',
    terms: [
      'Applicable on party & bulk orders above ₹500',
      'Flat ₹300 instant reduction on bill value',
    ],
  },
];

export interface ApplyCouponModalProps {
  visible: boolean;
  onClose: () => void;
  cartTotal: number;
  appliedCoupon: SimCoupon | null;
  onApplyCoupon: (coupon: SimCoupon | null) => void;
  restaurantId?: string;
}

export const ApplyCouponModal: React.FC<ApplyCouponModalProps> = ({
  visible,
  onClose,
  cartTotal,
  appliedCoupon,
  onApplyCoupon,
  restaurantId,
}) => {
  const insets = useSafeAreaInsets();
  const [manualCode, setManualCode] = useState('');
  const [expandedTerms, setExpandedTerms] = useState<{ [code: string]: boolean }>({});
  const [expandedPaymentOffers, setExpandedPaymentOffers] = useState<{ [code: string]: boolean }>({});
  const [offersList, setOffersList] = useState<any[]>([]);

  useEffect(() => {
    if (!restaurantId || !visible) return;

    const fetchOffers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/offers/public/${restaurantId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.offers) {
            setOffersList(data.offers);
          }
        }
      } catch (err) {
        console.warn('⚠️ [ApplyCouponModal] Error fetching offers:', err);
      }
    };
    fetchOffers();
  }, [restaurantId, visible]);

  const coupons = useMemo<SimCoupon[]>(() => {
    if (offersList.length > 0) {
      return offersList.map((o: any) => {
        const discountType = o.offerType === 'percentage' ? 'percentage' : 'flat';
        const discountValue = o.discountValue;
        const badge = discountType === 'percentage' ? `${discountValue}% OFF` : `₹${discountValue} OFF`;
        return {
          code: o.code,
          badge,
          discount: discountValue,
          minOrder: o.minOrderValue || 0,
          discountType,
          discountValue,
          maxDiscount: o.maxDiscountAmount || discountValue,
          benefitHighlight: discountType === 'percentage' ? `Get ${discountValue}% off` : `Get Flat ₹${discountValue} off`,
          description: o.description || `Use code ${o.code} & get ${discountType === 'percentage' ? discountValue + '% off' : 'Flat ₹' + discountValue + ' Off'} on your order.`,
          terms: [
            `Valid on order value above ₹${o.minOrderValue || 0}`,
            discountType === 'percentage' ? `Maximum discount capped at ₹${o.maxDiscountAmount || discountValue}` : `Flat savings of ₹${discountValue} applied instantly`,
          ],
        };
      });
    }
    return ALL_COUPONS;
  }, [offersList]);

  const showToast = (msg: string) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(msg, ToastAndroid.SHORT);
    } else {
      Alert.alert('Coupon Update', msg);
    }
  };

  const handleApply = (coupon: SimCoupon) => {
    const isAlreadyApplied = appliedCoupon?.code === coupon.code;
    if (isAlreadyApplied) {
      onApplyCoupon(null);
      showToast(`Coupon ${coupon.code} removed`);
      return;
    }

    if (cartTotal < coupon.minOrder) {
      const diff = coupon.minOrder - cartTotal;
      showToast(`Add items worth ₹${diff} more to apply ${coupon.code}`);
      return;
    }

    // Calculate dynamic discount
    let calculatedDiscount = coupon.discount;
    if (coupon.discountType === 'percentage' && coupon.discountValue) {
      const calc = Math.round((cartTotal * coupon.discountValue) / 100);
      calculatedDiscount = coupon.maxDiscount ? Math.min(calc, coupon.maxDiscount) : calc;
    }

    const applied: SimCoupon = {
      ...coupon,
      discount: calculatedDiscount,
    };

    onApplyCoupon(applied);
    showToast(`Coupon ${coupon.code} applied! Saved ₹${calculatedDiscount}`);
    onClose();
  };

  const handleManualApply = () => {
    const trimmed = manualCode.trim().toUpperCase();
    if (!trimmed) {
      showToast('Please enter a coupon code');
      return;
    }

    const found = coupons.find((c) => c.code.toUpperCase() === trimmed);
    if (found) {
      handleApply(found);
      setManualCode('');
    } else {
      showToast(`Invalid coupon code '${trimmed}'`);
    }
  };

  const toggleTerms = (code: string) => {
    setExpandedTerms((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  const togglePaymentOffers = (code: string) => {
    setExpandedPaymentOffers((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: insets.top > 0 ? insets.top : (Platform.OS === 'ios' ? 44 : 12) }]}>
        
        {/* ════════════════════════════════════════════════════════════════════════
            [1] HEADER: BACK ARROW + "APPLY COUPON" + "Your cart: ₹{cartTotal}"
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.headerRow}>
          <TouchableOpacity style={styles.backBtn} activeOpacity={0.8} onPress={onClose}>
            <Image source={couponBackArrow} style={styles.backArrowImg} />
          </TouchableOpacity>

          <View style={styles.headerTitlesCol}>
            <Text style={styles.headerMainTitle}>APPLY COUPON</Text>
            <Text style={styles.headerSubtitle}>
              Your cart: <Text style={styles.headerCartPrice}>₹{cartTotal}</Text>
            </Text>
          </View>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* ════════════════════════════════════════════════════════════════════════
              [2] MANUAL COUPON INPUT BOX
              ════════════════════════════════════════════════════════════════════════ */}
          <View style={styles.manualInputCard}>
            <Image source={couponTicketIcon} style={styles.inputTicketIcon} />

            <TextInput
              style={styles.textInput}
              placeholder="Enter Coupon Code"
              placeholderTextColor="#7A7A7A"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              autoCorrect={false}
            />

            <TouchableOpacity
              style={styles.manualApplyBtn}
              activeOpacity={0.8}
              onPress={handleManualApply}
            >
              <Text style={styles.manualApplyText}>APPLY</Text>
            </TouchableOpacity>
          </View>

          {/* ════════════════════════════════════════════════════════════════════════
              [3] CART ELIGIBILITY BANNER
              ════════════════════════════════════════════════════════════════════════ */}
          <View style={styles.eligibilityBanner}>
            <Image source={couponInfoIcon} style={styles.infoIconImg} />
            <Text style={styles.eligibilityText}>
              {appliedCoupon
                ? `Coupon '${appliedCoupon.code}' applied! You are saving ₹${appliedCoupon.discount} on this order.`
                : cartTotal < 199
                ? 'Items added to your cart are not eligible for any coupons (Min. cart ₹199)'
                : 'Great! You have unlocked special coupon discounts for your cart.'}
            </Text>
          </View>

          {/* ════════════════════════════════════════════════════════════════════════
              [4] "MORE OFFERS" SECTION
              ════════════════════════════════════════════════════════════════════════ */}
          <Text style={styles.sectionTitle}>MORE OFFERS</Text>

          {/* ════════════════════════════════════════════════════════════════════════
              [5] COUPON TICKET CARDS LIST (FIGMA NODE 3029:1641)
              ════════════════════════════════════════════════════════════════════════ */}
          {coupons.map((coupon) => {
            const isApplied = appliedCoupon?.code === coupon.code;
            const isEligible = cartTotal >= coupon.minOrder;
            const shortfall = coupon.minOrder - cartTotal;
            const isTermsOpen = !!expandedTerms[coupon.code];
            const isPayOpen = !!expandedPaymentOffers[coupon.code];

            return (
              <View key={coupon.code} style={styles.ticketCard}>
                
                {/* Left Side Stub with Rotated Text & Notch */}
                <View style={styles.ticketStub}>
                  {/* Notch cutout */}
                  <Image source={couponNotchLeft} style={styles.notchLeftImg} />
                  
                  {/* Rotated Vertical Discount Text */}
                  <View style={styles.rotatedTextWrap}>
                    <Text style={styles.verticalBadgeText}>
                      {coupon.badge || `${coupon.discountValue}% OFF`}
                    </Text>
                  </View>

                  {/* Vertical Perforated Line */}
                  <Image source={couponSidePerforation} style={styles.perforationImg} />
                </View>

                {/* Right Body Content */}
                <View style={styles.ticketBody}>
                  
                  {/* Header: Code + Apply Button */}
                  <View style={styles.ticketHeaderRow}>
                    <Text style={styles.couponTitleText}>{coupon.code}</Text>

                    <TouchableOpacity
                      style={[
                        styles.couponApplyBtn,
                        isApplied && styles.couponApplyBtnActive,
                      ]}
                      activeOpacity={0.85}
                      onPress={() => handleApply(coupon)}
                    >
                      <Text
                        style={[
                          styles.couponApplyBtnText,
                          isApplied && styles.couponApplyBtnTextActive,
                        ]}
                      >
                        {isApplied ? 'REMOVE' : 'APPLY'}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Condition Line: Lock icon + Shortfall or Unlocked */}
                  <View style={styles.requirementRow}>
                    <Image source={couponLockIcon} style={styles.lockIconImg} />
                    <Text
                      style={[
                        styles.requirementText,
                        isEligible && styles.requirementTextGreen,
                      ]}
                    >
                      {isEligible
                        ? 'Unlocked for your cart!'
                        : `Add ₹${shortfall} more to avail this offer`}
                    </Text>
                  </View>

                  {/* Benefit Line: Percent Tag + Highlight */}
                  <View style={styles.benefitRow}>
                    <Image source={couponPercentTag} style={styles.percentTagImg} />
                    <Text style={styles.benefitText}>
                      {coupon.benefitHighlight || `Get ${coupon.discountValue}% off`}
                    </Text>
                  </View>

                  {/* Dashed Divider Line */}
                  <Image source={couponDashedDivider} style={styles.dashedDividerImg} />

                  {/* Detailed Description */}
                  <Text style={styles.descriptionText}>{coupon.description}</Text>

                  {/* Expandable Terms (+ MORE / - LESS) */}
                  <TouchableOpacity
                    style={styles.moreTermsBtn}
                    activeOpacity={0.8}
                    onPress={() => toggleTerms(coupon.code)}
                  >
                    <Text style={styles.moreTermsText}>
                      {isTermsOpen ? '− LESS' : '+ MORE'}
                    </Text>
                  </TouchableOpacity>

                  {/* Expanded Terms and Conditions */}
                  {isTermsOpen && coupon.terms && (
                    <View style={styles.termsBox}>
                      <Text style={styles.termsHeader}>TERMS & CONDITIONS</Text>
                      {coupon.terms.map((t, idx) => (
                        <View key={`term-${idx}`} style={styles.termBulletRow}>
                          <Text style={styles.termBullet}>•</Text>
                          <Text style={styles.termText}>{t}</Text>
                        </View>
                      ))}
                    </View>
                  )}

                  {/* Add-On Payment Offers (e.g. for DEALZONE) */}
                  {coupon.hasPaymentAddons && (
                    <View style={styles.paymentOffersContainer}>
                      <TouchableOpacity
                        style={styles.viewPaymentOffersBtn}
                        activeOpacity={0.85}
                        onPress={() => togglePaymentOffers(coupon.code)}
                      >
                        <View style={styles.viewPaymentOffersLeft}>
                          <Image source={couponOfferBadge} style={styles.offerBadgeImg} />
                          <Text style={styles.viewPaymentOffersText}>
                            View Add-On Payment Offers
                          </Text>
                        </View>
                        <Image
                          source={couponDownArrow}
                          style={[
                            styles.downArrowImg,
                            isPayOpen && { transform: [{ rotate: '180deg' }] },
                          ]}
                        />
                      </TouchableOpacity>

                      {isPayOpen && (
                        <View style={styles.paymentOffersList}>
                          <View style={styles.paymentOfferItem}>
                            <Text style={styles.bankNameText}>⚡ Paytm UPI</Text>
                            <Text style={styles.bankOfferDesc}>
                              Get extra ₹25 cashback on transactions above ₹499.
                            </Text>
                          </View>
                          <View style={styles.paymentOfferItem}>
                            <Text style={styles.bankNameText}>💳 HDFC / ICICI Cards</Text>
                            <Text style={styles.bankOfferDesc}>
                              Instant 10% discount up to ₹100 on credit card checkout.
                            </Text>
                          </View>
                          <View style={styles.paymentOfferItem}>
                            <Text style={styles.bankNameText}>🪙 CRED Pay</Text>
                            <Text style={styles.bankOfferDesc}>
                              Assured cashback up to ₹60 via CRED UPI.
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  )}

                </View>
              </View>
            );
          })}

          <View style={{ height: 40 * SCALE }} />
        </ScrollView>
      </View>
    </Modal>
  );
};

// ─── Pixel-Perfect Responsive Styles Matching Node 3029:1641 ──────────────────
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    paddingHorizontal: 16 * SCALE,
    paddingTop: 10 * SCALE,
    paddingBottom: 40 * SCALE,
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },

  // ── 1. HEADER ──────────────────────────────────────────────────
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 12 * SCALE,
    backgroundColor: '#000000',
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },
  backBtn: {
    padding: 6 * SCALE,
    marginRight: 10 * SCALE,
  },
  backArrowImg: {
    width: 20 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },
  headerTitlesCol: {
    justifyContent: 'center',
  },
  headerMainTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16 * SCALE,
    color: '#D1D1D1',
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12 * SCALE,
    color: '#6D6D6C',
    marginTop: 2,
  },
  headerCartPrice: {
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
  },

  // ── 2. MANUAL INPUT CARD ───────────────────────────────────────
  manualInputCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#060606',
    borderWidth: 1,
    borderColor: '#513C12',
    borderRadius: 16 * SCALE,
    paddingHorizontal: 14 * SCALE,
    height: 52 * SCALE,
    marginBottom: 12 * SCALE,
  },
  inputTicketIcon: {
    width: 20 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
    marginRight: 10 * SCALE,
  },
  textInput: {
    flex: 1,
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#FFFFFF',
    paddingVertical: 0,
  },
  manualApplyBtn: {
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 6 * SCALE,
  },
  manualApplyText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#C19539',
    letterSpacing: 0.5,
  },

  // ── 3. ELIGIBILITY BANNER ──────────────────────────────────────
  eligibilityBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#050606',
    borderWidth: 1,
    borderColor: '#201E1B',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 12 * SCALE,
    marginBottom: 20 * SCALE,
    gap: 10 * SCALE,
  },
  infoIconImg: {
    width: 18 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },
  eligibilityText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#B9B9B9',
    lineHeight: 16 * SCALE,
  },

  // ── 4. SECTION TITLE ───────────────────────────────────────────
  sectionTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#DEA430',
    letterSpacing: 0.8,
    marginBottom: 12 * SCALE,
  },

  // ── 5. COUPON TICKET CARDS ─────────────────────────────────────
  ticketCard: {
    flexDirection: 'row',
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#241E15',
    borderRadius: 16 * SCALE,
    marginBottom: 16 * SCALE,
    overflow: 'hidden',
  },

  // Left Stub (Rotated Badge)
  ticketStub: {
    width: 58 * SCALE,
    backgroundColor: '#0B0A08',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notchLeftImg: {
    position: 'absolute',
    left: 0,
    top: '50%',
    marginTop: -14 * SCALE,
    width: 8 * SCALE,
    height: 28 * SCALE,
    resizeMode: 'contain',
  },
  rotatedTextWrap: {
    transform: [{ rotate: '-90deg' }],
    width: 120 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  verticalBadgeText: {
    fontFamily: 'Urbanist-Black',
    fontSize: 16 * SCALE,
    color: '#D1A643',
    letterSpacing: 0.5,
    textAlign: 'center',
  },
  perforationImg: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: 3 * SCALE,
    height: '100%',
    resizeMode: 'stretch',
  },

  // Right Body
  ticketBody: {
    flex: 1,
    padding: 14 * SCALE,
  },
  ticketHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6 * SCALE,
  },
  couponTitleText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17 * SCALE,
    color: '#D6D6D6',
    letterSpacing: 0.4,
  },
  couponApplyBtn: {
    backgroundColor: '#000001',
    borderWidth: 1,
    borderColor: '#CC891D',
    borderRadius: 18 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 5 * SCALE,
  },
  couponApplyBtnActive: {
    backgroundColor: '#DEA430',
    borderColor: '#DEA430',
  },
  couponApplyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#A47D27',
    letterSpacing: 0.5,
  },
  couponApplyBtnTextActive: {
    color: '#000000',
  },

  // Requirement & Benefit Rows
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
    marginBottom: 4 * SCALE,
  },
  lockIconImg: {
    width: 12 * SCALE,
    height: 14 * SCALE,
    resizeMode: 'contain',
  },
  requirementText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#737373',
  },
  requirementTextGreen: {
    color: '#488F59',
    fontFamily: 'Urbanist-SemiBold',
  },

  benefitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
    marginBottom: 8 * SCALE,
  },
  percentTagImg: {
    width: 13 * SCALE,
    height: 13 * SCALE,
    resizeMode: 'contain',
  },
  benefitText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#B3B3B3',
  },

  // Divider & Description
  dashedDividerImg: {
    width: '100%',
    height: 2 * SCALE,
    resizeMode: 'stretch',
    marginVertical: 6 * SCALE,
    opacity: 0.5,
  },
  descriptionText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#707070',
    lineHeight: 16 * SCALE,
    marginBottom: 6 * SCALE,
  },

  // + MORE Terms
  moreTermsBtn: {
    alignSelf: 'flex-start',
    paddingVertical: 2 * SCALE,
  },
  moreTermsText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#B4903A',
  },
  termsBox: {
    backgroundColor: '#050505',
    borderWidth: 1,
    borderColor: '#1C1A16',
    borderRadius: 10 * SCALE,
    padding: 10 * SCALE,
    marginTop: 8 * SCALE,
    marginBottom: 4 * SCALE,
  },
  termsHeader: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10.5 * SCALE,
    color: '#9E7D30',
    marginBottom: 6 * SCALE,
  },
  termBulletRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 3 * SCALE,
    gap: 6 * SCALE,
  },
  termBullet: {
    color: '#707070',
    fontSize: 10 * SCALE,
  },
  termText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#7E7E7E',
    lineHeight: 14 * SCALE,
  },

  // Add-On Payment Offers
  paymentOffersContainer: {
    marginTop: 10 * SCALE,
  },
  viewPaymentOffersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#060606',
    borderWidth: 1,
    borderColor: '#513C12',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 8 * SCALE,
  },
  viewPaymentOffersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * SCALE,
  },
  offerBadgeImg: {
    width: 18 * SCALE,
    height: 18 * SCALE,
    resizeMode: 'contain',
  },
  viewPaymentOffersText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#C2C2C2',
  },
  downArrowImg: {
    width: 12 * SCALE,
    height: 10 * SCALE,
    resizeMode: 'contain',
  },
  paymentOffersList: {
    backgroundColor: '#040404',
    borderWidth: 1,
    borderColor: '#1F1B14',
    borderRadius: 12 * SCALE,
    padding: 10 * SCALE,
    marginTop: 6 * SCALE,
    gap: 8 * SCALE,
  },
  paymentOfferItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#12110E',
    paddingBottom: 6 * SCALE,
  },
  bankNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#DEA430',
    marginBottom: 2,
  },
  bankOfferDesc: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11 * SCALE,
    color: '#8E8E8E',
    lineHeight: 14 * SCALE,
  },
});
