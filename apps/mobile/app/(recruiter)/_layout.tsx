import { Stack } from "expo-router";
import { SwitchRoleButton } from "../../src/components/SwitchRoleButton";
import { colors, fonts } from "../../src/theme/tokens";

export default function RecruiterLayout() {
  return (
    <Stack
      screenOptions={{
        headerShadowVisible: false,
        headerStyle: { backgroundColor: colors.background },
        headerTitleStyle: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.ink },
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen
        name="index"
        options={{
          title: "Recrutador",
          headerRight: () => <SwitchRoleButton />,
        }}
      />
    </Stack>
  );
}
