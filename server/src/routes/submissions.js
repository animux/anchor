import { Router } from "express";

import { requireAuth } from "../middleware/auth.js";
import { Module } from "../models/Module.js";
import { Student } from "../models/Student.js";
import { getRagFromCompletion } from "../utils/rag.js";

const router = Router();
router.use(requireAuth);

function accessibleStudentFilter(user) {
  return user.role === "admin"
    ? { status: "active" }
    : { status: "active", assigned_sst: user._id };
}

function normalizeStatus(value) {
  return ["yes", "no", "extension", "not_set"].includes(value)
    ? value
    : "not_set";
}

function matchRag(expected, rag) {
  return expected === "all" || expected === rag;
}

function isRagCountedStatus(status) {
  return status === "yes" || status === "no";
}

router.get("/modules", async (req, res) => {
  const modules = await Module.find({ owner: req.user._id })
    .sort({ module_name: 1 })
    .lean();

  return res.json({
    modules: modules.map((module) => ({
      module_id: module.module_id,
      module_name: module.module_name,
      created_at: new Date(module.created_at).toISOString(),
    })),
  });
});

router.post("/modules", async (req, res) => {
  const moduleName = String(req.body?.module_name ?? "")
    .trim()
    .replace(/\s+/g, " ");

  if (moduleName.length < 2) {
    return res
      .status(400)
      .json({ message: "Module name must be at least 2 characters" });
  }

  let module = await Module.findOne({
    owner: req.user._id,
    module_name: moduleName,
  });
  let wasCreated = false;

  if (!module) {
    module = await Module.create({
      owner: req.user._id,
      module_name: moduleName,
    });
    wasCreated = true;
  }

  const now = new Date();
  await Student.updateMany(
    {
      ...accessibleStudentFilter(req.user),
      module_submissions: { $not: { $elemMatch: { module: module._id } } },
    },
    {
      $push: {
        module_submissions: {
          module: module._id,
          module_id: module.module_id,
          module_name: module.module_name,
          module_owner: module.owner,
          status: "not_set",
          marked_by: null,
          marked_at: null,
          created_at: now,
          updated_at: now,
        },
      },
    },
  );

  return res.json({ module_name: module.module_name, was_created: wasCreated });
});

router.delete("/modules/:moduleId", async (req, res) => {
  const moduleId = Number(req.params.moduleId);

  if (!Number.isInteger(moduleId)) {
    return res.status(400).json({ message: "Invalid module id" });
  }

  const module = await Module.findOne({
    owner: req.user._id,
    module_id: moduleId,
  });
  if (!module) {
    return res.status(404).json({ message: "Module not found" });
  }

  await Student.updateMany(
    {},
    {
      $pull: {
        module_submissions: { module: module._id },
      },
    },
  );
  await module.deleteOne();

  return res.status(204).send();
});

async function buildSubmissionRows({
  user,
  limit,
  offset,
  search,
  group,
  rag,
}) {
  const modules = await Module.find({ owner: user._id })
    .sort({ module_name: 1 })
    .lean();
  const students = await Student.find(accessibleStudentFilter(user)).lean();

  const searchable = search.trim().toLowerCase();
  const groupValue = group.trim();

  const moduleIdsByObjectId = new Map(
    modules.map((module) => [module._id.toString(), String(module.module_id)]),
  );

  const rows = [];
  for (const student of students) {
    const statuses = {};
    for (const submission of student.module_submissions ?? []) {
      const moduleObjectId = submission.module?.toString?.();
      if (!moduleObjectId) continue;

      const moduleIdKey = moduleIdsByObjectId.get(moduleObjectId);
      if (!moduleIdKey) continue;

      statuses[moduleIdKey] = normalizeStatus(submission.status);
    }
    const totalModules = modules.length;
    const completedModules = Object.values(statuses).filter(
      (status) => status === "yes",
    ).length;
    const ratedModules = Object.values(statuses).filter((status) =>
      isRagCountedStatus(status),
    ).length;
    const overallRag = getRagFromCompletion(completedModules, ratedModules);

    if (searchable) {
      const haystack =
        `${student.student_id} ${student.full_name ?? ""}`.toLowerCase();
      if (!haystack.includes(searchable)) {
        continue;
      }
    }

    if (groupValue && (student.student_group ?? "") !== groupValue) {
      continue;
    }

    if (!matchRag(rag, overallRag)) {
      continue;
    }

    rows.push({
      id: student.id,
      student_id: student.student_id,
      full_name: student.full_name,
      student_group: student.student_group,
      cohort: student.cohort,
      intake: student.intake,
      study_level: student.study_level,
      overall_rag: overallRag,
      module_statuses: statuses,
      completed_modules: completedModules,
      rated_modules: ratedModules,
      total_modules: totalModules,
    });
  }

  const totalCount = rows.length;
  const pageRows = rows.slice(offset, offset + limit);

  return {
    modules,
    totalCount,
    rows: pageRows,
  };
}

