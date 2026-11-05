import { DbUnavailable, db } from "./db";
import { performance, type Allocation, type Point } from "./strategies";

// What the Strategies screens read. Account ids appear only for creators who chose to show theirs.

export type StrategyCard = {
  id: string;
  name: string;
  focus: string;
  createdAt: string;
  creator: { handle: string; accountId: string | null; since: string };
  weights: Record<string, number>;
  ret: number | null;
  points: Point[];
  changes: number;
  followers: number;
  lastCheck: { at: string; matched: boolean } | null;
  snapshots: number;
};

export type StrategyDetail = StrategyCard & {
  approach: string;
  creator: StrategyCard["creator"] & { bio: string; strategies: number };
  updates: Allocation[];
  check: { at: string; matched: boolean; maxDiff: number | null; reason: string; valueRange: string | null } | null;
  following: boolean;
  isOwner: boolean;
  newUpdates: number;
};

type Row = {
  id: string;
  name: string;
  focus: string;
  approach: string;
  created_at: Date;
  show_value: boolean;
  creator: string;
  handle: string;
  bio: string;
  show_account: boolean;
  creator_since: Date;
};

const iso = (d: Date | string) => new Date(d).toISOString();

async function allocationsOf(ids: string[]) {
  const sql = await db();
  const rows =
    (await sql`select strategy_id, version, at, weights, note from allocations where strategy_id = any(${ids}) order by version`) as {
      strategy_id: string;
      version: number;
      at: Date;
      weights: Record<string, number>;
      note: string;
    }[];
  const map = new Map<string, Allocation[]>();
  for (const r of rows)
    map.set(r.strategy_id, [...(map.get(r.strategy_id) ?? []), { version: r.version, at: iso(r.at), weights: r.weights, note: r.note }]);
  return map;
}

async function card(r: Row, allocs: Allocation[], followers: number, lastCheck: StrategyCard["lastCheck"]): Promise<StrategyCard> {
  const perf = await performance(allocs);
  return {
    id: r.id,
    name: r.name,
    focus: r.focus,
    createdAt: iso(r.created_at),
    creator: { handle: r.handle, accountId: r.show_account ? r.creator : null, since: iso(r.creator_since) },
    weights: allocs.at(-1)?.weights ?? {},
    ret: perf.ret,
    points: perf.points,
    changes: Math.max(0, allocs.length - 1),
    followers,
    lastCheck,
    snapshots: perf.snapshots,
  };
}

const BASE = `select s.id, s.name, s.focus, s.approach, s.created_at, s.show_value, s.creator,
  c.handle, c.bio, c.show_account, c.created_at as creator_since
  from strategies s join creators c on c.signer_id = s.creator`;

/** Newest first. `followedBy` limits the list to strategies that account follows. */
export async function listStrategies(followedBy?: string): Promise<StrategyCard[]> {
  const sql = await db();
  const rows = (
    followedBy
      ? await sql.query(`${BASE} join follows f on f.strategy_id = s.id and f.signer_id = $1 order by s.created_at desc limit 50`, [
          followedBy,
        ])
      : await sql.query(`${BASE} order by s.created_at desc limit 50`)
  ) as Row[];
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const allocs = await allocationsOf(ids);
  const counts = (await sql`select strategy_id, count(*)::int as n from follows where strategy_id = any(${ids}) group by strategy_id`) as {
    strategy_id: string;
    n: number;
  }[];
  const checks = (await sql`select distinct on (strategy_id) strategy_id, at, matched from holdings_checks
    where strategy_id = any(${ids}) order by strategy_id, at desc`) as { strategy_id: string; at: Date; matched: boolean }[];
  return Promise.all(
    rows.map((r) => {
      const c = checks.find((x) => x.strategy_id === r.id);
      return card(
        r,
        allocs.get(r.id) ?? [],
        counts.find((x) => x.strategy_id === r.id)?.n ?? 0,
        c ? { at: iso(c.at), matched: c.matched } : null,
      );
    }),
  );
}

export async function loadStrategy(id: string, viewer: string | null): Promise<StrategyDetail | null> {
  const sql = await db();
  const [r] = (await sql.query(`${BASE} where s.id = $1`, [id])) as Row[];
  if (!r) return null;
  const allocs = (await allocationsOf([id])).get(id) ?? [];
  const [{ n: followers }] = (await sql`select count(*)::int as n from follows where strategy_id = ${id}`) as { n: number }[];
  const [{ n: strategies }] = (await sql`select count(*)::int as n from strategies where creator = ${r.creator}`) as { n: number }[];
  const [chk] =
    (await sql`select at, matched, max_diff, reason, value_range from holdings_checks where strategy_id = ${id} order by at desc limit 1`) as {
      at: Date;
      matched: boolean;
      max_diff: number | null;
      reason: string;
      value_range: string | null;
    }[];
  const [follow] = viewer
    ? ((await sql`select seen_version from follows where strategy_id = ${id} and signer_id = ${viewer}`) as { seen_version: number }[])
    : [];
  const base = await card(r, allocs, followers, chk ? { at: iso(chk.at), matched: chk.matched } : null);
  const latest = allocs.at(-1)?.version ?? 1;
  if (follow && follow.seen_version < latest)
    await sql`update follows set seen_version = ${latest} where strategy_id = ${id} and signer_id = ${viewer}`;
  return {
    ...base,
    approach: r.approach,
    creator: { ...base.creator, bio: r.bio, strategies },
    updates: allocs.slice(1).reverse(),
    check: chk
      ? {
          at: iso(chk.at),
          matched: chk.matched,
          maxDiff: chk.max_diff,
          reason: chk.reason,
          valueRange: r.show_value ? chk.value_range : null,
        }
      : null,
    following: !!follow,
    isOwner: viewer === r.creator,
    newUpdates: follow ? Math.max(0, latest - follow.seen_version) : 0,
  };
}

/** For each followed strategy, how many allocation updates the follower hasn't opened yet. */
export async function unseenUpdates(signerId: string) {
  const sql = await db();
  return (await sql`select f.strategy_id as id, s.name, (select max(version) from allocations a where a.strategy_id = f.strategy_id) - f.seen_version as unseen
    from follows f join strategies s on s.id = f.strategy_id where f.signer_id = ${signerId}`) as {
    id: string;
    name: string;
    unseen: number;
  }[];
}

/** 503 with a plain message when the database isn't configured; rethrows anything else. */
export function dbError(e: unknown) {
  if (e instanceof DbUnavailable) return Response.json({ error: "Strategies aren't set up on this server yet." }, { status: 503 });
  console.error("strategies", e);
  return Response.json({ error: "Strategies couldn't be loaded right now." }, { status: 502 });
}
