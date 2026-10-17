'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import ChartTooltip from './ChartTooltip';
import { CurrencyRow, faCompact } from './chartUtils';

interface Props {
  rows: CurrencyRow[];
}

function faDay(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('fa-IR', { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

/** Dual line — دلار حواله vs بازار آزاد — over time. */
export default function CurrencyHistoryChart({ rows }: Props) {
  const data = useMemo(
    () =>
      rows.map((r) => ({
        day: faDay(r.capturedAt),
        'حواله': r.havaleh,
        'بازار آزاد': r.azad,
      })),
    [rows]
  );

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6">
        <span className="tag">روند نرخ دلار</span>
        <h3 className="font-display text-heading-sm text-ink">حواله در برابر بازار آزاد</h3>
      </div>

      {data.length < 2 ? (
        <p className="py-16 text-center text-slate">هنوز داده کافی برای نمودار نرخ ارز ثبت نشده است.</p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#f0f0f1" />
              <XAxis dataKey="day" tick={{ fill: '#979799', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={faCompact} tick={{ fill: '#979799', fontSize: 12 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#ececec' }} />
              <Line type="monotone" dataKey="حواله" stroke="#17191c" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
              <Line type="monotone" dataKey="بازار آزاد" stroke="#5d2a1a" strokeWidth={2.5} dot={false} activeDot={{ r: 5 }} />
            </LineChart>
          </ResponsiveContainer>
          <div className="mt-4 flex gap-4">
            <span className="flex items-center gap-2 text-[13px] text-slate">
              <span className="inline-block h-2.5 w-2.5 rounded-pill bg-ink" /> حواله
            </span>
            <span className="flex items-center gap-2 text-[13px] text-slate">
              <span className="inline-block h-2.5 w-2.5 rounded-pill bg-sienna" /> بازار آزاد
            </span>
          </div>
        </>
      )}
    </div>
  );
}
