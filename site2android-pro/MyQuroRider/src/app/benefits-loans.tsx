import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  StatusBar,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function BenefitsLoansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)');
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* BOTTOM WAVE BACKGROUND */}
      <Image
        source={require('../../assets/images/image copy 16.png')}
        style={styles.bottomWave}
        resizeMode="cover"
      />

      {/* TOP HEADER */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="chevron-back" size={16} color="#F2CA50" />
          <Text style={styles.backBtnText}>Back</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* BRAND STORE PEDESTAL GRAPHIC */}
        <View style={styles.graphicContainer}>
          <Image
            source={require('../../assets/images/image copy 15.png')}
            style={styles.graphicImage}
            resizeMode="contain"
          />
        </View>

        {/* COMING SOON HEADING */}
        <View style={styles.comingSoonContainer}>
          <Text style={styles.comingSoonTitle}>
            COMING <Text style={styles.soonGold}>SOON</Text>
          </Text>
          <Text style={styles.benefitsTitle}>Benefits, Loans & More</Text>
          <Text style={styles.comingSoonSubtitle}>
            Exciting benefits, financial solutions{'\n'}and exclusive offers are coming soon.
          </Text>
        </View>

        {/* 4 COLUMNS HIGHLIGHT CARD */}
        <View style={styles.highlightCard}>
          <View style={styles.highlightGrid}>
            {/* Column 1: Exclusive Benefits */}
            <View style={styles.gridItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="gift-outline" size={20} color="#F2CA50" />
              </View>
              <Text style={styles.gridItemText}>Exclusive{'\n'}Benefits</Text>
            </View>

            {/* Column 2: Easy Loans */}
            <View style={styles.gridItem}>
              <View style={styles.iconCircle}>
                <Text style={styles.rupeeIcon}>₹</Text>
              </View>
              <Text style={styles.gridItemText}>Easy{'\n'}Loans</Text>
            </View>

            {/* Column 3: Special Offers */}
            <View style={styles.gridItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="pricetag-outline" size={20} color="#F2CA50" />
              </View>
              <Text style={styles.gridItemText}>Special{'\n'}Offers</Text>
            </View>

            {/* Column 4: Secure & Trusted */}
            <View style={styles.gridItem}>
              <View style={styles.iconCircle}>
                <Ionicons name="shield-checkmark-outline" size={20} color="#F2CA50" />
              </View>
              <Text style={styles.gridItemText}>Secure &{'\n'}Trusted</Text>
            </View>
          </View>
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
    paddingBottom: 12,
  },
  backBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  backBtnText: {
    color: '#F2CA50',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginLeft: 4,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContainer: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  graphicContainer: {
    width: '100%',
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 20,
  },
  graphicImage: {
    width: '100%',
    height: '100%',
  },
  comingSoonContainer: {
    alignItems: 'center',
    marginBottom: 35,
  },
  comingSoonTitle: {
    fontSize: 34,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 1,
    marginBottom: 10,
  },
  soonGold: {
    color: '#F2CA50',
  },
  benefitsTitle: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    marginBottom: 14,
  },
  comingSoonSubtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#A6A6A6',
    textAlign: 'center',
    lineHeight: 20,
  },
  highlightCard: {
    width: '100%',
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 22,
    paddingVertical: 20,
    paddingHorizontal: 10,
  },
  highlightGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  gridItem: {
    width: '24%',
    alignItems: 'center',
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: '#2E2923',
    backgroundColor: '#1E1B17',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  rupeeIcon: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  gridItemText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#A6A6A6',
    textAlign: 'center',
    lineHeight: 14,
  },
  bottomWave: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    width: '100%',
    height: 180,
  },
});
