'use client';

import * as React from 'react';
import { Profile, UserRole } from '@/types/custom.types';
import { MOCK_PROFILES } from '@/lib/mock-data';

interface AuthContextType {
  user: Profile | null;
  profiles: Profile[];
  role: UserRole;
  isOwner: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isMember: boolean;
  isViewer: boolean;
  setUser: (user: Profile | null) => void;
  switchDemoUser: (userId: string) => void;
  login: (email: string, password?: string) => Promise<Profile>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Profile>) => Promise<void>;
  refreshProfiles: () => Promise<Profile[]>;
  isLoading: boolean;
}

const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

const AUTH_STORAGE_KEY = 'crm_active_profile_id';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = React.useState<Profile | null>(null);
  const [profiles, setProfiles] = React.useState<Profile[]>(MOCK_PROFILES);
  const [isLoading, setIsLoading] = React.useState(true);

  // Fetch real synchronized profiles from Supabase backend
  const refreshProfiles = React.useCallback(async (): Promise<Profile[]> => {
    try {
      const res = await fetch('/api/crm?table=profiles');
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data) && json.data.length > 0) {
          setProfiles(json.data);
          return json.data;
        }
      }
    } catch (e) {
      console.warn('Failed to fetch synchronized profiles from backend', e);
    }
    return MOCK_PROFILES;
  }, []);

  // Initialize session and profiles
  React.useEffect(() => {
    let isMounted = true;

    async function initAuth() {
      try {
        const liveProfiles = await refreshProfiles();
        if (!isMounted) return;

        const storedId = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedId) {
          const matched = liveProfiles.find((p) => p.id === storedId && !p.deleted_at && p.is_active);
          if (matched) {
            setUser(matched);
            return;
          }
        }
        // If no stored session or stored user was deleted, user is null (must sign in)
        setUser(null);
      } catch (e) {
        console.warn('Auth initialization error', e);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    initAuth();

    return () => {
      isMounted = false;
    };
  }, [refreshProfiles]);

  const switchDemoUser = (userId: string) => {
    const found = profiles.find((p) => p.id === userId && !p.deleted_at);
    if (found) {
      setUser(found);
      try {
        localStorage.setItem(AUTH_STORAGE_KEY, userId);
        document.cookie = `crm_active_profile_id=${userId}; path=/; max-age=604800; SameSite=Lax`;
      } catch (e) {
        console.warn('Failed to save profile ID to localStorage', e);
      }
    }
  };

  const login = async (email: string, password?: string): Promise<Profile> => {
    const cleanEmail = email.trim().toLowerCase();

    const res = await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'login',
        data: {
          email: cleanEmail,
          password: password,
        },
      }),
    });

    const json = await res.json().catch(() => ({ success: false, error: 'Authentication service unreachable.' }));

    if (!res.ok || !json.success) {
      throw new Error(json.error || 'Invalid email or password. Please verify your credentials.');
    }

    const found: Profile = json.data;
    setUser(found);

    try {
      localStorage.setItem(AUTH_STORAGE_KEY, found.id);
      document.cookie = `crm_active_profile_id=${found.id}; path=/; max-age=604800; SameSite=Lax`;
    } catch (e) {
      console.warn('Storage error on login', e);
    }

    await refreshProfiles();
    return found;
  };

  const logout = async () => {
    setUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      document.cookie = 'crm_active_profile_id=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT;';
    } catch (e) {
      console.warn('Failed to clear auth from localStorage', e);
    }
  };

  const updateProfile = async (updates: Partial<Profile>) => {
    if (!user) return;
    const updatedUser = { ...user, ...updates, updated_at: new Date().toISOString() };
    setUser(updatedUser);

    // Update in database
    await fetch('/api/crm', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        table: 'profiles',
        action: 'update',
        id: user.id,
        data: updates,
      }),
    }).catch((err) => console.warn('Failed to sync profile update to backend', err));

    await refreshProfiles();
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
        profiles,
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
        refreshProfiles,
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
