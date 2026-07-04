# Database Migrations

Forward-only SQL migrations for the three Supabase environments (dev1, dev2,
prod), run from GitHub Actions. No local `psql` or laptop required.

---

## Files that make this work

Copy these three files into the `MannyPHuerta/Lupine-AIR` GitHub repo at the
same paths:

- `.github/workflows/migrate.yml` — the manual-dispatch Actions workflow
- `scripts/migrate-environment.sh` — the forward-only runner
- `supabase/migrations/*.sql` — the migration files themselves (any `.sql`
  under this folder gets picked up, applied in filename order)

Nothing else in the Lovable project needs to move for migrations to work.

---

## One-time setup in GitHub

### 1. Add repo secrets

Repo → **Settings → Secrets and variables → Actions → New repository secret**:

| Name          | Value                                                  |
| ------------- | ------------------------------------------------------ |
| `DEV1_DB_URL` | Supabase dev1 connection string (Session pooler, port 5432) |
| `DEV2_DB_URL` | Supabase dev2 connection string (Session pooler, port 5432) |
| `PROD_DB_URL` | Supabase prod connection string (Session pooler, port 5432) |

Get each URL from Supabase → **Project Settings → Database → Connection
string → URI**. Use the **Session pooler** URL (port 5432), not the
transaction pooler (6543) — `psql` needs session mode.

### 2. (Recommended) Create GitHub Environments

Repo → **Settings → Environments → New environment**. Create three:
`dev1`, `dev2`, `prod`.

For `prod`, add a **required reviewer** so prod migrations require a manual
approval click before the job runs. dev1/dev2 can be left with no reviewers.

If you skip this step, remove the `environment: ${{ inputs.environment }}`
line from `.github/workflows/migrate.yml` — otherwise the job will wait
forever for an undefined environment.

---

## Bootstrapping (run once per environment)

The runner tracks which migrations have been applied in a table called
`public.schema_migrations`. On a database that already contains the schema
from earlier migrations, you must first **mark** those files as applied
without re-running them.

Order:

1. Go to **Actions → Run DB Migrations → Run workflow**.
2. Run with:
   - `environment: dev1`, `mode: mark` → click Run workflow.
3. Repeat with `environment: dev2`, `mode: mark`.
4. Repeat with `environment: prod`, `mode: mark`,
   `prod_confirm: APPLY TO PROD`.

After these three runs, each database has a `schema_migrations` table
listing every existing `.sql` file as already applied. From now on you only
add **new** migration files.

---

## Day-to-day: applying a new migration

1. Add a new file under `supabase/migrations/` in the repo. Name it with a
   sortable timestamp prefix so ordering is unambiguous:

