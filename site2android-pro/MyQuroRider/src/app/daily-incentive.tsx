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

export default function DailyIncentiveScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  
  // Set "This Week" and "Last Week" as expanded by default to match the screenshot
  const [expandedWeeks, setExpandedWeeks] = useState<Record<string, boolean>>({
    'This Week': true,
    'Last Week': true,
    'Week 32': false,
    'Week 31': false,
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/help-support');
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
    setExpandedWeeks((prev) => ({
      ...prev,
      [weekName]: !prev[weekName],
    }));
  };

  const handleDayClick = (dateText: string) => {
    // Navigate to language selection screen
    router.push({
      pathname: '/daily-incentive-lang',
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
        <Text style={styles.headerTitle}>Daily Incentive Issue</Text>
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
            const isExpanded = !!expandedWeeks[item.weekName];
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
                  
                  {/* Circle outline with chevron to match figma */}
                  <View style={styles.chevronCircle}>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={16}
                      color="#F2CA50"
                    />
                  </View>
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
                            <View style={styles.dayLeftGroup}>
                              <Ionicons name="calendar-outline" size={20} color="#F2CA50" />
                              <Text style={styles.dayRowText}>{day.dateText}</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
                          </TouchableOpacity>
                          
                          {/* Dashed separator */}
                          {!isLastDay && (
                            <View style={styles.dayDashedDivider} />
                          )}
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
    gap: 16,
    marginBottom: 30,
  },
  weekCard: {
    borderWidth: 1.2,
    borderRadius: 24,
    overflow: 'hidden',
  },
  weekCardCollapsed: {
    backgroundColor: '#11100E',
    borderColor: '#2E2923',
  },
  weekCardExpanded: {
    backgroundColor: '#11100E',
    borderColor: '#F2CA50',
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
  daysListContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2E2923',
    borderStyle: 'dashed',
    paddingBottom: 8,
  },
  dayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 20,
  },
  dayLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  dayRowText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    fontWeight: '500',
    color: '#FFFFFF',
  },
  dayDashedDivider: {
    height: 1,
    borderWidth: 1,
    borderColor: '#2A2520',
    borderStyle: 'dashed',
    marginHorizontal: 20,
  },
  skylineImage: {
    width: '100%',
    height: 120,
    marginTop: 20,
  },
});
