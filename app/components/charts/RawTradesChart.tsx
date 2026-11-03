'use client';

import React, { useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  Cell,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  ZAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
} from 'recharts';
import type { RawDataItem } from '../../../types';

/* ───────────── انواع و ابزارها ───────────── */

// تایپ مستقل از types.ts تا با RawDataItem تداخل نداشته باشد
interface TradeRow {
  GoodsName: string;
  ProducerName?: string | null;
  ContractType?: string | null;
  cBrokerSpcName?: string | null;
  DeliveryDate?: string | null;
  date?: string | null;
  Price?: number | null;
  MinPrice?: number | null;
  MaxPrice?: number | null;
  ArzeBasePrice?: number | null;
  arze?: number | null;
  taghaza?: number | null;
  Quantity?: number | null;
  TotalPrice?: number | null;
  arzehPk?: string | number | null;
  xTalarReportPK?: number | null;
}

interface TipData {
  title: string;
  subtitle?: string;
  lines: [string, string][];
}

type TabKey = 'premium' | 'lanes' | 'depth';

const TABS: { key: TabKey; label: string }[] = [
  { key: 'premium', label: 'پریمیوم هر معامله' },
  { key: 'lanes', label: 'تولیدکننده × روز' },
  { key: 'depth', label: 'عرضه و تقاضا' },
];

const PALETTE = [
  '#c2410c', '#0f766e', '#1d4ed8', '#a21caf', '#65a30d',
  '#b45309', '#be123c', '#0e7490', '#4d7c0f', '#6d28d9',
];
const FALLBACK_COLOR = '#64748b';

const CONTRACT_ORDER = ['نقدی', 'نقدی (مچینگ)', 'نسیه', 'نسیه (مچینگ)', 'سلف', 'سلف (مچینگ)'];
const CONTRACT_COLORS: Record<string, string> = {
  'نقدی': '#0f766e',
  'نقدی (مچینگ)': '#5eead4',
  'نسیه': '#c2410c',
  'نسیه (مچینگ)': '#fdba74',
  'سلف': '#1d4ed8',
  'سلف (مچینگ)': '#93c5fd',
};
const contractRank = (c: string) => {
  const i = CONTRACT_ORDER.indexOf(c);
  return i === -1 ? 99 : i;
};
const contractColor = (c: string) => CONTRACT_COLORS[c] ?? FALLBACK_COLOR;

const MAX_LANES = 20;
const INITIAL_OFFERS = 20;

const num = (v: unknown) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};
const dayOf = (r: TradeRow) => String(r.date ?? '').slice(0, 10);
const shortDay = (d: string) => d.slice(5);
const fa = (n: number, digits = 0) =>
  n.toLocaleString('fa-IR', { maximumFractionDigits: digits });
const producerOf = (r: TradeRow) => r.ProducerName || 'نامشخص';
const clip = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function thinTicks(count: number, maxTicks = 8) {
  const step = Math.max(1, Math.ceil(count / maxTicks));
  return Array.from({ length: count }, (_, i) => i).filter((i) => i % step === 0);
}

function Tip({ active, payload }: { active?: boolean; payload?: { payload: { tip?: TipData } }[] }) {
  if (!active || !payload || payload.length === 0) return null;
  const tip = payload[0].payload.tip;
  if (!tip) return null;
  return (
    <div dir="rtl" className="card px-4 py-3 text-[13px] leading-6 text-ink shadow-lg">
      <div className="font-display">{tip.title}</div>
      {tip.subtitle && <div className="text-slate">{tip.subtitle}</div>}
      {tip.lines.map(([k, v]) => (
        <div key={k}>
          {k}: {v}
        </div>
      ))}
    </div>
  );
}

