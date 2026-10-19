'use client';

import * as React from 'react';
import { Profile, UserRole } from '@/types/custom.types';
import { MOCK_PROFILES } from '@/lib/mock-data';

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isMember: boolean;
  isViewer: boolean;
  setUser: (user: Profile | null) => void;
  switchDemoUser: (userId: string) => void;
  login: (email: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'crm_active_profile_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  // Default to owner for frictionless initial development & evaluation
  const [user, setUser] = React.useState<Profile | null>(MOCK_PROFILES[0]);
  const [isLoading, setIsLoading] = React.useState(true);

  React.useEffect(() => {
    try {
      const storedId = localStorage.getItem(AUTH_STORAGE_KEY);
      if (storedId) {
        const found = MOCK_PROFILES.find((p) => p.id === storedId);
        if (found) setUser(found);
      }
    } catch (e) {
      console.warn('Failed to read auth state from localStorage', e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const switchDemoUser = (userId: string) => {
    const found = MOCK_PROFILES.find((p) => p.id === userId);
    if (found) {
      setUser(found);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, userId);
      } catch (e) {
        console.warn('Failed to save profile ID to localStorage', e);
      }
    }
  };

  const login = async (email: string) => {
    // Check if matching mock profile
    const found = MOCK_PROFILES.find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (found) {
      setUser(found);
      localStorage.setItem(AUTH_STORAGE_KEY, found.id);
      return;
    }
    // If not mock, default to first user or create temp
    setUser(MOCK_PROFILES[0]);
    localStorage.setItem(AUTH_STORAGE_KEY, MOCK_PROFILES[0].id);
  };

  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.warn('Failed to clear auth from localStorage', e);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    setUser({ ...user, ...updates, updated_at: new Date().toISOString() });
  };

  const role = user?.role || 'viewer';
  const isOwner = role === 'owner';
  const isAdmin = role === 'admin' || role === 'owner';
  const isManager = role === 'manager' || isAdmin;
  const isMember = role === 'member' || isManager;
  const isViewer = role === 'viewer';

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        isOwner,
        isAdmin,
        isManager,
        isMember,
        isViewer,
        setUser,
        switchDemoUser,
        login,
        logout,
        updateProfile,
        isLoading,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = React.useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
