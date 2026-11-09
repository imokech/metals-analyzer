import { NextRequest, NextResponse } from "next/server";
import { fetchImeTradeData } from "@/lib/ime";
import { dropExcludedRows } from "@/lib/history/config";

const ALLOWED_CATS = [1, 49, 97];

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromDate, toDate, subCat = 0, cat = 1 } = body;

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "fromDate and toDate are required" },
        { status: 400 }
      );
    }
    const catNum = Number(cat);
    if (!ALLOWED_CATS.includes(catNum)) {
      return NextResponse.json({ error: "cat نامعتبر است" }, { status: 400 });
    }

    const data = dropExcludedRows(
      await fetchImeTradeData(fromDate, toDate, Number(subCat), catNum),
      catNum
    );
    return NextResponse.json({ data });
  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "یک خطای ناشناخته رخ داد.",
      },
      { status: 500 }
    );
  }
}