import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { EmailChangeConfirmation } from "@/components/account/EmailChangeConfirmation";

export default async function ConfirmNewEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return (
    <AuthPageShell
      eyebrow="Segurança"
      title="Confirmar novo e-mail"
      description="A alteração só será concluída depois desta confirmação."
    >
      <EmailChangeConfirmation token={params.token || ""} />
    </AuthPageShell>
  );
}
