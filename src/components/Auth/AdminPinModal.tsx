import React, { useState } from 'react';
import { Lock, ShieldCheck, X, AlertCircle, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { readStored, writeStored, removeStored } from '../../utils/safeStorage';
import {
  authenticateEducator,
  getEducatorApiToken,
  setEducatorApiToken,
  clearEducatorApiToken,
} from '../../utils/educatorApi';
import { loadEducatorData } from '../../utils/accountsApi';

const EDUCATOR_SESSION_KEY = 'igcse_educator_session';

export interface AdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const markEducatorSession = (rememberMe = false): void => {
  try {
    window.sessionStorage.setItem(EDUCATOR_SESSION_KEY, '1');
    if (rememberMe) {
      writeStored(EDUCATOR_SESSION_KEY, '1');
    } else {
      removeStored(EDUCATOR_SESSION_KEY);
    }
  } catch {
    // ignore
  }
};

export const clearEducatorSession = (): void => {
  clearEducatorApiToken();
};

export const hasEducatorSession = (): boolean => {
  try {
    const isRemembered = readStored(EDUCATOR_SESSION_KEY) === '1';
    const isSessionActive = window.sessionStorage.getItem(EDUCATOR_SESSION_KEY) === '1';
    const hasToken = Boolean(getEducatorApiToken());
    return (isRemembered || isSessionActive) && hasToken;
  } catch {
    return false;
  }
};

export const AdminPinModal: React.FC<AdminPinModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  const isLocalDev =
    Boolean((import.meta as any).env?.DEV) &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      Boolean(window.location.port));

  const handleLocalDevBypass = () => {
    markEducatorSession(true);
    setEducatorApiToken('local_dev_token', true);
    setError('');
    setPassword('');
    onSuccess();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!password.trim()) {
      setError('Please enter your instructor password or PIN.');
      return;
    }

    if (
      isLocalDev &&
      (password.trim().toLowerCase() === 'admin' || password.trim().toLowerCase() === 'haitham')
    ) {
      handleLocalDevBypass();
      return;
    }

    setIsChecking(true);
    try {
      const auth = await authenticateEducator(password, rememberMe);
      if (auth.ok) {
        markEducatorSession(rememberMe);
        void loadEducatorData().catch(() => {});
        setPassword('');
        onSuccess();
      } else {
        setError(auth.error || 'Incorrect password.');
      }
    } finally {
      setIsChecking(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/55 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full border border-[#E5E7EB] shadow-2xl space-y-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-[#EEF3F9] border border-[#DCE5F0] flex items-center justify-center text-[#1B365D]">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="math-serif text-lg font-bold text-[#13294B]">Educator Admin Unlock</h2>
              <p className="text-xs text-slate-500">
                Verify Mr. Haitham&apos;s instructor PIN to open Roster, Parents &amp; Reports.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-[#F7F6F2]"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="flex items-center gap-2 text-xs text-red-700 bg-red-50 border border-red-200 px-3.5 py-2.5 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter instructor password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full pl-10 pr-10 py-3 rounded-xl border border-[#E5E7EB] bg-[#FAF9F5] focus:bg-white text-sm outline-none focus:border-[#1B365D]"
              autoFocus
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="rounded border-slate-300"
            />
            <span>Remember educator unlock for 7 days on this browser</span>
          </label>

          {isLocalDev && (
            <button
              type="button"
              onClick={handleLocalDevBypass}
              className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-200 text-amber-900 rounded-xl text-xs font-bold transition"
            >
              Unlock Educator Access (Local Testing)
            </button>
          )}

          <button
            type="submit"
            disabled={isChecking}
            className="w-full py-3 bg-[#1B365D] hover:bg-[#13294B] text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition disabled:opacity-50"
          >
            <span>{isChecking ? 'Verifying...' : 'Unlock Admin Console'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
