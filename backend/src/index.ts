import express from "express";
import cors from "cors";
import { Client } from "pg";
import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";

dotenv.config();

const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const chatHistory = [];

const app = express();
const port = 3000;
app.use(cors());
app.use(express.json());

const client = new Client({
  connectionString: process.env.DB_URL
});
client.connect();

app.get("/api/hello", async (req, res) => {
  const result = await client.query("SELECT NOW()");
  res.json({ message: "Hello from backend!", db_time: result.rows[0].now });
});

app.get("/api/aimembers", async (req, res) => {
  const members = await client.query("SELECT name, personality FROM aimember");
  const aryMembers = members.rows;
  res.json({
    count: aryMembers.length,
    members: aryMembers,
  });
});

app.post("/api/chat", async (req, res) => {
  const userText = req.body.text;

  const members = await client.query("SELECT name, personality FROM aimember");
  const aryMembers = members.rows;
  const randomMember = aryMembers[0];
  const memberName = randomMember.name;
  const personality = `my name is 【${memberName}】.` + randomMember.personality;
  try {
    chatHistory.push({role:"user", parts:[{text: userText}]});
    const result = await genAI.models.generateContent({
      model: 'gemini-3.5-flash-lite', 
      contents: chatHistory,
      config: {
        systemInstruction: personality
      }
    });
    chatHistory.push({role:"model", parts:[{text: userText}]});
    res.json({ name: memberName, reply: result.text });

  } catch (err) {
    console.error(err);
    res.json({ reply: "ごめんね、ちょっと考えすぎてしまったみたい…" });
  }
});



app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
