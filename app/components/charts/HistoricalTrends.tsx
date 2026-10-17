'use client';

import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from 'recharts';
import MultiSelect from '../MultiSelect';
import ChartTooltip from './ChartTooltip';
import { ImeRow, MetricKey, METRICS, SERIES_COLORS, shortWeek, faCompact } from './chartUtils';

interface Props {
  rows: ImeRow[];
}

/**
 * Weekly trend of a chosen metric across selected commodity groups.
 * Single-group view uses a peach-gradient area (the accent); multi-group
 * comparison uses restrained achromatic strokes.
 */
export default function HistoricalTrends({ rows }: Props) {
  const [metric, setMetric] = useState<MetricKey>('averagePrice');

  const allGroups = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((r) => set.add(r.groupName));
    return Array.from(set).sort();
  }, [rows]);

  const [groups, setGroups] = useState<string[]>([]);
  const activeGroups = groups.length > 0 ? groups : allGroups.slice(0, 1);

  // Pivot into one row per week with a column per active group.
  const { series, weekOrder } = useMemo(() => {
    const byWeek = new Map<string, Record<string, number | string>>();
    const order: string[] = [];
    rows.forEach((r) => {
      if (!activeGroups.includes(r.groupName)) return;
      if (!byWeek.has(r.weekLabel)) {
        byWeek.set(r.weekLabel, { week: shortWeek(r.weekLabel), _label: r.weekLabel });
        order.push(r.weekLabel);
      }
      byWeek.get(r.weekLabel)![r.groupName] = r[metric];
    });
    return { series: order.map((w) => byWeek.get(w)!), weekOrder: order };
  }, [rows, activeGroups, metric]);

  const single = activeGroups.length === 1;

  return (
    <div className="card p-6 sm:p-8">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="tag">روند هفتگی</span>
          <h3 className="font-display text-heading-sm text-ink">{METRICS[metric]}</h3>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="min-w-[180px]">
            <label className="mb-2 block text-[13px] text-slate">شاخص</label>
            <select
              value={metric}
              onChange={(e) => setMetric(e.target.value as MetricKey)}
              className="field !py-2.5"
            >
              {Object.entries(METRICS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
          <div className="min-w-[200px]">
            <MultiSelect
              label="گروه‌های کالا"
              options={allGroups}
              selected={groups}
              onChange={setGroups}
              placeholder={allGroups[0] ? `${allGroups[0]} (پیش‌فرض)` : 'انتخاب…'}
            />
          </div>
        </div>
      </div>

      {weekOrder.length === 0 ? (
        <p className="py-16 text-center text-slate">داده تاریخی برای نمایش وجود ندارد.</p>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          {single ? (
            <AreaChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <defs>
                <linearGradient id="trendFill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#fbe1d1" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#fbe1d1" stopOpacity="0.05" />
                </linearGradient>
              </defs>
              <CartesianGrid vertical={false} stroke="#f0f0f1" />
              <XAxis dataKey="week" tick={{ fill: '#979799', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={faCompact} tick={{ fill: '#979799', fontSize: 12 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#ececec' }} />
              <Area
                type="monotone"
                dataKey={activeGroups[0]}
                stroke="#5d2a1a"
                strokeWidth={2.5}
                fill="url(#trendFill)"
                dot={{ r: 3, fill: '#5d2a1a' }}
                activeDot={{ r: 5 }}
              />
            </AreaChart>
          ) : (
            <LineChart data={series} margin={{ top: 8, right: 8, left: 8, bottom: 8 }}>
              <CartesianGrid vertical={false} stroke="#f0f0f1" />
              <XAxis dataKey="week" tick={{ fill: '#979799', fontSize: 12 }} tickLine={false} axisLine={false} />
              <YAxis tickFormatter={faCompact} tick={{ fill: '#979799', fontSize: 12 }} tickLine={false} axisLine={false} width={70} />
              <Tooltip content={<ChartTooltip />} cursor={{ stroke: '#ececec' }} />
              {activeGroups.map((g, i) => (
                <Line
                  key={g}
                  type="monotone"
                  dataKey={g}
                  stroke={SERIES_COLORS[i % SERIES_COLORS.length]}
                  strokeWidth={2.5}
                  dot={false}
                  activeDot={{ r: 5 }}
                />
              ))}
            </LineChart>
          )}
        </ResponsiveContainer>
      )}

      {!single && (
        <div className="mt-4 flex flex-wrap gap-4">
          {activeGroups.map((g, i) => (
            <span key={g} className="flex items-center gap-2 text-[13px] text-slate">
              <span className="inline-block h-2.5 w-2.5 rounded-pill" style={{ background: SERIES_COLORS[i % SERIES_COLORS.length] }} />
              {g}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
