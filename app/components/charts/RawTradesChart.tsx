'use client';

import React, { useMemo, useState } from 'react';
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { RawDataItem } from '../../../types';
import { getCommodityGroup } from '@/lib/aggregate';

type TradeRow = RawDataItem & {
  ContractType?: string;
  cBrokerSpcName?: string;
  DeliveryDate?: string;
};

type ColorMode = 'contract' | 'group' | 'producer';

interface Point {
  x: number;
  y: number;
  z: number;
  date: string;
  goods: string;
  producer: string;
  contract: string;
  broker: string;
  delivery: string;
  quantity: number;
  total: number;
}

const SERIES_COLORS = [
  '#c2410c', '#0f766e', '#1d4ed8', '#a21caf', '#65a30d',
  '#b45309', '#be123c', '#0e7490', '#4d7c0f', '#6d28d9',
];

const MODES: { key: ColorMode; label: string }[] = [
  { key: 'contract', label: 'نوع قرارداد' },
  { key: 'group', label: 'گروه کالا' },
  { key: 'producer', label: 'تولیدکننده' },
];

const fa = (n: number) => Math.round(n).toLocaleString('fa-IR');

function TradeTooltip({ active, payload }: { active?: boolean; payload?: { payload: Point }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const p = payload[0].payload;
  return (
    <div dir="rtl" className="card px-4 py-3 text-[13px] leading-6 text-ink shadow-lg">
      <div className="font-display">{p.goods}</div>
      <div className="text-slate">{p.producer}</div>
      <div>تاریخ: {p.date}</div>
      <div>قیمت: {fa(p.y)} ریال/تن</div>
      <div>حجم: {fa(p.quantity)} تن</div>
      <div>ارزش: {fa(p.total)} ریال</div>
      <div>قرارداد: {p.contract || '—'}</div>
      <div>کارگزار: {p.broker || '—'}</div>
      <div>تحویل: {p.delivery || '—'}</div>
    </div>
  );
}

export default function RawTradesChart({ rows }: { rows: RawDataItem[] }) {
  const [mode, setMode] = useState<ColorMode>('contract');

  const { series, dates, count } = useMemo(() => {
    const valid = (rows as TradeRow[]).filter(
      (r) => Number(r.Quantity) > 0 && Number(r.TotalPrice) > 0 && r.date
    );
    const dates = Array.from(new Set(valid.map((r) => String(r.date).slice(0, 10)))).sort();
    const idx = new Map(dates.map((d, i) => [d, i]));

    const map = new Map<string, Point[]>();
    valid.forEach((r, i) => {
      const date = String(r.date).slice(0, 10);
      const quantity = Number(r.Quantity);
      const total = Number(r.TotalPrice);
      const key =
        mode === 'group'
          ? getCommodityGroup(r.GoodsName)
          : mode === 'producer'
            ? r.ProducerName || 'نامشخص'
            : r.ContractType || 'نامشخص';
      // پراکندگی کوچک برای دیده‌شدن نقاط هم‌قیمت در یک روز
      const jitter = (((i * 37) % 11) - 5) / 20;
      const point: Point = {
        x: (idx.get(date) ?? 0) + jitter,
        y: total / quantity,
        z: quantity,
        date,
        goods: r.GoodsName,
        producer: r.ProducerName || '—',
        contract: r.ContractType || '',
        broker: r.cBrokerSpcName || '',
        delivery: r.DeliveryDate || '',
        quantity,
        total,
      };
      const list = map.get(key);
      if (list) list.push(point);
      else map.set(key, [point]);
    });

    return {
      series: Array.from(map.entries()).sort((a, b) => b[1].length - a[1].length),
      dates,
      count: valid.length,
    };
  }, [rows, mode]);

  const step = Math.max(1, Math.ceil(dates.length / 8));
  const ticks = dates.map((_, i) => i).filter((i) => i % step === 0);

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-heading-sm text-ink">بدون تجمیع · تک‌تک معاملات</h2>
          <p className="mt-1 text-[13px] text-slate">
            {count.toLocaleString('fa-IR')} معامله · اندازهٔ نقطه = حجم معامله
          </p>
        </div>
        <div className="flex items-center gap-2 text-[13px]">
          <span className="text-slate">رنگ‌بندی:</span>
          {MODES.map((m) => (
            <button
              key={m.key}
              onClick={() => setMode(m.key)}
              className={mode === m.key ? 'pill' : 'pill-ghost'}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      {count === 0 ? (
        <div className="py-16 text-center text-slate">معامله‌ای برای نمایش وجود ندارد.</div>
      ) : (
        <>
          <div dir="ltr" className="h-[420px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 20 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  domain={[-0.5, Math.max(dates.length - 0.5, 0.5)]}
                  ticks={ticks}
                  tickFormatter={(v: number) => dates[Math.round(v)] ?? ''}
                  allowDecimals={false}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  domain={['auto', 'auto']}
                  tickFormatter={(v: number) => Math.round(v).toLocaleString('en-US')}
                  width={90}
                />
                <ZAxis type="number" dataKey="z" range={[30, 300]} />
                <Tooltip content={<TradeTooltip />} cursor={{ strokeDasharray: '3 3' }} />
                {series.map(([name, pts], i) => (
                  <Scatter
                    key={name}
                    name={name}
                    data={pts}
                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    fillOpacity={0.6}
                    isAnimationActive={false}
                  />
                ))}
              </ScatterChart>
            </ResponsiveContainer>
          </div>

          {series.length > 1 && (
            <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate">
              {series.map(([name, pts], i) => (
                <span key={name} className="inline-flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }}
                  />
                  {name} ({pts.length.toLocaleString('fa-IR')})
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}