'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import AuthShell from '../components/AuthShell';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await authClient.signIn.email({ email, password });
    setLoading(false);
    if (error) {
      setError('ایمیل یا رمز عبور نادرست است.');
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <AuthShell
      eyebrow="ورود به حساب"
      title="خوش برگشتید"
      italic="به تحلیلگر بازار"
      subtitle="برای دیدن داشبورد، قیمت‌های جهانی و روند تاریخی بازار وارد شوید."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[14px] text-slate">ایمیل</span>
          <input
            type="email"
            required
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="field text-right"
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-[14px] text-slate">رمز عبور</span>
          <input
            type="password"
            required
            dir="ltr"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="field text-right"
          />
        </label>

        {error && (
          <p className="rounded-input bg-blush/60 px-4 py-3 text-[14px] text-sienna">{error}</p>
        )}

        <button type="submit" disabled={loading} className="pill mt-2 h-12 w-full text-[16px]">
          {loading ? 'در حال ورود…' : 'ورود'}
        </button>
      </form>

      <p className="mt-6 text-center text-[15px] text-slate">
        حساب ندارید؟{' '}
        <Link href="/signup" className="text-ink hover:underline">
          ثبت‌نام کنید ←
        </Link>
      </p>
    </AuthShell>
  );
}
