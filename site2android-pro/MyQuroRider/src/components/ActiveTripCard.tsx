import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
  Dimensions,
  Linking,
  Platform,
  ActivityIndicator,
  Image,
  ScrollView,
  Modal,
  SafeAreaView,
  Animated,
  Alert,
  TextInput,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useRouter } from 'expo-router';
import { useRider } from '@/context/RiderContext';
import { CustomAlertModal, ModalType } from './CustomAlertModal';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Location from 'expo-location';
import { OLA_MAPS_API_KEY } from '../config';
import { CameraView, useCameraPermissions } from 'expo-camera';
import QRCode from 'react-native-qrcode-svg';

const SCREEN_HEIGHT = Dimensions.get('window').height;

// Helper: quadratic bezier curve points between two coords (fallback)
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

// Decode Ola Maps Directions API precision-5 polyline format
function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0, lat = 0, lng = 0, coordinates: [number, number][] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let byte, shift = 0, result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));

    shift = 0; result = 0;
    do {
      byte = str.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));

    coordinates.push([lng / factor, lat / factor]);
  }
  return coordinates;
}

// ─── Map HTML Generator for Active Trip ──────────────────────────────────────
function buildActiveTripMapHtml(
  apiKey: string,
  riderLat: number,
  riderLng: number,
  destLat: number,
  destLng: number,
  title: string,
  isPickup: boolean,
  routeCoords: [number, number][],
): string {
  const lineCoords = JSON.stringify(routeCoords);

  // Bounds: fit Rider and active Destination
  const minLat = Math.min(riderLat, destLat) - 0.005;
  const maxLat = Math.max(riderLat, destLat) + 0.005;
  const minLng = Math.min(riderLng, destLng) - 0.005;
  const maxLng = Math.max(riderLng, destLng) + 0.005;

  const titleJson = JSON.stringify(title);

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
    center:[${(riderLng + destLng) / 2},${(riderLat + destLat) / 2}],
    zoom:13.5,
    attributionControl:false,
    transformRequest:function(url){return{url:url+(url.includes('?')?'&':'?')+'api_key=${apiKey}'}}
  });

  map.on('load',function(){
    map.fitBounds([[${minLng},${minLat}],[${maxLng},${maxLat}]],{
      padding:{top:140,bottom:300,left:60,right:60},duration:0
    });

    // Active Route (solid blue line like in navigation)
    map.addSource('route-source',{
      type:'geojson',
      data:{type:'Feature',geometry:{type:'LineString',coordinates:${lineCoords}}}
    });
    map.addLayer({
      id:'route-line',type:'line',source:'route-source',
      paint:{
        'line-color':'#2563EB',
        'line-width':5,
      },
      layout:{'line-join':'round','line-cap':'round'}
    });

    // Destination marker
    if (${isPickup}) {
      var storeEl=document.createElement('div');
      storeEl.className='pickup-pill';
      storeEl.innerHTML='<div class="pickup-icon"><svg width="10" height="10" viewBox="0 0 24 24" fill="#F2CA50"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg></div><div class="pickup-name">'+${titleJson}+'</div>';
      new maplibregl.Marker({element:storeEl,anchor:'bottom'}).setLngLat([${destLng},${destLat}]).addTo(map);
    } else {
      var custEl=document.createElement('div');
      custEl.className='customer-pin';
      custEl.innerHTML='<svg width="11" height="11" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
      new maplibregl.Marker({element:custEl,anchor:'center'}).setLngLat([${destLng},${destLat}]).addTo(map);
    }

    // Rider current location GPS dot
    var gpsEl=document.createElement('div');
    gpsEl.className='gps-ring';
    gpsEl.innerHTML='<div class="gps-dot"></div>';
    new maplibregl.Marker({element:gpsEl,anchor:'center'}).setLngLat([${riderLng},${riderLat}]).addTo(map);
  });
