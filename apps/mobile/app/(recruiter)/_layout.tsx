import { Stack } from "expo-router";
import { SwitchRoleButton } from "../../src/components/SwitchRoleButton";
import { screenHeaderOptions, stackScreenAnimations } from "../../src/theme/navigation";

export default function RecruiterLayout() {
  return (
    <Stack screenOptions={screenHeaderOptions}>
      <Stack.Screen
        name="index"
        options={{
          title: "Triagem",
          headerRight: () => <SwitchRoleButton />,
        }}
      />
      <Stack.Screen
        name="inbox"
        options={{
          title: "A triar",
          headerBackTitle: "Voltar",
          ...stackScreenAnimations.detail,
        }}
      />
      <Stack.Screen
        name="fila/[id]"
        options={{
          title: "Fila da vaga",
          headerBackTitle: "Voltar",
          ...stackScreenAnimations.detail,
        }}
      />
    </Stack>
  );
}
