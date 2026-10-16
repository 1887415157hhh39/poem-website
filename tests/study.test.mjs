import { test } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeAnswer,
  gradeAnswer,
  makeQuestions,
  emptyState,
  recordAttempt,
  scheduleReview,
  validateBackup,
  selectDaily,
  maskLine,
} from "../src/lib/study.mjs";
const p = {
  id: "shi-1",
  title: "击鼓",
  author: "未署名",
  category: "诗",
  lines: ["死生契阔，与子成说。", "执子之手，与子偕老。"],
  preface: "",
};
test("忽略空白标点，但不会忽略错别字或空答案", () => {
  assert.equal(normalizeAnswer(" 执子之手，\n与子偕老！"), "执子之手与子偕老");
  assert.equal(gradeAnswer("与子偕老。", "与子偕老"), true);
  assert.equal(gradeAnswer("与子谐老", "与子偕老"), false);
  assert.equal(gradeAnswer("", ""), false);
});
test("上下句答案来自原文相邻分句，现代诗按分行出题，匿名不生成作者题", () => {
  const qs = makeQuestions([p], "next");
  assert.ok(
    qs.some((q) => q.prompt === "执子之手，" && q.answer === "与子偕老"),
  );
  assert.equal(makeQuestions([p], "author").length, 0);
  assert.ok(
    makeQuestions(
      [
        {
          ...p,
          form: "现代诗",
          lines: ["我是天空里的一片云，", "偶然投影在你的波心——"],
        },
      ],
      "next",
    ).some((q) => q.answer.includes("偶然")),
  );
  assert.ok(makeQuestions([p], "cloze").every((q) => q.answer.length >= 2));
});
test("自评按1/3/7/14天递增；不熟悉重置；不修改原对象", () => {
  const initial = emptyState();
  const a = scheduleReview(initial, p.id, "good", "2026-10-16");
  assert.equal(a.learning[p.id].due, "2026-10-17");
  const b = scheduleReview(a, p.id, "good", "2026-10-17");
  assert.equal(b.learning[p.id].due, "2026-10-20");
  assert.equal(
    scheduleReview(b, p.id, "again", "2026-10-18").learning[p.id].due,
    "2026-10-19",
  );
  assert.deepEqual(initial.learning, {});
});
test("提示、超时和错误进入错句；同一答题ID不重复计分；独立答对移除错句", () => {
  const q = makeQuestions([p], "next")[0];
  let s = recordAttempt(emptyState(), q, {
    id: "a",
    answer: q.answer,
    elapsed: 4000,
    hinted: true,
    at: "2026-10-16T01:00:00Z",
  });
  assert.equal(s.history[0].correct, false);
  assert.equal(s.mistakes[q.id].count, 1);
  assert.equal(
    recordAttempt(s, q, { id: "a", answer: "错", elapsed: 1000 }).history
      .length,
    1,
  );
  s = recordAttempt(s, q, {
    id: "b",
    answer: q.answer,
    elapsed: 2000,
    at: "2026-10-16T02:00:00Z",
  });
  assert.equal(s.history[0].correct, true);
  assert.equal(s.mistakes[q.id], undefined);
  s = recordAttempt(s, q, {
    id: "c",
    answer: q.answer,
    elapsed: 11000,
    timedOut: true,
  });
  assert.equal(s.history[0].correct, false);
});
test("备份类型、ID与范围必须验证；损坏数据不能导入", () => {
  assert.ok(
    validateBackup(
      { ...emptyState(), exportedAt: "2026-10-16" },
      new Set([p.id]),
    ),
  );
  assert.throws(() =>
    validateBackup(
      { version: 1, learning: [], history: [], mistakes: {} },
      new Set([p.id]),
    ),
  );
  assert.throws(() =>
    validateBackup(
      { ...emptyState(), learning: { evil: { stage: 1, due: "2026-10-17" } } },
      new Set([p.id]),
    ),
  );
  assert.throws(() =>
    validateBackup(
      { ...emptyState(), settings: { newPerDay: -999 } },
      new Set([p.id]),
    ),
  );
});
test("新用户计划不伪造已学习数；到期优先；首字提示保留标点", () => {
  assert.equal(selectDaily(emptyState(), [p], "2026-10-16").newPoems.length, 1);
  const s = scheduleReview(emptyState(), p.id, "good", "2026-10-15");
  assert.equal(selectDaily(s, [p], "2026-10-16").due.length, 1);
  assert.equal(maskLine("执子之手，与子偕老。", "first"), "执□□□，与□□□。");
});
test("同一天重复标记不推进复习阶段，也不重复消耗新学名额", () => {
  const a = scheduleReview(emptyState(), p.id, "good", "2026-10-16");
  const b = scheduleReview(a, p.id, "good", "2026-10-16");
  assert.equal(b.learning[p.id].stage, 0);
  assert.equal(b.learning[p.id].reviews, 1);
  assert.equal(selectDaily(b, [p], "2026-10-16").newPoems.length, 0);
});
