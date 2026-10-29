import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { SwitchRoleButton } from "../../src/components/SwitchRoleButton";
import { TabBarBackground } from "../../src/components/TabBarBackground";
import { colors, type } from "../../src/theme/tokens";
import { floatingTabBarStyle, screenHeaderOptions } from "../../src/theme/navigation";

export default function EmployerTabsLayout() {
  return (
    <Tabs
      screenOptions={{
        ...screenHeaderOptions,
        headerRight: () => <SwitchRoleButton />,
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
          headerTitle: "Minhas vagas",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nova"
        options={{
          title: "Nova vaga",
          headerTitle: "Nova vaga",
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="add-circle-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="indicados/[id]"
        options={{
          href: null,
          title: "Indicados",
          headerTitle: "Indicados",
        }}
      />
    </Tabs>
  );
}
