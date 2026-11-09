'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import MultiSelect from '../components/MultiSelect';
import Spinner from '../components/Spinner';
import HistoryCharts from '../components/charts/HistoryCharts';

interface Meta {
  startJdate: string;
  today: string;
  cats: { code: number; name: string }[];
  coverage: { cat: number; status: string; n: number }[];
  lastFetch: string | null;
  subCats: { cat: number; subCat: number; label: string }[];
  groups: { cat: number; name: string }[];
  producers: { cat: number; name: string }[];
  tasvieh: string[];
  contracts: string[];
}

interface Filters {
  from: string;
  to: string;
  cat: number;
  subCat: number;
  groups: string[];
  producers: string[];
  tasvieh: string[];
  contracts: string[];
  period: 'day' | 'week' | 'month';
}

interface ReportRow {
  period: string;
  group: string;
  trades: number;
  quantity: number;
  supply: number;
  value: number;
  firstDate: string;
  lastDate: string;
  averagePrice: number;
  averageBasePrice: number;
  volumeToSupplyRatio: number;
  priceToBasePriceRatio: number;
  cashPercent: number;
  creditPercent: number;
}

interface TradeRow {
  id: number;
  jdate: string;
  cat: number;
  sub_cat: number | null;
  goods_name: string;
  producer_name: string | null;
  contract_type: string | null;
  tasvieh: string | null;
  base_price: number | null;
  price: number | null;
  quantity: number;
  total_price: number;
  arze: number | null;
}

interface Drill {
  group?: string;
  from?: string;
  to?: string;
  label: string;
}

const DATE_RE = /^\d{4}\/\d{2}\/\d{2}$/;
const PAGE_SIZE = 50;

const fa = (n: number | null | undefined, d = 0) =>
  n === null || n === undefined ? '—' : n.toLocaleString('fa-IR', { maximumFractionDigits: d });

function normDate(s: string): string {
  const t = s
    .trim()
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)))
    .replace(/-/g, '/');
  const p = t.split('/');
  return p.length === 3 ? `${p[0]}/${p[1].padStart(2, '0')}/${p[2].padStart(2, '0')}` : t;
}

function toQuery(f: Filters, extra: Record<string, string | number> = {}): string {
  const p = new URLSearchParams();
  p.set('from', f.from);
  p.set('to', f.to);
  if (f.cat) p.set('cat', String(f.cat));
  if (f.subCat) p.set('subCat', String(f.subCat));
  f.groups.forEach((v) => p.append('group', v));
  f.producers.forEach((v) => p.append('producer', v));
  f.tasvieh.forEach((v) => p.append('tasvieh', v));
  f.contracts.forEach((v) => p.append('contract', v));
  Object.entries(extra).forEach(([k, v]) => p.set(k, String(v)));
  return p.toString();
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'خطا در ارتباط با سرور');
  return json as T;
}

