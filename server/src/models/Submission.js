import mongoose from "mongoose";

const submissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
      index: true,
    },
    module: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Module",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["yes", "no", "extension", "not_set"],
      default: "not_set",
    },
  },
  { timestamps: true },
);

submissionSchema.index({ student: 1, module: 1 }, { unique: true });

export const Submission =
  mongoose.models.Submission || mongoose.model("Submission", submissionSchema);
