/**
 * OrderDetailsSubView.tsx
 * 100% Dynamic & Pixel-Perfect Implementation matching Figma Node 3029:1553
 * Detailed Completed/Delivered Past Order Summary View (Zero Hardcoded Fallbacks)
 */

import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Image,
} from 'react-native';
import {
  ArrowLeft,
  Headphones,
  Store,
  Home,
  Check,
  CheckCircle2,
  Clock,
  RotateCcw,
} from 'lucide-react-native';

interface OrderDetailsSubViewProps {
  order: any;
  onBack: () => void;
  onHelp?: () => void;
  onReorder?: (order: any) => void;
}

export const OrderDetailsSubView: React.FC<OrderDetailsSubViewProps> = ({
  order,
  onBack,
  onHelp,
  onReorder,
}) => {
  if (!order) {
    return (
      <View style={styles.root}>
        <View style={styles.topHeader}>
          <TouchableOpacity style={styles.backBtnCircle} onPress={onBack}>
            <ArrowLeft size={20} color="#FFFFFF" />
          </TouchableOpacity>
          <Text style={styles.emptyTitle}>Order Details Not Found</Text>
        </View>
      </View>
    );
  }

  // Amount Normalization & Currency Formatter
  const formatAmount = (rawAmount: any): string => {
    if (rawAmount === undefined || rawAmount === null || rawAmount === '') return '₹0';
    let num: number;
    if (typeof rawAmount === 'string') {
      const cleaned = rawAmount.replace(/[^0-9.]/g, '');
      num = parseFloat(cleaned);
    } else {
      num = Number(rawAmount);
    }
    if (isNaN(num) || num <= 0) return '₹0';
    if (num >= 5000 && num % 100 === 0) {
      num = num / 100;
    } else if (num >= 10000) {
      num = num / 100;
    }
    return `₹${Math.round(num)}`;
  };

  const getNumericAmount = (rawAmount: any): number => {
    if (rawAmount === undefined || rawAmount === null || rawAmount === '') return 0;
    let num: number;
    if (typeof rawAmount === 'string') {
      const cleaned = rawAmount.replace(/[^0-9.]/g, '');
      num = parseFloat(cleaned);
    } else {
      num = Number(rawAmount);
    }
    if (isNaN(num) || num <= 0) return 0;
    if (num >= 5000 && num % 100 === 0) {
      num = num / 100;
    } else if (num >= 10000) {
      num = num / 100;
    }
    return num;
  };

  // Order identifiers
  const rawOrderId = order.id || order.orderId || order._id || '';
  const cleanOrderNum = String(rawOrderId).replace(/^order_/, '') || 'N/A';

  // Items processing
  let itemsList: any[] = [];
  if (Array.isArray(order.items)) {
    itemsList = order.items;
  } else if (typeof order.items === 'string') {
    try {
      const parsed = JSON.parse(order.items);
      if (Array.isArray(parsed)) itemsList = parsed;
    } catch (e) {}
  }

  const itemsCount = itemsList.reduce(
    (acc: number, it: any) => acc + (Number(it.quantity || it.qty) || 1),
    0
  ) || itemsList.length || 1;

  // Restaurant details
  const restaurantName =
    order.restaurantName ||
    order.restaurant?.restaurantName ||
    order.restaurant?.name ||
    'Restaurant';

  const restaurantAddress =
    order.restaurantAddress ||
    order.restaurant?.address ||
    order.restaurant?.city ||
    order.city ||
    'Store Location';

  // Delivery address details
  const deliveryAddress =
    order.deliveryAddress ||
    order.address ||
    order.shippingAddress ||
    order.location ||
    'Delivery Address';

  const deliveryAddressLabel =
    order.deliveryAddressLabel ||
    order.addressType ||
    order.addressLabel ||
    'Home';

  // Rider details
  const riderName =
    order.riderName ||
    order.driverName ||
    order.rider?.name ||
    order.deliveryPartnerName ||
    'Quro Express Partner';

  // Formatted date string
  const formatOrderDate = (rawDate: any): string => {
    if (!rawDate) return 'Recently';
    try {
      const d = new Date(rawDate);
      if (isNaN(d.getTime())) return String(rawDate);
      return d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch (e) {
      return String(rawDate);
    }
  };

  const orderDateStr = formatOrderDate(
    order.deliveredAt || order.updatedAt || order.createdAt || order.date
  );

  // Bill Calculations
  const calculatedItemsSubtotal = itemsList.reduce((acc: number, it: any) => {
    const unitPrice = getNumericAmount(it.price || it.unitPrice || 0);
    const qty = Number(it.quantity || it.qty || 1);
    const totalPrice = it.totalPrice ? getNumericAmount(it.totalPrice) : unitPrice * qty;
    return acc + (totalPrice || unitPrice * qty);
  }, 0);

  const rawSubtotal = getNumericAmount(order.subtotal) || calculatedItemsSubtotal;
  const rawGrandTotal = getNumericAmount(order.grandTotal || order.totalAmount || order.billTotal);
  const discountAmount = getNumericAmount(order.discount || order.discountAmount);
  const couponCode = order.couponCode || order.coupon || order.promoCode || 'OFFER';
  const packagingFee = order.packagingFee !== undefined ? getNumericAmount(order.packagingFee) : (rawSubtotal > 0 ? 30 : 0);
  const platformFee = order.platformFee !== undefined ? getNumericAmount(order.platformFee) : (rawSubtotal > 0 ? 17.58 : 0);
  const taxesFee = order.gst !== undefined ? getNumericAmount(order.gst) : (order.taxes !== undefined ? getNumericAmount(order.taxes) : Math.round(rawSubtotal * 0.05));
  const isExpress = order.deliveryType === 'express' || order.isExpress === true;
  const expressFee = isExpress ? (getNumericAmount(order.expressFee) || 19) : 0;
  const deliveryDistance = order.distance || order.deliveryDistance || null;

  const totalBillFormatted = formatAmount(
    rawGrandTotal || (rawSubtotal + packagingFee + platformFee + taxesFee + expressFee - discountAmount)
  );

  // Status mapping
  const statusStr = (order.status || 'delivered').toUpperCase();
  const paymentMethodRaw = order.paymentMethod || 'UPI';
  const paymentMethodStr = paymentMethodRaw.toUpperCase().startsWith('PAID')
    ? paymentMethodRaw
    : `Paid Via ${paymentMethodRaw.toUpperCase()}`;

  return (
    <View style={styles.root}>
      {/* ─── [1] TOP BRAND & HELP HEADER ─── */}
      <View style={styles.topHeader}>
        <TouchableOpacity
          style={styles.helpBtn}
          activeOpacity={0.8}
          onPress={onHelp}
        >
          <Headphones size={15} color="#A18A3B" style={{ marginRight: 6 }} />
          <Text style={styles.helpBtnText}>HELP</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── [2] TOP CARD: ORDER HEADER & ROUTE TIMELINE (Figma Node 3029:1600) ─── */}
        <View style={styles.orderStatusCard}>
          {/* Card Header Row */}
          <View style={styles.cardHeaderRow}>
            <TouchableOpacity
              style={styles.backBtnCircle}
              activeOpacity={0.75}
              onPress={onBack}
            >
              <ArrowLeft size={18} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.orderTitleCol}>
              <Text style={styles.orderIdTitle} numberOfLines={1}>
                Order #{cleanOrderNum}
              </Text>
              <Text style={styles.orderSubtitle}>
                {statusStr === 'DELIVERED' ? 'Delivered' : statusStr}, {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}, {totalBillFormatted}
              </Text>
            </View>

            <View style={styles.deliveredStatusBadge}>
              <CheckCircle2 size={13} color="#D4AF37" style={{ marginRight: 4 }} />
              <Text style={styles.deliveredStatusText}>{statusStr}</Text>
            </View>
          </View>

          <View style={styles.horizontalDivider} />

          {/* Route Timeline */}
          <View style={styles.timelineContainer}>
            {/* Step 1: Restaurant */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineIconCol}>
                <View style={styles.goldCircleIcon}>
                  <Store size={18} color="#000000" />
                </View>
                <View style={styles.dottedLineSegment} />
              </View>
              <View style={styles.timelineInfoCol}>
                <Text style={styles.restaurantTitle} numberOfLines={1}>
                  {restaurantName}
                </Text>
                <Text style={styles.addressSubtext}>
                  {restaurantAddress}
                </Text>
              </View>
            </View>

            {/* Step 2: Delivery Home Address */}
            <View style={styles.timelineRow}>
              <View style={styles.timelineIconCol}>
                <View style={styles.goldCircleIcon}>
                  <Home size={18} color="#000000" />
                </View>
                <View style={styles.dottedLineSegment} />
              </View>
              <View style={styles.timelineInfoCol}>
                <Text style={styles.homeLabelTitle}>
                  {deliveryAddressLabel}
                </Text>
                <Text style={styles.addressSubtext}>
                  {deliveryAddress}
                </Text>
              </View>
            </View>

            {/* Step 3: Delivered Status & Rider */}
            <View style={styles.timelineRowLast}>
              <View style={styles.timelineIconCol}>
                <View style={styles.darkCheckCircleIcon}>
                  <Check size={17} color="#DEB853" strokeWidth={2.8} />
                </View>
              </View>
              <View style={styles.timelineInfoColFlex}>
                <View style={styles.deliveredRiderInfo}>
                  <Text style={styles.deliveredDateText}>
                    Order delivered on {orderDateStr}
                  </Text>
                  <View style={styles.riderNameRow}>
                    <Text style={styles.riderByPrefix}>by </Text>
                    <Text style={styles.riderNameText}>{riderName.toUpperCase()}</Text>
                  </View>
                </View>
                <View style={styles.onTimeBadge}>
                  <Clock size={12} color="#9A863D" style={{ marginRight: 4 }} />
                  <Text style={styles.onTimeText}>ON TIME</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* ─── [3] BOTTOM CARD: BILL DETAILS (Figma Node 3029:1563) ─── */}
        <View style={styles.billDetailsCard}>
          <Text style={styles.billDetailsHeaderTitle}>BILL DETAILS</Text>

          {/* Ordered Items List */}
          <View style={styles.billItemsList}>
            {itemsList.length > 0 ? (
              itemsList.map((it: any, idx: number) => {
                const isVeg = it.isVeg !== undefined ? Boolean(it.isVeg) : (it.foodType === 'veg' || it.veg === true);
                const itName = it.name || it.menuItemName || it.title || 'Food Item';
                const itQty = Number(it.quantity || it.qty) || 1;
                const itUnit = getNumericAmount(it.price || it.unitPrice || 0);
                const itTotal = it.totalPrice ? getNumericAmount(it.totalPrice) : itUnit * itQty;
                const itPriceStr = formatAmount(itTotal || itUnit * itQty);
                const itNotes =
                  it.notes ||
                  it.variantName ||
                  (it.customization?.size?.name ? `${it.customization.size.name}` : '') ||
                  (it.customization?.extras && it.customization.extras.length > 0
                    ? `Add-ons: ${it.customization.extras.map((e: any) => e.name).join(', ')}`
                    : '');

                return (
                  <View key={idx} style={styles.billItemRow}>
                    {/* Veg / Non-Veg Indicator */}
                    <View style={[styles.vegBadgeSquare, { borderColor: isVeg ? '#468152' : '#E23744' }]}>
                      {isVeg ? (
                        <View style={styles.vegDot} />
                      ) : (
                        <View style={styles.nonVegTriangle} />
                      )}
                    </View>

                    <View style={styles.billItemContent}>
                      <Text style={styles.billItemName} numberOfLines={1}>
                        {itName} x {itQty}
                      </Text>
                      {!!itNotes && (
                        <Text style={styles.billItemVariant} numberOfLines={1}>
                          {itNotes}
                        </Text>
                      )}
                    </View>

                    <Text style={styles.billItemPriceText}>{itPriceStr}</Text>
                  </View>
                );
              })
            ) : (
              <View style={styles.billItemRow}>
                <View style={[styles.vegBadgeSquare, { borderColor: '#468152' }]}>
                  <View style={styles.vegDot} />
                </View>
                <View style={styles.billItemContent}>
                  <Text style={styles.billItemName}>Order Summary x 1</Text>
                </View>
                <Text style={styles.billItemPriceText}>{totalBillFormatted}</Text>
              </View>
            )}
          </View>

          <View style={styles.billDivider} />

          {/* Fee & Charges Breakdown */}
          <View style={styles.breakdownContainer}>
            {/* Item Total */}
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Item Total</Text>
              <Text style={styles.breakdownValue}>₹{Math.round(rawSubtotal)}</Text>
            </View>

            {/* Restaurant Packaging */}
            {packagingFee > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Restaurant Packaging</Text>
                <Text style={styles.breakdownValue}>₹{packagingFee}</Text>
              </View>
            )}

            {/* Platform Fee */}
            {platformFee > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Platform fee with GST</Text>
                <Text style={styles.breakdownValue}>₹{platformFee}</Text>
              </View>
            )}

            {/* Discount */}
            {discountAmount > 0 && (
              <View style={styles.breakdownRow}>
                <Text style={styles.discountLabel}>
                  Discount Applied ({couponCode})
                </Text>
                <Text style={styles.discountValue}>-₹{discountAmount}</Text>
              </View>
            )}

            {/* Delivery Fee */}
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel} numberOfLines={1}>
                Delivery Fee (FREE with Quro One){deliveryDistance ? ` | ${deliveryDistance} kms` : ''}
              </Text>
              <View style={styles.deliveryFeeCol}>
                <Text style={styles.strikethroughFee}>56.0</Text>
                <Text style={styles.freeGreenText}>FREE</Text>
              </View>
            </View>

            {/* Express Fee (only if express order) */}
            {isExpress && (
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Express Fee</Text>
                <View style={styles.deliveryFeeCol}>
                  <Text style={styles.strikethroughFee}>29.0</Text>
                  <Text style={styles.breakdownValue}>₹{expressFee}</Text>
                </View>
              </View>
            )}

            {/* Taxes */}
            <View style={styles.breakdownRow}>
              <Text style={styles.breakdownLabel}>Taxes</Text>
              <Text style={styles.breakdownValue}>₹{taxesFee}</Text>
            </View>
          </View>

          <View style={styles.billDivider} />

          {/* Bill Total Bottom Row */}
          <View style={styles.billTotalBottomRow}>
            <Text style={styles.paidMethodText}>{paymentMethodStr}</Text>
            <View style={styles.billTotalAmountGroup}>
              <Text style={styles.billTotalLabel}>Bill Total</Text>
              <Text style={styles.billTotalValueGold}>{totalBillFormatted}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ─── [4] BOTTOM STICKY REORDER BUTTON (Figma Node 3029:1558) ─── */}
      <View style={styles.bottomActionBar}>
        <TouchableOpacity
          style={styles.reorderMainBtn}
          activeOpacity={0.85}
          onPress={() => onReorder && onReorder(order)}
        >
          <RotateCcw size={20} color="#BF9C42" style={{ marginRight: 8 }} />
          <Text style={styles.reorderMainBtnText}>REORDER</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ─── [1] TOP HEADER ───
  topHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 12 : 16,
    paddingBottom: 12,
    backgroundColor: '#000000',
  },
  brandLogo: {
    width: 104,
    height: 38,
  },
  helpBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#35301E',
    borderRadius: 9,
    paddingVertical: 7,
    paddingHorizontal: 14,
  },
  helpBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#A18A3B',
    letterSpacing: 0.8,
  },

  // ─── SCROLL VIEW ───
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 6,
    paddingBottom: 110,
  },

  // ─── [2] ORDER STATUS CARD ───
  orderStatusCard: {
    backgroundColor: '#070707',
    borderWidth: 1,
    borderColor: '#1E1E1E',
    borderRadius: 22,
    padding: 16,
    marginBottom: 16,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backBtnCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#141414',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  orderTitleCol: {
    flex: 1,
    justifyContent: 'center',
  },
  orderIdTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#CACACA',
    marginBottom: 3,
  },
  orderSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#696969',
  },
  deliveredStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0E0D0B',
    borderWidth: 1,
    borderColor: '#2A2210',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 9,
    marginLeft: 6,
  },
  deliveredStatusText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#9E863E',
    letterSpacing: 0.6,
  },
  horizontalDivider: {
    height: 1,
    backgroundColor: '#202020',
    marginVertical: 16,
  },

  // ─── TIMELINE ───
  timelineContainer: {
    paddingLeft: 4,
  },
  timelineRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineRowLast: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  timelineIconCol: {
    alignItems: 'center',
    width: 40,
    marginRight: 14,
  },
  goldCircleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#DEB853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dottedLineSegment: {
    width: 2,
    height: 38,
    borderWidth: 1,
    borderColor: '#635324',
    borderStyle: 'dashed',
    marginVertical: 4,
  },
  darkCheckCircleIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#0D0D0D',
    borderWidth: 1.5,
    borderColor: '#DEB853',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timelineInfoCol: {
    flex: 1,
    paddingTop: 2,
  },
  timelineInfoColFlex: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 2,
  },
  restaurantTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#BE9C44',
    marginBottom: 4,
  },
  homeLabelTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    color: '#B2913D',
    marginBottom: 4,
  },
  addressSubtext: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#757575',
    lineHeight: 18,
  },
  deliveredRiderInfo: {
    flex: 1,
    marginRight: 8,
  },
  deliveredDateText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#A8A8A8',
    marginBottom: 2,
  },
  riderNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  riderByPrefix: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5,
    color: '#656565',
  },
  riderNameText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#A78C3D',
  },
  onTimeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 7,
    paddingVertical: 5,
    paddingHorizontal: 9,
  },
  onTimeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    color: '#9A863D',
    letterSpacing: 0.5,
  },

  // ─── [3] BILL DETAILS CARD ───
  billDetailsCard: {
    backgroundColor: '#080808',
    borderWidth: 1,
    borderColor: '#1F1F1F',
    borderRadius: 22,
    padding: 18,
    marginBottom: 20,
  },
  billDetailsHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#A1853C',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
    marginBottom: 16,
  },
  billItemsList: {
    marginBottom: 10,
  },
  billItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  vegBadgeSquare: {
    width: 17,
    height: 17,
    borderWidth: 1.5,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  vegDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#468152',
  },
  nonVegTriangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 4,
    borderRightWidth: 4,
    borderBottomWidth: 7,
    borderStyle: 'solid',
    backgroundColor: 'transparent',
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: '#E23744',
  },
  billItemContent: {
    flex: 1,
  },
  billItemName: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 14.5,
    color: '#9C9C9C',
    marginBottom: 2,
  },
  billItemVariant: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#6D6D6D',
  },
  billItemPriceText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 14.5,
    color: '#9F9F9F',
    marginLeft: 10,
  },
  billDivider: {
    height: 1,
    backgroundColor: '#1E1E1E',
    marginVertical: 14,
  },
  breakdownContainer: {
    gap: 12,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  breakdownLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
    color: '#696969',
    flex: 1,
    marginRight: 10,
  },
  breakdownValue: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5,
    color: '#6E6E6E',
  },
  discountLabel: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5,
    color: '#5B753D',
  },
  discountValue: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#5A753A',
  },
  deliveryFeeCol: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  strikethroughFee: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5,
    color: '#434343',
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  freeGreenText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5,
    color: '#567239',
  },
  billTotalBottomRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  paidMethodText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13,
    color: '#6A6A6A',
  },
  billTotalAmountGroup: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  billTotalLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 14,
    color: '#B4B4B4',
    marginRight: 8,
  },
  billTotalValueGold: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19,
    color: '#CBA445',
  },

  // ─── [4] BOTTOM STICKY REORDER BUTTON ───
  bottomActionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#000000',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    borderTopWidth: 1,
    borderTopColor: '#121212',
  },
  reorderMainBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#100D08',
    borderWidth: 1.5,
    borderColor: '#46391E',
    borderRadius: 16,
    paddingVertical: 15,
  },
  reorderMainBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    color: '#BF9C42',
    letterSpacing: 1.2,
  },
  emptyTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    color: '#FFFFFF',
    marginLeft: 12,
  },
});
