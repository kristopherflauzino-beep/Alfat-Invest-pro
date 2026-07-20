import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { RegistrationEmailConfirmation } from "@/components/auth/RegistrationEmailConfirmation";

export default async function ConfirmEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return (
    <AuthPageShell
      eyebrow="Cadastro"
      title="Confirmar seu e-mail"
      description="Confirme seu endereço para concluir a etapa de e-mail do plano selecionado."
    >
      <RegistrationEmailConfirmation token={params.token || ""} />
    </AuthPageShell>
  );
}
