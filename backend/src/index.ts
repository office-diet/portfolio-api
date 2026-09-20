import express from "express";
import cors from "cors";
import { Client } from "pg";

const app = express();
const port = 3000;
app.use(cors());

const databaseUrl = process.env.DATABASE_URL ?? `postgres://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`;

const client = new Client({
  connectionString: databaseUrl
});
client.connect();

app.get("/api/hello", async (_req, res) => {
  const result = await client.query("SELECT NOW()");
  res.json({ message: "Hello from backend!", db_time: result.rows[0].now });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
