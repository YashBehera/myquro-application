import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Animated,
  Easing,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';

export default function TroubleshootingScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const spinAnim = new Animated.Value(0);

  useEffect(() => {
    Animated.loop(
      Animated.timing(spinAnim, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    ).start();
  }, []);

  const spin = spinAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace('/app-settings');
    }
  };

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000000" translucent />

      {/* TOP BAR HEADER */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={handleBack} style={styles.backBtn} activeOpacity={0.8}>
          <Ionicons name="arrow-back" size={24} color="#F2CA50" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Trouble Shooting</Text>
      </View>

      <Text style={styles.headerSubtitle}>We are checking these for you</Text>

      {/* MAIN SCROLLABLE CONTENT */}
      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* TIMELINE WITH CARDS CONTAINER */}
        <View style={styles.timelineWrapper}>
          {/* Vertical Stepper Dashed Guide Line */}
          <View style={styles.verticalDashedLine} />

          {/* STEP 1: Network Connectivity */}
          <View style={styles.timelineItemRow}>
            {/* Step Node Marker */}
            <View style={styles.nodeMarkerWrapper}>
              <View style={styles.activeNodeDot} />
            </View>

            {/* Diagnostic Card 1 */}
            <View style={styles.diagnosticCard}>
              <View style={styles.cardLeftSection}>
                <View style={styles.iconCircleBadge}>
                  <Ionicons name="cellular" size={20} color="#F2CA50" />
                </View>

                <View style={styles.textColumn}>
                  <Text style={styles.cardTitleWhite}>Network connectivity</Text>
                  <Text style={styles.cardSubtitleText}>Checking your connection</Text>
                </View>
              </View>

              <View style={styles.cardRightBadgeCol}>
                <Ionicons name="checkmark-circle" size={22} color="#F2CA50" />
                <View style={styles.statusPillBorder}>
                  <Text style={styles.statusPillText}>Good</Text>
                </View>
              </View>
            </View>
          </View>

          {/* STEP 2: Duty Status */}
          <View style={styles.timelineItemRow}>
            {/* Step Node Marker */}
            <View style={styles.nodeMarkerWrapper}>
              <View style={styles.activeNodeDot} />
            </View>

            {/* Diagnostic Card 2 */}
            <View style={styles.diagnosticCard}>
              <View style={styles.cardLeftSection}>
                <View style={styles.iconCircleBadge}>
                  <Ionicons name="bicycle" size={22} color="#F2CA50" />
                </View>

                <View style={styles.textColumn}>
                  <Text style={styles.cardTitleGold}>Duty Status</Text>
                  <Text style={styles.cardSubtitleText}>Please start duty to receive orders</Text>
                </View>
              </View>

              <View style={styles.cardRightBadgeCol}>
                <Ionicons name="alert-circle-outline" size={22} color="#F2CA50" />
                <View style={styles.statusPillBorder}>
                  <Text style={styles.statusPillText}>Action required</Text>
                </View>
              </View>
            </View>
          </View>

          {/* STEP 3: Location */}
          <View style={styles.timelineItemRow}>
            {/* Step Node Marker */}
            <View style={styles.nodeMarkerWrapper}>
              <View style={styles.inactiveNodeCircle} />
            </View>

            {/* Diagnostic Card 3 */}
            <View style={styles.diagnosticCard}>
              <View style={styles.cardLeftSection}>
                <View style={styles.iconCircleBadge}>
                  <Ionicons name="navigate-outline" size={20} color="#F2CA50" />
                </View>

                <View style={styles.textColumn}>
                  <Text style={styles.cardTitleWhite}>Location</Text>
                  <Text style={styles.cardSubtitleText}>Checking your location</Text>
                </View>
              </View>

              <View style={styles.cardRightBadgeCol}>
                <Animated.View style={{ transform: [{ rotate: spin }] }}>
                  <Ionicons name="reload-outline" size={20} color="#F2CA50" />
                </Animated.View>
                <View style={styles.statusPillBorder}>
                  <Text style={styles.statusPillText}>Checking</Text>
                </View>
              </View>
            </View>
          </View>

          {/* STEP 4: Inside Zone */}
          <View style={styles.timelineItemRow}>
            {/* Step Node Marker */}
            <View style={styles.nodeMarkerWrapper}>
              <View style={styles.inactiveNodeCircle} />
            </View>

            {/* Diagnostic Card 4 */}
            <View style={styles.diagnosticCard}>
              <View style={styles.cardLeftSection}>
                <View style={styles.iconCircleBadge}>
                  <Ionicons name="location-outline" size={22} color="#F2CA50" />
                </View>

                <View style={styles.textColumn}>
                  <Text style={styles.cardTitleWhite}>Inside Zone</Text>
                  <Text style={styles.cardSubtitleText}>Verifying you are inside the zone</Text>
                </View>
              </View>

              <View style={styles.cardRightBadgeCol}>
                <Ionicons name="time-outline" size={22} color="#F2CA50" />
                <View style={styles.statusPillBorder}>
                  <Text style={styles.statusPillText}>Pending</Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* BOTTOM ALMOST THERE SUMMARY CARD */}
        <View style={styles.almostThereCard}>
          <View style={styles.shieldIconBadge}>
            <Ionicons name="shield-checkmark" size={32} color="#F2CA50" />
            <Ionicons name="star" size={8} color="#F2CA50" style={styles.shieldSparkle} />
          </View>

          <View style={styles.almostThereTextCol}>
            <Text style={styles.almostThereTitle}>Almost there!</Text>
            <Text style={styles.almostThereSubtitle}>
              We'll notify you once everything is good to go.
            </Text>
          </View>
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
    paddingVertical: 12,
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
    color: '#F2CA50',
  },
  headerSubtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#9E9E9E',
    paddingHorizontal: 20,
    marginTop: 2,
    marginBottom: 20,
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  scrollContentContainer: {
    paddingBottom: 24,
  },
  timelineWrapper: {
    position: 'relative',
    gap: 16,
  },
  verticalDashedLine: {
    position: 'absolute',
    left: 8,
    top: 36,
    bottom: 40,
    width: 1,
    borderWidth: 1,
    borderColor: '#3D3528',
    borderStyle: 'dashed',
    zIndex: 1,
  },
  timelineItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    zIndex: 2,
  },
  nodeMarkerWrapper: {
    width: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#000000',
    paddingVertical: 4,
  },
  activeNodeDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F2CA50',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 6,
    elevation: 4,
  },
  inactiveNodeCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#4A4033',
    backgroundColor: '#000000',
  },
  diagnosticCard: {
    flex: 1,
    backgroundColor: '#12100C',
    borderWidth: 1,
    borderColor: '#26221C',
    borderRadius: 20,
    paddingVertical: 18,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLeftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
    paddingRight: 8,
  },
  iconCircleBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#1E1B14',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textColumn: {
    flex: 1,
  },
  cardTitleWhite: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  cardTitleGold: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    marginBottom: 4,
  },
  cardSubtitleText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    lineHeight: 16,
  },
  cardRightBadgeCol: {
    alignItems: 'center',
    gap: 6,
    minWidth: 70,
  },
  statusPillBorder: {
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2.5,
    backgroundColor: '#1A1712',
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  almostThereCard: {
    backgroundColor: '#12100C',
    borderWidth: 1,
    borderColor: '#26221C',
    borderRadius: 20,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginTop: 24,
  },
  shieldIconBadge: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#1E1B14',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.35)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  shieldSparkle: {
    position: 'absolute',
    top: 4,
    right: 4,
  },
  almostThereTextCol: {
    flex: 1,
  },
  almostThereTitle: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    marginBottom: 4,
  },
  almostThereSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#9E9E9E',
    lineHeight: 18,
  },
});
