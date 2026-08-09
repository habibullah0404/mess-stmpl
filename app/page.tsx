'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { Users, Search, Filter, Briefcase, Building, Phone, Ship, Loader as Loader2, CircleAlert as AlertCircle, Clock, CircleCheck as CheckCircle2, CirclePause as PauseCircle, LayoutGrid, Table as TableIcon, X, Lock, Mail, Shield, Megaphone, Wallet, CircleArrowUp as ArrowUpCircle, MapPin, ExternalLink, User as UserIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase, type Anggota, type Pengalaman, type Iuran, type Donasi, type Pengeluaran, getIuranStatus, fetchPengaturan, computeSaldoKas } from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type StatusFilter = 'all' | 'Onboard' | 'Standby' | 'Cuti';
type ViewMode = 'card' | 'table';

const STATUS_OPTIONS = ['Onboard', 'Standby', 'Cuti'] as const;
const CURRENT_YEAR_NUM = new Date().getFullYear();

function formatRupiah(value: number) {
  return 'Rp ' + value.toLocaleString('id-ID');
}

const STATUS_CONFIG: Record<
  string,
  { label: string; icon: typeof Clock; className: string }
> = {
  Onboard: {
    label: 'Onboard',
    icon: CheckCircle2,
    className:
      'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
  },
  Standby: {
    label: 'Standby',
    icon: Clock,
    className:
      'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
  },
  Cuti: {
    label: 'Cuti',
    icon: PauseCircle,
    className:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
  },
};

function getStatusConfig(status: string | null) {
  return (
    STATUS_CONFIG[status ?? ''] ?? {
      label: status ?? 'Tidak diketahui',
      icon: AlertCircle,
      className:
        'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/40 dark:text-slate-400 dark:border-slate-700',
    }
  );
}

function initials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();
}

