import { Router } from "express";
import mongoose from "mongoose";

import { requireAuth } from "../middleware/auth.js";
import { Student } from "../models/Student.js";

const router = Router();
router.use(requireAuth);

function accessibleFilter(user) {
  return user.role === "admin" ? {} : { assigned_sst: user._id };
}

function serializeStudent(student) {
  return {
    id: student.id,
    student_id: student.student_id,
    full_name: student.full_name,
    phone: student.phone,
    personal_email: student.personal_email,
    school_email: student.school_email,
    student_group: student.student_group,
    cohort: student.cohort,
    intake: student.intake,
    study_level: student.study_level,
    assigned_sst: student.assigned_sst?.toString?.() ?? null,
    assignment_started_at: student.assignment_started_at
      ? new Date(student.assignment_started_at).toISOString()
      : null,
    previous_assigned_sst: student.previous_assigned_sst,
    status: student.status,
    completed_at: student.completed_at
      ? new Date(student.completed_at).toISOString()
      : null,
    created_at: new Date(student.created_at).toISOString(),
    updated_at: new Date(student.updated_at).toISOString(),
  };
}

router.get("/", async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const search = String(req.query.search ?? "").trim();
  const status = String(req.query.status ?? "all");
  const group = String(req.query.group ?? "").trim();

  const filter = { ...accessibleFilter(req.user) };

  if (status === "active" || status === "completed") {
    filter.status = status;
  }

  if (group) {
    filter.student_group = group;
  }

  if (search) {
    const regex = new RegExp(
      search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
      "i",
    );
    filter.$or = [
      { student_id: regex },
      { full_name: regex },
      { student_group: regex },
      { cohort: regex },
      { intake: regex },
      { study_level: regex },
    ];
  }

  const [docs, totalCount] = await Promise.all([
    Student.find(filter)
      .sort({ student_id: 1 })
      .skip(offset)
      .limit(limit)
      .lean(),
    Student.countDocuments(filter),
  ]);

  return res.json({
    rows: docs.map(serializeStudent),
    totalCount,
  });
});

router.get("/groups", async (req, res) => {
  const rows = await Student.aggregate([
    { $match: { ...accessibleFilter(req.user), student_group: { $ne: null } } },
    {
      $group: {
        _id: "$student_group",
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return res.json({ groups: rows.map((row) => row._id).filter(Boolean) });
});

router.post("/upsert", async (req, res) => {
  const {
    student_id,
    full_name,
    phone,
    personal_email,
    school_email,
    student_group,
    cohort,
    intake,
    study_level,
  } = req.body ?? {};

  if (!student_id || !full_name) {
    return res
      .status(400)
      .json({ message: "student_id and full_name are required" });
  }

  const normalizedStudentId = String(student_id).trim();
  const now = new Date();

  const existing = await Student.findOne({ student_id: normalizedStudentId });
  if (existing) {
    const allowed =
      req.user.role === "admin" ||
      existing.assigned_sst.toString() === req.user._id.toString();

    if (!allowed) {
      return res.status(403).json({ message: "Forbidden" });
    }

    existing.full_name = full_name ?? null;
    existing.phone = phone ?? null;
    existing.personal_email = personal_email ?? null;
    existing.school_email = school_email ?? null;
    existing.student_group = student_group ?? null;
    existing.cohort = cohort ?? null;
    existing.intake = intake ?? null;
    existing.study_level = study_level ?? null;
    existing.status = "active";
    existing.completed_at = null;
    await existing.save();

    return res.json({ student: serializeStudent(existing) });
  }

  const created = await Student.create({
    student_id: normalizedStudentId,
    full_name: full_name ?? null,
    phone: phone ?? null,
    personal_email: personal_email ?? null,
    school_email: school_email ?? null,
    student_group: student_group ?? null,
    cohort: cohort ?? null,
    intake: intake ?? null,
    study_level: study_level ?? null,
    assigned_sst: req.user._id,
    assignment_started_at: now,
    status: "active",
    completed_at: null,
    previous_assigned_sst: [],
  });

  return res.status(201).json({ student: serializeStudent(created) });
});

router.post("/complete", async (req, res) => {
  const studentIds = Array.isArray(req.body?.student_ids)
    ? req.body.student_ids.map((value) => String(value))
    : [];

  if (studentIds.length === 0) {
    return res
      .status(400)
      .json({ message: "student_ids must be a non-empty array" });
  }

  const docs = await Student.find({ student_id: { $in: studentIds } });
  const byStudentId = new Map(docs.map((doc) => [doc.student_id, doc]));

  const results = [];

  for (const studentId of studentIds) {
    const doc = byStudentId.get(studentId);

    if (!doc) {
      results.push({
        student_id: studentId,
        outcome: "not_found_or_forbidden",
      });
      continue;
    }

    const allowed =
      req.user.role === "admin" ||
      doc.assigned_sst.toString() === req.user._id.toString();

    if (!allowed) {
      results.push({
        student_id: studentId,
        outcome: "not_found_or_forbidden",
      });
      continue;
    }

    if (doc.status === "completed") {
      results.push({ student_id: studentId, outcome: "already_completed" });
      continue;
    }

    doc.status = "completed";
    doc.completed_at = new Date();
    await doc.save();
    results.push({ student_id: studentId, outcome: "completed" });
  }

  return res.json({ rows: results });
});

export default router;
