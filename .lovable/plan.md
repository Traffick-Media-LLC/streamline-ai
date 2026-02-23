

## Add Anonymous Read Access to All Tables

### What This Does
Adds a permissive SELECT (read-only) policy for anonymous users on every table in the database so your separate project can query data without authentication.

### Why New Policies Are Needed
The existing RLS policies are all **restrictive**, meaning they require ALL conditions to pass. Many also check `auth.uid()`, blocking anonymous access. We need to add **permissive** SELECT policies that explicitly grant read access to the `anon` role.

### Tables Receiving New Policies

All 18 tables will get a new permissive policy:

| Table | Current Anon Read | After |
|---|---|---|
| app_settings | Blocked | Open |
| brands | Likely works (has `true`) | Guaranteed |
| chat_feedback | Blocked | Open |
| chat_logs | Blocked | Open |
| chat_messages | Blocked | Open |
| chats | Blocked | Open |
| drive_files | Likely works | Guaranteed |
| employees | Likely works | Guaranteed |
| file_content | Likely works | Guaranteed |
| knowledge_entries | Active only | All active |
| product_ingredients | Blocked | Open |
| products | Likely works | Guaranteed |
| profiles | Blocked | Open |
| state_allowed_products | Likely works | Guaranteed |
| state_excise_taxes | Blocked | Open |
| state_notes | Likely works | Guaranteed |
| states | Likely works | Guaranteed |
| user_filter_preferences | Blocked | Open |
| user_roles | Blocked | Open |

### Technical Details

A single SQL migration will add one **permissive** SELECT policy per table, all using `USING (true)` and targeting the `anon` role:

```text
CREATE POLICY "anon_read_[table]"
  ON public.[table]
  FOR SELECT
  TO anon
  USING (true);
```

This is applied to all 18 tables. Existing policies remain untouched so your current app continues to work.

### Security Note

This opens **all data** (including user profiles, chat messages, roles) for anonymous read access. This is fine for your use case since you confirmed all tables should be open, but be aware that anyone with your Supabase URL and anon key can read this data.

### No Code Changes Required

Only database migration needed -- no frontend or edge function changes.

