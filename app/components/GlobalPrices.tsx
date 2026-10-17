'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface GlobalPrice {
    id: number;
    slug: string;
    globalName: string;
    localLabel: string;
    price: number | null;
    sourceUrl: string;
    lastFetchedAt: string | null;
    manuallyUpdated: boolean;
    createdAt: string;
    updatedAt: string;
}

export default function GlobalPrices() {
    const [prices, setPrices] = useState<GlobalPrice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingSlug, setEditingSlug] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');
    const [savingSlug, setSavingSlug] = useState<string | null>(null);

    const fetchPrices = useCallback(async () => {
        try {
            const response = await fetch('/api/global-prices');
            const data = await response.json();
            if (data.error) throw new Error(data.error);

            if (data.data.length === 0) {
                const seedResponse = await fetch('/api/global-prices', { method: 'POST' });
                const seedData = await seedResponse.json();
                if (seedData.error) throw new Error(seedData.error);
                setPrices(seedData.data);
            } else {
                setPrices(data.data);
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'خطا در دریافت قیمت‌ها');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchPrices();
    }, [fetchPrices]);

    const handleEdit = (price: GlobalPrice) => {
        setEditingSlug(price.slug);
        setEditValue(price.price?.toString() || '');
    };

    const handleSave = async (slug: string) => {
        const numericValue = parseFloat(editValue);
        if (isNaN(numericValue)) return;
        setSavingSlug(slug);
        try {
            const response = await fetch(`/api/global-prices/${slug}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ price: numericValue }),
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error);
            setPrices((prev) => prev.map((p) => (p.slug === slug ? data.data : p)));
            setEditingSlug(null);
        } catch (err) {
            console.error('Error saving price:', err);
        } finally {
            setSavingSlug(null);
        }
    };

    const handleCancel = () => {
        setEditingSlug(null);
        setEditValue('');
    };

    const formatRelativeTime = (dateString: string | null): string => {
        if (!dateString) return 'هنوز به‌روز نشده';
        const date = new Date(dateString);
        const diffMs = Date.now() - date.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        if (diffMins < 1) return 'همین الان';
        if (diffMins < 60) return `${diffMins.toLocaleString('fa-IR')} دقیقه پیش`;
        if (diffHours < 24) return `${diffHours.toLocaleString('fa-IR')} ساعت پیش`;
        return `${diffDays.toLocaleString('fa-IR')} روز پیش`;
    };

    if (loading) return <div className="card h-40 animate-pulse" />;

    if (error) {
        return (
            <div className="card p-6">
                <p className="text-center text-sienna">{error}</p>
            </div>
        );
    }

    return (
        <div className="card p-6 sm:p-8">
            <div className="mb-5 flex items-end justify-between">
                <div>
                    <span className="tag">مرجع جهانی</span>
                    <h2 className="font-display text-heading-sm text-ink">قیمت‌های جهانی فلزات</h2>
                </div>
                <span className="tag">USD/mt</span>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-right text-[15px]">
                    <thead>
                        <tr className="border-b border-hairline text-slate">
                            <th className="px-3 py-3 font-normal">نام جهانی</th>
                            <th className="px-3 py-3 font-normal">نام محلی</th>
                            <th className="px-3 py-3 font-normal">قیمت</th>
                            <th className="px-3 py-3 font-normal">آخرین به‌روزرسانی</th>
                        </tr>
                    </thead>
                    <tbody>
                        {prices.map((price) => (
                            <tr key={price.slug} className="border-b border-hairline/60 transition-colors hover:bg-fog">
                                <td className="px-3 py-3.5 text-ink">{price.globalName}</td>
                                <td className="px-3 py-3.5 text-slate">{price.localLabel}</td>
                                <td className="px-3 py-3.5">
                                    {editingSlug === price.slug ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                onKeyDown={(e) => {
                                                    if (e.key === 'Enter') handleSave(price.slug);
                                                    if (e.key === 'Escape') handleCancel();
                                                }}
                                                className="field !w-28 !rounded-smallcard !py-1.5 text-[14px]"
                                                autoFocus
                                            />
                                            <button
                                                onClick={() => handleSave(price.slug)}
                                                disabled={savingSlug === price.slug}
                                                className="text-sienna hover:opacity-70"
                                            >
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                                </svg>
                                            </button>
                                            <button onClick={handleCancel} className="text-slate hover:opacity-70">
                                                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                                </svg>
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="group flex cursor-pointer items-center gap-2" onClick={() => handleEdit(price)}>
                                            <span className={`tabular font-medium ${price.price ? 'text-ink' : 'text-smoke'}`}>
                                                {price.price ? price.price.toLocaleString('en-US', { minimumFractionDigits: 2 }) : '—'}
                                            </span>
                                            {price.manuallyUpdated && <span className="tag">(دستی)</span>}
                                            <svg
                                                className="h-4 w-4 text-smoke opacity-0 transition-opacity group-hover:opacity-100"
                                                fill="none"
                                                stroke="currentColor"
                                                viewBox="0 0 24 24"
                                            >
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                            </svg>
                                        </div>
                                    )}
                                </td>
                                <td className="px-3 py-3.5 text-[13px] text-slate">
                                    {formatRelativeTime(price.lastFetchedAt || price.updatedAt)}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
