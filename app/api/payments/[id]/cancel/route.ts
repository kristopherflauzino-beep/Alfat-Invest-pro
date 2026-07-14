import { NextResponse } from "next/server";
import { requireAccount, authErrorResponse } from "@/lib/auth/session";
import { assertSameOrigin } from "@/lib/server/request-security";
import { cancelPayment, paymentErrorStatus } from "@/lib/payments/payment-service";
export const runtime="nodejs";
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){try{assertSameOrigin(request);const account=await requireAccount(request);const {id}=await params;return NextResponse.json(await cancelPayment(id,account.id));}catch(error){const auth=authErrorResponse(error);if(auth.status!==500)return auth;const result=paymentErrorStatus(error);return NextResponse.json({error:result.message},{status:result.status});}}
