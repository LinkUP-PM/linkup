import { Platform } from "react-native";
import * as DocumentPicker from "expo-document-picker";
import type { UploadFileInput } from "./api";

export type PickedPdf = UploadFileInput | null;

function pickPdfOnWeb(): Promise<PickedPdf> {
  if (typeof document === "undefined") return Promise.resolve(null);

  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/pdf,.pdf";
    input.style.display = "none";
    document.body.appendChild(input);

    let settled = false;
    const finish = (value: PickedPdf) => {
      if (settled) return;
      settled = true;
      window.removeEventListener("focus", onWindowFocus);
      if (input.parentNode) input.parentNode.removeChild(input);
      resolve(value);
    };

    const onWindowFocus = () => {
      // Cancel without a file: change never fires; focus returns after the dialog closes.
      window.setTimeout(() => {
        if (!settled && (!input.files || input.files.length === 0)) {
          finish(null);
        }
      }, 300);
    };

    input.addEventListener("change", () => {
      const file = input.files?.[0];
      if (!file) {
        finish(null);
        return;
      }
      finish({
        uri: URL.createObjectURL(file),
        name: file.name || "curriculo.pdf",
        mimeType: file.type || "application/pdf",
        file,
      });
    });

    input.addEventListener("cancel", () => finish(null));
    window.addEventListener("focus", onWindowFocus);
    input.click();
  });
}

async function pickPdfNative(): Promise<PickedPdf> {
  const picked = await DocumentPicker.getDocumentAsync({
    type: "application/pdf",
    copyToCacheDirectory: true,
  });
  if (picked.canceled || !picked.assets[0]) return null;
  const file = picked.assets[0];
  return {
    uri: file.uri,
    name: file.name ?? "curriculo.pdf",
    mimeType: file.mimeType ?? "application/pdf",
    file: file.file,
  };
}

export async function pickPdf(): Promise<PickedPdf> {
  if (Platform.OS === "web") return pickPdfOnWeb();
  return pickPdfNative();
}
