'use client';

import React, { useEffect, useState, useCallback } from 'react';
import HistoricalTrends from '../components/charts/HistoricalTrends';
import CurrencyHistoryChart from '../components/charts/CurrencyHistoryChart';
import Spinner from '../components/Spinner';
import type { ImeRow, CurrencyRow } from '../components/charts/chartUtils';

export default function HistoryPage() {
  const [ime, setIme] = useState<ImeRow[]>([]);
  const [currency, setCurrency] = useState<CurrencyRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [imeRes, curRes] = await Promise.all([
        fetch('/api/history?type=ime'),
        fetch('/api/history?type=currency'),
      ]);
      const imeJson = await imeRes.json();
      const curJson = await curRes.json();
      setIme(imeJson.data ?? []);
      setCurrency(curJson.data ?? []);
    } catch (err) {
      console.error('Failed to load history', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    try {
      await fetch('/api/history', { method: 'POST' });
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  const weeksCovered = new Set(ime.map((r) => r.weekLabel)).size;
  const groupsCovered = new Set(ime.map((r) => r.groupName)).size;

  return (
    <main className="mx-auto max-w-page px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-10 flex flex-wrap items-end justify-between gap-6">
        <div className="max-w-2xl">
          <span className="tag">تحلیل تاریخی</span>
          <h1 className="mt-2 font-display text-heading text-ink sm:text-heading-lg">
            روند بازار را <span className="italic">در گذر زمان</span> ببینید
          </h1>
          <p className="mt-4 text-body text-slate">
            آمار معاملات، قیمت‌های جهانی و نرخ دلار به‌صورت دوره‌ای ذخیره می‌شوند تا بتوانید روند
            هفتگی هر کالا را دنبال کنید.
          </p>
        </div>
        <button onClick={refresh} disabled={refreshing} className="pill-ghost">
          {refreshing ? 'در حال به‌روزرسانی…' : 'به‌روزرسانی داده‌ها'}
        </button>
      </header>

      {loading ? (
        <Spinner />
      ) : ime.length === 0 && currency.length === 0 ? (
        <div className="card flex flex-col items-center gap-4 p-12 text-center">
          <p className="text-body text-slate">
            هنوز داده تاریخی ثبت نشده است. اولین snapshot به‌صورت خودکار در حال ساخته‌شدن است —
            چند لحظه بعد دوباره تلاش کنید یا روی «به‌روزرسانی داده‌ها» بزنید.
          </p>
          <button onClick={refresh} disabled={refreshing} className="pill">
            {refreshing ? 'در حال ساخت…' : 'ساخت اولین snapshot'}
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {/* Coverage stat strip */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <div className="artifact p-5">
              <span className="tag">هفته‌های ثبت‌شده</span>
              <p className="mt-1 font-display text-heading-sm text-ink tabular">
                {weeksCovered.toLocaleString('fa-IR')}
              </p>
            </div>
            <div className="artifact p-5">
              <span className="tag">گروه‌های کالا</span>
              <p className="mt-1 font-display text-heading-sm text-ink tabular">
                {groupsCovered.toLocaleString('fa-IR')}
              </p>
            </div>
            <div className="artifact p-5">
              <span className="tag">نقاط نرخ دلار</span>
              <p className="mt-1 font-display text-heading-sm text-ink tabular">
                {currency.length.toLocaleString('fa-IR')}
              </p>
            </div>
          </div>

          <HistoricalTrends rows={ime} />
          <CurrencyHistoryChart rows={currency} />
        </div>
      )}
    </main>
  );
}
