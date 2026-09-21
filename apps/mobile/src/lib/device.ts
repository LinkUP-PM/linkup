import * as SecureStore from "expo-secure-store";

const KEY = "linkup-device-id";

function createId(): string {
  const random = Math.random().toString(16).slice(2);
  const time = Date.now().toString(16);
  return `${time}-${random}-linkup`;
}

export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) return existing;
  const created = createId();
  await SecureStore.setItemAsync(KEY, created);
  return created;
}
