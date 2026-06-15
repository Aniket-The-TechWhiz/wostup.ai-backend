const async_handler = require("express-async-handler");
const projectServices = require("../../services/projectService");

const createProjectController = async_handler(async (req, res) => {
    if (!req.body) {
        return res.status(400).json({
            message: "body not provided"
        });
    }
    const { workspaceId, name, status, description, progress, dueDate } = req.body;

    if (!dueDate || Number.isNaN(new Date(dueDate).getTime())) {
        return res.status(400).json({
            message: "valid dueDate not provided"
        });
    }


    const statuscode = await projectServices.createProjectService(
        workspaceId,
        name,
        req.auth.userId,
        status,
        description,
        progress,
        dueDate
    );

    if (statuscode == 200) {
        return res.status(201).json({
            message: "project created"
        });

    }
    else if (statuscode == 409) {
        return res.status(409).json({
            message: "project already exists"
        });
    }

    else if (statuscode == 403) {
        return res.status(403).json({
            message: "only workspace members can create project"
        });
    }



    return res.status(400).json({
        message: "project not created"
    });
});

const updateProjectController = async_handler(async (req, res) => {
    if (!req.body && req.params.projectId) {
        res.status(400).json({
            "message": "body or projectid not provided"
        });
    }

    const statuscode = await projectServices.updateProjectService(req.params.projectId, req.auth.userId, req.body);

    if (statuscode == 403) {
        return res.status(403).json({
            message: "only creator can update project"
        });
    }

    if (statuscode == 404) {
        return res.status(404).json({
            "message": "project not found"
        });
    }

    if (statuscode != 200) {
        return res.status(400).json({
            "message": "project not updated"
        });
    }

    return res.status(201).json({
        "message": "project updated"
    });
});

const deleteProjectController = async_handler(async (req, res) => {
    if (!req.params.projectId) {
        return res.status(400).json({
            "message": "project id not provided"
        });
    }
    const statuscode = await projectServices.deleteProjectService(req.params.projectId, req.auth.userId);

    if (statuscode == 403) {
        return res.status(403).json({
            "message": "only creator can delete project"
        });
    }

    if (statuscode == 404) {
        return res.status(404).json({
            "message": "project not found"
        });
    }

    if (statuscode != 200) {
        return res.status(400).json({
            "message": "project not deleted"
        });
    }

    return res.status(200).json({
        "message": "project deleted"
    });
});

const getProjectController = async_handler(async (req, res) => {
    if (!req.params.workspaceId) {
        return res.status(400).json({
            "message": "workspace id not provided"
        });
    }
    const data = await projectServices.getAllProjectService(req.params.workspaceId);
    if (!data) {
        return res.status(404).json({
            "message": "Project not found"
        })
    }

    return res.status(200).json({
        "data": data
    })

});

const getProjectByIdController = async_handler(async (req, res) => {
    if (!req.params.projectId) {
        return res.status(400).json({
            "message": "project id not provided"
        });
    }
    const data = await projectServices.getProjectServiceById(req.params.projectId);
    if (!data || data === 404) {
        return res.status(404).json({
            "message": "Project not found"
        })
    }

    return res.status(200).json({
        "data": data
    })
});

module.exports = {
    createProjectController,
    updateProjectController,
    deleteProjectController,
    getProjectController,
    getProjectByIdController
}

