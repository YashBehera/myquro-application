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

export default function WaysToEarnScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* FEATURED HEADER CARD */}
        <View style={styles.headerCard}>
          <View style={styles.headerLeftBlock}>
            <Text style={styles.headerTitleText}>
              Ways to <Text style={styles.headerTitleGold}>earn</Text>
            </Text>
            <Text style={styles.headerSubtitleText}>
              A quick view on how you can earn easily with MyQuro
            </Text>
          </View>

          <Image
            source={require('../../assets/images/3d_cash_coins_stack.png')}
            style={styles.headerCoinsImage}
            resizeMode="contain"
          />
        </View>

        {/* OPTIONS LIST */}
        <View style={styles.optionsList}>
          {/* Card 1: Incentive & Guarantees */}
          <TouchableOpacity style={styles.optionCard} activeOpacity={0.85}>
            <View style={styles.optionLeftGroup}>
              <View style={styles.graphicBox}>
                <Image
                  source={require('../../assets/images/3d_gold_flag.png')}
                  style={styles.graphicImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.optionTitleText}>Incentive & Guarantees</Text>
            </View>

            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </TouchableOpacity>

          {/* Card 2: Referral Bonus */}
          <TouchableOpacity
            onPress={() => router.push('/(tabs)/refer')}
            style={styles.optionCard}
            activeOpacity={0.85}
          >
            <View style={styles.optionLeftGroup}>
              <View style={styles.graphicBox}>
                <Image
                  source={require('../../assets/images/3d_referral_riders_coin.png')}
                  style={styles.graphicImage}
                  resizeMode="contain"
                />
              </View>

              <Text style={styles.optionTitleText}>Referral Bonus</Text>
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
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  headerCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 24,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  headerLeftBlock: {
    flex: 1,
    marginRight: 10,
  },
  headerTitleText: {
    fontSize: 26,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 6,
  },
  headerTitleGold: {
    color: '#F2CA50',
  },
  headerSubtitleText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    lineHeight: 20,
  },
  headerCoinsImage: {
    width: 110,
    height: 100,
  },
  optionsList: {
    gap: 16,
  },
  optionCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  optionLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  graphicBox: {
    width: 72,
    height: 72,
    borderRadius: 16,
    backgroundColor: '#1A1610',
    borderWidth: 1,
    borderColor: '#2E2923',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  graphicImage: {
    width: 60,
    height: 60,
  },
  optionTitleText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
});
