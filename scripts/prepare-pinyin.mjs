import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { pinyin, addDict, polyphonic } from "pinyin-pro";
import CompleteDict from "@pinyin-pro/data/complete";
import { pinyinSource } from "../src/lib/pinyin.mjs";
const root = new URL("../", import.meta.url);
const read = (path) => JSON.parse(readFileSync(new URL(path, root), "utf8"));
const corpus = read("src/data/poems.json");
const overrides = read("src/data/pinyin-overrides.json");
// Expanded vocabulary is used only by this offline generator.
addDict(CompleteDict);
const han = /\p{Script=Han}/u;
const audit = [],
  applied = new Set();
const hitCounts = new Map();
function annotate(text, poemId, field, lineIndex) {
  const chars = [...text];
  const raw = pinyin(text, {
    type: "array",
    toneType: "symbol",
    toneSandhi: false,
    nonZh: "spaced",
  });
  if (raw.length !== chars.length)
    throw new Error(
      `${poemId}/${field}: initial annotation alignment mismatch`,
    );
  const out = chars.map((c, i) =>
    han.test(c)
      ? c === "一"
        ? "yī"
        : c === "不"
          ? "bù"
          : raw[i].normalize("NFC")
      : "",
  );
  const writes = new Map();
  for (const [n, fix] of overrides.fixes.entries()) {
    if (
      (fix.poemId !== "*" && fix.poemId !== poemId) ||
      (fix.field !== "all" && fix.field !== field)
    )
      continue;
    const phrase = [...fix.text],
      syllables = fix.reading.split(" ");
    if (phrase.length !== syllables.length)
      throw new Error(`Correction ${n} must have one syllable per character`);
    if (
      !fix.reason ||
      !fix.sources?.length ||
      fix.sources.some((s) => !overrides.sources[s]?.url)
    )
      throw new Error(`Correction ${n} missing provenance`);
    for (let start = 0; start <= chars.length - phrase.length; start++) {
      if (chars.slice(start, start + phrase.length).join("") !== fix.text)
        continue;
      for (let i = 0; i < phrase.length; i++) {
        const value = syllables[i] === "_" ? "" : syllables[i];
        if (writes.has(start + i) && writes.get(start + i) !== value)
          throw new Error(
            `Conflicting correction: ${poemId}/${text}/${fix.text}`,
          );
        writes.set(start + i, value);
        out[start + i] = value;
      }
      applied.add(n);
      hitCounts.set(n, (hitCounts.get(n) || 0) + 1);
    }
  }
  const choices = polyphonic(text, { type: "array" });
  audit.push({
    poemId,
    field,
    lineIndex,
    text,
    reading: out,
    polyphonic: chars.flatMap((c, i) =>
      han.test(c) && choices[i]?.length > 1
        ? [{ index: i, char: c, pinyin: out[i], choices: choices[i] }]
        : [],
    ),
    unresolved: chars.flatMap((c, i) =>
      han.test(c) && (!out[i] || han.test(out[i]))
        ? [{ index: i, char: c }]
        : [],
    ),
  });
  return out;
}
const data = {
  version: 1,
  sourceHash: createHash("sha256")
    .update(JSON.stringify(pinyinSource(corpus)))
    .digest("hex"),
  generator:
    "pinyin-pro 3.29.5 + @pinyin-pro/data complete; toneSandhi=false; contextual corrections",
  review: {
    notes: overrides.notes,
    sources: Object.fromEntries(
      [
        ...new Set(
          Object.values(overrides.notes).flatMap((ns) =>
            ns.flatMap((n) => n.sources),
          ),
        ),
      ].map((id) => [id, overrides.sources[id]]),
    ),
  },
  poems: {},
};
for (const p of pinyinSource(corpus))
  data.poems[p.id] = {
    title: annotate(p.title, p.id, "title"),
    credit: annotate(p.credit, p.id, "credit"),
    preface: annotate(p.preface, p.id, "preface"),
    lines: p.lines.map((l, i) => annotate(l, p.id, "lines", i)),
  };
const unmatched = overrides.fixes.flatMap((f, i) =>
  applied.has(i) ? [] : [`${i}:${f.poemId}/${f.text}`],
);
if (unmatched.length)
  throw new Error(
    "Corrections no longer match original text: " + unmatched.join(", "),
  );
const missing = audit.filter((a) => a.unresolved.length);
if (missing.length)
  throw new Error("Unannotated Han characters: " + JSON.stringify(missing));
const output = JSON.stringify(data) + "\n";
if (process.argv.includes("--check")) {
  if (readFileSync(new URL("src/data/pinyin.json", root), "utf8") !== output)
    throw new Error(
      "Committed pinyin data differs; run npm run prepare:pinyin",
    );
  console.log("Static pinyin data is reproducible and aligned.");
} else writeFileSync(new URL("src/data/pinyin.json", root), output);
mkdirSync(new URL("tmp/pinyin-audit/", root), { recursive: true });
writeFileSync(
  new URL("tmp/pinyin-audit/initial.json", root),
  JSON.stringify(audit, null, 2),
);
writeFileSync(
  new URL("tmp/pinyin-audit/reading.txt", root),
  audit
    .filter((a) => a.text)
    .map(
      (a) =>
        `${a.poemId} ${a.field}${a.lineIndex ?? ""} ${a.text}\n${a.reading.join(" ")}`,
    )
    .join("\n"),
);
console.log(
  JSON.stringify({
    works: corpus.length,
    lines: corpus.reduce((s, p) => s + p.lines.length, 0),
    corrections: applied.size,
    correctedOccurrences: [...hitCounts.values()].reduce((a, b) => a + b, 0),
    bytes: Buffer.byteLength(output),
    audit: fileURLToPath(new URL("tmp/pinyin-audit/reading.txt", root)),
  }),
);
