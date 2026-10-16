import { test } from "node:test";
import assert from "node:assert/strict";
import {
  emptyState,
  scheduleReview,
  recordAttempt,
  makeQuestions,
} from "../src/lib/study.mjs";
import {
  mergeProgress,
  stampChanges,
  canonical,
  validateSyncState,
} from "../src/lib/sync-state.mjs";
import { ProgressStore } from "../src/lib/progress-store.mjs";
import { SyncEngine } from "../src/lib/sync-engine.mjs";
const p = {
  id: "shi-1",
  title: "击鼓",
  author: "诗经",
  category: "诗",
  lines: ["执子之手，与子偕老。"],
};
const q = makeQuestions([p], "next")[0];
const ids = new Set(["shi-1", "shi-2"]);
const clock = (time, id) => ({ now: () => Date.parse(time), id: () => id });
const change = (s, f, time, id) => stampChanges(s, f(s), clock(time, id));
const memory = () => {
  const m = new Map();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => m.set(k, v),
    map: m,
  };
};
test("账号导入备份保留已答对错句的删除标记", () => {
  const wrong = change(
    emptyState(),
    (s) =>
      recordAttempt(s, q, {
        id: "wrong",
        answer: "错",
        elapsed: 1,
        at: "2026-10-16T01:00:00Z",
      }),
    "2026-10-16T01:00:00Z",
    "a",
  );
  const right = change(
    wrong,
    (s) =>
      recordAttempt(s, q, {
        id: "right",
        answer: q.answer,
        elapsed: 1,
        at: "2026-10-16T02:00:00Z",
      }),
    "2026-10-16T02:00:00Z",
    "b",
  );
  const backup = { ...right, history: [] };
  const store = new ProgressStore({ storage: memory(), validIds: ids });
  store.switchOwner("a");
  store.importBackup(backup);
  assert.equal(store.getSnapshot().state.syncMeta.mistakes[q.id].correct, true);
  assert.equal(
    mergeProgress(store.getSnapshot().state, wrong).mistakes[q.id],
    undefined,
  );
});
test("双设备不同篇目合并，交换和重复合并得到相同结果", () => {
  const base = emptyState();
  const a = change(
    base,
    (s) => scheduleReview(s, "shi-1", "good", "2026-10-16"),
    "2026-10-16T01:00:00Z",
    "a",
  );
  const b = change(
    base,
    (s) => scheduleReview(s, "shi-2", "good", "2026-10-16"),
    "2026-10-16T02:00:00Z",
    "b",
  );
  const merged = mergeProgress(a, b);
  assert.equal(Object.keys(merged.learning).length, 2);
  assert.equal(canonical(merged), canonical(mergeProgress(b, a)));
  assert.equal(canonical(merged), canonical(mergeProgress(merged, a)));
});
test("最近一次不熟悉可以覆盖旧的熟练程度，学习设置按字段合并", () => {
  let a = change(
    emptyState(),
    (s) => scheduleReview(s, "shi-1", "good", "2026-10-16"),
    "2026-10-16T01:00:00Z",
    "a",
  );
  const b = change(
    a,
    (s) => scheduleReview(s, "shi-1", "again", "2026-10-17"),
    "2026-10-17T02:00:00Z",
    "b",
  );
  assert.equal(mergeProgress(a, b).learning["shi-1"].stage, 0);
  a = change(
    a,
    (s) => ({ ...s, settings: { ...s.settings, newPerDay: 3 } }),
    "2026-10-17T03:00:00Z",
    "c",
  );
  const c = change(
    b,
    (s) => ({ ...s, settings: { ...s.settings, roundSize: 20 } }),
    "2026-10-17T04:00:00Z",
    "d",
  );
  assert.deepEqual(mergeProgress(a, c).settings, {
    newPerDay: 3,
    roundSize: 20,
  });
});
test("历史按ID去重，答对的删除标记阻止旧设备复活错句", () => {
  const attempt = (s, id, answer, at) =>
    recordAttempt(s, q, { id, answer, elapsed: 1000, at });
  const a = change(
    emptyState(),
    (s) => attempt(s, "wrong", "错", "2026-10-16T01:00:00Z"),
    "2026-10-16T01:00:00Z",
    "a",
  );
  const b = change(
    a,
    (s) => attempt(s, "right", q.answer, "2026-10-16T02:00:00Z"),
    "2026-10-16T02:00:00Z",
    "b",
  );
  const merged = mergeProgress(a, b);
  assert.equal(merged.history.length, 2);
  assert.equal(merged.mistakes[q.id], undefined);
  assert.equal(merged.syncMeta.mistakes[q.id].correct, true);
  assert.equal(canonical(merged), canonical(mergeProgress(merged, a)));
  const wrongAgain = change(
    b,
    (s) => attempt(s, "wrong-again", "错", "2026-10-16T03:00:00Z"),
    "2026-10-16T03:00:00Z",
    "c",
  );
  assert.equal(mergeProgress(merged, wrongAgain).mistakes[q.id].count, 1);
});
test("旧备份兼容，未配置同步也不丢原记录，非法元数据被拒绝", () => {
  const old = scheduleReview(emptyState(), "shi-1", "good", "2026-10-16");
  const merged = mergeProgress(emptyState(), old);
  assert.ok(merged.learning["shi-1"]);
  assert.ok(validateSyncState(merged, ids));
  assert.throws(() =>
    validateSyncState(
      {
        ...old,
        syncMeta: {
          version: 1,
          learning: { "shi-1": { at: "坏日期", opId: "x" } },
          settings: {},
          mistakes: {},
        },
      },
      ids,
    ),
  );
});
test("同一时间不同设备操作冲突结果稳定，合并满足结合性", () => {
  const base = emptyState();
  const a = change(
    base,
    (s) => ({ ...s, settings: { ...s.settings, newPerDay: 3 } }),
    "2026-10-16T01:00:00Z",
    "a",
  );
  const b = change(
    base,
    (s) => ({ ...s, settings: { ...s.settings, newPerDay: 5 } }),
    "2026-10-16T01:00:00Z",
    "b",
  );
  const c = change(
    base,
    (s) => ({ ...s, lastPoem: "shi-2" }),
    "2026-10-16T02:00:00Z",
    "c",
  );
  assert.equal(canonical(mergeProgress(a, b)), canonical(mergeProgress(b, a)));
  assert.equal(
    canonical(mergeProgress(mergeProgress(a, b), c)),
    canonical(mergeProgress(a, mergeProgress(b, c))),
  );
});
test("账号缓存隔离，游客迁移需显式调用，退出恢复游客状态", () => {
  const storage = memory();
  const store = new ProgressStore({ storage, validIds: ids });
  store.update((s) => scheduleReview(s, "shi-1", "good", "2026-10-16"));
  store.switchOwner("user-a");
  assert.equal(Object.keys(store.getSnapshot().state.learning).length, 0);
  assert.equal(store.getSnapshot().guestAvailable, true);
  store.importGuest();
  assert.ok(store.getSnapshot().state.learning["shi-1"]);
  store.switchOwner("user-b");
  assert.equal(Object.keys(store.getSnapshot().state.learning).length, 0);
  assert.equal(store.getSnapshot().guestAvailable, false);
  store.update((s) => scheduleReview(s, "shi-2", "good", "2026-10-16"));
  store.switchOwner("user-a");
  assert.equal(store.getSnapshot().state.learning["shi-2"], undefined);
  store.switchOwner(null);
  assert.ok(store.getSnapshot().state.learning["shi-1"]);
});
test("保存失败时保留内存中的新进度并显示保存错误", () => {
  const store = new ProgressStore({
    storage: {
      getItem: () => null,
      setItem: () => {
        throw new Error("quota");
      },
    },
    validIds: ids,
  });
  store.update((s) => scheduleReview(s, "shi-1", "good", "2026-10-16"));
  assert.ok(store.getSnapshot().state.learning["shi-1"]);
  assert.equal(store.getSnapshot().storageError, true);
});
function backend() {
  let row = null;
  return {
    read: async () => row,
    compareAndSet: async (owner, payload, revision) => {
      if ((row?.revision || 0) !== revision) return { applied: false, ...row };
      row = { payload: structuredClone(payload), revision: revision + 1 };
      return { applied: true, ...row };
    },
    get: () => row,
  };
}
test("两个设备同时同步时CAS冲突后合并重试，不丢不同篇目", async () => {
  const db = backend(),
    a = new ProgressStore({ storage: memory(), validIds: ids }),
    b = new ProgressStore({ storage: memory(), validIds: ids });
  a.switchOwner("same");
  b.switchOwner("same");
  a.update((s) => scheduleReview(s, "shi-1", "good", "2026-10-16"));
  b.update((s) => scheduleReview(s, "shi-2", "good", "2026-10-16"));
  await Promise.all([
    new SyncEngine(a, db).sync(),
    new SyncEngine(b, db).sync(),
  ]);
  assert.equal(Object.keys(db.get().payload.learning).length, 2);
});
test("上传过程中新增的本地学习记录也会继续上传，不能虚报同步完成", async () => {
  const db = backend(),
    store = new ProgressStore({ storage: memory(), validIds: ids });
  store.switchOwner("a");
  store.update((s) => scheduleReview(s, "shi-1", "good", "2026-10-16"));
  const original = db.compareAndSet;
  let first = true;
  db.compareAndSet = async (...args) => {
    if (first) {
      first = false;
      store.update((s) => scheduleReview(s, "shi-2", "good", "2026-10-16"));
    }
    return original(...args);
  };
  const result = await new SyncEngine(store, db).sync();
  assert.equal(result.status, "synced");
  assert.ok(db.get().payload.learning["shi-2"]);
});
test("账号切换后迟到的网络结果被丢弃，不会写进新账号", async () => {
  const store = new ProgressStore({ storage: memory(), validIds: ids });
  store.switchOwner("a");
  store.update((s) => scheduleReview(s, "shi-1", "good", "2026-10-16"));
  let release;
  const gate = new Promise((r) => (release = r));
  let writes = 0;
  const db = {
    read: async () => {
      await gate;
      return null;
    },
    compareAndSet: async () => {
      writes++;
      throw new Error("must not write");
    },
  };
  const pending = new SyncEngine(store, db).sync();
  store.switchOwner("b");
  release();
  assert.equal((await pending).status, "cancelled");
  assert.equal(writes, 0);
  assert.equal(Object.keys(store.getSnapshot().state.learning).length, 0);
});
test("网络失败保留待同步数据，重试后才标记已同步", async () => {
  const store = new ProgressStore({ storage: memory(), validIds: ids });
  store.switchOwner("a");
  store.update((s) => scheduleReview(s, "shi-1", "good", "2026-10-16"));
  const db = backend();
  let offline = true;
  const read = db.read;
  db.read = () => (offline ? Promise.reject(new Error("offline")) : read());
  const engine = new SyncEngine(store, db);
  await assert.rejects(engine.sync());
  assert.ok(store.getSnapshot().state.learning["shi-1"]);
  offline = false;
  assert.equal((await engine.sync()).status, "synced");
});
