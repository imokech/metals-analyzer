'use client';

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import type { RawDataItem, AggregatedData } from '../types';
import DataTable from './components/DataTable';
import Spinner from './components/Spinner';
import MultiSelect from './components/MultiSelect';
import PairComparison from './components/PairComparison';
import CurrencyRates from './components/CurrencyRates';
// import GlobalPrices from './components/GlobalPrices';
import PremiumTracker from './components/charts/PremiumTracker';
import { getWeeksOfYear, getCurrentJalaliYear } from './utils/dateUtils';
import { aggregate, getCommodityGroup } from '@/lib/aggregate';
import * as XLSX from 'xlsx';

interface GlobalPrice {
  id: number;
  slug: string;
  globalName: string;
  localLabel: string;
  price: number | null;
}

export default function Home() {
  const currentYear = getCurrentJalaliYear();
  const weeks = useMemo(() => getWeeksOfYear(currentYear), [currentYear]);

  const [selectedWeek, setSelectedWeek] = useState<string>(weeks[0]?.label || '');
  const currentWeekObj = weeks.find((w) => w.label === selectedWeek);

  const [manualFromDate, setManualFromDate] = useState<string>('');
  const [manualToDate, setManualToDate] = useState<string>('');
  const [selectedSubCat, setSelectedSubCat] = useState<number>(0);

  const isManualDateSet = manualFromDate.length === 10 && manualToDate.length === 10;
  const fromDate = isManualDateSet ? manualFromDate : currentWeekObj?.fromDate || '';
  const toDate = isManualDateSet ? manualToDate : currentWeekObj?.toDate || '';

  const [rawData, setRawData] = useState<RawDataItem[]>([]);
  const [aggregatedData, setAggregatedData] = useState<AggregatedData[] | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [selectedTasvieh, setSelectedTasvieh] = useState<string[]>([]);
  const [selectedProducers, setSelectedProducers] = useState<string[]>([]);
  const [selectedPackets, setSelectedPackets] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState<string>('');

  const [availableTasvieh, setAvailableTasvieh] = useState<string[]>([]);
  const [availablePackets, setAvailablePackets] = useState<string[]>([]);

  const [globalPrices, _setGlobalPrices] = useState<GlobalPrice[]>([]);
  const [currencyRates, setCurrencyRates] = useState<{ havaleh: number | null; azad: number | null }>({
    havaleh: null,
    azad: null,
  });

  // const fetchGlobalPrices = async () => {
  //   try {
  //     const response = await fetch('/api/global-prices');
  //     const data = await response.json();
  //     if (data.data) setGlobalPrices(data.data);
  //   } catch (err) {
  //     console.error('Error fetching global prices:', err);
  //   }
  // };

  // useEffect(() => {
  //   fetchGlobalPrices();
  // }, []);

  useEffect(() => {
    (async () => {
      try {
        const response = await fetch('/api/currency-rates');
        if (response.ok) {
          const result = await response.json();
          if (result.data) setCurrencyRates(result.data);
        }
      } catch (err) {
        console.error('Error fetching currency rates:', err);
      }
    })();
  }, []);

  // Re-aggregate whenever data or filters change (shared lib logic).
  useEffect(() => {
    if (rawData.length > 0) {
      setAggregatedData(
        aggregate(rawData, {
          tasvieh: selectedTasvieh,
          groups: selectedPackets,
          producers: selectedProducers,
        })
      );
    } else {
      setAggregatedData(null);
    }
  }, [rawData, selectedTasvieh, selectedPackets, selectedProducers]);

  // Producers available given the current group selection.
  const activeProducers = useMemo(() => {
    if (rawData.length === 0) return [];
    let relevant = rawData;
    if (selectedPackets.length > 0) {
      relevant = rawData.filter((item) => selectedPackets.includes(getCommodityGroup(item.GoodsName)));
    }
    const set = new Set<string>();
    relevant.forEach((item) => item.ProducerName && set.add(item.ProducerName));
    return Array.from(set).sort();
  }, [rawData, selectedPackets]);

  const fetchData = async () => {
    if (!fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    setAggregatedData(null);
    setRawData([]);
    // await fetchGlobalPrices();

    try {
      const response = await fetch('/api/fetch-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fromDate, toDate, subCat: selectedSubCat }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `خطا در ارتباط با سرور: ${response.statusText}`);
      }

      const jsonResponse = await response.json();
      if (jsonResponse.data) {
        const data: RawDataItem[] = jsonResponse.data;
        if (data.length === 0) {
          setError('داده‌ای برای بازه زمانی انتخابی یافت نشد.');
        } else {
          setRawData(data);
          const tasviehSet = new Set<string>();
          const groupSet = new Set<string>();
          data.forEach((item) => {
            if (item.Tasvieh) tasviehSet.add(item.Tasvieh);
            const gName = getCommodityGroup(item.GoodsName);
            if (gName && gName !== 'سایر') groupSet.add(gName);
          });
          setAvailableTasvieh(Array.from(tasviehSet).sort());
          setAvailablePackets(Array.from(groupSet).sort());
          setSelectedProducers([]);
          setSelectedPackets([]);
        }
      } else {
        throw new Error('فرمت پاسخ دریافت شده نامعتبر است.');
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'یک خطای ناشناخته رخ داد.');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!aggregatedData || aggregatedData.length === 0) return;
    const exportData = aggregatedData.map((item) => ({
      'گروه کالا': item.groupName,
      'حجم عرضه (تن)': item.totalSupply,
      'حجم قرارداد (تن)': item.totalQuantity,
      'قیمت پایه (ریال/تن)': Math.round(item.averageBasePrice),
      'میانگین قیمت (ریال/تن)': Math.round(item.averagePrice),
      'نسبت حجم معاملات به حجم عرضه (%)': Number(item.volumeToSupplyRatio.toFixed(2)),
      'نسبت فی معامله به فی پایه (%)': Number(item.priceToBasePriceRatio.toFixed(2)),
      'درصد معامله نقدی (%)': Number(item.cashPercent.toFixed(2)),
      'درصد معامله اعتباری (%)': Number(item.creditPercent.toFixed(2)),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'داده‌های معاملات');
    XLSX.writeFile(wb, `گزارش-معاملات-${selectedWeek}.xlsx`);
  };

  const filteredTable = aggregatedData?.filter(
    (item) => searchTerm === '' || item.groupName.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // KPI figures for the hero strip.
  const totalValue = aggregatedData?.reduce((s, i) => s + i.totalValue, 0) ?? 0;
  const topMover = aggregatedData && aggregatedData.length > 0 ? aggregatedData[0] : null;

  return (
    <main className="mx-auto max-w-page px-4 py-10 sm:px-6 lg:px-8">
      {/* Hero */}
      <header className="mb-10 max-w-3xl animate-fade-up">
        <span className="tag">بورس کالای ایران · فلزات</span>
        <h1 className="mt-3 font-display text-heading leading-tight text-ink sm:text-heading-lg">
          آمار معاملات فلزات را <span className="italic">شفاف</span> تحلیل کنید
        </h1>
        <p className="mt-4 text-body text-slate">
          قیمت‌های جهانی، نرخ دلار و شکاف قیمت با پارتیه جهانی را کنار آمار هفتگی بورس کالا ببینید.
        </p>
      </header>

      {/* Currency stat cards */}
      <section className="mb-8">
        <CurrencyRates />
      </section>

      {/* Global prices */}
      {/* <section className="mb-8">
        <GlobalPrices />
      </section> */}

      {/* Controls */}
      <section className="card mb-8 p-6 sm:p-8">
        <div className="grid grid-cols-1 items-end gap-4 md:grid-cols-6">
          <div className="md:col-span-2">
            <label htmlFor="weekSelect" className="mb-2 block text-[13px] text-slate">
              انتخاب هفته
            </label>
            <select
              id="weekSelect"
              value={selectedWeek}
              onChange={(e) => {
                const newWeek = e.target.value;
                setSelectedWeek(newWeek);
                const weekObj = weeks.find((w) => w.label === newWeek);
                if (weekObj) {
                  setManualFromDate(weekObj.fromDate);
                  setManualToDate(weekObj.toDate);
                }
              }}
              className="field !py-3"
            >
              {weeks.map((week) => (
                <option key={week.label} value={week.label}>
                  {week.label}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <div className="mb-2 text-[12px] text-smoke">یا بازه زمانی دستی (مثال: ۱۴۰۳/۰۱/۰۱)</div>
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                placeholder="از تاریخ"
                value={manualFromDate}
                onChange={(e) => setManualFromDate(e.target.value)}
                className="field !py-3"
              />
              <input
                type="text"
                placeholder="تا تاریخ"
                value={manualToDate}
                onChange={(e) => setManualToDate(e.target.value)}
                className="field !py-3"
              />
            </div>
          </div>

          <div className="md:col-span-1">
            <button
              onClick={fetchData}
              disabled={loading || (!selectedWeek && !isManualDateSet)}
              className="pill h-12 w-full"
            >
              {loading ? 'در حال دریافت…' : 'دریافت داده‌ها'}
            </button>
          </div>

          <div className="md:col-span-2">
            <label htmlFor="subCatSelect" className="mb-2 block text-[13px] text-slate">
              زیرگروه کالا
            </label>
            <select
              id="subCatSelect"
              value={selectedSubCat}
              onChange={(e) => setSelectedSubCat(Number(e.target.value))}
              className="field !py-3"
            >
              <option value="0">[همه زیرگروه‌ها]</option>
              <option value="1">بلوم و بیلت فولادی</option>
              <option value="2">تیرآهن متوسط</option>
              <option value="3">تیرآهن نیمه سنگین</option>
              <option value="4">تیرآهن سنگین</option>
              <option value="6">میلگرد متوسط</option>
              <option value="7">میلگرد سنگین</option>
              <option value="8">سبد مخلوط</option>
              <option value="9">ورق گرم</option>
              <option value="10">ورق سرد</option>
              <option value="17">ورق گالوانیزه</option>
              <option value="19">سبد تیرآهن مخلوط</option>
              <option value="20">سبد میلگرد و تیرآهن</option>
              <option value="21">میلگرد سبک</option>
              <option value="22">ورق قلع اندود</option>
              <option value="24">قراضه فولادی</option>
              <option value="64">میلگرد فوق سنگین (صنعتی)</option>
              <option value="77">سبد مخلوط</option>
              <option value="78">ناودانی</option>
              <option value="99">نبشی</option>
              <option value="147">سیم فولادی</option>
              <option value="148">سبد ورق گرم</option>
              <option value="150">شمش فولادی</option>
              <option value="152">تختال</option>
              <option value="168">تیرآهن سبک</option>
              <option value="410">سبد تیرآهن و ناودانی</option>
              <option value="411">سبد نبشی و ناودانی</option>
              <option value="419">سبد میلگرد و نبشی</option>
              <option value="427">سبد ناودانی</option>
              <option value="466">لوله</option>
              <option value="467">پروفیل</option>
              <option value="478">سبد میلگرد مخلوط</option>
              <option value="1495">سبد نبشی</option>
              <option value="1499">ریل</option>
              <option value="1503">ورق گرم HB</option>
              <option value="1504">ورق گرم HC</option>
              <option value="2508">سبد ریل آهن مخلوط</option>
              <option value="2512">ورق سرد لوازم خانگی</option>
              <option value="2513">ورق سرد خودرو</option>
              <option value="2517">ورق رنگی</option>
              <option value="2520">ورق گرم خودرو</option>
              <option value="2521">ورق گالوانیزه خودرو</option>
              <option value="2522">ورق گالوانیزه لوازم خانگی</option>
              <option value="2546">تیرآهن صنعتی</option>
              <option value="2580">ورق گرم نوردکاران</option>
              <option value="2659">فرو سیلیس</option>
              <option value="2681">بلوم و بیلت آلیاژی</option>
              <option value="2682">میلگرد فولاد آلیاژی</option>
            </select>
          </div>
        </div>

        {rawData.length > 0 && (
          <div className="mt-6 grid grid-cols-1 gap-4 border-t border-hairline pt-6 md:grid-cols-3">
            <MultiSelect label="نوع تسویه" options={availableTasvieh} selected={selectedTasvieh} onChange={setSelectedTasvieh} placeholder="همه موارد" />
            <MultiSelect label="گروه کالا" options={availablePackets} selected={selectedPackets} onChange={setSelectedPackets} placeholder="همه موارد" />
            <MultiSelect label="تولید کننده" options={activeProducers} selected={selectedProducers} onChange={setSelectedProducers} placeholder="همه موارد" />
          </div>
        )}
      </section>

      {/* Results */}
      <div className="space-y-8">
        {loading && <Spinner />}
        {error && (
          <div className="accent-card px-6 py-4 text-center text-sienna" role="alert">
            {error}
          </div>
        )}
        {!loading && !error && !aggregatedData && rawData.length === 0 && (
          <div className="card py-20 text-center text-slate">
            برای شروع، هفته مورد نظر را انتخاب کرده و روی «دریافت داده‌ها» بزنید.
          </div>
        )}

        {aggregatedData && (
          <>
            {/* KPI strip */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="artifact p-5">
                <span className="tag">ارزش کل معاملات (ریال)</span>
                <p className="mt-1 font-display text-heading-sm tabular text-ink">{Math.round(totalValue).toLocaleString('fa-IR')}</p>
              </div>
              <div className="artifact p-5">
                <span className="tag">تعداد گروه‌ها</span>
                <p className="mt-1 font-display text-heading-sm tabular text-ink">{aggregatedData.length.toLocaleString('fa-IR')}</p>
              </div>
              <div className="artifact p-5">
                <span className="tag">بیشترین ارزش معامله</span>
                <p className="mt-1 font-display text-heading-sm text-ink">{topMover?.groupName ?? '—'}</p>
              </div>
            </div>

            <div>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-heading-sm text-ink">جدول خلاصه معاملات</h2>
                <div className="flex items-center gap-3">
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="جستجو در نام کالا…"
                    className="field !w-56 !py-2.5 text-[14px]"
                  />
                  <button onClick={exportToExcel} className="pill-ghost whitespace-nowrap">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                    خروجی اکسل
                  </button>
                </div>
              </div>
              <DataTable data={filteredTable ?? []} globalPrices={globalPrices} currencyRates={currencyRates} />
            </div>

            {/* Next-level tool: premium vs global parity */}
            <PremiumTracker data={aggregatedData} globalPrices={globalPrices} currencyRates={currencyRates} />

            {/* Pair comparison */}
            <PairComparison data={aggregatedData} />
          </>
        )}
      </div>
    </main>
  );
}
