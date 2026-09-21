import * as SecureStore from "expo-secure-store";

const KEY = "linkup-device-id";

function createUuidV4(): string {
  // RFC 4122 variant bits without crypto polyfill differences across RN runtimes
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export async function getDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(KEY);
  if (existing) return existing;
  const created = createUuidV4();
  await SecureStore.setItemAsync(KEY, created);
  return created;
}
