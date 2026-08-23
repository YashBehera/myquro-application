import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function MinGuaranteeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/payout-issue');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Minimum Guarantee issue</Text>
      </View>

      {/* SUBTITLE */}
      <Text style={styles.subtitleText}>Select a category related to your issue</Text>

      {/* MAIN CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Card Box */}
        <View style={styles.cardContainer}>
          <TouchableOpacity
            onPress={() => router.push('/daily-mg')}
            style={styles.categoryRow}
            activeOpacity={0.7}
          >
            <View style={styles.rowLeftGroup}>
              {/* Left Icon Circle */}
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#F2CA50" />
              </View>

              {/* Title */}
              <Text style={styles.rowTitleText}>Daily Minimum Guarantee Issue</Text>
            </View>

            {/* Right Chevron Circle */}
            <View style={styles.chevronCircle}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.spacer} />

        {/* BOTTOM SKYLINE FOOTER */}
        <Image
          source={require('../../assets/images/skyline_footer.jpg')}
          style={styles.skylineImage}
          resizeMode="contain"
        />
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
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    flex: 1,
  },
  subtitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    paddingHorizontal: 16,
    marginBottom: 20,
    marginTop: 12,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 20,
    justifyContent: 'space-between',
  },
  cardContainer: {
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    borderRadius: 24,
    paddingVertical: 8,
  },
  categoryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 16,
  },
  rowLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1915',
  },
  rowTitleText: {
    fontSize: 16,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    flex: 1,
  },
  chevronCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1C1915',
  },
  spacer: {
    flex: 1,
  },
  skylineImage: {
    width: '100%',
    height: 120,
    marginTop: 40,
  },
});
