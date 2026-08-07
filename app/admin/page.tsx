'use client';

import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  Shield,
  Users,
  Wallet,
  Receipt,
  HandHeart,
  Megaphone,
  Landmark,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Upload,
  Trash2,
  Plus,
  ExternalLink,
  RotateCw,
  Check,
  X,
  Search,
  Filter as FilterIcon,
} from 'lucide-react';
import {
  supabase,
  type Anggota,
  type Iuran,
  type Donasi,
  type Pengeluaran,
  type Pengaturan,
  getIuranStatus,
  BULAN_OPTIONS,
  fetchPengaturan,
  upsertPengaturan,
  exportAnggotaToCSV,
} from '@/lib/supabase';
import { useAuth } from '@/components/auth-provider';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

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

type Tab = 'anggota' | 'iuran' | 'pengeluaran' | 'donasi' | 'pengaturan';

export default function AdminPage() {
  const { user, profile, loading: authLoading, profileChecked } = useAuth();
  const router = useRouter();

  const isAdmin = profile?.role === 'admin';
  const isVerified = profile?.is_verified === true;

  const [activeTab, setActiveTab] = useState<Tab>('anggota');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Anggota state
  const [anggota, setAnggota] = useState<Anggota[]>([]);
  const [loadingAnggota, setLoadingAnggota] = useState(true);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  // Iuran state
  const [iuran, setIuran] = useState<IuranRow[]>([]);
  const [loadingIuran, setLoadingIuran] = useState(true);
  const [updatingIuranId, setUpdatingIuranId] = useState<number | null>(null);
  const [iuranSearch, setIuranSearch] = useState('');
  const [iuranFilter, setIuranFilter] = useState('semua');

  // Add Iuran modal state
  const [showAddIuran, setShowAddIuran] = useState(false);
  const [addIuranAnggota, setAddIuranAnggota] = useState('');
  const [addIuranTahunDasar, setAddIuranTahunDasar] = useState(String(CURRENT_YEAR));
  const [savingNewIuran, setSavingNewIuran] = useState(false);

  // Pengeluaran state
  const [pengeluaran, setPengeluaran] = useState<Pengeluaran[]>([]);
  const [loadingPengeluaran, setLoadingPengeluaran] = useState(true);
  const [expBulan, setExpBulan] = useState('');
  const [expTahun, setExpTahun] = useState(String(CURRENT_YEAR));
  const [expNominal, setExpNominal] = useState('');
  const [expFile, setExpFile] = useState<File | null>(null);
  const [savingExpense, setSavingExpense] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Donasi state
  const [donasi, setDonasi] = useState<DonasiRow[]>([]);
  const [loadingDonasi, setLoadingDonasi] = useState(true);
  const [donNamaAnggota, setDonNamaAnggota] = useState('');
  const [donAcara, setDonAcara] = useState('');
  const [donNominal, setDonNominal] = useState('');
  const [donTanggal, setDonTanggal] = useState(new Date().toISOString().split('T')[0]);
  const [savingDonasi, setSavingDonasi] = useState(false);

  // Pengaturan state
  const [pengumuman, setPengumuman] = useState('');
  const [rekening, setRekening] = useState('');
  const [saldoAwal, setSaldoAwal] = useState('');
  const [nominalIuran, setNominalIuran] = useState('');
  const [loadingPengaturan, setLoadingPengaturan] = useState(true);
  const [savingPengumuman, setSavingPengumuman] = useState(false);
  const [savingRekening, setSavingRekening] = useState(false);
  const [savingSaldoAwal, setSavingSaldoAwal] = useState(false);
  const [savingNominalIuran, setSavingNominalIuran] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
      return;
    }
    if (!authLoading && user && profileChecked && !profile) {
      router.push('/lengkapi-profil');
      return;
    }
    if (!authLoading && user && profileChecked && profile && (!isAdmin || !isVerified)) {
      router.push('/');
    }
  }, [authLoading, user, profile, profileChecked, isAdmin, isVerified, router]);

  const loadAnggota = useCallback(async () => {
    setLoadingAnggota(true);
    const { data, error: err } = await supabase
      .from('Anggota')
      .select('id, nama, jabatan, nama_pt, status_bekerja, info_kontak, pengalaman_kerja, email, role, lulusan_tahun, jenis_kapal, is_verified, created_at')
      .order('nama', { ascending: true });
    if (err) {
      setError(err.message);
    } else {
      setAnggota((data ?? []) as Anggota[]);
    }
    setLoadingAnggota(false);
  }, []);

  const loadIuran = useCallback(async () => {
    setLoadingIuran(true);
    const [anggotaRes, iuranRes] = await Promise.all([
      supabase.from('Anggota').select('id, nama').order('nama'),
      supabase.from('Iuran').select('id, id_anggota, tahun, tahun_dasar, nominal, status_pembayaran, created_at'),
    ]);
    if (iuranRes.error) {
      setError(iuranRes.error.message);
    } else {
      const anggotaMap = new Map<number, string>();
      (anggotaRes.data as Anggota[]).forEach((a) => anggotaMap.set(a.id, a.nama));
      const rows: IuranRow[] = (iuranRes.data as Iuran[]).map((i) => ({
        ...i,
        nama_anggota: anggotaMap.get(i.id_anggota) ?? 'Tidak diketahui',
      }));
      setIuran(rows);
    }
    setLoadingIuran(false);
  }, []);

  const loadPengeluaran = useCallback(async () => {
    setLoadingPengeluaran(true);
    const { data, error: err } = await supabase
      .from('Pengeluaran')
      .select('id, nama_pengeluaran, nominal, tanggal, bulan, file_url, created_at')
      .order('tanggal', { ascending: false });
    if (err) {
      setError(err.message);
    } else {
      setPengeluaran((data as Pengeluaran[]) ?? []);
    }
    setLoadingPengeluaran(false);
  }, []);

  const loadDonasi = useCallback(async () => {
    setLoadingDonasi(true);
    const [anggotaRes, donasiRes] = await Promise.all([
      supabase.from('Anggota').select('id, nama').order('nama'),
      supabase.from('Donasi').select('id, id_anggota, nama_acara, nominal, tanggal, created_at').order('tanggal', { ascending: false }),
    ]);
    if (donasiRes.error) {
      setError(donasiRes.error.message);
    } else {
      const anggotaMap = new Map<number, string>();
      (anggotaRes.data as Anggota[]).forEach((a) => anggotaMap.set(a.id, a.nama));
      const rows: DonasiRow[] = (donasiRes.data as Donasi[]).map((d) => ({
        ...d,
        nama_anggota: anggotaMap.get(d.id_anggota) ?? 'Tidak diketahui',
      }));
      setDonasi(rows);
    }
    setLoadingDonasi(false);
  }, []);

  const loadPengaturan = useCallback(async () => {
    setLoadingPengaturan(true);
    const [p, r, sa, ni] = await Promise.all([
      fetchPengaturan('pengumuman'),
      fetchPengaturan('rekening'),
      fetchPengaturan('saldo_awal'),
      fetchPengaturan('nominal_iuran'),
    ]);
    setPengumuman(p ?? '');
    setRekening(r ?? '');
    setSaldoAwal(sa ?? '');
    setNominalIuran(ni ?? '');
    setLoadingPengaturan(false);
  }, []);

  useEffect(() => {
    if (isAdmin && isVerified) {
      loadAnggota();
      loadIuran();
      loadPengeluaran();
      loadDonasi();
      loadPengaturan();
    }
  }, [isAdmin, isVerified, loadAnggota, loadIuran, loadPengeluaran, loadDonasi, loadPengaturan]);

  // --- Anggota actions ---
  const handleToggleVerified = async (id: number, current: boolean) => {
    setUpdatingId(id);
    const { error: err } = await supabase
      .from('Anggota')
      .update({ is_verified: !current })
      .eq('id', id);
    setUpdatingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setAnggota((prev) => prev.map((a) => (a.id === id ? { ...a, is_verified: !current } : a)));
    setSuccessMsg(current ? 'Anggota dibatalkan verifikasinya' : 'Anggota diverifikasi');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleToggleRole = async (id: number, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    setUpdatingId(id);
    const { error: err } = await supabase
      .from('Anggota')
      .update({ role: newRole })
      .eq('id', id);
    setUpdatingId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setAnggota((prev) => prev.map((a) => (a.id === id ? { ...a, role: newRole } : a)));
    setSuccessMsg(`Role diubah menjadi ${newRole}`);
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  // --- Iuran actions ---
  const handleTahunChange = async (id: number, newTahun: string) => {
    setUpdatingIuranId(id);
    const { error: err } = await supabase
      .from('Iuran')
      .update({ tahun: newTahun })
      .eq('id', id);
    setUpdatingIuranId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setIuran((prev) => prev.map((i) => (i.id === id ? { ...i, tahun: newTahun } : i)));
  };

  const handleTahunDasarChange = async (id: number, newTahunDasar: string) => {
    setUpdatingIuranId(id);
    const { error: err } = await supabase
      .from('Iuran')
      .update({ tahun_dasar: newTahunDasar })
      .eq('id', id);
    setUpdatingIuranId(null);
    if (err) {
      setError(err.message);
      return;
    }
    setIuran((prev) => prev.map((i) => (i.id === id ? { ...i, tahun_dasar: newTahunDasar } : i)));
  };

  const anggotaTanpaIuran = useMemo(() => {
    const iuranAnggotaIds = new Set(iuran.map((i) => i.id_anggota));
    return anggota.filter((a) => !iuranAnggotaIds.has(a.id));
  }, [anggota, iuran]);

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

  const handleAddIuran = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!addIuranAnggota) {
      setError('Pilih anggota terlebih dahulu.');
      return;
    }
    setSavingNewIuran(true);
    const { error: err } = await supabase.from('Iuran').insert({
      id_anggota: parseInt(addIuranAnggota, 10),
      tahun: addIuranTahunDasar,
      tahun_dasar: addIuranTahunDasar,
      nominal: nominalIuran || '0',
      status_pembayaran: 'Lunas',
    });
    setSavingNewIuran(false);
    if (err) {
      setError(err.message);
      return;
    }
    setSuccessMsg('Iuran baru berhasil ditambahkan.');
    setTimeout(() => setSuccessMsg(null), 3000);
    setShowAddIuran(false);
    setAddIuranAnggota('');
    setAddIuranTahunDasar(String(CURRENT_YEAR));
    loadIuran();
  };

  // --- Pengeluaran actions ---
  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expBulan || !expTahun || !expNominal.trim()) return;
    setSavingExpense(true);
    setError(null);

    const bulanLabel = `${expBulan} ${expTahun}`;
    const tanggal = `${expTahun}-${String(BULAN_OPTIONS.indexOf(expBulan) + 1).padStart(2, '0')}-01`;
    let fileUrl: string | null = null;

    if (expFile) {
      const ext = expFile.name.split('.').pop();
      const fileName = `pengeluaran/${bulanLabel.replace(/\s/g, '_')}-${Date.now()}.${ext}`;
      const { error: uploadErr } = await supabase.storage
        .from('dokumen')
        .upload(fileName, expFile, { cacheControl: '3600', upsert: false });
      if (uploadErr) {
        setError('Gagal upload file: ' + uploadErr.message);
        setSavingExpense(false);
        return;
      }
      const { data: pubData } = supabase.storage.from('dokumen').getPublicUrl(fileName);
      fileUrl = pubData.publicUrl;
    }

    const { data, error: insertErr } = await supabase
      .from('Pengeluaran')
      .insert({ nama_pengeluaran: bulanLabel, nominal: expNominal.trim(), tanggal, bulan: bulanLabel, file_url: fileUrl })
      .select('id, nama_pengeluaran, nominal, tanggal, bulan, file_url, created_at')
      .single();

    setSavingExpense(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    setPengeluaran((prev) => [data as Pengeluaran, ...prev]);
    setExpBulan('');
    setExpTahun(String(CURRENT_YEAR));
    setExpNominal('');
    setExpFile(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    setSuccessMsg('Pengeluaran ditambahkan');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeleteExpense = async (id: number, fileUrl: string | null) => {
    if (!window.confirm('Hapus laporan pengeluaran ini?')) return;
    if (fileUrl) {
      try {
        const url = new URL(fileUrl);
        const idx = url.pathname.indexOf('/dokumen/');
        if (idx !== -1) {
          const filePath = decodeURIComponent(url.pathname.slice(idx + '/dokumen/'.length));
          await supabase.storage.from('dokumen').remove([filePath]);
        }
      } catch {
        // ignore
      }
    }
    const { error: err } = await supabase.from('Pengeluaran').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    setPengeluaran((prev) => prev.filter((p) => p.id !== id));
  };

  // --- Donasi actions ---
  const handleAddDonasi = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donNamaAnggota || !donAcara.trim() || !donNominal.trim() || !donTanggal) return;
    setSavingDonasi(true);
    setError(null);
    const idAnggota = parseInt(donNamaAnggota, 10);
    const { data, error: insertErr } = await supabase
      .from('Donasi')
      .insert({ id_anggota: idAnggota, nama_acara: donAcara.trim(), nominal: donNominal.trim(), tanggal: donTanggal })
      .select('id, id_anggota, nama_acara, nominal, tanggal, created_at')
      .single();
    setSavingDonasi(false);
    if (insertErr) {
      setError(insertErr.message);
      return;
    }
    const nama = anggota.find((a) => a.id === idAnggota)?.nama ?? 'Tidak diketahui';
    setDonasi((prev) => [{ ...(data as Donasi), nama_anggota: nama }, ...prev]);
    setDonNamaAnggota('');
    setDonAcara('');
    setDonNominal('');
    setDonTanggal(new Date().toISOString().split('T')[0]);
    setSuccessMsg('Donasi ditambahkan');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleDeleteDonasi = async (id: number) => {
    if (!window.confirm('Hapus data donasi ini?')) return;
    const { error: err } = await supabase.from('Donasi').delete().eq('id', id);
    if (err) {
      setError(err.message);
      return;
    }
    setDonasi((prev) => prev.filter((d) => d.id !== id));
  };

  // --- Pengaturan actions ---
  const handleSavePengumuman = async () => {
    setSavingPengumuman(true);
    const { error: err } = await upsertPengaturan('pengumuman', pengumuman);
    setSavingPengumuman(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccessMsg('Pengumuman disimpan');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSaveRekening = async () => {
    setSavingRekening(true);
    const { error: err } = await upsertPengaturan('rekening', rekening);
    setSavingRekening(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccessMsg('Info rekening disimpan');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSaveSaldoAwal = async () => {
    setSavingSaldoAwal(true);
    const { error: err } = await upsertPengaturan('saldo_awal', saldoAwal);
    setSavingSaldoAwal(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccessMsg('Saldo awal migrasi disimpan');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleSaveNominalIuran = async () => {
    setSavingNominalIuran(true);
    const { error: err } = await upsertPengaturan('nominal_iuran', nominalIuran);
    setSavingNominalIuran(false);
    if (err) {
      setError(err);
      return;
    }
    setSuccessMsg('Nominal iuran tahunan disimpan');
    setTimeout(() => setSuccessMsg(null), 3000);
  };

  const handleExportCSV = () => {
    exportAnggotaToCSV(anggota);
  };

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  if (!isAdmin || !isVerified) {
    return null;
  }

  const tabs: { key: Tab; label: string; icon: typeof Shield }[] = [
    { key: 'anggota', label: 'Verifikasi Anggota', icon: Users },
    { key: 'iuran', label: 'Iuran', icon: Wallet },
    { key: 'pengeluaran', label: 'Pengeluaran', icon: Receipt },
    { key: 'donasi', label: 'Donasi', icon: HandHeart },
    { key: 'pengaturan', label: 'Pengaturan', icon: Megaphone },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-sm">
              <Shield className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Panel Admin</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Pusat kendali anggota &amp; keuangan</p>
            </div>
          </div>
          <Button
            onClick={handleExportCSV}
            className="h-10 shrink-0 bg-emerald-700 hover:bg-emerald-800"
          >
            <Download className="h-4 w-4" />
            Download Data Member (CSV)
          </Button>
        </div>

        {/* Messages */}
        {error && (
          <div className="mb-5 flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto shrink-0 text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mb-5 flex items-center gap-2 rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === tab.key
                    ? 'bg-blue-900 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-50 dark:text-slate-400 dark:hover:bg-slate-800'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab content */}
        {activeTab === 'anggota' && (
          <section>
            {loadingAnggota ? (
              <LoadingSpinner text="Memuat data anggota…" />
            ) : (
              <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[700px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                        <Th>Nama</Th>
                        <Th>Email</Th>
                        <Th>Role</Th>
                        <Th>Verified</Th>
                        <Th>Aksi</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {anggota.map((a) => (
                        <tr key={a.id} className="transition-colors hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{a.nama}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{a.email ?? '-'}</td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold',
                              a.role === 'admin'
                                ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-400'
                                : 'border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/40 dark:text-slate-400'
                            )}>
                              {a.role ?? 'member'}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            {a.is_verified ? (
                              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-400">
                                <Check className="h-3 w-3" /> Ya
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 dark:border-red-900 dark:bg-red-950/40 dark:text-red-400">
                                <X className="h-3 w-3" /> Tidak
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {updatingId === a.id ? (
                                <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
                              ) : (
                                <>
                                  <button
                                    onClick={() => handleToggleVerified(a.id, a.is_verified ?? false)}
                                    className={cn(
                                      'flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-colors',
                                      a.is_verified
                                        ? 'bg-red-50 text-red-600 hover:bg-red-100 dark:bg-red-950/30 dark:text-red-400'
                                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400'
                                    )}
                                  >
                                    {a.is_verified ? <><X className="h-3.5 w-3.5" /> Tolak</> : <><Check className="h-3.5 w-3.5" /> Setujui</>}
                                  </button>
                                  <button
                                    onClick={() => handleToggleRole(a.id, a.role ?? 'member')}
                                    className="flex items-center gap-1 rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400"
                                  >
                                    {a.role === 'admin' ? 'Jadikan Member' : 'Jadikan Admin'}
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        )}

        {activeTab === 'iuran' && (
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
                <Wallet className="h-5 w-5 text-blue-700" />
                Update Tahun Terakhir Iuran
              </h3>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowAddIuran(true)} className="flex items-center gap-1.5 rounded-lg bg-blue-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-800">
                  <Plus className="h-3.5 w-3.5" /> Tambah Iuran Baru
                </button>
                <button onClick={loadIuran} className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800">
                  <RotateCw className="h-3.5 w-3.5" /> Refresh
                </button>
              </div>
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

            {loadingIuran ? (
              <LoadingSpinner text="Memuat data iuran…" />
            ) : (
              <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                <div className="overflow-y-auto max-h-96">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead className="sticky top-0 z-10">
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                        <Th>Nama</Th>
                        <Th>Tahun Terakhir</Th>
                        <Th>Tahun Dasar</Th>
                        <Th>Status</Th>
                        <Th>Ubah Tahun</Th>
                        <Th>Ubah Tahun Dasar</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {filteredIuran.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                            {iuran.length === 0 ? 'Belum ada data iuran.' : 'Tidak ada hasil yang cocok.'}
                          </td>
                        </tr>
                      ) : (
                        filteredIuran.map((row) => {
                        const label = getIuranStatus(row.tahun, CURRENT_YEAR);
                        return (
                          <tr key={row.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
                            <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{row.nama_anggota}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.tahun || '-'}</td>
                            <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.tahun_dasar || '-'}</td>
                            <td className="px-4 py-3">
                              <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold', label.className)}>
                                {label.text}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Select value={row.tahun || ''} onValueChange={(v) => handleTahunChange(row.id, v)} disabled={updatingIuranId === row.id}>
                                <SelectTrigger className="h-8 w-[110px] text-xs">
                                  {updatingIuranId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue placeholder="Pilih tahun" />}
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - 5 + i).map((y) => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                            <td className="px-4 py-3">
                              <Select value={row.tahun_dasar || ''} onValueChange={(v) => handleTahunDasarChange(row.id, v)} disabled={updatingIuranId === row.id}>
                                <SelectTrigger className="h-8 w-[110px] text-xs">
                                  {updatingIuranId === row.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <SelectValue placeholder="Pilih tahun dasar" />}
                                </SelectTrigger>
                                <SelectContent>
                                  {Array.from({ length: 15 }, (_, i) => CURRENT_YEAR - 5 + i).map((y) => (
                                    <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </td>
                          </tr>
                        );
                      })
                    )}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        )}

        {activeTab === 'pengeluaran' && (
          <section>
            <Card className="mb-4 border-slate-200 shadow-sm dark:border-slate-800">
              <CardContent className="p-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Plus className="h-4 w-4 text-blue-700" /> Tambah Laporan Pengeluaran
                </h4>
                <form onSubmit={handleAddExpense} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Bulan</label>
                      <Select value={expBulan} onValueChange={setExpBulan}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Pilih bulan" /></SelectTrigger>
                        <SelectContent>{BULAN_OPTIONS.map((b) => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Tahun</label>
                      <Select value={expTahun} onValueChange={setExpTahun}>
                        <SelectTrigger className="h-10"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - 2 + i).map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Total Nominal</label>
                      <Input type="number" placeholder="Contoh: 500000" value={expNominal} onChange={(e) => setExpNominal(e.target.value)} className="h-10" />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-slate-700">Upload File <span className="text-xs font-normal text-slate-400">(PDF/Excel, opsional)</span></label>
                    <div className="flex items-center gap-3">
                      <input ref={fileInputRef} type="file" accept=".pdf,.xlsx,.xls,.csv" onChange={(e) => setExpFile(e.target.files?.[0] ?? null)} className="block w-full text-sm text-slate-500 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-medium file:text-blue-700 hover:file:bg-blue-100 dark:text-slate-400 dark:file:bg-blue-950/40 dark:file:text-blue-400" />
                      {expFile && (
                        <button type="button" onClick={() => { setExpFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} className="shrink-0 rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  <Button type="submit" disabled={savingExpense} className="h-10 bg-blue-900 hover:bg-blue-800">
                    {savingExpense ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Upload className="h-4 w-4" /> Simpan Pengeluaran</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {loadingPengeluaran ? (
              <LoadingSpinner text="Memuat data pengeluaran…" />
            ) : pengeluaran.length === 0 ? (
              <EmptyState icon={Receipt} text="Belum ada pengeluaran tercatat." />
            ) : (
              <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                        <Th>Bulan</Th><Th>Nominal</Th><Th>Tanggal</Th><Th>File</Th><Th>Aksi</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {pengeluaran.map((p) => (
                        <tr key={p.id} className="hover:bg-red-50/30 dark:hover:bg-red-950/10">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{p.bulan || p.nama_pengeluaran}</td>
                          <td className="px-4 py-3 font-semibold text-red-600 dark:text-red-400">- {formatRupiah(p.nominal)}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(p.tanggal)}</td>
                          <td className="px-4 py-3">
                            {p.file_url ? (
                              <a href={p.file_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-medium text-blue-700 hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-950/40 dark:text-blue-400">
                                <ExternalLink className="h-3.5 w-3.5" /> Lihat
                              </a>
                            ) : <span className="text-xs text-slate-400">-</span>}
                          </td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleDeleteExpense(p.id, p.file_url)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        )}

        {activeTab === 'donasi' && (
          <section>
            <Card className="mb-4 border-slate-200 shadow-sm dark:border-slate-800">
              <CardContent className="p-5">
                <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                  <Plus className="h-4 w-4 text-blue-700" /> Tambah Donasi
                </h4>
                <form onSubmit={handleAddDonasi} className="space-y-4">
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Anggota</label>
                      <Select value={donNamaAnggota} onValueChange={setDonNamaAnggota}>
                        <SelectTrigger className="h-10"><SelectValue placeholder="Pilih anggota" /></SelectTrigger>
                        <SelectContent>
                          {anggota.map((a) => <SelectItem key={a.id} value={String(a.id)}>{a.nama}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Nama Acara</label>
                      <Input placeholder="Contoh: Donasi Banjir" value={donAcara} onChange={(e) => setDonAcara(e.target.value)} className="h-10" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Nominal</label>
                      <Input type="number" placeholder="Contoh: 500000" value={donNominal} onChange={(e) => setDonNominal(e.target.value)} className="h-10" />
                    </div>
                    <div>
                      <label className="mb-1.5 block text-sm font-medium text-slate-700">Tanggal</label>
                      <Input type="date" value={donTanggal} onChange={(e) => setDonTanggal(e.target.value)} className="h-10" />
                    </div>
                  </div>
                  <Button type="submit" disabled={savingDonasi} className="h-10 bg-blue-900 hover:bg-blue-800">
                    {savingDonasi ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Plus className="h-4 w-4" /> Simpan Donasi</>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {loadingDonasi ? (
              <LoadingSpinner text="Memuat data donasi…" />
            ) : donasi.length === 0 ? (
              <EmptyState icon={HandHeart} text="Belum ada donasi tercatat." />
            ) : (
              <Card className="overflow-hidden border-slate-200 shadow-sm dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px] text-left text-sm">
                    <thead>
                      <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900">
                        <Th>Anggota</Th><Th>Acara</Th><Th>Nominal</Th><Th>Tanggal</Th><Th>Aksi</Th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {donasi.map((d) => (
                        <tr key={d.id} className="hover:bg-blue-50/50 dark:hover:bg-blue-950/20">
                          <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{d.nama_anggota}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{d.nama_acara}</td>
                          <td className="px-4 py-3 font-semibold text-blue-700 dark:text-blue-400">{formatRupiah(d.nominal)}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatDate(d.tanggal)}</td>
                          <td className="px-4 py-3">
                            <button onClick={() => handleDeleteDonasi(d.id)} className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </section>
        )}

        {activeTab === 'pengaturan' && (
          <section className="space-y-6">
            {loadingPengaturan ? (
              <LoadingSpinner text="Memuat pengaturan…" />
            ) : (
              <>
                {/* Pengumuman */}
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardContent className="p-5">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Megaphone className="h-4 w-4 text-amber-600" /> Teks Pengumuman
                    </h4>
                    <p className="mb-3 text-xs text-slate-400">Teks ini akan tampil di bagian atas Dashboard anggota.</p>
                    <Textarea
                      rows={4}
                      placeholder="Tulis pengumuman untuk seluruh anggota…"
                      value={pengumuman}
                      onChange={(e) => setPengumuman(e.target.value)}
                    />
                    <Button onClick={handleSavePengumuman} disabled={savingPengumuman} className="mt-3 h-10 bg-blue-900 hover:bg-blue-800">
                      {savingPengumuman ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Simpan Pengumuman</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Rekening */}
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardContent className="p-5">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Landmark className="h-4 w-4 text-blue-700" /> Info Rekening Mess
                    </h4>
                    <p className="mb-3 text-xs text-slate-400">Info ini akan tampil di bagian atas halaman Keuangan.</p>
                    <Textarea
                      rows={4}
                      placeholder="Contoh:&#10;Bank BCA 1234567890&#10;Atas nama: MESS STM-PL Cirebon"
                      value={rekening}
                      onChange={(e) => setRekening(e.target.value)}
                    />
                    <Button onClick={handleSaveRekening} disabled={savingRekening} className="mt-3 h-10 bg-blue-900 hover:bg-blue-800">
                      {savingRekening ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Simpan Rekening</>}
                    </Button>
                  </CardContent>
                </Card>

                {/* Pengaturan Keuangan Dasar */}
                <Card className="border-slate-200 shadow-sm dark:border-slate-800">
                  <CardContent className="p-5">
                    <h4 className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-200">
                      <Wallet className="h-4 w-4 text-emerald-700" /> Pengaturan Keuangan Dasar
                    </h4>
                    <p className="mb-4 text-xs text-slate-400">Nilai ini dipakai untuk menghitung Saldo Kas Mess di halaman Keuangan dan Dashboard.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Saldo Awal Migrasi</label>
                        <p className="mb-2 text-xs text-slate-400">Nominal uang kas fisik/rekening yang sudah ada saat ini.</p>
                        <Input
                          type="number"
                          placeholder="Contoh: 5000000"
                          value={saldoAwal}
                          onChange={(e) => setSaldoAwal(e.target.value)}
                          className="h-10"
                        />
                        <Button onClick={handleSaveSaldoAwal} disabled={savingSaldoAwal} className="mt-2 h-9 bg-emerald-700 hover:bg-emerald-800">
                          {savingSaldoAwal ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Simpan Saldo Awal</>}
                        </Button>
                      </div>
                      <div className="border-t border-slate-100 pt-4 dark:border-slate-800">
                        <label className="mb-1.5 block text-sm font-medium text-slate-700">Nominal Iuran Tahunan</label>
                        <p className="mb-2 text-xs text-slate-400">Besaran rupiah iuran per tahun (misal Rp 100.000).</p>
                        <Input
                          type="number"
                          placeholder="Contoh: 100000"
                          value={nominalIuran}
                          onChange={(e) => setNominalIuran(e.target.value)}
                          className="h-10"
                        />
                        <Button onClick={handleSaveNominalIuran} disabled={savingNominalIuran} className="mt-2 h-9 bg-emerald-700 hover:bg-emerald-800">
                          {savingNominalIuran ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Check className="h-4 w-4" /> Simpan Nominal Iuran</>}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </section>
        )}
        {/* Add Iuran Modal */}
        <Dialog open={showAddIuran} onOpenChange={(open) => !open && setShowAddIuran(false)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5 text-blue-700" />
                Tambah Iuran Baru
              </DialogTitle>
              <DialogDescription>
                Inisiasi data iuran untuk anggota yang belum memiliki catatan iuran.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleAddIuran} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Pilih Anggota
                </label>
                <Select value={addIuranAnggota} onValueChange={setAddIuranAnggota}>
                  <SelectTrigger className="h-10 w-full">
                    <SelectValue placeholder="Pilih anggota aktif…" />
                  </SelectTrigger>
                  <SelectContent>
                    {anggotaTanpaIuran.length === 0 ? (
                      <SelectItem value="_none" disabled>
                        Semua anggota sudah memiliki iuran
                      </SelectItem>
                    ) : (
                      anggotaTanpaIuran.map((a) => (
                        <SelectItem key={a.id} value={String(a.id)}>
                          {a.nama}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {anggotaTanpaIuran.length === 0 && (
                  <p className="mt-1 text-xs text-slate-400">
                    Semua anggota sudah memiliki data iuran.
                  </p>
                )}
              </div>
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Tahun Dasar
                </label>
                <Input
                  type="number"
                  value={addIuranTahunDasar}
                  onChange={(e) => setAddIuranTahunDasar(e.target.value)}
                  className="h-10"
                  placeholder="Contoh: 2026"
                />
                <p className="mt-1 text-xs text-slate-400">
                  Tahun dasar adalah titik awal perhitungan iuran. Default: tahun ini.
                </p>
              </div>
              {error && (
                <div className="flex items-start gap-2 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/30 dark:text-red-400">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddIuran(false)}
                  className="h-10 flex-1"
                >
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={savingNewIuran || anggotaTanpaIuran.length === 0}
                  className="h-10 flex-1 bg-blue-900 hover:bg-blue-800"
                >
                  {savingNewIuran ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
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
    </div>
  );
}

/* ---------- helpers ---------- */

function LoadingSpinner({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-slate-400">
      <Loader2 className="mb-3 h-8 w-8 animate-spin text-blue-700" />
      <p className="text-sm">{text}</p>
    </div>
  );
}

function EmptyState({ icon: Icon, text }: { icon: typeof Receipt; text: string }) {
  return (
    <Card className="border-slate-200 shadow-sm dark:border-slate-800">
      <CardContent className="flex flex-col items-center justify-center py-12 text-slate-400">
        <Icon className="mb-2 h-8 w-8" />
        <p className="text-sm">{text}</p>
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
