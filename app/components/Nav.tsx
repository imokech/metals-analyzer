'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function Nav() {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [signingOut, setSigningOut] = useState(false);

  // Auth screens render their own bare canvas — no chrome.
  if (pathname === '/login' || pathname === '/signup') return null;
  if (isPending || !session) return null;

  const links = [
    { href: '/', label: 'داشبورد' },
    { href: '/history', label: 'تحلیل تاریخی' },
  ];

  const handleSignOut = async () => {
    setSigningOut(true);
    await authClient.signOut();
    router.push('/login');
    router.refresh();
  };

  const email = session.user?.email ?? '';
  const monogram = email.slice(0, 2).toUpperCase();

  return (
    <header className="sticky top-0 z-40 bg-paper/85 backdrop-blur-md">
      <nav className="mx-auto flex h-16 max-w-page items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2">
          <span className="font-display text-[22px] leading-none text-ink">متال</span>
          <span className="text-[13px] text-ash">تحلیلگر بازار فلزات</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-pill px-4 py-2 text-[15px] transition-colors ${
                  active ? 'bg-mist text-ink' : 'text-slate hover:text-ink'
                }`}
              >
                {l.label}
              </Link>
            );
          })}
        </div>

        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 sm:flex">
            <span
              className="flex h-9 w-9 items-center justify-center rounded-pill bg-blush text-[13px] font-medium text-sienna"
              title={email}
            >
              {monogram}
            </span>
            <span className="hidden text-[13px] text-slate lg:inline">{email}</span>
          </div>
          <button onClick={handleSignOut} disabled={signingOut} className="pill-ghost text-[14px]">
            {signingOut ? '…' : 'خروج'}
          </button>
        </div>
      </nav>
    </header>
  );
}
