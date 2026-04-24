# 📚 Smart Study Planner

A clean, full-stack study task manager built with **Node.js + Express** on the backend and **vanilla HTML/CSS/JS** on the frontend. Data is stored in a local `data.json` file — no database needed.

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
| POST | `/api/tasks` | Create task `{ title, subjectId, deadline, priority, notes }` |
| PATCH | `/api/tasks/:id/toggle` | Toggle completion |
| PATCH | `/api/tasks/:id` | Update task fields |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/stats` | Overall + per-subject progress stats |

---

## 🛠 Tech Stack

- **Backend**: Node.js, Express
- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES2020+)
- **Storage**: JSON file (`server/data.json`)
- **Fonts**: Syne (headings) + DM Sans (body) via Google Fonts

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
