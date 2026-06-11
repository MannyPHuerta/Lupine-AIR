# ⚠️ MANDATORY ARCHITECTURE RULES — READ BEFORE EVERY RESPONSE ⚠️

## THIS PROJECT RUNS ON VERCEL + SUPABASE. NOT BASE44.

---

### ❌ NEVER DO THESE — EVER:
- NEVER use `base44.entities.*` for data storage
- NEVER use `base44.functions.invoke(...)` to call backend logic
- NEVER create files in `functions/` (those are Base44 backend functions — they do NOT run on Vercel)
- NEVER create files in `entities/` (those are Base44 entity schemas — they are NOT used in production)
- NEVER use `base44.integrations.*` for email, AI, or file uploads
- NEVER use `base44.auth.*` for authentication
- NEVER create automations via Base44 automation tools

---

### ✅ ALWAYS DO THESE:

| Need | Use This |
|------|----------|
| Database read/write | `supabase.from('table_name')` via `api/supabaseClient.js` |
| Authentication | Supabase Auth (`supabase.auth.signUp`, `signInWithPassword`, etc.) |
| Backend logic | Vercel serverless functions in `/api/*.js` (Node.js, not Deno) |
| Email sending | Resend API called directly inside `/api/*.js` |
| Scheduled jobs | Supabase `pg_cron` extension OR Vercel Cron Jobs in `vercel.json` |
| AI calls | Direct OpenAI/Anthropic API calls inside `/api/*.js` |
| File uploads | Supabase Storage |
| Environment secrets | Vercel dashboard → Settings → Environment Variables |

---

### Project Structure:
```
/api/          ← ALL backend logic lives here (Vercel serverless, Node.js)
/src/          ← React frontend (Vite)
/src/pages/    ← Page components
/src/components/ ← Reusable components
/api/supabaseClient.js ← Supabase client (already exists, use it)
```

### Database:
- All tables are in **Supabase Postgres**
- Schema is defined in `SUPABASE_SCHEMA.sql`
- Use `api/supabaseClient.js` for all DB access in `/api/` functions
- Use `src/lib/supabaseData.js` for frontend DB access

### Auth:
- **Supabase Auth** only — email/password
- NO magic links, NO Base44 invite system
- Sign up: `supabase.auth.signUp({ email, password })`
- Sign in: `supabase.auth.signInWithPassword({ email, password })`

### Deployment:
- **Production**: Vercel → theprojectair.com
- **Secrets**: Set in Vercel dashboard, NOT Base44 secrets panel
- `/api/waitlist.js` already works in production — it is the model to follow

---

### The Golden Rule:
> If it can't run as a plain Node.js file in `/api/`, it doesn't belong in the backend.
> If it can't query Supabase directly, it doesn't belong in the frontend data layer.