// ── Smart Study Planner — app.js ─────────────────────────
// All API calls go to /api/* (served by Express on port 3000)

const API = "";          // empty = same origin
let allSubjects = [];
let allTasks    = [];
let activeSubjectId = null;  // null = show all
let activeFilter    = "all";
let selectedColor   = "#6366f1";

// ── DOM refs ─────────────────────────────────────────────
const subjectList    = document.getElementById("subjectList");
const taskGrid       = document.getElementById("taskGrid");
const emptyState     = document.getElementById("emptyState");
const overallPercent = document.getElementById("overallPercent");
const overallBar     = document.getElementById("overallBar");
const overallSub     = document.getElementById("overallSub");
const pageTitle      = document.getElementById("pageTitle");
const pageSub        = document.getElementById("pageSub");
const toast          = document.getElementById("toast");

// ── Initialise ───────────────────────────────────────────
(async () => {
  await loadSubjects();
  await loadTasks();
  updateStats();
})();

// ── API helpers ──────────────────────────────────────────
async function apiFetch(path, opts = {}) {
  const res = await fetch(API + path, {
    headers: { "Content-Type": "application/json" },
    ...opts,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Request failed" }));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

// ── Load data ────────────────────────────────────────────
async function loadSubjects() {
  allSubjects = await apiFetch("/api/subjects");
  renderSubjects();
}

async function loadTasks() {
  allTasks = await apiFetch("/api/tasks");
  renderTasks();
}

async function updateStats() {
  try {
    const stats = await apiFetch("/api/stats");
    overallPercent.textContent = stats.percent + "%";
    overallBar.style.width     = stats.percent + "%";
    overallSub.textContent     = `${stats.completed} / ${stats.total} tasks done`;
  } catch (e) { /* non-critical */ }
}

// ── Render Subjects ──────────────────────────────────────
function renderSubjects() {
  subjectList.innerHTML = "";
  if (allSubjects.length === 0) {
    subjectList.innerHTML = `<li style="color:var(--text-muted);font-size:13px;padding:8px 4px">No subjects yet.</li>`;
    return;
  }
  allSubjects.forEach(s => {
    const taskCount = allTasks.filter(t => t.subjectId === s.id).length;
    const li = document.createElement("li");
    li.className = "subject-item" + (activeSubjectId === s.id ? " active" : "");
    li.dataset.id = s.id;
    li.innerHTML = `
      <span class="subject-dot" style="background:${s.color}"></span>
      <span class="subject-name">${escHtml(s.name)}</span>
      <span class="subject-count">${taskCount}</span>
      <button class="subject-del" data-del="${s.id}" title="Delete subject">✕</button>
    `;
    li.addEventListener("click", (e) => {
      if (e.target.dataset.del) return;
      setActiveSubject(s.id);
    });
    li.querySelector(".subject-del").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteSubject(s.id, s.name);
    });
    subjectList.appendChild(li);
  });
}

function setActiveSubject(id) {
  activeSubjectId = id;
  activeFilter    = "all";
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
  renderSubjects();
  renderTasks();
  const subj = allSubjects.find(s => s.id === id);
  if (subj) {
    pageTitle.textContent = subj.name;
    pageSub.textContent   = "Tasks for this subject";
  }
}

// ── Render Tasks ─────────────────────────────────────────
function renderTasks() {
  // Filter by subject
  let tasks = activeSubjectId
    ? allTasks.filter(t => t.subjectId === activeSubjectId)
    : [...allTasks];

  // Filter by tab
  if (activeFilter === "pending")   tasks = tasks.filter(t => !t.completed);
  if (activeFilter === "completed") tasks = tasks.filter(t => t.completed);
  if (activeFilter === "high")      tasks = tasks.filter(t => t.priority === "high");
  if (activeFilter === "medium")    tasks = tasks.filter(t => t.priority === "medium");
  if (activeFilter === "low")       tasks = tasks.filter(t => t.priority === "low");

  // Sort: incomplete first, then by deadline, then by priority weight
  const pw = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
    if (a.deadline) return -1;
    if (b.deadline) return 1;
    return pw[a.priority] - pw[b.priority];
  });

  // Clear grid (keep empty state)
  taskGrid.innerHTML = "";

  if (tasks.length === 0) {
    taskGrid.appendChild(createEmptyState());
    return;
  }

  tasks.forEach(t => taskGrid.appendChild(createTaskCard(t)));
}

