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

export default function PetrolIssueScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/payout-issue');
    }
  };

  const weeks = React.useMemo(() => {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

    const list = [];
    for (let w = 1; w <= 4; w++) {
      const mon = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - (w * 7));
      const sun = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 6);
      const title = w === 1 ? 'Last Week' : `Week ${getWeekNumber(mon)}`;
      const dateRange = `${mon.getDate()} ${monthNames[mon.getMonth()]} to ${sun.getDate()} ${monthNames[sun.getMonth()]}`;
      list.push({
        id: `week_${w}`,
        title,
        dateRange,
      });
    }
    return list;
  }, []);

  function getWeekNumber(d: Date) {
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
    }
    return 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Petrol Incentive Issue</Text>
      </View>

      {/* SUBTITLE */}
      <Text style={styles.subtitleText}>Select the week for which you faced the issue</Text>

      {/* MAIN CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.cardContainer}>
          {weeks.map((item, index) => {
            const isLast = index === weeks.length - 1;

            return (
              <View key={item.id} style={styles.rowWrapper}>
                <TouchableOpacity
                  onPress={() => {
                    router.push({
                      pathname: '/petrol-form',
                      params: { weekTitle: item.title, dateRange: item.dateRange },
                    });
                  }}
                  style={styles.weekRow}
                  activeOpacity={0.7}
                >
                  <View style={styles.rowLeftGroup}>
                    <Text style={styles.rowTitleText}>{item.title}</Text>
                    <Text style={styles.dateRangeText}>{item.dateRange}</Text>
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
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
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
  rowWrapper: {
    width: '100%',
  },
  weekRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  rowLeftGroup: {
    flex: 1,
    gap: 4,
  },
  rowTitleText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateRangeText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#8D8D8D',
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
    marginHorizontal: 20,
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
