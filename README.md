# 📚 Smart Study Planner

A clean, full-stack study task manager built with **Node.js + Express** on the backend and **vanilla HTML/CSS/JS** on the frontend. Data is stored in a local `data.json` file — no database needed.

![Smart Study Planner — dark mode](screenshots/dark-mode.png)

---

## 🎯 Who this is for

Built for **students juggling multiple subjects at once** — the kind of week where a JavaScript lab is due Tuesday, a machine learning reading is due Wednesday, and a group presentation is due Friday, each tracked in a different place (or not tracked at all). If you're a student, self-learner, or anyone studying several courses in parallel and want one place to see what's due, what's done, and what's slipping, this is for you.

## 🧩 The problem it solves

Coursework deadlines tend to live scattered across WhatsApp messages, lecturer announcements, sticky notes, and memory, with no single view of what actually needs doing this week and how urgent each thing is. That leads to the usual failure modes: forgotten assignments, last-minute scrambles, and no real sense of whether you're making progress across your subjects.

Smart Study Planner centralizes all of that — subjects, tasks, deadlines, and priorities in one board — with visual progress tracking so momentum is visible at a glance instead of guessed at.

---

## 🗂 Folder Structure

```
smart-study-planner/
├── server/
│   ├── index.js        ← Express API server
│   └── data.json       ← Auto-created on first run (JSON storage)
├── public/
│   ├── index.html      ← Single-page app
│   ├── css/
│   │   └── style.css
│   └── js/
│       └── app.js
├── screenshots/        ← UI screenshots used in this README
├── package.json
└── README.md
```

---

## ✨ Features

| Feature | Details |
|---|---|
| **Subjects** | Create colour-coded subjects (e.g. Maths, Physics) |
| **Tasks** | Add tasks with title, subject, deadline, priority, and notes |
| **Priorities** | 🔴 High / 🟡 Medium / 🟢 Low |
| **Deadlines** | Overdue tasks are highlighted in red |
| **Complete Tasks** | One-click checkbox to mark done |
| **Progress Bar** | Overall % progress in the sidebar, updates live |
| **Filters** | Filter by All / Pending / Completed / Priority level |
| **Delete** | Remove subjects (and their tasks) or individual tasks |
| **Persistent Storage** | All data saved to `server/data.json` — survives restarts |
| **Light / Dark Theme** | Manual toggle, persisted in `localStorage`, defaults to your OS preference on first visit |
| **Search** | Live filter tasks by title/notes, composable with the existing filters |
| **Drag & Drop** | Manually reorder tasks within the grid |
| **Deadline Reminders** | Opt-in browser notifications for tasks due within 24 hours |
| **Weekly Progress Chart** | 7-day bar chart of completions in the sidebar |
| **Recurring Tasks** | Daily/weekly tasks auto-renew with a rolled-forward deadline when completed |

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher

### 1. Install dependencies

```bash
cd smart-study-planner
npm install
```

### 2. Start the server

```bash
npm start
```

Or for **auto-restart on file changes** (great for development):

```bash
npm run dev
```

### 3. Open in browser

```
http://localhost:3000
```

---

## 🔌 API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/subjects` | List all subjects |
| POST | `/api/subjects` | Create a subject `{ name, color }` |
| DELETE | `/api/subjects/:id` | Delete subject + its tasks |
| GET | `/api/tasks` | List all tasks (optional `?subjectId=`) |
| POST | `/api/tasks` | Create task `{ title, subjectId, deadline, priority, notes, repeat }` |
| PATCH | `/api/tasks/:id/toggle` | Toggle completion — returns `{ task, nextTask }`, where `nextTask` is the auto-renewed occurrence if the task repeats |
| PATCH | `/api/tasks/:id` | Update task fields (`title`, `deadline`, `priority`, `notes`, `order`) |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/stats` | Overall + per-subject progress stats, plus a 7-day `weekly` completion breakdown |

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES2020+)
- **Storage**: JSON file (`server/data.json`)
- **Fonts**: Plus Jakarta Sans (headings) + Inter (body) via Google Fonts

---

## 💡 Ideas to Extend

- Add user authentication (e.g. with JWT)
- Replace JSON file with SQLite or MongoDB
- Add a calendar / weekly view
- Export tasks to PDF
- Add study session timer (Pomodoro)
- Deploy to Render, Railway, or Vercel

---

Made by **Muaz Ramzi**
