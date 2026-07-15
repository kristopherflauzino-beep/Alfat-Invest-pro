import { NextResponse } from "next/server";

export async function PATCH() {
  return NextResponse.json({
    error: "Fluxo atualizado. Acesse primeiro o link do Mercado Pago e use Solicitar verificação de pagamento."
  }, { status: 410 });
}