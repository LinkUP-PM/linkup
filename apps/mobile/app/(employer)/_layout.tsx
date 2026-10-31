import { Platform } from "react-native";
import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { BrandHeaderTitle } from "../../src/components/BrandHeaderTitle";
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
          headerTitle: () => <BrandHeaderTitle title="Minhas vagas" />,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="briefcase-outline" size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="nova"
        options={{
          title: "Nova vaga",
          headerTitle: () => <BrandHeaderTitle title="Nova vaga" />,
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
      <Tabs.Screen
        name="agenda"
        options={{
          href: null,
          title: "Agenda",
          headerTitle: "Agenda de entrevistas",
        }}
      />
    </Tabs>
  );
}
