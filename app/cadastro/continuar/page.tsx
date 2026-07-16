import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { PendingRegistrationCheckout } from "@/components/auth/PendingRegistrationCheckout";

export default async function ContinueRegistrationPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return (
    <AuthPageShell
      eyebrow="Cadastro"
      title="Pagamento e ativação"
      description="Acompanhe o pagamento e a conferência manual da sua assinatura."
    >
      <PendingRegistrationCheckout token={params.token || ""} />
    </AuthPageShell>
  );
}
