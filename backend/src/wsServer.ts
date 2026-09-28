import { WebSocketServer, WebSocket } from "ws";
import { Client } from "pg";
import { GoogleGenAI } from "@google/genai";
import { Groq } from "groq-sdk";
import dotenv from "dotenv";

dotenv.config();

//----------------------------------------------------------- 
// WebSocket通信の型（条件分岐に対応するためにtypeを使用）
//----------------------------------------------------------- 

type JoinInfo = {         // 入室時にユーザより送信
  type: string;           // join
  visitorName: string;    // 全部「GuestUser」※将来用
  browser: string;
  os: string;
  device: string;
  lang: string;
  timezone: string;
}

type NewVisitorReturnData = { // 入室時に各種データを返送
  type: string;               // visitorId
  visitorId: string;
  visitorName: string;
  chatLogs: ChatLogForTS[];   // 直近件のチャット履歴
}


type NewChat = {          // ユーザが新規送信したチャット
	type: string;           //chat
	visitorId: string;
	visitorName: string;
	message: string;
}

type NewChatReturn = {
  type: string;         // chat
  visitorId: string;
  visitorName: string;
  messageId: string;
  message: string;
  createdAt: string;
}

type OnlineCount = {
  type: string;         // online
  onlineCount : number; // 室内人数
  visitorCount: number; // 合計訪問者数
}

// DBよりIDだけ、IDとCREATE_ATだけを取得
type GetId = {id: string};
type GetIdCreatedAt = {id: string, created_at: Date};


// DBから直接受け取る値のため列名がSnake
type ChatLogFromSQL = {
	id: string;
	visitor_id: string;
	name: string;
	message: string;
	created_at: Date;
}

// TypeScriptで使用するためにCamelに修正
type ChatLogForTS = {
	id: string;
	visitorId: string;
	name: string;
	message: string;
	createdAt: string;
}


//----------------------------------------------------------- 
// WebSocketやユーザー数を管理
//----------------------------------------------------------- 
interface OnlineUser {
  ws: WebSocket;
  visitorId: string;
  visitorName: string;
}
const onlineUsers: OnlineUser[] = [];

//----------------------------------------------------------- 
// AIのAPIの基本設定
//----------------------------------------------------------- 
const genAI = new GoogleGenAI({apiKey: process.env.GEMINI_API_KEY});
const groqAI = new Groq({apiKey: process.env.GROQ_API_KEY});
let geminiModelName:string = "gemini-3.5-flash-lite";
let groqModelName:string  = "openai/gpt-oss-120b";

//----------------------------------------------------------- 
// AIの個性定義「臼ちゃん」
//----------------------------------------------------------- 
let usuchanRate:number = 0.5;
let usuchanId:string = "";
const usuchanName:string = "臼ちゃん";
const usuchanPersona:string = "Name: 臼ちゃん; " +
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
let sayakaId:string = "";
const sayakaName:string = "さやか";
const sayakaPersona:string = "You are 'さやか', a bright, stylish, and energetic woman in her late twenties. " +
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
let chatHistoryGroq =   [];
let visitorCount:number = 0;
const firstTimeMessage:string = "匿名グループチャットが開設されました！だれでも参加しやすい雰囲気の短いメッセージを生成してください。";
chatHistoryGemini.push({role: "user", parts: [{text: firstTimeMessage}]});
chatHistoryGroq.push({role: "user",   content:       firstTimeMessage  });
chatHistoryGroq.unshift({role:"system", content: sayakaPersona});

// DB接続
const postgreSQL = new Client({
  connectionString: process.env.DB_URL
});
postgreSQL.connect();

