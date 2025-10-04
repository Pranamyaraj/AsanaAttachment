const asana = require('asana');

const client = new asana.Client({ accessToken: process.env.ASANA_TOKEN });
const PROJECT_ID = '1211436029323043';
const PARENT_TASK_ID = '1211436036352183'; 
async function checkParentTasks() {
    try {
        console.log("Checking tasks in project:", PROJECT_ID);
        const tasks = await client.tasks.getTasksForProject(PROJECT_ID, { opt_fields: 'name,completed,assignee,parent' });
        for (let task of tasks.data) {
            const taskId = task.gid;
            const taskData = await client.tasks.getTask(taskId, { opt_fields: 'completed,name,assignee,parent' });
            const attachments = await client.attachments.getAttachmentsForObject(taskId);
            if (taskData.completed && attachments.data.length === 0) {
                console.log(`Task '${taskData.name}' completed with NO attachments.`);
                await client.tasks.updateTask(taskId, { completed: false });
                await client.tasks.addComment(taskId, {
                    text: "Please attach the required file before marking this task as complete."
                });
                console.log(`Task '${taskData.name}' reverted and comment added.`)
                if (taskData.parent) {
                    await client.tasks.updateTask(taskData.parent.gid, { completed: false });
                    console.log(`Parent task '${taskData.parent.name}' reverted as well.`);
                }
            }
        }
        console.log("Check complete.");
    } catch (err) {
        console.error(err);
    }
}
checkParentTasks();
