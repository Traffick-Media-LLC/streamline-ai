

## Show "Restricted Access" Page Instead of Auto Sign-Out

Instead of immediately signing out non-company email users, show them a dedicated page explaining access is restricted to Streamline employees, with a button to sign out manually.

### Changes

**1. New file: `src/pages/RestrictedPage.tsx`**

A full-page component that displays:
- Streamline logo
- "Access Restricted" heading
- Message: "This application is restricted to Streamline employees only. Please sign in with your @streamlinevape.com email address."
- "Sign Out" button that calls `supabase.auth.signOut()` and redirects to `/auth`

**2. Update `src/App.tsx`**

Add a new route: `/restricted` pointing to `RestrictedPage`. This route is NOT protected -- it needs to be accessible to signed-in non-company users.

**3. Update `src/contexts/AuthContext.tsx`**

Instead of calling `supabase.auth.signOut()` when a non-company email is detected, keep the user signed in but add a new context flag `isRestricted: true`. Remove the auto sign-out logic added in the last diff.

**4. Update `src/components/ProtectedRoute.tsx`**

After confirming the user is authenticated, check if their email ends with `@streamlinevape.com`. If not, redirect to `/restricted` instead of rendering the protected content.

### Flow

1. User signs in with Google using a personal email
2. Auth succeeds, user lands in the app
3. `ProtectedRoute` checks email domain, redirects to `/restricted`
4. User sees a clear message and can sign out manually

| File | Change |
|------|--------|
| `src/pages/RestrictedPage.tsx` | New page with restriction message and sign-out button |
| `src/App.tsx` | Add `/restricted` route |
| `src/contexts/AuthContext.tsx` | Remove auto sign-out, keep session for non-company emails |
| `src/components/ProtectedRoute.tsx` | Redirect non-company emails to `/restricted` |

