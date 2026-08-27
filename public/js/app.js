// ── Smart Study Planner — app.js ─────────────────────────
// All API calls go to /api/* (served by Express on port 3000)

const API = "";          // empty = same origin
let allSubjects = [];
let allTasks    = [];
let activeSubjectId = null;  // null = show all
let activeFilter    = "all";
let selectedColor   = "#6366f1";
let searchQuery     = "";

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
const themeToggle    = document.getElementById("themeToggle");

// ── Theme (dark / light) ─────────────────────────────────
function applyTheme(theme) {
  if (theme === "light") {
    document.documentElement.setAttribute("data-theme", "light");
    themeToggle.textContent = "☀️";
  } else {
    document.documentElement.removeAttribute("data-theme");
    themeToggle.textContent = "🌙";
  }
}
const storedTheme = localStorage.getItem("theme");
const systemPrefersLight = window.matchMedia && window.matchMedia("(prefers-color-scheme: light)").matches;
applyTheme(storedTheme || (systemPrefersLight ? "light" : "dark"));

themeToggle.addEventListener("click", () => {
  const isLight = document.documentElement.getAttribute("data-theme") === "light";
  const next = isLight ? "dark" : "light";
  localStorage.setItem("theme", next);
  applyTheme(next);
});

// ── Initialise ───────────────────────────────────────────
(async () => {
  await loadSubjects();
  await loadTasks();
  updateStats();
  checkDeadlineReminders();
  setInterval(checkDeadlineReminders, 30 * 60 * 1000);
})();

// ── Deadline reminders ────────────────────────────────────
const enableRemindersBtn = document.getElementById("enableReminders");
updateReminderButtonLabel();

enableRemindersBtn.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("Notifications aren't supported in this browser", true);
    return;
  }
  const permission = await Notification.requestPermission();
  updateReminderButtonLabel();
  if (permission === "granted") {
    showToast("Reminders enabled 🔔");
    checkDeadlineReminders();
  } else if (permission === "denied") {
    showToast("Reminders blocked — enable notifications in your browser settings", true);
  }
});

function updateReminderButtonLabel() {
  if (!("Notification" in window)) return;
  enableRemindersBtn.textContent = Notification.permission === "granted"
    ? "🔔 Reminders On" : "🔔 Enable Deadline Reminders";
}

function checkDeadlineReminders() {
  if (!("Notification" in window) || Notification.permission !== "granted") return;

  const todayKey = new Date().toISOString().slice(0, 10);
  const notifiedKey = "notifiedTasks_" + todayKey;
  const notified = new Set(JSON.parse(localStorage.getItem(notifiedKey) || "[]"));

  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  allTasks
    .filter(t => !t.completed && t.deadline && !notified.has(t.id))
    .forEach(t => {
      const d = new Date(t.deadline + "T00:00:00");
      if (d <= in24h) {
        const subj = allSubjects.find(s => s.id === t.subjectId);
        new Notification("📚 Deadline coming up", {
          body: `${t.title}${subj ? " · " + subj.name : ""} — due ${t.deadline}`,
          tag: t.id,
        });
        notified.add(t.id);
      }
    });

  localStorage.setItem(notifiedKey, JSON.stringify([...notified]));
}

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
    renderWeekChart(stats.weekly || []);
  } catch (e) { /* non-critical */ }
}

function renderWeekChart(weekly) {
  const weekBars = document.getElementById("weekBars");
  const max = Math.max(1, ...weekly.map(d => d.count));
  weekBars.innerHTML = weekly.map(d => `
    <div class="week-bar-col" title="${d.count} completed on ${d.date}">
      <div class="week-bar" style="height:${Math.round((d.count / max) * 100)}%"></div>
      <span class="week-bar-label">${d.label[0]}</span>
    </div>
  `).join("");
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

  // Filter by search query (title + notes)
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    tasks = tasks.filter(t =>
      t.title.toLowerCase().includes(q) || (t.notes || "").toLowerCase().includes(q)
    );
  }

  // Sort: incomplete first, then manual drag order (if set), then deadline, then priority weight
  const pw = { high: 0, medium: 1, low: 2 };
  tasks.sort((a, b) => {
    if (a.completed !== b.completed) return a.completed ? 1 : -1;
    if (a.order != null && b.order != null) return a.order - b.order;
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
  // Completed tasks always sort after pending ones (see renderTasks), so
  // letting them be dragged into the pending group would just snap back
  // on the next render — only pending cards are meaningfully reorderable.
  card.draggable = !task.completed;
  card.addEventListener("dragstart", () => card.classList.add("dragging"));
  card.addEventListener("dragend", () => {
    card.classList.remove("dragging");
    commitReorder();
  });

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
      ${task.repeat ? `<span class="tag tag-repeat">🔁 ${task.repeat}</span>` : ""}
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

// ── Drag-and-drop reordering ─────────────────────────────
taskGrid.addEventListener("dragover", (e) => {
  const dragging = taskGrid.querySelector(".dragging");
  if (!dragging) return;
  e.preventDefault();
  const after = getDragAfterElement(taskGrid, e.clientY);
  if (after == null) taskGrid.appendChild(dragging);
  else taskGrid.insertBefore(dragging, after);
});

function getDragAfterElement(container, y) {
  const cards = [...container.querySelectorAll(".task-card:not(.dragging)")];
  return cards.reduce((closest, card) => {
    const box = card.getBoundingClientRect();
    const offset = y - box.top - box.height / 2;
    if (offset < 0 && offset > closest.offset) return { offset, element: card };
    return closest;
  }, { offset: -Infinity, element: null }).element;
}

function commitReorder() {
  const visibleIds = [...taskGrid.querySelectorAll(".task-card")].map(c => c.dataset.id);
  if (visibleIds.length < 2) return;

  const globalOrder = [...allTasks]
    .sort((a, b) => (a.order ?? Infinity) - (b.order ?? Infinity))
    .map(t => t.id);

  let insertAt = 0;
  for (const id of globalOrder) {
    if (visibleIds.includes(id)) break;
    insertAt++;
  }
  const withoutVisible = globalOrder.filter(id => !visibleIds.includes(id));
  const merged = [
    ...withoutVisible.slice(0, insertAt),
    ...visibleIds,
    ...withoutVisible.slice(insertAt),
  ];

  merged.forEach((id, idx) => {
    const task = allTasks.find(t => t.id === id);
    if (task && task.order !== idx) {
      task.order = idx;
      apiFetch(`/api/tasks/${id}`, { method: "PATCH", body: JSON.stringify({ order: idx }) })
        .catch(() => {});
    }
  });
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
  const { task: updated, nextTask } = await apiFetch(`/api/tasks/${id}/toggle`, { method: "PATCH" });
  const idx = allTasks.findIndex(t => t.id === id);
  if (idx !== -1) allTasks[idx] = updated;
  if (nextTask) {
    allTasks.push(nextTask);
    showToast(`Recurring task renewed — next due ${nextTask.deadline} 🔁`);
  }
  renderSubjects(); // update counts if a recurring task was added
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
  document.getElementById("taskRepeat").value   = "none";
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
  const repeat    = document.getElementById("taskRepeat").value;
  const notes     = document.getElementById("taskNotes").value.trim();
  if (!title) { shakeInput("taskTitle"); return; }
  try {
    await addTask({ title, subjectId, deadline, priority, repeat, notes });
    closeModal("taskModal");
  } catch (e) { showToast("Error: " + e.message, true); }
});

// ── Search ────────────────────────────────────────────────
document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value.trim();
  renderTasks();
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
