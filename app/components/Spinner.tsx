import React from 'react';

const Spinner: React.FC = () => {
  return (
    <div className="flex items-center justify-center gap-3 p-10 text-slate">
      <svg className="h-8 w-8 animate-spin text-sienna" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-20" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
        <path
          className="opacity-90"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      <p className="text-body">در حال بارگذاری…</p>
    </div>
  );
};

export default Spinner;
