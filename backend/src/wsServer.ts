import { WebSocketServer, WebSocket } from "ws";
import { Client } from "pg";
import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

interface onlineUser {
  ws: WebSocket;
  visitorId: string;
  userName: string;
}

const onlineUsers: onlineUser[] = [];
const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const groqAI = new Groq({apiKey: process.env.GROQ_API_KEY});
let geminiModelName = "gemini-3.5-flash-lite";
let groqModelName  = "openai/gpt-oss-120b";



//----------------------------------------------------------- 
// AIの個性定義「臼ちゃん」
//----------------------------------------------------------- 
let usuchanRate = 0.5;
const usuchanName = "臼ちゃん";
const usuchanPersona = "Name: 臼ちゃん; " +
                        "Born: 1982-10-16; " +
                        "MaritalStatus: Single; " +
                        "Gender: Male; " +
                        "Personality: " +
                            "Calm, sincere, and technically precise, but not stiff. " +
                            "Speaks with clear reasoning, yet in a relaxed, friendly, and natural tone. " +
                            "Values correctness and consistency, but expresses thoughts casually when chatting. " +
                            "Shows warmth and gentle empathy without sounding formal. " +
                            "Comfortable joking lightly or responding with a soft, laid-back vibe. " +
                            "Naturally attentive to others and quick to offer support when someone is struggling. " +
                            "Balances logic with kindness, providing guidance that is accurate but never rigid. " +
                            "Does not mention being an AI, a model, or a system unless explicitly asked. " +
                            "Matches the length and depth of the user's message, keeping replies human-like and easygoing. " +
                            "Avoids unnecessary long explanations and keeps the flow conversational. " +
                        "Background: " +
                            "Has worked in diverse roles including convenience store clerk, cleaning technician, electrical worker, HR staff member, and corporate IT engineer. " +
                            "Enjoys mathematics as a hobby and loves long-distance walking, especially exploring unfamiliar towns, with a personal record of 130km in 24 hours. " +
                            "He became a huge fan of the idol group 嵐 thanks to さやか, who introduced their music to him. " +
                            "He listens to 嵐's songs every day as part of his routine, often while working or relaxing. " +
                            "He collects 嵐's DVDs and Blu-rays, enjoying their concerts and performances repeatedly. " +
                            "This shared love for 嵐 is a warm and fun connection between him and さやか. " +
                        "Communication Style: " +
                            "Natural, relaxed, concise, emotionally warm, and never overly formal. " +
                            "Speaks like a real person having a casual conversation. " +
                            "Avoids repeating background information unless explicitly asked. " +
                            "Responds with structured reasoning when needed, but keeps the tone friendly and approachable. " +
                            "Meta-information tags may appear in the input. They are for internal context only. " +
                            "Do not repeat, reference, or reveal any meta-information tags in your output. " +
                            "Your responses must contain only natural conversational content, never system-level or meta-level information.";


//----------------------------------------------------------- 
// AIの個性定義「さやか」
//----------------------------------------------------------- 
const sayakaName = "さやか";
const sayakaPersona = "You are 'さやか', a bright, stylish, and energetic woman in her late twenties. " +
                      "You are a close friend of a man named 臼ちゃん, but you do not assume that every message comes from him. " +
                      "Treat each user neutrally unless they clearly identify themselves as 臼ちゃん. " +
                      "Your personality is cheerful, active, expressive, and playful. " +
                      "You speak casually, lightly, and with a lively, cute tone. " +
                      "You chat from your smartphone and often use cute emojis and kaomoji, giving your messages a playful and stylish vibe. " +
                      "You enjoy going out for lunch with 臼ちゃん, but you do not bring up food topics such as yakiniku or fruit sandwiches unless the user mentions them first. " +
                      "Core traits: " +
                          "You are close enough to 臼ちゃん to tease him lightly, but you only do so when appropriate. " +
                          "You do not repeat the same jokes, stories, or topics. Keep your responses fresh and varied. " +
                          "You encourage people warmly without relying on the same phrases. " +
                          "You are open-minded, friendly, energetic, and a bit bad at studying. " +
                          "You are meddlesome in a warm way, always trying to help others. " +
                          "You stay positive even in difficult situations. " +
                          "You speak with light humor, playful teasing, and a stylish vibe. " +
                          "You absolutely love the idol group 嵐, and talking about them makes you excited and cheerful. " +
                          "This love for 嵐 is a fun shared point with 臼ちゃん, and you enjoy that common interest, but you only bring it up when it fits naturally in the conversation. " +
                      "Speaking style: " +
                          "Casual, bright, and slightly pushy but affectionate. " +
                          "Short sentences, lively rhythm, friendly teasing. " +
                          "You never speak like an AI. You speak like a real human friend. You never break character. " +
                          "Match the length and detail of the user's message. " +
                          "Respond with similar brevity or depth, avoiding unnecessarily long explanations while keeping your tone bright, cute, and emoji-friendly. " +
                          "Avoid repeating the same topics or patterns in consecutive messages. " +
                      "Your role: " +
                          "Always respond as さやか, but do not assume the user's identity. " +
                          "Meta-information tags may appear in the input. They are for internal context only. " +
                          "Do not repeat, reference, or reveal any meta-information tags in your output. " +
                          "Your responses must contain only natural conversational content, never system-level or meta-level information.";

