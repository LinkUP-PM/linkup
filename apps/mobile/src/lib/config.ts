import { Platform } from "react-native";

/**
 * Emulador Android → host da máquina via 10.0.2.2
 * iOS simulator / web → localhost
 * Dispositivo físico (Expo Go) → defina EXPO_PUBLIC_API_URL=http://<IP-LAN>:3333
 */
function defaultApiUrl(): string {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  if (Platform.OS === "android") {
    return "http://10.0.2.2:3333";
  }
  return "http://localhost:3333";
}

export const API_URL = defaultApiUrl();
