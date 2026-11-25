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

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
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
  PanResponder,
  BackHandler,
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
  ChevronDown,
  ChevronUp,
  Navigation,
} from 'lucide-react-native';
import { DeliveredOrderView } from './DeliveredOrderView';
import { HelpSubView } from './profile/HelpSubView';
import { RatingService } from '../services/RatingService';
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
  SCREEN_HEIGHT,
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
  riderLat: number | undefined,
  riderLng: number | undefined,
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

  const hasRider = Boolean(riderLat && riderLng && riderLat !== 0 && riderLng !== 0);
  const isRiderAssigned = Boolean(hasRider && ['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus));
  const isGoingToPickup = isRiderAssigned && ['assigned', 'arrived_at_store'].includes(currentStatus);
  const isPickedUp = isRiderAssigned && ['picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isUnassigned = !isRiderAssigned;

  // Active navigation route coordinates:
  // Strictly use real street coordinates from Ola Maps (never draw straight lines across buildings)
  let activeCoords: [number, number][] = [];
  if (roadCoords && roadCoords.length > 0) {
    if (hasRider && roadCoords.length > 1) {
      let closestIdx = 0;
      let minDist = Infinity;
      const cosLat = Math.cos(riderLat! * Math.PI / 180);
      for (let i = 0; i < roadCoords.length; i++) {
        const dLng = (roadCoords[i][0] - riderLng!) * cosLat;
        const dLat = roadCoords[i][1] - riderLat!;
        const d = Math.hypot(dLng, dLat);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      }
      const distMeters = minDist * 111320;
      if (distMeters <= 25) {
        activeCoords = roadCoords.slice(closestIdx);
      } else {
        activeCoords = roadCoords;
      }
    } else {
      activeCoords = roadCoords;
    }
  } else if (isGoingToPickup && hasRider) {
    activeCoords = bezier(riderLng!, riderLat!, storeLng, storeLat);
  } else if (isPickedUp && hasRider) {
    activeCoords = bezier(riderLng!, riderLat!, dropLng, dropLat);
  } else {
    activeCoords = bezier(storeLng, storeLat, dropLng, dropLat);
  }

  const activeCoordsJson = JSON.stringify(activeCoords);

  // Calculate distance between points to determine optimal dynamic zoom
  function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const directDistMeters = calculateDistanceMeters(storeLat, storeLng, dropLat, dropLng);
  let effectiveSpanMeters = directDistMeters;
  if (hasRider) {
    const rToStore = calculateDistanceMeters(riderLat!, riderLng!, storeLat, storeLng);
    const rToDrop = calculateDistanceMeters(riderLat!, riderLng!, dropLat, dropLng);
    effectiveSpanMeters = Math.max(effectiveSpanMeters, rToStore, rToDrop);
  }

  // Dynamic initial zoom based on real physical distance between pins
  function getDynamicInitialZoom(d: number): number {
    if (d <= 120) return 17.5;
    if (d <= 250) return 17.1;
    if (d <= 500) return 16.5;
    if (d <= 1000) return 15.8;
    if (d <= 2000) return 15.0;
    if (d <= 4000) return 14.2;
    if (d <= 8000) return 13.2;
    return 12.5;
  }

  const initialZoom = getDynamicInitialZoom(effectiveSpanMeters);

  // Exact bounds
  let allLats = [storeLat, dropLat];
  let allLngs = [storeLng, dropLng];
  if (hasRider) {
    allLats.push(riderLat!);
    allLngs.push(riderLng!);
  }

  if (activeCoords.length > 0) {
    activeCoords.forEach(([lng, lat]) => {
      allLats.push(lat);
      allLngs.push(lng);
    });
  }

  const rawMinLat = Math.min(...allLats);
  const rawMaxLat = Math.max(...allLats);
  const rawMinLng = Math.min(...allLngs);
  const rawMaxLng = Math.max(...allLngs);

  const centerLng = Number(((rawMinLng + rawMaxLng) / 2).toFixed(6));
  const centerLat = Number(((rawMinLat + rawMaxLat) / 2).toFixed(6));

  const storeNameJson = JSON.stringify(storeName || 'Restaurant');

  // Route colors:
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
      display:flex;align-items:center;gap:6px;
      background:#0B0B0E;border-radius:18px;
      padding:4px 10px 4px 5px;
      border:1.5px solid #F5B800;white-space:nowrap;
      box-shadow:0 4px 14px rgba(0,0,0,.7);
    }
    .pickup-icon{
      width:22px;height:22px;border-radius:11px;
      background:#1A1A1E;border:1.5px solid #F5B800;
      display:flex;align-items:center;justify-content:center;flex-shrink:0;
    }
    .pickup-name{
      color:#FFFFFF;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;
      font-size:11.5px;font-weight:700;letter-spacing:0.2px;
    }

    /* Customer delivery pin */
    .customer-pin{
      width:28px;height:28px;border-radius:14px;
      background:#0B0B0E;border:2px solid #FFFFFF;
      display:flex;align-items:center;justify-content:center;
      box-shadow:0 4px 14px rgba(0,0,0,.7);
    }

    /* Animated Delivery Bike Marker */
    .bike-marker{
      position:relative;
      width:44px;height:44px;
      display:flex;align-items:center;justify-content:center;
      pointer-events:none;
    }
    .bike-aura{
      position:absolute;
      width:42px;height:42px;border-radius:21px;
      background:rgba(212,175,55,0.28);
      animation:bike-pulse 2s infinite ease-out;
    }
    @keyframes bike-pulse{
      0%{transform:scale(0.85);opacity:0.95;}
      100%{transform:scale(1.75);opacity:0;}
    }
    .bike-icon-wrapper{
      width:38px;height:38px;
      display:flex;align-items:center;justify-content:center;
      transform-origin:center center;
      transition:transform 0.35s cubic-bezier(0.25,1,0.5,1);
      filter:drop-shadow(0 4px 10px rgba(0,0,0,0.7));
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var currentRiderLng = ${riderLng || 0};
  var currentRiderLat = ${riderLat || 0};
  var riderMarker = null;
  var animationFrameId = null;
  var isRiderAssigned = ${Boolean(isRiderAssigned)};
  var mapLoaded = false;
  var userHasInteracted = false;
  var fullRouteCoords = ${activeCoordsJson};
  var remainingRouteCoords = ${activeCoordsJson};
  var maxPassedIdx = 0;

  function trimRouteToRider(rLng, rLat) {
    if (!mapLoaded || !map || !map.getSource('route-active')) return;
    if (!fullRouteCoords || fullRouteCoords.length < 2) return;

    var closestIdx = 0;
    var minDist = Infinity;
    var cosLat = Math.cos(rLat * Math.PI / 180);
    for (var i = 0; i < fullRouteCoords.length; i++) {
      var dLng = (fullRouteCoords[i][0] - rLng) * cosLat;
      var dLat = fullRouteCoords[i][1] - rLat;
      var d = Math.hypot(dLng, dLat);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    var distMeters = minDist * 111320;

    // IF RIDER IS OFF-ROUTE (> 25m away from the road corridor):
    // Strictly DO NOT draw a straight diagonal line across buildings to the old route!
    // Keep the street polyline as-is until the new turn-by-turn route arrives from Ola Maps.
    if (distMeters > 25) {
      return;
    }

    maxPassedIdx = closestIdx;

    // Strictly road-following: slice from the nearest street coordinate ahead
    var newRemaining = fullRouteCoords.slice(maxPassedIdx);
    if (newRemaining.length < 2 && fullRouteCoords.length > 0) {
      newRemaining = [fullRouteCoords[maxPassedIdx], fullRouteCoords[fullRouteCoords.length - 1]];
    }
    if (newRemaining.length < 2 && fullRouteCoords.length > 1) {
      newRemaining = [fullRouteCoords[0], fullRouteCoords[1]];
    }

    remainingRouteCoords = newRemaining;
    try {
      map.getSource('route-active').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: newRemaining }
      });
    } catch(err) {}
  }

  var map = new maplibregl.Map({
    container:'map',
    style:'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
    center:[${centerLng},${centerLat}],
    zoom:${initialZoom},
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

  function computeDistanceMeters(lat1, lon1, lat2, lon2) {
    var R = 6371000;
    var dLat = (lat2 - lat1) * Math.PI / 180;
    var dLon = (lon2 - lon1) * Math.PI / 180;
    var a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  function getDynamicMaxZoom(d) {
    if (d <= 120) return 17.6;
    if (d <= 250) return 17.2;
    if (d <= 500) return 16.6;
    if (d <= 1000) return 15.9;
    if (d <= 2000) return 15.1;
    if (d <= 4000) return 14.3;
    if (d <= 8000) return 13.3;
    return 12.5;
  }

  var lastFittedPts = null;

  function fitMapToActiveBounds(pts, duration) {
    if (!pts || pts.length === 0) return;
    lastFittedPts = pts;
    var lats = pts.map(function(p){ return p[1]; });
    var lngs = pts.map(function(p){ return p[0]; });
    var minX = Math.min.apply(null, lngs);
    var maxX = Math.max.apply(null, lngs);
    var minY = Math.min.apply(null, lats);
    var maxY = Math.max.apply(null, lats);

    var dist = computeDistanceMeters(minY, minX, maxY, maxX);
    var maxZ = getDynamicMaxZoom(dist);

    if (maxX - minX < 0.0006) {
      var midX = (minX + maxX) / 2;
      minX = midX - 0.0004;
      maxX = midX + 0.0004;
    }
    if (maxY - minY < 0.0006) {
      var midY = (minY + maxY) / 2;
      minY = midY - 0.0004;
      maxY = midY + 0.0004;
    }

    try {
      map.fitBounds([[minX, minY], [maxX, maxY]], {
        padding: { top: 110, bottom: 220, left: 60, right: 60 },
        maxZoom: maxZ,
        duration: typeof duration === 'number' ? duration : 800
      });
    } catch(e) {}
  }

  // Ensures STRICTLY ONE single rider marker can ever exist on the map
  function ensureSingleRiderMarker(lng, lat, bearing) {
    if (!isRiderAssigned || isNaN(lng) || isNaN(lat) || !lng || !lat) return;

    // Purge any duplicate DOM elements
    var allDoms = document.querySelectorAll('.bike-marker');
    if (allDoms && allDoms.length > 0) {
      for (var i = 0; i < allDoms.length; i++) {
        if (!riderMarker || allDoms[i] !== riderMarker.getElement()) {
          allDoms[i].parentElement && allDoms[i].parentElement.removeChild(allDoms[i]);
        }
      }
    }

    if (!riderMarker) {
      var bikeEl = document.createElement('div');
      bikeEl.className = 'bike-marker';
      bikeEl.id = 'rider-bike-marker';
      bikeEl.innerHTML = '<div class="bike-aura"></div><div class="bike-icon-wrapper" id="bike-icon-inner"><svg width="38" height="38" viewBox="0 0 44 44" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="22" cy="22" r="20" fill="#0D1117" stroke="#D4AF37" stroke-width="2.5"/><polygon points="22,3 26.5,10 17.5,10" fill="#F59E0B"/><rect x="20" y="8" width="4" height="6.5" rx="1.5" fill="#2B2D31" stroke="#D4AF37" stroke-width="0.8"/><line x1="13" y1="14" x2="31" y2="14" stroke="#F1F5F9" stroke-width="2.8" stroke-linecap="round"/><circle cx="13" cy="14" r="1.8" fill="#F59E0B"/><circle cx="31" cy="14" r="1.8" fill="#F59E0B"/><path d="M19 14.5 L25 14.5 L24 18.5 L20 18.5 Z" fill="#F59E0B"/><circle cx="22" cy="15.5" r="1.2" fill="#FFFFFF"/><ellipse cx="22" cy="22" rx="5.2" ry="5.8" fill="#1E293B" stroke="#D4AF37" stroke-width="1.2"/><path d="M18.5 20.5 C19.5 18.5 24.5 18.5 25.5 20.5" stroke="#38BDF8" stroke-width="2.2" stroke-linecap="round"/><path d="M14.5 25.5 C14.5 23.5 29.5 23.5 29.5 25.5 L28 29 L16 29 Z" fill="#334155"/><rect x="16.5" y="27" width="11" height="9.5" rx="2" fill="#D4AF37" stroke="#FFFFFF" stroke-width="1"/><circle cx="22" cy="31.8" r="1.6" fill="#0D1117"/><rect x="20" y="37" width="4" height="1.6" rx="0.8" fill="#EF4444"/></svg></div>';
      riderMarker = new maplibregl.Marker({element: bikeEl, anchor: 'center'}).setLngLat([lng, lat]).addTo(map);
    } else {
      riderMarker.setLngLat([lng, lat]);
    }

    currentRiderLng = lng;
    currentRiderLat = lat;

    if (bearing !== undefined && !isNaN(bearing)) {
      var iconEl = document.getElementById('bike-icon-inner');
      if (iconEl) {
        iconEl.style.transform = 'rotate(' + Math.round(bearing) + 'deg)';
      }
    }
  }

  // Smooth live animation of rider bike marker with bearing rotation
  window.updateRiderPosition = function(targetLng, targetLat) {
    targetLng = Number(targetLng);
    targetLat = Number(targetLat);
    if (isNaN(targetLng) || isNaN(targetLat) || !targetLng || !targetLat) return;
    isRiderAssigned = true;

    if (!mapLoaded) {
      currentRiderLng = targetLng;
      currentRiderLat = targetLat;
      return;
    }

    if (!riderMarker) {
      ensureSingleRiderMarker(targetLng, targetLat);
      if (isRiderAssigned) {
        trimRouteToRider(targetLng, targetLat);
      }
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
      if (riderMarker) {
        riderMarker.setLngLat([curLng, curLat]);
      }
      if (isRiderAssigned) {
        trimRouteToRider(curLng, curLat);
      }

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      }
    }
    animationFrameId = requestAnimationFrame(step);
  };

  // Dynamic route update without map reload and preserving user zoom level
  var pendingRouteCoords = null;
  window.updateRouteCoords = function(coords) {
    try {
      var parsed = typeof coords === 'string' ? JSON.parse(coords) : coords;
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      fullRouteCoords = parsed;
      maxPassedIdx = 0;
      if (!mapLoaded || !map || !map.getSource('route-active')) {
        pendingRouteCoords = parsed;
        return;
      }
      if (isRiderAssigned && currentRiderLng && currentRiderLat) {
        trimRouteToRider(currentRiderLng, currentRiderLat);
      } else {
        remainingRouteCoords = parsed;
        map.getSource('route-active').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: parsed }
        });
      }
      // Never reset zoom or pan if user has zoomed into or panned the map!
      if (!userHasInteracted) {
        var pts = parsed.slice();
        pts.push([${storeLng}, ${storeLat}]);
        pts.push([${dropLng}, ${dropLat}]);
        if (isRiderAssigned && currentRiderLng && currentRiderLat) {
          pts.push([currentRiderLng, currentRiderLat]);
        }
        fitMapToActiveBounds(pts, 900);
      }
    } catch(e) {}
  };

  // Re-center button action triggered by user explicitly
  window.recenterMap = function() {
    userHasInteracted = false;
    var pts = [[${storeLng}, ${storeLat}], [${dropLng}, ${dropLat}]];
    if (currentRiderLng && currentRiderLat) {
      pts.push([currentRiderLng, currentRiderLat]);
    }
    if (lastFittedPts && lastFittedPts.length > 0) {
      pts = lastFittedPts;
    }
    fitMapToActiveBounds(pts, 800);
  };

  map.on('load',function(){
    mapLoaded = true;

    // Track user drag, zoom, touch, and scroll: never disrupt user when they zoom in!
    map.on('dragstart', function() { userHasInteracted = true; });
    map.on('zoomstart', function(e) { if (e && e.originalEvent) userHasInteracted = true; });
    map.on('rotatestart', function() { userHasInteracted = true; });
    map.on('pitchstart', function() { userHasInteracted = true; });
    try {
      var canvas = map.getCanvas();
      if (canvas) {
        canvas.addEventListener('touchstart', function() { userHasInteracted = true; }, { passive: true });
        canvas.addEventListener('pointerdown', function() { userHasInteracted = true; }, { passive: true });
        canvas.addEventListener('wheel', function() { userHasInteracted = true; }, { passive: true });
      }
    } catch(e) {}

    // 1. ADD RESTAURANT & CUSTOMER MARKERS FIRST (Always guaranteed visible)
    try {
      var storeEl = document.createElement('div');
      storeEl.className = 'pickup-pill';
      storeEl.innerHTML = '<div class="pickup-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="#F5B800"><path d="M20 3H4v10c0 2.21 1.79 4 4 4h6c2.21 0 4-1.79 4-4v-3h2c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 5h-2V5h2v3zM4 19h16v2H4z"/></svg></div><div class="pickup-name">' + ${storeNameJson} + '</div>';
      new maplibregl.Marker({ element: storeEl, anchor: 'bottom' }).setLngLat([${storeLng}, ${storeLat}]).addTo(map);
    } catch(err) { console.error('Store pin error:', err); }

    try {
      var custEl = document.createElement('div');
      custEl.className = 'customer-pin';
      custEl.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="#FFFFFF"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>';
      new maplibregl.Marker({ element: custEl, anchor: 'center' }).setLngLat([${dropLng}, ${dropLat}]).addTo(map);
    } catch(err) { console.error('Cust pin error:', err); }

    // 2. LIVE RIDER BIKE MARKER (IF ASSIGNED)
    try {
      if (isRiderAssigned && currentRiderLat && currentRiderLng) {
        var destLat = ${isGoingToPickup ? storeLat : dropLat};
        var destLng = ${isGoingToPickup ? storeLng : dropLng};
        var initBearing = calculateBearing(currentRiderLat, currentRiderLng, destLat, destLng);
        ensureSingleRiderMarker(currentRiderLng, currentRiderLat, initBearing);
      }
    } catch(err) { console.error('Rider marker error:', err); }

    // 3. ACTIVE NAVIGATION ROAD ROUTE LAYER
    try {
      if (isRiderAssigned && currentRiderLng && currentRiderLat && fullRouteCoords && fullRouteCoords.length > 1) {
        trimRouteToRider(currentRiderLng, currentRiderLat);
      }
      map.addSource('route-active', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: remainingRouteCoords }
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
        map.addLayer({
          id:'route-active-glow',type:'line',source:'route-active',
          paint:{
            'line-color':'${glowColor}',
            'line-width':7,
            'line-opacity':0.35
          },
          layout:{'line-join':'round','line-cap':'round'}
        });
        map.addLayer({
          id:'route-active-core',type:'line',source:'route-active',
          paint:{
            'line-color':'${routeColor}',
            'line-width':4.5
          },
          layout:{'line-join':'round','line-cap':'round'}
        });
      `}
    } catch(err) { console.error('Route layer error:', err); }

    // 4. DYNAMIC FIT TO ACTIVE BOUNDS
    try {
      var initPts = [[${storeLng}, ${storeLat}], [${dropLng}, ${dropLat}]];
      if (isRiderAssigned && currentRiderLng && currentRiderLat) {
        initPts.push([currentRiderLng, currentRiderLat]);
      }
      if (activeRouteCoords && activeRouteCoords.length > 0) {
        initPts = initPts.concat(activeRouteCoords);
      }
      fitMapToActiveBounds(initPts, 0);
    } catch(err) { console.error('Fit bounds error:', err); }

    // 5. APPLY ANY PENDING ROUTE COORDS
    if (pendingRouteCoords && Array.isArray(pendingRouteCoords) && pendingRouteCoords.length > 0) {
      window.updateRouteCoords(pendingRouteCoords);
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
  riderLat?: number,
  riderLng?: number,
  currentStatus: string = '',
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

  const hasRider = Boolean(riderLat && riderLng && !isNaN(Number(riderLat)) && !isNaN(Number(riderLng)) && Number(riderLat) !== 0 && Number(riderLng) !== 0);
  const isRiderAssigned = Boolean(hasRider && ['assigned', 'arrived_at_store', 'picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus));
  const isGoingToPickup = isRiderAssigned && ['assigned', 'arrived_at_store'].includes(currentStatus);
  const isPickedUp = isRiderAssigned && ['picked_up', 'out_for_delivery', 'delivered'].includes(currentStatus);
  const isUnassigned = !isRiderAssigned;

  let activeCoords: [number, number][] = [];
  if (roadCoords && roadCoords.length > 0) {
    if (hasRider && roadCoords.length > 1) {
      let closestIdx = 0;
      let minDist = Infinity;
      const cosLat = Math.cos(riderLat! * Math.PI / 180);
      for (let i = 0; i < roadCoords.length; i++) {
        const dLng = (roadCoords[i][0] - riderLng!) * cosLat;
        const dLat = roadCoords[i][1] - riderLat!;
        const d = Math.hypot(dLng, dLat);
        if (d < minDist) {
          minDist = d;
          closestIdx = i;
        }
      }
      const distMeters = minDist * 111320;
      if (distMeters <= 25) {
        activeCoords = roadCoords.slice(closestIdx);
      } else {
        activeCoords = roadCoords;
      }
    } else {
      activeCoords = roadCoords;
    }
  } else if (isGoingToPickup && hasRider) {
    activeCoords = bezier(riderLng!, riderLat!, storeLng, storeLat);
  } else if (isPickedUp && hasRider) {
    activeCoords = bezier(riderLng!, riderLat!, dropLng, dropLat);
  } else {
    activeCoords = bezier(storeLng, storeLat, dropLng, dropLat);
  }

  const activeCoordsJson = JSON.stringify(activeCoords);

  function calcDist(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  const directDist = calcDist(storeLat, storeLng, dropLat, dropLng);
  let effectiveMiniDist = directDist;
  if (hasRider) {
    const rStore = calcDist(riderLat!, riderLng!, storeLat, storeLng);
    const rDrop = calcDist(riderLat!, riderLng!, dropLat, dropLng);
    effectiveMiniDist = Math.max(effectiveMiniDist, rStore, rDrop);
  }

  function getMiniDynamicZoom(d: number): number {
    if (d <= 150) return 16.5;
    if (d <= 300) return 16.0;
    if (d <= 600) return 15.3;
    if (d <= 1200) return 14.6;
    if (d <= 2500) return 13.8;
    if (d <= 5000) return 13.0;
    return 12.2;
  }

  const miniInitialZoom = getMiniDynamicZoom(effectiveMiniDist);

  let allLats = [storeLat, dropLat];
  let allLngs = [storeLng, dropLng];
  if (hasRider) {
    allLats.push(riderLat!);
    allLngs.push(riderLng!);
  }

  const rawMinLat = Math.min(...allLats);
  const rawMaxLat = Math.max(...allLats);
  const rawMinLng = Math.min(...allLngs);
  const rawMaxLng = Math.max(...allLngs);

  const centerLng = Number(((rawMinLng + rawMaxLng) / 2).toFixed(6));
  const centerLat = Number(((rawMinLat + rawMaxLat) / 2).toFixed(6));

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
      width:24px;height:24px;border-radius:12px;background:#0D1117;border:2px solid #D4AF37;
      display:flex;align-items:center;justify-content:center;
      transform-origin:center center;
      transition:transform 0.35s ease;
      box-shadow:0 2px 6px rgba(0,0,0,0.5);
    }
  </style>
</head>
<body>
<div id="map"></div>
<script>
  var currentRiderLng = ${hasRider ? riderLng : 0};
  var currentRiderLat = ${hasRider ? riderLat : 0};
  var riderMarker = null;
  var mapLoaded = false;
  var isRiderAssigned = ${Boolean(isRiderAssigned)};
  var pendingRouteCoords = null;
  var fullRouteCoords = ${activeCoordsJson};
  var remainingRouteCoords = ${activeCoordsJson};
  var maxPassedIdx = 0;

  function trimRouteToRider(rLng, rLat) {
    if (!mapLoaded || !map || !map.getSource('route-active')) return;
    if (!fullRouteCoords || fullRouteCoords.length < 2) return;

    var closestIdx = 0;
    var minDist = Infinity;
    var cosLat = Math.cos(rLat * Math.PI / 180);
    for (var i = 0; i < fullRouteCoords.length; i++) {
      var dLng = (fullRouteCoords[i][0] - rLng) * cosLat;
      var dLat = fullRouteCoords[i][1] - rLat;
      var d = Math.hypot(dLng, dLat);
      if (d < minDist) {
        minDist = d;
        closestIdx = i;
      }
    }

    var distMeters = minDist * 111320;
    if (distMeters > 25) {
      return;
    }

    maxPassedIdx = closestIdx;

    var newRemaining = fullRouteCoords.slice(maxPassedIdx);
    if (newRemaining.length < 2 && fullRouteCoords.length > 0) {
      newRemaining = [fullRouteCoords[maxPassedIdx], fullRouteCoords[fullRouteCoords.length - 1]];
    }
    if (newRemaining.length < 2 && fullRouteCoords.length > 1) {
      newRemaining = [fullRouteCoords[0], fullRouteCoords[1]];
    }

    remainingRouteCoords = newRemaining;
    try {
      map.getSource('route-active').setData({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: newRemaining }
      });
    } catch(err) {}
  }

  var map = new maplibregl.Map({
    container:'map',
    style:'https://api.olamaps.io/tiles/vector/v1/styles/default-light-standard/style.json',
    center:[${centerLng},${centerLat}],
    zoom:${miniInitialZoom},
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

  // Ensures STRICTLY ONE single mini rider marker exists on the mini map
  function ensureSingleMiniRiderMarker(lng, lat, bearing) {
    if (!isRiderAssigned || isNaN(lng) || isNaN(lat) || !lng || !lat) return;

    // Purge any orphan DOM elements to ensure strictly 1 marker
    var allDoms = document.querySelectorAll('.mini-bike');
    if (allDoms && allDoms.length > 0) {
      for (var i = 0; i < allDoms.length; i++) {
        if (!riderMarker || allDoms[i] !== riderMarker.getElement()) {
          allDoms[i].parentElement && allDoms[i].parentElement.removeChild(allDoms[i]);
        }
      }
    }

    if (!riderMarker || !document.body.contains(riderMarker.getElement())) {
      var p3 = document.createElement('div');
      p3.className = 'mini-bike';
      p3.id = 'mini-bike-inner';
      p3.innerHTML = '<svg width="18" height="18" viewBox="0 0 44 44" fill="none"><polygon points="22,3 26.5,10 17.5,10" fill="#F59E0B"/><rect x="20" y="8" width="4" height="6.5" rx="1.5" fill="#555"/><line x1="13" y1="14" x2="31" y2="14" stroke="#FFF" stroke-width="3" stroke-linecap="round"/><ellipse cx="22" cy="22" rx="5.5" ry="6" fill="#1E293B" stroke="#D4AF37" stroke-width="1.5"/><path d="M18.5 20.5 C19.5 18.5 24.5 18.5 25.5 20.5" stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round"/><rect x="16.5" y="27" width="11" height="9.5" rx="2" fill="#D4AF37"/></svg>';
      riderMarker = new maplibregl.Marker({element: p3, anchor: 'center'}).setLngLat([lng, lat]).addTo(map);
    } else {
      riderMarker.setLngLat([lng, lat]);
    }

    currentRiderLng = lng;
    currentRiderLat = lat;

    if (bearing !== undefined && !isNaN(bearing)) {
      var iconEl = document.getElementById('mini-bike-inner');
      if (iconEl) iconEl.style.transform = 'rotate(' + Math.round(bearing) + 'deg)';
    }
  }

  window.updateRiderPosition = function(targetLng, targetLat) {
    targetLng = Number(targetLng);
    targetLat = Number(targetLat);
    if (isNaN(targetLng) || isNaN(targetLat) || !targetLng || !targetLat) return;
    isRiderAssigned = true;

    if (!mapLoaded) {
      currentRiderLng = targetLng;
      currentRiderLat = targetLat;
      return;
    }

    if (!riderMarker) {
      ensureSingleMiniRiderMarker(targetLng, targetLat);
      if (isRiderAssigned) {
        trimRouteToRider(targetLng, targetLat);
      }
      return;
    }

    var dist = Math.hypot(targetLng - currentRiderLng, targetLat - currentRiderLat);
    if (dist > 0.000015) {
      var bearing = calculateBearing(currentRiderLat, currentRiderLng, targetLat, targetLng);
      var iconEl = document.getElementById('mini-bike-inner');
      if (iconEl && !isNaN(bearing)) iconEl.style.transform = 'rotate(' + Math.round(bearing) + 'deg)';
    }
    currentRiderLng = targetLng;
    currentRiderLat = targetLat;
    riderMarker.setLngLat([targetLng, targetLat]);
    if (isRiderAssigned) {
      trimRouteToRider(targetLng, targetLat);
    }
  };

  window.updateRouteCoords = function(coords) {
    try {
      var parsed = typeof coords === 'string' ? JSON.parse(coords) : coords;
      if (!Array.isArray(parsed) || parsed.length === 0) return;
      fullRouteCoords = parsed;
      maxPassedIdx = 0;
      if (!mapLoaded || !map || !map.getSource('route-active')) {
        pendingRouteCoords = parsed;
        return;
      }
      if (isRiderAssigned && currentRiderLng && currentRiderLat) {
        trimRouteToRider(currentRiderLng, currentRiderLat);
      } else {
        remainingRouteCoords = parsed;
        map.getSource('route-active').setData({
          type: 'Feature',
          geometry: { type: 'LineString', coordinates: parsed }
        });
      }
      var lats = parsed.map(function(pt){ return pt[1]; });
      var lngs = parsed.map(function(pt){ return pt[0]; });
      lngs.push(${storeLng}, ${dropLng});
      lats.push(${storeLat}, ${dropLat});
      var minX = Math.min.apply(null, lngs);
      var maxX = Math.max.apply(null, lngs);
      var minY = Math.min.apply(null, lats);
      var maxY = Math.max.apply(null, lats);
      map.fitBounds([[minX, minY], [maxX, maxY]], { padding: 18, maxZoom: ${miniInitialZoom + 0.6}, duration: 900 });
    } catch(e) {}
  };

  map.on('load',function(){
    mapLoaded = true;
    map.fitBounds([[${rawMinLng},${rawMinLat}],[${rawMaxLng},${rawMaxLat}]],{padding:18,maxZoom:${miniInitialZoom + 0.6},duration:0});

    if (isRiderAssigned && currentRiderLat && currentRiderLng && fullRouteCoords && fullRouteCoords.length > 1) {
      trimRouteToRider(currentRiderLng, currentRiderLat);
    }

    map.addSource('route-active',{
      type:'geojson',
      data:{type:'Feature',geometry:{type:'LineString',coordinates:remainingRouteCoords}}
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

    if (isRiderAssigned && currentRiderLat && currentRiderLng) {
      var destLat = ${isGoingToPickup ? storeLat : dropLat};
      var destLng = ${isGoingToPickup ? storeLng : dropLng};
      var initBearing = calculateBearing(currentRiderLat, currentRiderLng, destLat, destLng);
      ensureSingleMiniRiderMarker(currentRiderLng, currentRiderLat, initBearing);
    }

    if (pendingRouteCoords && Array.isArray(pendingRouteCoords) && pendingRouteCoords.length > 0) {
      window.updateRouteCoords(pendingRouteCoords);
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

// ─── UPGRADED PICKUP HANDOVER OTP BADGE (High-End Security Pass Styling) ──────
const PickupHandoverOtpBadge: React.FC<{ otp: string | number }> = ({ otp }) => {
  const [copied, setCopied] = useState(false);
  const otpStr = String(otp ?? '').trim();
  const digits = otpStr ? otpStr.split('') : [];

  const handlePress = useCallback(() => {
    setCopied(true);
    if (Platform.OS === 'android') {
      ToastAndroid.show(`Pickup OTP ${otpStr} copied to clipboard`, ToastAndroid.SHORT);
    }
    setTimeout(() => {
      setCopied(false);
    }, 1800);
  }, [otpStr]);

  return (
    <TouchableOpacity
      activeOpacity={0.75}
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`Pickup Handover OTP is ${otpStr}. Tap to copy.`}
      style={styles.pickupOtpContainer}
    >
      {/* Left side: Shield Icon with micro glow & uppercase label */}
      <View style={styles.pickupOtpLeft}>
        <View style={styles.pickupOtpIconGlow}>
          <ShieldCheck size={11.5 * SCALE} color="#F5B800" strokeWidth={2.6} />
        </View>
        <Text style={styles.pickupOtpLabel}>PICKUP OTP</Text>
      </View>

      {/* Vertical hairline divider */}
      <View style={styles.pickupOtpDivider} />

      {/* Right side: 4 individual micro digit cells or COPIED feedback */}
      {copied ? (
        <View style={styles.pickupOtpCopiedPill}>
          <Check size={10 * SCALE} color="#FFFFFF" strokeWidth={3} style={{ marginRight: 2.5 * SCALE }} />
          <Text style={styles.pickupOtpCopiedText}>COPIED</Text>
        </View>
      ) : (
        <View style={styles.pickupOtpDigitsRow}>
          {digits.map((digit, idx) => (
            <View key={idx} style={styles.pickupOtpDigitBox}>
              <Text style={styles.pickupOtpDigitText}>{digit}</Text>
            </View>
          ))}
        </View>
      )}
    </TouchableOpacity>
  );
};

interface TrackingScreenProps {
  orderId: string | null;
  onBack: () => void;
}

// Helper to extract permanent delivery destination from order details or notes
const parseOrderDeliveryInfo = (order: any) => {
  let addr = order?.deliveryAddress || order?.delivery_address || order?.address || order?.delivery?.address || order?.delivery?.customerAddress;
  let lat = order?.customerLatitude || order?.customer_latitude || order?.deliveryLatitude || order?.latitude || order?.delivery?.customerLat;
  let lng = order?.customerLongitude || order?.customer_longitude || order?.deliveryLongitude || order?.longitude || order?.delivery?.customerLng;

  if (order?.notes && typeof order.notes === 'string') {
    try {
      if (order.notes.startsWith('{') && order.notes.endsWith('}')) {
        const parsed = JSON.parse(order.notes);
        if (!addr && parsed.address) addr = parsed.address;
        if (!lat && parsed.latitude) lat = Number(parsed.latitude);
        if (!lng && parsed.longitude) lng = Number(parsed.longitude);
      }
    } catch (e) {}
  }

  return {
    address: addr as string | undefined,
    latitude: lat !== undefined && lat !== null && !isNaN(Number(lat)) ? Number(lat) : undefined,
    longitude: lng !== undefined && lng !== null && !isNaN(Number(lng)) ? Number(lng) : undefined,
  };
};

export const TrackingScreen: React.FC<TrackingScreenProps> = ({ orderId, onBack }) => {
  const insets = useSafeAreaInsets();
  const { authState, currentLocation, savedAddresses, allRestaurants, cartItems, userOrders = [] } = useViewModel();
  const sessionToken = authState.type === 'Authenticated' ? authState.sessionToken : '';

  const isRealOrder = Boolean(orderId);

  const [loading, setLoading] = useState(false);
  const [orderDetail, setOrderDetail] = useState<any>(() => {
    const cachedOrder = userOrders?.find((o: any) => o.id === orderId || o.orderId === orderId);
    if (cachedOrder) {
      const parsedInfo = parseOrderDeliveryInfo(cachedOrder);
      return {
        ...cachedOrder,
        id: orderId,
        orderId: orderId,
        deliveryAddress: parsedInfo.address || cachedOrder.deliveryAddress || '',
        customerLatitude: parsedInfo.latitude || cachedOrder.customerLatitude || 0,
        customerLongitude: parsedInfo.longitude || cachedOrder.customerLongitude || 0,
        prepTimeMinutes: cachedOrder.prepTimeMinutes || cachedOrder.prep_time_minutes || 15,
        extendedPrepMinutes: cachedOrder.extendedPrepMinutes || cachedOrder.extended_prep_minutes || 0,
      };
    }
    return {
      id: orderId,
      orderId: orderId,
      status: 'placed',
      prepTimeMinutes: 15,
      extendedPrepMinutes: 0,
      createdAt: new Date().toISOString(),
      items: [],
    };
  });
  const [trackingData, setTrackingData] = useState<any>(null);
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
    } catch (e) { }
  };

  // UI Interactive States
  const [isFullScreenMap, setIsFullScreenMap] = useState(false);
  const [showSupportView, setShowSupportView] = useState(false);
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
      if (isFullScreenMap) {
        videoPlayer.pause();
      } else if (isPlaying) {
        videoPlayer.play();
      } else {
        videoPlayer.pause();
      }
    }
  }, [isFullScreenMap, isPlaying, videoPlayer]);

  // ── Unified Sheet Animation for Smooth Transition between Full Details and Full Map ──
  const sheetAnim = useRef(new Animated.Value(0)).current;
  const isFullScreenMapRef = useRef(false);
  const scrollOffsetRef = useRef(0);
  const scrollViewRef = useRef<any>(null);

  const openFullMap = () => {
    setIsFullScreenMap(true);
    isFullScreenMapRef.current = true;
    try { videoPlayer?.pause(); } catch (e) { }
    Animated.spring(sheetAnim, {
      toValue: SCREEN_HEIGHT,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start();
  };

  const closeFullMap = () => {
    isFullScreenMapRef.current = false;
    try { if (isPlaying) videoPlayer?.play(); } catch (e) { }
    Animated.spring(sheetAnim, {
      toValue: 0,
      tension: 65,
      friction: 11,
      useNativeDriver: true,
    }).start(() => {
      setIsFullScreenMap(false);
    });
  };

  // Interpolations for seamless synchronized transitions
  const topBarTranslateY = sheetAnim.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.45, SCREEN_HEIGHT],
    outputRange: [-120, -50, 0],
    extrapolate: 'clamp',
  });

  const topBarOpacity = sheetAnim.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.35, SCREEN_HEIGHT * 0.85],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const dockedCardTranslateY = sheetAnim.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.45, SCREEN_HEIGHT],
    outputRange: [180, 70, 0],
    extrapolate: 'clamp',
  });

  const dockedCardOpacity = sheetAnim.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.35, SCREEN_HEIGHT * 0.85],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const headerBarOpacity = sheetAnim.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.25],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  const miniMapOpacity = sheetAnim.interpolate({
    inputRange: [0, SCREEN_HEIGHT * 0.25],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Slide DOWN on Active Delivery Status Card to open full-screen map
  const cardSlidePanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Intercept downwards drags only when near top of scroll view
        if (scrollOffsetRef.current > 15) return false;
        return gestureState.dy > 8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.3;
      },
      onPanResponderGrant: () => {
        try { videoPlayer?.pause(); } catch (e) { }
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          const newPos = Math.min(SCREEN_HEIGHT, gestureState.dy * 1.35);
          sheetAnim.setValue(newPos);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 60 || gestureState.vy > 0.35) {
          openFullMap();
        } else {
          closeFullMap();
        }
      },
      onPanResponderTerminate: () => {
        closeFullMap();
      },
    })
  ).current;

  // Slide UP on docked bottom card to exit full-screen map and return to details
  const dockedCardPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return gestureState.dy < -8 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx) * 1.3;
      },
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy < 0) {
          const newPos = Math.max(0, SCREEN_HEIGHT + gestureState.dy * 1.35);
          sheetAnim.setValue(newPos);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy < -40 || gestureState.vy < -0.35) {
          closeFullMap();
        } else {
          openFullMap();
        }
      },
      onPanResponderTerminate: () => {
        openFullMap();
      },
    })
  ).current;

  // Android hardware back press listener to close fullscreen map
  useEffect(() => {
    const backAction = () => {
      if (isFullScreenMapRef.current) {
        closeFullMap();
        return true;
      }
      return false;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, []);
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

  const orderDeliveryInfo = parseOrderDeliveryInfo(orderDetail);

  // The delivery destination is permanently locked to the order placed — header browsing location can NEVER alter this
  const deliveryAddress =
    orderDeliveryInfo.address ||
    trackingData?.customerAddress ||
    trackingData?.deliveryAddress ||
    orderDetail?.deliveryAddress ||
    orderDetail?.address ||
    (savedAddresses.length > 0 && savedAddresses[0].address ? savedAddresses[0].address : 'Delivery Location');

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
        : []);
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

  // Coordinates strictly bound to the order's restaurant & delivery destination
  const restLat =
    trackingData?.restaurantLat ||
    orderDetail?.restaurantLatitude ||
    currentRestaurant?.latitude ||
    0;
  const restLng =
    trackingData?.restaurantLng ||
    orderDetail?.restaurantLongitude ||
    currentRestaurant?.longitude ||
    0;
  const custLat =
    (trackingData?.customerLat ? Number(trackingData.customerLat) : undefined) ||
    orderDeliveryInfo.latitude ||
    (orderDetail?.customerLatitude ? Number(orderDetail.customerLatitude) : undefined) ||
    (savedAddresses.length > 0 && savedAddresses[0].latitude ? savedAddresses[0].latitude : 0);
  const custLng =
    (trackingData?.customerLng ? Number(trackingData.customerLng) : undefined) ||
    orderDeliveryInfo.longitude ||
    (orderDetail?.customerLongitude ? Number(orderDetail.customerLongitude) : undefined) ||
    (savedAddresses.length > 0 && savedAddresses[0].longitude ? savedAddresses[0].longitude : 0);
  const hasRealRiderCoords = Boolean(
    trackingData?.currentLat &&
    trackingData?.currentLng &&
    !isNaN(Number(trackingData.currentLat)) &&
    !isNaN(Number(trackingData.currentLng))
  );
  const riderLat = hasRealRiderCoords ? Number(trackingData.currentLat) : undefined;
  const riderLng = hasRealRiderCoords ? Number(trackingData.currentLng) : undefined;

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

  // Keep live refs for webview hydration on mount/reload
  const roadRouteCoordsRef = useRef(roadRouteCoords);
  roadRouteCoordsRef.current = roadRouteCoords;

  const trackingDataRef = useRef(trackingData);
  trackingDataRef.current = trackingData;

  const lastFetchedRiderPosRef = useRef<{ lat: number; lng: number } | null>(null);
  const lastFetchTimestampRef = useRef<number>(0);

  // Memoize Map HTML & Source objects to guarantee WebView NEVER reloads or resets user zoom/pan
  const fullMapHtml = useMemo(() => {
    return buildOlaMapHtml(
      OLA_MAPS_API_KEY,
      isRiderAccepted ? riderLat : undefined,
      isRiderAccepted ? riderLng : undefined,
      restLat,
      restLng,
      custLat,
      custLng,
      restaurantName,
      currentStatus,
      roadRouteCoords,
    );
  }, [orderId, restLat, restLng, custLat, custLng, restaurantName, Boolean(isRiderAccepted)]);

  const miniMapHtml = useMemo(() => {
    return buildMiniOlaMapHtml(
      OLA_MAPS_API_KEY,
      restLat,
      restLng,
      custLat,
      custLng,
      isRiderAccepted ? riderLat : undefined,
      isRiderAccepted ? riderLng : undefined,
      currentStatus,
      roadRouteCoords,
    );
  }, [orderId, restLat, restLng, custLat, custLng, Boolean(isRiderAccepted)]);

  const fullMapSource = useMemo(() => ({ html: fullMapHtml }), [fullMapHtml]);
  const miniMapSource = useMemo(() => ({ html: miniMapHtml }), [miniMapHtml]);

  // Synchronize live rider GPS movements directly to WebView markers without page reload
  useEffect(() => {
    if (trackingData?.currentLat && trackingData?.currentLng) {
      const lat = Number(trackingData.currentLat);
      const lng = Number(trackingData.currentLng);
      if (!isNaN(lat) && !isNaN(lng)) {
        const updateScript = `if (window.updateRiderPosition) { window.updateRiderPosition(${lng}, ${lat}); } true;`;
        fullMapWebviewRef.current?.injectJavaScript(updateScript);
        miniMapWebviewRef.current?.injectJavaScript(updateScript);
      }
    }
  }, [trackingData?.currentLat, trackingData?.currentLng]);

  // ── Unified Ola Maps Turn-by-Turn Road Route & Directions Manager ──
  const isFetchingDirectionsRef = useRef<boolean>(false);

  const fetchOlaDirections = useCallback(async (forced: boolean = false) => {
    if (!restLat || !restLng || !custLat || !custLng || !OLA_MAPS_API_KEY) return;
    if (isFetchingDirectionsRef.current && !forced) return;

    const curRiderLat = isRiderAccepted ? (riderLat || trackingDataRef.current?.currentLat) : undefined;
    const curRiderLng = isRiderAccepted ? (riderLng || trackingDataRef.current?.currentLng) : undefined;

    let origin = `${restLat},${restLng}`;
    let destination = `${custLat},${custLng}`;

    if (isRiderAccepted && curRiderLat && curRiderLng) {
      if (riderStatus === 'assigned' || riderStatus === 'arrived_at_store') {
        origin = `${curRiderLat},${curRiderLng}`;
        destination = `${restLat},${restLng}`;
      } else {
        origin = `${curRiderLat},${curRiderLng}`;
        destination = `${custLat},${custLng}`;
      }
    }

    isFetchingDirectionsRef.current = true;
    try {
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
          setOlaTransitMins(transitMins);

          if (route.overview_polyline) {
            const decoded = decodePolyline(route.overview_polyline);
            if (decoded && decoded.length > 0) {
              // Crucial: Use decoded road coordinates directly from Ola Maps so the line strictly follows real streets!
              setRoadRouteCoords(decoded);
              roadRouteCoordsRef.current = decoded;
              if (curRiderLat && curRiderLng) {
                lastFetchedRiderPosRef.current = { lat: curRiderLat, lng: curRiderLng };
              }
              lastFetchTimestampRef.current = Date.now();

              const script = `if (window.updateRouteCoords) { window.updateRouteCoords(${JSON.stringify(decoded)}); } true;`;
              fullMapWebviewRef.current?.injectJavaScript(script);
              miniMapWebviewRef.current?.injectJavaScript(script);
            }
          }
        }
      }
    } catch (e) {
      // Handled silently
    } finally {
      isFetchingDirectionsRef.current = false;
    }
  }, [restLat, restLng, custLat, custLng, isRiderAccepted, riderLat, riderLng, riderStatus]);

  // Initial directions fetch on status change and background heartbeat (every 25 seconds)
  useEffect(() => {
    fetchOlaDirections(true);
    const interval = setInterval(() => fetchOlaDirections(false), 25000);
    return () => clearInterval(interval);
  }, [restLat, restLng, custLat, custLng, riderStatus, isRiderAccepted, fetchOlaDirections]);

  // Dynamic off-route detour detection: recalculates street directions when rider moves onto another street
  useEffect(() => {
    if (!isRiderAccepted || !riderLat || !riderLng || !restLat || !restLng || !custLat || !custLng || !OLA_MAPS_API_KEY) return;

    const now = Date.now();
    const currentCoords = roadRouteCoordsRef.current;

    // Check perpendicular distance from current rider GPS to the active road route
    let isOffRoute = false;
    if (currentCoords && currentCoords.length > 0) {
      let minDistSq = Infinity;
      const cosLat = Math.cos(riderLat * Math.PI / 180);
      for (let i = 0; i < currentCoords.length; i++) {
        const dLng = (currentCoords[i][0] - riderLng) * cosLat;
        const dLat = currentCoords[i][1] - riderLat;
        const dSq = dLng * dLng + dLat * dLat;
        if (dSq < minDistSq) minDistSq = dSq;
      }
      const distToRoadMeters = Math.sqrt(minDistSq) * 111320;
      // Rider has deviated onto another street (> 25 meters off the road corridor)
      if (distToRoadMeters >= 25) {
        isOffRoute = true;
      }
    }

    const lastPos = lastFetchedRiderPosRef.current;
    let movedFromLastFetch = Infinity;
    if (lastPos) {
      movedFromLastFetch = calculateDistanceKm(lastPos.lat, lastPos.lng, riderLat, riderLng) * 1000;
    }

    // Trigger recalculation if rider is off-route or moved >= 40 meters (throttled to at least 3 seconds)
    if ((isOffRoute || movedFromLastFetch >= 40) && now - lastFetchTimestampRef.current >= 3000) {
      fetchOlaDirections(true);
    }
  }, [riderLat, riderLng, isRiderAccepted, riderStatus, restLat, restLng, custLat, custLng, fetchOlaDirections]);

  // ── Dynamic Live ETA: Exact Restaurant Preparation Time + Delivery Transit Time ──
  const basePrepMins = Number(orderDetail?.prepTimeMinutes ?? orderDetail?.prep_time_minutes) > 0
    ? Number(orderDetail.prepTimeMinutes ?? orderDetail.prep_time_minutes)
    : ((currentRestaurant as any)?.prepTime || 15);
  const extraPrepMins = Number(orderDetail?.extendedPrepMinutes ?? orderDetail?.extended_prep_minutes) || 0;
  const totalKitchenPrepTime = basePrepMins + extraPrepMins;

  // 3. Road delivery transit time (Ola Maps driving directions if available, or road distance ~3 mins/km)
  const hasRealRestaurantCoords = Boolean(
    trackingData?.restaurantLat ||
    orderDetail?.restaurantLatitude ||
    orderDetail?.restaurant_latitude ||
    currentRestaurant?.latitude
  );
  const hasRealCustCoords = Boolean(
    trackingData?.customerLat ||
    orderDeliveryInfo.latitude ||
    orderDetail?.customerLatitude ||
    (savedAddresses.length > 0 && savedAddresses[0].latitude)
  );

  const distKm = (hasRealRestaurantCoords && hasRealCustCoords)
    ? calculateDistanceKm(restLat, restLng, custLat, custLng)
    : 0;

  const transitMins = olaTransitMins !== null && olaTransitMins > 0
    ? olaTransitMins
    : (distKm > 0
        ? Math.max(2, Math.ceil(distKm * 3))
        : (currentRestaurant?.deliveryTime ? Math.max(3, currentRestaurant.deliveryTime - basePrepMins) : 8)
      );

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

  // Exact Preparation Time + Delivery Time (Live Updating in Real-Time without initial flicker)
  const rawCalculatedEta = Math.max(1, activePrepMins + activeDeliveryMins);
  const explicitOrderEta = Number(orderDetail?.etaMinutes ?? orderDetail?.eta_minutes);
  const etaMinutes = (isCancelled || isOrderDelivered)
    ? 0
    : (!hasRealRestaurantCoords && explicitOrderEta > 0 && !isReady && !isPickedUp)
      ? explicitOrderEta
      : rawCalculatedEta;

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
        description: `Chef at ${restaurantName} is preparing your fresh meal. Finding a delivery partner nearby...`,
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
      } catch (e) { }

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
    if (!orderId) {
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
              const parsedInfo = parseOrderDeliveryInfo(row);
              const livePrepMins = Number(row.prep_time_minutes) > 0 ? Number(row.prep_time_minutes) : undefined;
              const liveExtPrepMins = row.extended_prep_minutes !== null && row.extended_prep_minutes !== undefined ? Number(row.extended_prep_minutes) : undefined;
              setOrderDetail((prev: any) => {
                const resolvedStatus = mergeKitchenStatus(prev?.status, row.status);
                const acceptedTime = row.acknowledged_at || (resolvedStatus === 'preparing' ? (row.updated_at || prev?.acceptedTime) : undefined) || prev?.acceptedTime;
                return {
                  ...prev,
                  ...row,
                  deliveryAddress: parsedInfo.address || row.deliveryAddress || prev?.deliveryAddress,
                  customerLatitude: parsedInfo.latitude || row.customerLatitude || prev?.customerLatitude,
                  customerLongitude: parsedInfo.longitude || row.customerLongitude || prev?.customerLongitude,
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
        } catch (e) { }
      }
      if (!activeToken) {
        try {
          const stored = await AsyncStorage.getItem('@auth_state');
          if (stored) {
            const parsed = JSON.parse(stored);
            if (parsed?.sessionToken) activeToken = parsed.sessionToken;
          }
        } catch (e) { }
      }
      if (!activeToken) {
        try {
          const secBackup = await AsyncStorage.getItem('@sec_myquro_auth_session_token');
          if (secBackup) activeToken = secBackup;
        } catch (e) { }
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

          const parsedInfo = parseOrderDeliveryInfo(data.order);
          setOrderDetail((prev: any) => {
            const resolvedStatus = mergeKitchenStatus(prev?.status, data.order.status);
            const acceptedTime = data.order.acknowledgedAt || data.order.acceptedTime || (resolvedStatus === 'preparing' ? (data.order.updatedAt || prev?.acceptedTime) : undefined) || prev?.acceptedTime;
            const items = (data.order.items && data.order.items.length > 0) ? data.order.items : (prev?.items && prev.items.length > 0 ? prev.items : []);
            return {
              ...prev,
              ...data.order,
              deliveryAddress: parsedInfo.address || data.order.deliveryAddress || prev?.deliveryAddress,
              customerLatitude: parsedInfo.latitude || data.order.customerLatitude || prev?.customerLatitude,
              customerLongitude: parsedInfo.longitude || data.order.customerLongitude || prev?.customerLongitude,
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
    if (!orderId) return;
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
    socket.on('reconnect', () => {
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

    // Real-time chat events: listen to both 'new-message' and 'chat-message' for seamless delivery updates
    const handleIncomingChatMessage = (message: any) => {
      if (!message || !message.text) return;
      setChatMessagesList((prev) => {
        if (prev.some((m) => (m.id && m.id === message.id) || (m.createdAt === message.createdAt && m.text === message.text))) {
          return prev;
        }
        return [...prev, message];
      });
      setTimeout(() => {
        chatScrollRef.current?.scrollToEnd({ animated: true });
      }, 80);
    };

    socket.on('new-message', handleIncomingChatMessage);
    socket.on('chat-message', handleIncomingChatMessage);

    return () => {
      socket.disconnect();
    };
  }, [orderId]);

  const fetchChatMessages = async () => {
    if (!orderId) return;
    try {
      let activeToken = sessionToken;
      if (!activeToken) {
        try {
          activeToken = (await SecureStorage.getSessionToken()) || '';
        } catch (e) {}
      }
      if (!activeToken) {
        try {
          const storedAuth = await AsyncStorage.getItem('@auth_state');
          if (storedAuth) {
            const parsed = JSON.parse(storedAuth);
            if (parsed?.sessionToken) activeToken = parsed.sessionToken;
          }
        } catch (e) {}
      }
      if (!activeToken) {
        activeToken = PUBLIC_FALLBACK_TRACKING_TOKEN;
      }

      const res = await fetch(`${BACKEND_URL}/api/chat/${orderId}/messages`, {
        headers: { ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {}) },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.messages) {
          setChatMessagesList(data.messages);
          setTimeout(() => {
            chatScrollRef.current?.scrollToEnd({ animated: false });
          }, 60);
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

    // Optimistically render message immediately in real time
    const tempMsgId = `temp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const optimisticMsg = {
      id: tempMsgId,
      orderId,
      sender: 'customer',
      text: textToSend,
      createdAt: new Date().toISOString(),
    };
    setChatMessagesList((prev) => [...prev, optimisticMsg]);
    setTimeout(() => {
      chatScrollRef.current?.scrollToEnd({ animated: true });
    }, 50);

    try {
      let activeToken = sessionToken;
      if (!activeToken) {
        try {
          activeToken = (await SecureStorage.getSessionToken()) || '';
        } catch (e) {}
      }
      if (!activeToken) {
        try {
          const storedAuth = await AsyncStorage.getItem('@auth_state');
          if (storedAuth) {
            const parsed = JSON.parse(storedAuth);
            if (parsed?.sessionToken) activeToken = parsed.sessionToken;
          }
        } catch (e) {}
      }
      if (!activeToken) {
        activeToken = PUBLIC_FALLBACK_TRACKING_TOKEN;
      }

      const res = await fetch(`${BACKEND_URL}/api/chat/${orderId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(activeToken ? { Authorization: `Bearer ${activeToken}` } : {})
        },
        body: JSON.stringify({
          text: textToSend,
          sender: 'customer',
        }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.message) {
          setChatMessagesList((prev) =>
            prev.map((m) => (m.id === tempMsgId ? data.message : m))
          );
        }
      } else {
        console.warn('Failed to send message to backend, status:', res.status);
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

  if (showSupportView) {
    return (
      <HelpSubView
        isDarkMode={true}
        initialOrder={{
          ...(orderDetail || {}),
          id: orderId,
          orderId,
          restaurantName,
          restaurantId: currentRestaurant?.id || (orderDetail as any)?.restaurantId,
          riderName: riderDisplayName || riderInfo?.name || riderInfo?.fullName,
          riderId: riderInfo?.id || (trackingData as any)?.riderId,
          riderPhone: riderInfo?.phone || (trackingData as any)?.riderPhone,
          items: orderItemsList,
        }}
        pastOrders={userOrders}
        customerProfile={{
          id: authState.type === 'Authenticated' ? (authState.userId || (authState as any).user?.id || (authState as any).id || '') : '',
          name: authState.type === 'Authenticated' ? (authState.username || (authState as any).user?.name || 'Customer') : 'Customer',
          phone: authState.type === 'Authenticated' ? ((authState as any).phone || (authState as any).user?.phone || '') : '',
          avatar: authState.type === 'Authenticated' ? ((authState as any).user?.image || '') : '',
        }}
        onBack={() => setShowSupportView(false)}
      />
    );
  }

  if (isDelivered) {
    return (
      <DeliveredOrderView
        orderId={orderId || undefined}
        restaurantName={restaurantName}
        riderName={riderDisplayName || riderInfo?.name || riderInfo?.fullName || 'Delivery Partner'}
        riderPhone={riderInfo?.phone}
        itemsCount={itemsCount}
        deliveredTime={trackingData?.updatedAt || orderDetail?.updatedAt}
        order={{
          ...(orderDetail || {}),
          id: orderId,
          orderId,
          restaurantName,
          restaurantId: currentRestaurant?.id || (orderDetail as any)?.restaurantId,
          riderName: riderDisplayName || riderInfo?.name || riderInfo?.fullName,
          riderId: riderInfo?.id || (trackingData as any)?.riderId,
          items: orderItemsList,
        }}
        items={orderItemsList}
        onBack={onBack}
        onRateDelivery={(rating) => {
          console.log('Rated delivery:', rating);
        }}
        onContactSupport={() => {
          const supportOptions: any[] = [
            { text: 'Open Order Help & Support', onPress: () => setShowSupportView(true) },
          ];
          if (riderInfo?.phone) {
            supportOptions.unshift({ text: `Call Delivery Partner (${riderInfo.name || 'Rider'})`, onPress: () => Linking.openURL(`tel:${riderInfo.phone}`) });
          }
          supportOptions.push({ text: 'Dismiss', style: 'cancel' });
          Alert.alert('Order Support', 'How would you like to connect regarding this order?', supportOptions);
        }}
        onExploreOffers={() => {
          Alert.alert('My Quro Pay', 'Explore exclusive 5% cashback offers on every order with My Quro Pay!');
        }}
      />
    );
  }

  const statusBarHeight = Platform.OS === 'android' ? (StatusBar.currentHeight || 28) : 0;
  const safeTopInset = Math.max(insets.top || 0, statusBarHeight);
  const topHeaderPadding = safeTopInset + (Platform.OS === 'android' ? 8 : 4) * SCALE;

  return (
    <View style={styles.root}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent={true} />

      {/* ════════════════════════════════════════════════════════════════════════
          [A] FULLSCREEN INTERACTIVE OLA MAP VIEW (BACKGROUND BASE LAYER)
          ════════════════════════════════════════════════════════════════════════ */}
      <View
        style={[styles.fullScreenMapOverlay, { zIndex: 1 }]}
        pointerEvents={isFullScreenMap ? 'auto' : 'none'}
      >
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {/* Live Interactive Fullscreen Ola Map */}
        <WebView
          ref={fullMapWebviewRef}
          source={fullMapSource}
          style={StyleSheet.absoluteFill}
          scrollEnabled={false}
          javaScriptEnabled
          domStorageEnabled
          originWhitelist={['*']}
          onLoadEnd={() => {
            if (roadRouteCoordsRef.current && roadRouteCoordsRef.current.length > 0) {
              const routeScript = `if (window.updateRouteCoords) { window.updateRouteCoords(${JSON.stringify(roadRouteCoordsRef.current)}); } true;`;
              fullMapWebviewRef.current?.injectJavaScript(routeScript);
            }
            if (trackingDataRef.current?.currentLat && trackingDataRef.current?.currentLng) {
              const lat = Number(trackingDataRef.current.currentLat);
              const lng = Number(trackingDataRef.current.currentLng);
              if (!isNaN(lat) && !isNaN(lng)) {
                const riderScript = `if (window.updateRiderPosition) { window.updateRiderPosition(${lng}, ${lat}); } true;`;
                fullMapWebviewRef.current?.injectJavaScript(riderScript);
              }
            }
          }}
        />

        {/* Top Floating Controls Bar */}
        <Animated.View
          style={[
            styles.fullScreenMapTopBar,
            {
              paddingTop: topHeaderPadding,
              transform: [{ translateY: topBarTranslateY }],
              opacity: topBarOpacity,
            },
          ]}
        >
          <TouchableOpacity
            style={styles.fullScreenMapBackBtn}
            activeOpacity={0.8}
            onPress={closeFullMap}
          >
            <ArrowLeft size={18 * SCALE} color="#FFFFFF" strokeWidth={2.4} />
          </TouchableOpacity>

          <View style={styles.fullScreenMapHeaderTitlePill}>
            <View style={styles.fullScreenMapLivePulsingDot} />
            <View style={{ flex: 1, marginRight: 4 }}>
              <Text style={styles.fullScreenMapHeaderTitle} numberOfLines={1}>
                {isRiderAccepted ? `${riderDisplayName || 'Partner'} on the way` : `${restaurantName} • Preparing`}
              </Text>
              <Text style={styles.fullScreenMapHeaderSub} numberOfLines={1}>
                Live Ola Map Tracking
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.fullScreenMapRecenterBtn}
            activeOpacity={0.8}
            onPress={() => {
              fullMapWebviewRef.current?.injectJavaScript(`
                if (window.recenterMap) {
                  window.recenterMap();
                }
                true;
              `);
            }}
          >
            <Navigation size={17 * SCALE} color="#F5B800" strokeWidth={2.2} />
          </TouchableOpacity>
        </Animated.View>

        {/* Bottom Docked Active Delivery Status Card */}
        <Animated.View
          style={[
            styles.fullScreenDockedCard,
            {
              paddingBottom: Math.max(insets.bottom + 8 * SCALE, 20 * SCALE),
              transform: [{ translateY: dockedCardTranslateY }],
              opacity: dockedCardOpacity,
            },
          ]}
          {...dockedCardPanResponder.panHandlers}
        >
          {/* Slide Up Drag Indicator Handle */}
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={closeFullMap}
            style={styles.dockedCardHeaderHandle}
          >
            <View style={styles.dockedHandleBar} />
            <View style={styles.dockedHintRow}>
              <ChevronUp size={14 * SCALE} color="#F5B800" strokeWidth={2.4} />
              <Text style={styles.dockedHintText}>Slide up for full details</Text>
              <ChevronUp size={14 * SCALE} color="#F5B800" strokeWidth={2.4} />
            </View>
          </TouchableOpacity>

          {/* Delivery Status Summary Row */}
          <View style={styles.dockedCardMainRow}>
            <View style={styles.dockedCardLeftInfo}>
              {/* Stage Badge */}
              <View style={styles.dockedBadgeRow}>
                <View style={styles.riderOnlineDot} />
                <Text style={styles.dockedBadgeText}>
                  {statusInfo.badge || (isRiderAccepted ? 'ON THE WAY' : 'PREPARING')}
                </Text>
              </View>

              {/* Title */}
              <Text style={styles.dockedCardTitle} numberOfLines={1}>
                {statusInfo.title}
              </Text>

              {/* Subtitle / Description */}
              <Text style={styles.dockedCardSub} numberOfLines={1}>
                {isRiderAccepted
                  ? `${riderDisplayName || 'Delivery Partner'} is rushing with your order`
                  : `Chef preparing fresh meal • ~${activePrepMins}m left`}
              </Text>
            </View>

            {/* Gold ETA Badge */}
            <View style={styles.dockedEtaBadge}>
              <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                <Defs>
                  <LinearGradient id="dockedEtaGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#F5BE38" />
                    <Stop offset="100%" stopColor="#DE9E22" />
                  </LinearGradient>
                </Defs>
                <Rect width="100%" height="100%" rx={16 * SCALE} fill="url(#dockedEtaGrad)" />
              </Svg>
              <Text style={styles.dockedEtaNum}>{etaMinutes}</Text>
              <Text style={styles.dockedEtaUnit}>mins</Text>
            </View>
          </View>

          {/* Bottom Actions Row */}
          <View style={styles.dockedCardActionsRow}>
            {isRiderAccepted ? (
              <>
                <TouchableOpacity
                  style={styles.dockedActionBtn}
                  activeOpacity={0.8}
                  onPress={handleCallRider}
                >
                  <Phone size={14 * SCALE} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.dockedActionBtnText}>Call</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.dockedActionBtn}
                  activeOpacity={0.8}
                  onPress={() => setShowChatModal(true)}
                >
                  <MessageSquare size={14 * SCALE} color="#FFFFFF" strokeWidth={2.2} />
                  <Text style={styles.dockedActionBtnText}>Chat</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.dockedActionBtn, styles.dockedDetailsBtn]}
                  activeOpacity={0.8}
                  onPress={closeFullMap}
                >
                  <Text style={styles.dockedDetailsBtnText}>Order Details</Text>
                  <ChevronRight size={14 * SCALE} color="#F5B800" />
                </TouchableOpacity>
              </>
            ) : (
              <>
                <View style={styles.dockedPrepPill}>
                  <ChefHat size={14 * SCALE} color="#F5B800" style={{ marginRight: 6 }} />
                  <Text style={styles.dockedPrepPillText} numberOfLines={1}>
                    Kitchen: <Text style={{ color: '#F5B800', fontWeight: '800' }}>{totalKitchenPrepTime}m</Text> (~{activePrepMins}m left)
                  </Text>
                </View>

                <TouchableOpacity
                  style={[styles.dockedActionBtn, styles.dockedDetailsBtn]}
                  activeOpacity={0.8}
                  onPress={closeFullMap}
                >
                  <Text style={styles.dockedDetailsBtnText}>Order Details</Text>
                  <ChevronRight size={14 * SCALE} color="#F5B800" />
                </TouchableOpacity>
              </>
            )}
          </View>
        </Animated.View>
      </View>

      {/* ════════════════════════════════════════════════════════════════════════
          [B] FULL DETAILS SHEET (FOREGROUND LAYER, SLIDES DOWN TO REVEAL MAP)
          ════════════════════════════════════════════════════════════════════════ */}
      <Animated.View
        style={[
          styles.detailsSheetContainer,
          {
            transform: [{ translateY: sheetAnim }],
            zIndex: 10,
          },
        ]}
        pointerEvents={isFullScreenMap ? 'none' : 'auto'}
      >
        {/* ════════════════════════════════════════════════════════════════════════
            [1] FLOATING TOP HEADER (OVERLAID AT TOP, ZERO PAGE SHIFT)
            ════════════════════════════════════════════════════════════════════════ */}
        <Animated.View style={[styles.headerBar, { paddingTop: topHeaderPadding, opacity: headerBarOpacity }]}>
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
        </Animated.View>

        <ScrollView
          ref={scrollViewRef}
          style={styles.mainScrollView}
          contentContainerStyle={[
            styles.mainScrollContent,
            { paddingBottom: Math.max(insets.bottom + 24 * SCALE, 36 * SCALE) },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
          }}
          scrollEventThrottle={16}
        >
          {/* ════════════════════════════════════════════════════════════════════════
            [2] HERO MEDIA AREA (FULL HEIGHT VIDEO WITH ACCENT GRADIENTS)
            ════════════════════════════════════════════════════════════════════════ */}
          <View
            style={[
              styles.heroMediaContainer,
              { height: Math.round(SCREEN_WIDTH * (912 / 576)) },
            ]}
          >
            {/* Delivery Scene with Full-Height Background Video */}
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
                height={Math.max(topHeaderPadding + 36 * SCALE, 84)}
                style={styles.heroTopFadeGradient}
                pointerEvents="none"
              >
                <Defs>
                  <LinearGradient id="heroTopGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                    <Stop offset="0%" stopColor="#000000" stopOpacity="0.48" />
                    <Stop offset="60%" stopColor="#000000" stopOpacity="0.16" />
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

            {/* Floating Media Action Controls (Top-Right of Hero) */}
            <View
              style={[
                styles.floatingMediaControls,
                { top: topHeaderPadding + 48 * SCALE },
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
            <Animated.View style={{ opacity: miniMapOpacity }}>
              <TouchableOpacity
                style={[styles.floatingMiniMapDiscContainer, isFullScreenMap && styles.floatingMiniMapDiscActive]}
                activeOpacity={0.88}
                onPress={openFullMap}
              >
                {/* Mini Map Canvas with Rounded Lens */}
                <View style={styles.miniMapLensWrapper}>
                  <WebView
                    ref={miniMapWebviewRef}
                    source={miniMapSource}
                    style={StyleSheet.absoluteFill}
                    scrollEnabled={false}
                    javaScriptEnabled
                    domStorageEnabled
                    pointerEvents="none"
                    originWhitelist={['*']}
                    onLoadEnd={() => {
                      if (roadRouteCoordsRef.current && roadRouteCoordsRef.current.length > 0) {
                        const routeScript = `if (window.updateRouteCoords) { window.updateRouteCoords(${JSON.stringify(roadRouteCoordsRef.current)}); } true;`;
                        miniMapWebviewRef.current?.injectJavaScript(routeScript);
                      }
                      if (trackingDataRef.current?.currentLat && trackingDataRef.current?.currentLng) {
                        const lat = Number(trackingDataRef.current.currentLat);
                        const lng = Number(trackingDataRef.current.currentLng);
                        if (!isNaN(lat) && !isNaN(lng)) {
                          const riderScript = `if (window.updateRiderPosition) { window.updateRiderPosition(${lng}, ${lat}); } true;`;
                          miniMapWebviewRef.current?.injectJavaScript(riderScript);
                        }
                      }
                    }}
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
                  <Text style={styles.miniMapPillText}>MAP</Text>
                </View>
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* ════════════════════════════════════════════════════════════════════════
            [3] OVERLAPPING ACTIVE DELIVERY STATUS CARD (FIGMA NODE 3046:159)
            ════════════════════════════════════════════════════════════════════════ */}
          <View style={styles.overlappingCardContainer}>
            <View
              style={styles.deliveryStatusCard}
              {...cardSlidePanResponder.panHandlers}
            >
              {/* Slide Down Drag Indicator Bar */}
              <TouchableOpacity
                activeOpacity={0.85}
                onPress={openFullMap}
                style={styles.cardDragIndicatorArea}
              >
                <View style={styles.cardDragHandlePill} />
                <View style={styles.cardDragHintRow}>
                  <ChevronDown size={13 * SCALE} color="#8A8A90" strokeWidth={2.4} />
                  <Text style={styles.cardDragHintText}>Slide down for full map</Text>
                  <ChevronDown size={13 * SCALE} color="#8A8A90" strokeWidth={2.4} />
                </View>
              </TouchableOpacity>
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
                        <PickupHandoverOtpBadge otp={orderDetail.handoverOtp} />
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
                        <PickupHandoverOtpBadge otp={orderDetail.handoverOtp} />
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
              [4] SAVINGS PILL BANNER (LUXURY OBSIDIAN & CHAMPAGNE GOLD CAPSULE)
              ══════════════════════════════════════════════════════════════════════ */}
            <View style={styles.savingsPillBanner}>
              {/* Ambient Gold Glass Glow Background */}
              <View style={StyleSheet.absoluteFill} pointerEvents="none">
                <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
                  <Defs>
                    <LinearGradient id="savingsBaseGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                      <Stop offset="0%" stopColor="#100E08" />
                      <Stop offset="50%" stopColor="#1C160B" />
                      <Stop offset="100%" stopColor="#100E08" />
                    </LinearGradient>
                    <RadialGradient id="savingsCenterGlow" cx="50%" cy="50%" r="55%" fx="50%" fy="50%">
                      <Stop offset="0%" stopColor="#DEA430" stopOpacity="0.22" />
                      <Stop offset="100%" stopColor="#100E08" stopOpacity="0" />
                    </RadialGradient>
                  </Defs>
                  <Rect width="100%" height="100%" fill="url(#savingsBaseGrad)" />
                  <Rect width="100%" height="100%" fill="url(#savingsCenterGlow)" />
                </Svg>
              </View>

              <View style={styles.savingsBannerLeftRow}>
                {/* Left Glowing Diamond Star in gold badge */}
                <View style={styles.savingsStarBadge}>
                  <Svg width={13 * SCALE} height={13 * SCALE} viewBox="0 0 24 24" fill="none">
                    <Path
                      d="M12 0L14.8 9.2L24 12L14.8 14.8L12 24L9.2 14.8L0 12L9.2 9.2L12 0Z"
                      fill="#F2CA50"
                    />
                  </Svg>
                </View>

                {/* Banner Text with Highlighted Savings */}
                <Text style={styles.savingsBannerText}>
                  Yay!{' '}
                  <Text style={styles.savingsAmountHighlight}>
                    {normalizePrice(orderDetail?.discount) > 0 ? `₹${normalizePrice(orderDetail.discount)} saved` : 'FREE delivery'}
                  </Text>
                  {' '}on this order
                </Text>
              </View>

              <View style={styles.savingsOneBadge}>
                <Text style={styles.savingsOneBadgeText}>MYQURO ONE</Text>
              </View>
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
      </Animated.View>

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
  // Upgraded Pickup Handover OTP Badge Styles (Ultra-compact, luxury security badge)
  pickupOtpContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#151209',
    borderWidth: 1,
    borderColor: 'rgba(245, 184, 0, 0.42)',
    borderRadius: 7 * SCALE,
    paddingHorizontal: 7 * SCALE,
    paddingVertical: 3.5 * SCALE,
    marginTop: 6 * SCALE,
    marginBottom: 3 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 2,
  },
  pickupOtpLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupOtpIconGlow: {
    width: 17 * SCALE,
    height: 17 * SCALE,
    borderRadius: 4 * SCALE,
    backgroundColor: 'rgba(245, 184, 0, 0.14)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5 * SCALE,
  },
  pickupOtpLabel: {
    color: '#F5B800',
    fontSize: 9.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    letterSpacing: 0.7,
  },
  pickupOtpDivider: {
    width: 1,
    height: 12 * SCALE,
    backgroundColor: 'rgba(245, 184, 0, 0.28)',
    marginHorizontal: 6.5 * SCALE,
  },
  pickupOtpDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pickupOtpDigitBox: {
    width: 14 * SCALE,
    height: 18 * SCALE,
    borderRadius: 3.5 * SCALE,
    backgroundColor: '#F5B800',
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 1.25 * SCALE,
    shadowColor: '#F5B800',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 1.5,
    elevation: 1.5,
  },
  pickupOtpDigitText: {
    fontSize: 11 * SCALE,
    fontFamily: 'Urbanist-ExtraBold',
    fontWeight: '900',
    color: '#050505',
    includeFontPadding: false,
    textAlign: 'center',
  },
  pickupOtpCopiedPill: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 18 * SCALE,
    paddingHorizontal: 6 * SCALE,
    backgroundColor: '#10B981',
    borderRadius: 3.5 * SCALE,
  },
  pickupOtpCopiedText: {
    fontSize: 9.5 * SCALE,
    fontFamily: 'Urbanist-Bold',
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
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
    backgroundColor: '#120F0A',
    borderRadius: 24 * SCALE,
    borderWidth: 1.2,
    borderColor: 'rgba(222, 164, 48, 0.32)',
    paddingVertical: 12 * SCALE,
    paddingHorizontal: 16 * SCALE,
    marginBottom: 12 * SCALE,
    position: 'relative',
    overflow: 'hidden',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#DEA430',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 4,
  },
  savingsBannerLeftRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9 * SCALE,
    flex: 1,
  },
  savingsStarBadge: {
    width: 24 * SCALE,
    height: 24 * SCALE,
    borderRadius: 12 * SCALE,
    backgroundColor: 'rgba(222, 164, 48, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  savingsBannerText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 13.5 * SCALE,
    color: '#E8E1D2',
    letterSpacing: 0.2,
  },
  savingsAmountHighlight: {
    fontFamily: 'Urbanist-ExtraBold',
    color: '#F2CA50',
    letterSpacing: 0.2,
  },
  savingsOneBadge: {
    backgroundColor: 'rgba(222, 164, 48, 0.14)',
    borderWidth: 1,
    borderColor: 'rgba(222, 164, 48, 0.3)',
    borderRadius: 6 * SCALE,
    paddingHorizontal: 7 * SCALE,
    paddingVertical: 3 * SCALE,
    marginLeft: 8 * SCALE,
  },
  savingsOneBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 9 * SCALE,
    color: '#F2CA50',
    letterSpacing: 0.6,
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

  // ── Details Sheet Container (Slides down to reveal map) ─────────
  detailsSheetContainer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -8 },
    shadowOpacity: 0.75,
    shadowRadius: 16,
    elevation: 20,
  },

  // ── Fullscreen Interactive Ola Map ──────────────────────────────
  fullScreenMapOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: '#000000',
  },
  fullScreenMapTopBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16 * SCALE,
    paddingBottom: 12 * SCALE,
    zIndex: 1000,
  },
  fullScreenMapBackBtn: {
    width: 42 * SCALE,
    height: 42 * SCALE,
    borderRadius: 21 * SCALE,
    backgroundColor: 'rgba(15, 15, 18, 0.90)',
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  fullScreenMapHeaderTitlePill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 15, 18, 0.92)',
    borderWidth: 1.2,
    borderColor: 'rgba(245, 184, 0, 0.35)',
    borderRadius: 24 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 7 * SCALE,
    marginHorizontal: 10 * SCALE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  fullScreenMapLivePulsingDot: {
    width: 8 * SCALE,
    height: 8 * SCALE,
    borderRadius: 4 * SCALE,
    backgroundColor: '#10B981',
    marginRight: 8 * SCALE,
  },
  fullScreenMapHeaderTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 13.5 * SCALE,
    color: '#FFFFFF',
  },
  fullScreenMapHeaderSub: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 11 * SCALE,
    color: '#F5B800',
    marginTop: 1,
  },
  fullScreenMapRecenterBtn: {
    width: 42 * SCALE,
    height: 42 * SCALE,
    borderRadius: 21 * SCALE,
    backgroundColor: 'rgba(15, 15, 18, 0.90)',
    borderWidth: 1.2,
    borderColor: 'rgba(245, 184, 0, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },

  // ── Fullscreen Docked Card at Bottom ─────────────────────────────
  fullScreenDockedCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#070707',
    borderTopLeftRadius: 28 * SCALE,
    borderTopRightRadius: 28 * SCALE,
    borderTopWidth: 1.5,
    borderLeftWidth: 1.2,
    borderRightWidth: 1.2,
    borderColor: '#2E2E2A',
    paddingHorizontal: 18 * SCALE,
    paddingTop: 8 * SCALE,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: -6 },
    shadowOpacity: 0.85,
    shadowRadius: 14,
    elevation: 16,
    zIndex: 1000,
  },
  dockedCardHeaderHandle: {
    alignItems: 'center',
    paddingVertical: 4 * SCALE,
    marginBottom: 6 * SCALE,
  },
  dockedHandleBar: {
    width: 42 * SCALE,
    height: 4.5 * SCALE,
    borderRadius: 2.5 * SCALE,
    backgroundColor: '#4B4B48',
    marginBottom: 4 * SCALE,
  },
  dockedHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  dockedHintText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 11.5 * SCALE,
    color: '#F5B800',
    letterSpacing: 0.2,
  },
  dockedCardMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12 * SCALE,
  },
  dockedCardLeftInfo: {
    flex: 1,
    paddingRight: 12 * SCALE,
  },
  dockedBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
    marginBottom: 3 * SCALE,
  },
  dockedBadgeText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11 * SCALE,
    color: '#F5B800',
    letterSpacing: 0.5,
  },
  dockedCardTitle: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 18 * SCALE,
    color: '#FFFFFF',
    letterSpacing: -0.3,
  },
  dockedCardSub: {
    fontFamily: 'Urbanist-Regular',
    fontSize: 12.5 * SCALE,
    color: '#A0A0A5',
    marginTop: 2 * SCALE,
  },
  dockedEtaBadge: {
    width: 66 * SCALE,
    height: 66 * SCALE,
    borderRadius: 18 * SCALE,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#F5B800',
    overflow: 'hidden',
  },
  dockedEtaNum: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 27 * SCALE,
    color: '#000000',
    lineHeight: 29 * SCALE,
  },
  dockedEtaUnit: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 11.5 * SCALE,
    color: '#1A1810',
    marginTop: -2,
  },
  dockedCardActionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8 * SCALE,
    paddingTop: 8 * SCALE,
    borderTopWidth: 1,
    borderTopColor: '#1A1A18',
  },
  dockedActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6 * SCALE,
    backgroundColor: '#1E1E24',
    borderWidth: 1,
    borderColor: '#33333A',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 14 * SCALE,
    paddingVertical: 9 * SCALE,
  },
  dockedActionBtnText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 12.5 * SCALE,
    color: '#FFFFFF',
  },
  dockedDetailsBtn: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: '#16140C',
    borderColor: 'rgba(245, 184, 0, 0.35)',
  },
  dockedDetailsBtnText: {
    fontFamily: 'Urbanist-Bold',
    fontSize: 12.5 * SCALE,
    color: '#F5B800',
  },
  dockedPrepPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#16140C',
    borderWidth: 1,
    borderColor: 'rgba(245, 184, 0, 0.35)',
    borderRadius: 14 * SCALE,
    paddingHorizontal: 12 * SCALE,
    paddingVertical: 9 * SCALE,
  },
  dockedPrepPillText: {
    fontFamily: 'Urbanist-Medium',
    fontSize: 12 * SCALE,
    color: '#E0E0E0',
  },

  // ── Drag Handle on Active Delivery Status Card (Normal View) ────
  cardDragIndicatorArea: {
    alignItems: 'center',
    paddingBottom: 6 * SCALE,
    marginBottom: 4 * SCALE,
  },
  cardDragHandlePill: {
    width: 40 * SCALE,
    height: 4 * SCALE,
    borderRadius: 2 * SCALE,
    backgroundColor: '#3E3E3A',
    marginBottom: 3 * SCALE,
  },
  cardDragHintRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4 * SCALE,
  },
  cardDragHintText: {
    fontFamily: 'Urbanist-SemiBold',
    fontSize: 11 * SCALE,
    color: '#8A8A90',
    letterSpacing: 0.2,
  },
});
