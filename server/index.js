const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// ── Middleware ──────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "../public")));

// ── Helpers ─────────────────────────────────────────────────
function readData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { subjects: [], tasks: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  return JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
}

function writeData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Subject Routes ───────────────────────────────────────────
// GET all subjects
app.get("/api/subjects", (req, res) => {
  const data = readData();
  res.json(data.subjects);
});

// POST create a subject
app.post("/api/subjects", (req, res) => {
  const { name, color } = req.body;
  if (!name || !name.trim()) {
    return res.status(400).json({ error: "Subject name is required." });
  }
  const data = readData();
  const newSubject = {
    id: generateId(),
    name: name.trim(),
    color: color || "#6366f1",
    createdAt: new Date().toISOString(),
  };
  data.subjects.push(newSubject);
  writeData(data);
  res.status(201).json(newSubject);
});

// DELETE a subject (also removes its tasks)
app.delete("/api/subjects/:id", (req, res) => {
  const data = readData();
  const exists = data.subjects.find((s) => s.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Subject not found." });

  data.subjects = data.subjects.filter((s) => s.id !== req.params.id);
  data.tasks = data.tasks.filter((t) => t.subjectId !== req.params.id);
  writeData(data);
  res.json({ message: "Subject deleted." });
});

// ── Task Routes ──────────────────────────────────────────────
// GET all tasks (optional ?subjectId= filter)
app.get("/api/tasks", (req, res) => {
  const data = readData();
  const { subjectId } = req.query;
  const tasks = subjectId
    ? data.tasks.filter((t) => t.subjectId === subjectId)
    : data.tasks;
  res.json(tasks);
});

// POST create a task
app.post("/api/tasks", (req, res) => {
  const { title, subjectId, deadline, priority, notes } = req.body;
  if (!title || !title.trim()) {
    return res.status(400).json({ error: "Task title is required." });
  }
  if (!subjectId) {
    return res.status(400).json({ error: "subjectId is required." });
  }
  const data = readData();
  const subjectExists = data.subjects.find((s) => s.id === subjectId);
  if (!subjectExists) {
    return res.status(404).json({ error: "Subject not found." });
  }
  const newTask = {
    id: generateId(),
    title: title.trim(),
    subjectId,
    deadline: deadline || null,
    priority: priority || "medium", // low | medium | high
    notes: notes || "",
    completed: false,
    createdAt: new Date().toISOString(),
  };
  data.tasks.push(newTask);
  writeData(data);
  res.status(201).json(newTask);
});

// PATCH toggle task completion
app.patch("/api/tasks/:id/toggle", (req, res) => {
  const data = readData();
  const task = data.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found." });

  task.completed = !task.completed;
  task.completedAt = task.completed ? new Date().toISOString() : null;
  writeData(data);
  res.json(task);
});

// PATCH update a task
app.patch("/api/tasks/:id", (req, res) => {
  const data = readData();
  const task = data.tasks.find((t) => t.id === req.params.id);
  if (!task) return res.status(404).json({ error: "Task not found." });

  const { title, deadline, priority, notes, order } = req.body;
  if (title !== undefined) task.title = title.trim();
  if (deadline !== undefined) task.deadline = deadline;
  if (priority !== undefined) task.priority = priority;
  if (notes !== undefined) task.notes = notes;
  if (order !== undefined) task.order = order;

  writeData(data);
  res.json(task);
});

// DELETE a task
app.delete("/api/tasks/:id", (req, res) => {
  const data = readData();
  const exists = data.tasks.find((t) => t.id === req.params.id);
  if (!exists) return res.status(404).json({ error: "Task not found." });

  data.tasks = data.tasks.filter((t) => t.id !== req.params.id);
  writeData(data);
  res.json({ message: "Task deleted." });
});

// ── Stats Route ──────────────────────────────────────────────
app.get("/api/stats", (req, res) => {
  const data = readData();
  const total = data.tasks.length;
  const completed = data.tasks.filter((t) => t.completed).length;
  const bySubject = data.subjects.map((s) => {
    const sTasks = data.tasks.filter((t) => t.subjectId === s.id);
    const sCompleted = sTasks.filter((t) => t.completed).length;
    return {
      id: s.id,
      name: s.name,
      color: s.color,
      total: sTasks.length,
      completed: sCompleted,
      percent: sTasks.length ? Math.round((sCompleted / sTasks.length) * 100) : 0,
    };
  });
  // Completions per day for the last 7 days (Mon-first), based on completedAt
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    days.push(d);
  }
  const weekly = days.map((d) => {
    const key = d.toISOString().slice(0, 10);
    const count = data.tasks.filter((t) => t.completedAt && t.completedAt.slice(0, 10) === key).length;
    return { date: key, label: d.toLocaleDateString("en-US", { weekday: "short" }), count };
  });

  res.json({ total, completed, percent: total ? Math.round((completed / total) * 100) : 0, bySubject, weekly });
});

// ── Fallback ─────────────────────────────────────────────────
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

app.listen(PORT, () => {
  console.log(`\n🎓 Smart Study Planner running at http://localhost:${PORT}\n`);
});
