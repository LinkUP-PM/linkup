import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BrandHeaderTitle } from "../../src/components/BrandHeaderTitle";
import { ProfileHeaderButton } from "../../src/components/ProfileHeaderButton";
import { TabBarBackground } from "../../src/components/TabBarBackground";
import { colors, type } from "../../src/theme/tokens";
import { floatingTabBarStyle, screenHeaderOptions } from "../../src/theme/navigation";

export default function CandidateTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        ...screenHeaderOptions,
        headerRight: () => <ProfileHeaderButton />,
        tabBarActiveTintColor: colors.accent,
        tabBarInactiveTintColor: colors.tertiary,
        tabBarStyle: floatingTabBarStyle,
        tabBarBackground: () => <TabBarBackground />,
        tabBarLabelStyle: {
          ...type.tabLabel,
        },
        sceneStyle: { backgroundColor: colors.background },
      }}
      screenListeners={{
        tabPress: () => {
          if (Platform.OS !== "web") {
            void Haptics.selectionAsync();
          }
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          headerTitle: () => <BrandHeaderTitle title="Candidaturas" />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="vagas"
        options={{
          title: "Vagas",
          headerTitle: () => <BrandHeaderTitle title="Vagas abertas" />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="analisar"
        options={{
          title: "Analisar",
          headerTitle: () => <BrandHeaderTitle title="Analisar" />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="sparkles-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="historico"
        options={{
          title: "Histórico",
          headerTitle: () => <BrandHeaderTitle title="Histórico" />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="time-outline" size={size} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
