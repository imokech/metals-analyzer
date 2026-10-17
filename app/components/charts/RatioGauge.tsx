import React from 'react';

interface RatioGaugeProps {
  /** 0–100 percentage to render on the arc. */
  value: number;
  label?: string;
  size?: number;
  /** Value shown in the center; defaults to `${value}%`. */
  display?: string;
  color?: string;
}

/**
 * Minimal radial progress ring in Steep style — sienna stroke on a mist track,
 * value in the center in the display serif. No ticks, no chrome.
 */
export default function RatioGauge({
  value,
  label,
  size = 96,
  display,
  color = '#5d2a1a',
}: RatioGaugeProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const stroke = 8;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#ececec" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
          style={{ transition: 'stroke-dashoffset 0.8s cubic-bezier(0.16,1,0.3,1)' }}
        />
        <text
          x="50%"
          y="50%"
          dominantBaseline="central"
          textAnchor="middle"
          className="font-display"
          fontSize={size * 0.24}
          fill="#17191c"
        >
          {display ?? `${Math.round(clamped)}%`}
        </text>
      </svg>
      {label && <span className="tag text-center">{label}</span>}
    </div>
  );
}
