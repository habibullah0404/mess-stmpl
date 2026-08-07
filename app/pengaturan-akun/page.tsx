'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Lock,
  Mail,
  Loader2,
  AlertCircle,
  CheckCircle2,
  ArrowLeft,
  Eye,
  EyeOff,
  KeyRound,
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { supabase } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function PengaturanAkunPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  // Password form
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwMsg, setPwMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // Email form
  const [newEmail, setNewEmail] = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailMsg, setEmailMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setNewEmail(user.email ?? '');
  }, [user, authLoading, router]);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPwMsg(null);
    if (!newPassword || !confirmPassword) {
      setPwMsg({ type: 'error', text: 'Password baru wajib diisi.' });
      return;
    }
    if (newPassword.length < 6) {
      setPwMsg({ type: 'error', text: 'Password minimal 6 karakter.' });
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwMsg({ type: 'error', text: 'Konfirmasi password tidak cocok.' });
      return;
    }
    setPwLoading(true);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setPwLoading(false);
    if (error) {
      setPwMsg({ type: 'error', text: error.message });
      return;
    }
    setPwMsg({ type: 'success', text: 'Password berhasil diperbarui.' });
    setNewPassword('');
    setConfirmPassword('');
  };

  const handleChangeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg(null);
    if (!newEmail.trim()) {
      setEmailMsg({ type: 'error', text: 'Email baru wajib diisi.' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newEmail.trim())) {
      setEmailMsg({ type: 'error', text: 'Format email tidak valid.' });
      return;
    }
    if (newEmail.trim().toLowerCase() === (user?.email ?? '').toLowerCase()) {
      setEmailMsg({ type: 'error', text: 'Email baru sama dengan email saat ini.' });
      return;
    }
    setEmailLoading(true);
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() });
    setEmailLoading(false);
    if (error) {
      setEmailMsg({ type: 'error', text: error.message });
      return;
    }
    setEmailMsg({
      type: 'success',
      text: 'Permintaan perubahan email terkirim. Cek email lama dan baru Anda untuk konfirmasi.',
    });
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
        <button
          onClick={() => router.push('/')}
          className="mb-4 flex items-center gap-1.5 text-sm font-medium text-slate-500 transition-colors hover:text-blue-700 dark:text-slate-400"
        >
          <ArrowLeft className="h-4 w-4" />
          Kembali ke Dashboard
        </button>

        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-sky-700 text-white shadow-sm">
            <Shield className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Pengaturan Akun</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              Kelola keamanan akun: password &amp; email
            </p>
          </div>
        </div>

        {/* Change Password */}
        <Card className="mb-6 border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
              <KeyRound className="h-4 w-4 text-blue-700" />
              Ubah Password
            </h3>
            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Password Baru
                </label>
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
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Konfirmasi Password Baru
                </label>
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
              {pwMsg && <MsgBanner type={pwMsg.type} text={pwMsg.text} />}
              <Button type="submit" disabled={pwLoading} className="h-10 bg-blue-900 hover:bg-blue-800">
                {pwLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <KeyRound className="h-4 w-4" /> Simpan Password Baru
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Change Email */}
        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
              <Mail className="h-4 w-4 text-blue-700" />
              Ubah Alamat Email
            </h3>
            <p className="mb-4 text-xs text-slate-400">
              Email saat ini: <span className="font-medium text-slate-600 dark:text-slate-300">{user.email}</span>
            </p>
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Email Baru
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    type="email"
                    placeholder="nama@email.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="h-10 pl-10"
                  />
                </div>
              </div>
              {emailMsg && <MsgBanner type={emailMsg.type} text={emailMsg.text} />}
              <Button type="submit" disabled={emailLoading} className="h-10 bg-blue-900 hover:bg-blue-800">
                {emailLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                  <>
                    <Mail className="h-4 w-4" /> Kirim Konfirmasi
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}

function MsgBanner({ type, text }: { type: 'error' | 'success'; text: string }) {
  if (type === 'error') {
    return (
      <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
        <span>{text}</span>
      </div>
    );
  }
  return (
    <div className="flex items-start gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400">
      <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
      <span>{text}</span>
    </div>
  );
}
