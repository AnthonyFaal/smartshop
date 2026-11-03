import { NextResponse } from "next/server";
import { timingSafeEqual } from "crypto";
import { runOperationalMaintenance } from "@/server/services/maintenance.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function hasValidSecret(value: string | null) {
  const expected = process.env.CRON_SECRET;
  if (!expected || !value) return false;
  const a = Buffer.from(value);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(request: Request) {
  if (!hasValidSecret(request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json(await runOperationalMaintenance());
}
