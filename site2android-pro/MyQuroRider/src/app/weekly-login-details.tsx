import React, { useState, useMemo } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';

export default function WeeklyLoginDetailsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    weekId?: string;
    title?: string;
    dates?: string;
    totalDuration?: string;
    daysData?: string;
  }>();

  const weekTitle = params.title || 'Weekly login details';
  const weekDates = params.dates || 'This Week';
  const weekTotalDuration = params.totalDuration || '0h 0m';

  // Parse days from params or generate fallback 7 days
  const daysList = useMemo(() => {
    if (params.daysData) {
      try {
        const parsed = JSON.parse(params.daysData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error('Error parsing daysData params:', e);
      }
    }

    // Default fallback 7 days of the current week (Sunday down to Monday)
    const now = new Date();
    const currentDayOfWeek = now.getDay();
    const distanceToMonday = (currentDayOfWeek + 6) % 7;
    const mon = new Date(now);
    mon.setDate(now.getDate() - distanceToMonday);

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

    const fallbackDays = [];
    for (let d = 6; d >= 0; d--) {
      const dayDate = new Date(mon);
      dayDate.setDate(mon.getDate() + d);
      fallbackDays.push({
        id: `day_${d}`,
        date: dayDate.toISOString().split('T')[0],
        title: `${dayNames[dayDate.getDay()]}, ${monthNames[dayDate.getMonth()]} ${dayDate.getDate()}`,
        duration: '0h 0m',
        hasLoggedIn: false,
        sessions: [],
      });
    }
    return fallbackDays;
  }, [params.daysData]);

  // Default expand today (or the first day with duty sessions)
  const defaultExpandedDay = useMemo(() => {
    const todayItem = daysList.find((d: any) => d.isToday);
    if (todayItem) return todayItem.title;
    const dutyItem = daysList.find((d: any) => d.hasLoggedIn || (d.sessions && d.sessions.length > 0));
    if (dutyItem) return dutyItem.title;
    return daysList.length > 0 ? daysList[0].title : null;
  }, [daysList]);

  const [expandedDay, setExpandedDay] = useState<string | null>(defaultExpandedDay);

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/login-history');
    }
  };

  const toggleDay = (title: string) => {
    setExpandedDay((prev) => (prev === title ? null : title));
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP HEADER BAR */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>

        <View style={styles.headerTextBlock}>
          <Text style={styles.headerTitle}>{weekTitle}</Text>
          <Text style={styles.headerSubtitle}>{weekDates}</Text>
        </View>

        {weekTotalDuration && weekTotalDuration !== '0h 0m' ? (
          <View style={styles.headerDurationBadge}>
            <Text style={styles.headerDurationText}>{weekTotalDuration}</Text>
          </View>
        ) : null}
      </View>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.daysContainer}>
          {daysList.map((item: any) => {
            const isExpanded = expandedDay === item.title;
            const hasSessions = item.sessions && item.sessions.length > 0;
            const hasDuty = item.hasLoggedIn || hasSessions;

            return (
              <View
                key={item.id || item.title}
                style={[styles.dayCard, isExpanded && styles.dayCardExpanded]}
              >
                {/* Header Row */}
                <TouchableOpacity
                  onPress={() => toggleDay(item.title)}
                  style={styles.dayHeaderRow}
                  activeOpacity={0.85}
                >
                  <View style={styles.dayLeftGroup}>
                    {/* Calendar Icon Circle Box */}
                    <View
                      style={[
                        styles.calendarIconCircle,
                        isExpanded && styles.calendarIconCircleExpanded,
                        hasDuty && styles.calendarIconCircleActive,
                      ]}
                    >
                      <Ionicons
                        name={hasDuty ? 'time' : 'calendar-outline'}
                        size={20}
                        color={hasDuty ? '#10B981' : '#F2CA50'}
                      />
                    </View>

                    <View style={styles.dayTitleWrapper}>
                      <Text
                        style={[
                          styles.dayTitleText,
                          isExpanded && styles.dayTitleExpanded,
                        ]}
                      >
                        {item.title}
                      </Text>
                      {item.isToday ? (
                        <View style={styles.todayPill}>
                          <Text style={styles.todayPillText}>TODAY</Text>
                        </View>
                      ) : null}
                    </View>
                  </View>

                  <View style={styles.dayRightGroup}>
                    <Text
                      style={[
                        styles.durationText,
                        hasDuty && styles.durationTextActive,
                      ]}
                    >
                      {item.duration || '0h 0m'}
                    </Text>
                    <Ionicons
                      name={isExpanded ? 'chevron-up' : 'chevron-down'}
                      size={20}
                      color="#F2CA50"
                    />
                  </View>
                </TouchableOpacity>

                {/* Expanded Content View */}
                {isExpanded && (
                  <View style={styles.expandedContentBox}>
                    {hasDuty && hasSessions ? (
                      <View style={styles.sessionsList}>
                        <View style={styles.sessionsSummaryRow}>
                          <Text style={styles.sessionsSummaryTitle}>DUTY SESSIONS</Text>
                          {item.ordersDelivered !== undefined && item.ordersDelivered > 0 ? (
                            <Text style={styles.ordersCountText}>
                              {item.ordersDelivered} {item.ordersDelivered === 1 ? 'Order' : 'Orders'} Completed
                            </Text>
                          ) : null}
                        </View>

                        {item.sessions.map((sess: any, sIdx: number) => (
                          <View key={sess.id || sIdx} style={styles.sessionItemCard}>
                            <View style={styles.sessionLeft}>
                              <View style={[styles.sessionDot, sess.isLive && styles.sessionDotLive]} />
                              <View>
                                <View style={styles.sessionTitleRow}>
                                  <Text style={styles.sessionSlotText}>{sess.slotName || `Shift ${sIdx + 1}`}</Text>
                                  {sess.isLive ? (
                                    <View style={styles.livePill}>
                                      <Text style={styles.livePillText}>ACTIVE NOW</Text>
                                    </View>
                                  ) : null}
                                </View>
                                <Text style={styles.sessionTimeRange}>{sess.timeRange}</Text>
                              </View>
                            </View>

                            <View style={styles.sessionDurationBadge}>
                              <Text style={styles.sessionDurationText}>{sess.duration}</Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ) : (
                      <View style={styles.emptyContainer}>
                        <View style={styles.emptyStateIconSquare}>
                          <Ionicons name="calendar-outline" size={32} color="#4A4232" />
                          <Ionicons name="close" size={16} color="#4A4232" style={styles.crossOverlay} />
                        </View>
                        <Text style={styles.emptyStateText}>You did not login on this day</Text>
                      </View>
                    )}
                  </View>
                )}
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
  headerTextBlock: {
    justifyContent: 'center',
    flex: 1,
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
  },
  headerDurationBadge: {
    backgroundColor: '#1F1A12',
    borderWidth: 1,
    borderColor: '#3D3528',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  headerDurationText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  daysContainer: {
    gap: 14,
  },
  dayCard: {
    backgroundColor: '#141210',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    overflow: 'hidden',
  },
  dayCardExpanded: {
    borderColor: '#F2CA50',
    borderRadius: 22,
  },
  dayHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  dayLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  calendarIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1A1610',
    borderWidth: 1,
    borderColor: '#2E2923',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarIconCircleExpanded: {
    borderColor: '#F2CA50',
  },
  calendarIconCircleActive: {
    borderColor: '#10B981',
    backgroundColor: '#062B1C',
  },
  dayTitleWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  dayTitleText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dayTitleExpanded: {
    color: '#F2CA50',
  },
  todayPill: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
  },
  todayPillText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#10B981',
  },
  dayRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  durationText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#8A8275',
  },
  durationTextActive: {
    color: '#FFFFFF',
  },
  expandedContentBox: {
    backgroundColor: '#0E0C0A',
    borderTopWidth: 1,
    borderTopColor: '#29241E',
    paddingVertical: 20,
    paddingHorizontal: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
  emptyStateIconSquare: {
    width: 54,
    height: 54,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: '#3D3528',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginBottom: 14,
  },
  crossOverlay: {
    position: 'absolute',
  },
  emptyStateText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    textAlign: 'center',
  },
  sessionsList: {
    gap: 10,
  },
  sessionsSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sessionsSummaryTitle: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.1,
  },
  ordersCountText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    color: '#10B981',
  },
  sessionItemCard: {
    backgroundColor: '#171410',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 14,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sessionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#F2CA50',
  },
  sessionDotLive: {
    backgroundColor: '#10B981',
  },
  sessionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  sessionSlotText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  livePill: {
    backgroundColor: '#064E3B',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 8,
  },
  livePillText: {
    fontSize: 9,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#10B981',
  },
  sessionTimeRange: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
  },
  sessionDurationBadge: {
    backgroundColor: '#241F15',
    borderWidth: 1,
    borderColor: '#3D3528',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  sessionDurationText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
});
