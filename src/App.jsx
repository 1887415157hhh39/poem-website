import { useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDots,
  BookOpen,
  Lightning,
  Notebook,
  GearSix,
  Database,
  ArrowRight,
  Clock,
  CheckCircle,
} from "@phosphor-icons/react";
import poems from "./data/poems.json";
import {
  STATE_KEY,
  emptyState,
  validateBackup,
  scheduleReview,
  recordAttempt,
  selectDaily,
  todayKey,
} from "./lib/study.mjs";
import { PoemPreview, Reader } from "./components/Reader.jsx";
import { Library } from "./components/Library.jsx";
import { Trainer } from "./components/Trainer.jsx";
import { Mistakes } from "./components/Mistakes.jsx";
import { Settings } from "./components/Settings.jsx";
const validIds = new Set(poems.map((p) => p.id));
const nav = [
  ["today", "今日计划", CalendarDots],
  ["library", "全部篇目", BookOpen],
  ["train", "抢答训练", Lightning],
  ["mistakes", "错句复习", Notebook],
];
function initialState() {
  try {
    const raw = localStorage.getItem(STATE_KEY);
    return raw ? validateBackup(JSON.parse(raw), validIds) : emptyState();
  } catch {
    return emptyState();
  }
}
function routeFromHash() {
  const [page, id] = location.hash.slice(1).split("/");
  return {
    page: [
      "today",
      "library",
      "read",
      "train",
      "mistakes",
      "settings",
    ].includes(page)
      ? page
      : "today",
    id,
  };
}
export function App() {
  const [state, setState] = useState(initialState),
    [route, setRoute] = useState(routeFromHash),
    [storageError, setStorageError] = useState(false),
    [trainingContext, setTrainingContext] = useState(null),
    [trainingKey, setTrainingKey] = useState(0),
    [toast, setToast] = useState("");
  const [date, setDate] = useState(todayKey());
  useEffect(() => {
    const id = setInterval(() => setDate(todayKey()), 60000);
    return () => clearInterval(id);
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem(STATE_KEY, JSON.stringify(state));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }, [state]);
  useEffect(() => {
    const listener = () => {
      setRoute(routeFromHash());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", listener);
    return () => window.removeEventListener("hashchange", listener);
  }, []);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 3600);
    return () => clearTimeout(id);
  }, [toast]);
  const navigate = useCallback((page, id) => {
    location.hash = `${page}${id ? `/${id}` : ""}`;
    window.scrollTo(0, 0);
  }, []);
  function read(id) {
    setState((s) => ({ ...s, lastPoem: id }));
    navigate("read", id);
  }
  function train(context = null) {
    setTrainingContext(context);
    setTrainingKey((k) => k + 1);
    navigate("train");
  }
  const plan = useMemo(() => selectDaily(state, poems, date), [state, date]);
  const current = poems.find((p) => p.id === state.lastPoem) || poems[0];
  const selected = poems.find((p) => p.id === route.id) || poems[0];
  const learned = Object.keys(state.learning).length;
  function rate(id, rating) {
    setState((s) => scheduleReview(s, id, rating, date));
    setToast(
      rating === "good" ? "已记录，下次按时复习。" : "已记录，明天再巩固一次。",
    );
  }
  function dailyStart() {
    const next = plan.due[0] || plan.newPoems[0];
    if (next) read(next.id);
    else train();
  }
  function nextPoem() {
    const next =
      plan.due.find((p) => p.id !== selected.id) ||
      plan.newPoems.find((p) => p.id !== selected.id) ||
      poems[(poems.indexOf(selected) + 1) % poems.length];
    read(next.id);
  }
  return (
    <div className="app-shell">
      <a
        className="skip-link"
        href="#main-content"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById("main-content").focus();
        }}
      >
        跳到主要内容
      </a>
      <aside className="sidebar">
        <button
          className="brand"
          onClick={() => navigate("today")}
          aria-label="温故，回到今日计划"
        >
          <strong>温故</strong>
          <span>诗词备赛</span>
        </button>
        <nav aria-label="主导航">
          {nav.map(([id, label, Icon]) => (
            <button
              key={id}
              className={`nav-item ${route.page === id || (id === "library" && route.page === "read") ? "active" : ""}`}
              aria-current={route.page === id ? "page" : undefined}
              onClick={() => (id === "train" ? train() : navigate(id))}
            >
              <Icon size={24} />
              <span>{label}</span>
              {id === "mistakes" && Object.keys(state.mistakes).length > 0 && (
                <small>{Object.keys(state.mistakes).length}</small>
              )}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="curriculum-note">
            <BookOpen size={21} />
            <div>
              <strong>200篇指定篇目</strong>
              <p>
                中国传媒大学本科通识
                <br />
                素养诗词基本篇目
              </p>
            </div>
          </div>
          <div className="local-note">
            <Database size={19} />
            <span>{storageError ? "进度暂未保存" : "浏览器保存进度"}</span>
          </div>
          <button
            className={`nav-item settings-nav ${route.page === "settings" ? "active" : ""}`}
            onClick={() => navigate("settings")}
          >
            <GearSix size={23} />
            <span>设置与备份</span>
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <span className="mobile-wordmark">
            温故 <small>诗词备赛</small>
          </span>
          <div>
            <span>
              {new Intl.DateTimeFormat("zh-CN", {
                timeZone: "Asia/Shanghai",
                month: "long",
                day: "numeric",
                weekday: "short",
              }).format(new Date())}
            </span>
            <span className="topbar-divider" />
            <span className="topbar-status">
              {plan.studiedToday.length
                ? `今天已复习${plan.studiedToday.length}篇`
                : "今日，从一句开始"}
            </span>
          </div>
          <button
            className="mobile-settings icon-button"
            aria-label="设置与备份"
            onClick={() => navigate("settings")}
          >
            <GearSix size={22} />
          </button>
        </header>
        {storageError && (
          <div className="notice error" role="alert">
            浏览器暂时无法保存进度。请到设置导出备份，避免关闭后丢失。
          </div>
        )}
        <main id="main-content" tabIndex={-1}>
          {route.page === "today" && (
            <>
              <section className="home-heading">
                <h1>今天，记牢一点，再快一点。</h1>
                <p>院级诗词大赛 · 11月上半月</p>
              </section>
              <div className="study-path">
                {[
                  ["01", "复习旧句", "回顾已有印象，巩固易错点"],
                  ["02", "遮字背诵", "逐句记忆，检验掌握情况"],
                  ["03", "限时抢答", "模拟赛场节奏，提升反应速度"],
                ].map(([num, title, desc], i) => (
                  <div className="path-step" key={num}>
                    <span className={`step-number ${i === 0 ? "current" : ""}`}>
                      {num}
                    </span>
                    <div>
                      <strong>{title}</strong>
                      <p>{desc}</p>
                    </div>
                    {i < 2 && (
                      <ArrowRight
                        className="path-arrow"
                        size={24}
                        weight="thin"
                      />
                    )}
                  </div>
                ))}
              </div>
              <div className="home-grid">
                <section className="daily-plan">
                  <h2 className="underlined-heading">今日安排</h2>
                  <div className="plan-rows">
                    {[
                      [
                        Notebook,
                        "复习旧句",
                        "回顾已学内容，重点巩固易错点。",
                        plan.due.length,
                        "篇待复习",
                        () =>
                          plan.due[0]
                            ? read(plan.due[0].id)
                            : navigate("mistakes"),
                      ],
                      [
                        BookOpen,
                        "认识新篇",
                        "按计划推进，学习新的篇目。",
                        plan.newPoems.length,
                        "篇新学",
                        () =>
                          plan.newPoems[0]
                            ? read(plan.newPoems[0].id)
                            : navigate("library"),
                      ],
                      [
                        Lightning,
                        "练习抢答",
                        "在熟悉的基础上，进行限时训练。",
                        state.settings.roundSize,
                        "道随机题",
                        () => train(),
                      ],
                    ].map(([Icon, title, desc, count, unit, action]) => (
                      <button className="plan-row" key={title} onClick={action}>
                        <span className="plan-icon">
                          <Icon size={26} weight="light" />
                        </span>
                        <span className="plan-copy">
                          <strong>{title}</strong>
                          <span>{desc}</span>
                        </span>
                        <span className="plan-count">
                          <b>{count}</b>
                          <span>{unit}</span>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button className="button daily-start" onClick={dailyStart}>
                    {plan.due.length || plan.newPoems.length
                      ? "开始今日训练"
                      : "进入抢答训练"}
                    <ArrowRight size={22} />
                  </button>
                  <p className="plan-caption">先巩固，再提速。</p>
                  <div className="overall-progress">
                    <div>
                      <span>
                        已学习 <b>{learned}</b> / 200篇
                      </span>
                      <span>{Math.round((learned / 200) * 100)}%</span>
                    </div>
                    <div className="progress-track">
                      <span style={{ width: `${(learned / 200) * 100}%` }} />
                    </div>
                  </div>
                </section>
                <PoemPreview
                  key={current.id}
                  poem={current}
                  onRead={() => read(current.id)}
                  onTrain={() => train({ poemId: current.id })}
                />
              </div>
              {state.history.length > 0 && (
                <section className="recent-summary">
                  <Clock size={19} />
                  <span>
                    最近{Math.min(20, state.history.length)}题独立正确率{" "}
                    <strong>
                      {Math.round(
                        (state.history.slice(0, 20).filter((h) => h.correct)
                          .length /
                          Math.min(20, state.history.length)) *
                          100,
                      )}
                      %
                    </strong>
                  </span>
                  <span>
                    还有{Object.keys(state.mistakes).length}道错句值得再温习
                  </span>
                </section>
              )}
            </>
          )}
          {route.page === "library" && (
            <Library poems={poems} state={state} onRead={read} />
          )}
          {route.page === "read" && (
            <Reader
              key={selected.id}
              poem={selected}
              learning={state.learning[selected.id]}
              onRate={rate}
              onBack={() => navigate("library")}
              onTrain={() => train({ poemId: selected.id })}
              onNext={nextPoem}
            />
          )}
          {route.page === "train" && (
            <Trainer
              key={trainingKey}
              poems={poems}
              state={state}
              context={trainingContext}
              onAttempt={(q, a) => setState((s) => recordAttempt(s, q, a))}
              onRead={read}
              onDone={() => navigate("today")}
            />
          )}
          {route.page === "mistakes" && (
            <Mistakes
              state={state}
              poems={poems}
              onRead={read}
              onTrain={(qs) => train(qs ? { questions: qs } : null)}
            />
          )}
          {route.page === "settings" && (
            <Settings
              state={state}
              setState={setState}
              poems={poems}
              storageError={storageError}
            />
          )}
        </main>
        <footer className="app-footer">
          温故而知新。 <span>学习记录仅存于当前浏览器，建议定期备份。</span>
        </footer>
      </div>
      <nav className="mobile-nav" aria-label="移动端导航">
        {nav.map(([id, label, Icon]) => (
          <button
            key={id}
            className={
              route.page === id || (id === "library" && route.page === "read")
                ? "active"
                : ""
            }
            onClick={() => (id === "train" ? train() : navigate(id))}
          >
            <Icon size={22} />
            <span>{label}</span>
          </button>
        ))}
      </nav>
      {toast && (
        <div className="toast" role="status">
          <CheckCircle size={20} />
          {toast}
        </div>
      )}
    </div>
  );
}
