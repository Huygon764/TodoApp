import type { Model, FilterQuery, Document } from "mongoose";

export async function getOrCreate<T extends Document>(
  model: Model<T>,
  query: FilterQuery<T>,
  defaults: Record<string, unknown> = {}
): Promise<T> {
  let doc = await model.findOne(query);
  if (!doc) {
    doc = await model.create({ ...query, ...defaults });
  }
  return doc;
}
