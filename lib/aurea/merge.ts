/**
 * Three-way merge for planner snapshots.
 *
 * `base` is the last version this device and the cloud agreed on, `local` is this
 * device's current state and `remote` is what another device saved since. Changes
 * from both sides are kept; only when the same field changed on both sides does the
 * local edit win (it is the one the person is looking at).
 *
 * - Lists of objects with an `id` (tasks, projects, subtasks…) merge item by item,
 *   including additions and deletions on either side.
 * - Lists of strings (completed dates, subtask ids) merge as sets.
 * - Objects merge key by key.
 */
type Json = unknown;

function isPlainObject(value: Json): value is Record<string, Json> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isIdList(value: Json): value is { id: string }[] {
  return Array.isArray(value) && value.every((item) => isPlainObject(item) && typeof item.id === "string");
}

function isStringList(value: Json): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

export function deepEqual(a: Json, b: Json): boolean {
  if (a === b) return true;
  if (Array.isArray(a) && Array.isArray(b)) return a.length === b.length && a.every((item, index) => deepEqual(item, b[index]));
  if (isPlainObject(a) && isPlainObject(b)) {
    const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
    for (const key of keys) if (!deepEqual(a[key], b[key])) return false;
    return true;
  }
  return false;
}

function mergeStringSets(base: string[], local: string[], remote: string[]) {
  const removedLocally = new Set(base.filter((item) => !local.includes(item)));
  const addedLocally = local.filter((item) => !base.includes(item));
  const result = remote.filter((item) => !removedLocally.has(item));
  for (const item of addedLocally) if (!result.includes(item)) result.push(item);
  return result;
}

function mergeIdLists(base: { id: string }[], local: { id: string }[], remote: { id: string }[]) {
  const byId = (list: { id: string }[]) => new Map(list.map((item) => [item.id, item]));
  const baseMap = byId(base), localMap = byId(local), remoteMap = byId(remote);
  const merged = new Map<string, Json>();

  const ids = new Set([...localMap.keys(), ...remoteMap.keys()]);
  for (const id of ids) {
    const b = baseMap.get(id), l = localMap.get(id), r = remoteMap.get(id);
    if (l && r) merged.set(id, merge3(b, l, r));
    else if (l && !r) {
      // Missing remotely: new here (keep), or deleted there (drop unless edited here since).
      if (!b || !deepEqual(l, b)) merged.set(id, l);
    } else if (r && !l) {
      // Missing locally: new there (keep), or deleted here (drop unless edited there since).
      if (!b || !deepEqual(r, b)) merged.set(id, r);
    }
  }

  // Keep the order of whichever side reordered; otherwise the remote order. New items go at the end.
  const sameOrder = (a: { id: string }[], c: { id: string }[]) => deepEqual(a.map((item) => item.id), c.map((item) => item.id));
  const primary = sameOrder(local, base) ? remote : local;
  const secondary = primary === remote ? local : remote;
  const ordered: Json[] = [];
  for (const item of [...primary, ...secondary]) {
    if (merged.has(item.id)) { ordered.push(merged.get(item.id)); merged.delete(item.id); }
  }
  return ordered;
}

export function merge3(base: Json, local: Json, remote: Json): Json {
  if (deepEqual(local, remote)) return local;
  if (base === undefined) {
    // Added on one side only.
    if (local === undefined) return remote;
    if (remote === undefined) return local;
  }
  if (base !== undefined && deepEqual(local, base)) return remote;
  if (base !== undefined && deepEqual(remote, base)) return local;

  if (isIdList(local) && isIdList(remote)) return mergeIdLists(isIdList(base) ? base : [], local, remote);
  if (isStringList(local) && isStringList(remote)) return mergeStringSets(isStringList(base) ? base : [], local, remote);
  if (isPlainObject(local) && isPlainObject(remote)) {
    const b = isPlainObject(base) ? base : {};
    const result: Record<string, Json> = {};
    for (const key of new Set([...Object.keys(local), ...Object.keys(remote)])) {
      const value = merge3(b[key], local[key], remote[key]);
      if (value !== undefined) result[key] = value;
    }
    return result;
  }
  // Same value changed on both sides: this device's edit wins.
  return local;
}
