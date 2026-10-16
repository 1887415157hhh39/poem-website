import { createPinyinTokens } from "../lib/pinyin.mjs";
export function PinyinText({
  text,
  readings,
  mode = "full",
  revealed = false,
}) {
  return (
    <span className="pinyin-text">
      {createPinyinTokens(text, readings, mode, revealed).map(
        ({ char, pinyin }, i) =>
          pinyin ? (
            <ruby key={i}>
              {char}
              <rp aria-hidden="true">(</rp>
              <rt aria-hidden="true">{pinyin}</rt>
              <rp aria-hidden="true">)</rp>
            </ruby>
          ) : (
            <span className="unannotated" key={i}>
              {char}
            </span>
          ),
      )}
    </span>
  );
}
