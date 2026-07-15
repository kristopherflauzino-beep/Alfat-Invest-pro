import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ResetPasswordForm } from "@/components/auth/ResetPasswordForm";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <AuthPageShell eyebrow="Segurança" title="Criar nova senha" description="Defina uma senha forte. Depois da alteração, todas as sessões anteriores serão encerradas."><ResetPasswordForm token={params.token || ""} /></AuthPageShell>;
}