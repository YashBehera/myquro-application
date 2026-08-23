import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { Redirect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function Index() {
  const [destination, setDestination] = useState<'loading' | '/onboarding' | '/(tabs)'>('loading');

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const stored = await AsyncStorage.getItem('@rider_auth');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed?.token) {
            setDestination('/(tabs)');
            return;
          }
        }
      } catch (e) {
        // ignore
      }
      setDestination('/onboarding');
    };
    checkAuth();
  }, []);

  if (destination === 'loading') {
    return (
      <View style={{ flex: 1, backgroundColor: '#0E0C0A', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color="#F2CA50" />
      </View>
    );
  }

  return <Redirect href={destination as any} />;
}
