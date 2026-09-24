import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import { startWebSocketServer } from "./wsServer";
import { Client } from "pg";

dotenv.config();

// DB接続
const postgreSQL = new Client({
  connectionString: process.env.DB_URL
});
postgreSQL.connect();

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
startWebSocketServer(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`Backend running on port ${port}`);
});

app.get("/api/dbinfo", async (req, res) => {
  const visitors = await postgreSQL.query("SELECT * FROM visitors");
  const chat_logs = await postgreSQL.query("SELECT * FROM chat_logs");
  res.json({ host: "postgreSQL", tables: {visitors: visitors.rows, chat_logs: chat_logs.rows}});
});