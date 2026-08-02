const mongoose = require("mongoose");
const { Task, WorkspaceMember, User } = require("../models/index"); // FIXED: was missing User — createTaskMadeByAI used it without importing it
const { Queue } = require("bullmq");
const redisConnection = require("../redisConfig/bullmqRedisConnection"); // FIXED: was constructing its own separate IORedis client with its own opts — now shares the one connection config the rest of the BullMQ pipeline uses

// Single shared Queue instance — FIXED: was `new Queue(...)` created fresh
// inside createTaskService on every single call, opening a redundant
// connection each time instead of reusing one.
const deadlineQueue = new Queue("DEADLINE_WORKER", { connection: redisConnection });

// How long before a task's dueDate the reminder should fire.
const DEADLINE_REMINDER_BEFORE_MS = 24 * 60 * 60 * 1000; // 24 hours

function normalizeProgressByStatus(status, actualProgress) {
    if (status === "done") {
        return 100;
    }

    if (status === "todo") {
        return 0;
    }

    return actualProgress;
}

async function createTaskService(workspaceId, title, description, status, actualProgress, assigneeUserId, projectId, milestoneId, dueDate, dependency, userId) {
    // FIXED: was hardcoded to a dummy ObjectId ("6826c1a9f1b2d44c9a777777")
    // regardless of who actually called this — every task's createdBy was
    // the same fake user, AND updateTaskService/taskDeleteService check
    // `task.createdBy.toString() !== userId.toString()` for authorization,
    // so real users could never edit or delete their own tasks; only
    // requests using that exact dummy ID could touch anything.
    if (!userId) {
        return { statuscode: 400, data: null };
    }

    const isMember = await WorkspaceMember.findOne({ workspaceId, userId });
    if (!isMember) {
        return { statuscode: 403, data: null };
    }

    const parsedProgress = actualProgress === undefined ? 0 : Number(actualProgress);
    if (Number.isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
        return { statuscode: 400, data: null };
    }

    const finalProgress = normalizeProgressByStatus(status, parsedProgress);

    let resolvedDependency = [];
    if (dependency !== undefined) {
        if (!Array.isArray(dependency)) {
            return { statuscode: 400, data: null };
        }

        const hasInvalidId = dependency.some((taskId) => !mongoose.Types.ObjectId.isValid(taskId));
        if (hasInvalidId) {
            return { statuscode: 400, data: null };
        }

        resolvedDependency = dependency;
    }

    const data = await Task.create({ workspaceId, title, description, status, actualProgress: finalProgress, assigneeUserId, projectId, milestoneId, dueDate, dependency: resolvedDependency, createdBy: userId });

    // FIXED: `date` was computed from dueDate but never actually used —
    // the job below was hardcoded to `delay: 5 * 1000` (5 seconds after
    // creation), for EVERY task regardless of its real due date. Now the
    // reminder is scheduled to fire DEADLINE_REMINDER_BEFORE_MS before the
    // actual dueDate, and is skipped entirely if that time has already
    // passed (e.g. task created with a due date less than 24h away).
    const dueTime = new Date(dueDate).getTime();
    const reminderTime = dueTime - DEADLINE_REMINDER_BEFORE_MS;
    const delay = reminderTime - Date.now();

    if (Number.isFinite(delay) && delay > 0) {
        await deadlineQueue.add(
            "task",
            {
                taskId: data._id,
                workspaceId: workspaceId,
                assigneeUserId: assigneeUserId
            },
            { delay, removeOnComplete: true }
        );
    } else {
        console.warn(`Task ${data._id}: due date too close (or invalid) — skipping deadline reminder scheduling.`);
    }

    return { statuscode: 201, data: data };
}

