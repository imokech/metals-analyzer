'use client';

import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  Cell,
} from 'recharts';
import type { AggregatedData } from '../../../types';
import ChartTooltip from './ChartTooltip';

interface GlobalPrice {
  localLabel: string;
  price: number | null;
}
interface CurrencyRates {
  havaleh: number | null;
  azad: number | null;
}
interface Props {
  data: AggregatedData[];
  globalPrices: GlobalPrice[];
  currencyRates: CurrencyRates;
}

// Groups that trade against the free-market dollar (mirror of DataTable logic).
const AZAD_GROUPS = ['ورق گرم', 'ورق سرد', 'ورق گالوانیزه'];

/**
 * "Premium tracker" — for each metal group, compares the *implied* USD rate
 * (local avg price ÷ global price × 1000) against the actual USD rate. A
 * positive premium means the metal trades above global parity (relatively
 * expensive); negative means below (a potential value/arbitrage signal).
 */
export default function PremiumTracker({ data, globalPrices, currencyRates }: Props) {
  const rows = useMemo(() => {
    const map = new Map<string, number | null>();
    globalPrices.forEach((g) => map.set(g.localLabel, g.price));

    // Derive missing long-product globals from billet (شمش), as DataTable does.
    const billet = map.get('شمش');
    if (billet) {
      if (!map.get('تیرآهن')) map.set('تیرآهن', billet * 1.07);
      if (!map.get('نبشی')) map.set('نبشی', billet * 1.07);
      if (!map.get('ناودانی')) map.set('ناودانی', billet * 1.16);
    }

    return data
      .map((item) => {
        const globalPrice = map.get(item.groupName) ?? null;
        const actualRate = AZAD_GROUPS.includes(item.groupName)
          ? currencyRates.azad
          : currencyRates.havaleh;
        if (!globalPrice || !actualRate) return null;
        const impliedRate = (item.averagePrice / globalPrice) * 1000;
        const premium = (impliedRate / actualRate - 1) * 100;
        return { group: item.groupName, premium, impliedRate, actualRate };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null)
      .sort((a, b) => b.premium - a.premium);
  }, [data, globalPrices, currencyRates]);

  if (rows.length === 0) {
    return (
      <div className="card p-6 sm:p-8">
        <span className="tag">ابزار تحلیل</span>
        <h3 className="font-display text-heading-sm text-ink">شکاف قیمت با پارتیه جهانی</h3>
        <p className="py-10 text-center text-slate">
          برای محاسبه، به قیمت‌های جهانی و نرخ دلار نیاز است.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <span className="tag">ابزار تحلیل · صرف / تخفیف</span>
          <h3 className="font-display text-heading-sm text-ink">شکاف قیمت با پارتیه جهانی</h3>
          <p className="mt-1 max-w-lg text-[14px] text-slate">
            نرخ دلار ضمنی هر کالا در مقایسه با نرخ واقعی دلار. مقدار مثبت یعنی معامله بالاتر از
            پارتیه جهانی (گران)، منفی یعنی پایین‌تر (فرصت ارزش‌گذاری).
          </p>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={Math.max(220, rows.length * 46)}>
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
          <XAxis
            type="number"
            tickFormatter={(v) => `${v.toLocaleString('fa-IR', { maximumFractionDigits: 0 })}٪`}
            tick={{ fill: '#979799', fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            type="category"
            dataKey="group"
            tick={{ fill: '#17191c', fontSize: 13 }}
            tickLine={false}
            axisLine={false}
            width={90}
          />
          <Tooltip
            cursor={{ fill: '#f7f7f8' }}
            content={<ChartTooltip formatter={(v) => `${v.toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪`} />}
          />
          <ReferenceLine x={0} stroke="#17191c" strokeWidth={1.5} />
          <Bar dataKey="premium" name="صرف/تخفیف" radius={[6, 6, 6, 6]} barSize={22}>
            {rows.map((r, i) => (
              <Cell key={i} fill={r.premium >= 0 ? '#5d2a1a' : '#c9a08a'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
