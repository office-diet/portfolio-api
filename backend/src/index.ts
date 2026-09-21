import express from "express";
import cors from "cors";
import { Client } from "pg";

const app = express();
const port = 3000;
app.use(cors());

const client = new Client({
  connectionString: process.env.DB_URL
});

client.connect();

app.get("/api/hello", async (_req, res) => {
  const result = await client.query("SELECT NOW()");
  res.json({ message: "Hello from backend!", db_time: result.rows[0].now });
});

app.get("/api/aimembers", async (_req, res) => {
  try {
    const result = await client.query(
      "SELECT id, name, personality, created_at FROM aimember ORDER BY created_at ASC"
    );

    res.json({
      count: result.rows.length,
      members: result.rows,
    });
  } catch (error) {
    console.error("Error fetching aimembers:", error);
    res.status(500).json({ error: "Failed to fetch AI members" });
  }
});



app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
