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

export async function loginWithGoogleUser(user: {
  email: string;
  name: string | null;
  picture: string | null;
  google_id: string;
}): Promise<StoredUser> {
  const response = await apiClient.post<LoginResponse>('/auth/login', {
    email: user.email,
    name: user.name,
    picture: user.picture,
    google_id: user.google_id,
  });

  const { user: responseUser, access_token: jwt } = response.data;

  const storedUser: StoredUser = {
    uuid: responseUser.uuid,
    email: responseUser.email,
    name: responseUser.name,
    picture: responseUser.picture,
  };

  await saveToken(jwt);
  await saveUser(storedUser);

  return storedUser;
}

export async function logout(): Promise<void> {
  await deleteToken();
  await deleteUser();
}
