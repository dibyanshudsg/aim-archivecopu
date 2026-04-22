import { View, Text, ScrollView } from 'react-native';

export default function HomeScreen() {
  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: '#FEFEFE' }}
      contentContainerStyle={{ padding: 24 }}
    >
      <Text style={{ fontSize: 28, fontWeight: '700', color: '#1A1A1A' }}>
        The Living Archive
      </Text>
      <Text style={{ fontSize: 16, color: '#6B7280', marginTop: 8, lineHeight: 24 }}>
        Decades of spiritual wisdom from Sri Aurobindo and The Mother, preserved and accessible to
        all.
      </Text>

      {/* Placeholder for latest issues */}
      <View style={{ marginTop: 32 }}>
        <Text style={{ fontSize: 18, fontWeight: '600', color: '#1A1A1A' }}>Latest Issues</Text>
        <View
          style={{
            marginTop: 16,
            padding: 24,
            borderRadius: 16,
            backgroundColor: '#FEFDF5',
            borderWidth: 1,
            borderColor: '#FAF0C4',
            alignItems: 'center',
          }}
        >
          <Text style={{ color: '#9E6D24' }}>Issues will appear here</Text>
        </View>
      </View>
    </ScrollView>
  );
}
