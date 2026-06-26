import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import {
  interactionTypes,
  interventionOutcomes,
  Intervention,
  issueCategories,
} from "../models/Intervention.js";
import { Student } from "../models/Student.js";

const router = Router();
router.use(requireAuth);

function escapeRegex(raw) {
  return raw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function serializeIntervention(row) {
  return {
    id: row._id.toString(),
    student_id: row.student_id,
    student_name: row.student_name,
    interaction_type: row.interaction_type,
    outcome: row.outcome,
    issue_category: row.issue_category,
    notes: row.notes,
    action_item: row.action_item,
    next_planned_contact: row.next_planned_contact
      ? new Date(row.next_planned_contact).toISOString()
      : null,
    logged_by: row.logged_by?.toString?.() ?? null,
    logged_by_name: row.logged_by_name,
    created_at: new Date(row.created_at).toISOString(),
    updated_at: new Date(row.updated_at).toISOString(),
  };
}

router.get("/students", async (req, res) => {
  const limit = Math.max(1, Math.min(80, Number(req.query.limit ?? 30)));
  const search = String(req.query.search ?? "").trim();

  const filter = {};

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ student_id: regex }, { full_name: regex }];
  }

  const rows = await Student.find(filter)
    .sort({ student_id: 1 })
    .limit(limit)
    .select("student_id full_name assigned_sst status")
    .lean();

  return res.json({
    rows: rows.map((student) => ({
      student_id: student.student_id,
      full_name: student.full_name,
      assigned_sst: student.assigned_sst?.toString?.() ?? null,
      status: student.status,
    })),
  });
});

router.get("/", async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 8)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const search = String(req.query.search ?? "").trim();
  const outcome = String(req.query.outcome ?? "all").trim();
  const issueCategory = String(req.query.issue_category ?? "all").trim();

  const filter = {};

  if (outcome !== "all") {
    filter.outcome = outcome;
  }

  if (issueCategory !== "all") {
    filter.issue_category = issueCategory;
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [
      { student_id: regex },
      { student_name: regex },
      { notes: regex },
      { action_item: regex },
      { interaction_type: regex },
    ];
  }

  const [rows, totalCount] = await Promise.all([
    Intervention.find(filter)
      .sort({ created_at: -1 })
      .skip(offset)
      .limit(limit),
    Intervention.countDocuments(filter),
  ]);

  return res.json({
    rows: rows.map(serializeIntervention),
    totalCount,
  });
});

router.post("/", async (req, res) => {
  const {
    student_id,
    interaction_type,
    outcome,
    issue_category,
    notes,
    action_item,
    next_planned_contact,
  } = req.body ?? {};

  const normalizedStudentId = String(student_id ?? "").trim();
  const normalizedInteractionType = String(interaction_type ?? "").trim();
  const normalizedOutcome = String(outcome ?? "").trim();
  const normalizedIssueCategory = String(issue_category ?? "").trim();
  const normalizedNotes = String(notes ?? "").trim();
  const normalizedActionItem = String(action_item ?? "").trim();

  if (!normalizedStudentId) {
    return res.status(400).json({ message: "student_id is required" });
  }

  if (!interactionTypes.includes(normalizedInteractionType)) {
    return res.status(400).json({ message: "Invalid interaction_type" });
  }

  if (!interventionOutcomes.includes(normalizedOutcome)) {
    return res.status(400).json({ message: "Invalid outcome" });
  }

  if (!issueCategories.includes(normalizedIssueCategory)) {
    return res.status(400).json({ message: "Invalid issue_category" });
  }

  if (!normalizedNotes) {
    return res.status(400).json({ message: "notes is required" });
  }

  if (!normalizedActionItem) {
    return res.status(400).json({ message: "action_item is required" });
  }

  if (!next_planned_contact) {
    return res
      .status(400)
      .json({ message: "next_planned_contact is required" });
  }

  const nextPlannedContactDate = new Date(String(next_planned_contact));
  if (Number.isNaN(nextPlannedContactDate.getTime())) {
    return res.status(400).json({ message: "Invalid next_planned_contact" });
  }

  const student = await Student.findOne({ student_id: normalizedStudentId })
    .select("_id student_id full_name")
    .lean();

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const created = await Intervention.create({
    student: student._id,
    student_id: student.student_id,
    student_name: student.full_name ?? null,
    interaction_type: normalizedInteractionType,
    outcome: normalizedOutcome,
    issue_category: normalizedIssueCategory,
    notes: normalizedNotes,
    action_item: normalizedActionItem,
    next_planned_contact: nextPlannedContactDate,
    logged_by: req.user._id,
    logged_by_name: req.user.fullName,
  });

  return res.status(201).json({ intervention: serializeIntervention(created) });
});

export default router;
