import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { ProgressStore } from "../lib/progress-store.mjs";
import { SyncEngine } from "../lib/sync-engine.mjs";
import {
  supabase,
  configError,
  createTransport,
  authRedirect,
  authMessage,
} from "../lib/supabase-client.mjs";
import poems from "../data/poems.json";
const validIds = new Set(poems.map((p) => p.id));
const storage = {
  getItem: (key) => localStorage.getItem(key),
  setItem: (key, value) => localStorage.setItem(key, value),
};
const store = new ProgressStore({ storage, validIds });
export function useCloudProgress() {
  const snapshot = useSyncExternalStore(store.subscribe, store.getSnapshot);
  const [session, setSession] = useState(null);
  const [ready, setReady] = useState(!supabase);
  const [recovery, setRecovery] = useState(false);
  const [connection, setConnection] = useState({ status: "local", at: null });
  const engineRef = useRef(null);
  const activeRef = useRef(true);
  useEffect(() => {
    activeRef.current = true;
    if (!supabase)
      return () => {
        activeRef.current = false;
      };
    let alive = true,
      eventSeen = false;
    function accept(next, event) {
      if (!alive) return;
      const owner = next?.user.id || null;
      if (
        owner !== store.getSnapshot().ownerId ||
        (owner && !engineRef.current)
      ) {
        store.switchOwner(owner);
        engineRef.current = owner
          ? new SyncEngine(store, createTransport(supabase, validIds))
          : null;
        setConnection({ status: owner ? "pending" : "local", at: null });
      }
      setSession(next);
      setReady(true);
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
      if (!owner) setRecovery(false);
    }
    const { data } = supabase.auth.onAuthStateChange((event, next) => {
      eventSeen = true;
      accept(next, event);
    });
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!eventSeen) accept(data.session, "INITIAL_SESSION");
        if (error && alive) setConnection({ status: "error", at: null });
      })
      .catch(() => {
        if (alive) {
          setReady(true);
          setConnection({ status: "error", at: null });
        }
      });
    return () => {
      alive = false;
      activeRef.current = false;
      data.subscription.unsubscribe();
    };
  }, []);
  const syncNow = useCallback(async () => {
    const engine = engineRef.current;
    const epoch = store.getSnapshot().epoch;
    if (!engine) return;
    if (!navigator.onLine) {
      setConnection((c) => ({ ...c, status: "offline" }));
      return;
    }
    setConnection((c) => ({ ...c, status: "syncing" }));
    try {
      const result = await engine.sync();
      if (
        !activeRef.current ||
        epoch !== store.getSnapshot().epoch ||
        engine !== engineRef.current ||
        result.status === "cancelled"
      )
        return;
      setConnection((c) => ({
        status: result.status,
        at: result.status === "synced" ? new Date() : c.at,
      }));
    } catch {
      if (
        activeRef.current &&
        epoch === store.getSnapshot().epoch &&
        engine === engineRef.current
      )
        setConnection((c) => ({
          ...c,
          status: navigator.onLine ? "error" : "offline",
        }));
    }
  }, []);
  useEffect(() => {
    if (!snapshot.ownerId || !ready) return;
    setConnection((c) => ({
      ...c,
      status: navigator.onLine ? "pending" : "offline",
    }));
    const timer = setTimeout(syncNow, 700);
    return () => clearTimeout(timer);
  }, [snapshot.state, snapshot.ownerId, ready, syncNow]);
  useEffect(() => {
    const visible = () => {
      if (document.visibilityState === "visible") syncNow();
    };
    const offline = () => {
      if (store.getSnapshot().ownerId)
        setConnection((c) => ({ ...c, status: "offline" }));
    };
    const changed = (event) => {
      if (event.key === store.key()) store.absorbStored();
    };
    window.addEventListener("online", syncNow);
    window.addEventListener("offline", offline);
    window.addEventListener("focus", visible);
    window.addEventListener("storage", changed);
    document.addEventListener("visibilitychange", visible);
    const interval = setInterval(visible, 20000);
    return () => {
      clearInterval(interval);
      window.removeEventListener("online", syncNow);
      window.removeEventListener("offline", offline);
      window.removeEventListener("focus", visible);
      window.removeEventListener("storage", changed);
      document.removeEventListener("visibilitychange", visible);
    };
  }, [syncNow]);
  async function auth(action, email, password) {
    if (!supabase) throw new Error("云同步暂不可用。");
    let result;
    if (action === "login")
      result = await supabase.auth.signInWithPassword({ email, password });
    else if (action === "register")
      result = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: authRedirect() },
      });
    else if (action === "forgot")
      result = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: authRedirect(),
      });
    else if (action === "password")
      result = await supabase.auth.updateUser({ password });
    else if (action === "logout")
      result = await supabase.auth.signOut({ scope: "local" });
    if (result?.error) throw new Error(authMessage(result.error));
    if (action === "password") setRecovery(false);
    return result;
  }
  const label = !snapshot.ownerId
    ? "邮箱登录"
    : {
        synced: "进度已同步",
        syncing: "正在同步",
        pending: "等待同步",
        offline: "离线，稍后同步",
        error: "同步待重试",
      }[connection.status] || "等待同步";
  return {
    state: snapshot.state,
    setState: store.update,
    storageError: snapshot.storageError,
    ready,
    importBackup: store.importBackup,
    cloud: {
      configured: !!supabase,
      configError,
      session,
      recovery,
      connection,
      label,
      auth,
      retry: syncNow,
      guestAvailable: snapshot.guestAvailable,
      importGuest: store.importGuest,
      dismissGuest: store.dismissGuest,
    },
  };
}
