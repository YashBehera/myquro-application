import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Animated,
  Linking,
  Platform,
  PanResponder,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { OLA_MAPS_API_KEY } from '../config';

const BHUBANESWAR_LAT = 20.2520;
const BHUBANESWAR_LNG = 85.7870;
const COLLAPSED_OFFSET = 185; // Distance to slide down bottom sheet

const PICKUP_STORES = [
  {
    id: 'store_1',
    name: 'Cosmopolis Cafe Lounge',
    lat: 20.2462,
    lng: 85.7865,
    distance: '0.1 kms',
  },
  {
    id: 'store_2',
    name: 'Khandagiri Caves Sweet Shop',
    lat: 20.2585,
    lng: 85.7860,
    distance: '1.2 kms',
  },
  {
    id: 'store_3',
    name: 'ITER College Food Court',
    lat: 20.2515,
    lng: 85.8012,
    distance: '1.8 kms',
  },
];

const getOlaMapHtml = (apiKey: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0" />
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <script src="https://www.unpkg.com/olamaps-web-sdk@latest/dist/olamaps-web-sdk.umd.js"></script>
  <style>
    html, body { margin: 0; padding: 0; width: 100%; height: 100%; background: #E5E7EB; }
    #map { position: absolute; top: 0; left: 0; right: 0; bottom: 0; }
    
    .cluster-marker {
      width: 34px;
      height: 34px;
      border-radius: 17px;
      background: #0F0E0C;
      border: 1.5px solid #3D3528;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 10px rgba(0,0,0,0.6);
      position: relative;
      cursor: pointer;
    }
    .cluster-marker::after {
      content: '';
      position: absolute;
      bottom: 2px;
      width: 4px;
      height: 4px;
      border-radius: 2px;
      background: #F2CA50;
    }
    .zone-label {
      color: #0F0E0C;
      font-size: 15px;
      font-weight: 800;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      text-shadow: 0 1px 4px rgba(255,255,255,0.95);
      pointer-events: none;
      white-space: nowrap;
    }
    .user-marker {
      width: 26px;
      height: 26px;
      border-radius: 13px;
      background: rgba(37,99,235,0.35);
      border: 1.5px solid rgba(59,130,246,0.7);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .user-core {
      width: 12px;
      height: 12px;
      border-radius: 6px;
      background: #2563EB;
      border: 2px solid #FFFFFF;
    }
    .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const API_KEY = "${apiKey}";
    let map = null;
    let userMarker = null;

    const storeData = [
      { id: 'store_1', name: 'Cosmopolis Cafe Lounge', lat: 20.2462, lng: 85.7865, distance: '0.1 kms' },
      { id: 'store_2', name: 'Khandagiri Caves Sweet Shop',        lat: 20.2585, lng: 85.7860, distance: '1.2 kms' },
      { id: 'store_3', name: 'ITER College Food Court',         lat: 20.2515, lng: 85.8012, distance: '1.8 kms' },
    ];

    const storeIcons = [
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg>',
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M19 6h-2c0-2.76-2.24-5-5-5S7 3.24 7 6H5c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2zm-7-3c1.66 0 3 1.34 3 3H9c0-1.66 1.34-3 3-3zm7 17H5V8h14v12z"/></svg>',
      '<svg width="15" height="15" viewBox="0 0 24 24" fill="white"><path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/></svg>',
    ];

    map = new maplibregl.Map({
      container: 'map',
      style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
      center: [${BHUBANESWAR_LNG}, ${BHUBANESWAR_LAT}],
      zoom: 13.5,
      attributionControl: false,
      dragPan: true,
      dragRotate: true,
      touchZoomRotate: true,
      touchPitch: true,
      scrollZoom: true,
      doubleClickZoom: true,
      transformRequest: (url) => ({
        url: url + (url.includes('?') ? '&' : '?') + 'api_key=' + API_KEY
      })
    });

    map.on('load', () => {
      // 1. Cosmopolis / Khandagiri Zone (Active - Gold)
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
      map.addLayer({ id: 'zone-fill-active', type: 'fill', source: 'zone-polygon-active', paint: { 'fill-color': '#eab308', 'fill-opacity': 0.18 } });
      map.addLayer({ id: 'zone-stroke-active', type: 'line', source: 'zone-polygon-active', paint: { 'line-color': '#eab308', 'line-width': 2.5 } });

      // 2. Patia / KIIT Zone (Inactive - Outside - Gray)
      map.addSource('zone-polygon-inactive', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'Polygon',
            coordinates: [[
              [85.8100, 20.3600],
              [85.8300, 20.3600],
              [85.8300, 20.3400],
              [85.8100, 20.3400],
              [85.8100, 20.3600]
            ]]
          }
        }
      });
      map.addLayer({ id: 'zone-fill-inactive', type: 'fill', source: 'zone-polygon-inactive', paint: { 'fill-color': '#9ca3af', 'fill-opacity': 0.15 } });
      map.addLayer({ id: 'zone-stroke-inactive', type: 'line', source: 'zone-polygon-inactive', paint: { 'line-color': '#9ca3af', 'line-dasharray': [2, 2], 'line-width': 2.0 } });

      // Store cluster markers with tap → post message to React Native
      storeData.forEach((store, i) => {
        const el = document.createElement('div');
        el.className = 'cluster-marker';
        el.innerHTML = storeIcons[i];
        el.addEventListener('click', () => {
          window.ReactNativeWebView && window.ReactNativeWebView.postMessage(JSON.stringify({
            type: 'STORE_SELECTED',
            storeId: store.id,
            name: store.name,
            distance: store.distance,
            lat: store.lat,
            lng: store.lng,
          }));
        });
        new maplibregl.Marker({ element: el }).setLngLat([store.lng, store.lat]).addTo(map);
      });

      // Zone Labels
      const labelActive = document.createElement('div');
      labelActive.className = 'zone-label';
      labelActive.innerText = 'Bhubaneswar Zone 1 (Active)';
      new maplibregl.Marker({ element: labelActive, anchor: 'top' }).setLngLat([85.7870, 20.2450]).addTo(map);

      const labelInactive = document.createElement('div');
      labelInactive.className = 'zone-label';
      labelInactive.style.color = '#6b7280';
      labelInactive.innerText = 'Patia Zone 2 (Inactive)';
      new maplibregl.Marker({ element: labelInactive, anchor: 'top' }).setLngLat([85.8200, 20.3500]).addTo(map);
    });

    window.recenterMap = function(lng, lat) {
      if (map) map.flyTo({ center: [lng, lat], zoom: 13.5, essential: true });
    };

    window.setUserLocation = function(lng, lat) {
      if (!map) return;
      if (userMarker) {
        userMarker.setLngLat([lng, lat]);
      } else {
        const uEl = document.createElement('div');
        uEl.className = 'user-marker';
        uEl.innerHTML = '<div class="user-core"></div>';
        userMarker = new maplibregl.Marker({ element: uEl }).setLngLat([lng, lat]).addTo(map);
      }
    };
  </script>
