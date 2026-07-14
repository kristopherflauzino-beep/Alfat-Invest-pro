import { NextResponse } from "next/server";
import { sessionUserId } from "@/lib/auth/session";
import { publicAccount, readCoreState } from "@/lib/server/core-state";
export const runtime = "nodejs";
export async function GET(request: Request) { const userId = await sessionUserId(request); if (!userId) return NextResponse.json({ user: null }, { status: 401 }); const state = await readCoreState(); const account = state.accounts.find((item) => item.id === userId); return account ? NextResponse.json({ user: publicAccount(account) }) : NextResponse.json({ user: null }, { status: 401 }); }
