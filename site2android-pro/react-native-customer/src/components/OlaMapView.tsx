import React, { useRef, useImperativeHandle, forwardRef, useState, useEffect, useMemo } from 'react';
import {
  StyleSheet,
  View,
  ActivityIndicator,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { OLA_MAPS_API_KEY } from '../config';

export interface OlaMapViewRef {
  recenter: (latitude: number, longitude: number, zoom?: number) => void;
  setUserLocation: (latitude: number, longitude: number) => void;
}

export interface OlaMapViewProps {
  initialLatitude?: number;
  initialLongitude?: number;
  initialZoom?: number;
  onRegionChangeComplete?: (coords: { latitude: number; longitude: number }) => void;
  onMoveStart?: () => void;
  showCenterMarker?: boolean;
  fixedMarker?: boolean;
  interactive?: boolean;
  showLocateMeButton?: boolean;
  onLocateMePress?: () => void;
  userLocation?: { latitude: number; longitude: number } | null;
  style?: any;
}

// Gold GPS locate icon
const GoldGpsIcon = ({ size = 22 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="#D4AF37" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Circle cx="12" cy="12" r="3" />
    <Line x1="12" y1="2" x2="12" y2="6" />
    <Line x1="12" y1="18" x2="12" y2="22" />
    <Line x1="2" y1="12" x2="6" y2="12" />
    <Line x1="18" y1="12" x2="22" y2="12" />
  </Svg>
);

// Gold Center Map Pin Icon
const GoldMapPinIcon = ({ size = 38 }: { size?: number }) => (
  <Svg width={size} height={size} viewBox="0 0 24 24" fill="#D4AF37" stroke="#1A1A1A" strokeWidth={1.2}>
    <Path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
  </Svg>
);

const getOlaMapHtml = (
  apiKey: string,
  centerLng: number,
  centerLat: number,
  zoom: number = 15.5,
  hasFixedMarker: boolean = false,
  isInteractive: boolean = true
) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=5.0, user-scalable=no" />
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      background: #0D0D0D;
      overflow: hidden;
      -webkit-user-select: none;
      user-select: none;
    }
    #map {
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      width: 100%;
      height: 100%;
    }
    .fixed-pin-marker {
      width: 36px;
      height: 36px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: default;
      filter: drop-shadow(0 3px 6px rgba(0,0,0,0.6));
    }
    .user-marker {
      width: 24px;
      height: 24px;
      border-radius: 12px;
      background: rgba(37, 99, 235, 0.25);
      border: 1.5px solid rgba(59, 130, 246, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 0 10px rgba(59, 130, 246, 0.4);
    }
    .user-core {
      width: 10px;
      height: 10px;
      border-radius: 5px;
      background: #2563EB;
      border: 2px solid #FFFFFF;
    }
    .maplibregl-ctrl-attrib, .maplibregl-ctrl-logo { display: none !important; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const API_KEY = "${apiKey || 'gT2nLyGoqOPTHq8wZxw3JyGg7ah81MQbCdEPyx6S'}";
    let map = null;
    let userMarker = null;
    let restaurantMarker = null;
    let isProgrammatic = false;

    function post(type, payload) {
      if (window.ReactNativeWebView) {
        window.ReactNativeWebView.postMessage(JSON.stringify(Object.assign({ type: type }, payload || {})));
      }
    }

    try {
      map = new maplibregl.Map({
        container: 'map',
        style: 'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
        center: [${centerLng}, ${centerLat}],
        zoom: ${zoom},
        attributionControl: false,
        dragPan: ${isInteractive ? 'true' : 'false'},
        dragRotate: false,
        touchZoomRotate: ${isInteractive ? 'true' : 'false'},
        touchPitch: false,
        scrollZoom: ${isInteractive ? 'true' : 'false'},
        doubleClickZoom: ${isInteractive ? 'true' : 'false'},
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
        post('MAP_LOADED');

        ${
          hasFixedMarker
            ? `
        // Create immovable fixed marker anchored to coordinates
        const markerEl = document.createElement('div');
        markerEl.className = 'fixed-pin-marker';
        markerEl.innerHTML = '<svg width="36" height="36" viewBox="0 0 24 24" fill="#DEA430" stroke="#1A1A1A" stroke-width="1.2"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>';
        restaurantMarker = new maplibregl.Marker({ element: markerEl, anchor: 'bottom' })
          .setLngLat([${centerLng}, ${centerLat}])
          .addTo(map);
        `
            : ''
        }
      });

      map.on('movestart', function() {
        if (!isProgrammatic) {
          post('MOVE_START');
        }
      });

      map.on('moveend', function() {
        if (isProgrammatic) {
          isProgrammatic = false;
        }
        if (!map) return;
        const center = map.getCenter();
        post('REGION_CHANGED', {
          latitude: center.lat,
          longitude: center.lng,
          zoom: map.getZoom()
        });
      });

      map.on('error', function(err) {
        console.warn('Map error:', err);
      });

      window.recenterMap = function(lng, lat, targetZoom) {
        if (!map) return;
        isProgrammatic = true;
        map.flyTo({
          center: [lng, lat],
          zoom: targetZoom || 16,
          essential: true,
          duration: 700
        });
        if (restaurantMarker) {
          restaurantMarker.setLngLat([lng, lat]);
        }
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
    } catch (err) {
      console.error('Ola Map init error:', err);
    }
  </script>
</body>
</html>
`;

export const OlaMapView = forwardRef<OlaMapViewRef, OlaMapViewProps>(({
  initialLatitude = 20.2520,
  initialLongitude = 85.7870,
  initialZoom = 15.5,
  onRegionChangeComplete,
  onMoveStart,
  showCenterMarker = true,
  fixedMarker = false,
  interactive = true,
  showLocateMeButton = true,
  onLocateMePress,
  userLocation,
  style,
}, ref) => {
  const webViewRef = useRef<any>(null);
  const [isMapReady, setIsMapReady] = useState(false);
  const pinLiftAnim = useRef(new Animated.Value(0)).current;
  const pendingRecenterRef = useRef<{ lat: number; lng: number; zoom?: number } | null>(null);
  const pendingUserLocationRef = useRef<{ lat: number; lng: number } | null>(null);

  // Preserve initial coordinates across re-renders so HTML doesn't reload on drag
  const initialCoordsRef = useRef({
    lng: initialLongitude,
    lat: initialLatitude,
    zoom: initialZoom,
  });

  useImperativeHandle(ref, () => ({
    recenter: (latitude: number, longitude: number, zoom?: number) => {
      const targetZoom = zoom || 16;
      if (isMapReady && webViewRef.current) {
        webViewRef.current.injectJavaScript(
          `if (window.recenterMap) { window.recenterMap(${longitude}, ${latitude}, ${targetZoom}); } true;`
        );
      } else {
        pendingRecenterRef.current = { lat: latitude, lng: longitude, zoom: targetZoom };
      }
    },
    setUserLocation: (latitude: number, longitude: number) => {
      if (isMapReady && webViewRef.current) {
        webViewRef.current.injectJavaScript(
          `if (window.setUserLocation) { window.setUserLocation(${longitude}, ${latitude}); } true;`
        );
      } else {
        pendingUserLocationRef.current = { lat: latitude, lng: longitude };
      }
    },
  }));

  // Update map center only if fixedMarker is used (static screens like restaurant detail)
  useEffect(() => {
    if (fixedMarker && isMapReady && initialLatitude && initialLongitude) {
      webViewRef.current?.injectJavaScript(
        `if (window.recenterMap) { window.recenterMap(${initialLongitude}, ${initialLatitude}, ${initialZoom}); } true;`
      );
    }
  }, [initialLatitude, initialLongitude, initialZoom, isMapReady, fixedMarker]);

  useEffect(() => {
    if (isMapReady && userLocation?.latitude && userLocation?.longitude) {
      webViewRef.current?.injectJavaScript(
        `if (window.setUserLocation) { window.setUserLocation(${userLocation.longitude}, ${userLocation.latitude}); } true;`
      );
    }
  }, [userLocation, isMapReady]);

  const handleMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_LOADED') {
        setIsMapReady(true);
        if (pendingRecenterRef.current) {
          const { lat, lng, zoom } = pendingRecenterRef.current;
          webViewRef.current?.injectJavaScript(
            `if (window.recenterMap) { window.recenterMap(${lng}, ${lat}, ${zoom || 16}); } true;`
          );
          pendingRecenterRef.current = null;
        }
        if (pendingUserLocationRef.current) {
          const { lat, lng } = pendingUserLocationRef.current;
          webViewRef.current?.injectJavaScript(
            `if (window.setUserLocation) { window.setUserLocation(${lng}, ${lat}); } true;`
          );
          pendingUserLocationRef.current = null;
        } else if (userLocation?.latitude && userLocation?.longitude) {
          webViewRef.current?.injectJavaScript(
            `if (window.setUserLocation) { window.setUserLocation(${userLocation.longitude}, ${userLocation.latitude}); } true;`
          );
        }
      } else if (data.type === 'MOVE_START') {
        onMoveStart?.();
        Animated.spring(pinLiftAnim, {
          toValue: -10,
          useNativeDriver: true,
          speed: 16,
        }).start();
      } else if (data.type === 'REGION_CHANGED') {
        Animated.spring(pinLiftAnim, {
          toValue: 0,
          useNativeDriver: true,
          speed: 14,
          bounciness: 4,
        }).start();
        onRegionChangeComplete?.({
          latitude: data.latitude,
          longitude: data.longitude,
        });
      }
    } catch (e) {
      console.warn('OlaMapView message error:', e);
    }
  };

  const htmlContent = useMemo(() => {
    return getOlaMapHtml(
      OLA_MAPS_API_KEY,
      initialCoordsRef.current.lng,
      initialCoordsRef.current.lat,
      initialCoordsRef.current.zoom,
      fixedMarker,
      interactive
    );
  }, [fixedMarker, interactive]);

  const webViewSource = useMemo(() => ({ html: htmlContent }), [htmlContent]);

  const RNWebView = WebView as any;

  return (
    <View style={[styles.container, style]}>
      <RNWebView
        ref={webViewRef}
        source={webViewSource}
        style={styles.webView}
        originWhitelist={['*']}
        javaScriptEnabled={true}
        domStorageEnabled={true}
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        onMessage={handleMessage}
        startInLoadingState={true}
        renderLoading={() => (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        )}
      />

      {/* Center Pin Indicator for Drop-Pin Address Selection (Only if showCenterMarker is enabled) */}
      {showCenterMarker && (
        <View style={styles.centerMarkerWrapper} pointerEvents="none">
          <Animated.View
            style={[
              styles.centerMarkerContainer,
              { transform: [{ translateY: pinLiftAnim }] },
            ]}
          >
            <GoldMapPinIcon size={42} />
          </Animated.View>
        </View>
      )}

      {/* Floating Locate Me (GPS) Button */}
      {showLocateMeButton && (
        <TouchableOpacity
          style={styles.locateMeBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (onLocateMePress) {
              onLocateMePress();
            } else if (userLocation?.latitude && userLocation?.longitude) {
              webViewRef.current?.injectJavaScript(
                `if (window.recenterMap) { window.recenterMap(${userLocation.longitude}, ${userLocation.latitude}, 16.5); } true;`
              );
            }
          }}
        >
          <GoldGpsIcon size={22} />
        </TouchableOpacity>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
    backgroundColor: '#0D0D0D',
  },
  webView: {
    flex: 1,
    backgroundColor: '#0D0D0D',
  },
  loadingContainer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerMarkerWrapper: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginLeft: -21,
    marginTop: -42,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  centerMarkerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  locateMeBtn: {
    position: 'absolute',
    right: 18,
    bottom: 24,
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#1E1E1E',
    borderWidth: 1.5,
    borderColor: '#3D3528',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 20,
  },
});
