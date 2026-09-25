import { Tabs } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { colors, minTouchTarget, tabBarBaseHeight } from "@/src/theme";

const TabIcon = ({ label, focused }: { label: string; focused: boolean }) => (
  <View style={{ alignItems: "center", justifyContent: "center", width: 30, height: 30 }}>
    <Text style={{ fontSize: 22, color: focused ? colors.brandPrimary : colors.muted }}>{label}</Text>
  </View>
);

const AITabIcon = ({ focused }: { focused: boolean }) => (
  <View
    style={{
      width: 52,
      height: 52,
      borderRadius: 26,
      backgroundColor: focused ? colors.brandSecondary : colors.brandPrimary,
      alignItems: "center",
      justifyContent: "center",
      marginTop: -18,
      shadowColor: "#000",
      shadowOpacity: 0.2,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 3 },
      elevation: 6,
    }}
  >
    <Text style={{ fontSize: 22 }}>🤖</Text>
  </View>
);

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarHideOnKeyboard: true,
        tabBarActiveTintColor: colors.brandPrimary,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.divider,
          borderTopWidth: 1,
          height: tabBarBaseHeight + insets.bottom,
          paddingTop: 4,
          paddingBottom: Math.max(insets.bottom, 4),
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: "700", marginTop: 0 },
        tabBarItemStyle: { alignSelf: "center", minHeight: minTouchTarget },
      }}
    >
      <Tabs.Screen name="home" options={{ title: "Home", tabBarIcon: ({ focused }) => <TabIcon label="⌂" focused={focused} /> }} />
      <Tabs.Screen name="study" options={{ title: "Learn", tabBarIcon: ({ focused }) => <TabIcon label="📚" focused={focused} /> }} />
      <Tabs.Screen name="ai-tab" options={{ title: "AI", tabBarLabel: () => null, tabBarIcon: ({ focused }) => <AITabIcon focused={focused} /> }} />
      <Tabs.Screen name="exams" options={{ title: "Practice", tabBarIcon: ({ focused }) => <TabIcon label="✍️" focused={focused} /> }} />
      <Tabs.Screen name="calendar" options={{ title: "Roster", tabBarIcon: ({ focused }) => <TabIcon label="🗓️" focused={focused} /> }} />
      <Tabs.Screen name="profile-tab" options={{ title: "Profile", tabBarIcon: ({ focused }) => <TabIcon label="👤" focused={focused} /> }} />
    </Tabs>
  );
}
