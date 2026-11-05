import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

// Postgres (Neon, provisioned through Vercel) for what has to be shared between accounts: strategies, follows and
// the price snapshots their performance is computed from. Everything else in Lumen stays in cookies.

export class DbUnavailable extends Error {
  constructor() {
    super("DATABASE_URL is not set");
  }
}

let client: NeonQueryFunction<false, false> | null = null;
let ready: Promise<void> | null = null;

const SCHEMA = [
  `create table if not exists creators (
     signer_id text primary key,
     handle text unique not null,
     bio text not null default '',
     show_account boolean not null default false,
     created_at timestamptz not null default now())`,
  `create table if not exists strategies (
     id text primary key,
     creator text not null references creators(signer_id),
     name text not null,
     focus text not null,
     approach text not null,
     show_value boolean not null default false,
     created_at timestamptz not null default now())`,
  `create table if not exists allocations (
     strategy_id text not null references strategies(id) on delete cascade,
     version int not null,
     at timestamptz not null,
     weights jsonb not null,
     note text not null default '',
     primary key (strategy_id, version))`,
  `create table if not exists prices (
     at timestamptz not null,
     symbol text not null,
     price double precision not null,
     source_at timestamptz,
     primary key (at, symbol))`,
  `create index if not exists prices_symbol_at on prices (symbol, at)`,
  `create table if not exists holdings_checks (
     id bigserial primary key,
     strategy_id text not null references strategies(id) on delete cascade,
     at timestamptz not null default now(),
     matched boolean not null,
     max_diff double precision,
     reason text not null default '',
     value_range text)`,
  `create table if not exists follows (
     strategy_id text not null references strategies(id) on delete cascade,
     signer_id text not null,
     at timestamptz not null default now(),
     seen_version int not null default 1,
     primary key (strategy_id, signer_id))`,
];

/** The query function, with the schema created once per server instance. Throws DbUnavailable without DATABASE_URL. */
export async function db() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new DbUnavailable();
  client ??= neon(url);
  const sql = client;
  ready ??= (async () => {
    for (const stmt of SCHEMA) await sql.query(stmt);
  })().catch((e) => {
    ready = null;
    throw e;
  });
  await ready;
  return sql;
}
