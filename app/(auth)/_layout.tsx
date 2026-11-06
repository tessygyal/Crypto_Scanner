import { Stack } from 'expo-router';

export const unstable_settings = {
  // Login is the first screen of the auth stack, so "back" from register or
  // forgot-password always returns to it.
  anchor: 'login',
};

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerBackButtonDisplayMode: 'minimal' }}>
      <Stack.Screen name="login" options={{ headerShown: false, title: 'Sign in' }} />
      <Stack.Screen name="register" options={{ title: 'Create account' }} />
      <Stack.Screen name="forgot-password" options={{ title: 'Reset password' }} />
    </Stack>
  );
}
