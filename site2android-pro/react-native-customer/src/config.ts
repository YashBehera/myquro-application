import { Platform } from 'react-native';

// Production backend server
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://myquro-backend.onrender.com';

// Ola Maps API Key for Geocoding & Autocomplete (Injected via Environment Variable or Backend Proxy)
export const OLA_MAPS_API_KEY = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY || '';
