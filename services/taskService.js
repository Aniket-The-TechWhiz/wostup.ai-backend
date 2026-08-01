const mongoose = require("mongoose");
const { Task, WorkspaceMember } = require("../models/index");
const { Queue } = require("bullmq");
const IORedis = require("ioredis");

const redisUrl = process.env.REDIS_URL || "redis://127.0.0.1:6379";
const redisOpts = { maxRetriesPerRequest: null };
const connection = new IORedis(redisUrl, redisOpts);

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
    userId = "6826c1a9f1b2d44c9a777777"
    console.log(userId)

    // remember to remove these comments of validation
    // const isMember = await WorkspaceMember.findOne({
    //     workspaceId,
    //     userId
    // });

    // if (!isMember) {
    //     return { statuscode: 403, data: null };
    // }

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

    const date = new Date(dueDate).getTime();


    // add the task to the deadline queue:
    const queue = new Queue("DEADLINE_WORKER", { connection });
    await queue.add(
        "task",
        {
            taskId: data._id,
            workspaceId: workspaceId,
            assigneeUserId: assigneeUserId
        },
        { delay: 5 * 1000, removeOnComplete: true }
    );

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

async function createTaskMadeByAI(workspaceId, userId, tasks,projectId) {

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
    const transformedTasks = tasks.map(task => ({
        ai_generic_id: task.ai_generic_id,
        workspaceId,
        createdBy: userId,
        title: task.title,
        assignee: usersMap.get(task.assignee),
        description: task.description,
        status: task.status,
        dependency: [],
        dueDate: task.dueDate,
        projectId:projectId
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

