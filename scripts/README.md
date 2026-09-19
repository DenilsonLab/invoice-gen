# Scripts

Maintenance and development scripts. Run them from the **project root** (they
use paths relative to the working directory, e.g. `src/locales/es.json` and
`file:database.sqlite`).

## `run-migrations.ts` — schema migrations

Applies pending schema migrations (defined in `src/server/migrations.ts`) to
the configured database. Uses `TURSO_DATABASE_URL`/`TURSO_AUTH_TOKEN` when set,
otherwise the local `file:database.sqlite`. Idempotent and safe to re-run.

Wired as an npm script:

```bash
npm run migrate
```

The app also runs migrations automatically on startup (see `src/server/db.ts`),
so this is mainly for applying schema changes explicitly (e.g. during deploy or
when the dev server isn't restarting).

## `migrate.ts` — one-off data migration (local → Turso)

Copies **data** from the local SQLite database (`database.sqlite`) to a remote
Turso/libSQL database. Requires `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in
`.env`. Maps user IDs by email when a user already exists remotely and tolerates
constraint errors for already-uploaded rows. Not referenced by `package.json`.

```bash
npx tsx scripts/migrate.ts
```

## `scratch.cjs`

Development helper that scans `src/` for i18n keys used via `t('...')` and
reports keys missing from `src/locales/es.json`.

```bash
node scripts/scratch.cjs
```
