import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';

export default function MyProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { driverProfile, refreshRiderProfile } = useRider();

  React.useEffect(() => {
    if (refreshRiderProfile) {
      refreshRiderProfile();
    }
  }, []);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  const isRemoteOrFileAvatar =
    !!driverProfile.avatarUrl &&
    (driverProfile.avatarUrl.startsWith('http') ||
      driverProfile.avatarUrl.startsWith('file://') ||
      driverProfile.avatarUrl.startsWith('content://') ||
      driverProfile.avatarUrl.startsWith('data:'));

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* USER AVATAR & RATINGS TOP ROW */}
        <View style={styles.userHeaderRow}>
          {/* Avatar with Golden Double Border Ring */}
          <View style={styles.avatarOuterRing}>
            <Image
              source={
                isRemoteOrFileAvatar
                  ? { uri: driverProfile.avatarUrl }
                  : require('../../assets/images/user_profile_avatar.png')
              }
              style={styles.avatarImage}
              resizeMode="cover"
            />
          </View>

          {/* Right Ratings Block */}
          <TouchableOpacity style={styles.ratingsBlock} activeOpacity={0.8}>
            <View style={styles.ratingsTitleRow}>
              <Text style={styles.yourRatingsText}>Your ratings</Text>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </View>

            <View style={styles.starRow}>
              <Ionicons name="star" size={20} color="#F2CA50" />
              <Text style={styles.starDashText}>{driverProfile.rating ? driverProfile.rating.toFixed(2) : '4.96'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* NAME & DE ID */}
        <View style={styles.nameBlock}>
          <Text style={styles.userNameText}>{driverProfile.name || 'Delivery Partner'}</Text>
          {driverProfile.deId ? (
            <Text style={styles.deIdLabel}>
              DE ID : <Text style={styles.deIdValue}>{driverProfile.deId}</Text>
            </Text>
          ) : null}
        </View>

        {/* METADATA GRID SECTION */}
        <View style={styles.metadataSection}>
          <View style={styles.sectionDividerLine} />

          {/* Row 1: Mobile number & Joining date */}
          <View style={styles.metaGridRow}>
            {/* Mobile number */}
            <View style={styles.metaCol}>
              <View style={styles.metaLabelRow}>
                <Text style={styles.metaLabel}>Mobile number</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={16} color="#F2CA50" />
                </TouchableOpacity>
              </View>
              <Text style={styles.metaValueText}>{driverProfile.phone ? driverProfile.phone.replace('+91', '').trim() : '-'}</Text>
            </View>

            {/* Joining date */}
            <View style={styles.metaCol}>
              <Text style={styles.metaLabel}>Joining date</Text>
              <Text style={styles.metaValueText}>{driverProfile.joiningDate || '-'}</Text>
            </View>
          </View>

          {/* Row 2: City & Zone */}
          <View style={styles.metaGridRow}>
            {/* City */}
            <View style={styles.metaCol}>
              <View style={styles.metaLabelRow}>
                <Text style={styles.metaLabel}>City</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={16} color="#F2CA50" />
                </TouchableOpacity>
              </View>
              <Text style={styles.metaValueText}>{driverProfile.city || '-'}</Text>
            </View>

            {/* Zone */}
            <View style={styles.metaCol}>
              <View style={styles.metaLabelRow}>
                <Text style={styles.metaLabel}>Zone</Text>
                <TouchableOpacity activeOpacity={0.7}>
                  <Ionicons name="create-outline" size={16} color="#F2CA50" />
                </TouchableOpacity>
              </View>
              <Text style={styles.metaValueText}>{driverProfile.zone || '-'}</Text>
            </View>
          </View>

          {/* Row 3: Order Category */}
          <View style={styles.metaFullRow}>
            <Text style={styles.metaLabel}>Order Category</Text>
            <Text style={styles.metaValueText}>{driverProfile.orderCategory || '-'}</Text>
          </View>

          <View style={styles.sectionDividerLine} />
        </View>

        {/* OPTIONS CARD LIST */}
        <View style={styles.optionsContainerCard}>
          {/* Option 1: Insurance details */}
          <TouchableOpacity
            onPress={() => router.push('/insurance')}
            style={styles.optionRow}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconCircle}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#F2CA50" />
              </View>
              <Text style={styles.optionTitleText}>Insurance details</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>

          <View style={styles.optionDivider} />

          {/* Option 2: Emergency details */}
          <TouchableOpacity
            onPress={() => router.push('/emergency-contacts')}
            style={styles.optionRow}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconCircle}>
                <Ionicons name="add-circle-outline" size={20} color="#F2CA50" />
              </View>
              <Text style={styles.optionTitleText}>Emergency details</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>

          <View style={styles.optionDivider} />

          {/* Option 3: Bank details */}
          <TouchableOpacity
            onPress={() => router.push('/bank-details')}
            style={styles.optionRow}
            activeOpacity={0.8}
          >
            <View style={styles.optionLeft}>
              <View style={styles.optionIconCircle}>
                <Ionicons name="card-outline" size={20} color="#F2CA50" />
              </View>
              <Text style={styles.optionTitleText}>Bank details</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>

          <View style={styles.optionDivider} />

          {/* Option 4: App language */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconCircle}>
                <Ionicons name="language-outline" size={20} color="#F2CA50" />
              </View>
              <View>
                <Text style={styles.optionTitleText}>App language</Text>
                <Text style={styles.optionSubtext}>{driverProfile.appLanguage || 'English'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>

          <View style={styles.optionDivider} />

          {/* Option 5: Preferred Language */}
          <TouchableOpacity style={styles.optionRow} activeOpacity={0.8}>
            <View style={styles.optionLeft}>
              <View style={styles.optionIconCircle}>
                <Ionicons name="headset-outline" size={20} color="#F2CA50" />
              </View>
              <View>
                <Text style={styles.optionTitleText}>Preferred Language</Text>
                <Text style={styles.optionSubtext}>{driverProfile.preferredLanguage || 'हिंदी'}</Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 16,
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
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  userHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  avatarOuterRing: {
    width: 104,
    height: 104,
    borderRadius: 52,
    borderWidth: 2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  avatarImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  ratingsBlock: {
    alignItems: 'flex-start',
  },
  ratingsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  yourRatingsText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    color: '#EAE1D4',
  },
  starRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  starDashText: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  nameBlock: {
    marginBottom: 20,
  },
  userNameText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  deIdLabel: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
  },
  deIdValue: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  metadataSection: {
    marginBottom: 24,
  },
  sectionDividerLine: {
    height: 1,
    backgroundColor: '#25211B',
    marginVertical: 14,
  },
  metaGridRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metaCol: {
    flex: 1,
  },
  metaFullRow: {
    marginBottom: 8,
  },
  metaLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  metaLabel: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    marginBottom: 4,
  },
  metaValueText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionsContainerCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 20,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  optionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  optionIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1914',
    borderWidth: 1,
    borderColor: '#2E2923',
    justifyContent: 'center',
    alignItems: 'center',
  },
  optionTitleText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  optionSubtext: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    marginTop: 2,
  },
  optionDivider: {
    height: 1,
    backgroundColor: '#231F1A',
  },
});
