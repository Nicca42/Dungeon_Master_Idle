import React, { useEffect } from 'react';
import { Slot } from 'expo-router';
import Head from 'expo-router/head';
import { StatusBar } from 'expo-status-bar';
import { AppState, Platform, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import {
  useFonts,
  PixelifySans_500Medium,
  PixelifySans_700Bold,
} from '@expo-google-fonts/pixelify-sans';
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { initialize, tickNow, useGame, setForeground } from '../src/game/store';
import { SYNC_INTERVAL_MS } from '../src/game/timing';
import { colors } from '../src/theme';

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PixelifySans_500Medium,
    PixelifySans_700Bold,
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
  });
  useEffect(() => {
    void initialize();
    void setForeground(
      Platform.OS === 'web'
        ? document.visibilityState === 'visible'
        : AppState.currentState === 'active',
    );
    const interval = setInterval(() => {
      void tickNow();
    }, SYNC_INTERVAL_MS);
    const welcome = () => useGame.setState({ welcomeUntil: Date.now() + 5000 });
    const visibility = () => {
      if (document.visibilityState === 'visible') welcome();
      void setForeground(document.visibilityState === 'visible');
    };
    if (Platform.OS === 'web') document.addEventListener('visibilitychange', visibility);
    const listener = AppState.addEventListener('change', (state) => {
      if (Platform.OS !== 'web') {
        if (state === 'active') welcome();
        void setForeground(state === 'active');
      }
    });
    return () => {
      clearInterval(interval);
      listener.remove();
      if (Platform.OS === 'web') document.removeEventListener('visibilitychange', visibility);
    };
  }, []);
  if (!fontsLoaded && !fontError) return <View style={{ flex: 1, backgroundColor: colors.bg }} />;
  return (
    <SafeAreaProvider>
      <Head>
        <title>Underkeep — Fortune favors the depths</title>
      </Head>
      <SafeAreaView
        edges={Platform.OS === 'web' ? [] : ['top', 'left', 'right']}
        style={{ flex: 1, backgroundColor: colors.bg }}
      >
        <StatusBar style="light" />
        <Slot />
      </SafeAreaView>
    </SafeAreaProvider>
  );
}