export default function DashboardPage() {
  const { user, profile, loading: authLoading, profileChecked, refreshProfile } =
    useAuth();
  const router = useRouter();
  const isMember = !!user;
  const isAdmin = profile?.role === 'admin';

  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [updatingStatusId, setUpdatingStatusId] = useState<string | null>(null);
  const [iuranStatus, setIuranStatus] = useState<Iuran | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<Anggota | null>(null);
  const [modalPengalaman, setModalPengalaman] = useState<Pengalaman[]>([]);
  const [modalLoading, setModalLoading] = useState(false);
  const [pengumuman, setPengumuman] = useState<string | null>(null);
  const [saldoKas, setSaldoKas] = useState<number | null>(null);

  useEffect(() => {
    if (!authLoading && user && profileChecked && profile && !profile.is_verified) {
      router.push('/menunggu-persetujuan');
    }
  }, [authLoading, user, profileChecked, profile, router]);

  useEffect(() => {
    if (!authLoading && user && profileChecked && !profile) {
      router.push('/lengkapi-profil');
    }
  }, [authLoading, user, profileChecked, profile, router]);

  const loadAnggota = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('Anggota')
      .select(
        'id, nama, jabatan, nama_pt, status_bekerja, info_kontak, pengalaman_kerja, email, role, lulusan_tahun, jenis_kapal, foto_url, created_at'
      )
      .order('nama', { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setAnggota((data ?? []) as Anggota[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAnggota();
  }, [loadAnggota]);

  useEffect(() => {
    fetchPengaturan('pengumuman').then(setPengumuman);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [saldoAwalRes, nominalIuranRes, iuranRes, donasiRes, pengeluaranRes] = await Promise.all([
        fetchPengaturan('saldo_awal'),
        fetchPengaturan('nominal_iuran'),
        supabase.from('Iuran').select('id, id_anggota, tahun, tahun_dasar, nominal, status_pembayaran, created_at'),
        supabase.from('Donasi').select('id, id_anggota, nama_acara, nominal, tanggal, created_at'),
        supabase.from('Pengeluaran').select('id, nama_pengeluaran, nominal, tanggal, bulan, file_url, created_at'),
      ]);
      if (cancelled) return;
      const iuranRows = (iuranRes.data as Iuran[]) ?? [];
      const donasiRows = (donasiRes.data as Donasi[]) ?? [];
      const pengeluaranRows = (pengeluaranRes.data as Pengeluaran[]) ?? [];
      const saldo = computeSaldoKas(iuranRows, donasiRows, pengeluaranRows, saldoAwalRes, nominalIuranRes, CURRENT_YEAR_NUM);
      setSaldoKas(saldo.saldoKas);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!profile) {
      setIuranStatus(null);
      return;
    }
    supabase
      .from('Iuran')
      .select('id, id_anggota, tahun, nominal, status_pembayaran, created_at')
      .eq('id_anggota', profile.id)
      .maybeSingle()
      .then(({ data }) => {
        setIuranStatus((data as Iuran) ?? null);
      });
  }, [profile]);

  const filtered = useMemo(() => {
    return anggota.filter((a) => {
      const matchStatus =
        statusFilter === 'all' || a.status_bekerja === statusFilter;
      const matchSearch =
        !search.trim() ||
        a.nama.toLowerCase().includes(search.trim().toLowerCase());
      return matchStatus && matchSearch;
    });
  }, [anggota, search, statusFilter]);

  const counts = useMemo(() => {
    const c = { all: anggota.length, Onboard: 0, Standby: 0, Cuti: 0 };
    for (const a of anggota) {
      if (a.status_bekerja === 'Onboard') c.Onboard++;
      else if (a.status_bekerja === 'Standby') c.Standby++;
      else if (a.status_bekerja === 'Cuti') c.Cuti++;
    }
    return c;
  }, [anggota]);

  const handleSelfStatusChange = async (newStatus: string) => {
    if (!profile) return;
    const oldStatus = profile.status_bekerja ?? 'Standby';
    if (newStatus === oldStatus) return;
    const confirmed = window.confirm('Apakah Anda yakin ingin mengubah status kerja?');
    if (!confirmed) return;
    setUpdatingStatusId(profile.id);
    const { error: err } = await supabase
      .from('Anggota')
      .update({ status_bekerja: newStatus })
      .eq('id', profile.id);
    setUpdatingStatusId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setAnggota((prev) =>
      prev.map((a) =>
        a.id === profile.id ? { ...a, status_bekerja: newStatus } : a
      )
    );
    await refreshProfile();
  };

  const handleOpenProfile = async (a: Anggota) => {
    setSelectedProfile(a);
    setModalLoading(true);
    setModalPengalaman([]);
    const { data } = await supabase
      .from('Pengalaman')
      .select(
        'id, id_anggota, nama_kapal, nama_perusahaan, jenis_kapal, rute, durasi, created_at'
      )
      .eq('id_anggota', a.id)
      .order('created_at', { ascending: false });
    setModalPengalaman((data as Pengalaman[]) ?? []);
    setModalLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Pengumuman banner */}
        {pengumuman && pengumuman.trim() && (
          <div className="mb-5 rounded-xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-sm dark:border-amber-700 dark:from-amber-950/40 dark:to-orange-950/30">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                <Megaphone className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Pengumuman</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-amber-800 dark:text-amber-300">{pengumuman}</p>
              </div>
            </div>
          </div>
        )}

        {/* Guest notice */}
        {!authLoading && !isMember && (
          <div className="mb-5 flex flex-col items-start gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-white">
                <Lock className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Anda melihat data terbatas
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Kontak, perusahaan, dan pengalaman kerja disembunyikan untuk tamu.
                </p>
              </div>
            </div>
            <Link
              href="/login"
              className="shrink-0 rounded-lg bg-blue-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-blue-800"
            >
              Masuk untuk lihat semua
            </Link>
          </div>
        )}

        {/* Self status changer (member) */}
        {!authLoading && isMember && profile && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-900 text-white">
                <Users className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
                  Status kerja Anda
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  Ubah status Anda kapan saja. Perubahan langsung tersimpan.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Select
                value={profile.status_bekerja ?? 'Standby'}
                onValueChange={handleSelfStatusChange}
                disabled={updatingStatusId === profile.id}
              >
                <SelectTrigger className="h-9 w-[150px] bg-white dark:bg-slate-900">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s}>
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {updatingStatusId === profile.id && (
                <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
              )}
            </div>
          </div>
        )}

        {/* Iuran status reminder (member) */}
        {!authLoading && isMember && profile && (
          <div className="mb-5 flex flex-col gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-900 dark:bg-emerald-950/30 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-700 text-white">
                <Wallet className="h-4 w-4" />
              </div>
              <div>
                <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">
                  Status Iuran Tahun Ini ({CURRENT_YEAR_NUM})
                </p>
                <p className="text-xs text-emerald-700 dark:text-emerald-300">
                  Pengingat status pembayaran iuran pribadi Anda.
                </p>
              </div>
            </div>
            <div>
              {(() => {
                const ic = getIuranStatus(iuranStatus?.tahun ?? null, CURRENT_YEAR_NUM);
                const IuranIcon =
                  ic.text === 'Lunas'
                    ? CheckCircle2
                    : ic.text === 'Menunggak'
                      ? AlertCircle
                      : ic.text === 'Bayar di Muka'
                        ? ArrowUpCircle
                        : Clock;
                return (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-semibold',
                      ic.className
                    )}
                  >
                    <IuranIcon className="h-4 w-4" />
                    {ic.text}
                  </span>
                );
              })()}
            </div>
          </div>
        )}

        {/* Admin badge */}
        {!authLoading && isAdmin && (
          <div className="mb-4 flex items-center gap-2 text-sm font-medium text-amber-700 dark:text-amber-400">
            <Shield className="h-4 w-4" />
            Mode Admin — Kelola iuran &amp; pengeluaran di halaman Admin.
          </div>
        )}

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Anggota" value={counts.all} icon={Users} tone="primary" />
          <StatCard label="Onboard" value={counts.Onboard} icon={CheckCircle2} tone="success" />
          <StatCard label="Standby" value={counts.Standby} icon={Clock} tone="warning" />
          <StatCard label="Cuti" value={counts.Cuti} icon={PauseCircle} tone="info" />
        </div>

        {/* Saldo Kas card (members only) */}
        {!authLoading && isMember && (
          <Link href="/keuangan" className="mb-6 block">
            <Card className="overflow-hidden border-blue-200 bg-gradient-to-br from-blue-900 to-sky-800 shadow-md transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-blue-900">
              <CardContent className="flex items-center gap-4 p-5 text-white">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25">
                  <Wallet className="h-6 w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-blue-200">Saldo Kas Mess</p>
                  <p className="text-2xl font-bold">{saldoKas === null ? 'Memuat…' : formatRupiah(saldoKas)}</p>
                </div>
                <ExternalLink className="h-5 w-5 shrink-0 text-blue-200" />
              </CardContent>
            </Card>
          </Link>
        )}

        {/* Filter bar */}
        <Card className="mb-6 border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Cari nama anggota…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-10 pl-10 pr-9"
                />
                {search && (
                  <button
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
                    aria-label="Hapus pencarian"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 text-sm font-medium text-slate-500 dark:text-slate-400">
                  <Filter className="h-4 w-4" />
                  <span className="hidden sm:inline">Status</span>
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(v) => setStatusFilter(v as StatusFilter)}
                >
                  <SelectTrigger className="h-10 w-[150px] sm:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="Onboard">Onboard</SelectItem>
                    <SelectItem value="Standby">Standby</SelectItem>
                    <SelectItem value="Cuti">Cuti</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 p-1 dark:border-slate-800 dark:bg-slate-900">
                <button
                  onClick={() => setViewMode('card')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    viewMode === 'card'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  <LayoutGrid className="h-4 w-4" />
                  <span className="hidden sm:inline">Kartu</span>
                </button>
                <button
                  onClick={() => setViewMode('table')}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                    viewMode === 'table'
                      ? 'bg-blue-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
                  )}
                >
                  <TableIcon className="h-4 w-4" />
                  <span className="hidden sm:inline">Tabel</span>
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Results count */}
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Menampilkan{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-200">
              {filtered.length}
            </span>{' '}
            dari {counts.all} anggota
          </p>
          {statusFilter !== 'all' && (
            <Badge
              variant="outline"
              className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400"
            >
              Filter: {statusFilter}
            </Badge>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-700" />
            <p className="text-sm">Memuat data anggota…</p>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-red-50 dark:bg-red-950/30">
              <AlertCircle className="h-7 w-7 text-red-500" />
            </div>
            <p className="mb-1 font-semibold text-red-600 dark:text-red-400">Gagal memuat data</p>
            <p className="max-w-md text-center text-sm text-slate-500">{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
              <Users className="h-7 w-7 text-slate-400" />
            </div>
            <p className="font-semibold text-slate-600 dark:text-slate-300">Tidak ada anggota ditemukan</p>
            <p className="text-sm text-slate-400">Coba ubah kata kunci pencarian atau filter status.</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[60vh] rounded-lg pr-1">
            {viewMode === 'card' ? (
              <CardView
                anggota={filtered}
                isMember={isMember}
                onOpenProfile={handleOpenProfile}
              />
            ) : (
              <TableView anggota={filtered} isMember={isMember} />
            )}
          </div>
        )}
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-800">
        MESS STM-PL Cirebon
      </footer>

      {/* Profile Modal (CV-style) */}
      <ProfileModal
        profile={selectedProfile}
        pengalaman={modalPengalaman}
        loading={modalLoading}
        onClose={() => setSelectedProfile(null)}
      />
    </div>
  );
}

