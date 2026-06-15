const { Project, Workspace, WorkspaceMember } = require("../models/index");

async function createProjectService(workspaceId, name, userId, status, description, progress = 0, dueDate) {
    const isMember = await WorkspaceMember.findOne({
        workspaceId,
        userId
    });

    if (!isMember) {
        return 403;
    }

    const check=await Project.findOne({
        name:name
    });

    if(check){
        return 409;
    }

    const parsedDueDate = new Date(dueDate);
    if (Number.isNaN(parsedDueDate.getTime())) {
        return 400;
    }

    await Project.create({workspaceId, name, ownerUserId: userId, createdBy: userId, status, description, progress, dueDate: parsedDueDate});

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

    await Project.updateOne(
        { _id: projectId }, // Filter
        { $set: body }                // Data from body
    );

    return  200;
}

async function deleteProjectService(projectId, userId) {
    const project = await Project.findById(projectId, { createdBy: 1 });

    if (!project) {
        return 404;
    }

    if (project.createdBy.toString() !== userId.toString()) {
        return 403;
    }

    await Project.deleteOne({ _id: projectId });

    return 200;
}

async function getProjectServiceById(projectId) {
    const data = await Project.findById({
        _id: projectId
    });
    if(!data){
        return 404;
    }
    return data;
}

async function getAllProjectService(workspaceId) {
    const data= await Project.find({ workspaceId: workspaceId });

    return data;
}

module.exports = {
    createProjectService,
    updateProjectService,
    deleteProjectService,
    getProjectServiceById,
    getAllProjectService
}

