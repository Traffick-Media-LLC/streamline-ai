

## Restrict Sign-ups to @streamlinevape.com (Server-Side)

### Problem
Client-side domain checks can be bypassed. The restriction must be enforced at the database level so no one can create an account with a non-company email, regardless of how they authenticate.

### Solution: PostgreSQL Database Trigger + Client-Side UX

#### 1. Database Migration: Block non-company sign-ups at the database level

Create a PostgreSQL trigger function that fires **before insert** on `auth.users`. If the new user's email does not end with `@streamlinevape.com`, the trigger raises an exception, preventing the row from being created.

```sql
CREATE OR REPLACE FUNCTION public.enforce_email_domain()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.email IS NULL OR NOT NEW.email LIKE '%@streamlinevape.com' THEN
    RAISE EXCEPTION 'Registration is restricted to @streamlinevape.com email addresses';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_email_domain_trigger
  BEFORE INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_email_domain();
```

This is the real enforcement layer. Even if someone calls the Supabase API directly, the database will reject the sign-up.

#### 2. Client-side validation (UX only, not security)

These changes provide a better user experience by showing friendly error messages before hitting the server.

**`src/components/auth/AuthForm.tsx`**
- In the email sign-up handler, check if the email ends with `@streamlinevape.com` before calling `signUp()`. Show a toast error if it doesn't match.
- Add a small info note under the form: "Access restricted to @streamlinevape.com accounts"

**`src/contexts/AuthContext.tsx`**
- In `onAuthStateChange`, if a `SIGNED_IN` event fires with a non-company email (e.g., someone signs in via Google with a personal account), immediately sign them out and show an error. This handles the Google OAuth case where the user picks a non-company Google account.

#### 3. Files Changed

| File | Change |
|------|--------|
| New migration SQL | Database trigger to block non-company emails |
| `src/components/auth/AuthForm.tsx` | Client-side domain check + info text |
| `src/contexts/AuthContext.tsx` | Sign-out non-company Google accounts |

#### Technical Notes
- The database trigger runs at the PostgreSQL level, so it cannot be bypassed from the client
- Google Sign In will still redirect, but the sign-up will fail server-side if the Google account isn't `@streamlinevape.com`, and the AuthContext check will handle the UX gracefully
- Existing users with non-company emails (if any) are not affected -- the trigger only fires on new sign-ups
- No changes needed to edge functions or RLS policies

