import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Image,
  TouchableOpacity,
  ScrollView,
  StatusBar,
  Modal,
  Animated,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import Svg, { Polygon } from 'react-native-svg';
import { WebView } from 'react-native-webview';
import { OLA_MAPS_API_KEY } from '../../config';
import { useRider } from '../../context/RiderContext';
import { ActiveTripCard } from '../../components/ActiveTripCard';
import { CustomAlertModal, ModalType } from '../../components/CustomAlertModal';

function getMiniMapHtml(apiKey: string): string {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <style>
        html, body, #map {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background: #0E0C0A;
        }
        .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo { display: none !important; }
      </style>
      <link href="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.css" rel="stylesheet" />
      <script src="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.js"></script>
    </head>
    <body>
      <div id="map"></div>
      <script>
        const API_KEY = "${apiKey}";
        const map = new maplibregl.Map({
          container: 'map',
          style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
          center: [85.7870, 20.2450],
          zoom: 11.2,
          attributionControl: false,
          interactive: false,
          transformRequest: (url) => ({
            url: url + (url.includes('?') ? '&' : '?') + 'api_key=' + API_KEY
          })
        });

        map.on('load', () => {
          // Add Active Zone 1 Gold Polygon
          map.addSource('zone-polygon-active', {
            type: 'geojson',
            data: {
              type: 'Feature',
              geometry: {
                type: 'Polygon',
                coordinates: [[
                  [85.7800, 20.2600],
                  [85.8000, 20.2500],
                  [85.7900, 20.2350],
                  [85.7750, 20.2400],
                  [85.7800, 20.2600]
                ]]
              }
            }
          });
          map.addLayer({
            id: 'zone-fill-active',
            type: 'fill',
            source: 'zone-polygon-active',
            paint: {
              'fill-color': '#eab308',
              'fill-opacity': 0.22
            }
          });
          map.addLayer({
            id: 'zone-stroke-active',
            type: 'line',
            source: 'zone-polygon-active',
            paint: {
              'line-color': '#eab308',
              'line-width': 2.0
            }
          });

          // Add user location dot marker
          const el = document.createElement('div');
          el.style.width = '10px';
          el.style.height = '10px';
          el.style.borderRadius = '5px';
          el.style.background = '#eab308';
          el.style.border = '1.5px solid #FFFFFF';
          el.style.boxShadow = '0 0 4px rgba(0,0,0,0.5)';
          
          new maplibregl.Marker({ element: el }).setLngLat([85.7870, 20.2450]).addTo(map);
        });
      </script>
    </body>
    </html>
  `;
}

const ACTIVE_ZONE_POLYGON: [number, number][] = [
  [85.7800, 20.2600],
  [85.8000, 20.2500],
  [85.7900, 20.2350],
  [85.7750, 20.2400],
];

function isPointInPolygon(point: [number, number], polygon: [number, number][]) {
  const [x, y] = point;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    const intersect = ((yi > y) !== (yj > y))
        && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

function parseShiftTime(timeStr: string): { startMinutes: number; endMinutes: number } {
  const parts = timeStr.replace(/\s+/g, ' ').split(' – ');
  if (parts.length !== 2) return { startMinutes: 0, endMinutes: 0 };

  const parseTime = (tStr: string) => {
    const [time, ampm] = tStr.trim().split(' ');
    let [hours, minutes] = time.split(':').map(Number);
    if (ampm === 'PM' && hours < 12) hours += 12;
    if (ampm === 'AM' && hours === 12) hours = 0;
    return hours * 60 + minutes;
  };

  const startMinutes = parseTime(parts[0]);
  let endMinutes = parseTime(parts[1]);

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60; // Midnight crossing
  }

  return { startMinutes, endMinutes };
}

function isTimeInShiftWindow(shiftTimeStr: string): boolean {
  const { startMinutes, endMinutes } = parseShiftTime(shiftTimeStr);
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const bufferStart = startMinutes - 15; // 15 mins early buffer

  if (endMinutes > 24 * 60) {
    // Crosses midnight
    return (currentMinutes >= bufferStart && currentMinutes <= 24 * 60) || 
           (currentMinutes <= endMinutes - 24 * 60) ||
           (currentMinutes + 24 * 60 >= bufferStart && currentMinutes + 24 * 60 <= endMinutes);
  } else {
    // Normal window
    return currentMinutes >= bufferStart && currentMinutes <= endMinutes;
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { triggerDemoRequest, activeTrip, isOnline, toggleOnlineStatus, todayEarnings, tripsToday } = useRider();
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [showBookShiftModal, setShowBookShiftModal] = useState(false);
  const [showOutsideZoneModal, setShowOutsideZoneModal] = useState(false);
  const [hasOverlayPermission, setHasOverlayPermission] = useState(false);
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
  }>({
    visible: false,
    title: '',
    subtitle: '',
  });

  const showAlertModal = (config: {
    type?: ModalType;
    title: string;
    subtitle: string;
    primaryButtonText?: string;
    onPrimaryPress?: () => void;
    secondaryButtonText?: string;
    onSecondaryPress?: () => void;
  }) => {
    setCustomAlert({
      ...config,
      visible: true,
    });
  };

  const hideAlertModal = () => {
    setCustomAlert((prev) => ({ ...prev, visible: false }));
  };

  const bubbleOpacity = useRef(new Animated.Value(1)).current;

  // Searching Dots Anim
  const [searchingDots, setSearchingDots] = useState('...');

  // Radar Ripples Anim
  const rippleAnim1 = useRef(new Animated.Value(0)).current;
  const rippleAnim2 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const timer = setTimeout(() => {
      Animated.timing(bubbleOpacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start();
    }, 5000);
    return () => clearTimeout(timer);
  }, []);

  // Animate dots continuously when online
  useEffect(() => {
    if (isOnline) {
      const interval = setInterval(() => {
        setSearchingDots((prev) => {
          if (prev === '.') return '..';
          if (prev === '..') return '...';
          return '.';
        });
      }, 600);
      return () => clearInterval(interval);
    }
  }, [isOnline]);

  // Animate radar ripples continuously when online
  useEffect(() => {
    if (isOnline) {
      const createRipple = (anim: Animated.Value, delay: number) => {
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.timing(anim, {
              toValue: 1,
              duration: 2000,
              useNativeDriver: true,
            })
          ])
        );
      };

      const anim1 = createRipple(rippleAnim1, 0);
      const anim2 = createRipple(rippleAnim2, 1000);

      anim1.start();
      anim2.start();

      return () => {
        anim1.stop();
        anim2.stop();
        rippleAnim1.setValue(0);
        rippleAnim2.setValue(0);
      };
    }
  }, [isOnline]);

  const toggleOnline = async () => {
    if (isOnline) {
      // Instant offline switch (0ms latency!)
      toggleOnlineStatus();
      return;
    }

    try {
      // 1. Quick Shift check from AsyncStorage
      const stored = await AsyncStorage.getItem('MYQURO_SHIFTS');
      const currentShifts = stored ? JSON.parse(stored) : [];
      const bookedShifts = currentShifts.filter((s: any) => s.status === 'BOOKED');

      // 2. Check if user has booked any shifts
      if (bookedShifts.length === 0) {
        if (!hasOverlayPermission) {
          setShowPermissionModal(true);
        } else {
          setShowBookShiftModal(true);
        }
        return;
      }

      // 3. Check if any booked shift is active (current time falls into the shift window, including 15 min early buffer)
      const activeShift = bookedShifts.find((s: any) => isTimeInShiftWindow(s.time));

      if (!activeShift) {
        showAlertModal({
          type: 'outside_shift',
          title: 'Outside Shift Time',
          subtitle: 'You can only go online during your booked shift hours (including 15 mins before start).',
          primaryButtonText: 'Book Shift',
          onPrimaryPress: () => {
            hideAlertModal();
            router.push('/(tabs)/orders');
          },
          secondaryButtonText: 'Dismiss',
        });
        return;
      }

      // 4. Fast Location verification (use fast cached position first, avoiding 4-second GPS cold lock)
      let loc = await Location.getLastKnownPositionAsync();
      if (!loc?.coords) {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          showAlertModal({
            type: 'permission_location',
            title: 'Location Permission',
            subtitle: 'Please grant location permission so we can verify your zone before going online.',
            primaryButtonText: 'Grant Permission',
            onPrimaryPress: async () => {
              hideAlertModal();
              await Location.requestForegroundPermissionsAsync();
            },
            secondaryButtonText: 'Cancel',
          });
          return;
        }
        loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Lowest });
      }

      if (loc?.coords) {
        const inside = isPointInPolygon([loc.coords.longitude, loc.coords.latitude], ACTIVE_ZONE_POLYGON);
        if (!inside) {
          setShowOutsideZoneModal(true);
          return;
        }
      }

      // 5. Instantly toggle online status (0ms UI latency!)
      toggleOnlineStatus();
      showAlertModal({
        type: 'success_online',
        title: 'Welcome Online! 🎉',
        subtitle: 'You are now online and ready to receive customer delivery requests.',
        primaryButtonText: 'Start Delivering',
        onPrimaryPress: () => {
          hideAlertModal();
        },
      });

    } catch (err) {
      console.warn('Go Online validation error:', err);
      // Fallback: toggle online smoothly
      toggleOnlineStatus();
    }
  };

  const handleGrantPermission = () => {
    setHasOverlayPermission(true);
    setShowPermissionModal(false);
    setShowBookShiftModal(true);
  };

  const handleDismissPermission = () => {
    setShowPermissionModal(false);
  };

  const handleDismissBookShiftModal = () => {
    setShowBookShiftModal(false);
  };

  const handleProceedToBookShift = () => {
    setShowBookShiftModal(false);
    router.push('/(tabs)/orders');
  };

  const rippleScale1 = rippleAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.5],
  });
  const rippleOpacity1 = rippleAnim1.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.4, 0],
  });

  const rippleScale2 = rippleAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [0.8, 2.5],
  });
  const rippleOpacity2 = rippleAnim2.interpolate({
    inputRange: [0, 0.8, 1],
    outputRange: [0.6, 0.4, 0],
  });

  if (activeTrip) {
    return <ActiveTripCard />;
  }

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0E0C0A" translucent />

      {/* TOP STATUS & HELP BAR */}
      <View style={styles.topBar}>
        {/* Left Interactive Online/Offline Status Pill */}
        <TouchableOpacity
          onPress={toggleOnline}
          activeOpacity={0.8}
          style={styles.statusPill}
        >
          <View style={[styles.statusDot, isOnline ? styles.dotOnline : styles.dotOffline]} />
          <Text style={styles.statusText}>{isOnline ? 'Online' : 'Offline'}</Text>
        </TouchableOpacity>

        {/* Right Controls: ZONE, HELP & SOS */}
        <View style={styles.topRightControls}>
          {/* ZONE Pill */}
          <TouchableOpacity
            onPress={() => router.push('/my-zone')}
            style={styles.zonePill}
            activeOpacity={0.8}
          >
            <Ionicons name="map-outline" size={13} color="#F2CA50" style={{ marginRight: 3 }} />
            <Text style={styles.zoneText}>ZONE</Text>
          </TouchableOpacity>

          {/* HELP Pill */}
          <TouchableOpacity
            onPress={() => router.push('/help-support')}
            style={styles.helpPill}
            activeOpacity={0.8}
          >
            <Ionicons name="headset-outline" size={13} color="#FFFFFF" style={{ marginRight: 3 }} />
            <Text style={styles.helpText}>HELP</Text>
          </TouchableOpacity>

          {/* SOS Pill */}
          <TouchableOpacity
            onPress={() => router.push('/sos')}
            style={styles.sosPill}
            activeOpacity={0.8}
          >
            <Text style={styles.sosText}>SOS</Text>
          </TouchableOpacity>

          {/* TEST Pill (Visible Online for demo requests) */}
          {isOnline && (
            <TouchableOpacity
              onPress={triggerDemoRequest}
              style={styles.testPill}
              activeOpacity={0.8}
            >
              <Text style={styles.testText}>TEST</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* FULL-LENGTH SCROLLABLE DASHBOARD CONTENT */}
      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* 1. HERO MINIMUM GUARANTEE CARD OR SEARCHING FOR ORDERS */}
        {isOnline ? (
          <View style={styles.searchingCard}>
            <View style={styles.searchingLeftCol}>
              {/* Magnifying glass icon badge */}
              <View style={styles.searchIconBadge}>
                <Ionicons name="search" size={20} color="#F2CA50" />
              </View>

              {/* Title */}
              <Text style={styles.searchingTitle}>
                Searching for{'\n'}orders{searchingDots}
              </Text>

              {/* Subtitle */}
              <Text style={styles.searchingSubtitle}>
                We'll notify you when{'\n'}you get an order.
              </Text>

              {/* Explore your zone link */}
              <TouchableOpacity
                onPress={() => router.push('/my-zone')}
                style={styles.exploreZoneLink}
                activeOpacity={0.8}
              >
                <Text style={styles.exploreZoneText}>Explore your zone</Text>
                <View style={styles.exploreArrowCircle}>
                  <Ionicons name="chevron-forward" size={12} color="#000000" style={{ transform: [{ translateX: 0.5 }] }} />
                </View>
              </TouchableOpacity>
            </View>

            {/* Right side Map & Radar visualization */}
            <View style={styles.searchingRightCol}>
              <WebView
                source={{ html: getMiniMapHtml(OLA_MAPS_API_KEY) }}
                style={StyleSheet.absoluteFillObject}
                scrollEnabled={false}
                pointerEvents="none"
              />

              {/* Center Radar Ripple Animation and Pin */}
              <View style={styles.radarContainer} pointerEvents="none">
                {/* Ripple 1 */}
                <Animated.View
                  style={[
                    styles.radarRipple,
                    {
                      transform: [{ scale: rippleScale1 }],
                      opacity: rippleOpacity1,
                    },
                  ]}
                />
                {/* Ripple 2 */}
                <Animated.View
                  style={[
                    styles.radarRipple,
                    {
                      transform: [{ scale: rippleScale2 }],
                      opacity: rippleOpacity2,
                    },
                  ]}
                />

                {/* Golden Pin */}
                <View style={styles.radarPinCenter}>
                  <Ionicons name="location" size={24} color="#F2CA50" />
                  <View style={styles.radarPinDot} />
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.heroCard}>
            <View style={styles.heroTopRow}>
              {/* Guarantee Title */}
              <View style={styles.heroTextBlock}>
                <Text style={styles.heroTitle}>
                  Get <Text style={styles.heroAmountGold}>₹1250</Text> Minimum{'\n'}guarantee
                </Text>
              </View>

              {/* 3D Graphic Image */}
              <Image
                source={require('../../../assets/images/image copy 9.png')}
                style={styles.heroGiftBoxImage}
                resizeMode="contain"
              />
            </View>

            {/* Golden CTA Button with Chevron */}
            <TouchableOpacity
              onPress={toggleOnline}
              activeOpacity={0.85}
              style={styles.goOnlineBtn}
            >
              <Text style={styles.goOnlineBtnText}>Go online and deliver orders</Text>
              <View style={styles.chevronCircleDark}>
                <Ionicons name="chevron-forward" size={14} color="#F2CA50" />
              </View>
            </TouchableOpacity>
          </View>
        )}

        {/* 2. REFER FRIEND & EARN BANNER */}
        <TouchableOpacity
          style={styles.referCard}
          activeOpacity={0.85}
          onPress={() => router.push('/(tabs)/refer')}
        >
          <View style={styles.referLeftGroup}>
            <Ionicons name="gift-outline" size={20} color="#FFFFFF" style={{ marginRight: 10 }} />
            <Text style={styles.referTitleText}>Refer Friend & Earn</Text>
          </View>

          {/* Golden Pill */}
          <View style={styles.referBadgePill}>
            <Text style={styles.referBadgeText}>upto ₹7,000</Text>
            <Ionicons name="chevron-forward" size={13} color="#000000" style={{ marginLeft: 2 }} />
          </View>
        </TouchableOpacity>

        {/* 3. PER ORDER EOD BONUS CARD */}
        <View style={styles.bonusCard}>
          {/* Card Header Row */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitleText}>Per Order EOD Bonus</Text>
              <Text style={styles.cardSubtitleText}>Earn upto ₹5 extra</Text>
            </View>

            <TouchableOpacity style={styles.circleChevronBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </TouchableOpacity>
          </View>

          {/* How Incentives Work Link */}
          <TouchableOpacity style={styles.howItWorksLinkRow} activeOpacity={0.8}>
            <Text style={styles.howItWorksLinkText}>How incentives work?</Text>
            <Ionicons name="play-circle" size={16} color="#F2CA50" style={{ marginLeft: 5 }} />
          </TouchableOpacity>

          {/* Table / Progress Metric Block */}
          <View style={styles.tableMetricContainer}>
            <View style={styles.tableLabelsCol}>
              <Text style={styles.tableLabelText}>Per Order Surge</Text>
              <Text style={styles.tableLabelText}>Login Time</Text>
            </View>

            {/* Slider Track Line with Rupee Handle */}
            <View style={styles.tableSliderTrack}>
              <View style={styles.tableSliderLine} />
              <View style={styles.tableRupeeHandle}>
                <Text style={styles.tableRupeeText}>₹</Text>
              </View>
            </View>

            {/* Right Values */}
            <View style={styles.tableValuesCol}>
              <View style={styles.valueRowUpper}>
                <Text style={styles.tableValuePrimary}>₹5</Text>
                <Ionicons name="information-circle-outline" size={15} color="#A6A6A6" style={{ marginLeft: 4 }} />
              </View>
              <Text style={styles.tableValueSub}>3 hrs</Text>
            </View>
          </View>

          {/* Footer Text */}
          <Text style={styles.cardFooterText}>
            Your login time: <Text style={styles.cardFooterBold}>0 min</Text>
          </Text>
        </View>

        {/* 4. DAILY MINIMUM GUARANTEE CARD */}
        <View style={styles.bonusCard}>
          {/* Card Header Row */}
          <View style={styles.cardHeaderRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.cardTitleText}>Daily Minimum Guarantee</Text>
              <Text style={styles.cardSubtitleText}>Minimum ₹1250 guaranteed</Text>
            </View>

            <TouchableOpacity style={styles.circleChevronBtn} activeOpacity={0.8}>
              <Ionicons name="chevron-forward" size={16} color="#F2CA50" />
            </TouchableOpacity>
          </View>

          {/* How Guarantee Works Link */}
          <TouchableOpacity style={styles.howItWorksLinkRow} activeOpacity={0.8}>
            <Text style={styles.howItWorksLinkText}>How guarantee works?</Text>
            <Ionicons name="play-circle" size={16} color="#F2CA50" style={{ marginLeft: 5 }} />
          </TouchableOpacity>

          {/* Table / Progress Metric Block */}
          <View style={styles.tableMetricContainer}>
            <View style={styles.tableLabelsCol}>
              <Text style={styles.tableLabelText}>Guarantee</Text>
              <Text style={styles.tableLabelText}>Delivered orders</Text>
            </View>

            {/* Slider Track Line with Rupee Handle */}
            <View style={styles.tableSliderTrack}>
              <View style={styles.tableSliderLine} />
              <View style={styles.tableRupeeHandle}>
                <Text style={styles.tableRupeeText}>₹</Text>
              </View>
            </View>

            {/* Right Values */}
            <View style={styles.tableValuesCol}>
              <Text style={styles.tableValuePrimary}>₹1250</Text>
              <View style={styles.zeroBadgeCircle}>
                <Text style={styles.zeroBadgeText}>0</Text>
              </View>
            </View>
          </View>

          {/* Footer Text */}
          <Text style={styles.cardFooterText}>
            Your delivered orders: <Text style={styles.cardFooterBold}>0</Text>
          </Text>
        </View>

        {/* 5. QUICK UTILITY GRID BAR */}
        <View style={styles.utilityGridBar}>
          <TouchableOpacity style={styles.utilityItem} activeOpacity={0.8}>
            <Ionicons name="gift-outline" size={22} color="#F2CA50" />
            <Text style={styles.utilityText}>Benefits</Text>
          </TouchableOpacity>

          <View style={styles.utilityDivider} />

          <TouchableOpacity
            onPress={() => router.push('/zone-map')}
            style={styles.utilityItem}
            activeOpacity={0.8}
          >
            <Ionicons name="location-outline" size={22} color="#F2CA50" />
            <Text style={styles.utilityText}>Zones</Text>
          </TouchableOpacity>

          <View style={styles.utilityDivider} />

          <TouchableOpacity
            onPress={() => router.push('/insurance')}
            style={styles.utilityItem}
            activeOpacity={0.8}
          >
            <Ionicons name="shield-checkmark-outline" size={22} color="#F2CA50" />
            <Text style={styles.utilityText}>Insurance</Text>
          </TouchableOpacity>
        </View>

        {/* 6. IMPORTANT MESSAGES BANNER */}
        <View style={styles.importantMsgCard}>
          <View style={styles.msgTopRow}>
            <View style={styles.speakerIconCircle}>
              <Ionicons name="megaphone-outline" size={22} color="#F2CA50" />
            </View>

            <View style={{ flex: 1 }}>
              <Text style={styles.msgSectionHeader}>IMPORTANT MESSAGES</Text>
              <Text style={styles.msgBodyText}>Mark delivered correctly!</Text>
              <TouchableOpacity activeOpacity={0.7}>
                <Text style={styles.msgLinkText}>View more</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* View All Messages Button */}
          <TouchableOpacity style={styles.viewAllMsgBtn} activeOpacity={0.8}>
            <Text style={styles.viewAllMsgBtnText}>View all messages</Text>
            <Ionicons name="chevron-forward" size={15} color="#F2CA50" style={{ marginLeft: 4 }} />
          </TouchableOpacity>
        </View>

        {/* 7. TODAY'S PROGRESS CARD */}
        <View style={styles.progressCard}>
          <Text style={styles.progressSectionTitle}>TODAY'S PROGRESS</Text>

          <View style={styles.progressMetricsRow}>
            {/* Metric 1: Earnings */}
            <TouchableOpacity
              style={styles.progressMetricCol}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/earnings')}
            >
              <Text style={styles.progressValueText}>₹{Number(todayEarnings || 0).toFixed(2)}</Text>
              <View style={styles.metricLabelRow}>
                <Ionicons name="wallet-outline" size={13} color="#A6A6A6" style={{ marginRight: 3 }} />
                <Text style={styles.metricLabelText}>Earnings</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.progressVertDivider} />

            {/* Metric 2: Online Time */}
            <TouchableOpacity
              style={styles.progressMetricCol}
              activeOpacity={0.85}
              onPress={() => router.push('/login-history')}
            >
              <Text style={styles.progressValueText}>0h 0m</Text>
              <View style={styles.metricLabelRow}>
                <Ionicons name="time-outline" size={13} color="#A6A6A6" style={{ marginRight: 3 }} />
                <Text style={styles.metricLabelText}>Online time</Text>
              </View>
            </TouchableOpacity>

            <View style={styles.progressVertDivider} />

            {/* Metric 3: Orders */}
            <TouchableOpacity
              style={styles.progressMetricCol}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/earnings')}
            >
              <Text style={styles.progressValueText}>{tripsToday || 0}</Text>
              <View style={styles.metricLabelRow}>
                <Ionicons name="bag-handle-outline" size={13} color="#A6A6A6" style={{ marginRight: 3 }} />
                <Text style={styles.metricLabelText}>Orders</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 8. 2X2 FEATURE GRID CARDS */}
        <View style={styles.featureGridContainer}>
          {/* ROW 1 */}
          <View style={styles.featureGridRow}>
            {/* Card 1: Benefits */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => router.push('/benefits-loans')}
            >
              <Text style={styles.featureCardTitle}>Benefits – Loans & more</Text>
              <View style={styles.featureCardBottomRow}>
                <View style={styles.arrowCircleBtn}>
                  <Ionicons name="arrow-forward" size={13} color="#F2CA50" />
                </View>
                <Image
                  source={require('../../../assets/images/image copy 10.png')}
                  style={styles.featureCardGraphic}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>

            {/* Card 2: Refer & Earn */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/refer')}
            >
              <Text style={styles.featureCardTitle}>Refer & Earn</Text>
              <View style={styles.referPillMini}>
                <Text style={styles.referPillMiniText}>Upto ₹7,000</Text>
              </View>
              <View style={styles.featureCardBottomRow}>
                <View style={styles.arrowCircleBtn}>
                  <Ionicons name="arrow-forward" size={13} color="#F2CA50" />
                </View>
                <Image
                  source={require('../../../assets/images/image copy 12.png')}
                  style={styles.featureCardGraphic}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>

          {/* ROW 2 */}
          <View style={styles.featureGridRow}>
            {/* Card 3: Rent EV */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => router.push('/rent-ev')}
            >
              <Text style={styles.featureCardTitle}>Rent Electric Vehicle</Text>
              <View style={styles.featureCardBottomRow}>
                <View style={styles.arrowCircleBtn}>
                  <Ionicons name="arrow-forward" size={13} color="#F2CA50" />
                </View>
                <Image
                  source={require('../../../assets/images/image copy 11.png')}
                  style={styles.featureCardGraphic}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>

            {/* Card 4: Store */}
            <TouchableOpacity
              style={styles.featureCard}
              activeOpacity={0.85}
              onPress={() => router.push('/myquro-store')}
            >
              <Text style={styles.featureCardTitle}>My Quro Store</Text>
              <View style={styles.featureCardBottomRow}>
                <View style={styles.arrowCircleBtn}>
                  <Ionicons name="arrow-forward" size={13} color="#F2CA50" />
                </View>
                <Image
                  source={require('../../../assets/images/image copy 13.png')}
                  style={styles.featureCardGraphic}
                  resizeMode="contain"
                />
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* 9. ADD BANK DETAILS CARD */}
        <View style={styles.addBankCard}>
          <View style={styles.addBankTopRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.addBankTitle}>Add Bank details</Text>
              <Text style={styles.addBankSubtext}>to receive payouts</Text>
            </View>

            <Image
              source={require('../../../assets/images/image copy 3.png')}
              style={styles.addBankGraphic}
              resizeMode="contain"
            />
          </View>

          <TouchableOpacity
            onPress={() => router.push('/bank-details')}
            style={styles.addNowBtn}
            activeOpacity={0.85}
          >
            <Text style={styles.addNowBtnText}>Add now</Text>
          </TouchableOpacity>
        </View>

        {/* 10. YOUR FEED SECTION */}
        <View style={styles.feedSectionContainer}>
          <View style={styles.feedHeaderRow}>
            <Text style={styles.feedSectionTitle}>Your Feed</Text>
            <TouchableOpacity style={styles.translateBtn} activeOpacity={0.8}>
              <Text style={styles.translateBtnText}>A/अ</Text>
            </TouchableOpacity>
          </View>

          {/* Horizontal Video Carousel */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.feedCarouselScroll}>
            {/* Card 1: Address Change */}
            <TouchableOpacity style={styles.feedVideoCard} activeOpacity={0.85}>
              <Image
                source={require('../../../assets/images/feed_address_change.png')}
                style={styles.feedVideoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.playIconOverlay}>
                <Ionicons name="play-circle" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.feedCardCaption}>Address Change</Text>
            </TouchableOpacity>

            {/* Card 2: DMG */}
            <TouchableOpacity style={styles.feedVideoCard} activeOpacity={0.85}>
              <Image
                source={require('../../../assets/images/feed_dmg_video.png')}
                style={styles.feedVideoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.playIconOverlay}>
                <Ionicons name="play-circle" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.feedCardCaption}>DMG</Text>
            </TouchableOpacity>

            {/* Card 3: How to deliver orders */}
            <TouchableOpacity style={styles.feedVideoCard} activeOpacity={0.85}>
              <Image
                source={require('../../../assets/images/feed_delivery_video.png')}
                style={styles.feedVideoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.playIconOverlay}>
                <Ionicons name="play-circle" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.feedCardCaption}>How to deliver orders</Text>
            </TouchableOpacity>

            {/* Card 4: DI */}
            <TouchableOpacity style={styles.feedVideoCard} activeOpacity={0.85}>
              <Image
                source={require('../../../assets/images/feed_cash_video.png')}
                style={styles.feedVideoThumbnail}
                resizeMode="cover"
              />
              <View style={styles.playIconOverlay}>
                <Ionicons name="play-circle" size={26} color="#FFFFFF" />
              </View>
              <Text style={styles.feedCardCaption}>DI</Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Page Indicators */}
          <View style={styles.feedPageDotsRow}>
            <Text style={styles.feedPageText}>1/7</Text>
            <View style={styles.activeDotLine} />
            <View style={styles.inactiveDotCircle} />
          </View>
        </View>

        {/* 11. BOTTOM SHORTCUTS BAR */}
        <View style={styles.shortcutsSectionContainer}>
          <Text style={styles.shortcutsHeaderTitle}>SHORTCUTS</Text>

          <View style={styles.shortcutsGridRow}>
            <TouchableOpacity style={styles.shortcutItem} activeOpacity={0.8}>
              <Ionicons name="gift-outline" size={24} color="#F2CA50" />
              <Text style={styles.shortcutLabelText}>Offers</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/zone-map')}
              style={styles.shortcutItem}
              activeOpacity={0.8}
            >
              <Ionicons name="location-outline" size={24} color="#F2CA50" />
              <Text style={styles.shortcutLabelText}>My Zone</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/insurance')}
              style={styles.shortcutItem}
              activeOpacity={0.8}
            >
              <Ionicons name="shield-checkmark-outline" size={24} color="#F2CA50" />
              <Text style={styles.shortcutLabelText}>Insurance</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 60 }} />
      </ScrollView>

      {/* FLOATING DELIVERY DOST ASSISTANT BADGE */}
      <View style={styles.floatingDostBadgeContainer} pointerEvents="box-none">
        {/* Animated Speech Bubble */}
        <Animated.View
          style={[
            styles.speechBubbleContainer,
            { opacity: bubbleOpacity }
          ]}
          pointerEvents="none"
        >
          <Text style={styles.speechBubbleText}>Hello Dost!</Text>
          <View style={styles.bubbleTriangle} />
        </Animated.View>

        <Image
          source={require('../../../assets/images/delivery_dost_mascot_full.png')}
          style={styles.floatingDostImage}
          resizeMode="contain"
        />
      </View>

      {/* DISPLAY OVER OTHER APPS PERMISSION BOTTOM SHEET MODAL */}
      <Modal
        visible={showPermissionModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismissPermission}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleDismissPermission}
          />
          <View style={[styles.permissionBottomSheet, { paddingBottom: Math.max(insets.bottom, 16) + 16 }]}>
            {/* Top MyQuro App Icon Badge */}
            <View style={styles.permissionIconBadge}>
              <Ionicons name="layers" size={28} color="#F2CA50" />
            </View>

            {/* Headline Title */}
            <Text style={styles.permissionHeadline}>
              Allow <Text style={styles.permissionGoldText}>MyQuro</Text> to display over other apps
            </Text>
            <Text style={styles.permissionSubtitle}>
              This will help us provide you a better experience
            </Text>

            {/* Mock System Permission Preview Box */}
            <View style={styles.mockSystemBox}>
              {/* App Avatar + Skeleton Lines */}
              <View style={styles.mockAppRow}>
                <View style={styles.mockAvatarCircle}>
                  <Ionicons name="location-sharp" size={22} color="#000000" />
                </View>
                <View style={styles.mockTextSkeletonCol}>
                  <View style={styles.skeletonLine1} />
                  <View style={styles.skeletonLine2} />
                </View>
              </View>

              {/* Action Buttons Row */}
              <View style={styles.mockActionsRow}>
                <TouchableOpacity
                  onPress={handleDismissPermission}
                  style={styles.mockDenyBtn}
                  activeOpacity={0.7}
                >
                  <Text style={styles.mockDenyText}>DENY</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleGrantPermission}
                  style={styles.mockAllowBtn}
                  activeOpacity={0.85}
                >
                  <Text style={styles.mockAllowText}>ALLOW</Text>
                  {/* Yellow Hand Pointing Gesture */}
                  <View style={styles.handGestureContainer}>
                    <Text style={styles.handEmoji}>👆</Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

            {/* CTA Button: Okay */}
            <TouchableOpacity
              onPress={handleGrantPermission}
              style={styles.permissionOkayBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.permissionOkayText}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* PLEASE BOOK SHIFT TO GO ONLINE MODAL */}
      <Modal
        visible={showBookShiftModal}
        transparent
        animationType="fade"
        onRequestClose={handleDismissBookShiftModal}
      >
        <View style={styles.modalCenterOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={handleDismissBookShiftModal}
          />
          <View style={styles.bookShiftCard}>
            {/* Top Right Close Button (X) */}
            <TouchableOpacity
              onPress={handleDismissBookShiftModal}
              style={styles.bookShiftCloseBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={18} color="#F2CA50" />
            </TouchableOpacity>

            {/* Center Calendar & Exclamation Graphic */}
            <View style={styles.calendarGraphicWrapper}>
              {/* Golden Ambient Glow */}
              <View style={styles.calendarGlowBackdrop} />

              {/* Sparkles */}
              <Ionicons name="star" size={7} color="#F2CA50" style={styles.sparkleLeft} />
              <Ionicons name="star" size={7} color="#F2CA50" style={styles.sparkleRight} />

              {/* 3D Slanted Exclamation Mark */}
              <View style={styles.exclamationMarkContainer}>
                <View style={styles.exclamationBar} />
                <View style={styles.exclamationDot} />
              </View>

              {/* Calendar Container */}
              <View style={styles.calendarBody}>
                {/* 4 Binder Rings */}
                <View style={styles.binderRingsRow}>
                  <View style={styles.binderRing} />
                  <View style={styles.binderRing} />
                  <View style={styles.binderRing} />
                  <View style={styles.binderRing} />
                </View>

                {/* Calendar Inner Grid */}
                <View style={styles.calendarInner}>
                  {/* Left Column (2 horizontal gold pills) */}
                  <View style={styles.calendarLeftCol}>
                    <View style={styles.calendarPillLong} />
                    <View style={styles.calendarPillShort} />
                  </View>

                  {/* Right Box (Checkmark) */}
                  <View style={styles.calendarCheckSquare}>
                    <Ionicons name="checkmark" size={24} color="#000000" />
                  </View>
                </View>
              </View>
            </View>

            {/* Headline Title */}
            <Text style={styles.bookShiftTitle}>Please book shift{'\n'}to go online</Text>

            {/* Subtitle Description */}
            <Text style={styles.bookShiftSubtitle}>
              Please book shifts to start duty & get orders as soon as your next shift begins
            </Text>

            {/* Indicator Line with Center Dot */}
            <View style={styles.bookShiftIndicatorRow}>
              <View style={styles.indicatorLine} />
              <View style={styles.indicatorDot} />
              <View style={styles.indicatorLine} />
            </View>

            {/* Action CTA Button */}
            <TouchableOpacity
              onPress={handleProceedToBookShift}
              style={styles.bookShiftCtaBtn}
              activeOpacity={0.85}
            >
              <Text style={styles.bookShiftCtaText}>Book shift</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* OUTSIDE ACTIVE ZONE MODAL */}
      <Modal
        visible={showOutsideZoneModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowOutsideZoneModal(false)}
      >
        <View style={styles.modalCenterOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={() => setShowOutsideZoneModal(false)}
          />
          <View style={styles.outsideZoneCard}>
            {/* Top Right Close Button (X) */}
            <TouchableOpacity
              onPress={() => setShowOutsideZoneModal(false)}
              style={styles.outsideZoneCloseBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={16} color="#FFFFFF" />
            </TouchableOpacity>

            {/* Map Illustration Wrapper */}
            <View style={styles.outsideZoneMapWrapper}>
              <Image
                source={require('../../../assets/images/dark_map_background.png')}
                style={styles.outsideZoneMapBg}
                resizeMode="cover"
              />
              
              {/* Overlay path line and pins */}
              <View style={styles.outsideMapOverlayContainer}>
                {/* Dashed Route Path (Diagonal from bottom-left to top-right) */}
                <View style={styles.dashedRoutePath} />

                {/* Rider Icon near bottom-left */}
                <View style={styles.riderIconWrapper}>
                  <Image
                    source={require('../../../assets/images/black_gold_scooty.png')}
                    style={styles.riderScootyImage}
                    resizeMode="contain"
                  />
                </View>

                {/* Red Destination Pin near top-right */}
                <View style={styles.destinationPinWrapper}>
                  <Ionicons name="location" size={32} color="#EF4444" />
                </View>
              </View>

              {/* Bottom Offline Pill on illustration */}
              <View style={styles.illustrationOfflineBadge}>
                <View style={styles.illustrationBicycleCircle}>
                  <Ionicons name="bicycle" size={14} color="#000000" />
                </View>
                <Text style={styles.illustrationOfflineText}>Offline</Text>
              </View>
            </View>

            {/* Title / Headline */}
            <Text style={styles.outsideZoneTitle}>
              Please go online <Text style={styles.outsideZoneGoldText}>after you{'\n'}reach your zone</Text>
            </Text>

            {/* CTA Button */}
            <TouchableOpacity
              onPress={() => {
                setShowOutsideZoneModal(false);
                router.push('/my-zone');
              }}
              style={styles.outsideZoneCtaBtn}
              activeOpacity={0.88}
            >
              <Ionicons name="navigate" size={20} color="#0E0C0A" style={{ marginRight: 8, transform: [{ rotate: '45deg' }] }} />
              <Text style={styles.outsideZoneCtaText}>Get directions to your zone</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* REUSABLE CUSTOM ALERT UI MODAL */}
      <CustomAlertModal
        visible={customAlert.visible}
        type={customAlert.type}
        title={customAlert.title}
        subtitle={customAlert.subtitle}
        primaryButtonText={customAlert.primaryButtonText}
        onPrimaryPress={customAlert.onPrimaryPress || hideAlertModal}
        secondaryButtonText={customAlert.secondaryButtonText}
        onSecondaryPress={customAlert.onSecondaryPress || hideAlertModal}
        onClose={hideAlertModal}
      />
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
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: '#0E0C0A',
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1E1B18',
    borderWidth: 1,
    borderColor: '#3D3934',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 22,
    gap: 7,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotOffline: {
    backgroundColor: '#F2CA50',
  },
  dotOnline: {
    backgroundColor: '#16A34A',
  },
  statusText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  topRightControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  zonePill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 18,
    paddingHorizontal: 10,
    paddingVertical: 5,
    backgroundColor: '#161410',
  },
  zoneText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  helpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#787878',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#0E0C0A',
  },
  helpText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sosPill: {
    borderWidth: 1,
    borderColor: '#787878',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#0E0C0A',
  },
  sosText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  testPill: {
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 18,
    paddingHorizontal: 12,
    paddingVertical: 5,
    backgroundColor: '#F2CA50',
  },
  testText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  scrollContent: {
    flex: 1,
    paddingHorizontal: 16,
  },
  heroCard: {
    backgroundColor: '#0E0C0A',
    paddingVertical: 8,
    marginTop: 12,
    marginBottom: 14,
  },
  heroTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  heroTextBlock: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    lineHeight: 32,
  },
  heroAmountGold: {
    color: '#F2CA50',
    fontSize: 26,
  },
  heroGiftBoxImage: {
    width: 110,
    height: 82,
  },
  goOnlineBtn: {
    backgroundColor: '#F2CA50',
    height: 48,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
    gap: 8,
  },
  goOnlineBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  chevronCircleDark: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  referCard: {
    backgroundColor: '#1E1B18',
    borderWidth: 1,
    borderColor: '#3A352F',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  referLeftGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  referTitleText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  referBadgePill: {
    backgroundColor: '#F2CA50',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
  },
  referBadgeText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  bonusCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  cardTitleText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  cardSubtitleText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
    marginTop: 2,
  },
  circleChevronBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#29241D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  howItWorksLinkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    marginBottom: 14,
  },
  howItWorksLinkText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  tableMetricContainer: {
    backgroundColor: '#12100E',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#26221D',
    paddingHorizontal: 14,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  tableLabelsCol: {
    justifyContent: 'space-between',
    gap: 10,
  },
  tableLabelText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  tableSliderTrack: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  tableSliderLine: {
    width: '100%',
    height: 2,
    backgroundColor: '#3A352F',
  },
  tableRupeeHandle: {
    position: 'absolute',
    left: '25%',
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#1E1B18',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tableRupeeText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  tableValuesCol: {
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 8,
  },
  valueRowUpper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tableValuePrimary: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  tableValueSub: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  zeroBadgeCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 1,
    borderColor: '#787878',
    justifyContent: 'center',
    alignItems: 'center',
  },
  zeroBadgeText: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  cardFooterText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  cardFooterBold: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  utilityGridBar: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    marginBottom: 14,
  },
  utilityItem: {
    alignItems: 'center',
    gap: 3,
    flex: 1,
  },
  utilityText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  utilityDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#2E2923',
  },
  importantMsgCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  msgTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 14,
  },
  speakerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(242, 202, 80, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  msgSectionHeader: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.2,
    marginBottom: 3,
  },
  msgBodyText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 3,
  },
  msgLinkText: {
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  viewAllMsgBtn: {
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    height: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(242, 202, 80, 0.05)',
  },
  viewAllMsgBtnText: {
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  progressCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  progressSectionTitle: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 1.2,
    textAlign: 'center',
    marginBottom: 14,
  },
  progressMetricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  progressMetricCol: {
    alignItems: 'center',
    flex: 1,
  },
  progressValueText: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    marginBottom: 3,
  },
  metricLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  metricLabelText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
  },
  progressVertDivider: {
    width: 1,
    height: 32,
    backgroundColor: '#2E2923',
  },
  featureGridContainer: {
    marginBottom: 14,
    gap: 10,
  },
  featureGridRow: {
    flexDirection: 'row',
    gap: 10,
  },
  featureCard: {
    flex: 1,
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 16,
    padding: 12,
    justifyContent: 'space-between',
    minHeight: 100,
    position: 'relative',
  },
  featureCardTitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
    lineHeight: 18,
  },
  referPillMini: {
    backgroundColor: 'rgba(242, 202, 80, 0.2)',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 1,
    alignSelf: 'flex-start',
    marginTop: 3,
  },
  referPillMiniText: {
    fontSize: 9,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  featureCardBottomRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  arrowCircleBtn: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: '#29241D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureCardGraphic: {
    width: 68,
    height: 54,
  },
  addBankCard: {
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 20,
    padding: 16,
    marginBottom: 14,
  },
  addBankTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  addBankTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  addBankSubtext: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    fontWeight: '400',
    color: '#A6A6A6',
    marginTop: 2,
  },
  addBankGraphic: {
    width: 55,
    height: 40,
  },
  addNowBtn: {
    backgroundColor: '#F2CA50',
    height: 44,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addNowBtnText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#000000',
  },
  feedSectionContainer: {
    marginBottom: 20,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  feedSectionTitle: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  translateBtn: {
    backgroundColor: '#29241D',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: '#3A352F',
  },
  translateBtnText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  feedCarouselScroll: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  feedVideoCard: {
    width: 130,
    height: 100,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#191715',
    marginRight: 10,
    position: 'relative',
    justifyContent: 'flex-end',
    padding: 7,
  },
  feedVideoThumbnail: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  playIconOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  feedCardCaption: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    zIndex: 10,
  },
  feedPageDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: 4,
  },
  feedPageText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#A6A6A6',
    marginRight: 3,
  },
  activeDotLine: {
    width: 14,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#F2CA50',
  },
  inactiveDotCircle: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#4A453F',
  },
  shortcutsSectionContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  shortcutsHeaderTitle: {
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
    letterSpacing: 2.5,
    marginBottom: 12,
  },
  shortcutsGridRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    width: '100%',
    backgroundColor: '#191715',
    borderWidth: 1,
    borderColor: '#2E2923',
    borderRadius: 18,
    paddingVertical: 12,
  },
  shortcutItem: {
    alignItems: 'center',
    gap: 4,
    flex: 1,
  },
  shortcutLabelText: {
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#EAE1D4',
  },
  floatingDostBadgeContainer: {
    position: 'absolute',
    bottom: 16,
    right: -10,
    zIndex: 100,
  },
  floatingDostImage: {
    width: 90,
    height: 90,
  },
  speechBubbleContainer: {
    position: 'absolute',
    top: -45,
    right: 35,
    backgroundColor: '#1E1B17',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    minWidth: 90,
    alignItems: 'center',
  },
  speechBubbleText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  bubbleTriangle: {
    position: 'absolute',
    bottom: -6,
    right: 25,
    width: 0,
    height: 0,
    borderLeftWidth: 6,
    borderLeftColor: 'transparent',
    borderRightWidth: 6,
    borderRightColor: 'transparent',
    borderTopWidth: 6,
    borderTopColor: '#F2CA50',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.72)',
    justifyContent: 'flex-end',
  },
  permissionBottomSheet: {
    backgroundColor: '#12100C',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A241A',
    paddingHorizontal: 20,
    paddingTop: 24,
    alignItems: 'center',
  },
  permissionIconBadge: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: '#201B12',
    borderWidth: 1.5,
    borderColor: 'rgba(242, 202, 80, 0.4)',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  permissionHeadline: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 12,
  },
  permissionGoldText: {
    color: '#F2CA50',
  },
  permissionSubtitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#9E9E9E',
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 20,
  },
  mockSystemBox: {
    width: '100%',
    backgroundColor: '#191611',
    borderWidth: 1,
    borderColor: '#2C261C',
    borderRadius: 16,
    padding: 16,
    marginBottom: 24,
  },
  mockAppRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  mockAvatarCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#B8860B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  mockTextSkeletonCol: {
    flex: 1,
    gap: 8,
  },
  skeletonLine1: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#44403C',
    width: '75%',
  },
  skeletonLine2: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#36322D',
    width: '45%',
  },
  mockActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 22,
    gap: 12,
  },
  mockDenyBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  mockDenyText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  mockAllowBtn: {
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
    position: 'relative',
  },
  mockAllowText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  handGestureContainer: {
    position: 'absolute',
    right: 4,
    bottom: -28,
  },
  handEmoji: {
    fontSize: 28,
  },
  permissionOkayBtn: {
    width: '100%',
    backgroundColor: '#F2CA50',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  permissionOkayText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  modalCenterOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.78)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  bookShiftCard: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: '#12100C',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#2A241A',
    paddingHorizontal: 24,
    paddingTop: 32,
    paddingBottom: 28,
    alignItems: 'center',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  bookShiftCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.5)',
    backgroundColor: '#1E1A12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarGraphicWrapper: {
    width: 140,
    height: 120,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginVertical: 10,
  },
  calendarGlowBackdrop: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(242, 202, 80, 0.12)',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.7,
    shadowRadius: 18,
    elevation: 6,
  },
  sparkleLeft: {
    position: 'absolute',
    left: 8,
    top: 40,
    opacity: 0.7,
  },
  sparkleRight: {
    position: 'absolute',
    right: 18,
    top: 15,
    opacity: 0.7,
  },
  exclamationMarkContainer: {
    position: 'absolute',
    right: 12,
    top: 4,
    alignItems: 'center',
    zIndex: 10,
    transform: [{ rotate: '12deg' }],
  },
  exclamationBar: {
    width: 9,
    height: 28,
    backgroundColor: '#F2CA50',
    borderRadius: 4.5,
    marginBottom: 4,
  },
  exclamationDot: {
    width: 9,
    height: 9,
    backgroundColor: '#F2CA50',
    borderRadius: 4.5,
  },
  calendarBody: {
    width: 92,
    height: 80,
    backgroundColor: '#1A1610',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 10,
    position: 'relative',
  },
  binderRingsRow: {
    position: 'absolute',
    top: -6,
    flexDirection: 'row',
    gap: 12,
  },
  binderRing: {
    width: 4,
    height: 12,
    backgroundColor: '#F2CA50',
    borderRadius: 2,
  },
  calendarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 8,
    width: '100%',
  },
  calendarLeftCol: {
    flex: 1,
    gap: 6,
  },
  calendarPillLong: {
    height: 14,
    backgroundColor: '#F2CA50',
    borderRadius: 4,
    width: '100%',
  },
  calendarPillShort: {
    height: 14,
    backgroundColor: '#F2CA50',
    borderRadius: 4,
    width: '65%',
  },
  calendarCheckSquare: {
    width: 32,
    height: 32,
    backgroundColor: '#F2CA50',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookShiftTitle: {
    fontSize: 24,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    marginTop: 16,
    marginBottom: 8,
  },
  bookShiftSubtitle: {
    fontSize: 14,
    fontFamily: 'Urbanist-Regular',
    color: '#C5C5C5',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 8,
  },
  bookShiftIndicatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginVertical: 20,
  },
  indicatorLine: {
    width: 60,
    height: 1,
    backgroundColor: '#2E271D',
  },
  indicatorDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F2CA50',
  },
  bookShiftCtaBtn: {
    width: '100%',
    backgroundColor: '#F2CA50',
    height: 52,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 6,
  },
  bookShiftCtaText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  outsideZoneCard: {
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#26221C',
    borderRadius: 28,
    padding: 24,
    width: Dimensions.get('window').width * 0.9,
    alignItems: 'center',
    position: 'relative',
  },
  outsideZoneCloseBtn: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#3D3934',
    backgroundColor: '#1E1B18',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  outsideZoneMapWrapper: {
    width: 175,
    height: 175,
    borderRadius: 32,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: '#3D3934',
    marginTop: 18,
    marginBottom: 20,
  },
  outsideZoneMapBg: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  outsideMapOverlayContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  dashedRoutePath: {
    position: 'absolute',
    width: 120,
    height: 2,
    backgroundColor: '#F2CA50',
    top: 90,
    left: 30,
    transform: [{ rotate: '-35deg' }],
    opacity: 0.8,
  },
  riderIconWrapper: {
    position: 'absolute',
    bottom: 30,
    left: 25,
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  riderScootyImage: {
    width: 22,
    height: 22,
  },
  destinationPinWrapper: {
    position: 'absolute',
    top: 25,
    right: 40,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
  },
  illustrationOfflineBadge: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#000000',
    borderWidth: 1,
    borderColor: '#3D3934',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  illustrationBicycleCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  illustrationOfflineText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  outsideZoneTitle: {
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    textAlign: 'center',
    lineHeight: 30,
    marginBottom: 24,
  },
  outsideZoneGoldText: {
    color: '#F2CA50',
  },
  outsideZoneCtaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2CA50',
    borderRadius: 18,
    paddingVertical: 16,
    width: '100%',
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  outsideZoneCtaText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#0E0C0A',
  },
  searchingCard: {
    backgroundColor: '#11100E',
    borderWidth: 1.2,
    borderColor: '#26221C',
    borderRadius: 24,
    flexDirection: 'row',
    height: 185,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 12,
    marginBottom: 14,
  },
  searchingLeftCol: {
    flex: 1.1,
    paddingLeft: 18,
    paddingTop: 16,
    paddingBottom: 12,
    justifyContent: 'space-between',
  },
  searchIconBadge: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#1E1B18',
    borderWidth: 1,
    borderColor: '#3D3934',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingTitle: {
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 25,
    marginTop: 6,
  },
  searchingSubtitle: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#A6A6A6',
    lineHeight: 16,
    marginTop: 4,
  },
  exploreZoneLink: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    gap: 6,
  },
  exploreZoneText: {
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#F2CA50',
  },
  exploreArrowCircle: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchingRightCol: {
    flex: 0.9,
    position: 'relative',
    height: '100%',
    backgroundColor: '#1C1914',
    borderLeftWidth: 1.2,
    borderLeftColor: '#26221C',
  },
  searchingMapBg: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.45,
  },
  radarContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radarRipple: {
    position: 'absolute',
    width: 55,
    height: 55,
    borderRadius: 27.5,
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    backgroundColor: 'rgba(242,202,80,0.1)',
  },
  radarPinCenter: {
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  radarPinDot: {
    position: 'absolute',
    bottom: -1,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#0E0C0A',
  },
});
