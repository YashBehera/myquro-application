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
import { useVideoPlayer, VideoView } from 'expo-video';
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
  ShoppingBag,
  Home,
  Check,
  Clock,
  AlertCircle,
  ShieldCheck,
} from 'lucide-react-native';
import { DeliveredOrderView } from './DeliveredOrderView';
import Svg, {
  Rect,
  Path,
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Stop,
} from 'react-native-svg';

import { BACKEND_URL, OLA_MAPS_API_KEY } from '../config';
import { SecureStorage } from '../utils/secureStorage';

// Public fallback session token to access live delivery tracking when customer is unauthenticated
const PUBLIC_FALLBACK_TRACKING_TOKEN = 'Sd1mjQDnOckkKUkS8ddE0WJ3TJ8gG9Jv';

// Direct Neon DB credentials for resilient real-time kitchen preparation sync
const NEON_CONN_STRING = 'postgresql://neondb_owner:npg_Tyq7fb1lexRO@ep-fancy-shape-aisogkwg-pooler.c-4.us-east-1.aws.neon.tech/neondb?sslmode=require';
const NEON_SQL_ENDPOINT = 'https://ep-fancy-shape-aisogkwg-pooler.c-4.us-east-1.aws.neon.tech/sql';
import { useViewModel } from '../state/MainViewModel';

// Strict Figma Assets
const deliveryBoyImg = require('../assets/tracking/delivery_boy.png');
import {
  SCALE,
  scale,
  moderateScale,
  isTablet,
  isSmallDevice,
  SCREEN_WIDTH,
  MAX_CONTENT_WIDTH,
} from '../utils/responsive';

const BRAND_RED = '#E03546';
const BRAND_GREEN = '#149E55';
const GOLD = '#DEA430';