/* ---------- Stat Card ---------- */

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: number;
  icon: typeof Users;
  tone: 'primary' | 'success' | 'warning' | 'info';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    success:
      'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    warning: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400',
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  };
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
      <CardContent className="flex items-center gap-3 p-4">
        <div
          className={cn(
            'flex h-11 w-11 shrink-0 items-center justify-center rounded-xl',
            tones[tone]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">
            {label}
          </p>
          <p className="text-2xl font-bold leading-tight text-slate-800 dark:text-slate-100">
            {value}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ---------- Card View ---------- */

function CardView({
  anggota,
  isMember,
  onOpenProfile,
}: {
  anggota: Anggota[];
  isMember: boolean;
  onOpenProfile: (a: Anggota) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {anggota.map((a) => {
        const sc = getStatusConfig(a.status_bekerja);
        const StatusIcon = sc.icon;
        const jenisKapal = a.jenis_kapal;
        return (
          <Card
            key={a.id}
            className="group flex flex-col border-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg dark:border-slate-800"
          >
            <CardContent className="flex flex-1 flex-col p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {a.foto_url ? (
                    <img src={a.foto_url} alt={a.nama} className="h-12 w-12 shrink-0 rounded-xl object-cover shadow-sm" />
                  ) : (
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-800 to-sky-700 text-sm font-bold text-white shadow-sm">
                      {initials(a.nama)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h3 className="truncate font-semibold text-slate-800 dark:text-slate-100">
                      {a.nama}
                      {a.lulusan_tahun && (
                        <span className="ml-1 font-normal text-xs text-slate-500 dark:text-slate-400">
                          ({a.lulusan_tahun})
                        </span>
                      )}
                    </h3>
                    {a.jabatan && (
                      <p className="flex items-center gap-1 truncate text-xs text-slate-500 dark:text-slate-400">
                        <Briefcase className="h-3 w-3 shrink-0" />
                        {a.jabatan}
                      </p>
                    )}
                  </div>
                </div>
                <span
                  className={cn(
                    'inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                    sc.className
                  )}
                >
                  <StatusIcon className="h-3 w-3" />
                  {sc.label}
                </span>
              </div>

              {isMember ? (
                <>
                  <div className="mt-4 space-y-2 text-sm">
                    {a.nama_pt && <InfoRow icon={Building} label={a.nama_pt} />}
                    {jenisKapal && <InfoRow icon={Ship} label={jenisKapal} />}
                    {a.info_kontak && (
                      <InfoRow icon={Phone} label={a.info_kontak} />
                    )}
                    {a.email && <InfoRow icon={Mail} label={a.email} />}
                  </div>
                  {a.pengalaman_kerja && (
                    <p className="mt-3 line-clamp-2 rounded-lg bg-slate-50 p-2.5 text-xs leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                      {a.pengalaman_kerja}
                    </p>
                  )}
                </>
              ) : (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-slate-50 p-2.5 text-xs text-slate-400 dark:bg-slate-800/50">
                  <Lock className="h-3.5 w-3.5 shrink-0" />
                  <span>Detail kontak &amp; pengalaman terkunci</span>
                </div>
              )}

              {/* Lihat Profil button */}
              <div className="mt-4 flex justify-end border-t border-slate-100 pt-3 dark:border-slate-800">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenProfile(a)}
                  className="h-8 gap-1.5 text-xs font-medium text-blue-800 hover:bg-blue-50 hover:text-blue-900 dark:text-blue-400 dark:hover:bg-blue-950/40"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  Lihat Profil
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function InfoRow({ icon: Icon, label }: { icon: typeof Phone; label: string }) {
  return (
    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      <span className="truncate">{label}</span>
    </div>
  );
}

/* ---------- Table View ---------- */

function TableView({
  anggota,
  isMember,
}: {
  anggota: Anggota[];
  isMember: boolean;
}) {
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[600px] text-left text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
              <Th>Nama</Th>
              <Th>Jabatan</Th>
              <Th>Status</Th>
              {isMember && <Th>Perusahaan</Th>}
              {isMember && <Th>Kontak</Th>}
              {isMember && <Th>Pengalaman</Th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {anggota.map((a) => {
              const sc = getStatusConfig(a.status_bekerja);
              const StatusIcon = sc.icon;
              return (
                <tr
                  key={a.id}
                  className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      {a.foto_url ? (
                        <img src={a.foto_url} alt={a.nama} className="h-9 w-9 shrink-0 rounded-lg object-cover" />
                      ) : (
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-800 to-sky-700 text-xs font-bold text-white">
                          {initials(a.nama)}
                        </div>
                      )}
                      <span className="font-medium text-slate-800 dark:text-slate-100">
                        {a.nama}
                        {a.lulusan_tahun && (
                          <span className="ml-1 font-normal text-xs text-slate-500 dark:text-slate-400">
                            ({a.lulusan_tahun})
                          </span>
                        )}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                    {a.jabatan ?? '-'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                        sc.className
                      )}
                    >
                      <StatusIcon className="h-3 w-3" />
                      {sc.label}
                    </span>
                  </td>
                  {isMember && (
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {a.nama_pt ?? '-'}
                    </td>
                  )}
                  {isMember && (
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      {a.info_kontak ?? '-'}
                    </td>
                  )}
                  {isMember && (
                    <td className="px-4 py-3">
                      <span className="line-clamp-2 max-w-[240px] text-slate-500 dark:text-slate-400">
                        {a.pengalaman_kerja ?? '-'}
                      </span>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="whitespace-nowrap px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
      {children}
    </th>
  );
}

/* ---------- Profile Modal (CV-style) ---------- */

function ProfileModal({
  profile,
  pengalaman,
  loading,
  onClose,
}: {
  profile: Anggota | null;
  pengalaman: Pengalaman[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Dialog open={!!profile} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto border-0 p-0 sm:rounded-2xl">
        {profile && (
          <>
            {/* CV Header */}
            <div className="relative bg-gradient-to-r from-blue-900 via-blue-800 to-sky-800 p-6 text-white sm:p-8">
              <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
                {/* Avatar */}
                {profile.foto_url ? (
                  <img src={profile.foto_url} alt={profile.nama} className="h-24 w-24 shrink-0 rounded-full object-cover shadow-lg ring-4 ring-white/25" />
                ) : (
                  <div className="flex h-24 w-24 shrink-0 items-center justify-center rounded-full bg-white/15 text-3xl font-bold shadow-lg ring-4 ring-white/25 backdrop-blur">
                    {initials(profile.nama)}
                  </div>
                )}
                
                <div className="text-center sm:text-left">
                  <h2 className="text-2xl font-bold sm:text-3xl">{profile.nama}</h2>
                  {profile.jabatan && (
                    <p className="mt-1 flex items-center justify-center gap-1.5 text-blue-200 sm:justify-start">
                      <Briefcase className="h-4 w-4" />
                      {profile.jabatan}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap justify-center gap-2 sm:justify-start">
                    {profile.status_bekerja && (
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
                          getStatusConfig(profile.status_bekerja).className
                        )}
                      >
                        {profile.status_bekerja}
                      </span>
                    )}
                    {profile.role === 'admin' && (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-300/30 bg-amber-400/20 px-2.5 py-0.5 text-xs font-semibold text-amber-200">
                        <Shield className="h-3 w-3" />
                        Admin
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* CV Body */}
            <div className="space-y-6 p-6 sm:p-8">
              {/* Personal Info */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <UserIcon className="h-4 w-4" />
                  Informasi Pribadi
                </h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {profile.email && (
                    <CvInfoItem icon={Mail} label="Email" value={profile.email} />
                  )}
                  {profile.info_kontak && (
                    <CvInfoItem
                      icon={Phone}
                      label="Kontak"
                      value={profile.info_kontak}
                    />
                  )}
                  {profile.nama_pt && (
                    <CvInfoItem
                      icon={Building}
                      label="Perusahaan"
                      value={profile.nama_pt}
                    />
                  )}
                  {profile.jenis_kapal && (
                    <CvInfoItem
                      icon={Ship}
                      label="Jenis Kapal"
                      value={profile.jenis_kapal}
                    />
                  )}
                  {profile.lulusan_tahun && (
                    <CvInfoItem
                      icon={UserIcon}
                      label="Lulusan Tahun"
                      value={profile.lulusan_tahun}
                    />
                  )}
                  {profile.status_bekerja && (
                    <CvInfoItem
                      icon={Briefcase}
                      label="Status Bekerja"
                      value={profile.status_bekerja}
                    />
                  )}
                </div>
              </section>

              {/* Work Experience */}
              <section>
                <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  <Ship className="h-4 w-4" />
                  Riwayat Pengalaman Kerja
                </h3>
                {loading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
                  </div>
                ) : pengalaman.length === 0 ? (
                  <p className="rounded-lg bg-slate-50 py-6 text-center text-sm text-slate-400 dark:bg-slate-800/50">
                    Belum ada riwayat pengalaman kerja.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {pengalaman.map((p, idx) => (
                      <div
                        key={p.id}
                        className="relative rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                      >
                        <div className="flex items-start gap-3">
                          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">
                            {idx + 1}
                          </div>
                          <div className="min-w-0 flex-1">
                            <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                              {p.nama_kapal}
                            </h4>
                            {p.nama_perusahaan && (
                              <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                <Briefcase className="h-3 w-3" />
                                {p.nama_perusahaan}
                              </p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              {p.jenis_kapal && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                                  <Ship className="h-3 w-3" />
                                  {p.jenis_kapal}
                                </span>
                              )}
                              {p.rute && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-700 dark:bg-sky-950/40 dark:text-sky-400">
                                  <MapPin className="h-3 w-3" />
                                  {p.rute}
                                </span>
                              )}
                              {p.durasi && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-slate-200 px-2 py-0.5 text-xs font-medium text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                                  <Clock className="h-3 w-3" />
                                  {p.durasi}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Pengalaman kerja summary */}
              {profile.pengalaman_kerja && (
                <section>
                  <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    <Briefcase className="h-4 w-4" />
                    Ringkasan Pengalaman
                  </h3>
                  <p className="rounded-lg bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 dark:bg-slate-800/50 dark:text-slate-300">
                    {profile.pengalaman_kerja}
                  </p>
                </section>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function CvInfoItem({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Mail;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400">{label}</p>
        <p className="truncate text-sm font-semibold text-slate-700 dark:text-slate-200">
          {value}
        </p>
      </div>
    </div>
  );
}
