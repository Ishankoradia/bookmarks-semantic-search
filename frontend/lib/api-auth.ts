import { getSession } from "next-auth/react";
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005/api/v1';

// Create authenticated API instance
export const createAuthenticatedApi = async () => {
  const session: any = await getSession();
  
  const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      // Add JWT Bearer token from session
      ...(session?.accessToken && { 'Authorization': `Bearer ${session.accessToken}` }),
    },
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