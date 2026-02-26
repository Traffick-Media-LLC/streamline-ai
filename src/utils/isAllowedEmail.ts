const ALLOWED_DOMAINS = ['@streamlinevape.com'];
const ALLOWED_EMAILS = ['michael@offlimits.dev'];

export function isAllowedEmail(email: string): boolean {
  return ALLOWED_DOMAINS.some(d => email.endsWith(d))
    || ALLOWED_EMAILS.includes(email.toLowerCase());
}
