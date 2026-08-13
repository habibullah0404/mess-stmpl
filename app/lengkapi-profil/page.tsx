'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Anchor, User, Briefcase, Ship, Phone, Mail, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { supabase, LULUSAN_TAHUN_OPTIONS } from '@/lib/supabase';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export default function LengkapiProfilPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [namaPt, setNamaPt] = useState('');
  const [statusBekerja, setStatusBekerja] = useState('Standby');
  const [infoKontak, setInfoKontak] = useState('');
  const [lulusanTahun, setLulusanTahun] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nama.trim()) {
      setError('Nama wajib diisi.');
      return;
    }
    if (!user?.id || !user?.email) {
      setError('Sesi tidak valid. Silakan login kembali.');
      return;
    }
    setLoading(true);

    const { data, error: err } = await supabase
      .from('Anggota')
      .upsert({
        id: user.id,
        nama: nama.trim(),
        jabatan: jabatan.trim() || null,
        nama_pt: namaPt.trim() || null,
        status_bekerja: statusBekerja,
        info_kontak: infoKontak.trim() || null,
        email: user.email,
        role: 'member',
        lulusan_tahun: lulusanTahun || null,
      }, { onConflict: 'id' })
      .select('id, nama, email, role')
      .single();
      
    setLoading(false);
    if (err) {
      setError(err.message);
      return;
    }
    await refreshProfile();
    router.push('/');
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-slate-100 to-slate-200 px-4 py-8">
      <div className="w-full max-w-lg">
        <div className="mb-6 flex flex-col items-center text-center">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-900 to-sky-700 text-white shadow-lg">
            <Anchor className="h-7 w-7" />
          </div>
          <h1 className="text-xl font-bold text-slate-800">Lengkapi Profil Anda</h1>
          <p className="max-w-sm text-sm text-slate-500">
            Email Anda belum terdaftar di data anggota. Silakan lengkapi data berikut untuk mulai menggunakan aplikasi.
          </p>
        </div>

        <Card className="border-slate-200 shadow-sm">
          <CardContent className="p-6">
            <div className="mb-4 flex items-center gap-2 rounded-lg bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-950/30 dark:text-blue-300">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate font-medium">{user?.email}</span>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <Field label="Nama Lengkap" icon={User} required>
                <Input
                  placeholder="Nama lengkap Anda"
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  className="h-10 pl-10"
                />
              </Field>

              <Field label="Jabatan" icon={Briefcase}>
                <Input
                  placeholder="Contoh: Helmsman, AB, Masinis"
                  value={jabatan}
                  onChange={(e) => setJabatan(e.target.value)}
                  className="h-10 pl-10"
                />
              </Field>

              <Field label="Nama Perusahaan / PT" icon={Ship}>
                <Input
                  placeholder="Contoh: PT Maritim Jaya"
                  value={namaPt}
                  onChange={(e) => setNamaPt(e.target.value)}
                  className="h-10 pl-10"
                />
              </Field>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Status Bekerja</label>
                <Select value={statusBekerja} onValueChange={setStatusBekerja}>
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Onboard">Onboard</SelectItem>
                    <SelectItem value="Standby">Standby</SelectItem>
                    <SelectItem value="Cuti">Cuti</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Field label="Info Kontak (No. HP)" icon={Phone}>
                <Input
                  placeholder="Contoh: 081234567890"
                  value={infoKontak}
                  onChange={(e) => setInfoKontak(e.target.value)}
                  className="h-10 pl-10"
                />
              </Field>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">Tahun Lulus</label>
                <Select value={lulusanTahun} onValueChange={setLulusanTahun}>
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="Pilih tahun lulus" />
                  </SelectTrigger>
                  <SelectContent className="max-h-[280px]">
                    {LULUSAN_TAHUN_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={opt}>
                        {opt}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Simpan &amp; Lanjut
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  required,
  children,
}: {
  label: string;
  icon: typeof User;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-medium text-slate-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        {children}
      </div>
    </div>
  );
}
