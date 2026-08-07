'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Clock, UserCog, Anchor } from 'lucide-react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

export default function MenungguPersetujuanPage() {
  const { user, profile, loading, profileChecked, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
      return;
    }
    if (!loading && user && profileChecked && profile?.is_verified) {
      router.push('/');
    }
  }, [loading, user, profile, profileChecked, router]);

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="animate-pulse text-slate-400">Memuat…</div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-lg">
            <Clock className="h-8 w-8" />
          </div>
          <div className="mb-2 flex items-center gap-2 text-xs font-medium text-slate-400">
            <Anchor className="h-3.5 w-3.5" />
            MESS STM-PL Cirebon
          </div>
        </div>

        <Card className="border-amber-200 shadow-md">
          <CardContent className="p-8 text-center">
            <h1 className="mb-2 text-xl font-bold text-slate-800">
              Menunggu Persetujuan Admin
            </h1>
            <p className="mb-6 text-sm leading-relaxed text-slate-500">
              Akun Anda telah terdaftar, namun belum diverifikasi oleh admin.
              Anda akan mendapat akses penuh ke Dashboard dan Keuangan setelah
              admin menyetujui pendaftaran Anda.
            </p>

            <div className="mb-6 rounded-lg bg-amber-50 p-4 text-left">
              <p className="text-xs font-medium text-amber-700">
                Email terdaftar:
              </p>
              <p className="mt-1 truncate text-sm font-semibold text-amber-900">
                {user?.email}
              </p>
            </div>

            <div className="flex flex-col gap-3">
              <Link href="/edit-profil">
                <Button variant="outline" className="h-10 w-full">
                  <UserCog className="h-4 w-4" />
                  Edit Profil Saya
                </Button>
              </Link>
              <Button
                variant="ghost"
                className="h-10 w-full text-slate-500"
                onClick={handleSignOut}
              >
                Keluar Sementara
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
