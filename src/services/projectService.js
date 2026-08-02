const { Project, WorkspaceMember } = require("../models/index");

async function createProjectService(payload, userId) {
    const { workspaceId, name, key, status, priority, visibility, description, progress, startDate, dueDate } = payload;
    
    const isMember = await WorkspaceMember.findOne({
        workspaceId,
        userId
    });

    if (!isMember) {
        return 403;
    }

    // Checking uniqueness based on workspaceId and key, as per the new unique index
    const check = await Project.findOne({ workspaceId, key });

    if (check) {
        return 409;
    }

    const projectData = {
        workspaceId,
        name,
        key,
        owner: userId, // Updated from ownerUserId to owner
        createdBy: userId,
        members: [{ userId: userId, role: "Owner" }], // Add creator as the first member
        description: description || "",
        progress: progress || 0,
    };

    // Add optional Enum fields if they exist
    if (status) projectData.status = status;
    if (priority) projectData.priority = priority;
    if (visibility) projectData.visibility = visibility;

    // Handle optional dates
    if (dueDate) projectData.dueDate = new Date(dueDate);
    if (startDate) projectData.startDate = new Date(startDate);

    await Project.create(projectData);

    return 200;
}

async function updateProjectService(projectId, userId, body) {
    const project = await Project.findById(projectId, { workspaceId: 1, createdBy: 1 });

    if (!project) {
        return 404;
    }

    if (project.createdBy.toString() !== userId.toString()) {
        return 403;
    }

    if (body.dueDate !== undefined) {
        const parsedDueDate = new Date(body.dueDate);
        if (Number.isNaN(parsedDueDate.getTime())) {
            return 400;
        }
        body.dueDate = parsedDueDate;
    }
    
    if (body.startDate !== undefined) {
        const parsedStartDate = new Date(body.startDate);
        if (Number.isNaN(parsedStartDate.getTime())) {
            return 400;
        }
        body.startDate = parsedStartDate;
    }

    // Update auditing fields
    body.lastUpdatedBy = userId;
    body.lastActivityAt = Date.now();

    await Project.updateOne(
        { _id: projectId }, 
        { $set: body }                
    );

    return 200;
}

async function deleteProjectService(projectId, userId) {
    const project = await Project.findById(projectId, { createdBy: 1 });

    if (!project) {
        return 404;
    }

    if (project.createdBy.toString() !== userId.toString()) {
        return 403;
    }

    // Switched to soft deletion leveraging the new schema attributes
    await Project.updateOne(
        { _id: projectId },
        { 
            $set: { 
                isArchived: true, 
                archivedAt: Date.now(), 
                deletedAt: Date.now(),
                lastUpdatedBy: userId,
                lastActivityAt: Date.now()
            } 
        }
    );

    return 200;
}

async function getProjectServiceById(projectId) {
    // Ensuring soft-deleted projects are omitted
    const data = await Project.findOne({
        _id: projectId,
        isArchived: false,
        deletedAt: null
    });
    
    if (!data) {
        return 404;
    }
    return data;
}

async function getAllProjectService(workspaceId) {
    // Only return non-archived projects
    const data = await Project.find({ 
        workspaceId: workspaceId,
        isArchived: false,
        deletedAt: null 
    });

    return data;
}

module.exports = {
    createProjectService,
    updateProjectService,
    deleteProjectService,
    getProjectServiceById,
    getAllProjectService
};