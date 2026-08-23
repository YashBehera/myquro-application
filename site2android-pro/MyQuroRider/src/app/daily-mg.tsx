import React, { useState } from 'react';
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

export default function DailyMGScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [expandedWeek, setExpandedWeek] = useState<string | null>('Last Week');

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/min-guarantee');
    }
  };

  const weeksList = React.useMemo(() => {
    const now = new Date();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const currentDayOfWeek = now.getDay();
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const currentMonday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - distanceToMonday);

    // This week days (from today down to Monday)
    const thisWeekDays = [];
    for (let d = distanceToMonday; d >= 0; d--) {
      const dayDate = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() + d);
      const isToday = d === distanceToMonday;
      const isYesterday = d === distanceToMonday - 1;
      const prefix = isToday ? 'Today, ' : isYesterday ? 'Yesterday, ' : `${dayNames[dayDate.getDay()]}, `;
      thisWeekDays.push({
        id: `tw_${d}`,
        dateText: `${prefix}${dayDate.getDate()} ${monthNames[dayDate.getMonth()]}`,
      });
    }

    // Last week days (Sunday down to Monday)
    const lastWeekDays = [];
    const lastMonday = new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate() - 7);
    for (let d = 6; d >= 0; d--) {
      const dayDate = new Date(lastMonday.getFullYear(), lastMonday.getMonth(), lastMonday.getDate() + d);
      lastWeekDays.push({
        id: `lw_${d}`,
        dateText: `${dayNames[dayDate.getDay()]}, ${dayDate.getDate()} ${monthNames[dayDate.getMonth()]}`,
      });
    }

    return [
      { id: '1', weekName: 'This Week', days: thisWeekDays },
      { id: '2', weekName: 'Last Week', days: lastWeekDays },
      { id: '3', weekName: 'Week 32', days: [] },
      { id: '4', weekName: 'Week 31', days: [] },
    ];
  }, []);

  const toggleWeek = (weekName: string) => {
    setExpandedWeek((prev) => (prev === weekName ? null : weekName));
  };

  const handleDayClick = (dateText: string) => {
    // Navigate to day details
    router.push({
      pathname: '/mg-day-details',
      params: { date: dateText },
    });
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Minimum Guarantee Issue</Text>
      </View>

      {/* SUBTITLE */}
      <Text style={styles.subtitleText}>Select the day for which you faced the issue</Text>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.weeksContainer}>
          {weeksList.map((item) => {
            const isExpanded = expandedWeek === item.weekName;
            const hasDays = item.days.length > 0;

            return (
              <View
                key={item.id}
                style={[
                  styles.weekCard,
                  isExpanded ? styles.weekCardExpanded : styles.weekCardCollapsed,
                ]}
              >
                {/* Header Row */}
                <TouchableOpacity
                  onPress={() => toggleWeek(item.weekName)}
                  style={styles.weekHeaderRow}
                  activeOpacity={0.85}
                >
                  <Text style={styles.weekTitleText}>{item.weekName}</Text>
                  <Ionicons
                    name={isExpanded ? 'chevron-up' : 'chevron-down'}
                    size={20}
                    color="#F2CA50"
                  />
                </TouchableOpacity>

                {/* Expanded Day List */}
                {isExpanded && hasDays && (
                  <View style={styles.daysListContainer}>
                    {item.days.map((day, idx) => {
                      const isLastDay = idx === item.days.length - 1;
                      return (
                        <View key={day.id}>
                          <TouchableOpacity
                            onPress={() => handleDayClick(day.dateText)}
                            style={styles.dayRow}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.dayRowText}>{day.dateText}</Text>
                            <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
                          </TouchableOpacity>
                          {!isLastDay && <View style={styles.dayDivider} />}
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </View>

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
    paddingHorizontal: 16,
    paddingBottom: 20,
  },
  weeksContainer: {
    gap: 12,
    marginBottom: 30,
  },
  weekCard: {
    borderWidth: 1,
    borderRadius: 20,
    overflow: 'hidden',
  },
  weekCardCollapsed: {
    backgroundColor: '#141210',
    borderColor: '#2E2923',
  },
  weekCardExpanded: {
    backgroundColor: '#141210',
    borderColor: '#F2CA50',
    borderRadius: 22,
  },
  weekHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 18,
    paddingHorizontal: 20,
  },
  weekTitleText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  daysListContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2E2923',
    paddingBottom: 10,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dayRowText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dayDivider: {
    height: 1,
    backgroundColor: '#2A2520',
    marginHorizontal: 20,
  },
  skylineImage: {
    width: '100%',
    height: 120,
    marginTop: 20,
  },
});
