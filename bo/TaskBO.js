const TaskBO = class {
    constructor() {}

    async createTask(params) {
        try {
            const { id_list, title, description, assigned_to_user, due_date } = params;
            
            if (!id_list || !title) {
                return { sts: false, msg: "List ID and Title are required" };
            }

            // Calculate new position (simplified: always add to end, position 9999)
            // Ideally, you would query MAX(position) + 1
            const position = 9999; 

            const result = await database.executeQuery("public", "createTask", [
                id_list, title, description, assigned_to_user || null, position, due_date || null
            ]);

            if (result && result.rowCount > 0) {
                return { sts: true, msg: "Task created", data: result.rows[0] };
            }
            return { sts: false, msg: "Failed to create task" };

        } catch (error) {
            console.error("Error in createTask:", error);
            return { sts: false, msg: "Internal server error" };
        }
    }

    // Crucial for Kanban boards: moving a task to another column or position
    async moveTask(params) {
        try {
            const { id_task, new_id_list, new_position } = params;

            if (!id_task || !new_id_list || new_position === undefined) {
                return { sts: false, msg: "Missing parameters for moving task" };
            }

            const result = await database.executeQuery("public", "updateTaskPosition", [
                new_id_list, new_position, id_task
            ]);

            if (result && result.rowCount > 0) {
                return { sts: true, msg: "Task moved successfully" };
            }
            return { sts: false, msg: "Failed to move task" };

        } catch (error) {
            console.error("Error in moveTask:", error);
            return { sts: false, msg: "Internal server error" };
        }
    }
};

module.exports = TaskBO;