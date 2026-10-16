import { useState } from "react";
import { Notebook, ArrowRight, CheckCircle } from "@phosphor-icons/react";
export function Mistakes({ state, poems, onTrain, onRead }) {
  const [revealed, setRevealed] = useState(new Set());
  const entries = Object.values(state.mistakes).sort(
    (a, b) => b.count - a.count,
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">遗忘不是退步，是复习的信号</div>
          <h1>把卡住的句子，接回来。</h1>
          <p>
            {entries.length
              ? `${entries.length}道题待巩固，按出错次数排列。独立答对后会自动移出。`
              : "这里会收集答错、超时或看过提示的题。"}
          </p>
        </div>
        <Notebook size={40} weight="thin" />
      </div>
      {entries.length ? (
        <>
          <button
            className="button mistakes-start"
            onClick={() => onTrain(entries.map((m) => m.question))}
          >
            开始错句回练 <ArrowRight size={20} />
          </button>
          <div className="mistakes-list">
            {entries.map((m) => {
              const q = m.question;
              const p = poems.find((p) => p.id === q.poemId);
              return (
                <section className="mistake-row" key={q.id}>
                  <div className="mistake-meta">
                    <span>
                      《{p.title}》 · {q.label}
                    </span>
                    <span>待巩固 {m.count}次</span>
                  </div>
                  <h2>{q.prompt}</h2>
                  {revealed.has(q.id) && (
                    <p className="mistake-answer">{q.answer}</p>
                  )}
                  <div className="mistake-actions">
                    <button
                      className="text-button"
                      onClick={() =>
                        setRevealed((old) => {
                          const n = new Set(old);
                          n.has(q.id) ? n.delete(q.id) : n.add(q.id);
                          return n;
                        })
                      }
                    >
                      {revealed.has(q.id) ? "收起答案" : "查看答案"}
                    </button>
                    <button
                      className="text-button"
                      onClick={() => onRead(p.id)}
                    >
                      回原文背诵 <ArrowRight size={16} />
                    </button>
                  </div>
                </section>
              );
            })}
          </div>
        </>
      ) : (
        <div className="empty-state">
          <CheckCircle size={58} weight="thin" />
          <h2>暂无待复习的错句</h2>
          <p>先去练一轮，找到最值得花时间的地方。</p>
          <button className="button" onClick={() => onTrain(null)}>
            开始抢答训练 <ArrowRight size={19} />
          </button>
        </div>
      )}
    </>
  );
}
