'use client';

import React, { useState, useEffect } from 'react';
import Sparkline from './charts/Sparkline';
import type { CurrencyRow } from './charts/chartUtils';

interface Rates {
    havaleh: number | null;
    azad: number | null;
}

function fmt(n: number | null): string {
    return n === null ? '—' : Math.round(n).toLocaleString('fa-IR');
}

interface StatCardProps {
    label: string;
    value: number | null;
    series: number[];
    accent?: boolean;
    suffix?: string;
}

function StatCard({ label, value, series, accent, suffix = 'ریال' }: StatCardProps) {
    const delta =
        series.length >= 2 ? series[series.length - 1] - series[series.length - 2] : null;
    const deltaPct =
        delta !== null && series[series.length - 2] ? (delta / series[series.length - 2]) * 100 : null;

    return (
        <div className={`artifact flex flex-col justify-between p-5 ${accent ? '!bg-blush !shadow-none' : ''}`}>
            <div className="flex items-start justify-between">
                <span className={`tag ${accent ? '!text-sienna/70' : ''}`}>{label}</span>
                <Sparkline data={series} stroke={accent ? '#5d2a1a' : '#5d2a1a'} fill={!accent} width={92} height={30} />
            </div>
            <div className="mt-4 flex items-end justify-between gap-2">
                <p className={`font-display text-heading-sm tabular ${accent ? 'text-sienna' : 'text-ink'}`}>
                    {fmt(value)}
                    <span className={`mr-1 text-[13px] ${accent ? 'text-sienna/60' : 'text-slate'}`}>{suffix}</span>
                </p>
                {deltaPct !== null && (
                    <span className={`text-[13px] tabular ${delta! >= 0 ? 'text-sienna' : 'text-slate'}`}>
                        {delta! >= 0 ? '↑' : '↓'} {Math.abs(deltaPct).toLocaleString('fa-IR', { maximumFractionDigits: 1 })}٪
                    </span>
                )}
            </div>
        </div>
    );
}

export default function CurrencyRates() {
    const [rates, setRates] = useState<Rates>({ havaleh: null, azad: null });
    const [history, setHistory] = useState<CurrencyRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const [ratesRes, histRes] = await Promise.all([
                    fetch('/api/currency-rates'),
                    fetch('/api/history?type=currency'),
                ]);
                if (ratesRes.ok) {
                    const r = await ratesRes.json();
                    if (r.data) setRates(r.data);
                }
                if (histRes.ok) {
                    const h = await histRes.json();
                    setHistory(h.data ?? []);
                }
            } catch (err) {
                console.error('Error fetching currency rates:', err);
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    const havalehSeries = [
        ...history.map((h) => h.havaleh).filter((v): v is number => v !== null),
        ...(rates.havaleh !== null ? [rates.havaleh] : []),
    ];
    const azadSeries = [
        ...history.map((h) => h.azad).filter((v): v is number => v !== null),
        ...(rates.azad !== null ? [rates.azad] : []),
    ];
    const spread = rates.azad !== null && rates.havaleh !== null ? rates.azad - rates.havaleh : null;
    const spreadSeries = history
        .filter((h) => h.azad !== null && h.havaleh !== null)
        .map((h) => (h.azad as number) - (h.havaleh as number));
    if (spread !== null) spreadSeries.push(spread);

    if (loading) {
        return <div className="card h-32 animate-pulse" />;
    }

    return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <StatCard label="دلار حواله" value={rates.havaleh} series={havalehSeries} />
            <StatCard label="دلار بازار آزاد" value={rates.azad} series={azadSeries} />
            <StatCard label="اختلاف بازار (آزاد − حواله)" value={spread} series={spreadSeries} accent />
        </div>
    );
}
