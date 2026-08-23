import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';

const { width, height } = Dimensions.get('window');

// Natural image dimensions (1220 x 1289)
const IMAGE_HEIGHT = width * (1289 / 1220);

export default function OnboardingChecklistScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBegin = () => {
    router.push('/restaurant-name');
  };

  const checklistItems = [
    {
      id: 'pan',
      icon: 'card-outline',
      title: 'PAN Number',
    },
    {
      id: 'gstin',
      icon: 'receipt-outline',
      title: 'GSTIN Number',
    },
    {
      id: 'bank',
      icon: 'business-outline',
      title: 'Bank Details (IFSC and Account Number)',
    },
    {
      id: 'fssai',
      icon: 'shield-checkmark-outline',
      title: 'FSSAI Registration Number',
    },
    {
      id: 'menu',
      icon: 'restaurant-outline',
      title: 'Your Restaurant Menu',
    },
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Proportional Hero Background Image */}
      <View style={styles.heroBackgroundWrapper}>
        <Image
          source={require('../../assets/image.png')}
          style={styles.heroImage}
          resizeMode="cover"
        />
        {/* Dark overlay layer for better text contrast */}
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0, 0, 0, 0.4)' }]} />

        {/* Seamless Dark Vignette & Fade Gradient */}
        <LinearGradient
          colors={[
            'rgba(11, 13, 18, 0.45)',
            'rgba(11, 13, 18, 0.2)',
            'rgba(11, 13, 18, 0.4)',
            'rgba(11, 13, 18, 0.72)',
            '#0B0D12',
          ]}
          locations={[0, 0.2, 0.5, 0.8, 1]}
          style={StyleSheet.absoluteFillObject}
          pointerEvents="none"
        />
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']}>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingBottom: Math.max(insets.bottom, 16) + 12 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Top Navigation Bar */}
          <View style={styles.topNav}>
            <TouchableOpacity
              activeOpacity={0.7}
              style={styles.backButton}
              onPress={() => router.back()}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Ionicons name="arrow-back" size={20} color="#E8C547" />
            </TouchableOpacity>
          </View>

          {/* Header Title Section */}
          <View style={styles.headerSection}>
            <Text style={styles.subtitle}>Start your onboarding process</Text>
            <Text style={styles.title}>
              Make your restaurant{'\n'}delivery-ready in{' '}
              <Text style={styles.titleGold}>24hrs!</Text>
            </Text>
            <View style={styles.goldAccentLine} />
          </View>

          {/* Accelerator Promo Card */}
          <View style={styles.promoContainer}>
            <View style={styles.promoRow}>
              <View style={styles.rocketBadge}>
                <Ionicons name="rocket" size={20} color="#E8C547" />
              </View>
              <View style={styles.promoTextWrapper}>
                <Text style={styles.promoLine1}>
                  Fast track your growth with
                </Text>
                <Text style={styles.promoLine2}>
                  MyQuro Accelerator + benefits{'\n'}upto{' '}
                  <Text style={styles.promoAmount}>₹40,000</Text>
                </Text>
              </View>
            </View>

            <View style={styles.promoFooterRow}>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.knowMoreText}>Click here to know more</Text>
              </TouchableOpacity>
              <Text style={styles.termsNote}>*Subject to T&C</Text>
            </View>
          </View>

          {/* 45-50% Semi-Transparent Checklist Container Box */}
          <View style={styles.checklistCard}>
            {/* Folded Dog-Ear Top-Right Corner */}
            <View style={styles.dogEarFold} />

            {/* Card Title & Subtitle */}
            <Text style={styles.cardHeaderTitle}>
              For an easy form filling process,
            </Text>
            <Text style={styles.cardHeaderSubtitle}>
              you can keep the following handy.
            </Text>

            {/* Dashed Separator */}
            <View style={styles.dashedDivider} />

            {/* Checklist Items */}
            <View style={styles.checklistItemsWrapper}>
              {checklistItems.map((item, index) => (
                <View
                  key={item.id}
                  style={[
                    styles.checklistItemRow,
                    index < checklistItems.length - 1 ? styles.itemBorderBottom : null,
                  ]}
                >
                  <View style={styles.itemIconBadge}>
                    <Ionicons name={item.icon as any} size={18} color="#E8C547" />
                  </View>
                  <Text style={styles.itemTitle}>{item.title}</Text>
                </View>
              ))}
            </View>

            {/* CTA Button: Let's Begin! */}
            <TouchableOpacity
              activeOpacity={0.88}
              style={styles.ctaButton}
              onPress={handleBegin}
            >
              <LinearGradient
                colors={['#FDC830', '#F39C12', '#E67E22']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Let's Begin!</Text>
                <Ionicons name="arrow-forward" size={19} color="#0B0D12" />
              </LinearGradient>
            </TouchableOpacity>
          </View>

          {/* Bottom Help & FAQs Link */}
          <View style={styles.helpRow}>
            <Ionicons
              name="headset-outline"
              size={18}
              color="#E8C547"
              style={styles.helpIcon}
            />
            <Text style={styles.helpText}>
              If you need any help, check out the{' '}
              <Text style={styles.faqsLink}>FAQs</Text>
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  heroBackgroundWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: Math.max(IMAGE_HEIGHT, height * 0.6),
    width: '100%',
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 0.95 }],
  },
  safeArea: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    flexGrow: 1,
    justifyContent: 'space-between',
  },

  /* Top Nav */
  topNav: {
    paddingTop: 8,
    marginBottom: 10,
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#191919',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Header Section */
  headerSection: {
    marginTop: 4,
    marginBottom: 10,
  },
  subtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#FFFFFF',
    marginBottom: 4,
  },
  title: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 23,
    lineHeight: 28,
    color: '#FFFFFF',
  },
  titleGold: {
    color: '#E8C547',
  },
  goldAccentLine: {
    width: 40,
    height: 3,
    backgroundColor: '#E8C547',
    borderRadius: 2,
    marginTop: 6,
  },

  /* Promo Card */
  promoContainer: {
    marginBottom: 10,
  },
  promoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rocketBadge: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  promoTextWrapper: {
    flex: 1,
  },
  promoLine1: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#E8C547',
  },
  promoLine2: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    color: '#FFFFFF',
    lineHeight: 16,
  },
  promoAmount: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },
  promoFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  knowMoreText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 11,
    color: '#E8C547',
    textDecorationLine: 'underline',
  },
  termsNote: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 10,
    color: '#8E8E8E',
  },

  /* Checklist Box */
  checklistCard: {
    position: 'relative',
    backgroundColor: '#191919',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    marginBottom: 10,
  },
  dogEarFold: {
    position: 'absolute',
    top: -1,
    right: -1,
    width: 30,
    height: 30,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 10,
    backgroundColor: '#141414',
    borderBottomWidth: 1,
    borderLeftWidth: 1,
    borderColor: '#2A2A2A',
  },
  cardHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    color: '#FFFFFF',
  },
  cardHeaderSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12,
    color: '#8E8E8E',
    marginTop: 2,
    marginBottom: 8,
  },
  dashedDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginBottom: 4,
  },
  checklistItemsWrapper: {
    marginBottom: 2,
  },
  checklistItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 7,
  },
  itemBorderBottom: {
    borderBottomWidth: 1,
    borderBottomColor: '#2A2A2A',
  },
  itemIconBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  itemTitle: {
    flex: 1,
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
  },

  /* CTA Button */
  ctaButton: {
    height: 48,
    borderRadius: 12,
    backgroundColor: '#E8C547',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  ctaGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  ctaText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '700',
    color: '#0B0B0B',
    marginRight: 6,
  },

  /* Bottom Help Row */
  helpRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4,
    paddingBottom: 6,
  },
  helpIcon: {
    marginRight: 8,
  },
  helpText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5,
    color: '#8E8E8E',
  },
  faqsLink: {
    color: '#E8C547',
    fontFamily: 'Urbanist-Bold',
  },
});
