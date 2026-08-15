'use client';

import { createContext, useContext, useEffect, useState, useRef, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, type Anggota } from '@/lib/supabase';

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  profile: Anggota | null;
  profileChecked: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Anggota | null>(null);
  const [profileChecked, setProfileChecked] = useState(false);

  const cleaningUp = useRef(false);
  const initialized = useRef(false);

  const cleanupAndRedirect = async () => {
    if (cleaningUp.current) return;
    cleaningUp.current = true;

    try {
      await supabase.auth.signOut();
    } catch {
      // abaikan error jika sudah signed out
    }

    try {
      localStorage.clear();
    } catch {
      // abaikan error localStorage
    }

    setSession(null);
    setProfile(null);
    setProfileChecked(true);
    setLoading(false);
    
    // PERBAIKAN: Gunakan Hard Refresh agar memori benar-benar bersih
    window.location.href = '/login'; 
  };

  const fetchProfile = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('Anggota')
        .select(
          'id, nama, jabatan, nama_pt, status_bekerja, info_kontak, pengalaman_kerja, email, role, lulusan_tahun, jenis_kapal, is_verified, foto_url, saldo_titipan, created_at'
        )
        .eq('email', email)
        .maybeSingle();

      if (error) {
        await cleanupAndRedirect();
        return;
      }

      if (!data) {
        setProfile(null);
        setProfileChecked(true);
        return;
      }

      setProfile(data as Anggota);
      setProfileChecked(true);
    } catch {
      await cleanupAndRedirect();
    }
  };

  const refreshProfile = async () => {
    if (session?.user?.email) {
      await fetchProfile(session.user.email);
    }
  };

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;

    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    const init = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          // PERBAIKAN: Deteksi spesifik untuk token kedaluwarsa/hilang
          if (error.message.includes('Refresh Token Not Found') || error.message.includes('Invalid Refresh Token')) {
            console.error('Sesi terdeteksi rusak/invalid. Membersihkan paksa...');
          }
          await cleanupAndRedirect();
          return;
        }

        const sess = data.session;

        if (sess) {
          const expiresAt = sess.expires_at;
          const now = Math.floor(Date.now() / 1000);
          if (expiresAt && expiresAt < now) {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              console.error('Gagal refresh token:', refreshError.message);
              await cleanupAndRedirect();
              return;
            }
            const { data: refreshed } = await supabase.auth.getSession();
            if (!refreshed.session) {
              await cleanupAndRedirect();
              return;
            }
            setSession(refreshed.session);
            if (refreshed.session.user?.email) {
              await fetchProfile(refreshed.session.user.email);
            } else {
              await cleanupAndRedirect();
              return;
            }
          } else {
            setSession(sess);
            if (sess.user?.email) {
              await fetchProfile(sess.user.email);
            } else {
              await cleanupAndRedirect();
              return;
            }
          }
        } else {
          setSession(null);
          setProfile(null);
          setProfileChecked(true);
        }
      } catch (err) {
        console.error('Error saat inisialisasi sesi:', err);
        await cleanupAndRedirect();
      } finally {
        setLoading(false);
      }
    };

    init();

    // Batas waktu aman: Paksa matikan indikator loading setelah 4 detik jika terjadi kebuntuan
    timeoutId = setTimeout(() => {
      setProfileChecked(true);
      setLoading(false);
    }, 4000);

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, sess) => {
      if (cleaningUp.current) return;

      if (event === 'SIGNED_OUT') {
        setSession(null);
        setProfile(null);
        setProfileChecked(true);
        setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED' && sess) {
        setSession(sess);
        return;
      }

      if (sess?.user?.email) {
        setSession(sess);
        await fetchProfile(sess.user.email);
      } else {
        setSession(null);
        setProfile(null);
        setProfileChecked(true);
      }
      setLoading(false);
    });

    const handleVisibilityChange = async () => {
      if (document.visibilityState !== 'visible' || cleaningUp.current) return;
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          await cleanupAndRedirect();
          return;
        }
        if (data.session) {
          const expiresAt = data.session.expires_at;
          const now = Math.floor(Date.now() / 1000);
          if (expiresAt && expiresAt < now) {
            const { error: refreshError } = await supabase.auth.refreshSession();
            if (refreshError) {
              await cleanupAndRedirect();
              return;
            }
          }
          setSession(data.session);
          if (data.session.user?.email) {
            await fetchProfile(data.session.user.email);
          }
        }
      } catch {
        // abaikan error saat bangunkan koneksi
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      listener.subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [router]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    return { error: error?.message ?? null };
  };

  const signOut = async () => {
    // PERBAIKAN: Tambahkan pengecekan agar tidak terjadi double-trigger
    if (cleaningUp.current) return;
    cleaningUp.current = true;
    
    try {
      await supabase.auth.signOut();
    } catch {
      // abaikan error
    }
    try {
      localStorage.clear();
    } catch {
      // abaikan error
    }
    
    setSession(null);
    setProfile(null);
    setProfileChecked(true);
    setLoading(false);
    
    // PERBAIKAN: Gunakan Hard Refresh
    window.location.href = '/login';
  };

  const value: AuthContextValue = {
    session,
    user: session?.user ?? null,
    loading,
    profile,
    profileChecked,
    signIn,
    signUp,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
