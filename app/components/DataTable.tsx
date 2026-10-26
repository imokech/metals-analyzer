import React, { useState } from "react";
import { AggregatedData } from "../../types";

interface GlobalPrice {
  id: number;
  slug: string;
  globalName: string;
  localLabel: string;
  price: number | null;
}

interface CurrencyRates {
  havaleh: number | null; // دلار تالار اول
  azad: number | null; // دلار بازار آزاد
}

interface DataTableProps {
  data: AggregatedData[];
  globalPrices?: GlobalPrice[];
  currencyRates?: CurrencyRates;
}

type PriceMode = "market" | "manual";

const DataTable: React.FC<DataTableProps> = ({
  data,
  globalPrices = [],
  currencyRates,
}) => {
  const [priceMode, setPriceMode] = useState<PriceMode>("market");
  const [manualPrices, setManualPrices] = useState<Record<string, number>>({});

  const handleManualPriceChange = (groupName: string, value: string) => {
    const numValue = parseFloat(value.replace(/,/g, ""));
    if (!isNaN(numValue)) {
      setManualPrices((prev) => ({ ...prev, [groupName]: numValue }));
    } else if (value === "") {
      setManualPrices((prev) => {
        const newPrices = { ...prev };
        delete newPrices[groupName];
        return newPrices;
      });
    }
  };

  const getEffectivePrice = (groupName: string, marketPrice: number): number => {
    if (priceMode === "manual" && manualPrices[groupName] !== undefined) {
      return manualPrices[groupName];
    }
    return marketPrice;
  };

  const tableHeaders = [
    "گروه کالا",
    "حجم قرارداد (تن)",
    "حجم عرضه (تن)",
    "قیمت پایه (ریال/تن)",
    "میانگین قیمت (ریال/تن)",
    "قیمت جهانی (USD/mt)",
    "کف برآورد",
    "سقف برآورد",
    "قیمت دلاری کالا",
    "حجم/عرضه (٪)",
    "فی معامله/پایه (٪)",
    "درصد معامله نقدی (٪)",
    "درصد معامله اعتباری (٪)",
  ];

  const globalPriceMap = new Map<string, number | null>();
  globalPrices.forEach((gp) => globalPriceMap.set(gp.localLabel, gp.price));

  const billetPrice = globalPriceMap.get("شمش");
  if (billetPrice) {
    if (!globalPriceMap.get("تیرآهن")) globalPriceMap.set("تیرآهن", billetPrice * 1.07);
    if (!globalPriceMap.get("نبشی")) globalPriceMap.set("نبشی", billetPrice * 1.07);
    if (!globalPriceMap.get("ناودانی")) globalPriceMap.set("ناودانی", billetPrice * 1.16);
  }

  const calculateDollarPrice = (
    averagePrice: number,
    globalPrice: number | null,
  ): number | null => {
    if (!globalPrice || globalPrice === 0) return null;
    return (averagePrice / globalPrice) * 1000;
  };

  const calculateEstimatedPrice = (
    groupName: string,
    globalPrice: number | null,
  ): number | null => {
    if (!globalPrice || !currencyRates) return null;
    const { havaleh, azad } = currencyRates;
    const azadGroups = ["ورق گرم", "ورق سرد", "ورق گالوانیزه"];
    if (azadGroups.includes(groupName)) {
      if (!azad) return null;
      return (globalPrice * azad) / 1000;
    }
    return havaleh ? (globalPrice * havaleh) / 1000 : null;
  };

  return (
    <div className="artifact overflow-hidden">
      {/* Price Mode Switch */}
      <div className="flex items-center justify-end gap-3 border-b border-hairline px-5 py-4">
        <span className={`text-[14px] transition-colors ${priceMode === "market" ? "text-ink" : "text-smoke"}`}>
          قیمت بازار
        </span>
        <button
          type="button"
          role="switch"
          aria-checked={priceMode === "manual"}
          onClick={() => setPriceMode(priceMode === "market" ? "manual" : "market")}
          className={`relative inline-flex h-6 w-11 items-center rounded-pill transition-colors ${priceMode === "manual" ? "bg-ink" : "bg-mist"}`}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-pill bg-paper shadow-sm transition-transform ${priceMode === "manual" ? "-translate-x-6" : "-translate-x-1"}`}
          />
        </button>
        <span className={`text-[14px] transition-colors ${priceMode === "manual" ? "text-ink" : "text-smoke"}`}>
          قیمت دستی
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-right text-[14px]">
          <thead className="bg-mist text-[12px] text-slate">
            <tr>
              {tableHeaders.map((header) => (
                <th key={header} scope="col" className="whitespace-nowrap px-5 py-3 font-normal">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-hairline">
            {data.map((item) => {
              const globalPrice = globalPriceMap.get(item.groupName) ?? null;
              const effectivePrice = getEffectivePrice(item.groupName, item.averagePrice);
              const dollarPrice = calculateDollarPrice(effectivePrice, globalPrice);
              const estimatedPrice = calculateEstimatedPrice(item.groupName, globalPrice);

              return (
                <tr key={item.groupName} className="transition-colors hover:bg-fog">
                  <th scope="row" className="whitespace-nowrap px-5 py-4 text-right font-medium text-ink">
                    {item.groupName}
                  </th>
                  <td className="px-5 py-4 tabular text-slate">{item.totalQuantity.toLocaleString("fa-IR")}</td>
                  <td className="px-5 py-4 tabular text-slate">{item.totalSupply.toLocaleString("fa-IR")}</td>
                  <td className="px-5 py-4 tabular text-slate">{Math.round(item.averageBasePrice).toLocaleString("fa-IR")}</td>
                  <td className="px-5 py-4">
                    {priceMode === "manual" ? (
                      <input
                        type="text"
                        value={
                          manualPrices[item.groupName] !== undefined
                            ? Math.round(manualPrices[item.groupName]).toLocaleString("fa-IR")
                            : Math.round(item.averagePrice).toLocaleString("fa-IR")
                        }
                        onChange={(e) => {
                          const persianToEnglish = e.target.value.replace(/[۰-۹]/g, (d) =>
                            String.fromCharCode(d.charCodeAt(0) - 1728),
                          );
                          handleManualPriceChange(item.groupName, persianToEnglish);
                        }}
                        className="field !w-24 !rounded-smallcard !py-1.5 text-right text-[14px]"
                        placeholder={Math.round(item.averagePrice).toLocaleString("fa-IR")}
                      />
                    ) : (
                      <span className="tabular text-ink">{Math.round(item.averagePrice).toLocaleString("fa-IR")}</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {globalPrice !== null ? (
                      <span className="tabular text-ink">
                        {globalPrice.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                      </span>
                    ) : (
                      <span className="text-smoke">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {estimatedPrice !== null ? (
                      <span className="tabular text-slate">
                        {Math.round(estimatedPrice * 0.95).toLocaleString("fa-IR")}
                      </span>
                    ) : (
                      <span className="text-smoke">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {estimatedPrice !== null ? (
                      <span className="tabular text-ink">{Math.round(estimatedPrice).toLocaleString("fa-IR")}</span>
                    ) : (
                      <span className="text-smoke">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {dollarPrice !== null ? (
                      <span className="tabular font-medium text-sienna">
                        {dollarPrice.toLocaleString("fa-IR", { maximumFractionDigits: 0 })}
                      </span>
                    ) : (
                      <span className="text-smoke">—</span>
                    )}
                  </td>
                  <td className="px-5 py-4 tabular text-slate">
                    {item.volumeToSupplyRatio.toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}٪
                  </td>
                  <td className="px-5 py-4 tabular text-slate">
                    {item.priceToBasePriceRatio.toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}٪
                  </td>
                  <td className="px-5 py-4 tabular text-slate">
                    {item.cashPercent.toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}٪
                  </td>
                  <td className="px-5 py-4 tabular text-slate">
                    {item.creditPercent.toLocaleString("fa-IR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}٪
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default DataTable;
