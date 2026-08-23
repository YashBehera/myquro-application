import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Dimensions,
  StatusBar,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { OLA_MAPS_API_KEY } from '../config';

const { width } = Dimensions.get('window');

const BHUBANESWAR_LAT = 20.2961;
const BHUBANESWAR_LNG = 85.8245;

const getOlaMapLightHtml = (apiKey: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <style>
    * { box-sizing: border-box; -webkit-touch-callout: none; -webkit-user-select: none; }
    html, body, #map {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #F3F4F6;
      overflow: hidden;
    }
    .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const API_KEY = "${apiKey}";
    let map = null;
    let mapReady = false;

    function post(type, payload) {
      if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
        window.ReactNativeWebView.postMessage(JSON.stringify({ type, ...payload }));
      }
    }

    try {
      map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json?api_key=' + API_KEY,
        center: [${BHUBANESWAR_LNG}, ${BHUBANESWAR_LAT}],
        zoom: 15.5,
        attributionControl: false,
        dragPan: true,
        touchZoomRotate: true,
        scrollZoom: true,
        doubleClickZoom: true,
        transformRequest: function(url) {
          if (!url) return { url: '' };
          if (url.indexOf('api_key=') !== -1) {
            return { url: url };
          }
          const sep = url.indexOf('?') !== -1 ? '&' : '?';
          return { url: url + sep + 'api_key=' + API_KEY };
        }
      });

      map.on('load', function() {
        mapReady = true;
        const center = map.getCenter();
        post('MAP_READY', { lat: center.lat, lng: center.lng });
      });

      map.on('moveend', function() {
        if (!map) return;
        const center = map.getCenter();
        post('CENTER_CHANGED', { lat: center.lat, lng: center.lng });
      });

      map.on('error', function(err) {
        console.log('MapLibre error:', err);
        if (!mapReady) {
          // If style fails, inform parent
          post('MAP_READY', { lat: ${BHUBANESWAR_LAT}, lng: ${BHUBANESWAR_LNG} });
        }
      });
    } catch(e) {
      console.log('Map init error:', e);
      post('MAP_READY', { lat: ${BHUBANESWAR_LAT}, lng: ${BHUBANESWAR_LNG} });
    }

    window.centerOnCoords = function(lat, lng) {
      if (map) {
        try {
          map.flyTo({ center: [lng, lat], zoom: 16.2, speed: 1.5 });
        } catch(e) {
          map.setCenter([lng, lat]);
        }
      }
    };
  </script>