router.get("/students", async (req, res) => {
  const limit = Math.max(1, Math.min(100, Number(req.query.limit ?? 20)));
  const offset = Math.max(0, Number(req.query.offset ?? 0));
  const search = String(req.query.search ?? "");
  const group = String(req.query.group ?? "");
  const rag = String(req.query.rag ?? "all");

  const { rows, totalCount } = await buildSubmissionRows({
    user: req.user,
    limit,
    offset,
    search,
    group,
    rag,
  });

  return res.json({ rows, totalCount });
});

router.get("/summary", async (req, res) => {
  const search = String(req.query.search ?? "");
  const group = String(req.query.group ?? "");
  const rag = String(req.query.rag ?? "all");

  const { rows, modules } = await buildSubmissionRows({
    user: req.user,
    limit: Number.MAX_SAFE_INTEGER,
    offset: 0,
    search,
    group,
    rag,
  });

  const summary = {
    green_count: 0,
    amber_count: 0,
    red_count: 0,
    not_set_count: 0,
    total_students: rows.length,
    total_modules: modules.length,
  };

  for (const row of rows) {
    if (row.overall_rag === "green") summary.green_count += 1;
    else if (row.overall_rag === "amber") summary.amber_count += 1;
    else if (row.overall_rag === "red") summary.red_count += 1;
    else summary.not_set_count += 1;
  }

  return res.json(summary);
});

router.put("/students/:studentId/modules/:moduleId", async (req, res) => {
  const studentId = String(req.params.studentId);
  const moduleId = Number(req.params.moduleId);
  const status = normalizeStatus(String(req.body?.status ?? "not_set"));

  const student = await Student.findOne({
    ...accessibleStudentFilter(req.user),
    student_id: studentId,
  });

  if (!student) {
    return res.status(404).json({ message: "Student not found" });
  }

  const module = await Module.findOne({
    owner: req.user._id,
    module_id: moduleId,
  });
  if (!module) {
    return res.status(404).json({ message: "Module not found" });
  }

  const now = new Date();
  const currentSubmissions = Array.isArray(student.module_submissions)
    ? [...student.module_submissions]
    : [];
  const existingIndex = currentSubmissions.findIndex(
    (submission) => submission.module?.toString?.() === module._id.toString(),
  );

  if (existingIndex >= 0) {
    currentSubmissions[existingIndex] = {
      ...currentSubmissions[existingIndex],
      module: module._id,
      module_id: module.module_id,
      module_name: module.module_name,
      module_owner: module.owner,
      status,
      marked_by: status === "not_set" ? null : req.user._id,
      marked_at: status === "not_set" ? null : now,
      updated_at: now,
    };
  } else {
    currentSubmissions.push({
      module: module._id,
      module_id: module.module_id,
      module_name: module.module_name,
      module_owner: module.owner,
      status,
      marked_by: status === "not_set" ? null : req.user._id,
      marked_at: status === "not_set" ? null : now,
      created_at: now,
      updated_at: now,
    });
  }

  student.module_submissions = currentSubmissions;
  await student.save();

  const userModules = await Module.find({ owner: req.user._id })
    .select("_id")
    .lean();
  const userModuleObjectIds = new Set(
    userModules.map((moduleDoc) => moduleDoc._id.toString()),
  );

  const completedModules = currentSubmissions.filter(
    (submission) =>
      userModuleObjectIds.has(submission.module?.toString?.()) &&
      normalizeStatus(submission.status) === "yes",
  ).length;
  const ratedModules = currentSubmissions.filter((submission) => {
    if (!userModuleObjectIds.has(submission.module?.toString?.())) {
      return false;
    }

    return isRagCountedStatus(normalizeStatus(submission.status));
  }).length;
  const overallRag = getRagFromCompletion(completedModules, ratedModules);

  return res.json({ overall_rag: overallRag });
});

export default router;
