import React, { useState, useRef, useEffect, useMemo } from 'react';

interface MultiSelectProps {
    label: string;
    options: string[];
    selected: string[];
    onChange: (selected: string[]) => void;
    placeholder?: string;
}

export default function MultiSelect({
    label,
    options,
    selected,
    onChange,
    placeholder = 'انتخاب کنید...',
}: MultiSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filtered = useMemo(
        () => options.filter((o) => o.toLowerCase().includes(query.toLowerCase())),
        [options, query]
    );

    const toggleOption = (option: string) => {
        if (selected.includes(option)) {
            onChange(selected.filter((item) => item !== option));
        } else {
            onChange([...selected, option]);
        }
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <label className="mb-2 block text-[13px] text-slate">{label}</label>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="field flex items-center justify-between !py-3 text-right"
            >
                <span className={`truncate ${selected.length > 0 ? 'text-ink' : 'text-smoke'}`}>
                    {selected.length > 0 ? `${selected.length.toLocaleString('fa-IR')} مورد انتخاب شده` : placeholder}
                </span>
                <svg
                    className={`h-4 w-4 text-slate transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && (
                <div className="absolute z-20 mt-2 max-h-64 w-full overflow-y-auto rounded-input bg-paper shadow-popover">
                    <div className="sticky top-0 border-b border-hairline bg-paper p-2">
                        <input
                            type="text"
                            value={query}
                            placeholder="جستجو…"
                            className="field !rounded-smallcard !py-2 text-[14px]"
                            onClick={(e) => e.stopPropagation()}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                    </div>
                    <ul className="p-2">
                        {filtered.map((option) => {
                            const active = selected.includes(option);
                            return (
                                <li key={option}>
                                    <label className="flex cursor-pointer items-center gap-2 rounded-smallcard p-2 hover:bg-mist">
                                        <input
                                            type="checkbox"
                                            checked={active}
                                            onChange={() => toggleOption(option)}
                                            className="h-4 w-4 rounded border-hairline text-ink accent-ink"
                                        />
                                        <span className="text-[14px] text-ink">{option}</span>
                                    </label>
                                </li>
                            );
                        })}
                        {filtered.length === 0 && (
                            <li className="p-3 text-center text-[14px] text-smoke">موردی یافت نشد</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
}
