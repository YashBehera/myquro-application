import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ShiftItem {
  id: string;
  category: 'Morning' | 'Lunch' | 'Dinner' | 'Late Night';
  time: string;
  duration: string;
  payout: string;
  demand: 'HIGH' | 'MEDIUM' | 'NORMAL';
  status: 'OPEN' | 'BOOKED' | 'CLOSED';
}



const INITIAL_SHIFTS: ShiftItem[] = [
  {
    id: 'm1',
    category: 'Morning',
    time: '07:00 AM – 11:00 AM',
    duration: '4h',
    payout: '₹450',
    demand: 'NORMAL',
    status: 'OPEN',
  },
  {
    id: 'l1',
    category: 'Lunch',
    time: '12:00 PM – 04:00 PM',
    duration: '4h',
    payout: '₹600',
    demand: 'HIGH',
    status: 'OPEN',
  },
  {
    id: 'd1',
    category: 'Dinner',
    time: '07:00 PM – 11:00 PM',
    duration: '4h',
    payout: '₹750',
    demand: 'HIGH',
    status: 'OPEN',
  },
  {
    id: 'd2',
    category: 'Dinner',
    time: '08:00 PM – 10:00 PM',
    duration: '2h',
    payout: '₹380',
    demand: 'HIGH',
    status: 'OPEN',
  },
  {
    id: 'd3',
    category: 'Dinner',
    time: '10:00 PM – 11:00 PM',
    duration: '1h',
    payout: '₹200',
    demand: 'NORMAL',
    status: 'OPEN',
  },
  {
    id: 'n1',
    category: 'Late Night',
    time: '11:00 PM – 02:00 AM',
    duration: '3h',
    payout: '₹550',
    demand: 'HIGH',
    status: 'OPEN',
  },
  {
    id: 'n2',
    category: 'Late Night',
    time: '02:00 AM – 05:30 AM',
    duration: '3h 30m',
    payout: '₹600',
    demand: 'HIGH',
    status: 'OPEN',
  },
];

const getDynamicDates = () => {
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const result = [];
  const today = new Date();
  
  for (let i = 0; i < 6; i++) {
    const targetDate = new Date();
    targetDate.setDate(today.getDate() + i);
    
    const dateStr = targetDate.getDate().toString();
    const dayName = i === 0 ? 'Today' : weekdays[targetDate.getDay()];
    
    const dayOfWeek = targetDate.getDay();
    const earnMore = dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0; // Fri, Sat, Sun
    
    result.push({
      day: dayName,
      date: dateStr,
      earnMore: earnMore
    });
  }
  return result;
};

