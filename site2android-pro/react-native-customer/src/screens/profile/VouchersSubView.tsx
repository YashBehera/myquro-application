import React from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { ArrowLeft, ChevronLeft } from 'lucide-react-native';
import { COLORS } from '../../theme/Theme';

interface VouchersSubViewProps {
  isDarkMode: boolean;
  vouchers: any[];
  onBack: () => void;
  showToast: (msg: string) => void;
}

export const VouchersSubView: React.FC<VouchersSubViewProps> = ({
  isDarkMode,
  vouchers,
  onBack,
  showToast,
}) => {
  if (vouchers.length === 0) {
    return (
      <View style={styles.profileFigmaVouchersScreenContainer}>
        {/* Header */}
        <View style={styles.profileFigmaVouchersHeader}>
          <TouchableOpacity onPress={onBack} style={styles.profileFigmaVouchersHeaderBackBtn}>
            <ArrowLeft size={22} color="#eae1d4" />
          </TouchableOpacity>
          <Text style={styles.profileFigmaVouchersHeaderTitle}>My Vouchers</Text>
          <View style={{ width: 34 }} />
        </View>

        {/* Content */}
        <View style={styles.profileFigmaVouchersContent}>
          {/* Illustration */}
          <Image
            source={require('../../assets/voucher_illustration.png')}
            style={styles.profileFigmaVouchersIllustration}
            resizeMode="contain"
          />

          {/* Title */}
          <Text style={styles.profileFigmaVouchersTitle}>
            No scratch cards? Let's{"\n"}fix that!
          </Text>

          {/* Subtitle */}
          <Text style={styles.profileFigmaVouchersSubtitle}>
            Start getting scratch cards by{"\n"}placing an order
          </Text>

          {/* Gold Action Button */}
          <TouchableOpacity
            style={styles.profileFigmaVouchersButton}
            onPress={() => {
              showToast('Redirecting to food menu to place an order!');
              onBack();
            }}
          >
            <Text style={styles.profileFigmaVouchersButtonText}>Order Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, isDarkMode && styles.containerDark]}>
      {/* Header */}
      <View style={styles.standardHeader}>
        <TouchableOpacity onPress={onBack} style={styles.backButton}>
          <ChevronLeft size={24} color="#1A1A1A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>MY VOUCHERS</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={{ padding: 16, gap: 16 }}>
          {vouchers.map(v => {
            const isFlat = v.voucherType === 'flat';
            const discountText = isFlat ? `₹${Math.round(v.discountValue / 100)}` : `${v.discountValue}%`;
            const expiryStr = v.expiresAt ? `Expires: ${new Date(v.expiresAt).toLocaleDateString()}` : 'Never expires';
            return (
              <View key={v.id} style={[styles.cardContainer, { padding: 0, flexDirection: 'row', overflow: 'hidden' }, isDarkMode && styles.orderCardDark]}>
                <View style={{ width: 12, backgroundColor: COLORS.quroRedPrimary }} />
                <View style={{ flex: 1, padding: 16 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={[styles.orderRestaurantName, isDarkMode && styles.textWhite, { fontSize: 15 }]}>
                      {v.restaurantName || 'Quro Partner'}
                    </Text>
                    <View style={{ backgroundColor: 'rgba(252, 128, 25, 0.1)', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 }}>
                      <Text style={{ color: '#fc8019', fontWeight: '800', fontSize: 11, letterSpacing: 0.5 }}>
                        {v.code}
                      </Text>
                    </View>
                  </View>

                  <Text style={{ fontSize: 20, fontWeight: '900', color: COLORS.quroRedPrimary, marginTop: 8 }}>
                    {discountText} OFF
                  </Text>

                  <Text style={{ fontSize: 12, color: '#686B78', marginTop: 4, fontWeight: '500' }}>
                    Min order value: ₹{Math.round(v.minOrderValue / 100)}
                  </Text>

                  <View style={{ height: 1, backgroundColor: isDarkMode ? '#2C2C2E' : '#F1F5F9', marginVertical: 12 }} />

                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text style={{ fontSize: 11, color: '#9CA3AF', fontWeight: '500' }}>
                      {expiryStr}
                    </Text>
                    <View style={{ backgroundColor: '#10B981', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                      <Text style={{ color: '#fff', fontSize: 9, fontWeight: '800' }}>ACTIVE</Text>
                    </View>
                  </View>
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  containerDark: {
    backgroundColor: '#0F0F12',
  },
  standardHeader: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EBEBEB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  cardContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EBEBEB',
  },
  orderCardDark: {
    backgroundColor: '#1E1E24',
    borderColor: '#2C2C2E',
  },
  orderRestaurantName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1A1A1A',
  },
  textWhite: {
    color: '#FFFFFF',
  },
  profileFigmaVouchersScreenContainer: {
    flex: 1,
    backgroundColor: '#191919',
  },
  profileFigmaVouchersHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#191919',
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a2a',
    paddingHorizontal: 24,
    paddingVertical: 13,
    paddingTop: Platform.OS === 'ios' ? 50 : 24,
    justifyContent: 'space-between',
  },
  profileFigmaVouchersHeaderBackBtn: {
    padding: 6,
  },
  profileFigmaVouchersHeaderTitle: {
    fontSize: 18,
    color: '#eae1d4',
    fontFamily: 'Urbanist-Bold',
  },
  profileFigmaVouchersContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 60,
  },
  profileFigmaVouchersIllustration: {
    width: 280,
    height: 280,
    marginBottom: 24,
  },
  profileFigmaVouchersTitle: {
    fontSize: 32,
    color: '#ffffff',
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
    lineHeight: 40,
    marginBottom: 12,
  },
  profileFigmaVouchersSubtitle: {
    fontSize: 16,
    color: '#868e96',
    fontFamily: 'Urbanist-Regular',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  profileFigmaVouchersButton: {
    backgroundColor: '#f2ca50',
    borderRadius: 20,
    paddingVertical: 14,
    paddingHorizontal: 36,
  },
  profileFigmaVouchersButtonText: {
    fontSize: 16,
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
  },
});
