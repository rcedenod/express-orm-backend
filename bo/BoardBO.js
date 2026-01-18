const BoardBO = class {
    constructor() {}

    async createBoard(params) {
        try {
            const { name, description } = params;
            // this.userId is injected by Security.js
            const userId = this.userId; 

            if (!name) {
                return { sts: false, msg: "Board name is required" };
            }

            // 1. Create the Board
            const boardResult = await database.executeQuery("public", "createBoard", [name, description, userId]);
            if (!boardResult || !boardResult.rows || boardResult.rows.length === 0) {
                return { sts: false, msg: "Failed to create board" };
            }
            const boardId = boardResult.rows[0].id_board;

            // 2. Add the creator as an 'ADMIN' member automatically
            await database.executeQuery("public", "addBoardMember", [boardId, userId, 'ADMIN']);

            // 3. Create default lists (Optional but recommended for Trello-like feel)
            await database.executeQuery("public", "createList", [boardId, 'To Do', 1]);
            await database.executeQuery("public", "createList", [boardId, 'Doing', 2]);
            await database.executeQuery("public", "createList", [boardId, 'Done', 3]);

            return { sts: true, msg: "Board created successfully", id_board: boardId };

        } catch (error) {
            console.error("Error in createBoard:", error);
            return { sts: false, msg: "Internal server error" };
        }
    }

    async getMyBoards(params) {
        try {
            const userId = this.userId;
            const result = await database.executeQuery("public", "getBoardsByUser", [userId]);
            return { sts: true, data: result.rows };
        } catch (error) {
            console.error("Error in getMyBoards:", error);
            return { sts: false, msg: "Error fetching boards" };
        }
    }
};

module.exports = BoardBO;