export function startWebSocketServer(server: any) {
  const wss = new WebSocketServer({ server });

  wss.on("connection", async (ws: WebSocket) => {

    ws.on("message", async (data: string) => {

      // -----------------------------------
      // ---START AIの文章生成関数---
      // -----------------------------------
      async function generateBroadcastAiText() {

        if (Math.random() < usuchanRate) {
          usuchanRate = Math.max(0.01, usuchanRate * 0.9);
          const result = await genAI.models.generateContent({
            model: geminiModelName, 
            contents: chatHistoryGemini,
            config: {
                systemInstruction: usuchanPersona
            }
          });

          await sleepRandom();
          const chatTime:string = getJstNow();

          chatHistoryGemini.push({role:"model", parts:[{text: result.text}]});
          chatHistoryGroq.push({role:"user", content: `【from:${usuchanName}, datetime:${chatTime}】${result.text}`});
          
          const savedData = await postgreSQL.query<GetIdCreatedAt>(
                              "INSERT INTO chat_logs (visitor_id, name, message) " + 
                              "VALUES ($1, $2, $3) " +
                              "RETURNING id, created_at", 
                              [usuchanId, usuchanName, result.text] );

          const newChatReturn:NewChatReturn = {
                                                type: "chat",
                                                visitorId: usuchanId,
                                                visitorName: usuchanName,
                                                messageId: savedData.rows[0].id,
                                                message: result.text,
                                                createdAt: utc2jst(savedData.rows[0].created_at)
                                            }
          broadcast(newChatReturn);

        } else {

          usuchanRate = Math.min(1, usuchanRate * 1.1);
          // openai/gpt-oss-120b,llama-3.1-8b-instant
          const result = await groqAI.chat.completions.create({
            model: groqModelName,
            messages: chatHistoryGroq,
          });

          await sleepRandom();
          const chatTime:string = getJstNow();
          
          const resultText:string = result.choices[0]?.message?.content || "";
          chatHistoryGemini.push({role:"user", parts:[{text: `【from:${sayakaName}, datetime:${chatTime}】${resultText}`}]});
          chatHistoryGroq.push({role:"assistant", content: resultText});
          
          const savedData = await postgreSQL.query<GetIdCreatedAt>(
                              "INSERT INTO chat_logs (visitor_id, name, message) " + 
                              "VALUES ($1, $2, $3) " +
                              "RETURNING id, created_at",
                              [sayakaId, sayakaName, resultText] );
          const newChatReturn:NewChatReturn = {
                                                type: "chat",
                                                visitorId: sayakaId,
                                                visitorName: sayakaName,
                                                messageId: savedData.rows[0].id,
                                                message: resultText,
                                                createdAt: utc2jst(savedData.rows[0].created_at)
                                              }
          broadcast(newChatReturn);
        }
      }
      // -----------------------------------
      // ---END AIの文章生成関数---
      // -----------------------------------


      // 一旦データを受け取る
      const msg = JSON.parse(data);
      
      // 1回だけAIのUUIDを取得
      if (usuchanId === "") {
        const usuchanData = await postgreSQL.query<GetId>("SELECT id FROM visitors WHERE name=$1", [usuchanName]);
        usuchanId = usuchanData.rows[0].id;
        const sayakaData = await postgreSQL.query<GetId>("SELECT id FROM visitors WHERE name=$1", [sayakaName]);
        sayakaId = sayakaData.rows[0].id;
      }
      
      // -----------------------------------------
      // 【1】ユーザー参加
      // -----------------------------------------
      if (msg.type === "join") {

        const JoinInfo:JoinInfo = msg;
        const result = await postgreSQL.query<GetId>("SELECT id FROM visitors");
        visitorCount = result.rows.length + 1;                // 過去の訪問者数+新規を取得
        const visitorName:string = `GuestUser-${visitorCount - 2}`;  // AIの人数を除外してGuestUserに採番
        const visitorNew = await postgreSQL.query<GetId>(
                                "INSERT INTO visitors (name, os, device, browser, lang, timezone) " +
                                "VALUES ($1, $2, $3, $4, $5, $6) " +
                                "RETURNING id",
                                [visitorName, JoinInfo.os, JoinInfo.device, JoinInfo.browser, JoinInfo.lang, JoinInfo.timezone]);
        const visitorId:string = visitorNew.rows[0].id;

        
        const chat_logs = await postgreSQL.query<ChatLogFromSQL>(
                                            "SELECT * " +
                                            "FROM ( " + 
                                              "SELECT id, visitor_id, name, message, created_at " +
                                              "FROM chat_logs " +
                                              "ORDER BY created_at DESC LIMIT 50 ) AS recent " +
                                            "ORDER BY created_at ASC");
        const chatLogs:ChatLogForTS[] = chat_logs.rows.map((row:ChatLogFromSQL) => ({
                                                        id: String(row.id),
                                                        visitorId: String(row.visitor_id),
                                                        visitorName: String(row.name),
                                                        message: String(row.message),
                                                        createdAt: utc2jst(row.created_at)
                                                      }));
        
        const newVisitorReturnData:NewVisitorReturnData = 
            {type: "visitorId", visitorId: visitorId, visitorName: visitorName, chatLogs: chatLogs};
        ws.send(JSON.stringify(newVisitorReturnData));

        const onlineUser:OnlineUser = { ws: ws, visitorId: visitorId, visitorName: visitorName }
        onlineUsers.push(onlineUser);
        
        const onlineCount:OnlineCount = { type: "online", visitorCount: visitorCount, onlineCount: onlineUsers.length + 2 }
        broadcast(onlineCount);

        try {

        // チャット履歴＋新規入室メンバーへの声掛け依頼
          const chatTime:string = getJstNow();
          const newMemberMessage:string = `【非表示メッセージ, datetime:${chatTime}】秘密の依頼。誰かが新規入室したので、自然に会話を続けて雰囲気を盛り上げて下さ。`;
          chatHistoryGemini.push({role: "user", parts: [{text: newMemberMessage}]});
          chatHistoryGroq.push({  role: "user", content:       newMemberMessage  });
          await generateBroadcastAiText();
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

        const newChat:NewChat = msg;
        const newMessage = await postgreSQL.query<GetIdCreatedAt>(
                            "INSERT INTO chat_logs (visitor_id, name, message) " + 
                            "VALUES ($1, $2, $3) " +
                            "RETURNING id, created_at", 
                            [newChat.visitorId, newChat.visitorName, newChat.message] );
        const newChatReturn:NewChatReturn = {
          type: "chat",
          visitorId: newChat.visitorId,
          visitorName: newChat.visitorName,
          messageId: newMessage.rows[0].id,
          message: newChat.message,
          createdAt: utc2jst(newMessage.rows[0].created_at)
        };

        broadcast(newChatReturn);

        // チャット履歴を追加
        const userMessage:string = newChat.message;
        const chatTime:string = getJstNow();
        chatHistoryGemini.push({role:"user", parts:[{text: `【from:${newChat.visitorName}, datetime:${chatTime}】${userMessage}`}]});
        chatHistoryGroq.push({role:"user", content:`【from:${newChat.visitorName}, datetime:${chatTime}】${userMessage}`});
        chatHistoryGemini = chatHistoryGemini.slice(-20);
        chatHistoryGroq = chatHistoryGroq.slice(-20);
        chatHistoryGroq.unshift({role:"system", content: sayakaPersona});
        
        try {

          await generateBroadcastAiText();
            
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
          const visitorId:string = onlineUsers[index].visitorId;
          await postgreSQL.query("UPDATE visitors SET exit_at = NOW() WHERE id = $1", [visitorId]);
          onlineUsers.splice(index, 1);
      }
      
      const onlineCount:OnlineCount = {
        type: "online",
        visitorCount: visitorCount,
        onlineCount: onlineUsers.length + 2
      };
      broadcast(onlineCount);
    });
  });


  // すべてのWebSocketに情報を送信
  function broadcast(obj: OnlineCount | NewChatReturn) {
    const json:string = JSON.stringify(obj);
    onlineUsers.forEach((user:OnlineUser) => user.ws.send(json));
  }

  // pingを送信しAWSが切断しないようにする
  setInterval(() => {
    onlineUsers.forEach((user) => user.ws.ping());
  }, 30000);

}


// AIの回答が早すぎるのでちょっと遅らせる
function sleepRandom():Promise<void> {
  const ms = Math.floor(Math.random() * 2000);
  return new Promise(resolve => setTimeout(resolve, ms));
}

// 日本時間の「yyyy/m/d h/nn/ss」を取得
function getJstNow():string {
  const jst:string = new Date().toLocaleString("ja-JP", { timeZone: "Asia/Tokyo" });
  return jst.toLocaleString();
}

// PostgreSQLのTIMESTAMPのUTCをJSTに変換
function utc2jst(utc:Date):string {
  return new Date(utc.toISOString()).toLocaleString("ja-JP", {timeZone: "Asia/Tokyo"});
}