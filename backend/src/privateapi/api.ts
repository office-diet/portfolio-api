import { Router } from "express"
import type { Client } from "pg";
import dotenv from "dotenv";
import { SignJWT } from "jose";
import bcrypt from "bcrypt";
import { getJstNow } from "../utils/jst";
import { authenticate } from "../utils/auth";
import { broadcast } from "../wsServer";

dotenv.config();
const JWT_SECRET = new TextEncoder().encode(process.env.JWT_SECRET);


export const privateApi = (postgreSql: Client) => {
    const router = Router();

    // ----------------------------------
    // 非公開API ログイン処理
    // ----------------------------------
    router.post("/signin", async (req, res) => {
        const { name, email, password, visitorId } = req.body;
        if (await userNameExists(name, postgreSql)) {
            return res.status(400).send({message: "ユーザ名が既に使用されています。\n重複のないユーザ名を使用してください。"});
        }

        if (await eamilExists(email, postgreSql)) {
            return res.status(400).send({message: "メールアドレスが既に登録されています。\n重複のないメールアドレスを登録してください。"});
        }

        try {
            // ユーザ情報の保存 ⇒ IDを発行
            const saltRouds:number = 10;
            const hashPassword: string = await bcrypt.hash(password, saltRouds);
            const result = await postgreSql.query(
                    "INSERT INTO users ( name, email, password ) VALUES ($1, $2, $3) RETURNING *;",
                    [name, email, hashPassword]);
            const userId:string = result.rows[0].id;
            
            // 過去のチャット・匿名ユーザ情報をログインユーザ情報で上書き
            await postgreSql.query(
                "UPDATE chat_logs SET visitor_id=$1, name=$2 WHERE visitor_id=$3;",
                [userId, name, visitorId])

            await postgreSql.query(
                "UPDATE visitors SET name=$1 WHERE id=$2;",
                [name, visitorId])

            const token = await new SignJWT({visitorId: userId, visitorName: name})
                                    .setProtectedHeader({alg: "HS256"})
                                    .setIssuedAt()
                                    .setExpirationTime("1h")
                                    .sign(JWT_SECRET);
            res.cookie("token", token, {
                httpOnly: true,
                maxAge: 60 * 60 * 1000,
            });
            return res.send({message: "signin", name: name, email: email, password: password, visitorId: userId});
        } catch (error) {
            return res.status(400).send({message: "ユーザー登録に失敗しました（サーバエラー）"});        
        }
    });
    
    router.post("/login", async (req, res) => {
        const { email, password, visitorId } = req.body;

        if (await eamilExists(email, postgreSql) === false) {
            return res.status(400).send({message: "メールアドレスが登録されていません"});
        }
        const result = await postgreSql.query("SELECT * FROM users WHERE email=$1", [email]);
        const user = result.rows[0];
        const isPasswordValid:boolean = await bcrypt.compare(password, user.password);

        if (isPasswordValid) {

            // 過去チャット・匿名ユーザの情報をログインユーザ情報で上書き
            await postgreSql.query(
                "UPDATE chat_logs SET visitor_id=$1, name=$2 WHERE visitor_id=$3;",
                [user.id, user.name, visitorId]);
            
            await postgreSql.query(
                "UPDATE visitors SET name=$1 WHERE id=$2;",
                [user.name, visitorId]);

            const token:string = await new SignJWT({visitorId: user.id, visitorName: user.name})
                                                .setProtectedHeader({alg: "HS256"})
                                                .setIssuedAt()
                                                .setExpirationTime("1h")
                                                .sign(JWT_SECRET);
            res.cookie("token", token, {
                httpOnly: true,
                maxAge: 60 * 60 * 1000,
            });

            return res.send({message: "login", name: user.name, email: email, visitorId: user.id});
        } else {
            return res.status(400).send({message: "パスワードが不正です"});
        }

    });
    
    router.post("/logout", async (req, res) => {
        res.clearCookie("token", {
            httpOnly: true,
        });
        return res.send({message: "logout"});
    });


    // ----------------------------------
    // 非公開API chat編集削除
    // ----------------------------------

    // 認証ミドルウェア（Cookieのトークンを検証）
    async function requireAuth(req, res, next) {
        const auth = await authenticate(req.headers.cookie);
        if (!auth) return res.status(401).json({ message: "ログインが必要です" });
        req.auth = auth;
        next();
    }

    // 更新
    router.patch("/chats/:id", requireAuth, async (req, res) => {
        const text = String(req.body.message ?? "").trim();
        if (text === "") return res.status(400).json({ message: "空のメッセージは保存できません" });

        const updateText = `${text}\n更新日時：${getJstNow()}`;

        const result = await postgreSql.query(
            "UPDATE chat_logs SET message = $1, dflag=false " +
            "WHERE id = $2 AND visitor_id = $3 RETURNING *;",
            [updateText, req.params.id, req.auth.visitorId]
        );
        if (result.rowCount === 0) return res.status(404).json({ message: "編集できないメッセージです" });
        broadcast({ type: "chatEdit", messageId: req.params.id, message: updateText });
        res.send({ message: "ok" });
    });

    // 削除
    router.delete("/chats/:id", requireAuth, async (req, res) => {
        console.log("params ", req.params.id);
        console.log("auth ", req.auth.visitorId);
        const message = await postgreSql.query(
            "SELECT * FROM chat_logs WHERE id=$1 AND visitor_id=$2;",
            [req.params.id, req.auth.visitorId]
        );
        if (message.rowCount === 0) return res.status(404).json({ message: "削除できないメッセージです" });
        const jstNow:string = getJstNow();
        const updateText:string = `削除日時：${jstNow}`;
        await postgreSql.query(
            "UPDATE chat_logs SET dflag = true, message = $1 " +
            "WHERE id = $2 AND visitor_id = $3;",
            [updateText, req.params.id, req.auth.visitorId]
        );

        broadcast({ type: "chatDelete", messageId: req.params.id, message: updateText });
        res.send({ message: "ok" });
    });
    
    // ----------------------------------
    // 非公開API 不正URLをブロック
    // ----------------------------------
    router.all("/*", (req, res) => {
        return res.status(404).json({
            error: "Resource not found",
            path: req.originalUrl
        });
    });

    return router;
}

// ユーザ名の存在チェック
async function userNameExists(userName:string, postgreSql:Client):Promise<boolean> {
    const result = await postgreSql.query("SELECT * FROM users WHERE name=$1", [userName]);
    if (result.rows.length > 0) {
        return true; 
    } else {
        return false;
    }
}

// メールアドレスの存在チェック
async function eamilExists(email:string, postgreSql:Client):Promise<boolean> {
    const result = await postgreSql.query("SELECT * FROM users WHERE email=$1", [email]);
    if (result.rows.length > 0) {
        return true; 
    } else {
        return false;
    }
}