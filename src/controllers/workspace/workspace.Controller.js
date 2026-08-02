const async_handler = require("express-async-handler");
const { createWorkspaceService, updateWorkspaceService, getWorkspaceByIdService, getWorkspaceService, deleteWorkspaceService } = require("../../services/workspaceService");

const createWorkspaceController = async_handler(async (req, res) => {
    const { name, description, settings } = req.body;
    const { userid } = req.params;

    if (!name || !userid) {
        return res.status(400).json({ message: "Name or user id not provided" });
    }

    const result = await createWorkspaceService(name, userid, description, settings);

    if (result === 409) {
        return res.status(409).json({ message: "Workspace already exists" });
    }

    if (result.status === 201) {
        return res.status(201).json(result.data);
    }

    return res.status(400).json({ message: "workspace not created" });
});

const updateWorkspaceController = async_handler(async (req, res) => {
    const { userid, workspaceid } = req.params;

    if (!req.body || !userid || !workspaceid) {
        return res.status(400).json({ message: "Body, user id, or workspace id not provided" });
    }

    const result = await updateWorkspaceService(workspaceid, req.body);

    if (result === 304) {
        return res.status(304).send();
    }

    if (result.status === 200) {
        return res.status(200).json(result.data);
    }

    return res.status(400).json({ message: "workspace not updated" });
});

const getWorkspaceController = async_handler(async (req, res) => {
    const { workspaceid } = req.params;

    if (!workspaceid) {
        return res.status(400).json({ message: "Workspace id not provided" });
    }

    const result = await getWorkspaceByIdService(workspaceid);

    if (result.status === 200) {
        return res.status(200).json(result.data);
    }

    return res.status(result.status || 400).json({ message: result.message || "Could not fetch workspace" });
});

const getWorkspacesByUserController = async_handler(async (req, res) => {
    const { userid } = req.params;

    if (!userid) {
        return res.status(400).json({ message: "User id not provided" });
    }

    const result = await getWorkspaceService(userid);

    if (result.status === 200) {
        return res.status(200).json(result.data);
    }

    return res.status(result.status || 400).json({ message: result.message || "Could not fetch workspaces" });
});

const deleteWorkspaceController = async_handler(async (req, res) => {
    const { workspaceid } = req.params;

    if (!workspaceid) {
        return res.status(400).json({ message: "Workspace id not provided" });
    }

    const result = await deleteWorkspaceService(workspaceid);

    return res.status(result.status || 400).json({ message: result.message || (result.status === 200 ? "Workspace deleted successfully" : "Workspace not deleted") });
});

module.exports = {
    createWorkspaceController,
    updateWorkspaceController,
    getWorkspaceController,
    getWorkspacesByUserController,
    deleteWorkspaceController
};
