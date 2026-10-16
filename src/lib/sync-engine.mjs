import { emptyState } from "./study.mjs";
import { canonical, mergeProgress } from "./sync-state.mjs";
export class SyncEngine {
  constructor(store, transport) {
    this.store = store;
    this.transport = transport;
    this.pending = null;
  }
  sync() {
    if (this.pending) return this.pending;
    this.pending = this.run().finally(() => {
      this.pending = null;
    });
    return this.pending;
  }
  async run() {
    const { ownerId, epoch } = this.store.getSnapshot();
    if (!ownerId) return { status: "local" };
    const current = () => {
      const s = this.store.getSnapshot();
      return s.ownerId === ownerId && s.epoch === epoch;
    };
    let remote = await this.transport.read(ownerId);
    for (let i = 0; i < 6; i++) {
      if (!current()) return { status: "cancelled" };
      const local = this.store.getSnapshot().state;
      const merged = mergeProgress(local, remote?.payload || emptyState());
      if (remote && canonical(merged) === canonical(remote.payload)) {
        this.store.applyRemote(remote.payload, epoch);
        if (
          canonical(this.store.getSnapshot().state) ===
          canonical(remote.payload)
        )
          return { status: "synced", revision: remote.revision };
        continue;
      }
      if (!current()) return { status: "cancelled" };
      const result = await this.transport.compareAndSet(
        ownerId,
        merged,
        remote?.revision || 0,
      );
      if (!current()) return { status: "cancelled" };
      if (!result?.payload || !Number.isSafeInteger(result.revision))
        throw new Error("云端返回的进度格式不正确。");
      remote = { payload: result.payload, revision: result.revision };
      if (!result.applied) continue;
      this.store.applyRemote(remote.payload, epoch);
      if (
        canonical(this.store.getSnapshot().state) === canonical(remote.payload)
      )
        return { status: "synced", revision: remote.revision };
    }
    return { status: "pending" };
  }
}
