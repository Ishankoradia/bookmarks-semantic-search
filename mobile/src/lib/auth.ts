import apiClient from './api-client';
import { saveToken, saveUser, deleteToken, deleteUser, type StoredUser } from './storage';

interface LoginResponse {
  user: {
    uuid: string;
    email: string;
    name: string | null;
    picture: string | null;
  };
  access_token: string;
  token_type: string;
}

export async function loginWithGoogleToken(accessToken: string): Promise<StoredUser> {
  const response = await apiClient.post<LoginResponse>('/auth/google/extension', {
    access_token: accessToken,
  });

  const { user, access_token: jwt } = response.data;

  const storedUser: StoredUser = {
    uuid: user.uuid,
    email: user.email,
    name: user.name,
    picture: user.picture,
  };

  await saveToken(jwt);
  await saveUser(storedUser);

  return storedUser;
}

export async function logout(): Promise<void> {
  await deleteToken();
  await deleteUser();
}
