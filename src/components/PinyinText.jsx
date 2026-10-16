import { createPinyinTokens } from "../lib/pinyin.mjs";
export function PinyinText({
  text,
  readings,
  mode = "full",
  revealed = false,
  groupClauses = false,
}) {
  const tokens = createPinyinTokens(text, readings, mode, revealed);
  const groups = [[]];
  tokens.forEach((token, i) => {
    groups[groups.length - 1].push(token);
    if (
      groupClauses &&
      /[，。！？；：]/.test(token.char) &&
      i < tokens.length - 1
    )
      groups.push([]);
  });
  return (
    <span className="pinyin-text">
      {groups.map((group, index) => (
        <span className={groupClauses ? "verse-clause" : undefined} key={index}>
          {group.map(({ char, pinyin }, i) =>
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
      ))}
    </span>
  );
}
