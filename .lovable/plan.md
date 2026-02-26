

## Allow michael@offlimits.dev to Bypass Email Restriction

A simple allowlist will be added so that `michael@offlimits.dev` can access the app alongside `@streamlinevape.com` users.

### Changes

**1. Create a shared helper: `src/utils/isAllowedEmail.ts`**

A single utility function that checks if an email is allowed. This centralizes the logic so it's easy to add/remove exceptions later.

```typescript
const ALLOWED_DOMAINS = ['@streamlinevape.com'];
const ALLOWED_EMAILS = ['michael@offlimits.dev'];

export function isAllowedEmail(email: string): boolean {
  return ALLOWED_DOMAINS.some(d => email.endsWith(d)) 
    || ALLOWED_EMAILS.includes(email.toLowerCase());
}
```

**2. Update `src/components/ProtectedRoute.tsx`**

Replace the inline `endsWith('@streamlinevape.com')` check (line 58) with `isAllowedEmail(user.email)`.

**3. Update `src/components/auth/AuthForm.tsx`**

Replace the inline `endsWith('@streamlinevape.com')` check (line 60) with `isAllowedEmail(email)`.

**4. Fix pre-existing build error in `src/pages/MapPage.tsx`**

The TypeScript error on line 18 (`Type instantiation is excessively deep`) will be fixed by adding a type assertion to the Supabase query.

