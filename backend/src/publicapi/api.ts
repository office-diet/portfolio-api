import { Router } from "express"
import { validate as uuidValidate } from "uuid";
import { utc2jst } from "../utils/jst";
import type { Client } from "pg";
import type { UserRow, UserResonse, MessageRow, MessageResponse } from "./types";

export const publicApi = (postgreSql: Client) => {
    const router = Router();

    // ----------------------------------
    // 公開API API Key認証
    // ----------------------------------
    function apiKeyMiddleware(req, res, next) {
        const apiKey:string = req.headers["x-api-key"];
        if (!apiKey || apiKey !== process.env.POSTMAN_API_KEY) {
            return res.status(401).json({ error: "Invalid API Key" });
        }
        next();
    }
    router.use("/", apiKeyMiddleware);

    // ----------------------------------
    // 公開API 個別ユーザ
    // ----------------------------------
    router.get("/users/:user_id", async (req, res) => {
        const { user_id } =req.params;

        // uuidチェック
        if (!uuidValidate(user_id)) {
            return res.status(400).json({ error: "Invalid UUID format" });
        }

        try {
            // データ取得
            const users = await postgreSql.query<UserRow>(
                            "SELECT * FROM visitors WHERE id=$1", 
                            [user_id]);

            // 対象者が存在しない
            if (users.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            // snake to camel
            const usersResponse:UserResonse[] = users.rows.map((row:UserRow) => ({
                id: row.id, 
                userName: row.name, 
                od: row.os, 
                device: row.device,
                browser: row.browser,
                lang: row.lang,
                enterAt: utc2jst(row.enter_at),
                exitAt: utc2jst(row.exit_at)
            }));

            // データ返却
            res.json(usersResponse);    
        } catch (err) {
            return res.status(500).json({ error: "Internal server error" });    
        }
    });

    // ----------------------------------
    // 公開API 複数ユーザ
    // ----------------------------------
    router.get("/users", async (req, res) => {
        const { order, limit, offset } = req.query;

        let orderQuery = "ORDER BY enter_at DESC ";
        if (typeof order === "string") {
            if (order.toLowerCase() === "asc") {
                orderQuery = "ORDER BY enter_at ASC ";
            }
        }

        const limitNum:number = Math.min(string2Number(limit, 50), 50);
        const offsetNum:number = Math.max(string2Number(offset, 0), 0);
        if ( limitNum < 1 || offsetNum < 0 ) {
            return res.status(400).json({ error: "Invalid limit or offset" });
        }

        const sql = "SELECT * " +
                    "FROM visitors " +
                    orderQuery +
                    `LIMIT ${limitNum} ` +
                    `OFFSET ${offsetNum * limitNum};`
        
        try {
            // データ取得
            const users = await postgreSql.query<UserRow>(sql);

            // 対象者が存在しない
            if (users.rows.length === 0) {
                return res.status(404).json({ error: "User not found" });
            }

            // snake to camel
            const usersResponse:UserResonse[] = users.rows.map((row:UserRow) => ({
                id: row.id, 
                userName: row.name, 
                od: row.os, 
                device: row.device,
                browser: row.browser,
                lang: row.lang,
                enterAt: utc2jst(row.enter_at),
                exitAt: utc2jst(row.exit_at)
            }));

            res.json(usersResponse);    
        } catch (err) {
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    // ----------------------------------
    // 公開API 個別メッセージ
    // ----------------------------------
    router.get("/messages/:message_id", async (req, res) => {
        const { message_id } = req.params;

        // uuidチェック
        if (!uuidValidate(message_id)) {
            return res.status(400).json({ error: "Invalid UUID format" });
        }

        try {
            // データ取得
            const messages = await postgreSql.query<MessageRow>(
                            "SELECT * FROM chat_logs WHERE id=$1", 
                            [message_id]);

            // 対象メッセージが存在しない
            if (messages.rows.length === 0) {
                return res.status(404).json({ error: "Message not found" });
            }

            // snake to camel
            const messagesResponse:MessageResponse[] = 
                messages.rows.map((row:MessageRow) => ({
                    id: row.id,
                    userId: row.visitor_id, 
                    userName: row.name, 
                    message: row.message,
                    dflag: row.dflag,
                    createdAt: utc2jst(row.created_at)
                }));
            
            // データ返却
            res.json(messagesResponse);
            
        } catch (err) {
            return res.status(500).json({ error: "Internal server error" });        
        }
    });

    // ----------------------------------
    // 公開API 複数メッセージ
    // ----------------------------------
    router.get("/messages", async (req, res) => {
        const { order, limit, offset, user_id} = req.query;

        let whereQuery:string = "";
        // uuidチェック
        if (!user_id) {
            whereQuery = "";
        } else if (user_id === "") {
            whereQuery = "";
        } else if (!uuidValidate(user_id)) {
            return res.status(400).json({ error: "Invalid UUID format" });
        } else {
            whereQuery = `WHERE visitor_id = '${user_id}' `;
        }

        let orderQuery = "ORDER BY created_at DESC ";
        if (typeof order === "string") {
            if (order.toLowerCase() === "asc") {
                orderQuery = "ORDER BY created_at ASC ";
            }
        }

        const limitNum:number = Math.min(string2Number(limit, 50), 50);
        const offsetNum:number = Math.max(string2Number(offset, 0), 0);
        if ( limitNum < 1 || offsetNum < 0 ) {
            return res.status(400).json({ error: "Invalid limit or offset" });
        }

        const sql = "SELECT * " +
                    "FROM chat_logs " +
                    whereQuery + 
                    orderQuery +
                    `LIMIT ${limitNum} ` +
                    `OFFSET ${offsetNum * limitNum};`
        
        console.log(sql);

        try {
            // データ取得
            const messages = await postgreSql.query<MessageRow>(sql);

            // 対象者が存在しない
            if (messages.rows.length === 0) {
                return res.status(404).json({ error: "Message not found" });
            }

            // snake to camel
            const messagesResponse:MessageResponse[] = 
            messages.rows.map((row:MessageRow) => ({
                    id: row.id,
                    userId: row.visitor_id, 
                    userName: row.name, 
                    message: row.message,
                    dflag: row.dflag,
                    createdAt: utc2jst(row.created_at)
            }));
            
            // データ返却
            res.json(messagesResponse);

        } catch (err) {
            return res.status(500).json({ error: "Internal server error" });
        }
    });

    // ----------------------------------
    // 公開API 不正URLをブロック
    // ----------------------------------
    router.all("/*", (req, res) => {
        return res.status(404).json({
            error: "Resource not found",
            path: req.originalUrl
        });
    });

    // ----------------------------------
    // パラメータは文字列なので数値に変換
    // ----------------------------------
    function string2Number(str:string, defaultNum: number):number {
        if (isNaN(Number(str))) {
            return defaultNum;
        } else {
            return Math.floor(Number(str))
        } 
    }
    return router;
}
