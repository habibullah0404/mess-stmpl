'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Anchor, Lock, Loader2, AlertCircle, CheckCircle2, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        const { data: refresh } = await supabase.auth.refreshSession();
        if (!refresh.session) {
          setError('Link pemulihan tidak valid atau sudah kedaluwarsa. Silakan minta link baru.');
        }
      }
      setVerifying(false);
    };
    checkSession();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Password baru wajib diisi.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password minimal 6 karakter.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Konfirmasi password tidak cocok.');
      return;
    }

    setLoading(true);
    const { error: err } = await supabase.auth.updateUser({ password: newPassword });
    setLoading(false);

    if (err) {
      setError(err.message);
      return;
    }

    setSuccess(true);
    await supabase.auth.signOut();
    setTimeout(() => router.push('/login'), 2500);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-sky-700 text-white shadow-lg">
            <Anchor className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Password Baru</h1>
          <p className="text-sm text-slate-500">Masukkan password baru Anda</p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          {verifying ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-900" />
              <span className="ml-2 text-sm text-slate-500">Memverifikasi link…</span>
            </div>
          ) : success ? (
            <div className="space-y-4">
              <div className="flex flex-col items-center py-4 text-center">
                <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-600" />
                <p className="text-base font-semibold text-slate-800">Password berhasil diperbarui!</p>
                <p className="mt-1 text-sm text-slate-500">Anda akan diarahkan ke halaman masuk…</p>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Password Baru</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Minimal 6 karakter"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="h-10 pl-10 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Konfirmasi Password</label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Ulangi password baru"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
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
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Simpan Password Baru'}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
