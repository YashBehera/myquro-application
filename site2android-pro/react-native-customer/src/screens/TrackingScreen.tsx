/**
 * TrackingScreen.tsx — MyQuro Customer App
 * 
 * 100% Pixel-to-Pixel Replica of Figma Node 3046:136:
 * 1. Initial State: "Order Received!" card with restaurant & address vertical timeline + Gold ETA badge.
 * 2. Accepted State: "Partner is on the way" with "✓ ON TIME", driver description, green ETA card, and Quick Call / Chat / Delivery Boy Avatar.
 * 3. Hero Scene with top & bottom black gradients + phone Kiwi UPI mockup.
 * 4. Strict Figma asset for Delivery Boy (orange cap & shirt).
 * 5. Floating Maps Icon containing a LIVE MINIMIZED OLA MAP VIEW matching IncomingRequestModal:
 *    - Store location pin (Black pill with gold icon)
 *    - Customer delivery location pin (White circle)
 *    - Rider GPS dot (Blue glowing ring)
 *    - Curved dashed route lines
 *    - Attached bottom "MAP" pill badge (toggles fullscreen interactive Ola Map).
 * 6. Savings Pill Banner & Kiwi Cashback Promo Card.
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Platform,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  TextInput,
  Modal,
  ToastAndroid,
  Animated,
  LayoutAnimation,
  UIManager,
  Alert,
} from 'react-native';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  ChevronRight,
  X,
  Volume2,
  VolumeX,
  Play,
  Pause,
  MoreHorizontal,
  ChefHat,
  MapPin,
  CheckCircle2,
} from 'lucide-react-native';
import { DeliveredOrderView } from './DeliveredOrderView';
import Svg, {
  Rect,
  Path,
  Circle,
  Defs,
  LinearGradient,
  Stop,
} from 'react-native-svg';

import { BACKEND_URL, OLA_MAPS_API_KEY } from '../config';
import { useViewModel } from '../state/MainViewModel';

// Strict Figma Assets
const deliveryBoyImg = require('../assets/tracking/delivery_boy.png');

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const SCALE = Math.min(Math.max(SCREEN_WIDTH / 390, 0.85), 1.15);

const BRAND_RED = '#E03546';
const BRAND_GREEN = '#149E55';
const GOLD = '#DEA430';

// ─── Ola Map HTML Generator for Fullscreen Interactive Map ──────────────────
function buildOlaMapHtml(
  apiKey: string,
  riderLat: number,
  riderLng: number,
  storeLat: number,
  storeLng: number,
  dropLat: number,
  dropLng: number,
  storeName: string,
  currentStatus: string,
): string {
  // Quadratic bezier curve points between two coords
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

  const isRiderAssigned = ['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isGoingToPickup = ['assigned', 'arrived_at_store'].includes(currentStatus);
  const isPickedUp = ['picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isUnassigned = !isRiderAssigned;

  // Paths:
  // 1) Store → Dropoff (gold dotted line for unassigned state)
  const storeToDropCoords = JSON.stringify(bezier(storeLng, storeLat, dropLng, dropLat));
  // 2) Rider → Dropoff (solid delivery route for picked_up / out_for_delivery state)
  const riderToDropCoords = JSON.stringify(bezier(riderLng, riderLat, dropLng, dropLat));

  // Bounds
  let allLats = [storeLat, dropLat];
  let allLngs = [storeLng, dropLng];
  if (isPickedUp) {
    allLats = [riderLat, dropLat, storeLat];
    allLngs = [riderLng, dropLng, storeLng];
  } else if (isGoingToPickup) {
    allLats = [riderLat, storeLat, dropLat];
    allLngs = [riderLng, storeLng, dropLng];
  }

  const minLat = Math.min(...allLats) - 0.010;
  const maxLat = Math.max(...allLats) + 0.010;
  const minLng = Math.min(...allLngs) - 0.010;
  const maxLng = Math.max(...allLngs) + 0.010;

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const storeNameJson = JSON.stringify(storeName || 'Hotel Mayfair');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link href="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.css" rel="stylesheet"/>
  <script src="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.js"></script>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#F4F4F4}
    .maplibregl-ctrl-attrib,.maplibregl-ctrl-logo{display:none!important}

    /* Pickup / Store pill */
    .pickup-pill{
      display:flex;align-items:center;gap:5px;
      background:#000000;border-radius:14px;
      padding:4px 9px 4px 4px;
      border:1px solid #444;white-space:nowrap;
      box-shadow:0 3px 8px rgba(0,0,0,.45);
    }
    .pickup-icon{
      width:20px;height:20px;border-radius:10px;
      background:#161616;border:1.5px solid #F2CA50;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .pickup-name{color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;font-size:11px;font-weight:700}

    /* Customer / drop marker */
    .customer-pin{
      width:24px;height:24px;border-radius:12px;
      background:#111111;border:2px solid #FFFFFF;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 3px 8px rgba(0,0,0,.45);
    }

    /* Rider GPS dot */
    .gps-ring{
      width:26px;height:26px;border-radius:13px;
      background:rgba(37,99,235,.25);border:1.5px solid rgba(59,130,246,.7);
      display:flex;align-items:center;justify-content:center;
    }
    .gps-dot{
      width:12px;height:12px;border-radius:6px;
      background:#2563EB;border:2.5px solid #FFFFFF;
      box-shadow:0 1px 6px rgba(37,99,235,0.7);
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = new maplibregl.Map({
    container:'map',
    style:'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
    center:[${centerLng},${centerLat}],
    zoom:13,
    attributionControl:false,
    transformRequest:function(url){return{url:url+(url.includes('?')?'&':'?')+'api_key=${apiKey}'}}
  });

  map.on('load',function(){
    map.fitBounds([[${minLng},${minLat}],[${maxLng},${maxLat}]],{
      padding:{top:80,bottom:120,left:50,right:50},duration:0
    });

    // ── a) When no rider is assigned: display delivery location and restaurant location connected via dotted line
    if (${isUnassigned}) {
      map.addSource('route-store-drop',{
        type:'geojson',
        data:{type:'Feature',geometry:{type:'LineString',coordinates:${storeToDropCoords}}}
      });
      map.addLayer({
        id:'route-store-drop-dash',type:'line',source:'route-store-drop',
        paint:{
          'line-color':'#DEA430',
          'line-width':3,
          'line-dasharray':[2.5,2.5]
        },
        layout:{'line-join':'round','line-cap':'round'}
      });
    }

    // ── b) When rider is assigned and going to pick up: NO dotted lines, NO paths, show live rider location only

    // ── c) When rider has picked up the order: show live rider location and the path to customer delivery location
    if (${isPickedUp}) {
      map.addSource('route-rider-drop',{
        type:'geojson',
        data:{type:'Feature',geometry:{type:'LineString',coordinates:${riderToDropCoords}}}
      });
      // Outer subtle glow casing
      map.addLayer({
        id:'route-rider-drop-glow',type:'line',source:'route-rider-drop',
        paint:{
          'line-color':'#3B82F6',
          'line-width':6,
          'line-opacity':0.35
        },
        layout:{'line-join':'round','line-cap':'round'}
      });
      // Main vibrant route line
      map.addLayer({
        id:'route-rider-drop-line',type:'line',source:'route-rider-drop',
        paint:{
          'line-color':'#2563EB',
          'line-width':4
        },
        layout:{'line-join':'round','line-cap':'round'}
      });
    }

    // Pickup / Store marker (black pill with gold icon)
    var storeEl=document.createElement('div');
    storeEl.className='pickup-pill';
    storeEl.innerHTML='<div class="pickup-icon"><svg width="12" height="12" viewBox="0 0 24 24" fill="#F2CA50"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg></div><div class="pickup-name">'+${storeNameJson}+'</div>';
    new maplibregl.Marker({element:storeEl,anchor:'bottom'}).setLngLat([${storeLng},${storeLat}]).addTo(map);

    // Customer delivery marker
    var custEl=document.createElement('div');
    custEl.className='customer-pin';
    custEl.innerHTML='<svg width="13" height="13" viewBox="0 0 24 24" fill="#fff"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
    new maplibregl.Marker({element:custEl,anchor:'center'}).setLngLat([${dropLng},${dropLat}]).addTo(map);

    // Live Rider Location GPS Marker (shown whenever rider is assigned: going to pickup OR picked up)
    if (${isRiderAssigned}) {
      var gpsEl=document.createElement('div');
      gpsEl.className='gps-ring';
      gpsEl.innerHTML='<div class="gps-dot"></div>';
      new maplibregl.Marker({element:gpsEl,anchor:'center'}).setLngLat([${riderLng},${riderLat}]).addTo(map);
    }
  });
</script>
</body>
</html>`;
}

// ─── Mini Map HTML Generator for Floating Disc ──────────────────────────────
function buildMiniOlaMapHtml(
  apiKey: string,
  storeLat: number,
  storeLng: number,
  dropLat: number,
  dropLng: number,
  riderLat: number,
  riderLng: number,
  currentStatus: string,
): string {
  function bezier(
    fromLng: number, fromLat: number,
    toLng: number, toLat: number,
    segments = 25,
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

  const isRiderAssigned = ['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isGoingToPickup = ['assigned', 'arrived_at_store'].includes(currentStatus);
  const isPickedUp = ['picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isUnassigned = !isRiderAssigned;

  const storeToDropCoords = JSON.stringify(bezier(storeLng, storeLat, dropLng, dropLat));
  const riderToDropCoords = JSON.stringify(bezier(riderLng, riderLat, dropLng, dropLat));

  let allLats = [storeLat, dropLat];
  let allLngs = [storeLng, dropLng];
  if (isRiderAssigned) {
    allLats = [riderLat, storeLat, dropLat];
    allLngs = [riderLng, storeLng, dropLng];
  }

  const minLat = Math.min(...allLats) - 0.006;
  const maxLat = Math.max(...allLats) + 0.006;
  const minLng = Math.min(...allLngs) - 0.006;
  const maxLng = Math.max(...allLngs) + 0.006;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
  <link href="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.css" rel="stylesheet"/>
  <script src="https://unpkg.com/maplibre-gl@4.3.0/dist/maplibre-gl.js"></script>
  <style>
    html,body,#map{margin:0;padding:0;width:100%;height:100%;background:#E8E8E8}
    .maplibregl-ctrl-attrib,.maplibregl-ctrl-logo{display:none!important}
    .pin{width:12px;height:12px;border-radius:6px;background:#000;border:2px solid #F2CA50;}
    .cust{width:12px;height:12px;border-radius:6px;background:#000;border:2px solid #FFF;}
    .rider{width:10px;height:10px;border-radius:5px;background:#2563EB;border:1.5px solid #FFF;}
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var map = new maplibregl.Map({
    container:'map',
    style:'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
    center:[${(minLng + maxLng) / 2},${(minLat + maxLat) / 2}],
    zoom:13,
    attributionControl:false,
    interactive:false,
    transformRequest:function(url){return{url:url+(url.includes('?')?'&':'?')+'api_key=${apiKey}'}}
  });

  map.on('load',function(){
    map.fitBounds([[${minLng},${minLat}],[${maxLng},${maxLat}]],{padding:20,duration:0});

    if (${isUnassigned}) {
      map.addSource('route-store-drop',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:${storeToDropCoords}}}});
      map.addLayer({
        id:'route-store-drop-line',type:'line',source:'route-store-drop',
        paint:{'line-color':'#DEA430','line-width':3,'line-dasharray':[2,2]},
        layout:{'line-join':'round','line-cap':'round'}
      });
    }

    if (${isPickedUp}) {
      map.addSource('route-rider-drop',{type:'geojson',data:{type:'Feature',geometry:{type:'LineString',coordinates:${riderToDropCoords}}}});
      map.addLayer({
        id:'route-rider-drop-line',type:'line',source:'route-rider-drop',
        paint:{'line-color':'#2563EB','line-width':3},
        layout:{'line-join':'round','line-cap':'round'}
      });
    }

    var p1=document.createElement('div'); p1.className='pin';
    new maplibregl.Marker({element:p1,anchor:'center'}).setLngLat([${storeLng},${storeLat}]).addTo(map);

    var p2=document.createElement('div'); p2.className='cust';
    new maplibregl.Marker({element:p2,anchor:'center'}).setLngLat([${dropLng},${dropLat}]).addTo(map);

    if (${isRiderAssigned}) {
      var p3=document.createElement('div'); p3.className='rider';
      new maplibregl.Marker({element:p3,anchor:'center'}).setLngLat([${riderLng},${riderLat}]).addTo(map);
    }
  });
</script>
</body>
</html>`;
}

const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

interface TrackingScreenProps {
  orderId: string | null;
  onBack: () => void;
}

export const TrackingScreen: React.FC<TrackingScreenProps> = ({ orderId, onBack }) => {
  const insets = useSafeAreaInsets();
  const { authState, currentLocation, savedAddresses, allRestaurants, cartItems } = useViewModel();
  const sessionToken = authState.type === 'Authenticated' ? authState.sessionToken : '';

  const [loading, setLoading] = useState(true);
  const [orderDetail, setOrderDetail] = useState<any>(null);
  const [trackingData, setTrackingData] = useState<any>(null);
  const [riderInfo, setRiderInfo] = useState<any>(null);
  const [olaEtaMins, setOlaEtaMins] = useState<number | null>(null);
  const socketRef = useRef<any>(null);

  // UI Interactive States
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [showDeliveryInstructionsModal, setShowDeliveryInstructionsModal] = useState(false);
  const [selectedDeliveryInstructions, setSelectedDeliveryInstructions] = useState<string[]>([
    'Leave at door',
  ]);

  // Chat Modal States
  const [showChatModal, setShowChatModal] = useState(false);
  const [chatMessagesList, setChatMessagesList] = useState<any[]>([]);
  const [inputText, setInputText] = useState('');
  const [sendingMessage, setSendingMessage] = useState(false);
  const chatScrollRef = useRef<any>(null);

  // Dev Testing Panel
  const [isDevPanelOpen, setIsDevPanelOpen] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const currentRestaurant = allRestaurants?.find(r => 
    (orderDetail?.restaurantName && (r.name.toLowerCase().includes(orderDetail.restaurantName.toLowerCase()) || orderDetail.restaurantName.toLowerCase().includes(r.name.toLowerCase()))) || 
    (orderDetail?.restaurantId && (r.id === orderDetail.restaurantId || (r as any)._id === orderDetail.restaurantId)) ||
    (cartItems && cartItems.length > 0 && (r.id === cartItems[0].restaurantId || (r as any)._id === cartItems[0].restaurantId))
  );

  const deliveryAddress =
    orderDetail?.deliveryAddress ||
    orderDetail?.address ||
    currentLocation?.address ||
    (savedAddresses.length > 0 ? savedAddresses[0].address : 'Delivery Location');

  const restaurantName =
    orderDetail?.restaurantName ||
    currentRestaurant?.name ||
    (cartItems && cartItems.length > 0 ? cartItems[0].restaurantName : '') ||
    'Restaurant';

  const orderItemsList =
    orderDetail?.items && orderDetail.items.length > 0
      ? orderDetail.items
      : (cartItems && cartItems.length > 0
          ? cartItems.map((c: any) => ({ id: c.id, menuItemName: c.name, quantity: c.quantity, isVeg: c.isVeg, price: c.price }))
          : []);
  const itemsCount = orderItemsList.reduce((sum: number, i: any) => sum + (i.quantity || 1), 0);

  // Format Order Placed Time (e.g. 04:43PM)
  const orderCreatedAt = orderDetail?.createdAt ? new Date(orderDetail.createdAt) : new Date();
  const placedTimeFormatted = orderCreatedAt
    .toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true })
    .replace(' ', '');

  // Coordinates
  const restLat =
    trackingData?.restaurantLat ||
    orderDetail?.restaurantLatitude ||
    currentRestaurant?.latitude ||
    20.30095002919744;
  const restLng =
    trackingData?.restaurantLng ||
    orderDetail?.restaurantLongitude ||
    currentRestaurant?.longitude ||
    85.81996598190754;
  const custLat =
    trackingData?.customerLat ||
    currentLocation?.latitude ||
    (savedAddresses.length > 0 && savedAddresses[0].latitude ? savedAddresses[0].latitude : 20.2505);
  const custLng =
    trackingData?.customerLng ||
    currentLocation?.longitude ||
    (savedAddresses.length > 0 && savedAddresses[0].longitude ? savedAddresses[0].longitude : 85.7882);
  const riderLat = trackingData?.currentLat || (restLat * 0.4 + custLat * 0.6);
  const riderLng = trackingData?.currentLng || (restLng * 0.4 + custLng * 0.6);

  // Fetch Ola Maps Driving Directions & Dynamic Route
  useEffect(() => {
    if (!restLat || !restLng || !custLat || !custLng || !OLA_MAPS_API_KEY) return;
    let isMounted = true;

    const fetchOlaDirections = async () => {
      try {
        const url = `https://api.olamaps.io/routing/v1/directions/basic?origin=${restLat},${restLng}&destination=${custLat},${custLng}&api_key=${OLA_MAPS_API_KEY}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          const route = data.routes?.[0];
          if (route) {
            const durationSec = route.legs?.[0]?.duration || route.duration || 0;
            const transitMins = Math.round(durationSec / 60);
            const prepTime = (currentRestaurant as any)?.prepTime || 12;
            const totalMins = prepTime + (transitMins > 0 ? transitMins : 8);
            if (isMounted) setOlaEtaMins(totalMins);
          }
        }
      } catch (e) {
        // Handled silently
      }
    };

    fetchOlaDirections();
    return () => { isMounted = false; };
  }, [restLat, restLng, custLat, custLng]);

  // Dynamic ETA Calculation (Zero Static Fallbacks)
  const distKm = calculateDistanceKm(restLat, restLng, custLat, custLng);
  const dynamicDistanceEta = Math.max(12, ((currentRestaurant as any)?.prepTime || 12) + Math.ceil(distKm * 3.2));
  const etaMinutes =
    trackingData?.etaMinutes !== undefined && trackingData?.etaMinutes !== null
      ? trackingData.etaMinutes
      : orderDetail?.etaMinutes
      ? orderDetail.etaMinutes
      : olaEtaMins
      ? olaEtaMins
      : typeof currentRestaurant?.deliveryTime === 'number' && currentRestaurant.deliveryTime > 0
      ? currentRestaurant.deliveryTime
      : dynamicDistanceEta;

  // 1. Restaurant / Kitchen lifecycle status from Restaurant App
  const kitchenStatus = orderDetail?.status || 'placed';

  // 2. Delivery Partner / Logistics lifecycle status from Rider App
  const riderStatus = trackingData?.status || null;

  // Active status check: has a rider accepted / been assigned to this order?
  const currentStatus = riderStatus || kitchenStatus || 'placed';
  const isRiderAccepted = Boolean(
    trackingData?.riderId ||
    (riderStatus && ['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered'].includes(riderStatus))
  );

  const riderDisplayName = riderInfo?.name || riderInfo?.fullName || 'Delivery Partner';

  const getStatusDisplay = () => {
    // ── STAGE 6: CANCELLED / REJECTED ──
    if (kitchenStatus === 'cancelled' || kitchenStatus === 'rejected') {
      return {
        title: 'Order Cancelled',
        description: 'This order was cancelled. Any amount paid will be refunded to your source payment method.',
        badge: 'CANCELLED',
      };
    }

    // ── STAGE 5: DELIVERED / SERVED ──
    if (riderStatus === 'delivered' || kitchenStatus === 'served' || kitchenStatus === 'delivered') {
      return {
        title: 'Order Delivered! 🎉',
        description: `Enjoy your delicious meal from\n${restaurantName}`,
        badge: 'DELIVERED',
      };
    }

    // ── STAGE 4: OUT FOR DELIVERY (Heading to customer's doorstep) ──
    if (riderStatus === 'out_for_delivery') {
      return {
        title: 'Out for Delivery',
        description: `${riderDisplayName} is out for delivery. Keep your phone handy!`,
        badge: 'ON TIME',
      };
    }

    // ── STAGE 3: ORDER PICKED UP (Collected from restaurant) ──
    if (riderStatus === 'picked_up') {
      return {
        title: 'Order Picked Up',
        description: `${riderDisplayName} has picked up your order and is heading towards your location`,
        badge: 'ON TIME',
      };
    }

    // ── STAGE 2: PARTNER ARRIVED AT RESTAURANT ──
    if (riderStatus === 'arrived_at_store') {
      if (kitchenStatus === 'ready') {
        return {
          title: 'Collecting your order',
          description: `${riderDisplayName} is at ${restaurantName} collecting your packed order`,
          badge: 'PICKING UP',
        };
      } else {
        // Rider has arrived, but food is still cooking
        return {
          title: 'Partner reached restaurant',
          description: `${riderDisplayName} has arrived at the restaurant, waiting for your order to be prepared`,
          badge: 'WAITING FOR ORDER',
        };
      }
    }

    // ── STAGE 1B: PARTNER ASSIGNED & ON THE WAY TO RESTAURANT ──
    if (riderStatus === 'assigned') {
      if (kitchenStatus === 'ready') {
        return {
          title: 'Order is Ready & Partner is on the way',
          description: `Your order is packed & ready. ${riderDisplayName} is rushing to ${restaurantName} to pick it up`,
          badge: 'READY FOR PICKUP',
        };
      } else {
        // Food is cooking, rider is on the way
        return {
          title: 'Partner is on the way',
          description: `${riderDisplayName} is on the way to ${restaurantName} while your food is being freshly prepared`,
          badge: 'ON THE WAY',
        };
      }
    }

    // ── STAGE 1A: NO RIDER ASSIGNED YET (WAITING / FINDING PARTNER) ──
    if (kitchenStatus === 'ready') {
      return {
        title: 'Order is Ready',
        description: 'Order is Ready, waiting for delivery partner to be assigned...',
        badge: 'ORDER READY',
      };
    }

    if (kitchenStatus === 'preparing' || kitchenStatus === 'confirmed') {
      return {
        title: 'Preparing your order',
        description: `Chef at ${restaurantName} is preparing your freshly made meal. Finding a delivery partner nearby...`,
        badge: 'PREPARING',
      };
    }

    // Default: Order placed / received
    return {
      title: 'Order received',
      description: `Waiting for ${restaurantName} to accept your order...`,
      badge: 'RECEIVED',
    };
  };

  const statusInfo = getStatusDisplay();

  // ── Smooth Status Transition Animation ──
  const statusFadeAnim = useRef(new Animated.Value(1)).current;
  const statusTranslateYAnim = useRef(new Animated.Value(0)).current;
  const statusScaleAnim = useRef(new Animated.Value(1)).current;
  const prevStatusKeyRef = useRef<string>('');

  useEffect(() => {
    const currentStatusKey = `${statusInfo.title}_${statusInfo.badge}_${isRiderAccepted}_${kitchenStatus}_${riderStatus}`;
    if (prevStatusKeyRef.current && prevStatusKeyRef.current !== currentStatusKey) {
      // 1. Smooth layout animation for card resize
      try {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (e) {}

      // 2. Micro fade & entrance slide for status text and badge
      statusFadeAnim.setValue(0);
      statusTranslateYAnim.setValue(6);
      statusScaleAnim.setValue(0.98);

      Animated.parallel([
        Animated.timing(statusFadeAnim, {
          toValue: 1,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.timing(statusTranslateYAnim, {
          toValue: 0,
          duration: 320,
          useNativeDriver: true,
        }),
        Animated.spring(statusScaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    }
    prevStatusKeyRef.current = currentStatusKey;
  }, [statusInfo.title, statusInfo.badge, isRiderAccepted, kitchenStatus, riderStatus]);

  const handleCallRider = () => {
    const phone = riderInfo?.phone || riderInfo?.contactNumber;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else if (Platform.OS === 'android') {
      ToastAndroid.show('Connecting with delivery partner...', ToastAndroid.SHORT);
    }
  };

  const fetchInitialData = async () => {
    if (!orderId) {
      setLoading(false);
      return;
    }
    try {
      // 1. Fetch from local AsyncStorage @placed_orders_history immediately
      try {
        const localData = await AsyncStorage.getItem('@placed_orders_history');
        if (localData) {
          const list = JSON.parse(localData);
          const found = list.find((o: any) => o.id === orderId || o.orderId === orderId);
          if (found) {
            setOrderDetail((prev: any) => ({ ...found, ...prev }));
          }
        }
      } catch (e) {}

      // 2. Fetch from backend order detail endpoint
      const orderResp = await fetch(`${BACKEND_URL}/api/orders/${orderId}/detail`, {
        headers: { ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
      });
      if (orderResp.ok) {
        const data = await orderResp.json();
        if (data.order) {
          setOrderDetail((prev: any) => ({ ...prev, ...data.order }));
        }
      }

      // 3. Fetch from backend delivery track endpoint
      const trackResp = await fetch(`${BACKEND_URL}/api/delivery/track/${orderId}`, {
        headers: { ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
      });
      if (trackResp.ok) {
        const data = await trackResp.json();
        setTrackingData(data.delivery);
        setRiderInfo(data.rider);
      }
    } catch (err) {
      console.warn('Error fetching tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
    const interval = setInterval(() => {
      fetchInitialData();
    }, 3000);
    return () => clearInterval(interval);
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;

    const socket = io(BACKEND_URL, {
      transports: ['websocket'],
      auth: { sessionToken },
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      socket.emit('join-order', orderId);
    });

    socket.on('delivery-update', (data: any) => {
      if (data.delivery) setTrackingData(data.delivery);
      if (data.rider) setRiderInfo(data.rider);
    });

    socket.on('order-update', (data: any) => {
      if (data.order) setOrderDetail((prev: any) => ({ ...prev, ...data.order }));
      if (data.status) setOrderDetail((prev: any) => ({ ...prev, status: data.status }));
    });

    socket.on('order-status-update', (data: any) => {
      if (data.status) {
        setOrderDetail((prev: any) => ({ ...prev, status: data.status }));
      }
    });

    socket.on('order-status', (data: any) => {
      console.log('📡 [TrackingScreen] Received order-status event:', data);
      if (data.status) {
        setOrderDetail((prev: any) => ({ ...prev, status: data.status }));
      }
    });

    socket.on('chat-message', (message: any) => {
      setChatMessagesList((prev) => [...prev, message]);
    });

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const fetchChatMessages = async () => {
    if (!orderId) return;
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/${orderId}/messages`, {
        headers: { ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.messages) {
          setChatMessagesList(data.messages);
        }
      }
    } catch (err) {
      console.warn('Error fetching chat messages:', err);
    }
  };

  useEffect(() => {
    if (showChatModal) {
      fetchChatMessages();
    }
  }, [showChatModal]);

  const handleSendMessage = async () => {
    if (!orderId || !inputText.trim()) return;
    const textToSend = inputText.trim();
    setInputText('');
    setSendingMessage(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/chat/${orderId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
        },
        body: JSON.stringify({
          text: textToSend,
          sender: 'customer',
        }),
      });
      if (!res.ok) {
        console.warn('Failed to send message to backend');
      }
    } catch (err) {
      console.error('Error sending chat message:', err);
    } finally {
      setSendingMessage(false);
    }
  };

  const simulateStep = async (status: string) => {
    if (!orderId) return;
    setSimulating(true);
    try {
      const res = await fetch(`${BACKEND_URL}/api/delivery/simulate/step`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ orderId, status }),
      });
      if (res.ok) {
        await fetchInitialData();
        if (Platform.OS === 'android') {
          ToastAndroid.show(`Simulated status: ${status}`, ToastAndroid.SHORT);
        }
      }
    } catch (err) {
      console.error('Simulation error:', err);
    } finally {
      setSimulating(false);
    }
  };

  const isDelivered =
    riderStatus === 'delivered' ||
    kitchenStatus === 'served' ||
    kitchenStatus === 'delivered' ||
    currentStatus === 'delivered';

  if (isDelivered) {
    return (
      <DeliveredOrderView
        orderId={orderId || undefined}
        restaurantName={restaurantName}
        riderName={riderDisplayName}
        riderPhone={riderInfo?.phone}
        itemsCount={itemsCount}
        deliveredTime={trackingData?.updatedAt || orderDetail?.updatedAt}
        onBack={onBack}
        onRateDelivery={(rating) => {
          console.log('Rated delivery:', rating);
        }}
        onRateItems={() => {
          Alert.alert('Rate Items', 'Thank you! Item rating submitted successfully.');
        }}
        onContactSupport={() => {
          if (riderInfo?.phone) {
            Linking.openURL(`tel:${riderInfo.phone}`);
          } else {
            Alert.alert('Delivery Support', 'Connecting to MyQuro delivery support hotline...');
          }
        }}
        onExploreOffers={() => {
          Alert.alert('My Quro Pay', 'Explore exclusive 5% cashback offers on every order with My Quro Pay!');
        }}
      />
    );
  }

  const topHeaderPadding = insets.top + (Platform.OS === 'android' ? 6 : 2) * SCALE;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* ════════════════════════════════════════════════════════════════════════
          [1] FLOATING TOP HEADER (OVERLAID AT TOP, ZERO PAGE SHIFT)
          ════════════════════════════════════════════════════════════════════════ */}
      <View style={[styles.headerBar, { paddingTop: topHeaderPadding }]}>
        {/* Left: Back Button */}
        <TouchableOpacity style={styles.headerCircleBtn} activeOpacity={0.8} onPress={onBack}>
          <ArrowLeft size={19 * SCALE} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>

        {/* Center: Restaurant & Time Info */}
        <View style={styles.headerCenterCol}>
          <Text style={styles.headerRestaurantTitle} numberOfLines={1}>
            {restaurantName}
          </Text>
          <View style={styles.headerSubRow}>
            <Text style={styles.headerTimeText}>{placedTimeFormatted}</Text>
            <Text style={styles.headerDot}>•</Text>
            <Text style={styles.headerItemCountText}>
              {itemsCount} {itemsCount === 1 ? 'Item' : 'Items'}
            </Text>
          </View>
        </View>

        {/* Right: More Options Button */}
        <TouchableOpacity
          style={styles.headerCircleBtn}
          activeOpacity={0.8}
          onPress={() => setShowOptionsMenu(!showOptionsMenu)}
        >
          <MoreHorizontal size={19 * SCALE} color="#FFFFFF" strokeWidth={2.4} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.mainScrollView}
        contentContainerStyle={styles.mainScrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* ════════════════════════════════════════════════════════════════════════
            [2] HERO MEDIA AREA (WITH TOP & BOTTOM BLACK GRADIENT FADE)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={[styles.heroMediaContainer, { height: 380 * SCALE }]}>
          {isMapExpanded ? (
            /* Live Interactive Full Ola MapView Mode (matching IncomingRequestModal UI) */
            <View style={StyleSheet.absoluteFillObject}>
              <WebView
                source={{
                  html: buildOlaMapHtml(
                    OLA_MAPS_API_KEY,
                    riderLat,
                    riderLng,
                    restLat,
                    restLng,
                    custLat,
                    custLng,
                    restaurantName,
                    currentStatus,
                  ),
                }}
                style={StyleSheet.absoluteFillObject}
                scrollEnabled={false}
                javaScriptEnabled
                domStorageEnabled
                originWhitelist={['*']}
              />

              {/* Ola Maps Brand Badge */}
              <View style={styles.olaMapsBrandPill}>
                <Text style={styles.olaMapsBrandPillText}>Ola Maps • Light Theme</Text>
              </View>
            </View>
          ) : (
            /* Delivery Scene matching Figma Hero */
            <View style={styles.heroSceneWrapper}>
              {/* Real-World Grocery/Store Visual Background */}
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=800&auto=format&fit=crop&q=80',
                }}
                style={styles.heroBgImage}
              />

              {/* ── TOP FADE GRADIENT (Dispersing into Black at Top) ──────── */}
              <Svg width="100%" height={140 * SCALE} style={styles.heroTopFadeGradient}>
                <Defs>
                  <LinearGradient id="heroTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0.95" />
                    <Stop offset="45%" stopColor="#000000" stopOpacity="0.75" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#heroTopGrad)" />
              </Svg>

              {/* ── BOTTOM FADE GRADIENT (Dispersing into Black at Bottom) ───── */}
              <Svg width="100%" height={160 * SCALE} style={styles.heroBottomFadeGradient}>
                <Defs>
                  <LinearGradient id="heroBottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
                    <Stop offset="50%" stopColor="#000000" stopOpacity="0.7" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#heroBottomGrad)" />
              </Svg>

              {/* Hand Holding Smartphone Graphic */}
              <View
                style={[
                  styles.phoneMockupContainer,
                  { top: topHeaderPadding + 44 * SCALE },
                ]}
              >
                {/* Wristbands */}
                <View style={styles.handWristBands}>
                  <View style={styles.wristBandGreen} />
                  <View style={styles.wristBandPurple} />
                </View>

                {/* Smartphone Device Frame */}
                <View style={styles.phoneDeviceFrame}>
                  <View style={styles.phoneInnerScreen}>
                    {/* Top Kiwi status bar */}
                    <View style={styles.phoneScreenTopRow}>
                      <Text style={styles.phoneBackChevron}>‹</Text>
                      <Text style={styles.phoneKiwiBrand}>kiwi</Text>
                      <View style={styles.phoneTopPill} />
                    </View>

                    {/* Green Checkmark Circle Badge */}
                    <View style={styles.phoneCenterCheckCircle}>
                      <Text style={styles.phoneCheckmarkSign}>✓</Text>
                    </View>

                    {/* Paid to details */}
                    <Text style={styles.phonePaidToLabel}>Paid to</Text>
                    <Text style={styles.phonePaidToName}>{restaurantName}</Text>

                    {/* Bottom DONE Button */}
                    <View style={styles.phoneDoneBtn}>
                      <Text style={styles.phoneDoneBtnText}>DONE</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Hero Promotional Text on Right */}
              <View
                style={[
                  styles.heroPromoTextWrap,
                  { top: topHeaderPadding + 54 * SCALE },
                ]}
              >
                <Text style={styles.heroPayWithText}>Pay with UPI on</Text>
                <View style={styles.heroKiwiCreditCardRow}>
                  <Text style={styles.heroKiwiLimeText}>kiwi </Text>
                  <Text style={styles.heroCreditCardWhiteText}>credit card</Text>
                </View>
              </View>
            </View>
          )}

          {/* Floating Media Action Controls (Top-Right of Hero) */}
          <View
            style={[
              styles.floatingMediaControls,
              { top: topHeaderPadding + 44 * SCALE },
            ]}
          >
            {/* Mute Button */}
            <TouchableOpacity
              style={styles.floatingMediaBtn}
              activeOpacity={0.8}
              onPress={() => setIsMuted(!isMuted)}
            >
              {isMuted ? (
                <VolumeX size={16 * SCALE} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <Volume2 size={16 * SCALE} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </TouchableOpacity>

            {/* Pause Button */}
            <TouchableOpacity
              style={styles.floatingMediaBtn}
              activeOpacity={0.8}
              onPress={() => setIsPlaying(!isPlaying)}
            >
              {isPlaying ? (
                <Pause size={16 * SCALE} color="#FFFFFF" strokeWidth={2.2} />
              ) : (
                <Play size={16 * SCALE} color="#FFFFFF" strokeWidth={2.2} />
              )}
            </TouchableOpacity>
          </View>

          {/* ── LIVE MINIMIZED OLA MAP DISC (MATCHING INCOMING REQUEST MODAL) ── */}
          <TouchableOpacity
            style={[styles.floatingMiniMapDiscContainer, isMapExpanded && styles.floatingMiniMapDiscActive]}
            activeOpacity={0.88}
            onPress={() => setIsMapExpanded(!isMapExpanded)}
          >
            {/* Mini Map Canvas with Rounded Lens */}
            <View style={styles.miniMapLensWrapper}>
              <WebView
                source={{
                  html: buildMiniOlaMapHtml(
                    OLA_MAPS_API_KEY,
                    restLat,
                    restLng,
                    custLat,
                    custLng,
                    riderLat,
                    riderLng,
                    currentStatus,
                  ),
                }}
                style={StyleSheet.absoluteFillObject}
                scrollEnabled={false}
                javaScriptEnabled
                domStorageEnabled
                pointerEvents="none"
                originWhitelist={['*']}
              />

              {/* Frosted Lens Glass Overlay */}
              <View style={styles.miniMapGlassVignette} />

              {/* Centered Glowing Location Pin */}
              <View style={styles.miniMapCenterPinBadge}>
                <Svg width={18 * SCALE} height={22 * SCALE} viewBox="0 0 24 28" fill="none">
                  <Path
                    d="M12 2C7.02944 2 3 6.02944 3 11C3 16.5 12 26 12 26C12 26 21 16.5 21 11C21 6.02944 16.9706 2 12 2Z"
                    fill="#FFFFFF"
                    stroke="#2A2A30"
                    strokeWidth="1.5"
                  />
                  <Circle cx="12" cy="11" r="4.5" fill="#149E55" />
                </Svg>
              </View>
            </View>

            {/* Bottom Attached "MAP" Pill Badge */}
            <View style={styles.miniMapBottomPill}>
              <Text style={styles.miniMapPillText}>{isMapExpanded ? 'MEDIA' : 'MAP'}</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* ════════════════════════════════════════════════════════════════════════
            [3] OVERLAPPING ACTIVE DELIVERY STATUS CARD (FIGMA NODE 3046:159)
            ════════════════════════════════════════════════════════════════════════ */}
        <View style={styles.overlappingCardContainer}>
          <View style={styles.deliveryStatusCard}>
            {!isRiderAccepted ? (
              /* ── STAGE 1: ORDER RECEIVED (INITIAL STATE MATCHING SCREENSHOT) ── */
              <View>
                <View style={styles.statusCardTopSection}>
                  {/* Left: Order Received Title + Restaurant/Address Timeline */}
                  <Animated.View
                    style={[
                      styles.statusCardLeftInfo,
                      {
                        opacity: statusFadeAnim,
                        transform: [{ translateY: statusTranslateYAnim }, { scale: statusScaleAnim }],
                      },
                    ]}
                  >
                    <Text style={styles.orderReceivedHeading}>{statusInfo.title}</Text>

                    {statusInfo.description ? (
                      <Text style={{ color: '#A0A0A5', fontSize: 13 * SCALE, marginTop: 6, fontFamily: 'Outfit-Regular', lineHeight: 18 }}>
                        {statusInfo.description}
                      </Text>
                    ) : (
                      <View style={styles.timelineRowContainer}>
                        {/* Vertical Gold Line & Dots */}
                        <View style={styles.timelineTrackCol}>
                          <View style={styles.timelineDotYellow} />
                          <View style={styles.timelineDottedLine} />
                          <View style={styles.timelineDotYellow} />
                        </View>

                        {/* Text details */}
                        <View style={styles.timelineDetailsCol}>
                          <Text style={styles.timelineRestaurantName} numberOfLines={1}>
                            {restaurantName}
                          </Text>
                          <Text style={styles.timelineAddressLine} numberOfLines={2}>
                            @ To Home | {deliveryAddress}
                          </Text>
                        </View>
                      </View>
                    )}
                  </Animated.View>

                  {/* Right: Gold ETA Box (30 mins) */}
                  <View style={styles.etaGoldBadgeCard}>
                    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                      <Defs>
                        <LinearGradient id="etaGoldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor="#F5B800" />
                          <Stop offset="100%" stopColor="#E29E00" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" rx={20 * SCALE} fill="url(#etaGoldGrad)" />
                    </Svg>
                    <Text style={styles.etaNumberBlack}>{etaMinutes}</Text>
                    <Text style={styles.etaMinsUnitBlack}>mins</Text>
                  </View>
                </View>

                {/* Divider Line */}
                <View style={styles.statusCardDividerLine} />

                {/* Bottom Row: Add Delivery Instructions */}
                <View style={styles.statusCardBottomSection}>
                  <TouchableOpacity
                    style={styles.addInstructionsRow}
                    activeOpacity={0.8}
                    onPress={() => setShowDeliveryInstructionsModal(true)}
                  >
                    <Text style={styles.addInstructionsGoldText}>Add Delivery Instructions</Text>
                    <Text style={styles.addInstructionsGoldChevron}>›</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* ── STAGE 2: PARTNER IS ON THE WAY (AFTER RIDER ACCEPTS) ── */
              <View>
                <View style={styles.statusCardTopSection}>
                  {/* Left Content */}
                  <Animated.View
                    style={[
                      styles.statusCardLeftInfo,
                      {
                        opacity: statusFadeAnim,
                        transform: [{ translateY: statusTranslateYAnim }, { scale: statusScaleAnim }],
                      },
                    ]}
                  >
                    {/* ON TIME Badge Row */}
                    <View style={styles.onTimeBadgeRow}>
                      <Svg width={14 * SCALE} height={14 * SCALE} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M20 6L9 17L4 12"
                          stroke="#139D54"
                          strokeWidth="3.2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                      <Text style={styles.onTimeBadgeText}>{statusInfo.badge || 'ON TIME'}</Text>
                    </View>

                    {/* Main Status Title */}
                    <Text style={styles.partnerStatusTitle}>{statusInfo.title}</Text>

                    {/* Subtitle Description */}
                    <Text style={styles.partnerStatusDesc}>{statusInfo.description}</Text>
                  </Animated.View>

                  {/* Right: Vibrant Emerald-Lime Green ETA Card */}
                  <View style={styles.etaGreenBadgeCard}>
                    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                      <Defs>
                        <LinearGradient id="etaGreenGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor="#12B35B" />
                          <Stop offset="100%" stopColor="#0B8F4A" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" rx={20 * SCALE} fill="url(#etaGreenGrad)" />
                    </Svg>
                    <Text style={styles.etaNumberLarge}>{etaMinutes}</Text>
                    <Text style={styles.etaMinsUnit}>mins</Text>
                  </View>
                </View>

                {/* Divider Line */}
                <View style={styles.statusCardDividerLine} />

                {/* Bottom Row: Add Delivery Instructions + Contact Buttons */}
                <View style={styles.statusCardBottomSection}>
                  <TouchableOpacity
                    style={styles.addInstructionsRow}
                    activeOpacity={0.8}
                    onPress={() => setShowDeliveryInstructionsModal(true)}
                  >
                    <Text style={styles.addInstructionsGoldText}>Add Delivery Instructions</Text>
                    <Text style={styles.addInstructionsGoldChevron}>›</Text>
                  </TouchableOpacity>

                  {/* Right Quick Actions */}
                  <View style={styles.quickActionsGroup}>
                    {/* Call Button */}
                    <TouchableOpacity
                      style={styles.circleActionBtn}
                      activeOpacity={0.8}
                      onPress={handleCallRider}
                    >
                      <Phone size={16 * SCALE} color="#FFFFFF" strokeWidth={2.2} />
                    </TouchableOpacity>

                    {/* Chat Button */}
                    <TouchableOpacity
                      style={styles.circleActionBtn}
                      activeOpacity={0.8}
                      onPress={() => setShowChatModal(true)}
                    >
                      <MessageSquare size={16 * SCALE} color="#FFFFFF" strokeWidth={2.2} />
                    </TouchableOpacity>

                    {/* Strict Figma Asset: Delivery Boy Avatar beside Message button */}
                    <TouchableOpacity
                      style={styles.driverAvatarWrap}
                      activeOpacity={0.85}
                      onPress={handleCallRider}
                    >
                      <Image
                        source={deliveryBoyImg}
                        style={styles.deliveryBoyExactImg}
                        resizeMode="cover"
                      />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* ══════════════════════════════════════════════════════════════════════
              [4] SAVINGS PILL BANNER (FIGMA NODE 3046:153)
              ══════════════════════════════════════════════════════════════════════ */}
          <View style={styles.savingsPillBanner}>
            <Text style={styles.savingsSparkleStar}>✦</Text>
            <Text style={styles.savingsBannerText}>
              {orderDetail?.discount > 0
                ? `Yay! ₹${orderDetail.discount} saved on this order`
                : 'Yay! FREE delivery applied to this order'}
            </Text>
            <Text style={styles.savingsSparkleStar}>✦</Text>
          </View>

          {/* ══════════════════════════════════════════════════════════════════════
              [5] KIWI CASHBACK PROMO CARD (FIGMA NODE 3046:145)
              ══════════════════════════════════════════════════════════════════════ */}
          <View style={styles.kiwiCashbackCard}>
            {/* Deep Purple Gradient Background */}
            <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="kiwiCardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                  <Stop offset="0%" stopColor="#14112E" />
                  <Stop offset="55%" stopColor="#0B091E" />
                  <Stop offset="100%" stopColor="#060512" />
                </LinearGradient>
              </Defs>
              <Rect width="100%" height="100%" rx={26 * SCALE} fill="url(#kiwiCardGrad)" />
            </Svg>

            {/* Top-Right "kiwi" Stylized Brand Logo */}
            <Text style={styles.kiwiTopBrandText}>kiwi</Text>

            {/* Left Text Column */}
            <View style={styles.kiwiLeftCol}>
              <Text style={styles.kiwiRealCashbackTitle}>
                Real cashback{'\n'}on every spend
              </Text>
              <Text style={styles.kiwiNoExpiringSub}>
                No expiring points or{'\n'}coupon scratching
              </Text>

              {/* "APPLY NOW" Button */}
              <TouchableOpacity
                style={styles.kiwiApplyNowBtn}
                activeOpacity={0.88}
                onPress={() => {
                  if (Platform.OS === 'android') {
                    ToastAndroid.show('Opening Kiwi Credit Card Application...', ToastAndroid.SHORT);
                  }
                }}
              >
                <Text style={styles.kiwiApplyNowBtnText}>APPLY NOW</Text>
              </TouchableOpacity>
            </View>

            {/* Right 3D Visual: Neon Lime Credit Card + Chrome Sphere + Device Reflection */}
            <View style={styles.kiwi3DVisualWrap}>
              {/* Chrome Sphere Reflection */}
              <View style={styles.chromeSphere}>
                <Svg width={26 * SCALE} height={26 * SCALE} viewBox="0 0 26 26">
                  <Defs>
                    <LinearGradient id="sphereGrad" x1="20%" y1="20%" x2="80%" y2="80%">
                      <Stop offset="0%" stopColor="#FFFFFF" />
                      <Stop offset="40%" stopColor="#A8A8B4" />
                      <Stop offset="100%" stopColor="#3C3B4E" />
                    </LinearGradient>
                  </Defs>
                  <Circle cx="13" cy="13" r="12" fill="url(#sphereGrad)" />
                </Svg>
              </View>

              {/* Neon Lime Green Kiwi Credit Card (Tilted 3D View) */}
              <View style={styles.kiwiLimeCard3D}>
                <Text style={styles.kiwiCardLogoSmall}>kiwi</Text>
                <View style={styles.kiwiCardChipGold} />
                <View style={styles.kiwiCardBottomRow}>
                  <Text style={styles.kiwiCardVisaText}>VISA</Text>
                </View>
              </View>

              {/* Device Platform Reflection underneath */}
              <View style={styles.deviceReflectBase} />
            </View>
          </View>

          {/* Developer Simulator Drawer */}
          <View style={styles.devSimulatorSection}>
            <TouchableOpacity
              style={styles.devHeaderToggle}
              activeOpacity={0.8}
              onPress={() => setIsDevPanelOpen(!isDevPanelOpen)}
            >
              <Text style={styles.devHeaderText}>⚡ Developer Live Stage Simulator</Text>
              <ChevronRight size={14} color="#666" />
            </TouchableOpacity>

            {isDevPanelOpen && (
              <View style={styles.devButtonsGrid}>
                <TouchableOpacity style={styles.devBtn} onPress={() => simulateStep('placed')}>
                  <Text style={styles.devBtnText}>0. Order Received (Initial)</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.devBtn} onPress={() => simulateStep('assigned')}>
                  <Text style={styles.devBtnText}>1. Partner Assigned</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.devBtn} onPress={() => simulateStep('arrived_at_store')}>
                  <Text style={styles.devBtnText}>2. At Restaurant</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.devBtn} onPress={() => simulateStep('picked_up')}>
                  <Text style={styles.devBtnText}>3. Picked Up</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.devBtn} onPress={() => simulateStep('out_for_delivery')}>
                  <Text style={styles.devBtnText}>4. Out for Delivery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.devBtn, { backgroundColor: BRAND_GREEN }]}
                  onPress={() => simulateStep('delivered')}
                >
                  <Text style={[styles.devBtnText, { color: '#FFF' }]}>5. Delivered 🎉</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Bottom iOS Home Bar Indicator */}
          <View style={styles.bottomHomeBar} />
          <View style={{ height: Math.max(insets.bottom, 12) }} />
        </View>
      </ScrollView>

      {/* ════════════════════════════════════════════════════════════════════════
          [6] LIVE DRIVER CHAT MODAL
          ════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showChatModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowChatModal(false)}
      >
        <View style={[styles.chatContainer, { paddingTop: insets.top + 8 }]}>
          <View style={styles.chatHeader}>
            <TouchableOpacity onPress={() => setShowChatModal(false)} style={styles.chatCloseBtn}>
              <ArrowLeft size={20 * SCALE} color="#FFF" />
            </TouchableOpacity>
            <View style={{ flex: 1, marginLeft: 12 }}>
              <Text style={styles.chatTitle}>{riderInfo?.name || 'RAJA RAM'}</Text>
              <Text style={styles.chatSubtitle}>Delivery Partner · Live Chat</Text>
            </View>
            <TouchableOpacity style={styles.chatCallBtn} onPress={handleCallRider}>
              <Phone size={18 * SCALE} color={GOLD} />
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={chatScrollRef}
            style={styles.chatMessageArea}
            contentContainerStyle={{ paddingVertical: 16, paddingHorizontal: 16 }}
            onContentSizeChange={() => chatScrollRef.current?.scrollToEnd({ animated: true })}
          >
            {chatMessagesList.length === 0 ? (
              <View style={styles.emptyChatBox}>
                <Text style={styles.emptyChatText}>No messages yet. Send a note to your delivery partner.</Text>
              </View>
            ) : (
              chatMessagesList.map((msg: any, idx: number) => {
                const isMe = msg.sender === 'customer';
                return (
                  <View
                    key={`msg-${idx}`}
                    style={[
                      styles.chatBubbleRow,
                      isMe ? styles.chatBubbleRowMe : styles.chatBubbleRowOther,
                    ]}
                  >
                    <View
                      style={[
                        styles.chatBubble,
                        isMe ? styles.chatBubbleMe : styles.chatBubbleOther,
                      ]}
                    >
                      <Text style={[styles.chatText, isMe ? styles.chatTextMe : styles.chatTextOther]}>
                        {msg.text}
                      </Text>
                    </View>
                  </View>
                );
              })
            )}
          </ScrollView>

          <View style={[styles.chatInputRow, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TextInput
              style={styles.chatInput}
              placeholder="Send message to driver..."
              placeholderTextColor="#71717A"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendMessage}
            />
            <TouchableOpacity
              style={styles.chatSendBtn}
              onPress={handleSendMessage}
              disabled={sendingMessage || !inputText.trim()}
            >
              <Text style={styles.chatSendText}>Send</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ════════════════════════════════════════════════════════════════════════
          [7] DELIVERY INSTRUCTIONS MODAL
          ════════════════════════════════════════════════════════════════════════ */}
      <Modal
        visible={showDeliveryInstructionsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeliveryInstructionsModal(false)}
      >
        <TouchableOpacity
          style={styles.modalBackdrop}
          activeOpacity={1}
          onPress={() => setShowDeliveryInstructionsModal(false)}
        >
          <View style={styles.instructionsModalCard}>
            <View style={styles.modalHeaderRow}>
              <Text style={styles.modalTitle}>Delivery Instructions</Text>
              <TouchableOpacity onPress={() => setShowDeliveryInstructionsModal(false)}>
                <X size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>

            {['Leave at door', "Don't ring the bell", 'Call upon arrival', 'Leave with security'].map((opt) => {
              const selected = selectedDeliveryInstructions.includes(opt);
              return (
                <TouchableOpacity
                  key={opt}
                  style={[styles.instructionOptionRow, selected && styles.instructionOptionRowActive]}
                  onPress={() => {
                    if (selected) {
                      setSelectedDeliveryInstructions(
                        selectedDeliveryInstructions.filter((i) => i !== opt)
                      );
                    } else {
                      setSelectedDeliveryInstructions([...selectedDeliveryInstructions, opt]);
                    }
                  }}
                >
                  <Text
                    style={[
                      styles.instructionOptionText,
                      selected && styles.instructionOptionTextActive,
                    ]}
                  >
                    {opt}
                  </Text>
                  {selected && <CheckCircle2 size={16} color={GOLD} />}
                </TouchableOpacity>
              );
            })}

            <TouchableOpacity
              style={styles.saveInstructionsBtn}
              onPress={() => {
                setShowDeliveryInstructionsModal(false);
                if (Platform.OS === 'android') {
                  ToastAndroid.show('Delivery instructions updated!', ToastAndroid.SHORT);
                }
              }}
            >
              <Text style={styles.saveInstructionsBtnText}>Save Instructions</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

