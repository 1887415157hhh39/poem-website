import { emptyState, validateBackup } from "./study.mjs";
const EPOCH = "1970-01-01T00:00:00.000Z";
export function canonical(value) {
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  if (value && typeof value === "object")
    return (
      "{" +
      Object.keys(value)
        .sort()
        .filter((k) => value[k] !== undefined)
        .map((k) => JSON.stringify(k) + ":" + canonical(value[k]))
        .join(",") +
      "}"
    );
  return JSON.stringify(value);
}
const iso = (at) =>
  Number.isFinite(Date.parse(at)) ? new Date(at).toISOString() : EPOCH;
const stamp = (at = EPOCH, opId = "legacy") => ({ at: iso(at), opId });
const compare = (a, b) =>
  iso(a?.at).localeCompare(iso(b?.at)) ||
  String(a?.opId || "").localeCompare(String(b?.opId || ""));
function choose(a, b, av, bv) {
  const c = compare(a, b);
  return c > 0
    ? "a"
    : c < 0
      ? "b"
      : canonical(av).localeCompare(canonical(bv)) >= 0
        ? "a"
        : "b";
}

export function syncMeta(state) {
  const old = state.syncMeta || {};
  const meta = {
    version: 1,
    learning: {},
    settings: {},
    lastPoem: old.lastPoem || stamp(EPOCH, `legacy:${state.lastPoem}`),
    mistakes: {},
  };
  for (const [id, l] of Object.entries(state.learning))
    meta.learning[id] = old.learning?.[id] || {
      ...stamp(`${l.lastReviewed}T12:00:00+08:00`, `legacy:${id}`),
      deleted: false,
    };
  for (const [id, m] of Object.entries(old.learning || {}))
    meta.learning[id] = m;
  for (const field of ["newPerDay", "roundSize"])
    meta.settings[field] =
      old.settings?.[field] ||
      stamp(
        state.settings[field] === emptyState().settings[field]
          ? EPOCH
          : "1970-01-01T00:00:00.001Z",
        `legacy:${field}`,
      );
  for (const [id, m] of Object.entries(state.mistakes))
    meta.mistakes[id] = {
      ...stamp(m.lastAt, `legacy:${id}`),
      correct: false,
      question: m.question,
    };
  for (const h of state.history) {
    const event = {
      ...stamp(h.at, h.id),
      correct: h.correct,
      ...(!h.correct && state.mistakes[h.questionId]
        ? { question: state.mistakes[h.questionId].question }
        : {}),
    };
    if (
      !meta.mistakes[h.questionId] ||
      compare(event, meta.mistakes[h.questionId]) > 0
    )
      meta.mistakes[h.questionId] = event;
  }
  for (const [id, event] of Object.entries(old.mistakes || {})) {
    if (!meta.mistakes[id] || compare(event, meta.mistakes[id]) >= 0)
      meta.mistakes[id] = event;
  }
  return meta;
}
export function stampChanges(before, next, options = {}) {
  if (canonical(before) === canonical(next)) return before;
  const meta = structuredClone(syncMeta(before));
  const all = [
    ...Object.values(meta.learning),
    ...Object.values(meta.settings),
    meta.lastPoem,
    ...Object.values(meta.mistakes),
  ];
  const at = new Date(
    Math.max(
      (options.now || Date.now)(),
      ...all.map((x) => Date.parse(x.at) + 1),
    ),
  ).toISOString();
  const operation = stamp(at, (options.id || (() => crypto.randomUUID()))());
  for (const id of new Set([
    ...Object.keys(before.learning),
    ...Object.keys(next.learning),
  ])) {
    if (canonical(before.learning[id]) !== canonical(next.learning[id]))
      meta.learning[id] = { ...operation, deleted: !next.learning[id] };
  }
  for (const field of ["newPerDay", "roundSize"])
    if (before.settings[field] !== next.settings[field])
      meta.settings[field] = operation;
  if (before.lastPoem !== next.lastPoem) meta.lastPoem = operation;
  const oldIds = new Set(before.history.map((h) => h.id));
  for (const h of [...next.history].reverse())
    if (!oldIds.has(h.id))
      meta.mistakes[h.questionId] = {
        ...operation,
        opId: h.id,
        correct: h.correct,
        ...(!h.correct && next.mistakes[h.questionId]
          ? { question: next.mistakes[h.questionId].question }
          : {}),
      };
  for (const id of new Set([
    ...Object.keys(before.mistakes),
    ...Object.keys(next.mistakes),
  ])) {
    if (
      canonical(before.mistakes[id]) !== canonical(next.mistakes[id]) &&
      !next.history.some((h) => !oldIds.has(h.id) && h.questionId === id)
    )
      meta.mistakes[id] = {
        ...operation,
        correct: !next.mistakes[id],
        ...(next.mistakes[id] ? { question: next.mistakes[id].question } : {}),
      };
  }
  return { ...next, syncMeta: meta };
}
export function mergeProgress(a, b) {
  const am = syncMeta(a),
    bm = syncMeta(b);
  const meta = {
    version: 1,
    learning: {},
    settings: {},
    mistakes: {},
    lastPoem: null,
  };
  const result = {
    ...emptyState(),
    learning: {},
    mistakes: {},
    settings: {},
    syncMeta: meta,
  };
  for (const id of [
    ...new Set([...Object.keys(am.learning), ...Object.keys(bm.learning)]),
  ].sort()) {
    const side = choose(
      am.learning[id],
      bm.learning[id],
      a.learning[id] ?? null,
      b.learning[id] ?? null,
    );
    const s = side === "a" ? a : b,
      m = side === "a" ? am : bm;
    if (m.learning[id]) {
      meta.learning[id] = structuredClone(m.learning[id]);
      if (!m.learning[id].deleted && s.learning[id])
        result.learning[id] = structuredClone(s.learning[id]);
    }
  }
  for (const field of ["newPerDay", "roundSize"]) {
    const side = choose(
      am.settings[field],
      bm.settings[field],
      a.settings[field],
      b.settings[field],
    );
    result.settings[field] = (side === "a" ? a : b).settings[field];
    meta.settings[field] = structuredClone(
      (side === "a" ? am : bm).settings[field],
    );
  }
  const recent = choose(am.lastPoem, bm.lastPoem, a.lastPoem, b.lastPoem);
  result.lastPoem = (recent === "a" ? a : b).lastPoem;
  meta.lastPoem = structuredClone((recent === "a" ? am : bm).lastPoem);
  const rows = new Map();
  for (const h of [...a.history, ...b.history]) {
    const prev = rows.get(h.id);
    if (!prev || canonical(h) > canonical(prev)) rows.set(h.id, h);
  }
  result.history = [...rows.values()]
    .sort((x, y) => y.at.localeCompare(x.at) || y.id.localeCompare(x.id))
    .slice(0, 5000)
    .map((h) => structuredClone(h));
  for (const id of [
    ...new Set([...Object.keys(am.mistakes), ...Object.keys(bm.mistakes)]),
  ].sort()) {
    const side = choose(
      am.mistakes[id],
      bm.mistakes[id],
      am.mistakes[id] ?? null,
      bm.mistakes[id] ?? null,
    );
    const event = structuredClone((side === "a" ? am : bm).mistakes[id]);
    if (!event) continue;
    meta.mistakes[id] = event;
    if (event.correct) continue;
    const question =
      event.question || a.mistakes[id]?.question || b.mistakes[id]?.question;
    if (!question) continue;
    const history = result.history.filter((h) => h.questionId === id);
    const lastRight = history.find((h) => h.correct);
    const wrong = history.filter(
      (h) =>
        !h.correct &&
        (!lastRight ||
          h.at > lastRight.at ||
          (h.at === lastRight.at && h.id > lastRight.id)),
    ).length;
    const fallback = (side === "a" ? a : b).mistakes[id]?.count || 1;
    result.mistakes[id] = {
      question: structuredClone(question),
      count: Math.max(1, wrong || fallback),
      lastAt: event.at,
    };
  }
  return result;
}
export function validateSyncState(value, validIds) {
  const state = validateBackup(value, validIds);
  const m = state.syncMeta;
  if (!m) return state;
  const object = (x) => x && typeof x === "object" && !Array.isArray(x);
  const validStamp = (x) =>
    object(x) &&
    typeof x.at === "string" &&
    Number.isFinite(Date.parse(x.at)) &&
    typeof x.opId === "string" &&
    x.opId.length <= 250;
  if (
    m.version !== 1 ||
    !object(m.learning) ||
    !object(m.settings) ||
    !object(m.mistakes) ||
    !validStamp(m.lastPoem)
  )
    throw new Error("同步元数据格式无效。");
  if (Object.keys(m.mistakes).length > 20000) throw new Error("同步记录过多。");
  for (const [id, s] of Object.entries(m.learning))
    if (!validIds.has(id) || !validStamp(s) || typeof s.deleted !== "boolean")
      throw new Error("篇目同步记录无效。");
  for (const field of ["newPerDay", "roundSize"])
    if (!validStamp(m.settings[field])) throw new Error("设置同步记录无效。");
  for (const [id, s] of Object.entries(m.mistakes))
    if (
      !validStamp(s) ||
      typeof s.correct !== "boolean" ||
      id.length > 200 ||
      (s.question &&
        (!validIds.has(s.question.poemId) ||
          s.question.id !== id ||
          typeof s.question.answer !== "string" ||
          typeof s.question.prompt !== "string"))
    )
      throw new Error("错句同步记录无效。");
  return state;
}
