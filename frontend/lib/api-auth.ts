import { getSession } from "next-auth/react";
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL;

// Create authenticated API instance
export const createAuthenticatedApi = async () => {
  const session = await getSession();
  
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      // Add user UUID header for backend authentication
      ...(session?.user?.id && { 'X-User-Id': session.user.id }),
    },
    withCredentials: true, // Send cookies with requests
  });
  
  return api;
};

// Hook for client-side authenticated requests
export const useAuthenticatedApi = () => {
  const makeRequest = async (requestFn: (api: any) => Promise<any>) => {
    const api = await createAuthenticatedApi();
    return requestFn(api);
  };
  
  return { makeRequest };
};