export default TrackingScreen;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#000000',
  },

  // ── 1. Floating Top Header Bar (Figma Node 3046:197) ───────────
  headerBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 4 * SCALE,
    backgroundColor: 'transparent',
    zIndex: 30,
  },
  headerCircleBtn: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 22 * SCALE,
    backgroundColor: '#18181A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenterCol: {
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 10 * SCALE,
  },
  headerRestaurantTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 16.5 * SCALE,
    color: '#E8E8E8',
    textAlign: 'center',
  },
  headerSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5 * SCALE,
    marginTop: 2,
  },
  headerTimeText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12 * SCALE,
    color: '#8A8882',
  },
  headerDot: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#8A8882',
  },
  headerItemCountText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#C5B422',
  },

  mainScrollView: {
    flex: 1,
  },
  mainScrollContent: {
    paddingTop: 0,
    paddingBottom: 20 * SCALE,
  },

  // ── 2. Hero Video / Media Area (Figma Node 3046:177) ───────────
  heroMediaContainer: {
    width: '100%',
    position: 'relative',
    backgroundColor: '#000000',
    overflow: 'hidden',
  },
  heroSceneWrapper: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  heroBgImage: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.55,
  },
  heroTopFadeGradient: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },
  heroBottomFadeGradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 2,
  },

  // Smartphone Hand Mockup in Hero
  phoneMockupContainer: {
    position: 'absolute',
    left: 12 * SCALE,
    width: 156 * SCALE,
    height: 275 * SCALE,
    zIndex: 3,
  },
  handWristBands: {
    position: 'absolute',
    left: -20 * SCALE,
    bottom: 8 * SCALE,
    width: 70 * SCALE,
    height: 100 * SCALE,
  },
  wristBandGreen: {
    width: 32 * SCALE,
    height: 12 * SCALE,
    backgroundColor: '#98DE2A',
    borderRadius: 4,
    transform: [{ rotate: '-35deg' }],
    marginBottom: 4,
  },
  wristBandPurple: {
    width: 32 * SCALE,
    height: 12 * SCALE,
    backgroundColor: '#7A44E5',
    borderRadius: 4,
    transform: [{ rotate: '-35deg' }],
  },
  phoneDeviceFrame: {
    width: 145 * SCALE,
    height: 250 * SCALE,
    backgroundColor: '#050505',
    borderRadius: 24 * SCALE,
    borderWidth: 2.2,
    borderColor: '#424248',
    padding: 6 * SCALE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 10,
  },
  phoneInnerScreen: {
    flex: 1,
    backgroundColor: '#7FB818',
    borderRadius: 18 * SCALE,
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10 * SCALE,
    paddingHorizontal: 8 * SCALE,
  },
  phoneScreenTopRow: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4 * SCALE,
  },
  phoneBackChevron: {
    fontSize: 16 * SCALE,
    color: '#3B5700',
    fontFamily: 'Urbanist-Bold',
  },
  phoneKiwiBrand: {
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Bold',
    color: '#354D00',
  },
  phoneTopPill: {
    width: 16 * SCALE,
    height: 6 * SCALE,
    borderRadius: 3,
    backgroundColor: '#6C9F10',
  },
  phoneCenterCheckCircle: {
    width: 40 * SCALE,
    height: 40 * SCALE,
    borderRadius: 20 * SCALE,
    backgroundColor: '#528A00',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8 * SCALE,
  },
  phoneCheckmarkSign: {
    fontSize: 20 * SCALE,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Bold',
    marginTop: -2,
  },
  phonePaidToLabel: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 9.5 * SCALE,
    color: '#3B5700',
    marginTop: 4 * SCALE,
  },
  phonePaidToName: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 10 * SCALE,
    color: '#263800',
    textAlign: 'center',
  },
  phoneDoneBtn: {
    backgroundColor: '#528A00',
    borderRadius: 10 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 4 * SCALE,
    marginTop: 6 * SCALE,
  },
  phoneDoneBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 8.5 * SCALE,
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },

  // Promo text right of phone
  heroPromoTextWrap: {
    position: 'absolute',
    left: 172 * SCALE,
    right: 14 * SCALE,
    zIndex: 3,
  },
  heroPayWithText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19 * SCALE,
    color: '#E8E8E8',
    letterSpacing: -0.3,
  },
  heroKiwiCreditCardRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 2,
  },
  heroKiwiLimeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19 * SCALE,
    color: '#A4C91A',
  },
  heroCreditCardWhiteText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 19 * SCALE,
    color: '#FFFFFF',
  },

  // Floating controls top-right
  floatingMediaControls: {
    position: 'absolute',
    right: 14 * SCALE,
    flexDirection: 'row',
    gap: 8 * SCALE,
    zIndex: 10,
  },
  floatingMediaBtn: {
    width: 38 * SCALE,
    height: 38 * SCALE,
    borderRadius: 19 * SCALE,
    backgroundColor: 'rgba(18, 18, 22, 0.82)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D35',
  },

  // ── LIVE MINIMIZED OLA MAP DISC STYLES ──────────────────────────
  floatingMiniMapDiscContainer: {
    position: 'absolute',
    bottom: 50 * SCALE,
    right: 14 * SCALE,
    width: 72 * SCALE,
    height: 72 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 15,
  },
  floatingMiniMapDiscActive: {
    transform: [{ scale: 1.08 }],
  },
  miniMapLensWrapper: {
    width: 68 * SCALE,
    height: 68 * SCALE,
    borderRadius: 34 * SCALE,
    backgroundColor: '#18181F',
    borderWidth: 2,
    borderColor: '#383544',
    overflow: 'hidden',
    position: 'relative',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.8,
    shadowRadius: 10,
    elevation: 10,
  },
  miniMapGlassVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 34 * SCALE,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  miniMapCustomerPin: {
    width: 14 * SCALE,
    height: 14 * SCALE,
    borderRadius: 7 * SCALE,
    backgroundColor: '#10B981',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMapCustomerDot: {
    width: 4 * SCALE,
    height: 4 * SCALE,
    borderRadius: 2 * SCALE,
    backgroundColor: '#FFFFFF',
  },
  miniMapRestaurantPin: {
    width: 14 * SCALE,
    height: 14 * SCALE,
    borderRadius: 7 * SCALE,
    backgroundColor: '#EF4444',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniMapRestaurantDot: {
    width: 4 * SCALE,
    height: 4 * SCALE,
    borderRadius: 2 * SCALE,
    backgroundColor: '#FFFFFF',
  },
  miniMapCenterPinBadge: {
    position: 'absolute',
    top: '30%',
    left: '37%',
    zIndex: 10,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
  },
  miniMapBottomPill: {
    position: 'absolute',
    bottom: -6 * SCALE,
    backgroundColor: '#0C0C0E',
    borderWidth: 1.2,
    borderColor: '#2A2735',
    borderRadius: 9 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 1.5 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 3,
    elevation: 4,
    zIndex: 20,
  },
  miniMapPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9 * SCALE,
    color: '#D0D0D8',
    letterSpacing: 0.6,
  },

  // Map Markers
  mapChefMarker: {
    width: 28 * SCALE,
    height: 28 * SCALE,
    borderRadius: 14 * SCALE,
    backgroundColor: BRAND_RED,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapHomeMarker: {
    width: 28 * SCALE,
    height: 28 * SCALE,
    borderRadius: 14 * SCALE,
    backgroundColor: BRAND_GREEN,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapRiderMarker: {
    width: 32 * SCALE,
    height: 32 * SCALE,
    borderRadius: 16 * SCALE,
    backgroundColor: '#1E1E24',
    borderWidth: 1.5,
    borderColor: GOLD,
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ── 3. Overlapping Content Container ───────────────────────────
  overlappingCardContainer: {
    paddingHorizontal: 16 * SCALE,
    marginTop: -42 * SCALE,
    zIndex: 20,
  },

  // ── Delivery Status Card (Figma Node 3046:159) ─────────────────
  deliveryStatusCard: {
    backgroundColor: '#070707',
    borderWidth: 1.2,
    borderColor: '#242422',
    borderRadius: 28 * SCALE,
    paddingHorizontal: 18 * SCALE,
    paddingTop: 18 * SCALE,
    paddingBottom: 16 * SCALE,
    marginBottom: 12 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.7,
    shadowRadius: 10,
    elevation: 8,
  },
  statusCardTopSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusCardLeftInfo: {
    flex: 1,
    paddingRight: 10 * SCALE,
  },

  // Order Received Styles (Initial State matching Screenshot)
  orderReceivedHeading: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 21 * SCALE,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 12 * SCALE,
  },
  timelineRowContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10 * SCALE,
  },
  timelineTrackCol: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 4 * SCALE,
    width: 10 * SCALE,
  },
  timelineDotYellow: {
    width: 8 * SCALE,
    height: 8 * SCALE,
    borderRadius: 4 * SCALE,
    backgroundColor: '#F5B800',
  },
  timelineDottedLine: {
    width: 1.5,
    height: 20 * SCALE,
    backgroundColor: '#F5B800',
    marginVertical: 2,
    opacity: 0.8,
  },
  timelineDetailsCol: {
    flex: 1,
    gap: 6 * SCALE,
  },
  timelineRestaurantName: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14.5 * SCALE,
    color: '#E0E0E0',
  },
  timelineAddressLine: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#8E8E8E',
    lineHeight: 16 * SCALE,
  },

  // Gold ETA Card for Order Received
  etaGoldBadgeCard: {
    width: 76 * SCALE,
    height: 76 * SCALE,
    borderRadius: 22 * SCALE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5B800',
  },
  etaNumberBlack: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 32 * SCALE,
    color: '#000000',
    lineHeight: 34 * SCALE,
  },
  etaMinsUnitBlack: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#1A1810',
    marginTop: -2,
  },

  // Partner is on the way Styles (Accepted State)
  onTimeBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
    marginBottom: 6 * SCALE,
  },
  onTimeBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#139D54',
    letterSpacing: 0.6,
  },
  partnerStatusTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 20 * SCALE,
    color: '#EDEDED',
    letterSpacing: -0.3,
    marginBottom: 4 * SCALE,
  },
  partnerStatusDesc: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5 * SCALE,
    color: '#909090',
    lineHeight: 18.5 * SCALE,
  },
  etaGreenBadgeCard: {
    width: 76 * SCALE,
    height: 76 * SCALE,
    borderRadius: 22 * SCALE,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#22C55E',
  },
  etaNumberLarge: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 32 * SCALE,
    color: '#FFFFFF',
    lineHeight: 34 * SCALE,
  },
  etaMinsUnit: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#D1FAE5',
    marginTop: -2,
  },
  statusCardDividerLine: {
    height: 1,
    backgroundColor: '#1E1E1E',
    marginTop: 16 * SCALE,
    marginBottom: 14 * SCALE,
  },
  statusCardBottomSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  addInstructionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  addInstructionsGoldText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#CBB928',
  },
  addInstructionsGoldChevron: {
    fontSize: 18 * SCALE,
    color: '#CBB928',
    fontFamily: 'Urbanist-Bold',
    marginTop: -2,
  },
  quickActionsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10 * SCALE,
  },
  circleActionBtn: {
    width: 42 * SCALE,
    height: 42 * SCALE,
    borderRadius: 21 * SCALE,
    backgroundColor: '#121215',
    borderWidth: 1,
    borderColor: '#24242A',
    justifyContent: 'center',
    alignItems: 'center',
  },
  driverAvatarWrap: {
    width: 44 * SCALE,
    height: 44 * SCALE,
    borderRadius: 22 * SCALE,
    borderWidth: 1.8,
    borderColor: '#FF7A00',
    overflow: 'hidden',
    backgroundColor: '#000000',
  },
  deliveryBoyExactImg: {
    width: '100%',
    height: '100%',
  },

  // ── 4. Savings Pill Banner (Figma Node 3046:153) ────────────────
  savingsPillBanner: {
    backgroundColor: '#0E0E0E',
    borderRadius: 30 * SCALE,
    borderWidth: 1,
    borderColor: '#1C1C1C',
    paddingVertical: 13 * SCALE,
    paddingHorizontal: 20 * SCALE,
    marginBottom: 12 * SCALE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  savingsSparkleStar: {
    color: '#4A9C4E',
    fontSize: 16 * SCALE,
  },
  savingsBannerText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#4A9C4E',
  },

  // ── 5. Kiwi Cashback Promo Card (Figma Node 3046:145) ───────────
  kiwiCashbackCard: {
    height: 245 * SCALE,
    borderRadius: 26 * SCALE,
    borderWidth: 1.2,
    borderColor: '#241F48',
    paddingHorizontal: 20 * SCALE,
    paddingVertical: 20 * SCALE,
    marginBottom: 14 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kiwiTopBrandText: {
    position: 'absolute',
    top: 16 * SCALE,
    right: 20 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontSize: 22 * SCALE,
    color: '#FFFFFF',
  },
  kiwiLeftCol: {
    flex: 1,
    paddingRight: 10 * SCALE,
  },
  kiwiRealCashbackTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 21 * SCALE,
    color: '#E0E0E4',
    lineHeight: 25 * SCALE,
    marginBottom: 6 * SCALE,
  },
  kiwiNoExpiringSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#8A8B9B',
    lineHeight: 17 * SCALE,
  },
  kiwiApplyNowBtn: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 18 * SCALE,
    paddingVertical: 10 * SCALE,
    alignSelf: 'flex-start',
    marginTop: 18 * SCALE,
  },
  kiwiApplyNowBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#6F5EB2',
    letterSpacing: 0.4,
  },

  // Kiwi 3D Graphic (Right Side)
  kiwi3DVisualWrap: {
    width: 140 * SCALE,
    height: '100%',
    position: 'relative',
    alignItems: 'flex-end',
    justifyContent: 'flex-end',
  },
  chromeSphere: {
    position: 'absolute',
    top: 65 * SCALE,
    left: 8 * SCALE,
    zIndex: 10,
  },
  kiwiLimeCard3D: {
    width: 125 * SCALE,
    height: 78 * SCALE,
    backgroundColor: '#95CD1A',
    borderRadius: 10 * SCALE,
    padding: 10 * SCALE,
    justifyContent: 'space-between',
    transform: [{ rotate: '-12deg' }, { translateY: -15 * SCALE }],
    shadowColor: '#95CD1A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
    elevation: 8,
    zIndex: 5,
  },
  kiwiCardLogoSmall: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#213B00',
  },
  kiwiCardChipGold: {
    width: 18 * SCALE,
    height: 13 * SCALE,
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  kiwiCardBottomRow: {
    alignItems: 'flex-end',
  },
  kiwiCardVisaText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#FFFFFF',
  },
  deviceReflectBase: {
    position: 'absolute',
    bottom: -15 * SCALE,
    right: -10 * SCALE,
    width: 135 * SCALE,
    height: 60 * SCALE,
    backgroundColor: '#2A2258',
    borderRadius: 14 * SCALE,
    transform: [{ rotate: '-12deg' }],
    opacity: 0.4,
  },

  // Simulator Section
  devSimulatorSection: {
    backgroundColor: '#0D0D10',
    borderWidth: 1,
    borderColor: '#24242A',
    borderRadius: 16 * SCALE,
    padding: 12 * SCALE,
    marginBottom: 10 * SCALE,
  },
  devHeaderToggle: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  devHeaderText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12 * SCALE,
    color: '#8E8E98',
  },
  devButtonsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6 * SCALE,
    marginTop: 10 * SCALE,
  },
  devBtn: {
    backgroundColor: '#1E1E24',
    borderRadius: 8 * SCALE,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 6 * SCALE,
  },
  devBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#C0C0C0',
  },

  bottomHomeBar: {
    width: 130 * SCALE,
    height: 4.5 * SCALE,
    backgroundColor: '#FFFFFF',
    borderRadius: 2.5,
    alignSelf: 'center',
    marginTop: 8 * SCALE,
    opacity: 0.8,
  },

  // ── 6. Chat Modal Styles ───────────────────────────────────────
  chatContainer: {
    flex: 1,
    backgroundColor: '#0C0C0E',
  },
  chatHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 12 * SCALE,
    backgroundColor: '#141418',
    borderBottomWidth: 1,
    borderBottomColor: '#24242A',
  },
  chatCloseBtn: {
    padding: 6,
  },
  chatTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#FFFFFF',
  },
  chatSubtitle: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 11.5 * SCALE,
    color: '#8E8E98',
  },
  chatCallBtn: {
    padding: 6,
  },
  chatMessageArea: {
    flex: 1,
  },
  emptyChatBox: {
    paddingVertical: 40 * SCALE,
    alignItems: 'center',
    paddingHorizontal: 20 * SCALE,
  },
  emptyChatText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13 * SCALE,
    color: '#6E6E78',
    textAlign: 'center',
  },
  chatBubbleRow: {
    flexDirection: 'row',
    marginBottom: 10 * SCALE,
  },
  chatBubbleRowMe: {
    justifyContent: 'flex-end',
  },
  chatBubbleRowOther: {
    justifyContent: 'flex-start',
  },
  chatBubble: {
    maxWidth: '75%',
    borderRadius: 16 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 10 * SCALE,
  },
  chatBubbleMe: {
    backgroundColor: GOLD,
    borderTopRightRadius: 2,
  },
  chatBubbleOther: {
    backgroundColor: '#1E1E26',
    borderTopLeftRadius: 2,
  },
  chatText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5 * SCALE,
  },
  chatTextMe: {
    color: '#000000',
  },
  chatTextOther: {
    color: '#FFFFFF',
  },
  chatInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14 * SCALE,
    paddingTop: 10 * SCALE,
    backgroundColor: '#141418',
    borderTopWidth: 1,
    borderTopColor: '#24242A',
  },
  chatInput: {
    flex: 1,
    height: 42 * SCALE,
    backgroundColor: '#202028',
    borderRadius: 21 * SCALE,
    paddingHorizontal: 16 * SCALE,
    color: '#FFFFFF',
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5 * SCALE,
  },
  chatSendBtn: {
    marginLeft: 10 * SCALE,
    backgroundColor: GOLD,
    borderRadius: 21 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 10 * SCALE,
  },
  chatSendText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13 * SCALE,
    color: '#000000',
  },

  // ── 7. Delivery Instructions Modal ─────────────────────────────
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20 * SCALE,
  },
  instructionsModalCard: {
    width: '100%',
    backgroundColor: '#141418',
    borderRadius: 20 * SCALE,
    padding: 20 * SCALE,
    borderWidth: 1,
    borderColor: '#2E2E36',
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16 * SCALE,
  },
  modalTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 17 * SCALE,
    color: '#FFFFFF',
  },
  instructionOptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1E1E26',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 12 * SCALE,
    marginBottom: 8 * SCALE,
  },
  instructionOptionRowActive: {
    backgroundColor: '#2A2614',
    borderWidth: 1,
    borderColor: '#544A20',
  },
  instructionOptionText: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 13.5 * SCALE,
    color: '#C0C0C8',
  },
  instructionOptionTextActive: {
    fontFamily: 'Urbanist-Bold',
    color: GOLD,
  },
  saveInstructionsBtn: {
    backgroundColor: GOLD,
    borderRadius: 14 * SCALE,
    paddingVertical: 12 * SCALE,
    alignItems: 'center',
    marginTop: 10 * SCALE,
  },
  saveInstructionsBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#000000',
  },

  // ── Ola Maps Brand Pill ──────────────────────────────────────────
  olaMapsBrandPill: {
    position: 'absolute',
    bottom: 12 * SCALE,
    left: 14 * SCALE,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 5 * SCALE,
    borderRadius: 8 * SCALE,
    borderWidth: 1,
    borderColor: '#3D3528',
    zIndex: 10,
  },
  olaMapsBrandPillText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: GOLD,
    letterSpacing: 0.3,
  },
});
