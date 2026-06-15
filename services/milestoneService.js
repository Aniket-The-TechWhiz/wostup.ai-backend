const { Milestone, WorkspaceMember } = require("../models/index");

async function milestoneCreateService(workspaceId,projectId,name,description,dueDate,completionPercentage,userId){
    const isMember = await WorkspaceMember.findOne({
        workspaceId,
        userId
    });

    if (!isMember) {
        return { statuscode: 403, data: null };
    }

    const data=await Milestone.create({
        workspaceId,projectId,name,description,dueDate,completionPercentage,createdBy: userId
    });
 return { statuscode: 201, data };}

async function milestoneUpdateService(milestoneId,userId,body){
    if (!userId) {
        return { statuscode: 400, data: null };
    }

    const milestone = await Milestone.findById(milestoneId, { createdBy: 1 });

    if (!milestone) {
        return { statuscode: 404, data: null };
    }

    if (milestone.createdBy.toString() !== userId.toString()) {
        return { statuscode: 403, data: null };
    }

    const data=await Milestone.updateOne(
        { _id: milestoneId },
        {$set:body}
    );

 return { statuscode: 200, data };}

async function milestoneDeleteService(milestoneId,userId){
    const milestone = await Milestone.findById(milestoneId, { createdBy: 1 });

    if (!milestone) {
        return { statuscode: 404, data: null };
    }

    if (milestone.createdBy.toString() !== userId.toString()) {
        return { statuscode: 403, data: null };
    }

    const data=await Milestone.deleteOne({_id:milestoneId});
return { statuscode: 200, data };
}

async function milestoneGetByIdService(milestoneId){
    const data = await Milestone.findById({
        _id:milestoneId
    });

return { statuscode: 200, data };}

async function milestoneGetAllService(projectId){
    const data=await Milestone.find({
        projectId:projectId
    });

return { statuscode: 200, data };}

module.exports={
    milestoneCreateService,
    milestoneUpdateService,
    milestoneDeleteService,
    milestoneGetByIdService,
    milestoneGetAllService
}
