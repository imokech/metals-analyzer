'use client';

import React, { useMemo, useState } from 'react';
import {
  LineChart,
  Line,
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export interface HistorySeriesRow {
  period: string;
  group: string;
  producer?: string;
  quantity: number;
  value: number;
  averagePrice: number;
}

type Period = 'day' | 'week' | 'month';
type TabKey = 'price' | 'volume' | 'yoy';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'price', label: 'روند قیمت' },
  { key: 'volume', label: 'حجم و ارزش' },
  { key: 'yoy', label: 'مقایسه سالانه' },
];

const PALETTE = [
  '#c2410c', '#0f766e', '#1d4ed8', '#a21caf', '#65a30d',
  '#b45309', '#be123c', '#0e7490', '#4d7c0f', '#6d28d9',
];

const MONTHS = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند',
];

const MAX_DEFAULT_GROUPS = 3;

const fa = (n: number, digits = 0) =>
  n.toLocaleString('fa-IR', { maximumFractionDigits: digits });

const fmt = (v: unknown) => (v === null || v === undefined ? '—' : fa(Number(v)));

const tooltipStyle = { direction: 'rtl' as const, fontFamily: 'inherit', fontSize: 13 };

const Empty = ({ text }: { text: string }) => (
  <div className="py-16 text-center text-slate">{text}</div>
);

function Chips({
  groups,
  active,
  colorOf,
  onToggle,
}: {
  groups: string[];
  active: string[];
  colorOf: (g: string) => string;
  onToggle: (g: string) => void;
}) {
  return (
    <div className="mb-4 flex flex-wrap gap-2 text-[13px]">
      {groups.map((g) => {
        const on = active.includes(g);
        return (
          <button
            key={g}
            onClick={() => onToggle(g)}
            className={on ? 'pill' : 'pill-ghost'}
            style={on ? { background: colorOf(g), borderColor: colorOf(g) } : undefined}
          >
            {g}
          </button>
        );
      })}
    </div>
  );
}

/* ───────────── تب ۱: روند قیمت ───────────── */

