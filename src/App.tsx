import React from 'react';
import { AuthProvider, useAuth } from './educato/AuthContext';
import { LoginPage } from './educato/LoginPage';
import { Layout } from './educato/Layout';

function AppContent() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!user) return <LoginPage />;
  return <Layout />;
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
