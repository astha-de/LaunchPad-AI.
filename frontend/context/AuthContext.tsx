import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  api,
  getStoredToken,
  setStoredToken,
  setUnauthorizedHandler,
} from '../services/api.ts';
import type { HealthStatus, User } from '../types/index.ts';

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  health: HealthStatus | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (payload: {
    name: string;
    email: string;
    password: string;
    targetRole?: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: { name?: string; targetRole?: string }) => Promise<void>;
  refreshHealth: () => Promise<void>;
  reconnectDatabase: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [health, setHealth] = useState<HealthStatus | null>(null);

  const refreshHealth = useCallback(async () => {
    try {
      const status = await api.getHealth();
      setHealth(status);
    } catch {
      setHealth(null);
    }
  }, []);

  const reconnectDatabase = useCallback(async (): Promise<boolean> => {
    try {
      const status = await api.reconnectDatabase();
      setHealth(status);
      return status.dbConnected;
    } catch {
      await refreshHealth();
      return false;
    }
  }, [refreshHealth]);

  const clearSession = useCallback(() => {
    setStoredToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(clearSession);
  }, [clearSession]);

  useEffect(() => {
    let active = true;

    async function bootstrap() {
      await refreshHealth();
      const token = getStoredToken();
      if (!token) {
        if (active) setLoading(false);
        return;
      }

      try {
        const { user: verifiedUser } = await api.getMe();
        if (active) setUser(verifiedUser);
      } catch {
        setStoredToken(null);
        if (active) setUser(null);
      } finally {
        if (active) setLoading(false);
      }
    }

    void bootstrap();
    return () => {
      active = false;
    };
  }, [refreshHealth]);

  const login = useCallback(async (email: string, password: string) => {
    const { token, user: loggedInUser } = await api.login({ email, password });
    setStoredToken(token);
    setUser(loggedInUser);
  }, []);

  const signup = useCallback(
    async (payload: { name: string; email: string; password: string; targetRole?: string }) => {
      const { token, user: createdUser } = await api.signup(payload);
      setStoredToken(token);
      setUser(createdUser);
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // Ignore network errors during logout cleanup
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const updateProfile = useCallback(
    async (payload: { name?: string; targetRole?: string }) => {
      const { user: updated } = await api.updateProfile(payload);
      setUser(updated);
    },
    []
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        health,
        login,
        signup,
        logout,
        updateProfile,
        refreshHealth,
        reconnectDatabase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside an AuthProvider.');
  }
  return ctx;
}