function PricePanel({
  periods,
  rowMap,
  active,
  colorOf,
}: {
  periods: string[];
  rowMap: Map<string, HistorySeriesRow>;
  active: string[];
  colorOf: (g: string) => string;
}) {
  const data = useMemo(
    () =>
      periods.map((p) => {
        const o: Record<string, string | number | null> = { period: p };
        active.forEach((g) => {
          const r = rowMap.get(`${p}|${g}`);
          o[g] = r && r.averagePrice > 0 ? Math.round(r.averagePrice) : null;
        });
        return o;
      }),
    [periods, rowMap, active]
  );

  return (
    <>
      <p className="mb-3 text-[13px] text-slate">
        میانگین وزنی قیمت معامله (ریال/تن) = ارزش کل ÷ حجم کل هر دوره. دوره‌های بدون معامله خالی می‌مانند.
      </p>
      <div dir="ltr" className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" minTickGap={30} />
            <YAxis tickFormatter={(v: number) => fa(v)} width={100} domain={['auto', 'auto']} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
            {active.map((g) => (
              <Line
                key={g}
                type="monotone"
                dataKey={g}
                name={g}
                stroke={colorOf(g)}
                strokeWidth={2}
                dot={periods.length <= 60}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* ───────────── تب ۲: حجم و ارزش ───────────── */

function VolumePanel({
  periods,
  rowMap,
  active,
  colorOf,
}: {
  periods: string[];
  rowMap: Map<string, HistorySeriesRow>;
  active: string[];
  colorOf: (g: string) => string;
}) {
  const data = useMemo(
    () =>
      periods.map((p) => {
        const o: Record<string, string | number> = { period: p };
        let value = 0;
        active.forEach((g) => {
          const r = rowMap.get(`${p}|${g}`);
          o[g] = r ? r.quantity : 0;
          value += r ? r.value : 0;
        });
        o.__value = Math.round((value / 1e9) * 10) / 10;
        return o;
      }),
    [periods, rowMap, active]
  );

  return (
    <>
      <p className="mb-3 text-[13px] text-slate">
        میله‌ها حجم معامله (تن) به تفکیک گروه‌اند (محور چپ). خط مشکی مجموع ارزش گروه‌های انتخابی است (میلیارد ریال، محور راست).
      </p>
      <div dir="ltr" className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="period" minTickGap={30} />
            <YAxis yAxisId="left" tickFormatter={(v: number) => fa(v)} width={90} />
            <YAxis
              yAxisId="right"
              orientation="right"
              tickFormatter={(v: number) => fa(v)}
              width={90}
            />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
            {active.map((g) => (
              <Bar
                key={g}
                yAxisId="left"
                dataKey={g}
                name={g}
                stackId="q"
                fill={colorOf(g)}
                isAnimationActive={false}
              />
            ))}
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="__value"
              name="ارزش (میلیارد ریال)"
              stroke="#0f172a"
              strokeWidth={2}
              dot={false}
              isAnimationActive={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </>
  );
}

/* ───────────── تب ۳: مقایسه سالانه ───────────── */

function YoyPanel({
  series,
  groups,
  period,
}: {
  series: HistorySeriesRow[];
  groups: string[];
  period: Period;
}) {
  const [pickedGroup, setPickedGroup] = useState('');
  const [metric, setMetric] = useState<'price' | 'quantity'>('price');
  const group = groups.includes(pickedGroup) ? pickedGroup : groups[0];

  const model = useMemo(() => {
    const cell = new Map<string, { v: number; q: number }>();
    const years = new Set<string>();
    series
      .filter((r) => r.group === group)
      .forEach((r) => {
        const year = r.period.slice(0, 4);
        const m = Number(r.period.slice(5, 7));
        if (!m) return;
        years.add(year);
        const k = `${year}|${m}`;
        const c = cell.get(k) ?? { v: 0, q: 0 };
        c.v += r.value;
        c.q += r.quantity;
        cell.set(k, c);
      });
    const ys = Array.from(years).sort();
    const data = MONTHS.map((name, i) => {
      const o: Record<string, string | number | null> = { name };
      ys.forEach((y) => {
        const c = cell.get(`${y}|${i + 1}`);
        if (!c) o[y] = null;
        else if (metric === 'quantity') o[y] = c.q;
        else o[y] = c.q > 0 ? Math.round(c.v / c.q) : null;
      });
      return o;
    });
    return { years: ys, data };
  }, [series, group, metric]);

  // تجمیع هفتگی ماه را دقیق نمی‌دهد (هفته به ماه شروعش نسبت داده می‌شود)
  if (period === 'week') {
    return <Empty text="برای مقایسهٔ سالانه، تجمیع را «ماهانه» یا «روزانه» بگذارید و فیلتر را دوباره اعمال کنید." />;
  }
  if (!group) return <Empty text="داده‌ای برای نمایش نیست." />;

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-4 text-[13px]">
        <label className="flex items-center gap-2 text-slate">
         گروه / شرکت
          <select
            className="field !w-auto !py-2"
            value={group}
            onChange={(e) => setPickedGroup(e.target.value)}
          >
            {groups.map((g) => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
        </label>
        <div className="flex gap-2">
          <button className={metric === 'price' ? 'pill' : 'pill-ghost'} onClick={() => setMetric('price')}>
            میانگین قیمت
          </button>
          <button className={metric === 'quantity' ? 'pill' : 'pill-ghost'} onClick={() => setMetric('quantity')}>
            حجم معامله
          </button>
        </div>
      </div>
      <p className="mb-3 text-[13px] text-slate">
        هر خط یک سال است و ماه‌ها روی هم قرار می‌گیرند. ماه جاری و بازه‌های هنوز همگام‌نشده ناقص‌اند.
      </p>
      <div dir="ltr" className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={model.data} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="name" interval={0} />
            <YAxis tickFormatter={(v: number) => fa(v)} width={100} domain={['auto', 'auto']} />
            <Tooltip formatter={(v) => fmt(v)} contentStyle={tooltipStyle} />
            {model.years.map((y, i) => (
              <Line
                key={y}
                type="monotone"
                dataKey={y}
                name={y}
                stroke={PALETTE[i % PALETTE.length]}
                strokeWidth={i === model.years.length - 1 ? 3 : 2}
                connectNulls={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate">
        {model.years.map((y, i) => (
          <span key={y} className="inline-flex items-center gap-2">
            <span className="inline-block h-3 w-3 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            {y}
          </span>
        ))}
      </div>
    </>
  );
}

/* ───────────── کارت اصلی ───────────── */

export default function HistoryCharts({
  series: groupSeries,
  producerSeries = [],
  period,
}: {
  series: HistorySeriesRow[];
  producerSeries?: HistorySeriesRow[];
  period: Period;
}) {
  const [tab, setTab] = useState<TabKey>('price');
  const [selected, setSelected] = useState<string[]>([]);

  // وقتی فیلتر تولیدکننده فعال است، هر خط یک تولیدکننده است (و اگر چند گروه کالا باشد، «شرکت · گروه»)
  const byProducer = producerSeries.length > 0;

  const series = useMemo<HistorySeriesRow[]>(() => {
    if (!byProducer) return groupSeries;
    const multiGroup = new Set(producerSeries.map((r) => r.group)).size > 1;
    return producerSeries.map((r) => ({
      ...r,
      group: multiGroup ? `${r.producer} · ${r.group}` : (r.producer ?? r.group),
    }));
  }, [byProducer, groupSeries, producerSeries]);

  // گروه‌ها (یا تولیدکننده‌ها) به ترتیب ارزش کل
  const groups = useMemo(() => {
    const v = new Map<string, number>();
    series.forEach((r) => v.set(r.group, (v.get(r.group) ?? 0) + r.value));
    return Array.from(v.entries()).sort((a, b) => b[1] - a[1]).map((e) => e[0]);
  }, [series]);

  const active = useMemo(() => {
    const valid = selected.filter((g) => groups.includes(g));
    if (valid.length > 0) return valid;
    // با فیلتر تولیدکننده، همه‌ی خط‌ها (تا ۸ تا) نمایش داده می‌شوند
    return groups.slice(0, byProducer ? 8 : MAX_DEFAULT_GROUPS);
  }, [selected, groups, byProducer]);

  const colorOf = useMemo(() => {
    const m = new Map(groups.map((g, i) => [g, PALETTE[i % PALETTE.length]]));
    return (g: string) => m.get(g) ?? '#64748b';
  }, [groups]);

  const periods = useMemo(() => Array.from(new Set(series.map((r) => r.period))).sort(), [series]);
  const rowMap = useMemo(() => new Map(series.map((r) => [`${r.period}|${r.group}`, r])), [series]);

  const toggle = (g: string) => {
    if (active.includes(g)) {
      if (active.length > 1) setSelected(active.filter((x) => x !== g));
    } else {
      setSelected([...active, g]);
    }
  };

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <h2 className="font-display text-heading-sm text-ink">نمودارهای روند</h2>
        <div className="flex flex-wrap items-center gap-2 text-[13px]">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={tab === t.key ? 'pill' : 'pill-ghost'}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {series.length === 0 ? (
        <Empty text="داده‌ای برای نمایش نیست." />
      ) : (
        <>
          {tab !== 'yoy' && (
            <Chips groups={groups} active={active} colorOf={colorOf} onToggle={toggle} />
          )}
          {tab === 'price' && (
            <PricePanel periods={periods} rowMap={rowMap} active={active} colorOf={colorOf} />
          )}
          {tab === 'volume' && (
            <VolumePanel periods={periods} rowMap={rowMap} active={active} colorOf={colorOf} />
          )}
          {tab === 'yoy' && <YoyPanel series={series} groups={groups} period={period} />}
        </>
      )}
    </div>
  );
}