// ─── Decode Ola Maps Directions API precision-5 polyline format into GeoJSON [lng, lat] coordinates ─────
function decodePolyline(str: string, precision = 5): [number, number][] {
  let index = 0, lat = 0, lng = 0;
  const coordinates: [number, number][] = [];
  const factor = Math.pow(10, precision);

  while (index < str.length) {
    let byte = 0, shift = 0, result = 0;
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

    coordinates.push([Number((lng / factor).toFixed(6)), Number((lat / factor).toFixed(6))]);
  }
  return coordinates;
}

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
  roadCoords: [number, number][] = [],
): string {
  // Quadratic bezier curve points fallback
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
        Number((mt * mt * fromLng + 2 * mt * t * cpLng + t * t * toLng).toFixed(6)),
        Number((mt * mt * fromLat + 2 * mt * t * cpLat + t * t * toLat).toFixed(6)),
      ]);
    }
    return pts;
  }

  const isRiderAssigned = ['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isGoingToPickup = ['assigned', 'arrived_at_store'].includes(currentStatus);
  const isPickedUp = ['picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isUnassigned = !isRiderAssigned;

  // Active navigation route coordinates:
  // Use exact road coordinates if available, otherwise fallback to bezier curve
  let activeCoords: [number, number][] = [];
  if (roadCoords && roadCoords.length > 0) {
    activeCoords = roadCoords;
  } else if (isGoingToPickup) {
    activeCoords = bezier(riderLng, riderLat, storeLng, storeLat);
  } else if (isPickedUp) {
    activeCoords = bezier(riderLng, riderLat, dropLng, dropLat);
  } else {
    activeCoords = bezier(storeLng, storeLat, dropLng, dropLat);
  }

  const activeCoordsJson = JSON.stringify(activeCoords);

  // Bounds
  let allLats = [storeLat, dropLat];
  let allLngs = [storeLng, dropLng];
  if (isPickedUp) {
    allLats = [riderLat, dropLat];
    allLngs = [riderLng, dropLng];
  } else if (isGoingToPickup) {
    allLats = [riderLat, storeLat];
    allLngs = [riderLng, storeLng];
  }

  if (activeCoords.length > 0) {
    activeCoords.forEach(([lng, lat]) => {
      allLats.push(lat);
      allLngs.push(lng);
    });
  }

  const minLat = Math.min(...allLats) - 0.008;
  const maxLat = Math.max(...allLats) + 0.008;
  const minLng = Math.min(...allLngs) - 0.008;
  const maxLng = Math.max(...allLngs) + 0.008;

  const centerLng = (minLng + maxLng) / 2;
  const centerLat = (minLat + maxLat) / 2;

  const storeNameJson = JSON.stringify(storeName || 'Restaurant');

  // Route colors:
  // - Going to pickup: Emerald Green (#059669) route to restaurant
  // - Picked up / Out for delivery: Electric Blue (#2563EB) route to customer
  // - Unassigned: Gold (#DEA430) dashed route
  const routeColor = isGoingToPickup ? '#059669' : (isPickedUp ? '#2563EB' : '#DEA430');
  const glowColor = isGoingToPickup ? '#10B981' : (isPickedUp ? '#3B82F6' : '#DEA430');
  const isDashed = isUnassigned;

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

    /* Animated Delivery Bike Marker */
    .bike-marker{
      position:relative;
      width:40px;height:40px;
      display:flex;align-items:center;justify-content:center;
      pointer-events:none;
    }
    .bike-aura{
      position:absolute;
      width:38px;height:38px;border-radius:19px;
      background:rgba(56,189,248,0.28);
      animation:bike-pulse 1.8s infinite ease-out;
    }
    @keyframes bike-pulse{
      0%{transform:scale(0.85);opacity:0.9;}
      100%{transform:scale(1.55);opacity:0;}
    }
    .bike-icon-wrapper{
      width:34px;height:34px;
      display:flex;align-items:center;justify-content:center;
      transform-origin:center center;
      transition:transform 0.35s cubic-bezier(0.25,1,0.5,1);
      filter:drop-shadow(0 3px 6px rgba(0,0,0,0.5));
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var currentRiderLng = ${riderLng};
  var currentRiderLat = ${riderLat};
  var riderMarker = null;
  var animationFrameId = null;

  var map = new maplibregl.Map({
    container:'map',
    style:'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
    center:[${centerLng},${centerLat}],
    zoom:13,
    attributionControl:false,
    transformRequest:function(url){return{url:url+(url.includes('?')?'&':'?')+'api_key=${apiKey}'}}
  });

  function calculateBearing(lat1, lon1, lat2, lon2) {
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var lat1Rad = lat1 * Math.PI / 180;
    var lat2Rad = lat2 * Math.PI / 180;
    var y = Math.sin(dLon) * Math.cos(lat2Rad);
    var x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    var brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  // Smooth live animation of rider bike marker with bearing rotation
  window.updateRiderPosition = function(targetLng, targetLat) {
    targetLng = Number(targetLng);
    targetLat = Number(targetLat);
    if (isNaN(targetLng) || isNaN(targetLat)) return;

    if (!riderMarker) {
      var bikeEl = document.createElement('div');
      bikeEl.className = 'bike-marker';
      bikeEl.id = 'rider-bike-marker';
      bikeEl.innerHTML = '<div class="bike-aura"></div><div class="bike-icon-wrapper" id="bike-icon-inner"><svg width="34" height="34" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="16" fill="#0F172A" stroke="#38BDF8" stroke-width="2.5"/><polygon points="18,3 23,10 13,10" fill="#38BDF8"/><rect x="16" y="10" width="4" height="16" rx="2" fill="#F8FAFC"/><circle cx="18" cy="12" r="2.2" fill="#0284C7"/><line x1="12" y1="12" x2="24" y2="12" stroke="#CBD5E1" stroke-width="2.2" stroke-linecap="round"/><circle cx="18" cy="23" r="2.5" fill="#0284C7"/><rect x="13" y="15" width="10" height="7.5" rx="2" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1"/></svg></div>';
      riderMarker = new maplibregl.Marker({element: bikeEl, anchor: 'center'}).setLngLat([targetLng, targetLat]).addTo(map);
      currentRiderLng = targetLng;
      currentRiderLat = targetLat;
      return;
    }

    var dist = Math.hypot(targetLng - currentRiderLng, targetLat - currentRiderLat);
    if (dist > 0.000015) {
      var bearing = calculateBearing(currentRiderLat, currentRiderLng, targetLat, targetLng);
      var iconEl = document.getElementById('bike-icon-inner');
      if (iconEl) {
        iconEl.style.transform = 'rotate(' + Math.round(bearing) + 'deg)';
      }
    }

    if (animationFrameId) cancelAnimationFrame(animationFrameId);

    var startLng = currentRiderLng;
    var startLat = currentRiderLat;
    var startTime = performance.now();
    var duration = 1200;

    function step(now) {
      var elapsed = now - startTime;
      var progress = Math.min(1, elapsed / duration);
      var ease = 1 - Math.pow(1 - progress, 2);
      var curLng = startLng + (targetLng - startLng) * ease;
      var curLat = startLat + (targetLat - startLat) * ease;
      currentRiderLng = curLng;
      currentRiderLat = curLat;
      riderMarker.setLngLat([curLng, curLat]);

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    }
    animationFrameId = requestAnimationFrame(step);
  };

  // Dynamic route update without map reload
  window.updateRouteCoords = function(coords) {
    try {
      var parsed = typeof coords === 'string' ? JSON.parse(coords) : coords;
      if (map && map.getSource('route-active') && Array.isArray(parsed) && parsed.length > 0) {
        map.getSource('route-active').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: parsed }
        });
        var lats = parsed.map(function(pt){ return pt[1]; });
        var lngs = parsed.map(function(pt){ return pt[0]; });
        var minX = Math.min.apply(null, lngs) - 0.006;
        var maxX = Math.max.apply(null, lngs) + 0.006;
        var minY = Math.min.apply(null, lats) - 0.006;
        var maxY = Math.max.apply(null, lats) + 0.006;
        map.fitBounds([[minX, minY], [maxX, maxY]], {
          padding: { top: 80, bottom: 120, left: 50, right: 50 },
          duration: 900
        });
      }
    } catch(e) {}
  };

  map.on('load',function(){
    map.fitBounds([[${minLng},${minLat}],[${maxLng},${maxLat}]],{
      padding:{top:80,bottom:120,left:50,right:50},duration:0
    });

    // ── Active Navigation Road Route Layer (Exact Road / Street Geometry) ──
    map.addSource('route-active',{
      type:'geojson',
      data:{
        type:'Feature',
        geometry:{type:'LineString',coordinates:${activeCoordsJson}}
      }
    });

    ${isDashed ? `
      map.addLayer({
        id:'route-active-line',type:'line',source:'route-active',
        paint:{
          'line-color':'${routeColor}',
          'line-width':3.5,
          'line-dasharray':[2.5,2.5]
        },
        layout:{'line-join':'round','line-cap':'round'}
      });
    ` : `
      // Outer glow casing
      map.addLayer({
        id:'route-active-glow',type:'line',source:'route-active',
        paint:{
          'line-color':'${glowColor}',
          'line-width':7,
          'line-opacity':0.35
        },
        layout:{'line-join':'round','line-cap':'round'}
      });
      // Main vibrant road line
      map.addLayer({
        id:'route-active-core',type:'line',source:'route-active',
        paint:{
          'line-color':'${routeColor}',
          'line-width':4.5
        },
        layout:{'line-join':'round','line-cap':'round'}
      });
    `}

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

    // Live Delivery Bike Marker with directional pointer
    if (${isRiderAssigned}) {
      var bikeEl=document.createElement('div');
      bikeEl.className='bike-marker';
      bikeEl.id='rider-bike-marker';
      bikeEl.innerHTML='<div class="bike-aura"></div><div class="bike-icon-wrapper" id="bike-icon-inner"><svg width="34" height="34" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="18" r="16" fill="#0F172A" stroke="#38BDF8" stroke-width="2.5"/><polygon points="18,3 23,10 13,10" fill="#38BDF8"/><rect x="16" y="10" width="4" height="16" rx="2" fill="#F8FAFC"/><circle cx="18" cy="12" r="2.2" fill="#0284C7"/><line x1="12" y1="12" x2="24" y2="12" stroke="#CBD5E1" stroke-width="2.2" stroke-linecap="round"/><circle cx="18" cy="23" r="2.5" fill="#0284C7"/><rect x="13" y="15" width="10" height="7.5" rx="2" fill="#F59E0B" stroke="#FFFFFF" stroke-width="1"/></svg></div>';
      riderMarker = new maplibregl.Marker({element:bikeEl,anchor:'center'}).setLngLat([${riderLng},${riderLat}]).addTo(map);

      // Initial bearing towards immediate waypoint
      var destLat = ${isGoingToPickup ? storeLat : dropLat};
      var destLng = ${isGoingToPickup ? storeLng : dropLng};
      var initBearing = calculateBearing(${riderLat}, ${riderLng}, destLat, destLng);
      var iconEl = document.getElementById('bike-icon-inner');
      if (iconEl && !isNaN(initBearing)) {
        iconEl.style.transform = 'rotate(' + Math.round(initBearing) + 'deg)';
      }
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
  roadCoords: [number, number][] = [],
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
        Number((mt * mt * fromLng + 2 * mt * t * cpLng + t * t * toLng).toFixed(6)),
        Number((mt * mt * fromLat + 2 * mt * t * cpLat + t * t * toLat).toFixed(6)),
      ]);
    }
    return pts;
  }

  const isRiderAssigned = ['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isGoingToPickup = ['assigned', 'arrived_at_store'].includes(currentStatus);
  const isPickedUp = ['picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isUnassigned = !isRiderAssigned;

  let activeCoords: [number, number][] = [];
  if (roadCoords && roadCoords.length > 0) {
    activeCoords = roadCoords;
  } else if (isGoingToPickup) {
    activeCoords = bezier(riderLng, riderLat, storeLng, storeLat);
  } else if (isPickedUp) {
    activeCoords = bezier(riderLng, riderLat, dropLng, dropLat);
  } else {
    activeCoords = bezier(storeLng, storeLat, dropLng, dropLat);
  }

  const activeCoordsJson = JSON.stringify(activeCoords);

  let allLats = [storeLat, dropLat];
  let allLngs = [storeLng, dropLng];
  if (isPickedUp) {
    allLats = [riderLat, dropLat];
    allLngs = [riderLng, dropLng];
  } else if (isGoingToPickup) {
    allLats = [riderLat, storeLat];
    allLngs = [riderLng, storeLng];
  }

  const minLat = Math.min(...allLats) - 0.006;
  const maxLat = Math.max(...allLats) + 0.006;
  const minLng = Math.min(...allLngs) - 0.006;
  const maxLng = Math.max(...allLngs) + 0.006;

  const routeColor = isGoingToPickup ? '#059669' : (isPickedUp ? '#2563EB' : '#DEA430');
  const isDashed = isUnassigned;

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
    .mini-bike{
      width:18px;height:18px;border-radius:9px;background:#0F172A;border:1.5px solid #38BDF8;
      display:flex;align-items:center;justify-content:center;
      transform-origin:center center;
      transition:transform 0.35s ease;
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var currentRiderLng = ${riderLng};
  var currentRiderLat = ${riderLat};
  var riderMarker = null;

  var map = new maplibregl.Map({
    container:'map',
    style:'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
    center:[${(minLng + maxLng) / 2},${(minLat + maxLat) / 2}],
    zoom:13,
    attributionControl:false,
    interactive:false,
    transformRequest:function(url){return{url:url+(url.includes('?')?'&':'?')+'api_key=${apiKey}'}}
  });

  function calculateBearing(lat1, lon1, lat2, lon2) {
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var lat1Rad = lat1 * Math.PI / 180;
    var lat2Rad = lat2 * Math.PI / 180;
    var y = Math.sin(dLon) * Math.cos(lat2Rad);
    var x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLon);
    var brng = Math.atan2(y, x) * 180 / Math.PI;
    return (brng + 360) % 360;
  }

  window.updateRiderPosition = function(targetLng, targetLat) {
    targetLng = Number(targetLng);
    targetLat = Number(targetLat);
    if (isNaN(targetLng) || isNaN(targetLat)) return;

    if (!riderMarker) {
      var p3 = document.createElement('div');
      p3.className = 'mini-bike';
      p3.id = 'mini-bike-inner';
      p3.innerHTML = '<svg width="10" height="10" viewBox="0 0 24 24" fill="#38BDF8"><polygon points="12,2 20,18 12,14 4,18"/></svg>';
      riderMarker = new maplibregl.Marker({element: p3, anchor: 'center'}).setLngLat([targetLng, targetLat]).addTo(map);
      currentRiderLng = targetLng;
      currentRiderLat = targetLat;
      return;
    }

    var dist = Math.hypot(targetLng - currentRiderLng, targetLat - currentRiderLat);
    if (dist > 0.000015) {
      var bearing = calculateBearing(currentRiderLat, currentRiderLng, targetLat, targetLng);
      var iconEl = document.getElementById('mini-bike-inner');
      if (iconEl) iconEl.style.transform = 'rotate(' + Math.round(bearing) + 'deg)';
    }
    currentRiderLng = targetLng;
    currentRiderLat = targetLat;
    riderMarker.setLngLat([targetLng, targetLat]);
  };

  window.updateRouteCoords = function(coords) {
    try {
      var parsed = typeof coords === 'string' ? JSON.parse(coords) : coords;
      if (map && map.getSource('route-active') && Array.isArray(parsed) && parsed.length > 0) {
        map.getSource('route-active').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: parsed }
        });
        var lats = parsed.map(function(pt){ return pt[1]; });
        var lngs = parsed.map(function(pt){ return pt[0]; });
        var minX = Math.min.apply(null, lngs) - 0.004;
        var maxX = Math.max.apply(null, lngs) + 0.004;
        var minY = Math.min.apply(null, lats) - 0.004;
        var maxY = Math.max.apply(null, lats) + 0.004;
        map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 20, duration: 900 });
      }
    } catch(e) {}
  };

  map.on('load',function(){
    map.fitBounds([[${minLng},${minLat}],[${maxLng},${maxLat}]],{padding:20,duration:0});

    map.addSource('route-active',{
      type:'geojson',
      data:{type:'Feature',geometry:{type:'LineString',coordinates:${activeCoordsJson}}}
    });
    map.addLayer({
      id:'route-active-line',type:'line',source:'route-active',
      paint:{
        'line-color':'${routeColor}',
        'line-width':3,
        ${isDashed ? "'line-dasharray':[2,2]" : ''}
      },
      layout:{'line-join':'round','line-cap':'round'}
    });

    var p1=document.createElement('div'); p1.className='pin';
    new maplibregl.Marker({element:p1,anchor:'center'}).setLngLat([${storeLng},${storeLat}]).addTo(map);

    var p2=document.createElement('div'); p2.className='cust';
    new maplibregl.Marker({element:p2,anchor:'center'}).setLngLat([${dropLng},${dropLat}]).addTo(map);

    if (${isRiderAssigned}) {
      var p3=document.createElement('div');
      p3.className='mini-bike';
      p3.id='mini-bike-inner';
      p3.innerHTML='<svg width="10" height="10" viewBox="0 0 24 24" fill="#38BDF8"><polygon points="12,2 20,18 12,14 4,18"/></svg>';
      riderMarker = new maplibregl.Marker({element:p3,anchor:'center'}).setLngLat([${riderLng},${riderLat}]).addTo(map);

      var destLat = ${isGoingToPickup ? storeLat : dropLat};
      var destLng = ${isGoingToPickup ? storeLng : dropLng};
      var initBearing = calculateBearing(${riderLat}, ${riderLng}, destLat, destLng);
      var miniIcon = document.getElementById('mini-bike-inner');
      if (miniIcon && !isNaN(initBearing)) {
        miniIcon.style.transform = 'rotate(' + Math.round(initBearing) + 'deg)';
      }
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

// ─── Default Rich Mock Data for Instant Preview / Design Editing ─────────────
const DEFAULT_MOCK_ORDER = {
  id: 'ORD-98421',
  orderId: 'ORD-98421',
  restaurantName: 'The Maharaja Restaurant',
  restaurantAddress: 'Plot 42, Patrapada, Bhubaneswar',
  restaurantPhone: '+91 98765 43210',
  restaurantLatitude: 20.3009,
  restaurantLongitude: 85.8199,
  deliveryAddress: 'Flat 402, Royal Palms, Infocity, Bhubaneswar',
  customerLatitude: 20.2505,
  customerLongitude: 85.7882,
  status: 'placed',
  prepTimeMinutes: 20,
  extendedPrepMinutes: 0,
  etaMinutes: 28,
  createdAt: new Date().toISOString(),
  totalAmount: 589,
  itemTotal: 520,
  tax: 26,
  deliveryFee: 0,
  platformFee: 5,
  discount: 140,
  couponCode: 'DELULU4FOOD',
  paymentMethod: 'UPI (PhonePe)',
  items: [
    {
      id: 'item_1',
      menuItemName: 'Paneer Butter Masala (Special)',
      name: 'Paneer Butter Masala (Special)',
      quantity: 1,
      price: 280,
      isVeg: true,
      customization: 'Spicy • Extra Butter',
    },
    {
      id: 'item_2',
      menuItemName: 'Butter Garlic Naan',
      name: 'Butter Garlic Naan',
      quantity: 2,
      price: 60,
      isVeg: true,
    },
    {
      id: 'item_3',
      menuItemName: 'Hyderabadi Veg Dum Biryani',
      name: 'Hyderabadi Veg Dum Biryani',
      quantity: 1,
      price: 220,
      isVeg: true,
      customization: 'With Raita & Salan',
    },
  ],
};

const DEFAULT_MOCK_TRACKING = {
  orderId: 'ORD-98421',
  status: 'placed',
  riderId: null,
  currentLat: 20.2750,
  currentLng: 85.8040,
  restaurantLat: 20.3009,
  restaurantLng: 85.8199,
  customerLat: 20.2505,
  customerLng: 85.7882,
  etaMinutes: 18,
};

// Kitchen status lifecycle rank (strictly restaurant order states)
const KITCHEN_STATUS_RANK: Record<string, number> = {
  placed: 1,
  confirmed: 2,
  preparing: 3,
  ready: 4,
  served: 5,
  delivered: 6,
  cancelled: 99,
  rejected: 99,
};

const mergeKitchenStatus = (currentStatus?: string, incomingStatus?: string): string => {
  if (!incomingStatus) return currentStatus || 'placed';
  // If incoming status is actually a delivery status, do not overwrite kitchen status with it
  if (['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery'].includes(incomingStatus)) {
    return currentStatus || 'preparing';
  }
  if (!currentStatus) return incomingStatus;

  // Terminal cancellation / rejection always takes priority
  if (incomingStatus === 'cancelled' || incomingStatus === 'rejected') return incomingStatus;
  if (currentStatus === 'cancelled' || currentStatus === 'rejected') return currentStatus;

  const currentRank = KITCHEN_STATUS_RANK[currentStatus] || 0;
  const incomingRank = KITCHEN_STATUS_RANK[incomingStatus] || 0;

  return incomingRank >= currentRank ? incomingStatus : currentStatus;
};

// Delivery status lifecycle rank (strictly rider / transit states)
const DELIVERY_STATUS_RANK: Record<string, number> = {
  unassigned: 0,
  offered: 1,
  assigned: 2,
  arrived_at_store: 3,
  picked_up: 4,
  out_for_delivery: 5,
  delivered: 6,
  cancelled: 99,
};

const mergeDeliveryStatus = (currentStatus?: string, incomingStatus?: string): string => {
  if (!incomingStatus) return currentStatus || 'unassigned';
  if (!currentStatus) return incomingStatus;
  const currentRank = DELIVERY_STATUS_RANK[currentStatus] || 0;
  const incomingRank = DELIVERY_STATUS_RANK[incomingStatus] || 0;
  return incomingRank >= currentRank ? incomingStatus : currentStatus;
};

// Backwards compatibility alias
const mergeOrderStatus = mergeKitchenStatus;

// ── Price & Amount Normalizers for Orders & Items ──
export const normalizePrice = (raw: any): number => {
  if (raw === undefined || raw === null || raw === '') return 0;
  let num = typeof raw === 'number' ? raw : (parseFloat(String(raw).replace(/[^0-9.]/g, '')) || 0);
  if (isNaN(num) || num <= 0) return 0;
  // Handle paise: e.g. 15000 -> 150, 30000 -> 300, 29900 -> 299, 45000 -> 450
  if (num >= 1000 && num % 100 === 0) {
    num = num / 100;
  } else if (num >= 2000) {
    num = num / 100;
  }
  return Math.round(num);
};

export const getItemPrice = (it: any): number => {
  if (!it) return 0;
  const qty = Math.max(1, parseInt(String(it.quantity || it.qty || 1), 10));
  const rawUnit = it.price ?? it.unitPrice ?? it.basePrice ?? it.itemPrice ?? it.foodItem?.price;
  let unitPrice = normalizePrice(rawUnit);
  if (unitPrice <= 0 && it.totalPrice !== undefined && it.totalPrice !== null) {
    const normalizedTotal = normalizePrice(it.totalPrice);
    unitPrice = qty > 1 ? Math.round(normalizedTotal / qty) : normalizedTotal;
  }
  return Math.max(0, unitPrice);
};

export const getOrderTotalAmount = (order: any, itemsList: any[] = []): number => {
  if (!order) return 0;
  const raw = order.grandTotal ?? order.totalAmount ?? order.billTotal ?? order.amount ?? order.subtotal;
  let total = normalizePrice(raw);
  if (total > 0) return total;

  if (itemsList && itemsList.length > 0) {
    const sum = itemsList.reduce((acc: number, it: any) => {
      const p = getItemPrice(it);
      const q = Math.max(1, parseInt(String(it.quantity || it.qty || 1), 10));
      return acc + (p * q);
    }, 0);
    if (sum > 0) return Math.round(sum);
  }
  return 0;
};

interface TrackingScreenProps {
  orderId: string | null;
  onBack: () => void;
}

export const TrackingScreen: React.FC<TrackingScreenProps> = ({ orderId, onBack }) => {
  const insets = useSafeAreaInsets();
  const { authState, currentLocation, savedAddresses, allRestaurants, cartItems } = useViewModel();
  const sessionToken = authState.type === 'Authenticated' ? authState.sessionToken : '';

  const isRealOrder = Boolean(orderId && orderId !== 'ORD-98421');

  const [loading, setLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(() => {
    if (!isRealOrder) return DEFAULT_MOCK_ORDER;
    return {
      id: orderId,
      orderId: orderId,
      status: 'placed',
      prepTimeMinutes: 20,
      extendedPrepMinutes: 0,
      createdAt: new Date().toISOString(),
      items: [],
    };
  });
  const [trackingData, setTrackingData] = useState<any>(() => {
    if (!isRealOrder) return DEFAULT_MOCK_TRACKING;
    return null;
  });
  const [riderInfo, setRiderInfo] = useState<any>(null);
  const [olaTransitMins, setOlaTransitMins] = useState<number | null>(null);
  const [roadRouteCoords, setRoadRouteCoords] = useState<[number, number][]>([]);
  const fullMapWebviewRef = useRef<WebView>(null);
  const miniMapWebviewRef = useRef<WebView>(null);
  const [prepExtensionNotice, setPrepExtensionNotice] = useState<string | null>(null);
  const socketRef = useRef<any>(null);

  // Live ticker updating every 1s for real-time ETA countdown matching restaurant app
  const [tickNow, setTickNow] = useState(() => Date.now());
  useEffect(() => {
    const ticker = setInterval(() => setTickNow(Date.now()), 1000);
    return () => clearInterval(ticker);
  }, []);

  // Single-run local cache hydration ref to prevent polling from reverting to stale local order status
  const hasHydratedLocalRef = useRef(false);

  const syncOrderToLocalStorage = async (_updatedFields: any) => {
    // Database is the single source of truth; purge any legacy offline cache
    try {
      await AsyncStorage.multiRemove(['@placed_orders_history', '@order_history']);
    } catch (e) {}
  };

  // UI Interactive States
  const [isMapExpanded, setIsMapExpanded] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);

  const heroVideoSource = require('../assets/tracking/hero_background.mp4');
  const videoPlayer = useVideoPlayer(heroVideoSource, (p) => {
    p.loop = true;
    p.muted = true;
    p.play();
  });

  useEffect(() => {
    if (videoPlayer) {
      videoPlayer.muted = isMuted;
    }
  }, [isMuted, videoPlayer]);

  useEffect(() => {
    if (videoPlayer) {
      if (isPlaying) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    }
  }, [isPlaying, videoPlayer]);
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
          ? cartItems.map((c: any) => ({
              id: c.id || c.foodItem?.id,
              name: c.name || c.foodItem?.name || 'Food Item',
              menuItemName: c.name || c.foodItem?.name || 'Food Item',
              quantity: c.quantity || 1,
              isVeg: c.isVeg ?? c.foodItem?.isVeg,
              price: typeof c.price === 'number' ? c.price : (c.foodItem?.price || 0),
              unitPrice: typeof c.price === 'number' ? c.price : (c.foodItem?.price || 0),
            }))
          : (!isRealOrder ? DEFAULT_MOCK_ORDER.items : []));
  const itemsCount = orderItemsList.reduce(
    (sum: number, i: any) => sum + Math.max(1, parseInt(String(i.quantity || i.qty || 1), 10)),
    0
  );
  const orderTotalAmount = getOrderTotalAmount(orderDetail, orderItemsList);

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

  // 1. Restaurant / Kitchen lifecycle status from Restaurant App
  const kitchenStatus = orderDetail?.status || 'placed';

  // 2. Delivery Partner / Logistics lifecycle status from Rider App or Order Details
  const riderStatus =
    trackingData?.status ||
    orderDetail?.deliveryStatus ||
    orderDetail?.delivery?.status ||
    orderDetail?.riderStatus ||
    null;

  const riderDisplayName =
    riderInfo?.name ||
    riderInfo?.fullName ||
    trackingData?.riderName ||
    trackingData?.rider?.name ||
    orderDetail?.riderName ||
    orderDetail?.delivery?.riderName ||
    (orderDetail as any)?.rider?.name ||
    null;

  // Active status check: has a rider accepted / been assigned to this order?
  const isRiderAssignedStatus = Boolean(
    riderStatus &&
    ['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered'].includes(riderStatus)
  );
  const isRiderAccepted = Boolean(
    isRiderAssignedStatus ||
    (riderDisplayName && typeof riderDisplayName === 'string' && riderDisplayName.trim().length > 0 && riderStatus !== 'offered' && riderStatus !== 'unassigned') ||
    Boolean(trackingData?.riderId && riderStatus && riderStatus !== 'offered' && riderStatus !== 'unassigned')
  );
  const effectiveRiderStatus = isRiderAccepted
    ? (riderStatus && riderStatus !== 'offered' && riderStatus !== 'unassigned' ? riderStatus : 'assigned')
    : riderStatus;
  const currentStatus = isRiderAccepted
    ? effectiveRiderStatus
    : (kitchenStatus || 'placed');

  // Fetch Ola Maps Driving Directions & Dynamic Turn-by-Turn Road Route
  useEffect(() => {
    if (!restLat || !restLng || !custLat || !custLng || !OLA_MAPS_API_KEY) return;
    let isMounted = true;

    const fetchOlaDirections = async () => {
      try {
        let origin = `${restLat},${restLng}`;
        let destination = `${custLat},${custLng}`;

        if (riderStatus === 'assigned' || riderStatus === 'arrived_at_store') {
          // Rider is heading to restaurant to pick up order: Rider -> Restaurant
          origin = `${riderLat},${riderLng}`;
          destination = `${restLat},${restLng}`;
        } else if (riderStatus === 'picked_up' || riderStatus === 'out_for_delivery') {
          // Rider has picked up and is heading to customer: Rider -> Customer
          origin = `${riderLat},${riderLng}`;
          destination = `${custLat},${custLng}`;
        }

        const url = `https://api.olamaps.io/routing/v1/directions/basic?origin=${origin}&destination=${destination}&api_key=${OLA_MAPS_API_KEY}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Request-Id': `route-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          },
        });
        if (res.ok) {
          const data = await res.json();
          const route = data.routes?.[0];
          if (route) {
            const durationSec = route.legs?.[0]?.duration || route.duration || 0;
            const transitMins = Math.max(2, Math.round(durationSec / 60));
            if (isMounted) setOlaTransitMins(transitMins);

            if (route.overview_polyline) {
              const decoded = decodePolyline(route.overview_polyline);
              if (decoded && decoded.length > 0 && isMounted) {
                setRoadRouteCoords(decoded);
                const script = `if (window.updateRouteCoords) { window.updateRouteCoords(${JSON.stringify(decoded)}); } true;`;
                fullMapWebviewRef.current?.injectJavaScript(script);
                miniMapWebviewRef.current?.injectJavaScript(script);
              }
            }
          }
        }
      } catch (e) {
        // Handled silently
      }
    };

    fetchOlaDirections();
    const interval = setInterval(fetchOlaDirections, 30000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [restLat, restLng, custLat, custLng, riderStatus, isRiderAccepted]);

  // ── Dynamic Live ETA: Exact Restaurant Preparation Time + Delivery Transit Time ──
  const basePrepMins = Number(orderDetail?.prepTimeMinutes ?? orderDetail?.prep_time_minutes) > 0 
    ? Number(orderDetail.prepTimeMinutes ?? orderDetail.prep_time_minutes) 
    : ((currentRestaurant as any)?.prepTime || 20);
  const extraPrepMins = Number(orderDetail?.extendedPrepMinutes ?? orderDetail?.extended_prep_minutes) || 0;
  const totalKitchenPrepTime = basePrepMins + extraPrepMins;

  // 3. Road delivery transit time (Ola Maps driving directions if available, or road distance ~3 mins/km, min 2-3 mins)
  const distKm = calculateDistanceKm(restLat, restLng, custLat, custLng);
  const transitMins = olaTransitMins !== null && olaTransitMins > 0
    ? olaTransitMins
    : (distKm > 0 ? Math.max(2, Math.ceil(distKm * 3)) : 3);

  // 4. Live Remaining Preparation & Delivery Time
  const isDineIn = Boolean(orderDetail?.tableId && !orderDetail?.deliveryAddress && !orderDetail?.address && !trackingData?.riderId && !isRiderAccepted);
  const isCancelled = kitchenStatus === 'cancelled' || kitchenStatus === 'rejected';
  const isOrderDelivered = riderStatus === 'delivered' || (isDineIn && (kitchenStatus === 'served' || kitchenStatus === 'delivered'));
  const isPickedUp = riderStatus === 'picked_up' || riderStatus === 'out_for_delivery';
  const isReady = kitchenStatus === 'ready' || (isDineIn && kitchenStatus === 'served');
  const isPreparing = kitchenStatus === 'preparing' || kitchenStatus === 'confirmed';

  // Live remaining kitchen preparation time (synchronized with restaurant app timer)
  let activePrepMins = 0;
  if (!isCancelled && !isOrderDelivered && !isPickedUp && !isReady) {
    if (isPreparing) {
      // Order is actively being prepared in the kitchen.
      // Starts from the exact moment the restaurant accepted the order (acceptedTime / acknowledgedAt / updatedAt / createdAt)
      const prepStartTime = new Date(
        orderDetail?.acceptedTime ||
        orderDetail?.acknowledgedAt ||
        orderDetail?.updatedAt ||
        orderDetail?.createdAt ||
        Date.now()
      ).getTime();
      const elapsedPrepSecs = Math.max(0, Math.floor((tickNow - prepStartTime) / 1000));
      const remainingPrepSecs = (totalKitchenPrepTime * 60) - elapsedPrepSecs;
      // Mirror restaurant app countdown: round up remaining minutes, minimum 1 min while waiting to pack/handover
      activePrepMins = remainingPrepSecs > 0 ? Math.ceil(remainingPrepSecs / 60) : 1;
    } else {
      // Order placed / received: kitchen has not started cooking yet, full prep time applies
      activePrepMins = totalKitchenPrepTime;
    }
  }

  // Live remaining delivery transit time (Matching Swiggy ETA dispatch algorithm)
  let activeDeliveryMins = 0;
  if (!isCancelled && !isOrderDelivered) {
    if (isPickedUp) {
      // Food picked up: countdown remaining road transit time to customer doorstep
      const pickupTime = new Date(
        trackingData?.updatedAt ||
        trackingData?.createdAt ||
        Date.now()
      ).getTime();
      const elapsedTransitSecs = Math.max(0, Math.floor((tickNow - pickupTime) / 1000));
      const remainingTransitSecs = (transitMins * 60) - elapsedTransitSecs;
      activeDeliveryMins = remainingTransitSecs > 0 ? Math.ceil(remainingTransitSecs / 60) : 1;
    } else if (isReady && !isRiderAccepted) {
      // Swiggy behavior: Food is ready, but delivery partner is not assigned yet.
      // Add the buffer for partner matching & rider traveling to store (~6 mins) + store-to-customer transit
      const riderAssignmentAndPickupBuffer = 6;
      activeDeliveryMins = riderAssignmentAndPickupBuffer + transitMins;
    } else if (isReady && riderStatus === 'assigned') {
      // Food is ready and partner is assigned, rushing to store (~3 mins) + store-to-customer transit
      const riderArrivalAtStoreBuffer = 3;
      activeDeliveryMins = riderArrivalAtStoreBuffer + transitMins;
    } else {
      // Food at restaurant: full road delivery transit time from store to customer
      activeDeliveryMins = transitMins;
    }
  }

  // Exact Preparation Time + Delivery Time (Live Updating in Real-Time)
  const etaMinutes = (isCancelled || isOrderDelivered)
    ? 0
    : Math.max(1, activePrepMins + activeDeliveryMins);

  const getStatusDisplay = () => {
    // ── STAGE 6: CANCELLED / REJECTED ──
    if (kitchenStatus === 'cancelled' || kitchenStatus === 'rejected') {
      return {
        title: 'Order Cancelled',
        description: 'This order was cancelled. Any amount paid will be refunded to your source payment method.',
        badge: 'CANCELLED',
      };
    }

    // ── STAGE 5: DELIVERED (Or SERVED for Dine-in) ──
    if (riderStatus === 'delivered' || (isDineIn && (kitchenStatus === 'served' || kitchenStatus === 'delivered'))) {
      return {
        title: isDineIn ? 'Order Served! 🍽️' : 'Order Delivered! 🎉',
        description: isDineIn
          ? `Enjoy your meal at ${restaurantName}`
          : `Enjoy your delicious meal from\n${restaurantName}`,
        badge: isDineIn ? 'SERVED' : 'DELIVERED',
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
      if (kitchenStatus === 'ready' || kitchenStatus === 'served') {
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
    if (riderStatus === 'assigned' || isRiderAccepted) {
      const partnerName = riderDisplayName || 'Delivery partner';
      if (kitchenStatus === 'ready' || kitchenStatus === 'served') {
        return {
          title: 'Order is Ready & Partner is on the way',
          description: `Your order is packed & ready. ${partnerName} is rushing to ${restaurantName} to pick it up`,
          badge: 'READY FOR PICKUP',
        };
      } else {
        // Food is cooking, rider is on the way
        return {
          title: 'Partner is on the way',
          description: `${partnerName} is on the way to ${restaurantName} • Food prep: ${totalKitchenPrepTime} mins (~${activePrepMins} mins left)`,
          badge: 'ON THE WAY',
        };
      }
    }

    // ── STAGE 1A: NO RIDER ASSIGNED YET (WAITING / FINDING PARTNER) ──
    if (kitchenStatus === 'ready' || kitchenStatus === 'served') {
      return {
        title: 'Order is Ready! Finding Partner',
        description: `Your food from ${restaurantName} is freshly prepared & hot! Assigning nearest delivery partner to pick it up...`,
        badge: 'FINDING PARTNER',
      };
    }

    if (kitchenStatus === 'preparing' || kitchenStatus === 'confirmed') {
      if (isRiderAccepted || riderStatus === 'assigned') {
        const partnerName = riderDisplayName || 'Delivery partner';
        return {
          title: 'Partner is on the way',
          description: `${partnerName} is on the way to ${restaurantName} • Food prep: ${totalKitchenPrepTime} mins (~${activePrepMins} mins left)`,
          badge: 'ON THE WAY',
        };
      }
      return {
        title: 'Preparing your order',
        description: `Chef at ${restaurantName} is preparing your fresh meal (${totalKitchenPrepTime} mins prep time). Finding a delivery partner nearby...`,
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
    const currentStatusKey = `${statusInfo.title}_${statusInfo.badge}_${isRiderAccepted}_${kitchenStatus}_${riderStatus}_${riderDisplayName}`;
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
  }, [statusInfo.title, statusInfo.badge, isRiderAccepted, kitchenStatus, riderStatus, riderDisplayName]);

  const handleCallRider = () => {
    const phone =
      riderInfo?.phone ||
      riderInfo?.contactNumber ||
      trackingData?.riderPhone ||
      trackingData?.rider?.phone ||
      orderDetail?.riderPhone ||
      orderDetail?.delivery?.riderPhone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    } else if (Platform.OS === 'android') {
      ToastAndroid.show('Delivery partner has not been assigned yet', ToastAndroid.SHORT);
    }
  };

  const fetchInitialData = async () => {
    if (!orderId || !isRealOrder) {
      setLoading(false);
      return;
    }
    try {
      // 1. Fetch live order data directly from Neon PostgreSQL for instant 0ms offline-resilient sync
      if (!hasHydratedLocalRef.current) {
        hasHydratedLocalRef.current = true;
        try {
          const neonQuery = `SELECT id, status, prep_time_minutes, extended_prep_minutes, acknowledged_at, created_at, updated_at, notes, grand_total, restaurant_id FROM orders WHERE id = '${orderId}' LIMIT 1;`;
          const neonResp = await fetch(NEON_SQL_ENDPOINT, {
            method: 'POST',
            headers: {
              'Neon-Connection-String': NEON_CONN_STRING,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query: neonQuery }),
          });
          if (neonResp.ok) {
            const neonJson = await neonResp.json();
            if (neonJson.rows && neonJson.rows.length > 0) {
              const row = neonJson.rows[0];
              const livePrepMins = Number(row.prep_time_minutes) > 0 ? Number(row.prep_time_minutes) : undefined;
              const liveExtPrepMins = row.extended_prep_minutes !== null && row.extended_prep_minutes !== undefined ? Number(row.extended_prep_minutes) : undefined;
              setOrderDetail((prev: any) => {
                const resolvedStatus = mergeKitchenStatus(prev?.status, row.status);
                const acceptedTime = row.acknowledged_at || (resolvedStatus === 'preparing' ? (row.updated_at || prev?.acceptedTime) : undefined) || prev?.acceptedTime;
                return {
                  ...prev,
                  ...row,
                  status: resolvedStatus,
                  ...(livePrepMins ? { prepTimeMinutes: livePrepMins } : {}),
                  ...(liveExtPrepMins !== undefined ? { extendedPrepMinutes: liveExtPrepMins } : {}),
                  ...(acceptedTime ? { acceptedTime } : {}),
                };
              });
            }
          }
        } catch (neonErr) {
          console.warn('[TrackingScreen] Neon direct query error:', neonErr);
        }
      }

      // Retrieve active auth token if available (Keychain/KeyStore -> Auth State -> Session Storage -> Public Fallback)
      let activeToken = sessionToken;
      if (!activeToken) {
        try {
          const secToken = await SecureStorage.getSessionToken();
          if (secToken) activeToken = secToken;
        } catch (e) {}
      }
      if (!activeToken) {
        try {
          const stored = await AsyncStorage.getItem('@auth_state');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.sessionToken) activeToken = parsed.sessionToken;
          }
        } catch (e) {}
      }
      if (!activeToken) {
        try {
          const secBackup = await AsyncStorage.getItem('@sec_myquro_auth_session_token');
          if (secBackup) activeToken = secBackup;
        } catch (e) {}
      }

      // If user is guest/unauthenticated, use public fallback token to access tracking on live server
      const effectiveToken = activeToken || PUBLIC_FALLBACK_TRACKING_TOKEN;
      const authHeaders: Record<string, string> = { Authorization: `Bearer ${effectiveToken}` };

      // 2. Fetch live data from backend order detail endpoint
      const orderResp = await fetch(`${BACKEND_URL}/api/orders/${orderId}/detail`, {
        headers: authHeaders,
      });
      if (orderResp.ok) {
        const data = await orderResp.json();
        if (data.order) {
          const prepMins = Number(data.order.prepTimeMinutes ?? data.order.prep_time_minutes) > 0 
            ? Number(data.order.prepTimeMinutes ?? data.order.prep_time_minutes) 
            : undefined;
          const extPrepMins = (data.order.extendedPrepMinutes !== undefined || data.order.extended_prep_minutes !== undefined)
            ? Number(data.order.extendedPrepMinutes ?? data.order.extended_prep_minutes)
            : undefined;

          setOrderDetail((prev: any) => {
            const resolvedStatus = mergeKitchenStatus(prev?.status, data.order.status);
            const acceptedTime = data.order.acknowledgedAt || data.order.acceptedTime || (resolvedStatus === 'preparing' ? (data.order.updatedAt || prev?.acceptedTime) : undefined) || prev?.acceptedTime;
            const items = (data.order.items && data.order.items.length > 0) ? data.order.items : (prev?.items && prev.items.length > 0 ? prev.items : []);
            return { 
              ...prev, 
              ...data.order, 
              items,
              status: resolvedStatus,
              ...(prepMins ? { prepTimeMinutes: prepMins } : {}),
              ...(extPrepMins !== undefined ? { extendedPrepMinutes: extPrepMins } : {}),
              ...(acceptedTime ? { acceptedTime } : {})
            };
          });

          // Hydrate rider & delivery tracking if order contains assigned delivery info
          const orderDel = data.order.delivery || null;
          const assignedDelStatus = (data.order.deliveryStatus && data.order.deliveryStatus !== 'offered' && data.order.deliveryStatus !== 'unassigned')
            ? data.order.deliveryStatus
            : (orderDel?.status && orderDel.status !== 'offered' && orderDel.status !== 'unassigned' ? orderDel.status : null);
          const assignedRiderName = data.order.riderName || orderDel?.riderName || data.order.rider?.name;
          const assignedRiderPhone = data.order.riderPhone || orderDel?.riderPhone || data.order.rider?.phone;
          const assignedRiderId = data.order.riderId || orderDel?.riderId || data.order.rider?.id;

          if (assignedDelStatus || assignedRiderName || orderDel) {
            setTrackingData((prev: any) => ({
              ...prev,
              ...(orderDel || {}),
              status: assignedDelStatus || prev?.status || orderDel?.status,
              riderId: assignedRiderId || prev?.riderId || (assignedRiderName ? 'assigned_rider' : prev?.riderId),
              riderName: assignedRiderName || prev?.riderName,
              riderPhone: assignedRiderPhone || prev?.riderPhone,
            }));
          }

          if (assignedRiderName || assignedRiderPhone || data.order.rider) {
            setRiderInfo((prev: any) => ({
              ...prev,
              ...(data.order.rider || {}),
              name: assignedRiderName || prev?.name,
              phone: assignedRiderPhone || prev?.phone,
            }));
          }

          syncOrderToLocalStorage(data.order);
        }
      }

      // 3. Fetch from backend delivery track endpoint
      let trackResp = await fetch(`${BACKEND_URL}/api/delivery/track/${orderId}`, {
        headers: authHeaders,
      });
      if (!trackResp.ok && trackResp.status === 401 && effectiveToken !== PUBLIC_FALLBACK_TRACKING_TOKEN) {
        // Fallback retry with public tracking token
        trackResp = await fetch(`${BACKEND_URL}/api/delivery/track/${orderId}`, {
          headers: { Authorization: `Bearer ${PUBLIC_FALLBACK_TRACKING_TOKEN}` },
        });
      }
      if (!trackResp.ok && trackResp.status === 401) {
        // Fallback retry without auth header in case server is running updated public route
        trackResp = await fetch(`${BACKEND_URL}/api/delivery/track/${orderId}`);
      }
      if (trackResp.ok) {
        const data = await trackResp.json();
        const delStatus = data.delivery?.status || data.deliveryStatus || 'assigned';
        const riderName = data.rider?.name || data.delivery?.riderName || data.riderName;
        const riderPhone = data.rider?.phone || data.delivery?.riderPhone || data.riderPhone;
        const riderId = data.delivery?.riderId || data.rider?.id || data.riderId;

        if (data.delivery || riderName || (delStatus && delStatus !== 'offered' && delStatus !== 'unassigned')) {
          setTrackingData((prev: any) => ({
            ...prev,
            ...(data.delivery || {}),
            status: delStatus,
            riderId: riderId || prev?.riderId || (riderName ? 'assigned_rider' : undefined),
            riderName: riderName || prev?.riderName,
            riderPhone: riderPhone || prev?.riderPhone,
          }));
        }
        if (data.rider || riderName || riderPhone) {
          setRiderInfo((prev: any) => ({
            ...prev,
            ...(data.rider || {}),
            name: riderName || prev?.name,
            phone: riderPhone || prev?.phone,
          }));
        }
        if (data.delivery?.currentLat && data.delivery?.currentLng) {
          const lat = Number(data.delivery.currentLat);
          const lng = Number(data.delivery.currentLng);
          const updateScript = `if (window.updateRiderPosition) { window.updateRiderPosition(${lng}, ${lat}); } true;`;
          fullMapWebviewRef.current?.injectJavaScript(updateScript);
          miniMapWebviewRef.current?.injectJavaScript(updateScript);
        }
      } else if (trackResp.status === 404) {
        // Only clear trackingData if not already populated with an assigned partner
        setTrackingData((prev: any) => {
          if (prev?.riderId || prev?.riderName || prev?.status === 'assigned') {
            return prev;
          }
          return null;
        });
        setRiderInfo((prev: any) => {
          if (prev?.name) return prev;
          return null;
        });
      }
    } catch (err) {
      console.warn('Error fetching tracking data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!orderId || orderId === 'ORD-98421') return;
    hasHydratedLocalRef.current = false;
    fetchInitialData();
    const interval = setInterval(() => {
      fetchInitialData();
    }, 2000);
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
      // Backend sends a flat object { orderId, status, currentLat, currentLng, riderName, riderPhone }
      // OR { delivery: {...}, rider: {...} } — handle both shapes.
      let newLat: number | undefined;
      let newLng: number | undefined;
      const assignedRiderId = data.delivery?.riderId ?? data.riderId ?? data.rider?.id;
      const assignedStatus = data.delivery?.status ?? data.deliveryStatus ?? data.status;
      const assignedRiderName = data.riderName ?? data.delivery?.riderName ?? data.rider?.name;
      const assignedRiderPhone = data.riderPhone ?? data.delivery?.riderPhone ?? data.rider?.phone;

      if (data.delivery) {
        setTrackingData((prev: any) => ({
          ...prev,
          ...data.delivery,
          status: assignedStatus || prev?.status || 'assigned',
          riderId: assignedRiderId ?? prev?.riderId ?? (assignedRiderName ? 'assigned_rider' : undefined),
          riderName: assignedRiderName ?? prev?.riderName,
          riderPhone: assignedRiderPhone ?? prev?.riderPhone,
        }));
        newLat = data.delivery.currentLat;
        newLng = data.delivery.currentLng;
      } else if (data.status || data.deliveryStatus) {
        // Flat payload from /api/delivery/status/update and /api/delivery/accept
        setTrackingData((prev: any) => ({
          ...prev,
          status: assignedStatus,
          currentLat: data.currentLat ?? prev?.currentLat,
          currentLng: data.currentLng ?? prev?.currentLng,
          riderId: assignedRiderId ?? prev?.riderId ?? (assignedRiderName ? 'assigned_rider' : undefined),
          riderName: assignedRiderName ?? prev?.riderName,
          riderPhone: assignedRiderPhone ?? prev?.riderPhone,
        }));
        newLat = data.currentLat;
        newLng = data.currentLng;
      }
      if (data.rider) {
        setRiderInfo((prev: any) => ({ ...prev, ...data.rider }));
      }
      if (assignedRiderName || assignedRiderPhone) {
        setRiderInfo((prev: any) => ({
          ...prev,
          name: assignedRiderName ?? prev?.name,
          phone: assignedRiderPhone ?? prev?.phone,
        }));
      }

      // Smooth Bike Gliding & Bearing Rotation without page reload!
      if (newLat !== undefined && newLng !== undefined) {
        const updateScript = `if (window.updateRiderPosition) { window.updateRiderPosition(${Number(newLng)}, ${Number(newLat)}); } true;`;
        fullMapWebviewRef.current?.injectJavaScript(updateScript);
        miniMapWebviewRef.current?.injectJavaScript(updateScript);
      }
    });

    socket.on('order-update', (data: any) => {
      const incomingOrder = data.order || {};
      const prepTimeMinutes = Number(data.prepTimeMinutes || incomingOrder.prepTimeMinutes || data.prep_time_minutes || incomingOrder.prep_time_minutes) || undefined;
      const extendedPrepMinutes = (data.extendedPrepMinutes !== undefined || incomingOrder.extendedPrepMinutes !== undefined || data.extended_prep_minutes !== undefined || incomingOrder.extended_prep_minutes !== undefined)
        ? Number(data.extendedPrepMinutes ?? incomingOrder.extendedPrepMinutes ?? data.extended_prep_minutes ?? incomingOrder.extended_prep_minutes)
        : undefined;
      const isNowPreparing = (data.status || incomingOrder.status) === 'preparing' || (data.status || incomingOrder.status) === 'confirmed';
      const acceptedTime = isNowPreparing
        ? (data.acceptedTime || incomingOrder.acceptedTime || data.acknowledgedAt || incomingOrder.acknowledgedAt || data.updatedAt || incomingOrder.updatedAt || new Date().toISOString())
        : undefined;

      const orderDelStatus = data.deliveryStatus || incomingOrder.deliveryStatus;
      const orderRiderName = data.riderName || incomingOrder.riderName;
      const orderRiderPhone = data.riderPhone || incomingOrder.riderPhone;

      if (orderDelStatus && orderDelStatus !== 'offered' && orderDelStatus !== 'unassigned') {
        setTrackingData((prev: any) => ({
          ...prev,
          status: orderDelStatus,
          riderId: data.riderId ?? incomingOrder.riderId ?? prev?.riderId ?? (orderRiderName ? 'assigned_rider' : undefined),
          riderName: orderRiderName ?? prev?.riderName,
          riderPhone: orderRiderPhone ?? prev?.riderPhone,
        }));
      }
      if (orderRiderName || orderRiderPhone) {
        setRiderInfo((prev: any) => ({
          ...prev,
          name: orderRiderName ?? prev?.name,
          phone: orderRiderPhone ?? prev?.phone,
        }));
      }

      setOrderDetail((prev: any) => {
        const resolvedStatus = mergeKitchenStatus(prev?.status, data.status || incomingOrder.status);
        return { 
          ...prev, 
          ...incomingOrder, 
          status: resolvedStatus,
          ...(orderDelStatus ? { deliveryStatus: orderDelStatus } : {}),
          ...(orderRiderName ? { riderName: orderRiderName } : {}),
          ...(orderRiderPhone ? { riderPhone: orderRiderPhone } : {}),
          ...(prepTimeMinutes ? { prepTimeMinutes } : {}),
          ...(extendedPrepMinutes !== undefined ? { extendedPrepMinutes } : {}),
          ...(acceptedTime ? { acceptedTime } : (prev?.acceptedTime ? { acceptedTime: prev.acceptedTime } : {}))
        };
      });
      syncOrderToLocalStorage({ 
        ...incomingOrder, 
        status: data.status || incomingOrder.status,
        ...(orderDelStatus ? { deliveryStatus: orderDelStatus } : {}),
        ...(orderRiderName ? { riderName: orderRiderName } : {}),
        ...(orderRiderPhone ? { riderPhone: orderRiderPhone } : {}),
        ...(prepTimeMinutes ? { prepTimeMinutes } : {}),
        ...(extendedPrepMinutes !== undefined ? { extendedPrepMinutes } : {}),
        ...(acceptedTime ? { acceptedTime } : {})
      });
    });

    socket.on('order-status-update', (data: any) => {
      const orderDelStatus = data.deliveryStatus;
      const orderRiderName = data.riderName;
      const orderRiderPhone = data.riderPhone;

      if (orderDelStatus && orderDelStatus !== 'offered' && orderDelStatus !== 'unassigned') {
        setTrackingData((prev: any) => ({
          ...prev,
          status: orderDelStatus,
          riderId: data.riderId ?? prev?.riderId ?? (orderRiderName ? 'assigned_rider' : undefined),
          riderName: orderRiderName ?? prev?.riderName,
          riderPhone: orderRiderPhone ?? prev?.riderPhone,
        }));
      }
      if (orderRiderName || orderRiderPhone) {
        setRiderInfo((prev: any) => ({
          ...prev,
          name: orderRiderName ?? prev?.name,
          phone: orderRiderPhone ?? prev?.phone,
        }));
      }

      if (data.status || data.prepTimeMinutes || data.extendedPrepMinutes !== undefined || orderDelStatus) {
        const isNowPreparing = data.status === 'preparing' || data.status === 'confirmed';
        const acceptedTime = isNowPreparing
          ? (data.acceptedTime || data.acknowledgedAt || data.updatedAt || new Date().toISOString())
          : undefined;

        setOrderDetail((prev: any) => {
          const resolvedStatus = mergeKitchenStatus(prev?.status, data.status);
          const prepTimeMinutes = Number(data.prepTimeMinutes || data.prep_time_minutes) > 0 ? Number(data.prepTimeMinutes || data.prep_time_minutes) : prev?.prepTimeMinutes;
          const extendedPrepMinutes = (data.extendedPrepMinutes !== undefined || data.extended_prep_minutes !== undefined)
            ? Number(data.extendedPrepMinutes ?? data.extended_prep_minutes)
            : prev?.extendedPrepMinutes;
          return { 
            ...prev, 
            status: resolvedStatus, 
            ...(orderDelStatus ? { deliveryStatus: orderDelStatus } : {}),
            ...(orderRiderName ? { riderName: orderRiderName } : {}),
            ...(orderRiderPhone ? { riderPhone: orderRiderPhone } : {}),
            ...(prepTimeMinutes ? { prepTimeMinutes } : {}),
            ...(extendedPrepMinutes !== undefined ? { extendedPrepMinutes } : {}),
            ...(acceptedTime ? { acceptedTime } : (prev?.acceptedTime ? { acceptedTime: prev.acceptedTime } : {}))
          };
        });
        syncOrderToLocalStorage({ 
          status: data.status,
          ...(orderDelStatus ? { deliveryStatus: orderDelStatus } : {}),
          ...(orderRiderName ? { riderName: orderRiderName } : {}),
          ...(orderRiderPhone ? { riderPhone: orderRiderPhone } : {}),
          ...(data.prepTimeMinutes ? { prepTimeMinutes: Number(data.prepTimeMinutes) } : {}),
          ...(data.extendedPrepMinutes !== undefined ? { extendedPrepMinutes: Number(data.extendedPrepMinutes) } : {}),
          ...(acceptedTime ? { acceptedTime } : {})
        });
      }
    });

    socket.on('order-status', (data: any) => {
      console.log('📡 [TrackingScreen] Received order-status event:', data);
      if (data.status || data.prepTimeMinutes || data.extendedPrepMinutes !== undefined) {
        const isNowPreparing = data.status === 'preparing' || data.status === 'confirmed';
        const acceptedTime = isNowPreparing
          ? (data.acceptedTime || data.acknowledgedAt || data.updatedAt || new Date().toISOString())
          : undefined;

        setOrderDetail((prev: any) => {
          const resolvedStatus = mergeKitchenStatus(prev?.status, data.status);
          const prepTimeMinutes = Number(data.prepTimeMinutes || data.prep_time_minutes) > 0 ? Number(data.prepTimeMinutes || data.prep_time_minutes) : prev?.prepTimeMinutes;
          const extendedPrepMinutes = (data.extendedPrepMinutes !== undefined || data.extended_prep_minutes !== undefined)
            ? Number(data.extendedPrepMinutes ?? data.extended_prep_minutes)
            : prev?.extendedPrepMinutes;
          return { 
            ...prev, 
            status: resolvedStatus, 
            ...(prepTimeMinutes ? { prepTimeMinutes } : {}),
            ...(extendedPrepMinutes !== undefined ? { extendedPrepMinutes } : {}),
            ...(acceptedTime ? { acceptedTime } : (prev?.acceptedTime ? { acceptedTime: prev.acceptedTime } : {}))
          };
        });
        syncOrderToLocalStorage({ 
          status: data.status,
          ...(data.prepTimeMinutes ? { prepTimeMinutes: Number(data.prepTimeMinutes) } : {}),
          ...(data.extendedPrepMinutes !== undefined ? { extendedPrepMinutes: Number(data.extendedPrepMinutes) } : {}),
          ...(acceptedTime ? { acceptedTime } : {})
        });
      }
    });

    socket.on('order-prep-updated', (data: any) => {
      console.log('📡 [TrackingScreen] Received order-prep-updated event:', data);
      const newPrep = Number(data.prepTimeMinutes || data.prep_time_minutes || data.minutes);
      if (newPrep > 0) {
        setOrderDetail((prev: any) => ({
          ...prev,
          prepTimeMinutes: newPrep,
          ...(data.extendedPrepMinutes !== undefined ? { extendedPrepMinutes: Number(data.extendedPrepMinutes) } : {}),
        }));
      }
    });

    socket.on('order-prep-extended', (data: any) => {
      console.log('📡 [TrackingScreen] Received order-prep-extended event:', data);
      const extra = Number(data.extraMinutes) || 5;
      const resolvedExtended = data.totalExtendedMinutes !== undefined
        ? Number(data.totalExtendedMinutes)
        : extra;
      setPrepExtensionNotice(data.message || `Kitchen requested ${extra} extra minutes to prepare fresh food.`);
      setOrderDetail((prev: any) => {
        return {
          ...prev,
          extendedPrepMinutes: resolvedExtended,
        };
      });
      syncOrderToLocalStorage({
        extendedPrepMinutes: resolvedExtended,
      });
    });

    socket.on('order-cancelled', (data: any) => {
      console.log('📡 [TrackingScreen] Received order-cancelled event:', data);
      setOrderDetail((prev: any) => ({
        ...prev,
        status: 'cancelled',
        cancellationReason: data.reason,
        refundMessage: data.refundMessage || '100% refund initiated to your payment method.'
      }));
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

  // Only show DeliveredOrderView when the rider explicitly marks delivery complete (or when food is served for dine-in).
  // Do NOT trigger on kitchenStatus==='served' for delivery — that fires when the rider picks up the food.
  const isDelivered = riderStatus === 'delivered' || (isDineIn && (kitchenStatus === 'served' || kitchenStatus === 'delivered'));

  if (isDelivered) {
    return (
      <DeliveredOrderView
        orderId={orderId || undefined}
        restaurantName={restaurantName}
        riderName={riderDisplayName || riderInfo?.name || riderInfo?.fullName || 'HARAPRASAD S'}
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
            [2] HERO MEDIA AREA (FULL HEIGHT VIDEO WITH ACCENT GRADIENTS)
            ════════════════════════════════════════════════════════════════════════ */}
        <View
          style={[
            styles.heroMediaContainer,
            { height: isMapExpanded ? 380 * SCALE : Math.round(SCREEN_WIDTH * (912 / 576)) },
          ]}
        >
          {isMapExpanded ? (
            /* Live Interactive Full Ola MapView Mode (matching IncomingRequestModal UI) */
            <View style={StyleSheet.absoluteFill}>
              <WebView
                ref={fullMapWebviewRef}
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
                    roadRouteCoords,
                  ),
                }}
                style={StyleSheet.absoluteFill}
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
            /* Delivery Scene with Full-Height Background Video */
            <View style={styles.heroSceneWrapper}>
              {/* Full-Height Looping Background Video */}
              <VideoView
                player={videoPlayer}
                style={styles.heroBgVideo}
                contentFit="cover"
                nativeControls={false}
              />

              {/* ── TOP SUBTLE STATUS BAR SHADING (Keeps top of video crystal clear) ── */}
              <Svg
                width="100%"
                height={Math.max(topHeaderPadding + 24 * SCALE, 60)}
                style={styles.heroTopFadeGradient}
                pointerEvents="none"
              >
                <Defs>
                  <LinearGradient id="heroTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
                    <Stop offset="60%" stopColor="#000000" stopOpacity="0.15" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="0" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#heroTopGrad)" />
              </Svg>

              {/* ── BOTTOM FADE GRADIENT (Smooth transition into status card) ───── */}
              <Svg
                width="100%"
                height={120 * SCALE}
                style={styles.heroBottomFadeGradient}
                pointerEvents="none"
              >
                <Defs>
                  <LinearGradient id="heroBottomGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0" />
                    <Stop offset="60%" stopColor="#000000" stopOpacity="0.65" />
                    <Stop offset="100%" stopColor="#000000" stopOpacity="1" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#heroBottomGrad)" />
              </Svg>
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
                ref={miniMapWebviewRef}
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
                    roadRouteCoords,
                  ),
                }}
                style={StyleSheet.absoluteFill}
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
              /* ── STAGE 1: ORDER RECEIVED / KITCHEN PREPARING (NO RIDER ASSIGNED YET) ── */
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

                    {/* Description text (always shown when present) */}
                    {statusInfo.description ? (
                      <Text style={{ color: '#A0A0A5', fontSize: 13 * SCALE, marginTop: 4, fontFamily: 'Outfit-Regular', lineHeight: 18 }}>
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

                    {/* Live Kitchen Preparation Time Badge / Pill */}
                    {isPreparing && (
                      <View style={styles.kitchenPrepPill}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', flexShrink: 1 }}>
                          <ChefHat size={14 * SCALE} color="#F5B800" style={{ marginRight: 6 }} />
                          <Text style={styles.kitchenPrepPillText}>
                            Kitchen Prep: <Text style={{ fontWeight: '800', color: '#F5B800' }}>{totalKitchenPrepTime}m</Text>
                          </Text>
                        </View>
                        <View style={styles.kitchenPrepCountdownBadge}>
                          <Clock size={11 * SCALE} color="#000000" style={{ marginRight: 4 }} />
                          <Text style={styles.kitchenPrepCountdownText}>~{activePrepMins}m left</Text>
                        </View>
                      </View>
                    )}

                    {/* Finding delivery partner badge (amber pill shown ONLY when rider is not accepted) */}
                    {!isRiderAccepted && (kitchenStatus === 'preparing' || kitchenStatus === 'confirmed' || kitchenStatus === 'ready') && (
                      <View style={[styles.waitingPartnerBadge, { backgroundColor: '#2E2005', borderColor: '#F59E0B', marginTop: 8 }]}>
                        <View style={styles.pulsingAmberDot} />
                        <Text style={[styles.waitingPartnerBadgeText, { color: '#F5B800', flex: 1, fontWeight: '700' }]}>
                          Finding a delivery partner nearby...
                        </Text>
                      </View>
                    )}

                    {/* Extra prep time extension alert during dinner rush */}
                    {prepExtensionNotice && (
                      <View style={[styles.waitingPartnerBadge, { backgroundColor: '#2E2005', borderColor: '#F59E0B', marginTop: 6 }]}>
                        <Clock size={13} color="#F5B800" style={{ marginRight: 6 }} />
                        <Text style={[styles.waitingPartnerBadgeText, { color: '#F5B800', flex: 1 }]}>
                          {prepExtensionNotice}
                        </Text>
                      </View>
                    )}

                    {/* Swiggy Handover / Delivery Pickup OTP Badge */}
                    {orderDetail?.handoverOtp && orderDetail?.status !== 'cancelled' && orderDetail?.status !== 'served' && (
                      <View style={[styles.waitingPartnerBadge, { backgroundColor: '#1A1811', borderColor: '#F5B800', marginTop: 6, justifyContent: 'space-between' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ShieldCheck size={14} color="#F5B800" style={{ marginRight: 6 }} />
                          <Text style={[styles.waitingPartnerBadgeText, { color: '#F5B800', fontWeight: '700' }]}>
                            Pickup Handover OTP:
                          </Text>
                        </View>
                        <View style={{ backgroundColor: '#F5B800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#000000', letterSpacing: 2 }}>
                            {orderDetail.handoverOtp}
                          </Text>
                        </View>
                      </View>
                    )}

                    {/* Restaurant rush cancellation banner if cancelled */}
                    {orderDetail?.status === 'cancelled' && (
                      <View style={[styles.waitingPartnerBadge, { backgroundColor: '#2A0E0E', borderColor: '#EF4444', marginTop: 6 }]}>
                        <AlertCircle size={14} color="#EF4444" style={{ marginRight: 6 }} />
                        <Text style={[styles.waitingPartnerBadgeText, { color: '#FCA5A5', flex: 1 }]}>
                          Order Cancelled by Kitchen • 100% Refund Initiated
                        </Text>
                      </View>
                    )}
                  </Animated.View>

                  {/* Right: Gold ETA Box */}
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
                    {/* ON TIME Badge Row (Gold Checkmark & Gold Text) */}
                    <View style={styles.onTimeBadgeRow}>
                      <Svg width={13 * SCALE} height={13 * SCALE} viewBox="0 0 24 24" fill="none">
                        <Path
                          d="M20 6L9 17L4 12"
                          stroke="#E5B842"
                          strokeWidth="3.4"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </Svg>
                      <Text style={styles.onTimeBadgeText}>{statusInfo.badge || 'ON TIME'}</Text>
                    </View>

                    {/* Main Status Title: Partner is on the way */}
                    <Text style={styles.partnerStatusTitle}>{statusInfo.title}</Text>

                    {/* Subtitle Description */}
                    <Text style={styles.partnerStatusDesc}>{statusInfo.description}</Text>

                    {/* Partner Name Capsule + Kitchen Prep Mini Pill */}
                    <View style={styles.partnerDetailsRow}>
                      <View style={styles.partnerNameCapsule}>
                        <View style={styles.riderOnlineDot} />
                        <Text style={styles.partnerNameText} numberOfLines={1}>
                          {riderDisplayName || 'Delivery Partner'}
                        </Text>
                      </View>
                      {isPreparing && (
                        <View style={styles.kitchenPrepMiniPill}>
                          <ChefHat size={12 * SCALE} color="#F5B800" style={{ marginRight: 4 }} />
                          <Text style={styles.kitchenPrepMiniText}>Prep: {totalKitchenPrepTime}m (~{activePrepMins}m left)</Text>
                        </View>
                      )}
                    </View>

                    {/* Swiggy Handover / Delivery Pickup OTP Badge */}
                    {orderDetail?.handoverOtp && orderDetail?.status !== 'cancelled' && orderDetail?.status !== 'served' && (
                      <View style={[styles.waitingPartnerBadge, { backgroundColor: '#1A1811', borderColor: '#F5B800', marginTop: 6, justifyContent: 'space-between' }]}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                          <ShieldCheck size={14} color="#F5B800" style={{ marginRight: 6 }} />
                          <Text style={[styles.waitingPartnerBadgeText, { color: '#F5B800', fontWeight: '700' }]}>
                            Pickup Handover OTP:
                          </Text>
                        </View>
                        <View style={{ backgroundColor: '#F5B800', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 }}>
                          <Text style={{ fontSize: 13, fontWeight: '800', color: '#000000', letterSpacing: 2 }}>
                            {orderDetail.handoverOtp}
                          </Text>
                        </View>
                      </View>
                    )}
                  </Animated.View>

                  {/* Right: Gold ETA Badge (Matching Screenshot) */}
                  <View style={styles.etaGoldBadgeCard}>
                    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                      <Defs>
                        <LinearGradient id="etaGoldGradPartner" x1="0%" y1="0%" x2="0%" y2="100%">
                          <Stop offset="0%" stopColor="#F5BE38" />
                          <Stop offset="100%" stopColor="#DE9E22" />
                        </LinearGradient>
                      </Defs>
                      <Rect width="100%" height="100%" rx={20 * SCALE} fill="url(#etaGoldGradPartner)" />
                    </Svg>
                    <Text style={styles.etaNumberBlack}>{etaMinutes}</Text>
                    <Text style={styles.etaMinsUnitBlack}>mins</Text>
                  </View>
                </View>

                {/* Subtle Divider Line */}
                <View style={styles.statusCardDividerLine} />

                {/* Bottom Row: Add Delivery Instructions + Unified Action Capsule */}
                <View style={styles.statusCardBottomSection}>
                  <TouchableOpacity
                    style={styles.addInstructionsRow}
                    activeOpacity={0.8}
                    onPress={() => setShowDeliveryInstructionsModal(true)}
                  >
                    <Text style={styles.addInstructionsText} numberOfLines={1} ellipsizeMode="tail">Add Delivery Instructions</Text>
                    <ChevronRight size={15 * SCALE} color="#9A9AA2" />
                  </TouchableOpacity>

                  {/* Right Unified Action Capsule (Call | Chat | Avatar) */}
                  <View style={styles.unifiedActionCapsule}>
                    {/* Call Button */}
                    <TouchableOpacity
                      style={styles.capsuleIconBtn}
                      activeOpacity={0.8}
                      onPress={handleCallRider}
                    >
                      <Phone size={15 * SCALE} color="#FFFFFF" strokeWidth={2.4} />
                    </TouchableOpacity>

                    <View style={styles.capsuleDivider} />

                    {/* Chat Button */}
                    <TouchableOpacity
                      style={styles.capsuleIconBtn}
                      activeOpacity={0.8}
                      onPress={() => setShowChatModal(true)}
                    >
                      <MessageSquare size={15 * SCALE} color="#FFFFFF" strokeWidth={2.4} />
                    </TouchableOpacity>

                    <View style={styles.capsuleDivider} />

                    {/* Delivery Partner Avatar */}
                    <TouchableOpacity
                      style={styles.capsuleAvatarBtn}
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
              [4] SAVINGS PILL BANNER (PREMIUM EMERALD GLOW CAPSULE)
              ══════════════════════════════════════════════════════════════════════ */}
          <View style={styles.savingsPillBanner}>
            {/* Ambient Emerald Glass Glow Background */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="savingsBaseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#08140B" />
                    <Stop offset="50%" stopColor="#0E2816" />
                    <Stop offset="100%" stopColor="#08140B" />
                  </LinearGradient>
                  <RadialGradient id="savingsCenterGlow" cx="50%" cy="50%" r="55%" fx="50%" fy="50%">
                    <Stop offset="0%" stopColor="#22C55E" stopOpacity="0.22" />
                    <Stop offset="100%" stopColor="#08140B" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#savingsBaseGrad)" />
                <Rect width="100%" height="100%" fill="url(#savingsCenterGlow)" />
              </Svg>
            </View>

            {/* Left Glowing Diamond Star */}
            <Svg width={14 * SCALE} height={14 * SCALE} viewBox="0 0 24 24" fill="none">
              <Path
                d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2L12 0Z"
                fill="#34D399"
              />
            </Svg>

            {/* Banner Text with Highlighted Savings */}
            <Text style={styles.savingsBannerText}>
              Yay!{' '}
              <Text style={styles.savingsAmountHighlight}>
                {normalizePrice(orderDetail?.discount) > 0 ? `₹${normalizePrice(orderDetail.discount)} saved` : 'FREE delivery'}
              </Text>
              {' '}on this order
            </Text>
          </View>

          {/* ══════════════════════════════════════════════════════════════════════
              [5] MYQURO REAL CASHBACK PROMO CARD (WITH 3D WALLET & GOLD AURA)
              ══════════════════════════════════════════════════════════════════════ */}
          <View style={styles.myquroCashbackCard}>
            {/* Seamless Dark Obsidian Base with Centered Gold Aura Behind Wallet */}
            <View style={StyleSheet.absoluteFill} pointerEvents="none">
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="cashbackBaseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <Stop offset="0%" stopColor="#0A0A0C" />
                    <Stop offset="45%" stopColor="#09080A" />
                    <Stop offset="72%" stopColor="#221806" />
                    <Stop offset="88%" stopColor="#151004" />
                    <Stop offset="100%" stopColor="#0A0A0C" />
                  </LinearGradient>
                  <RadialGradient
                    id="walletGoldAura"
                    cx="72%"
                    cy="50%"
                    r="40%"
                    fx="72%"
                    fy="50%"
                  >
                    <Stop offset="0%" stopColor="#E5B842" stopOpacity="0.45" />
                    <Stop offset="35%" stopColor="#A37B1B" stopOpacity="0.22" />
                    <Stop offset="70%" stopColor="#3D2B06" stopOpacity="0.06" />
                    <Stop offset="100%" stopColor="#0A0A0C" stopOpacity="0" />
                  </RadialGradient>
                </Defs>
                <Rect width="100%" height="100%" fill="url(#cashbackBaseGrad)" />
                <Rect width="100%" height="100%" fill="url(#walletGoldAura)" />
              </Svg>
            </View>

            {/* Left Column: Heading & Subtext */}
            <View style={styles.cashbackLeftCol}>
              <View style={styles.cashbackTitleGroup}>
                <Text style={styles.cashbackTitleWhite}>Real cashback</Text>
                <Text style={styles.cashbackTitleGold}>on every spend</Text>
              </View>

              <Text style={styles.cashbackSubtext}>
                No expiring points or coupon scratching
              </Text>
            </View>

            {/* Right Column: 3D MyQuro Wallet Asset */}
            <View style={styles.cashbackWalletWrap}>
              <Image
                source={require('../assets/wallet.png')}
                style={styles.cashbackWalletImg}
                resizeMode="contain"
              />
            </View>
          </View>

          {/* ══════════════════════════════════════════════════════════════════════
              [6] ORDER DETAILS SECTION (EXACT PIXEL-BY-PIXEL DESIGN)
              ══════════════════════════════════════════════════════════════════════ */}
          
          {/* Section Header with Organic Gold Underline */}
          <View style={styles.orderDetailsSectionHeader}>
            <Text style={styles.orderDetailsSectionTitle}>ORDER DETAILS</Text>
            {/* Organic Gold Curved Accent Underline */}
            <Svg width={110 * SCALE} height={8 * SCALE} viewBox="0 0 110 8" fill="none" style={styles.goldUnderlineSvg}>
              <Path
                d="M 2 5 Q 55 1 108 5"
                stroke="#DEA430"
                strokeWidth="2.2"
                strokeLinecap="round"
              />
            </Svg>
          </View>

          {/* ── CARD 1: STORE & DESTINATION ADDRESS DETAILS ── */}
          <View style={styles.orderDetailsCard}>
            {/* Store / Restaurant Row */}
            <View style={styles.addressDetailRow}>
              {/* Store Icon Pill */}
              <View style={styles.addressIconWrap}>
                <ShoppingBag size={18 * SCALE} color="#E5B842" strokeWidth={2.2} />
              </View>

              {/* Store Information */}
              <View style={styles.addressTextCol}>
                <Text style={styles.addressNameTitle} numberOfLines={1}>
                  {restaurantName || 'Restaurant'}
                </Text>
                <Text style={styles.addressSubtitle} numberOfLines={2}>
                  {orderDetail?.restaurantAddress || currentRestaurant?.address || 'Store Location'}
                </Text>
              </View>
            </View>

            {/* Dotted / Dashed Divider Line */}
            <View style={styles.dashedDividerLine} />

            {/* Delivery Destination Row */}
            <View style={styles.addressDetailRow}>
              {/* Destination Home / Pin Icon Pill */}
              <View style={styles.addressIconWrap}>
                <Home size={18 * SCALE} color="#E5B842" strokeWidth={2.2} />
              </View>

              {/* Destination Information */}
              <View style={styles.addressTextCol}>
                <Text style={styles.addressNameTitle} numberOfLines={1}>
                  Delivering to Home
                </Text>
                <Text style={styles.addressSubtitle} numberOfLines={2}>
                  {deliveryAddress || 'Your Delivery Location'}
                </Text>
              </View>
            </View>
          </View>

          {/* ── CARD 2: ITEMS SUMMARY & ORDER METADATA ── */}
          <View style={styles.orderDetailsCard}>
            {/* Items Count Header */}
            <Text style={styles.itemsCountHeader}>
              {itemsCount > 0 ? itemsCount : 1} item(s)
            </Text>

            {/* List of Ordered Items */}
            <View style={styles.itemsListContainer}>
              {orderItemsList.map((item: any, idx: number) => {
                const rawItemName = item.name || item.menuItemName || item.foodItem?.name || item.title || item.notes || 'Food Item';
                const variantSuffix = item.variantName && item.variantName !== 'Regular' ? ` (${item.variantName})` : '';
                const itemName = `${rawItemName}${variantSuffix}`;
                const itemQty = Math.max(1, parseInt(String(item.quantity || item.qty || 1), 10));
                const unitPrice = getItemPrice(item);
                const itemPrice = (item.totalPrice ? normalizePrice(item.totalPrice) : (unitPrice * itemQty)) || (unitPrice * itemQty);
                return (
                  <View key={item.id || idx} style={styles.orderDetailItemRow}>
                    {/* Gold Check Circle Badge */}
                    <View style={styles.itemCheckCircleBadge}>
                      <Check size={10 * SCALE} color="#000000" strokeWidth={3.8} />
                    </View>

                    {/* Item Quantity and Name */}
                    <Text style={styles.orderDetailItemName} numberOfLines={2}>
                      {itemQty} x {itemName}
                    </Text>

                    {/* Item Price */}
                    <Text style={styles.orderDetailItemPrice}>₹{itemPrice}</Text>
                  </View>
                );
              })}
            </View>

            {/* Total Bill Row */}
            {orderTotalAmount > 0 && (
              <View style={[styles.orderDetailItemRow, { marginTop: 12 * SCALE, paddingTop: 10 * SCALE, borderTopWidth: 1, borderTopColor: '#1F1D17' }]}>
                <Text style={[styles.orderDetailItemName, { fontFamily: 'Urbanist-Bold', color: '#FFFFFF', fontSize: 14 * SCALE }]}>
                  Total Bill
                </Text>
                <Text style={[styles.orderDetailItemPrice, { color: '#DEA430', fontSize: 15 * SCALE }]}>
                  ₹{orderTotalAmount}
                </Text>
              </View>
            )}

            {/* Dotted / Dashed Divider Line */}
            <View style={styles.dashedDividerLine} />

            {/* Footer Row: Placed Time & Order ID */}
            <View style={styles.orderMetadataFooterRow}>
              {/* Placed At */}
              <Text style={styles.metaLabelText}>
                Placed at{' '}
                <Text style={styles.metaValueGold}>
                  {placedTimeFormatted || 'Just now'}
                </Text>
              </Text>

              {/* Order ID */}
              <Text style={styles.metaLabelText}>
                Order{' '}
                <Text style={styles.metaValueGold}>
                  #{orderId || orderDetail?.id || orderDetail?.orderId || 'Recent'}
                </Text>
              </Text>
            </View>
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
              <Text style={styles.chatTitle}>{riderInfo?.name || 'Delivery Partner'}</Text>
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
    color: '#FFFFFF',
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
  heroBgVideo: {
    ...StyleSheet.absoluteFill,
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
    bottom: 96 * SCALE,
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
    ...StyleSheet.absoluteFill,
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
    marginTop: -88 * SCALE,
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
    marginBottom: 4 * SCALE,
  },

  // Waiting for delivery partner badge (amber pill shown when !isRiderAccepted)
  waitingPartnerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245, 184, 0, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 184, 0, 0.35)',
    borderRadius: 8 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 4 * SCALE,
    marginTop: 10 * SCALE,
    marginBottom: 4 * SCALE,
    alignSelf: 'flex-start',
  },
  pulsingAmberDot: {
    width: 6.5 * SCALE,
    height: 6.5 * SCALE,
    borderRadius: 4 * SCALE,
    backgroundColor: '#F5B800',
    marginRight: 6 * SCALE,
  },
  waitingPartnerBadgeText: {
    color: '#F5B800',
    fontSize: 11.5 * SCALE,
    fontFamily: 'Outfit-Medium',
    letterSpacing: 0.2,
  },
  kitchenPrepPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#16140D',
    borderWidth: 1,
    borderColor: '#3A3015',
    borderRadius: 10 * SCALE,
    paddingHorizontal: 10 * SCALE,
    paddingVertical: 6 * SCALE,
    marginTop: 8 * SCALE,
    marginBottom: 4 * SCALE,
  },
  kitchenPrepPillText: {
    color: '#E0D8C8',
    fontSize: 12 * SCALE,
    fontFamily: 'Urbanist-SemiBold',
  },
  kitchenPrepCountdownBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5B800',
    paddingHorizontal: 7 * SCALE,
    paddingVertical: 2.5 * SCALE,
    borderRadius: 6 * SCALE,
    marginLeft: 6 * SCALE,
  },
  kitchenPrepCountdownText: {
    color: '#000000',
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Bold',
  },
  partnerDetailsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 6 * SCALE,
    marginTop: 8 * SCALE,
    marginBottom: 4 * SCALE,
  },
  partnerNameCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131317',
    borderWidth: 1,
    borderColor: '#2E2D38',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 4 * SCALE,
  },
  riderOnlineDot: {
    width: 6 * SCALE,
    height: 6 * SCALE,
    borderRadius: 3 * SCALE,
    backgroundColor: '#10B981',
    marginRight: 6 * SCALE,
  },
  partnerNameText: {
    color: '#FFFFFF',
    fontSize: 12.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
  },
  kitchenPrepMiniPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16140D',
    borderWidth: 1,
    borderColor: '#3A3015',
    borderRadius: 12 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 4 * SCALE,
  },
  kitchenPrepMiniText: {
    color: '#DEA430',
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-Medium',
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
    color: '#E5B842',
    letterSpacing: 0.6,
  },
  partnerStatusTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 22 * SCALE,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    marginBottom: 4 * SCALE,
  },
  partnerStatusDesc: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14 * SCALE,
    color: '#A6A6AC',
    lineHeight: 19.5 * SCALE,
  },
  statusCardDividerLine: {
    height: 1,
    backgroundColor: '#1E1E22',
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
    flex: 1,
    flexShrink: 1,
    marginRight: 8 * SCALE,
  },
  addInstructionsText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 14 * SCALE,
    color: '#E0E0E0',
    flexShrink: 1,
  },
  addInstructionsGoldText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#CBB928',
    flexShrink: 1,
  },
  addInstructionsGoldChevron: {
    fontSize: 18 * SCALE,
    color: '#CBB928',
    fontFamily: 'Urbanist-Bold',
    marginTop: -2,
    flexShrink: 0,
  },

  // ── Unified Action Capsule (Call | Chat | Avatar) ───────────────
  unifiedActionCapsule: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#161619',
    borderWidth: 1.2,
    borderColor: '#2C2A34',
    borderRadius: 24 * SCALE,
    paddingHorizontal: 8 * SCALE,
    paddingVertical: 5 * SCALE,
    gap: 6 * SCALE,
    flexShrink: 0,
  },
  capsuleIconBtn: {
    width: 30 * SCALE,
    height: 30 * SCALE,
    borderRadius: 15 * SCALE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  capsuleDivider: {
    width: 1,
    height: 16 * SCALE,
    backgroundColor: '#2C2A34',
  },
  capsuleAvatarBtn: {
    width: 32 * SCALE,
    height: 32 * SCALE,
    borderRadius: 16 * SCALE,
    borderWidth: 1.5,
    borderColor: '#D4AF37',
    overflow: 'hidden',
    backgroundColor: '#1E1E24',
  },
  deliveryBoyExactImg: {
    width: '100%',
    height: '100%',
  },

  // ── 4. Savings Pill Banner (Figma Node 3046:153) ────────────────
  savingsPillBanner: {
    backgroundColor: '#07150C',
    borderRadius: 24 * SCALE,
    borderWidth: 1.2,
    borderColor: '#194523',
    paddingVertical: 12 * SCALE,
    paddingHorizontal: 18 * SCALE,
    marginBottom: 12 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  savingsBannerText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5 * SCALE,
    color: '#86EFAC',
    letterSpacing: 0.2,
  },
  savingsAmountHighlight: {
    fontFamily: 'Urbanist-ExtraBold',
    color: '#4ADE80',
  },

  // ── 5. MyQuro Real Cashback Promo Card ─────────────────────────
  myquroCashbackCard: {
    height: 168 * SCALE,
    borderRadius: 24 * SCALE,
    borderWidth: 1.2,
    borderColor: '#242018',
    backgroundColor: '#09090B',
    paddingHorizontal: 20 * SCALE,
    paddingVertical: 18 * SCALE,
    marginBottom: 14 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },
  cashbackLeftCol: {
    flex: 1,
    height: '100%',
    justifyContent: 'space-between',
    paddingRight: 8 * SCALE,
    paddingVertical: 4 * SCALE,
  },
  cashbackTitleGroup: {
    gap: 2 * SCALE,
  },
  cashbackTitleWhite: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 22 * SCALE,
    color: '#FFFFFF',
    letterSpacing: -0.3,
    lineHeight: 26 * SCALE,
  },
  cashbackTitleGold: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 22 * SCALE,
    color: '#DEA430',
    letterSpacing: -0.3,
    lineHeight: 26 * SCALE,
  },
  cashbackSubtext: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5 * SCALE,
    color: '#8E8E96',
    lineHeight: 16.5 * SCALE,
  },

  // ── 3D Wallet Visual (Right Side) ──────────────────────────────
  cashbackWalletWrap: {
    width: 140 * SCALE,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cashbackWalletImg: {
    width: 135 * SCALE,
    height: 135 * SCALE,
    transform: [{ translateY: 2 * SCALE }],
  },

  // ── 6. Order Details Section Styles (Figma Node Pixel-by-Pixel) ─
  orderDetailsSectionHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 22 * SCALE,
    marginBottom: 16 * SCALE,
  },
  orderDetailsSectionTitle: {
    fontFamily: 'Urbanist-ExtraBold',
    fontSize: 14.5 * SCALE,
    color: '#FFFFFF',
    letterSpacing: 2.8,
  },
  goldUnderlineSvg: {
    marginTop: 4 * SCALE,
  },

  orderDetailsCard: {
    backgroundColor: '#0A0A0C',
    borderRadius: 22 * SCALE,
    borderWidth: 1.2,
    borderColor: '#201E1A',
    paddingHorizontal: 16 * SCALE,
    paddingVertical: 16 * SCALE,
    marginBottom: 12 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 8,
    elevation: 6,
  },

  addressDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addressIconWrap: {
    width: 42 * SCALE,
    height: 42 * SCALE,
    borderRadius: 21 * SCALE,
    backgroundColor: '#16151A',
    borderWidth: 1,
    borderColor: '#26242C',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14 * SCALE,
  },
  addressTextCol: {
    flex: 1,
  },
  addressNameTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15.5 * SCALE,
    color: '#FFFFFF',
    marginBottom: 3 * SCALE,
    letterSpacing: -0.2,
  },
  addressSubtitle: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5 * SCALE,
    color: '#8A8A92',
    lineHeight: 16.5 * SCALE,
  },

  dashedDividerLine: {
    height: 1,
    borderWidth: 1,
    borderColor: '#26221A',
    borderStyle: 'dashed',
    marginVertical: 14 * SCALE,
  },

  itemsCountHeader: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 15 * SCALE,
    color: '#FFFFFF',
    marginBottom: 12 * SCALE,
  },
  itemsListContainer: {
    gap: 10 * SCALE,
  },
  orderDetailItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemCheckCircleBadge: {
    width: 17 * SCALE,
    height: 17 * SCALE,
    borderRadius: 8.5 * SCALE,
    backgroundColor: '#DEA430',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10 * SCALE,
  },
  orderDetailItemName: {
    flex: 1,
    fontFamily: 'Urbanist-Medium',
    fontSize: 13.5 * SCALE,
    color: '#E8E8E8',
    lineHeight: 18 * SCALE,
    marginRight: 10 * SCALE,
  },
  orderDetailItemPrice: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 14 * SCALE,
    color: '#FFFFFF',
  },

  orderMetadataFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  metaLabelText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12.5 * SCALE,
    color: '#8A8A92',
  },
  metaValueGold: {
    fontFamily: 'Urbanist-Bold',
    color: '#DEA430',
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
