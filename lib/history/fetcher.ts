import { fetchImeTradeData } from "@/lib/ime";
import type { FetchTrades } from "./sync";

// SubCat: 0 یعنی همهٔ زیرگروه‌ها؛ زیرگروه هر ردیف از فیلد Category استخراج می‌شود
export const fetchTrades: FetchTrades = (fromJdate, toJdate, cat) =>
    fetchImeTradeData(fromJdate, toJdate, 0, cat);