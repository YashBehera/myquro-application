import React, { useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  Alert,
  Dimensions,
  Platform,
  ActivityIndicator,
  Modal,
  Clipboard,
} from 'react-native';
import { useViewModel } from '../state/MainViewModel';
import { OrderLoaderScreen } from './OrderLoaderScreen';
import { THEME, COLORS } from '../theme/Theme';
import { BACKEND_URL } from '../config';
import {
  ArrowLeft,
  MapPin,
  ChevronDown,
  Trash2,
  Gift,
  BadgePercent,
  ShieldCheck,
  Clock,
  Truck,
  Plus,
  Minus,
} from 'lucide-react-native';
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

interface CartScreenProps {
  onBack: () => void;
  onNavigateToRestaurant: (id: string, orderId?: string | null) => void;
  onNavigateToTracking?: (orderId: string) => void;
}

const VegBadge = ({ isVeg }: { isVeg: boolean }) => (
  <View style={[styles.vegBadgeOuter, { borderColor: isVeg ? '#16A34A' : '#DC2626' }]}>
    <View style={[styles.vegBadgeDot, { backgroundColor: isVeg ? '#16A34A' : '#DC2626' }]} />
  </View>
);

export const CartScreen: React.FC<CartScreenProps> = ({
  onBack,
  onNavigateToRestaurant,
  onNavigateToTracking,
}) => {
  const insets = useSafeAreaInsets();
  const {
    isDarkMode,
    cartItems,
    updateCartQuantity,
    removeFromCart,
    clearCart,
    checkoutCart,
    currentLocation,
    savedAddresses,
  } = useViewModel();

  const theme = isDarkMode ? THEME.dark : THEME.light;

  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState('');
  const [offersList, setOffersList] = useState<any[]>([]);
  const [appliedOffer, setAppliedOffer] = useState<any>(null);
  const [showOffersModal, setShowOffersModal] = useState(false);
  const [showDetailedBillModal, setShowDetailedBillModal] = useState(false);

  // States for order loader screen
  const [showOrderLoader, setShowOrderLoader] = useState(false);
  const [confirmationOrderId, setConfirmationOrderId] = useState('');
  const [confirmRestaurantName, setConfirmRestaurantName] = useState('');
  const [confirmRestaurantId, setConfirmRestaurantId] = useState('');
  const [confirmAmount, setConfirmAmount] = useState(0);

  const restaurantId = cartItems.length > 0 ? cartItems[0].restaurantId : null;
  const restaurantName = cartItems.length > 0 ? cartItems[0].restaurantName : '';

  // Fetch active public offers for the restaurant
  useEffect(() => {
    if (!restaurantId) return;

    const fetchOffers = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/offers/public/${restaurantId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.offers) {
            setOffersList(data.offers);

            // Auto-apply MYQURO50 offer if it exists in the fetched list
            const myquro50 = data.offers.find((o: any) => o.code === 'MYQURO50');
            if (myquro50) {
              setAppliedOffer(myquro50);
            } else if (data.offers.length > 0) {
              // Otherwise auto-apply the first one
              setAppliedOffer(data.offers[0]);
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ [CartScreen] Error fetching offers:', err);
      }
    };

    fetchOffers();
  }, [restaurantId]);

  // If offersList is empty, define fallback active promo to match mockup
  const activeOffers = useMemo(() => {
    if (offersList.length > 0) return offersList;
    return [
      {
        id: 'fallback_myquro50',
        name: 'MYQURO50 Savings',
        description: 'Get Flat ₹50 off on your order above ₹200',
        code: 'MYQURO50',
        offerType: 'fixed',
        discountValue: 50,
      },
      {
        id: 'fallback_quro30',
        name: 'QURO30 Discount',
        description: 'Get 30% off on your total order',
        code: 'QURO30',
        offerType: 'percentage',
        discountValue: 30,
      }
    ];
  }, [offersList]);

  // Set default applied offer if nothing was auto-applied
  useEffect(() => {
    if (!appliedOffer && activeOffers.length > 0) {
      setAppliedOffer(activeOffers[0]);
    }
  }, [activeOffers, appliedOffer]);

  // Calculations
  const itemTotal = useMemo(() => {
    return cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [cartItems]);

  const packagingFee = cartItems.length > 0 ? 20 : 0;
  const deliveryFee = cartItems.length > 0 ? 40 : 0; // FREE in UI

  const discountAmount = useMemo(() => {
    if (!appliedOffer || itemTotal === 0) return 0;
    if (appliedOffer.offerType === 'percentage') {
      return Math.min(Math.round((itemTotal * appliedOffer.discountValue) / 100), 150);
    } else {
      // fixed discount
      return Math.min(appliedOffer.discountValue, itemTotal);
    }
  }, [appliedOffer, itemTotal]);

  const toPay = useMemo(() => {
    if (cartItems.length === 0) return 0;
    // Deliver fee is free in UI, so grand total = itemTotal + packagingFee - discountAmount
    const total = itemTotal + packagingFee - discountAmount;
    return Math.max(total, 0);
  }, [cartItems, itemTotal, packagingFee, discountAmount]);

  const totalSavings = useMemo(() => {
    return discountAmount + deliveryFee; // Discount + Saved Delivery Fee
  }, [discountAmount, deliveryFee]);

  const amountNeededForPromo = useMemo(() => {
    const threshold = 500;
    if (itemTotal >= threshold) return 0;
    return threshold - itemTotal;
  }, [itemTotal]);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    // Capture details before they are cleared by checkoutCart
    const currentRestId = restaurantId || '';
    const currentRestName = restaurantName || 'Merchant Partner';
    const currentAmount = toPay;
    
    setConfirmRestaurantId(currentRestId);
    setConfirmRestaurantName(currentRestName);
    setConfirmAmount(currentAmount);
    
    setLoading(true);
    setShowOrderLoader(true);
    
    try {
      // Find matching saved address based on currentLocation, otherwise build a dynamic custom one
      const matchedAddress = savedAddresses.find((a: any) => 
        (a.latitude && Math.abs(a.latitude - currentLocation.latitude) < 0.0001 &&
         a.longitude && Math.abs(a.longitude - currentLocation.longitude) < 0.0001) ||
        a.city === currentLocation.label || 
        (a.address && a.address.includes(currentLocation.label))
      ) || {
        id: 'temp_current',
        houseNo: 'Current Location',
        landmark: '',
        area: currentLocation.label || 'Delivery Location',
        city: currentLocation.label || 'Delivery Location',
        latitude: currentLocation.latitude,
        longitude: currentLocation.longitude,
        address: currentLocation.address,
      };

      const addressId = matchedAddress.id;
      const notesPayload = JSON.stringify({
        notes: notes || "",
        addressId: addressId || "",
        address: `${matchedAddress.houseNo}, ${matchedAddress.landmark ? matchedAddress.landmark + ', ' : ''}${matchedAddress.area}, ${matchedAddress.city}`,
        mapAddress: matchedAddress.address || "",
        latitude: matchedAddress.latitude,
        longitude: matchedAddress.longitude,
        city: matchedAddress.city,
      });

      const orderRes = await checkoutCart(notesPayload);
      if (orderRes && orderRes.order) {
        setConfirmationOrderId(orderRes.order.id);
      } else {
        throw new Error("Failed to retrieve order ID");
      }
    } catch (err: any) {
      setShowOrderLoader(false);
      Alert.alert('Checkout Failed', err.message || 'Unable to place order. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyOffer = (offer: any) => {
    setAppliedOffer(offer);
    setShowOffersModal(false);
    Alert.alert('Coupon Applied', `Code ${offer.code} has been successfully applied to your cart!`);
  };

  if (cartItems.length === 0 && !showOrderLoader) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: theme.background }]}>
        <View style={styles.emptyHeaderRow}>
          <TouchableOpacity onPress={onBack} style={styles.backButtonCircle}>
            <ArrowLeft size={24} color={isDarkMode ? '#FFF' : '#1A1A1A'} />
          </TouchableOpacity>
          <Text style={[styles.emptyHeaderTitle, { color: theme.text }]}>My Cart</Text>
        </View>
        <View style={styles.emptyBody}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=300&auto=format&fit=crop&q=60' }}
            style={styles.emptyImage as any}
          />
          <Text style={[styles.emptyTitle, { color: theme.text }]}>Your Cart is Empty</Text>
          <Text style={styles.emptySub}>
            Good food is always waiting! Go to the home or search page and add delicious items from your favorite outlets.
          </Text>
          <TouchableOpacity style={styles.emptyBtn} onPress={onBack}>
            <Text style={styles.emptyBtnText}>Explore Restaurants</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: isDarkMode ? '#121212' : '#F4F6F8' }]}>

      {/* ─── 1. HEADER ROW (Red background) ─── */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <TouchableOpacity onPress={onBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#FFFFFF" />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>My Cart</Text>
            <Text style={styles.headerSubtitle}>
              {cartItems.reduce((acc, i) => acc + i.quantity, 0)} Items from {restaurantName}
            </Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── 2. DELIVER TO ADDRESS CARD ─── */}
        <View style={[styles.card, isDarkMode && styles.cardDark, styles.addressCard]}>
          <View style={styles.addressLeft}>
            <View style={styles.mapPinBg}>
              <MapPin size={20} color="#D32F2F" />
            </View>
            <View style={styles.addressTexts}>
              <View style={styles.addressTitleRow}>
                <Text style={[styles.addressTitle, isDarkMode && styles.textWhite]}>Deliver to</Text>
                <Text style={[styles.addressType, isDarkMode && styles.textWhite]}>{currentLocation.label}</Text>
                <ChevronDown size={14} color={isDarkMode ? '#FFF' : '#1A1A1A'} style={{ marginLeft: 2 }} />
              </View>
              <Text style={styles.addressSub} numberOfLines={1}>
                {currentLocation.address}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.changeBtn}
            onPress={() => Alert.alert('Address', 'Deliver addresses can be updated in Profile.')}
          >
            <Text style={styles.changeBtnText}>Change</Text>
          </TouchableOpacity>
        </View>

        {/* ─── 3. PROMO OFFER PILL ─── */}
        {appliedOffer && (
          <TouchableOpacity
            style={[styles.promoPill, isDarkMode && styles.promoPillDark]}
            onPress={() => setShowOffersModal(true)}
          >
            <View style={styles.promoLeft}>
              <View style={styles.promoIconCircle}>
                <BadgePercent size={18} color="#16A34A" />
              </View>
              <View style={styles.promoTexts}>
                <Text style={[styles.promoTitleText, isDarkMode && styles.textWhite]}>
                  YAY! You saved ₹{discountAmount}
                </Text>
                <Text style={styles.promoSubText}>
                  with code <Text style={{ fontWeight: '800', color: '#16A34A' }}>{appliedOffer.code}</Text> applied
                </Text>
              </View>
            </View>
            <View style={styles.promoRight}>
              <Text style={styles.promoLinkText}>View offers &gt;</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* ─── 4. YOUR ITEMS LIST ─── */}
        <View style={[styles.card, isDarkMode && styles.cardDark, styles.itemsContainer]}>
          <View style={styles.itemsHeader}>
            <Text style={[styles.itemsTitle, isDarkMode && styles.textWhite]}>
              Your Items ({cartItems.reduce((acc, i) => acc + i.quantity, 0)})
            </Text>
            <TouchableOpacity onPress={() => onNavigateToRestaurant(restaurantId || '')}>
              <Text style={styles.addMoreText}>Add more items +</Text>
            </TouchableOpacity>
          </View>

          {cartItems.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              {/* Veg status */}
              <View style={styles.vegBadgeCol}>
                <VegBadge isVeg={item.isVeg} />
              </View>

              {/* Item Details */}
              <View style={styles.itemDetails}>
                <View style={styles.itemNameRow}>
                  <Text style={[styles.itemNameText, isDarkMode && styles.textWhite]} numberOfLines={1}>
                    {item.name}
                  </Text>
                  <TouchableOpacity
                    onPress={() => removeFromCart(item.id)}
                    style={styles.deleteIcon}
                  >
                    <Trash2 size={16} color="#DC2626" />
                  </TouchableOpacity>
                </View>

                {(() => {
                  const custom = typeof item.customization === 'string'
                    ? (() => { try { return JSON.parse(item.customization); } catch(e) { return null; } })()
                    : item.customization;
                  const variant = custom?.size?.name;
                  const extras = custom?.extras && custom.extras.length > 0
                    ? custom.extras.map((e: any) => `${e.name}${e.price > 0 ? ` (+₹${e.price})` : ''}`).join(' • ')
                    : null;

                  return (
                    <View style={{ marginVertical: 2 }}>
                      {variant ? (
                        <Text style={[styles.itemDescText, { color: isDarkMode ? '#E8C547' : '#D97706', fontWeight: '600' }]} numberOfLines={1}>
                          Portion: {variant}
                        </Text>
                      ) : null}
                      {extras ? (
                        <Text style={[styles.itemDescText, { color: isDarkMode ? '#A3E635' : '#16A34A', fontWeight: '500', marginTop: 1 }]} numberOfLines={2}>
                          Extras: {extras}
                        </Text>
                      ) : (
                        item.description ? (
                          <Text style={styles.itemDescText} numberOfLines={1}>
                            {item.description}
                          </Text>
                        ) : null
                      )}
                    </View>
                  );
                })()}

                <View style={styles.itemBottomRow}>
                  <View>
                    <Text style={[styles.itemPriceText, isDarkMode && styles.textWhite]}>
                      ₹{item.price * item.quantity}
                    </Text>
                    <Text style={styles.savedPillText}>You saved ₹15</Text>
                  </View>

                  {/* Quantity adjusts */}
                  <View style={styles.quantityContainer}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateCartQuantity(item.id, item.quantity - 1)}
                    >
                      <Minus size={12} color="#D32F2F" strokeWidth={3} />
                    </TouchableOpacity>
                    <Text style={styles.qtyText}>{item.quantity}</Text>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => updateCartQuantity(item.id, item.quantity + 1)}
                    >
                      <Plus size={12} color="#D32F2F" strokeWidth={3} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </View>
          ))}
        </View>

        {/* ─── 5. PROMO LOCK DASHED BANNER ─── */}
        {amountNeededForPromo > 0 ? (
          <TouchableOpacity
            style={styles.promoLockBanner}
            onPress={() => onNavigateToRestaurant(restaurantId || '')}
          >
            <View style={styles.promoLockLeft}>
              <View style={styles.promoLockIconCircle}>
                <Gift size={16} color="#C2410C" />
              </View>
              <Text style={styles.promoLockText}>
                Add items worth <Text style={{ fontWeight: '800' }}>₹{amountNeededForPromo}</Text> more to get extra 10% OFF
              </Text>
            </View>
            <View style={styles.promoLockBtn}>
              <Text style={styles.promoLockBtnText}>Explore Menu</Text>
            </View>
          </TouchableOpacity>
        ) : (
          <View style={styles.promoUnlockedBanner}>
            <Gift size={16} color="#16A34A" />
            <Text style={styles.promoUnlockedText}>YAY! Extra 10% discount unlocked on this checkout!</Text>
          </View>
        )}

        {/* ─── 6. BILL DETAILS SECTION ─── */}
        <View style={[styles.card, isDarkMode && styles.cardDark, styles.billContainer]}>
          <View style={styles.billHeader}>
            <Text style={[styles.billTitle, isDarkMode && styles.textWhite]}>Bill Details</Text>
            <TouchableOpacity onPress={() => setShowDetailedBillModal(true)}>
              <Text style={styles.viewDetailedBillText}>View detailed bill &gt;</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Item Total ({cartItems.reduce((acc, i) => acc + i.quantity, 0)} items)</Text>
            <Text style={[styles.billValue, isDarkMode && styles.textWhite]}>₹{itemTotal}</Text>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Delivery Fee</Text>
            <View style={styles.deliveryFeeRow}>
              <Text style={styles.deliveryFeeCrossed}>₹40</Text>
              <Text style={styles.deliveryFeeFree}>FREE</Text>
            </View>
          </View>

          <View style={styles.billRow}>
            <Text style={styles.billLabel}>Packaging Fee</Text>
            <Text style={[styles.billValue, isDarkMode && styles.textWhite]}>₹{packagingFee}</Text>
          </View>

          {appliedOffer && (
            <View style={styles.billRow}>
              <Text style={styles.discountLabel}>Offer Discount ({appliedOffer.code})</Text>
              <Text style={styles.discountValue}>-₹{discountAmount}</Text>
            </View>
          )}

          <View style={styles.billDivider} />

          <View style={styles.toPayRow}>
            <Text style={[styles.toPayLabel, isDarkMode && styles.textWhite]}>To Pay</Text>
            <Text style={[styles.toPayValue, isDarkMode && styles.textWhite]}>₹{toPay}</Text>
          </View>

          {/* Savings Pill */}
          <View style={styles.savingsPill}>
            <Text style={styles.savingsPillTextBig}>
              You are saving ₹{totalSavings} on this order 🎉
            </Text>
          </View>
        </View>

      </ScrollView>

      {/* ─── 7. STICKY BOTTOM CHECKOUT BAR ─── */}
      <View style={[styles.checkoutBar, isDarkMode && styles.checkoutBarDark, { bottom: Math.max(insets.bottom, 12) }]}>

        {/* Left Side: Pricing details */}
        <View style={styles.checkoutLeft}>
          <Text style={[styles.checkoutPrice, isDarkMode && styles.textWhite]}>₹{toPay}</Text>
          <TouchableOpacity onPress={() => setShowDetailedBillModal(true)}>
            <Text style={styles.checkoutViewBill}>View bill ^</Text>
          </TouchableOpacity>
        </View>

        {/* Right Side: Red checkout button */}
        <TouchableOpacity
          style={styles.checkoutBtn}
          onPress={handleCheckout}
          disabled={loading}
          activeOpacity={0.9}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <>
              <Text style={styles.checkoutBtnText}>Proceed to Checkout</Text>
              <ArrowLeft size={16} color="#FFFFFF" style={{ transform: [{ rotate: '180deg' }], marginLeft: 8 }} />
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Badges footer row */}
      <View style={[styles.badgesRow, isDarkMode && styles.badgesRowDark]}>
        <View style={styles.badgeItem}>
          <ShieldCheck size={14} color="#6B7280" />
          <Text style={styles.badgeLabel}>100% Safe Payments</Text>
        </View>
        <View style={styles.badgeItem}>
          <Clock size={14} color="#6B7280" />
          <Text style={styles.badgeLabel}>Live Order Tracking</Text>
        </View>
        <View style={styles.badgeItem}>
          <Truck size={14} color="#6B7280" />
          <Text style={styles.badgeLabel}>On-time Delivery</Text>
        </View>
      </View>

      {/* ─── 8. OFFERS POPUP MODAL ─── */}
      <Modal
        visible={showOffersModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOffersModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOffersModal(false)}
        >
          <View style={[styles.modalContent, isDarkMode && styles.modalContentDark]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.textWhite]}>Apply Coupon Code</Text>
              <TouchableOpacity onPress={() => setShowOffersModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />

            <ScrollView contentContainerStyle={styles.offersModalList}>
              {activeOffers.map((offer) => (
                <View
                  key={offer.id}
                  style={[styles.offerCard, isDarkMode && styles.offerCardDark]}
                >
                  <View style={styles.offerCardHeader}>
                    <View style={styles.offerTagBadge}>
                      <Text style={styles.offerTagBadgeText}>{offer.code}</Text>
                    </View>
                    <TouchableOpacity
                      style={styles.applyBtn}
                      onPress={() => handleApplyOffer(offer)}
                    >
                      <Text style={styles.applyBtnText}>APPLY</Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={[styles.offerCardTitle, isDarkMode && styles.textWhite]}>
                    {offer.name}
                  </Text>
                  <Text style={styles.offerCardDesc}>
                    {offer.description}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* ─── 9. DETAILED BILL POPUP MODAL ─── */}
      <Modal
        visible={showDetailedBillModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDetailedBillModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowDetailedBillModal(false)}
        >
          <View style={[styles.billModalContent, isDarkMode && styles.modalContentDark]} onStartShouldSetResponder={() => true}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, isDarkMode && styles.textWhite]}>Detailed Bill Breakdown</Text>
              <TouchableOpacity onPress={() => setShowDetailedBillModal(false)} style={styles.closeBtn}>
                <Text style={styles.closeBtnText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.modalDivider} />

            <View style={styles.billDetailModalList}>
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Subtotal</Text>
                <Text style={[styles.billDetailVal, isDarkMode && styles.textWhite]}>₹{itemTotal}</Text>
              </View>
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Standard Delivery Fee</Text>
                <Text style={[styles.billDetailVal, isDarkMode && styles.textWhite]}>₹40</Text>
              </View>
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>MyQURO Delivery Savings</Text>
                <Text style={styles.billDetailFree}>-₹40</Text>
              </View>
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>Restaurant Packaging Charges</Text>
                <Text style={[styles.billDetailVal, isDarkMode && styles.textWhite]}>₹{packagingFee}</Text>
              </View>
              <View style={styles.billDetailRow}>
                <Text style={styles.billDetailLabel}>GST & Restaurant Taxes (approx.)</Text>
                <Text style={[styles.billDetailVal, isDarkMode && styles.textWhite]}>₹{Math.round(itemTotal * 0.05)}</Text>
              </View>
              {appliedOffer && (
                <View style={styles.billDetailRow}>
                  <Text style={styles.billDetailDiscountLabel}>Promo Code discount ({appliedOffer.code})</Text>
                  <Text style={styles.billDetailDiscountVal}>-₹{discountAmount}</Text>
                </View>
              )}
              <View style={styles.billDetailDivider} />
              <View style={styles.billDetailTotalRow}>
                <Text style={[styles.billDetailTotalLabel, isDarkMode && styles.textWhite]}>Final Total Payable</Text>
                <Text style={[styles.billDetailTotalVal, isDarkMode && styles.textWhite]}>₹{toPay}</Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>

      <OrderLoaderScreen
        visible={showOrderLoader}
        amount={confirmAmount}
        onComplete={() => {
          setShowOrderLoader(false);
          onBack();
        }}
        onTrackDelivery={() => {
          setShowOrderLoader(false);
          if (onNavigateToTracking && confirmationOrderId) {
            onNavigateToTracking(confirmationOrderId);
          } else {
            onNavigateToRestaurant(confirmRestaurantId || '', confirmationOrderId);
          }
        }}
        onBrowse={() => {
          setShowOrderLoader(false);
          onBack();
        }}
        onReorder={() => {
          setShowOrderLoader(false);
          onNavigateToRestaurant(confirmRestaurantId || '');
        }}
        onShare={() => {
          Clipboard.setString(`myquro://order/track/${confirmationOrderId}`);
          Alert.alert("Share Summary", "Link copied to clipboard! You can share this link with friends to track together.");
        }}
        orderId={confirmationOrderId}
        restaurantName={confirmRestaurantName}
        deliveryAddress={`${currentLocation.label} • ${currentLocation.address}`}
        paymentMethod="UPI"
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 44 : 20,
    paddingBottom: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    fontSize: 12.5,
    color: 'rgba(255, 255, 255, 0.85)',
    fontWeight: '700',
    marginTop: 2,
  },
  scrollContent: {
    paddingBottom: 120,
    width: '100%',
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardDark: {
    backgroundColor: '#1E1E24',
    borderColor: '#2C2C2E',
  },
  addressCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addressLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  mapPinBg: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressTexts: {
    marginLeft: 12,
    flex: 1,
  },
  addressTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressTitle: {
    fontSize: 12.5,
    fontWeight: '700',
    color: '#6B7280',
  },
  addressType: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1A1A1A',
    marginLeft: 6,
  },
  addressSub: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
    fontWeight: '600',
  },
  changeBtn: {
    borderWidth: 1,
    borderColor: '#D32F2F',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#FFFFFF',
  },
  changeBtnText: {
    color: '#D32F2F',
    fontSize: 11,
    fontWeight: '900',
  },
  promoPill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D1FAE5',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoPillDark: {
    backgroundColor: 'rgba(22, 163, 74, 0.1)',
    borderColor: 'rgba(22, 163, 74, 0.3)',
  },
  promoLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  promoIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#D1FAE5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  promoTexts: {
    marginLeft: 10,
    flex: 1,
  },
  promoTitleText: {
    fontSize: 13.5,
    fontWeight: '900',
    color: '#065F46',
  },
  promoSubText: {
    fontSize: 11,
    color: '#047857',
    fontWeight: '700',
  },
  promoRight: {
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  promoLinkText: {
    fontSize: 11.5,
    fontWeight: '900',
    color: '#16A34A',
  },
  itemsContainer: {
    marginTop: 16,
  },
  itemsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 12,
  },
  itemsTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },
  addMoreText: {
    color: '#D32F2F',
    fontSize: 12,
    fontWeight: '900',
  },
  itemRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F9FAFB',
  },
  vegBadgeCol: {
    marginRight: 10,
    paddingTop: 3,
  },
  vegBadgeOuter: {
    width: 13,
    height: 13,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 2.5,
  },
  vegBadgeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  itemDetails: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  itemNameText: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#1E293B',
    flex: 1,
    paddingRight: 10,
  },
  deleteIcon: {
    padding: 4,
  },
  itemDescText: {
    fontSize: 11.5,
    color: '#6B7280',
    marginTop: 2,
    fontWeight: '600',
  },
  itemBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
  },
  itemPriceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#1E293B',
  },
  savedPillText: {
    fontSize: 9,
    color: '#16A34A',
    fontWeight: '800',
    marginTop: 1,
  },
  quantityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#ECECEC',
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#1A1A1A',
    paddingHorizontal: 8,
  },
  promoLockBanner: {
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#F87171',
    borderRadius: 18,
    backgroundColor: '#FEF2F2',
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  promoLockLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  promoLockIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FEE2E2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  promoLockText: {
    fontSize: 11,
    color: '#991B1B',
    fontWeight: '700',
    flex: 1,
  },
  promoLockBtn: {
    backgroundColor: '#FEE2E2',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  promoLockBtnText: {
    color: '#D32F2F',
    fontSize: 10,
    fontWeight: '900',
  },
  promoUnlockedBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 18,
    marginHorizontal: 16,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  promoUnlockedText: {
    color: '#065F46',
    fontSize: 11,
    fontWeight: '900',
    flex: 1,
  },
  billContainer: {
    marginTop: 16,
    paddingBottom: 10,
  },
  billHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
    paddingBottom: 12,
    marginBottom: 12,
  },
  billTitle: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#1E293B',
  },
  viewDetailedBillText: {
    color: '#D32F2F',
    fontSize: 11.5,
    fontWeight: '900',
  },
  billRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  billLabel: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  billValue: {
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '700',
  },
  deliveryFeeRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryFeeCrossed: {
    fontSize: 12,
    color: '#9CA3AF',
    textDecorationLine: 'line-through',
    marginRight: 6,
    fontWeight: '600',
  },
  deliveryFeeFree: {
    fontSize: 12,
    color: '#16A34A',
    fontWeight: '900',
  },
  discountLabel: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '700',
  },
  discountValue: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '900',
  },
  billDivider: {
    height: 1,
    backgroundColor: '#F3F4F6',
    marginVertical: 10,
  },
  toPayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  toPayLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },
  toPayValue: {
    fontSize: 15,
    fontWeight: '900',
    color: '#1E293B',
  },
  savingsPill: {
    backgroundColor: '#ECFDF5',
    borderRadius: 8,
    paddingVertical: 6,
    alignItems: 'center',
    marginTop: 14,
  },
  savingsPillTextBig: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '800',
  },
  checkoutBar: {
    position: 'absolute',
    left: 0,
    right: 0,
    maxWidth: isTablet ? 720 : undefined,
    alignSelf: 'center',
    height: 72,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#ECECEC',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  checkoutBarDark: {
    backgroundColor: '#1E1E24',
    borderTopColor: '#2C2C2E',
  },
  checkoutLeft: {
    justifyContent: 'center',
  },
  checkoutPrice: {
    fontSize: 18,
    fontWeight: '900',
    color: '#1A1A1A',
  },
  checkoutViewBill: {
    fontSize: 10.5,
    color: '#D32F2F',
    fontWeight: '900',
    marginTop: 2,
  },
  checkoutBtn: {
    width: SCREEN_WIDTH * 0.58,
    height: 48,
    backgroundColor: '#D32F2F',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14.5,
    fontWeight: '900',
  },
  badgesRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 38,
    backgroundColor: '#FAFAFA',
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  badgesRowDark: {
    backgroundColor: '#16161C',
    borderTopColor: '#2C2C2E',
  },
  badgeItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  badgeLabel: {
    fontSize: 9.5,
    color: '#6B7280',
    fontWeight: '700',
  },
  emptyContainer: {
    flex: 1,
  },
  emptyHeaderRow: {
    height: Platform.OS === 'ios' ? 90 : 64,
    paddingTop: Platform.OS === 'ios' ? 44 : 16,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  backButtonCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyHeaderTitle: {
    fontSize: 18,
    fontWeight: '900',
    marginLeft: 8,
  },
  emptyBody: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 38,
    paddingBottom: 60,
  },
  emptyImage: {
    width: 140,
    height: 140,
    borderRadius: 70,
    marginBottom: 24,
    backgroundColor: '#ECECEC',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    textAlign: 'center',
    marginBottom: 10,
  },
  emptySub: {
    fontSize: 12.5,
    color: '#6B7280',
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 24,
  },
  emptyBtn: {
    backgroundColor: '#D32F2F',
    paddingHorizontal: 22,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 16,
    maxHeight: '60%',
  },
  modalContentDark: {
    backgroundColor: '#1E1E24',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#1E293B',
  },
  closeBtn: {
    padding: 6,
  },
  closeBtnText: {
    fontSize: 14,
    color: '#9CA3AF',
    fontWeight: '800',
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 10,
  },
  offersModalList: {
    paddingVertical: 10,
  },
  offerCard: {
    backgroundColor: '#F9FAFB',
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  offerCardDark: {
    backgroundColor: '#2C2C2E',
    borderColor: '#3A3A3C',
  },
  offerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  offerTagBadge: {
    backgroundColor: '#D1FAE5',
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  offerTagBadgeText: {
    color: '#065F46',
    fontSize: 10.5,
    fontWeight: '900',
  },
  applyBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  applyBtnText: {
    color: '#10B981',
    fontSize: 11,
    fontWeight: '900',
  },
  offerCardTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#1E293B',
  },
  offerCardDesc: {
    fontSize: 11,
    color: '#6B7280',
    marginTop: 4,
    fontWeight: '600',
  },
  billModalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
  },
  billDetailModalList: {
    paddingVertical: 6,
  },
  billDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  billDetailLabel: {
    fontSize: 12.5,
    color: '#6B7280',
    fontWeight: '600',
  },
  billDetailVal: {
    fontSize: 12.5,
    color: '#1E293B',
    fontWeight: '700',
  },
  billDetailFree: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '900',
  },
  billDetailDiscountLabel: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '700',
  },
  billDetailDiscountVal: {
    fontSize: 12.5,
    color: '#16A34A',
    fontWeight: '900',
  },
  billDetailDivider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 12,
  },
  billDetailTotalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  billDetailTotalLabel: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#1E293B',
  },
  billDetailTotalVal: {
    fontSize: 14.5,
    fontWeight: '900',
    color: '#1E293B',
  },
  textWhite: {
    color: '#FFFFFB',
  },
});
