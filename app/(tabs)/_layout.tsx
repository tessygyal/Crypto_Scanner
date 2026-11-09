import Ionicons from '@expo/vector-icons/Ionicons';
import { Tabs } from 'expo-router';
import type { ComponentProps } from 'react';
import { Text, View, type ColorValue } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { cn } from '@/utils/cn';

type IconName = ComponentProps<typeof Ionicons>['name'];

/** Tab icon with a lavender pill behind it when the tab is active. */
function tabIcon(name: IconName, activeName: IconName) {
  function TabIcon({ color, focused }: { color: ColorValue; focused: boolean }) {
    return (
      <View className={cn('h-8 w-14 items-center justify-center rounded-pill', focused && 'bg-surface')}>
        {/* The tab bar passes our theme tint strings; other ColorValue forms fall back to the default. */}
        <Ionicons name={focused ? activeName : name} color={typeof color === 'string' ? color : undefined} size={22} />
      </View>
    );
  }
  return TabIcon;
}

/** Label that turns bold on the active tab, so it isn't shown by colour alone. */
function TabLabel({ focused, color, children }: { focused: boolean; color: ColorValue; children: string }) {
  return (
    <Text style={{ color, fontSize: 11, lineHeight: 14, fontWeight: focused ? '800' : '600', marginTop: 2 }}>
      {children}
    </Text>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        // Room for the icon pill and the label without clipping letters like "p" and "y".
        tabBarStyle: {
          backgroundColor: theme.background,
          borderTopColor: theme.border,
          height: 66 + insets.bottom,
          paddingTop: 6,
        },
        tabBarLabel: TabLabel,
      }}>
      <Tabs.Screen
        name="check"
        options={{ title: 'Check', tabBarIcon: tabIcon('shield-checkmark-outline', 'shield-checkmark') }}
      />
      <Tabs.Screen name="reports" options={{ title: 'Reports', tabBarIcon: tabIcon('megaphone-outline', 'megaphone') }} />
      <Tabs.Screen name="map" options={{ title: 'Map', tabBarIcon: tabIcon('map-outline', 'map') }} />
      <Tabs.Screen name="history" options={{ title: 'History', tabBarIcon: tabIcon('time-outline', 'time') }} />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profile', tabBarIcon: tabIcon('person-circle-outline', 'person-circle') }}
      />
    </Tabs>
  );
}
