import mongoose from "mongoose";

const counterSchema = new mongoose.Schema(
  {
    key: { type: String, required: true, unique: true },
    value: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

const Counter =
  mongoose.models.Counter || mongoose.model("Counter", counterSchema);

export async function getNextSequence(key) {
  const doc = await Counter.findOneAndUpdate(
    { key },
    { $inc: { value: 1 } },
    { upsert: true, new: true },
  );

  return doc.value;
}
