/**
 * Pure seller-form validators shared by the login UI and unit tests.
 * Server-side enforcement lives in lib/validation/schemas.ts (zod) — these
 * helpers only drive real-time client feedback. No React imports here.
 */

/** Name: max 50 chars, letters/spaces/hyphens/apostrophes/periods only. */
export function isValidSellerName(v: string): boolean {
  const t = v.trim();
  return t.length >= 2 && t.length <= 50 && /^[A-Za-z][A-Za-z\s.'-]*$/.test(t);
}

/** Philippine mobile: exactly 11 digits starting with 09. */
export function isValidContactNumber(v: string): boolean {
  return /^09\d{9}$/.test(v.trim());
}

export interface PasswordCheck {
  label: string;
  ok: boolean;
}

/** Strong-password checklist (mirrors `passwordRule` in zod schemas). */
export function passwordChecks(pw: string): PasswordCheck[] {
  return [
    { label: "At least 8 characters", ok: pw.length >= 8 },
    { label: "One uppercase letter", ok: /[A-Z]/.test(pw) },
    { label: "One lowercase letter", ok: /[a-z]/.test(pw) },
    { label: "One number", ok: /[0-9]/.test(pw) },
    { label: "One special character", ok: /[!@#$%^&*(),.?":{}|<>]/.test(pw) },
  ];
}