async function updateTaskService(taskId, userId, body) {
    if (!userId) {
        return { statuscode: 400, data: null };
    }

    const task = await Task.findById(taskId, { createdBy: 1 });

    if (!task) {
        return { statuscode: 404, data: null };
    }

    if (task.createdBy.toString() !== userId.toString()) {
        return { statuscode: 403, data: null };
    }

    if (body.actualProgress !== undefined) {
        const parsedProgress = Number(body.actualProgress);
        if (Number.isNaN(parsedProgress) || parsedProgress < 0 || parsedProgress > 100) {
            return { statuscode: 400, data: null };
        }
        body.actualProgress = parsedProgress;
    }

    if (body.status !== undefined && (body.actualProgress !== undefined || body.status === "todo" || body.status === "done")) {
        body.actualProgress = normalizeProgressByStatus(body.status, body.actualProgress);
    }

    if (body.dependency !== undefined) {
        if (!Array.isArray(body.dependency)) {
            return { statuscode: 400, data: null };
        }

        const hasInvalidId = body.dependency.some((taskId) => !mongoose.Types.ObjectId.isValid(taskId));
        if (hasInvalidId) {
            return { statuscode: 400, data: null };
        }
    }

    // Kept as you updated it — findOneAndUpdate with { new: true } returns
    // the updated document instead of just the write-result metadata
    // updateOne gave back.
    const data = await Task.findOneAndUpdate(
        { _id: taskId },
        { $set: body },
        { new: true }
    );

    return { statuscode: 200, data };
}

async function taskDeleteService(taskId, userId) {
    const task = await Task.findById(taskId, { createdBy: 1 });

    if (!task) {
        return { statuscode: 404, data: null };
    }

    if (task.createdBy.toString() !== userId.toString()) {
        return { statuscode: 403, data: null };
    }

    const data = await Task.deleteOne({ _id: taskId });
    return { statuscode: 200, data: data };
}

async function taskGetByIdService(taskId) {
    const data = await Task.findById({
        _id: taskId
    });

    return { statuscode: 200, data };
}

async function taskGetAllService(projectId) {
    const data = await Task.find({
        projectId: projectId
    });

    return { statuscode: 200, data };
}

async function taskFilterService(status, userid) {
    const data = await Task.find({
        status: status,
        assigneeUserId: userid
    });

    return { statuscode: 200, data };
}


/*this above function is created to store the tasks created by the AI, this create service is not used for the normal create service*/

async function createTaskMadeByAI(workspaceId, userId, tasks, projectId) {

    /*
    {
      "ai_generic_id": "1",
      "title": "Task name",
      "assignee": "sanchitskumbhar@gmail.com",
      "description": "Task description",
      "status": "todo",
      "dependency": [],
      "dueDate": "2026-05-15"
    }
    */

    // STEP 1: Extract emails
    const emails = tasks.map(task => task.assignee);

    // STEP 2: Fetch users
    const users = await User.find(
        {
            email: { $in: emails }
        },
        {
            _id: 1,
            email: 1
        }
    );

    // STEP 3: Create email -> userId map
    const usersMap = new Map();

    users.forEach(user => {
        usersMap.set(user.email, user._id);
    });

    // STEP 4: Transform tasks
    // FIXED: was setting `assignee: ...` but the Task schema's real field
    // is `assigneeUserId` (required). Mongoose silently drops unknown
    // fields, so assigneeUserId was left unset and every AI-created task
    // failed schema validation on insertMany.
    const transformedTasks = tasks.map(task => ({
        ai_generic_id: task.ai_generic_id,
        workspaceId,
        createdBy: userId,
        title: task.title,
        assigneeUserId: usersMap.get(task.assignee),
        description: task.description,
        status: task.status,
        dependency: [],
        dueDate: task.dueDate,
        projectId: projectId
    }));

    // STEP 5: Insert tasks
    const insertedTasks = await Task.insertMany(transformedTasks);

    // STEP 6: Create AI ID -> Mongo _id map
    const taskMap = new Map();

    insertedTasks.forEach(task => {
        taskMap.set(task.ai_generic_id, task._id);
    });

    // STEP 7: Prepare dependency updates
    let allIDs = [];

    for (let i = 0; i < tasks.length; i++) {

        let dependencyIds = [];

        tasks[i].dependency.forEach(dep => {

            const depId = taskMap.get(dep);

            if (depId) {
                dependencyIds.push(depId);
            }
        });

        allIDs.push({
            taskId: taskMap.get(tasks[i].ai_generic_id),
            dependencyIds
        });
    }

    // STEP 8: Create bulk updates
    const updates = allIDs.map(task => ({
        updateOne: {
            filter: {
                _id: task.taskId
            },
            update: {
                $set: {
                    dependency: task.dependencyIds
                }
            }
        }
    }));

    // STEP 9: Bulk update
    await Task.bulkWrite(updates);

    return insertedTasks;
}
module.exports = {
    createTaskService,
    updateTaskService,
    taskDeleteService,
    taskGetByIdService,
    taskGetAllService,
    taskFilterService,
    createTaskMadeByAI
}