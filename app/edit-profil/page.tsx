'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Anchor, User, Briefcase, Ship as ShipIcon, Phone, Loader as Loader2, CircleAlert as AlertCircle, Plus, Trash2, MapPin, Clock, Save, ArrowLeft, CircleCheck as CheckCircle2, Camera, Upload, X } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { supabase, type Pengalaman, LULUSAN_TAHUN_OPTIONS } from '@/lib/supabase';
import { withTimeout } from '@/lib/utils';
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

// Import Library Crop Foto
import Cropper from 'react-easy-crop';

// --- FUNGSI KANVAS UNTUK KOMPRESI FOTO ---
const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        reject(new Error('Timeout memuat gambar (15 detik). File mungkin terlalu besar.'));
      }
    }, 15000);

    image.addEventListener('load', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        resolve(image);
      }
    });
    image.addEventListener('error', () => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        reject(new Error('Gagal memuat gambar. Format mungkin tidak didukung browser.'));
      }
    });

    // crossOrigin hanya untuk URL eksternal, JANGAN untuk data: URL
    // (crossOrigin pada data URL dapat men-taint canvas di beberapa browser)
    if (!url.startsWith('data:')) {
      image.setAttribute('crossOrigin', 'anonymous');
    }
    image.src = url;
  });

async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
): Promise<Blob | null> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  // Ukuran target foto profil (400x400 px) -> Membuat file sangat kecil!
  const targetSize = 400;
  canvas.width = targetSize;
  canvas.height = targetSize;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    targetSize,
    targetSize
  );

  // toBlob dengan timeout safety — jika browser gagal encode, resolve null
  return new Promise((resolve) => {
    let done = false;
    const timeout = setTimeout(() => {
      if (!done) {
        done = true;
        resolve(null);
      }
    }, 10000);

    canvas.toBlob((blob) => {
      if (!done) {
        done = true;
        clearTimeout(timeout);
        resolve(blob);
      }
    }, 'image/jpeg', 0.8);
  });
}
// ----------------------------------------

