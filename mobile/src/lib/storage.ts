import * as SecureStore from 'expo-secure-store';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export interface StoredUser {
  uuid: string;
  email: string;
  name: string | null;
  picture: string | null;
}

// Secure storage for sensitive data (JWT)
export async function saveToken(token: string): Promise<void> {
  await SecureStore.setItemAsync(TOKEN_KEY, token);
}

export async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync(TOKEN_KEY);
}

export async function deleteToken(): Promise<void> {
  await SecureStore.deleteItemAsync(TOKEN_KEY);
}

// Secure storage for user info
export async function saveUser(user: StoredUser): Promise<void> {
  await SecureStore.setItemAsync(USER_KEY, JSON.stringify(user));
}

export async function getUser(): Promise<StoredUser | null> {
  const data = await SecureStore.getItemAsync(USER_KEY);
  return data ? JSON.parse(data) : null;
}

export async function deleteUser(): Promise<void> {
  await SecureStore.deleteItemAsync(USER_KEY);
}

// AsyncStorage for cached data
export async function cacheData(key: string, data: any): Promise<void> {
  await AsyncStorage.setItem(key, JSON.stringify(data));
}

export async function getCachedData<T>(key: string): Promise<T | null> {
  const data = await AsyncStorage.getItem(key);
  return data ? JSON.parse(data) : null;
}

export async function clearCache(): Promise<void> {
  const keys = await AsyncStorage.getAllKeys();
  const cacheKeys = keys.filter((k) => k.startsWith('cache_'));
  await AsyncStorage.multiRemove(cacheKeys);
}
