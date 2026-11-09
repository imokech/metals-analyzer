import { fetchImeTradeData } from "@/lib/ime";
import { dropExcludedRows } from "@/lib/history/config";

export const fetchTrades = async (from: string, to: string, cat: number) =>
    dropExcludedRows(await fetchImeTradeData(from, to, 0, cat), cat);