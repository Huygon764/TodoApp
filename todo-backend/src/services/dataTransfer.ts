import {
  DayTodo, Goal, DefaultItem, RecurringTemplate, DateTemplate,
  Review, FreetimeTodo, PersonNote, Habit, HabitLog,
} from "../models/index.js";
import { Types, type Model } from "mongoose";

export const EXPORT_VERSION = 1;

type Kind = "many" | "one";
interface CollectionSpec {
  key: string;
  // Models have differing document shapes; this table only ever does
  // find/insert/delete by userId, so a permissive model type is fine here.
  model: Model<any>;
  kind: Kind;
}

/** One source of truth for every user-owned collection. Export and import
 *  both iterate this so they cannot drift. */
export const COLLECTIONS: CollectionSpec[] = [
  { key: "days", model: DayTodo, kind: "many" },
  { key: "goals", model: Goal, kind: "many" },
  { key: "defaultItems", model: DefaultItem, kind: "many" },
  { key: "recurringTemplates", model: RecurringTemplate, kind: "many" },
  { key: "dateTemplates", model: DateTemplate, kind: "many" },
  { key: "reviews", model: Review, kind: "many" },
  { key: "freetimeTodo", model: FreetimeTodo, kind: "one" },
  { key: "personNotes", model: PersonNote, kind: "many" },
  { key: "habits", model: Habit, kind: "many" },
  { key: "habitLogs", model: HabitLog, kind: "many" },
];

export interface ExportDoc {
  version: number;
  exportedAt: string;
  data: Record<string, unknown>;
}

/** Remove userId (and mongoose __v) from a lean doc; keep _id and timestamps. */
function stripUserId(doc: Record<string, unknown>): Record<string, unknown> {
  const { userId, __v, ...rest } = doc;
  void userId;
  void __v;
  return rest;
}

export async function buildExport(userId: string): Promise<ExportDoc> {
  const data: Record<string, unknown> = {};
  for (const c of COLLECTIONS) {
    if (c.kind === "one") {
      const doc = await c.model.findOne({ userId }).lean();
      data[c.key] = doc ? stripUserId(doc as Record<string, unknown>) : null;
    } else {
      const docs = await c.model.find({ userId }).lean();
      data[c.key] = (docs as Record<string, unknown>[]).map(stripUserId);
    }
  }
  return { version: EXPORT_VERSION, exportedAt: new Date().toISOString(), data };
}

/** Pure shape validation; no DB access. */
export function validateImportPayload(
  payload: unknown,
): { ok: true } | { ok: false; error: string } {
  if (payload == null || typeof payload !== "object") {
    return { ok: false, error: "Body must be a JSON object" };
  }
  const p = payload as { version?: unknown; data?: unknown };
  if (p.version !== EXPORT_VERSION) {
    return { ok: false, error: `Unsupported version (expected ${EXPORT_VERSION})` };
  }
  if (p.data == null || typeof p.data !== "object") {
    return { ok: false, error: "Missing data object" };
  }
  const data = p.data as Record<string, unknown>;
  for (const c of COLLECTIONS) {
    if (!(c.key in data)) continue; // missing key => that collection stays empty
    const value = data[c.key];
    if (c.kind === "many") {
      if (!Array.isArray(value)) {
        return { ok: false, error: `${c.key} must be an array` };
      }
    } else if (value !== null && (typeof value !== "object" || Array.isArray(value))) {
      return { ok: false, error: `${c.key} must be an object or null` };
    }
  }
  return { ok: true };
}

/** Copy a doc without its old identity so a fresh _id is assigned on insert. */
function withoutId(doc: Record<string, unknown>): Record<string, unknown> {
  const copy = { ...doc };
  delete copy._id;
  delete copy.__v;
  return copy;
}

export async function applyImport(
  userId: string,
  payload: ExportDoc,
): Promise<Record<string, number>> {
  const data = payload.data as Record<string, unknown>;
  const counts: Record<string, number> = {};

  // Replace semantics: wipe the user's data first, then insert from the file.
  for (const c of COLLECTIONS) {
    await c.model.deleteMany({ userId });
  }

  // New _ids are generated on import: the source account's documents may still
  // exist in the same database, so re-using their _ids would collide. Habits are
  // inserted first with fresh ids, and the old->new id map rewrites
  // habitLog.habitId (the only cross-document reference).
  const habitIdMap = new Map<string, Types.ObjectId>();
  const habitsSpec = COLLECTIONS.find((c) => c.key === "habits")!;
  const rawHabits = Array.isArray(data.habits)
    ? (data.habits as Record<string, unknown>[])
    : [];
  const habitDocs = rawHabits.map((h) => {
    const newId = new Types.ObjectId();
    if (h._id != null) habitIdMap.set(String(h._id), newId);
    return { ...withoutId(h), _id: newId, userId };
  });
  if (habitDocs.length > 0) await habitsSpec.model.insertMany(habitDocs);
  counts.habits = habitDocs.length;

  for (const c of COLLECTIONS) {
    if (c.key === "habits") continue;
    const value = data[c.key];

    if (c.kind === "one") {
      if (value && typeof value === "object" && !Array.isArray(value)) {
        await c.model.create({ ...withoutId(value as Record<string, unknown>), userId });
        counts[c.key] = 1;
      } else {
        counts[c.key] = 0;
      }
      continue;
    }

    const raw = Array.isArray(value) ? (value as Record<string, unknown>[]) : [];
    let docs: Record<string, unknown>[];
    if (c.key === "habitLogs") {
      docs = raw
        .map((log): Record<string, unknown> | null => {
          const mapped = habitIdMap.get(String(log.habitId));
          if (!mapped) return null; // orphan log (habit missing); skip
          return { ...withoutId(log), habitId: mapped, userId };
        })
        .filter((d): d is Record<string, unknown> => d !== null);
    } else {
      docs = raw.map((d) => ({ ...withoutId(d), userId }));
    }
    if (docs.length > 0) await c.model.insertMany(docs);
    counts[c.key] = docs.length;
  }
  return counts;
}
