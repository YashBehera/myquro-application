import React, { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';

export default function LoginHistoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isOnline, loginHistory, fetchLoginHistory, onlineHours } = useRider();
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(!loginHistory);
  const [liveTodayDuration, setLiveTodayDuration] = useState('0h 0m');

  const loadData = useCallback(async () => {
    try {
      await fetchLoginHistory();
    } catch (e) {
      console.error('Error fetching login history:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [fetchLoginHistory]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live timer for today's duration if online
  useEffect(() => {
    const updateLiveTimer = () => {
      if (loginHistory?.today) {
        let totalSec = loginHistory.today.totalSeconds || 0;
        if (isOnline) {
          // If online and timer ticking, we can compute
          const h = Math.floor(totalSec / 3600);
          const m = Math.floor((totalSec % 3600) / 60);
          setLiveTodayDuration(`${h}h ${m}m`);
        } else {
          setLiveTodayDuration(loginHistory.today.formatted || `${Math.floor(onlineHours)}h ${Math.round((onlineHours % 1) * 60)}m`);
        }
      } else {
        const h = Math.floor(onlineHours || 0);
        const m = Math.round(((onlineHours || 0) % 1) * 60);
        setLiveTodayDuration(`${h}h ${m}m`);
      }
    };

    updateLiveTimer();
    const timer = setInterval(updateLiveTimer, 10000);
    return () => clearInterval(timer);
  }, [loginHistory, isOnline, onlineHours]);

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/(tabs)/more');
    }
  };

  // Helper to fallback default calendar weeks if server hasn't responded yet
  const getDefaultWeeks = () => {
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const currentMonday = new Date(now);
    currentMonday.setDate(now.getDate() - distanceToMonday);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const weeks = [];

    for (let w = 0; w < 5; w++) {
      const mon = new Date(currentMonday);
      mon.setDate(currentMonday.getDate() - (w * 7));
      const sun = new Date(mon);
      sun.setDate(mon.getDate() + 6);

      let title = `Week ${getWeekNum(mon)}`;
      if (w === 0) title = 'This Week';
      else if (w === 1) title = 'Previous Week';

      const dates = `${monthNames[mon.getMonth()]} ${String(mon.getDate()).padStart(2, '0')} – ${monthNames[sun.getMonth()]} ${String(sun.getDate()).padStart(2, '0')}`;
      weeks.push({
        id: `week_${w}`,
        title,
        dates,
        totalDuration: w === 0 ? liveTodayDuration : '0h 0m',
        days: [],
      });
    }
    return weeks;
  };

  const weeksList = loginHistory?.pastWeeks && loginHistory.pastWeeks.length > 0
    ? loginHistory.pastWeeks
    : getDefaultWeeks();

  const handleOpenWeek = (week: any) => {
    router.push({
      pathname: '/weekly-login-details',
      params: {
        weekId: week.id,
        title: week.title,
        dates: week.dates,
        totalDuration: week.totalDuration,
        daysData: JSON.stringify(week.days || []),
      },
    });
  };

  const handleOpenToday = () => {
    // Open current week (week 0) with today selected
    const thisWeek = weeksList[0];
    if (thisWeek) {
      handleOpenWeek(thisWeek);
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
        <Text style={styles.headerTitle}>Login History</Text>
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#F2CA50"
            colors={['#F2CA50']}
          />
        }
      >
        {/* TODAY SO FAR FEATURED CARD */}
        <TouchableOpacity
          onPress={handleOpenToday}
          style={styles.todayCard}
          activeOpacity={0.85}
        >
          <View style={styles.todayLeft}>
            {/* Clock History Circle Icon */}
            <View style={[styles.clockIconCircle, isOnline && styles.clockIconCircleActive]}>
              <Ionicons
                name={isOnline ? 'pulse' : 'time-outline'}
                size={26}
                color={isOnline ? '#10B981' : '#F2CA50'}
              />
            </View>

            <View style={styles.todayTextBlock}>
              <View style={styles.statusRow}>
                <Text style={styles.todayCategoryLabel}>TODAY SO FAR</Text>
                {isOnline ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveBadgeText}>ONLINE</Text>
                  </View>
                ) : (
                  <View style={styles.offlineBadge}>
                    <Text style={styles.offlineBadgeText}>OFFLINE</Text>
                  </View>
                )}
              </View>
              <Text style={styles.todayHoursText}>{liveTodayDuration}</Text>
            </View>
          </View>

          {/* Right Golden Action Chevron Button */}
          <View style={styles.goldenChevronCircle}>
            <Ionicons name="chevron-forward" size={16} color="#000000" />
          </View>
        </TouchableOpacity>

        {/* PAST LOGIN DETAILS SECTION */}
        <View style={styles.pastHeaderRow}>
          <Text style={styles.pastSectionHeader}>Past login details</Text>
          <Text style={styles.pastSectionSubtitle}>Weekly Duty Breakdown</Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="small" color="#F2CA50" />
          </View>
        ) : (
          <View style={styles.pastListContainer}>
            {weeksList.map((item: any) => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleOpenWeek(item)}
                style={styles.pastCard}
                activeOpacity={0.85}
              >
                <View style={styles.pastCardLeft}>
                  {/* Calendar Icon Square Box */}
                  <View style={styles.calendarIconBox}>
                    <Ionicons name="calendar-outline" size={22} color="#F2CA50" />
                  </View>

                  <View style={styles.pastTextBlock}>
                    <Text style={styles.pastTitleText}>{item.title}</Text>
                    <Text style={styles.pastDatesText}>{item.dates}</Text>
                  </View>
                </View>

                {/* Right Hours Badge & Chevron */}
                <View style={styles.pastCardRight}>
                  {item.totalDuration && item.totalDuration !== '0h 0m' ? (
                    <View style={styles.durationPill}>
                      <Text style={styles.durationPillText}>{item.totalDuration}</Text>
                    </View>
                  ) : null}

                  <View style={styles.outlineChevronCircle}>
                    <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function getWeekNum(d: Date) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil((((date.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
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
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  todayCard: {
    backgroundColor: '#141210',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    borderRadius: 22,
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 3,
  },
  todayLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    flex: 1,
  },
  clockIconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1F1A12',
    borderWidth: 1,
    borderColor: '#2E2923',
    justifyContent: 'center',
    alignItems: 'center',
  },
  clockIconCircleActive: {
    borderColor: '#10B981',
    backgroundColor: '#062B1C',
  },
  todayTextBlock: {
    justifyContent: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  todayCategoryLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.1,
  },
  liveBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#064E3B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#10B981',
  },
  liveBadgeText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#10B981',
  },
  offlineBadge: {
    backgroundColor: '#26221D',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 10,
  },
  offlineBadgeText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Medium',
    color: '#8A8275',
  },
  todayHoursText: {
    fontSize: 32,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  goldenChevronCircle: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastHeaderRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  pastSectionHeader: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  pastSectionSubtitle: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8A8275',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  pastListContainer: {
    gap: 12,
  },
  pastCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 18,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  pastCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  calendarIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#1A1610',
    borderWidth: 1,
    borderColor: '#2E2923',
    justifyContent: 'center',
    alignItems: 'center',
  },
  pastTextBlock: {
    justifyContent: 'center',
  },
  pastTitleText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  pastDatesText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
  },
  pastCardRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  durationPill: {
    backgroundColor: '#1F1A12',
    borderWidth: 1,
    borderColor: '#3D3528',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  durationPillText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  outlineChevronCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
