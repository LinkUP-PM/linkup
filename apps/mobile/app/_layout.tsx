import { Stack } from "expo-router";

export default function Layout() {
  return (
    <Stack
      screenOptions={{
        headerTitle: "LinkUP",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#F4F1EA" },
      }}
    />
  );
}
