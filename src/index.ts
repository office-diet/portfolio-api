import express, { Request, Response } from "express";

const app = express();
const port = 3000;

// ペライチページ
app.get("/", (_req: Request, res: Response) => {
  res.send("<h1>Myポートフォリオ（最小構成）</h1>");
});

// 仮のAIチャットAPI
app.get("/api/chat", (_req: Request, res: Response) => {
  res.json({ message: "AIチャットAPIの仮レスポンスです" });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
