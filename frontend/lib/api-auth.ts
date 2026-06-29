import { getSession, useSession } from "next-auth/react";
import { useCallback } from "react";
import axios from 'axios';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:6005/api/v1';

// Build an axios instance with the bearer token attached.
const buildApi = (accessToken?: string) =>
  axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      // Add JWT Bearer token from session
      ...(accessToken && { 'Authorization': `Bearer ${accessToken}` }),
    },
  });

// Create authenticated API instance (non-hook contexts only).
// Note: getSession() performs a network fetch to /api/auth/session, so avoid
// this inside components — use useAuthenticatedApi() which reads the cached session.
export const createAuthenticatedApi = async () => {
  const session: any = await getSession();
  return buildApi(session?.accessToken);
};

// Hook for client-side authenticated requests.
// Reads the token from the SessionProvider context (no per-request network
// fetch to /api/auth/session).
export const useAuthenticatedApi = () => {
  const { data: session } = useSession();
  const accessToken = (session as any)?.accessToken as string | undefined;

  const makeRequest = useCallback(
    async (requestFn: (api: any) => Promise<any>) => {
      const api = buildApi(accessToken);
      return requestFn(api);
    },
    [accessToken]
  );

  return { makeRequest };
};