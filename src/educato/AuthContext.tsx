import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { STUDENTS, PARENTS, TEACHER_ACCOUNT, ASSISTANT_ACCOUNT, DOMAINS } from './students';
import type { DirectorySeatUser } from '../types';

export interface AuthUser {
  id: number;
  domain?: string;
  username: string;
  fullName: string;
  role: 'student' | 'teacher' | 'parent';
  isAssistant?: boolean;
  grade?: string;
  section?: string;
  linkedStudentId?: number;
  linkedStudentIds?: number[];
  linkedStudentName?: string;
  parentEmail?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string, domain?: string) => { success: boolean; error?: string };
  loginWithDirectory: (username: string, password: string, domain?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      // Clean up legacy shared localStorage session so separate browser tabs stay isolated
      localStorage.removeItem('educato_user');
      const saved = sessionStorage.getItem('educato_user');
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    setIsLoading(false);
  }, []);

  const resolveLocalUser = (username: string, password: string, domain = 'Mr.HaithamHusseinig'): AuthUser | null => {
    const trimUser = username.trim().toLowerCase();
    const trimPass = password.trim();
    const cleanDomain = domain.trim() || DOMAINS[0];

    if (trimUser === TEACHER_ACCOUNT.username && trimPass === TEACHER_ACCOUNT.password) {
      return {
        id: 0,
        domain: cleanDomain,
        username: TEACHER_ACCOUNT.username,
        fullName: TEACHER_ACCOUNT.fullName,
        role: 'teacher',
      };
    }

    if (trimUser === ASSISTANT_ACCOUNT.username && trimPass === ASSISTANT_ACCOUNT.password) {
      return {
        id: ASSISTANT_ACCOUNT.id,
        domain: cleanDomain,
        username: ASSISTANT_ACCOUNT.username,
        fullName: ASSISTANT_ACCOUNT.fullName,
        role: 'teacher',
        isAssistant: true,
      };
    }

    const student = STUDENTS.find(
      (s) => s.username.toLowerCase() === trimUser && s.password === trimPass
    );
    if (student) {
      return {
        id: student.id,
        domain: cleanDomain,
        username: student.username,
        fullName: student.fullName,
        role: 'student',
        grade: student.grade,
        section: student.section,
        parentEmail: student.parentEmail || `parent.${student.username}@mrhaithamhusseinig.edu`,
      };
    }

    const parent = PARENTS.find(
      (p) => p.username.toLowerCase() === trimUser && p.password === trimPass
    );
    if (parent) {
      return {
        id: parent.id,
        domain: cleanDomain,
        username: parent.username,
        fullName: parent.fullName,
        role: 'parent',
        grade: parent.grade,
        section: parent.section,
        linkedStudentId: parent.linkedStudentId,
        linkedStudentName: parent.linkedStudentName,
        parentEmail: parent.email,
      };
    }

    return null;
  };

  const login = (username: string, password: string, domain = 'Mr.HaithamHusseinig') => {
    const matched = resolveLocalUser(username, password, domain);
    if (matched) {
      setUser(matched);
      try { sessionStorage.setItem('educato_user', JSON.stringify(matched)); } catch {}
      return { success: true };
    }
    return { success: false, error: 'Invalid domain, username, or password' };
  };

  const loginWithDirectory = async (username: string, password: string, domain = 'Mr.HaithamHusseinig') => {
    const localResult = login(username, password, domain);
    if (localResult.success) return localResult;

    try {
      const res = await fetch('/api/directory/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          domain: domain.trim() || 'Mr.HaithamHusseinig',
          username: username.trim(),
          password: password.trim(),
        }),
      });
      const data = await res.json();
      if (res.ok && data?.user) {
        const seat: DirectorySeatUser = data.user;
        const authUser: AuthUser = {
          id: seat.id,
          domain: seat.domain,
          username: seat.username,
          fullName: seat.fullName,
          role: seat.role,
          grade: seat.grade,
          section: seat.section,
          linkedStudentId: seat.linkedStudentId,
          linkedStudentIds: seat.linkedStudentIds,
          linkedStudentName: seat.linkedStudentName,
          parentEmail: seat.parentEmail,
        };
        setUser(authUser);
        try { sessionStorage.setItem('educato_user', JSON.stringify(authUser)); } catch {}
        return { success: true };
      }
      return { success: false, error: data?.error || 'Invalid domain, username, or password' };
    } catch {
      return { success: false, error: 'Invalid domain, username, or password' };
    }
  };

  const logout = () => {
    setUser(null);
    try {
      sessionStorage.removeItem('educato_user');
      localStorage.removeItem('educato_user');
    } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, loginWithDirectory, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
