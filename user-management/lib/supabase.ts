import "react-native-url-polyfill/auto";
import "react-native-get-random-values";
import * as SecureStore from "expo-secure-store";
import * as aes from "aes-js";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import { SUPABASE_ANONKEY, SUPABASE_PROJECT_URL } from "./env";

// As Expo's SecureStore does not support values larger than 2048
// bytes, an AES-256 key is generated and stored in SecureStore, while
// it is used to encrypt/decrypt values stored in AsyncStorage.
class LargeSecureStore {
  private async _encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint16Array(256 / 8));

    const cipher = new aes.ModeOfOperation.ctr(
      encryptionKey,
      new aes.Counter(1)
    );
    const encryptedBytes = cipher.encrypt(aes.utils.utf8.toBytes(value));

    await SecureStore.setItemAsync(key, aes.utils.hex.fromBytes(encryptionKey));

    return aes.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return encryptionKeyHex;

    const cipher = new aes.ModeOfOperation.ctr(
      aes.utils.hex.toBytes(encryptionKeyHex),
      new aes.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aes.utils.hex.toBytes(value));

    return aes.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return encrypted;

    return await this._decrypt(key, encrypted);
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string) {
    const encrypted = await this._encrypt(key, value);

    await AsyncStorage.setItem(key, encrypted);
  }
}

export const supabase = createClient(SUPABASE_PROJECT_URL, SUPABASE_ANONKEY, {
  auth: {
    storage: new LargeSecureStore(),
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
