import { sendEmail } from "./email-service";
import { planEmailTemplate, type PlanEmailInput } from "./templates/plan";

export async function sendPlanEmail(input: PlanEmailInput) {
  const template = planEmailTemplate(input);
  return sendEmail({ to: input.to, ...template });
}