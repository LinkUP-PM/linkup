import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BrandHeaderTitle } from "../../src/components/BrandHeaderTitle";
import { SwitchRoleButton } from "../../src/components/SwitchRoleButton";
import { TabBarBackground } from "../../src/components/TabBarBackground";
import { colors, type } from "../../src/theme/tokens";
import { floatingTabBarStyle, screenHeaderOptions } from "../../src/theme/navigation";

export default function RecruiterTabsLayout() {
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
          title: "Triagem",
          headerTitle: () => <BrandHeaderTitle title="Triagem" />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="funnel-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="agenda"
        options={{
          title: "Agenda",
          headerTitle: () => <BrandHeaderTitle title="Agenda" />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="calendar-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="inbox"
        options={{
          href: null,
          title: "A triar",
          headerTitle: "A triar",
        }}
      />
      <Tabs.Screen
        name="fila/[id]"
        options={{
          href: null,
          title: "Fila da vaga",
          headerTitle: "Fila da vaga",
        }}
      />
    </Tabs>
  );
}
