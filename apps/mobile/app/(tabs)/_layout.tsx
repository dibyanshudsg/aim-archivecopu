import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#D4A843',
        tabBarInactiveTintColor: '#9CA3AF',
        tabBarStyle: {
          backgroundColor: '#FEFEFE',
          borderTopColor: '#F5E29A',
        },
        headerStyle: { backgroundColor: '#FFFCF5' },
        headerTintColor: '#1A1A1A',
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          headerTitle: 'AIM Archive',
        }}
      />
      <Tabs.Screen
        name="browse"
        options={{
          title: 'Browse',
          headerTitle: 'Browse Archive',
        }}
      />
      <Tabs.Screen
        name="search"
        options={{
          title: 'Search',
          headerTitle: 'Search',
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: 'Library',
          headerTitle: 'My Library',
        }}
      />
    </Tabs>
  );
}