</body>
</html>
`;

export default function RestaurantLocationScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webViewRef = useRef<WebView>(null);

  const [currentCoords, setCurrentCoords] = useState({
    lat: BHUBANESWAR_LAT,
    lng: BHUBANESWAR_LNG,
  });

  const [address, setAddress] = useState(
    'Plot No. 124, Infocity Avenue\nPatia, Chandrasekharpur,\nBhubaneswar, Odisha 751024'
  );

  const [isLocating, setIsLocating] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Static memoized HTML template to prevent WebView from reloading when state changes
  const mapHtml = useMemo(() => getOlaMapLightHtml(OLA_MAPS_API_KEY), []);

  // Safe timer to ensure loading screen vanishes after 2.5s even on slow connections
  useEffect(() => {
    const timer = setTimeout(() => {
      setMapLoaded(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  const reverseGeocodeOla = async (lat: number, lng: number) => {
    try {
      const url = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`;
      const res = await fetch(url, {
        headers: { 'X-Request-Id': `req-${Date.now()}` },
      });
      const data = await res.json();
      if (data && data.results && data.results.length > 0) {
        const topResult = data.results[0];
        const formatted = topResult.formatted_address;
        if (formatted) {
          // Format with clean line breaks
          const parts = formatted.split(', ');
          if (parts.length >= 3) {
            const line1 = parts.slice(0, 2).join(', ');
            const line2 = parts.slice(2, 4).join(', ');
            const line3 = parts.slice(4).join(', ');
            setAddress(`${line1}\n${line2}\n${line3}`);
          } else {
            setAddress(formatted);
          }
          return;
        }
      }
    } catch (_) {}

    // Fallback to expo-location if Ola endpoint fails
    try {
      const geo = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
      if (geo && geo.length > 0) {
        const g = geo[0];
        const formatted = `${g.name || g.streetNumber || ''} ${g.street || ''}\n${g.district || g.subregion || ''}, ${g.city || ''},\n${g.region || ''} ${g.postalCode || ''}`.trim();
        if (formatted) setAddress(formatted);
      }
    } catch (_) {}
  };

  useEffect(() => {
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
          if (loc?.coords) {
            const { latitude, longitude } = loc.coords;
            setCurrentCoords({ lat: latitude, lng: longitude });
            webViewRef.current?.injectJavaScript(
              `if (window.centerOnCoords) { window.centerOnCoords(${latitude}, ${longitude}); } true;`
            );
            reverseGeocodeOla(latitude, longitude);
          }
        }
      } catch (err) {
        console.log('Location fetch error:', err);
      }
    })();
  }, []);

  const handleLocateMe = async () => {
    setIsLocating(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant location permission in system settings to locate your restaurant.');
        setIsLocating(false);
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      if (loc?.coords) {
        const { latitude, longitude } = loc.coords;
        setCurrentCoords({ lat: latitude, lng: longitude });
        webViewRef.current?.injectJavaScript(
          `if (window.centerOnCoords) { window.centerOnCoords(${latitude}, ${longitude}); } true;`
        );
        await reverseGeocodeOla(latitude, longitude);
      }
    } catch (e) {
      Alert.alert('Error', 'Unable to fetch current location.');
    } finally {
      setIsLocating(false);
    }
  };

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        setMapLoaded(true);
      } else if (data.type === 'CENTER_CHANGED') {
        setCurrentCoords({ lat: data.lat, lng: data.lng });
        reverseGeocodeOla(data.lat, data.lng);
      }
    } catch (_) {}
  };

  const handleConfirmLocation = () => {
    router.push('/restaurant-address-details' as any);
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      {/* Interactive Ola Maps (Light Theme) */}
      <View style={styles.mapContainer}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={styles.webView}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
          bounces={false}
          mixedContentMode="always"
          allowFileAccess={true}
          allowUniversalAccessFromFileURLs={true}
          onLoadEnd={() => setMapLoaded(true)}
        />

        {!mapLoaded && (
          <View style={styles.mapLoadingOverlay}>
            <ActivityIndicator size="large" color="#E8C547" />
            <Text style={styles.loadingMapText}>Loading Ola Maps...</Text>
          </View>
        )}

        {/* Ola Maps Light Theme Badge */}
        <View style={[styles.olaBadge, { top: Math.max(insets.top, 16) + 12 }]}>
          <Ionicons name="map" size={12} color="#0B0B0B" style={{ marginRight: 4 }} />
          <Text style={styles.olaBadgeText}>Ola Maps • Light</Text>
        </View>

        {/* Center Target Pin with Pin Shadow */}
        <View style={styles.centerPinContainer} pointerEvents="none">
          <View style={styles.pinBubble}>
            <Ionicons name="restaurant" size={14} color="#0B0B0B" style={{ marginRight: 4 }} />
            <Text style={styles.pinBubbleText}>Your Restaurant</Text>
          </View>
          <View style={styles.pinIconWrapper}>
            <Ionicons name="location" size={42} color="#E8C547" />
            <View style={styles.pinCenterDot} />
          </View>
          <View style={styles.pinGroundShadow} />
        </View>
      </View>

      <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right']} pointerEvents="box-none">
        {/* Top Navigation Bar */}
        <View style={styles.topNav}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={20} color="#E8C547" />
          </TouchableOpacity>
        </View>

        {/* Floating Locate Me Button */}
        <View style={styles.locateMeContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            style={styles.locateMeButton}
            onPress={handleLocateMe}
            disabled={isLocating}
          >
            {isLocating ? (
              <ActivityIndicator size="small" color="#E8C547" />
            ) : (
              <>
                <Ionicons name="locate" size={18} color="#E8C547" style={{ marginRight: 6 }} />
                <Text style={styles.locateMeText}>LOCATE ME</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom Location Confirmation Sheet */}
        <View
          style={[
            styles.bottomSheetCard,
            { paddingBottom: Math.max(insets.bottom, 16) + 6 },
          ]}
        >
          {/* Top Gold Drag Handle */}
          <View style={styles.dragHandle} />

          {/* Sheet Title */}
          <Text style={styles.sheetTitle}>
            Choose Location <Text style={styles.sheetTitleGold}>on Map</Text>
          </Text>

          {/* Divider */}
          <View style={styles.sheetDivider} />

          {/* Address Row with 3D Store Thumbnail */}
          <View style={styles.addressRow}>
            {/* Left Column: Navigation Icon + Address */}
            <View style={styles.addressLeftColumn}>
              <View style={styles.navIconBadge}>
                <Ionicons name="navigate" size={17} color="#E8C547" />
              </View>
              <Text style={styles.addressText}>{address}</Text>
            </View>

            {/* Right Column: 3D Restaurant Thumbnail */}
            <View style={styles.storeImageWrapper}>
              <Image
                source={require('../../assets/image copy.png')}
                style={styles.storeImage}
                resizeMode="cover"
              />
            </View>
          </View>

          {/* CTA Button */}
          <TouchableOpacity
            activeOpacity={0.85}
            style={styles.confirmButton}
            onPress={handleConfirmLocation}
          >
            <Text style={styles.confirmText}>Yes, this is my Restaurant</Text>
            <Ionicons name="arrow-forward" size={18} color="#0B0B0B" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0B',
  },
  mapContainer: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  webView: {
    flex: 1,
    width: '100%',
    height: '100%',
    backgroundColor: '#F3F4F6',
  },
  mapLoadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0B0B0B',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 5,
  },
  loadingMapText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13,
    color: '#8E8E8E',
    marginTop: 10,
  },
  olaBadge: {
    position: 'absolute',
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 197, 71, 0.92)',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  olaBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#0B0B0B',
  },

  /* Center Fixed Pin */
  centerPinContainer: {
    position: 'absolute',
    top: '40%',
    left: '50%',
    marginLeft: -60,
    marginTop: -70,
    width: 120,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  pinBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8C547',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 4,
    marginBottom: -4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  pinBubbleText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11,
    fontWeight: '700',
    color: '#0B0B0B',
  },
  pinIconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pinCenterDot: {
    position: 'absolute',
    top: 10,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#0B0B0B',
  },
  pinGroundShadow: {
    width: 14,
    height: 5,
    borderRadius: 3,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    marginTop: -6,
  },

  safeArea: {
    flex: 1,
    justifyContent: 'space-between',
  },
  topNav: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#191919',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
  },

  /* Floating Locate Me */
  locateMeContainer: {
    alignItems: 'flex-end',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  locateMeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#191919',
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  locateMeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
    color: '#E8C547',
  },

  /* Bottom Sheet Card */
  bottomSheetCard: {
    backgroundColor: '#191919',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    paddingHorizontal: 20,
    paddingTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.55,
    shadowRadius: 18,
    elevation: 12,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#E8C547',
    alignSelf: 'center',
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  sheetTitleGold: {
    color: '#E8C547',
  },
  sheetDivider: {
    height: 1,
    backgroundColor: '#2A2A2A',
    marginVertical: 14,
  },
  addressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  addressLeftColumn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginRight: 14,
  },
  navIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#141414',
    borderWidth: 1,
    borderColor: '#2A2A2A',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontFamily: 'Urbanist-Regular',
    fontSize: 13,
    color: '#FFFFFF',
    lineHeight: 18,
  },
  storeImageWrapper: {
    width: 64,
    height: 64,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2A2A2A',
    backgroundColor: '#141414',
    overflow: 'hidden',
  },
  storeImage: {
    width: '100%',
    height: '100%',
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8C547',
    borderRadius: 14,
    paddingVertical: 14,
  },
  confirmText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14.5,
    fontWeight: '700',
    color: '#0B0B0B',
    marginRight: 8,
  },
});