</body>
</html>
`;

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

type Store = typeof PICKUP_STORES[0];

export default function ZoneMapScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const [isLocating, setIsLocating] = useState(false);
  const [userLocation, setUserLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isInsideZone, setIsInsideZone] = useState(true);

  // Bottom sheet animation
  const sheetTranslateY = useRef(new Animated.Value(0)).current;

  // Wait near modal animation
  const waitModalAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (isMounted && loc?.coords) {
            const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
            setUserLocation(coords);
            const inside = isPointInPolygon([loc.coords.longitude, loc.coords.latitude], ACTIVE_ZONE_POLYGON);
            setIsInsideZone(inside);
            webViewRef.current?.injectJavaScript(
              `if (window.setUserLocation) { window.setUserLocation(${coords.longitude}, ${coords.latitude}); } true;`
            );
          }
        }
      } catch (err) {
        console.warn('Location error:', err);
      }
    })();
    return () => { isMounted = false; };
  }, []);

  const handleClose = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/(tabs)');
  };

  const handleRecenter = () => {
    setIsLocating(true);
    webViewRef.current?.injectJavaScript(
      `if (window.recenterMap) { window.recenterMap(${BHUBANESWAR_LNG}, ${BHUBANESWAR_LAT}); } true;`
    );
    setTimeout(() => setIsLocating(false), 800);
  };

  const handleWebViewMessage = (event: { nativeEvent: { data: string } }) => {
    try {
      const msg = JSON.parse(event.nativeEvent.data);
      if (msg.type === 'STORE_SELECTED') {
        const store = PICKUP_STORES.find(s => s.id === msg.storeId);
        if (store) showWaitModal(store);
      }
    } catch (_) {}
  };

  const showWaitModal = (store: Store) => {
    setSelectedStore(store);
    waitModalAnim.setValue(0);
    Animated.spring(waitModalAnim, {
      toValue: 1,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  const closeWaitModal = () => {
    Animated.timing(waitModalAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setSelectedStore(null));
  };

  const handleGetDirections = () => {
    if (!selectedStore) return;
    const { lat, lng } = selectedStore;
    
    // Choose appropriate native scheme to open directly in the corresponding native Maps app
    const nativeUrl = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}&t=m`,
      android: `google.navigation:q=${lat},${lng}&mode=d`,
      default: `geo:${lat},${lng}?q=${lat},${lng}`,
    });

    Linking.canOpenURL(nativeUrl).then((supported) => {
      if (supported) {
        Linking.openURL(nativeUrl);
      } else {
        // Fallback to browser protocol Google Maps which mobile OSes also open in Maps app if installed
        const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
        Linking.openURL(webUrl);
      }
    });
  };

  // Toggle sheet
  const toggleSheet = (collapse?: boolean) => {
    const shouldCollapse = collapse !== undefined ? collapse : !isCollapsed;
    setIsCollapsed(shouldCollapse);
    Animated.spring(sheetTranslateY, {
      toValue: shouldCollapse ? COLLAPSED_OFFSET : 0,
      friction: 8,
      tension: 60,
      useNativeDriver: true,
    }).start();
  };

  // PanResponder to make the bottom sheet card slidable
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 6,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          // Dragging down
          sheetTranslateY.setValue(Math.min(gestureState.dy, COLLAPSED_OFFSET));
        } else if (isCollapsed && gestureState.dy < 0) {
          // Dragging up when collapsed
          sheetTranslateY.setValue(Math.max(COLLAPSED_OFFSET + gestureState.dy, 0));
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 45) {
          toggleSheet(true);
        } else if (gestureState.dy < -45) {
          toggleSheet(false);
        } else {
          toggleSheet(isCollapsed);
        }
      },
    })
  ).current;

  const waitModalTranslateY = waitModalAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [200, 0],
  });
  const waitModalOpacity = waitModalAnim;

  // Recenter FAB placement translateY mapping
  const fabTranslateY = sheetTranslateY.interpolate({
    inputRange: [0, COLLAPSED_OFFSET],
    outputRange: [0, COLLAPSED_OFFSET - 20],
    extrapolate: 'clamp',
  });

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* FULL-SCREEN OLA MAPS */}
      <WebView
        ref={webViewRef}
        source={{ html: getOlaMapHtml(OLA_MAPS_API_KEY) }}
        style={StyleSheet.absoluteFill}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={true}
        onStartShouldSetResponder={() => true}
        onResponderTerminationRequest={() => false}
        onMessage={handleWebViewMessage}
        onLoadEnd={() => {
          if (userLocation) {
            webViewRef.current?.injectJavaScript(
              `if (window.setUserLocation) { window.setUserLocation(${userLocation.longitude}, ${userLocation.latitude}); } true;`
            );
          }
        }}
      />

      {/* TOP HEADER */}
      <View
        pointerEvents="box-none"
        style={[styles.topHeaderOverlay, { paddingTop: Math.max(insets.top, 14) }]}
      >
        <TouchableOpacity onPress={handleClose} style={styles.closeCircleBtn} activeOpacity={0.8}>
          <Ionicons name="close" size={22} color="#F2CA50" />
        </TouchableOpacity>

        <View style={styles.orderMapBadge}>
          <Ionicons name="cube-outline" size={18} color="#F2CA50" />
          <Text style={styles.orderMapText}>
            <Text style={styles.orderTextWhite}>Order </Text>
            <Text style={styles.mapTextGold}>Map</Text>
          </Text>
        </View>

        <View style={styles.rightStatusContainer}>
          <View style={styles.blueDotHalo}>
            <View style={styles.blueDotCore} />
          </View>
        </View>
      </View>

      {/* CONDITIONAL RENDER: Show Wait Near Modal OR Popular Pickup Points Sheet */}
      {selectedStore ? (
        /* WAIT NEAR MODAL — displays instead of popular pickup points sheet */
        <Animated.View
          style={[
            styles.waitModalContainer,
            {
              bottom: Math.max(insets.bottom, 12),
              opacity: waitModalOpacity,
              transform: [{ translateY: waitModalTranslateY }],
            },
          ]}
        >
          {/* Close */}
          <TouchableOpacity onPress={closeWaitModal} style={styles.waitModalClose} activeOpacity={0.8}>
            <Ionicons name="close" size={18} color="#8E8E8E" />
          </TouchableOpacity>

          {/* Store info row */}
          <View style={styles.waitModalRow}>
            <View style={styles.waitClockCircle}>
              <Ionicons name="time-outline" size={20} color="#F2CA50" />
            </View>
            <View style={styles.waitModalInfo}>
              <Text style={styles.waitNearLabel}>Wait near</Text>
              <Text style={styles.waitStoreName}>{selectedStore.name}</Text>
            </View>
            <View style={styles.waitDistanceRow}>
              <Ionicons name="navigate" size={13} color="#F2CA50" style={{ marginRight: 3 }} />
              <Text style={styles.waitDistanceText}>{selectedStore.distance}</Text>
            </View>
          </View>

          {/* Get Directions CTA */}
          <TouchableOpacity
            onPress={handleGetDirections}
            style={styles.getDirectionsBtn}
            activeOpacity={0.88}
          >
            <Ionicons name="navigate" size={18} color="#0E0C0A" style={{ marginRight: 8 }} />
            <Text style={styles.getDirectionsBtnText}>Get directions</Text>
          </TouchableOpacity>
        </Animated.View>
      ) : (
        /* POPULAR PICKUP POINTS SHEET — slidable with touch grab handle */
        <Animated.View
          style={[
            styles.bottomSheetCard,
            {
              paddingBottom: 16,
              transform: [{ translateY: sheetTranslateY }],
            },
          ]}
        >
          {/* Grab handle/Alert header with PanResponder */}
          <View {...panResponder.panHandlers} style={[styles.dragHeader, isInsideZone && { height: 26, paddingBottom: 0 }]}>
            <TouchableOpacity onPress={() => toggleSheet()} style={styles.grabHandleTouch} activeOpacity={0.7}>
              <View style={styles.grabHandle} />
            </TouchableOpacity>

            {!isInsideZone && (
              <TouchableOpacity onPress={() => toggleSheet()} activeOpacity={0.9} style={styles.alertCard}>
                <View style={styles.alertIconCircle}>
                  <Text style={styles.alertExclamation}>!</Text>
                </View>
                <Text style={styles.alertCardText}>
                  Please get back in your zone to get your next order.
                </Text>
                <Ionicons
                  name={isCollapsed ? 'chevron-up' : 'chevron-down'}
                  size={18}
                  color="#FFA4A4"
                  style={{ marginLeft: 4 }}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Store list */}
          <View style={styles.pickupSectionContainer}>
            <Text style={styles.sectionHeaderTitle}>Popular pickup points near you</Text>

            {PICKUP_STORES.map((store) => (
              <TouchableOpacity
                key={store.id}
                style={styles.storeCard}
                activeOpacity={0.85}
                onPress={() => showWaitModal(store)}
              >
                <View style={styles.storeCardLeft}>
                  <View style={styles.storeIconCircle}>
                    <Ionicons
                      name={store.id === 'store_1' ? 'cafe-outline' : store.id === 'store_2' ? 'storefront-outline' : 'restaurant-outline'}
                      size={18}
                      color="#FFFFFF"
                    />
                    <View style={styles.goldDot} />
                  </View>
                  <Text style={styles.storeNameText}>{store.name}</Text>
                </View>
                <View style={styles.storeCardRight}>
                  <Text style={styles.distanceText}>{store.distance}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#F2CA50" />
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Animated.View>
      )}

      {/* GPS RECENTER FAB — dynamic positioning above modal/sheet */}
      <Animated.View
        style={[
          styles.recenterFabContainer,
          {
            bottom: selectedStore 
              ? Math.max(insets.bottom, 12) + 175 
              : Math.max(insets.bottom, 12) + 260,
            transform: [{ translateY: selectedStore ? 0 : fabTranslateY }],
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleRecenter}
          style={[styles.recenterFab, isLocating && styles.recenterFabActive]}
          activeOpacity={0.85}
        >
          <Ionicons name="locate" size={26} color="#F2CA50" />
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },

  // Top Header Overlay
  topHeaderOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    zIndex: 10,
  },
  closeCircleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(17,16,14,0.92)',
    borderWidth: 1.2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  orderMapBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(17,16,14,0.92)',
    borderWidth: 1.5,
    borderColor: '#F2CA50',
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 8,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 5,
    elevation: 6,
  },
  orderMapText: {
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.2,
  },
  orderTextWhite: { color: '#FFFFFF' },
  mapTextGold: { color: '#F2CA50' },
  rightStatusContainer: {
    width: 44,
    height: 44,
    alignItems: 'flex-end',
    justifyContent: 'center',
    paddingRight: 6,
  },
  blueDotHalo: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(59,130,246,0.35)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  blueDotCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#3B82F6',
  },

  // Recenter FAB
  recenterFabContainer: {
    position: 'absolute',
    right: 18,
    zIndex: 30,
  },
  recenterFab: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#11100E',
    borderWidth: 1.5,
    borderColor: '#3D3528',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.45,
    shadowRadius: 6,
    elevation: 8,
  },
  recenterFabActive: {
    borderColor: '#F2CA50',
    transform: [{ scale: 0.95 }],
  },

  // Bottom Sheet
  bottomSheetCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#11100E',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1.2,
    borderColor: '#26221C',
    paddingHorizontal: 16,
    paddingTop: 8,
    zIndex: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 12,
  },
  dragHeader: {
    paddingBottom: 4,
  },
  grabHandleTouch: {
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  grabHandle: {
    width: 48,
    height: 4,
    backgroundColor: '#332E27',
    borderRadius: 2,
    alignSelf: 'center',
  },
  alertCard: {
    backgroundColor: '#2A0A0C',
    borderWidth: 1,
    borderColor: '#7F1D1D',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
    marginBottom: 8,
  },
  alertIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#7F1D1D',
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertExclamation: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    lineHeight: 18,
  },
  alertCardText: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'Urbanist-SemiBold',
    fontWeight: '600',
    color: '#FFFFFF',
    lineHeight: 20,
  },
  pickupSectionContainer: { marginTop: 4 },
  sectionHeaderTitle: {
    fontSize: 13,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    marginBottom: 10,
  },
  storeCard: {
    backgroundColor: '#161412',
    borderWidth: 1,
    borderColor: '#26221C',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  storeCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 12, flex: 1 },
  storeIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#1C1914',
    borderWidth: 1,
    borderColor: '#2E2923',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  goldDot: {
    position: 'absolute',
    bottom: 3,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#F2CA50',
  },
  storeNameText: {
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  storeCardRight: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  distanceText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#8E8E8E',
  },

  // Wait Near Modal
  waitModalContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    backgroundColor: '#161412',
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: '#2E2923',
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 16,
    zIndex: 50,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.6,
    shadowRadius: 14,
    elevation: 20,
  },
  waitModalClose: {
    position: 'absolute',
    top: 12,
    right: 14,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#26221C',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 51,
  },
  waitModalRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 18,
  },
  waitClockCircle: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#201C14',
    borderWidth: 1,
    borderColor: '#3D3528',
    justifyContent: 'center',
    alignItems: 'center',
  },
  waitModalInfo: { flex: 1 },
  waitNearLabel: {
    fontSize: 12,
    fontFamily: 'Urbanist-Regular',
    color: '#8E8E8E',
    marginBottom: 2,
  },
  waitStoreName: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    color: '#FFFFFF',
  },
  waitDistanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  waitDistanceText: {
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    color: '#F2CA50',
  },
  getDirectionsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F2CA50',
    borderRadius: 18,
    paddingVertical: 15,
    paddingHorizontal: 24,
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 6,
  },
  getDirectionsBtnText: {
    fontSize: 17,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#0E0C0A',
    letterSpacing: 0.3,
  },
});
