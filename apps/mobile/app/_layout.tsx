import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <StatusBar style="dark" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#FFFCF5' },
          headerTintColor: '#1A1A1A',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#FEFEFE' },
        }}
      >
        <Stack.Screen
          name="(tabs)"
          options={{ headerShown: false }}
        />
      </Stack>
    </>
  );
}
