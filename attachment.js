import 'dotenv/config';
import Asana from 'asana';
const ASANA_PERSONAL_ACCESS_TOKEN = process.env.ASANA_PAT;
const PROJECT_GID = process.env.ASANA_PROJECT_GID;
const CHECK_INTERVAL_MS = 50000;
const client = Asana.Client.create().useAccessToken(ASANA_PERSONAL_ACCESS_TOKEN);
const approvedTasks = new Set();
const checkParentTasksForAttachments = async () => {
    if (!ASANA_PERSONAL_ACCESS_TOKEN || !PROJECT_GID) {
        console.error("Error: ASANA_PAT or ASANA_PROJECT_GID is not set in the .env file.");
        return;
    }
//    console.log(`[${new Date().toLocaleTimeString()}] Fetching all project tasks...`);
    try {
        const result = await client.tasks.findByProject(PROJECT_GID, {
            opt_fields: 'name,completed,num_subtasks',
        });
        const allTasks = result.data;
        if (allTasks.length === 0) {
            console.log("... Project has no tasks.");
            return;
        }
        for (const task of allTasks) {
            if (!task.completed && approvedTasks.has(task.gid)) {
                approvedTasks.delete(task.gid);
            }
            if (task.completed && task.num_subtasks > 0 && !approvedTasks.has(task.gid)) {
                console.log(`Completed parent task: "${task.name}"`);
                const attachments = await client.attachments.findByTask(task.gid, {});
                if (attachments.data.length === 0) {
                    console.log(`"${task.name}" has no attachment so, PREVENT completion.`);
                    await client.tasks.update(task.gid, {
                        completed: false,
                    });
                    await client.stories.createOnTask(task.gid, {
                        text: "parent completion, prevent completion without attachment",
                    });
                } else {
                    console.log(`"${task.name}" has attachments.COMPLETED.`);
                    approvedTasks.add(task.gid);
                }
            }
        }
        //console.log("...Check completed.");

    } catch (error) {
        console.error("An error occurred with the Asana API:", error);
    }
};
checkParentTasksForAttachments();
setInterval(checkParentTasksForAttachments, CHECK_INTERVAL_MS);
