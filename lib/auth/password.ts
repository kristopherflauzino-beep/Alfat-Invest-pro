import bcrypt from "bcryptjs";
import { createHash } from "node:crypto";
const LEGACY=/^[a-f0-9]{64}$/i;
export function passwordPolicy(password:string,identity?:{name?:string;email?:string;username?:string}){if(password.length<12||password.length>256||!/[A-Za-z]/.test(password)||!/\d/.test(password)||!/[^A-Za-z0-9]/.test(password))return "A senha deve ter entre 12 e 256 caracteres, letra, numero e caractere especial.";const lower=password.toLowerCase();const values=[identity?.name,identity?.email?.split("@")[0],identity?.username].filter(Boolean).map(value=>String(value).toLowerCase()).filter(value=>value.length>=3);if(values.some(value=>lower.includes(value)))return "A senha nao pode conter seu nome, usuario ou e-mail.";return null;}
export async function hashPassword(password:string){return bcrypt.hash(password,12);}
export async function verifyPassword(password:string,stored:string){if(stored.startsWith("$2"))return bcrypt.compare(password,stored);if(LEGACY.test(stored))return createHash("sha256").update(password).digest("hex")===stored;return false;}
export function needsPasswordUpgrade(stored:string){return !stored.startsWith("$2");}
