import { useState } from "react";
import { MagnifyingGlass, ArrowRight, BookOpen } from "@phosphor-icons/react";
import { todayKey } from "../lib/study.mjs";
export function Library({ poems, state, onRead }) {
  const [query, setQuery] = useState(""),
    [category, setCategory] = useState("全部"),
    [status, setStatus] = useState("all"),
    [limit, setLimit] = useState(30);
  const filtered = poems.filter(
    (p) =>
      (category === "全部" || p.category === category || p.form === category) &&
      `${p.title}${p.fullTitle}${p.author}${p.subtitle}${p.lines.join("")}`.includes(
        query.trim(),
      ) &&
      (status === "all" ||
        (status === "new" && !state.learning[p.id]) ||
        (status === "due" && state.learning[p.id]?.due <= todayKey()) ||
        (status === "learned" && !!state.learning[p.id])),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">指定篇目 · 共200篇</div>
          <h1>把诗词，读进心里。</h1>
          <p>162篇诗，38篇词。以学校提供的PDF为准。</p>
        </div>
        <BookOpen size={40} weight="thin" />
      </div>
      <div className="library-filters">
        <label className="search-box">
          <MagnifyingGlass size={20} />
          <input
            aria-label="搜索篇名、作者或诗句"
            placeholder="搜索篇名、作者，或记得的一句…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setLimit(30);
            }}
          />
        </label>
        <label className="select-field">
          <span className="sr-only">掌握情况</span>
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="all">全部进度</option>
            <option value="new">尚未学习</option>
            <option value="learned">已学习</option>
            <option value="due">到期复习</option>
          </select>
        </label>
      </div>
      <div className="filter-tabs" aria-label="篇目分类">
        {["全部", "诗", "词", "现代诗"].map((c) => (
          <button
            aria-pressed={category === c}
            onClick={() => {
              setCategory(c);
              setLimit(30);
            }}
            key={c}
          >
            {c}
          </button>
        ))}
        <span>{filtered.length}篇</span>
      </div>
      <div className="poem-list">
        {filtered.slice(0, limit).map((p) => (
          <button className="poem-row" key={p.id} onClick={() => onRead(p.id)}>
            <span className="row-number">
              {p.category}
              {String(p.number).padStart(3, "0")}
            </span>
            <span className="row-title">
              <strong>{p.title}</strong>
              <span>
                {p.author} {p.subtitle}
              </span>
            </span>
            <span className="row-excerpt">{p.lines[0]}</span>
            <span
              className={`learning-status ${state.learning[p.id] ? "learned" : ""}`}
            >
              {state.learning[p.id]
                ? state.learning[p.id].due <= todayKey()
                  ? "待复习"
                  : "已学习"
                : "未学习"}
            </span>
            <ArrowRight size={19} />
          </button>
        ))}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <MagnifyingGlass size={38} weight="thin" />
          <h2>没有找到这篇诗词</h2>
          <p>试试作者名或另一段诗句。</p>
        </div>
      )}
      {filtered.length > limit && (
        <button
          className="button secondary load-more"
          onClick={() => setLimit(limit + 40)}
        >
          再显示40篇
        </button>
      )}
    </>
  );
}
