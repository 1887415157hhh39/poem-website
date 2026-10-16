import { maskLine } from "./study.mjs";
export const PINYIN_KEY = "wengu-pinyin-visible-v1";
export function poemCredit(poem) {
  const author =
    poem.author === "诗经"
      ? `《${poem.fullTitle.split("·").slice(0, -1).join("·")}》`
      : poem.author;
  return author + (poem.subtitle ? ` · ${poem.subtitle}` : "");
}
export function pinyinSource(poems) {
  return poems.map((p) => ({
    id: p.id,
    title: p.title,
    credit: poemCredit(p),
    preface: p.preface || "",
    lines: p.lines,
  }));
}
export function createPinyinTokens(
  text,
  readings,
  mode = "full",
  revealed = false,
) {
  const chars = [...text];
  if (!Array.isArray(readings) || readings.length !== chars.length)
    throw new Error("拼音与原文没有逐字对齐。");
  const visible = [
    ...(revealed || mode === "full" ? text : maskLine(text, mode)),
  ];
  return chars.map((original, i) => ({
    char: visible[i],
    pinyin: visible[i] === original ? readings[i] : "",
  }));
}
