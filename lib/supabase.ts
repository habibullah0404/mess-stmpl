import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// PERBAIKAN 1: id Anggota sekarang adalah string (UUID), bukan number.
export type Anggota = {
  id: string; 
  nama: string;
  jabatan: string | null;
  nama_pt: string | null;
  status_bekerja: string | null;
  info_kontak: string | null;
  pengalaman_kerja: string | null;
  email: string | null;
  role: string | null;
  lulusan_tahun: string | null;
  jenis_kapal: string | null;
  is_verified: boolean | null;
  foto_url: string | null;
  created_at?: string | null;
};

export type Pengaturan = {
  id: number;
  kunci: string;
  nilai: string | null;
};

// PERBAIKAN 2: Semua id_anggota yang merujuk ke tabel Anggota diubah menjadi string
export type Iuran = {
  id: number;
  id_anggota: string;
  tahun: string;
  tahun_dasar: string | null;
  nominal: string;
  status_pembayaran: string;
  created_at?: string | null;
};

export type Donasi = {
  id: number;
  id_anggota: string;
  nama_acara: string;
  nominal: string;
  tanggal: string;
  created_at?: string | null;
};

export type Pengalaman = {
  id: number;
  id_anggota: string;
  nama_kapal: string;
  nama_perusahaan: string | null;
  jenis_kapal: string | null;
  rute: string | null;
  durasi: string | null;
  created_at?: string | null;
};

export type Pinjaman = {
  id: number;
  tanggal_pinjam: string;
  id_anggota: string | null;
  jumlah: string | number;
  keterangan: string | null;
  status: string;
  created_at?: string | null;
};

export type Pengeluaran = {
  id: number;
  nama_pengeluaran: string;
  nominal: string;
  tanggal: string;
  bulan: string | null;
  file_url: string | null;
  created_at?: string | null;
};

export const JENIS_KAPAL_OPTIONS = [
  'Cargo',
  'Tanker',
  'Container',
  'Bulk Carrier',
  'Tug Boat',
  'Passenger',
  'Ferry',
  'LNG',
  'LCT',
  'AHTS',
  'Other',
];

export const RUTE_OPTIONS = ['NCV', 'Foreign Going'];

export const LULUSAN_TAHUN_OPTIONS = [
  'Umum',
  ...Array.from({ length: new Date().getFullYear() - 1965 + 1 }, (_, i) =>
    String(1965 + i)
  ),
];

export const BULAN_OPTIONS = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
];

export function getIuranStatus(
  tahunTerakhir: string | number | null,
  tahunIni: number
): { text: string; className: string } {
  if (tahunTerakhir === null || tahunTerakhir === undefined || tahunTerakhir === '') {
    return {
      text: 'Belum Bayar',
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    };
  }
  const t = typeof tahunTerakhir === 'number' ? tahunTerakhir : parseInt(tahunTerakhir, 10);
  if (isNaN(t)) {
    return {
      text: 'Belum Bayar',
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    };
  }
  if (t === tahunIni) {
    return {
      text: 'Lunas',
      className:
        'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900',
    };
  }
  if (t === tahunIni - 1) {
    return {
      text: 'Belum Bayar',
      className:
        'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-900',
    };
  }
  if (t <= tahunIni - 2) {
    return {
      text: 'Menunggak',
      className:
        'bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-900',
    };
  }
  return {
    text: 'Bayar di Muka',
    className:
      'bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-950/40 dark:text-sky-400 dark:border-sky-900',
  };
}

export async function fetchPengaturan(
  kunci: string
): Promise<string | null> {
  const { data } = await supabase
    .from('Pengaturan')
    .select('nilai')
    .eq('kunci', kunci)
    .maybeSingle();
  return data?.nilai ?? null;
}

export async function upsertPengaturan(
  kunci: string,
  nilai: string
): Promise<{ error: string | null }> {
  const { data: existing } = await supabase
    .from('Pengaturan')
    .select('id')
    .eq('kunci', kunci)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from('Pengaturan')
      .update({ nilai })
      .eq('id', (existing as { id: number }).id);
    return { error: error?.message ?? null };
  }
  const { error } = await supabase
    .from('Pengaturan')
    .insert({ kunci, nilai });
  return { error: error?.message ?? null };
}

export type SaldoBreakdown = {
  saldoAwal: number;
  totalDonasi: number;
  totalIuranLunas: number;
  totalPengeluaran: number;
  jumlahLunas: number;
  nominalIuran: number;
  saldoKas: number;
};

export function computeSaldoKas(
  iuranRows: { tahun: string | null; tahun_dasar: string | null }[],
  donasiRows: { nominal: string | number }[],
  pengeluaranRows: { nominal: string | number }[],
  saldoAwalStr: string | null,
  nominalIuranStr: string | null,
  currentYear: number
): SaldoBreakdown {
  const saldoAwal = parseInt(saldoAwalStr ?? '', 10) || 0;
  const nominalIuran = parseInt(nominalIuranStr ?? '', 10) || 0;

  let totalIuranLunas = 0;
  let jumlahLunas = 0;
  for (const i of iuranRows) {
    const tahun = parseInt(i.tahun ?? '', 10);
    const tahunDasar = parseInt(i.tahun_dasar ?? '', 10);
    if (isNaN(tahun) || isNaN(tahunDasar)) continue;
    const selisih = tahun - tahunDasar;
    if (selisih > 0) {
      totalIuranLunas += selisih * nominalIuran;
      jumlahLunas++;
    }
  }

  const totalDonasi = donasiRows.reduce(
    (sum, d) => sum + (parseInt(String(d.nominal), 10) || 0),
    0
  );
  const totalPengeluaran = pengeluaranRows.reduce(
    (sum, p) => sum + (parseInt(String(p.nominal), 10) || 0),
    0
  );
  const saldoKas = saldoAwal + totalDonasi - totalPengeluaran + totalIuranLunas;

  return {
    saldoAwal,
    totalDonasi,
    totalIuranLunas,
    totalPengeluaran,
    jumlahLunas,
    nominalIuran,
    saldoKas,
  };
}

export function exportAnggotaToCSV(anggota: Anggota[]) {
  const headers = [
    'Nama',
    'Jabatan',
    'Email',
    'HP',
    'Perusahaan',
    'Jenis Kapal',
    'Status Bekerja',
    'Lulusan Tahun',
    'Role',
    'Terverifikasi',
  ];
  const rows = anggota.map((a) => [
    a.nama ?? '',
    a.jabatan ?? '',
    a.email ?? '',
    a.info_kontak ?? '',
    a.nama_pt ?? '',
    a.jenis_kapal ?? '',
    a.status_bekerja ?? '',
    a.lulusan_tahun ?? '',
    a.role ?? '',
    a.is_verified ? 'Ya' : 'Tidak',
  ]);
  const csv = [headers, ...rows]
    .map((row) =>
      row
        .map((cell) => {
          const s = String(cell).replace(/"/g, '""');
          return s.includes(',') || s.includes('\n') || s.includes('"')
            ? `"${s}"`
            : s;
        })
        .join(',')
    )
    .join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `data-anggota-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
