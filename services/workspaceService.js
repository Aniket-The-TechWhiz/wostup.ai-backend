const { Workspace } = require("../models/index");

async function createWorkspaceService(name, ownerUserId, description, settings) {
    const check = await Workspace.findById(
        {
            ownerUserId: ownerUserId,
            name: name
        }
    );

    if (check) {
        return 409;
    }

    const data = await Workspace.create({ name, ownerUserId, description, settings });
    return { status: 201, data: data };
}

async function updateWorkspaceService(workspaceId, body) {
    const data = await Workspace.updateOne(
        {
            _id: workspaceId
        },
        {
            $set: body
        });

    if (!data) {
        return 304;
    }
    return { status: 200, data: data };
}

async function getWorkspaceByIdService(workspaceId) {
    const data = await Workspace.findById(
        {
            _id: workspaceId
        }
    );

    if (!data) {
        return 404;
    }

    return { status: 200, data: data };
}

async function getWorkspaceService(ownerUserId) {
    const data = Workspace.find({
        ownerUserId: ownerUserId
    });

    if (!data) {
        return 404;
    }

    return { status: 200, data: data };
}

async function deleteWorkspaceService(workspaceId) {
    const result = await Workspace.deleteOne({
        _id: workspaceId
    });

    if (result.deletedCount === 0) {
        return { status: 404, message: "Workspace not found" };
    }

    return {
        status: 200,
        message: "Workspace deleted successfully",
        data: result
    };
}



module.exports={
    createWorkspaceService,
    updateWorkspaceService,
    getWorkspaceByIdService,
    getWorkspaceService,
    deleteWorkspaceService
}