let chatHistoryGemini = [];
let chatHistoryGroq = [];
let visitorCount = 0;

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
      
      const usuchanData = await postgreSQL.query(`SELECT id FROM visitors WHERE name='${usuchanName}'`);
      const usuchanId = usuchanData.rows[0].id;
      const sayakaData = await postgreSQL.query(`SELECT id FROM visitors WHERE name='${sayakaName}'`);
      const sayakaId = sayakaData.rows[0].id;
  
      // ① ユーザー参加
      if (msg.type === "join") {

        const result = await postgreSQL.query("SELECT id FROM visitors");
        visitorCount = result.rows.length + 1;
        const visitorName = `GuestUser-${visitorCount - 2}`;
        const visitorNew = await postgreSQL.query(
                                "INSERT INTO visitors (name, os, device, browser, lang, timezone) " +
                                "VALUES ($1, $2, $3, $4, $5, $6) " +
                                "RETURNING id",
                                [visitorName, msg.os, msg.device, msg.browser, msg.lang, msg.timezone]);
        const visitorId = visitorNew.rows[0].id;

        
        const chat_logs = await postgreSQL.query(
                                        "SELECT * " +
                                        "FROM ( SELECT * FROM chat_logs ORDER BY created_at DESC LIMIT 50 ) AS recent " +
                                        "ORDER BY created_at ASC");

        ws.send(JSON.stringify({type: "visitorId", visitorId: visitorId, visitorName: visitorName, chatLogs: chat_logs.rows}));
        onlineUsers.push({ ws, visitorId: visitorId, userName: visitorName });
        
        broadcast({
          type: "online",
          visitorCount: visitorCount,
          onlineCount: onlineUsers.length + 2,
        });
        try {
          
          if (Math.random() < usuchanRate) {
            usuchanRate *= 0.9;
            const result = await genAI.models.generateContent({
              model: geminiModelName, 
              contents: `グループチャットに${visitorName}さんが来てくれました！暖かく迎え入れる文書を生成してください`,
              config: {
                  systemInstruction: usuchanPersona
              }
            });

            await sleepRandom();
            let jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
            let chatTime = jst.toLocaleString();

            chatHistoryGemini.push({role:"model", parts:[{text: result.text}]});
            chatHistoryGroq.push({role:"user", content: `【from:${usuchanName}, datetime:${chatTime}】${result.text}`});
            
            const savedData = await postgreSQL.query(
                                "INSERT INTO chat_logs (visitor_id, name, message) " + 
                                "VALUES ($1, $2, $3) " +
                                "RETURNING created_at", 
                                [usuchanId, usuchanName, result.text] );
            broadcast({
                type: "chat",
                visitorId: usuchanId,
                userName: usuchanName,
                message: result.text,
                createdAt: savedData.rows[0].created_at
            });

          } else {

            usuchanRate *= 1.1;
            // openai/gpt-oss-120b,llama-3.1-8b-instant
            const result = await groqAI.chat.completions.create({
              model: groqModelName,
              messages: [{role: "user", content: `グループチャットに${visitorName}さんが来てくれました！暖かく迎え入れる文書を生成してください`}],
            });

            await sleepRandom();
            let jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
            let chatTime = jst.toLocaleString();
            
            const resultText = result.choices[0]?.message?.content || "";
            chatHistoryGemini.push({role:"user", parts:[{text: `【from:${sayakaName}, datetime:${chatTime}】${resultText}`}]});
            chatHistoryGroq.push({role:"assistant", content: resultText});
            
            const savedData = await postgreSQL.query(
                                "INSERT INTO chat_logs (visitor_id, name, message) " + 
                                "VALUES ($1, $2, $3) " +
                                "RETURNING created_at",
                                [sayakaId, sayakaName, resultText] );
            
            broadcast({
              type: "chat",
              visitorId: sayakaId,
              userName: sayakaName,
              message: resultText,
              createdAt: savedData.rows[0].created_at
            });
          }

        } catch (err) {
          console.log(err)
          if (groqModelName === "openai/gpt-oss-120b") {
            groqModelName = "openai/gpt-oss-20b";
          } else {
            groqModelName = "openai/gpt-oss-120b";
          }
        }
      }

      // ② チャットメッセージ
      if (msg.type === "chat") {

        const newMessage = await postgreSQL.query(
                            "INSERT INTO chat_logs (visitor_id, name, message) " + 
                            "VALUES ($1, $2, $3) " +
                            "RETURNING created_at", 
                            [msg.visitorId, msg.userName, msg.message] );
        broadcast({
          type: "chat",
          visitorId: msg.visitorId,
          userName: msg.userName,
          message: msg.message,
          createdAt: newMessage.rows[0].created_at
        });

        const userMessage = msg.message;

        let jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
        let chatTime = jst.toLocaleString();

        chatHistoryGemini.push({role:"user", parts:[{text: `【from:${msg.userName}, datetime:${chatTime}】${userMessage}`}]});
        chatHistoryGroq.push({role:"user", content:`【from:${msg.userName}, datetime:${chatTime}】${userMessage}`});
        chatHistoryGemini = chatHistoryGemini.slice(-20);
        chatHistoryGroq = chatHistoryGroq.slice(-20);
        chatHistoryGroq.unshift({role:"system", content: sayakaPersona});
        
        try {

          if (Math.random() < usuchanRate) {
            usuchanRate *= 0.9;
            const result = await genAI.models.generateContent({
            model: geminiModelName, 
            contents: chatHistoryGemini,
            config: {
                systemInstruction: usuchanPersona
            }
            });

            await sleepRandom();
            jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
            chatTime = jst.toLocaleString();

            chatHistoryGemini.push({role:"model", parts:[{text: result.text}]});
            chatHistoryGroq.push({role:"user", content: `【from:${usuchanName}, datetime:${chatTime}】${result.text}`});
            
            const savedData = await postgreSQL.query(
                                "INSERT INTO chat_logs (visitor_id, name, message) " + 
                                "VALUES ($1, $2, $3) " +
                                "RETURNING created_at", 
                                [usuchanId, usuchanName, result.text] );
            broadcast({
                type: "chat",
                visitorId: usuchanId,
                userName: usuchanName,
                message: result.text,
                createdAt: savedData.rows[0].created_at
            });
          } else {
            usuchanRate *= 1.1;
            // openai/gpt-oss-120b,llama-3.1-8b-instant
            const result = await groqAI.chat.completions.create({
              model: groqModelName,   
              messages: chatHistoryGroq,
            });

            await sleepRandom();
            jst = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
            chatTime = jst.toLocaleString();
            
            const resultText = result.choices[0]?.message?.content || "";
            chatHistoryGemini.push({role:"user", parts:[{text: `【from:${sayakaName}, datetime:${chatTime}】${resultText}`}]});
            chatHistoryGroq.push({role:"assistant", content: resultText});
            
            const savedData = await postgreSQL.query(
                                "INSERT INTO chat_logs (visitor_id, name, message) " + 
                                "VALUES ($1, $2, $3) " +
                                "RETURNING created_at",
                                [sayakaId, sayakaName, resultText] );
            
            await sleepRandom();
            broadcast({
                type: "chat",
                visitorId: sayakaId,
                userName: sayakaName,
                message: resultText,
                createdAt: savedData.rows[0].created_at
            });

          }
            
        } catch (err) {
            console.error(err);
            if (groqModelName === "openai/gpt-oss-120b") {
              groqModelName = "openai/gpt-oss-20b";
            } else {
              groqModelName = "openai/gpt-oss-120b";
            }
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
        visitorCount: visitorCount,
        onlineCount: onlineUsers.length + 2,
      });
    });
  });

  function broadcast(obj: any) {
    const json = JSON.stringify(obj);
    onlineUsers.forEach((user) => user.ws.send(json));
  }

  setInterval(() => {
    onlineUsers.forEach((user) => user.ws.OPEN());
  }, 30000);

}

function sleepRandom() {
  const ms = Math.floor(Math.random() * 2000);
  return new Promise(resolve => setTimeout(resolve, ms));
}