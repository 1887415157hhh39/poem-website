import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { PGlite } from "@electric-sql/pglite";
import { emptyState } from "../src/lib/study.mjs";
test("真实Postgres语义：RLS隔离用户、禁止匿名、CAS冲突保留新数据、拒绝串号", async () => {
  const db = new PGlite();
  const a = "11111111-1111-4111-8111-111111111111",
    b = "22222222-2222-4222-8222-222222222222";
  try {
    await db.exec(`create schema auth; create table auth.users(id uuid primary key); create role anon; create role authenticated;
   create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;
   grant usage on schema public,auth to anon,authenticated; grant execute on function auth.uid() to anon,authenticated;
   insert into auth.users values ('${a}'),('${b}');`);
    await db.exec(
      readFileSync(
        new URL(
          "../supabase/migrations/202610160001_email_progress.sql",
          import.meta.url,
        ),
        "utf8",
      ),
    );
    await db.exec(
      `set role authenticated; select set_config('request.jwt.claim.sub','${a}',false);`,
    );
    const rpc = (id, payload, revision) =>
      db.query(
        "select public.wengu_sync_progress($1::uuid,$2::jsonb,$3::bigint) as result",
        [id, JSON.stringify(payload), revision],
      );
    const initial = await rpc(a, emptyState(), 0);
    assert.equal(initial.rows[0].result.applied, true);
    assert.equal(initial.rows[0].result.revision, 1);
    const updated = await rpc(a, { ...emptyState(), lastPoem: "shi-2" }, 1);
    assert.equal(updated.rows[0].result.revision, 2);
    const stale = await rpc(a, emptyState(), 1);
    assert.equal(stale.rows[0].result.applied, false);
    assert.equal(stale.rows[0].result.payload.lastPoem, "shi-2");
    await assert.rejects(rpc(b, emptyState(), 0), /another account/);
    await assert.rejects(rpc(a, { version: 1 }, 2), /Invalid study/);
    await db.exec(`select set_config('request.jwt.claim.sub','${b}',false);`);
    assert.equal(
      (await db.query("select * from public.wengu_progress")).rows.length,
      0,
    );
    await rpc(b, emptyState(), 0);
    assert.equal(
      (await db.query("select * from public.wengu_progress")).rows.length,
      1,
    );
    await assert.rejects(
      db.query(
        "insert into public.wengu_progress(user_id,payload) values($1,$2)",
        [a, JSON.stringify(emptyState())],
      ),
      /row-level security/,
    );
    await db.exec(
      `reset role; set role anon; select set_config('request.jwt.claim.sub','',false);`,
    );
    await assert.rejects(rpc(a, emptyState(), 0), /permission denied/);
    await assert.rejects(
      db.query("select * from public.wengu_progress"),
      /permission denied/,
    );
  } finally {
    await db.close();
  }
});
