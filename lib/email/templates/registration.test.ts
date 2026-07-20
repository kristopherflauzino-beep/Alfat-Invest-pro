import { describe, expect, it } from "vitest";
import {
  freeAccountActivatedEmail,
  registrationConfirmationEmail
} from "@/lib/email/templates/registration";

describe("registration email templates", () => {
  it("describes free activation without payment", () => {
    const email = registrationConfirmationEmail({
      name: "Cliente",
      confirmationUrl: "https://alfatecinvestpro.vercel.app/confirmar-email?token=abc",
      planName: "Plano Gratuito",
      isFree: true
    });

    expect(email.text).toContain("conta gratuita");
    expect(email.html).toContain("sem cobrança");
    expect(email.html).not.toContain("prosseguir para o pagamento");
  });

  it("keeps the paid plan payment step", () => {
    const email = registrationConfirmationEmail({
      name: "Cliente",
      confirmationUrl: "https://alfatecinvestpro.vercel.app/confirmar-email?token=abc",
      planName: "Mensal"
    });

    expect(email.html).toContain("pagamento do plano Mensal");
  });

  it("shows the activated free plan as zero-cost", () => {
    const email = freeAccountActivatedEmail({
      name: "Cliente",
      appUrl: "https://alfatecinvestpro.vercel.app"
    });

    expect(email.subject).toContain("conta gratuita");
    expect(email.html).toContain("R$ 0,00");
    expect(email.html).toContain("Não se aplica");
  });
});