function createEmptyState() {
  const div = document.createElement("div");
  div.className = "empty-state";
  div.innerHTML = `<div class="empty-icon">📚</div><p>No tasks here. Click <strong>＋ Add Task</strong> to get started!</p>`;
  return div;
}

function createTaskCard(task) {
  const subj = allSubjects.find(s => s.id === task.subjectId);
  const color = subj ? subj.color : "#6366f1";

  const card = document.createElement("div");
  card.className = "task-card" + (task.completed ? " completed" : "");
  card.style.setProperty("--subject-color", color);
  card.dataset.id = task.id;

  const deadlineHtml = task.deadline ? (() => {
    const d = new Date(task.deadline + "T00:00:00");
    const today = new Date(); today.setHours(0,0,0,0);
    const overdue = !task.completed && d < today;
    const label = d.toLocaleDateString("en-MY", { day:"numeric", month:"short", year:"numeric" });
    return `<span class="task-deadline ${overdue ? "overdue" : ""}">📅 ${label}${overdue ? " ⚠️" : ""}</span>`;
  })() : "";

  const notesHtml = task.notes
    ? `<p class="task-notes">${escHtml(task.notes)}</p>` : "";

  card.innerHTML = `
    <div class="task-card-top">
      <div class="task-checkbox ${task.completed ? "checked" : ""}" data-toggle="${task.id}"></div>
      <span class="task-title">${escHtml(task.title)}</span>
    </div>
    <div class="task-meta">
      ${subj ? `<span class="tag tag-subject" style="--subject-color:${color}">${escHtml(subj.name)}</span>` : ""}
      <span class="tag tag-priority-${task.priority}">${priorityLabel(task.priority)}</span>
      ${deadlineHtml}
    </div>
    ${notesHtml}
    <div class="task-actions">
      <button class="task-del-btn" data-del="${task.id}">Delete</button>
    </div>
  `;

  card.querySelector(`[data-toggle]`).addEventListener("click", () => toggleTask(task.id));
  card.querySelector(`[data-del]`).addEventListener("click", () => deleteTask(task.id));
  return card;
}

function priorityLabel(p) {
  return { high: "🔴 High", medium: "🟡 Medium", low: "🟢 Low" }[p] || p;
}

// ── CRUD ─────────────────────────────────────────────────
// Subjects
async function addSubject(name, color) {
  const subj = await apiFetch("/api/subjects", {
    method: "POST",
    body: JSON.stringify({ name, color }),
  });
  allSubjects.push(subj);
  renderSubjects();
  updateStats();
  showToast(`Subject "${subj.name}" created ✦`);
}

async function deleteSubject(id, name) {
  if (!confirm(`Delete "${name}" and all its tasks?`)) return;
  await apiFetch(`/api/subjects/${id}`, { method: "DELETE" });
  allSubjects = allSubjects.filter(s => s.id !== id);
  allTasks    = allTasks.filter(t => t.subjectId !== id);
  if (activeSubjectId === id) {
    activeSubjectId = null;
    pageTitle.textContent = "All Tasks";
    pageSub.textContent   = "Track everything you need to study";
  }
  renderSubjects();
  renderTasks();
  updateStats();
  showToast(`Subject deleted`);
}

// Tasks
async function addTask(data) {
  const task = await apiFetch("/api/tasks", {
    method: "POST",
    body: JSON.stringify(data),
  });
  allTasks.push(task);
  renderSubjects(); // update counts
  renderTasks();
  updateStats();
  showToast(`Task added 🎯`);
}

async function toggleTask(id) {
  const updated = await apiFetch(`/api/tasks/${id}/toggle`, { method: "PATCH" });
  const idx = allTasks.findIndex(t => t.id === id);
  if (idx !== -1) allTasks[idx] = updated;
  renderTasks();
  updateStats();
}

