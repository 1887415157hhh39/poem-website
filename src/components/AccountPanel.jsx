import { useState } from "react";
import { CloudCheck, EnvelopeSimple, SignOut } from "@phosphor-icons/react";
export function AccountPanel({ cloud, storageError }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const recovering = cloud.recovery;
  const action = recovering ? "password" : mode;
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    setError(false);
    try {
      await cloud.auth(action, email.trim(), password);
      setPassword("");
      setMessage(
        action === "register"
          ? "确认邮件已请求发送。请到邮箱点击验证链接，再返回登录；未收到时请检查垃圾邮件。"
          : action === "forgot"
            ? "重设邮件已请求发送。如果该邮箱已注册且可接收邮件，请点击其中的链接设置新密码。"
            : action === "password"
              ? "新密码已保存。"
              : "登录成功。",
      );
    } catch (e) {
      setError(true);
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  function changeMode(next) {
    setMode(next);
    setPassword("");
    setMessage("");
    setError(false);
  }
  async function logout() {
    setBusy(true);
    setMessage("");
    try {
      await cloud.auth("logout");
      setPassword("");
      setMessage("已退出，回到本机访客进度。");
    } catch (e) {
      setError(true);
      setMessage(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="account-panel" aria-labelledby="account-heading">
      <div className="account-heading">
        <div>
          <div className="eyebrow">随处接着学</div>
          <h2 id="account-heading">邮箱与云同步</h2>
        </div>
        <CloudCheck size={30} weight="light" />
      </div>
      {!cloud.configured ? (
        <p className="muted">云同步暂未启用，你可以继续学习并导出本机进度。</p>
      ) : cloud.session && !recovering ? (
        <>
          <div className="account-summary">
            <div>
              <strong className="account-email">
                {cloud.session.user.email}
              </strong>
              <p className="sync-line" role="status">
                {cloud.label}
                {cloud.connection.status === "synced" && cloud.connection.at
                  ? ` · ${cloud.connection.at.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`
                  : ""}
              </p>
            </div>
            <button className="text-button" onClick={logout} disabled={busy}>
              <SignOut size={18} />
              退出登录
            </button>
          </div>
          <p className="muted">
            在其他设备登录同一邮箱，即可接着学。断网时保留本机记录，联网后自动合并；打开页面期间约每20秒检查一次新进度。
          </p>
          {["error", "offline", "pending"].includes(
            cloud.connection.status,
          ) && (
            <div className="notice">
              <p>
                {cloud.connection.status === "offline"
                  ? "当前离线，尚未上传的新记录会在联网后继续同步。"
                  : "部分进度尚未确认同步，请保持页面打开。"}
                {storageError
                  ? "当前浏览器也无法保存，请先导出备份。"
                  : "本机副本已保留。"}
              </p>
              <button className="button secondary" onClick={cloud.retry}>
                立即重试同步
              </button>
            </div>
          )}
          {cloud.guestAvailable && (
            <div className="notice guest-import">
              <h3>发现这台设备原有的学习记录</h3>
              <p>
                是否合并到当前邮箱？只会在你确认后上传。本机访客副本会保留。
              </p>
              <div className="button-row">
                <button className="button" onClick={cloud.importGuest}>
                  合并本机学习记录
                </button>
                <button className="text-button" onClick={cloud.dismissGuest}>
                  暂不合并
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <>
          {!recovering && (
            <div className="account-tabs" aria-label="账号操作">
              {[
                ["login", "邮箱登录"],
                ["register", "注册账号"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  className={mode === id ? "selected" : ""}
                  onClick={() => changeMode(id)}
                  aria-pressed={mode === id}
                >
                  {label}
                </button>
              ))}
            </div>
          )}
          <p className="muted">
            {recovering
              ? "邮箱验证已完成，请设置新的登录密码。"
              : mode === "forgot"
                ? "输入注册邮箱，我们会发送重设密码链接。"
                : "登录后自动同步学习、抢答、错句和设置。未登录也能继续本机学习。"}
          </p>
          <form className="account-form" onSubmit={submit}>
            {!recovering && (
              <label>
                邮箱地址
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  maxLength={254}
                  placeholder="你的邮箱地址"
                />
              </label>
            )}
            {action !== "forgot" && (
              <label>
                {recovering ? "新密码" : "密码"}
                <input
                  type="password"
                  autoComplete={
                    action === "login" ? "current-password" : "new-password"
                  }
                  minLength={action === "login" ? 1 : 8}
                  maxLength={128}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={
                    action === "login"
                      ? "输入密码"
                      : "至少8位，建议包含字母和数字"
                  }
                />
              </label>
            )}
            <div className="button-row">
              <button className="button" disabled={busy}>
                <EnvelopeSimple size={19} />
                {busy
                  ? "请稍候…"
                  : {
                      login: "登录并同步",
                      register: "注册并发送确认邮件",
                      forgot: "发送重设邮件",
                      password: "保存新密码",
                    }[action]}
              </button>
              {!recovering && (
                <button
                  type="button"
                  className="text-button"
                  disabled={busy}
                  onClick={() =>
                    changeMode(mode === "forgot" ? "login" : "forgot")
                  }
                >
                  {mode === "forgot" ? "返回登录" : "忘记密码"}
                </button>
              )}
            </div>
          </form>
          {!recovering && mode === "register" && (
            <p className="muted mail-note">
              当前邮件服务支持项目成员邮箱，请使用注册 Supabase
              时的邮箱。若要开放给同学注册，需要另行配置邮件服务。
            </p>
          )}
        </>
      )}
      {message && (
        <p
          className={`notice ${error ? "error" : ""}`}
          role={error ? "alert" : "status"}
        >
          {message}
        </p>
      )}
    </section>
  );
}
