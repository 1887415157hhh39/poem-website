const locations = {
  first: new URL("../data/annotations/shi-001-050.json", import.meta.url).href,
  second: new URL("../data/annotations/shi-051-100.json", import.meta.url).href,
  third: new URL("../data/annotations/shi-101-150.json", import.meta.url).href,
  modern: new URL("../data/annotations/shi-151-162.json", import.meta.url).href,
  ci: new URL("../data/annotations/ci-001-038.json", import.meta.url).href,
};
const referencesUrl = new URL(
  "../data/annotations/references.json",
  import.meta.url,
).href;
const cache = new Map();
function loadJson(url) {
  if (!cache.has(url)) {
    const request = fetch(url)
      .then((response) => {
        if (!response.ok) throw new Error("注释资料暂不可用。");
        return response.json();
      })
      .catch((error) => {
        cache.delete(url);
        throw error;
      });
    cache.set(url, request);
  }
  return cache.get(url);
}

export function parseStudyGuide(row, poem, references) {
  const fail = (message) => {
    throw new Error(`${poem.id}: ${message}`);
  };
  if (
    !Array.isArray(row) ||
    row[0] !== poem.id ||
    row.length < 4 ||
    row.length > 5
  )
    fail("注释篇目不匹配");
  const [, overview, notes, steps, caution] = row;
  if (typeof overview !== "string" || overview.length < 15)
    fail("缺少独立的篇目大意");
  if (
    !Array.isArray(notes) ||
    notes.length < 3 ||
    !Array.isArray(steps) ||
    steps.length < 2
  )
    fail("词句或背诵思路不完整");
  const text = [
    poem.title,
    poem.fullTitle,
    poem.preface || "",
    ...poem.lines,
  ].join("\n");
  function parsePair(pair, isStep) {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      pair.some((s) => typeof s !== "string" || !s.trim())
    )
      fail("注释格式错误");
    const [quote, explanation] = pair;
    if (!text.includes(quote)) fail(`原文没有引用词句：${quote}`);
    const line = poem.lines.findIndex((s) => s.includes(quote));
    if (isStep && line < 0) fail(`背诵思路没有正文锚点：${quote}`);
    return { quote, explanation, line };
  }
  const parsedSteps = steps.map((pair) => parsePair(pair, true));
  if (
    parsedSteps.some((step, i) => i > 0 && step.line < parsedSteps[i - 1].line)
  )
    fail("背诵路线顺序与原文不符");
  const sources = references[poem.id];
  if (!Array.isArray(sources) || !sources.length) fail("缺少篇目参考链接");
  for (const pair of sources) {
    if (
      !Array.isArray(pair) ||
      pair.length !== 2 ||
      !pair.every((s) => typeof s === "string" && s.trim())
    )
      fail("参考链接格式错误");
    if (new URL(pair[1]).protocol !== "https:") fail("参考链接须为HTTPS");
  }
  if (caution !== undefined && (typeof caution !== "string" || !caution.trim()))
    fail("版本说明为空");
  return {
    overview,
    notes: notes.map((pair) => parsePair(pair, false)),
    steps: parsedSteps,
    caution: caution || "",
    sources,
  };
}

export async function loadStudyGuide(poem) {
  const group =
    poem.category === "词"
      ? "ci"
      : poem.number <= 50
        ? "first"
        : poem.number <= 100
          ? "second"
          : poem.number <= 150
            ? "third"
            : "modern";
  const [chunk, references] = await Promise.all([
    loadJson(locations[group]),
    loadJson(referencesUrl),
  ]);
  const row = chunk.find((entry) => entry[0] === poem.id);
  return parseStudyGuide(row, poem, references);
}
