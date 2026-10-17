import React from 'react';

interface TooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatter?: (v: number) => string;
}

/** Steep popover-styled tooltip: white artifact, hairline ring, soft shadow. */
export default function ChartTooltip({ active, payload, label, formatter }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const fmt = formatter ?? ((v: number) => v.toLocaleString('fa-IR'));
  return (
    <div className="rounded-input bg-paper px-4 py-3 shadow-popover">
      {label && <p className="mb-1 text-[13px] text-slate">{label}</p>}
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-2 text-[14px] text-ink">
          <span className="inline-block h-2 w-2 rounded-pill" style={{ background: p.color }} />
          <span className="text-slate">{p.name}:</span>
          <span className="tabular font-medium">{fmt(p.value)}</span>
        </p>
      ))}
    </div>
  );
}