export default function MyShiftsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const dates = getDynamicDates();
  const [selectedDate, setSelectedDate] = useState(dates[0].date);
  const [shifts, setShifts] = useState<ShiftItem[]>(INITIAL_SHIFTS);

  // Load shifts on mount and make sure all non-booked are forced to OPEN for easy testing
  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('MYQURO_SHIFTS');
        if (stored) {
          const parsed = JSON.parse(stored);
          const mapped = parsed.map((s: any) => ({
            ...s,
            status: s.status === 'BOOKED' ? 'BOOKED' : 'OPEN'
          }));
          setShifts(mapped);
          await AsyncStorage.setItem('MYQURO_SHIFTS', JSON.stringify(mapped));
        } else {
          // Initialize storage with initial state
          await AsyncStorage.setItem('MYQURO_SHIFTS', JSON.stringify(INITIAL_SHIFTS));
        }
      } catch (err) {
        console.warn('Failed to load shifts from AsyncStorage', err);
      }
    })();
  }, []);

  const saveShifts = async (newShifts: ShiftItem[]) => {
    try {
      await AsyncStorage.setItem('MYQURO_SHIFTS', JSON.stringify(newShifts));
    } catch (err) {
      console.warn('Failed to save shifts to AsyncStorage', err);
    }
  };

  const handleBookShift = (id: string, time: string) => {
    const updated = shifts.map((s) => (s.id === id ? { ...s, status: 'BOOKED' as const } : s));
    setShifts(updated);
    saveShifts(updated);
    Alert.alert(
      'Shift Booked! 🎉',
      `You have successfully booked the shift for ${time}. You can now go online during this window.`,
      [
        {
          text: 'Go to Dashboard',
          onPress: () => router.replace('/(tabs)'),
        },
        { text: 'OK', style: 'default' },
      ]
    );
  };

  const handleCancelShift = (id: string, time: string) => {
    Alert.alert(
      'Cancel Shift',
      `Are you sure you want to cancel your booked shift for ${time}?`,
      [
        { text: 'Keep Shift', style: 'cancel' },
        {
          text: 'Cancel Shift',
          style: 'destructive',
          onPress: () => {
            const updated = shifts.map((s) => (s.id === id ? { ...s, status: 'OPEN' as const } : s));
            setShifts(updated);
            saveShifts(updated);
          },
        },
      ]
    );
  };

  const categories: Array<'Morning' | 'Lunch' | 'Dinner' | 'Late Night'> = [
    'Morning',
    'Lunch',
    'Dinner',
    'Late Night',
  ];

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" translucent />

      {/* TOP BAR HEADER */}
      <View style={styles.topBar}>
        <Text style={styles.headerTitle}>My Shifts</Text>

        <View style={styles.topRightActions}>
          <TouchableOpacity
            onPress={() => router.push('/help-support')}
            style={styles.topActionBtn}
            activeOpacity={0.8}
          >
            <Ionicons name="help-circle-outline" size={24} color="#F2CA50" />
          </TouchableOpacity>
        </View>
      </View>

      {/* HORIZONTAL DATE SELECTOR STRIP */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.datesScrollContent}
        style={styles.datesScrollView}
      >
        {dates.map((item) => {
          const isSelected = selectedDate === item.date;
          return (
            <View key={item.date} style={styles.dateColWrapper}>
              {/* Earn More Pill Badge */}
              {item.earnMore ? (
                <View style={styles.earnMoreBadge}>
                  <Text style={styles.earnMoreText}>Earn more</Text>
                </View>
              ) : (
                <View style={{ height: 18 }} />
              )}

              {/* Date Box */}
              <TouchableOpacity
                onPress={() => setSelectedDate(item.date)}
                style={[styles.dateBox, isSelected && styles.dateBoxSelected]}
                activeOpacity={0.85}
              >
                <Text style={[styles.dayText, isSelected && styles.dayTextSelected]}>
                  {item.day}
                </Text>
                <Text style={[styles.dateText, isSelected && styles.dateTextSelected]}>
                  {item.date}
                </Text>
                {isSelected && <View style={styles.dateActiveIndicator} />}
              </TouchableOpacity>
            </View>
          );
        })}
      </ScrollView>

      {/* MAIN SCROLLABLE SHIFTS CONTENT */}
      <ScrollView style={styles.mainScroll} showsVerticalScrollIndicator={false}>
        {/* LIVE OFFERS BANNER CARD */}
        <TouchableOpacity style={styles.liveOffersCard} activeOpacity={0.85}>
          <View style={styles.liveOffersLeft}>
            <View style={styles.sparkleCircle}>
              <Ionicons name="sparkles" size={16} color="#F2CA50" />
            </View>
            <Text style={styles.liveOffersText}>Know the LIVE offers for you</Text>
          </View>

          <View style={styles.liveOffersChevronBtn}>
            <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
          </View>
        </TouchableOpacity>

        {/* SHIFTS CATEGORIES */}
        {categories.map((cat) => {
          const catShifts = shifts.filter((s) => s.category === cat);
          if (catShifts.length === 0) return null;

          return (
            <View key={cat} style={styles.sectionCard}>
              <View style={styles.sectionHeaderRow}>
                <Text style={styles.sectionTitle}>{cat}</Text>
                <Text style={styles.sectionSubCount}>
                  {catShifts.filter((s) => s.status === 'OPEN').length} Openings
                </Text>
              </View>

              {catShifts.map((shift, idx) => {
                const isBooked = shift.status === 'BOOKED';
                const isOpen = shift.status === 'OPEN';
                const isClosed = shift.status === 'CLOSED';

                return (
                  <React.Fragment key={shift.id}>
                    {idx > 0 && <View style={styles.slotDivider} />}

                    <View style={styles.shiftSlotRow}>
                      <View style={styles.shiftSlotLeft}>
                        {/* Badges Row */}
                        <View style={styles.badgeRow}>
                          {shift.demand === 'HIGH' && (
                            <View style={styles.highBadge}>
                              <Text style={styles.highBadgeText}>HIGH DEMAND</Text>
                            </View>
                          )}
                          <View
                            style={[
                              styles.statusPillBadge,
                              isOpen && styles.statusPillOpen,
                              isBooked && styles.statusPillBooked,
                              isClosed && styles.statusPillClosed,
                            ]}
                          >
                            <Text
                              style={[
                                styles.statusPillText,
                                isOpen && styles.statusTextOpen,
                                isBooked && styles.statusTextBooked,
                                isClosed && styles.statusTextClosed,
                              ]}
                            >
                              {shift.status}
                            </Text>
                          </View>
                        </View>

                        {/* Shift Time */}
                        <Text style={styles.shiftTimeText}>{shift.time}</Text>

                        {/* Duration & Estimated Payout */}
                        <View style={styles.statusRow}>
                          <Ionicons name="time-outline" size={14} color="#A6A6A6" />
                          <Text style={styles.durationText}>{shift.duration}</Text>
                          <Text style={styles.dotSeparator}>•</Text>
                          <Text style={styles.payoutText}>Est. {shift.payout}</Text>
                          {isBooked && (
                            <>
                              <Text style={styles.dotSeparator}>•</Text>
                              <Ionicons name="checkmark-circle" size={15} color="#10B981" />
                              <Text style={styles.bookedTagText}>Ready to work</Text>
                            </>
                          )}
                        </View>
                      </View>

                      {/* Action Button: Book / Cancel / Full */}
                      {isOpen && (
                        <TouchableOpacity
                          onPress={() => handleBookShift(shift.id, shift.time)}
                          style={styles.bookShiftBtn}
                          activeOpacity={0.85}
                        >
                          <Text style={styles.bookShiftBtnText}>Book</Text>
                        </TouchableOpacity>
                      )}

                      {isBooked && (
                        <TouchableOpacity
                          onPress={() => handleCancelShift(shift.id, shift.time)}
                          style={styles.closeBtn}
                          activeOpacity={0.8}
                        >
                          <Ionicons name="close" size={16} color="#FFFFFF" />
                        </TouchableOpacity>
                      )}

                      {isClosed && (
                        <View style={styles.closedBtnBadge}>
                          <Text style={styles.closedBtnText}>Full</Text>
                        </View>
                      )}
                    </View>
                  </React.Fragment>
                );
              })}
            </View>
          );
        })}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
  },
  topRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  topActionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#1E1B18',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E2923',
  },
  datesScrollView: {
    maxHeight: 90,
  },
  datesScrollContent: {
    paddingHorizontal: 16,
    gap: 10,
    paddingBottom: 8,
  },
  dateColWrapper: {
    alignItems: 'center',
    gap: 4,
  },
  earnMoreBadge: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  earnMoreText: {
    fontSize: 9,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateBox: {
    width: 54,
    height: 58,
    backgroundColor: '#1E1B18',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#2E2923',
  },
  dateBoxSelected: {
    backgroundColor: '#26221A',
    borderColor: '#F2CA50',
  },
  dayText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    marginBottom: 2,
  },
  dayTextSelected: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
  },
  dateText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  dateTextSelected: {
    color: '#F2CA50',
  },
  dateActiveIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 14,
    height: 2.5,
    borderRadius: 1.5,
    backgroundColor: '#F2CA50',
  },
  mainScroll: {
    flex: 1,
    paddingHorizontal: 16,
    marginTop: 8,
  },
  liveOffersCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#1C1914',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
  },
  liveOffersLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sparkleCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(242, 202, 80, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveOffersText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  liveOffersChevronBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#242018',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionCard: {
    backgroundColor: '#16130E',
    borderWidth: 1,
    borderColor: '#2A241A',
    borderRadius: 18,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sectionSubCount: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#F2CA50',
  },
  shiftSlotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  shiftSlotLeft: {
    flex: 1,
    gap: 4,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 2,
  },
  highBadge: {
    backgroundColor: '#2E2210',
    borderWidth: 1,
    borderColor: '#F2CA50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  highBadgeText: {
    fontSize: 9,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#F2CA50',
  },
  statusPillBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusPillOpen: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  statusPillBooked: {
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    borderWidth: 1,
    borderColor: '#F2CA50',
  },
  statusPillClosed: {
    backgroundColor: '#262626',
    borderWidth: 1,
    borderColor: '#404040',
  },
  statusPillText: {
    fontSize: 9,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  statusTextOpen: {
    color: '#22C55E',
  },
  statusTextBooked: {
    color: '#F2CA50',
  },
  statusTextClosed: {
    color: '#8E8E8E',
  },
  shiftTimeText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  durationText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
  },
  dotSeparator: {
    fontSize: 10,
    color: '#666666',
  },
  payoutText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    color: '#EAE1D4',
  },
  bookedTagText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#10B981',
  },
  bookShiftBtn: {
    backgroundColor: '#F2CA50',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  bookShiftBtnText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#26221C',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#3D3528',
  },
  closedBtnBadge: {
    backgroundColor: '#1E1B18',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#332D23',
  },
  closedBtnText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    color: '#666666',
  },
  slotDivider: {
    height: 1,
    backgroundColor: '#26221C',
    marginVertical: 12,
  },
});
