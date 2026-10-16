import { useLayoutEffect, useRef } from "react";
import {
  MagnifyingGlass,
  ArrowRight,
  BookOpen,
  X,
  ArrowCounterClockwise,
} from "@phosphor-icons/react";
import { todayKey } from "../lib/study.mjs";
function Highlight({ text, query }) {
  if (!query || !text.includes(query)) return text;
  const parts = text.split(query);
  return parts.map((part, i) => (
    <span key={i}>
      {i > 0 && <mark>{query}</mark>}
      {part}
    </span>
  ));
}
export function Library({ poems, state, onRead, view, setView }) {
  const { query, category, status, limit } = view;
  const searchRef = useRef(null);
  const listRef = useRef(null);
  const term = query.trim();
  const hasFilters = !!term || category !== "全部" || status !== "all";
  function update(patch) {
    setView((v) => ({ ...v, ...patch, limit: 30, scrollY: 0, focusId: null }));
  }
  function reset() {
    update({ query: "", category: "全部", status: "all" });
    searchRef.current?.focus();
  }
  useLayoutEffect(() => {
    if (!view.focusId) return;
    const frame = requestAnimationFrame(() => {
      listRef.current
        ?.querySelector(`[data-poem-id="${view.focusId}"]`)
        ?.focus({ preventScroll: true });
      window.scrollTo(0, view.scrollY);
    });
    return () => cancelAnimationFrame(frame);
  }, []);
  const filtered = poems.filter(
    (p) =>
      (category === "全部" || p.category === category || p.form === category) &&
      `${p.title}${p.fullTitle}${p.author}${p.subtitle}${p.lines.join("")}`.includes(
        term,
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
        <div className="search-box">
          <MagnifyingGlass size={20} />
          <input
            ref={searchRef}
            type="search"
            aria-label="搜索篇名、作者或诗句"
            placeholder="搜索篇名、作者，或记得的一句…"
            value={query}
            onChange={(e) => {
              update({ query: e.target.value });
            }}
          />
          {query && (
            <button
              className="clear-search icon-button"
              aria-label="清空搜索"
              onClick={() => {
                update({ query: "" });
                searchRef.current?.focus();
              }}
            >
              <X size={17} />
            </button>
          )}
        </div>
        <label className="select-field">
          <span className="sr-only">掌握情况</span>
          <select
            value={status}
            onChange={(e) => update({ status: e.target.value })}
          >
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
              update({ category: c });
            }}
            key={c}
          >
            {c}
          </button>
        ))}
        <span aria-live="polite" aria-atomic="true">
          {filtered.length}篇
        </span>
      </div>
      {hasFilters && (
        <div className="filter-summary">
          <span>
            {term
              ? `包含“${term}”`
              : category !== "全部"
                ? category
                : "按学习进度筛选"}
            {status !== "all"
              ? ` · ${{ new: "尚未学习", learned: "已学习", due: "到期复习" }[status]}`
              : ""}
          </span>
          <button className="text-button" onClick={reset}>
            <ArrowCounterClockwise size={15} />
            重置筛选
          </button>
        </div>
      )}
      <div className={`poem-list ${term ? "is-searching" : ""}`} ref={listRef}>
        {filtered.slice(0, limit).map((p) => {
          const excerpt =
            (term && p.lines.find((line) => line.includes(term))) || p.lines[0];
          return (
            <button
              className="poem-row"
              data-poem-id={p.id}
              key={p.id}
              onClick={() => onRead(p.id)}
            >
              <span className="row-number">
                {p.category}
                {String(p.number).padStart(3, "0")}
              </span>
              <span className="row-title">
                <strong>
                  <Highlight text={p.title} query={term} />
                </strong>
                <span>
                  <Highlight
                    text={`${p.author} ${p.subtitle || ""}`}
                    query={term}
                  />
                </span>
              </span>
              <span className="row-excerpt">
                <Highlight text={excerpt} query={term} />
              </span>
              <span
                className={`learning-status ${state.learning[p.id] ? (state.learning[p.id].due <= todayKey() ? "due" : "learned") : ""}`}
              >
                {state.learning[p.id]
                  ? state.learning[p.id].due <= todayKey()
                    ? "待复习"
                    : "已学习"
                  : "未学习"}
              </span>
              <ArrowRight size={19} />
            </button>
          );
        })}
      </div>
      {!filtered.length && (
        <div className="empty-state">
          <MagnifyingGlass size={38} weight="thin" />
          <h2>没有找到这篇诗词</h2>
          <p>试试作者名或另一段诗句，也可以清除筛选重新查找。</p>
          <button className="button secondary" onClick={reset}>
            清除筛选，查看全部篇目
          </button>
        </div>
      )}
      {filtered.length > limit && (
        <button
          className="button secondary load-more"
          onClick={() => setView((v) => ({ ...v, limit: v.limit + 40 }))}
        >
          再显示{Math.min(40, filtered.length - limit)}篇 · 还剩
          {filtered.length - limit}篇
        </button>
      )}
    </>
  );
}
