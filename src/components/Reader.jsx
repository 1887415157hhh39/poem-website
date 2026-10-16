import { useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  ArrowSquareOut,
  Check,
  Eye,
  ArrowsClockwise,
  Clock,
} from "@phosphor-icons/react";
import { maskLine } from "../lib/study.mjs";

export const sourceLink = (p) =>
  `${import.meta.env.BASE_URL}curriculum.pdf#page=${p.sourcePage}`;
export function SourceLink({ poem }) {
  return (
    <a
      className="source-link"
      href={sourceLink(poem)}
      target="_blank"
      rel="noreferrer"
    >
      原文第{poem.printedPage}页 <ArrowSquareOut size={16} />
    </a>
  );
}
export function MaskControl({ mode, setMode }) {
  return (
    <div className="segmented" aria-label="背诵提示方式">
      {[
        ["full", "全文"],
        ["mask", "遮字"],
        ["first", "首字提示"],
      ].map(([id, name]) => (
        <button key={id} aria-pressed={mode === id} onClick={() => setMode(id)}>
          {name}
        </button>
      ))}
    </div>
  );
}
export function PoemPreview({ poem, onRead, onTrain }) {
  const [mode, setMode] = useState("mask");
  const [show, setShow] = useState(false);
  const index = Math.max(
    0,
    poem.lines.findIndex((l) => l.includes("执子之手")),
  );
  const line = poem.lines[index];
  return (
    <section className="poem-preview">
      <div className="eyebrow">
        <span />
        继续背诵
      </div>
      <header className="poem-preview-header">
        <div>
          <h2>
            <button
              className="poem-title-link"
              aria-label={`阅读全文：${poem.title}`}
              onClick={onRead}
            >
              {poem.title}
            </button>
          </h2>
          <p>
            {poem.fullTitle.startsWith("诗经")
              ? `《${poem.fullTitle.split("·").slice(0, -1).join("·")}》`
              : poem.author}
          </p>
        </div>
        <SourceLink poem={poem} />
      </header>
      <div className="poem-excerpt">
        <span className="excerpt-label">节选练习</span>
        <p>{poem.lines[Math.max(0, index - 1)]}</p>
        <p>
          {show
            ? line
            : mode === "mask"
              ? line.replace(/(?<=，)[^。！？]+/, "＿＿＿＿")
              : maskLine(line, mode)}
        </p>
      </div>
      <MaskControl
        mode={mode}
        setMode={(m) => {
          setMode(m);
          setShow(false);
        }}
      />
      <button
        className="text-button reveal-line"
        onClick={() => setShow(!show)}
      >
        {show ? "重新遮住" : "显示这一句"} <Eye size={16} />
      </button>
      <div className="preview-bottom">
        <button className="text-button" onClick={onTrain}>
          <Clock className="accent-icon" size={28} weight="light" />
          背熟了，进入10秒抢答 <ArrowRight size={21} />
        </button>
      </div>
    </section>
  );
}
export function Reader({ poem, learning, onRate, onBack, onTrain, onNext }) {
  const [mode, setMode] = useState("full");
  const [revealed, setRevealed] = useState(new Set());
  const [rated, setRated] = useState(false);
  return (
    <div className="reader-page">
      <button className="text-button back" onClick={onBack}>
        <ArrowLeft size={18} /> 全部篇目
      </button>
      <div className="page-heading reader-heading">
        <div>
          <div className="eyebrow">
            {poem.category} · 第{poem.number}篇{" "}
            {poem.form === "现代诗" && "· 现代诗"}
          </div>
          <h1>{poem.title}</h1>
          <p>
            {poem.author === "诗经"
              ? `《${poem.fullTitle.split("·").slice(0, -1).join("·")}》`
              : poem.author}
            {poem.subtitle && ` · ${poem.subtitle}`}
          </p>
        </div>
        <SourceLink poem={poem} />
      </div>
      <div className="reader-toolbar">
        <MaskControl
          mode={mode}
          setMode={(m) => {
            setMode(m);
            setRevealed(new Set());
          }}
        />
        <span>遮字时，点按诗句可临时查看</span>
      </div>
      {poem.preface && (
        <details className="preface">
          <summary>小序 · 不纳入随机练习</summary>
          <p>{poem.preface}</p>
        </details>
      )}
      <article
        className={`poem-lines ${poem.form === "现代诗" ? "modern" : ""}`}
        aria-label={`${poem.title}原文`}
      >
        {poem.lines.map((line, i) =>
          mode === "full" ? (
            <p key={i}>{line}</p>
          ) : (
            <button
              className="masked-line"
              key={i}
              aria-label={`第${i + 1}行，点按${revealed.has(i) ? "遮住" : "揭晓"}`}
              onClick={() =>
                setRevealed((old) => {
                  const n = new Set(old);
                  n.has(i) ? n.delete(i) : n.add(i);
                  return n;
                })
              }
            >
              {revealed.has(i) ? line : maskLine(line, mode)}
            </button>
          ),
        )}
      </article>
      <section className="reader-rating">
        <div>
          <h2>{rated ? "这篇已记入今日复习" : "遮住原文，试着完整背一遍"}</h2>
          <p>
            {rated
              ? `下次复习：${learning?.due || "明天"}。`
              : "如实标记掌握程度，让下次复习更有针对性。"}
          </p>
        </div>
        <div className="button-row">
          <button
            className="button secondary"
            disabled={rated}
            onClick={() => {
              onRate(poem.id, "again");
              setRated(true);
            }}
          >
            <ArrowsClockwise size={18} />
            还不熟
          </button>
          <button
            className="button"
            disabled={rated}
            onClick={() => {
              onRate(poem.id, "good");
              setRated(true);
            }}
          >
            <Check size={18} />
            能背出了
          </button>
        </div>
      </section>
      <div className="reader-footer">
        <button className="text-button" onClick={onNext}>
          继续下一篇 <ArrowRight size={18} />
        </button>
        <button className="text-button" onClick={onTrain}>
          用这篇练抢答 <ArrowRight size={18} />
        </button>
      </div>
    </div>
  );
}
