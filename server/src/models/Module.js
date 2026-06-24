import mongoose from "mongoose";

import { getNextSequence } from "./Counter.js";

const moduleSchema = new mongoose.Schema(
  {
    module_id: { type: Number, unique: true, index: true },
    module_name: { type: String, required: true, trim: true },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

moduleSchema.index({ owner: 1, module_name: 1 }, { unique: true });

moduleSchema.pre("validate", async function assignModuleId(next) {
  if (!this.module_id) {
    this.module_id = await getNextSequence("module_id");
  }
  next();
});

export const Module =
  mongoose.models.Module || mongoose.model("Module", moduleSchema);
