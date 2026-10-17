import { NextResponse } from "next/server";
import { db } from "@/db";
import { globalPrices } from "@/db/schema";
import { ensureGlobalPricesSeeded } from "@/lib/globalPrices";

// GET - Retrieve all global prices
export async function GET() {
    try {
        const prices = await db.select().from(globalPrices);
        return NextResponse.json({ data: prices });
    } catch (error) {
        console.error("Error fetching global prices:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to fetch prices" },
            { status: 500 }
        );
    }
}

// POST - Seed/initialize the database with mappings
export async function POST() {
    try {
        const data = await ensureGlobalPricesSeeded();
        return NextResponse.json({ message: "Global prices ready", data });
    } catch (error) {
        console.error("Error seeding database:", error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : "Failed to seed database" },
            { status: 500 }
        );
    }
}
