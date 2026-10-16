import { useRef, useState } from "react";
import {
  DownloadSimple,
  UploadSimple,
  GearSix,
  ArrowSquareOut,
} from "@phosphor-icons/react";
import { validateSyncState } from "../lib/sync-state.mjs";
import { AccountPanel } from "./AccountPanel.jsx";
export function Settings({
  state,
  setState,
  poems,
  storageError,
  cloud,
  onImport,
}) {
  const input = useRef(null);
  const [message, setMessage] = useState(""),
    [pending, setPending] = useState(null);
  function download() {
    const blob = new Blob(
      [
        JSON.stringify(
          { ...state, exportedAt: new Date().toISOString() },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `温故进度-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage("备份已导出，请妥善保存。");
  }
  async function upload(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    setMessage("");
    setPending(null);
    try {
      if (file.size > 10_000_000)
        throw new Error("备份文件过大，请选择10MB以内的JSON。");
      const data = validateSyncState(
        JSON.parse(await file.text()),
        new Set(poems.map((p) => p.id)),
      );
      setPending(data);
    } catch (e) {
      setMessage(
        e instanceof SyntaxError
          ? "文件不是有效的JSON，当前进度未修改。"
          : `${e.message} 当前进度未修改。`,
      );
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">按自己的节奏</div>
          <h1>学习设置</h1>
          <p>每天都推进一点，把进度握在自己手里。</p>
        </div>
        <GearSix size={40} weight="thin" />
      </div>
      <AccountPanel cloud={cloud} storageError={storageError} />
      <div className="settings-grid">
        <section>
          <h2>每日目标</h2>
          <label className="setting-label">
            每日新学篇目
            <select
              value={state.settings.newPerDay}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    newPerDay: Number(e.target.value),
                  },
                }))
              }
            >
              {[3, 5, 8, 10, 12, 15, 20, 30].map((n) => (
                <option key={n} value={n}>
                  {n}篇
                </option>
              ))}
            </select>
          </label>
          <label className="setting-label">
            每轮抢答题数
            <select
              value={state.settings.roundSize}
              onChange={(e) =>
                setState((s) => ({
                  ...s,
                  settings: {
                    ...s.settings,
                    roundSize: Number(e.target.value),
                  },
                }))
              }
            >
              {[1, 5, 10, 20, 30, 50].map((n) => (
                <option key={n} value={n}>
                  {n}题
                </option>
              ))}
            </select>
          </label>
          <p className="muted">
            比赛暂定11月上半月。具体日期未定，请按实际剩余时间和掌握程度调整目标。
          </p>
          <p className="muted">
            复习间隔：熟练后依次在1、3、7、14天后复习；“还不熟”则明天再见。这是简单的递增计划。
          </p>
        </section>
        <section>
          <h2>备份与转移</h2>
          <p>
            {cloud.session
              ? "登录后进度自动同步到云端。你也可以保留独立的文件备份，导入时会与账号已有记录合并。"
              : "未登录时进度保存在当前浏览器。建议定期导出；也可以登录邮箱，在多台设备间自动同步。"}
          </p>
          {storageError && (
            <p className="notice error">
              浏览器保存失败，当前进度仅在本次打开期间有效，请立即导出备份。
            </p>
          )}
          <div className="button-row">
            <button className="button secondary" onClick={download}>
              <DownloadSimple size={19} />
              导出进度
            </button>
            <button
              className="button secondary"
              onClick={() => input.current?.click()}
            >
              <UploadSimple size={19} />
              导入备份
            </button>
          </div>
          <input
            className="sr-only"
            type="file"
            accept="application/json,.json"
            ref={input}
            onChange={upload}
            aria-label="选择温故备份文件"
          />
          {pending && (
            <div className="notice">
              <p>
                此备份包含{Object.keys(pending.learning).length}篇学习记录、
                {pending.history.length}
                条答题记录。
                {cloud.session
                  ? "导入后按记录时间与账号进度合并，较新的记录优先。"
                  : "导入会替换当前进度，建议先导出当前记录。"}
              </p>
              <div className="button-row">
                <button
                  className="button"
                  onClick={() => {
                    onImport(pending);
                    setPending(null);
                    setMessage("备份已导入。");
                  }}
                >
                  {cloud.session ? "确认合并并导入" : "确认替换并导入"}
                </button>
                <button
                  className="text-button"
                  onClick={() => setPending(null)}
                >
                  取消
                </button>
              </div>
            </div>
          )}
          {message && (
            <p className="notice" role="status">
              {message}
            </p>
          )}
        </section>
      </div>
      <section className="source-note">
        <h2>关于这份题库</h2>
        <p>
          来自《中国传媒大学本科通识素养诗词基本篇目》：诗162篇、词38篇，包含现代诗。按PDF保留原文用字；已检查篇目编号、跨页衔接并修正一处提取乱码，未对全部文字做逐字人工校订。如有异文，请以比赛组织方指定版本为准。
        </p>
        <a
          className="text-button"
          href={`${import.meta.env.BASE_URL}curriculum.pdf`}
          target="_blank"
          rel="noreferrer"
        >
          查看完整原始PDF <ArrowSquareOut size={17} />
        </a>
      </section>
    </>
  );
}
