import mongoose from "mongoose";

export const interactionTypes = [
  "Call - Connected",
  "Call - Voicemail",
  "Call - No Answer",
  "Call - External List",
  "Email - Bulk",
  "Email - Sent",
  "Email - Reply to Student",
  "In-person",
];

export const interventionOutcomes = ["Successful", "Attempted"];

export const issueCategories = [
  "Health",
  "Admin",
  "Family",
  "Job",
  "Finance",
  "Academic",
  "Housing",
  "Visa/Immigration",
  "Other",
];

const interventionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    student_id: { type: String, required: true, index: true },
    student_name: { type: String, default: null },
    interaction_type: {
      type: String,
      enum: interactionTypes,
      required: true,
    },
    outcome: {
      type: String,
      enum: interventionOutcomes,
      required: true,
      index: true,
    },
    issue_category: {
      type: String,
      enum: issueCategories,
      required: true,
      index: true,
    },
    notes: { type: String, required: true, trim: true, maxlength: 2000 },
    action_item: {
      type: String,
      required: true,
      trim: true,
      maxlength: 1000,
    },
    next_planned_contact: { type: Date, required: true, index: true },
    logged_by: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    logged_by_name: { type: String, required: true },
  },
  { timestamps: { createdAt: "created_at", updatedAt: "updated_at" } },
);

interventionSchema.index({ created_at: -1 });

export const Intervention =
  mongoose.models.Intervention ||
  mongoose.model("Intervention", interventionSchema);
