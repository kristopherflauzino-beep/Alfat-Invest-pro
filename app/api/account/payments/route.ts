import { NextResponse } from "next/server";
import { requireAccount, authErrorResponse } from "@/lib/auth/session";
import { accountBilling, paymentErrorStatus } from "@/lib/payments/payment-service";
export const runtime = "nodejs";
export async function GET(request: Request) { try { const account = await requireAccount(request); return NextResponse.json(await accountBilling(account.id), { headers: { "Cache-Control": "private, no-store" } }); } catch(error) { const auth=authErrorResponse(error); if(auth.status!==500)return auth; const result=paymentErrorStatus(error); return NextResponse.json({error:result.message},{status:result.status}); } }