function Legend({ items }: { items: { name: string; color: string; extra?: string }[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-[13px] text-slate">
      {items.map((it) => (
        <span key={it.name} className="inline-flex items-center gap-2">
          <span className="inline-block h-3 w-3 rounded-full" style={{ background: it.color }} />
          {it.name}
          {it.extra ? ` (${it.extra})` : ''}
        </span>
      ))}
    </div>
  );
}

const Empty = ({ text }: { text: string }) => (
  <div className="py-16 text-center text-slate">{text}</div>
);

/* ───────────── تب ۱: پریمیوم هر معامله ───────────── */

interface PremiumPoint {
  idx: number;
  premium: number;
  producer: string;
  day: string;
  tip: TipData;
}

function PremiumPanel({ trades }: { trades: TradeRow[] }) {
  const model = useMemo(() => {
    const valid = trades.filter((r) => num(r.ArzeBasePrice) > 0);

    const volByProducer = new Map<string, number>();
    valid.forEach((r) =>
      volByProducer.set(producerOf(r), (volByProducer.get(producerOf(r)) ?? 0) + num(r.Quantity))
    );
    const producers = Array.from(volByProducer.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
    const colorOf = new Map(producers.map((p, i) => [p, PALETTE[i % PALETTE.length]]));

    let weightedExtra = 0;
    let weightedBase = 0;

    const points: PremiumPoint[] = valid.map((r, idx) => {
      const q = num(r.Quantity);
      const price = num(r.TotalPrice) / q;
      const base = num(r.ArzeBasePrice);
      const premium = ((price - base) / base) * 100;
      weightedExtra += (price - base) * q;
      weightedBase += base * q;

      const lines: [string, string][] = [
        ['تاریخ', dayOf(r)],
        ['قرارداد', r.ContractType || '—'],
        ['قیمت معامله', `${fa(price)} ریال/تن`],
        ['قیمت پایه', `${fa(base)} ریال/تن`],
        ['پریمیوم', `${fa(premium, 2)}٪`],
        ['حجم', `${fa(q)} تن`],
        ['کارگزار', r.cBrokerSpcName || '—'],
      ];
      if (num(r.MinPrice) > 0 && num(r.MaxPrice) > 0) {
        lines.splice(4, 0, ['بازهٔ قیمت', `${fa(num(r.MinPrice))} تا ${fa(num(r.MaxPrice))}`]);
      }
      return {
        idx,
        premium,
        producer: producerOf(r),
        day: dayOf(r),
        tip: { title: r.GoodsName, subtitle: producerOf(r), lines },
      };
    });

    const firstIdxOfDay = new Map<string, number>();
    points.forEach((p) => {
      if (!firstIdxOfDay.has(p.day)) firstIdxOfDay.set(p.day, p.idx);
    });
    const dayStarts = Array.from(firstIdxOfDay.entries()).map(([day, idx]) => ({ day, idx }));

    return {
      points,
      producers,
      colorOf,
      dayStarts,
      atBase: points.filter((p) => Math.abs(p.premium) < 0.05).length,
      above: points.filter((p) => p.premium >= 0.05).length,
      below: points.filter((p) => p.premium <= -0.05).length,
      avg: weightedBase > 0 ? (weightedExtra / weightedBase) * 100 : 0,
    };
  }, [trades]);

  if (model.points.length === 0) return <Empty text="معامله‌ای با قیمت پایهٔ معتبر وجود ندارد." />;

  const tickIdx = thinTicks(model.dayStarts.length).map((i) => model.dayStarts[i].idx);

  return (
    <>
      <p className="mb-3 text-[13px] text-slate">
        هر میله یک معامله است، به ترتیب زمان. ارتفاع = فاصلهٔ قیمت معامله از قیمت پایه (٪).
        {' '}
        {fa(model.atBase)} معامله روی قیمت پایه · {fa(model.above)} بالاتر · {fa(model.below)} پایین‌تر
        · میانگین وزنی پریمیوم {fa(model.avg, 2)}٪
      </p>
      <div dir="ltr" className="h-[420px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={model.points} margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis
              dataKey="idx"
              ticks={tickIdx}
              interval={0}
              tickFormatter={(v: number) => shortDay(model.points[v]?.day ?? '')}
            />
            <YAxis tickFormatter={(v: number) => `${fa(v, 1)}٪`} width={70} />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <ReferenceLine y={0} stroke="#334155" />
            {model.dayStarts.slice(1).map((d) => (
              <ReferenceLine key={d.day} x={d.idx} stroke="#cbd5e1" strokeDasharray="4 4" />
            ))}
            <Bar dataKey="premium" isAnimationActive={false}>
              {model.points.map((p) => (
                <Cell key={p.idx} fill={model.colorOf.get(p.producer) ?? FALLBACK_COLOR} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={model.producers.slice(0, 10).map((p) => ({
          name: p,
          color: model.colorOf.get(p) ?? FALLBACK_COLOR,
        }))}
      />
    </>
  );
}

/* ───────────── تب ۲: تولیدکننده × روز ───────────── */

interface LanePoint {
  x: number;
  y: number;
  z: number;
  tip: TipData;
}

function LanesPanel({ trades }: { trades: TradeRow[] }) {
  const model = useMemo(() => {
    const days = Array.from(new Set(trades.map(dayOf))).sort();
    const dayIdx = new Map(days.map((d, i) => [d, i]));

    const vol = new Map<string, number>();
    trades.forEach((r) => vol.set(producerOf(r), (vol.get(producerOf(r)) ?? 0) + num(r.Quantity)));
    const allProducers = Array.from(vol.entries())
      .sort((a, b) => b[1] - a[1])
      .map((e) => e[0]);
    const producers = allProducers.slice(0, MAX_LANES);
    const laneIdx = new Map(producers.map((p, i) => [p, i]));

    const used = trades.filter((r) => laneIdx.has(producerOf(r)));
    const contracts = Array.from(new Set(used.map((r) => r.ContractType || 'نامشخص'))).sort(
      (a, b) => contractRank(a) - contractRank(b)
    );
    const cIdx = new Map(contracts.map((c, i) => [c, i]));
    const cStep = contracts.length > 1 ? 0.8 / (contracts.length - 1) : 0;

    const groupKey = (r: TradeRow) => `${producerOf(r)}|${dayOf(r)}|${r.ContractType || 'نامشخص'}`;
    const groupSize = new Map<string, number>();
    used.forEach((r) => groupSize.set(groupKey(r), (groupSize.get(groupKey(r)) ?? 0) + 1));
    const seen = new Map<string, number>();

    const series = new Map<string, LanePoint[]>(contracts.map((c) => [c, []]));
    used.forEach((r) => {
      const contract = r.ContractType || 'نامشخص';
      const key = groupKey(r);
      const k = seen.get(key) ?? 0;
      seen.set(key, k + 1);
      const m = groupSize.get(key) ?? 1;
      const q = num(r.Quantity);
      const price = q > 0 ? num(r.TotalPrice) / q : 0;

      series.get(contract)?.push({
        x: (dayIdx.get(dayOf(r)) ?? 0) + (k - (m - 1) / 2) * 0.12,
        y: (laneIdx.get(producerOf(r)) ?? 0) + ((cIdx.get(contract) ?? 0) - (contracts.length - 1) / 2) * cStep,
        z: q,
        tip: {
          title: r.GoodsName,
          subtitle: producerOf(r),
          lines: [
            ['تاریخ', dayOf(r)],
            ['قرارداد', contract],
            ['حجم', `${fa(q)} تن`],
            ['قیمت', price > 0 ? `${fa(price)} ریال/تن` : '—'],
            ['تحویل', r.DeliveryDate || '—'],
            ['کارگزار', r.cBrokerSpcName || '—'],
          ],
        },
      });
    });

    return { days, producers, contracts, series, hidden: allProducers.length - producers.length };
  }, [trades]);

  if (model.producers.length === 0) return <Empty text="معامله‌ای برای نمایش وجود ندارد." />;

  const P = model.producers.length;
  const xTicks = thinTicks(model.days.length);
  const yTicks = model.producers.map((_, i) => i);

  return (
    <>
      <p className="mb-3 text-[13px] text-slate">
        هر ردیف یک تولیدکننده و هر ستون یک روز است. اندازهٔ دایره = حجم، رنگ = نوع قرارداد.
        {model.hidden > 0 && ` (${fa(MAX_LANES)} تولیدکنندهٔ برتر از نظر حجم؛ ${fa(model.hidden)} مورد دیگر پنهان است.)`}
      </p>
      <div dir="ltr" className="w-full" style={{ height: Math.max(280, P * 56 + 90) }}>
        <ResponsiveContainer width="100%" height="100%">
          <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              type="number"
              dataKey="x"
              domain={[-0.5, Math.max(model.days.length - 0.5, 0.5)]}
              ticks={xTicks}
              allowDecimals={false}
              tickFormatter={(v: number) => shortDay(model.days[Math.round(v)] ?? '')}
            />
            <YAxis
              type="number"
              dataKey="y"
              domain={[-0.5, P - 0.5]}
              ticks={yTicks}
              reversed
              interval={0}
              width={170}
              tickFormatter={(v: number) => clip(model.producers[Math.round(v)] ?? '', 24)}
            />
            <ZAxis type="number" dataKey="z" range={[40, 260]} />
            <Tooltip content={<Tip />} cursor={{ strokeDasharray: '3 3' }} />
            {model.contracts.map((c) => (
              <Scatter
                key={c}
                name={c}
                data={model.series.get(c) ?? []}
                fill={contractColor(c)}
                fillOpacity={0.75}
                isAnimationActive={false}
              />
            ))}
          </ScatterChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={model.contracts.map((c) => ({
          name: c,
          color: contractColor(c),
          extra: fa(model.series.get(c)?.length ?? 0),
        }))}
      />
    </>
  );
}

/* ───────────── تب ۳: عرضه، تقاضا، معامله‌شده ───────────── */

interface Offer {
  id: string;
  label: string;
  supply: number;
  demand: number;
  traded: number;
  tip: TipData;
}

function DepthPanel({ rows }: { rows: TradeRow[] }) {
  const [showAll, setShowAll] = useState(false);

  const model = useMemo(() => {
    interface Acc {
      producer: string;
      contract: string;
      hasMain: boolean;
      day: string;
      goods: string;
      supply: number;
      demand: number;
      traded: number;
    }
    const map = new Map<string, Acc>();

    rows.forEach((r, i) => {
      const day = dayOf(r);
      // ردیف‌های مچینگ (xTalarReportPK = 0) با همان arzehPk به عرضهٔ اصلی ادغام می‌شوند
      const key = r.arzehPk ? `${r.arzehPk}|${day}` : `row-${i}`;
      const isMain = num(r.xTalarReportPK) !== 0;
      let acc = map.get(key);
      if (!acc) {
        acc = {
          producer: producerOf(r),
          contract: '',
          hasMain: false,
          day,
          goods: r.GoodsName,
          supply: 0,
          demand: 0,
          traded: 0,
        };
        map.set(key, acc);
      }
      acc.supply += num(r.arze);
      acc.demand += num(r.taghaza);
      acc.traded += num(r.Quantity);
      const contract = r.ContractType || 'نامشخص';
      if (isMain) {
        acc.contract = contract;
        acc.hasMain = true;
      } else if (!acc.hasMain && !acc.contract) {
        acc.contract = contract.replace(/\s*\(مچینگ\)/, '');
      }
    });

    const offers: Offer[] = Array.from(map.values())
      .filter((o) => o.supply > 0 || o.demand > 0 || o.traded > 0)
      .sort((a, b) => b.supply - a.supply || b.traded - a.traded)
      .map((o, i) => ({
        id: String(i),
        label: `${clip(o.producer, 20)} · ${o.contract || '—'} · ${shortDay(o.day)}`,
        supply: o.supply,
        demand: o.demand,
        traded: o.traded,
        tip: {
          title: o.goods,
          subtitle: o.producer,
          lines: [
            ['تاریخ', o.day],
            ['قرارداد', o.contract || '—'],
            ['عرضه', `${fa(o.supply)} تن`],
            ['تقاضا', `${fa(o.demand)} تن`],
            ['معامله‌شده', `${fa(o.traded)} تن`],
            ['نسبت پرشدن عرضه', o.supply > 0 ? `${fa((o.traded / o.supply) * 100, 1)}٪` : '—'],
          ],
        },
      }));

    const totalSupply = offers.reduce((s, o) => s + o.supply, 0);
    const totalTraded = offers.reduce((s, o) => s + o.traded, 0);
    return { offers, totalSupply, totalTraded };
  }, [rows]);

  if (model.offers.length === 0) return <Empty text="عرضه‌ای برای نمایش وجود ندارد." />;

  const shown = showAll ? model.offers : model.offers.slice(0, INITIAL_OFFERS);
  const labelOf = (id: string) => model.offers[Number(id)]?.label ?? '';

  return (
    <>
      <p className="mb-3 text-[13px] text-slate">
        هر ردیف یک عرضه است؛ معاملات مچینگ به عرضهٔ اصلی خود ادغام شده‌اند. عرضه
        {' '}{fa(model.totalSupply)} تن · معامله‌شده {fa(model.totalTraded)} تن
        {model.totalSupply > 0 && ` (${fa((model.totalTraded / model.totalSupply) * 100, 1)}٪ پرشدن)`}
      </p>
      <div dir="ltr" className="w-full" style={{ height: shown.length * 54 + 70 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            layout="vertical"
            data={shown}
            margin={{ top: 10, right: 20, bottom: 10, left: 10 }}
            barCategoryGap="20%"
          >
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" tickFormatter={(v: number) => fa(v)} />
            <YAxis
              type="category"
              dataKey="id"
              interval={0}
              width={240}
              tickFormatter={(v: string) => labelOf(v)}
            />
            <Tooltip content={<Tip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
            <Bar dataKey="supply" name="عرضه" fill="#94a3b8" barSize={10} isAnimationActive={false} />
            <Bar dataKey="demand" name="تقاضا" fill="#c2410c" barSize={10} isAnimationActive={false} />
            <Bar dataKey="traded" name="معامله‌شده" fill="#0f766e" barSize={10} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Legend
        items={[
          { name: 'عرضه', color: '#94a3b8' },
          { name: 'تقاضا', color: '#c2410c' },
          { name: 'معامله‌شده', color: '#0f766e' },
        ]}
      />
      {model.offers.length > INITIAL_OFFERS && (
        <div className="mt-4 text-center">
          <button onClick={() => setShowAll((v) => !v)} className="pill-ghost">
            {showAll
              ? `نمایش ${fa(INITIAL_OFFERS)} عرضهٔ برتر`
              : `نمایش همهٔ ${fa(model.offers.length)} عرضه`}
          </button>
        </div>
      )}
    </>
  );
}

/* ───────────── کارت اصلی ───────────── */

export default function RawTradesChart({ rows }: { rows: RawDataItem[] }) {
  const [tab, setTab] = useState<TabKey>('premium');

  const all = useMemo(
    () => (rows as unknown as TradeRow[]).filter((r) => r.date),
    [rows]
  );

  // معاملات واقعی، به ترتیب زمان (sort پایدار است و ترتیب اصلی در یک روز حفظ می‌شود)
  const trades = useMemo(
    () =>
      all
        .filter((r) => num(r.Quantity) > 0 && num(r.TotalPrice) > 0)
        .slice()
        .sort((a, b) => dayOf(a).localeCompare(dayOf(b))),
    [all]
  );

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-heading-sm text-ink">بدون تجمیع · تک‌تک معاملات</h2>
          <p className="mt-1 text-[13px] text-slate">
            {fa(trades.length)} معامله از {fa(all.length)} ردیف دریافتی
          </p>
        </div>
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

      {all.length === 0 ? (
        <Empty text="معامله‌ای برای نمایش وجود ندارد." />
      ) : tab === 'premium' ? (
        <PremiumPanel trades={trades} />
      ) : tab === 'lanes' ? (
        <LanesPanel trades={trades} />
      ) : (
        <DepthPanel rows={all} />
      )}
    </div>
  );
}