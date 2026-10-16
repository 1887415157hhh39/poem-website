import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createHash } from "node:crypto";
import {
  createPinyinTokens,
  pinyinSource,
  poemCredit,
} from "../src/lib/pinyin.mjs";
const poems = JSON.parse(
  readFileSync(new URL("../src/data/poems.json", import.meta.url), "utf8"),
);
const data = JSON.parse(
  readFileSync(new URL("../src/data/pinyin.json", import.meta.url), "utf8"),
);
test("200篇题名、作者、小序和1460行正文完整逐字注音，原文哈希一致", () => {
  assert.equal(Object.keys(data.poems).length, 200);
  assert.equal(
    data.sourceHash,
    createHash("sha256")
      .update(JSON.stringify(pinyinSource(poems)))
      .digest("hex"),
  );
  let lines = 0;
  for (const p of poems) {
    const a = data.poems[p.id];
    assert.ok(a, p.id);
    const pairs = [
      [p.title, a.title],
      [poemCredit(p), a.credit],
      [p.preface || "", a.preface],
      ...p.lines.map((line, i) => [line, a.lines[i]]),
    ];
    assert.equal(a.lines.length, p.lines.length);
    lines += a.lines.length;
    for (const [text, readings] of pairs) {
      assert.equal(readings.length, [...text].length, `${p.id}: ${text}`);
      [...text].forEach((char, i) => {
        if (/\p{Script=Han}/u.test(char))
          assert.match(
            readings[i],
            /^[a-züāáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜńňǹḿêếề]+$/u,
            `${p.id}: ${char}=${readings[i]}`,
          );
        else assert.equal(readings[i], "");
      });
    }
  }
  assert.equal(lines, 1460);
});
test("古诗语境和专名读音不能由常见词误判", () => {
  function reading(id, phrase) {
    const p = poems.find((p) => p.id === id),
      index = p.lines.findIndex((l) => l.includes(phrase));
    assert.ok(index >= 0, phrase);
    const offset = [...p.lines[index].slice(0, p.lines[index].indexOf(phrase))]
      .length;
    return data.poems[id].lines[index]
      .slice(offset, offset + [...phrase].length)
      .join(" ");
  }
  assert.equal(reading("shi-1", "与子成说"), "yǔ zǐ chéng shuō");
  assert.equal(reading("shi-3", "淇奥"), "qí yù");
  assert.equal(reading("shi-15", "上邪"), "shàng yé");
  assert.equal(reading("shi-85", "将进酒"), "qiāng jìn jiǔ");
  assert.equal(reading("shi-85", "呼儿将出"), "hū ér jiāng chū");
  assert.equal(reading("shi-25", "青青子衿"), "qīng qīng zǐ jīn");
  assert.equal(reading("shi-3", "咺"), "xuān");
  assert.equal(reading("shi-6", "莎鸡"), "shā jī");
  assert.equal(reading("shi-6", "于貉"), "yú mà");
  assert.equal(reading("shi-6", "亨葵"), "pēng kuí");
  assert.equal(reading("shi-8", "山之阿"), "shān zhī ē");
  assert.equal(reading("shi-18", "遗我"), "wèi wǒ");
  assert.equal(reading("shi-40", "燕丹"), "yān dān");
  assert.equal(reading("shi-91", "夫如何"), "fú rú hé");
  assert.equal(reading("shi-110", "纤纤"), "xiān xiān");
  assert.equal(reading("ci-9", "重湖叠巘"), "chóng hú dié yǎn");
  assert.equal(reading("ci-16", "徐行"), "xú xíng");
  assert.equal(reading("ci-29", "亡赖"), "wú lài");
  assert.equal(reading("ci-30", "的卢"), "dí lú");
  assert.equal(reading("ci-36", "数风流"), "shǔ fēng liú");
  assert.equal(reading("ci-37", "如斯夫"), "rú sī fú");
  assert.equal(data.poems["shi-141"].credit.join(" "), "zēng jī");
  assert.equal(data.poems["ci-12"].title.join(" "), "tà suō xíng");
});
test("遮字和首字提示绝不显示隐藏字的拼音，揭晓后才显示", () => {
  const text = "重湖叠巘清嘉。",
    readings = ["chóng", "hú", "dié", "yǎn", "qīng", "jiā", ""];
  const full = createPinyinTokens(text, readings, "full");
  assert.equal(full.map((t) => t.char).join(""), text);
  assert.equal(full[0].pinyin, "chóng");
  const masked = createPinyinTokens(text, readings, "mask");
  assert.equal(masked[1].char, "□");
  assert.equal(masked[1].pinyin, "");
  const first = createPinyinTokens(text, readings, "first");
  assert.equal(first[0].pinyin, "chóng");
  assert.ok(first.slice(1, -1).every((t) => t.char === "□" && t.pinyin === ""));
  assert.equal(
    createPinyinTokens(text, readings, "mask", true)[1].pinyin,
    "hú",
  );
  assert.throws(() => createPinyinTokens(text, [], "full"), /对齐/);
});
