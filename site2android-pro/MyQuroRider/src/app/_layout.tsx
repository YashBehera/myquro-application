import React, { useEffect } from 'react';
import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { RiderProvider } from '@/context/RiderContext';
import { IncomingRequestModal } from '@/components/IncomingRequestModal';
import { BACKEND_URL } from '@/config';
import { initBackendKeepAlive } from '@/utils/backendKeepAlive';
import {
  useFonts,
  Urbanist_400Regular,
  Urbanist_500Medium,
  Urbanist_600SemiBold,
  Urbanist_700Bold,
} from '@expo-google-fonts/urbanist';

export default function RootLayout() {
  useEffect(() => {
    const cleanup = initBackendKeepAlive(BACKEND_URL);
    return cleanup;
  }, []);

  const colorScheme = useColorScheme();

  const [fontsLoaded] = useFonts({
    Urbanist: Urbanist_400Regular,
    'Urbanist-Regular': Urbanist_400Regular,
    'Urbanist-Medium': Urbanist_500Medium,
    'Urbanist-SemiBold': Urbanist_600SemiBold,
    'Urbanist-Bold': Urbanist_700Bold,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <RiderProvider>
        <ThemeProvider value={DarkTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" options={{ headerShown: false }} />
            <Stack.Screen name="onboarding" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
          <IncomingRequestModal />
        </ThemeProvider>
      </RiderProvider>
    </SafeAreaProvider>
  );
}
