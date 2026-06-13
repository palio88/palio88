import { Tabs } from 'expo-router';
import { View, Text } from 'react-native';
import { colors } from '@/constants/tokens';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <Text
      style={{
        fontSize: 11,
        fontFamily: 'SpaceGrotesk_400Regular',
        color: focused ? colors.teal : colors.muted,
        marginTop: 2,
      }}
    >
      {label}
    </Text>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bg },
        headerTintColor: colors.hl,
        headerTitleStyle: { fontFamily: 'SpaceGrotesk_600SemiBold', fontSize: 16 },
        tabBarStyle: {
          backgroundColor: colors.bg,
          borderTopColor: colors.border,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: colors.teal,
        tabBarInactiveTintColor: colors.muted,
        tabBarLabelStyle: { fontFamily: 'SpaceGrotesk_400Regular', fontSize: 10 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Browse',
          tabBarLabel: 'Browse',
        }}
      />
      <Tabs.Screen
        name="designs"
        options={{
          title: 'My Designs',
          tabBarLabel: 'Designs',
        }}
      />
      <Tabs.Screen
        name="account"
        options={{
          title: 'Account',
          tabBarLabel: 'Account',
        }}
      />
    </Tabs>
  );
}
