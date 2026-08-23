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

export default function WrongActionDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  const avoidRules = [
    'Always wear your t-shirt while making a delivery.',
    'Make sure to always deliver the package to the customer.',
    'Make sure to not cancel the order after accepting.',
  ];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
            <Ionicons name="arrow-back" size={24} color="#F2CA50" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Wrong action details</Text>
        </View>

        <TouchableOpacity style={styles.helpIconBtn} activeOpacity={0.8}>
          <Ionicons name="help-circle-outline" size={26} color="#F2CA50" />
        </TouchableOpacity>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* FEATURED MASCOT & COUNTER CARD */}
        <View style={styles.counterCard}>
          {/* Rider Mascot Circle */}
          <View style={styles.mascotCircleBorder}>
            <Image
              source={require('../../assets/images/wrong_action_mascot.png')}
              style={styles.mascotImage}
              resizeMode="cover"
            />
          </View>

          {/* Count Row with Sparkles */}
          <View style={styles.countRow}>
            <Text style={styles.sparkleIcon}>✦</Text>
            <Text style={styles.countText}>0</Text>
            <Text style={styles.sparkleIcon}>✦</Text>
          </View>

          <Text style={styles.counterSubtitle}>Wrong actions in last 30 days</Text>
        </View>

        {/* SEE WRONG ACTIONS HISTORY BUTTON */}
        <TouchableOpacity style={styles.historyBtnCard} activeOpacity={0.85}>
          <Text style={styles.historyBtnText}>See wrong actions history</Text>
          <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
        </TouchableOpacity>

        {/* WAYS TO AVOID WRONG ACTIONS SECTION */}
        <View style={styles.sectionHeaderRow}>
          <View style={styles.goldLine} />
          <Text style={styles.sectionHeaderTitle}>Ways to avoid wrong actions</Text>
          <View style={styles.goldLine} />
        </View>

        {/* RULES LIST */}
        <View style={styles.rulesContainer}>
          {avoidRules.map((ruleText, index) => {
            const isLast = index === avoidRules.length - 1;

            return (
              <View key={index}>
                <View style={styles.ruleRow}>
                  {/* Golden Checkmark Circle */}
                  <View style={styles.checkCircle}>
                    <Ionicons name="checkmark" size={18} color="#F2CA50" />
                  </View>

                  <Text style={styles.ruleText}>{ruleText}</Text>
                </View>

                {!isLast && <View style={styles.ruleDivider} />}
              </View>
            );
          })}
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
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  topBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  helpIconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  counterCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 22,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  mascotCircleBorder: {
    width: 90,
    height: 90,
    borderRadius: 45,
    borderWidth: 2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    marginBottom: 14,
  },
  mascotImage: {
    width: 86,
    height: 86,
    borderRadius: 43,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  sparkleIcon: {
    fontSize: 18,
    color: '#F2CA50',
  },
  countText: {
    fontSize: 48,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  counterSubtitle: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
  },
  historyBtnCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 18,
    height: 54,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 24,
  },
  historyBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  goldLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#4E422C',
  },
  sectionHeaderTitle: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginHorizontal: 12,
  },
  rulesContainer: {
    gap: 4,
  },
  ruleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 14,
  },
  checkCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#1C1914',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ruleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#FFFFFF',
    flex: 1,
    lineHeight: 22,
  },
  ruleDivider: {
    height: 1,
    backgroundColor: '#231F1A',
  },
});
