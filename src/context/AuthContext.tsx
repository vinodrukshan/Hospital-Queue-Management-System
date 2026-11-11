import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, UserRole } from '../types/database';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { INITIAL_PROFILES } from '../services/mockDataStore';

interface AuthContextType {
  user: Profile | null;
  role: UserRole;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, role?: UserRole) => Promise<boolean>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => void;
  updateUserProfile: (updates: Partial<Profile>) => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<Profile | null>(() => {
    // Check saved session in local storage
    const saved = localStorage.getItem('hospital_user');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    // Default to doctor for initial inspection/development
    return INITIAL_PROFILES[0];
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (user) {
      localStorage.setItem('hospital_user', JSON.stringify(user));
    } else {
      localStorage.removeItem('hospital_user');
    }
  }, [user]);

  const login = async (email: string, selectedRole?: UserRole): Promise<boolean> => {
    setIsLoading(true);
    try {
      if (isSupabaseConfigured()) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password: 'Password123!',
        });
        if (!error && data.user) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', data.user.id)
            .single();

          if (profile) {
            setUser(profile as Profile);
            setIsLoading(false);
            return true;
          }
        }
      }

      // Match in local store
      const matched = INITIAL_PROFILES.find(p => 
        (selectedRole ? p.role === selectedRole : true) &&
        (email ? p.email?.toLowerCase() === email.toLowerCase() : true)
      );

      if (matched) {
        setUser(matched);
        setIsLoading(false);
        return true;
      }

      // Fallback: match by selectedRole
      if (selectedRole) {
        const roleMatch = INITIAL_PROFILES.find(p => p.role === selectedRole);
        if (roleMatch) {
          setUser(roleMatch);
          setIsLoading(false);
          return true;
        }
      }

      setIsLoading(false);
      return false;
    } catch (err) {
      setIsLoading(false);
      return false;
    }
  };

  const logout = async () => {
    if (isSupabaseConfigured()) {
      await supabase.auth.signOut();
    }
    setUser(null);
    localStorage.removeItem('hospital_user');
  };

  const switchRole = (newRole: UserRole) => {
    const targetUser = INITIAL_PROFILES.find(p => p.role === newRole);
    if (targetUser) {
      setUser(targetUser);
    }
  };

  const updateUserProfile = async (updates: Partial<Profile>): Promise<boolean> => {
    if (!user) return false;
    if (isSupabaseConfigured()) {
      const { error } = await supabase.from('profiles').update(updates).eq('id', user.id);
      if (error) return false;
    }
    const updated = { ...user, ...updates, updated_at: new Date().toISOString() };
    setUser(updated);
    const idx = INITIAL_PROFILES.findIndex(p => p.id === user.id);
    if (idx !== -1) {
      INITIAL_PROFILES[idx] = updated;
    }
    return true;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role || 'patient',
        isAuthenticated: Boolean(user),
        isLoading,
        login,
        logout,
        switchRole,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
