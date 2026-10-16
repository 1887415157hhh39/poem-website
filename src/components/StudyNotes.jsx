import { useEffect, useState } from "react";
import {
  BookOpenText,
  CaretDown,
  ArrowDown,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { loadStudyGuide } from "../lib/study-notes.mjs";
import "./StudyNotes.css";

export function StudyNotes({ poem }) {
  const [open, setOpen] = useState(false);
  const [guide, setGuide] = useState(null);
  const [error, setError] = useState(false);
  const [retry, setRetry] = useState(0);
  const regionId = `study-notes-${poem.id}`;
  useEffect(() => {
    if (!open || guide) return;
    let active = true;
    setError(false);
    loadStudyGuide(poem)
      .then((data) => {
        if (active) setGuide(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [open, guide, poem, retry]);

  function locate(line) {
    setOpen(false);
    requestAnimationFrame(() => {
      const target = document.getElementById(`${poem.id}-line-${line}`);
      target?.focus({ preventScroll: true });
      target?.scrollIntoView({
        block: "center",
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
      });
    });
  }

  return (
    <section className={`study-notes ${open ? "is-open" : ""}`}>
      <h2>
        <button
          className="study-notes-toggle"
          id={`${regionId}-toggle`}
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen(!open)}
        >
          <BookOpenText size={23} weight="duotone" aria-hidden="true" />
          <span>
            <strong>理解与注释</strong>
            <small>读懂大意 · 弄清词句 · 顺着思路背</small>
          </span>
          <CaretDown className="notes-chevron" size={19} aria-hidden="true" />
        </button>
      </h2>
      <div
        id={regionId}
        role="region"
        aria-labelledby={`${regionId}-toggle`}
        hidden={!open}
      >
        {open && !guide && !error && (
          <p className="notes-loading" role="status">
            正在加载本篇注释…
          </p>
        )}
        {open && error && (
          <div className="notes-error" role="alert">
            <p>本篇注释暂时未能加载，仍可继续阅读原文。</p>
            <button
              className="button secondary"
              onClick={() => setRetry((n) => n + 1)}
            >
              重新加载注释
            </button>
          </div>
        )}
        {open && guide && (
          <div className="study-notes-body">
            {guide.caution && (
              <div className="notes-version">
                <strong>材料与版本提示</strong>
                <p>{guide.caution}</p>
              </div>
            )}
            <section className="notes-overview">
              <h3>
                <span>01</span>这篇在说什么
              </h3>
              <p>{guide.overview}</p>
            </section>
            <section className="notes-glosses">
              <h3>
                <span>02</span>
                {poem.form === "现代诗" ? "词句与意象" : "重点词句"}
              </h3>
              <p className="notes-section-hint">
                点按带行号的词句，可定位到原文。
              </p>
              <dl>
                {guide.notes.map((note) => (
                  <div className="notes-gloss" key={note.quote}>
                    <dt>
                      {note.line >= 0 ? (
                        <button
                          className="notes-anchor"
                          onClick={() => locate(note.line)}
                          aria-label={`${note.quote}，定位到原文第${note.line + 1}行`}
                        >
                          {note.quote}
                          <small>
                            第{note.line + 1}行 <ArrowDown size={12} />
                          </small>
                        </button>
                      ) : (
                        note.quote
                      )}
                    </dt>
                    <dd>{note.explanation}</dd>
                  </div>
                ))}
              </dl>
            </section>
            <section className="notes-thread">
              <h3>
                <span>03</span>顺着思路背
              </h3>
              <p className="notes-section-hint">先记内容的转折，再接回原句。</p>
              <ol>
                {guide.steps.map((step, i) => (
                  <li key={`${step.quote}-${i}`}>
                    <button
                      onClick={() => locate(step.line)}
                      aria-label={`${step.explanation}，定位到原文第${step.line + 1}行`}
                    >
                      <span className="notes-step-number" aria-hidden="true">
                        {i + 1}
                      </span>
                      <span>
                        <strong>{step.explanation}</strong>
                        <small>
                          从“{step.quote}”接起 · 第{step.line + 1}行
                        </small>
                      </span>
                      <ArrowDown size={16} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            </section>
            <details className="notes-sources">
              <summary>参考资料与整理说明</summary>
              <p>
                释义依指定原文整理；大意、意象解读与背诵思路是学习提示，不代替比赛指定解释。
              </p>
              <ul>
                {guide.sources.map(([title, url]) => (
                  <li key={url}>
                    <a href={url} target="_blank" rel="noreferrer">
                      {title} <ArrowSquareOut size={14} aria-hidden="true" />
                    </a>
                  </li>
                ))}
              </ul>
            </details>
          </div>
        )}
      </div>
    </section>
  );
}