</script>
</body>
</html>`;
}
const getOrderPasscode = (orderId: string): string => {
  if (!orderId) return '12345';
  const digits = orderId.replace(/\D/g, '');
  if (digits.length >= 5) {
    return digits.slice(-5);
  }
  return '12345';
};

const getOrderBarcode = (orderId: string): string => {
  if (!orderId) return '191917969998687';
  const digits = orderId.replace(/\D/g, '');
  if (digits.length > 0) {
    return digits;
  }
  return '191917969998687';
};

export const ActiveTripCard: React.FC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { activeTrip, advanceTripStatus, cancelActiveTrip } = useRider();

  const [riderLocation, setRiderLocation] = useState<{ latitude: number; longitude: number }>({
    latitude: 20.2520,
    longitude: 85.7870,
  });

  const [targetTime, setTargetTime] = useState('');
  const [isMapReady, setIsMapReady] = useState(false);
  const [route, setRoute] = useState<[number, number][]>([]);
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

  // Transition mount delay to prevent maps overlap rendering
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsMapReady(true);
    }, 450);
    return () => clearTimeout(timer);
  }, []);

  // Load actual shortest & fast-track road routes from Ola Maps Directions API
  useEffect(() => {
    if (!activeTrip) return;
    const riderLat = riderLocation.latitude;
    const riderLng = riderLocation.longitude;
    
    const isNavOrArrived =
      activeTrip.status === 'NAVIGATING_TO_PICKUP' || activeTrip.status === 'ARRIVED_AT_PICKUP';

    const destLat = isNavOrArrived ? activeTrip.pickupCoords.latitude : activeTrip.dropoffCoords.latitude;
    const destLng = isNavOrArrived ? activeTrip.pickupCoords.longitude : activeTrip.dropoffCoords.longitude;

    // Set straight line fallback (NOT curves)
    setRoute([[riderLng, riderLat], [destLng, destLat]]);

    if (!OLA_MAPS_API_KEY || (OLA_MAPS_API_KEY as string) === 'YOUR_OLA_MAPS_API_KEY') {
      return;
    }

    let isMounted = true;

    const fetchDirections = async () => {
      try {
        const url = `https://api.olamaps.io/routing/v1/directions/basic?origin=${riderLat},${riderLng}&destination=${destLat},${destLng}&api_key=${OLA_MAPS_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'X-Request-Id': `req-${Date.now()}` }
        });
        if (res.ok && isMounted) {
          const data = await res.json();
          if (data.routes && data.routes.length > 0 && data.routes[0].overview_polyline) {
            const decoded = decodePolyline(data.routes[0].overview_polyline);
            if (decoded.length > 0) {
              setRoute(decoded);
            }
          }
        }
      } catch (err) {
        console.warn('Error fetching Ola Maps directions:', err);
      }
    };

    fetchDirections();

    return () => {
      isMounted = false;
    };
  }, [
    activeTrip?.id,
    activeTrip?.status,
    riderLocation.latitude,
    riderLocation.longitude,
    activeTrip?.pickupCoords.latitude,
    activeTrip?.pickupCoords.longitude,
    activeTrip?.dropoffCoords.latitude,
    activeTrip?.dropoffCoords.longitude,
  ]);

  // Fetch real-time GPS
  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          if (isMounted && loc?.coords) {
            setRiderLocation({
              latitude: loc.coords.latitude,
              longitude: loc.coords.longitude,
            });
          }
        }
      } catch (err) {
        console.warn('ActiveTrip GPS error:', err);
      }
    })();
    return () => {
      isMounted = false;
    };
  }, []);

  // Compute Reach by Time
  useEffect(() => {
    if (!activeTrip) return;
    const mins = activeTrip.estimatedMinutes || 15;
    const targetDate = new Date(Date.now() + mins * 60 * 1000);
    let hours = targetDate.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const minutes = targetDate.getMinutes();
    const minStr = minutes < 10 ? '0' + minutes : minutes;
    setTargetTime(`${hours}:${minStr} ${ampm}`);
  }, [activeTrip?.estimatedMinutes]);

  if (!activeTrip) return null;

  const isNavOrArrived =
    activeTrip.status === 'NAVIGATING_TO_PICKUP' || activeTrip.status === 'ARRIVED_AT_PICKUP';

  const destLat = isNavOrArrived ? activeTrip.pickupCoords.latitude : activeTrip.dropoffCoords.latitude;
  const destLng = isNavOrArrived ? activeTrip.pickupCoords.longitude : activeTrip.dropoffCoords.longitude;

  // Extract restaurant name & display address dynamically
  const titleHeader = isNavOrArrived ? 'Pickup from' : 'Deliver to';
  const displayTitle = isNavOrArrived
    ? (activeTrip.pickupAddress.split(',')[0] || 'Restaurant')
    : activeTrip.customerName;
  const displayAddress = isNavOrArrived
    ? (activeTrip.pickupAddress.split(',').slice(1).join(',').trim() || activeTrip.pickupAddress)
    : activeTrip.dropoffAddress;

  const handleCall = () => {
    const phone = isNavOrArrived ? '+919876543210' : activeTrip.customerPhone;
    Linking.openURL(`tel:${phone}`);
  };

  const handleMaps = () => {
    const url = Platform.select({
      ios: `maps://app?daddr=${destLat},${destLng}&t=m`,
      android: `google.navigation:q=${destLat},${destLng}&mode=d`,
      default: `geo:${destLat},${destLng}?q=${destLat},${destLng}`,
    }) || `https://www.google.com/maps/dir/?api=1&destination=${destLat},${destLng}`;
    Linking.openURL(url);
  };

  const handleCallTo = (phone: string) => {
    Linking.openURL(`tel:${phone}`);
  };

  const handleMapsTo = (lat: number, lng: number) => {
    const url = Platform.select({
      ios: `maps://app?daddr=${lat},${lng}&t=m`,
      android: `google.navigation:q=${lat},${lng}&mode=d`,
      default: `geo:${lat},${lng}?q=${lat},${lng}`,
    }) || `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    Linking.openURL(url);
  };

  const getBtnText = () => {
    if (activeTrip.status === 'NAVIGATING_TO_PICKUP') return 'Reached pickup location';
    if (activeTrip.status === 'ARRIVED_AT_PICKUP') return 'Start trip';
    return 'Reached delivery location';
  };

  // Local states for collapsible accordions on Arrived At Pickup screen
  const [verifyExpanded, setVerifyExpanded] = useState(false);
  const [itemsExpanded, setItemsExpanded] = useState(true);
  const [pickupExpanded, setPickupExpanded] = useState(false);
  const [deliveryExpanded, setDeliveryExpanded] = useState(false);

  // Local states for collapsible accordions on Reached Delivery screen
  const [hasReachedDelivery, setHasReachedDelivery] = useState(false);
  const [deliveryDetailsExpanded, setDeliveryDetailsExpanded] = useState(true);
  const [deliveryItemsExpanded, setDeliveryItemsExpanded] = useState(true);
  const [deliveryPickupExpanded, setDeliveryPickupExpanded] = useState(false);
  const [deliveryPaymentExpanded, setDeliveryPaymentExpanded] = useState(false);
  const [cashCollected, setCashCollected] = useState(false);
  const [showCollectCashModal, setShowCollectCashModal] = useState(false);
  const [collectCashPasscode, setCollectCashPasscode] = useState('');
  const [collectCashExpanded, setCollectCashExpanded] = useState(true);
  const [paymentStep, setPaymentStep] = useState<'payment_options' | 'collect_cash_entry' | 'passcode_entry'>('payment_options');
  const [qrGenerated, setQrGenerated] = useState(false);
  const [enteredAmount1, setEnteredAmount1] = useState('');
  const [enteredAmount2, setEnteredAmount2] = useState('');
  const [showEarningsScreen, setShowEarningsScreen] = useState(false);

  useEffect(() => {
    setHasReachedDelivery(false);
    setCashCollected(false);
    setCollectCashPasscode('');
    setPaymentStep('payment_options');
    setQrGenerated(false);
  }, [activeTrip?.id]);

  const handleCashKeyPress = (val: string) => {
    const expectedPass = '54321';
    if (val === 'backspace') {
      setCollectCashPasscode(prev => prev.slice(0, -1));
    } else if (val === 'done') {
      if (collectCashPasscode === expectedPass) {
        setCashCollected(true);
        setShowCollectCashModal(false);
        setDeliveryDetailsExpanded(true);
      } else {
        showAlertModal({
          type: 'error',
          title: 'Invalid Passcode',
          subtitle: 'The cash collection passcode you entered is incorrect. Please verify with the customer.',
          primaryButtonText: 'Try Again',
          onPrimaryPress: hideAlertModal,
        });
        setCollectCashPasscode('');
      }
    } else if (val !== 'empty') {
      if (collectCashPasscode.length < 5) {
        const nextPass = collectCashPasscode + val;
        setCollectCashPasscode(nextPass);
        if (nextPass.length === 5) {
          if (nextPass === expectedPass) {
            setTimeout(() => {
              setCashCollected(true);
              setShowCollectCashModal(false);
              setDeliveryDetailsExpanded(true);
            }, 350);
          } else {
            setTimeout(() => {
              showAlertModal({
                type: 'error',
                title: 'Invalid Passcode',
                subtitle: 'The cash collection passcode you entered is incorrect. Please verify with the customer.',
                primaryButtonText: 'Try Again',
                onPrimaryPress: hideAlertModal,
              });
              setCollectCashPasscode('');
            }, 350);
          }
        }
      }
    }
  };

  const renderCashKey = (val: string) => {
    if (val === 'empty') {
      return <View style={[styles.keyButton, { backgroundColor: 'transparent', borderWidth: 0 }]} />;
    }
    
    let content;
    if (val === 'backspace') {
      content = <Ionicons name="backspace-outline" size={22} color="#FFF" />;
    } else if (val === 'done') {
      content = <Text style={[styles.keyText, { color: '#F2CA50', fontSize: 16, fontFamily: 'Urbanist-Bold' }]}>Done</Text>;
    } else {
      content = <Text style={styles.keyText}>{val}</Text>;
    }

    return (
      <TouchableOpacity 
        style={styles.keyButton}
        activeOpacity={0.7}
        onPress={() => handleCashKeyPress(val)}
      >
        {content}
      </TouchableOpacity>
    );
  };

  useEffect(() => {
    setHasReachedDelivery(false);
    setCashCollected(false);
    setCollectCashPasscode('');
    setCollectCashExpanded(true);
    setPaymentStep('payment_options');
    setQrGenerated(false);
    setEnteredAmount1('');
    setEnteredAmount2('');
    setShowEarningsScreen(false);
  }, [activeTrip?.id]);

  const [verified1, setVerified1] = useState(false);
  const [verified2, setVerified2] = useState(false);
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [showScannerModal, setShowScannerModal] = useState(false);
  const [scannerMode, setScannerMode] = useState<'scan' | 'help'>('scan');
  const [selectedIssue, setSelectedIssue] = useState<'barcode' | 'bill'>('barcode');
  const [flashOn, setFlashOn] = useState(false);

  const scanAnim = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (showScannerModal) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(scanAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(scanAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          })
        ])
      ).start();
    } else {
      scanAnim.setValue(0);
    }
  }, [showScannerModal]);

  const [permission, requestPermission] = useCameraPermissions();
  const [hasScanned, setHasScanned] = useState(false);

  useEffect(() => {
    if (showScannerModal) {
      setHasScanned(false);
    }
  }, [showScannerModal]);

  const handleBarcodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (hasScanned) return;
    setHasScanned(true);

    const expectedBarcode = activeTrip ? getOrderBarcode(activeTrip.id) : '';
    console.log(`Scanned barcode: ${data}, expected: ${expectedBarcode}`);

    if (data === expectedBarcode || data.includes(expectedBarcode) || expectedBarcode.includes(data)) {
      showAlertModal({
        type: 'success_online',
        title: 'Scan Successful 🎉',
        subtitle: `Order package verified successfully!\nBarcode: ${data}`,
        primaryButtonText: 'Continue',
        onPrimaryPress: () => {
          hideAlertModal();
          setVerified1(true);
          setVerified2(true);
          setShowScannerModal(false);
          setShowPasscodeModal(false);
        },
      });
    } else {
      showAlertModal({
        type: 'warning',
        title: 'Barcode Mismatch',
        subtitle: `Scanned: "${data}"\nExpected: "${expectedBarcode}"\n\nWould you like to verify this package anyway?`,
        primaryButtonText: 'Verify Anyway',
        onPrimaryPress: () => {
          hideAlertModal();
          setVerified1(true);
          setVerified2(true);
          setShowScannerModal(false);
          setShowPasscodeModal(false);
        },
        secondaryButtonText: 'Retry Scan',
        onSecondaryPress: () => {
          hideAlertModal();
          setHasScanned(false);
        },
      });
    }
  };

  const handleKeyPress = (val: string) => {
    const expectedPass = activeTrip ? getOrderPasscode(activeTrip.id) : '12345';
    if (val === 'backspace') {
      setPasscode(prev => prev.slice(0, -1));
    } else if (val === 'done') {
      if (passcode === expectedPass || (passcode.length >= 4 && expectedPass.startsWith(passcode))) {
        setVerified1(true);
        setVerified2(true);
        setShowPasscodeModal(false);
      } else {
        showAlertModal({
          type: 'error',
          title: 'Invalid Passcode',
          subtitle: 'The delivery confirmation passcode you entered is incorrect.',
          primaryButtonText: 'Try Again',
          onPrimaryPress: hideAlertModal,
        });
        setPasscode('');
      }
    } else if (val !== 'empty') {
      if (passcode.length < 5) {
        const nextPass = passcode + val;
        setPasscode(nextPass);
        if (nextPass.length === 5) {
          if (nextPass === expectedPass) {
            setTimeout(() => {
              setVerified1(true);
              setVerified2(true);
              setShowPasscodeModal(false);
            }, 350);
          } else {
            setTimeout(() => {
              showAlertModal({
                type: 'error',
                title: 'Invalid Passcode',
                subtitle: 'The delivery confirmation passcode you entered is incorrect.',
                primaryButtonText: 'Try Again',
                onPrimaryPress: hideAlertModal,
              });
              setPasscode('');
            }, 350);
          }
        }
      }
    }
  };

  const renderKey = (val: string) => {
    if (val === 'empty') {
      return <View style={[styles.keyButton, { backgroundColor: 'transparent', borderWidth: 0 }]} />;
    }
    
    let content;
    if (val === 'backspace') {
      content = <Ionicons name="backspace-outline" size={22} color="#FFF" />;
    } else if (val === 'done') {
      content = <Text style={[styles.keyText, { color: '#F2CA50', fontSize: 16, fontFamily: 'Urbanist-Bold' }]}>Done</Text>;
    } else {
      content = <Text style={styles.keyText}>{val}</Text>;
    }

    return (
      <TouchableOpacity 
        style={styles.keyButton}
        activeOpacity={0.7}
        onPress={() => handleKeyPress(val)}
      >
        {content}
      </TouchableOpacity>
    );
  };

  const earningsAmount = activeTrip.id.startsWith('demo_order_') ? 22 : (Math.round(activeTrip.fareAmount * 0.3) || 22);

  if (showEarningsScreen || activeTrip.status === 'COMPLETED') {
    return (
      <View style={styles.earningsContainer}>
        <StatusBar barStyle="light-content" backgroundColor="#000000" />
        
        {/* Abstract Gold Concentric Wave Lines */}
        <View style={styles.goldWavyContainer}>
          {Array.from({ length: 12 }).map((_, idx) => (
            <View
              key={idx}
              style={[
                styles.goldWaveLine,
                {
                  width: 300 + idx * 30,
                  height: 300 + idx * 30,
                  borderRadius: 150 + (idx * 15),
                  top: -150 - (idx * 10),
                  right: -150 - (idx * 10),
                  borderColor: `rgba(242, 202, 80, ${0.03 + idx * 0.015})`,
                }
              ]}
            />
          ))}
        </View>

        {/* Main Content */}
        <SafeAreaView style={{ flex: 1, justifyContent: 'space-between', paddingBottom: insets.bottom > 0 ? insets.bottom : 20 }}>
          <View style={{ flex: 1, paddingHorizontal: 24, paddingTop: 30 }}>
            {/* Top Left Badge: Order Delivered */}
            <View style={styles.orderDeliveredBadge}>
              <Ionicons name="checkmark-circle" size={24} color="#10B981" />
              <Text style={styles.orderDeliveredText}>Order Delivered</Text>
            </View>

            {/* Title: Total earnings */}
            <View style={styles.earningsTitleSection}>
              <Text style={styles.earningsTitleText}>Total earnings</Text>
              <View style={styles.earningsTitleLine} />
            </View>

            {/* Big Amount: ₹22 */}
            <View style={styles.earningsAmountRow}>
              <Text style={styles.earningsCurrencySymbol}>₹</Text>
              <Text style={styles.earningsValueDigits}>{earningsAmount}</Text>
            </View>
          </View>

          {/* Action button: Go to homepage */}
          <View style={{ paddingHorizontal: 20 }}>
            <TouchableOpacity
              style={styles.goToHomepageBtn}
              activeOpacity={0.9}
              onPress={() => {
                setShowEarningsScreen(false);
                advanceTripStatus();
              }}
            >
              <Ionicons name="home" size={20} color="#FFFFFF" style={{ marginRight: 8 }} />
              <Text style={styles.goToHomepageBtnText}>Go to homepage</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  if (hasReachedDelivery) {
    const barcodeStr = activeTrip ? getOrderBarcode(activeTrip.id) : '191917969998687';
    const mainBarcode = barcodeStr.slice(0, -4);
    const highlightedBarcode = barcodeStr.slice(-4);
    const dropoffAddressText = activeTrip?.dropoffAddress || '';
    const customerNameText = activeTrip?.customerName || '';
    const customerPhoneText = activeTrip?.customerPhone || '';
    const pickupAddressText = activeTrip?.pickupAddress || '';
    const pickupTitleText = activeTrip ? (activeTrip.pickupAddress.split(',')[0] || '') : '';

    return (
      <View style={styles.deliveryDetailContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
        
        {/* Header row */}
        <View style={[styles.deliveryDetailHeader, { paddingTop: Math.max(insets.top + 6, 20) }]}>
          <TouchableOpacity 
            style={styles.circleBtn} 
            activeOpacity={0.8} 
            onPress={() => setHasReachedDelivery(false)}
          >
            <Ionicons name="arrow-back" size={22} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.deliveryDetailHeaderRight}>
            <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
              <Ionicons name="alarm-outline" size={22} color="#F2CA50" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.helpPill}
              activeOpacity={0.8}
              onPress={() => router.push('/help-support')}
            >
              <Ionicons name="headset-outline" size={14} color="#FFFFFF" />
              <Text style={styles.helpText}>Help</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Deliver to section */}
        <View style={styles.deliveryTitleSection}>
          <View style={styles.deliverToRow}>
            <Ionicons name="person" size={14} color="#F2CA50" />
            <Text style={styles.deliverToLabel}>Deliver to</Text>
          </View>
          <Text style={styles.deliverToName}>{customerNameText}</Text>
          <Text style={styles.deliveryBarcodeText}>
            #{mainBarcode}
            <Text style={styles.deliveryBarcodeGold}>{highlightedBarcode}</Text>
          </Text>
        </View>

        {/* Accordions */}
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, paddingBottom: 110 }} 
          showsVerticalScrollIndicator={false}
          style={{ flex: 1 }}
        >
          {/* ACCORDION 0: Collect Cash (If COD) */}
          {activeTrip.paymentMode === 'COD' && (
            <View style={styles.deliveryCard}>
              <TouchableOpacity
                style={styles.deliveryCardHeader}
                activeOpacity={0.8}
                onPress={() => setCollectCashExpanded(!collectCashExpanded)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>STEP 1</Text>
                  </View>
                  <Text style={styles.deliveryCardTitle}>Collect cash</Text>
                </View>
                <Ionicons
                  name={collectCashExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#F2CA50"
                />
              </TouchableOpacity>

              {collectCashExpanded && (
                <View style={{ paddingBottom: 16, paddingHorizontal: 20 }}>
                  <Text style={[styles.verifySubtext, { marginBottom: 12, marginLeft: 0 }]}>
                    Please collect ₹{activeTrip.fareAmount.toFixed(2)} cash from customer.
                  </Text>
                  <TouchableOpacity
                    style={[
                      styles.innerVerifyBtn,
                      cashCollected
                        ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                        : styles.innerVerifyBtnActive
                    ]}
                    activeOpacity={0.8}
                    disabled={cashCollected}
                    onPress={() => {
                      setPaymentStep('payment_options');
                      setQrGenerated(false);
                      setEnteredAmount1('');
                      setEnteredAmount2('');
                      setShowCollectCashModal(true);
                    }}
                  >
                    <Text style={[
                      styles.innerVerifyBtnText,
                      { color: cashCollected ? '#FFFFFF' : '#0E0C0A' }
                    ]}>
                      {cashCollected ? 'Cash Collected ✓' : 'Collect Cash'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* ACCORDION 1: Delivery Details */}
          <View style={styles.deliveryCard}>
            <TouchableOpacity
              style={styles.deliveryCardHeader}
              activeOpacity={0.8}
              onPress={() => setDeliveryDetailsExpanded(!deliveryDetailsExpanded)}
            >
              <Text style={styles.deliveryCardTitle}>Delivery Details</Text>
              <Ionicons
                name={deliveryDetailsExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#F2CA50"
              />
            </TouchableOpacity>

            {deliveryDetailsExpanded && (
              <View style={styles.deliveryDetailsBox}>
                {/* Row 1: Location Pin & Address with Navigate Button */}
                <View style={styles.deliveryBoxRow}>
                  <View style={styles.deliveryBoxIconText}>
                    <Ionicons name="location" size={18} color="#F2CA50" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deliveryBoxText}>{dropoffAddressText}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.innerCallBtn} 
                    activeOpacity={0.8}
                    onPress={() => handleMapsTo(activeTrip?.dropoffCoords?.latitude || 0, activeTrip?.dropoffCoords?.longitude || 0)}
                  >
                    <Ionicons name="navigate" size={12} color="#F2CA50" />
                    <Text style={styles.innerCallBtnText}>Navigate</Text>
                  </TouchableOpacity>
                </View>

                {/* Divider */}
                <View style={styles.deliveryDivider} />

                {/* Row 2: Customer Name */}
                <View style={styles.deliveryBoxRow}>
                  <View style={styles.deliveryBoxIconText}>
                    <Ionicons name="person" size={18} color="#F2CA50" style={{ marginTop: 2 }} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.deliveryBoxSubText}>Customer</Text>
                      <Text style={[styles.deliveryBoxText, { fontWeight: '700' }]}>{customerNameText}</Text>
                    </View>
                  </View>
                  <TouchableOpacity 
                    style={styles.innerCallBtn} 
                    activeOpacity={0.8}
                    onPress={() => handleCallTo(customerPhoneText)}
                  >
                    <Ionicons name="call" size={12} color="#F2CA50" />
                    <Text style={styles.innerCallBtnText}>Call</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ACCORDION 2: Item Details */}
          <View style={styles.deliveryCard}>
            <TouchableOpacity
              style={styles.deliveryCardHeader}
              activeOpacity={0.8}
              onPress={() => setDeliveryItemsExpanded(!deliveryItemsExpanded)}
            >
              <Text style={styles.deliveryCardTitle}>Item Details</Text>
              <Ionicons
                name={deliveryItemsExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#F2CA50"
              />
            </TouchableOpacity>

            {deliveryItemsExpanded && (
              <View style={{ paddingBottom: 16 }}>
                {(activeTrip.items && activeTrip.items.length > 0) ? (
                  activeTrip.items.map((item, idx) => (
                    <React.Fragment key={`del-item-${idx}`}>
                      <View style={styles.deliveryItemRow}>
                        <Text style={styles.deliveryItemName}>{item.name}</Text>
                        <Text style={styles.deliveryItemQty}>{item.qty}x</Text>
                      </View>
                      {idx < (activeTrip.items?.length || 0) - 1 && (
                        <View style={styles.deliveryItemDivider} />
                      )}
                    </React.Fragment>
                  ))
                ) : (
                  <View style={styles.deliveryItemRow}>
                    <Text style={styles.deliveryItemName}>Food Order Items</Text>
                    <Text style={styles.deliveryItemQty}>1x</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* ACCORDION 3: Pickup Details */}
          <View style={styles.deliveryCard}>
            <TouchableOpacity
              style={styles.deliveryCardHeader}
              activeOpacity={0.8}
              onPress={() => setDeliveryPickupExpanded(!deliveryPickupExpanded)}
            >
              <Text style={styles.deliveryCardTitle}>Pickup Details</Text>
              <Ionicons
                name={deliveryPickupExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#F2CA50"
              />
            </TouchableOpacity>

            {deliveryPickupExpanded && (
              <View style={{ paddingBottom: 16 }}>
                <View style={{ paddingHorizontal: 20 }}>
                  <Text style={[styles.deliveryBoxText, { fontWeight: '700', fontSize: 14, color: '#FFF' }]}>
                    {pickupTitleText}
                  </Text>
                  <Text style={[styles.deliveryBoxText, { color: '#A6A6A6', marginTop: 4 }]}>
                    {pickupAddressText}
                  </Text>
                </View>
                <View style={styles.deliveryButtonsRow}>
                  <TouchableOpacity 
                    style={styles.deliveryOutlineBtn} 
                    activeOpacity={0.8} 
                    onPress={() => handleMapsTo(activeTrip.pickupCoords.latitude, activeTrip.pickupCoords.longitude)}
                  >
                    <Ionicons name="navigate" size={14} color="#F2CA50" />
                    <Text style={styles.deliveryOutlineBtnText}>Navigate</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={styles.deliveryOutlineBtn} 
                    activeOpacity={0.8} 
                    onPress={handleCall}
                  >
                    <Ionicons name="call" size={14} color="#F2CA50" />
                    <Text style={styles.deliveryOutlineBtnText}>Call Restaurant</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </View>

          {/* ACCORDION 4: Payment Details */}
          <View style={styles.deliveryCard}>
            <TouchableOpacity
              style={styles.deliveryCardHeader}
              activeOpacity={0.8}
              onPress={() => setDeliveryPaymentExpanded(!deliveryPaymentExpanded)}
            >
              <Text style={styles.deliveryCardTitle}>Payment Details</Text>
              <Ionicons
                name={deliveryPaymentExpanded ? 'chevron-up' : 'chevron-down'}
                size={16}
                color="#F2CA50"
              />
            </TouchableOpacity>

            {deliveryPaymentExpanded && (
              <View style={{ paddingBottom: 16 }}>
                <View style={styles.deliveryPaymentRow}>
                  <Text style={styles.deliveryPaymentLabel}>Payment Mode</Text>
                  <Text style={styles.deliveryPaymentValue}>
                    {activeTrip.paymentMode === 'COD' ? 'Cash on Delivery (COD)' : 'Online (Prepaid)'}
                  </Text>
                </View>
                <View style={styles.deliveryItemDivider} />
                <View style={styles.deliveryPaymentRow}>
                  <Text style={styles.deliveryPaymentLabel}>Amount to Collect</Text>
                  <Text style={[styles.deliveryPaymentValue, { color: '#F2CA50' }]}>
                    {activeTrip.paymentMode === 'COD' ? `₹${activeTrip.fareAmount.toFixed(2)}` : '₹0.00'}
                  </Text>
                </View>
                <View style={styles.deliveryItemDivider} />
                <View style={styles.deliveryPaymentRow}>
                  <Text style={styles.deliveryPaymentLabel}>Status</Text>
                  <Text style={[
                    styles.deliveryPaymentStatus,
                    (activeTrip.paymentMode === 'COD' && !cashCollected) && {
                      color: '#EF4444',
                      backgroundColor: 'rgba(239, 68, 68, 0.1)'
                    }
                  ]}>
                    {activeTrip.paymentMode === 'COD' ? (cashCollected ? 'PAID' : 'UNPAID') : 'PAID'}
                  </Text>
                </View>
              </View>
            )}
          </View>
        </ScrollView>

        {/* Bottom CTA container with custom bottom padding */}
        <View style={[styles.deliveryCTAContainer, { paddingBottom: 12 }]}>
          <TouchableOpacity
            style={[
              styles.deliveryCompleteBtn,
              (activeTrip.paymentMode === 'COD' && !cashCollected) && { backgroundColor: '#3A3830' }
            ]}
            activeOpacity={0.9}
            disabled={activeTrip.paymentMode === 'COD' && !cashCollected}
            onPress={() => {
              setShowEarningsScreen(true);
              advanceTripStatus();
            }}
          >
            <Ionicons 
              name="checkmark-circle" 
              size={22} 
              color={(activeTrip.paymentMode === 'COD' && !cashCollected) ? '#7E7C75' : '#0E0C0A'} 
            />
            <Text style={[
              styles.deliveryCompleteBtnText,
              (activeTrip.paymentMode === 'COD' && !cashCollected) && { color: '#7E7C75' }
            ]}>
              {(activeTrip.paymentMode === 'COD' && !cashCollected) ? 'Collect Cash First (Step 1)' : 'Delivery Complete'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Collect Cash Modal */}
        <Modal
          visible={showCollectCashModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => {
            if (paymentStep === 'passcode_entry') {
              setPaymentStep('payment_options');
            } else {
              setShowCollectCashModal(false);
            }
          }}
        >
          <SafeAreaView style={styles.passcodeContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />
            
            {paymentStep === 'payment_options' ? (
              <ScrollView contentContainerStyle={styles.paymentModalScroll}>
                {/* Header row with back/close button */}
                <View style={styles.paymentHeader}>
                  <TouchableOpacity 
                    onPress={() => setShowCollectCashModal(false)}
                    style={styles.paymentCloseBtn}
                  >
                    <Ionicons name="close-outline" size={24} color="#FFF" />
                  </TouchableOpacity>
                  <Text style={styles.paymentHeaderTitle}>
                    PAY TO <Text style={{ color: '#F2CA50' }}>{activeTrip ? (activeTrip.pickupAddress.split(',')[0] || 'MYQURO').toUpperCase() : 'MYQURO'}</Text>
                  </Text>
                  {/* Empty view to balance layout */}
                  <View style={{ width: 40 }} />
                </View>

                {/* Big Fare Amount */}
                <Text style={styles.paymentAmountText}>₹{activeTrip.fareAmount.toFixed(0)}</Text>

                {/* Card 1: Ask customer to scan QR */}
                <View style={styles.paymentCard}>
                  <View style={styles.qrIconCircle}>
                    <Ionicons name="qr-code-outline" size={20} color="#F2CA50" />
                  </View>

                  <Text style={styles.qrCardTitle}>Ask customer to scan QR</Text>

                  {/* BHIM UPI Row */}
                  <View style={styles.upiRowLogos}>
                    <Text style={styles.bhimLogoText}>BHIM</Text>
                    <View style={styles.upiSlash} />
                    <Image
                      source={require('../../assets/images/upi_logo.png')}
                      style={styles.upiLogoImg}
                      resizeMode="contain"
                    />
                  </View>

                  <Text style={styles.upiSubtext}>pay using any UPI app</Text>

                  {/* QR Code Outer Frame with Gold Corners */}
                  <View style={styles.qrFrameContainer}>
                    <View style={[styles.qrCorner, { top: -2, left: -2, borderTopWidth: 2, borderLeftWidth: 2 }]} />
                    <View style={[styles.qrCorner, { top: -2, right: -2, borderTopWidth: 2, borderRightWidth: 2 }]} />
                    <View style={[styles.qrCorner, { bottom: -2, left: -2, borderBottomWidth: 2, borderLeftWidth: 2 }]} />
                    <View style={[styles.qrCorner, { bottom: -2, right: -2, borderBottomWidth: 2, borderRightWidth: 2 }]} />

                    <View style={styles.qrContentBox}>
                      {qrGenerated ? (
                        <View style={{ backgroundColor: '#FFFFFF', padding: 8, borderRadius: 8 }}>
                          <QRCode
                            value={`upi://pay?pa=myquro@upi&pn=MyQuro&am=${activeTrip.fareAmount}&cu=INR`}
                            size={120}
                            color="#000"
                            backgroundColor="#FFF"
                          />
                        </View>
                      ) : (
                        <View style={styles.blurredQrContainer}>
                          <Ionicons name="qr-code" size={100} color="#333" style={{ opacity: 0.12 }} />
                          <View style={styles.blurOverlay} />
                        </View>
                      )}
                    </View>
                  </View>

                  {/* Generate QR Code Button */}
                  <TouchableOpacity
                    style={[styles.generateQrBtn, qrGenerated && styles.generateQrBtnActive]}
                    activeOpacity={0.8}
                    onPress={() => setQrGenerated(true)}
                    disabled={qrGenerated}
                  >
                    <Ionicons name={qrGenerated ? "checkmark-circle" : "qr-code-outline"} size={18} color="#000" style={{ marginRight: 8 }} />
                    <Text style={styles.generateQrBtnText}>
                      {qrGenerated ? 'QR Code Generated' : 'Generate QR Code'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* Centered 'or' separator */}
                <View style={styles.paymentOrRow}>
                  <View style={styles.paymentOrLine} />
                  <Text style={styles.paymentOrText}>or</Text>
                  <View style={styles.paymentOrLine} />
                </View>

                {/* Card 2: Customer does not want to pay online */}
                <View style={styles.paymentCard}>
                  <View style={styles.walletIconCircle}>
                    <Ionicons name="wallet-outline" size={20} color="#F2CA50" />
                  </View>

                  <Text style={styles.walletCardText}>Customer does not want to pay online?</Text>

                  {/* Collect Cash Outline Button */}
                  <TouchableOpacity
                    style={styles.collectCashOutlineBtn}
                    activeOpacity={0.8}
                    onPress={() => setPaymentStep('collect_cash_entry')}
                  >
                    <Ionicons name="cash-outline" size={18} color="#F2CA50" style={{ marginRight: 8 }} />
                    <Text style={styles.collectCashOutlineBtnText}>Collect Cash</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : paymentStep === 'collect_cash_entry' ? (
              // Step 2: Cash entry amount confirmation
              <ScrollView contentContainerStyle={styles.paymentModalScroll}>
                {/* Header row with back arrow and Title */}
                <View style={styles.paymentHeader}>
                  <TouchableOpacity 
                    onPress={() => setPaymentStep('payment_options')}
                    style={styles.paymentCloseBtn}
                  >
                    <Ionicons name="arrow-back" size={24} color="#F2CA50" />
                  </TouchableOpacity>
                  <Text style={styles.paymentHeaderTitle}>Collect Cash</Text>
                  {/* Empty view to balance layout */}
                  <View style={{ width: 40 }} />
                </View>

                {/* Amount to collect text label */}
                <Text style={styles.amountToCollectLabel}>Amount to collect</Text>

                {/* Split fare amount: ₹ is gold, 80 is white */}
                <View style={styles.amountValueRow}>
                  <Text style={styles.amountCurrencySymbol}>₹</Text>
                  <Text style={styles.amountValueDigits}>{activeTrip.fareAmount.toFixed(0)}</Text>
                </View>

                {/* Inputs Container */}
                <View style={styles.cashInputsContainer}>
                  {/* Input 1: Enter collected amount */}
                  <View style={styles.cashInputRow}>
                    <Ionicons name="wallet-outline" size={20} color="#F2CA50" />
                    <TextInput
                      style={styles.cashTextInput}
                      placeholder="Enter collected amount"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={enteredAmount1}
                      onChangeText={setEnteredAmount1}
                    />
                  </View>

                  {/* Input 2: Re enter amount */}
                  <View style={styles.cashInputRow}>
                    <Ionicons name="reload-outline" size={20} color="#F2CA50" />
                    <TextInput
                      style={styles.cashTextInput}
                      placeholder="Re enter amount"
                      placeholderTextColor="#666"
                      keyboardType="numeric"
                      value={enteredAmount2}
                      onChangeText={setEnteredAmount2}
                    />
                  </View>
                </View>

                {/* Cash Collected Main Action Button */}
                <View style={{ paddingHorizontal: 20, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[
                      styles.cashCollectedBtn,
                      (!enteredAmount1 || !enteredAmount2) && { opacity: 0.6 }
                    ]}
                    activeOpacity={0.8}
                    onPress={() => {
                      const expectedAmount = activeTrip.fareAmount.toFixed(0);
                      if (enteredAmount1 !== expectedAmount || enteredAmount2 !== expectedAmount) {
                        showAlertModal({
                          type: 'warning',
                          title: 'Amount Mismatch',
                          subtitle: `The entered amount must match the fare amount of ₹${expectedAmount}.`,
                          primaryButtonText: 'Okay',
                          onPrimaryPress: hideAlertModal,
                        });
                        return;
                      }
                      setPaymentStep('passcode_entry');
                    }}
                  >
                    <Ionicons name="wallet" size={20} color="#000" style={{ marginRight: 8 }} />
                    <Text style={styles.cashCollectedBtnText}>Cash Collected</Text>
                  </TouchableOpacity>
                </View>

                {/* Centered 'or' separator */}
                <View style={styles.paymentOrRow}>
                  <View style={styles.paymentOrLine} />
                  <Text style={styles.paymentOrText}>or</Text>
                  <View style={styles.paymentOrLine} />
                </View>

                {/* Secondary Button: Show QR to collect cash */}
                <View style={{ paddingHorizontal: 20 }}>
                  <TouchableOpacity
                    style={styles.showQrOutlineBtn}
                    activeOpacity={0.8}
                    onPress={() => setPaymentStep('payment_options')}
                  >
                    <Ionicons name="qr-code-outline" size={20} color="#F2CA50" style={{ marginRight: 8 }} />
                    <Text style={styles.showQrOutlineBtnText}>Show QR to collect cash</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            ) : (
              // Step 3: Passcode OTP screen
              <>
                {/* Header row with back/close button */}
                <View style={styles.passcodeHeader}>
                  <TouchableOpacity 
                    onPress={() => setPaymentStep('collect_cash_entry')}
                    style={styles.passcodeCloseBtn}
                  >
                    <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
                  </TouchableOpacity>
                </View>

                {/* Collect cash banner */}
                <View style={styles.passcodeBanner}>
                  <Ionicons name="cash-outline" size={18} color="#F2CA50" />
                  <Text style={styles.passcodeBannerText}>Collect ₹{activeTrip.fareAmount.toFixed(2)} Cash from Customer!</Text>
                </View>

                {/* Main content */}
                <View style={styles.passcodeContent}>
                  <Text style={styles.passcodeSub}>Enter cash collection confirmation code (OTP: 54321)</Text>
                  <Text style={styles.passcodeOrderNum}>Order ID: {activeTrip ? getOrderBarcode(activeTrip.id) : '191917969998687'}</Text>

                  {/* OTP Slots Row */}
                  <View style={styles.otpRow}>
                    {Array.from({ length: 5 }).map((_, idx) => {
                      const char = collectCashPasscode[idx] || '';
                      const isActive = collectCashPasscode.length === idx;
                      return (
                        <View key={idx} style={styles.otpCol}>
                          <Text style={styles.otpChar}>{char}</Text>
                          <View style={[
                            styles.otpLine,
                            isActive ? styles.otpLineActive : styles.otpLineInactive
                          ]} />
                        </View>
                      );
                    })}
                  </View>
                </View>

                {/* Custom numeric keypad */}
                <View style={styles.keyboardContainer}>
                  {/* Row 1 */}
                  <View style={styles.keyboardRow}>
                    {renderCashKey('1')}
                    {renderCashKey('2')}
                    {renderCashKey('3')}
                    {renderCashKey('backspace')}
                  </View>
                  {/* Row 2 */}
                  <View style={styles.keyboardRow}>
                    {renderCashKey('4')}
                    {renderCashKey('5')}
                    {renderCashKey('6')}
                    {renderCashKey('done')}
                  </View>
                  {/* Row 3 */}
                  <View style={styles.keyboardRow}>
                    {renderCashKey('7')}
                    {renderCashKey('8')}
                    {renderCashKey('9')}
                    {renderCashKey('-')}
                  </View>
                  <View style={styles.keyboardRow}>
                    {renderCashKey('empty')}
                    {renderCashKey('0')}
                    {renderCashKey('empty')}
                    {renderCashKey(',')}
                  </View>
                </View>
              </>
            )}
          </SafeAreaView>
        </Modal>
      </View>
    );
  }

  if (activeTrip.status === 'ARRIVED_AT_PICKUP') {
    return (
      <View style={styles.arrivedContainer}>
        <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

        <Modal
          visible={showPasscodeModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowPasscodeModal(false)}
        >
          <SafeAreaView style={styles.passcodeContainer}>
            <StatusBar barStyle="light-content" backgroundColor="#000000" />
            
            {/* Header row with back/close button */}
            <View style={styles.passcodeHeader}>
              <TouchableOpacity 
                onPress={() => setShowPasscodeModal(false)}
                style={styles.passcodeCloseBtn}
              >
                <Ionicons name="close-outline" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>

            {/* Ask restaurant banner */}
            <View style={styles.passcodeBanner}>
              <Ionicons name="information-circle" size={18} color="#F2CA50" />
              <Text style={styles.passcodeBannerText}>Ask restaurant to share passcode!</Text>
            </View>

            {/* Main content */}
            <View style={styles.passcodeContent}>
              <Text style={styles.passcodeSub}>Enter passcode for order (OTP: {activeTrip ? getOrderPasscode(activeTrip.id) : '12345'})</Text>
              <Text style={styles.passcodeOrderNum}>{activeTrip ? getOrderBarcode(activeTrip.id) : '191917969998687'}</Text>

              {/* OTP Slots Row */}
              <View style={styles.otpRow}>
                {Array.from({ length: 5 }).map((_, idx) => {
                  const char = passcode[idx] || '';
                  const isActive = passcode.length === idx;
                  return (
                    <View key={idx} style={styles.otpCol}>
                      <Text style={styles.otpChar}>{char}</Text>
                      <View style={[
                        styles.otpLine,
                        isActive ? styles.otpLineActive : styles.otpLineInactive
                      ]} />
                    </View>
                  );
                })}
              </View>

              {/* Divider or */}
              <View style={styles.passcodeOrRow}>
                <View style={styles.passcodeOrLine} />
                <Text style={styles.passcodeOrText}>or</Text>
                <View style={styles.passcodeOrLine} />
              </View>

              {/* Scan Bar Code Button */}
              <TouchableOpacity 
                style={styles.scanBarcodeBtn} 
                activeOpacity={0.8}
                onPress={() => {
                  setScannerMode('scan');
                  setShowPasscodeModal(false);
                  setTimeout(() => {
                    setShowScannerModal(true);
                  }, 300);
                }}
              >
                <Ionicons name="scan-outline" size={18} color="#F2CA50" />
                <Text style={styles.scanBarcodeText}>Scan Bar Code</Text>
              </TouchableOpacity>

              {/* Need Help link */}
              <TouchableOpacity 
                style={{ marginTop: 24 }} 
                activeOpacity={0.8}
                onPress={() => {
                  setScannerMode('help');
                  setShowPasscodeModal(false);
                  setTimeout(() => {
                    setShowScannerModal(true);
                  }, 300);
                }}
              >
                <Text style={styles.needHelpText}>Need Help?  <Ionicons name="chevron-forward" size={12} color="#F2CA50" /></Text>
              </TouchableOpacity>
            </View>

            {/* Custom numeric keypad */}
            <View style={styles.keyboardContainer}>
              {/* Row 1 */}
              <View style={styles.keyboardRow}>
                {renderKey('1')}
                {renderKey('2')}
                {renderKey('3')}
                {renderKey('backspace')}
              </View>
              {/* Row 2 */}
              <View style={styles.keyboardRow}>
                {renderKey('4')}
                {renderKey('5')}
                {renderKey('6')}
                {renderKey('done')}
              </View>
              {/* Row 3 */}
              <View style={styles.keyboardRow}>
                {renderKey('7')}
                {renderKey('8')}
                {renderKey('9')}
                {renderKey('-')}
              </View>
              <View style={styles.keyboardRow}>
                {renderKey('empty')}
                {renderKey('0')}
                {renderKey('empty')}
                {renderKey(',')}
              </View>
            </View>
          </SafeAreaView>
        </Modal>

        <Modal
          visible={showScannerModal}
          animationType="slide"
          transparent={false}
          onRequestClose={() => setShowScannerModal(false)}
        >
          <View style={styles.scannerContainer}>
            {/* Camera Viewfinder Screen Area (Top Portion) */}
            <View style={[
              styles.cameraViewport,
              scannerMode === 'scan' && { flex: 1 } // Occupies the whole screen in scan mode
            ]}>
              {!permission ? (
                <View style={styles.cameraPermissionOverlay}>
                  <ActivityIndicator size="small" color="#F2CA50" />
                </View>
              ) : !permission.granted ? (
                <View style={styles.cameraPermissionOverlay}>
                  <Ionicons name="camera-outline" size={48} color="#F2CA50" style={{ marginBottom: 12 }} />
                  <Text style={styles.cameraPermissionTitle}>Camera Permission Required</Text>
                  <Text style={styles.cameraPermissionSubtitle}>
                    We need access to your camera to scan package barcodes in real time.
                  </Text>
                  <TouchableOpacity style={styles.cameraPermissionBtn} onPress={requestPermission}>
                    <Text style={styles.cameraPermissionBtnText}>Grant Permission</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <CameraView
                  style={StyleSheet.absoluteFillObject}
                  facing="back"
                  enableTorch={flashOn}
                  barcodeScannerSettings={{
                    barcodeTypes: ['qr', 'ean13', 'code128', 'code39'],
                  }}
                  onBarcodeScanned={handleBarcodeScanned}
                />
              )}

              <StatusBar barStyle="light-content" backgroundColor="#000000" />
              
              {/* Top Row with Back and Flashlight buttons */}
              <View style={styles.scannerTopRow}>
                <TouchableOpacity 
                  onPress={() => {
                    setShowScannerModal(false);
                    setTimeout(() => {
                      setShowPasscodeModal(true);
                    }, 300);
                  }}
                  style={styles.scannerBackBtn}
                >
                  <Ionicons name="arrow-back-outline" size={24} color="#FFF" />
                </TouchableOpacity>

                <TouchableOpacity 
                  onPress={() => setFlashOn(!flashOn)}
                  style={[
                    styles.scannerFlashBtn,
                    flashOn && { backgroundColor: '#F2CA50', borderColor: '#F2CA50' }
                  ]}
                >
                  <Ionicons 
                    name={flashOn ? "bulb" : "bulb-outline"} 
                    size={22} 
                    color={flashOn ? "#0E0C0A" : "#F2CA50"} 
                  />
                </TouchableOpacity>
              </View>

              {/* Viewfinder square frame */}
              <View style={styles.viewfinderContainer}>
                {/* Yellow viewfinder borders with glowing scan animation */}
                <View style={styles.viewfinderFrame}>
                  {/* Top-left corner */}
                  <View style={[styles.corner, styles.topLeftCorner]} />
                  {/* Top-right corner */}
                  <View style={[styles.corner, styles.topRightCorner]} />
                  {/* Bottom-left corner */}
                  <View style={[styles.corner, styles.bottomLeftCorner]} />
                  {/* Bottom-right corner */}
                  <View style={[styles.corner, styles.bottomRightCorner]} />

                  {/* Pulsating horizontal laser scan line */}
                  <Animated.View style={[
                    styles.laserLine, 
                    { 
                      transform: [{ 
                        translateY: scanAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0, 194]
                        }) 
                      }] 
                    }
                  ]} />
                </View>
                <Text style={styles.scanInstructionText}>
                  {scannerMode === 'scan' ? 'Align barcode/QR code within frame' : 'Scan the code to report issue'}
                </Text>
              </View>

              {/* In Scan Mode, render a clean bottom panel over the viewport */}
              {scannerMode === 'scan' && (
                <View style={styles.cleanScanBottomPanel}>
                  <ActivityIndicator size="small" color="#F2CA50" style={{ marginRight: 8 }} />
                  <Text style={styles.cleanScanBottomText}>Scanning order barcode...</Text>
                  <TouchableOpacity 
                    style={styles.cleanScanCancelBtn}
                    onPress={() => {
                      setShowScannerModal(false);
                      setTimeout(() => {
                        setShowPasscodeModal(true);
                      }, 300);
                    }}
                  >
                    <Text style={styles.cleanScanCancelText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Bottom Sheet Modal Area (Lower Portion) - only show in help mode */}
            {scannerMode === 'help' && (
              <View style={styles.scannerBottomSheet}>
                <View style={styles.issueTopGlow} />

                {/* Shield Icon Badge */}
                <View style={styles.issueShieldCircle}>
                  <Ionicons name="help" size={32} color="#F2CA50" />
                </View>

                {/* Text headers */}
                <Text style={styles.issueTitleLabel}>What is the issue for order id</Text>
                <Text style={styles.issueOrderId}>{activeTrip ? getOrderBarcode(activeTrip.id) : '191917969998687'}</Text>

                {/* Warning box */}
                <View style={styles.issueWarningBox}>
                  <Text style={styles.issueWarningText}>
                    Confirm the Order ID before pickup to{' '}
                    <Text style={{ color: '#F2CA50', fontWeight: '700' }}>avoid penalty.</Text>
                  </Text>
                  <View style={styles.issueWarningRight}>
                    <Ionicons name="hand-left-outline" size={20} color="#F2CA50" />
                    <Text style={styles.issueWarningExclamation}>!</Text>
                  </View>
                </View>

                {/* Options Selector List */}
                <View style={styles.issueOptionsGroup}>
                  {/* Option 1 */}
                  <TouchableOpacity
                    style={styles.issueOptionRow}
                    activeOpacity={0.8}
                    onPress={() => setSelectedIssue('barcode')}
                  >
                    <View style={styles.issueIconCircle}>
                      <Ionicons name="barcode-outline" size={18} color="#F2CA50" />
                    </View>
                    <Text style={styles.issueOptionText}>Barcode/OTP is not working</Text>
                    <View style={styles.radioOuter}>
                      {selectedIssue === 'barcode' && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>

                  <View style={styles.issueDivider} />

                  {/* Option 2 */}
                  <TouchableOpacity
                    style={styles.issueOptionRow}
                    activeOpacity={0.8}
                    onPress={() => setSelectedIssue('bill')}
                  >
                    <View style={styles.issueIconCircle}>
                      <Ionicons name="document-text-outline" size={18} color="#F2CA50" />
                    </View>
                    <Text style={styles.issueOptionText}>Bill is not available</Text>
                    <View style={styles.radioOuter}>
                      {selectedIssue === 'bill' && <View style={styles.radioInner} />}
                    </View>
                  </TouchableOpacity>
                </View>

                {/* Action buttons */}
                <TouchableOpacity
                  style={styles.issueNextBtn}
                  activeOpacity={0.9}
                  onPress={() => {
                    setVerified1(true);
                    setVerified2(true);
                    setShowScannerModal(false);
                    setShowPasscodeModal(false);
                  }}
                >
                  <Text style={styles.issueNextText}>Next</Text>
                  <Ionicons name="arrow-forward-outline" size={20} color="#0E0C0A" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.issueCancelBtn}
                  activeOpacity={0.8}
                  onPress={() => {
                    setShowScannerModal(false);
                    setTimeout(() => {
                      setShowPasscodeModal(true);
                    }, 300);
                  }}
                >
                  <Text style={styles.issueCancelText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </Modal>
        
        {/* Floating Confetti Sparkles in background */}
        <Text style={[styles.sparkle, { top: '6%', left: '8%' }]}>✦</Text>
        <Text style={[styles.sparkle, { top: '14%', left: '38%', fontSize: 9, opacity: 0.5 }]}>✦</Text>
        <Text style={[styles.sparkle, { top: '9%', left: '88%', fontSize: 11 }]}>✦</Text>
        <Text style={[styles.sparkle, { top: '24%', left: '44%', fontSize: 7, opacity: 0.6 }]}>✦</Text>
        <Text style={[styles.sparkle, { top: '28%', left: '12%', fontSize: 10, opacity: 0.4 }]}>✦</Text>
        
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingBottom: 84 }} showsVerticalScrollIndicator={false}>
          {/* Top Header Section */}
          <View style={[styles.arrivedHeader, { paddingTop: Math.max(insets.top + 16, 32) }]}>
            <View style={styles.arrivedHeaderLeft}>
              <Text style={styles.arrivedTitle}>Order is ready</Text>
              <Text style={styles.arrivedTitle}>
                for <Text style={{ color: '#F2CA50' }}>pickup!</Text>
              </Text>
              
              <TouchableOpacity style={styles.orderNotReadyLink} activeOpacity={0.7}>
                <Text style={styles.orderNotReadyText}>Order not ready?</Text>
                <Ionicons name="chevron-forward" size={12} color="#F2CA50" />
              </TouchableOpacity>
            </View>

            {/* Illustration */}
            <View style={styles.illustrationContainer}>
              <View style={styles.glowCircle} />
              <Image
                source={require('../../assets/images/3d_first_order_bag.png')}
                style={styles.illustrationImg}
              />
            </View>
          </View>

          {/* Bottom Card details */}
          <View style={styles.arrivedSheet}>
            {/* Top gold bar handle */}
            <View style={styles.goldDragBar} />

            {/* Store details row */}
            <View style={styles.arrivedStoreRow}>
              <View style={styles.arrivedPotIconCircle}>
                <Ionicons name="restaurant-outline" size={14} color="#F2CA50" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.arrivedLabel}>Pickup from</Text>
                <Text style={styles.arrivedPhoneText}>
                  +91 179 9999 <Text style={{ color: '#F2CA50' }}>8687</Text>
                </Text>
                <Text style={styles.arrivedStoreName}>{displayTitle}</Text>
              </View>
            </View>

            {/* ACCORDION 1: Verify order */}
            <View style={styles.accordionCard}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={0.8}
                onPress={() => setVerifyExpanded(!verifyExpanded)}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                  <View style={styles.stepBadge}>
                    <Text style={styles.stepBadgeText}>STEP 1</Text>
                  </View>
                  <Text style={styles.accordionTitle}>Verify order</Text>
                </View>
                <Ionicons
                  name={verifyExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#F2CA50"
                />
              </TouchableOpacity>

              {verifyExpanded && (
                <View style={styles.expandedContent}>
                  <Text style={styles.verifySubtext}>Please verify order before pickup</Text>          
                  <TouchableOpacity
                    style={[
                      styles.innerVerifyBtn,
                      (verified1 && verified2)
                        ? { backgroundColor: '#10B981', borderColor: '#10B981' }
                        : styles.innerVerifyBtnActive
                    ]}
                    activeOpacity={0.8}
                    disabled={verified1 && verified2}
                    onPress={() => setShowPasscodeModal(true)}
                  >
                    <Text style={[
                      styles.innerVerifyBtnText,
                      { color: (verified1 && verified2) ? '#FFFFFF' : '#0E0C0A' }
                    ]}>
                      {(verified1 && verified2) ? 'Verified ✓' : 'Verify Order'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* ACCORDION 2: Item Details */}
            <View style={styles.accordionCard}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={0.8}
                onPress={() => setItemsExpanded(!itemsExpanded)}
              >
                <Text style={styles.accordionTitle}>Item Details</Text>
                <Ionicons
                  name={itemsExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#F2CA50"
                />
              </TouchableOpacity>

              {itemsExpanded && (
                <View style={styles.expandedContent}>
                  {(activeTrip.items && activeTrip.items.length > 0) ? (
                    activeTrip.items.map((item, idx) => (
                      <React.Fragment key={`pickup-item-${idx}`}>
                        <View style={styles.itemRow}>
                          <Text style={styles.itemName}>{item.name}</Text>
                          <Text style={styles.itemQty}>{item.qty}x</Text>
                        </View>
                        {idx < (activeTrip.items?.length || 0) - 1 && (
                          <View style={styles.dividerLight} />
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <View style={styles.itemRow}>
                      <Text style={styles.itemName}>Food Order Items</Text>
                      <Text style={styles.itemQty}>1x</Text>
                    </View>
                  )}
                </View>
              )}
            </View>

            {/* ACCORDION 3: Pickup Details */}
            <View style={styles.accordionCard}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={0.8}
                onPress={() => setPickupExpanded(!pickupExpanded)}
              >
                <Text style={styles.accordionTitle}>Pickup Details</Text>
                <Ionicons
                  name={pickupExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#F2CA50"
                />
              </TouchableOpacity>

              {pickupExpanded && (
                <View style={styles.expandedContent}>
                  <Text style={styles.detailsStoreName}>{displayTitle}</Text>
                  <Text style={styles.detailsAddress}>{displayAddress}</Text>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8} onPress={handleMaps}>
                      <Ionicons name="trending-up" size={14} color="#F2CA50" />
                      <Text style={styles.outlineBtnText}>Navigate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.outlineBtn} activeOpacity={0.8} onPress={handleCall}>
                      <Ionicons name="call" size={14} color="#F2CA50" />
                      <Text style={styles.outlineBtnText}>Call Restaurant</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>

            {/* ACCORDION 4: Delivery Details */}
            <View style={styles.accordionCard}>
              <TouchableOpacity
                style={styles.accordionHeader}
                activeOpacity={0.8}
                onPress={() => setDeliveryExpanded(!deliveryExpanded)}
              >
                <Text style={styles.accordionTitle}>Delivery Details</Text>
                <Ionicons
                  name={deliveryExpanded ? 'chevron-up' : 'chevron-down'}
                  size={16}
                  color="#F2CA50"
                />
              </TouchableOpacity>

              {deliveryExpanded && (
                <View style={styles.expandedContent}>
                  <Text style={styles.detailsStoreName}>{activeTrip.customerName}</Text>
                  <Text style={styles.detailsAddress}>{activeTrip.dropoffAddress}</Text>

                  <View style={styles.actionButtonsRow}>
                    <TouchableOpacity
                      style={styles.outlineBtn}
                      activeOpacity={0.8}
                      onPress={() => handleMapsTo(activeTrip.dropoffCoords.latitude, activeTrip.dropoffCoords.longitude)}
                    >
                      <Ionicons name="trending-up" size={14} color="#F2CA50" />
                      <Text style={styles.outlineBtnText}>Navigate</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.outlineBtn}
                      activeOpacity={0.8}
                      onPress={() => handleCallTo(activeTrip.customerPhone)}
                    >
                      <Ionicons name="call" size={14} color="#F2CA50" />
                      <Text style={styles.outlineBtnText}>Call Customer</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Bottom swipe/CTA button overlay */}
        <View style={[styles.bottomCTAContainer, { paddingBottom: 12 }]}>
          <TouchableOpacity
            style={[
              styles.startTripCTA,
              !(verified1 && verified2) && { backgroundColor: '#2C2C2E', borderColor: '#3A3A3C' }
            ]}
            activeOpacity={(verified1 && verified2) ? 0.9 : 1}
            disabled={!(verified1 && verified2)}
            onPress={advanceTripStatus}
          >
            <Text style={[
              styles.startTripCTAText,
              !(verified1 && verified2) && { color: '#6C6C70' }
            ]}>Pickup Complete</Text>
            <Ionicons
              name="arrow-forward-outline"
              size={18}
              color={(verified1 && verified2) ? '#0E0C0A' : '#6C6C70'}
            />
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

      {/* Ola Maps Webview - Default Ola Light Standard Theme */}
      {!isMapReady ? (
        <View style={{ flex: 1, backgroundColor: '#0E0C0A', justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#F2CA50" />
        </View>
      ) : (
        <WebView
          source={{
            html: buildActiveTripMapHtml(
              OLA_MAPS_API_KEY,
              riderLocation.latitude,
              riderLocation.longitude,
              destLat,
              destLng,
              displayTitle,
              isNavOrArrived,
              route,
            ),
          }}
          style={StyleSheet.absoluteFillObject}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
        />
      )}

      {/* TOP HEADER CONTROLS */}
      <View style={[styles.topBarOverlay, { paddingTop: Math.max(insets.top + 6, 20) }]}>
        {/* Left Circular Drawer Icon */}
        <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8} onPress={() => router.replace('/(tabs)')}>
          <Ionicons name="menu-outline" size={22} color="#FFFFFF" />
        </TouchableOpacity>

        {/* Reach By Bubble */}
        <View style={styles.reachBubble}>
          <Text style={styles.reachBubbleText}>
            Reach by <Text style={styles.reachTimeGold}>{targetTime}</Text>
          </Text>
        </View>

        {/* Right Buttons: Notifications & Help */}
        <View style={styles.rightGroup}>
          <TouchableOpacity style={styles.circleBtn} activeOpacity={0.8}>
            <Ionicons name="notifications-outline" size={20} color="#FFFFFF" />
            <View style={styles.bellIndicatorDot} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.helpPill}
            activeOpacity={0.8}
            onPress={() => router.push('/help-support')}
          >
            <Ionicons name="headset-outline" size={14} color="#FFFFFF" />
            <Text style={styles.helpText}>Help</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* SLIDE-UP BOTTOM SHEET */}
      <View style={[styles.bottomSheet, { paddingBottom: Math.max(insets.bottom + 8, 20) }]}>
        {/* Drag handle */}
        <View style={styles.dragHandle} />

        <View style={styles.contentRow}>
          {/* Left Details */}
          <View style={{ flex: 1 }}>
            <View style={styles.headerLabelRow}>
              <View style={styles.potIconCircle}>
                <Ionicons name={isNavOrArrived ? 'restaurant-outline' : 'person-outline'} size={13} color="#F2CA50" />
              </View>
              <Text style={styles.headerLabelText}>{titleHeader}</Text>
            </View>
            <Text style={styles.storeNameText} numberOfLines={1}>
              {displayTitle}
            </Text>
          </View>

          {/* Right MAPS directions button */}
          <TouchableOpacity style={styles.mapsDirectionBtn} activeOpacity={0.8} onPress={handleMaps}>
            <View style={styles.mapsArrowCircle}>
              <Ionicons name="navigate" size={16} color="#F2CA50" />
            </View>
            <Text style={styles.mapsBtnText}>MAPS</Text>
          </TouchableOpacity>
        </View>

        {/* Address */}
        <Text style={styles.addressText} numberOfLines={2}>
          {displayAddress}
        </Text>

        <View style={styles.divider} />

        {/* Call & Chat Sub Actions Row */}
        <View style={styles.actionsRow}>
          <TouchableOpacity style={styles.callRowBtn} activeOpacity={0.8} onPress={handleCall}>
            <View style={styles.yellowIconBorder}>
              <Ionicons name="call" size={14} color="#F2CA50" />
            </View>
            <Text style={styles.callRowText}>
              Call {isNavOrArrived ? 'Restaurant' : 'Customer'}
            </Text>
          </TouchableOpacity>

          {!isNavOrArrived && (
            <TouchableOpacity
              style={styles.callRowBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/chat')}
            >
              <View style={styles.yellowIconBorder}>
                <Ionicons name="chatbubble-ellipses" size={14} color="#F2CA50" />
              </View>
              <Text style={styles.callRowText}>Chat with Customer</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Main CTA Button */}
        <TouchableOpacity 
          style={styles.actionBtn} 
          activeOpacity={0.85} 
          onPress={() => {
            if (activeTrip.status === 'TRIP_IN_PROGRESS') {
              setHasReachedDelivery(true);
            } else {
              advanceTripStatus();
            }
          }}
        >
          <Text style={styles.actionBtnText}>{getBtnText()}</Text>
        </TouchableOpacity>

        {/* Cancel option at bottom */}
        <TouchableOpacity style={styles.cancelTripBtn} activeOpacity={0.8} onPress={cancelActiveTrip}>
          <Text style={styles.cancelTripText}>Cancel Order / Trip</Text>
        </TouchableOpacity>
      </View>

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
};

// ─── Styles ──────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#E5E7EB',
  },
  // Top Header Overlay
  topBarOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  circleBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 12, 10, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  bellIndicatorDot: {
    position: 'absolute',
    top: 11,
    right: 11,
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#F2CA50',
  },
  reachBubble: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(14, 12, 10, 0.85)',
    borderWidth: 1.5,
    borderColor: '#3a342c',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 8,
  },
  reachBubbleText: {
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  reachTimeGold: {
    color: '#F2CA50',
    fontWeight: '800',
  },
  rightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  helpPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 22,
    backgroundColor: 'rgba(14, 12, 10, 0.85)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    elevation: 8,
  },
  helpText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  // Bottom Sheet
  bottomSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 100,
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
    shadowOpacity: 0.55,
    shadowRadius: 16,
    elevation: 25,
  },
  dragHandle: {
    width: 38,
    height: 4,
    backgroundColor: '#4A423C',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  potIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1B18',
  },
  headerLabelText: {
    color: '#F2CA50',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  storeNameText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  mapsDirectionBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: '#3a342c',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    backgroundColor: '#161311',
    minWidth: 70,
  },
  mapsArrowCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#26221E',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  mapsBtnText: {
    color: '#A6A6A6',
    fontSize: 10,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  addressText: {
    color: '#A6A6A6',
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    lineHeight: 18,
    marginTop: 8,
    textTransform: 'uppercase',
  },
  divider: {
    height: 1,
    backgroundColor: '#1E1B18',
    marginVertical: 14,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  callRowBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  yellowIconBorder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1B18',
  },
  callRowText: {
    color: '#F2CA50',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  actionBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: {
    color: '#0E0C0A',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  cancelTripBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 4,
  },
  cancelTripText: {
    color: '#EF4444',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    textDecorationLine: 'underline',
  },
  // Arrived At Pickup Screen Styles
  arrivedContainer: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  sparkle: {
    position: 'absolute',
    color: '#F2CA50',
    fontSize: 14,
    zIndex: 10,
  },
  arrivedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
    marginBottom: 10,
  },
  arrivedHeaderLeft: {
    flex: 1,
  },
  arrivedTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    lineHeight: 34,
  },
  orderNotReadyLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 10,
  },
  orderNotReadyText: {
    color: '#F2CA50',
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    textDecorationLine: 'underline',
  },
  illustrationContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  glowCircle: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: '#F2CA50',
    opacity: 0.15,
    shadowColor: '#F2CA50',
    shadowRadius: 30,
    shadowOpacity: 0.6,
  },
  illustrationImg: {
    width: 130,
    height: 130,
    resizeMode: 'contain',
  },
  arrivedSheet: {
    backgroundColor: '#141416',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
    borderWidth: 1,
    borderColor: '#222',
  },
  goldDragBar: {
    width: 48,
    height: 5,
    backgroundColor: '#F2CA50',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginBottom: 20,
    opacity: 0.95,
  },
  arrivedStoreRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  arrivedPotIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1B18',
    marginTop: 2,
  },
  arrivedLabel: {
    color: '#A6A6A6',
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    textTransform: 'uppercase',
  },
  arrivedPhoneText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginTop: 2,
  },
  arrivedStoreName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginTop: 4,
  },
  accordionCard: {
    backgroundColor: '#1C1B1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#2c2a2e',
    marginBottom: 12,
    overflow: 'hidden',
  },
  accordionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  accordionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  stepBadge: {
    backgroundColor: '#F2CA50',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  stepBadgeText: {
    color: '#0E0C0A',
    fontSize: 9,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
  },
  expandedContent: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
  },
  checkText: {
    color: '#D1D1D6',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
  },
  checkTextDone: {
    color: '#8E8E93',
    textDecorationLine: 'line-through',
  },
  itemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
  },
  itemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
  },
  itemQty: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  dividerLight: {
    height: 1,
    backgroundColor: '#2C2A2E',
  },
  detailsStoreName: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
    marginBottom: 4,
  },
  detailsAddress: {
    color: '#A6A6A6',
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 16,
  },
  outlineBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1.5,
    borderColor: '#3a342c',
    borderRadius: 12,
    paddingVertical: 12,
    backgroundColor: '#161311',
  },
  outlineBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  bottomCTAContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0E0C0A',
    borderTopWidth: 1,
    borderColor: '#1E1B18',
    paddingHorizontal: 24,
    paddingTop: 12,
  },
  startTripCTA: {
    backgroundColor: '#F2CA50',
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  startTripCTAText: {
    color: '#0E0C0A',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  verifySubtext: {
    color: '#A6A6A6',
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    marginBottom: 10,
  },
  innerVerifyBtn: {
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
  },
  innerVerifyBtnActive: {
    backgroundColor: '#F2CA50',
  },
  innerVerifyBtnDisabled: {
    backgroundColor: '#262428',
    borderWidth: 1,
    borderColor: '#3a383d',
  },
  innerVerifyBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    fontSize: 14,
  },
  // Custom Passcode Modal styles
  passcodeContainer: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    paddingBottom: 16,
  },
  passcodeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
  },
  passcodeCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151417',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222126',
  },
  passcodeBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 202, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.25)',
    borderRadius: 12,
    marginHorizontal: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    marginTop: 10,
  },
  passcodeBannerText: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Medium',
    fontSize: 14,
  },
  passcodeContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  passcodeSub: {
    color: '#A9A9B0',
    fontSize: 16,
    fontFamily: 'Urbanist-Medium',
    marginBottom: 8,
  },
  passcodeOrderNum: {
    color: '#FFFFFF',
    fontSize: 32,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginBottom: 32,
  },
  otpRow: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 32,
    justifyContent: 'center',
  },
  otpCol: {
    width: 44,
    alignItems: 'center',
  },
  otpChar: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Urbanist-Bold',
    height: 36,
    textAlign: 'center',
  },
  otpLine: {
    width: '100%',
    height: 3,
    borderRadius: 1.5,
    marginTop: 6,
  },
  otpLineActive: {
    backgroundColor: '#F2CA50',
  },
  otpLineInactive: {
    backgroundColor: '#2C2C2E',
  },
  passcodeOrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    marginVertical: 20,
  },
  passcodeOrLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2C2C2E',
  },
  passcodeOrText: {
    color: '#6C6C70',
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
  },
  scanBarcodeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    width: '80%',
    gap: 8,
  },
  scanBarcodeText: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
  },
  needHelpText: {
    color: '#F2CA50',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
  },
  keyboardContainer: {
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 10,
    gap: 8,
  },
  keyboardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  keyButton: {
    flex: 1,
    height: 56,
    backgroundColor: '#151417',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 0.5,
    borderColor: '#222126',
  },
  keyText: {
    color: '#FFFFFF',
    fontSize: 22,
    fontFamily: 'Urbanist-Bold',
  },
  // Scanner View and Bottom Sheet styles
  scannerContainer: {
    flex: 1,
    backgroundColor: '#000000',
    flexDirection: 'column',
  },
  cameraPermissionOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0E0C0A',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    zIndex: 5,
  },
  cameraPermissionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  cameraPermissionSubtitle: {
    color: '#9C9C9E',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  cameraPermissionBtn: {
    backgroundColor: '#F2CA50',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 24,
  },
  cameraPermissionBtnText: {
    color: '#0E0C0A',
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
  },
  cameraViewport: {
    flex: 1.1,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    backgroundColor: '#09080A',
  },
  scannerTopRow: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 25,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    zIndex: 10,
  },
  scannerBackBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(21, 20, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222126',
  },
  scannerFlashBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(21, 20, 23, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222126',
  },
  viewfinderContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewfinderFrame: {
    width: 200,
    height: 200,
    position: 'relative',
  },
  corner: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderColor: '#F2CA50',
  },
  topLeftCorner: {
    top: 0,
    left: 0,
    borderLeftWidth: 4,
    borderTopWidth: 4,
  },
  topRightCorner: {
    top: 0,
    right: 0,
    borderRightWidth: 4,
    borderTopWidth: 4,
  },
  bottomLeftCorner: {
    bottom: 0,
    left: 0,
    borderLeftWidth: 4,
    borderBottomWidth: 4,
  },
  bottomRightCorner: {
    bottom: 0,
    right: 0,
    borderRightWidth: 4,
    borderBottomWidth: 4,
  },
  laserLine: {
    height: 4,
    backgroundColor: '#F2CA50',
    width: '90%',
    alignSelf: 'center',
    position: 'absolute',
    top: 0,
    shadowColor: '#F2CA50',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  scanInstructionText: {
    color: '#A6A6A6',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    marginTop: 20,
    textAlign: 'center',
  },
  scannerBottomSheet: {
    flex: 0.9,
    backgroundColor: '#0F0E11',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 36 : 24,
    alignItems: 'center',
    borderWidth: 1,
    borderBottomWidth: 0,
    borderColor: '#222126',
    width: '100%',
  },
  issueTopGlow: {
    width: 60,
    height: 4,
    backgroundColor: '#3A3A3E',
    borderRadius: 2,
    marginBottom: 20,
  },
  issueShieldCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#1C1B1F',
    borderWidth: 1.5,
    borderColor: '#2C2A31',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  issueTitleLabel: {
    color: '#A6A6A6',
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    marginBottom: 4,
  },
  issueOrderId: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 20,
  },
  issueWarningBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(242, 202, 80, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.2)',
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
    marginBottom: 24,
    justifyContent: 'space-between',
    gap: 12,
  },
  issueWarningText: {
    color: '#D1D1D6',
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    flex: 1,
    lineHeight: 18,
  },
  issueWarningRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  issueWarningExclamation: {
    color: '#F2CA50',
    fontSize: 20,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
  },
  issueOptionsGroup: {
    width: '100%',
    backgroundColor: '#151417',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#222126',
    marginBottom: 32,
    overflow: 'hidden',
  },
  issueOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 18,
    gap: 12,
    width: '100%',
  },
  issueIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1E1C21',
    justifyContent: 'center',
    alignItems: 'center',
  },
  issueOptionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    flex: 1,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#F2CA50',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#F2CA50',
  },
  issueDivider: {
    height: 1,
    backgroundColor: '#222126',
    marginHorizontal: 16,
  },
  issueNextBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  issueNextText: {
    color: '#0E0C0A',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  issueCancelBtn: {
    paddingVertical: 4,
  },
  issueCancelText: {
    color: '#F2CA50',
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  cleanScanBottomPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(15, 14, 17, 0.95)',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#222126',
  },
  cleanScanBottomText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
    flex: 1,
  },
  cleanScanCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#1E1C21',
  },
  cleanScanCancelText: {
    color: '#F2CA50',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
  },
  // Reached Delivery Detail Screen Styles
  deliveryDetailContainer: {
    flex: 1,
    backgroundColor: '#0E0C0A',
  },
  deliveryDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 10,
  },
  deliveryDetailHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  deliveryTitleSection: {
    paddingHorizontal: 24,
    paddingTop: 10,
    paddingBottom: 20,
  },
  deliverToRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 4,
  },
  deliverToLabel: {
    color: '#F2CA50',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  deliverToName: {
    color: '#FFFFFF',
    fontSize: 28,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginBottom: 6,
  },
  deliveryBarcodeText: {
    color: '#A6A6A6',
    fontSize: 15,
    fontFamily: 'Urbanist-Bold',
  },
  deliveryBarcodeGold: {
    color: '#F2CA50',
    fontWeight: '800',
  },
  deliveryCard: {
    backgroundColor: '#141416',
    borderRadius: 24,
    marginHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#222',
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  deliveryCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  deliveryDetailsBox: {
    borderWidth: 1,
    borderColor: '#3A301E',
    borderRadius: 12,
    backgroundColor: '#1A1815',
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  deliveryBoxRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingVertical: 12,
    gap: 12,
  },
  deliveryBoxIconText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  deliveryBoxText: {
    color: '#D1D1D6',
    fontSize: 13,
    fontFamily: 'Urbanist-Medium',
    lineHeight: 18,
  },
  deliveryBoxSubText: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
    marginTop: 2,
  },
  innerCallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 18,
    paddingVertical: 6,
    paddingHorizontal: 14,
    gap: 6,
    backgroundColor: '#1A1815',
  },
  innerCallBtnText: {
    color: '#F2CA50',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  deliveryDivider: {
    height: 1,
    backgroundColor: '#2C2A26',
    width: '100%',
  },
  deliveryItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  deliveryItemName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
  },
  deliveryItemQty: {
    color: '#F2CA50',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  deliveryItemDivider: {
    height: 1,
    backgroundColor: '#1E1E1E',
    marginHorizontal: 20,
  },
  deliveryOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'transparent',
  },
  deliveryOutlineBtnText: {
    color: '#F2CA50',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  deliveryButtonsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 12,
    marginHorizontal: 20,
    marginBottom: 20,
  },
  deliveryPaymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  deliveryPaymentLabel: {
    color: '#D1D1D6',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
  },
  deliveryPaymentValue: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '700',
  },
  deliveryPaymentStatus: {
    color: '#10B981',
    fontSize: 12,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    backgroundColor: 'rgba(16, 185, 129, 0.1)',
  },
  deliveryCTAContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#0E0C0A',
    borderTopWidth: 1,
    borderColor: '#1C1A17',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  deliveryCompleteBtn: {
    backgroundColor: '#F2CA50',
    borderRadius: 14,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  deliveryCompleteBtnText: {
    color: '#0E0C0A',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  // Payment Options Modal Styles
  paymentModalScroll: {
    paddingBottom: 40,
  },
  paymentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 20 : 10,
    height: 60,
  },
  paymentCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#151417',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222126',
  },
  paymentHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  paymentAmountText: {
    color: '#F2CA50',
    fontSize: 48,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  paymentCard: {
    backgroundColor: '#151417',
    borderRadius: 24,
    marginHorizontal: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#222126',
    marginTop: 12,
  },
  qrIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    backgroundColor: 'rgba(242, 202, 80, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginTop: 12,
  },
  upiRowLogos: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 12,
  },
  bhimLogoText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontFamily: 'Urbanist-Bold',
    fontStyle: 'italic',
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  upiSlash: {
    width: 1,
    height: 18,
    backgroundColor: '#333',
    marginHorizontal: 12,
  },
  upiLogoImg: {
    width: 60,
    height: 20,
  },
  upiSubtext: {
    color: '#8E8E93',
    fontSize: 12,
    fontFamily: 'Urbanist-Medium',
  },
  qrFrameContainer: {
    width: 170,
    height: 170,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    marginVertical: 24,
  },
  qrCorner: {
    position: 'absolute',
    width: 18,
    height: 18,
    borderColor: '#F2CA50',
  },
  qrContentBox: {
    width: 150,
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
  },
  blurredQrContainer: {
    width: 140,
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1E1C21',
    borderRadius: 8,
    overflow: 'hidden',
    position: 'relative',
  },
  blurOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(21, 20, 23, 0.65)',
  },
  generateQrBtn: {
    backgroundColor: '#F2CA50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    marginTop: 8,
  },
  generateQrBtnActive: {
    backgroundColor: '#333230',
  },
  generateQrBtnText: {
    color: '#0E0C0A',
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '800',
  },
  paymentOrRow: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '80%',
    alignSelf: 'center',
    marginVertical: 20,
  },
  paymentOrLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#222126',
  },
  paymentOrText: {
    color: '#6C6C70',
    paddingHorizontal: 16,
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
  },
  walletIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(242, 202, 80, 0.3)',
    backgroundColor: 'rgba(242, 202, 80, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletCardText: {
    color: '#A6A6A6',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    marginTop: 12,
    marginBottom: 20,
    textAlign: 'center',
  },
  collectCashOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    backgroundColor: 'transparent',
  },
  collectCashOutlineBtnText: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '800',
  },
  amountToCollectLabel: {
    color: '#A6A6A6',
    fontSize: 14,
    fontFamily: 'Urbanist-Medium',
    textAlign: 'center',
    marginTop: 20,
  },
  amountValueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    marginBottom: 20,
  },
  amountCurrencySymbol: {
    color: '#F2CA50',
    fontSize: 48,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
    marginRight: 4,
  },
  amountValueDigits: {
    color: '#FFFFFF',
    fontSize: 48,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
  },
  cashInputsContainer: {
    paddingHorizontal: 20,
    gap: 16,
    marginBottom: 24,
  },
  cashInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#151417',
    borderWidth: 1,
    borderColor: '#222126',
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 56,
  },
  cashTextInput: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 15,
    fontFamily: 'Urbanist-Medium',
    marginLeft: 12,
  },
  cashCollectedBtn: {
    backgroundColor: '#F2CA50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
  },
  cashCollectedBtnText: {
    color: '#000000',
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '800',
  },
  showQrOutlineBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F2CA50',
    borderRadius: 12,
    paddingVertical: 14,
    width: '100%',
    backgroundColor: 'transparent',
  },
  showQrOutlineBtnText: {
    color: '#F2CA50',
    fontFamily: 'Urbanist-Bold',
    fontSize: 15,
    fontWeight: '800',
  },
  earningsContainer: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  goldWavyContainer: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: '100%',
    height: '100%',
    overflow: 'hidden',
  },
  goldWaveLine: {
    position: 'absolute',
    borderWidth: 1.5,
    borderStyle: 'solid',
  },
  orderDeliveredBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
  },
  orderDeliveredText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginLeft: 8,
  },
  earningsTitleSection: {
    marginTop: 20,
    marginBottom: 16,
  },
  earningsTitleText: {
    color: '#FFFFFF',
    fontSize: 36,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
  },
  earningsTitleLine: {
    width: 60,
    height: 3,
    backgroundColor: '#F2CA50',
    marginTop: 12,
  },
  earningsAmountRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 24,
  },
  earningsCurrencySymbol: {
    color: '#F2CA50',
    fontSize: 72,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    marginRight: 6,
  },
  earningsValueDigits: {
    color: '#FFFFFF',
    fontSize: 84,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '900',
  },
  goToHomepageBtn: {
    backgroundColor: '#F2CA50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    paddingVertical: 16,
    width: '100%',
    marginBottom: 8,
  },
  goToHomepageBtnText: {
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    fontSize: 16,
    fontWeight: '800',
  },
});
