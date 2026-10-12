import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { startWebSocketServer } from "./wsServer";
import { Client } from "pg";
import { publicApi } from "./publicapi/api";
import { privateApi } from "./privateapi/api";
import cookieParser from "cookie-parser";

dotenv.config();

// DB接続
const postgreSql = new Client({
  connectionString: process.env.DB_URL
});
postgreSql.connect();

const app = express();
const port:number = 3000;
app.use(cors({ origin: true, credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const server = http.createServer(app);
startWebSocketServer(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend running on port ${port}`);
});

// 公開・非公開API
app.use("/api/public", publicApi(postgreSql));
app.use("/api/private", privateApi(postgreSql));