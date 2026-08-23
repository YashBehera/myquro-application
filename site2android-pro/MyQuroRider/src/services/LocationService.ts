import { OLA_MAPS_API_KEY } from '../config';

const OLA_BASE = 'https://api.olamaps.io';

export interface AutocompleteSuggestion {
  placeId: string;
  description: string;
}

/**
 * Fetch place autocomplete suggestions from Ola Maps API.
 */
export async function fetchPlaceSuggestions(input: string): Promise<AutocompleteSuggestion[]> {
  if (!input || input.trim().length < 2) return [];
  try {
    const url = `${OLA_BASE}/places/v1/autocomplete?input=${encodeURIComponent(input)}&api_key=${OLA_MAPS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const json = await res.json();
    const predictions: any[] = json.predictions ?? [];
    return predictions.map((p: any) => ({
      placeId: p.place_id ?? '',
      description: p.description ?? p.structured_formatting?.main_text ?? '',
    }));
  } catch (e) {
    console.error('[LocationService] fetchPlaceSuggestions error:', e);
    return [];
  }
}

/**
 * Get lat/lng coordinates from an Ola Maps place_id.
 */
export async function getCoordsFromPlaceId(placeId: string): Promise<{ lat: number; lng: number } | null> {
  if (!placeId) return null;
  try {
    const url = `${OLA_BASE}/places/v1/details?place_id=${encodeURIComponent(placeId)}&api_key=${OLA_MAPS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();
    const loc = json.result?.geometry?.location;
    if (!loc) return null;
    return { lat: loc.lat, lng: loc.lng };
  } catch (e) {
    console.error('[LocationService] getCoordsFromPlaceId error:', e);
    return null;
  }
}

export interface ReverseGeocodeResult {
  address: string;
  street: string;
  city: string;
  state: string;
  pincode: string;
}

/**
 * Reverse geocode lat/lng to a human-readable address using Ola Maps API.
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult | null> {
  try {
    const url = `${OLA_BASE}/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const json = await res.json();

    const results: any[] = json.results ?? [];
    if (results.length === 0) return null;

    const top = results[0];
    const fullAddress: string = top.formatted_address ?? '';
    const components: any[] = top.address_components ?? [];

    const get = (types: string[]) =>
      components.find((c: any) => types.some((t) => c.types?.includes(t)))?.long_name ?? '';

    const street =
      get(['route', 'street_address']) ||
      get(['sublocality_level_1', 'sublocality']) ||
      '';
    const city =
      get(['locality']) ||
      get(['administrative_area_level_2']) ||
      '';
    const state = get(['administrative_area_level_1']);
    const pincode = get(['postal_code']);

    return {
      address: fullAddress,
      street,
      city,
      state,
      pincode,
    };
  } catch (e) {
    console.error('[LocationService] reverseGeocode error:', e);
    return null;
  }
}
