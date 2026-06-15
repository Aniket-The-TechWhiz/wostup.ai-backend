# Wostup UI Design + Development Spec (for Visily)

Date: 2026-06-03

This document is aligned to the current backend implementation. Every screen and component maps to an existing API, socket event, or data model.

---

## 1) Overview + Architecture Alignment

Backend stack: Express REST APIs + MongoDB + Socket.IO.

Core modules (from server routes):
- Auth: register, login, refresh, logout, email verification, password reset.
- Workspaces: CRUD + list by user.
- Projects: CRUD + list by workspace.
- Tasks: CRUD + list by project + filter by status/user.
- Milestones: CRUD + list by project.
- Comments: CRUD inside tasks.
- Health: project health + task health summary/board/dashboard.
- Team: member creation, invite, team load board.
- Real-time: notifications, updates, online presence.

UI must map these backend features into the following high-level flows:
- Auth → workspace selection → project + task execution → health dashboards → collaboration (comments, updates, notifications).

---

## 2) Wostup Brand Design Language (Global)

### 2.1 Colors
- Primary deep blue: #1A1AFF
- Royal blue: #2B2BFF
- Violet accent: #7B2FFF
- Gradient: diagonal #1A6DFF → #9B30FF (use for CTAs, headers, hero, active states)
- Background: #F5F5FF with large curved shapes (light purple)
- Text:
  - Heading: #0D0D1A
  - Body: dark navy (#14143A)
  - Accent text: electric blue (#1A1AFF)
- Status:
  - Success: #1FD47F
  - Warning: #FFB020
  - Danger: #FF4D6D

### 2.2 Typography
- Headings: bold modern sans-serif (Poppins or Inter Bold)
- Body: clean sans-serif (Inter Regular)
- Scale: 48 / 36 / 28 / 22 / 18 / 16 / 14

### 2.3 Components + Styling
- Rounded corners (12–16px), soft shadows, glassmorphism cards.
- Gradient CTA buttons (pill shape), subtle blur on cards.
- W-shaped logo motif as background watermark or icon for sections.
- Dot-grid pattern for empty states.

---

## 3) Navigation + Layout

### 3.1 App Structure
- Public: Login, Register, Forgot Password, Reset Password, Verify Email.
- Private:
  - Workspace Selector
  - Workspace Dashboard
  - Project List
  - Project Detail (tabs: Overview, Tasks, Milestones, Comments)
  - Task Board
  - Team Load Dashboard
  - Notifications Center
  - Workspace Updates Feed
  - Settings

### 3.2 Layout
- Left rail navigation with icons + labels.
- Top bar: workspace switcher, user profile, notifications badge.
- Main content: card grid with glassmorphism cards + gradient headings.

---

## 4) Page & Component Breakdown (API Aligned)

### 4.1 Auth Screens

#### Login
- API: POST /api/auth/login
- Request:
  {
    "email": "user@example.com",
    "password": "secret"
  }
- Response:
  {
    "accessToken": "jwt",
    "refreshToken": "token",
    "user": {"id":"...","email":"...","name":"...","emailVerified":true}
  }
- States: loading spinner, error toast, success redirect.

#### Register
- API: POST /api/auth/register
- Request:
  {"email":"...","password":"...","confirmPassword":"..."}
- Response:
  {"accessToken":"jwt","user":{...},"verificationEmailSent":true}
- Validation: password length >= 6, confirm matches.

#### Forgot Password
- API: POST /api/auth/password-reset/request
- Request: {"email":"..."}
- Response: {"message":"password reset email sent"}

#### Reset Password
- API verify: POST /api/auth/password-reset/verify
- API reset: POST /api/auth/password-reset/reset
- Request: {"token":"...","password":"...","confirmPassword":"..."}

#### Verify Email
- API: GET /api/auth/email-verification/verify?token=...

---

### 4.2 Workspace Selector

#### Workspace List
- API: GET /api/workspaces/v1/user/:userid
- Response: Workspace[]

#### Create Workspace
- API: POST /api/workspaces/v1/:userid/createWorkspace
- Request:
  {"name":"Workspace A","description":"...","settings":{}}
- Response: Workspace object

---

### 4.3 Workspace Dashboard

Widgets:
- Projects summary
- Task health summary
- Team load snapshot
- Recent updates
- Notifications badge

APIs:
- Projects: GET /api/projects/v1/getProjects/:workspaceId
- Task health: GET /api/task-health/v1/dashboard
- Team load: GET /api/team-load/v1/dashboard
- Updates: Socket get_workspace_updates
- Notifications: Socket events

---

### 4.4 Project List + Detail

#### Project List
- API: GET /api/projects/v1/getProjects/:workspaceId
- Response: {"data": [Project]}

#### Create Project
- API: POST /api/projects/v1/createProject
- Request:
  {"workspaceId":"...","name":"...","status":"active","description":"...","progress":0,"dueDate":"2026-06-01"}
- Response: {"message":"project created"}

#### Project Detail
- API: GET /api/projects/v1/getProjectById/:projectId
- Response: {"data": Project}

Tabs:
- Overview: progress, due date, description.
- Tasks: task list + create task.
- Milestones: milestone list + create milestone.
- Comments: task comments.

---

### 4.5 Tasks

#### Task List (By Project)
- API: GET /api/tasks/v1/getAllTasks/:projectId
- Response: {"message": [Task]}

#### Create Task
- API: POST /api/tasks/v1/createTask
- Request:
  {
    "workspaceId":"...",
    "title":"...",
    "description":"...",
    "status":"todo",
    "actualProgress":0,
    "assigneeUserId":"...",
    "projectId":"...",
    "milestoneId":"...",
    "dueDate":"2026-06-01",
    "dependency":[]
  }
- Response: {"message":"task created","data": Task}

#### Update Task
- API: PUT /api/tasks/v1/updateTask/:taskId
- Request: partial fields
- Response: {"message":"task updated","data":...}

#### Filter Tasks (My Tasks)
- API: GET /api/tasks/v1/filterTasks/:status/:userid
- Response: {"data": [Task]}

---

### 4.6 Milestones

- List: GET /api/milestones/v1/getAllMilestones/:projectId
- Create: POST /api/milestones/v1/createMilestone
- Update: PUT /api/milestones/v1/updateMilestone/:milestoneId
- Delete: DELETE /api/milestones/v1/deleteMilestone/:milestoneId

---

### 4.7 Comments

- List: GET /api/comments/v1/getAllComments/:taskId
- Create: POST /api/comments/v1/createComment/:taskId
- Update: PUT /api/comments/v1/updateComment/:taskId/:commentId/:userId
- Delete: DELETE /api/comments/v1/deleteComment/:taskId/:commentId

---

### 4.8 Team Load Dashboard

- API: GET /api/team-load/v1/dashboard
- Request (query or body):
  {"workspaceId":"...","projectId":"..."}
- Response:
  {
    "totalMembers":2,
    "overloadedMembers":1,
    "underloadedMembers":0,
    "averageLoadScore":4.2,
    "members":[...]
  }

---

### 4.9 Project Health Dashboard

- API: GET /api/projectHealth/v1/:workspaceId
- Response:
  [{"projectId":"...","projectName":"...","status":"green","completedTasks":3,"totalTasks":10,"progress":40,"daysRemaining":12,"blockers":1}]

---

### 4.10 Task Health Dashboard

- Summary: GET /api/task-health/v1/summary
- Board: GET /api/task-health/v1/board
- Dashboard: GET /api/task-health/v1/dashboard
- Request: {"workspaceId":"...","projectId":"..."}
- Response:
  {
    "summary": {"totalTasks":10,"inProgress":3,"atRisk":2,"blocked":1,"completionPercentage":30},
    "board": {"columns": {"notStarted":[],"inProgress":[],"atRisk":[],"complete":[]}}
  }

---

### 4.11 Notifications + Updates (Real-time)

Sockets:
- join: {"userId":"...","workspaceId":"..."}
- send_notification: {"workspaceId":"...","recipientUserId":"...","message":"...","type":"task"}
- mark_notification_read, delete_notification
- create_workspace_update: {"workspaceId":"...","authorUserId":"...","title":"...","content":"...","type":"update"}
- get_workspace_updates

UI:
- Notifications bell with badge, list grouped by task/milestone/comment.
- Workspace updates feed as a timeline card.

---

## 5) UI/UX Behavior Rules (Backend Constraints)

- Only creator can update/delete projects/tasks/milestones (show action only if createdBy == currentUserId).
- Task progress normalized by status; done → 100, todo → 0.
- Dependency must be array of valid task IDs.
- All IDs are Mongo ObjectIds.
- Email verified state must show banner if false.

---

## 6) State Management

Global:
- Auth tokens, user profile, current workspace, notifications.

Workspace scoped:
- Projects, tasks, milestones, team load, health summaries, updates.

Local:
- Form state, modal state, optimistic updates.

---

## 7) Error Handling (Mapped to Backend)

- 400: validation error (violet outline + inline error text).
- 401: session expired → re-login.
- 403: show access denied banner.
- 404: empty state (dot-grid pattern + CTA).
- 409: conflict (workspace/project exists).

---

## 8) Component-to-Endpoint Mapping Table

| Component | Endpoint | Method | Payload | Response |
|---|---|---|---|---|
| Login Form | /api/auth/login | POST | { email, password } | { accessToken, refreshToken, user } |
| Register Form | /api/auth/register | POST | { email, password, confirmPassword } | { accessToken, user, verificationEmailSent } |
| Workspace List | /api/workspaces/v1/user/:userid | GET | — | Workspace[] |
| Create Workspace | /api/workspaces/v1/:userid/createWorkspace | POST | { name, description, settings } | Workspace |
| Project List | /api/projects/v1/getProjects/:workspaceId | GET | — | { data: Project[] } |
| Create Project | /api/projects/v1/createProject | POST | { workspaceId, name, status, description, progress, dueDate } | { message } |
| Task Board | /api/tasks/v1/getAllTasks/:projectId | GET | — | { message: Task[] } |
| Create Task | /api/tasks/v1/createTask | POST | { workspaceId, title, description, status, actualProgress, assigneeUserId, projectId, milestoneId, dueDate, dependency } | { message, data } |
| Milestone List | /api/milestones/v1/getAllMilestones/:projectId | GET | — | { message: Milestone[] } |
| Comment Thread | /api/comments/v1/getAllComments/:taskId | GET | — | { message: Comment[] } |
| Team Load | /api/team-load/v1/dashboard | GET | { workspaceId, projectId? } | { totalMembers, members[] } |
| Project Health | /api/projectHealth/v1/:workspaceId | GET | — | ProjectHealth[] |
| Task Health | /api/task-health/v1/dashboard | GET | { workspaceId, projectId? } | { summary, board } |

---

## 9) Design Handoff Notes (for Visily)

- Use a light lavender background with curved shapes and dot-grid pattern.
- All primary CTAs use the blue→purple gradient.
- Cards should be glassmorphism-style with blur and soft shadows.
- Typography should be bold and futuristic, with strong blue highlights.
- Use W-shaped motif subtly on headers, badges, and empty states.
- Ensure screens feel collaborative and professional.

---

## 10) Suggested Frontend Stack

- React + Vite
- Tailwind CSS for Wostup tokens
- Zustand or Redux Toolkit
- Axios with refresh-token interceptor
- Socket.IO client
- Recharts for dashboards

---

End of document.
