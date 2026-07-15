import { AuthPageShell } from "@/components/auth/AuthPageShell";
import { ForgotPasswordForm } from "@/components/auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return <AuthPageShell eyebrow="Segurança" title="Recuperar senha" description="Informe o e-mail cadastrado. Se a conta existir, enviaremos um link temporário e de uso único."><ForgotPasswordForm /></AuthPageShell>;
}