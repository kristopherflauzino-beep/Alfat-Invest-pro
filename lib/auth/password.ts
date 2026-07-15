import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";

const LEGACY = /^[a-f0-9]{64}$/i;
const COMMON_PASSWORDS = new Set([
  "123456789012", "password123!", "senha123456!", "senha@123456", "qwerty123456!",
  "admin123456!", "alfatec123!", "investpro123!", "abc123456789!"
]);

export function passwordPolicy(password: string, identity?: { name?: string; email?: string; username?: string }) {
  if (password.length < 12 || password.length > 256 || !/[A-Za-z]/.test(password) || !/\d/.test(password) || !/[^A-Za-z0-9]/.test(password)) {
    return "A senha deve ter entre 12 e 256 caracteres, letra, número e caractere especial.";
  }
  const lower = password.toLowerCase();
  const compact = lower.replace(/\s/g, "");
  if (COMMON_PASSWORDS.has(compact) || /(123456|qwerty|password|senha123|admin123)/i.test(compact)) {
    return "Escolha uma senha menos comum e difícil de adivinhar.";
  }
  const values = [identity?.name, identity?.email?.split("@")[0], identity?.username]
    .filter(Boolean)
    .map((value) => String(value).toLowerCase())
    .filter((value) => value.length >= 3);
  if (values.some((value) => lower.includes(value))) {
    return "A senha não pode conter seu nome, usuário ou e-mail.";
  }
  return null;
}

export async function hashPassword(password: string) { return bcrypt.hash(password, 12); }
export async function verifyPassword(password: string, stored: string) {
  if (stored.startsWith("$2")) return bcrypt.compare(password, stored);
  if (LEGACY.test(stored)) return createHash("sha256").update(password).digest("hex") === stored;
  return false;
}
export function needsPasswordUpgrade(stored: string) { return !stored.startsWith("$2"); }