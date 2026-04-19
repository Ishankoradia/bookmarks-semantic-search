import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getToken, getUser, type StoredUser } from '../lib/storage';
import { loginWithGoogleUser, logout as authLogout } from '../lib/auth';
import { setOnUnauthorized } from '../lib/api-client';

interface AuthContextValue {
  user: StoredUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (googleUser: { email: string; name: string | null; picture: string | null; google_id: string }) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isAuthenticated: false,
  isLoading: true,
  signIn: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<StoredUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const signOut = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  // Check for existing session on mount
  useEffect(() => {
    (async () => {
      try {
        const token = await getToken();
        if (token) {
          const storedUser = await getUser();
          if (storedUser) {
            setUser(storedUser);
          }
        }
      } catch {
        // Ignore errors reading storage
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  // Set up 401 handler
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
    });
  }, []);

  const signIn = useCallback(async (googleUser: { email: string; name: string | null; picture: string | null; google_id: string }) => {
    const storedUser = await loginWithGoogleUser(googleUser);
    setUser(storedUser);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
