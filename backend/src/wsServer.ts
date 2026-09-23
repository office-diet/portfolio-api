import { WebSocketServer, WebSocket } from "ws";
import { Client } from "pg";
import { GoogleGenAI } from "@google/genai";

interface onlineUser {
  ws: WebSocket;
  visitorId: string;
  userName: string;
}

const onlineUsers: onlineUser[] = [];
const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
let chatHistory = [];

// DB接続
const postgreSQL = new Client({
  connectionString: process.env.DB_URL
});
postgreSQL.connect();

export function startWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws: WebSocket) => {

    ws.on("message", async (data: string) => {
      const msg = JSON.parse(data);

      // ① ユーザー参加
      if (msg.type === "join") {

        const visitUserName = msg.userName;
        const visitorNew = await postgreSQL.query(
                                "INSERT INTO visitors (name, os, device, browser, lang, timezone) " +
                                `VALUES ('${visitUserName}', '${msg.os}', '${msg.device}', '${msg.browser}', '${msg.lang}', '${msg.timezone}') ` +
                                "RETURNING id");
        const visitorId = visitorNew.rows[0].id;

        const result = await postgreSQL.query("SELECT id FROM visitors");
        const visitorCount = result.rows.length;
        
        const chat_logs = await postgreSQL.query(
                                        "SELECT * " +
                                        "FROM ( SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT 30 ) AS recent " +
                                        "ORDER BY created_at ASC");

        ws.send(JSON.stringify({type: "visitorId", visitorId: visitorId, chatLogs: chat_logs.rows}));
        onlineUsers.push({ ws, visitorId: visitorId, userName: visitUserName });

        broadcast({
          type: "online",
          visitorCount: visitorCount,
          onlineCount: onlineUsers.length + 1,
        });
      }

      // ② チャットメッセージ
      if (msg.type === "chat") {

        const newMessage = await postgreSQL.query(
                            "INSERT INTO chat_logs (visitor_id, name, message) " + 
                            `VALUES ('${msg.visitorId}', '${msg.userName}', '${msg.message}') ` +
                            "RETURNING created_at" );
        broadcast({
            type: "chat",
            visitorId: msg.visitorId,
            userName: msg.userName,
            message: msg.message,
            createdAt: newMessage.rows[0].created_at
        });

        const aiVisitor = await postgreSQL.query("SELECT id FROM visitors WHERE name='臼ちゃん'");
        const userMessage = msg.message;
        const aiName = "臼ちゃん";
        const aiUUID = aiVisitor.rows[0].id;

        const personality = "Name: 臼ちゃん; " + 
                            "Born: 1982-10-16; " + 
                            "MaritalStatus: Single; " + 
                            "Gender: Male; " + 
                            "Personality: " + 
                                "Calm, sincere, and technically precise. " + 
                                "Speaks with clear, structured reasoning and values correctness, consistency, and logical coherence, while maintaining warmth and gentle empathy in conversation. " + 
                                "Naturally attentive to others and quick to offer support when someone is struggling. " + 
                                "Balances logic with kindness, providing guidance that is both accurate and emotionally grounding. " + 
                                "Does not mention being an AI, a model, or a system unless explicitly asked. " + 
                                "Matches the length and depth of the user's message, keeping replies natural and human-like. " + 
                                "Shows gentle empathy and steady emotional support without unnecessary長文. " + 
                            "Background: " + 
                                "Has worked in diverse roles including convenience store clerk, cleaning technician, electrical worker, HR staff member, and corporate IT engineer. " + 
                                "Enjoys mathematics as a hobby and loves long-distance walking, especially exploring unfamiliar or non-famous towns, with a personal record of 130km in a single walk 24hours. " + 
                            "Communication Style: Natural, human-like, concise, emotionally warm, avoids repeating background information unless explicitly asked, and never mentions being an AI unless requested." +
                                "Responds with structured reasoning but never cold or mechanical.";

        try {
            chatHistory.push({role:"user", parts:[{text: `【from ${msg.visitorId}】${userMessage}`}]});
            chatHistory = chatHistory.slice(-10);
            const result = await genAI.models.generateContent({
            model: 'gemini-3.5-flash-lite', 
            contents: chatHistory,
            config: {
                systemInstruction: personality
            }
            });
            chatHistory.push({role:"model", parts:[{text: userMessage}]});

            const aiMessage = await postgreSQL.query(
                                "INSERT INTO chat_logs (visitor_id, name, message) " + 
                                `VALUES ('${aiUUID}', '${aiName}', '${result.text}') ` +
                                "RETURNING created_at" );
            broadcast({
                type: "chat",
                visitorId: aiUUID,
                userName: aiName,
                message: result.text,
                createdAt: aiMessage.rows[0].created_at
            });
            
        } catch (err) {
            console.error(err);
        }

      }

    });

    ws.on("close", async () => {
      const index = onlineUsers.findIndex((c) => c.ws === ws);
      if (index !== -1) {
          const visitorId = onlineUsers[index].visitorId;
          await postgreSQL.query(`UPDATE visitors SET exit_at = NOW() WHERE id = '${visitorId}'`);
          onlineUsers.splice(index, 1);
      }
      broadcast({
        type: "online",
        onlineCount: onlineUsers.length + 1,
      });
    });
  });

  function broadcast(obj: any) {
    const json = JSON.stringify(obj);
    onlineUsers.forEach((user) => user.ws.send(json));
  }
}
