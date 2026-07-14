import { NextResponse } from "next/server";
import { requireAccount, authErrorResponse } from "@/lib/auth/session";
import { refreshPayment, paymentErrorStatus } from "@/lib/payments/payment-service";
export const runtime="nodejs";
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){try{const account=await requireAccount(request);const {id}=await params;return NextResponse.json(await refreshPayment(id,account.id),{headers:{"Cache-Control":"private, no-store"}});}catch(error){const auth=authErrorResponse(error);if(auth.status!==500)return auth;const result=paymentErrorStatus(error);return NextResponse.json({error:result.message},{status:result.status});}}
