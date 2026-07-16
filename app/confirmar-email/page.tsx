import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { RegistrationEmailConfirmation } from "@/components/auth/RegistrationEmailConfirmation";

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return (
    <AuthPageShell
      eyebrow="Cadastro"
      title="Confirmar seu e-mail"
      description="Confirme seu endereço para prosseguir ao pagamento do plano selecionado."
    >
      <RegistrationEmailConfirmation token={params.token || ""} />
    </AuthPageShell>
  );
}
