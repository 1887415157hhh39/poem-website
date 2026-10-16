import { STATE_KEY, emptyState } from "./study.mjs";
import {
  canonical,
  mergeProgress,
  stampChanges,
  validateSyncState,
} from "./sync-state.mjs";
const IMPORT_KEY = STATE_KEY + ":guest-claimed";
export class ProgressStore {
  constructor({ storage, validIds }) {
    this.storage = storage;
    this.validIds = validIds;
    this.listeners = new Set();
    this.snapshot = {
      state: this.read(STATE_KEY),
      ownerId: null,
      epoch: 0,
      storageError: false,
      guestAvailable: false,
    };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };
  key(owner = this.snapshot.ownerId) {
    return owner ? `${STATE_KEY}:account:${owner}` : STATE_KEY;
  }
  read(key) {
    try {
      const raw = this.storage.getItem(key);
      return raw
        ? validateSyncState(JSON.parse(raw), this.validIds)
        : emptyState();
    } catch {
      return emptyState();
    }
  }
  emit(next) {
    this.snapshot = next;
    for (const listener of this.listeners) listener();
  }
  persist(state, extra = {}) {
    let storageError = false;
    try {
      this.storage.setItem(this.key(), JSON.stringify(state));
    } catch {
      storageError = true;
    }
    this.emit({ ...this.snapshot, ...extra, state, storageError });
  }
  update = (updater) => {
    const before = this.snapshot.state;
    const candidate = typeof updater === "function" ? updater(before) : updater;
    const next = stampChanges(
      before,
      validateSyncState(candidate, this.validIds),
    );
    if (canonical(next) !== canonical(before)) this.persist(next);
  };
  switchOwner(ownerId) {
    ownerId = ownerId || null;
    if (this.snapshot.ownerId === ownerId) return;
    const guest = this.read(STATE_KEY);
    let claimed = null;
    try {
      claimed = JSON.parse(this.storage.getItem(IMPORT_KEY) || "null");
    } catch {}
    const meaningful =
      Object.keys(guest.learning).length ||
      guest.history.length ||
      Object.keys(guest.mistakes).length ||
      canonical(guest.settings) !== canonical(emptyState().settings);
    const alreadyClaimed = claimed?.fingerprint === canonical(guest);
    this.emit({
      state: this.read(this.key(ownerId)),
      ownerId,
      epoch: this.snapshot.epoch + 1,
      storageError: false,
      guestAvailable: !!ownerId && !!meaningful && !alreadyClaimed,
    });
  }
  applyRemote(state, epoch) {
    if (epoch !== this.snapshot.epoch) return false;
    const merged = mergeProgress(
      this.snapshot.state,
      validateSyncState(state, this.validIds),
    );
    if (canonical(merged) !== canonical(this.snapshot.state))
      this.persist(merged);
    return true;
  }
  importGuest = () => {
    if (!this.snapshot.ownerId) return;
    const guest = this.read(STATE_KEY);
    const merged = mergeProgress(this.snapshot.state, guest);
    this.persist(merged, { guestAvailable: false });
    try {
      this.storage.setItem(
        IMPORT_KEY,
        JSON.stringify({
          fingerprint: canonical(guest),
          ownerId: this.snapshot.ownerId,
        }),
      );
    } catch {
      this.emit({ ...this.snapshot, storageError: true });
    }
  };
  dismissGuest = () => this.emit({ ...this.snapshot, guestAvailable: false });
  absorbStored = () =>
    this.applyRemote(this.read(this.key()), this.snapshot.epoch);
  importBackup = (data) => {
    const next = validateSyncState(data, this.validIds);
    if (this.snapshot.ownerId)
      this.persist(mergeProgress(this.snapshot.state, next));
    else this.update(next);
  };
}
