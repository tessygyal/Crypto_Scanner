import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { AuthProvider, useAuth } from '@/context/auth-provider';
import { QueryProvider } from '@/context/query-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';

// Keep the splash screen up until we know whether the user is signed in,
// so the login screen never flashes for a signed-in user.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    // AuthProvider is outside QueryProvider: the query cache is per signed-in user.
    <AuthProvider>
      <QueryProvider>
        <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
          <RootNavigator />
          <StatusBar style="auto" />
        </ThemeProvider>
      </QueryProvider>
    </AuthProvider>
  );
}

function RootNavigator() {
  const { session, isLoading } = useAuth();
  const isSignedIn = !!session;

  useEffect(() => {
    if (!isLoading) SplashScreen.hideAsync();
  }, [isLoading]);

  if (isLoading) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      {/* Protected routes: signed-in users only see the app; signed-out users only
          see the auth screens. Changing the session redirects automatically.
          redirectTo names a real screen (a bare group like "/(auth)" has no page). */}
      <Stack.Protected guard={isSignedIn} redirectTo="/login">
        <Stack.Screen name="(tabs)" />
        <Stack.Screen
          name="check-result"
          options={{ headerShown: true, title: 'Check result', headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="history/[id]"
          options={{ headerShown: true, title: 'Saved check', headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="report/new"
          options={{ headerShown: true, title: 'Report a scheme', headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="report/[id]/index"
          options={{ headerShown: true, title: 'Report', headerBackButtonDisplayMode: 'minimal' }}
        />
        <Stack.Screen
          name="report/[id]/edit"
          options={{ headerShown: true, title: 'Edit report', headerBackButtonDisplayMode: 'minimal' }}
        />
      </Stack.Protected>
      <Stack.Protected guard={!isSignedIn} redirectTo="/check">
        <Stack.Screen name="(auth)" />
      </Stack.Protected>
    </Stack>
  );
}
