import { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowCounterClockwise,
  Lightning,
  Timer,
  CheckCircle,
  XCircle,
  Eye,
  ArrowLeft,
} from "@phosphor-icons/react";
import { gradeAnswer, makeQuestions, shuffle } from "../lib/study.mjs";
import { SourceLink } from "./Reader.jsx";

function AnswerDiff({ answer, expected }) {
  const chars = [...answer.replace(/[\p{P}\p{Z}\s]/gu, "")];
  const target = [...expected.replace(/[\p{P}\p{Z}\s]/gu, "")];
  return (
    <p className="answer-diff">
      {chars.map((c, i) => (
        <span className={c === target[i] ? "right-char" : "wrong-char"} key={i}>
          {c}
        </span>
      ))}
      {chars.length < target.length && (
        <span className="missing-char">
          （少{target.length - chars.length}字）
        </span>
      )}
    </p>
  );
}
export function Trainer({ poems, state, onAttempt, context, onRead, onDone }) {
  const [mode, setMode] = useState("next"),
    [scope, setScope] = useState("all"),
    [seconds, setSeconds] = useState(10),
    [answerMode, setAnswerMode] = useState("recall");
  const [round, setRound] = useState(null),
    [index, setIndex] = useState(0),
    [phase, setPhase] = useState("answering"),
    [answer, setAnswer] = useState(""),
    [elapsed, setElapsed] = useState(0),
    [hinted, setHinted] = useState(false),
    [result, setResult] = useState(null),
    [results, setResults] = useState([]),
    [error, setError] = useState("");
  const startAt = useRef(0),
    locked = useRef(false),
    inputRef = useRef(null);
  const q = round?.questions[index];
  const poem = q ? poems.find((p) => p.id === q.poemId) : null;
  function start() {
    let pool =
      context?.questions ||
      makeQuestions(
        context?.poemId
          ? poems.filter((p) => p.id === context.poemId)
          : scope === "learned"
            ? poems.filter((p) => state.learning[p.id])
            : poems,
        mode,
      );
    if (!pool.length) {
      setError("这个范围暂时没有可用题目，先背几篇，或换一个出题方式。");
      return;
    }
    const questions = shuffle(pool).slice(0, state.settings.roundSize);
    setRound({ id: crypto.randomUUID(), questions });
    setIndex(0);
    setResults([]);
    resetQuestion();
  }
  function resetQuestion() {
    setAnswer("");
    setElapsed(0);
    setHinted(false);
    setResult(null);
    setPhase("answering");
    locked.current = false;
    startAt.current = performance.now();
  }
  function finish(value, options = {}) {
    if (locked.current || !q) return;
    locked.current = true;
    const ms = performance.now() - startAt.current;
    const attempt = {
      id: `${round.id}-${index}`,
      answer: value || "",
      elapsed: elapsed && phase === "recalled" ? elapsed : ms,
      hinted,
      ...options,
    };
    const correct =
      !attempt.hinted &&
      !attempt.timedOut &&
      !attempt.skipped &&
      (attempt.selfCorrect === undefined
        ? gradeAnswer(value, q.answer)
        : attempt.selfCorrect === true);
    onAttempt(q, attempt);
    setElapsed(attempt.elapsed);
    setResult({ correct, ...options });
    setResults((old) => [...old, { correct, elapsed: attempt.elapsed }]);
    setPhase("judged");
  }
  useEffect(() => {
    if (!q || phase !== "answering") return;
    inputRef.current?.focus();
    const timer = setInterval(() => {
      const ms = performance.now() - startAt.current;
      setElapsed(ms);
      if (seconds > 0 && ms >= seconds * 1000) finish("", { timedOut: true });
    }, 80);
    return () => clearInterval(timer);
  }, [round, index, phase, seconds]);
  useEffect(() => {
    if (!q || answerMode !== "recall" || phase !== "answering") return;
    const key = (e) => {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        setElapsed(performance.now() - startAt.current);
        setPhase("recalled");
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [q, phase, answerMode]);
  function next() {
    if (index + 1 >= round.questions.length) {
      setPhase("summary");
      return;
    }
    setIndex(index + 1);
    resetQuestion();
  }
  const source = context?.poemId
    ? poems.find((p) => p.id === context.poemId)
    : null;
  if (!round)
    return (
      <>
        <div className="page-heading">
          <div>
            <div className="eyebrow">模拟现场 · 先准，再快</div>
            <h1>把熟悉，练成反应。</h1>
            <p>
              {context?.questions
                ? "这轮只练你的错句。"
                : source
                  ? `专项练习：《${source.title}》`
                  : "随机出题，限时回忆。每一题都来自指定篇目。"}
            </p>
          </div>
          <Lightning size={42} weight="thin" />
        </div>
        <section className="training-setup">
          <div>
            <h2>安排一轮练习</h2>
            <p className="muted">
              每轮{state.settings.roundSize}题，可在设置里调整。
            </p>
            {!context?.questions && (
              <>
                <fieldset>
                  <legend>出题方式</legend>
                  <div className="option-grid">
                    {[
                      ["next", "上下句"],
                      ["cloze", "诗句挖空"],
                      ["author", "作者"],
                      ["title", "篇名"],
                    ].map(([v, l]) => (
                      <button
                        key={v}
                        aria-pressed={mode === v}
                        onClick={() => setMode(v)}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </fieldset>
                {!source && (
                  <label className="setting-label">
                    出题范围
                    <select
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                    >
                      <option value="all">全部200篇</option>
                      <option value="learned">仅已学习的篇目</option>
                    </select>
                  </label>
                )}
              </>
            )}
            <fieldset>
              <legend>每题限时</legend>
              <div className="option-grid">
                {[0, 10, 20, 30].map((n) => (
                  <button
                    key={n}
                    aria-pressed={seconds === n}
                    onClick={() => setSeconds(n)}
                  >
                    {n === 0 ? "不限时" : `${n}秒`}
                  </button>
                ))}
              </div>
            </fieldset>
            <fieldset>
              <legend>作答方式</legend>
              <div className="option-grid two">
                {[
                  ["recall", "先抢答 · 揭晓自评"],
                  ["type", "输入答案 · 自动判分"],
                ].map(([v, l]) => (
                  <button
                    key={v}
                    aria-pressed={answerMode === v}
                    onClick={() => setAnswerMode(v)}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </fieldset>
            {error && (
              <p className="notice error" role="alert">
                {error}
              </p>
            )}
            <button className="button" onClick={start}>
              开始这一轮 <ArrowRight size={20} />
            </button>
          </div>
          <aside className="training-note">
            <Timer size={42} weight="thin" />
            <h2>给大脑一点现场感。</h2>
            <p>
              抢答模式下，想到答案就按“我想到了”停表，再对照原文自评。电脑也可以按空格。
            </p>
            <p>
              输入模式会忽略标点和空格，逐字检查答案。作答用时包含打字时间。
            </p>
            <p>答错、超时或看过提示，都会进入错句复习。</p>
          </aside>
        </section>
      </>
    );
  if (phase === "summary") {
    const correct = results.filter((r) => r.correct).length;
    return (
      <div className="round-summary">
        <CheckCircle size={56} weight="thin" />
        <div className="eyebrow">本轮结束</div>
        <h1>每次回想，都算积累。</h1>
        <div className="summary-stats">
          <div>
            <strong>
              {correct}
              <small>/{results.length}</small>
            </strong>
            <span>独立答对</span>
          </div>
          <div>
            <strong>
              {Math.round((correct / results.length) * 100)}
              <small>%</small>
            </strong>
            <span>正确率</span>
          </div>
          <div>
            <strong>
              {(
                results.reduce((n, r) => n + r.elapsed, 0) /
                results.length /
                1000
              ).toFixed(1)}
              <small>秒</small>
            </strong>
            <span>平均{answerMode === "recall" ? "回忆" : "作答"}用时</span>
          </div>
        </div>
        <p className="muted">
          {results.length - correct
            ? `${results.length - correct}道题已加入错句，回去再巩固一下。`
            : "这一轮都答对了，继续保持。"}
        </p>
        <div className="button-row">
          <button
            className="button"
            onClick={() => {
              setRound(null);
              setError("");
            }}
          >
            再练一轮 <ArrowCounterClockwise size={18} />
          </button>
          <button className="button secondary" onClick={onDone}>
            回到今日计划
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="quiz-page">
      <div className="quiz-top">
        <button
          className="text-button"
          onClick={() => {
            setRound(null);
            setError("");
          }}
        >
          <ArrowLeft size={17} />
          结束本轮
        </button>
        <span>
          第{index + 1}题 / 共{round.questions.length}题
        </span>
        <span>{answerMode === "recall" ? "回忆抢答" : "输入作答"}</span>
      </div>
      <div className="quiz-progress">
        <span
          style={{ width: `${((index + 1) / round.questions.length) * 100}%` }}
        />
      </div>
      <section className="quiz-content">
        <div className="eyebrow">{q.label}</div>
        <h1 className="quiz-prompt">{q.prompt}</h1>
        {!["author", "title"].includes(q.mode) && (
          <p className="quiz-attribution">
            《{poem.title}》 · {poem.author}
          </p>
        )}
        <div
          className={`quiz-timer ${seconds && elapsed >= seconds * 800 ? "urgent" : ""}`}
          aria-label="本题用时"
        >
          <Timer size={24} />
          <span>
            {(elapsed / 1000).toFixed(1)}
            <small>秒</small>
          </span>
          <span className="timer-limit">
            {seconds ? `/ ${seconds}秒` : "不限时"}
          </span>
        </div>
        {phase === "answering" && (
          <>
            {answerMode === "type" ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (answer.trim()) finish(answer);
                }}
              >
                <label className="sr-only" htmlFor="quiz-answer">
                  你的答案
                </label>
                <input
                  ref={inputRef}
                  id="quiz-answer"
                  className="quiz-input"
                  placeholder="输入你的答案…"
                  autoComplete="off"
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                />
                <button
                  className="button"
                  type="submit"
                  disabled={!answer.trim()}
                >
                  提交答案 <ArrowRight size={20} />
                </button>
              </form>
            ) : (
              <button
                className="button recall-button"
                onClick={() => {
                  setElapsed(performance.now() - startAt.current);
                  setPhase("recalled");
                }}
              >
                <Lightning size={23} />
                我想到了 <span className="keyboard-hint">Space</span>
              </button>
            )}
            <div className="quiz-actions">
              <button
                className="text-button"
                onClick={() => finish("", { skipped: true })}
              >
                暂时想不起来
              </button>
              <button
                className="text-button"
                onClick={() => {
                  setHinted(true);
                }}
                disabled={hinted}
              >
                <Eye size={17} />
                {hinted ? `首字提示：${q.answer[0]}` : "看首字提示"}
              </button>
            </div>
            {hinted && (
              <p className="muted hint-note">
                本题使用了提示，将加入错句复习。
              </p>
            )}
          </>
        )}
        {phase === "recalled" && (
          <div className="recalled-panel">
            <div className="eyebrow">对照答案，诚实自评</div>
            <p className="correct-answer">{q.answer}</p>
            <p className="muted">在揭晓之前，你是否已完整想出答案？</p>
            <div className="button-row">
              <button
                className="button secondary"
                onClick={() => finish("", { selfCorrect: false })}
              >
                没完全想对
              </button>
              <button
                className="button"
                onClick={() => finish(q.answer, { selfCorrect: true })}
              >
                我答对了 <CheckCircle size={19} />
              </button>
            </div>
          </div>
        )}
        {phase === "judged" && (
          <div
            className={`quiz-feedback ${result.correct ? "success" : "retry"}`}
            role="status"
          >
            <div className="feedback-label">
              {result.correct ? (
                <CheckCircle size={24} />
              ) : (
                <XCircle size={24} />
              )}
              <strong>
                {result.timedOut
                  ? "时间到，再巩固一次"
                  : result.correct
                    ? "答对了，记得很牢"
                    : hinted
                      ? "用过提示，再独立回想一次"
                      : "这句还需要再温习"}
              </strong>
            </div>
            <span className="eyebrow">参考答案</span>
            <p className="correct-answer">{q.answer}</p>
            {answer && answerMode === "type" && (
              <>
                <span className="eyebrow">你的答案</span>
                <AnswerDiff answer={answer} expected={q.answer} />
              </>
            )}
            <div className="feedback-bottom">
              <SourceLink poem={poem} />
              <button className="button" onClick={next}>
                {index + 1 === round.questions.length
                  ? "查看本轮结果"
                  : "下一题"}
                <ArrowRight size={20} />
              </button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
