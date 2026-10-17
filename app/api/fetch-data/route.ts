import { NextRequest, NextResponse } from "next/server";
import { fetchImeTradeData } from "@/lib/ime";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fromDate, toDate, subCat = 0 } = body;

    if (!fromDate || !toDate) {
      return NextResponse.json(
        { error: "fromDate and toDate are required" },
        { status: 400 }
      );
    }

    const data = await fetchImeTradeData(fromDate, toDate, subCat);
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
