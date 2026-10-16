import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { makeQuestions } from "../src/lib/study.mjs";
const poems = JSON.parse(
  readFileSync(new URL("../src/data/poems.json", import.meta.url)),
);
test("上下句和挖空训练都覆盖全部200篇，题目ID唯一", () => {
  for (const mode of ['next', 'cloze']) {
    const questions = makeQuestions(poems, mode);
    assert.equal(new Set(questions.map(q=>q.poemId)).size,200);
    assert.equal(new Set(questions.map(q=>q.id)).size,questions.length);
    assert.ok(questions.every(q=>q.answer.length>=2));
  }
});
test("指定篇目共200篇，类别和连续编号与目录一致", () => {
  assert.equal(poems.length, 200);
  assert.equal(new Set(poems.map((p) => p.id)).size, 200);
  for (const [category, count] of [
    ["诗", 162],
    ["词", 38],
  ]) {
    assert.deepEqual(
      poems.filter((p) => p.category === category).map((p) => p.number),
      Array.from({ length: count }, (_, i) => i + 1),
    );
  }
});
test("正文与来源页完整，无页码、下一篇标题或提取乱码污染", () => {
  for (const p of poems) {
    assert.ok(p.lines.length >= 1 && p.lines.join("").length >= 6, p.id);
    assert.ok(p.sourcePage >= 6 && p.sourcePage <= 49);
    assert.ok(
      !p.lines.some(
        (l) => /^\d+$/.test(l) || /^\d+\./.test(l) || /[ꧼ�]/.test(l),
      ),
      p.id,
    );
  }
  assert.equal(poems[0].lines.at(-1), "于嗟洵兮，不我信兮。");
  assert.equal(poems.at(-1).lines.at(-1), "世上无难事，只要肯登攀。");
  assert.ok(
    poems
      .find((p) => p.title === "望海潮")
      .lines.some((l) => l.includes("重湖叠巘清嘉")),
  );
});
test("长诗跨页连续，小序保留但不混入背诵正文", () => {
  assert.equal(
    poems
      .find((p) => p.number === 92 && p.category === "诗")
      .lines.join("")
      .replace(/[^\p{L}]/gu, "").length,
    500,
  );
  assert.ok(
    poems
      .find((p) => p.title === "张好好诗并序")
      .preface.includes("牧大和三年"),
  );
  assert.ok(
    poems
      .find((p) => p.title === "摸鱼儿·雁丘词")
      .lines[0].startsWith("问世间"),
  );
  assert.ok(poems.some((p) => p.form === "现代诗" && p.title === "相信未来"));
});
