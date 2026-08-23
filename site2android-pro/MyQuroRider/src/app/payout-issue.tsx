import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useRouter } from 'expo-router';

export default function PayoutIssueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/help-support');
    }
  };

  const categories = [
    {
      id: '1',
      title: 'Incentive issue',
      iconType: 'ionicons',
      iconName: 'gift-outline',
    },
    {
      id: '2',
      title: 'Minimum Guarantee issue',
      iconType: 'ionicons',
      iconName: 'shield-checkmark-outline',
    },
    {
      id: '3',
      title: 'Penalty or Deduction issue',
      iconType: 'text',
      iconName: '%',
    },
    {
      id: '4',
      title: 'Petrol incentive issue',
      iconType: 'material',
      iconName: 'gas-station',
    },
    {
      id: '5',
      title: 'Referral Bonus issue',
      iconType: 'ionicons',
      iconName: 'people-outline',
    },
    {
      id: '6',
      title: 'Joining Bonus issue',
      iconType: 'ionicons',
      iconName: 'person-add-outline',
    },
    {
      id: '7',
      title: 'Incorrect Payout to bank',
      iconType: 'material',
      iconName: 'bank-transfer-out',
    },
  ];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={20} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          <Text style={styles.goldText}>Incentives</Text> and payout issue
        </Text>
      </View>

      {/* SUBTITLE */}
      <Text style={styles.subtitleText}>Select a category related to your issue</Text>

      {/* MAIN CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          {categories.map((item, index) => {
            const isLast = index === categories.length - 1;

            return (
              <View key={item.id} style={styles.rowWrapper}>
                <TouchableOpacity
                  onPress={() => {
                    if (item.title === 'Incentive issue') {
                      router.push('/daily-incentive');
                    } else if (item.title === 'Minimum Guarantee issue') {
                      router.push('/min-guarantee');
                    } else if (item.title === 'Penalty or Deduction issue') {
                      router.push('/penalty-issue');
                    } else if (item.title === 'Petrol incentive issue') {
                      router.push('/petrol-issue');
                    } else if (item.title === 'Referral Bonus issue') {
                      router.push('/referral-issue');
                    } else if (item.title === 'Joining Bonus issue') {
                      router.push('/joining-issue');
                    } else if (item.title === 'Incorrect Payout to bank') {
                      router.push('/bank-payout-issue');
                    }
                  }}
                  style={styles.categoryRow}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeftGroup}>
                    {/* Left Icon Circle */}
                    <View style={styles.iconCircle}>
                      {item.iconType === 'ionicons' && (
                        <Ionicons name={item.iconName as any} size={20} color="#F2CA50" />
                      )}
                      {item.iconType === 'material' && (
                        <MaterialCommunityIcons name={item.iconName as any} size={20} color="#F2CA50" />
                      )}
                      {item.iconType === 'text' && (
                        <Text style={styles.percentText}>{item.iconName}</Text>
                      )}
                    </View>

                    {/* Title */}
                    <Text style={styles.rowTitleText}>{item.title}</Text>
                  </View>

                  {/* Right Chevron Circle */}
                  <View style={styles.chevronCircle}>
                    <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
                  </View>
                </TouchableOpacity>

                {/* Dotted Divider */}
                {!isLast && (
                  <View style={styles.dottedDivider} />
                )}
              </View>
            );
          })}
        </View>
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
  goldText: {
    color: '#F2CA50',
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
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  cardContainer: {
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    borderRadius: 24,
    paddingVertical: 8,
  },
  rowWrapper: {
    width: '100%',
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
  percentText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
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
  dottedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#2A2520',
    borderStyle: 'dashed',
    marginHorizontal: 16,
  },
});
