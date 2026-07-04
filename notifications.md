# Notifications Message Queue Architecture

This backend uses Socket.IO rooms plus Redis pub/sub as the forwarding layer for notifications. The queue-like flow is:

1. A feature or worker creates a notification payload.
2. The payload is published to a socket event or Redis channel.
3. The dispatcher validates workspace membership and persists the notification.
4. The dispatcher emits the notification to the correct user and workspace rooms.
5. The client receives the live event and can also fetch the stored notification from MongoDB.

## Core Flow Files

- [server.js](server.js) bootstraps the socket handlers and the Redis-backed AI subscriber.
- [sockets/notificationSocket.js](sockets/notificationSocket.js) handles direct notification sending, read status updates, and deletes.
- [sockets/aiNotification.js](sockets/aiNotification.js) subscribes to the `ai_notifications` Redis channel and forwards payloads into the dispatcher.
- [services/notificationDispatchService.js](services/notificationDispatchService.js) validates recipients, creates the notification record, and emits to live sockets.
- [services/notificationService.js](services/notificationService.js) owns notification CRUD and read/delete operations.
- [models/notifications.model.js](models/notifications.model.js) defines the notification document shape and indexes.
- [models/index.js](models/index.js) exports the notification model for the services.
- [db/schemaSetup.js](db/schemaSetup.js) contains the schema/index bootstrap for notifications.

## Current Transport Rules

- Socket room naming used by the dispatcher: `user:{userId}` and `workspace:{workspaceId}`.
- The dispatcher only sends to sockets that belong to both the user room and the workspace room.
- Notification persistence happens before live emission, so reconnecting clients can reload from MongoDB.
- [routes/notificationRoutes.js](routes/notificationRoutes.js) is currently empty and not part of the runtime flow.

## Notification Types

### 1. Email Verification Notification

Current state:

- Email delivery is handled outside the queue, as a transactional email flow.

Files to work on:

- [controllers/auth/emailverification.controller.js](controllers/auth/emailverification.controller.js) starts the verification request.
- [services/emailVerificationService.js](services/emailVerificationService.js) creates the token and sends the email.

If you want this to also appear as an in-app notification:

- Publish a payload from [services/emailVerificationService.js](services/emailVerificationService.js) into the notification dispatcher.
- Reuse [services/notificationDispatchService.js](services/notificationDispatchService.js) for recipient validation and live emission.

### 2. Password Reset Notification

Current state:

- Password reset is also email-only at the moment.

Files to work on:

- [controllers/auth/authPasswordReset.Controller.js](controllers/auth/authPasswordReset.Controller.js) handles request, token verification, and reset.
- [services/passwordResetService.js](services/passwordResetService.js) creates the reset token and sends the email.

If you want this to also enter the notification queue:

- Add a publish step in [services/passwordResetService.js](services/passwordResetService.js).
- Forward the resulting payload through [services/notificationDispatchService.js](services/notificationDispatchService.js).

### 3. Normal Notifications

Current state:

- Normal notifications are the generic in-app notification path used by Socket.IO clients and any backend feature that wants to create a notification manually.

Files to work on:

- [sockets/notificationSocket.js](sockets/notificationSocket.js) accepts `send_notification` payloads from clients.
- [services/notificationDispatchService.js](services/notificationDispatchService.js) is the main fan-out and persistence entry point.
- [services/notificationService.js](services/notificationService.js) stores the notification.
- [models/notifications.model.js](models/notifications.model.js) stores the final record.

Typical producer files for normal notifications:

- [controllers/projectsController/comments.Controller.js](controllers/projectsController/comments.Controller.js)
- [controllers/projectsController/tasks.Controller.js](controllers/projectsController/tasks.Controller.js)
- [controllers/projectsController/milestones.Controller.js](controllers/projectsController/milestones.Controller.js)
- [controllers/ExecutionController/projectHealthController.js](controllers/ExecutionController/projectHealthController.js)
- [controllers/ExecutionController/taskHealth.Controller.js](controllers/ExecutionController/taskHealth.Controller.js)
- [controllers/ExecutionController/teamLoad.Controller.js](controllers/ExecutionController/teamLoad.Controller.js)

### 4. AI Notifications

Current state:

- AI notifications are produced asynchronously and forwarded through Redis.

Files to work on:

- [workers/dealdine.worker.js](workers/dealdine.worker.js) publishes the payload to the `ai_notifications` Redis channel.
- [sockets/aiNotification.js](sockets/aiNotification.js) subscribes to that channel and forwards the payload.
- [services/notificationDispatchService.js](services/notificationDispatchService.js) creates the notification and emits it live.

When adding a new AI-triggered event:

- Publish a payload that includes `workspaceId`, `recipientUserId` or `recipientUserIds`, `message`, and `type`.
- Keep the worker as the producer and the dispatcher as the only place that persists and emits.

### 5. Update Notifications Sent Throughout Workspace Members

Current state:

- Workspace updates are broadcast directly to the workspace room, not stored in the notification collection.

Files to work on:

- [sockets/updateSocket.js](sockets/updateSocket.js) creates and broadcasts workspace updates.
- [services/updateService.js](services/updateService.js) validates membership and stores the update.
- [models/updates.model.js](models/updates.model.js) stores the update document.

If you want workspace updates to also become notifications for every member:

- Add a publish step after `createWorkspaceUpdateService` succeeds.
- Build a recipient list from [models/workspaceMembers.model.js](models/workspaceMembers.model.js) or the workspace member lookup used by the dispatcher.
- Forward each member through [services/notificationDispatchService.js](services/notificationDispatchService.js).

### 6. Team Member Invite Notifications

Current state:

- Team invites are email-only right now.

Files to work on:

- [controllers/teamMemberController/teamMemberInvite.Controller.js](controllers/teamMemberController/teamMemberInvite.Controller.js) receives the invite request.
- [services/teamInviteService.js](services/teamInviteService.js) sends the invitation email.

If you want invite events in the in-app notification queue:

- Emit a notification payload from [controllers/teamMemberController/teamMemberInvite.Controller.js](controllers/teamMemberController/teamMemberInvite.Controller.js) or [services/teamInviteService.js](services/teamInviteService.js).
- Pass the payload into [services/notificationDispatchService.js](services/notificationDispatchService.js) so the same persistence and socket emission path is reused.

## Recommended Implementation Pattern

Use one producer per feature and one shared dispatcher:

- Producers live in the feature service or controller that knows the business event happened.
- The dispatcher owns validation, persistence, and socket emission.
- Redis pub/sub is used only for asynchronous producers like AI and background workers.
- Direct Socket.IO can be used for user-initiated live events that do not need cross-process delivery.

## Files To Edit First

If the goal is to wire new notification forwarding, start here:

- [services/notificationDispatchService.js](services/notificationDispatchService.js)
- [services/notificationService.js](services/notificationService.js)
- [sockets/notificationSocket.js](sockets/notificationSocket.js)
- [sockets/aiNotification.js](sockets/aiNotification.js)
- [workers/dealdine.worker.js](workers/dealdine.worker.js)
- [services/emailVerificationService.js](services/emailVerificationService.js)
- [services/passwordResetService.js](services/passwordResetService.js)
- [services/teamInviteService.js](services/teamInviteService.js)
- [services/updateService.js](services/updateService.js)
