import express from "express";
import cors from "cors";
import { Client } from "pg";

const app = express();
const port = 3000;
app.use(cors());

const client = new Client({
  connectionString: process.env.DATABASE_URL
});
client.connect();

app.get("/api/hello", async (_req, res) => {
  const result = await client.query("SELECT NOW()");
  res.json({ message: "Hello from backend!", db_time: result.rows[0].now });
});

app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
