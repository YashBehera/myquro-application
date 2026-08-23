import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRider } from '@/context/RiderContext';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { OLA_MAPS_API_KEY } from '../config';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const TIMER_TOTAL = 30;

// ─── Map HTML Generator ──────────────────────────────────────────────────────
function buildMapHtml(
  apiKey: string,
  riderLat: number,
  riderLng: number,
  storeLat: number,
  storeLng: number,
  dropLat: number,
  dropLng: number,
  storeName: string,
): string {
  // Helper: quadratic bezier curve points between two coords
  function bezier(
    fromLng: number, fromLat: number,
    toLng: number, toLat: number,
    segments = 40,
  ): [number, number][] {
    const midLng = (fromLng + toLng) / 2;
    const midLat = (fromLat + toLat) / 2;
    const dLng = toLng - fromLng;
    const dLat = toLat - fromLat;
    const cpLng = midLng - dLat * 0.35;
    const cpLat = midLat + dLng * 0.35;
    const pts: [number, number][] = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const mt = 1 - t;
      pts.push([
        mt * mt * fromLng + 2 * mt * t * cpLng + t * t * toLng,
        mt * mt * fromLat + 2 * mt * t * cpLat + t * t * toLat,
      ]);
    }
    return pts;
  }

  // Leg 1: rider → store  (blue curved dashes)
  const blueCoords = JSON.stringify(bezier(riderLng, riderLat, storeLng, storeLat));
  // Leg 2: store → dropoff  (black dashes)
  const blackCoords = JSON.stringify(bezier(storeLng, storeLat, dropLng, dropLat));

  // Bounds: fit all 3 points
  const allLats = [riderLat, storeLat, dropLat];
  const allLngs = [riderLng, storeLng, dropLng];
  const minLat = Math.min(...allLats) - 0.010;
  const maxLat = Math.max(...allLats) + 0.010;
  const minLng = Math.min(...allLngs) - 0.010;
  const maxLng = Math.max(...allLngs) + 0.010;

  const storeNameJson = JSON.stringify(storeName);

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link href="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.css" rel="stylesheet"/>
  <script src="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.js"></script>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#ddd}
    .maplibregl-ctrl-attrib,.maplibregl-ctrl-logo{display:none!important}

    /* Pickup / Store pill */
    .pickup-pill{
      display:flex;align-items:center;gap:4px;
      background:#000;border-radius:14px;
      padding:3px 8px 3px 3px;
      border:1px solid #555;white-space:nowrap;
      box-shadow:0 2px 6px rgba(0,0,0,.5);
    }
    .pickup-icon{
      width:18px;height:18px;border-radius:9px;
      background:#1a1a1a;border:1.5px solid #F2CA50;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .pickup-name{color:#fff;font-family:-apple-system,sans-serif;font-size:10px;font-weight:800}

    /* Customer / drop marker */
    .customer-pin{
      width:22px;height:22px;border-radius:11px;
      background:#1a1a1a;border:2px solid #fff;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 2px 6px rgba(0,0,0,.55);
    }

    /* Rider GPS dot */
    .gps-ring{
      width:20px;height:20px;border-radius:10px;
      background:rgba(37,99,235,.2);border:1.5px solid rgba(59,130,246,.6);
      display:flex;align-items:center;justify-content:center;
    }
    .gps-dot{
      width:8px;height:8px;border-radius:4px;
      background:#2563EB;border:1.5px solid #fff;
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = new maplibregl.Map({
    container:'map',
    style:'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
    center:[${(riderLng + storeLng) / 2},${(riderLat + storeLat) / 2}],
    zoom:12,
    attributionControl:false,
    transformRequest:function(url){return{url:url+(url.includes('?')?'&':'?')+'api_key=${apiKey}'}}
  });

  map.on('load',function(){
    map.fitBounds([[${minLng},${minLat}],[${maxLng},${maxLat}]],{
      padding:{top:70,bottom:200,left:50,right:50},duration:0
    });

    // ── Leg 1: Rider → Restaurant (blue curved dashes) ──
    map.addSource('route-blue',{
      type:'geojson',
      data:{type:'Feature',geometry:{type:'LineString',coordinates:${blueCoords}}}
    });
    map.addLayer({
      id:'route-blue-dash',type:'line',source:'route-blue',
      paint:{
        'line-color':'#3B82F6',
        'line-width':2.5,
        'line-dasharray':[2.5,2.5]
      },
      layout:{'line-join':'round','line-cap':'round'}
    });

    // ── Leg 2: Restaurant → Delivery (black dashes) ──
    map.addSource('route-black',{
      type:'geojson',
      data:{type:'Feature',geometry:{type:'LineString',coordinates:${blackCoords}}}
    });
    map.addLayer({
      id:'route-black-dash',type:'line',source:'route-black',
      paint:{
        'line-color':'#111111',
        'line-width':2,
        'line-dasharray':[2.5,2.5]
      },
      layout:{'line-join':'round','line-cap':'round'}
    });

    // Pickup / Store marker (black pill with gold icon)
    var storeEl=document.createElement('div');
    storeEl.className='pickup-pill';
    storeEl.innerHTML='<div class="pickup-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="#F2CA50"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg></div><div class="pickup-name">'+${storeNameJson}+'</div>';
    new maplibregl.Marker({element:storeEl,anchor:'bottom'}).setLngLat([${storeLng},${storeLat}]).addTo(map);

    // Customer delivery marker
    var custEl=document.createElement('div');
    custEl.className='customer-pin';
    custEl.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
    new maplibregl.Marker({element:custEl,anchor:'center'}).setLngLat([${dropLng},${dropLat}]).addTo(map);

    // Rider current location GPS dot (blue)
    var gpsEl=document.createElement('div');
    gpsEl.className='gps-ring';
    gpsEl.innerHTML='<div class="gps-dot"></div>';
    new maplibregl.Marker({element:gpsEl,anchor:'center'}).setLngLat([${riderLng},${riderLat}]).addTo(map);
  });
</script>
</body>
</html>`;

}

// ─── Component ───────────────────────────────────────────────────────────────
export const IncomingRequestModal: React.FC = () => {
  const {
    incomingRequest,
    acceptIncomingRequest,
    declineIncomingRequest,
    dismissIncomingRequest,
  } = useRider();

  const insets = useSafeAreaInsets();
  const [timeLeft, setTimeLeft] = useState(TIMER_TOTAL);
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  const [riderLocation, setRiderLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 20.2520,
    longitude: 85.7870,
  });

  // Slide in when request appears
  useEffect(() => {
    if (incomingRequest) {
      Animated.spring(slideAnim, {
        toValue: 0,
        tension: 60,
        friction: 10,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(SCREEN_HEIGHT);
    }
  }, [!!incomingRequest]);

  // Timer + GPS fetch
  useEffect(() => {
    if (!incomingRequest) {
      setTimeLeft(TIMER_TOTAL);
      return;
    }
    setTimeLeft(TIMER_TOTAL);

    // Fetch real GPS
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (loc?.coords) {
            setRiderLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch (_) {}
    })();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleTimeout();
          return TIMER_TOTAL;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRequest?.id]);

  const handleTimeout = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      declineIncomingRequest().catch(() => {});
    });
  };

  const handleReject = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      declineIncomingRequest().catch(() => {});
    });
  };

  const handleAccept = () => {
    Animated.timing(slideAnim, {
      toValue: SCREEN_HEIGHT,
      duration: 350,
      useNativeDriver: true,
    }).start(() => {
      acceptIncomingRequest();
    });
  };

  if (!incomingRequest) return null;

  const pickupName = incomingRequest.pickupAddress.split(',')[0] || 'Sindhi Sweets';
  const estimatedMin = incomingRequest.estimatedMinutes || 19;
  const distance = incomingRequest.distanceKm || 5.09;
  const fare = Math.round(incomingRequest.fareAmount) || 50;
  const surgeText = incomingRequest.surgeMultiplier || '₹25 Surge';
  const timerPct = (timeLeft / TIMER_TOTAL) * 100;

  return (
    <Animated.View style={[styles.overlay, { transform: [{ translateY: slideAnim }] }]}>
      <StatusBar barStyle="dark-content" />

      {/* Full-screen Ola Map — fills entire screen */}
      <WebView
        source={{
          html: buildMapHtml(
            OLA_MAPS_API_KEY,
            riderLocation.latitude,
            riderLocation.longitude,
            incomingRequest.pickupCoords?.latitude ?? 20.2462,
            incomingRequest.pickupCoords?.longitude ?? 85.7865,
            incomingRequest.dropoffCoords?.latitude ?? 20.2600,
            incomingRequest.dropoffCoords?.longitude ?? 85.8000,
            pickupName,
          ),
        }}
        style={StyleSheet.absoluteFillObject}
        scrollEnabled={false}
        javaScriptEnabled
        domStorageEnabled
        originWhitelist={['*']}
      />

      {/* ── Floating Reject button (top-left) ── */}
      <TouchableOpacity
        style={[styles.rejectBtn, { top: Math.max(insets.top + 8, 20) }]}
        onPress={handleReject}
        activeOpacity={0.8}
      >
        <Text style={styles.rejectText}>Reject</Text>
        <Ionicons name="close-circle" size={18} color="#F2CA50" />
      </TouchableOpacity>

      {/* ── Countdown chip (top-right) ── */}
      <View style={[styles.timerChip, { top: Math.max(insets.top + 8, 20) }]}>
        <Text style={styles.timerChipText}>{timeLeft}s</Text>
      </View>

      {/* ── Floating Bottom Card ── */}
      <View style={[styles.bottomCard, { paddingBottom: Math.max(insets.bottom + 6, 18) }]}>
        {/* Timer progress bar */}
        <View style={styles.timerRow}>
          <View style={styles.timerTrack}>
            <View
              style={[
                styles.timerFill,
                {
                  width: `${timerPct}%` as any,
                  backgroundColor: timerPct > 40 ? '#F2CA50' : '#EF4444',
                },
              ]}
            />
          </View>
        </View>

        <Text style={styles.estimatedLabel}>ESTIMATED EARNING</Text>
        <Text style={styles.fareAmount}>₹{fare}</Text>
        <Text style={styles.metaText}>{estimatedMin} mins  |  {distance} kms</Text>

        <View style={styles.divider} />

        {/* Pickup */}
        <View style={styles.row}>
          <View style={styles.iconCircleGold}>
            <Ionicons name="restaurant-outline" size={18} color="#F2CA50" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>PICKUP DETAILS</Text>
            <Text style={styles.rowValue}>{pickupName}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        {/* Surge */}
        <View style={styles.row}>
          <View style={styles.iconCircleYellow}>
            <Ionicons name="flash" size={14} color="#000" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.rowLabel}>TOTAL EARNINGS INCLUDES</Text>
            <Text style={styles.surgeValue}>{surgeText}</Text>
          </View>
        </View>

        {/* Accept button */}
        <TouchableOpacity
          style={styles.acceptBtn}
          onPress={handleAccept}
          activeOpacity={0.85}
        >
          <Text style={styles.acceptText}>Accept order</Text>
          <View style={styles.acceptArrow}>
            <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
          </View>
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 99999,
  },
  // Floating reject pill
  rejectBtn: {
    position: 'absolute',
    left: 16,
    zIndex: 100001,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#0E0C0A',
    borderRadius: 22,
    paddingHorizontal: 16,
    paddingVertical: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.45,
    shadowRadius: 8,
    elevation: 10,
  },
  rejectText: {
    color: '#F2CA50',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  // Timer chip
  timerChip: {
    position: 'absolute',
    right: 16,
    zIndex: 100001,
    backgroundColor: '#0E0C0A',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 9,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  timerChipText: {
    color: '#EF4444',
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  // Bottom card — absolutely positioned over the map
  bottomCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100000,
    backgroundColor: '#0E0C0A',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 12,
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#2a2724',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 30,
  },
  timerRow: {
    alignItems: 'center',
    marginBottom: 16,
  },
  timerTrack: {
    width: 80,
    height: 4,
    backgroundColor: '#2a2724',
    borderRadius: 2,
    overflow: 'hidden',
  },
  timerFill: {
    height: '100%',
    borderRadius: 2,
  },
  estimatedLabel: {
    color: '#F2CA50',
    fontSize: 11,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 1.5,
    textAlign: 'center',
  },
  fareAmount: {
    color: '#FFFFFF',
    fontSize: 52,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    textAlign: 'center',
    lineHeight: 62,
    marginVertical: 2,
  },
  metaText: {
    color: '#A6A6A6',
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E1B18',
    marginVertical: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  iconCircleGold: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    backgroundColor: '#1E1B18',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleYellow: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rowLabel: {
    color: '#F2CA50',
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  rowValue: {
    color: '#FFFFFF',
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 2,
  },
  surgeValue: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 2,
  },
  acceptBtn: {
    width: '100%',
    backgroundColor: '#F2CA50',
    height: 56,
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginTop: 18,
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 10,
  },
  acceptText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#000000',
  },
  acceptArrow: {
    position: 'absolute',
    right: 12,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#000000',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
