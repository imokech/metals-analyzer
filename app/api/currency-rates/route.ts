import { NextResponse } from "next/server";
import { fetchCurrencyRates } from "@/lib/currency";

export async function GET() {
    try {
        const data = await fetchCurrencyRates();
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
