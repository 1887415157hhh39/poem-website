import { createClient } from "@supabase/supabase-js";
import { publicCloudConfig } from "./cloud-config.mjs";
import { validateSyncState } from "./sync-state.mjs";
let config = null;
export let configError = false;
try {
  config = publicCloudConfig(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  );
} catch {
  configError = true;
}
export const supabase = config
  ? createClient(config.url, config.key, {
      auth: {
        storageKey: "wengu-auth-v1",
        flowType: "implicit",
        detectSessionInUrl: true,
        persistSession: true,
        autoRefreshToken: true,
      },
    })
  : null;
export const authRedirect = () => location.origin + location.pathname;
export function createTransport(client, validIds) {
  let cached = null;
  function check(row) {
    if (!row) return null;
    if (!Number.isSafeInteger(row.revision) || row.revision < 1)
      throw new Error("云端进度版本无效。");
    return { ...row, payload: validateSyncState(row.payload, validIds) };
  }
  return {
    async read(ownerId) {
      const version = await client
        .from("wengu_progress")
        .select("revision")
        .eq("user_id", ownerId)
        .maybeSingle();
      if (version.error) throw version.error;
      if (!version.data) {
        cached = null;
        return null;
      }
      if (
        cached?.ownerId === ownerId &&
        cached.revision === version.data.revision
      )
        return cached;
      const result = await client
        .from("wengu_progress")
        .select("payload,revision")
        .eq("user_id", ownerId)
        .maybeSingle();
      if (result.error) throw result.error;
      const row = check(result.data);
      cached = row ? { ...row, ownerId } : null;
      return cached;
    },
    async compareAndSet(ownerId, payload, revision) {
      const result = await client.rpc("wengu_sync_progress", {
        p_user_id: ownerId,
        p_payload: payload,
        p_expected_revision: revision,
      });
      if (result.error) throw result.error;
      const row = check(result.data);
      if (!row || typeof row.applied !== "boolean")
        throw new Error("云端进度响应无效。");
      cached = { ...row, ownerId };
      return row;
    },
  };
}
export function authMessage(error) {
  const message = String(error?.message || "");
  if (/invalid login credentials/i.test(message))
    return "邮箱或密码不正确，请检查后重试。";
  if (/email not confirmed/i.test(message))
    return "请先打开邮箱中的确认邮件，完成验证后再登录。";
  if (/rate limit|too many requests|security purposes/i.test(message))
    return "请求过于频繁，请稍后再试，并检查垃圾邮件。";
  if (
    /email address.*not authorized|email address.*invalid|not allowed/i.test(
      message,
    )
  )
    return "当前邮件服务仅支持项目成员邮箱，请使用注册 Supabase 时的邮箱。";
  if (/same password/i.test(message)) return "新密码需要与原密码不同。";
  if (/password/i.test(message))
    return "密码不符合要求，请使用至少8位、包含字母和数字的密码。";
  if (/fetch|network|offline/i.test(message))
    return "暂时无法连接，请检查网络后重试。";
  return "操作未完成，请稍后重试；如果已注册，也可以直接尝试登录。";
}
