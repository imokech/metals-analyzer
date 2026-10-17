import React from 'react';

interface AuthShellProps {
  eyebrow: string;
  title: string;
  italic: string;
  subtitle: string;
  children: React.ReactNode;
}

/**
 * Steep-styled split auth layout: an editorial peach accent panel on one side,
 * a quiet white form card on the other. Sits on the paper canvas.
 */
export default function AuthShell({ eyebrow, title, italic, subtitle, children }: AuthShellProps) {
  return (
    <div className="min-h-screen bg-paper px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid min-h-[80vh] max-w-page items-stretch gap-6 lg:grid-cols-2">
        {/* Editorial accent panel */}
        <div className="accent-card relative flex flex-col justify-between overflow-hidden p-10 lg:p-14">
          <span className="tag text-sienna/70">{eyebrow}</span>

          <div className="my-10">
            <h1 className="font-display text-[44px] leading-tight text-sienna sm:text-[64px]">
              {title}{' '}
              <span className="italic">{italic}</span>
            </h1>
            <p className="mt-6 max-w-md text-[18px] leading-relaxed text-sienna/80">{subtitle}</p>
          </div>

          {/* Floating gestural artifact */}
          <div className="pointer-events-none">
            <svg viewBox="0 0 400 120" className="w-full max-w-sm opacity-70" fill="none">
              <path
                d="M0 90 C 40 90, 60 40, 100 50 S 160 100, 200 70 S 280 10, 320 30 S 380 60, 400 40"
                stroke="#5d2a1a"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
              {[0, 100, 200, 320, 400].map((x, i) => (
                <circle key={i} cx={x} cy={[90, 50, 70, 30, 40][i]} r="4" fill="#5d2a1a" />
              ))}
            </svg>
          </div>
        </div>

        {/* Form card */}
        <div className="flex items-center justify-center">
          <div className="w-full max-w-md">{children}</div>
        </div>
      </div>
    </div>
  );
}
