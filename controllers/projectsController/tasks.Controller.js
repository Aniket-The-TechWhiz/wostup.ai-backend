const async_handler = require("express-async-handler");
const {
    createTaskService,
    updateTaskService,
    taskDeleteService,
    taskGetByIdService,
    taskGetAllService,
    taskFilterService,
    createTaskMadeByAI
} = require("../../services/taskService");


const createTaskController = async_handler(async (req, res) => {
    if (!req.body) {
        return res.status(400).json({ message: "body not provided" });
    }


    const { workspaceId, title, titile, description, status, actualProgress, assigneeUserId, projectId, milestoneId, dueDate, dependency } = req.body;
    const resolvedTitle = title || titile;

    const { statuscode, data } = await createTaskService(
        workspaceId,
        resolvedTitle,
        description,
        status,
        actualProgress,
        assigneeUserId,
        projectId,
        milestoneId,
        dueDate,
        dependency
        // req.auth.userId
    );


    if (statuscode == 201) {
        return res.status(201).json({ message: "task created", data: data });
    }

    if (statuscode == 403) {
        return res.status(403).json({ message: "only workspace members can create task" });
    }

    return res.status(400).json({ message: "task not created" });
});

const updateTaskController = async_handler(async (req, res) => {
    if (!req.body || !req.params.taskId) {
        return res.status(400).json({ messgae: "body or task id not provided" });

    }
    const { statuscode, data } = await updateTaskService(
        req.params.taskId,
        req.auth.userId,
        req.body
    );

    if (statuscode == 200) {
        return res.status(200).json({ message: "task updated", data: data });
    }

    if (statuscode == 403) {
        return res.status(403).json({ message: "only creator can update task" });
    }

    if (statuscode == 404) {
        return res.status(404).json({ message: "task not found" });
    }

    return res.status(400).json({ message: "task not updated" });
});

const getTaskByIdController = async_handler(async (req, res) => {
    if (!req.params.taskId) {
        return res.status(400).json({
            "message": "Task Id not provided"
        });
    }
    const { statuscode, data } = await taskGetByIdService(req.params.taskId);
    if (statuscode == 404) {
        return res.status(404).json({
            "message": "Task not found"
        })
    }
    return res.status(200).json({
        "message": data
    })
})

const getAllTaskController = async_handler(async (req, res) => {
    if (!req.params.projectId) {
        return res.status(400).json({
            "message": "Project ID not provided"
        });
    }

    const { statuscode, data } = await taskGetAllService(req.params.projectId);
    if (statuscode == 404) {
        return res.status(404).json({
            "message": "Task not found"
        })
    }
    return res.status(200).json({
        "message": data
    })

});

const deleteTaskController = async_handler(async (req, res) => {
    if (!req.params.taskId) {
        return res.status(400).json({
            "message": "Task Id not provided"
        });
    }
    const { statuscode, data } = await taskDeleteService(req.params.taskId, req.auth.userId);

    if (statuscode == 200) {
        return res.status(200).json({
            message: "Task deleted",
            data: data
        });

    }

    if (statuscode == 403) {
        return res.status(403).json({
            message: "only creator can delete task"
        });
    }

    if (statuscode == 404) {
        return res.status(404).json({
            message: "Task not found"
        });
    }

    return res.status(400).json({
        message: "Task not deleted"
    });

});



// filter api for task:
// const filterTaskController = async_handler(async (req, res) => {
//     const { status, userid } = req.params;
//     if (!status || !userid) {
//         return res.status(400).json({ message: "status or user id not provided" });
//     }



//     const { statuscode, data } = await taskFilterService(status, userid);
//     return res.status(statuscode || 200).json({ data: data });
// })

// const createTaskMadeByAIController=async_handler(async(req,res)=>{
//     const {action,wokspaceId,projectId,userId,tasks}=req.body;
//     if(action==1){
//        const status= createTaskMadeByAI(workspaceId,userId,tasks,projectId);
//     }

//     if(status==200){
//         return res.status(200).json("Tasks Created By AI");
//     }
//     if(status==500){
//         return res.status(500).json("Internal  Server Erro");
//     }

// });

module.exports = {
    createTaskController,
    updateTaskController,
    getTaskByIdController,
    getAllTaskController,
    deleteTaskController,
    filterTaskController
};


