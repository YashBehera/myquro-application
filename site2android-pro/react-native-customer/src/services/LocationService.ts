import * as Location from 'expo-location';
import { OLA_MAPS_API_KEY } from '../config';

export interface AutocompleteSuggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
  lat?: number;
  lng?: number;
}

/**
 * Fetch autocomplete suggestions as the user types (Using Ola Maps API)
 */
export const fetchPlaceSuggestions = async (input: string): Promise<AutocompleteSuggestion[]> => {
  if (!input || input.trim().length < 2) return [];
  
  if (!OLA_MAPS_API_KEY || (OLA_MAPS_API_KEY as string) === 'YOUR_OLA_MAPS_API_KEY') {
    throw new Error("Ola Maps API Key is missing.");
  }
  
  const url = `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(input)}&api_key=${OLA_MAPS_API_KEY}`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Request-Id': `auto-${Date.now()}`
      }
    });
    const data = await res.json();
    if (Array.isArray(data.predictions)) {
      return data.predictions.map((p: any) => ({
        placeId: p.place_id || p.reference || String(Math.random()),
        description: p.description || '',
        mainText: p.structured_formatting?.main_text || p.description || '',
        secondaryText: p.structured_formatting?.secondary_text || '',
        lat: p.geometry?.location?.lat,
        lng: p.geometry?.location?.lng,
      }));
    } else {
      console.log("Ola Maps Autocomplete API response:", data);
      return [];
    }
  } catch (error) {
    console.error("Autocomplete fetch failed:", error);
    return [];
  }
};

/**
 * Resolve exact coordinates (lat/lng) from Ola Place ID (Using Ola Maps API)
 */
export const getCoordsFromPlaceId = async (placeId: string): Promise<{ lat: number; lng: number } | null> => {
  if (!OLA_MAPS_API_KEY || (OLA_MAPS_API_KEY as string) === 'YOUR_OLA_MAPS_API_KEY') {
    throw new Error("Ola Maps API Key is missing.");
  }

  const url = `https://api.olamaps.io/places/v1/details?place_id=${placeId}&api_key=${OLA_MAPS_API_KEY}`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Request-Id': `details-${Date.now()}`
      }
    });
    const data = await res.json();
    if (data.status?.toLowerCase() === 'ok' && data.result?.geometry?.location) {
      const { lat, lng } = data.result.geometry.location;
      return { lat, lng };
    }
  } catch (error) {
    console.error("Place details fetch failed:", error);
  }
  return null;
};

/**
 * Reverse Geocode: Convert coordinates to readable neighborhood/city names and formatted address (Using Ola Maps API)
 */
export const reverseGeocode = async (lat: number, lng: number): Promise<{ label: string; address: string } | null> => {
  if (!OLA_MAPS_API_KEY || (OLA_MAPS_API_KEY as string) === 'YOUR_OLA_MAPS_API_KEY') {
    throw new Error("Ola Maps API Key is missing.");
  }

  const url = `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`;
  try {
    const res = await fetch(url, {
      headers: {
        'X-Request-Id': `rev-${Date.now()}`
      }
    });
    const data = await res.json();
    const status = data.status?.toLowerCase();
    const results = data.results || data.geocodingResults;
    if ((status === 'ok' || status === 'success') && Array.isArray(results) && results.length > 0) {
      const result = results[0];
      const addressComponents = result.address_components || [];
      const sublocality = addressComponents.find((c: any) => c.types?.includes("sublocality") || c.types?.includes("neighborhood"));
      const locality = addressComponents.find((c: any) => c.types?.includes("locality"));
      
      const label = result.name || (sublocality ? sublocality.long_name : (locality ? locality.long_name : "Current Location"));
      const address = result.formatted_address || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      return { label, address };
    }
  } catch (error) {
    console.error("Ola Maps reverse geocoding failed:", error);
  }
  return null;
};

/**
 * Detect user's current GPS location and reverse-geocode using Ola Maps
 */
export const detectCurrentLocationWithOla = async (): Promise<{
  label: string;
  address: string;
  latitude: number;
  longitude: number;
}> => {
  let latitude = 20.2520;
  let longitude = 85.7820;

  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      let loc: Location.LocationObject | null = null;
      try {
        loc = await Location.getLastKnownPositionAsync({});
      } catch (e) {
        console.warn('getLastKnownPositionAsync error:', e);
      }

      if (!loc) {
        try {
          const gpsPromise = Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const timeoutPromise = new Promise<null>((resolve) =>
            setTimeout(() => resolve(null), 3500)
          );
          loc = await Promise.race([gpsPromise, timeoutPromise]);
        } catch (e) {
          console.warn('getCurrentPositionAsync error:', e);
        }
      }

      if (loc?.coords) {
        latitude = loc.coords.latitude;
        longitude = loc.coords.longitude;
      }
    }
  } catch (err) {
    console.warn('Error fetching GPS hardware position:', err);
  }

  // If outside India (e.g. simulator default in US), default to Bhubaneswar center
  const isOutsideIndia = latitude < 6.0 || latitude > 38.0 || longitude < 68.0 || longitude > 98.0;
  if (isOutsideIndia) {
    latitude = 20.2520;
    longitude = 85.7820;
  }

  // Reverse geocode via Ola Maps
  try {
    const olaInfo = await reverseGeocode(latitude, longitude);
    if (olaInfo && olaInfo.label && olaInfo.address) {
      return {
        label: olaInfo.label,
        address: olaInfo.address,
        latitude,
        longitude,
      };
    }
  } catch (err) {
    console.warn('Ola reverseGeocode error in detectCurrentLocationWithOla:', err);
  }

  // Fallback reverse geocode via expo-location if network endpoint is unreachable
  try {
    const [expoGeo] = await Location.reverseGeocodeAsync({ latitude, longitude });
    if (expoGeo) {
      const label = expoGeo.name || expoGeo.subregion || expoGeo.street || 'Current Location';
      const address = `${expoGeo.name ? expoGeo.name + ', ' : ''}${expoGeo.street ? expoGeo.street + ', ' : ''}${expoGeo.subregion || expoGeo.city || 'Bhubaneswar'}, ${expoGeo.region || 'Odisha'} ${expoGeo.postalCode || ''}`.trim();
      return {
        label,
        address: address || `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`,
        latitude,
        longitude,
      };
    }
  } catch (err) {
    console.warn('Expo reverseGeocodeAsync error in detectCurrentLocationWithOla:', err);
  }

  return {
    label: 'Current Location',
    address: 'Near Infocity Avenue, Patia, Bhubaneswar, Odisha 751024',
    latitude,
    longitude,
  };
};
