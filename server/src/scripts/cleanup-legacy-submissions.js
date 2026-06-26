import mongoose from "mongoose";

import { connectDatabase } from "../config/db.js";
import { env } from "../config/env.js";
import { Submission } from "../models/Submission.js";
import { Student } from "../models/Student.js";

function normalizeStatus(value) {
  return ["yes", "no", "extension", "not_set"].includes(value)
    ? value
    : "not_set";
}

function hasFlag(flag) {
  return process.argv.slice(2).includes(flag);
}

async function main() {
  const shouldApply = hasFlag("--apply");
  const force = hasFlag("--force");

  await connectDatabase(env.mongodbUri);

  const legacyRows = await Submission.find()
    .select("student module status")
    .lean();

  if (legacyRows.length === 0) {
    console.log("No legacy Submission documents found. Nothing to clean up.");
    await mongoose.disconnect();
    return;
  }

  const studentIds = [
    ...new Set(legacyRows.map((row) => row.student.toString())),
  ];
  const students = await Student.find({ _id: { $in: studentIds } })
    .select("_id module_submissions")
    .lean();

  const studentsById = new Map(
    students.map((student) => [student._id.toString(), student]),
  );

  let missingStudents = 0;
  let missingEmbeddedSubmission = 0;
  let statusMismatch = 0;

  for (const row of legacyRows) {
    const student = studentsById.get(row.student.toString());
    if (!student) {
      missingStudents += 1;
      continue;
    }

    const embedded = (student.module_submissions ?? []).find(
      (entry) => entry.module?.toString?.() === row.module.toString(),
    );

    if (!embedded) {
      missingEmbeddedSubmission += 1;
      continue;
    }

    if (normalizeStatus(embedded.status) !== normalizeStatus(row.status)) {
      statusMismatch += 1;
    }
  }

  const issues = missingStudents + missingEmbeddedSubmission + statusMismatch;

  console.log("Legacy cleanup check summary:");
  console.log(`- Legacy documents: ${legacyRows.length}`);
  console.log(`- Missing students: ${missingStudents}`);
  console.log(`- Missing embedded entries: ${missingEmbeddedSubmission}`);
  console.log(`- Status mismatches: ${statusMismatch}`);

  if (!shouldApply) {
    console.log(
      "Dry run mode. Re-run with --apply to delete legacy documents.",
    );
    await mongoose.disconnect();
    return;
  }

  if (issues > 0 && !force) {
    console.error(
      "Aborting delete because migration checks found issues. Resolve them or run with --force.",
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  const result = await Submission.deleteMany({});
  console.log(`Deleted ${result.deletedCount} legacy Submission documents.`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Legacy cleanup failed:", error);
  try {
    await mongoose.disconnect();
  } catch {
    // Ignore disconnect failures during fatal exit.
  }
  process.exit(1);
});
