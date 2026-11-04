import type { PGlite } from '@electric-sql/pglite'

const localSchema = `
create schema if not exists roastbook_local;
create table if not exists roastbook_local.migrations (name text primary key);
create table if not exists roastbook_local.state (key text primary key, value jsonb not null);
create table if not exists roastbook_local.outbox (
  seq bigserial primary key,
  name text not null,
  input jsonb,
  recorded jsonb not null default '{}',
  key uuid not null unique,
  status text not null default 'pending' check (status in ('pending', 'conflict')),
  error text,
  attempts integer not null default 0,
  next_attempt_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create table if not exists roastbook_local.id_pool (
  table_name text not null,
  id bigint not null,
  primary key (table_name, id)
);
create table if not exists roastbook_local.media (
  path text primary key,
  mime_type text not null,
  data bytea not null
);
grant usage on schema roastbook_local to roastbook_journal;
grant all on all tables in schema roastbook_local to roastbook_journal;
grant all on all sequences in schema roastbook_local to roastbook_journal;
`

/** Applies the server's migrations once each, in order, then the local bookkeeping tables. */
export async function migrateJournal(
  db: Pick<PGlite, 'exec' | 'query' | 'transaction'>,
  migrations: Record<string, () => Promise<string>>,
) {
  await db.exec(
    'create schema if not exists roastbook_local; create table if not exists roastbook_local.migrations (name text primary key);',
  )
  const applied = new Set(
    (
      await db.query<{ name: string }>(
        'select name from roastbook_local.migrations',
      )
    ).rows.map((row) => row.name),
  )
  for (const path of Object.keys(migrations).sort()) {
    const name = path.slice(path.lastIndexOf('/') + 1)
    if (applied.has(name)) continue
    const sql = (await migrations[path]?.())?.replaceAll(
      '--> statement-breakpoint',
      '',
    )
    if (sql === undefined) continue
    await db.transaction(async (tx) => {
      await tx.exec(sql)
      await tx.query('insert into roastbook_local.migrations values ($1)', [
        name,
      ])
    })
  }
  await db.exec(localSchema)
}
