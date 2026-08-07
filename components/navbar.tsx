'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Anchor, LayoutDashboard, Wallet, LogIn, LogOut, User as UserIcon, UserCog, Shield, ShieldCheck, Settings } from 'lucide-react';
import { useAuth } from '@/components/auth-provider';
import { cn } from '@/lib/utils';

export function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, profile, loading, signOut } = useAuth();

  const isAdmin = profile?.role === 'admin';
  const isVerified = profile?.is_verified === true;

  const links = [
    { href: '/', label: 'Dashboard', icon: LayoutDashboard, show: !user || (isVerified) },
    { href: '/keuangan', label: 'Keuangan', icon: Wallet, show: !user || (isVerified) },
  ];

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <header className="sticky top-0 z-40 border-b border-blue-900/10 bg-gradient-to-r from-blue-900 via-blue-800 to-sky-800 text-white shadow-lg">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
              <Anchor className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight sm:text-lg">MESS STM-PL Cirebon</h1>
            </div>
          </div>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-1 md:flex">
            {links.filter((l) => l.show).map((link) => {
              const Icon = link.icon;
              const active = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-white/20 text-white'
                      : 'text-blue-100 hover:bg-white/10 hover:text-white'
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {link.label}
                </Link>
              );
            })}
            {user && profile && isVerified && isAdmin && (
              <Link
                href="/admin"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/admin'
                    ? 'bg-amber-400/20 text-amber-200'
                    : 'text-amber-100 hover:bg-amber-400/10 hover:text-amber-200'
                )}
              >
                <ShieldCheck className="h-4 w-4" />
                Admin
              </Link>
            )}
            {user && profile && (
              <Link
                href="/edit-profil"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/edit-profil'
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <UserCog className="h-4 w-4" />
                Edit Profil
              </Link>
            )}
            {user && profile && isVerified && (
              <Link
                href="/pengaturan-akun"
                className={cn(
                  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  pathname === '/pengaturan-akun'
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10 hover:text-white'
                )}
              >
                <Settings className="h-4 w-4" />
                Pengaturan Akun
              </Link>
            )}
          </nav>

          {/* Auth button */}
          <div className="flex items-center gap-2">
            {!loading && user ? (
              <div className="flex items-center gap-2">
                <div className="hidden items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-sm ring-1 ring-white/20 sm:flex">
                  {isAdmin ? (
                    <Shield className="h-4 w-4 text-amber-300" />
                  ) : (
                    <UserIcon className="h-4 w-4 text-blue-200" />
                  )}
                  <span className="max-w-[140px] truncate font-medium">{user.email}</span>
                  {isAdmin && (
                    <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-xs font-semibold text-amber-200">
                      Admin
                    </span>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-2 rounded-lg bg-white/15 px-3 py-2 text-sm font-medium ring-1 ring-white/25 transition-colors hover:bg-white/25"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              </div>
            ) : !loading ? (
              <Link
                href="/login"
                className="flex items-center gap-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-blue-900 shadow-sm transition-colors hover:bg-blue-50"
              >
                <LogIn className="h-4 w-4" />
                Masuk
              </Link>
            ) : null}
          </div>
        </div>

        {/* Mobile nav row */}
        <nav className="flex items-center gap-1 overflow-x-auto pb-2 md:hidden">
          {links.filter((l) => l.show).map((link) => {
            const Icon = link.icon;
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                  active
                    ? 'bg-white/20 text-white'
                    : 'text-blue-100 hover:bg-white/10'
                )}
              >
                <Icon className="h-4 w-4" />
                {link.label}
              </Link>
            );
          })}
          {user && profile && isVerified && isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === '/admin'
                  ? 'bg-amber-400/20 text-amber-200'
                  : 'text-amber-100 hover:bg-amber-400/10'
              )}
            >
              <ShieldCheck className="h-4 w-4" />
              Admin
            </Link>
          )}
          {user && profile && (
            <Link
              href="/edit-profil"
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === '/edit-profil'
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              )}
            >
              <UserCog className="h-4 w-4" />
              Edit Profil
            </Link>
          )}
          {user && profile && isVerified && (
            <Link
              href="/pengaturan-akun"
              className={cn(
                'flex shrink-0 items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                pathname === '/pengaturan-akun'
                  ? 'bg-white/20 text-white'
                  : 'text-blue-100 hover:bg-white/10'
              )}
            >
              <Settings className="h-4 w-4" />
              Pengaturan Akun
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
