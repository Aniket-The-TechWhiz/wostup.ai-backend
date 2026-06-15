const express = require("express");
const router = express.Router();
const { authMiddleware } = require("../middleware/authMiddleware");

const {
  createProjectController,
  updateProjectController,
  deleteProjectController,
  getProjectController,
  getProjectByIdController
} = require("../controllers/projectsController/project.Controller");

// 🔹 Create Project
router.post("/v1/createProject", authMiddleware, createProjectController);

// 🔹 Get all projects of a workspace
router.get("/v1/getProjects/:workspaceId", getProjectController);

// 🔹 Get single project by ID
router.get("/v1/getProjectById/:projectId", getProjectByIdController);

// 🔹 Update project
router.put("/v1/updateProjectById/:projectId", authMiddleware, updateProjectController);

// 🔹 Delete project (soft delete ideally)
router.delete("/v1/deleteProjectById/:projectId", authMiddleware, deleteProjectController);

module.exports = router;