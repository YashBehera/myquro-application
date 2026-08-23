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

export default function HelpSupportScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  const issuesList = [
    { id: '1', title: 'Order earning issue', icon: 'cash-outline', route: '/trip-earning' },
    { id: '2', title: 'Incentives and Payout issue', icon: 'wallet-outline', route: '/payout-issue' },
    { id: '3', title: 'Daily incentive issue', icon: 'calendar-outline', route: '/daily-incentive' },
    { id: '4', title: 'Incorrect Payout to Bank', icon: 'business-outline', route: '/bank-payout-issue' },
    { id: '5', title: 'Minimum Guarantee issue', icon: 'shield-checkmark-outline', route: '/min-guarantee' },
    { id: '6', title: 'Petrol incentive issue', icon: 'speedometer-outline', route: '/petrol-issue' },
    { id: '7', title: 'Penalty or Deduction issue', icon: 'alert-circle-outline', route: '/penalty-issue' },
    { id: '8', title: 'Referral Bonus issue', icon: 'people-outline', route: '/referral-issue' },
    { id: '9', title: 'Joining Bonus issue', icon: 'gift-outline', route: '/joining-issue' },
    { id: '10', title: 'Floating cash issue', icon: 'card-outline', route: '/floating-cash' },
  ];

  const handleIssuePress = (item: any) => {
    if (item.route) {
      router.push(item.route as any);
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
        {/* HERO SECTION */}
        <View style={styles.heroSection}>
          <Text style={styles.welcomeSubtitle}>Welcome to the</Text>
          <Text style={styles.heroTitleText}>
            Delivery Partner <Text style={styles.heroTitleGold}>Help Center</Text>
          </Text>

          {/* Underline Gold Arc Line */}
          <View style={styles.goldArcLine} />

          {/* 3D Support Agent Mascot Graphic */}
          <View style={styles.agentCircleWrapper}>
            <View style={styles.agentOuterCircle}>
              <Image
                source={require('../../assets/images/3d_support_agent_namaste.png')}
                style={styles.agentImage}
                resizeMode="cover"
              />
            </View>

            {/* Sparkles */}
            <Ionicons name="sparkles" size={16} color="#F2CA50" style={styles.sparkleLeft} />
            <Ionicons name="sparkles" size={14} color="#F2CA50" style={styles.sparkleRight} />
          </View>

          <Text style={styles.needHelpText}>Need any help?</Text>
          <Text style={styles.myQuroText}>My Quro is here for you.</Text>
        </View>

        {/* RAISE A NEW ISSUE SECTION */}
        <Text style={styles.sectionHeaderTitle}>Raise a new issue</Text>

        <View style={styles.issuesCardContainer}>
          {issuesList.map((item, index) => {
            const isLast = index === issuesList.length - 1;

            return (
              <View key={item.id}>
                <TouchableOpacity
                  onPress={() => handleIssuePress(item)}
                  style={styles.issueRow}
                  activeOpacity={0.8}
                >
                  <View style={styles.issueLeftGroup}>
                    {/* Circle Icon Box */}
                    <View style={styles.iconCircleBox}>
                      <Ionicons name={item.icon as any} size={20} color="#F2CA50" />
                    </View>

                    <Text style={styles.issueTitleText}>{item.title}</Text>
                  </View>

                  <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
                </TouchableOpacity>

                {!isLast && <View style={styles.dottedDivider} />}
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
  },
  heroSection: {
    alignItems: 'center',
    marginBottom: 24,
    paddingTop: 8,
  },
  welcomeSubtitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Regular',
    color: '#EAE1D4',
    marginBottom: 4,
  },
  heroTitleText: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
  },
  heroTitleGold: {
    color: '#F2CA50',
  },
  goldArcLine: {
    width: 220,
    height: 2,
    backgroundColor: '#F2CA50',
    marginTop: 6,
    marginBottom: 20,
    borderRadius: 1,
  },
  agentCircleWrapper: {
    position: 'relative',
    marginBottom: 16,
  },
  agentOuterCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    backgroundColor: '#120F0C',
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  agentImage: {
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  sparkleLeft: {
    position: 'absolute',
    top: 10,
    left: -12,
  },
  sparkleRight: {
    position: 'absolute',
    top: 50,
    right: -16,
  },
  needHelpText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#EAE1D4',
    textAlign: 'center',
  },
  myQuroText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    textAlign: 'center',
    marginTop: 2,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 14,
  },
  issuesCardContainer: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 6,
    marginBottom: 24,
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
  },
  issueLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  iconCircleBox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1C1914',
    borderWidth: 1,
    borderColor: '#2E2923',
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueTitleText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#3D3528',
    borderStyle: 'dashed',
  },
});
