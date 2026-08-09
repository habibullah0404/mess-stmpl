'use client';

import { useEffect, useMemo, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
  Wallet,
  Loader2,
  AlertCircle,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowUpCircle,
  HandHeart,
  RotateCw,
  TrendingUp,
  TrendingDown,
  Scale,
  Receipt,
  ExternalLink,
  Landmark,
  Search,
  Filter as FilterIcon,
  Plus,
  Pencil,
  Check,
  Banknote,
  Coins,
  Trash2,
  X,
} from 'lucide-react';
import {
  supabase,
  type Anggota,
  type Iuran,
  type Donasi,
  type Pengeluaran,
  type Pinjaman,
  getIuranStatus,
  fetchPengaturan,
  computeSaldoKas,
} from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

const CURRENT_YEAR = new Date().getFullYear();

function formatRupiah(value: string | number) {
  const n = typeof value === 'string' ? parseInt(value, 10) : value;
  if (isNaN(n)) return '-';
  return 'Rp ' + n.toLocaleString('id-ID');
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
}

type IuranRow = Iuran & { nama_anggota: string };
type DonasiRow = Donasi & { nama_anggota: string };
type PinjamanRow = Pinjaman & { nama_anggota: string };

export default function KeuanganPage() {
  const { user, profile, loading: authLoading, profileChecked } = useAuth();
  const router = useRouter();
  const isMember = !!user;

  const [iuran, setIuran] = useState<IuranRow[]>([]);
  const [donasi, setDonasi] = useState<DonasiRow[]>([]);
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rekening, setRekening] = useState<string | null>(null);
  const [saldoAwal, setSaldoAwal] = useState<string | null>(null);
  const [nominalIuran, setNominalIuran] = useState<string | null>(null);
  const [iuranSearch, setIuranSearch] = useState('');
  const [iuranFilter, setIuranFilter] = useState('semua');
  const [pinjaman, setPinjaman] = useState<PinjamanRow[]>([]);
  const [anggotaList, setAnggotaList] = useState<Anggota[]>([]);
  const [showPinjamanModal, setShowPinjamanModal] = useState(false);
  const [editingPinjaman, setEditingPinjaman] = useState<PinjamanRow | null>(null);
  const [pinjamanForm, setPinjamanForm] = useState({
    tanggal_pinjam: new Date().toISOString().split('T')[0],
    id_anggota: '',
    jumlah: '',
    keterangan: '',
    status: 'Belum Lunas',
  });
  const [savingPinjaman, setSavingPinjaman] = useState(false);
  const [pinjamanMsg, setPinjamanMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  const [updatingPinjamanId, setUpdatingPinjamanId] = useState<number | null>(null);

  const isAdmin = profile?.role === 'admin';

  useEffect(() => {
    if (!authLoading && user && profileChecked && !profile) {
      router.push('/lengkapi-profil');
      return;
    }
    if (!authLoading && user && profileChecked && profile && !profile.is_verified) {
      router.push('/menunggu-persetujuan');
    }
  }, [authLoading, user, profileChecked, profile, router]);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [anggotaRes, iuranRes, donasiRes, pengeluaranRes, pinjamanRes] = await Promise.all([
        supabase.from('Anggota').select('id, nama').order('nama'),
        supabase.from('Iuran').select('id, id_anggota, tahun, tahun_dasar, nominal, status_pembayaran, created_at'),
        supabase.from('Donasi').select('id, id_anggota, nama_acara, nominal, tanggal, created_at').order('tanggal', { ascending: false }),
        supabase.from('Pengeluaran').select('id, nama_pengeluaran, nominal, tanggal, bulan, file_url, created_at').order('tanggal', { ascending: false }),
        supabase.from('Pinjaman').select('id, tanggal_pinjam, id_anggota, jumlah, keterangan, status, created_at').order('tanggal_pinjam', { ascending: false }),
      ]);

      if (pinjamanRes.error) throw new Error(pinjamanRes.error.message);

      if (anggotaRes.error) throw new Error(anggotaRes.error.message);
      if (iuranRes.error) throw new Error(iuranRes.error.message);
      if (donasiRes.error) throw new Error(donasiRes.error.message);
      if (pengeluaranRes.error) throw new Error(pengeluaranRes.error.message);

      // PERBAIKAN: UUID String map
      const anggotaMap = new Map<string, string>();
      (anggotaRes.data as Anggota[]).forEach((a) => anggotaMap.set(a.id, a.nama));

      const iuranRows: IuranRow[] = (iuranRes.data as Iuran[]).map((i) => ({
        ...i,
        nama_anggota: anggotaMap.get(i.id_anggota) ?? 'Tidak diketahui',
      }));

      const donasiRows: DonasiRow[] = (donasiRes.data as Donasi[]).map((d) => ({
        ...d,
        nama_anggota: anggotaMap.get(d.id_anggota) ?? 'Tidak diketahui',
      }));

      setIuran(iuranRows);
      setDonasi(donasiRows);
      setPengeluaran((pengeluaranRes.data as Pengeluaran[]) ?? []);
      setAnggotaList((anggotaRes.data as Anggota[]) ?? []);

      const pinjamanRows: PinjamanRow[] = (pinjamanRes.data as Pinjaman[]).map((p) => ({
        ...p,
        nama_anggota: (p.id_anggota != null ? anggotaMap.get(p.id_anggota) : undefined) ?? 'Tidak diketahui',
      }));
      setPinjaman(pinjamanRows);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Terjadi kesalahan');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    Promise.all([
      fetchPengaturan('rekening'),
      fetchPengaturan('saldo_awal'),
      fetchPengaturan('nominal_iuran'),
    ]).then(([r, sa, ni]) => {
      setRekening(r);
      setSaldoAwal(sa);
      setNominalIuran(ni);
    });
  }, []);

  const recentPengeluaran = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    return pengeluaran.filter((p) => new Date(p.tanggal) >= sixMonthsAgo);
  }, [pengeluaran]);

  const stats = useMemo(() => {
    let totalLunas = 0;
    let totalMenunggak = 0;
    let totalBayarDiMuka = 0;
    for (const i of iuran) {
      const label = getIuranStatus(i.tahun, CURRENT_YEAR);
      if (label.text === 'Lunas') {
        totalLunas++;
      } else if (label.text === 'Bayar di Muka') {
        totalBayarDiMuka++;
      } else if (label.text === 'Menunggak') {
        totalMenunggak++;
      }
    }
    const saldo = computeSaldoKas(
      iuran,
      donasi,
      pengeluaran,
      saldoAwal,
      nominalIuran,
      CURRENT_YEAR
    );
    return {
      totalLunas,
      totalMenunggak,
      totalBayarDiMuka,
      totalDonasi: saldo.totalDonasi,
      totalPengeluaran: saldo.totalPengeluaran,
      totalIuranLunas: saldo.totalIuranLunas,
      saldoKas: saldo.saldoKas,
      saldoAwal: saldo.saldoAwal,
      jumlahLunas: saldo.jumlahLunas,
      nominalIuran: saldo.nominalIuran,
    };
  }, [iuran, donasi, pengeluaran, saldoAwal, nominalIuran]);

  const filteredIuran = useMemo(() => {
    const q = iuranSearch.trim().toLowerCase();
    return iuran.filter((row) => {
      const matchesSearch = !q || row.nama_anggota.toLowerCase().includes(q);
      if (!matchesSearch) return false;
      if (iuranFilter === 'semua') return true;
      const label = getIuranStatus(row.tahun, CURRENT_YEAR);
      if (iuranFilter === 'lunas') return label.text === 'Lunas';
      if (iuranFilter === 'belum') return label.text === 'Belum Bayar';
      if (iuranFilter === 'menunggak') return label.text === 'Menunggak';
      if (iuranFilter === 'muka') return label.text === 'Bayar di Muka';
      return true;
    });
  }, [iuran, iuranSearch, iuranFilter]);

  const totalPinjamanAktif = useMemo(
    () => pinjaman
      .filter((p) => p.status === 'Belum Lunas')
      .reduce((sum, p) => sum + (parseFloat(String(p.jumlah)) || 0), 0),
    [pinjaman]
  );

  const totalKasMasuk = useMemo(
    () => stats.saldoAwal + stats.totalDonasi + stats.totalIuranLunas,
    [stats]
  );

  const sisaKasBersih = totalKasMasuk - totalPinjamanAktif;

  const hideNominal = !isMember;

  const openAddPinjaman = () => {
    setEditingPinjaman(null);
    setPinjamanForm({
      tanggal_pinjam: new Date().toISOString().split('T')[0],
      id_anggota: '',
      jumlah: '',
      keterangan: '',
      status: 'Belum Lunas',
    });
    setPinjamanMsg(null);
    setShowPinjamanModal(true);
  };

  const openEditPinjaman = (row: PinjamanRow) => {
    setEditingPinjaman(row);
    setPinjamanForm({
      tanggal_pinjam: row.tanggal_pinjam,
      id_anggota: String(row.id_anggota ?? ''),
      jumlah: String(row.jumlah),
      keterangan: row.keterangan ?? '',
      status: row.status,
    });
    setPinjamanMsg(null);
    setShowPinjamanModal(true);
  };

  const handleSavePinjaman = async (e: React.FormEvent) => {
    e.preventDefault();
    setPinjamanMsg(null);
    if (!pinjamanForm.id_anggota) {
      setPinjamanMsg({ type: 'error', text: 'Pilih peminjam wajib diisi.' });
      return;
    }
    const jumlahNum = parseFloat(pinjamanForm.jumlah);
    if (isNaN(jumlahNum) || jumlahNum <= 0) {
      setPinjamanMsg({ type: 'error', text: 'Jumlah harus berupa angka positif.' });
      return;
    }
    setSavingPinjaman(true);
    // PERBAIKAN: Hapus parseInt(pinjamanForm.id_anggota) karena sekarang UUID string.
    const payload = {
      tanggal_pinjam: pinjamanForm.tanggal_pinjam,
      id_anggota: pinjamanForm.id_anggota,
      jumlah: jumlahNum,
      keterangan: pinjamanForm.keterangan.trim() || null,
      status: pinjamanForm.status,
    };
    let result;
    if (editingPinjaman) {
      result = await supabase.from('Pinjaman').update(payload).eq('id', editingPinjaman.id);
    } else {
      result = await supabase.from('Pinjaman').insert(payload);
    }
    setSavingPinjaman(false);
    if (result.error) {
      setPinjamanMsg({ type: 'error', text: result.error.message });
      return;
    }
    setShowPinjamanModal(false);
    await loadData();
  };

  const handleToggleStatus = async (row: PinjamanRow) => {
    setUpdatingPinjamanId(row.id);
    const newStatus = row.status === 'Belum Lunas' ? 'Lunas' : 'Belum Lunas';
    const { error } = await supabase.from('Pinjaman').update({ status: newStatus }).eq('id', row.id);
    setUpdatingPinjamanId(null);
    if (error) {
      setPinjamanMsg({ type: 'error', text: error.message });
      return;
    }
    await loadData();
  };

  const handleDeletePinjaman = async (row: PinjamanRow) => {
    if (!confirm(`Hapus pinjaman ${row.nama_anggota}?`)) return;
    const { error } = await supabase.from('Pinjaman').delete().eq('id', row.id);
    if (error) {
      setPinjamanMsg({ type: 'error', text: error.message });
      return;
    }
    await loadData();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-blue-900 to-sky-700 text-white shadow-sm">
            <Wallet className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Keuangan</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Laporan iuran, donasi &amp; kas (read-only)</p>
          </div>
        </div>

        {/* Rekening info banner */}
        {rekening && rekening.trim() && (
          <div className="mb-6 rounded-xl border border-blue-300 bg-gradient-to-r from-blue-50 to-sky-50 p-4 shadow-sm dark:border-blue-700 dark:from-blue-950/40 dark:to-sky-950/30">
            <div className="flex items-start gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-700 text-white">
                <Landmark className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-blue-900 dark:text-blue-200">Info Rekening Mess</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-blue-800 dark:text-blue-300">{rekening}</p>
              </div>
            </div>
          </div>
        )}

        {/* Summary Cards: Kas Masuk, Pinjaman Aktif, Sisa Kas Bersih */}
        <div className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Card className="overflow-hidden border-emerald-200 shadow-sm dark:border-emerald-900">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">
                <Coins className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Total Kas Masuk</p>
                <p className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100">{hideNominal ? 'Rp •••' : formatRupiah(totalKasMasuk)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-amber-200 shadow-sm dark:border-amber-900">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400">
                <Banknote className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Total Pinjaman Aktif</p>
                <p className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100">{hideNominal ? 'Rp •••' : formatRupiah(totalPinjamanAktif)}</p>
              </div>
            </CardContent>
          </Card>
          <Card className="overflow-hidden border-blue-200 shadow-sm dark:border-blue-900">
            <CardContent className="flex items-center gap-3 p-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                <Scale className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">Sisa Kas Bersih di Tangan</p>
                <p className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100">{hideNominal ? 'Rp •••' : formatRupiah(sisaKasBersih)}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Stat cards */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="Total Lunas" value={String(stats.totalLunas)} icon={CheckCircle2} tone="success" />
          <StatCard label="Menunggak" value={String(stats.totalMenunggak)} icon={XCircle} tone="error" />
          <StatCard label="Bayar di Muka" value={String(stats.totalBayarDiMuka)} icon={ArrowUpCircle} tone="info" />
          <StatCard label="Total Donasi" value={hideNominal ? 'Rp •••' : formatRupiah(stats.totalDonasi)} icon={HandHeart} tone="primary" />
        </div>

        {/* Guest notice */}
        {!authLoading && !isMember && (
          <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-900 dark:bg-amber-950/30">
            <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
              Anda melihat data keuangan dalam mode tamu. Nilai nominal disembunyikan.
            </p>
          </div>
        )}

        {/* Read-only notice */}
        {!authLoading && isMember && (
          <div className="mb-5 rounded-xl border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/30">
            <p className="text-sm font-medium text-blue-800 dark:text-blue-300">
              Halaman ini bersifat read-only. Input iuran, pengeluaran, dan donasi telah dipindahkan ke halaman Admin.
            </p>
          </div>
        )}

        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {loading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-700" />
            <p className="text-sm">Memuat data keuangan…</p>
          </div>
        ) : (
          <>
            {/* Iuran Section */}
            <section className="mb-8">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
                  <Calendar className="h-5 w-5 text-blue-700" />
                  Iuran Tahunan
                </h3>
                <button
                  onClick={loadData}
                  className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
                >
                  <RotateCw className="h-3.5 w-3.5" />
                  Refresh
                </button>
              </div>

              {/* Search & Filter */}
              <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <Input
                    placeholder="Cari nama anggota…"
                    value={iuranSearch}
                    onChange={(e) => setIuranSearch(e.target.value)}
                    className="h-9 pl-10"
                  />
                </div>
                <Select value={iuranFilter} onValueChange={setIuranFilter}>
                  <SelectTrigger className="h-9 w-full sm:w-[180px]">
                    <FilterIcon className="mr-1.5 h-3.5 w-3.5 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="semua">Semua</SelectItem>
                    <SelectItem value="lunas">Lunas</SelectItem>
                    <SelectItem value="belum">Belum Bayar</SelectItem>
                    <SelectItem value="menunggak">Menunggak</SelectItem>
                    <SelectItem value="muka">Bayar di Muka</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                <div className="overflow-y-auto max-h-96 scrollbar-thin">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                        <Th>Nama</Th>
                        <Th>Tahun Terakhir Bayar</Th>
                        <Th>Nominal</Th>
                        <Th>Status</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredIuran.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                            {iuran.length === 0 ? 'Belum ada data iuran.' : 'Tidak ada hasil yang cocok.'}
                          </td>
                        </tr>
                      ) : (
                        filteredIuran.map((row) => {
                          const label = getIuranStatus(row.tahun, CURRENT_YEAR);
                          return (
                            <tr
                              key={row.id}
                              className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20"
                            >
                              <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                                {row.nama_anggota}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                {row.tahun || '-'}
                              </td>
                              <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                                {hideNominal ? 'Rp •••' : formatRupiah(row.nominal)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={cn(
                                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                                    label.className
                                  )}
                                >
                                  {label.text}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap gap-3 text-xs">
                <LegendDot className="bg-emerald-100 text-emerald-700 border-emerald-200" label="Lunas = tahun terakhir bayar = tahun ini" />
                <LegendDot className="bg-amber-100 text-amber-700 border-amber-200" label="Belum Bayar = tahun terakhir = tahun ini − 1" />
                <LegendDot className="bg-red-100 text-red-700 border-red-200" label="Menunggak = tahun terakhir ≤ tahun ini − 2" />
                <LegendDot className="bg-sky-100 text-sky-700 border-sky-200" label="Bayar di Muka = tahun terakhir > tahun ini" />
              </div>
            </section>

            {/* Pinjaman Section */}
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-700" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Pinjaman</h3>
                <Badge variant="outline" className="border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400">
                  {pinjaman.filter((p) => p.status === 'Belum Lunas').length} aktif
                </Badge>
                {isAdmin && (
                  <Button onClick={openAddPinjaman} className="ml-auto h-8 gap-1.5 bg-blue-900 px-3 text-xs hover:bg-blue-800">
                    <Plus className="h-3.5 w-3.5" /> Tambah Pinjaman
                  </Button>
                )}
              </div>

              {pinjaman.length === 0 ? (
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Banknote className="mb-2 h-8 w-8" />
                    <p className="text-sm">Belum ada data pinjaman.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[600px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                          <Th>Tanggal Pinjam</Th>
                          <Th>Peminjam</Th>
                          <Th>Jumlah</Th>
                          <Th>Keterangan</Th>
                          <Th>Status</Th>
                          {isAdmin && <Th>Aksi</Th>}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {pinjaman.map((p) => (
                          <tr key={p.id} className="transition-colors hover:bg-amber-50/30 dark:hover:bg-amber-950/10">
                            <td className="whitespace-nowrap px-4 py-3 text-slate-600 dark:text-slate-300">
                              {formatDate(p.tanggal_pinjam)}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                              {p.nama_anggota}
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">
                              {hideNominal ? 'Rp •••' : formatRupiah(p.jumlah)}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {p.keterangan || '-'}
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={cn(
                                  'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                                  p.status === 'Lunas'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900'
                                    : 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900'
                                )}
                              >
                                {p.status === 'Lunas' ? <CheckCircle2 className="h-3 w-3" /> : <XCircle className="h-3 w-3" />}
                                {p.status}
                              </span>
                            </td>
                            {isAdmin && (
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => handleToggleStatus(p)}
                                    disabled={updatingPinjamanId === p.id}
                                    title={p.status === 'Belum Lunas' ? 'Tandai Lunas' : 'Tandai Belum Lunas'}
                                    className={cn(
                                      'inline-flex h-7 w-7 items-center justify-center rounded-lg border transition-colors',
                                      p.status === 'Belum Lunas'
                                        ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400'
                                        : 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
                                    )}
                                  >
                                    {updatingPinjamanId === p.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
                                  </button>
                                  <button
                                    onClick={() => openEditPinjaman(p)}
                                    title="Edit"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-blue-200 bg-blue-50 text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleDeletePinjaman(p)}
                                    title="Hapus"
                                    className="inline-flex h-7 w-7 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition-colors hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>

            {/* Pengeluaran Section */}
            <section className="mb-8">
              <div className="mb-4 flex items-center gap-2">
                <Receipt className="h-5 w-5 text-blue-700" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Pengeluaran (6 Bulan Terakhir)</h3>
                <Badge variant="outline" className="border-red-200 bg-red-50 text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                  {hideNominal ? 'Rp •••' : formatRupiah(recentPengeluaran.reduce((s, p) => s + (parseInt(String(p.nominal), 10) || 0), 0))}
                </Badge>
              </div>

              {recentPengeluaran.length === 0 ? (
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <Receipt className="mb-2 h-8 w-8" />
                    <p className="text-sm">Belum ada pengeluaran dalam 6 bulan terakhir.</p>
                  </CardContent>
                </Card>
              ) : (
                <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full min-w-[500px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                          <Th>Bulan</Th>
                          <Th>Nominal</Th>
                          <Th>Tanggal</Th>
                          <Th>File</Th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {recentPengeluaran.map((p) => (
                          <tr key={p.id} className="transition-colors hover:bg-red-50/30 dark:hover:bg-red-950/10">
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">
                              {p.bulan || p.nama_pengeluaran}
                            </td>
                            <td className="px-4 py-3 font-semibold text-red-600 dark:text-red-400">
                              {hideNominal ? 'Rp •••' : '- ' + formatRupiah(p.nominal)}
                            </td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                              {formatDate(p.tanggal)}
                            </td>
                            <td className="px-4 py-3">
                              {p.file_url ? (
                                <a
                                  href={p.file_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400 dark:hover:bg-blue-900/40"
                                >
                                  <ExternalLink className="h-3.5 w-3.5" />
                                  Lihat File
                                </a>
                              ) : (
                                <span className="text-xs text-slate-400">Tidak ada file</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              )}
            </section>

            {/* Donasi Section */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <HandHeart className="h-5 w-5 text-blue-700" />
                <h3 className="text-base font-semibold text-slate-800 dark:text-slate-100">Donasi Sukarela</h3>
                <Badge variant="outline" className="border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                  {donasi.length} donasi
                </Badge>
              </div>

              {donasi.length === 0 ? (
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <HandHeart className="mb-2 h-8 w-8" />
                    <p className="text-sm">Belum ada donasi tercatat.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {donasi.map((d) => (
                    <Card
                      key={d.id}
                      className="border-slate-200 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800"
                    >
                      <CardContent className="p-5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-800 to-sky-700 text-white">
                              <HandHeart className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="font-semibold text-slate-800 dark:text-slate-100">
                                {d.nama_anggota}
                              </h4>
                              <p className="text-xs text-slate-500 dark:text-slate-400">
                                {formatDate(d.tanggal)}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="mt-3 rounded-lg bg-slate-50 p-3 dark:bg-slate-800/50">
                          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Acara</p>
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {d.nama_acara}
                          </p>
                        </div>
                        <div className="mt-2 flex items-center justify-between">
                          <span className="text-xs text-slate-500 dark:text-slate-400">Nominal</span>
                          <span className="text-lg font-bold text-blue-800 dark:text-blue-400">
                            {hideNominal ? 'Rp •••' : formatRupiah(d.nominal)}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </section>
          </>
        )}

        {/* Pinjaman Modal */}
        <Dialog open={showPinjamanModal} onOpenChange={(open) => !open && setShowPinjamanModal(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Banknote className="h-5 w-5 text-blue-700" />
                {editingPinjaman ? 'Edit Pinjaman' : 'Tambah Pinjaman Baru'}
              </DialogTitle>
              <DialogDescription>
                {editingPinjaman
                  ? 'Ubah data pinjaman anggota.'
                  : 'Catat pinjaman baru dari kas mess kepada anggota.'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSavePinjaman} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tanggal Pinjam
                </label>
                <Input
                  type="date"
                  value={pinjamanForm.tanggal_pinjam}
                  onChange={(e) => setPinjamanForm((f) => ({ ...f, tanggal_pinjam: e.target.value }))}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Peminjam
                </label>
                <Select
                  value={pinjamanForm.id_anggota}
                  onValueChange={(v) => setPinjamanForm((f) => ({ ...f, id_anggota: v }))}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Pilih anggota…" />
                  </SelectTrigger>
                  <SelectContent>
                    {anggotaList.map((a) => (
                      <SelectItem key={a.id} value={String(a.id)}>
                        {a.nama}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Jumlah (Rp)
                </label>
                <Input
                  type="number"
                  placeholder="Contoh: 500000"
                  value={pinjamanForm.jumlah}
                  onChange={(e) => setPinjamanForm((f) => ({ ...f, jumlah: e.target.value }))}
                  className="h-10"
                  required
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Keterangan
                </label>
                <Input
                  type="text"
                  placeholder="Contoh: Darurat keluarga"
                  value={pinjamanForm.keterangan}
                  onChange={(e) => setPinjamanForm((f) => ({ ...f, keterangan: e.target.value }))}
                  className="h-10"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Status
                </label>
                <Select
                  value={pinjamanForm.status}
                  onValueChange={(v) => setPinjamanForm((f) => ({ ...f, status: v }))}
                >
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Belum Lunas">Belum Lunas</SelectItem>
                    <SelectItem value="Lunas">Lunas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {pinjamanMsg && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{pinjamanMsg.text}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowPinjamanModal(false)}
                  className="h-10 flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={savingPinjaman}
                  className="h-10 flex-1 bg-blue-900 hover:bg-blue-800"
                >
                  {savingPinjaman ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                    <>
                      <Check className="h-4 w-4" /> Simpan
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-400 dark:border-slate-800">
        MESS STM-PL Cirebon &middot; Keuangan
      </footer>
    </div>
  );
}

/* ---------- helpers ---------- */

function StatCard({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: typeof Wallet;
  tone: 'primary' | 'success' | 'error' | 'info';
}) {
  const tones: Record<string, string> = {
    primary: 'bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400',
    success: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400',
    error: 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400',
    info: 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400',
  };
  return (
    <Card className="overflow-hidden border-slate-200 shadow-sm transition-shadow hover:shadow-md dark:border-slate-800">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', tones[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0">
          <p className="truncate text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
          <p className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-100">{value}</p>
        </div>
      </CardContent>
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

function LegendDot({ className, label }: { className: string; label: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-medium', className)}>
      <span className="h-2 w-2 rounded-full bg-current opacity-60" />
      {label}
    </span>
  );
}
