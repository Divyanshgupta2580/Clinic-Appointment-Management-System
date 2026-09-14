'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, UserRole } from '@/types';
import { apiRequest } from './api';
import { disconnectSocket, getSocket } from './socket';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (name: string, email: string, password: string, role?: UserRole, phone?: string) => Promise<User>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = async () => {
    try {
      const data = await apiRequest<{ success: boolean; user: User }>('/api/auth/me');
      if (data.success && data.user) {
        setUser(data.user);
        // Connect socket for authenticated user
        getSocket();
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('medipulse_token');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = async (email: string, password: string): Promise<User> => {
    const data = await apiRequest<{ success: boolean; token: string; user: User }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });

    if (data.token && typeof window !== 'undefined') {
      localStorage.setItem('medipulse_token', data.token);
    }

    setUser(data.user);
    // Re-initialize socket with fresh token
    disconnectSocket();
    getSocket();

    return data.user;
  };

  const register = async (
    name: string,
    email: string,
    password: string,
    role: UserRole = 'patient',
    phone?: string
  ): Promise<User> => {
    const data = await apiRequest<{ success: boolean; token: string; user: User }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role, phone }),
    });

    if (data.token && typeof window !== 'undefined') {
      localStorage.setItem('medipulse_token', data.token);
    }

    setUser(data.user);
    disconnectSocket();
    getSocket();

    return data.user;
  };

  const logout = async () => {
    try {
      await apiRequest('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignore logout errors
    } finally {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('medipulse_token');
      }
      setUser(null);
      disconnectSocket();
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