async function deleteTask(id) {
  await apiFetch(`/api/tasks/${id}`, { method: "DELETE" });
  allTasks = allTasks.filter(t => t.id !== id);
  renderSubjects();
  renderTasks();
  updateStats();
  showToast(`Task removed`);
}

// ── Modal: Subject ────────────────────────────────────────
document.getElementById("openSubjectModal").addEventListener("click", () => {
  document.getElementById("subjectName").value = "";
  openModal("subjectModal");
});

// Color picker
document.getElementById("colorPicker").addEventListener("click", (e) => {
  const dot = e.target.closest(".color-dot");
  if (!dot) return;
  document.querySelectorAll(".color-dot").forEach(d => d.classList.remove("selected"));
  dot.classList.add("selected");
  selectedColor = dot.dataset.color;
});

document.getElementById("saveSubject").addEventListener("click", async () => {
  const name = document.getElementById("subjectName").value.trim();
  if (!name) { shakeInput("subjectName"); return; }
  try {
    await addSubject(name, selectedColor);
    closeModal("subjectModal");
  } catch (e) { showToast("Error: " + e.message, true); }
});

// ── Modal: Task ───────────────────────────────────────────
document.getElementById("openTaskModal").addEventListener("click", () => {
  if (allSubjects.length === 0) {
    showToast("⚠️ Add a subject first!", true);
    return;
  }
  populateSubjectDropdown();
  document.getElementById("taskTitle").value    = "";
  document.getElementById("taskNotes").value    = "";
  document.getElementById("taskDeadline").value = "";
  document.getElementById("taskPriority").value = "medium";
  openModal("taskModal");
});

function populateSubjectDropdown() {
  const sel = document.getElementById("taskSubject");
  sel.innerHTML = allSubjects.map(s =>
    `<option value="${s.id}">${escHtml(s.name)}</option>`
  ).join("");
  if (activeSubjectId) sel.value = activeSubjectId;
}

document.getElementById("saveTask").addEventListener("click", async () => {
  const title     = document.getElementById("taskTitle").value.trim();
  const subjectId = document.getElementById("taskSubject").value;
  const deadline  = document.getElementById("taskDeadline").value;
  const priority  = document.getElementById("taskPriority").value;
  const notes     = document.getElementById("taskNotes").value.trim();
  if (!title) { shakeInput("taskTitle"); return; }
  try {
    await addTask({ title, subjectId, deadline, priority, notes });
    closeModal("taskModal");
  } catch (e) { showToast("Error: " + e.message, true); }
});

// ── Filter buttons ────────────────────────────────────────
document.querySelectorAll(".filter-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    activeFilter = btn.dataset.filter;
    renderTasks();
  });
});

// ── Show all tasks ────────────────────────────────────────
document.getElementById("showAll").addEventListener("click", () => {
  activeSubjectId = null;
  activeFilter = "all";
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.toggle("active", b.dataset.filter === "all"));
  renderSubjects();
  renderTasks();
  pageTitle.textContent = "All Tasks";
  pageSub.textContent   = "Track everything you need to study";
});

// ── Modal close helpers ───────────────────────────────────
document.querySelectorAll(".modal-close").forEach(btn => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});
document.querySelectorAll(".modal-overlay").forEach(overlay => {
  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) closeModal(overlay.id);
  });
});
// ESC key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    ["subjectModal","taskModal"].forEach(closeModal);
  }
});

function openModal(id) {
  document.getElementById(id).classList.remove("hidden");
  setTimeout(() => document.querySelector(`#${id} input, #${id} select`)?.focus(), 50);
}
function closeModal(id) {
  document.getElementById(id).classList.add("hidden");
}

// ── Toast ─────────────────────────────────────────────────
let toastTimer;
function showToast(msg, isError = false) {
  toast.textContent = msg;
  toast.classList.remove("hidden");
  toast.style.borderColor = isError ? "var(--red)" : "var(--border)";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add("hidden"), 2800);
}

// ── Utils ─────────────────────────────────────────────────
function escHtml(str) {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function shakeInput(id) {
  const el = document.getElementById(id);
  el.style.borderColor = "var(--red)";
  el.focus();
  setTimeout(() => el.style.borderColor = "", 1500);
}
