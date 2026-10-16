import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { parseStudyGuide } from "../src/lib/study-notes.mjs";
const read = (name) =>
  JSON.parse(fs.readFileSync(new URL(name, import.meta.url), "utf8"));
const poems = read("../src/data/poems.json");
const meta = read("../src/data/annotations/meta.json");
const references = read("../src/data/annotations/references.json");
const rows = [
  "shi-001-050",
  "shi-051-100",
  "shi-101-150",
  "shi-151-162",
  "ci-001-038",
].flatMap((name) => read(`../src/data/annotations/${name}.json`));
const guide = (id) =>
  parseStudyGuide(
    rows.find((r) => r[0] === id),
    poems.find((p) => p.id === id),
    references,
  );

test("200篇各有独立大意、词句、递进路线和参考链接，全部锚定指定原文", () => {
  assert.equal(rows.length, 200);
  assert.deepEqual(
    new Set(rows.map((r) => r[0])),
    new Set(poems.map((p) => p.id)),
  );
  assert.deepEqual(
    new Set(Object.keys(references)),
    new Set(poems.map((p) => p.id)),
  );
  assert.equal(
    meta.sourceHash,
    createHash("sha256").update(JSON.stringify(poems)).digest("hex"),
  );
  assert.equal(new Set(rows.map((r) => r[1])).size, 200);
  for (const poem of poems) {
    const data = guide(poem.id);
    assert.ok(data.notes.length >= 3);
    assert.ok(data.steps.length >= 2);
    if (poem.lines.length >= 10) {
      assert.ok(data.notes.length >= 5, poem.id);
      assert.ok(data.steps.length >= 3, poem.id);
      assert.ok(
        data.steps.at(-1).line >= poem.lines.length / 2,
        `${poem.id}不可只注长篇开头`,
      );
    }
  }
});

test("同名异篇、易误解词义、密集典故及材料差异有明确说明", () => {
  assert.match(guide("shi-28").overview, /女子/);
  assert.match(guide("shi-88").overview, /将领/);
  assert.match(guide("ci-1").overview, /杭州/);
  assert.match(guide("shi-56").caution, /王维/);
  assert.match(guide("shi-8").caution, /国殇/);
  assert.match(
    guide("shi-101").notes.find((n) => n.quote === "帝子").explanation,
    /尧/,
  );
  assert.match(
    guide("shi-107").notes.find((n) => n.quote === "绿蚁").explanation,
    /浮沫/,
  );
  assert.match(
    guide("shi-108").notes.find((n) => n.quote === "可怜").explanation,
    /可爱/,
  );
  assert.match(
    guide("ci-21").notes.find((n) => n.quote === "烟草").explanation,
    /不是烟叶/,
  );
  assert.match(
    guide("shi-154").notes.find((n) => n.quote === "旱海").explanation,
    /瀚海/,
  );
  for (const term of ["太史简", "董狐笔", "严将军头", "辽东帽", "击贼笏"])
    assert.ok(guide("shi-150").notes.some((n) => n.quote === term));
  assert.ok(guide("shi-110").steps.length >= 6);
  assert.match(
    guide("shi-162").notes.find((n) => n.quote === "从明天起").explanation,
    /距离/,
  );
});

test("错篇、虚构词句、倒序路线和不安全来源必须被拒绝", () => {
  const poem = poems[0],
    original = rows.find((r) => r[0] === poem.id);
  const changed = (edit) => {
    const row = structuredClone(original);
    edit(row);
    return row;
  };
  assert.throws(
    () =>
      parseStudyGuide(
        changed((r) => (r[0] = "wrong")),
        poem,
        references,
      ),
    /不匹配/,
  );
  assert.throws(
    () =>
      parseStudyGuide(
        changed((r) => (r[2][0][0] = "不存在的注释锚点")),
        poem,
        references,
      ),
    /没有引用/,
  );
  assert.throws(
    () =>
      parseStudyGuide(
        changed((r) => r[3].reverse()),
        poem,
        references,
      ),
    /顺序/,
  );
  assert.throws(
    () =>
      parseStudyGuide(original, poem, {
        [poem.id]: [["bad", "javascript:alert(1)"]],
      }),
    /HTTPS/,
  );
  assert.throws(() => parseStudyGuide(original, poem, {}), /缺少篇目参考/);
});
