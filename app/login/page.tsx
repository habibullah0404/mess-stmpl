'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Anchor, Mail, Lock, Loader2, AlertCircle, LogIn, UserPlus, KeyRound, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function LoginPage() {
  const { signIn, signUp } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Forgot password state
  const [forgotMode, setForgotMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email || !password) {
      setError('Email dan password wajib diisi.');
      return;
    }
    setLoading(true);
    const fn = mode === 'login' ? signIn : signUp;
    const { error } = await fn(email, password);
    setLoading(false);
    if (error) {
      setError(error);
      return;
    }
    router.push('/');
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!forgotEmail) {
      setError('Email wajib diisi.');
      return;
    }
    setForgotLoading(true);
    const { error: err } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/update-password`,
    });
    setForgotLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    setForgotSent(true);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-sky-700 text-white shadow-lg">
            <Anchor className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Mess Management</h1>
          <p className="text-sm text-slate-500">
            {forgotMode
              ? 'Pemulihan Password'
              : mode === 'login'
              ? 'Masuk ke akun Anda'
              : 'Daftar akun baru'}
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {forgotMode ? (
            /* Forgot password form */
            forgotSent ? (
              <div className="space-y-4">
                <div className="flex flex-col items-center py-4 text-center">
                  <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-600" />
                  <p className="text-base font-semibold text-slate-800">Email pemulihan terkirim!</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Cek email Anda (termasuk folder spam) untuk link pemulihan password.
                  </p>
                </div>
                <Button
                  onClick={() => {
                    setForgotMode(false);
                    setForgotSent(false);
                    setForgotEmail('');
                    setError(null);
                  }}
                  variant="outline"
                  className="h-10 w-full"
                >
                  <ArrowLeft className="h-4 w-4" /> Kembali ke Login
                </Button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email Anggota</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="nama@email.com"
                      value={forgotEmail}
                      onChange={(e) => setForgotEmail(e.target.value)}
                      className="h-10 pl-10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={forgotLoading}
                  className="h-10 w-full bg-blue-900 hover:bg-blue-800"
                >
                  {forgotLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <KeyRound className="h-4 w-4" /> Kirim Link Pemulihan
                    </>
                  )}
                </Button>

                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(false);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-center gap-1.5 text-xs text-slate-500 hover:text-slate-700"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Kembali ke Login
                </button>
              </form>
            )
          ) : (
            <>
              {/* Tabs */}
              <div className="mb-5 flex rounded-lg bg-slate-100 p-1">
                <button
                  onClick={() => { setMode('login'); setError(null); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors ${
                    mode === 'login' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <LogIn className="h-4 w-4" />
                  Masuk
                </button>
                <button
                  onClick={() => { setMode('register'); setError(null); }}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-md py-2 text-sm font-semibold transition-colors ${
                    mode === 'register' ? 'bg-blue-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  <UserPlus className="h-4 w-4" />
                  Daftar
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="email"
                      placeholder="nama@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="h-10 pl-10"
                    />
                  </div>
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      type="password"
                      placeholder="Minimal 6 karakter"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="h-10 pl-10"
                    />
                  </div>
                </div>

                {error && (
                  <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                    <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="h-10 w-full bg-blue-900 hover:bg-blue-800"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : mode === 'login' ? (
                    'Masuk'
                  ) : (
                    'Daftar'
                  )}
                </Button>
              </form>

              {mode === 'login' && (
                <div className="mt-3 text-center">
                  <button
                    onClick={() => {
                      setForgotMode(true);
                      setError(null);
                      setForgotEmail(email);
                    }}
                    className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-800 dark:text-blue-400"
                  >
                    <KeyRound className="h-3.5 w-3.5" /> Lupa Password?
                  </button>
                </div>
              )}

              <p className="mt-4 text-center text-xs text-slate-400">
                {mode === 'login'
                  ? 'Belum punya akun? Klik Daftar untuk membuat akun baru.'
                  : 'Sudah punya akun? Klik Masuk untuk melanjutkan.'}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
