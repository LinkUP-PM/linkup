import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { colors, fonts } from "../../src/theme/tokens";

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingTop: 4,
        },
        tabBarLabelStyle: {
          fontFamily: fonts.bodySemi,
          fontSize: 12,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Analisar",
          headerTitle: "LinkUP",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          headerTitle: "Histórico",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