export default function HistoryPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [filters, setFilters] = useState<Filters | null>(null);
  const [applied, setApplied] = useState<Filters | null>(null);
  const [report, setReport] = useState<{ series: ReportRow[]; totals: ReportRow[] } | null>(null);
  const [drill, setDrill] = useState<Drill | null>(null);
  const [trades, setTrades] = useState<{ rows: TradeRow[]; total: number } | null>(null);
  const [page, setPage] = useState(1);
  const [tradedOnly, setTradedOnly] = useState(true);
  const [loading, setLoading] = useState(false);
  const [tradesLoading, setTradesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJson<Meta>('/api/history/meta')
      .then((m) => {
        setMeta(m);
        const initial: Filters = {
          from: m.startJdate,
          to: m.today,
          cat: 0,
          subCat: 0,
          groups: [],
          producers: [],
          tasvieh: [],
          contracts: [],
          period: 'month',
        };
        setFilters(initial);
        setApplied(initial);
      })
      .catch((e) => setError(e instanceof Error ? e.message : 'خطای ناشناخته'));
  }, []);

  useEffect(() => {
    if (!applied) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    getJson<{ series: ReportRow[]; totals: ReportRow[] }>(
      `/api/history/report?${toQuery(applied, { period: applied.period })}`
    )
      .then((r) => {
        if (cancelled) return;
        setReport(r);
        setDrill(null);
        setPage(1);
      })
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'خطای ناشناخته'))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [applied]);

  const tradeFilters = useMemo<Filters | null>(() => {
    if (!applied) return null;
    return {
      ...applied,
      from: drill?.from ?? applied.from,
      to: drill?.to ?? applied.to,
      groups: drill?.group ? [drill.group] : applied.groups,
    };
  }, [applied, drill]);

  useEffect(() => {
    if (!tradeFilters) return;
    let cancelled = false;
    setTradesLoading(true);
    getJson<{ rows: TradeRow[]; total: number }>(
      `/api/history/trades?${toQuery(tradeFilters, { page, pageSize: PAGE_SIZE, traded: tradedOnly ? 1 : 0 })}`
    )
      .then((t) => !cancelled && setTrades(t))
      .catch((e) => !cancelled && setError(e instanceof Error ? e.message : 'خطای ناشناخته'))
      .finally(() => !cancelled && setTradesLoading(false));
    return () => {
      cancelled = true;
    };
  }, [tradeFilters, page, tradedOnly]);

  const update = (patch: Partial<Filters>) => setFilters((f) => (f ? { ...f, ...patch } : f));

  const apply = () => {
    if (!filters) return;
    const from = normDate(filters.from);
    const to = normDate(filters.to);
    if (!DATE_RE.test(from) || !DATE_RE.test(to) || from > to) {
      setError('تاریخ‌ها را به شکل ۱۴۰۴/۰۱/۰۱ و با ترتیب درست وارد کنید.');
      return;
    }
    setApplied({ ...filters, from, to });
  };

  const subCatOptions = useMemo(
    () => (meta && filters ? meta.subCats.filter((s) => !filters.cat || s.cat === filters.cat) : []),
    [meta, filters]
  );
  const groupOptions = useMemo(
    () =>
      meta && filters
        ? Array.from(new Set(meta.groups.filter((g) => !filters.cat || g.cat === filters.cat).map((g) => g.name))).sort()
        : [],
    [meta, filters]
  );
  const producerOptions = useMemo(
    () =>
      meta && filters
        ? Array.from(new Set(meta.producers.filter((p) => !filters.cat || p.cat === filters.cat).map((p) => p.name)))
        : [],
    [meta, filters]
  );

  const coverage = useMemo(() => {
    if (!meta) return null;
    const total = meta.coverage.reduce((s, c) => s + c.n, 0);
    const done = meta.coverage.filter((c) => c.status === 'ok' || c.status === 'empty').reduce((s, c) => s + c.n, 0);
    const failed = meta.coverage.filter((c) => c.status === 'failed').reduce((s, c) => s + c.n, 0);
    return { total, done, failed, complete: total > 0 && done === total };
  }, [meta]);

  const kpi = useMemo(() => {
    const t = report?.totals ?? [];
    const quantity = t.reduce((s, r) => s + r.quantity, 0);
    const value = t.reduce((s, r) => s + r.value, 0);
    return { quantity, value, trades: t.reduce((s, r) => s + r.trades, 0), avg: quantity > 0 ? value / quantity : 0 };
  }, [report]);

  if (!meta || !filters) {
    return (
      <main className="mx-auto max-w-page px-4 py-10 sm:px-6 lg:px-8">
        {error ? <div className="accent-card px-6 py-4 text-center text-sienna">{error}</div> : <Spinner />}
      </main>
    );
  }

  const totalPages = trades ? Math.max(1, Math.ceil(trades.total / PAGE_SIZE)) : 1;

  return (
    <main className="mx-auto max-w-page px-4 py-10 sm:px-6 lg:px-8">
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag">بورس کالای ایران · آرشیو</span>
          <h1 className="mt-3 font-display text-heading leading-tight text-ink">تاریخچه معاملات</h1>
        </div>
        <Link href="/" className="pill-ghost">بازگشت به داشبورد</Link>
      </header>

      {/* وضعیت داده */}
      {coverage && (
        <section className="card mb-6 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3 text-[14px]">
            <span className="text-ink">
              پنجره‌های همگام‌شده: {fa(coverage.done)} از {fa(coverage.total)}
            </span>
            <span className="text-slate">
              {coverage.failed > 0 && `ناموفق: ${fa(coverage.failed)} · `}
              آخرین دریافت: {meta.lastFetch ? new Date(meta.lastFetch).toLocaleString('fa-IR') : '—'}
            </span>
          </div>
          {!coverage.complete && (
            <p className="mt-2 text-[13px] text-sienna">
              همگام‌سازی هنوز کامل نشده است؛ جمع‌ها فقط بازه‌های دریافت‌شده را شامل می‌شوند.
            </p>
          )}
        </section>
      )}

      {/* فیلترها */}
      <section className="card mb-8 p-6">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-6">
          <div className="md:col-span-1">
            <label className="mb-2 block text-[13px] text-slate">از تاریخ</label>
            <input className="field !py-3" value={filters.from} onChange={(e) => update({ from: e.target.value })} />
          </div>
          <div className="md:col-span-1">
            <label className="mb-2 block text-[13px] text-slate">تا تاریخ</label>
            <input className="field !py-3" value={filters.to} onChange={(e) => update({ to: e.target.value })} />
          </div>
          <div className="md:col-span-1">
            <label htmlFor="hCat" className="mb-2 block text-[13px] text-slate">گروه اصلی</label>
            <select
              id="hCat"
              className="field !py-3"
              value={filters.cat}
              onChange={(e) => update({ cat: Number(e.target.value), subCat: 0, groups: [], producers: [] })}
            >
              <option value="0">همه</option>
              {meta.cats.map((c) => <option key={c.code} value={c.code}>{c.name}</option>)}
            </select>
          </div>
          <div className="md:col-span-2">
            <label htmlFor="hSub" className="mb-2 block text-[13px] text-slate">زیرگروه کالا</label>
            <select
              id="hSub"
              className="field !py-3"
              value={filters.subCat}
              onChange={(e) => update({ subCat: Number(e.target.value) })}
            >
              <option value="0">[همه زیرگروه‌ها]</option>
              {subCatOptions.map((s) => <option key={`${s.cat}-${s.subCat}`} value={s.subCat}>{s.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-1">
            <label htmlFor="hPeriod" className="mb-2 block text-[13px] text-slate">تجمیع</label>
            <select
              id="hPeriod"
              className="field !py-3"
              value={filters.period}
              onChange={(e) => update({ period: e.target.value as Filters['period'] })}
            >
              <option value="month">ماهانه</option>
              <option value="week">هفتگی</option>
              <option value="day">روزانه</option>
            </select>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 border-t border-hairline pt-6 md:grid-cols-4">
          <MultiSelect label="گروه کالا" options={groupOptions} selected={filters.groups} onChange={(v) => update({ groups: v })} placeholder="همه موارد" />
          <MultiSelect label="تولید کننده" options={producerOptions} selected={filters.producers} onChange={(v) => update({ producers: v })} placeholder="همه موارد" />
          <MultiSelect label="نوع تسویه" options={meta.tasvieh} selected={filters.tasvieh} onChange={(v) => update({ tasvieh: v })} placeholder="همه موارد" />
          <MultiSelect label="نوع قرارداد" options={meta.contracts} selected={filters.contracts} onChange={(v) => update({ contracts: v })} placeholder="همه موارد" />
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={apply} disabled={loading} className="pill h-12 px-8">
            {loading ? 'در حال بارگذاری…' : 'اعمال فیلتر'}
          </button>
        </div>
      </section>

      {error && (
        <div className="accent-card mb-6 px-6 py-4 text-center text-sienna" role="alert">{error}</div>
      )}
      {loading && <Spinner />}

      {!loading && report && (
        <div className="space-y-8">
          {report.totals.length === 0 ? (
            <div className="card py-16 text-center text-slate">برای این فیلترها داده‌ای در آرشیو نیست.</div>
          ) : (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
                <div className="artifact p-5">
                  <span className="tag">ارزش کل (ریال)</span>
                  <p className="mt-1 font-display text-heading-sm tabular text-ink">{fa(kpi.value)}</p>
                </div>
                <div className="artifact p-5">
                  <span className="tag">حجم کل (تن)</span>
                  <p className="mt-1 font-display text-heading-sm tabular text-ink">{fa(kpi.quantity)}</p>
                </div>
                <div className="artifact p-5">
                  <span className="tag">میانگین وزنی قیمت</span>
                  <p className="mt-1 font-display text-heading-sm tabular text-ink">{fa(kpi.avg)}</p>
                </div>
                <div className="artifact p-5">
                  <span className="tag">تعداد ردیف</span>
                  <p className="mt-1 font-display text-heading-sm tabular text-ink">{fa(kpi.trades)}</p>
                </div>
              </div>

              <HistoryCharts series={report.series} period={applied?.period ?? 'month'} />

              <div>
                <h2 className="mb-3 font-display text-heading-sm text-ink">جمع بازه به تفکیک گروه کالا</h2>
                <div className="card overflow-x-auto">
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr className="border-b border-hairline text-right text-slate">
                        <th className="p-3">گروه کالا</th>
                        <th className="p-3">حجم عرضه</th>
                        <th className="p-3">حجم معامله</th>
                        <th className="p-3">قیمت پایه</th>
                        <th className="p-3">میانگین قیمت</th>
                        <th className="p-3">معامله/عرضه ٪</th>
                        <th className="p-3">فی/پایه ٪</th>
                        <th className="p-3">نقدی ٪</th>
                        <th className="p-3">اعتباری ٪</th>
                        <th className="p-3">ارزش</th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {report.totals.map((r) => (
                        <tr
                          key={r.group}
                          onClick={() => { setDrill({ group: r.group, label: r.group }); setPage(1); }}
                          className="cursor-pointer border-b border-hairline hover:bg-black/5"
                        >
                          <td className="p-3 text-ink">{r.group}</td>
                          <td className="p-3">{fa(r.supply)}</td>
                          <td className="p-3">{fa(r.quantity)}</td>
                          <td className="p-3">{fa(r.averageBasePrice)}</td>
                          <td className="p-3">{fa(r.averagePrice)}</td>
                          <td className="p-3">{fa(r.volumeToSupplyRatio, 1)}</td>
                          <td className="p-3">{fa(r.priceToBasePriceRatio, 1)}</td>
                          <td className="p-3">{fa(r.cashPercent, 1)}</td>
                          <td className="p-3">{fa(r.creditPercent, 1)}</td>
                          <td className="p-3">{fa(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h2 className="mb-3 font-display text-heading-sm text-ink">روند به تفکیک دوره و گروه</h2>
                <div className="card max-h-[480px] overflow-auto">
                  <table className="w-full text-[14px]">
                    <thead className="sticky top-0 bg-white">
                      <tr className="border-b border-hairline text-right text-slate">
                        <th className="p-3">دوره</th>
                        <th className="p-3">گروه کالا</th>
                        <th className="p-3">حجم معامله</th>
                        <th className="p-3">میانگین قیمت</th>
                        <th className="p-3">فی/پایه ٪</th>
                        <th className="p-3">ارزش</th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {[...report.series].reverse().map((r) => (
                        <tr
                          key={`${r.period}|${r.group}`}
                          onClick={() => {
                            setDrill({
                              group: r.group,
                              from: r.firstDate,
                              to: r.lastDate,
                              label: `${r.group} · ${r.period}`,
                            });
                            setPage(1);
                          }}
                          className="cursor-pointer border-b border-hairline hover:bg-black/5"
                        >
                          <td className="p-3">{r.period}</td>
                          <td className="p-3 text-ink">{r.group}</td>
                          <td className="p-3">{fa(r.quantity)}</td>
                          <td className="p-3">{fa(r.averagePrice)}</td>
                          <td className="p-3">{fa(r.priceToBasePriceRatio, 1)}</td>
                          <td className="p-3">{fa(r.value)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h2 className="font-display text-heading-sm text-ink">
                    معاملات{drill ? ` — ${drill.label}` : ''}
                    {trades ? ` (${fa(trades.total)} ردیف)` : ''}
                  </h2>
                  <div className="flex items-center gap-4 text-[13px] text-slate">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={tradedOnly}
                        onChange={(e) => { setTradedOnly(e.target.checked); setPage(1); }}
                      />
                      فقط ردیف‌های دارای معامله
                    </label>
                    {drill && (
                      <button className="pill-ghost" onClick={() => { setDrill(null); setPage(1); }}>
                        حذف محدودیت
                      </button>
                    )}
                  </div>
                </div>
                <div className={`card overflow-x-auto ${tradesLoading ? 'opacity-60' : ''}`}>
                  <table className="w-full text-[14px]">
                    <thead>
                      <tr className="border-b border-hairline text-right text-slate">
                        <th className="p-3">تاریخ</th>
                        <th className="p-3">کالا</th>
                        <th className="p-3">تولیدکننده</th>
                        <th className="p-3">قرارداد</th>
                        <th className="p-3">تسویه</th>
                        <th className="p-3">قیمت پایه</th>
                        <th className="p-3">قیمت</th>
                        <th className="p-3">حجم</th>
                        <th className="p-3">ارزش</th>
                      </tr>
                    </thead>
                    <tbody className="tabular">
                      {(trades?.rows ?? []).map((t) => (
                        <tr key={t.id} className="border-b border-hairline">
                          <td className="p-3">{t.jdate}</td>
                          <td className="p-3 text-ink">{t.goods_name}</td>
                          <td className="p-3">{t.producer_name ?? '—'}</td>
                          <td className="p-3">{t.contract_type ?? '—'}</td>
                          <td className="p-3">{t.tasvieh ?? '—'}</td>
                          <td className="p-3">{fa(t.base_price)}</td>
                          <td className="p-3">{fa(t.price)}</td>
                          <td className="p-3">{fa(t.quantity)}</td>
                          <td className="p-3">{fa(t.total_price)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4 flex items-center justify-center gap-4 text-[14px]">
                  <button className="pill-ghost" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>قبلی</button>
                  <span className="text-slate">صفحه {fa(page)} از {fa(totalPages)}</span>
                  <button className="pill-ghost" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>بعدی</button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </main>
  );
}