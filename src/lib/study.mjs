export const STATE_KEY = "wengu-study-v1";
export const todayKey = (date = new Date()) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
export function normalizeAnswer(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .replace(/[\p{P}\p{Z}\p{S}\s]/gu, "");
}
export function gradeAnswer(answer, expected) {
  return (
    !!normalizeAnswer(expected) &&
    normalizeAnswer(answer) === normalizeAnswer(expected)
  );
}
export function emptyState() {
  return {
    version: 1,
    learning: {},
    mistakes: {},
    history: [],
    settings: { newPerDay: 10, roundSize: 10 },
    lastPoem: "shi-1",
  };
}
export function maskLine(line, mode) {
  if (mode === "full") return line;
  let index = 0,
    begin = true;
  return [...line]
    .map((c) => {
      if (!/[\p{L}\p{N}]/u.test(c)) {
        if (/[，。！？；、：]/.test(c)) begin = true;
        return c;
      }
      const keep = mode === "first" ? begin : index++ % 3 === 0;
      begin = false;
      return keep ? c : "□";
    })
    .join("");
}
export function makeQuestions(poems, mode = "next") {
  const out = [];
  for (const p of poems) {
    if (mode === "author") {
      if (!["未署名", "无名氏", "诗经", "敦煌曲子词"].includes(p.author))
        out.push({
          id: `${p.id}-author`,
          poemId: p.id,
          mode,
          prompt: `《${p.fullTitle || p.title}》的作者是？`,
          answer: p.author,
          label: "写出作者",
        });
      continue;
    }
    if (mode === "title") {
      out.push({
        id: `${p.id}-title`,
        poemId: p.id,
        mode,
        prompt: p.lines[0],
        answer: p.title,
        label: "写出篇名（不含书名号）",
      });
      continue;
    }
    if (mode === "cloze") {
      p.lines.forEach((line, i) => {
        const runs = [...line.matchAll(/[\p{L}\p{N}]{2,}/gu)];
        const run = runs.at(-1);
        if (!run) return;
        const length = Math.min(
          run[0].length,
          Math.max(2, Math.ceil(run[0].length / 2)),
        );
        const start = run.index + run[0].length - length;
        out.push({
          id: `${p.id}-cloze-${i}`,
          poemId: p.id,
          mode,
          prompt:
            line.slice(0, start) +
            "＿".repeat(length) +
            line.slice(start + length),
          answer: line.slice(start, start + length),
          label: "补全空缺的字",
        });
      });
      continue;
    }
    if (p.form === "现代诗") {
      for (let i = 0; i < p.lines.length - 1; i++) {
        if (normalizeAnswer(p.lines[i + 1]))
          out.push({
            id: `${p.id}-next-${i}`,
            poemId: p.id,
            mode,
            prompt: p.lines[i],
            answer: p.lines[i + 1],
            label: "接出下一行",
          });
      }
    } else {
      // Pair clauses within printed verse lines; do not cross poem/section boundaries.
      p.lines.forEach((line, i) => {
        const parts = [
          ...line.matchAll(/([^，。！？；：]+)[，。！？；：]?/g),
        ].filter((m) => normalizeAnswer(m[1]).length >= 2);
        for (let j = 0; j < parts.length - 1; j++)
          out.push({
            id: `${p.id}-next-${i}-${j}`,
            poemId: p.id,
            mode,
            prompt: parts[j][0],
            answer: parts[j + 1][1],
            label: "根据上句，补全下句",
          });
        if (
          parts.length === 1 &&
          /[。！？]$/.test(line) &&
          p.lines[i + 1] &&
          normalizeAnswer(p.lines[i + 1]).length >= 2
        )
          out.push({
            id: `${p.id}-next-line-${i}`,
            poemId: p.id,
            mode,
            prompt: line,
            answer: p.lines[i + 1],
            label: "接出下一句",
          });
      });
    }
  }
  return out;
}
export function shuffle(items, random = Math.random) {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
export function scheduleReview(state, id, rating, date = todayKey()) {
  const old = state.learning[id];
  const sameDay = old?.lastReviewed === date;
  const stage =
    rating === "again"
      ? 0
      : sameDay
        ? old.stage
        : Math.min((old?.stage ?? -1) + 1, 3);
  const days = rating === "again" ? 1 : [1, 3, 7, 14][stage];
  const due = new Date(`${date}T12:00:00+08:00`);
  due.setUTCDate(due.getUTCDate() + days);
  return {
    ...state,
    lastPoem: id,
    learning: {
      ...state.learning,
      [id]: {
        stage,
        due: todayKey(due),
        lastReviewed: date,
        reviews: sameDay ? old.reviews : (old?.reviews || 0) + 1,
      },
    },
  };
}
export function recordAttempt(state, q, attempt) {
  if (state.history.some((h) => h.id === attempt.id)) return state;
  const correct =
    !attempt.hinted &&
    !attempt.timedOut &&
    !attempt.skipped &&
    (attempt.selfCorrect === undefined
      ? gradeAnswer(attempt.answer, q.answer)
      : attempt.selfCorrect === true);
  const row = {
    id: attempt.id,
    questionId: q.id,
    poemId: q.poemId,
    correct,
    elapsed: Math.min(Math.max(Number(attempt.elapsed) || 0, 0), 3600000),
    at: attempt.at || new Date().toISOString(),
    mode: q.mode,
    selfRated: attempt.selfCorrect !== undefined,
    hinted: !!attempt.hinted,
    timedOut: !!attempt.timedOut,
  };
  const mistakes = { ...state.mistakes };
  if (correct) delete mistakes[q.id];
  else
    mistakes[q.id] = {
      question: q,
      count: (mistakes[q.id]?.count || 0) + 1,
      lastAt: row.at,
    };
  return {
    ...state,
    history: [row, ...state.history].slice(0, 5000),
    mistakes,
  };
}
export function selectDaily(state, poems, date = todayKey()) {
  const due = poems
    .filter((p) => state.learning[p.id]?.due <= date)
    .sort((a, b) =>
      state.learning[a.id].due.localeCompare(state.learning[b.id].due),
    );
  const studiedToday = poems.filter(
    (p) => state.learning[p.id]?.lastReviewed === date,
  );
  const newToday = studiedToday.filter(
    (p) => state.learning[p.id].reviews === 1,
  ).length;
  const newPoems = poems
    .filter((p) => !state.learning[p.id])
    .slice(0, Math.max(0, state.settings.newPerDay - newToday));
  return { due, newPoems, studiedToday };
}
const plain = (x) =>
  x !== null &&
  typeof x === "object" &&
  !Array.isArray(x) &&
  Object.getPrototypeOf(x) === Object.prototype;
export function validateBackup(data, validIds) {
  if (
    !plain(data) ||
    data.version !== 1 ||
    !plain(data.learning) ||
    !plain(data.mistakes) ||
    !Array.isArray(data.history) ||
    !plain(data.settings)
  )
    throw new Error("备份格式不正确，请选择温故导出的JSON文件。");
  if (data.history.length > 5000 || Object.keys(data.mistakes).length > 20000)
    throw new Error("备份记录过多。");
  if (
    !Number.isInteger(data.settings.newPerDay) ||
    data.settings.newPerDay < 1 ||
    data.settings.newPerDay > 30 ||
    !Number.isInteger(data.settings.roundSize) ||
    data.settings.roundSize < 1 ||
    data.settings.roundSize > 50
  )
    throw new Error("备份中的学习目标无效。");
  const isDate = (s) =>
    typeof s === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(s) &&
    !isNaN(Date.parse(s));
  for (const [id, l] of Object.entries(data.learning))
    if (
      !validIds.has(id) ||
      !plain(l) ||
      !Number.isInteger(l.stage) ||
      l.stage < 0 ||
      l.stage > 3 ||
      !isDate(l.due) ||
      !isDate(l.lastReviewed) ||
      !Number.isInteger(l.reviews) ||
      l.reviews < 1
    )
      throw new Error("备份中有无效的篇目进度。");
  for (const [id, m] of Object.entries(data.mistakes))
    if (
      !plain(m) ||
      !plain(m.question) ||
      id !== m.question.id ||
      !validIds.has(m.question.poemId) ||
      typeof m.question.prompt !== "string" ||
      typeof m.question.answer !== "string" ||
      !Number.isInteger(m.count) ||
      m.count < 1 ||
      typeof m.lastAt !== "string"
    )
      throw new Error("备份中的错句记录无效。");
  for (const h of data.history)
    if (
      !plain(h) ||
      typeof h.id !== "string" ||
      !validIds.has(h.poemId) ||
      typeof h.correct !== "boolean" ||
      !Number.isFinite(h.elapsed) ||
      h.elapsed < 0 ||
      h.elapsed > 3600000 ||
      typeof h.at !== "string" ||
      isNaN(Date.parse(h.at))
    )
      throw new Error("备份中的答题记录无效。");
  return {
    ...emptyState(),
    ...data,
    lastPoem: validIds.has(data.lastPoem) ? data.lastPoem : "shi-1",
    settings: {
      newPerDay: data.settings.newPerDay,
      roundSize: data.settings.roundSize,
    },
  };
}
