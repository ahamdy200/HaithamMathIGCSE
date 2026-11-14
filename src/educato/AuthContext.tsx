import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { STUDENTS, TEACHER_ACCOUNT, Student } from './students';

export interface AuthUser {
  id: number;
  username: string;
  fullName: string;
  role: 'student' | 'teacher';
  grade?: string;
  section?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  login: (username: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('educato_user');
      if (saved) setUser(JSON.parse(saved));
    } catch {}
    setIsLoading(false);
  }, []);

  const login = (username: string, password: string) => {
    const trimUser = username.trim().toLowerCase();
    const trimPass = password.trim();

    if (trimUser === TEACHER_ACCOUNT.username && trimPass === TEACHER_ACCOUNT.password) {
      const teacherUser: AuthUser = {
        id: 0,
        username: TEACHER_ACCOUNT.username,
        fullName: TEACHER_ACCOUNT.fullName,
        role: 'teacher',
      };
      setUser(teacherUser);
      try { localStorage.setItem('educato_user', JSON.stringify(teacherUser)); } catch {}
      return { success: true };
    }

    const student = STUDENTS.find(
      (s) => s.username.toLowerCase() === trimUser && s.password === trimPass
    );

    if (student) {
      const studentUser: AuthUser = {
        id: student.id,
        username: student.username,
        fullName: student.fullName,
        role: 'student',
        grade: student.grade,
        section: student.section,
      };
      setUser(studentUser);
      try { localStorage.setItem('educato_user', JSON.stringify(studentUser)); } catch {}
      return { success: true };
    }

    return { success: false, error: 'Invalid username or password' };
  };

  const logout = () => {
    setUser(null);
    try { localStorage.removeItem('educato_user'); } catch {}
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
