import mongoose from "mongoose";

import { getNextSequence } from "./Counter.js";

const previousAssignedSstSchema = new mongoose.Schema(
  {
    sst_id: { type: String, required: true },
    start_date: { type: Date, default: null },
    end_date: { type: Date, default: null },
  },
  { _id: false },
);

const moduleSubmissionSchema = new mongoose.Schema(
  {
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
    },
    module_id: { type: Number, required: true },
    module_name: { type: String, required: true },
    module_owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["yes", "no", "extension", "not_set"],
      default: "not_set",
    },
    marked_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    marked_at: { type: Date, default: null },
    created_at: { type: Date, default: Date.now },
    updated_at: { type: Date, default: Date.now },
  },
  { _id: false },
);

const studentSchema = new mongoose.Schema(
  {
    id: { type: Number, unique: true, index: true },
    student_id: { type: String, required: true, unique: true, index: true },
    full_name: { type: String, default: null },
    phone: { type: String, default: null },
    personal_email: { type: String, default: null },
    school_email: { type: String, default: null },
    student_group: { type: String, default: null },
    cohort: { type: String, default: null },
    intake: { type: String, default: null },
    study_level: { type: String, default: null },
    assigned_sst: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    assignment_started_at: { type: Date, default: Date.now },
    previous_assigned_sst: { type: [previousAssignedSstSchema], default: [] },
    module_submissions: { type: [moduleSubmissionSchema], default: [] },
    status: {
      type: String,
      enum: ["active", "completed"],
      default: "active",
      index: true,
    },
    completed_at: { type: Date, default: null },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

studentSchema.pre("validate", async function assignId(next) {
  if (!this.id) {
    this.id = await getNextSequence("student_id");
  }
  next();
});

export const Student =
  mongoose.models.Student || mongoose.model("Student", studentSchema);
