'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import AuthShell from '../components/AuthShell';

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError('رمز عبور باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    setLoading(false);
    if (error) {
      setError(error.message?.includes('exist') ? 'این ایمیل قبلاً ثبت شده است.' : 'ثبت‌نام ناموفق بود.');
      return;
    }
    router.push('/');
    router.refresh();
  };

  return (
    <AuthShell
      eyebrow="ساخت حساب"
      title="بازار را"
      italic="تحلیل کنید"
      subtitle="یک حساب بسازید و به داشبورد کامل تحلیل بازار فلزات دسترسی پیدا کنید."
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <label className="flex flex-col gap-2">
          <span className="text-[14px] text-slate">نام</span>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="نام شما"
            className="field"
          />
        </label>
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
            placeholder="حداقل ۸ کاراکتر"
            className="field text-right"
          />
        </label>

        {error && (
          <p className="rounded-input bg-blush/60 px-4 py-3 text-[14px] text-sienna">{error}</p>
        )}

        <button type="submit" disabled={loading} className="pill mt-2 h-12 w-full text-[16px]">
          {loading ? 'در حال ساخت حساب…' : 'ثبت‌نام'}
        </button>
      </form>

      <p className="mt-6 text-center text-[15px] text-slate">
        حساب دارید؟{' '}
        <Link href="/login" className="text-ink hover:underline">
          وارد شوید ←
        </Link>
      </p>
    </AuthShell>
  );
}
