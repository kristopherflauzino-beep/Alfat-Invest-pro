import { NextResponse } from "next/server";
import { clearSession } from "@/lib/auth/session";
export const runtime = "nodejs";
export async function POST(request: Request) { return clearSession(request, NextResponse.json({ ok: true })); }
