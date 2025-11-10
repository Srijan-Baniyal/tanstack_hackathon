const STORAGE_SECRET =
  import.meta.env.VITE_STORAGE_SECRET ??
  "meshmind_dev_storage_secret_change_me";

const STORAGE_SALT = "meshmind.auth.storage.salt.v1";
const STORAGE_VERSION = 1;

let derivedKeyPromise: Promise<CryptoKey> | null = null;
let hasLoggedFallbackSecretWarning = false;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

const isBrowserEnvironment = () =>
  typeof window !== "undefined" && typeof window.localStorage !== "undefined";

const isCryptoAvailable = () =>
  isBrowserEnvironment() && !!globalThis.crypto?.subtle;

const logFallbackSecretWarning = () => {
  if (hasLoggedFallbackSecretWarning) return;
  if (import.meta.env.DEV && !import.meta.env.VITE_STORAGE_SECRET) {
    console.warn(
      "secureStorage: falling back to a dev-only storage secret. Set VITE_STORAGE_SECRET for production."
    );
  }
  hasLoggedFallbackSecretWarning = true;
};

const bufferToBase64 = (buffer: ArrayBuffer) => {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToUint8Array = (value: string) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
};

const deriveKey = async () => {
  if (!isCryptoAvailable()) {
    throw new Error("Secure storage requires Web Crypto support.");
  }
  logFallbackSecretWarning();
  const crypto = globalThis.crypto as Crypto;
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    textEncoder.encode(STORAGE_SECRET),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: textEncoder.encode(STORAGE_SALT),
      iterations: 100_000,
      hash: "SHA-256",
    },
    keyMaterial,
    {
      name: "AES-GCM",
      length: 256,
    },
    false,
    ["encrypt", "decrypt"]
  );
};

const getDerivedKey = async () => {
  if (!derivedKeyPromise) {
    derivedKeyPromise = deriveKey();
  }
  return derivedKeyPromise;
};

export const secureStorage = {
  isSupported: () => isCryptoAvailable(),

  async setItem<T>(key: string, value: T) {
    if (!isBrowserEnvironment()) return;
    if (!isCryptoAvailable()) {
      console.warn(
        "secureStorage: Web Crypto not available. Skipping encrypted persistence."
      );
      return;
    }

    try {
      const crypto = globalThis.crypto as Crypto;
      const data = textEncoder.encode(JSON.stringify(value));
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const cipherBuffer = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        await getDerivedKey(),
        data
      );

      const payload = {
        v: STORAGE_VERSION,
        iv: bufferToBase64(iv.buffer),
        data: bufferToBase64(cipherBuffer),
        storedAt: Date.now(),
      };

      window.localStorage.setItem(key, JSON.stringify(payload));
    } catch (error) {
      console.error("secureStorage: failed to persist item", error);
    }
  },

  async getItem<T>(key: string): Promise<T | null> {
    if (!isBrowserEnvironment()) return null;
    if (!isCryptoAvailable()) {
      console.warn(
        "secureStorage: Web Crypto not available. Encrypted storage is disabled."
      );
      return null;
    }

    const raw = window.localStorage.getItem(key);
    if (!raw) return null;

    try {
      const parsed = JSON.parse(raw) as {
        v: number;
        iv: string;
        data: string;
      } | null;
      if (
        !parsed ||
        parsed.v !== STORAGE_VERSION ||
        !parsed.iv ||
        !parsed.data
      ) {
        throw new Error("Unexpected payload format");
      }

      const crypto = globalThis.crypto as Crypto;
      const decrypted = await crypto.subtle.decrypt(
        { name: "AES-GCM", iv: base64ToUint8Array(parsed.iv) },
        await getDerivedKey(),
        base64ToUint8Array(parsed.data)
      );

      return JSON.parse(textDecoder.decode(decrypted)) as T;
    } catch (error) {
      console.error("secureStorage: failed to read item", error);
      try {
        window.localStorage.removeItem(key);
      } catch (removalError) {
        console.error(
          "secureStorage: failed cleaning corrupt item",
          removalError
        );
      }
      return null;
    }
  },

  removeItem(key: string) {
    if (!isBrowserEnvironment()) return;
    try {
      window.localStorage.removeItem(key);
    } catch (error) {
      console.error("secureStorage: failed to remove item", error);
    }
  },
};
