import React, { useState, useMemo, useEffect } from 'react';
import { AggregatedData } from '../../types';
import MultiSelect from './MultiSelect';

interface PairComparisonProps {
    data: AggregatedData[];
}

const PairComparison: React.FC<PairComparisonProps> = ({ data }) => {
    const [sourceMetal, setSourceMetal] = useState<string>('');
    const [targetMetals, setTargetMetals] = useState<string[]>([]);

    const availableMetals = useMemo(() => data.map((item) => item.groupName), [data]);

    useEffect(() => {
        if (availableMetals.length > 0 && !sourceMetal) {
            setSourceMetal(availableMetals[0]);
        }
    }, [availableMetals, sourceMetal]);

    const comparisons = useMemo(() => {
        const sourceItem = data.find((item) => item.groupName === sourceMetal);
        if (!sourceItem) return [];
        return targetMetals
            .map((target) => {
                const targetItem = data.find((item) => item.groupName === target);
                if (!targetItem) return null;
                const priceSource = sourceItem.averagePrice;
                const priceTarget = targetItem.averagePrice;
                const ratio = priceSource > 0 ? priceTarget / priceSource : 0;
                return { targetName: target, priceSource, priceTarget, ratio };
            })
            .filter((item): item is NonNullable<typeof item> => item !== null);
    }, [data, sourceMetal, targetMetals]);

    // The largest ratio earns the single peach accent.
    const peakRatio = Math.max(0, ...comparisons.map((c) => c.ratio));

    return (
        <div className="card p-6 sm:p-8">
            <div className="mb-6">
                <span className="tag">ابزار مقایسه · یک به چند</span>
                <h2 className="font-display text-heading-sm text-ink">نسبت قیمت فلزات</h2>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-4">
                <div className="md:col-span-1">
                    <label className="mb-2 block text-[13px] text-slate">فلز مبنا</label>
                    <select
                        value={sourceMetal}
                        onChange={(e) => setSourceMetal(e.target.value)}
                        className="field !py-3"
                    >
                        {availableMetals.map((metal) => (
                            <option key={metal} value={metal}>
                                {metal}
                            </option>
                        ))}
                    </select>
                    {sourceMetal && (
                        <p className="mt-3 text-[13px] text-slate">
                            قیمت پایه:{' '}
                            <span className="tabular text-ink">
                                {Math.round(data.find((d) => d.groupName === sourceMetal)?.averagePrice || 0).toLocaleString('fa-IR')}
                            </span>{' '}
                            ریال
                        </p>
                    )}
                </div>

                <div className="md:col-span-3">
                    <div className="mb-4">
                        <MultiSelect
                            label="فلزات هدف (حداکثر ۴ مورد)"
                            options={availableMetals.filter((m) => m !== sourceMetal)}
                            selected={targetMetals}
                            onChange={(selected) => {
                                if (selected.length <= 4) setTargetMetals(selected);
                            }}
                            placeholder="انتخاب فلزات جهت مقایسه…"
                        />
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        {comparisons.map((comp) => {
                            const isPeak = comp.ratio === peakRatio && comp.ratio > 0;
                            return (
                                <div
                                    key={comp.targetName}
                                    className={`rounded-elevated p-5 ${isPeak ? 'bg-blush text-sienna' : 'bg-paper shadow-artifact'}`}
                                >
                                    <div className={`text-[13px] ${isPeak ? 'text-sienna/70' : 'text-slate'}`}>
                                        نسبت {comp.targetName} به {sourceMetal}
                                    </div>
                                    <div className="mt-2 flex items-baseline gap-2">
                                        <span className={`font-display text-heading-sm tabular ${isPeak ? 'text-sienna' : 'text-ink'}`}>
                                            {comp.ratio.toLocaleString('fa-IR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })}
                                        </span>
                                        <span className={`text-[12px] ${isPeak ? 'text-sienna/60' : 'text-smoke'}`}>×</span>
                                    </div>
                                    <div className={`mt-3 flex justify-between border-t pt-3 text-[13px] ${isPeak ? 'border-sienna/20 text-sienna/80' : 'border-hairline text-slate'}`}>
                                        <span>قیمت {comp.targetName}</span>
                                        <span className="tabular">{Math.round(comp.priceTarget).toLocaleString('fa-IR')}</span>
                                    </div>
                                </div>
                            );
                        })}
                        {comparisons.length === 0 && (
                            <div className="col-span-full rounded-elevated border border-dashed border-hairline py-8 text-center text-slate">
                                هیچ فلزی برای مقایسه انتخاب نشده است.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PairComparison;
