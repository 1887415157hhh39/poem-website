import fs from "node:fs";
import { createHash } from "node:crypto";
import { parseStudyGuide } from "../src/lib/study-notes.mjs";
const read = (path) =>
  JSON.parse(fs.readFileSync(new URL(path, import.meta.url), "utf8"));
const poems = read("../src/data/poems.json");
const meta = read("../src/data/annotations/meta.json");
const refs = read("../src/data/annotations/references.json");
const files = [
  "shi-001-050",
  "shi-051-100",
  "shi-101-150",
  "shi-151-162",
  "ci-001-038",
];
const rows = files.flatMap((file) =>
  read(`../src/data/annotations/${file}.json`),
);
if (
  meta.works !== poems.length ||
  meta.sourceHash !==
    createHash("sha256").update(JSON.stringify(poems)).digest("hex")
)
  throw new Error("注释对应的原文已改变，请重新核对。");
const ids = new Set(rows.map((row) => row[0]));
if (
  rows.length !== poems.length ||
  ids.size !== poems.length ||
  Object.keys(refs).length !== poems.length
)
  throw new Error("200篇注释或参考链接存在遗漏／重复。");
let notes = 0,
  steps = 0;
const errors = [];
for (const poem of poems) {
  try {
    const guide = parseStudyGuide(
      rows.find((row) => row[0] === poem.id),
      poem,
      refs,
    );
    if (
      poem.lines.length >= 10 &&
      (guide.notes.length < 5 || guide.steps.length < 3)
    )
      throw new Error(`${poem.id}长篇注释不足。`);
    notes += guide.notes.length;
    steps += guide.steps.length;
  } catch (error) {
    errors.push(error.message);
  }
}
if (errors.length) throw new Error(errors.join("\n"));
console.log(
  JSON.stringify({
    works: poems.length,
    notes,
    steps,
    sourceHash: "matched",
    anchors: "all matched and ordered",
  }),
);
