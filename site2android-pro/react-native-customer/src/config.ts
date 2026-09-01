import { Platform } from 'react-native';

// Production backend server
export const BACKEND_URL = process.env.EXPO_PUBLIC_BACKEND_URL || 'https://myquro-backend.onrender.com';

// Ola Maps API Key for Geocoding & Autocomplete (Injected via Environment Variable or Backend Proxy)
export const OLA_MAPS_API_KEY = process.env.EXPO_PUBLIC_OLA_MAPS_API_KEY || 'gT2nLyGoqOPTHq8wZxw3JyGg7ah81MQbCdEPyx6S';

export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyBKoWNZCHtJpatnvOWQJ9iKc95ge0149BM",
  authDomain: "myquro.firebaseapp.com",
  projectId: "myquro-89e0b",
  storageBucket: "myquro-89e0b.firebasestorage.app",
  messagingSenderId: "...",
  appId: "...",
};
