import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { FIREBASE_CONFIG } from '../config';

// Check if real Firebase config is provided
export const isFirebaseConfigured = (): boolean => {
  return (
    Boolean(FIREBASE_CONFIG.apiKey) &&
    !FIREBASE_CONFIG.apiKey.startsWith('AIzaSy...') &&
    Boolean(FIREBASE_CONFIG.projectId)
  );
};

// Initialize Firebase App
export const getFirebaseApp = () => {
  if (!isFirebaseConfigured()) {
    return null;
  }
  if (!getApps().length) {
    return initializeApp(FIREBASE_CONFIG);
  }
  return getApp();
};

export const getFirebaseAuth = () => {
  const app = getFirebaseApp();
  if (!app) return null;
  return getAuth(app);
};

/**
 * Sends a real-time OTP via Firebase Identity Toolkit REST API
 */
export const sendFirebasePhoneOtp = async (phoneNumber: string, recaptchaToken?: string): Promise<{ sessionInfo: string }> => {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase Authentication is not configured.");
  }

  const cleanPhone = phoneNumber.startsWith('+') ? phoneNumber : `+91${phoneNumber.replace(/[^0-9]/g, '').slice(-10)}`;

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:sendVerificationCode?key=${FIREBASE_CONFIG.apiKey}`;
    const payload: any = {
      phoneNumber: cleanPhone,
    };
    if (recaptchaToken) {
      payload.recaptchaToken = recaptchaToken;
    }

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || 'Failed to send Firebase SMS verification code';
      console.warn("⚠️ [FirebaseAuth] sendVerificationCode error:", errorMsg);
      throw new Error(errorMsg);
    }

    return { sessionInfo: data.sessionInfo };
  } catch (error: any) {
    console.error("❌ [FirebaseAuth] Error in sendFirebasePhoneOtp:", error);
    throw error;
  }
};

/**
 * Verifies the SMS code with Firebase and retrieves the ID token
 */
export const verifyFirebasePhoneOtp = async (sessionInfo: string, code: string): Promise<{ idToken: string }> => {
  if (!isFirebaseConfigured()) {
    throw new Error("Firebase Authentication is not configured.");
  }

  try {
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPhoneNumber?key=${FIREBASE_CONFIG.apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        sessionInfo,
        code,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const errorMsg = data?.error?.message || 'Invalid or expired verification code';
      console.warn("⚠️ [FirebaseAuth] signInWithPhoneNumber error:", errorMsg);
      throw new Error(errorMsg);
    }

    return { idToken: data.idToken };
  } catch (error: any) {
    console.error("❌ [FirebaseAuth] Error in verifyFirebasePhoneOtp:", error);
    throw error;
  }
};