export default function EditProfilPage() {
  const { user, profile, loading: authLoading, profileChecked, refreshProfile } = useAuth();
  const router = useRouter();
  const [nama, setNama] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [namaPt, setNamaPt] = useState('');
  const [infoKontak, setInfoKontak] = useState('');
  const [statusBekerja, setStatusBekerja] = useState('Standby');
  const [lulusanTahun, setLulusanTahun] = useState('Umum');
  const [profileJenisKapal, setProfileJenisKapal] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  const [pengalaman, setPengalaman] = useState<Pengalaman[]>([]);
  const [loadingPengalaman, setLoadingPengalaman] = useState(true);

  const [namaKapal, setNamaKapal] = useState('');
  const [namaPerusahaan, setNamaPerusahaan] = useState('');
  const [jenisKapal, setJenisKapal] = useState('');
  const [rute, setRute] = useState('');
  const [durasiTahun, setDurasiTahun] = useState('');
  const [durasiBulan, setDurasiBulan] = useState('');
  const [savingPengalaman, setSavingPengalaman] = useState(false);
  const [pengalamanMsg, setPengalamanMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);

  // --- STATE UNTUK CROP & UPLOAD FOTO ---
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [photoMsg, setPhotoMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(null);
  
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  const [isCropModalOpen, setIsCropModalOpen] = useState(false);
  // --------------------------------------

  useEffect(() => {
    if (authLoading || !profileChecked) return;
    if (!user) {
      router.push('/login');
      return;
    }
    if (!profile) {
      router.push('/lengkapi-profil');
      return;
    }
    setNama(profile.nama ?? '');
    setJabatan(profile.jabatan ?? '');
    setNamaPt(profile.nama_pt ?? '');
    setInfoKontak(profile.info_kontak ?? '');
    setStatusBekerja(profile.status_bekerja ?? 'Standby');
    setLulusanTahun(profile.lulusan_tahun ?? 'Umum');
    setProfileJenisKapal(profile.jenis_kapal ?? '');
  }, [user, profile, authLoading, profileChecked, router]);

  const loadPengalaman = useCallback(async () => {
    if (!profile) return;
    setLoadingPengalaman(true);
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('Pengalaman')
          .select('id, id_anggota, nama_kapal, nama_perusahaan, jenis_kapal, rute, durasi, created_at')
          .eq('id_anggota', profile.id)
          .order('created_at', { ascending: false })
      );
      if (error) {
        setPengalamanMsg({ type: 'error', text: error.message });
        return;
      }
      setPengalaman((data as Pengalaman[]) ?? []);
    } catch (e: unknown) {
      setPengalamanMsg({ type: 'error', text: e instanceof Error ? e.message : 'Gagal memuat riwayat kapal' });
    } finally {
      setLoadingPengalaman(false);
    }
  }, [profile]);

  useEffect(() => {
    loadPengalaman();
  }, [loadPengalaman]);

  useEffect(() => {
    const onFocus = () => {
      if (document.visibilityState === 'visible') loadPengalaman();
    };
    document.addEventListener('visibilitychange', onFocus);
    return () => document.removeEventListener('visibilitychange', onFocus);
  }, [loadPengalaman]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      const { error } = await withTimeout(
        supabase
          .from('Anggota')
          .update({
            nama: nama.trim(),
            jabatan: jabatan.trim() || null,
            nama_pt: namaPt.trim() || null,
            info_kontak: infoKontak.trim() || null,
            status_bekerja: statusBekerja,
            lulusan_tahun: lulusanTahun,
            jenis_kapal: profileJenisKapal.trim() || null,
          })
          .eq('id', profile.id)
      );
      if (error) {
        setProfileMsg({ type: 'error', text: error.message });
        return;
      }
      await refreshProfile();
      setProfileMsg({ type: 'success', text: 'Profil berhasil disimpan.' });
    } catch (e: unknown) {
      setProfileMsg({ type: 'error', text: e instanceof Error ? e.message : 'Gagal menyimpan profil' });
    } finally {
      setSavingProfile(false);
    }
  };

  const buildDurasi = () => {
    const y = parseInt(durasiTahun, 10);
    const m = parseInt(durasiBulan, 10);
    const parts: string[] = [];
    if (!isNaN(y) && y > 0) parts.push(`${y} tahun`);
    if (!isNaN(m) && m > 0) parts.push(`${m} bulan`);
    return parts.length > 0 ? parts.join(' ') : null;
  };

  const handleAddPengalaman = async (e: React.FormEvent) => {
    e.preventDefault();
    setPengalamanMsg(null);
    if (!namaKapal.trim()) {
      setPengalamanMsg({ type: 'error', text: 'Nama kapal wajib diisi.' });
      return;
    }
    if (!profile) return;
    setSavingPengalaman(true);
    const durasi = buildDurasi();
    try {
      const { data, error } = await withTimeout(
        supabase
          .from('Pengalaman')
          .insert({
            id_anggota: profile.id,
            nama_kapal: namaKapal.trim(),
            nama_perusahaan: namaPerusahaan.trim() || null,
            jenis_kapal: jenisKapal || null,
            rute: rute || null,
            durasi,
          })
          .select('id, id_anggota, nama_kapal, nama_perusahaan, jenis_kapal, rute, durasi, created_at')
          .single()
      );
      if (error) {
        setPengalamanMsg({ type: 'error', text: error.message });
        return;
      }
      setPengalaman((prev) => [data as Pengalaman, ...prev]);
    } catch (e: unknown) {
      setPengalamanMsg({ type: 'error', text: e instanceof Error ? e.message : 'Gagal menambah riwayat' });
      return;
    } finally {
      setSavingPengalaman(false);
    }
    setNamaKapal('');
    setNamaPerusahaan('');
    setJenisKapal('');
    setRute('');
    setDurasiTahun('');
    setDurasiBulan('');
    setPengalamanMsg({ type: 'success', text: 'Riwayat kapal berhasil ditambahkan.' });
  };

  const handleDeletePengalaman = async (id: string) => {
    try {
      const { error } = await withTimeout(supabase.from('Pengalaman').delete().eq('id', id));
      if (error) {
        setPengalamanMsg({ type: 'error', text: error.message });
        return;
      }
      setPengalaman((prev) => prev.filter((p) => p.id !== id));
    } catch (e: unknown) {
      setPengalamanMsg({ type: 'error', text: e instanceof Error ? e.message : 'Gagal menghapus riwayat' });
    }
  };

  // --- LOGIKA BARU UNTUK FOTO ---
  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Ambil referensi file SEBELUM reset input — reset di sini aman
    // karena kita sudah punya objek File di variabel `file`.
    // (Sebelumnya reset di luar if menyebabkan FileReader abort di mobile)
    const file = e.target.files?.[0];
    e.target.value = '';

    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setPhotoMsg({ type: 'error', text: 'File harus berupa gambar.' });
      return;
    }

    // Validasi ukuran (maks 20MB untuk mencegah hang di mobile)
    if (file.size > 20 * 1024 * 1024) {
      setPhotoMsg({ type: 'error', text: 'Ukuran file terlalu besar (maks 20MB). Silakan pilih foto yang lebih kecil.' });
      return;
    }

    // Tampilkan loading selama FileReader bekerja (terutama untuk foto kamera yang besar)
    setUploadingPhoto(true);
    setPhotoMsg(null);

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result?.toString();
      if (!result) {
        setPhotoMsg({ type: 'error', text: 'Gagal membaca file gambar.' });
        setUploadingPhoto(false);
        return;
      }
      setImageSrc(result);
      setIsCropModalOpen(true);
      setUploadingPhoto(false); // crop modal terbuka, loading selesai
    };
    reader.onerror = () => {
      setPhotoMsg({ type: 'error', text: 'Gagal membaca file. File mungkin rusak atau terlalu besar.' });
      setUploadingPhoto(false);
    };
    reader.readAsDataURL(file);
  };

  const onCropComplete = useCallback((croppedArea: any, croppedAreaPixels: any) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleCropAndSave = async () => {
    if (!imageSrc || !profile || !user) return;

    if (!croppedAreaPixels) {
      setPhotoMsg({ type: 'error', text: 'Posisi crop belum siap. Tunggu sebentar lalu coba lagi.' });
      return;
    }

    setUploadingPhoto(true);
    setPhotoMsg(null);

    try {
      // 1. Potong dan Kompres Foto
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      if (!croppedBlob) throw new Error('Gagal memproses foto. Browser mungkin kehabisan memori — coba foto yang lebih kecil.');

      // 2. Siapkan File untuk Supabase
      const fileExt = 'jpeg';
      const filePath = `${user.id}/avatar-${Date.now()}.${fileExt}`;

      // 3. Upload ke Supabase
      const { error: uploadErr } = await withTimeout(
        supabase.storage
          .from('profile-photos')
          .upload(filePath, croppedBlob, { cacheControl: '3600', upsert: false })
      );

      if (uploadErr) throw uploadErr;

      // 4. Dapatkan URL Publik
      const { data: urlData } = supabase.storage.from('profile-photos').getPublicUrl(filePath);
      const newFotoUrl = urlData.publicUrl;

      // 5. Update Database Anggota
      const oldFotoUrl = profile.foto_url;
      const { error: dbErr } = await withTimeout(
        supabase
          .from('Anggota')
          .update({ foto_url: newFotoUrl })
          .eq('id', profile.id)
      );

      if (dbErr) throw dbErr;

      // 6. Hapus Foto Lama (Opsional, agar tidak memenuhi storage)
      if (oldFotoUrl) {
        try {
          const oldPath = oldFotoUrl.split('/profile-photos/')[1];
          if (oldPath) {
            await withTimeout(supabase.storage.from('profile-photos').remove([oldPath]));
          }
        } catch {
          // Abaikan jika gagal menghapus
        }
      }

      setPhotoMsg({ type: 'success', text: 'Foto profil berhasil diperbarui.' });
      setIsCropModalOpen(false);
      setImageSrc(null);
      await refreshProfile();

    } catch (error: any) {
      const msg =
        error?.message ||
        (typeof error === 'string' ? error : null) ||
        'Terjadi kesalahan saat mengunggah foto.';
      setPhotoMsg({ type: 'error', text: msg });
    } finally {
      setUploadingPhoto(false);
    }
  };
  // --------------------------------

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-700" />
      </div>
    );
  }

  if (!profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900">
      
      {/* MODAL CROP FOTO */}
      {isCropModalOpen && imageSrc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-4 shadow-2xl dark:bg-slate-900">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Atur Posisi Foto</h3>
              <button 
                onClick={() => { setIsCropModalOpen(false); setImageSrc(null); }} 
                className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="relative h-80 w-full overflow-hidden rounded-xl bg-slate-100 dark:bg-slate-800">
              <Cropper
                image={imageSrc}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="round"
                showGrid={false}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            </div>
            
            <div className="mt-4 flex items-center gap-2 px-2">
              <span className="text-xs text-slate-500">Gunakan dua jari untuk Zoom (atau geser foto)</span>
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <Button 
                variant="outline" 
                onClick={() => { setIsCropModalOpen(false); setImageSrc(null); }}
                disabled={uploadingPhoto}
              >
                Batal
              </Button>
              <Button 
                onClick={handleCropAndSave} 
                className="bg-blue-900 hover:bg-blue-800" 
                disabled={uploadingPhoto}
              >
                {uploadingPhoto ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Memproses...
                  </>
                ) : (
                  "Simpan Foto"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

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
            <User className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">Edit Profil</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400">Perbarui data diri &amp; riwayat kapal</p>
          </div>
        </div>

        {/* Photo Profile section */}
        <Card className="mb-6 border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
              <Camera className="h-4 w-4 text-blue-700" />
              Foto Profil
            </h3>
            <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
              <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800">
                {profile?.foto_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={profile.foto_url} alt="Foto profil" className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-slate-400">
                    <User className="h-10 w-10" />
                  </div>
                )}
                {uploadingPhoto && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                    <Loader2 className="h-6 w-6 animate-spin text-white" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg bg-blue-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-800">
                  <Upload className="h-4 w-4" />
                  Pilih Foto
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onFileChange}
                    disabled={uploadingPhoto}
                    className="hidden"
                  />
                </label>
                <p className="mt-2 text-xs text-slate-400">
                  Pilih foto apa saja. Anda bisa memotongnya di langkah selanjutnya.
                </p>
                {photoMsg && <MsgBanner type={photoMsg.type} text={photoMsg.text} />}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Profile section */}
        <Card className="mb-6 border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
              <User className="h-4 w-4 text-blue-700" />
              Data Diri
            </h3>
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama Lengkap" icon={User} required>
                  <Input value={nama} onChange={(e) => setNama(e.target.value)} className="h-10 pl-10" />
                </Field>
                <Field label="Jabatan" icon={Briefcase}>
                  <Input value={jabatan} onChange={(e) => setJabatan(e.target.value)} className="h-10 pl-10" />
                </Field>
                <Field label="Nama Perusahaan / PT" icon={ShipIcon}>
                  <Input value={namaPt} onChange={(e) => setNamaPt(e.target.value)} className="h-10 pl-10" />
                </Field>
                <Field label="Info Kontak" icon={Phone}>
                  <Input value={infoKontak} onChange={(e) => setInfoKontak(e.target.value)} className="h-10 pl-10" />
                </Field>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Lulusan Tahun</label>
                  <Select value={lulusanTahun} onValueChange={setLulusanTahun}>
                    <SelectTrigger className="h-10">
                      <SelectValue />
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
              </div>

              <Field label="Jenis Kapal" icon={ShipIcon}>
                <Input
                  placeholder="Contoh: Tanker / Cargo / Tug Boat"
                  value={profileJenisKapal}
                  onChange={(e) => setProfileJenisKapal(e.target.value)}
                  className="h-10 pl-10"
                />
              </Field>

              {profileMsg && (
                <MsgBanner type={profileMsg.type} text={profileMsg.text} />
              )}

              <Button type="submit" disabled={savingProfile} className="h-10 bg-blue-900 hover:bg-blue-800">
                {savingProfile ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Save className="h-4 w-4" />
                    Simpan Profil
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pengalaman section */}
        <Card className="mb-6 border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
              <ShipIcon className="h-4 w-4 text-blue-700" />
              Tambah Riwayat Kapal
            </h3>
            <form onSubmit={handleAddPengalaman} className="space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nama Kapal" icon={ShipIcon} required>
                  <Input
                    placeholder="Contoh: MV. Samudra Jaya"
                    value={namaKapal}
                    onChange={(e) => setNamaKapal(e.target.value)}
                    className="h-10 pl-10"
                  />
                </Field>
                <Field label="Nama Perusahaan" icon={Briefcase}>
                  <Input
                    placeholder="Contoh: PT Pelayaran Nusantara"
                    value={namaPerusahaan}
                    onChange={(e) => setNamaPerusahaan(e.target.value)}
                    className="h-10 pl-10"
                  />
                </Field>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Jenis Kapal</label>
                  <Input
                    placeholder="Contoh: Tanker / Cargo / Tug Boat"
                    value={jenisKapal}
                    onChange={(e) => setJenisKapal(e.target.value)}
                    className="h-10"
                  />
                </div>
                <Field label="Rute" icon={MapPin}>
                  <Input
                    placeholder="Contoh: NCV / Foreign Going"
                    value={rute}
                    onChange={(e) => setRute(e.target.value)}
                    className="h-10 pl-10"
                  />
                </Field>
              </div>

              {/* Durasi (optional) */}
              <div>
                <label className="mb-1.5 block text-sm font-medium text-slate-700">
                  Durasi <span className="text-xs font-normal text-slate-400">(opsional)</span>
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={50}
                      placeholder="Tahun"
                      value={durasiTahun}
                      onChange={(e) => setDurasiTahun(e.target.value)}
                      className="h-10"
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      type="number"
                      min={0}
                      max={11}
                      placeholder="Bulan"
                      value={durasiBulan}
                      onChange={(e) => setDurasiBulan(e.target.value)}
                      className="h-10"
                    />
                  </div>
                </div>
                <p className="mt-1.5 text-xs text-slate-400">
                  Isi lama bekerja di kapal tersebut. Contoh: 2 tahun 5 bulan. Dibiarkan kosong jika tidak ingin mengisi.
                </p>
              </div>

              {pengalamanMsg && <MsgBanner type={pengalamanMsg.type} text={pengalamanMsg.text} />}

              <Button type="submit" disabled={savingPengalaman} className="h-10 bg-blue-900 hover:bg-blue-800">
                {savingPengalaman ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Tambah Riwayat
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Pengalaman list */}
        <Card className="border-slate-200 shadow-sm dark:border-slate-800">
          <CardContent className="p-6">
            <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-slate-800 dark:text-slate-100">
              <Clock className="h-4 w-4 text-blue-700" />
              Riwayat Kapal ({pengalaman.length})
            </h3>
            {loadingPengalaman ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-blue-700" />
              </div>
            ) : pengalaman.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">Belum ada riwayat kapal.</p>
            ) : (
              <div className="space-y-3">
                {pengalaman.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/50"
                  >
                    <div className="min-w-0 flex-1">
                      <h4 className="font-semibold text-slate-800 dark:text-slate-100">{p.nama_kapal}</h4>
                      {p.nama_perusahaan && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                          <Briefcase className="h-3 w-3" />
                          {p.nama_perusahaan}
                        </p>
                      )}
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {p.jenis_kapal && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/40 dark:text-blue-400">
                            <ShipIcon className="h-3 w-3" />
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
                    <button
                      onClick={() => handleDeletePengalaman(p.id)}
                      className="shrink-0 rounded-lg p-2 text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-950/30"
                      aria-label="Hapus riwayat"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
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
