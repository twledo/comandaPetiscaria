import React, { createContext, useContext, useState, useCallback } from 'react';
import type { AuthUser } from '../types';

interface AuthContextValue {
    user: AuthUser | null;
    login: (user: AuthUser) => void;
    logout: () => void;
    isAdmin: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const STORAGE_KEY = 'petiscaria_auth';

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(() => {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    });

    const login = useCallback((u: AuthUser) => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(u));
        setUser(u);
    }, []);

    const logout = useCallback(() => {
        localStorage.removeItem(STORAGE_KEY);
        setUser(null);
    }, []);

    return (
        <AuthContext.Provider value={{ user, login, logout, isAdmin: user?.cargo === 'ADMIN' }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) throw new Error('useAuth must be inside AuthProvider');
    return ctx;
}